import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // Capture 10% of transactions in production, 100% in dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Don't send events in development unless DSN is explicitly set
    enabled: import.meta.env.PROD,
    beforeSend(event: Sentry.ErrorEvent) {
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
