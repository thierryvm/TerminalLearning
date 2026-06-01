/**
 * THI-310 — useUserRole resilience.
 *
 * `fetchRole` does `await import('@/lib/supabase')` then awaits the
 * `get_my_role` RPC. Before the fix, a thrown RPC (network reject) or a
 * rejected SDK chunk import propagated to the hook's catch-less `.then`,
 * surfacing as an unhandled promise rejection.
 *
 * After the fix the resolution is wrapped in try/catch and degrades to `null`
 * (the most restrictive default: no elevated role). This test drives the catch
 * path via a rejecting RPC and locks the clean `loading=false, role=null`
 * outcome.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// useAuth supplies the user id that drives fetchRole. A present user is required
// or the hook short-circuits to null without ever calling the RPC.
vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, initialized: true }),
}));

// SDK import resolves, but the RPC rejects (transient network / SDK throw) —
// the exact path the new try/catch must absorb.
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(() => Promise.reject(new Error('network: get_my_role failed'))),
  },
}));

import { clearUserRoleCache, useUserRole } from '../lib/hooks/useUserRole';

beforeEach(() => {
  // The role cache is module-level; clear it so each test re-runs fetchRole.
  clearUserRoleCache();
});

describe('THI-310 useUserRole — graceful degradation when the role RPC rejects', () => {
  it('resolves to role=null instead of rejecting when get_my_role throws', async () => {
    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
  });
});
