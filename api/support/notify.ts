/**
 * Support ticket notification — emails the super_admin when a user files a
 * support ticket (Sprint 2.C Étape 3, THI-319).
 *
 * Architecture decision (vs the brief's "Supabase Edge Function"):
 * the project's own `.env.example` documents `RESEND_API_KEY` as a **Vercel**
 * env var consumed by **Vercel Functions** — so this lives here, reusing the
 * `api/_rate-limit.ts` infra and the `sentry-tunnel.ts` Edge pattern, with zero
 * new platform, zero new dependency, and zero new high-privilege secret (the
 * project deliberately stores no service-role key). See THI-319.
 *
 * Trigger model: the browser calls this endpoint *after* a successful client
 * INSERT (best-effort nudge). The ticket already lives in the DB and the
 * super_admin dashboard (Étape 4) is the source of truth — a missed email never
 * loses a ticket.
 *
 * Security:
 * - Authorization is delegated to RLS, not re-implemented. The caller's Supabase
 *   access token is forwarded to PostgREST; the row comes back only if the
 *   caller owns it (policy "user select own") or is super_admin. No service-role
 *   key, no client-supplied ticket content trusted for the email body.
 * - Freshness guard: only tickets created in the last 2 minutes notify, so an
 *   owner cannot replay the endpoint to spam emails for old tickets.
 * - Per-IP sliding-window rate limit (shared module), tighter than the default.
 * - The description is HTML-escaped before going into the email body (the
 *   recipient is the admin, but defense-in-depth against HTML/markup injection).
 * - Secrets (RESEND_API_KEY) and ticket content are never echoed to the client
 *   nor logged. Resend failures degrade gracefully (HTTP 200, server log only).
 *
 * Vercel Edge Runtime — Web platform APIs only (Request/Response/fetch).
 */

export const config = { runtime: 'edge' };

import { extractClientIp, isRateLimited, maybeCleanup, type RatePolicy } from '../_rate-limit';

const ALLOWED_ORIGIN = 'https://terminallearning.dev';

// Email is an expensive, abusable side effect — far tighter than the 50/min
// default used by the Sentry tunnel.
const NOTIFY_RATE_POLICY: RatePolicy = { max: 10, windowMs: 60_000 };

// A `{ "ticketId": "<uuid>" }` body is ~50 bytes; cap well below that order of
// magnitude to fast-fail any payload-stuffing attempt.
const MAX_BODY_BYTES = 1024;

// Only tickets created within this window may notify (anti-replay). Kept short
// so the email-amplification window (re-notifying the same fresh ticket) stays
// small; the client fires this immediately after the INSERT (security M2).
const FRESHNESS_WINDOW_MS = 60_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  question: 'Question',
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

function json(status: number, body: Record<string, unknown>, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    // no-store: this is an authenticated POST; the `vercel.json` glob otherwise
    // tags every route `public, max-age=0` which is semantically wrong here and
    // could let a shared proxy cache an authz-scoped response (route-attack M1).
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders, ...extra },
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface TicketRow {
  id: string;
  type: string;
  description: string;
  screenshot_url: string | null;
  created_at: string;
}

