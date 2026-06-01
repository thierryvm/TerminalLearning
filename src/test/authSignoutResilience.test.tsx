/**
 * THI-310 — AuthContext.signOut resilience.
 *
 * Two guarantees this locks:
 *  1. Client-side teardown (THI-186-class cross-account cleanup) + local
 *     session clear run UNCONDITIONALLY — the previous order awaited the SDK
 *     loader first, so any failure short-circuited the teardown.
 *  2. A rejected server-side revocation is caught (`.catch`) rather than
 *     surfacing as an unhandled promise rejection.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `vi.hoisted` so these mock fns exist before the hoisted vi.mock factories run.
const { clearAi, clearRole } = vi.hoisted(() => ({
  clearAi: vi.fn(() => Promise.resolve()),
  clearRole: vi.fn(),
}));
vi.mock('../lib/ai/keyManager', () => ({ clearAiSessionData: clearAi }));
vi.mock('../lib/hooks/useUserRole', () => ({ clearUserRoleCache: clearRole }));

// SDK resolves, no session, and the revocation call REJECTS (network failure) —
// exercises the new `.catch` around `auth.signOut()`.
const signOutReject = vi.fn(() => Promise.reject(new Error('revocation network fail')));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: signOutReject,
    },
  },
}));

import { AuthProvider, useAuth } from '../app/context/AuthContext';

function Probe() {
  const { signOut, initialized } = useAuth();
  return (
    <>
      <span data-testid="ready">{initialized ? 'ready' : 'loading'}</span>
      <button onClick={() => void signOut()}>logout</button>
    </>
  );
}

beforeEach(() => {
  clearAi.mockClear();
  clearRole.mockClear();
  signOutReject.mockClear();
});

describe('THI-310 AuthContext.signOut — teardown + revocation rejection are resilient', () => {
  it('runs client-side teardown and absorbs a rejected revocation without throwing', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'));

    fireEvent.click(screen.getByText('logout'));

    // Teardown ran (AI session purge + role cache clear), and the rejected
    // revocation was attempted but caught — no throw, no unhandled rejection.
    await waitFor(() => expect(clearAi).toHaveBeenCalledOnce());
    expect(clearRole).toHaveBeenCalledOnce();
    await waitFor(() => expect(signOutReject).toHaveBeenCalledOnce());
  });
});
