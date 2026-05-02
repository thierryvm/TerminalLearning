/**
 * THI-134 — Test with explicit `export const config = { runtime: 'nodejs' }`
 * (same syntax as api/sentry-tunnel.ts which works with `runtime: 'edge'`).
 */

export const config = { runtime: 'nodejs' };

export default async function handler(_req: Request): Promise<Response> {
  return new Response('isolation-test-config-runtime-nodejs-ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
