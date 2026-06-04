/**
 * Tests for useAdminAnalytics — THI-234 Phase 9.
 *
 * The two RPCs (admin_platform_stats / admin_activity_heatmap, migration 032) do
 * the authorization server-side (super_admin gate + REVOKE public/anon). Here we
 * verify the client contract of the read-only hook: parallel fetch on mount,
 * empty when unauthenticated, error surfacing, read-only surface.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  auth: { user: { id: 'sa' } as { id: string } | null, initialized: true },
}));

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: h.rpcMock } }));
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({ user: h.auth.user, initialized: h.auth.initialized }),
}));

const { useAdminAnalytics } = await import('@/lib/hooks/useAdminAnalytics');

const STATS = {
  total_users: 12,
  active_users_7d: 1,
  lessons_completed_30d: 2,
  lessons_completed_total: 53,
  top_lessons: [],
};
const HEATMAP = [{ day: '2026-06-01', completions: 4 }];

beforeEach(() => {
  vi.clearAllMocks();
  h.auth.user = { id: 'sa' };
  h.auth.initialized = true;
  h.rpcMock.mockImplementation((fn: string) => {
    if (fn === 'admin_platform_stats') return Promise.resolve({ data: STATS, error: null });
    if (fn === 'admin_activity_heatmap') return Promise.resolve({ data: HEATMAP, error: null });
    return Promise.resolve({ data: null, error: null });
  });
});

describe('useAdminAnalytics', () => {
  it('loads stats + heatmap on mount (both RPCs)', async () => {
    const { result } = renderHook(() => useAdminAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats).toEqual(STATS);
    expect(result.current.heatmap).toEqual(HEATMAP);
    expect(h.rpcMock).toHaveBeenCalledWith('admin_platform_stats');
    expect(h.rpcMock).toHaveBeenCalledWith('admin_activity_heatmap');
  });

  it('stays empty (no RPC) when there is no authenticated user', async () => {
    h.auth.user = null;
    const { result } = renderHook(() => useAdminAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats).toBeNull();
    expect(result.current.heatmap).toEqual([]);
    expect(h.rpcMock).not.toHaveBeenCalled();
  });

  it('surfaces an error and clears data when an RPC fails', async () => {
    h.rpcMock.mockImplementation((fn: string) => {
      if (fn === 'admin_platform_stats') {
        return Promise.resolve({ data: null, error: { message: 'PERMISSION_DENIED' } });
      }
      return Promise.resolve({ data: HEATMAP, error: null });
    });
    const { result } = renderHook(() => useAdminAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.stats).toBeNull();
    expect(result.current.heatmap).toEqual([]);
  });

  it('exposes a refresh function (read-only surface)', async () => {
    const { result } = renderHook(() => useAdminAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refresh).toBe('function');
  });
});
