/**
 * AiKeySetup — THI-112 Phase A commit 1.
 *
 * Standalone, reusable key-entry component. Two consumers:
 *  - `AiTutorPanel` (in-panel first-time UX): replaces the previous inline
 *    `KeyEntryBlock` so panel + settings share one source of truth.
 *  - `AiSettings` (THI-112 Phase B): edit-key flow under `/app/settings`.
 *
 * V1 keeps the BYOK guarantees from THI-110 + ADR-005:
 *  - validates the prefix client-side via `detectProvider` so a wrong key
 *    is rejected before it ever leaves the form
 *  - persists via `keyManager.saveKey` — plain by default, encrypted opt-in
 *    (AES-GCM + PBKDF2 ≥ 210k iter via Web Crypto, IndexedDB-backed)
 *  - never sends the key to a Terminal Learning server (no server in V1)
 *  - links the "AI processing" privacy section so the learner can read
 *    what data flows through which provider before pasting a key
 *
 * V1 deliberately omits the live "test the key" call:
 *  - cross-provider CORS surfaces (OpenAI blocks browser fetches outright)
 *  - rate-limited probe endpoints would burn the learner's quota
 *  - structural prefix validation already catches the most common mistake
 *  - the very next message in the panel exercises the key for real
 *  Live testing is parked for THI-114 (V1.5 model picker + curated probe).
 */
import {
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link } from 'react-router';

import {
  detectProvider,
  saveKey as kmSaveKey,
  type Provider,
} from '@/lib/ai/keyManager';

const PROVIDER_LABELS: Readonly<Record<Provider, string>> = {
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
};

const PROVIDER_PREFIX_HINT: Readonly<Record<Provider, string>> = {
  openrouter: 'sk-or-v1-…',
  anthropic: 'sk-ant-…',
  openai: 'sk-…',
  gemini: 'AIza…',
};

const PROVIDER_QUICK_HELP: Readonly<Record<Provider, string>> = {
  openrouter:
    '🔄 Hub multi-providers — modèles `:free` gratuits (Llama 3.3 70B par défaut, GPT-OSS 20B…). Recommandé pour débuter.',
  anthropic:
    '🧠 Claude (Anthropic) — raisonnement haute qualité, excellent en code. Crédit Anthropic requis.',
  openai:
    '⚠️ OpenAI direct refuse les requêtes navigateur (CORS). Préfère OpenRouter pour accéder à GPT-4o-mini & co.',
  gemini:
    '✨ Gemini (Google) — quota gratuit généreux (Gemini 2.0 Flash). Crédit Google AI Studio requis.',
};

export interface AiKeySetupProps {
  provider: Provider;
  /** Called after the key has been saved successfully via `keyManager`. */
  onSaved: () => void;
  /** Optional: CSS class overrides for embedding contexts (panel vs settings page). */
  className?: string;
}

const MIN_PASSPHRASE = 8;

