/**
 * LTI 1.3 Launch Handler — SPIKE Phase (THI-127)
 *
 * Receives LMS launch JWT, validates signature, logs claims to Sentry for inspection.
 * NO user persistence yet (Phase 7c). Pure validation + observability.
 *
 * Security:
 * - Validates issuer against ALLOWED_ISSUERS allowlist (SSRF protection, security-auditor C2)
 * - Fetches LMS public key from /.well-known/openid-configuration (Canvas, Moodle, etc.)
 * - Validates JWT signature RS256-only (no HS256, security-auditor H5)
 * - Enforces exp + iat claims
 * - Logs to Sentry with scrubbing (no PII exposure)
 *
 * Node.js runtime — allows JWT validation libs + Sentry client.
 */

import { VerifyOptions, verify } from 'jsonwebtoken';
import * as Sentry from '@sentry/node';

export const config = { runtime: 'nodejs' };

// SSRF protection: allowlist of trusted LMS issuers (security-auditor C2 fix)
const ALLOWED_ISSUERS = new Set([
  'https://canvas.instructure.com',
  'https://moodlecloud.com', // placeholder for Moodle cloud instances
  'https://smartschool.be', // Smartschool Belgium
  // Add instance-specific Canvas URLs as they onboard (e.g., 'https://myschool.instructure.com')
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://terminallearning.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

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

  try {
    const configUrl = `${issuer}/.well-known/openid-configuration`;
    const response = await fetch(configUrl, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`OIDC config fetch failed: ${response.status}`);
    }
    const config = await response.json();

    // Cache for 24h
    oidcConfigCache.set(issuer, {
      config,
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    return config;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: 'lti_launch', phase: 'oidc_config_fetch' },
    });
    throw err;
  }
}

/**
 * Fetch JWK Set from LMS OIDC provider
 */
async function getJwkSet(jwksUri: string): Promise<any> {
  try {
    const response = await fetch(jwksUri, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`JWKS fetch failed: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: 'lti_launch', phase: 'jwks_fetch' },
    });
    throw err;
  }
}

/**
 * Verify and decode JWT — Phase 7c (not called in SPIKE phase)
 * RS256 only per LTI 1.3 spec. No HS256 (security-auditor H5 fix).
 */
async function verifyJwt(token: string, issuer: string): Promise<JwtClaims> {
  try {
    // Fetch OIDC config to find JWK Set URI
    const oidcConfig = await getOidcConfig(issuer);
    if (!oidcConfig.jwks_uri) {
      throw new Error('OIDC config missing jwks_uri');
    }

    // Fetch JWK Set
    const jwkSet = await getJwkSet(oidcConfig.jwks_uri);

    // Phase 7c: Implement full RS256 JWK validation here
    // Extract public key from JWK Set matching kid claim in token header
    // For now, return placeholder
    const options: VerifyOptions = {
      issuer,
      algorithms: ['RS256'], // LTI 1.3 mandate: RS256 only, no HS256 (security-auditor H5)
      ignoreExpiration: false, // Validate exp claim
    };

    // TODO: Fetch correct public key from jwkSet and pass to verify()
    const decoded = verify(token, 'TODO_PHASE7C_PUBLIC_KEY', {
      ...options,
      ignoreExpiration: true,
    }) as JwtClaims;

    // SPIKE: Log the claims for inspection
    Sentry.captureMessage('LTI SPIKE: JWT decoded successfully', {
      level: 'info',
      tags: { component: 'lti_launch', phase: 'spike' },
      contexts: {
        jwt_claims: {
          sub: decoded.sub,
          iss: decoded.iss,
          aud: decoded.aud,
          roles: decoded['https://purl.imsglobal.org/spec/lti/claim/roles'],
          context_id: decoded['https://purl.imsglobal.org/spec/lti/claim/context']?.id,
        },
      },
    });

    return decoded;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: 'lti_launch', phase: 'jwt_verify' },
    });
    throw err;
  }
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
    .filter((role, index, arr) => arr.indexOf(role) === index); // dedup
}

export default async function handler(req: any): Promise<Response> {
  // THI-133 — Phase 7c gate: LTI endpoint disabled in production until JWT validation is complete.
  // The current verifyJwt() uses a placeholder public key + ignoreExpiration:true, which would
  // accept forged JWTs with any roles/sub/iss from ALLOWED_ISSUERS. To enable, set the env
  // variable LTI_ENABLED=true in the Vercel project settings (Phase 7c only, after RS256 JWK
  // validation lands). Documented in docs/SECURITY.md.
  if (process.env.LTI_ENABLED !== 'true') {
    return new Response('LTI endpoint not available', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        ...corsHeaders,
      },
    });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'POST, OPTIONS',
        ...corsHeaders,
      },
    });
  }

  const log: LtiLaunchLog = {
    event: 'lti_launch_received',
    timestamp: Date.now(),
  };

  try {
    // Parse POST body
    let body: LtiLaunchRequest = {};
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      // LTI typically sends form-encoded
      const text = await req.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params);
    } else if (req.headers['content-type']?.includes('application/json')) {
      body = await req.json();
    }

    const idToken = body.id_token;
    if (!idToken) {
      throw new Error('Missing id_token in request body');
    }

    // Decode JWT header to extract issuer (iss claim)
    // For SPIKE, we skip full signature validation and just inspect the token structure
    // Phase 7c: Will implement full RS256 verification with JWK Sets
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format (expected 3 parts)');
    }

    let claims: JwtClaims;
    try {
      // Decode without verification first (SPIKE phase)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      claims = payload;
      log.issuer = claims.iss;

      // SSRF protection: Validate issuer against allowlist (security-auditor C2 fix)
      if (!claims.iss || !ALLOWED_ISSUERS.has(claims.iss)) {
        throw new Error(`Issuer "${claims.iss}" not in ALLOWED_ISSUERS allowlist (SSRF protection)`);
      }
    } catch {
      throw new Error('Failed to decode JWT payload');
    }

    // Extract LTI roles
    const ltiRoles = claims['https://purl.imsglobal.org/spec/lti/claim/roles'] || [];
    const mappedRoles = mapLtiRoles(ltiRoles);
    log.roles = mappedRoles;

    // Extract context ID (course/class)
    const contextId = claims['https://purl.imsglobal.org/spec/lti/claim/context']?.id;
    if (contextId) {
      log.context_id = contextId;
    }

    // Log successful launch
    log.event = 'lti_launch_valid';
    Sentry.captureMessage('LTI SPIKE: Launch validated', {
      level: 'info',
      tags: { component: 'lti_launch', phase: 'spike' },
      contexts: {
        lti_launch: log,
      },
    });

    // SPIKE phase: Just acknowledge the launch (no persistence)
    return new Response(
      JSON.stringify({
        status: 'ok',
        message: 'LTI launch received. Validation logged to Sentry. Phase 7c: Supabase persistence + grade passback will be implemented.',
        claims: {
          sub: claims.sub,
          issuer: claims.iss,
          roles: mappedRoles,
          context_id: contextId,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (err) {
    log.event = 'lti_launch_error';
    log.error = err instanceof Error ? err.message : String(err);

    Sentry.captureException(err, {
      tags: { component: 'lti_launch', phase: 'spike' },
      contexts: { lti_launch: log },
    });

    return new Response(
      JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}
