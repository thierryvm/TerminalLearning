/**
 * Tests for useMySupportTickets — THI-325 Étape 5 (« Mes signalements »).
 *
 * RLS (`support_tickets: user select own`, migration 028) does the scoping
 * server-side; here we verify the client contract of the read-only hook:
 *   - fetch on mount, newest first, from the support_tickets table
 *   - stays empty (no query) when there is no authenticated user
 *   - surfaces a fetch error
 *   - exposes NO mutation surface (read-only — no updateStatus)
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  orderMock: vi.fn(),
  auth: { user: { id: 'u1' } as { id: string } | null, initialized: true },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: h.fromMock },
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({ user: h.auth.user, initialized: h.auth.initialized }),
}));

const { useMySupportTickets } = await import('@/lib/hooks/useMySupportTickets');

function ticket(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    user_id: 'u1',
    type: 'bug',
    description: 'It broke',
    screenshot_url: null,
    status: 'open',
    created_at: '2026-06-01T10:00:00Z',
    resolved_at: null,
    resolved_by: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.auth.user = { id: 'u1' };
  h.auth.initialized = true;
  h.fromMock.mockReturnValue({ select: h.selectMock });
  h.selectMock.mockReturnValue({ order: h.orderMock });
  h.orderMock.mockResolvedValue({ data: [], error: null });
});

describe('useMySupportTickets', () => {
  it('loads the user own tickets on mount (RLS-scoped, newest first)', async () => {
    h.orderMock.mockResolvedValue({ data: [ticket({ id: 't2' }), ticket({ id: 't1' })], error: null });
    const { result } = renderHook(() => useMySupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickets).toHaveLength(2);
    expect(h.fromMock).toHaveBeenCalledWith('support_tickets');
    expect(h.orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('stays empty (no query) when there is no authenticated user', async () => {
    h.auth.user = null;
    const { result } = renderHook(() => useMySupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickets).toEqual([]);
    expect(h.fromMock).not.toHaveBeenCalled();
  });

  it('surfaces a fetch error and clears the list', async () => {
    h.orderMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useMySupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.tickets).toEqual([]);
  });

  it('exposes a read-only surface (refresh, no updateStatus)', async () => {
    const { result } = renderHook(() => useMySupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refresh).toBe('function');
    expect((result.current as unknown as Record<string, unknown>).updateStatus).toBeUndefined();
  });
});
