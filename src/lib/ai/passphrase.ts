/**
 * Passphrase validation — single source of truth for AiKeySetup (save) and
 * AiPassphrasePrompt (unlock).
 *
 * THI-271 (Sourcery review PR #289): both sides MUST validate the passphrase
 * byte-for-byte. Leading/trailing whitespace is a valid part of a secret —
 * neither save nor unlock trims. Centralising the rules here prevents the
 * trim() asymmetry bug from re-appearing on future edits.
 *
 * Cross-references:
 *  - AiKeySetup uses `validatePassphrase(raw, 'save')` + `validatePassphraseConfirm`
 *  - AiPassphrasePrompt uses `validatePassphrase(raw, 'unlock')`
 *  - keyManager.saveKey / getKey deliberately pass the raw passphrase
 *    string to PBKDF2 — any caller that trims here would break round-trip
 */

/** Minimum length enforced when SAVING a new key (not when unlocking — the
 *  actual decryption attempt is the final unlock validator). */
export const MIN_PASSPHRASE = 8;

export type PassphraseMode = 'save' | 'unlock';

export interface PassphraseValidation {
  ok: boolean;
  error: string | null;
}

/**
 * Validates a passphrase byte-for-byte (no trim).
 *
 * - `save` mode: enforces MIN_PASSPHRASE length so the user does not lock
 *   themselves out behind a 1-char passphrase that PBKDF2 cannot meaningfully
 *   stretch. Whitespace counts toward the length.
 * - `unlock` mode: enforces only non-empty. We never tell the user "wrong
 *   passphrase" client-side — the cryptographic decryption is what fails.
 *   That avoids a timing oracle and keeps the UX message generic.
 */
export function validatePassphrase(
  raw: string,
  mode: PassphraseMode,
): PassphraseValidation {
  if (raw.length === 0) {
    return {
      ok: false,
      error:
        mode === 'unlock'
          ? 'Passphrase requise pour déverrouiller la clé chiffrée.'
          : 'Passphrase requise.',
    };
  }
  if (mode === 'save' && raw.length < MIN_PASSPHRASE) {
    return {
      ok: false,
      error: `La passphrase doit faire au moins ${MIN_PASSPHRASE} caractères.`,
    };
  }
  return { ok: true, error: null };
}

/**
 * Validates the passphrase confirmation field shown only on the save flow.
 * Returns `ok: true` while the confirm field is empty (partial input — do not
 * yell at the user before they finish typing). Errors only once the user has
 * typed something AND it diverges from the main passphrase.
 *
 * Save-side only — there is no confirm field on unlock.
 */
export function validatePassphraseConfirm(
  passphrase: string,
  confirm: string,
): PassphraseValidation {
  if (confirm.length === 0) {
    return { ok: true, error: null };
  }
  if (passphrase !== confirm) {
    return { ok: false, error: 'Les deux passphrases ne correspondent pas.' };
  }
  return { ok: true, error: null };
}
