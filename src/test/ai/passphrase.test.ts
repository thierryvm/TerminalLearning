/**
 * Tests for `src/lib/ai/passphrase.ts` — single source of truth shared by
 * `AiKeySetup` (save) and `AiPassphrasePrompt` (unlock).
 *
 * THI-271 (Sourcery review PR #289): preventing trim() asymmetry from
 * recurring. These tests pin the rules so any future drift on either side
 * (save trims, unlock doesn't, or vice versa) trips the suite.
 */
import { describe, expect, it } from 'vitest';

import {
  MIN_PASSPHRASE,
  validatePassphrase,
  validatePassphraseConfirm,
} from '@/lib/ai/passphrase';

describe('validatePassphrase — save mode', () => {
  it('rejects an empty passphrase', () => {
    expect(validatePassphrase('', 'save')).toEqual({
      ok: false,
      error: 'Passphrase requise.',
    });
  });

  it('rejects a passphrase shorter than MIN_PASSPHRASE', () => {
    const seven = 'a'.repeat(MIN_PASSPHRASE - 1);
    expect(validatePassphrase(seven, 'save')).toMatchObject({
      ok: false,
    });
  });

  it('accepts a passphrase exactly at MIN_PASSPHRASE length', () => {
    const eight = 'a'.repeat(MIN_PASSPHRASE);
    expect(validatePassphrase(eight, 'save')).toEqual({
      ok: true,
      error: null,
    });
  });

  it('accepts a passphrase well above MIN_PASSPHRASE', () => {
    expect(validatePassphrase('correct horse battery staple', 'save')).toEqual({
      ok: true,
      error: null,
    });
  });

  it('counts leading/trailing whitespace toward the length (no trim)', () => {
    // "    " (4 spaces) is below MIN_PASSPHRASE, "        " (8 spaces) is at
    // the limit. The rule does not trim before counting — whitespace is a
    // valid character. This pins the THI-271 contract.
    expect(validatePassphrase('    ', 'save')).toMatchObject({ ok: false });
    expect(validatePassphrase('        ', 'save')).toEqual({
      ok: true,
      error: null,
    });
  });
});

describe('validatePassphrase — unlock mode', () => {
  it('rejects an empty passphrase with the unlock-specific message', () => {
    expect(validatePassphrase('', 'unlock')).toEqual({
      ok: false,
      error: 'Passphrase requise pour déverrouiller la clé chiffrée.',
    });
  });

  it('accepts a single-character passphrase (the cryptographic decryption is the real validator)', () => {
    expect(validatePassphrase('a', 'unlock')).toEqual({
      ok: true,
      error: null,
    });
  });

  it('preserves leading/trailing whitespace (THI-271 contract)', () => {
    // A user who saved "  secret  " must be able to unlock with the exact
    // same byte sequence. If unlock validation trimmed, this would fail.
    expect(validatePassphrase('  secret  ', 'unlock')).toEqual({
      ok: true,
      error: null,
    });
  });

  it('does NOT enforce MIN_PASSPHRASE on unlock', () => {
    // Even though save would reject 'a' (length 1 < 8), unlock must accept
    // it — otherwise we'd lock out users who somehow have a sub-MIN_PASSPHRASE
    // legacy key. The decryption attempt will fail downstream if the
    // passphrase is wrong.
    expect(validatePassphrase('a', 'unlock').ok).toBe(true);
  });
});

describe('validatePassphraseConfirm', () => {
  it('returns ok when the confirm field is still empty (partial input)', () => {
    expect(validatePassphraseConfirm('secret123', '')).toEqual({
      ok: true,
      error: null,
    });
  });

  it('returns error when the confirm field diverges', () => {
    expect(validatePassphraseConfirm('secret123', 'wrong')).toEqual({
      ok: false,
      error: 'Les deux passphrases ne correspondent pas.',
    });
  });

  it('returns ok when the two values match exactly (including whitespace)', () => {
    expect(validatePassphraseConfirm('  secret  ', '  secret  ')).toEqual({
      ok: true,
      error: null,
    });
  });

  it('treats whitespace as significant (no trim on either side)', () => {
    // '  secret  ' vs 'secret' is a mismatch — pins the no-trim contract.
    expect(validatePassphraseConfirm('  secret  ', 'secret')).toMatchObject({
      ok: false,
    });
  });
});
