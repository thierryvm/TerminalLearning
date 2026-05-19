/**
 * defaultRouteForRole — THI-235 Sprint 2.A étape 2.ter post-login adaptive routing.
 *
 * After successful login (AuthCallback), if no explicit returnTo was stored,
 * navigate the user to the most useful default route for their role.
 *
 * Industry pattern 2026 (DAR Design) : "preference, not restriction" — the
 * default view adapts to the role naturally, without onboarding wizard or
 * setup prompt. A super_admin landing on /app/admin saves 1-2 clicks per
 * session vs landing on the student dashboard.
 *
 * Validated empirically 19/05/2026 : @thierry as super_admin landed on /app
 * post-GitHub OAuth and had to manually click "Mes classes" / sidebar entries
 * to reach his control panels. The role-aware default closes that gap.
 *
 * Precedence in AuthCallback :
 *   1. consumeReturnTo() returns a valid path → use it (user-explicit intent
 *      from a gated route fallback "Se connecter" click)
 *   2. role available → defaultRouteForRole(role)
 *   3. role lookup failed → '/app' (safe fallback, dashboard student-style)
 *
 * Sprint 2.B will add /app/institution + /app/teacher/pending routes — when
 * those exist, this map will redirect those roles there. Today they fall
 * back to /app to avoid 404 routes (defensive).
 */
import type { UserRole } from '@/app/types/database';

const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  // super_admin lands on the supervision panel — that's their "home"
  super_admin: '/app/admin',
  // teacher lands on Mes classes — the create-class + share-code flow
  teacher: '/app/teacher',
  // institution_admin will land on /app/institution once Sprint 2.B ships it.
  // Today fallback to /app (student dashboard) — they still see role-gated
  // entries in the Sidebar + cards in StaffQuickActions if applicable.
  institution_admin: '/app',
  // pending_teacher will land on /app/teacher/pending once Sprint 2.B ships
  // the verification status page. Today fallback to /app.
  pending_teacher: '/app',
  // student lands on the standard Dashboard — modules, progression, terminal
  student: '/app',
};

const SAFE_FALLBACK = '/app';

export function defaultRouteForRole(role: UserRole | null | undefined): string {
  if (!role) return SAFE_FALLBACK;
  return ROLE_DEFAULT_ROUTES[role] ?? SAFE_FALLBACK;
}