function buildEmail(ticket: TicketRow): { subject: string; html: string } {
  const shortId = ticket.id.slice(0, 8);
  // Whitelist-only: never echo a raw DB `type` into the (non-escaped) subject.
  // The column is CHECK-constrained today, but the fallback guards a future
  // migration loosening it (route-attack L3 — email header injection vector).
  const typeLabel = TYPE_LABELS[ticket.type] ?? 'Signalement';
  const subject = `[TerminalLearning Support] ${typeLabel} #${shortId}`;
  const screenshotLine = ticket.screenshot_url
    ? `<p><strong>Capture :</strong> jointe au ticket (visible dans le panneau admin).</p>`
    : '';
  const html = [
    `<h2>Nouveau signalement — ${escapeHtml(typeLabel)}</h2>`,
    `<p><strong>Ticket :</strong> #${escapeHtml(shortId)}</p>`,
    `<p><strong>Description :</strong></p>`,
    `<blockquote style="border-left:3px solid #2ea043;padding-left:12px;color:#444;white-space:pre-wrap">${escapeHtml(
      ticket.description,
    )}</blockquote>`,
    screenshotLine,
    `<p><a href="${ALLOWED_ORIGIN}/app/admin">Ouvrir le panneau administrateur →</a></p>`,
  ]
    .filter(Boolean)
    .join('\n');
  return { subject, html };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' }, { Allow: 'POST, OPTIONS' });
  }

  // Per-IP sliding window (shared module).
  const now = Date.now();
  maybeCleanup(now, NOTIFY_RATE_POLICY);
  const ip = extractClientIp(req.headers);
  if (isRateLimited(ip, now, NOTIFY_RATE_POLICY)) {
    return json(429, { error: 'rate_limited' }, { 'Retry-After': '60' });
  }

  // The caller must present a Supabase access token; authorization is delegated
  // to RLS via PostgREST, never re-implemented here.
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  if (!token) {
    return json(401, { error: 'unauthorized' });
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return json(413, { error: 'payload_too_large' });
  }

  let ticketId: unknown;
  try {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) {
      return json(413, { error: 'payload_too_large' });
    }
    const parsed = JSON.parse(new TextDecoder().decode(buf)) as { ticketId?: unknown };
    ticketId = parsed.ticketId;
  } catch {
    return json(400, { error: 'bad_request' });
  }
  if (typeof ticketId !== 'string' || !UUID_RE.test(ticketId)) {
    return json(400, { error: 'bad_request' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.SUPPORT_TO_EMAIL;
  const fromEmail = process.env.SUPPORT_FROM_EMAIL ?? 'Terminal Learning <support@terminallearning.dev>';

  // Without Supabase config we cannot authorize the caller — refuse rather than
  // risk acting unauthenticated. Generic error (no config detail leaked).
  if (!supabaseUrl || !anonKey) {
    console.error('[support-notify] missing Supabase config');
    return json(500, { error: 'server_error' });
  }

  // Authorize + fetch the trusted row in one step: RLS returns it only if the
  // caller owns it (or is super_admin). Client-supplied content is never trusted.
  let row: TicketRow | null = null;
  try {
    const restUrl =
      `${supabaseUrl}/rest/v1/support_tickets` +
      `?id=eq.${encodeURIComponent(ticketId)}` +
      `&select=id,type,description,screenshot_url,created_at`;
    const lookup = await fetch(restUrl, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (lookup.status === 401 || lookup.status === 403) {
      return json(401, { error: 'unauthorized' });
    }
    if (!lookup.ok) {
      console.error(`[support-notify] lookup failed: ${lookup.status}`);
      return json(502, { error: 'upstream_error' });
    }
    const rows = (await lookup.json()) as TicketRow[];
    row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error(`[support-notify] lookup error: ${err instanceof Error ? err.message : 'unknown'}`);
    return json(502, { error: 'upstream_error' });
  }

  // RLS hid the row (not owned / does not exist) — do not confirm existence.
  if (!row) {
    return json(404, { error: 'not_found' });
  }

  // Anti-replay: only fresh tickets notify. Silently accept stale calls so an
  // owner cannot probe timing, and never email for an old ticket.
  const createdMs = Date.parse(row.created_at);
  if (!Number.isFinite(createdMs) || now - createdMs > FRESHNESS_WINDOW_MS) {
    return json(200, { ok: true, skipped: 'stale' });
  }

  // Email is best-effort. A misconfigured / rate-limited Resend must never fail
  // the user flow nor leak why.
  if (!resendKey || !toEmail) {
    console.error('[support-notify] email not configured (RESEND_API_KEY / SUPPORT_TO_EMAIL)');
    return json(200, { ok: true, skipped: 'email_not_configured' });
  }

  const { subject, html } = buildEmail(row);
  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({ from: fromEmail, to: toEmail, subject, html }),
    });
    if (!sent.ok) {
      // Log status only — never the response body (could echo payload).
      console.error(`[support-notify] resend failed: ${sent.status}`);
      return json(200, { ok: true, skipped: 'email_failed' });
    }
  } catch (err) {
    console.error(`[support-notify] resend error: ${err instanceof Error ? err.message : 'unknown'}`);
    return json(200, { ok: true, skipped: 'email_failed' });
  }

  return json(200, { ok: true });
}
