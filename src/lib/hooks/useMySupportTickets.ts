/**
 * useMySupportTickets — THI-325 Sprint 2.C Étape 5 (« Mes signalements »).
 *
 * Read-only counterpart of `useSupportTickets` (super_admin triage). Fetches the
 * tickets visible to the current authenticated user; RLS does the scoping: the
 * `support_tickets: user select own` policy (migration 028) means the plain
 * PostgREST query returns ONLY the caller's own rows — never another user's.
 * (A super_admin would see all via their select-all policy, but this hook is
 * mounted on the user-facing /app/support page, gated by RequireAuth.)
 *
 * No mutation surface: the user cannot change status (no update policy for own
 * rows) — this hook intentionally exposes no updateStatus.
 *
 * Screenshots are NOT re-minted here: a regular user has no storage select
 * policy on support_screenshots (migration 030 grants super_admin only), so the
 * view shows a "capture jointe" marker rather than the image (THI-325 v1).
 */
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { TICKET_COLUMNS, type SupportTicket } from '@/lib/hooks/useSupportTickets';

export interface UseMySupportTicketsResult {
  tickets: SupportTicket[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useMySupportTickets(): UseMySupportTicketsResult {
  const { user, initialized } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('support_tickets')
        .select(TICKET_COLUMNS)
        .order('created_at', { ascending: false });
      if (fetchError) throw new Error(fetchError.message);
      setTickets((data ?? []) as SupportTicket[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Chargement des signalements impossible'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized) return;
    /* eslint-disable react-hooks/set-state-in-effect -- async fetch on mount, setState after await (same pattern as useSupportTickets) */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialized, refresh]);

  return { tickets, loading, error, refresh };
}
