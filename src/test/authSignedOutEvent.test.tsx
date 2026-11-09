/**
 * PR #420 (Sourcery) — a SIGNED_OUT event that does not come from this tab's
 * `signOut` (logout in another tab, revoked or expired session) must run the
 * same client teardown, so the next learner on a shared computer does not
 * inherit the previous learner's AI data (model choice included).
 */
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clearAi, clearRole, listeners } = vi.hoisted(() => ({
  clearAi: vi.fn(() => Promise.resolve()),
  clearRole: vi.fn(),
  listeners: [] as Array<(event: string, session: unknown) => void>,
}));
vi.mock('../lib/ai/keyManager', () => ({ clearAiSessionData: clearAi }));
vi.mock('../lib/hooks/useUserRole', () => ({ clearUserRoleCache: clearRole }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

import { AuthProvider } from '../app/context/AuthContext';

beforeEach(() => {
  clearAi.mockClear();
  clearRole.mockClear();
  listeners.length = 0;
});

async function mountAndGetListener() {
  render(
    <AuthProvider>
      <span />
    </AuthProvider>,
  );
  await waitFor(() => expect(listeners).toHaveLength(1));
  return listeners[0];
}

describe('AuthContext — SIGNED_OUT from the auth listener', () => {
  it('runs the client teardown (AI data + role cache)', async () => {
    const listener = await mountAndGetListener();
    listener('SIGNED_OUT', null);
    await waitFor(() => expect(clearAi).toHaveBeenCalledOnce());
    expect(clearRole).toHaveBeenCalledOnce();
  });

  it('leaves the AI data alone on other events', async () => {
    const listener = await mountAndGetListener();
    listener('TOKEN_REFRESHED', { user: { id: 'u1' } });
    listener('SIGNED_IN', { user: { id: 'u1' } });
    await Promise.resolve();
    expect(clearAi).not.toHaveBeenCalled();
    expect(clearRole).not.toHaveBeenCalled();
  });
});
