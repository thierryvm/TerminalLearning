/**
 * usePendingTeachers — THI-280 Sprint 2.B Étape 4 InstitutionAdminPanel.
 *
 * Fetches pending_teacher profiles within the caller's institution (RLS
 * auto-scopes the SELECT to the institution of the institution_admin, per
 * migration 009). Exposes `approve(targetId)` which calls the `approve_teacher`
 * RPC delivered by migration 025 + 026 (Étape 3, PR #298).
 *
 * RLS source of truth :
 *   - migration 009 : institution_admin SELECT profiles WHERE institution_id =
 *     get_my_institution_id() → list scoped automatically
 *   - migration 025 : approve_teacher RPC SECURITY DEFINER with same-institution
 *     enforcement + trigger prevent_role_escalation (010) backstop
 *   - migration 026 : trigger audit_pending_teacher_promotion ensures any
 *     pending→teacher promotion is audited regardless of path
 *
 * Returns :
 *   pendingTeachers : array of profile rows in pending_teacher state
 *   loading         : initial fetch in flight
 *   approving       : id currently being approved (single RPC at a time)
 *   error           : last failed operation (Error or null)
 *   lastSuccess     : Sprint 2.B.2 UX feedback — derniere approbation réussie
 *                    (displayName + scope) pour affichage "Approuvé via X".
 *                    Auto-clear après 8s OU prochain `approve()` call.
 *   approve(id)     : calls approve_teacher RPC and refetches on success
 *   refresh()       : manual re-fetch
 *   clearLastSuccess: dismiss manuel du message de succès
 *
 * Out of scope (v1.0 Étape 4) :
 *   - Rejection workflow (no `reject_teacher` RPC yet — backlog)
 *   - Multi-select bulk approve
 *   - Statistics (n total pending, n approved this month)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';

export interface PendingTeacher {
  id: string;
  display_name: string | null;
  username: string | null;
  sector: string | null;
  institution_id: string | null;
  role_requested_at: string | null;
  created_at: string;
}

/**
 * Sprint 2.B.2 — feedback UX post-approve.
 * Capture le displayName de la dernière approbation réussie pour affichage
 * inline (toast-like) dans le panel. Le composant InstitutionAdminPanel
 * enrichit avec le scope ('global' pour super_admin / 'institution' pour
 * institution_admin) via useUserRole — séparation concerns hook/composant.
 */
export interface ApprovalSuccess {
  displayName: string;
}

const SUCCESS_AUTO_CLEAR_MS = 8000;

export interface UsePendingTeachersResult {
  pendingTeachers: PendingTeacher[];
  loading: boolean;
  approving: string | null;
  error: Error | null;
  lastSuccess: ApprovalSuccess | null;
  approve: (targetId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearLastSuccess: () => void;
}

async function fetchPendingTeachers(): Promise<PendingTeacher[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, sector, institution_id, role_requested_at, created_at')
    .eq('role', 'pending_teacher')
    .order('role_requested_at', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function usePendingTeachers(): UsePendingTeachersResult {
  const { user, initialized } = useAuth();
  const [pendingTeachers, setPendingTeachers] = useState<PendingTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [lastSuccess, setLastSuccess] = useState<ApprovalSuccess | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLastSuccess = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setLastSuccess(null);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      setPendingTeachers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPendingTeachers();
      setPendingTeachers(rows);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch pending teachers'));
      setPendingTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized) return;
    /* eslint-disable react-hooks/set-state-in-effect -- async fetch on mount, setState after await (same pattern as useTeacherClasses) */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialized, refresh]);

  const approve = useCallback(
    async (targetId: string): Promise<boolean> => {
      if (!user || !supabase) {
        setError(new Error('Authentification requise'));
        return false;
      }
      if (approving) return false;

      // Snapshot du target avant approve — utilisé pour le success message
      const targetRow = pendingTeachers.find((row) => row.id === targetId);
      const displayName =
        targetRow?.display_name ?? targetRow?.username ?? 'Profil sans nom';

      setApproving(targetId);
      setError(null);
      // Clear precedent success message (anti-stale display)
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
      setLastSuccess(null);

      try {
        const { error: rpcError } = await supabase.rpc('approve_teacher', {
          target_user_id: targetId,
        });
        if (rpcError) {
          // Map PostgreSQL exceptions from the RPC body (migration 025) to
          // user-facing FR messages. The RPC itself never interpolates the
          // role label into error strings (M1 security-auditor hardening) —
          // here we only translate stable token-strings to user copy.
          const message = rpcError.message ?? '';
          if (message.includes('PERMISSION_DENIED')) {
            throw new Error("Vous n'avez pas la permission d'approuver ce profil.");
          }
          if (message.includes('INVALID_STATE')) {
            throw new Error("Ce profil n'est plus en attente d'approbation.");
          }
          if (message.includes('NOT_FOUND')) {
            throw new Error("Profil introuvable.");
          }
          throw new Error("Approbation impossible. Réessaye dans un instant.");
        }

        // Optimistic local update: remove the approved row from the list.
        // A refresh() would also work but adds a round-trip — the RLS view
        // would exclude the now-teacher anyway.
        setPendingTeachers((prev) => prev.filter((row) => row.id !== targetId));

        // Sprint 2.B.2 — feedback UX post-approve.
        // Le hook expose uniquement `displayName` ; le composant enrichit
        // l'affichage avec le scope (super_admin/institution_admin) via
        // useUserRole. Séparation concerns : pas de round-trip SELECT
        // admin_audit_log (RLS restreint super_admin only + latence inutile).
        setLastSuccess({ displayName });

        // Auto-clear timer
        successTimerRef.current = setTimeout(() => {
          setLastSuccess(null);
          successTimerRef.current = null;
        }, SUCCESS_AUTO_CLEAR_MS);

        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Approbation impossible'));
        return false;
      } finally {
        setApproving(null);
      }
    },
    [user, approving, pendingTeachers],
  );

  return {
    pendingTeachers,
    loading,
    approving,
    error,
    lastSuccess,
    approve,
    refresh,
    clearLastSuccess,
  };
}
