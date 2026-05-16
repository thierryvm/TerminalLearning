// @vitest-environment node
/**
 * LTI 1.3 verifyJwt — crypto unit tests (THI-131 Phase 7c Auth MVP)
 *
 * Runs in `node` env (not jsdom). jose@6's webapi build uses native Web Crypto;
 * jsdom's TextEncoder shim creates Uint8Array instances that fail jose's
 * `instanceof Uint8Array` guard in some Node versions. Node env has native
 * Web Crypto + native TextEncoder — clean path for crypto tests.
 *
 * Covers the 10 critical checks from `.claude/agents/lti-auditor.md`:
 *   C1 RS256 signature verification    | C8 alg ≠ none
 *   C2 iss whitelist                   | H4 exp/iat strict
 *   C3 aud match                       | H7 kid matches JWKS
 *   C5 nonce store collision           | H9 deployment_id present
 *   H6 jti uniqueness window           | C10 target_link_uri same-origin
 *
 * Plus exhaustive coverage of nonceStore + error mapping edges.
 *
 * No network in these tests — JWKS resolver is injected via DI
 * (`createLocalJWKSet`). Production `createRemoteJWKSet` path is exercised
 * end-to-end in PR #2 (mock LMS harness Playwright).
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  createLocalJWKSet,
  UnsecuredJWT,
  type JWK,
} from 'jose';

// `CryptoKey` is a global Web Crypto type (jsdom + Node 18+ provide it).

import {
  verifyJwt,
  ALLOWED_ISSUERS,
  ALLOWED_ORIGIN,
  _resetJwksResolverCacheForTests,
} from '../lib/lti/verifyJwt';
import {
  createNonceStore,
  _resetDefaultNonceStoreForTests,
  type NonceStore,
} from '../lib/lti/nonceStore';
import { LtiVerifyException } from '../lib/lti/types';

const TL_CLIENT_ID = 'tl-test-client-id';
const VALID_ISS = 'https://canvas.instructure.com';
const VALID_TARGET = `${ALLOWED_ORIGIN}/app`;
const DEPLOYMENT_ID = 'deployment-test-1';
const KID = 'test-kid-1';

const CLAIM_DEPLOYMENT_ID = 'https://purl.imsglobal.org/spec/lti/claim/deployment_id';
const CLAIM_TARGET_LINK_URI = 'https://purl.imsglobal.org/spec/lti/claim/target_link_uri';
const CLAIM_ROLES = 'https://purl.imsglobal.org/spec/lti/claim/roles';
const CLAIM_CONTEXT = 'https://purl.imsglobal.org/spec/lti/claim/context';

// ─── Test fixtures (generated once per process — RSA keygen is slow) ─────────

let privateKey: CryptoKey;
let publicJwk: JWK;
let localJwks: ReturnType<typeof createLocalJWKSet>;
let nonceStore: NonceStore;

beforeAll(async () => {
  const kp = await generateKeyPair('RS256', { extractable: true });
  privateKey = kp.privateKey;
  publicJwk = await exportJWK(kp.publicKey);
  publicJwk.kid = KID;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  localJwks = createLocalJWKSet({ keys: [publicJwk] });
});

beforeEach(() => {
  nonceStore = createNonceStore();
  _resetDefaultNonceStoreForTests();
  _resetJwksResolverCacheForTests();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface TokenOverrides {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  jti?: string;
  iat?: number; // seconds, optional override
  exp?: number; // seconds, optional override
  expiresIn?: string; // jose syntax, default '5m'
  deploymentId?: string | null;
  targetLinkUri?: string | null;
  kid?: string;
  alg?: 'RS256';
  roles?: string[];
  email?: string;
  name?: string;
  contextId?: string | null;
}

async function makeToken(overrides: TokenOverrides = {}): Promise<string> {
  const payload: Record<string, unknown> = {
    sub: overrides.sub ?? 'user-12345',
  };
  if (overrides.deploymentId !== null) {
    payload[CLAIM_DEPLOYMENT_ID] = overrides.deploymentId ?? DEPLOYMENT_ID;
  }
  if (overrides.targetLinkUri !== null) {
    payload[CLAIM_TARGET_LINK_URI] = overrides.targetLinkUri ?? VALID_TARGET;
  }
  if (overrides.roles) payload[CLAIM_ROLES] = overrides.roles;
  if (overrides.contextId !== null && overrides.contextId !== undefined) {
    payload[CLAIM_CONTEXT] = { id: overrides.contextId };
  }
  if (overrides.email) payload.email = overrides.email;
  if (overrides.name) payload.name = overrides.name;

  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: overrides.alg ?? 'RS256', kid: overrides.kid ?? KID })
    .setIssuer(overrides.iss ?? VALID_ISS)
    .setSubject(overrides.sub ?? 'user-12345')
    .setAudience(overrides.aud ?? TL_CLIENT_ID)
    .setJti(overrides.jti ?? `jti-${Math.random().toString(36).slice(2)}`);

  if (overrides.iat !== undefined) builder.setIssuedAt(overrides.iat);
  else builder.setIssuedAt();

  if (overrides.exp !== undefined) builder.setExpirationTime(overrides.exp);
  else builder.setExpirationTime(overrides.expiresIn ?? '5m');

  return await builder.sign(privateKey);
}

async function verify(token: string, opts: { clientId?: string; allowedOrigin?: string; now?: number } = {}) {
  return verifyJwt(token, {
    clientId: opts.clientId ?? TL_CLIENT_ID,
    allowedOrigin: opts.allowedOrigin,
    jwksResolver: localJwks,
    nonceStore,
    now: opts.now,
  });
}

async function verifyAndExpectFailure(
  token: string,
  expectedCode: string,
  opts?: { clientId?: string; allowedOrigin?: string; now?: number },
): Promise<void> {
  try {
    await verify(token, opts);
    throw new Error(`Expected LtiVerifyException with code "${expectedCode}", but verify() succeeded.`);
  } catch (err) {
    if (!(err instanceof LtiVerifyException)) {
      throw new Error(`Expected LtiVerifyException, got ${(err as Error).constructor.name}: ${(err as Error).message}`);
    }
    expect(err.detail.code).toBe(expectedCode);
  }
}

// ─── 10 critical checks (lti-auditor.md) ────────────────────────────────────

describe('verifyJwt — 10 critical LTI 1.3 checks', () => {
  it('[Check 1+8] accepts a valid RS256-signed JWT and rejects forged signatures', async () => {
    const token = await makeToken();
    const result = await verify(token);
    expect(result.iss).toBe(VALID_ISS);
    expect(result.sub).toBe('user-12345');
    expect(result.aud).toBe(TL_CLIENT_ID);
    expect(result.deploymentId).toBe(DEPLOYMENT_ID);
    expect(result.targetLinkUri).toBe(VALID_TARGET);

    // Tamper with the signature segment — must fail.
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))}`;
    await verifyAndExpectFailure(tampered, 'invalid_signature');
  });

  it('[Check 2] rejects a JWT with `iss` not in ALLOWED_ISSUERS allowlist', async () => {
    const token = await makeToken({ iss: 'https://attacker.example.com' });
    await verifyAndExpectFailure(token, 'invalid_issuer');

    // Sanity — allowlist actually contains the production issuers.
    expect(ALLOWED_ISSUERS.has(VALID_ISS)).toBe(true);
    expect(ALLOWED_ISSUERS.has('https://attacker.example.com')).toBe(false);
  });

  it('[Check 3] rejects a JWT with `aud` not matching client_id', async () => {
    const token = await makeToken({ aud: 'wrong-client-id' });
    await verifyAndExpectFailure(token, 'invalid_audience');
  });

  it('[Check 4] rejects an expired JWT (exp claim in the past)', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    // exp = 60s ago, iat = 120s ago. Far outside the 30s clock tolerance.
    const token = await makeToken({ iat: nowSec - 120, exp: nowSec - 60 });
    await verifyAndExpectFailure(token, 'expired');
  });

  it('[Check 5] rejects a replayed `jti` within the nonce store TTL window', async () => {
    // Stable jti so the second verify hits the in-memory collision path.
    const token1 = await makeToken({ jti: 'replay-jti-fixed' });
    const result1 = await verify(token1);
    expect(result1.jti).toBe('replay-jti-fixed');

    // Re-sign a fresh, valid JWT with the SAME jti — only the nonce store
    // (in-memory) should reject. Signature is fresh + valid.
    const token2 = await makeToken({ jti: 'replay-jti-fixed' });
    await verifyAndExpectFailure(token2, 'replay_detected');
  });

  it('[Check 6] nonce TTL is ≥ JWT exp window — stable across LTI 5-min launches', async () => {
    // The default nonce TTL is 10 minutes (see nonceStore.ts). LTI 1.3 JWT
    // exp is typically 5 minutes. The TTL MUST exceed exp so a replay
    // immediately after JWT expiry is also blocked.
    const fresh = createNonceStore();
    const now = Date.now();
    expect(fresh.remember('jti-1', now)).toBe(true);
    // 5 min later (within JWT exp window AND within nonce TTL)
    expect(fresh.remember('jti-1', now + 5 * 60_000)).toBe(false);
    // 9 min later (just before nonce TTL expiry)
    expect(fresh.remember('jti-1', now + 9 * 60_000)).toBe(false);
    // 11 min later (past TTL — accepted again, but JWT itself is exp by then)
    expect(fresh.remember('jti-1', now + 11 * 60_000)).toBe(true);
  });

  it('[Check 7] rejects a JWT whose `kid` does not match any key in the JWKS', async () => {
    const token = await makeToken({ kid: 'unknown-kid-99' });
    await verifyAndExpectFailure(token, 'invalid_signature');
  });

  it('[Check 8] rejects a JWT with `alg=none` (UnsecuredJWT)', async () => {
    const unsecured = new UnsecuredJWT({
      sub: 'attacker',
      [CLAIM_DEPLOYMENT_ID]: DEPLOYMENT_ID,
      [CLAIM_TARGET_LINK_URI]: VALID_TARGET,
    })
      .setIssuer(VALID_ISS)
      .setAudience(TL_CLIENT_ID)
      .setJti('alg-none-jti')
      .setIssuedAt()
      .setExpirationTime('5m')
      .encode();
    // jose may classify alg=none as either algorithm_not_allowed OR
    // invalid_signature depending on the dispatch path — both are correct
    // refusals. Accept either to remain robust to upstream phrasing changes.
    try {
      await verify(unsecured);
      throw new Error('Expected verify() to reject alg=none');
    } catch (err) {
      expect(err).toBeInstanceOf(LtiVerifyException);
      const code = (err as LtiVerifyException).detail.code;
      expect(['algorithm_not_allowed', 'invalid_signature', 'malformed_jwt']).toContain(code);
    }
  });

  it('[Check 9] rejects a JWT missing the `deployment_id` LTI claim', async () => {
    const token = await makeToken({ deploymentId: null });
    await verifyAndExpectFailure(token, 'missing_deployment_id');
  });

  it('[Check 10] rejects a JWT whose `target_link_uri` is cross-origin', async () => {
    const token = await makeToken({ targetLinkUri: 'https://attacker.example.com/app' });
    await verifyAndExpectFailure(token, 'invalid_target_link_uri');
  });

  it('[Check 10 bonus] rejects a `target_link_uri` that is not a valid URL', async () => {
    const token = await makeToken({ targetLinkUri: 'not-a-url' });
    await verifyAndExpectFailure(token, 'invalid_target_link_uri');
  });
});

// ─── Defense-in-depth: malformed inputs + clock skew ────────────────────────

describe('verifyJwt — defense-in-depth', () => {
  it('rejects an empty token', async () => {
    await verifyAndExpectFailure('', 'missing_token');
  });

  it('rejects a non-3-segment token', async () => {
    await verifyAndExpectFailure('not-a-jwt-at-all', 'malformed_jwt');
  });

  it('rejects a JWT with `iat` in the future beyond clock tolerance (manual check, jose does not enforce)', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    // iat = 5 min in the future. jose clockTolerance is 30s and only applies
    // to `exp`/`nbf` — `iat` is not validated by jose at all (we add the
    // upper-bound check manually in verifyJwt, see [H4] defense-in-depth).
    const token = await makeToken({ iat: nowSec + 300, exp: nowSec + 600 });
    await verifyAndExpectFailure(token, 'clock_skew');
  });

  it('extracts roles + context_id + email + name correctly on success', async () => {
    const token = await makeToken({
      roles: [
        'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor',
        'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
      ],
      contextId: 'class-belgique-2026',
      email: 'thierry@example.be',
      name: 'Thierry V.',
    });
    const result = await verify(token);
    expect(result.roles).toHaveLength(2);
    expect(result.roles[0]).toContain('Instructor');
    expect(result.contextId).toBe('class-belgique-2026');
    expect(result.email).toBe('thierry@example.be');
    expect(result.name).toBe('Thierry V.');
  });
});

// ─── nonceStore unit tests ──────────────────────────────────────────────────

describe('nonceStore', () => {
  it('accepts a fresh jti and rejects an immediate replay', () => {
    const store = createNonceStore();
    expect(store.remember('jti-1')).toBe(true);
    expect(store.remember('jti-1')).toBe(false);
  });

  it('honours an explicit TTL', () => {
    const store = createNonceStore({ ttlMs: 1000 });
    const now = 1_000_000;
    expect(store.remember('jti-1', now)).toBe(true);
    expect(store.remember('jti-1', now + 500)).toBe(false);
    expect(store.remember('jti-1', now + 1500)).toBe(true);
  });

  it('rejects empty / non-string jti defensively', () => {
    const store = createNonceStore();
    expect(store.remember('')).toBe(false);
    // @ts-expect-error — exercise runtime guard with intentionally wrong type
    expect(store.remember(undefined)).toBe(false);
    // @ts-expect-error — exercise runtime guard with intentionally wrong type
    expect(store.remember(null)).toBe(false);
  });

  it('bounds capacity to maxEntries (FIFO eviction)', () => {
    const store = createNonceStore({ maxEntries: 3, ttlMs: 60_000 });
    expect(store.remember('a')).toBe(true); // [a]
    expect(store.remember('b')).toBe(true); // [a, b]
    expect(store.remember('c')).toBe(true); // [a, b, c]
    expect(store.size()).toBe(3);
    // Insert a 4th — oldest ('a') should be evicted FIFO. Store becomes [b, c, d].
    expect(store.remember('d')).toBe(true);
    expect(store.size()).toBeLessThanOrEqual(3);
    // The newly-inserted 'd' is tracked → immediate replay rejected.
    expect(store.remember('d')).toBe(false);
    // 'a' was evicted, so it counts as fresh again.
    expect(store.remember('a')).toBe(true);
  });
});
