/**
 * Sliding-window rate limiter — per-IP, per-module instance (THI-120 + THI-135).
 *
 * Shared across Vercel API routes that need rate limiting. Initially extracted
 * from `api/sentry-tunnel.ts` and now applied to `api/lti/launch.ts` as well.
 *
 * Scope of protection:
 * - Module-level state persists within a single Vercel isolate instance.
 * - Not globally shared across all edge nodes, but provides meaningful protection
 *   against single-IP burst abuse on the same warm instance.
 * - Vercel typically routes the same client to the same warm isolate when possible,
 *   so practical effectiveness is high for sustained attacks.
 *
 * IP source:
 * - Vercel injects `x-vercel-forwarded-for` (non-spoofable). Always read this header
 *   first; fall back to `cf-connecting-ip` for non-Vercel infra parity.
 * - Never read user-controllable `x-forwarded-for` (security-auditor H5 fix from
 *   21 April 2026 incident).
 *
 * Usage:
 * ```ts
 * import { extractClientIp, isRateLimited, maybeCleanup, DEFAULT_RATE_POLICY } from '../_lib/rateLimit';
 *
 * const ip = extractClientIp(req.headers);
 * const now = Date.now();
 * maybeCleanup(now);
 * if (isRateLimited(ip, now, DEFAULT_RATE_POLICY)) {
 *   res.setHeader('Retry-After', '60');
 *   res.status(429).send('Too Many Requests');
 *   return;
 * }
 * ```
 */

export interface RatePolicy {
  /** Maximum requests allowed within the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export const DEFAULT_RATE_POLICY: RatePolicy = {
  max: 50,
  windowMs: 60_000, // 1 minute
};

interface RateEntry {
  timestamps: number[];
}

// Module-level state. Each Vercel isolate has its own Map; consumers of this
// module within the same isolate share it (cross-endpoint protection).
const rateLimitMap = new Map<string, RateEntry>();

const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes
let lastCleanup = Date.now();

/**
 * Check if an IP has exceeded the policy. Side effect: records the current
 * timestamp if the request is allowed.
 *
 * Returns `true` when the request must be rejected (HTTP 429).
 */
export function isRateLimited(ip: string, now: number, policy: RatePolicy = DEFAULT_RATE_POLICY): boolean {
  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };
  // Evict timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => now - t < policy.windowMs);
  if (entry.timestamps.length >= policy.max) {
    rateLimitMap.set(ip, entry);
    return true;
  }
  entry.timestamps.push(now);
  rateLimitMap.set(ip, entry);
  return false;
}

/**
 * Periodic safety net to prevent unbounded Map growth in long-running isolates.
 * Cheap operation — only iterates and skips entries that already had their
 * timestamps evicted on previous calls. Skips work entirely if called within
 * the cleanup interval.
 */
export function maybeCleanup(now: number, policy: RatePolicy = DEFAULT_RATE_POLICY): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [ip, entry] of rateLimitMap) {
    if (entry.timestamps.every((t) => now - t >= policy.windowMs)) {
      rateLimitMap.delete(ip);
    }
  }
}

/**
 * Extract the client IP from request headers using only Vercel-injected headers
 * (non-spoofable). Returns `'unknown'` if no trusted header is present (e.g. local
 * dev), which still rate-limits but groups all anonymous traffic under one bucket.
 *
 * @param headers Request headers — accepts both `Headers` (Edge) and plain
 *   `Record<string, string | string[] | undefined>` (Node.js IncomingMessage.headers).
 */
export function extractClientIp(
  headers: Headers | Record<string, string | string[] | undefined>,
): string {
  const get = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    const v = headers[name];
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };

  const xvff = get('x-vercel-forwarded-for');
  if (xvff) {
    // Header may be comma-separated; first value is the original client.
    return xvff.split(',')[0].trim();
  }
  const cf = get('cf-connecting-ip');
  if (cf) return cf;
  return 'unknown';
}

/**
 * Test-only utility to reset internal state between unit tests.
 * Do NOT call from production code.
 */
export function __resetForTests(): void {
  rateLimitMap.clear();
  lastCleanup = 0;
}
