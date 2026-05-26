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
 *   approve(id)     : calls approve_teacher RPC and refetches on success
 *   refresh()       : manual re-fetch
 *
 * Out of scope (v1.0 Étape 4) :
 *   - Rejection workflow (no `reject_teacher` RPC yet — backlog)
 *   - Multi-select bulk approve
 *   - Statistics (n total pending, n approved this month)
 */
import { useCallback, useEffect, useState } from 'react';

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

export interface UsePendingTeachersResult {
  pendingTeachers: PendingTeacher[];
  loading: boolean;
  approving: string | null;
  error: Error | null;
  approve: (targetId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
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

      setApproving(targetId);
      setError(null);

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
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Approbation impossible'));
        return false;
      } finally {
        setApproving(null);
      }
    },
    [user, approving],
  );

  return { pendingTeachers, loading, approving, error, approve, refresh };
}
