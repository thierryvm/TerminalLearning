import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('@sentry/node', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

import handler from '../../api/lti/launch';

// Minimal mocks for VercelRequest / VercelResponse used by the handler.
function createReq(opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return {
    method: opts.method ?? 'POST',
    body: opts.body,
    headers: opts.headers ?? {},
    query: {},
    cookies: {},
  } as any;
}

function createRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    ended: false,
  };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.setHeader = vi.fn((k: string, v: string) => {
    res.headers[k.toLowerCase()] = v;
    return res;
  });
  res.send = vi.fn((b: unknown) => {
    res.body = b;
    res.ended = true;
    return res;
  });
  res.end = vi.fn(() => {
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
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toBe('LTI endpoint not available');
  });

  it('returns 503 when LTI_ENABLED is "false"', async () => {
    process.env.LTI_ENABLED = 'false';
    const req = createReq();
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
  });

  it('returns 503 when LTI_ENABLED is "TRUE" (case-sensitive)', async () => {
    process.env.LTI_ENABLED = 'TRUE';
    const req = createReq();
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
  });

  it('does NOT return 503 when LTI_ENABLED="true" (CORS preflight reaches handler)', async () => {
    process.env.LTI_ENABLED = 'true';
    const req = createReq({ method: 'OPTIONS' });
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(204);
  });

  it('503 response includes CORS + cache headers (LMS gets clear answer)', async () => {
    delete process.env.LTI_ENABLED;
    const req = createReq();
    const res = createRes();
    await handler(req, res);
    expect(res.headers['access-control-allow-origin']).toBe('https://terminallearning.dev');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  it('returns 405 on GET when LTI_ENABLED="true"', async () => {
    process.env.LTI_ENABLED = 'true';
    const req = createReq({ method: 'GET' });
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers['allow']).toBe('POST, OPTIONS');
  });
});
