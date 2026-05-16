/**
 * LTI 1.3 Type Definitions
 *
 * Subset of LTI 1.3 Core + AGS claims used by Terminal Learning.
 * Full spec: https://www.imsglobal.org/spec/lti/v1p3
 *
 * Naming convention: we use the canonical URI claim names from IMS Global, not
 * shortened keys, because they are part of the verified JWT payload (any rename
 * would silently break LMS interop).
 *
 * THI-131 Phase 7c Auth MVP — only the claims required for SSO are typed.
 * AGS / NRPS / DL 2.0 claims will be added in Phase 2 (post-10 juin 2026).
 */

/** Standard JWT claims (RFC 7519) used by LTI 1.3 launch JWTs */
export interface LtiBaseClaims {
  /** Issuer — must match an entry in ALLOWED_ISSUERS allowlist */
  iss: string;

  /** Subject — opaque LMS user identifier (stable per LMS) */
  sub: string;

  /** Audience — must equal Terminal Learning's client_id provisioned in the LMS */
  aud: string | string[];

  /** Issued At (UNIX seconds) — must be in the past, within clockTolerance */
  iat: number;

  /** Expires (UNIX seconds) — must be in the future */
  exp: number;

  /** JWT ID — opaque unique identifier, used for replay protection (nonce store + DB UNIQUE) */
  jti: string;

  /** Nonce — LTI 1.3 anti-replay claim (separate from jti; both should be unique) */
  nonce?: string;
}

/** LTI 1.3 Core claims (namespaced under https://purl.imsglobal.org/spec/lti/claim/...) */
export interface LtiCoreClaims {
  /** Message type — must be `LtiResourceLinkRequest` for a launch */
  'https://purl.imsglobal.org/spec/lti/claim/message_type'?: string;

  /** LTI spec version — must be `1.3.0` */
  'https://purl.imsglobal.org/spec/lti/claim/version'?: string;

  /** Deployment ID — required, must be provisioned in TL admin (Phase 9) */
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id'?: string;

  /** Target Link URI — must be same-origin terminallearning.dev */
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri'?: string;

  /** Resource Link (lesson / module reference) */
  'https://purl.imsglobal.org/spec/lti/claim/resource_link'?: {
    id: string;
    title?: string;
    description?: string;
  };

  /** Roles — array of role URIs, mapped to TL RBAC by mapLtiRoles() */
  'https://purl.imsglobal.org/spec/lti/claim/roles'?: string[];

  /** Context — typically a class or course in the LMS */
  'https://purl.imsglobal.org/spec/lti/claim/context'?: {
    id: string;
    label?: string;
    title?: string;
    type?: string[];
  };

  /** Standard OpenID profile claims (set by some LMS) */
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

/** Full LTI 1.3 launch JWT claims — what verifyJwt() returns on success */
export type LtiLaunchClaims = LtiBaseClaims & LtiCoreClaims;

/** Normalized result of a successful launch — what the endpoint persists */
export interface LtiLaunchVerified {
  jti: string;
  iss: string;
  sub: string;
  aud: string;
  deploymentId: string;
  contextId: string | null;
  roles: string[];
  targetLinkUri: string;
  issuedAt: Date;
  expiresAt: Date;
  email: string | null;
  name: string | null;
}

/** Discriminated error type — never exposed to LMS client, only to Sentry + audit log */
export type LtiVerifyError =
  | { code: 'missing_token'; message: string }
  | { code: 'malformed_jwt'; message: string }
  | { code: 'invalid_signature'; message: string }
  | { code: 'invalid_issuer'; message: string; iss?: string }
  | { code: 'invalid_audience'; message: string; aud?: string | string[] }
  | { code: 'expired'; message: string }
  | { code: 'clock_skew'; message: string }
  | { code: 'missing_deployment_id'; message: string }
  | { code: 'invalid_target_link_uri'; message: string; targetLinkUri?: string }
  | { code: 'replay_detected'; message: string; jti?: string }
  | { code: 'jwks_fetch_failed'; message: string; iss?: string }
  | { code: 'algorithm_not_allowed'; message: string };

export class LtiVerifyException extends Error {
  readonly detail: LtiVerifyError;
  constructor(detail: LtiVerifyError) {
    super(detail.message);
    this.name = 'LtiVerifyException';
    this.detail = detail;
  }
}
