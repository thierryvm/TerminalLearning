/**
 * THI-340 — stampAgeConfirmation must make failures observable without
 * leaking personal data (security-auditor L1, 23 September 2026).
 *
 * supabase-js resolves `{ error }` instead of throwing on a PostgREST error,
 * so a silently ignored return value hid every failed stamp.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../app/types/database';

const mockCaptureMessage = vi.fn();
vi.mock('../lib/sentry', () => ({
  Sentry: { captureMessage: (...args: unknown[]) => mockCaptureMessage(...args) },
}));

import { stampAgeConfirmation } from '../lib/auth/stampAgeConfirmation';

const USER_ID = '11111111-2222-3333-4444-555555555555';

function clientResolving(result: unknown) {
  const is = vi.fn(() => result);
  const eq = vi.fn(() => ({ is }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { client: { from } as unknown as SupabaseClient<Database>, from, update, eq, is };
}

/** Let the dynamic `import('@/lib/sentry')` chain settle. */
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  mockCaptureMessage.mockClear();
});

describe('stampAgeConfirmation', () => {
  it('only stamps a row that is not stamped yet', async () => {
    const c = clientResolving(Promise.resolve({ error: null }));
    await stampAgeConfirmation(c.client, USER_ID);
    expect(c.from).toHaveBeenCalledWith('profiles');
    expect(c.eq).toHaveBeenCalledWith('id', USER_ID);
    expect(c.is).toHaveBeenCalledWith('age_confirmed_at', null);
  });

  it('reports nothing when the write succeeds', async () => {
    const c = clientResolving(Promise.resolve({ error: null }));
    await stampAgeConfirmation(c.client, USER_ID);
    await flush();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('reports a PostgREST error with its code only — no user id, no message', async () => {
    const c = clientResolving(
      Promise.resolve({ error: { code: '42501', message: `permission denied for ${USER_ID}` } }),
    );
    await stampAgeConfirmation(c.client, USER_ID);
    await flush();
    expect(mockCaptureMessage).toHaveBeenCalledWith('age_stamp_failed', {
      level: 'warning',
      tags: { code: '42501' },
    });
    expect(JSON.stringify(mockCaptureMessage.mock.calls)).not.toContain(USER_ID);
  });

  it('maps a network failure (postgrest-js resolves code "" with status 0) to "network"', async () => {
    // This is what postgrest-js 2.x actually returns when fetch fails: it
    // resolves, it does not throw.
    const c = clientResolving(
      Promise.resolve({ error: { code: '', message: 'TypeError: Failed to fetch' }, status: 0 }),
    );
    await expect(stampAgeConfirmation(c.client, USER_ID)).resolves.toBeUndefined();
    await flush();
    expect(mockCaptureMessage).toHaveBeenCalledWith('age_stamp_failed', {
      level: 'warning',
      tags: { code: 'network' },
    });
  });

  it('still reports when the client is configured to throw', async () => {
    const c = clientResolving(Promise.reject(new Error('Failed to fetch')));
    await expect(stampAgeConfirmation(c.client, USER_ID)).resolves.toBeUndefined();
    await flush();
    expect(mockCaptureMessage).toHaveBeenCalledWith('age_stamp_failed', {
      level: 'warning',
      tags: { code: 'network' },
    });
  });
});
