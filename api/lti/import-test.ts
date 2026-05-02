/**
 * THI-134 — Test if @sentry/node + jsonwebtoken imports crash the Node.js cold-start.
 * Express-style handler (proven to work via isolation-test).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verify } from 'jsonwebtoken';
import * as Sentry from '@sentry/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  // Reference imports so they're not tree-shaken (TS noUnusedLocals)
  const _refs = { verify, sentryHasCapture: typeof Sentry.captureMessage };
  res.status(200).json({ ok: true, refs: Object.keys(_refs) });
}
