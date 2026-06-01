/**
 * THI-310 — useUserRole resilience.
 *
 * `fetchRole` does `await import('@/lib/supabase')` then awaits the
 * `get_my_role` RPC. Before the fix, a thrown RPC (network reject) or a
 * rejected SDK chunk import propagated to the hook's catch-less `.then`,
 * surfacing as an unhandled promise rejection.
 *
 * After the fix the resolution is wrapped in try/catch and degrades to `null`
 * (the most restrictive default: no elevated role), AND a transient failure
 * does not poison the module-level cache — the next mount retries
 * (security-auditor M1).
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// useAuth supplies the user id that drives fetchRole. A present user is required
// or the hook short-circuits to null without ever calling the RPC. The `user`
// object MUST be a stable reference (defined once inside the factory) — the
// hook's effect deps are `[user, initialized]`, so a fresh object per render
// would thrash the effect and re-fire fetchRole on every render.
vi.mock('../app/context/AuthContext', () => {
  const user = { id: 'user-1' };
  return { useAuth: () => ({ user, initialized: true }) };
});

// Expose the RPC mock so each test can program its per-call behaviour.
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { rpc } }));

import { clearUserRoleCache, useUserRole } from '../lib/hooks/useUserRole';

beforeEach(() => {
  // The role cache is module-level; clear it so each test re-runs fetchRole.
  clearUserRoleCache();
  rpc.mockReset();
});

describe('THI-310 useUserRole — graceful degradation + self-healing cache', () => {
  it('resolves to role=null instead of rejecting when get_my_role throws', async () => {
    rpc.mockRejectedValue(new Error('network: get_my_role failed'));

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
  });

  it('retries on the next mount after a transient failure (cache not poisoned)', async () => {
    // First mount: the RPC keeps rejecting (transient outage).
    rpc.mockRejectedValue(new Error('transient network'));

    const first = renderHook(() => useUserRole());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current.role).toBeNull();
    first.unmount();

    // Network recovers. The catch released the module cache, so a fresh mount
    // re-fetches and recovers the real role rather than staying pinned on the
    // failed `null`.
    rpc.mockReset();
    rpc.mockResolvedValue({ data: 'super_admin', error: null });

    const second = renderHook(() => useUserRole());
    await waitFor(() => expect(second.result.current.role).toBe('super_admin'));
  });
});
