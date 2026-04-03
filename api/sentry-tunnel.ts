/**
 * Sentry tunnel — proxies Sentry envelopes through our own domain so that
 * ad-blockers targeting *.ingest.sentry.io do not suppress error reports.
 *
 * Security: validates that every envelope targets only our specific Sentry
 * project before forwarding, preventing this endpoint from being used as an
 * open proxy to arbitrary Sentry projects.
 *
 * Vercel Edge Runtime — no Node.js APIs, uses standard Web platform APIs only.
 */

export const config = { runtime: 'edge' };

const ALLOWED_HOST = 'o4511149685080064.ingest.de.sentry.io';
const ALLOWED_PROJECT_ID = '4511149719552080';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let envelope: string;
  try {
    envelope = await req.text();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // The first line of a Sentry envelope is a JSON header containing the DSN.
  let dsn: URL;
  try {
    const header = JSON.parse(envelope.split('\n')[0]) as { dsn?: string };
    if (!header.dsn) return new Response('Missing DSN', { status: 400 });
    dsn = new URL(header.dsn);
  } catch {
    return new Response('Invalid envelope header', { status: 400 });
  }

  // Reject envelopes targeting any host or project other than our own.
  if (dsn.hostname !== ALLOWED_HOST) {
    return new Response('Forbidden', { status: 403 });
  }
  const projectId = dsn.pathname.replace(/^\//, '');
  if (projectId !== ALLOWED_PROJECT_ID) {
    return new Response('Forbidden', { status: 403 });
  }

  const upstream = await fetch(
    `https://${ALLOWED_HOST}/api/${ALLOWED_PROJECT_ID}/envelope/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
    },
  );

  return new Response(null, { status: upstream.status });
}
