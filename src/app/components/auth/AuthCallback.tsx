import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

/**
 * Handles OAuth PKCE callback — waits for AuthContext to resolve the session
 * (via onAuthStateChange) then redirects. Avoids a duplicate getSession() call
 * that would race with AuthContext's own getSession() and trigger navigator.locks contention.
 *
 * `redirected` ref prevents double-navigation if session/loading change after
 * the first redirect fires (e.g. onAuthStateChange re-firing during token rotation).
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading || redirected.current) return;
    redirected.current = true;
    // Exchange failed (expired code, wrong redirect URL, etc.) — send back to landing
    navigate(session ? '/app' : '/', { replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <span className="text-emerald-400 font-mono text-sm animate-pulse">Connexion en cours…</span>
    </div>
  );
}
