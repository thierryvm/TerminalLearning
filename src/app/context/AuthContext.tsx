import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { clearAiSessionData } from '@/lib/ai/keyManager';
import { clearUserRoleCache } from '@/lib/hooks/useUserRole';

// Dynamic import — defers the 194 kB Supabase SDK chunk from the FCP critical
// path. The module starts loading immediately in parallel with initial render,
// but does not block React from painting the first frame.
const supabaseLoader = import('../../lib/supabase');

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    supabaseLoader.then(({ supabase }) => {
      if (cancelled) return;
      if (!supabase) { setLoading(false); return; }

      supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
      });
      unsubscribe = () => subscription.unsubscribe();
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signOut = useCallback(async () => {
    const { supabase } = await supabaseLoader;
    if (!supabase) return;
    // THI-207 — defense-in-depth + RGPD : purge AI session data BEFORE the UI
    // reacts to the cleared session. The next user logging in on the same
    // device must see the consent modal again and must not inherit any plain
    // key, provider preference, rate counter, or tutor mode.
    // Encrypted IndexedDB keys are preserved by design (passphrase-gated).
    //
    // The try/catch is non-optional : in privacy mode (Firefox ITP strict,
    // some Android WebViews) `localStorage.removeItem` can throw a
    // SecurityError. Letting it bubble up would abort `setSession(null)` and
    // the Supabase token revocation below, leaving a zombie session — exactly
    // the failure mode the prompt-guardrail + security audits flagged before
    // merge.
    try {
      await clearAiSessionData();
    } catch (err) {
      console.error('[auth] clearAiSessionData failed (non-fatal):', err);
    }
    // F-1 fix (rbac-flow-tester break-in 27/05/2026) : clear in-memory user role
    // cache to prevent any cross-account leak path between successive signins
    // on the same tab without page reload. Same defense-in-depth posture que
    // THI-186 (progress data leak) — even si la garde UUID-mismatch dans
    // `fetchRole` mitige le path d'exploit pratique, le contrat JSDoc de
    // `clearUserRoleCache` exige cet appel à signOut.
    clearUserRoleCache();
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
