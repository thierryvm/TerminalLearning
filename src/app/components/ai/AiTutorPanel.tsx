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
import { Sparkles } from 'lucide-react';

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
        className="fixed bottom-4 right-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--github-accent)] text-white shadow-lg transition hover:bg-[var(--github-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Sparkles size={24} strokeWidth={2} aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* Overlay z-[60] so it covers all other fixed bottom-right widgets
              (scroll-to-top z-50, trigger button z-40). Modal etiquette: while
              the panel is open, nothing else competes for the corner. */}
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-tutor-title"
            id="ai-tutor-panel"
            // Mobile: full-screen drawer with safe-area padding (iOS notch + home bar).
            // Desktop (md+): floating bottom-right card.
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            className="fixed inset-0 z-[70] flex flex-col bg-[var(--github-bg-primary)] md:bottom-4 md:right-4 md:top-auto md:left-auto md:h-[600px] md:w-[420px] md:rounded-lg md:border md:border-[var(--github-border-primary)] md:shadow-xl md:!p-0"
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
      // Horizontal scroll on tight viewports (≤320px) so the four pills never wrap
      // or clip; the inner row keeps a consistent flex layout.
      className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-[var(--github-border-primary)] px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {providers.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          // min-h-9 keeps tap targets ≥36px on mobile (closer to WCAG 44×44 in
          // combination with the row padding).
          className={`min-h-9 rounded px-3 py-1 text-xs ${
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
  const [checked, setChecked] = useState(false);
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
      <p className="text-xs text-[var(--github-text-secondary)]">
        Pas sûr·e du provider à choisir ?{' '}
        <a
          href="https://github.com/thierryvm/TerminalLearning/blob/main/docs/guides/ai-tutor-quickstart.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--github-accent)] underline hover:text-[var(--github-accent-hover)]"
        >
          Lire le guide démarrage (5 min) →
        </a>
      </p>
      <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] p-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--github-accent)]"
          aria-describedby="ai-consent-summary"
        />
        <span id="ai-consent-summary" className="text-[var(--github-text-primary)]">
          <strong>J'ai lu et compris</strong> les trois points ci-dessus.
        </span>
      </label>
      <button
        type="button"
        onClick={onAccept}
        disabled={!checked}
        className="mt-2 self-start rounded-md bg-[var(--github-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--github-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Accepter et utiliser le tuteur IA
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

  // Short novice-friendly description per provider, surfaced above the key
  // input so the learner understands what they are about to use. Verbose
  // comparison lives in docs/guides/ai-tutor-quickstart.md (linked from the
  // ConsentBlock).
  const providerHint = useMemo(() => {
    switch (provider) {
      case 'openrouter':
        return '🔄 Hub multi-providers — modèles :free gratuits (Llama 3.3 70B par défaut, GPT-OSS 20B…). Recommandé pour débuter.';
      case 'anthropic':
        return '🧠 Claude (Anthropic) — raisonnement haute qualité, excellent en code. Crédit Anthropic requis.';
      case 'openai':
        return '⚠️ OpenAI direct refuse les requêtes navigateur (CORS). Préfère OpenRouter pour accéder à GPT-4o-mini & co.';
      case 'gemini':
        return '✨ Gemini (Google) — quota gratuit généreux (Gemini 2.0 Flash). Crédit Google AI Studio requis.';
    }
  }, [provider]);

  // OpenAI does not allow direct browser fetches without a backend proxy
  // (CORS policy on api.openai.com). Confirmed during live validation
  // 2026-05-04 against http://localhost:5173. The other three providers
  // (OpenRouter, Anthropic with opt-in header, Gemini) are all fine.
  const openaiNeedsProxy = provider === 'openai';

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
      <p className="rounded-md bg-[var(--github-bg-secondary)] p-2 text-xs text-[var(--github-text-secondary)]">
        {providerHint}
      </p>
      <p>
        Colle ta clé <strong>{PROVIDER_LABELS[provider]}</strong> ci-dessous.
        Préfixe attendu : <code className="rounded bg-[var(--github-bg-tertiary)] px-1 py-0.5 text-xs">{expectedPrefix}</code>
      </p>
      {openaiNeedsProxy && (
        <div
          role="alert"
          className="rounded border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-300"
        >
          ⚠️ <strong>OpenAI</strong> bloque les appels directs depuis le
          navigateur (politique CORS officielle d'OpenAI, pour décourager le
          BYOK client-side). Ta clé sera enregistrée mais l'envoi échouera
          avec une erreur réseau. <strong>Solution V1</strong> : utilise{' '}
          <strong>OpenRouter</strong> à la place — il propose les mêmes
          modèles GPT (`openai/gpt-4o-mini`, `openai/gpt-oss-20b:free`, etc.)
          sans cette limitation. Le proxy OpenAI direct arrivera en V2.
        </div>
      )}
      <input
        type="password"
        name="ai-tutor-api-key"
        id="ai-tutor-api-key"
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
