/**
 * Tests for notifyTicketCreated — the best-effort client nudge (Étape 3, THI-319).
 *
 * Verifies it forwards the access token to the same-origin endpoint, no-ops
 * without a session, and never throws when the network fails (the ticket is
 * already persisted, so a failed notification must stay silent).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const getSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

import { notifyTicketCreated } from '@/lib/support/notifyTicket';

const TICKET_ID = '11111111-1111-4111-8111-111111111111';

describe('notifyTicketCreated', () => {
  beforeEach(() => {
    getSession.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to /api/support/notify with the bearer token and ticketId', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok123' } } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await notifyTicketCreated(TICKET_ID);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/support/notify');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok123');
    expect(JSON.parse(init.body as string)).toEqual({ ticketId: TICKET_ID });
  });

  it('does not call fetch when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await notifyTicketCreated(TICKET_ID);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows network errors (never throws)', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok123' } } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(notifyTicketCreated(TICKET_ID)).resolves.toBeUndefined();
  });
});
