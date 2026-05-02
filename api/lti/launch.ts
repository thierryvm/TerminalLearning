/**
 * LTI 1.3 Launch Handler — SPIKE Phase (THI-127, THI-133, THI-134)
 *
 * Receives LMS launch JWT and inspects claims structure. NO user persistence
 * yet (Phase 7c). Pure validation, gated by `LTI_ENABLED` env flag.
 *
 * Security:
 * - THI-133: Gated by `process.env.LTI_ENABLED === 'true'` (returns 503 otherwise)
 * - Validates issuer against ALLOWED_ISSUERS allowlist (SSRF protection, security-auditor C2)
 * - Phase 7c will add full RS256 JWK validation (security-auditor H5)
 *
 * Vercel Node.js Function — uses Express-style `(req, res)` signature with
 * `@vercel/node` types. The Web `Request -> Response` pattern is NOT supported
 * on Vercel Node.js runtime (it works only on Edge runtime, e.g. sentry-tunnel.ts).
 *
 * THI-134 root cause: top-level imports of `@sentry/node` + `jsonwebtoken` crash
 * the Vercel Node.js cold-start with FUNCTION_INVOCATION_FAILED. They are now
 * lazy-loaded AFTER the feature-flag early-return, so the 503 path stays
 * lightweight and the heavy deps are only loaded when LTI_ENABLED=true (Phase 7c).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── Rate limiting (sliding window per IP) ────────────────────────────────────
// IMPORTANT: this logic is duplicated from api/_rate-limit.ts (which serves
// api/sentry-tunnel.ts on the Edge runtime). Inline copy here is intentional:
// Vercel Node.js Functions bundling does not reliably follow imports to other
// .ts files in the project at the time of THI-135 (May 2026). Importing the
// shared module reproducibly causes FUNCTION_INVOCATION_FAILED at cold-start.
//
// The shared module remains the single source of truth for unit tests
// (src/test/rateLimit.test.ts) and the Edge sentry-tunnel consumer. This inline
// copy must stay byte-equivalent in behaviour; the test suite covers the shared
// module, and any drift between the two would cost us the duplication's only
// safety net.
// TODO: revisit when migrating to vercel.ts config or when Vercel resolves
// Node.js bundle resolution for cross-file .ts imports.

const RATE_POLICY = { max: 50, windowMs: 60_000 };
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const rateLimitMap = new Map<string, { timestamps: number[] }>();
let lastCleanup = Date.now();

function isRateLimited(ip: string, now: number): boolean {
  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_POLICY.windowMs);
  if (entry.timestamps.length >= RATE_POLICY.max) {
    rateLimitMap.set(ip, entry);
    return true;
  }
  entry.timestamps.push(now);
  rateLimitMap.set(ip, entry);
  return false;
}

function maybeCleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [ip, entry] of rateLimitMap) {
    if (entry.timestamps.every((t) => now - t >= RATE_POLICY.windowMs)) {
      rateLimitMap.delete(ip);
    }
  }
}

function extractClientIp(headers: Record<string, string | string[] | undefined>): string {
  const get = (name: string): string | null => {
    const v = headers[name];
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };
  const xvff = get('x-vercel-forwarded-for');
  if (xvff) return xvff.split(',')[0].trim();
  const cf = get('cf-connecting-ip');
  if (cf) return cf;
  return 'unknown';
}

// SSRF protection: allowlist of trusted LMS issuers (security-auditor C2 fix)
const ALLOWED_ISSUERS = new Set([
  'https://canvas.instructure.com',
  'https://moodlecloud.com',
  'https://smartschool.be',
]);

const ALLOWED_ORIGIN = 'https://terminallearning.dev';

interface LtiLaunchRequest {
  id_token?: string;
  lti_message_hint?: string;
  [key: string]: unknown;
}

interface JwtClaims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  email?: string;
  name?: string;
  'https://purl.imsglobal.org/spec/lti/claim/roles'?: string[];
  'https://purl.imsglobal.org/spec/lti/claim/context'?: {
    id: string;
    label?: string;
    title?: string;
  };
  [key: string]: unknown;
}

interface LtiLaunchLog {
  event: 'lti_launch_received' | 'lti_launch_valid' | 'lti_launch_error';
  timestamp: number;
  issuer?: string;
  roles?: string[];
  context_id?: string;
  error?: string;
}

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Fetch OIDC configuration from LMS to get public key
 * Caches result for 24h to avoid repeated fetches
 */
const oidcConfigCache = new Map<string, { config: Record<string, unknown>; expires: number }>();

async function getOidcConfig(issuer: string): Promise<Record<string, unknown>> {
  const cached = oidcConfigCache.get(issuer);
  if (cached && cached.expires > Date.now()) {
    return cached.config;
  }

  const configUrl = `${issuer}/.well-known/openid-configuration`;
  const response = await fetch(configUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`OIDC config fetch failed: ${response.status}`);
  }
  const config = (await response.json()) as Record<string, unknown>;

  oidcConfigCache.set(issuer, {
    config,
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });

  return config;
}

