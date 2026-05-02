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
 * This was the THI-134 root cause: previous handler returned a Web `Response`
 * which Vercel Node.js silently waited for `res.send()` -> 504 timeout.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { VerifyOptions, verify } from 'jsonwebtoken';
import * as Sentry from '@sentry/node';

// SSRF protection: allowlist of trusted LMS issuers (security-auditor C2 fix)
const ALLOWED_ISSUERS = new Set([
  'https://canvas.instructure.com',
  'https://moodlecloud.com', // placeholder for Moodle cloud instances
  'https://smartschool.be', // Smartschool Belgium
  // Add instance-specific Canvas URLs as they onboard (e.g., 'https://myschool.instructure.com')
]);

const ALLOWED_ORIGIN = 'https://terminallearning.dev';

interface LtiLaunchRequest {
  id_token?: string;
  lti_message_hint?: string;
  [key: string]: any;
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
  [key: string]: any;
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
const oidcConfigCache = new Map<string, { config: any; expires: number }>();

async function getOidcConfig(issuer: string): Promise<any> {
  const cached = oidcConfigCache.get(issuer);
  if (cached && cached.expires > Date.now()) {
    return cached.config;
  }

  const configUrl = `${issuer}/.well-known/openid-configuration`;
  const response = await fetch(configUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`OIDC config fetch failed: ${response.status}`);
  }
  const config = await response.json();

  oidcConfigCache.set(issuer, {
    config,
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });

  return config;
}

/**
 * Fetch JWK Set from LMS OIDC provider
 */
async function getJwkSet(jwksUri: string): Promise<any> {
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
 * Exported so TypeScript noUnusedLocals does not flag it; consumers pass through the
 * handler in Phase 7c once `verifyJwt()` actually validates RS256 signatures via JWK Set.
 */
export async function verifyJwt(token: string, issuer: string): Promise<JwtClaims> {
  const oidcConfig = await getOidcConfig(issuer);
  if (!oidcConfig.jwks_uri) {
    throw new Error('OIDC config missing jwks_uri');
  }

  // Phase 7c will pass jwkSet to verify() to extract the RS256 public key
  // matching the kid claim in the token header.
  void (await getJwkSet(oidcConfig.jwks_uri));

  const options: VerifyOptions = {
    issuer,
    algorithms: ['RS256'], // LTI 1.3 mandate: RS256 only, no HS256 (security-auditor H5)
    ignoreExpiration: false,
  };

  // TODO Phase 7c: Fetch correct public key from jwkSet and pass to verify()
  return verify(token, 'TODO_PHASE7C_PUBLIC_KEY', {
    ...options,
    ignoreExpiration: true,
  }) as JwtClaims;
}

/**
 * Extract role mapping from LTI claim
 */
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

  // THI-133 — Phase 7c gate: LTI endpoint disabled until JWT validation is complete.
  // The current verifyJwt() uses a placeholder public key + ignoreExpiration:true, which
  // would accept forged JWTs with any roles/sub/iss from ALLOWED_ISSUERS. To enable, set
  // env LTI_ENABLED=true in the Vercel project settings (Phase 7c only). See docs/SECURITY.md.
  if (process.env.LTI_ENABLED !== 'true') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('LTI endpoint not available');
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
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      claims = payload;
      log.issuer = claims.iss;

      if (!claims.iss || !ALLOWED_ISSUERS.has(claims.iss)) {
        throw new Error(`Issuer "${claims.iss}" not in ALLOWED_ISSUERS allowlist (SSRF protection)`);
      }
    } catch {
      throw new Error('Failed to decode JWT payload');
    }

    const ltiRoles = claims['https://purl.imsglobal.org/spec/lti/claim/roles'] || [];
    const mappedRoles = mapLtiRoles(ltiRoles);
    log.roles = mappedRoles;

    const contextId = claims['https://purl.imsglobal.org/spec/lti/claim/context']?.id;
    if (contextId) {
      log.context_id = contextId;
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
          context_id: contextId,
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
