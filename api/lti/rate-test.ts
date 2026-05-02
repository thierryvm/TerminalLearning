/**
 * THI-135 — Test sans import externe (uniquement type @vercel/node).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, mode: 'no-external-import' });
}
