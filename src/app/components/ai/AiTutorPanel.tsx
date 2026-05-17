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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { buildPlatformContext } from '@/app/data/platformContext';
import {
  forgetKey as kmForgetKey,
  hasKey as kmHasKey,
  PROVIDER_KEY,
  type Provider,
} from '@/lib/ai/keyManager';
import { DEFAULT_MODELS } from '@/lib/ai/providers';
import { PROVIDER_LABELS } from '@/lib/ai/providers/meta';
import type { TutorLang } from '@/lib/ai/systemPrompt';
import { useAiTutor } from '@/lib/ai/useAiTutor';

import { AiConsentModal } from './AiConsentModal';
import { AiKeySetup } from './AiKeySetup';
import { MessageInput } from './parts/MessageInput';
import { MessageList } from './parts/MessageList';
import { RateLimitBadge } from './parts/RateLimitBadge';

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
    const v = localStorage.getItem(PROVIDER_KEY);
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

  // Allow each provider's default model to be overridden at deploy time via
  // a Vercel env var, e.g. `VITE_AI_TUTOR_OPENROUTER_MODEL=meta-llama/llama-
  // 3.3-70b-instruct` to escape the `:free` rate-limit pool. Falls back to
  // DEFAULT_MODELS when the var is unset. The full picker UI lands in
  // THI-112 V1.5 — this is the V1 escape hatch.
  const envOverride = useMemo<string | undefined>(() => {
    switch (provider) {
      case 'openrouter':
        return import.meta.env.VITE_AI_TUTOR_OPENROUTER_MODEL as string | undefined;
      case 'anthropic':
        return import.meta.env.VITE_AI_TUTOR_ANTHROPIC_MODEL as string | undefined;
      case 'openai':
        return import.meta.env.VITE_AI_TUTOR_OPENAI_MODEL as string | undefined;
      case 'gemini':
        return import.meta.env.VITE_AI_TUTOR_GEMINI_MODEL as string | undefined;
    }
  }, [provider]);

  // THI-148 V1.0.1 — static, public-only platform overview injected as
  // <platform_context>. Same trust class as lessonContext (curriculum data,
  // never user input). Memoized once: curriculum is module-scope constant,
  // so the string is stable across renders.
  const platformContext = useMemo(() => buildPlatformContext(), []);

  const tutor = useAiTutor({
    provider,
    model: envOverride && envOverride.length > 0 ? envOverride : DEFAULT_MODELS[provider],
    lang,
    lessonContext,
    platformContext,
  });

  const setProvider = useCallback((next: Provider) => {
    setProviderState(next);
    try {
      localStorage.setItem(PROVIDER_KEY, next);
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
        // bottom uses max(1rem, env(safe-area-inset-bottom)) so the FAB sits
        // above the iPhone home indicator in PWA standalone mode (THI-147).
        // The pattern matches MarkdownPage and PrivacyPolicy already-fixed FABs.
        //
        // Position (THI-152 brick 3/9): right-6 (24px) anchors the FAB in the
        // bottom-right corner cleanly. The legacy right-20 (80px) was a
        // V1 (THI-111) precaution against overlapping the Landing
        // scroll-to-top FAB, but the AI tutor is only rendered on
        // Dashboard / LessonPage / CommandReference — none of which carry
        // a scroll-to-top FAB. So the precaution was dead weight that
        // pushed the icon awkwardly off the corner.
        //
        // Sizing (THI-152 brick 5/9 Option D — empirical recalibration):
        // mobile 44 px (h-11, exact Apple HIG floor — comfort kept via the
        // 100% opacity + ring + shadow rather than extra surface area),
        // desktop 56 px (md:h-14, Material/Apple FAB primary standard
        // empirically validated by @thierry on preview as well-proportioned
        // for desktop density).
        //
        // The asymmetry is intentional: a FAB is the only desktop button
        // exempt from the "≤40 px compact density" rule because it is the
        // primary visual anchor of the surface. The mobile 48 → 44 revert
        // came from @thierry empirical feedback that 12% of a 393 px
        // viewport felt visually heavy.
        //
        // Always-100% opacity so the Sparkles is unambiguously visible on
        // every background; active:scale-95 gives a tactile press feedback
        // on touch devices that the previous hover-only affordance could
        // not deliver on Safari iOS (no hover state).
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--github-accent)] text-white shadow-lg ring-1 ring-black/30 transition active:scale-95 hover:bg-[var(--github-accent-hover)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0 md:h-14 md:w-14"
      >
        <Sparkles size={20} strokeWidth={2} aria-hidden="true" />
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
            // THI-152 brick 6/9: `overflow-x-hidden max-w-full` is a
            // belt-and-suspenders guard against any descendant that
            // would otherwise widen the drawer past the viewport on
            // mobile (a common WebKit pattern when long inline content
            // appears inside flex children). Pairs with `break-words`
            // on bubbles and `min-w-0 truncate` on the header h2.
            className="fixed inset-0 z-[70] flex max-w-full flex-col overflow-x-hidden bg-[var(--github-bg-primary)] md:bottom-4 md:right-4 md:top-auto md:left-auto md:h-[600px] md:w-[420px] md:rounded-lg md:border md:border-[var(--github-border-primary)] md:shadow-xl md:!p-0"
          >
            <header className="flex items-center justify-between gap-2 border-b border-[var(--github-border-primary)] px-3 py-2">
              <h2
                id="ai-tutor-title"
                // THI-152 brick 6/9: `min-w-0 truncate` lets the title
                // shrink and clip on narrow viewports (iPhone SE) when
                // the provider label is long, instead of pushing the
                // close button off-screen.
                className="min-w-0 truncate text-sm font-semibold text-[var(--github-text-primary)]"
              >
                Tuteur IA — {PROVIDER_LABELS[provider]}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                <RateLimitBadge
                  remaining={tutor.remainingRequests}
                  onReset={tutor.resetRateCounter}
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fermer le tuteur IA"
                  // THI-152 brick 5/9: 44×44 mobile (Apple HIG floor) / 36
                  // desktop (compact density preserved). The previous
                  // `p-1` collapsed the hit area to ~22 px, sub-floor.
                  className="flex min-h-11 min-w-11 items-center justify-center rounded text-[var(--github-text-secondary)] hover:bg-[var(--github-bg-secondary)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0 md:min-h-9 md:min-w-9"
                >
                  ✕
                </button>
              </div>
            </header>

            <ProviderPicker value={provider} onChange={setProvider} />

            {!tutor.consentGiven ? (
              <AiConsentModal onAccept={tutor.giveConsent} />
            ) : !hasStoredKey ? (
              <AiKeySetup
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
          // THI-152 brick 5/9: 44 px mobile (Apple HIG floor) / 36 px
          // desktop (compact density preserved via the md: variant).
          // The previous unconditional min-h-9 was sub-44 on mobile.
          className={`min-h-11 rounded px-3 py-1 text-xs md:min-h-9 ${
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

function ErrorBanner({ code, message }: { code: string; message: string }) {
  return (
    <div
      role="alert"
      className="border-b border-[var(--github-red)]/30 bg-[var(--github-red)]/10 px-3 py-2 text-xs text-[var(--github-red)]"
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
