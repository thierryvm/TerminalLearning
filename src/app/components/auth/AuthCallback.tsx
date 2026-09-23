import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { consumeReturnTo } from '@/lib/auth/returnToStorage';
import { defaultRouteForRole } from '@/lib/auth/defaultRouteForRole';
import { isAgeVerified } from '@/lib/auth/ageGate';
import { stampAgeConfirmation } from '@/lib/auth/stampAgeConfirmation';
import type { UserRole } from '../../types/database';

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
 * Post-login redirect precedence (THI-235 Sprint 2.A étape 2.bis + 2.ter) :
 *   1. consumeReturnTo() returns a valid path → respect user explicit intent
 *      (came from a gated route fallback "Se connecter" click).
 *      validateReturnTo() guarantees `/app/*` allowlist — open-redirect safe.
 *   2. Otherwise, look up role via `get_my_role()` RPC and apply
 *      `defaultRouteForRole(role)` (THI-235 étape 2.ter adaptive routing) :
 *      super_admin → /app/admin, teacher → /app/teacher, others → /app.
 *   3. RPC failure or no session → safe fallback `/app` (student-style).
 *   4. On failed login (no session at all), send back to landing.
 *
 * Also stamps the age confirmation for the OAuth path (THI-340) — see the
 * inline note below for why email signup does not go through here.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { session, initialized } = useAuth();
  const redirected = useRef(false);
  // Track unmount to avoid `navigate()` calls after the component is gone
  // (security-auditor L1 cleanup — async RPC may resolve after a fast
  // user navigation; React 18 tolerates but emits a dev warning).
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!initialized || redirected.current) return;
    redirected.current = true;

    if (!session) {
      // Exchange failed (expired code, wrong redirect URL, etc.) — back to landing
      navigate('/', { replace: true });
      return;
    }

    // Read the one-shot returnTo synchronously, exactly as before, so nothing
    // else can consume it while the async work below is in flight.
    const stored = consumeReturnTo();

    // Async block : we cannot await directly inside useEffect, so wrap
    // in an IIFE. The redirected.current guard above already protects
    // against double-fires; isMounted.current guards against post-unmount navigate.
    void (async () => {
      const safeNavigate = (target: string) => {
        if (!isMounted.current) return;
        navigate(target, { replace: true });
      };
      try {
        const { supabase } = await import('@/lib/supabase');

        // THI-340 — OAuth half of the age gate. signInWithOAuth carries no user
        // metadata, so unlike email signup the declaration cannot ride along to
        // handle_new_user(); the profile row is stamped here instead. The gate
        // ran in THIS tab just before the redirect, so its sessionStorage flag
        // is still there. Awaited but never fatal: a failed stamp leaves
        // age_confirmed_at NULL, which the schema treats as a valid state.
        //
        // It runs BEFORE any redirect branch. It used to sit after the returnTo
        // early-return, so every login that came back through a gated route —
        // a student opening a teacher's invite link, `/app/join?code=…` — was
        // left unstamped (security-auditor M1, 23 September 2026).
        if (supabase && isAgeVerified() && session.user?.id) {
          await stampAgeConfirmation(supabase, session.user.id);
        }

        // 1. Explicit returnTo (user came from a gated route) takes priority.
        if (stored !== null) {
          safeNavigate(stored);
          return;
        }

        // 2. No explicit returnTo → adaptive route per role.
        if (!supabase) {
          safeNavigate('/app');
          return;
        }

        const { data, error } = await supabase.rpc('get_my_role');
        if (error) {
          // RPC failed (RLS recursion, network, etc.) — safe fallback.
          // Don't expose the technical error to the user; AuthContext logs
          // RPC failures separately in useUserRole.
          safeNavigate('/app');
          return;
        }
        safeNavigate(defaultRouteForRole(data as UserRole | null));
      } catch {
        // Keep the user's explicit destination if we had one — a failure in
        // the stamp or the role lookup must not cost them their invite link.
        safeNavigate(stored ?? '/app');
      }
    })();
  }, [initialized, session, navigate]);

  return (
    <div className="min-h-dvh bg-[var(--github-bg)] flex items-center justify-center">
      <span className="text-emerald-400 font-mono text-sm animate-pulse">Connexion en cours…</span>
    </div>
  );
}
