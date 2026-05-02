/**
 * THI-135 — Test if importing from api/_rate-limit.ts (co-located) works.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractClientIp } from '../_rate-limit';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const ip = extractClientIp(req.headers);
  res.status(200).json({ ok: true, mode: 'co-located-import', ip });
}
