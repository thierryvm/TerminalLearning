/**
 * THI-340 — AuthCallback stamps the age confirmation on EVERY post-OAuth path.
 *
 * Regression pinned here (security-auditor M1, 23 September 2026): when a
 * return path was stored (e.g. a student opening `/app/join?code=…` from a
 * teacher's invite link), AuthCallback redirected straight away and never
 * reached the stamping code, so accounts created through the age screen were
 * left with `age_confirmed_at = NULL` — the Art. 5(2) proof went missing for
 * exactly the population most likely to be minors.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

const mockIs = vi.fn();
const mockEq = vi.fn(() => ({ is: mockIs }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));
const mockRpc = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...(args as [])),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const authState = { session: { user: { id: 'user-1' } } as unknown, initialized: true };
vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => authState,
}));

import { AuthCallback } from '../app/components/auth/AuthCallback';
import { setReturnTo } from '../lib/auth/returnToStorage';
import { markAgeVerified } from '../lib/auth/ageGate';

/** Last element — the project targets ES2020, which has no Array.prototype.at. */
const last = <T,>(xs: T[]): T | undefined => xs[xs.length - 1];

/** Renders the callback and exposes where it navigated to. */
function renderCallback() {
  const landed: string[] = [];
  function Spy() {
    const loc = useLocation();
    landed.push(loc.pathname + loc.search);
    return null;
  }
  render(
    <MemoryRouter initialEntries={['/auth/callback']}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Spy />} />
      </Routes>
    </MemoryRouter>,
  );
  return landed;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.clearAllMocks();
  mockIs.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ data: 'student', error: null });
  authState.session = { user: { id: 'user-1' } };
  authState.initialized = true;
});

describe('AuthCallback — age confirmation stamp (THI-340)', () => {
  it('stamps the profile when a return path is stored (invite-link path)', async () => {
    markAgeVerified();
    setReturnTo('/app/join?code=a4368184d202');

    const landed = renderCallback();

    await waitFor(() => expect(last(landed)).toBe('/app/join?code=a4368184d202'));
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
    expect(mockIs).toHaveBeenCalledWith('age_confirmed_at', null);
  });

  it('stamps before navigating to the return path, not after', async () => {
    markAgeVerified();
    setReturnTo('/app/join?code=a4368184d202');
    let stampResolved = false;
    mockIs.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => { stampResolved = true; resolve({ error: null }); }, 20)),
    );

    const landed = renderCallback();

    await waitFor(() => expect(last(landed)).toBe('/app/join?code=a4368184d202'));
    expect(stampResolved).toBe(true);
  });

  it('still stamps on the role-based path (no return path)', async () => {
    markAgeVerified();

    const landed = renderCallback();

    await waitFor(() => expect(last(landed)).toBe('/app'));
    expect(mockIs).toHaveBeenCalledWith('age_confirmed_at', null);
  });

  it('does not stamp when the age screen was not passed in this tab', async () => {
    setReturnTo('/app/join?code=a4368184d202');

    const landed = renderCallback();

    await waitFor(() => expect(last(landed)).toBe('/app/join?code=a4368184d202'));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('keeps the return path even when the stamp fails', async () => {
    markAgeVerified();
    setReturnTo('/app/join?code=a4368184d202');
    mockIs.mockResolvedValue({ error: { code: '42501', message: 'denied' } });

    const landed = renderCallback();

    await waitFor(() => expect(last(landed)).toBe('/app/join?code=a4368184d202'));
  });

  it('sends a visitor with no session back to the landing page without stamping', async () => {
    markAgeVerified();
    authState.session = null;

    const landed = renderCallback();

    await waitFor(() => expect(last(landed)).toBe('/'));
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
