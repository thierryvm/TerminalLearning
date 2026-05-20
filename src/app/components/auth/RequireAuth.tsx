/**
 * RequireAuth — THI-221 opt-in auth guard wrapper.
 *
 * Centralises the loading state + auth fallback pattern that ProfilePage
 * carried inline (THI-42 PR #1 / security-auditor H1 fix). Used as an
 * opt-in wrapper around components that require an authenticated user.
 *
 * Anonymous-friendly UX is preserved : Terminal Learning routes under
 * /app/* are accessible to guests by default (local-only progression).
 * RequireAuth is only applied to components that genuinely need a user
 * context (ProfilePage, future teacher/admin dashboards in Phase 9).
 *
 * Pattern :
 *   <RequireAuth>
 *     <MyAuthGatedPage />
 *   </RequireAuth>
 *
 * Optional `fallback` prop lets a caller override the default "Vous
 * devez être connecté" message — useful for role-mismatch fallbacks
 * (e.g. <RequireAuth fallback={<TeacherUpgradeCTA />}> in Phase 9).
 */
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { useAuth } from '../../context/AuthContext';
import { setReturnTo } from '@/lib/auth/returnToStorage';
import { Button } from '../ui/button';

interface RequireAuthProps {
  /** The component(s) to render once the user is authenticated. */
  children: ReactNode;
  /**
   * Optional fallback rendered when initialised but no user. Defaults to a
   * generic "must be logged in" message with a link to /.
   * Must not contain unsanitised user input (callers building dynamic
   * role-mismatch fallbacks in Phase 9 — sanitise upstream before passing).
   */
  fallback?: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, initialized } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Sprint 2.A étape 2.bis — same returnTo flow as RequireRole.
  // étape 3 fix : preserve location.search so invitation links like
  // /app/join?code=<12-hex> survive the login round-trip (security-auditor H1).
  // validateReturnTo allowlist regex restricts to `?code=[0-9a-f]{12}` only.
  const handleLogin = () => {
    setReturnTo(location.pathname + location.search);
    navigate('/?login=open');
  };

  // Wait for Supabase session resolution before deciding to show the
  // fallback. Without this guard a legitimate user sees the fallback
  // flash for ~100-300ms while Supabase initialises (THI-42 H1 fix).
  if (!initialized) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <p className="text-[var(--github-text-secondary)] text-sm font-mono">Chargement…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <>
        {fallback ?? (
          <main className="flex-1 px-6 py-12 max-w-4xl mx-auto">
            <p className="text-[var(--github-text-secondary)] text-sm font-mono mb-4">
              Vous devez être connecté pour accéder à cette page.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="emerald-soft"
                className="min-h-11"
                onClick={handleLogin}
              >
                Se connecter
              </Button>
              <Button asChild variant="ghost-gh" className="min-h-11">
                <Link to="/">Retour à l&apos;accueil</Link>
              </Button>
            </div>
          </main>
        )}
      </>
    );
  }

  return <>{children}</>;
}
