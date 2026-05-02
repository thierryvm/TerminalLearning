/**
 * THI-135 — Diagnose if importing rateLimit module crashes Node.js cold-start.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractClientIp } from '../../lib/rateLimit';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const ip = extractClientIp(req.headers);
  res.status(200).json({ ok: true, ip });
}
