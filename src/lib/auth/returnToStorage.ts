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
 * the open-redirect allowlist before returning. Returns the safe fallback
 * (`/app`) if the stored value is missing, invalid, or storage is unavailable.
 *
 * Read-and-clear (single call) is intentional : a returnTo is one-shot,
 * we never want it to survive multiple login flows.
 */
export function consumeReturnTo(): string {
  if (typeof window === 'undefined') return '/app';
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    return validateReturnTo(stored);
  } catch {
    return '/app';
  }
}
