/**
 * THI-207 — AI session data isolation at signout (defense-in-depth + RGPD).
 *
 * Companion test to THI-186's progressContextIsolation.test.ts. Covers the AI
 * Tutor surface: plain keys, last selected provider, RGPD consent record, rate
 * limit counter, tutor mode (socratic/direct). Encrypted IndexedDB keys are
 * preserved by design (passphrase-gated, opt-in via `includeEncrypted: true`
 * reserved for the explicit "Forget all AI data on this device" UX — THI-208).
 *
 * RGPD critical: `ai_consent_v1` lives in localStorage and survives signout by
 * default. Without this fix, User B logging in on the same device inherits
 * User A's consent without seeing the consent modal — explicit violation of
 * "consent per-user, per-session, opt-in informed".
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CONSENT_KEY,
  clearAiSessionData,
  getKey,
  LS_PREFIX,
  MODE_KEY,
  PROVIDER_KEY,
  PROVIDERS,
  RATE_KEY,
  saveKey,
} from '@/lib/ai/keyManager';

const DB_NAME = 'ai_keys_encrypted';

function resetIdb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    const done = () => resolve();
    req.onsuccess = done;
    req.onerror = done;
    req.onblocked = done;
  });
}

function seedPlainKeys(): void {
  // Cover every provider in the canonical list so a future addition
  // automatically lands in the seeding loop and assertions.
  for (const p of PROVIDERS) {
    localStorage.setItem(`${LS_PREFIX}${p}`, `seed-${p}-userA`);
  }
}

function seedPrefs(): void {
  localStorage.setItem(PROVIDER_KEY, 'anthropic');
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, version: 1 }));
  sessionStorage.setItem(RATE_KEY, JSON.stringify({ count: 7, windowStart: Date.now() }));
  sessionStorage.setItem(MODE_KEY, 'socratic');
}

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  await resetIdb();
});

describe('THI-207 clearAiSessionData — 5 items + IDB preserved by default', () => {
  it('flushes every plain API key from localStorage', async () => {
    seedPlainKeys();
    expect(localStorage.getItem(`${LS_PREFIX}openrouter`)).toBe('seed-openrouter-userA');

    await clearAiSessionData();

    for (const p of PROVIDERS) {
      expect(localStorage.getItem(`${LS_PREFIX}${p}`)).toBeNull();
    }
  });

  it('flushes the last provider and the consent record from localStorage (RGPD critical)', async () => {
    seedPrefs();
    expect(localStorage.getItem(PROVIDER_KEY)).toBe('anthropic');
    expect(localStorage.getItem(CONSENT_KEY)).not.toBeNull();

    await clearAiSessionData();

    expect(localStorage.getItem(PROVIDER_KEY)).toBeNull();
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });

  it('flushes the rate counter and the tutor mode from sessionStorage', async () => {
    seedPrefs();
    expect(sessionStorage.getItem(RATE_KEY)).not.toBeNull();
    expect(sessionStorage.getItem(MODE_KEY)).toBe('socratic');

    await clearAiSessionData();

    expect(sessionStorage.getItem(RATE_KEY)).toBeNull();
    expect(sessionStorage.getItem(MODE_KEY)).toBeNull();
  });

  it('preserves the encrypted IndexedDB key when called without opts', async () => {
    await saveKey('anthropic', 'sk-ant-encrypted-userA', {
      encrypt: true,
      passphrase: 'pwd-userA',
    });
    seedPlainKeys();
    seedPrefs();

    await clearAiSessionData();

    // Plain side fully wiped.
    expect(localStorage.getItem(`${LS_PREFIX}anthropic`)).toBeNull();
    // Encrypted side still readable with the right passphrase.
    expect(await getKey('anthropic', 'pwd-userA')).toBe('sk-ant-encrypted-userA');
  });
});

describe('THI-207 clearAiSessionData — includeEncrypted (THI-208 future use)', () => {
  it('also wipes the encrypted IndexedDB entries when includeEncrypted is true', async () => {
    await saveKey('anthropic', 'sk-ant-encrypted', {
      encrypt: true,
      passphrase: 'pwd',
    });
    await saveKey('openrouter', 'sk-or-v1-encrypted', {
      encrypt: true,
      passphrase: 'pwd',
    });
    expect(await getKey('anthropic', 'pwd')).toBe('sk-ant-encrypted');

    await clearAiSessionData({ includeEncrypted: true });

    expect(await getKey('anthropic', 'pwd')).toBeNull();
    expect(await getKey('openrouter', 'pwd')).toBeNull();
  });
});

describe('THI-207 clearAiSessionData — idempotence and edges', () => {
  it('does not throw on an empty state (idempotent)', async () => {
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    await expect(clearAiSessionData()).resolves.toBeUndefined();
    await expect(clearAiSessionData({ includeEncrypted: true })).resolves.toBeUndefined();
  });

  it('reproduces the RGPD per-user pattern (consent must re-appear for next user)', async () => {
    // User A accepts consent → app records it in localStorage.
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, version: 1, userId: 'A' }));
    expect(localStorage.getItem(CONSENT_KEY)).not.toBeNull();

    // User A signs out → THI-207 flushes consent.
    await clearAiSessionData();

    // User B opens the app on the same device: consent record is absent,
    // so the AI Consent modal will be shown again (RGPD per-user property).
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });
});
