/**
 * validateReturnTo — THI-235 Sprint 2.A étape 2.bis open-redirect protection.
 *
 * When a guest user arrives on a role-gated route (e.g. `/app/teacher`),
 * we store the intended path in sessionStorage, send them to login, then
 * navigate them back after OAuth callback. The post-login navigation is
 * a classic **open redirect** vector if not validated : an attacker could
 * craft `/app/teacher?returnTo=https://evil.com` (or worse, store a malicious
 * path in sessionStorage via XSS) and phish the user after login.
 *
 * Strict whitelist allowed by this helper :
 *   - Must start with `/app` (any internal app path)
 *   - Followed by optional segments matching `[a-zA-Z0-9_-]+`
 *   - Optional trailing slash
 *   - Length ≤ 200 chars
 *
 * Rejected (returns the safe fallback `/app`) :
 *   - Anything not starting with `/app`
 *   - External URLs (`https://`, `//`, protocol-relative)
 *   - Path traversal (`..`, `~`, double-slash inside)
 *   - URL-encoded path traversal (`%2e%2e`, `%2F..`)
 *   - Backslashes (Windows path), null bytes, whitespace
 *   - Protocols (`javascript:`, `data:`, `file:`)
 *   - Anything beyond the 200-char ceiling (defensive, no legit /app/* path
 *     should ever be longer)
 *
 * Returns the safe path to navigate to. NEVER throws. NEVER logs the input
 * value (the input may be an attacker payload — logging it to Sentry would
 * cache the malicious string and could be used for further exploits).
 */

const SAFE_FALLBACK = '/app';
const MAX_LENGTH = 200;

/**
 * Matches a safe internal app path. Examples that PASS :
 *   /app
 *   /app/teacher
 *   /app/admin
 *   /app/learn/navigation/orientation
 *   /app/teacher/
 *   /app/join?code=a4368184d202   (THI-235 Sprint 2.A étape 3)
 *
 * The regex is intentionally strict — no fragments. Query params are
 * whitelisted per use case : only `?code=<12-hex>` is allowed (the
 * invitation_code format guaranteed by migration 020 CHECK constraint
 * `^[0-9a-f]{12}$`). Any other query param is rejected to keep the
 * open-redirect surface minimal. Future use cases that need extra
 * query params must extend this allowlist explicitly with their own
 * format check (e.g. `?ref=[a-z]{1,16}` for analytics referral codes).
 */
const SAFE_PATH_RX = /^\/app(\/[a-zA-Z0-9_-]+)*\/?(\?code=[0-9a-f]{12})?$/;

export function validateReturnTo(input: unknown): string {
  // Type guard — only strings are valid input
  if (typeof input !== 'string') return SAFE_FALLBACK;

  // Length ceiling — defensive against extremely long inputs that could
  // cause regex backtracking or downstream perf issues
  if (input.length === 0 || input.length > MAX_LENGTH) return SAFE_FALLBACK;

  // Reject any character class that could enable bypass even before regex :
  //   - Backslash (Windows path / smuggling)
  //   - Null byte (terminator confusion)
  //   - Whitespace (trim-then-bypass tricks)
  //   - URL encoding (avoid double-decoding ambiguity — if the caller wants
  //     to allow encoded paths, decode them BEFORE passing to this helper
  //     and re-validate)
  if (/[\\\x00\s%]/.test(input)) return SAFE_FALLBACK;

  // Reject protocol-relative URLs (//evil.com) — these would bypass the
  // ^/app start if not caught explicitly (the regex below already does it,
  // but explicit is safer in case the regex evolves)
  if (input.startsWith('//')) return SAFE_FALLBACK;

  // Reject path traversal at any position
  if (input.includes('..') || input.includes('~')) return SAFE_FALLBACK;

  // Final strict regex check
  if (!SAFE_PATH_RX.test(input)) return SAFE_FALLBACK;

  return input;
}
