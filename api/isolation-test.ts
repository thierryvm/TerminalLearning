/**
 * THI-134 — Control endpoint at api/ root, NO runtime declaration.
 * Test if Vercel default Fluid Compute (Node.js) works without explicit declaration.
 *
 * Temporary — will be removed once root cause is found.
 */

export default async function handler(_req: Request): Promise<Response> {
  return new Response('isolation-test-root-no-runtime-decl-ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
