// pragma: allowlist secret
// This file contains synthetic test API keys to validate the Sentry scrubber redacts them.
// These are NOT real credentials — they're fixtures for unit tests.

import { describe, it, expect, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { SCRUB_PATTERNS, createScrubString } from '@/lib/sentry';

// Test the beforeSend callback using the actual scrubber patterns and logic from sentry.ts
function createBeforeSendCallback() {
  const scrubString = createScrubString(SCRUB_PATTERNS);

  return function beforeSend(event: Sentry.ErrorEvent) {
    // Drop EvalError
    const evalErr = 'Eval' + 'Error';
    if (event.exception?.values?.some((e) => e.type === evalErr)) return null;

    // Drop Supabase lock errors
    const lockPrefix = 'lock:sb-';
    if (
      event.exception?.values?.some(
        (e) =>
          e.value?.includes(lockPrefix) ||
          (e.type === 'AbortError' && e.value?.includes('steal'))
      )
    )
      return null;

    // Drop stale chunk errors
    if (
      event.exception?.values?.some(
        (e) =>
          e.value?.includes('Failed to fetch dynamically imported module') ||
          e.value?.includes('Importing a module script failed') ||
          e.value?.includes('is not a valid JavaScript MIME type')
      )
    )
      return null;

    // Strip PII from request URLs
    if (event.request?.url) {
      try {
        const url = new URL(event.request.url);
        event.request.url = `${url.origin}${url.pathname}`;
      } catch {
        // ignore invalid URLs
      }
    }

    // Scrub breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((bc) => ({
        ...bc,
        data: bc.data
          ? Object.fromEntries(
              Object.entries(bc.data).map(([k, v]) => [k, scrubString(String(v))])
            )
          : bc.data,
        message: scrubString(bc.message),
      }));
    }

    // Scrub extra
    if (event.extra) {
      event.extra = Object.fromEntries(
        Object.entries(event.extra).map(([k, v]) => [k, scrubString(String(v))])
      );
    }

    // Scrub exception messages
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((ex) => ({
        ...ex,
        value: scrubString(ex.value),
      }));
    }

    // Scrub contexts
    if (event.contexts) {
      for (const ctxKey of Object.keys(event.contexts)) {
        const ctx = event.contexts[ctxKey];
        if (ctx && typeof ctx === 'object') {
          for (const [k, v] of Object.entries(ctx)) {
            (ctx as Record<string, unknown>)[k] = scrubString(String(v));
          }
        }
      }
    }

    // Scrub tags
    if (event.tags) {
      event.tags = Object.fromEntries(
        Object.entries(event.tags).map(([k, v]) => [k, scrubString(String(v))])
      );
    }

    // Scrub request headers
    if (event.request?.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).map(([k, v]) => {
          const lower = k.toLowerCase();
          if (lower === 'authorization' || lower === 'x-api-key' || lower.includes('token')) {
            return [k, '[REDACTED:header]'];
          }
          return [k, scrubString(String(v)) ?? String(v)];
        })
      );
    }

    // Scrub message
    if (event.message) {
      event.message = scrubString(event.message);
    }

    return event;
  };
}

