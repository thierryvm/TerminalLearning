/**
 * LTI 1.3 JWT Verification (THI-131 Phase 7c Auth MVP)
 *
 * Verifies an LMS launch JWT against the strict LTI 1.3 spec. Uses `jose@6`
 * for native Web Crypto API support — no `jsonwebtoken` glue, no `crypto`
 * polyfill cost on Vercel Functions cold-start.
 *
 * Security guarantees (10 checks audited by `.claude/agents/lti-auditor.md`):
 *
 *   [C1]  RS256 signature verification ONLY (no HS256, no `alg=none`)
 *   [C2]  `iss` claim validated against hardcoded ALLOWED_ISSUERS allowlist
 *         BEFORE any network fetch — defends against SSRF via attacker iss
 *   [C3]  `aud` claim must match TL_CLIENT_ID (env-provided per environment)
 *   [H4]  Clock tolerance ≤ 30s (jose default validates exp/iat strictly)
 *   [C5]  Replay protection via `jti` nonce store (in-memory) + DB UNIQUE
 *         constraint on `lti_launches.jti` (canonical guarantee, see migration)
 *   [H6]  Nonce TTL ≥ JWT exp window (10 min default, JWT exp typically 5 min)
 *   [H7]  JWKS resolver via `createRemoteJWKSet` — jose handles `kid` matching
 *         natively + cooldown/timeout caps re-fetch storms
 *   [C8]  `algorithms: ['RS256']` strict allowlist (covers C1 + blocks alg=none)
 *   [H9]  `deployment_id` claim required + non-empty
 *   [C10] `target_link_uri` must be same-origin as ALLOWED_ORIGIN (no open redirect)
 *
 * For test isolation, the JWKS resolver can be injected via `options.jwksResolver`
 * (DI pattern). Production code path uses the hardcoded `JWKS_URIS_BY_ISS` map.
 *
 * V2 backlog (Phase 7c PR #2+):
 *   - Discovery via `iss/.well-known/openid-configuration` for self-hosted LMS
 *   - AGS grade passback (POST lineitem.url with OAuth 2.0 Bearer token)
 *   - NRPS roster sync
 *   - Deep Linking 2.0
 */

import {
  createRemoteJWKSet,
  jwtVerify,
  errors as joseErrors,
  type JWTPayload,
} from 'jose';

import {
  getDefaultNonceStore,
  type NonceStore,
} from './nonceStore';

import {
  LtiVerifyException,
  type LtiLaunchClaims,
  type LtiLaunchVerified,
} from './types';

// ─── Configuration (compile-time constants — change requires PR + audit) ────

/**
 * Allowlist of LTI issuers Terminal Learning trusts. Each entry MUST be
 * exact-match (no wildcard, no regex). Self-hosted instances are NOT supported
 * in V1 (added in V1.1 via OIDC discovery).
 *
 * Audited by lti-auditor.md Check 2.
 */
export const ALLOWED_ISSUERS: ReadonlySet<string> = new Set([
  'https://canvas.instructure.com',
  'https://moodlecloud.com',
  'https://smartschool.be',
]);

/**
 * JWKS URI per known issuer. Hardcoded for V1 — avoids the OIDC discovery
 * round-trip (saves ~200ms cold-start) and minimizes attack surface (no
 * dependency on `.well-known/openid-configuration` integrity per launch).
 *
 * If an LMS rotates its JWKS URI, this map MUST be updated in a PR audited
 * by `lti-auditor.md`. Issuer rotation is rare (years between changes).
 *
 * V1.1 will add OIDC discovery for self-hosted LMS.
 */
const JWKS_URIS_BY_ISS: Readonly<Record<string, string>> = {
  'https://canvas.instructure.com': 'https://canvas.instructure.com/api/lti/security/jwks',
  'https://moodlecloud.com': 'https://moodlecloud.com/.well-known/jwks.json',
  'https://smartschool.be': 'https://smartschool.be/.well-known/jwks.json',
};

/** Terminal Learning canonical origin — `target_link_uri` MUST match. */
export const ALLOWED_ORIGIN = 'https://terminallearning.dev';

