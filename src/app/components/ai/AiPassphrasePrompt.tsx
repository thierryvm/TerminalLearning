/**
 * AiPassphrasePrompt — THI-263 fix (Option A, lazy passphrase prompt).
 *
 * Affiché à la place de la zone conversation quand l'utilisateur a stocké
 * une clé chiffrée (mode encrypted opt-in, IndexedDB + AES-GCM/PBKDF2-210k)
 * mais n'a pas encore fourni sa passphrase pour la session courante.
 *
 * State design :
 *  - La passphrase n'est jamais persistée — uniquement state local React du
 *    parent `AiTutorPanel`, perdue au unmount du drawer.
 *  - L'`AiTutorPanel` détecte `isEncrypted(provider)` au mount/changement
 *    de provider et bascule ici si oui ET pas de passphrase saisie.
 *
 * Threat model (cf. PrivacyPolicy §ai-processing) :
 *  - Protège contre XSS (la clé ne sort jamais d'IndexedDB chiffrée)
 *  - Protège contre inspection DevTools (PBKDF2 inutilisable sans passphrase)
 *  - NE protège PAS contre extension navigateur avec permission `<all_urls>`
 *    (peut lire IndexedDB déchiffré au runtime) — vraie défense = Web Worker
 *    isolation V1.5 (THI-114 backlog).
 */
import { useId, useState, type FormEvent } from 'react';

interface Props {
  /** Called when the user submits a non-empty passphrase. */
  onSubmit: (passphrase: string) => void;
}

export function AiPassphrasePrompt({ onSubmit }: Props) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = passphrase.trim();
    if (trimmed.length === 0) {
      setError('Passphrase requise pour déverrouiller la clé chiffrée.');
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 text-sm text-[var(--github-text-primary)]">
      <div className="rounded border border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] p-3">
        <h3 className="text-sm font-semibold text-[var(--github-text-primary)]">
          🔒 Clé chiffrée — passphrase requise
        </h3>
        <p className="mt-2 text-xs text-[var(--github-text-secondary)]">
          Tu as configuré ta clé API en mode chiffré (AES-GCM + PBKDF2). Tape
          ta passphrase pour la déverrouiller pour cette session. Elle n'est
          jamais stockée — uniquement gardée en mémoire tant que le tuteur
          reste ouvert.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-xs font-medium text-[var(--github-text-primary)]">
          Passphrase
        </label>
        <input
          id={inputId}
          type="password"
          autoComplete="current-password"
          spellCheck={false}
          value={passphrase}
          onChange={(e) => {
            setPassphrase(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="rounded border border-[var(--github-border-primary)] bg-[var(--github-bg-primary)] px-3 py-2 text-sm text-[var(--github-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          autoFocus
        />
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-[var(--github-red)]"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={passphrase.length === 0}
          className="mt-1 rounded bg-[var(--github-accent)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--github-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          Déverrouiller
        </button>
      </form>

      <p className="text-xs text-[var(--github-text-tertiary)]">
        Si la passphrase est incorrecte, le tuteur retournera une erreur
        <code className="mx-1 rounded bg-[var(--github-bg-secondary)] px-1">no_key</code>
        au premier envoi. Re-clique « Oublier ma clé » pour reconfigurer.
      </p>
    </div>
  );
}
