/**
 * THI-134 — LTI cold-start isolation test
 *
 * Minimal handler with ZERO imports. Used to determine whether the 500
 * FUNCTION_INVOCATION_FAILED on /api/lti/launch is caused by:
 *
 *   (a) something specific to launch.ts (e.g. @sentry/node import,
 *       jsonwebtoken import, runtime declaration syntax)
 *   (b) a global issue with the api/lti/ subdirectory bundling
 *
 * If GET /api/lti/_isolation_test returns 200 -> cause is (a)
 * If it returns 500 -> cause is (b)
 *
 * This file is temporary and will be removed once THI-134 is resolved.
 */

export const runtime = 'nodejs';

export default async function handler(_req: Request): Promise<Response> {
  return new Response('isolation-test-ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