/** Clock tolerance for `exp` / `iat` claims. LTI 1.3 launch JWTs typically exp in ≤ 5 min. */
const CLOCK_TOLERANCE_SECONDS = 30;

/** JWKS fetch tuning — see jose docs `RemoteJWKSetOptions`. */
const JWKS_COOLDOWN_MS = 30_000;
const JWKS_TIMEOUT_MS = 5_000;
const JWKS_CACHE_MAX_AGE_MS = 600_000;

/** LTI 1.3 claim URIs (full IMS Global namespaces). */
const CLAIM_DEPLOYMENT_ID = 'https://purl.imsglobal.org/spec/lti/claim/deployment_id';
const CLAIM_TARGET_LINK_URI = 'https://purl.imsglobal.org/spec/lti/claim/target_link_uri';
const CLAIM_ROLES = 'https://purl.imsglobal.org/spec/lti/claim/roles';
const CLAIM_CONTEXT = 'https://purl.imsglobal.org/spec/lti/claim/context';

// ─── JWKS resolver factory (cached per issuer, jose handles re-fetch) ───────

/**
 * The 2nd argument accepted by `jwtVerify()` — both `createRemoteJWKSet()` and
 * `createLocalJWKSet()` return shapes compatible with this type, plus optional
 * metadata (`coolingDown`, `fresh`, `reload`, `jwks`) we don't depend on here.
 * Using the parameter type instead of a concrete return type keeps the DI
 * surface permissive enough for test injection.
 */
type JwksResolver = Parameters<typeof jwtVerify>[1];

const _resolverCache = new Map<string, JwksResolver>();

function getJwksResolver(iss: string): JwksResolver {
  let resolver = _resolverCache.get(iss);
  if (resolver) return resolver;

  const jwksUri = JWKS_URIS_BY_ISS[iss];
  // Defensive: caller (verifyJwt) already validated iss in ALLOWED_ISSUERS, so
  // a missing entry here is a configuration bug, not a runtime trust failure.
  if (!jwksUri) {
    throw new LtiVerifyException({
      code: 'invalid_issuer',
      message: `No JWKS URI configured for issuer "${iss}". Update JWKS_URIS_BY_ISS in src/lib/lti/verifyJwt.ts.`,
      iss,
    });
  }

  resolver = createRemoteJWKSet(new URL(jwksUri), {
    cooldownDuration: JWKS_COOLDOWN_MS,
    timeoutDuration: JWKS_TIMEOUT_MS,
    cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
  });
  _resolverCache.set(iss, resolver);
  return resolver;
}

