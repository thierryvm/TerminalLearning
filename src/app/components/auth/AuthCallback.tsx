import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

/**
 * Handles OAuth PKCE callback — waits for AuthContext to resolve the session
 * (via onAuthStateChange) then redirects. Avoids a duplicate getSession() call
 * that would race with AuthContext's own getSession() and trigger navigator.locks contention.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (session) {
      navigate('/app', { replace: true });
    } else {
      // Exchange failed (expired code, wrong redirect URL, etc.) — send back to landing
      navigate('/', { replace: true });
    }
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <span className="text-emerald-400 font-mono text-sm animate-pulse">Connexion en cours…</span>
    </div>
  );
}
