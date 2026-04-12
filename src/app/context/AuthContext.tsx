import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True once the initial auth state has been fully resolved (one-way flag).
   *  Use this instead of `!loading` for redirect guards — `loading` can
   *  theoretically flap during token rotation, `initialized` never reverts. */
  initialized: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // If Supabase is not configured, there's nothing to load.
  const [loading, setLoading] = useState(() => supabase !== null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    // Clear local session immediately — the UI reacts instantly.
    // Then revoke the server-side refresh token in the background (fire-and-forget).
    // scope:'global' is required for OAuth (GitHub, Google): scope:'local' left the
    // server-side session active, causing Supabase to re-sign the user immediately
    // via onAuthStateChange — making sign-out appear broken.
    // We don't await the API call: the local session is already gone, and token
    // revocation completing a few seconds later is an acceptable trade-off.
    // See: https://supabase.com/docs/reference/javascript/auth-signout
    setSession(null);
    supabase.auth.signOut({ scope: 'global' }).then(({ error }) => {
      if (error) {
        // Log revocation failures — token may still be valid server-side until expiry.
        // Not fatal: local session is already cleared and the user is logged out in the UI.
        console.error('[auth] signOut revocation failed:', error.message);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, initialized: !loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
