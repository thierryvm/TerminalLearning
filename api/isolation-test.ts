/**
 * THI-134 — Test with Express-style handler signature.
 *
 * For Vercel Node.js Functions in non-Next.js projects (e.g., Vite SPA),
 * the expected handler signature is `(req: VercelRequest, res: VercelResponse)`,
 * NOT the Web Request -> Response pattern that works only on Edge runtime.
 *
 * This is the suspected root cause of THI-134 (api/lti/launch.ts also uses
 * the wrong Web pattern under runtime: 'nodejs').
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).setHeader('Content-Type', 'text/plain; charset=utf-8').send('isolation-test-express-style-ok');
}
