import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { clearAiSessionData } from '@/lib/ai/keyManager';
import { clearUserRoleCache } from '@/lib/hooks/useUserRole';

// Dynamic import — defers the 194 kB Supabase SDK chunk from the FCP critical
// path. The module starts loading immediately in parallel with initial render,
// but does not block React from painting the first frame.
const supabaseLoader = import('../../lib/supabase');

/**
 * Client-side teardown steps run on signOut, in order. Each step must be
 * wrapped in try/catch — failures must NOT abort the sequence (privacy mode
 * browsers can throw SecurityError on localStorage.removeItem).
 *
 * Add new cleanup steps here when new client state is introduced (the array
 * makes the teardown sequence auto-documenting and resistant to forgotten
 * additions).
 *
 *  - clearAiSessionData : THI-207 — purge plain LS keys + provider pref +
 *    consent + rate counter + tutor mode (encrypted IndexedDB preserved).
 *  - clearUserRoleCache : F-1 rbac-flow-tester 27/05 — clear in-memory role
 *    cache to prevent cross-account leak via stale promise (THI-186 class).
 */
async function teardownClientState(): Promise<void> {
  const steps: Array<readonly [string, () => void | Promise<void>]> = [
    ['clearAiSessionData', clearAiSessionData],
    ['clearUserRoleCache', clearUserRoleCache],
  ];
  for (const [name, fn] of steps) {
    try {
      await fn();
    } catch (err) {
      console.error(`[auth] teardown step "${name}" failed (non-fatal):`, err);
    }
  }
}

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
      }).catch(() => {
        // getSession() can reject on a transient SDK/network error. This
        // promise is not chained to the outer .catch below (it's fired, not
        // returned), so without its own handler a rejection would surface as
        // an unhandled rejection AND leave the app stuck in `loading`. Degrade
        // to "no session" so the UI renders (THI-310).
        if (!cancelled) setLoading(false);
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
    // Local logout FIRST so it ALWAYS completes and the UI reacts instantly,
    // independent of the SDK chunk or teardown internals. The previous order
    // awaited `supabaseLoader` before `setSession(null)`, so a rejected loader
    // threw before the local logout ran (THI-310 latent bug). `setSession(null)`
    // is ordered before teardown so the guarantee holds even if a future
    // teardown step were to throw (Sourcery bug_risk) — `teardownClientState`
    // is itself per-step try/caught today and clears THI-186-class cross-account
    // vectors (AI session data + in-memory role cache) before the next user.
    setSession(null);
    await teardownClientState();

    // AWAIT the real sign-out — do NOT fire-and-forget (HOTFIX 2026-06-01).
    // `supabase.auth.signOut()` is what removes the PERSISTED session token from
    // localStorage. The previous fire-and-forget version returned before that
    // ran, so the caller (UserMenu) navigated to the landing while the token
    // still existed — `autoRefreshToken` + `onAuthStateChange` then restored the
    // session and the user stayed logged in on the landing after clicking
    // "Se déconnecter" (reported by @thierry). Awaiting closes that window so the
    // token is gone before navigation. The instant UI feedback is still given by
    // `setSession(null)` above, so the brief network wait isn't user-visible.
    // scope:'global' is required for OAuth (GitHub, Google): scope:'local' leaves
    // the server session active, re-signing the user via onAuthStateChange.
    // Errors are logged, not thrown — local state is already cleared.
    // https://supabase.com/docs/reference/javascript/auth-signout
    try {
      const { supabase } = await supabaseLoader;
      if (!supabase) return;
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) console.error('[auth] signOut revocation failed:', error.message);
    } catch (err) {
      console.error('[auth] signOut revocation threw (non-fatal):', err);
    }
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
