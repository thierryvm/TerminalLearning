import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { consumeReturnTo } from '@/lib/auth/returnToStorage';

/**
 * Handles OAuth PKCE callback — waits for AuthContext to resolve the session
 * (via onAuthStateChange) then redirects. Avoids a duplicate getSession() call
 * that would race with AuthContext's own getSession() and trigger navigator.locks contention.
 *
 * Uses `initialized` (one-way flag) rather than `!loading` so that a transient
 * null session during token rotation cannot trigger a premature redirect to "/".
 * `redirected` ref guarantees at most one navigation even if `initialized` or
 * `session` change again after the first redirect fires.
 *
 * Post-login redirect (THI-235 Sprint 2.A étape 2.bis) :
 *   - On successful login, read sessionStorage `auth_return_to` (stored by
 *     RequireRole/RequireAuth fallback when guest tried a gated route).
 *   - validateReturnTo() rejects anything outside the `/app/*` allowlist —
 *     prevents open-redirect attacks via stored XSS payloads.
 *   - Default to `/app` if storage is empty or value invalid.
 *   - On failed login (no session), send back to landing.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { session, initialized } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!initialized || redirected.current) return;
    redirected.current = true;
    if (session) {
      // consumeReturnTo() reads + clears + validates in one atomic step
      const target = consumeReturnTo();
      navigate(target, { replace: true });
    } else {
      // Exchange failed (expired code, wrong redirect URL, etc.) — send back to landing
      navigate('/', { replace: true });
    }
  }, [initialized, session, navigate]);

  return (
    <div className="min-h-dvh bg-[var(--github-bg)] flex items-center justify-center">
      <span className="text-emerald-400 font-mono text-sm animate-pulse">Connexion en cours…</span>
    </div>
  );
}
