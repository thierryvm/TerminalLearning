/**
 * Sentry tunnel — proxies Sentry envelopes through our own domain so that
 * ad-blockers targeting *.ingest.sentry.io do not suppress error reports.
 *
 * Security:
 * - Validates that every envelope targets only our specific Sentry project,
 *   preventing this endpoint from being used as an open proxy.
 * - Per-IP rate limiting (sliding window) to prevent Sentry quota exhaustion
 *   or billing spikes from abusive clients.
 *
 * Vercel Edge Runtime — no Node.js APIs, uses standard Web platform APIs only.
 */

export const config = { runtime: 'edge' };

import { extractClientIp, isRateLimited, maybeCleanup, DEFAULT_RATE_POLICY } from './_rate-limit';

const ALLOWED_HOST = 'o4511149685080064.ingest.de.sentry.io';
const ALLOWED_PROJECT_ID = '4511149719552080';

/** 1 MB — well above any real Sentry envelope; guards against DoS via large payloads. */
const MAX_BODY_BYTES = 1 * 1024 * 1024;

// Rate limiting now lives in api/_lib/rateLimit.ts — shared across endpoints
// (sentry-tunnel + lti/launch). Same sliding window, same per-IP isolation.

// ─── Scrubber patterns (THI-120) ───────────────────────────────────────────
// OWASP: API key leakage, token exposure, PII exfiltration.
// Security: case-insensitive matching on string values only, not JSON keys.
const SCRUB_PATTERNS = {
  openrouter: /sk-or-v1-[a-zA-Z0-9]{64}/gi,
  anthropic: /sk-ant-[a-zA-Z0-9\-]{40,}/gi,
  openai: /sk-(?!or-|ant-)[a-zA-Z0-9]{48}/gi,
  gemini: /AIza[a-zA-Z0-9_\-]{35}/gi,
  jwt_token: /eyJ[A-Za-z0-9_\-]{50,}/gi,
  email: /[a-zA-Z0-9._%+\-]+@(?!example\.com|terminallearning\.dev|test)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi,
  generic_api_key: /sk-[a-zA-Z0-9_\-]{20,}/gi, // Fallback for future providers (Mistral, Groq, DeepSeek, etc.)
} as const;

type PatternKey = keyof typeof SCRUB_PATTERNS;

interface ScrubStats {
  patterns_hit: PatternKey[];
  item_type?: string;
  timestamp: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://terminallearning.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function withCors(response: Response): Response {
  // Clone response and add CORS headers
  const newResponse = new Response(response.body, response);
  Object.entries(corsHeaders).forEach(([k, v]) => newResponse.headers.set(k, v));
  return newResponse;
}

/**
 * Coverage matrix (THI-140):
 * - `event` (errors, captureMessage)        → full scrub: exception, breadcrumbs, extra, user, request, contexts, tags
 * - `transaction` (perf spans, tracing)     → common scrub: extra, user, request, contexts, tags (spans skipped for perf)
 * - `profile` (CPU/memory profiling)        → common scrub: tags, contexts, environment, release
 * - `check_in` (cron monitoring)            → common scrub: tags, contexts, environment, release
 * - other types (session, attachment, …)    → text-level fallback scrub on the raw body
 *
 * The "common" scrub covers the dev-controlled fields where an API key could be
 * accidentally attached. Per-span scrubbing inside transactions is deliberately
 * skipped: spans can be 50+ per transaction, scrubbing each would multiply CPU
 * cost on a hot path that already passes through the tunnel for every request.
 */