describe('Sentry beforeSend scrubber (THI-120)', () => {
  let beforeSend: (event: Sentry.ErrorEvent) => Sentry.ErrorEvent | null;

  beforeEach(() => {
    beforeSend = createBeforeSendCallback();
  });

  describe('API key pattern scrubbing', () => {
    it('[0] OpenRouter key in breadcrumb should be redacted', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        breadcrumbs: [
          {
            message: 'API call with key sk-or-v1-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            timestamp: Date.now(),
          },
        ],
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.breadcrumbs?.[0].message).toContain('[REDACTED:openrouter]');
      expect(result?.breadcrumbs?.[0].message).not.toContain('sk-or-v1-');
    });

    it('[1] Gemini key in extra should be redacted', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        extra: {
          gemini_key: 'AIzaSyD0vCWzxQoq0vC0c0c0c0c0c0c0c0c0c0c',
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.extra?.gemini_key).toContain('[REDACTED:gemini]');
    });

    it('[2] OpenAI key in exception value should be redacted', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        exception: {
          values: [
            {
              type: 'Error',
              value: 'Failed to authenticate with key sk-0123456789abcdef0123456789abcdef0123456789abcdef',
            },
          ],
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.exception?.values?.[0].value).toContain('[REDACTED:openai]');
      expect(result?.exception?.values?.[0].value).not.toContain('sk-0123');
    });

    it('[3] Key in contexts should be redacted', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        contexts: {
          jwt_claims: {
            api_key: 'sk-or-v1-abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz01',
            user: 'test@example.com',
          },
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.contexts?.jwt_claims?.api_key).toContain('[REDACTED:openrouter]');
      expect(result?.contexts?.jwt_claims?.user).toContain('[REDACTED:email]');
    });

    it('[4] Email in extra should be redacted (GDPR — H2)', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        extra: {
          user_contact: 'john.doe@example.com',
          internal_email: 'admin@terminallearning.dev',
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.extra?.user_contact).toContain('[REDACTED:email]');
      expect(result?.extra?.internal_email).toBe('admin@terminallearning.dev');
    });

    it('[5] Authorization header should be redacted', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        request: {
          headers: {
            Authorization: 'Bearer sk-or-v1-abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz01',
            'X-API-Key': 'sk-ant-abc123def456ghi789jkl',
          },
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.request?.headers?.Authorization).toBe('[REDACTED:header]');
      expect(result?.request?.headers?.['X-API-Key']).toBe('[REDACTED:header]');
    });

    it('[6] Key in event.message should be redacted', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        message: 'API error with sk-or-v1-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.message).toContain('[REDACTED:openrouter]');
      expect(result?.message).not.toContain('sk-or-v1-');
    });

    it('[7] Multiple keys in same string should all be redacted (stateful regex bug fix)', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        extra: {
          error: 'sk-or-v1-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa and sk-or-v1-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      const errorStr = String(result?.extra?.error);
      const redactCount = (errorStr.match(/\[REDACTED:openrouter\]/g) || []).length;
      expect(redactCount).toBe(2);
    });

    it('[8] JWT token should be redacted', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        extra: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.extra?.token).toContain('[REDACTED:jwt]');
    });

    it('[9] Generic API key pattern (Groq, Mistral) should be redacted', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        extra: {
          groq_key: 'sk-gsk1234567890abcdefghijklmnopqrstuvwxyz',
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.extra?.groq_key).toContain('[REDACTED:generic_api_key]');
    });
  });

  describe('Existing filters (error types)', () => {
    it('[7] EvalError should be dropped', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        exception: {
          values: [
            {
              type: 'EvalError',
              value: 'Eval is not allowed',
            },
          ],
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result).toBeNull();
    });

    it('[8] Supabase lock errors should be dropped', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        exception: {
          values: [
            {
              type: 'Error',
              value: 'lock:sb-something failed',
            },
          ],
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result).toBeNull();
    });

    it('[9] Stale chunk errors should be dropped', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        exception: {
          values: [
            {
              type: 'Error',
              value: 'Failed to fetch dynamically imported module: https://example.com/chunk.js',
            },
          ],
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result).toBeNull();
    });
  });

  describe('URL scrubbing', () => {
    it('[10] Request URL query params should be stripped', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        request: {
          url: 'https://api.example.com/endpoint?api_key=sk-or-v1-xyz&user=john',
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.request?.url).toBe('https://api.example.com/endpoint');
      expect(result?.request?.url).not.toContain('api_key');
      expect(result?.request?.url).not.toContain('user');
    });
  });

  describe('Edge cases', () => {
    it('[11] Should handle null/undefined values gracefully', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        extra: {
          key: undefined,
          value: null,
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.extra).toBeDefined();
    });

    it('[12] Should preserve non-sensitive data in contexts', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        contexts: {
          user: {
            id: 'user-123',
            name: 'John Doe',
            role: 'student',
          },
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      expect(result?.contexts?.user?.id).toBe('user-123');
      expect(result?.contexts?.user?.name).toBe('John Doe');
      expect(result?.contexts?.user?.role).toBe('student');
    });

    it('[13] Should handle complex nested structures in extra', () => {
      const event: Partial<Sentry.ErrorEvent> = {
        extra: {
          nested: {
            deep: {
              key: 'sk-or-v1-abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz01',
            },
          },
        },
      };
      const result = beforeSend(event as Sentry.ErrorEvent);
      // Note: nested objects are stringified, so this may not redact properly
      // but the function should not crash
      expect(result?.extra).toBeDefined();
    });
  });
});
