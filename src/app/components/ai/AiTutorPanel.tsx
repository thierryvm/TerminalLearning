/**
 * AiTutorPanel — THI-111 step 6/8.
 *
 * Floating drawer that hosts the BYOK AI tutor (cf. ADR-002 + ADR-005).
 *
 * Lifecycle:
 *  - render returns `null` when `VITE_AI_TUTOR_ENABLED !== 'true'` (plan §10.1
 *    feature flag — kill-switch via Vercel env without a revert PR)
 *  - opens via the bottom-right trigger or `Ctrl+I` / `Cmd+I` (plan §10.3)
 *  - first-time UX: consent gate → key entry → conversation
 *
 * Defense-in-depth:
 *  - `useAiTutor` runs sanitizeUserInput / sanitizeModelChunk / detectKeyLeak
 *  - `MessageList` renders via react-markdown WITHOUT rehype-raw (HTML stays
 *    inert) and without anchor href → links cannot exfiltrate
 *  - the key input uses `type="password"` + `autocomplete="off"` so browser
 *    form-fillers / extensions don't see it
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import {
  detectProvider,
  forgetKey as kmForgetKey,
  hasKey as kmHasKey,
  saveKey as kmSaveKey,
  type Provider,
} from '@/lib/ai/keyManager';
import { DEFAULT_MODELS } from '@/lib/ai/providers';
import type { TutorLang } from '@/lib/ai/systemPrompt';
import { useAiTutor } from '@/lib/ai/useAiTutor';

import { MessageInput } from './parts/MessageInput';
import { MessageList } from './parts/MessageList';
import { RateLimitBadge } from './parts/RateLimitBadge';

const PROVIDER_STORAGE_KEY = 'ai_tutor_provider';
const PROVIDER_LABELS: Readonly<Record<Provider, string>> = {
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
};

interface Props {
  lang?: TutorLang;
  lessonContext?: {
    moduleSlug: string;
    lessonSlug: string;
    env: 'linux' | 'macos' | 'windows';
    goal: string;
  };
}

function readEnabled(): boolean {
  return import.meta.env.VITE_AI_TUTOR_ENABLED === 'true';
}

function readStoredProvider(): Provider {
  try {
    const v = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (v === 'openrouter' || v === 'anthropic' || v === 'openai' || v === 'gemini') return v;
  } catch {
    /* ignore */
  }
  return 'openrouter';
}