/** Test helper — clear the JWKS resolver cache between tests. */
export function _resetJwksResolverCacheForTests(): void {
  _resolverCache.clear();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface VerifyJwtOptions {
  /** Terminal Learning's OAuth client_id provisioned in the LMS (claim `aud`). */
  clientId: string;

  /** Override the canonical origin (tests use ALLOWED_ORIGIN by default). */
  allowedOrigin?: string;

  /**
   * Inject a custom JWKS resolver for tests. Production code path uses the
   * hardcoded `JWKS_URIS_BY_ISS` map + jose's remote JWKS cache.
   */
  jwksResolver?: JwksResolver;

  /** Inject a nonce store for tests. Production uses the default singleton. */
  nonceStore?: NonceStore;

  /** Override current time for deterministic tests (UNIX ms). */
  now?: number;
}

/**
 * Verifies an LMS LTI 1.3 launch JWT. Returns a normalized `LtiLaunchVerified`
 * on success. Throws `LtiVerifyException` with a discriminated `detail.code`
 * for every failure mode — the caller maps these to HTTP responses + Sentry
 * tags without leaking JWT internals to the LMS client.
 */
export async function verifyJwt(
  token: string,
  options: VerifyJwtOptions,
): Promise<LtiLaunchVerified> {
  if (!token || typeof token !== 'string') {
    throw new LtiVerifyException({
      code: 'missing_token',
      message: 'JWT token is missing or not a string.',
    });
  }

  // ── Pre-flight: decode payload WITHOUT verification to extract `iss`. We
  //    must validate iss against the allowlist BEFORE fetching any JWKS —
  //    otherwise an attacker iss could trigger an SSRF to an attacker-controlled
  //    URL via JWKS_URIS_BY_ISS lookup (and even a missing entry would still
  //    leak the iss into our process memory). [C2 + C8]
  //
  //    Note: `decodeJwt` is signature-free; it ONLY parses base64url. The
  //    real signature verification happens in `jwtVerify()` below.
  let preflightIss: string;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new LtiVerifyException({
        code: 'malformed_jwt',
        message: 'JWT must have exactly 3 segments.',
      });
    }
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
    const parsed = JSON.parse(payloadJson) as { iss?: unknown };
    if (typeof parsed.iss !== 'string') {
      throw new LtiVerifyException({
        code: 'invalid_issuer',
        message: 'JWT payload is missing the `iss` claim or it is not a string.',
      });
    }
    preflightIss = parsed.iss;
  } catch (err) {
    if (err instanceof LtiVerifyException) throw err;
    throw new LtiVerifyException({
      code: 'malformed_jwt',
      message: `Failed to decode JWT payload: ${(err as Error).message}`,
    });
  }

  if (!ALLOWED_ISSUERS.has(preflightIss)) {
    throw new LtiVerifyException({
      code: 'invalid_issuer',
      message: `Issuer "${preflightIss}" is not in the ALLOWED_ISSUERS allowlist.`,
      iss: preflightIss,
    });
  }

  // ── Resolve JWKS for this trusted issuer (cached). [H7]
  const jwks = options.jwksResolver ?? getJwksResolver(preflightIss);

  // ── Strict signature + claims verification via jose. [C1, C3, H4, C8]
  let payload: JWTPayload & LtiLaunchClaims;
  try {
    const verified = await jwtVerify(token, jwks, {
      issuer: preflightIss,
      audience: options.clientId,
      algorithms: ['RS256'], // LTI 1.3 mandate — blocks HS256 and `alg=none`
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
      requiredClaims: ['iat', 'exp', 'jti', 'sub'],
    });
    payload = verified.payload as JWTPayload & LtiLaunchClaims;
  } catch (err) {
    throw mapJoseError(err, preflightIss);
  }

  // ── Defense-in-depth: reject `iat` in the future beyond clock tolerance.
  //    jose only validates `exp` and `nbf` by default; a forged iat far in
  //    the future would pass otherwise — and an attacker who controls the
  //    LMS could use it to keep a leaked replay JWT valid indefinitely once
  //    the nonce store cleanup runs. [H4]
  const nowSec = Math.floor((options.now ?? Date.now()) / 1000);
  if (typeof payload.iat === 'number' && payload.iat > nowSec + CLOCK_TOLERANCE_SECONDS) {
    throw new LtiVerifyException({
      code: 'clock_skew',
      message: `JWT \`iat\` claim is more than ${CLOCK_TOLERANCE_SECONDS}s in the future.`,
    });
  }

  // ── jti normalized (jose validates presence via requiredClaims). [C5]
  const jti = payload.jti;
  if (typeof jti !== 'string' || jti.length === 0) {
    throw new LtiVerifyException({
      code: 'malformed_jwt',
      message: 'JWT `jti` claim is missing or empty after verification.',
    });
  }

  // ── Replay protection via nonce store (best-effort fast path).
  //    The DB UNIQUE(jti) on lti_launches is the canonical guarantee. [C5]
  const nonceStore = options.nonceStore ?? getDefaultNonceStore();
  if (!nonceStore.remember(jti, options.now)) {
    throw new LtiVerifyException({
      code: 'replay_detected',
      message: 'JWT `jti` has already been observed within the nonce TTL window.',
      jti,
    });
  }

  // ── LTI 1.3 specific claims (deployment_id + target_link_uri).
  const deploymentId = payload[CLAIM_DEPLOYMENT_ID];
  if (typeof deploymentId !== 'string' || deploymentId.length === 0) {
    throw new LtiVerifyException({
      code: 'missing_deployment_id',
      message: 'LTI claim `deployment_id` is missing or empty.',
    });
  }

  const targetLinkUri = payload[CLAIM_TARGET_LINK_URI];
  if (typeof targetLinkUri !== 'string' || targetLinkUri.length === 0) {
    throw new LtiVerifyException({
      code: 'invalid_target_link_uri',
      message: 'LTI claim `target_link_uri` is missing or empty.',
    });
  }

  const allowedOrigin = options.allowedOrigin ?? ALLOWED_ORIGIN;
  let targetOrigin: string;
  try {
    targetOrigin = new URL(targetLinkUri).origin;
  } catch {
    throw new LtiVerifyException({
      code: 'invalid_target_link_uri',
      message: `LTI claim \`target_link_uri\` is not a valid URL: "${targetLinkUri}"`,
      targetLinkUri,
    });
  }
  if (targetOrigin !== allowedOrigin) {
    throw new LtiVerifyException({
      code: 'invalid_target_link_uri',
      message: `LTI claim \`target_link_uri\` origin "${targetOrigin}" must match "${allowedOrigin}".`,
      targetLinkUri,
    });
  }

  // ── Normalize for downstream consumption (audit log + session creation).
  const audValue = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
  const contextClaim = payload[CLAIM_CONTEXT];
  const rolesClaim = payload[CLAIM_ROLES];

  return {
    jti,
    iss: preflightIss,
    sub: payload.sub as string, // jose verified type-safety via requiredClaims
    aud: typeof audValue === 'string' ? audValue : options.clientId,
    deploymentId,
    contextId:
      contextClaim && typeof contextClaim === 'object' && 'id' in contextClaim && typeof contextClaim.id === 'string'
        ? contextClaim.id
        : null,
    roles: Array.isArray(rolesClaim) ? rolesClaim.filter((r): r is string => typeof r === 'string') : [],
    targetLinkUri,
    issuedAt: new Date((payload.iat as number) * 1000),
    expiresAt: new Date((payload.exp as number) * 1000),
    email: typeof payload.email === 'string' ? payload.email : null,
    name: typeof payload.name === 'string' ? payload.name : null,
  };
}

