/**
 * Tests for useSupportTickets + screenshot re-mint helpers (THI-320, Étape 4).
 *
 * RLS does the authorization server-side; here we verify the client contract:
 *   - fetch on mount (super_admin select-all is auto-scoped by RLS)
 *   - updateStatus sets/clears resolved_at + resolved_by per target status
 *   - the status-change audit trigger is server-side → the client never writes it
 *   - parseScreenshotPath / getFreshScreenshotUrl re-mint logic + malformed-URL guard
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  orderMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  createSignedUrlMock: vi.fn(),
  auth: { user: { id: 'admin-1' } as { id: string } | null, initialized: true },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: h.fromMock,
    storage: { from: () => ({ createSignedUrl: h.createSignedUrlMock }) },
  },
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({ user: h.auth.user, initialized: h.auth.initialized }),
}));

const {
  useSupportTickets,
  parseScreenshotPath,
  getFreshScreenshotUrl,
} = await import('@/lib/hooks/useSupportTickets');

const SIGN_BASE =
  'https://jdnukbpkjyyyjpuwgxhv.supabase.co/storage/v1/object/sign/support_screenshots';

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
  h.auth.user = { id: 'admin-1' };
  h.auth.initialized = true;
  h.fromMock.mockReturnValue({ select: h.selectMock, update: h.updateMock });
  h.selectMock.mockReturnValue({ order: h.orderMock });
  h.updateMock.mockReturnValue({ eq: h.eqMock });
  h.orderMock.mockResolvedValue({ data: [], error: null });
  h.eqMock.mockResolvedValue({ error: null });
  h.createSignedUrlMock.mockResolvedValue({ data: { signedUrl: `${SIGN_BASE}/u1/new.png?token=fresh` }, error: null });
});

describe('parseScreenshotPath', () => {
  it('extracts the object path from a stored signed URL', () => {
    expect(parseScreenshotPath(`${SIGN_BASE}/u1/abc.png?token=expired`)).toBe('u1/abc.png');
  });

  it('decodes percent-encoded path segments', () => {
    expect(parseScreenshotPath(`${SIGN_BASE}/u1/a%20b.png?token=x`)).toBe('u1/a b.png');
  });

  it('returns null for a URL without the sign marker (malformed/tampered)', () => {
    expect(parseScreenshotPath('https://evil.example.com/u1/abc.png')).toBeNull();
    expect(parseScreenshotPath('not a url')).toBeNull();
  });
});

describe('getFreshScreenshotUrl', () => {
  it('re-mints a fresh signed URL from a stored (expired) one', async () => {
    const fresh = await getFreshScreenshotUrl(`${SIGN_BASE}/u1/abc.png?token=expired`);
    expect(fresh).toBe(`${SIGN_BASE}/u1/new.png?token=fresh`);
    expect(h.createSignedUrlMock).toHaveBeenCalledWith('u1/abc.png', 3600);
  });

  it('returns null without calling storage when the URL is unparseable', async () => {
    const fresh = await getFreshScreenshotUrl('https://evil.example.com/x.png');
    expect(fresh).toBeNull();
    expect(h.createSignedUrlMock).not.toHaveBeenCalled();
  });

  it('returns null when the sign call errors', async () => {
    h.createSignedUrlMock.mockResolvedValue({ data: null, error: { message: 'denied' } });
    expect(await getFreshScreenshotUrl(`${SIGN_BASE}/u1/abc.png?token=x`)).toBeNull();
  });
});

describe('useSupportTickets — fetch', () => {
  it('loads tickets on mount (RLS-scoped, newest first by query order)', async () => {
    h.orderMock.mockResolvedValue({ data: [ticket({ id: 't2' }), ticket({ id: 't1' })], error: null });
    const { result } = renderHook(() => useSupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickets).toHaveLength(2);
    expect(h.fromMock).toHaveBeenCalledWith('support_tickets');
    expect(h.orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('stays empty (no fetch) when there is no authenticated user', async () => {
    h.auth.user = null;
    const { result } = renderHook(() => useSupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickets).toEqual([]);
    expect(h.fromMock).not.toHaveBeenCalled();
  });

  it('surfaces a fetch error', async () => {
    h.orderMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useSupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.tickets).toEqual([]);
  });
});

describe('useSupportTickets — updateStatus', () => {
  it('sets resolved_at + resolved_by when moving to resolved, optimistically', async () => {
    h.orderMock.mockResolvedValue({ data: [ticket()], error: null });
    const { result } = renderHook(() => useSupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateStatus('t1', 'resolved');
    });

    expect(h.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'resolved', resolved_by: 'admin-1' }),
    );
    const patch = h.updateMock.mock.calls[0][0] as { resolved_at: string | null };
    expect(typeof patch.resolved_at).toBe('string');
    expect(h.eqMock).toHaveBeenCalledWith('id', 't1');
    expect(result.current.tickets[0].status).toBe('resolved');
    expect(result.current.tickets[0].resolved_by).toBe('admin-1');
  });

  it('clears resolved_at + resolved_by when moving to a non-resolved status', async () => {
    h.orderMock.mockResolvedValue({
      data: [ticket({ status: 'resolved', resolved_at: '2026-06-01T11:00:00Z', resolved_by: 'admin-1' })],
      error: null,
    });
    const { result } = renderHook(() => useSupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateStatus('t1', 'in_progress');
    });

    expect(h.updateMock).toHaveBeenCalledWith({
      status: 'in_progress',
      resolved_at: null,
      resolved_by: null,
    });
    expect(result.current.tickets[0].resolved_at).toBeNull();
  });

  it('maps an RLS denial (42501) to a friendly FR error', async () => {
    h.orderMock.mockResolvedValue({ data: [ticket()], error: null });
    h.eqMock.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const { result } = renderHook(() => useSupportTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.updateStatus('t1', 'resolved');
    });

    expect(ok).toBe(false);
    expect(result.current.error?.message).toContain('autorisée');
    // Optimistic patch must NOT have applied on failure.
    expect(result.current.tickets[0].status).toBe('open');
  });
});
