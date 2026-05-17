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
  clearAiSessionData,
  getKey,
  saveKey,
  type Provider,
} from '@/lib/ai/keyManager';

const DB_NAME = 'ai_keys_encrypted';
const PROVIDERS: readonly Provider[] = ['openrouter', 'anthropic', 'openai', 'gemini'];

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
  localStorage.setItem('ai_key_openrouter', 'sk-or-v1-userA');
  localStorage.setItem('ai_key_anthropic', 'sk-ant-userA');
  localStorage.setItem('ai_key_openai', 'sk-userA');
  localStorage.setItem('ai_key_gemini', 'AIzaUserA');
}

function seedPrefs(): void {
  localStorage.setItem('ai_tutor_provider', 'anthropic');
  localStorage.setItem('ai_consent_v1', JSON.stringify({ accepted: true, version: 1 }));
  sessionStorage.setItem('ai_rate_v1', JSON.stringify({ count: 7, windowStart: Date.now() }));
  sessionStorage.setItem('ai_tutor_mode', 'socratic');
}

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  await resetIdb();
});

describe('THI-207 clearAiSessionData — 5 items + IDB preserved by default', () => {
  it('flushes the 4 plain API keys from localStorage', async () => {
    seedPlainKeys();
    expect(localStorage.getItem('ai_key_openrouter')).toBe('sk-or-v1-userA');

    await clearAiSessionData();

    for (const p of PROVIDERS) {
      expect(localStorage.getItem(`ai_key_${p}`)).toBeNull();
    }
  });

  it('flushes ai_tutor_provider and ai_consent_v1 from localStorage (RGPD critical)', async () => {
    seedPrefs();
    expect(localStorage.getItem('ai_tutor_provider')).toBe('anthropic');
    expect(localStorage.getItem('ai_consent_v1')).not.toBeNull();

    await clearAiSessionData();

    expect(localStorage.getItem('ai_tutor_provider')).toBeNull();
    expect(localStorage.getItem('ai_consent_v1')).toBeNull();
  });

  it('flushes ai_rate_v1 and ai_tutor_mode from sessionStorage', async () => {
    seedPrefs();
    expect(sessionStorage.getItem('ai_rate_v1')).not.toBeNull();
    expect(sessionStorage.getItem('ai_tutor_mode')).toBe('socratic');

    await clearAiSessionData();

    expect(sessionStorage.getItem('ai_rate_v1')).toBeNull();
    expect(sessionStorage.getItem('ai_tutor_mode')).toBeNull();
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
    expect(localStorage.getItem('ai_key_anthropic')).toBeNull();
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
    localStorage.setItem('ai_consent_v1', JSON.stringify({ accepted: true, version: 1, userId: 'A' }));
    expect(localStorage.getItem('ai_consent_v1')).not.toBeNull();

    // User A signs out → THI-207 flushes consent.
    await clearAiSessionData();

    // User B opens the app on the same device: consent record is absent,
    // so the AI Consent modal will be shown again (RGPD per-user property).
    expect(localStorage.getItem('ai_consent_v1')).toBeNull();
  });
});
