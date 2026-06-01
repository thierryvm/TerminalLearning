/**
 * Tests for api/support/notify.ts (Sprint 2.C Étape 3, THI-319).
 *
 * The endpoint forwards the caller's Supabase token to PostgREST (RLS does the
 * authorization) then emails the super_admin via Resend. We mock global fetch,
 * routing by URL: the Supabase REST lookup vs the Resend send.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../../api/support/notify';
import { __resetForTests } from '../../../api/_rate-limit';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';
const ENDPOINT = 'https://terminallearning.dev/api/support/notify';

function freshTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    type: 'bug',
    description: 'Something broke when I clicked the button.',
    screenshot_url: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

interface FetchPlan {
  /** Rows returned by the Supabase REST lookup (null → upstream error). */
  lookupRows?: unknown[];
  lookupStatus?: number;
  /** Status returned by the Resend send. */
  resendStatus?: number;
}

let resendCalls: Array<{ url: string; init: RequestInit }>;
let lookupCalls: Array<{ url: string; init: RequestInit }>;

function mockFetch(plan: FetchPlan) {
  resendCalls = [];
  lookupCalls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('https://api.resend.com/emails')) {
        resendCalls.push({ url, init: init ?? {} });
        const status = plan.resendStatus ?? 200;
        return Promise.resolve(new Response(JSON.stringify({ id: 'email_1' }), { status }));
      }
      if (url.includes('/rest/v1/support_tickets')) {
        lookupCalls.push({ url, init: init ?? {} });
        const status = plan.lookupStatus ?? 200;
        const body = plan.lookupRows ? JSON.stringify(plan.lookupRows) : '[]';
        return Promise.resolve(new Response(body, { status }));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    }),
  );
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer usertoken', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('api/support/notify', () => {
  beforeEach(() => {
    __resetForTests();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://jdnukbpkjyyyjpuwgxhv.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('SUPPORT_TO_EMAIL', 'admin@example.com');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('handles CORS preflight (OPTIONS) with 204', async () => {
    mockFetch({});
    const res = await handler(new Request(ENDPOINT, { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://terminallearning.dev');
  });

  it('rejects non-POST methods with 405', async () => {
    mockFetch({});
    const res = await handler(new Request(ENDPOINT, { method: 'GET' }));
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toContain('POST');
  });

  it('rejects a missing/blank Authorization header with 401', async () => {
    mockFetch({});
    const res = await handler(post({ ticketId: VALID_UUID }, { Authorization: '' }));
    expect(res.status).toBe(401);
    expect(lookupCalls).toHaveLength(0);
  });

  it('rejects a non-UUID ticketId with 400', async () => {
    mockFetch({});
    const res = await handler(post({ ticketId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
    expect(lookupCalls).toHaveLength(0);
  });

  it('rejects a malformed JSON body with 400', async () => {
    mockFetch({});
    const res = await handler(post('{not json'));
    expect(res.status).toBe(400);
  });

  it('rejects an oversized Content-Length with 413', async () => {
    mockFetch({});
    const res = await handler(post({ ticketId: VALID_UUID }, { 'content-length': '99999' }));
    expect(res.status).toBe(413);
  });

  it('returns 401 when the RLS lookup is unauthorized', async () => {
    mockFetch({ lookupStatus: 401 });
    const res = await handler(post({ ticketId: VALID_UUID }));
    expect(res.status).toBe(401);
    expect(resendCalls).toHaveLength(0);
  });

  it('returns 404 when RLS hides the row (not owned / not found)', async () => {
    mockFetch({ lookupRows: [] });
    const res = await handler(post({ ticketId: VALID_UUID }));
    expect(res.status).toBe(404);
    expect(resendCalls).toHaveLength(0);
  });

  it('skips (200) and does not email a stale ticket (anti-replay)', async () => {
    const stale = freshTicket({ created_at: new Date(Date.now() - 5 * 60_000).toISOString() });
    mockFetch({ lookupRows: [stale] });
    const res = await handler(post({ ticketId: VALID_UUID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ skipped: 'stale' });
    expect(resendCalls).toHaveLength(0);
  });

  it('returns 500 when Supabase config is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    mockFetch({});
    const res = await handler(post({ ticketId: VALID_UUID }));
    expect(res.status).toBe(500);
  });

  it('skips email gracefully (200) when Resend is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    mockFetch({ lookupRows: [freshTicket()] });
    const res = await handler(post({ ticketId: VALID_UUID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ skipped: 'email_not_configured' });
    expect(resendCalls).toHaveLength(0);
  });

  it('sends the email on the happy path with the trusted DB content', async () => {
    mockFetch({ lookupRows: [freshTicket()] });
    const res = await handler(post({ ticketId: VALID_UUID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(resendCalls).toHaveLength(1);

    const sent = JSON.parse(resendCalls[0].init.body as string);
    expect(sent.to).toBe('admin@example.com');
    expect(sent.from).toContain('support@terminallearning.dev');
    expect(sent.subject).toContain('Bug');
    expect(sent.subject).toContain('11111111');
    expect(sent.html).toContain('Something broke');
    // Authorization carries the Resend key, never echoed back to the client.
    const headers = resendCalls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer re_test_key');
  });

  it('HTML-escapes the description (defense-in-depth against markup injection)', async () => {
    const xss = freshTicket({ description: '<img src=x onerror=alert(1)> & "quotes"' });
    mockFetch({ lookupRows: [xss] });
    const res = await handler(post({ ticketId: VALID_UUID }));
    expect(res.status).toBe(200);
    const sent = JSON.parse(resendCalls[0].init.body as string);
    expect(sent.html).not.toContain('<img src=x');
    expect(sent.html).toContain('&lt;img');
    expect(sent.html).toContain('&amp;');
  });

  it('degrades to 200 when Resend returns an error (best-effort, no leak)', async () => {
    mockFetch({ lookupRows: [freshTicket()], resendStatus: 429 });
    const res = await handler(post({ ticketId: VALID_UUID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ skipped: 'email_failed' });
  });

  it('rate-limits after the policy max (429)', async () => {
    mockFetch({ lookupRows: [freshTicket()] });
    let last = 200;
    for (let i = 0; i < 12; i++) {
      const res = await handler(post({ ticketId: VALID_UUID }));
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