export function scrubEnvelopeItem(itemBody: string): { scrubbed: string; stats: ScrubStats } {
  const stats: ScrubStats = { patterns_hit: [], timestamp: Date.now() };

  // Parse the item (could be JSON or text) safely
  let itemJson: any;
  try {
    itemJson = JSON.parse(itemBody);
    stats.item_type = itemJson.type;
  } catch {
    itemJson = null;
  }

  if (!itemJson) {
    // Non-JSON body: fall back to text-level scrub
    let scrubbed = itemBody;
    Object.entries(SCRUB_PATTERNS).forEach(([key, pattern]) => {
      if (pattern.test(scrubbed)) {
        stats.patterns_hit.push(key as PatternKey);
        scrubbed = scrubbed.replace(pattern, `[REDACTED:${key}]`);
      }
    });
    return { scrubbed, stats };
  }

  function scrubValue(val: any): any {
    if (typeof val !== 'string') return val;
    let scrubbed = val;
    Object.entries(SCRUB_PATTERNS).forEach(([key, pattern]) => {
      if (pattern.test(scrubbed)) {
        stats.patterns_hit.push(key as PatternKey);
        scrubbed = scrubbed.replace(pattern, `[REDACTED:${key}]`);
      }
    });
    return scrubbed;
  }

  // ─── Common scrub (applies to event, transaction, profile, check_in) ──────
  //
  // Tags — dev-set string metadata; most likely place for an accidental key.
  if (itemJson.tags) {
    itemJson.tags = Object.fromEntries(
      Object.entries(itemJson.tags).map(([k, v]) => [k, scrubValue(String(v))]),
    );
  }
  // Contexts — Sentry 10+ open dictionary; common for custom debug data.
  if (itemJson.contexts) {
    itemJson.contexts = Object.fromEntries(
      Object.entries(itemJson.contexts).map(([k, v]) => [
        k,
        typeof v === 'object' && v !== null
          ? Object.fromEntries(
              Object.entries(v as Record<string, any>).map(([ck, cv]) => [
                ck,
                scrubValue(String(cv)),
              ]),
            )
          : scrubValue(String(v)),
      ]),
    );
  }
  // Extra — free-form key/value (not present on profile/check_in but cheap to check).
  if (itemJson.extra) {
    itemJson.extra = Object.fromEntries(
      Object.entries(itemJson.extra).map(([k, v]) => [k, scrubValue(String(v))]),
    );
  }
  // User — email and username may contain PII matching the email pattern.
  if (itemJson.user) {
    itemJson.user = {
      ...itemJson.user,
      email: scrubValue(itemJson.user.email),
      username: scrubValue(itemJson.user.username),
    };
  }
  // Request data — may contain headers/body with leaked secrets.
  if (itemJson.request?.data) {
    itemJson.request.data = scrubValue(itemJson.request.data);
  }
  // Environment/release strings (rarely sensitive but cheap to scrub uniformly).
  if (typeof itemJson.environment === 'string') {
    itemJson.environment = scrubValue(itemJson.environment);
  }
  if (typeof itemJson.release === 'string') {
    itemJson.release = scrubValue(itemJson.release);
  }

  // ─── Type-specific extra scrub (event only) ───────────────────────────────
  if (itemJson.type === 'event') {
    if (itemJson.exception?.values) {
      itemJson.exception.values = itemJson.exception.values.map((ex: any) => ({
        ...ex,
        value: scrubValue(ex.value),
      }));
    }
    if (itemJson.breadcrumbs) {
      itemJson.breadcrumbs = itemJson.breadcrumbs.map((bc: any) => ({
        ...bc,
        data: bc.data
          ? Object.fromEntries(
              Object.entries(bc.data).map(([k, v]) => [k, scrubValue(String(v))]),
            )
          : bc.data,
        message: scrubValue(bc.message),
      }));
    }
  }

  // Transactions: spans intentionally NOT scrubbed (perf — they can be 50+ per
  // transaction, and span data is rarely a place a developer would attach a key).
  // If a future incident proves otherwise, add a span-tag-only scrub here behind
  // a feature flag.

  return { scrubbed: JSON.stringify(itemJson), stats };
}

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }));
  }

  if (req.method !== 'POST') {
    return withCors(new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST, OPTIONS' },
    }));
  }

  // Rate limiting — sliding window per IP (shared module, see api/_lib/rateLimit.ts)
  const now = Date.now();
  maybeCleanup(now);
  const ip = extractClientIp(req.headers);
  if (isRateLimited(ip, now, DEFAULT_RATE_POLICY)) {
    return withCors(new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    }));
  }

  // Fast-fail on Content-Length before buffering the body.
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return withCors(new Response('Payload Too Large', { status: 413 }));
  }

  let envelope: string;
  try {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) {
      return withCors(new Response('Payload Too Large', { status: 413 }));
    }
    envelope = new TextDecoder().decode(buf);
  } catch {
    return withCors(new Response('Bad Request', { status: 400 }));
  }

  // The first line of a Sentry envelope is a JSON header containing the DSN.
  let dsn: URL;
  try {
    const header = JSON.parse(envelope.split('\n')[0]) as { dsn?: string };
    if (!header.dsn) return withCors(new Response('Missing DSN', { status: 400 }));
    dsn = new URL(header.dsn);
  } catch {
    return withCors(new Response('Invalid envelope header', { status: 400 }));
  }

  // Reject envelopes targeting any host or project other than our own.
  if (dsn.hostname !== ALLOWED_HOST) {
    return withCors(new Response('Forbidden', { status: 403 }));
  }
  const projectId = dsn.pathname.replace(/^\//, '');
  if (projectId !== ALLOWED_PROJECT_ID) {
    return withCors(new Response('Forbidden', { status: 403 }));
  }

  // ─── THI-120: Scrub the envelope before relaying to Sentry ───────────────
  let scrubbed_envelope = envelope;
  const allStats: ScrubStats[] = [];
  try {
    const lines = envelope.split('\n');
    const scrubbed_lines: string[] = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Envelope header (first line) — never scrub
      if (i === 0) {
        scrubbed_lines.push(line);
        i++;
        continue;
      }

      // Item header (JSON with type, length, etc.) — parse to validate format,
      // but we don't act on the header itself; the body lines below carry the
      // actual content that may need scrubbing.
      try {
        JSON.parse(line);
      } catch {
        scrubbed_lines.push(line);
        i++;
        continue;
      }

      scrubbed_lines.push(line); // Push unmodified item header
      i++;

      // Item body (next line, until we hit an empty line or another header)
      if (i < lines.length) {
        const itemBody = lines[i];
        const { scrubbed, stats } = scrubEnvelopeItem(itemBody);
        allStats.push(stats);

        if (stats.patterns_hit.length > 0) {
          console.log(`[sentry-scrubber] patterns detected: ${stats.patterns_hit.join(', ')}, type=${stats.item_type}`);
        }

        scrubbed_lines.push(scrubbed);
        i++;
      }
    }

    scrubbed_envelope = scrubbed_lines.join('\n');
  } catch (err) {
    // If scrubbing fails, send the envelope unmodified rather than losing the error
    console.error(`[sentry-scrubber] error: ${err instanceof Error ? err.message : String(err)}, proceeding unmodified`);
  }

  const upstream = await fetch(
    `https://${ALLOWED_HOST}/api/${ALLOWED_PROJECT_ID}/envelope/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: scrubbed_envelope,
    },
  );

  return withCors(new Response(null, { status: upstream.status }));
}
