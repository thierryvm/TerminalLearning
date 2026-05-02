/**
 * THI-134 — Control endpoint at api/ root (vs api/lti/ subfolder)
 *
 * Same minimal handler as api/lti/isolation-test.ts but at the root of api/.
 * If this works and the lti/ version doesn't, the bug is specific to the
 * api/lti/ subfolder bundling on Vercel.
 *
 * Temporary — will be removed with isolation-test.ts once root cause is found.
 */

export const runtime = 'nodejs';

export default async function handler(_req: Request): Promise<Response> {
  return new Response('isolation-test-root-ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
