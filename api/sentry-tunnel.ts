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

const ALLOWED_HOST = 'o4511149685080064.ingest.de.sentry.io';
const ALLOWED_PROJECT_ID = '4511149719552080';

/** 1 MB — well above any real Sentry envelope; guards against DoS via large payloads. */
const MAX_BODY_BYTES = 1 * 1024 * 1024;

// ─── Rate limiting (sliding window, per IP) ───────────────────────────────────
// Module-level state persists within a single Edge isolate instance.
// Not globally shared across all edge nodes, but provides meaningful protection
// against single-IP burst abuse on the same warm instance.
const RATE_LIMIT_MAX = 50; // requests
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

interface RateEntry {
  timestamps: number[];
}
const rateLimitMap = new Map<string, RateEntry>();

function isRateLimited(ip: string, now: number): boolean {
  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };
  // Evict timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, entry);
    return true;
  }
  entry.timestamps.push(now);
  rateLimitMap.set(ip, entry);
  return false;
}

// Prevent unbounded Map growth: evict all stale entries every 5 minutes.
// Edge isolates are short-lived, so this is a safety net rather than a
// long-running maintenance task.
let lastCleanup = Date.now();
function maybeCleanup(now: number): void {
  if (now - lastCleanup < 5 * 60_000) return;
  lastCleanup = now;
  for (const [ip, entry] of rateLimitMap) {
    if (entry.timestamps.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
      rateLimitMap.delete(ip);
    }
  }
}

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

function scrubEnvelopeItem(itemBody: string): { scrubbed: string; stats: ScrubStats } {
  const stats: ScrubStats = { patterns_hit: [], timestamp: Date.now() };
  let scrubbed = itemBody;

  // Parse the item (could be JSON or text) safely
  let itemJson: any;
  try {
    itemJson = JSON.parse(itemBody);
    stats.item_type = itemJson.type;
  } catch {
    // Not JSON, treat as plain text
    itemJson = null;
  }

  if (!itemJson) {
    // Fallback: scrub text directly (less precise but safe)
    Object.entries(SCRUB_PATTERNS).forEach(([key, pattern]) => {
      if (pattern.test(scrubbed)) {
        stats.patterns_hit.push(key as PatternKey);
        scrubbed = scrubbed.replace(pattern, `[REDACTED:${key}]`);
      }
    });
    return { scrubbed, stats };
  }

  // Scrub only event items (not transactions, sessions, etc.)
  if (itemJson.type !== 'event') {
    return { scrubbed: itemBody, stats };
  }

  // Recursively scrub string values in sensitive fields
  const sensitiveFields = [
    'exception.values[].value',
    'breadcrumbs[].data',
    'extra',
    'user.email',
    'user.username',
    'request.data',
  ];

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

  // Scrub exception values
  if (itemJson.exception?.values) {
    itemJson.exception.values = itemJson.exception.values.map((ex: any) => ({
      ...ex,
      value: scrubValue(ex.value),
    }));
  }

  // Scrub breadcrumbs
  if (itemJson.breadcrumbs) {
    itemJson.breadcrumbs = itemJson.breadcrumbs.map((bc: any) => ({
      ...bc,
      data: bc.data ? Object.fromEntries(
        Object.entries(bc.data).map(([k, v]) => [k, scrubValue(String(v))])
      ) : bc.data,
      message: scrubValue(bc.message),
    }));
  }

  // Scrub extra
  if (itemJson.extra) {
    itemJson.extra = Object.fromEntries(
      Object.entries(itemJson.extra).map(([k, v]) => [k, scrubValue(String(v))])
    );
  }

  // Scrub user
  if (itemJson.user) {
    itemJson.user = {
      ...itemJson.user,
      email: scrubValue(itemJson.user.email),
      username: scrubValue(itemJson.user.username),
    };
  }

  // Scrub request data
  if (itemJson.request?.data) {
    itemJson.request.data = scrubValue(itemJson.request.data);
  }

  // Scrub contexts (Sentry 10+ custom context fields)
  if (itemJson.contexts) {
    itemJson.contexts = Object.fromEntries(
      Object.entries(itemJson.contexts).map(([k, v]) => [
        k,
        typeof v === 'object' && v !== null
          ? Object.fromEntries(
              Object.entries(v as Record<string, any>).map(([ck, cv]) => [
                ck,
                scrubValue(String(cv))
              ])
            )
          : scrubValue(String(v))
      ])
    );
  }

  // Scrub tags (dev-set metadata)
  if (itemJson.tags) {
    itemJson.tags = Object.fromEntries(
      Object.entries(itemJson.tags).map(([k, v]) => [k, scrubValue(String(v))])
    );
  }

  return { scrubbed: JSON.stringify(itemJson), stats };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  // Rate limiting — sliding window per IP
  const now = Date.now();
  maybeCleanup(now);
  const ip =
    req.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown';
  if (isRateLimited(ip, now)) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  }

  // Fast-fail on Content-Length before buffering the body.
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return new Response('Payload Too Large', { status: 413 });
  }

  let envelope: string;
  try {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) {
      return new Response('Payload Too Large', { status: 413 });
    }
    envelope = new TextDecoder().decode(buf);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // The first line of a Sentry envelope is a JSON header containing the DSN.
  let dsn: URL;
  try {
    const header = JSON.parse(envelope.split('\n')[0]) as { dsn?: string };
    if (!header.dsn) return new Response('Missing DSN', { status: 400 });
    dsn = new URL(header.dsn);
  } catch {
    return new Response('Invalid envelope header', { status: 400 });
  }

  // Reject envelopes targeting any host or project other than our own.
  if (dsn.hostname !== ALLOWED_HOST) {
    return new Response('Forbidden', { status: 403 });
  }
  const projectId = dsn.pathname.replace(/^\//, '');
  if (projectId !== ALLOWED_PROJECT_ID) {
    return new Response('Forbidden', { status: 403 });
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

      // Item header (JSON with type, length, etc.)
      let itemHeader: any;
      try {
        itemHeader = JSON.parse(line);
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

  return new Response(null, { status: upstream.status });
}
