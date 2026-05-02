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
});