async function getJwkSet(jwksUri: string): Promise<unknown> {
  const response = await fetch(jwksUri, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`JWKS fetch failed: ${response.status}`);
  }
  return await response.json();
}

/**
 * Verify and decode JWT — Phase 7c (not called in SPIKE phase, see THI-133 feature flag)
 * RS256 only per LTI 1.3 spec. No HS256 (security-auditor H5 fix).
 *
 * Lazy-loads `jsonwebtoken` to keep the cold-start lightweight when LTI_ENABLED=false
 * (THI-134). Exported so noUnusedLocals does not flag it; consumers will pass through
 * the handler in Phase 7c once `verifyJwt()` actually validates RS256 signatures.
 */
export async function verifyJwt(token: string, issuer: string): Promise<JwtClaims> {
  const oidcConfig = await getOidcConfig(issuer);
  if (!oidcConfig.jwks_uri) {
    throw new Error('OIDC config missing jwks_uri');
  }

  void (await getJwkSet(oidcConfig.jwks_uri as string));

  // Lazy-load jsonwebtoken (heavy import, can crash Node.js cold-start on Vercel)
  const { verify } = await import('jsonwebtoken');

  // TODO Phase 7c: extract correct public key from jwkSet matching kid claim
  return verify(token, 'TODO_PHASE7C_PUBLIC_KEY', {
    issuer,
    algorithms: ['RS256'], // LTI 1.3 mandate
    ignoreExpiration: true, // SPIKE only — Phase 7c will set false
  }) as JwtClaims;
}

function mapLtiRoles(ltiRoles: string[]): string[] {
  const roleMap: { [key: string]: string } = {
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor': 'teacher',
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Learner': 'student',
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator': 'institution_admin',
  };

  return ltiRoles
    .map((ltiRole) => roleMap[ltiRole] || 'student')
    .filter((role, index, arr) => arr.indexOf(role) === index);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCorsHeaders(res);

  // THI-133 — feature flag gate: returns 503 unless LTI_ENABLED=true
  if (process.env.LTI_ENABLED !== 'true') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('LTI endpoint not available');
    return;
  }

  // THI-135 — Rate limit per IP (50 req/min, same policy as sentry-tunnel).
  // Applied AFTER the feature flag so the 503 path stays cheap. Even when
  // LTI_ENABLED=true, this caps brute-force/DDoS attempts on the JWT verification
  // and OIDC config fetch logic.
  const now = Date.now();
  maybeCleanup(now);
  const ip = extractClientIp(req.headers);
  if (isRateLimited(ip, now)) {
    res.setHeader('Retry-After', '60');
    res.status(429).send('Too Many Requests');
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).send('Method Not Allowed');
    return;
  }

  // THI-134 — Lazy-load Sentry only when the flag is on. Top-level imports of
  // @sentry/node crash the Vercel Node.js cold-start with FUNCTION_INVOCATION_FAILED.
  const Sentry = await import('@sentry/node');

  const log: LtiLaunchLog = {
    event: 'lti_launch_received',
    timestamp: Date.now(),
  };

  try {
    const body = (req.body as LtiLaunchRequest) ?? {};
    const idToken = body.id_token;
    if (!idToken) {
      throw new Error('Missing id_token in request body');
    }

    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format (expected 3 parts)');
    }

    let claims: JwtClaims;
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8')) as JwtClaims;
      claims = payload;
      log.issuer = claims.iss;

      if (!claims.iss || !ALLOWED_ISSUERS.has(claims.iss)) {
        throw new Error(`Issuer "${claims.iss}" not in ALLOWED_ISSUERS allowlist (SSRF protection)`);
      }
    } catch {
      throw new Error('Failed to decode JWT payload');
    }

    const ltiRoles = (claims['https://purl.imsglobal.org/spec/lti/claim/roles'] as string[]) || [];
    const mappedRoles = mapLtiRoles(ltiRoles);
    log.roles = mappedRoles;

    const contextValue = claims['https://purl.imsglobal.org/spec/lti/claim/context'] as { id?: string } | undefined;
    if (contextValue?.id) {
      log.context_id = contextValue.id;
    }

    log.event = 'lti_launch_valid';
    Sentry.captureMessage('LTI SPIKE: Launch validated', {
      level: 'info',
      tags: { component: 'lti_launch', phase: 'spike' },
      contexts: { lti_launch: { ...log } as Record<string, unknown> },
    });

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(
      JSON.stringify({
        status: 'ok',
        message: 'LTI launch received. Phase 7c: Supabase persistence + grade passback will be implemented.',
        claims: {
          sub: claims.sub,
          issuer: claims.iss,
          roles: mappedRoles,
          context_id: log.context_id,
        },
      }),
    );
  } catch (err) {
    log.event = 'lti_launch_error';
    log.error = err instanceof Error ? err.message : String(err);

    Sentry.captureException(err, {
      tags: { component: 'lti_launch', phase: 'spike' },
      contexts: { lti_launch: { ...log } as Record<string, unknown> },
    });

    res.setHeader('Content-Type', 'application/json');
    res.status(400).send(
      JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      }),
    );
  }
}
