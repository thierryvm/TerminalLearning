import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

/**
 * Handles OAuth PKCE callback — waits for AuthContext to resolve the session
 * (via onAuthStateChange) then redirects. Avoids a duplicate getSession() call
 * that would race with AuthContext's own getSession() and trigger navigator.locks contention.
 *
 * Uses `initialized` (one-way flag) rather than `!loading` so that a transient
 * null session during token rotation cannot trigger a premature redirect to "/".
 * `redirected` ref guarantees at most one navigation even if `initialized` or
 * `session` change again after the first redirect fires.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { session, initialized } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!initialized || redirected.current) return;
    redirected.current = true;
    // Exchange failed (expired code, wrong redirect URL, etc.) — send back to landing
    navigate(session ? '/app' : '/', { replace: true });
  }, [initialized, session, navigate]);

  return (
    <div className="min-h-dvh bg-[#0d1117] flex items-center justify-center">
      <span className="text-emerald-400 font-mono text-sm animate-pulse">Connexion en cours…</span>
    </div>
  );
}
