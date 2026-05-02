import { describe, it, expect, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

vi.mock('@sentry/node', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

import handler from '../../api/lti/launch';

// Minimal mocks for VercelRequest / VercelResponse used by the handler.
// Use `unknown` then cast at the call site rather than `any`, to keep ESLint happy.
type MockReq = {
  method: string;
  body: unknown;
  headers: Record<string, string>;
  query: Record<string, string>;
  cookies: Record<string, string>;
};

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  ended: boolean;
  status: (code: number) => MockRes;
  setHeader: (k: string, v: string) => MockRes;
  send: (b: unknown) => MockRes;
  end: () => MockRes;
};

function createReq(opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): MockReq {
  return {
    method: opts.method ?? 'POST',
    body: opts.body,
    headers: opts.headers ?? {},
    query: {},
    cookies: {},
  };
}

function createRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    status: () => res,
    setHeader: () => res,
    send: () => res,
    end: () => res,
  };
  res.status = vi.fn((code: number): MockRes => {
    res.statusCode = code;
    return res;
  });
  res.setHeader = vi.fn((k: string, v: string): MockRes => {
    res.headers[k.toLowerCase()] = v;
    return res;
  });
  res.send = vi.fn((b: unknown): MockRes => {
    res.body = b;
    res.ended = true;
    return res;
  });
  res.end = vi.fn((): MockRes => {
    res.ended = true;
    return res;
  });
  return res;
}

describe('LTI launch endpoint — feature flag (THI-133) + Express-style handler (THI-134)', () => {
  const originalEnv = process.env.LTI_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.LTI_ENABLED;
    } else {
      process.env.LTI_ENABLED = originalEnv;
    }
  });

  it('returns 503 when LTI_ENABLED is not set', async () => {
    delete process.env.LTI_ENABLED;
    const req = createReq();
    const res = createRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(503);
    expect(res.body).toBe('LTI endpoint not available');
  });

  it('returns 503 when LTI_ENABLED is "false"', async () => {
    process.env.LTI_ENABLED = 'false';
    const req = createReq();
    const res = createRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(503);
  });

  it('returns 503 when LTI_ENABLED is "TRUE" (case-sensitive)', async () => {
    process.env.LTI_ENABLED = 'TRUE';
    const req = createReq();
    const res = createRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(503);
  });

  it('does NOT return 503 when LTI_ENABLED="true" (CORS preflight reaches handler)', async () => {
    process.env.LTI_ENABLED = 'true';
    const req = createReq({ method: 'OPTIONS' });
    const res = createRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(204);
  });

  it('503 response includes CORS + cache headers (LMS gets clear answer)', async () => {
    delete process.env.LTI_ENABLED;
    const req = createReq();
    const res = createRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.headers['access-control-allow-origin']).toBe('https://terminallearning.dev');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  it('returns 405 on GET when LTI_ENABLED="true"', async () => {
    process.env.LTI_ENABLED = 'true';
    const req = createReq({ method: 'GET' });
    const res = createRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(405);
    expect(res.headers['allow']).toBe('POST, OPTIONS');
  });
});
