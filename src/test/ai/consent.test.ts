/**
 * Tests for the consent storage contract — THI-112 Phase A commit 2.
 *
 * Closes the M3-AI finding from the llm-security-auditor 9.0/10 re-baseline
 * (10 May 2026 PM): the previous storage was a bare `'true'` literal, no
 * timestamp / expiry / version. The new contract persists a versioned
 * JSON record `{ version, acceptedAt, expiresAt }` and the helper
 * `readConsentRecord` returns `null` whenever the record is missing,
 * malformed, on a different version, or expired — forcing the modal to
 * re-prompt instead of letting consent stick around forever.
 *
 * These tests exercise the helpers directly so a regression on the
 * persistence shape is caught even when the UI layer is refactored.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONSENT_KEY,
  CONSENT_TTL_MS,
  CONSENT_VERSION,
  readConsentRecord,
} from '@/lib/ai/useAiTutor';

const NOW = Date.UTC(2026, 4, 10, 12, 0, 0);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('readConsentRecord — empty / malformed', () => {
  it('returns null when nothing is stored', () => {
    expect(readConsentRecord()).toBeNull();
  });

  it('returns null when the JSON is malformed', () => {
    localStorage.setItem(CONSENT_KEY, '{not valid');
    expect(readConsentRecord()).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: CONSENT_VERSION, acceptedAt: NOW }),
    );
    expect(readConsentRecord()).toBeNull();
  });
});

describe('readConsentRecord — legacy migration', () => {
  it('migrates the legacy `"true"` literal to a fresh JSON record', () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    const record = readConsentRecord();
    expect(record).not.toBeNull();
    expect(record!.version).toBe(CONSENT_VERSION);
    expect(record!.acceptedAt).toBe(NOW);
    expect(record!.expiresAt).toBe(NOW + CONSENT_TTL_MS);
    // The migration is persisted — the next read returns the same record
    // without re-running the migration branch.
    const persisted = JSON.parse(localStorage.getItem(CONSENT_KEY)!);
    expect(persisted.version).toBe(CONSENT_VERSION);
    expect(persisted.acceptedAt).toBe(NOW);
  });
});

describe('readConsentRecord — version mismatch', () => {
  it('returns null when the stored record carries an older version', () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        version: CONSENT_VERSION - 1,
        acceptedAt: NOW,
        expiresAt: NOW + CONSENT_TTL_MS,
      }),
    );
    expect(readConsentRecord()).toBeNull();
  });
});

describe('readConsentRecord — expiry window', () => {
  it('returns the record while still within the TTL window', () => {
    const justBeforeExpiry = NOW - 10;
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        version: CONSENT_VERSION,
        acceptedAt: justBeforeExpiry - CONSENT_TTL_MS,
        expiresAt: justBeforeExpiry + 1000,
      }),
    );
    const record = readConsentRecord();
    expect(record).not.toBeNull();
    expect(record!.expiresAt).toBe(justBeforeExpiry + 1000);
  });

  it('returns null once the TTL has lapsed', () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        version: CONSENT_VERSION,
        acceptedAt: NOW - CONSENT_TTL_MS - 1000,
        expiresAt: NOW - 1000,
      }),
    );
    expect(readConsentRecord()).toBeNull();
  });

  it('CONSENT_TTL_MS is 365 days', () => {
    expect(CONSENT_TTL_MS).toBe(365 * 24 * 60 * 60 * 1000);
  });
});