export function AiTutorPanel({ lang = 'fr', lessonContext }: Props) {
  const [enabled] = useState<boolean>(() => readEnabled());
  const [open, setOpen] = useState(false);
  const [provider, setProviderState] = useState<Provider>(() => readStoredProvider());
  const [hasStoredKey, setHasStoredKey] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const tutor = useAiTutor({
    provider,
    model: DEFAULT_MODELS[provider],
    lang,
    lessonContext,
  });

  const setProvider = useCallback((next: Provider) => {
    setProviderState(next);
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  // Refresh `hasStoredKey` whenever the provider changes or the panel opens,
  // so the conversation/onboarding switch reflects current key storage.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void kmHasKey(provider).then((v) => {
      if (!cancelled) setHasStoredKey(v);
    });
    return () => {
      cancelled = true;
    };
  }, [provider, open, enabled]);

  // Ctrl+I / Cmd+I global shortcut. Skip when the focus is on a form field
  // outside the panel itself, so typing 'i' in another input is unaffected.
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'i' && e.key !== 'I') return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      const inField =
        !!target &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
        !dialogRef.current?.contains(target);
      if (inField) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  // Escape closes; restore focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!enabled) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ouvrir le tuteur IA (Ctrl+I)"
        aria-expanded={open}
        aria-controls="ai-tutor-panel"
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--github-accent)] text-white shadow-lg transition hover:bg-[var(--github-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2 L13.5 7 L19 8 L15 12 L16 18 L12 15 L8 18 L9 12 L5 8 L10.5 7 Z" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-tutor-title"
            id="ai-tutor-panel"
            className="fixed inset-0 z-50 flex flex-col bg-[var(--github-bg-primary)] md:bottom-4 md:right-4 md:top-auto md:left-auto md:h-[600px] md:w-[420px] md:rounded-lg md:border md:border-[var(--github-border-primary)] md:shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-[var(--github-border-primary)] px-3 py-2">
              <h2
                id="ai-tutor-title"
                className="text-sm font-semibold text-[var(--github-text-primary)]"
              >
                Tuteur IA — {PROVIDER_LABELS[provider]}
              </h2>
              <div className="flex items-center gap-2">
                <RateLimitBadge remaining={tutor.remainingRequests} />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fermer le tuteur IA"
                  className="rounded p-1 text-[var(--github-text-secondary)] hover:bg-[var(--github-bg-secondary)] focus-visible:outline-2"
                >
                  ✕
                </button>
              </div>
            </header>

            <ProviderPicker value={provider} onChange={setProvider} />

            {!tutor.consentGiven ? (
              <ConsentBlock onAccept={tutor.giveConsent} />
            ) : !hasStoredKey ? (
              <KeyEntryBlock
                provider={provider}
                onSaved={() => setHasStoredKey(true)}
              />
            ) : (
              <>
                {tutor.error && <ErrorBanner code={tutor.error.code} message={tutor.error.safeMessage} />}
                {tutor.leakWarning && <LeakWarningBanner />}
                {tutor.shouldOfferDirectMode && (
                  <DirectModeOffer
                    onAccept={() => tutor.setMode('direct')}
                    onDismiss={tutor.dismissDirectModeOffer}
                  />
                )}
                <MessageList messages={tutor.messages} isStreaming={tutor.isStreaming} />
                <MessageInput onSend={tutor.send} disabled={tutor.isStreaming} />
                <footer className="flex items-center justify-between border-t border-[var(--github-border-primary)] px-3 py-2 text-xs text-[var(--github-text-secondary)]">
                  <span>
                    Mode : {tutor.mode === 'socratic' ? 'socratique' : 'direct'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void tutor.forgetKey();
                      setHasStoredKey(false);
                    }}
                    className="underline hover:text-[var(--github-text-primary)]"
                  >
                    Oublier ma clé
                  </button>
                </footer>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

interface PickerProps {
  value: Provider;
  onChange: (next: Provider) => void;
}

function ProviderPicker({ value, onChange }: PickerProps) {
  const providers: Provider[] = ['openrouter', 'anthropic', 'openai', 'gemini'];
  return (
    <div
      role="radiogroup"
      aria-label="Provider IA"
      className="flex gap-1 border-b border-[var(--github-border-primary)] px-3 py-2"
    >
      {providers.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={`rounded px-2 py-1 text-xs ${
            value === p
              ? 'bg-[var(--github-accent)] text-white'
              : 'bg-[var(--github-bg-secondary)] text-[var(--github-text-secondary)] hover:bg-[var(--github-bg-tertiary)]'
          }`}
        >
          {PROVIDER_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

interface ConsentProps {
  onAccept: () => void;
}

function ConsentBlock({ onAccept }: ConsentProps) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm text-[var(--github-text-primary)]">
      <p>
        Avant d'utiliser le tuteur IA, j'ai besoin que tu confirmes deux points
        importants :
      </p>
      <ul className="list-disc space-y-1 pl-5 text-[var(--github-text-secondary)]">
        <li>
          Ta clé API reste stockée sur <strong>ce navigateur uniquement</strong>.
          Aucun serveur Terminal Learning ne la voit.
        </li>
        <li>
          Tes questions sont envoyées <strong>directement au provider choisi</strong>{' '}
          (OpenRouter, Anthropic, OpenAI ou Gemini). Ton historique terminal,
          ton profil et tes données de leçon ne sont pas partagés.
        </li>
        <li>
          Tu peux supprimer ta clé à tout moment via le bouton « Oublier ma clé ».
        </li>
      </ul>
      <button
        type="button"
        onClick={onAccept}
        className="mt-2 self-start rounded-md bg-[var(--github-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--github-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        J'ai lu et j'accepte
      </button>
    </div>
  );
}

interface KeyEntryProps {
  provider: Provider;
  onSaved: () => void;
}

function KeyEntryBlock({ provider, onSaved }: KeyEntryProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const expectedPrefix = useMemo(() => {
    switch (provider) {
      case 'openrouter':
        return 'sk-or-v1-…';
      case 'anthropic':
        return 'sk-ant-…';
      case 'openai':
        return 'sk-…';
      case 'gemini':
        return 'AIza…';
    }
  }, [provider]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    setError(null);
    setSaving(true);
    try {
      await kmSaveKey(provider, trimmed);
      setValue('');
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
      className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm text-[var(--github-text-primary)]"
    >
      <p>
        Colle ta clé <strong>{PROVIDER_LABELS[provider]}</strong> ci-dessous.
        Préfixe attendu : <code className="rounded bg-[var(--github-bg-tertiary)] px-1 py-0.5 text-xs">{expectedPrefix}</code>
      </p>
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        aria-label="Clé API"
        placeholder={expectedPrefix}
        className="w-full rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] p-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--github-accent)]"
      />
      {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-md bg-[var(--github-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--github-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
      >
        {saving ? 'Sauvegarde…' : 'Enregistrer'}
      </button>
      <p className="text-xs text-[var(--github-text-secondary)]">
        ⚠️ Mode V1 : la clé est stockée en clair dans le localStorage. Le mode
        chiffré (passphrase + AES-GCM) sera activé en THI-112.
      </p>
    </form>
  );
}

function ErrorBanner({ code, message }: { code: string; message: string }) {
  return (
    <div
      role="alert"
      className="border-b border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
    >
      <strong className="font-semibold">{code}</strong> — {message}
    </div>
  );
}

function LeakWarningBanner() {
  return (
    <div
      role="alert"
      className="border-b border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300"
    >
      ⚠️ Le modèle a tenté d'inclure une clé API dans sa réponse. Elle a été
      retirée. Pense à révoquer toute clé que tu lui aurais montrée.
    </div>
  );
}

function DirectModeOffer({
  onAccept,
  onDismiss,
}: {
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-center justify-between border-b border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] px-3 py-2 text-xs text-[var(--github-text-primary)]"
    >
      <span>Tu préfères que je te donne directement la réponse ?</span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onAccept}
          className="rounded bg-[var(--github-accent)] px-2 py-0.5 text-white"
        >
          Oui, juste cette fois
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-2 py-0.5 text-[var(--github-text-secondary)] underline"
        >
          Continuer en socratique
        </button>
      </div>
    </div>
  );
}

// Re-export so consumers can call forgetKey from the panel context if needed.
export { kmForgetKey };
