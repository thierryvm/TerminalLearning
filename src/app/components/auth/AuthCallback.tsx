import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../lib/supabase';

/** Handles OAuth PKCE callback — exchanges the code for a session then redirects. */
export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) {
      navigate('/app', { replace: true });
      return;
    }

    // Supabase detects the code in the URL and exchanges it automatically.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        // Exchange failed (expired code, wrong redirect URL, etc.) — send back to landing
        navigate('/', { replace: true });
        return;
      }
      navigate('/app', { replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <span className="text-emerald-400 font-mono text-sm animate-pulse">Connexion en cours…</span>
    </div>
  );
}
