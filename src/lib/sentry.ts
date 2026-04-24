import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// Exported for testing — these are the scrubber's core patterns and logic
export const SCRUB_PATTERNS = [
  { pattern: /sk-or-v1-[a-zA-Z0-9]{64}/gi, label: 'openrouter' },
  { pattern: /sk-ant-[a-zA-Z0-9\-]{40,}/gi, label: 'anthropic' },
  { pattern: /sk-(?!or-|ant-)[a-zA-Z0-9]{48}/gi, label: 'openai' },
  { pattern: /AIza[a-zA-Z0-9_\-]{35}/gi, label: 'gemini' },
  { pattern: /[a-zA-Z0-9._%+\-]+@(?!localhost|terminallearning\.dev)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi, label: 'email' },
  { pattern: /eyJ[A-Za-z0-9_\-]{50,}/gi, label: 'jwt' },
  { pattern: /sk-[a-zA-Z0-9_\-]{20,}/gi, label: 'generic_api_key' },
];

export function createScrubString(patterns: typeof SCRUB_PATTERNS) {
  return (str: string | undefined): string | undefined => {
    if (!str) return str;
    let scrubbed = str;
    patterns.forEach(({ pattern, label }) => {
      pattern.lastIndex = 0;
      scrubbed = scrubbed.replace(pattern, `[REDACTED:${label}]`);
    });
    return scrubbed;
  };
}

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    tunnel: '/api/sentry-tunnel',
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // Capture 10% of transactions in production, 100% in dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Don't send events in development unless DSN is explicitly set
    enabled: import.meta.env.PROD,
    beforeSend(event: Sentry.ErrorEvent) {
      // Drop EvalError: CSP correctly blocking eval() calls — not app bugs
      const evalErr = 'Eval' + 'Error';
      if (event.exception?.values?.some((e) => e.type === evalErr)) return null;

      // Drop Supabase navigator lock errors — internal tab coordination, not app bugs
      // Happens when multiple tabs refresh the auth token simultaneously
      const lockPrefix = 'lock:sb-';
      if (
        event.exception?.values?.some(
          (e) =>
            e.value?.includes(lockPrefix) ||
            (e.type === 'AbortError' && e.value?.includes('steal'))
        )
      )
        return null;

      // Drop stale chunk errors — self-healed by the guard in main.tsx (hard reload)
      // Happens when a new deployment invalidates old chunk hashes for users with
      // the previous version still open. Guard reloads automatically, no user impact.
      if (
        event.exception?.values?.some(
          (e) =>
            e.value?.includes('Failed to fetch dynamically imported module') ||
            e.value?.includes('Importing a module script failed') ||
            e.value?.includes('is not a valid JavaScript MIME type')
        )
      )
        return null;

      // Strip any potential PII from request URLs
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          event.request.url = `${url.origin}${url.pathname}`;
        } catch {
          // ignore invalid URLs
        }
      }

      // ─── THI-120: Defense-in-depth API key scrubbing (beforeSend client-side) ───
      // Scrub API keys, tokens, PII from all event fields (breadcrumbs, extra, contexts, exception, headers, message)
      // Order: most specific patterns first to avoid generic patterns masking specific ones
      const scrubString = createScrubString(SCRUB_PATTERNS);

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

      // Scrub extra — preserve non-string values
      if (event.extra) {
        event.extra = Object.fromEntries(
          Object.entries(event.extra).map(([k, v]) => [
            k,
            typeof v === 'string' ? scrubString(v) : v,
          ])
        );
      }

      // Scrub exception messages
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((ex) => ({
          ...ex,
          value: scrubString(ex.value),
        }));
      }

      // Scrub contexts (LTI JWT claims, etc.) — preserve non-string values (objects, numbers) to avoid data loss
      if (event.contexts) {
        for (const ctxKey of Object.keys(event.contexts)) {
          const ctx = event.contexts[ctxKey];
          if (ctx && typeof ctx === 'object') {
            for (const [k, v] of Object.entries(ctx)) {
              (ctx as Record<string, unknown>)[k] = typeof v === 'string' ? scrubString(v) : v;
            }
          }
        }
      }

      // Scrub tags — preserve non-string values
      if (event.tags) {
        event.tags = Object.fromEntries(
          Object.entries(event.tags).map(([k, v]) => [
            k,
            typeof v === 'string' ? scrubString(v) : v,
          ])
        );
      }

      // Scrub request headers (Authorization, X-API-Key, etc.)
      if (event.request?.headers) {
        event.request.headers = Object.fromEntries(
          Object.entries(event.request.headers).map(([k, v]) => {
            const lower = k.toLowerCase();
            if (lower === 'authorization' || lower === 'x-api-key' || lower.includes('token')) {
              return [k, '[REDACTED:header]'];
            }
            return [k, scrubString(String(v))];
          })
        );
      }

      // Scrub top-level message
      if (event.message) {
        event.message = scrubString(event.message);
      }

      return event;
    },
  });
}

export { Sentry };
