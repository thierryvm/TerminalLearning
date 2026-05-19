/**
 * returnToStorage — THI-235 Sprint 2.A étape 2.bis sessionStorage wrapper.
 *
 * Encapsulates the sessionStorage read/write/clear for the post-login
 * redirect path. Centralised so the storage key is defined once and
 * defensive try/catch covers cases where sessionStorage is unavailable
 * (server-side rendering, private browsing, storage quota).
 *
 * Why sessionStorage rather than URL query param :
 *   - Avoids open-redirect link sharing (attacker can't craft a URL with
 *     a malicious returnTo and trick a user into clicking it — only an
 *     XSS in our own origin could write to sessionStorage, which is a
 *     much smaller surface)
 *   - Cleared automatically when the browser tab closes
 *   - Not visible in the browser address bar (no shoulder-surfing)
 *
 * Why a dedicated storage key (not localStorage) :
 *   - sessionStorage is tab-scoped, so a user with multiple tabs doesn't
 *     have one tab's intended redirect bleed into another
 *   - Cleared on tab close — no stale redirect across browser sessions
 *
 * Validation happens at READ time (via validateReturnTo helper), not at
 * write time. Rationale : if validation at write time fails silently we
 * lose visibility; failing at read time means a malicious payload stored
 * by an XSS attacker can never trigger the redirect, only the safe fallback.
 */
import { validateReturnTo } from './validateReturnTo';

const STORAGE_KEY = 'auth_return_to';

/**
 * Store the intended post-login destination. Silently no-ops if
 * sessionStorage is unavailable (SSR, private browsing).
 */
export function setReturnTo(path: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // Storage quota exceeded, private browsing — silently drop
  }
}

/**
 * Read AND immediately clear the stored returnTo path. Validates against
 * the open-redirect allowlist before returning.
 *
 * Returns :
 *   - `string` : a validated safe path (`/app/...`) the caller should
 *     navigate to. Indicates the user had an explicit returnTo intent.
 *   - `null` : no value stored, value rejected by validation (XSS scenario),
 *     or storage unavailable. The caller should apply its own default
 *     (e.g. adaptive route per role via `defaultRouteForRole`).
 *
 * Read-and-clear (single call) is intentional : a returnTo is one-shot,
 * we never want it to survive multiple login flows.
 *
 * Defense-in-depth : a rejected value is treated as `null` (not the
 * `/app` fallback) so the caller cannot conflate "user intended to go to
 * /app" with "an XSS-injected malicious value was stripped". This lets
 * AuthCallback apply role-based adaptive routing in the latter case.
 */
export function consumeReturnTo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    const validated = validateReturnTo(stored);
    // validateReturnTo returns '/app' as its safe fallback for invalid input.
    // If the stored value was literally '/app' the user genuinely wanted /app
    // (preserve their intent). If the stored value was anything else AND came
    // back as '/app', validation rejected it — return null so the caller
    // applies the role-adaptive default instead of the bare fallback.
    if (validated === '/app' && stored !== '/app') return null;
    return validated;
  } catch {
    return null;
  }
}
