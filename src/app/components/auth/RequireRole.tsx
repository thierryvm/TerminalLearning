/**
 * RequireRole — THI-225 Phase 9 Admin Panel.
 *
 * Extension de `<RequireAuth>` (THI-221) qui ajoute le check du rôle utilisateur
 * via `useUserRole()`. Affiche le children uniquement si l'utilisateur est
 * authentifié ET possède l'un des rôles autorisés. Sinon, rendu :
 *   - `!initialized || roleLoading` → loading state
 *   - `!user` → fallback "Vous devez être connecté"
 *   - `role not in allowed[]` → fallback "Accès réservé" (ou custom)
 *
 * Pattern :
 *   <RequireRole allowed={['super_admin']}>
 *     <AdminPanelContent />
 *   </RequireRole>
 *
 * Anonymous-friendly UX préservée : opt-in par route, pas Layout-level
 * blanket. Cohérent avec la doctrine THI-221.
 */
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/database';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { setReturnTo } from '@/lib/auth/returnToStorage';
import { Button } from '../ui/button';

interface RequireRoleProps {
  /** The component(s) to render when the user is authenticated AND has an allowed role. */
  children: ReactNode;
  /** List of roles permitted to view the children. */
  allowed: UserRole[];
  /**
   * Optional fallback rendered when the user is authenticated but does NOT
   * have one of the allowed roles. Defaults to a generic "Accès réservé"
   * message with a link to /app. Must not contain unsanitised user input.
   */
  forbiddenFallback?: ReactNode;
  /**
   * Optional fallback rendered when no user is authenticated at all
   * (separate from forbidden — usually a login prompt). Defaults to
   * "Vous devez être connecté" with a link to /.
   */
  unauthenticatedFallback?: ReactNode;
}

export function RequireRole({
  children,
  allowed,
  forbiddenFallback,
  unauthenticatedFallback,
}: RequireRoleProps) {
  const { user, initialized } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();

  // Sprint 2.A étape 2.bis — store the intended route + navigate to Landing
  // with ?login=open to auto-open the LoginModal. After OAuth callback,
  // AuthCallback reads + validates the stored path and redirects back here.
  const handleLogin = () => {
    setReturnTo(location.pathname);
    navigate('/?login=open');
  };

  // Wait for auth and role resolution before deciding. Critical for UX :
  // without this guard, a legitimate admin sees the "Accès réservé" flash
  // for ~100-500ms during Supabase + RPC resolution (security-auditor H1
  // pattern from THI-42 extended to role-gated routes).
  if (!initialized || (user && roleLoading)) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <p className="text-[var(--github-text-secondary)] text-sm font-mono">Chargement…</p>
      </main>
    );
  }

  // No user at all → unauthenticated fallback.
  if (!user) {
    return (
      <>
        {unauthenticatedFallback ?? (
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

  // User authenticated but wrong role → forbidden fallback.
  if (!role || !allowed.includes(role)) {
    return (
      <>
        {forbiddenFallback ?? (
          <main className="flex-1 px-6 py-12 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold text-[var(--github-text-primary)] mb-4">
              Accès réservé
            </h1>
            <p className="text-[var(--github-text-secondary)] text-sm font-mono mb-4">
              Cette page est accessible aux administrateurs uniquement.
            </p>
            <Button asChild variant="emerald-soft" className="min-h-11">
              <Link to="/app">Retour au tableau de bord</Link>
            </Button>
          </main>
        )}
      </>
    );
  }

  return <>{children}</>;
}
