/**
 * useAdminAnalytics — THI-234 Phase 9 Admin Panel (data-driven widgets).
 *
 * Read-only hook feeding the « Santé Supabase » + « Activité élèves » heatmap
 * widgets in AdminPanel. Both data sources are cross-user aggregates exposed via
 * the `admin_platform_stats` / `admin_activity_heatmap` RPCs (migration 032),
 * which are SECURITY DEFINER + gated `super_admin` internally and REVOKE'd from
 * public/anon. The UI is ALSO gated by <RequireRole allowed={['super_admin']}>
 * (defense in depth) — so in practice only a super_admin ever calls these.
 *
 * A non-super_admin who somehow reached the call gets a PostgREST error
 * (PERMISSION_DENIED / 42501) which surfaces as `error`; no aggregate ever leaks.
 */
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/app/types/database';

export type PlatformStats = Database['public']['Functions']['admin_platform_stats']['Returns'];
export type HeatmapDay = Database['public']['Functions']['admin_activity_heatmap']['Returns'][number];

export interface UseAdminAnalyticsResult {
  stats: PlatformStats | null;
  heatmap: HeatmapDay[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAdminAnalytics(): UseAdminAnalyticsResult {
  const { user, initialized } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      setStats(null);
      setHeatmap([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Parallel — the two RPCs are independent reads, no ordering constraint.
      const [statsRes, heatmapRes] = await Promise.all([
        supabase.rpc('admin_platform_stats'),
        supabase.rpc('admin_activity_heatmap'),
      ]);
      // Both RPCs run in parallel — surface BOTH errors if they fail together
      // (likely the same root cause, e.g. a role edge case) for easier debugging
      // instead of masking the second one (code-reviewer THI-234).
      const messages = [statsRes.error?.message, heatmapRes.error?.message].filter(Boolean);
      if (messages.length > 0) throw new Error(messages.join(' | '));
      setStats(statsRes.data ?? null);
      setHeatmap(heatmapRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Chargement des analytics impossible'));
      setStats(null);
      setHeatmap([]);
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

  return { stats, heatmap, loading, error, refresh };
}
