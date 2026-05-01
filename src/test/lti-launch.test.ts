import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('@sentry/node', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

import handler from '../../api/lti/launch';

describe('LTI launch endpoint — feature flag (THI-133)', () => {
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
    const req = new Request('https://terminallearning.dev/api/lti/launch', { method: 'POST' });
    const res = await handler(req);
    expect(res.status).toBe(503);
  });

  it('returns 503 when LTI_ENABLED is "false"', async () => {
    process.env.LTI_ENABLED = 'false';
    const req = new Request('https://terminallearning.dev/api/lti/launch', { method: 'POST' });
    const res = await handler(req);
    expect(res.status).toBe(503);
  });

  it('returns 503 when LTI_ENABLED is "TRUE" (case-sensitive)', async () => {
    process.env.LTI_ENABLED = 'TRUE';
    const req = new Request('https://terminallearning.dev/api/lti/launch', { method: 'POST' });
    const res = await handler(req);
    expect(res.status).toBe(503);
  });

  it('does NOT return 503 when LTI_ENABLED="true" (CORS preflight reaches handler)', async () => {
    process.env.LTI_ENABLED = 'true';
    const req = new Request('https://terminallearning.dev/api/lti/launch', { method: 'OPTIONS' });
    const res = await handler(req);
    expect(res.status).toBe(204);
  });

  it('503 response includes CORS headers (LMS gets clear answer, not silent block)', async () => {
    delete process.env.LTI_ENABLED;
    const req = new Request('https://terminallearning.dev/api/lti/launch', { method: 'POST' });
    const res = await handler(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://terminallearning.dev');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