export function AiKeySetup({ provider, onSaved, className }: AiKeySetupProps) {
  const [value, setValue] = useState('');
  const [encryptOpt, setEncryptOpt] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const keyInputId = useId();
  const passphraseId = useId();
  const passphraseConfirmId = useId();

  const expectedPrefix = PROVIDER_PREFIX_HINT[provider];
  const providerHint = PROVIDER_QUICK_HELP[provider];
  const openaiNeedsProxy = provider === 'openai';

  // Reset transient encrypt-mode state when the user switches off the toggle so
  // a previously typed passphrase is not silently held in memory while the
  // checkbox says "plain mode". Defence-in-depth on the in-memory surface.
  const handleEncryptChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setEncryptOpt(next);
    if (!next) {
      setPassphrase('');
      setPassphraseConfirm('');
    }
  };

  const passphraseProblem = useMemo<string | null>(() => {
    if (!encryptOpt) return null;
    if (passphrase.length === 0) return null; // not yet typed → no error
    if (passphrase.length < MIN_PASSPHRASE) {
      return `La passphrase doit faire au moins ${MIN_PASSPHRASE} caractères.`;
    }
    if (passphraseConfirm.length > 0 && passphrase !== passphraseConfirm) {
      return 'Les deux passphrases ne correspondent pas.';
    }
    return null;
  }, [encryptOpt, passphrase, passphraseConfirm]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setError('La clé est vide.');
      return;
    }
    const detected = detectProvider(trimmed);
    if (detected !== provider) {
      setError(
        `Cette clé ne correspond pas au provider ${PROVIDER_LABELS[provider]} (préfixe attendu : ${expectedPrefix}).`,
      );
      return;
    }
    if (encryptOpt) {
      if (passphrase.length < MIN_PASSPHRASE) {
        setError(`La passphrase doit faire au moins ${MIN_PASSPHRASE} caractères.`);
        return;
      }
      if (passphrase !== passphraseConfirm) {
        setError('Les deux passphrases ne correspondent pas.');
        return;
      }
    }

    setSaving(true);
    try {
      await kmSaveKey(provider, trimmed, encryptOpt ? { encrypt: true, passphrase } : {});
      // Wipe the typed secret material from React state so it does not linger
      // in memory waiting for GC. The persisted copy lives in keyManager.
      setValue('');
      setPassphrase('');
      setPassphraseConfirm('');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={
        className ??
        'flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm text-[var(--github-text-primary)]'
      }
      aria-label={`Configuration de la clé ${PROVIDER_LABELS[provider]}`}
    >
      <p className="rounded-md bg-[var(--github-bg-secondary)] p-2 text-xs text-[var(--github-text-secondary)]">
        {providerHint}
      </p>

      <p>
        Colle ta clé <strong>{PROVIDER_LABELS[provider]}</strong> ci-dessous.
        Préfixe attendu :{' '}
        <code className="rounded bg-[var(--github-bg-tertiary)] px-1 py-0.5 text-xs">
          {expectedPrefix}
        </code>
      </p>

      {openaiNeedsProxy && (
        <div
          role="alert"
          className="rounded border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-300"
        >
          ⚠️ <strong>OpenAI</strong> bloque les appels directs depuis le
          navigateur (politique CORS officielle d'OpenAI). Ta clé sera
          enregistrée mais l'envoi échouera avec une erreur réseau.{' '}
          <strong>Solution V1</strong> : utilise <strong>OpenRouter</strong> à
          la place — il propose les mêmes modèles GPT (
          <code>openai/gpt-4o-mini</code>, <code>openai/gpt-oss-20b:free</code>
          …) sans cette limitation. Le proxy OpenAI direct arrivera en V2.
        </div>
      )}

      <label htmlFor={keyInputId} className="sr-only">
        Clé API {PROVIDER_LABELS[provider]}
      </label>
      <input
        id={keyInputId}
        name="ai-tutor-api-key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        placeholder={expectedPrefix}
        className="w-full rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] p-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0 md:text-sm"
      />

      <fieldset className="flex flex-col gap-2 rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] p-3">
        <label className="flex cursor-pointer items-start gap-2 text-xs text-[var(--github-text-primary)]">
          <input
            type="checkbox"
            checked={encryptOpt}
            onChange={handleEncryptChange}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--github-accent)]"
          />
          <span>
            <strong>Chiffrer cette clé avec une passphrase</strong>{' '}
            <span className="text-[var(--github-text-secondary)]">
              (recommandé pour les clés payantes — Anthropic / OpenAI / Gemini)
            </span>
          </span>
        </label>
        {encryptOpt && (
          <div className="flex flex-col gap-2 pl-6">
            <label htmlFor={passphraseId} className="text-xs text-[var(--github-text-secondary)]">
              Passphrase (≥ {MIN_PASSPHRASE} caractères)
            </label>
            <input
              id={passphraseId}
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={passphrase}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassphrase(e.target.value)}
              className="w-full rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg-tertiary)] p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            />
            <label
              htmlFor={passphraseConfirmId}
              className="text-xs text-[var(--github-text-secondary)]"
            >
              Confirme la passphrase
            </label>
            <input
              id={passphraseConfirmId}
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={passphraseConfirm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassphraseConfirm(e.target.value)}
              className="w-full rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg-tertiary)] p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            />
            <p className="text-xs text-[var(--github-text-secondary)]">
              ⚠️ La passphrase ne peut <strong>pas</strong> être récupérée. Si tu
              la perds, tu devras supprimer la clé chiffrée et en saisir une
              nouvelle.
            </p>
            {passphraseProblem && (
              <p className="text-xs text-yellow-300" role="status">
                {passphraseProblem}
              </p>
            )}
          </div>
        )}
      </fieldset>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-md bg-[var(--github-accent)] px-4 py-2 text-sm font-medium text-white outline-none hover:bg-[var(--github-accent-hover)] focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0 disabled:opacity-50"
      >
        {saving ? 'Sauvegarde…' : 'Enregistrer'}
      </button>

      <p className="text-xs text-[var(--github-text-secondary)]">
        Ta clé reste sur ce navigateur uniquement. Aucun serveur Terminal
        Learning ne la voit. Les questions sont envoyées <strong>directement</strong>
        {' '}au provider choisi. Plus de détails dans la{' '}
        <Link
          to="/privacy#ai-processing"
          className="text-[var(--github-accent)] underline hover:text-[var(--github-accent-hover)]"
        >
          section IA de la politique de confidentialité
        </Link>
        .
      </p>
    </form>
  );
}
