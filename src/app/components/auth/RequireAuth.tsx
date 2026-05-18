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
import { Link } from 'react-router';

import { useAuth } from '../../context/AuthContext';

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
            <p className="text-[var(--github-text-secondary)] text-sm font-mono">
              Vous devez être connecté pour accéder à cette page.{' '}
              <Link to="/" className="text-emerald-400 hover:text-emerald-300 underline">
                Retour à l&apos;accueil
              </Link>
            </p>
          </main>
        )}
      </>
    );
  }

  return <>{children}</>;
}
