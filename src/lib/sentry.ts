import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

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
      return event;
    },
  });
}

export { Sentry };