// ─── Error mapping (jose → LtiVerifyException) ──────────────────────────────

function mapJoseError(err: unknown, iss: string): LtiVerifyException {
  if (err instanceof joseErrors.JWTExpired) {
    return new LtiVerifyException({
      code: 'expired',
      message: 'JWT has expired.',
    });
  }
  if (err instanceof joseErrors.JOSEAlgNotAllowed) {
    return new LtiVerifyException({
      code: 'algorithm_not_allowed',
      message: 'JWT alg is not in the allowed list (RS256 only).',
    });
  }
  if (err instanceof joseErrors.JWTClaimValidationFailed) {
    const claim = (err as { claim?: string }).claim;
    if (claim === 'aud') {
      return new LtiVerifyException({
        code: 'invalid_audience',
        message: `JWT audience claim validation failed: ${err.message}`,
      });
    }
    if (claim === 'iat') {
      return new LtiVerifyException({
        code: 'clock_skew',
        message: `JWT \`iat\` claim is outside the clock tolerance window: ${err.message}`,
      });
    }
    return new LtiVerifyException({
      code: 'invalid_audience',
      message: `JWT claim validation failed (${claim ?? 'unknown'}): ${err.message}`,
    });
  }
  if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
    return new LtiVerifyException({
      code: 'invalid_signature',
      message: 'JWT signature verification failed.',
    });
  }
  if (err instanceof joseErrors.JWKSNoMatchingKey) {
    return new LtiVerifyException({
      code: 'invalid_signature',
      message: 'No JWKS key matches the JWT `kid`.',
    });
  }
  if (err instanceof joseErrors.JWKSTimeout) {
    return new LtiVerifyException({
      code: 'jwks_fetch_failed',
      message: 'JWKS fetch timed out.',
      iss,
    });
  }
  if (err instanceof joseErrors.JWTInvalid) {
    return new LtiVerifyException({
      code: 'malformed_jwt',
      message: `JWT is malformed: ${err.message}`,
    });
  }
  // Catch-all — preserves the jose error message for Sentry while never
  // exposing internals to the LMS client (caller never returns this string).
  return new LtiVerifyException({
    code: 'invalid_signature',
    message: `Unhandled jose error: ${(err as Error).message}`,
  });
}
