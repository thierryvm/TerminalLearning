/**
 * useUserRole — THI-225 Phase 9 Admin Panel.
 *
 * Fetches the authenticated user's role via the `get_my_role()` Supabase
 * RPC (security definer, bypasses RLS recursion). Returns the role + a
 * loading flag so callers can wait for resolution before deciding what
 * to render.
 *
 * RBAC source of truth : `public.profiles.role` column (migration
 * `005_rbac_roles.sql`). Roles in increasing privilege order :
 *   student → pending_teacher → teacher → institution_admin → super_admin
 *
 * Caching strategy : in-memory promise cache per session. The RPC is
 * cheap (one-row read with RLS bypass via security definer) but caching
 * avoids re-fetching on every <RequireRole> remount.
 *
 * Reset : the cache is cleared on signOut via `clearUserRoleCache()`
 * exported alongside, called from `AuthContext.signOut()` next session.
 */
import { useEffect, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import type { UserRole } from '@/app/types/database';

let cachedRolePromise: Promise<UserRole | null> | null = null;
let cachedRoleUserId: string | null = null;

/**
 * Clear the in-memory role cache. Must be called from `AuthContext.signOut()`
 * to prevent the next user inheriting the previous user's role on the same
 * device (same defense-in-depth class as THI-207 AI session data wipe).
 */
export function clearUserRoleCache(): void {
  cachedRolePromise = null;
  cachedRoleUserId = null;
}

async function fetchRole(userId: string): Promise<UserRole | null> {
  // Re-use the cached promise if same user — avoids parallel RPC calls
  // from multiple <RequireRole> instances mounting simultaneously.
  if (cachedRoleUserId === userId && cachedRolePromise) {
    return cachedRolePromise;
  }
  cachedRoleUserId = userId;
  cachedRolePromise = (async () => {
    // Drop the cache after a TRANSIENT failure (RPC error / network reject /
    // stale-chunk import) so the next <RequireRole> mount retries once the
    // network recovers — rather than pinning `null` for the whole session and
    // locking a legitimate institution_admin / super_admin out of their route
    // until a full reload (security-auditor M1, THI-310). A `null` client
    // (`!supabase`, missing config) is NOT transient, so it stays cached.
    const invalidateForRetry = () => {
      cachedRoleUserId = null;
      cachedRolePromise = null;
    };
    try {
      const { supabase } = await import('@/lib/supabase');
      if (!supabase) return null;
      const { data, error } = await supabase.rpc('get_my_role');
      if (error) {
        // Don't expose the user-facing error here — the calling component
        // will render a fallback. Logging the technical error is enough.
        console.error('[useUserRole] get_my_role RPC failed:', error.message);
        invalidateForRetry();
        return null;
      }
      return data as UserRole | null;
    } catch (err) {
      // A rejected SDK chunk load (stale chunk / network) or a thrown RPC must
      // NOT reject the cached promise: the caller's `.then` (in the effect
      // below) has no `.catch`, so a rejection would surface as an unhandled
      // rejection. Degrade to `null` — the most restrictive default (no
      // elevated role); a genuine stale chunk self-heals on the next reload
      // via main.tsx. THI-310.
      console.error('[useUserRole] role resolution failed (non-fatal):', err);
      invalidateForRetry();
      return null;
    }
  })();
  return cachedRolePromise;
}

export interface UseUserRoleResult {
  role: UserRole | null;
  loading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const { user, initialized } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  // Track which user.id the current `role` state corresponds to. The derived
  // `loading` flag is true whenever auth is unresolved OR there is a user
  // but the RPC has not yet resolved for that specific user.id (handles
  // user switching on the same device without a synchronous setState
  // inside the effect — eslint react-hooks/set-state-in-effect).
  const [resolvedForUserId, setResolvedForUserId] = useState<string | null>(null);
  const loading = !initialized || (!!user && resolvedForUserId !== user.id);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      // No user → reset role + resolved sentinel. Synchronous setState
      // here is intentional: required to clear stale state from a previous
      // authenticated session on the same device (defense-in-depth
      // alignment with THI-207 signout wipe + THI-221 RequireAuth pattern).
      /* eslint-disable react-hooks/set-state-in-effect -- defense-in-depth signout reset */
      setRole(null);
      setResolvedForUserId(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    fetchRole(user.id).then((fetchedRole) => {
      if (cancelled) return;
      setRole(fetchedRole);
      setResolvedForUserId(user.id);
    });
    return () => {
      cancelled = true;
    };
  }, [user, initialized]);

  return { role, loading };
}
