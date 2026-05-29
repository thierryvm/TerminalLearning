// pragma: allowlist secret
// Synthetic test API keys to validate the Sentry tunnel scrubber redacts them.
// These are NOT real credentials — they're fixtures for unit tests.

import { describe, it, expect } from 'vitest';
import { scrubEnvelopeItem } from '../../api/sentry-tunnel';

const FAKE_OPENROUTER_KEY = 'sk-or-v1-' + 'a'.repeat(64);
const FAKE_ANTHROPIC_KEY = 'sk-ant-' + 'b'.repeat(50);
const FAKE_USER_EMAIL = 'attacker@external.com';

describe('Sentry tunnel scrubber — coverage matrix (THI-140)', () => {
  describe('event type (THI-120 baseline — must stay covered)', () => {
    it('scrubs API key in exception value', () => {
      const item = JSON.stringify({
        type: 'event',
        exception: {
          values: [{ type: 'Error', value: `Failed: ${FAKE_OPENROUTER_KEY}` }],
        },
      });
      const { scrubbed, stats } = scrubEnvelopeItem(item);
      expect(scrubbed).not.toContain(FAKE_OPENROUTER_KEY);
      expect(scrubbed).toContain('[REDACTED:openrouter]');
      expect(stats.patterns_hit).toContain('openrouter');
    });

    it('scrubs API key in breadcrumb data', () => {
      const item = JSON.stringify({
        type: 'event',
        breadcrumbs: [{ category: 'http', data: { authorization: FAKE_ANTHROPIC_KEY } }],
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      expect(scrubbed).not.toContain(FAKE_ANTHROPIC_KEY);
      expect(scrubbed).toContain('[REDACTED:anthropic]');
    });

    it('scrubs email in user.email', () => {
      const item = JSON.stringify({
        type: 'event',
        user: { email: FAKE_USER_EMAIL, username: 'attacker' },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      expect(scrubbed).not.toContain(FAKE_USER_EMAIL);
      expect(scrubbed).toContain('[REDACTED:email]');
    });
  });

  describe('transaction type (THI-140 new coverage)', () => {
    it('scrubs API key in transaction tags', () => {
      const item = JSON.stringify({
        type: 'transaction',
        transaction: 'GET /api/foo',
        tags: { 'leaked-by-mistake': FAKE_OPENROUTER_KEY, 'normal-tag': 'safe-value' },
      });
      const { scrubbed, stats } = scrubEnvelopeItem(item);
      expect(scrubbed).not.toContain(FAKE_OPENROUTER_KEY);
      expect(scrubbed).toContain('[REDACTED:openrouter]');
      expect(scrubbed).toContain('safe-value');
      expect(stats.item_type).toBe('transaction');
    });

    it('scrubs API key in transaction contexts', () => {
      const item = JSON.stringify({
        type: 'transaction',
        contexts: {
          custom: { api_call: `Authorization: Bearer ${FAKE_ANTHROPIC_KEY}` },
        },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      expect(scrubbed).not.toContain(FAKE_ANTHROPIC_KEY);
      expect(scrubbed).toContain('[REDACTED:anthropic]');
    });

    it('scrubs API key in transaction extra', () => {
      const item = JSON.stringify({
        type: 'transaction',
        extra: { debug_payload: FAKE_OPENROUTER_KEY },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      expect(scrubbed).not.toContain(FAKE_OPENROUTER_KEY);
    });

    it('does NOT scrub spans (intentional perf trade-off)', () => {
      // Spans are not scrubbed for performance reasons; document the contract via test.
      const item = JSON.stringify({
        type: 'transaction',
        spans: [{ description: `query with ${FAKE_OPENROUTER_KEY}` }],
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      // Span content stays as-is — the tunnel relies on dev discipline to not put keys in spans.
      expect(scrubbed).toContain(FAKE_OPENROUTER_KEY);
    });
  });

  describe('profile type (THI-140 new coverage)', () => {
    it('scrubs API key in profile tags', () => {
      const item = JSON.stringify({
        type: 'profile',
        environment: `prod-${FAKE_OPENROUTER_KEY}`,
        tags: { release: 'v1.0' },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      expect(scrubbed).not.toContain(FAKE_OPENROUTER_KEY);
      expect(scrubbed).toContain('[REDACTED:openrouter]');
    });
  });

  describe('check_in type (THI-140 new coverage)', () => {
    it('scrubs API key in check_in contexts', () => {
      const item = JSON.stringify({
        type: 'check_in',
        monitor_slug: 'cleanup-cron',
        status: 'ok',
        contexts: {
          job: { error_msg: `connection failed: ${FAKE_ANTHROPIC_KEY}` },
        },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      expect(scrubbed).not.toContain(FAKE_ANTHROPIC_KEY);
      expect(scrubbed).toContain('[REDACTED:anthropic]');
    });
  });

  describe('request.url + request.headers symmetric scrub (THI-113 H1)', () => {
    it('strips the query string from request.url so OAuth tokens never reach Sentry', () => {
      const item = JSON.stringify({
        type: 'event',
        exception: { values: [{ type: 'Error', value: 'oauth callback failed' }] },
        request: {
          url: 'https://terminallearning.dev/auth/callback?access_token=ya29.A0ARrdaM_super_secret&state=xyz',
        },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      const parsed = JSON.parse(scrubbed);
      expect(parsed.request.url).toBe('https://terminallearning.dev/auth/callback');
      expect(scrubbed).not.toContain('access_token');
      expect(scrubbed).not.toContain('ya29.A0ARrdaM');
    });

    it('strips the query from RELATIVE URLs too (Sourcery PR #230 — URL parse throws on relative paths)', () => {
      const item = JSON.stringify({
        type: 'event',
        exception: { values: [{ type: 'Error', value: 'relative path oauth' }] },
        request: {
          // Sentry envelope occasionally captures relative paths instead
          // of absolute URLs. `new URL('/path?token=...')` throws, so the
          // catch must still strip the query via string fallback.
          url: '/auth/callback?access_token=relative_path_secret_value&state=xyz',
        },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      const parsed = JSON.parse(scrubbed);
      expect(parsed.request.url).toBe('/auth/callback');
      expect(scrubbed).not.toContain('access_token');
      expect(scrubbed).not.toContain('relative_path_secret_value');
    });

    it('strips the fragment from malformed URLs (string fallback covers # too)', () => {
      const item = JSON.stringify({
        type: 'event',
        exception: { values: [{ type: 'Error', value: 'malformed url with fragment' }] },
        request: {
          // Some OAuth providers (e.g. implicit flow) put tokens in the
          // fragment. The fallback must strip everything after `#` AND
          // everything after `?`, even when URL parsing fails.
          url: '://not-a-valid-url#access_token=fragment_secret',
        },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      const parsed = JSON.parse(scrubbed);
      expect(parsed.request.url).toBe('://not-a-valid-url');
      expect(scrubbed).not.toContain('fragment_secret');
    });

    it('redacts authorization / x-api-key / *token* request headers verbatim', () => {
      const item = JSON.stringify({
        type: 'event',
        exception: { values: [{ type: 'Error', value: 'request failed' }] },
        request: {
          headers: {
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.fake.jwt',
            'X-API-Key': 'sk-ant-api03-FAKE_KEY_DO_NOT_USE_0123456789',
            'X-Custom-Token': 'tok_FAKE_session_token_value',
            'Content-Type': 'application/json',
          },
        },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      const parsed = JSON.parse(scrubbed);
      expect(parsed.request.headers.Authorization).toBe('[REDACTED:header]');
      expect(parsed.request.headers['X-API-Key']).toBe('[REDACTED:header]');
      expect(parsed.request.headers['X-Custom-Token']).toBe('[REDACTED:header]');
      // Non-secret headers stay readable for debugging
      expect(parsed.request.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('non-JSON / unknown body', () => {
    it('falls back to text-level scrub for non-JSON bodies', () => {
      const item = `random text containing ${FAKE_OPENROUTER_KEY} somewhere`;
      const { scrubbed } = scrubEnvelopeItem(item);
      expect(scrubbed).not.toContain(FAKE_OPENROUTER_KEY);
      expect(scrubbed).toContain('[REDACTED:openrouter]');
    });
  });

  describe('clean payloads (no false positives)', () => {
    it('leaves clean event untouched', () => {
      const item = JSON.stringify({
        type: 'event',
        exception: { values: [{ type: 'TypeError', value: 'Cannot read property foo of undefined' }] },
        user: { email: 'user@terminallearning.dev' }, // exempted domain
      });
      const { scrubbed, stats } = scrubEnvelopeItem(item);
      const parsed = JSON.parse(scrubbed);
      expect(parsed.exception.values[0].value).toBe('Cannot read property foo of undefined');
      expect(parsed.user.email).toBe('user@terminallearning.dev');
      expect(stats.patterns_hit).toEqual([]);
    });

    it('leaves clean transaction untouched', () => {
      const item = JSON.stringify({
        type: 'transaction',
        transaction: 'GET /api/foo',
        tags: { route: 'GET /api/foo', http_status: '200' },
      });
      const { scrubbed, stats } = scrubEnvelopeItem(item);
      expect(scrubbed).toContain('GET /api/foo');
      expect(stats.patterns_hit).toEqual([]);
    });
  });

  // route-attack H1 (29/05) — SCRUB_PATTERNS are module-scoped /g regexes; a
  // stateful lastIndex leaking across calls could skip a real match. These
  // regression tests prove a secret is scrubbed on EVERY call regardless of
  // prior-call state (the fix replaces directly instead of a stateful .test()).
  describe('regex state isolation across calls (H1 regression)', () => {
    it('scrubs the key on repeated calls — no lastIndex leak between invocations', () => {
      for (let i = 0; i < 5; i++) {
        const item = JSON.stringify({
          type: 'event',
          exception: { values: [{ type: 'Error', value: `Boom ${FAKE_OPENROUTER_KEY}` }] },
        });
        const { scrubbed, stats } = scrubEnvelopeItem(item);
        expect(scrubbed, `call #${i} leaked the key`).not.toContain(FAKE_OPENROUTER_KEY);
        expect(stats.patterns_hit).toContain('openrouter');
      }
    });

    it('scrubs a key positioned earlier than a previous match (lastIndex would skip it)', () => {
      // Call 1: key late in the value (a stateful lastIndex would advance far).
      scrubEnvelopeItem(JSON.stringify({
        type: 'event',
        exception: { values: [{ type: 'Error', value: `${'x'.repeat(200)} ${FAKE_OPENROUTER_KEY}` }] },
      }));
      // Call 2: key at the very start — a leaked lastIndex would make a stateful scan miss it.
      const { scrubbed } = scrubEnvelopeItem(JSON.stringify({
        type: 'event',
        exception: { values: [{ type: 'Error', value: `${FAKE_OPENROUTER_KEY} trailing` }] },
      }));
      const value = JSON.parse(scrubbed).exception.values[0].value;
      expect(value).not.toContain(FAKE_OPENROUTER_KEY);
      expect(value).toContain('[REDACTED:openrouter]');
    });

    it('scrubs multiple occurrences of the same secret in one value', () => {
      const item = JSON.stringify({
        type: 'event',
        exception: { values: [{ type: 'Error', value: `${FAKE_OPENROUTER_KEY} and again ${FAKE_OPENROUTER_KEY}` }] },
      });
      const { scrubbed } = scrubEnvelopeItem(item);
      const value = JSON.parse(scrubbed).exception.values[0].value;
      expect(value).not.toContain(FAKE_OPENROUTER_KEY);
      expect(value.match(/\[REDACTED:openrouter\]/g)?.length).toBe(2);
    });
  });
});
