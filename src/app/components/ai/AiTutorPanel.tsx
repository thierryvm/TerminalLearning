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
  isEncrypted as kmIsEncrypted,
  PROVIDER_KEY,
  type Provider,
} from '@/lib/ai/keyManager';
import { getModelLabel, resolveModel } from '@/lib/ai/providers';
import { PROVIDER_LABELS } from '@/lib/ai/providers/meta';
import type { TutorLang } from '@/lib/ai/systemPrompt';
import { useAiTutor } from '@/lib/ai/useAiTutor';
import type { UserRole } from '@/app/types/database';

import { AiConsentModal } from './AiConsentModal';
import { AiKeySetup } from './AiKeySetup';
import { AiPassphrasePrompt } from './AiPassphrasePrompt';
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
  /**
   * Current user RBAC role (THI-275 Stage B2). The caller (Layout / page that
   * renders this panel) is expected to resolve via `useUserRole()` and pass
   * the result here. When omitted (anonymous users, tests, or the future
   * landing-page tutor surface), the dispatcher in `getSystemPrompt` falls
   * back to the student prompt — the most restrictive and the safest
   * default. `pending_teacher` is explicitly mapped to student by the
   * dispatcher (defense-in-depth: pending teachers are not yet approved).
   */
  role?: UserRole | null;
  /**
   * When true, the floating trigger (FAB) is raised on coarse-pointer (touch)
   * viewports so it clears the terminal mobile key bar (THI-307) — that bar is
   * only rendered inside the lesson terminal, so pages without it omit this and
   * keep the FAB in the bottom-right corner.
   */
  liftAboveMobileBar?: boolean;
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

export function AiTutorPanel({ lang = 'fr', lessonContext, role, liftAboveMobileBar = false }: Props) {
  const [enabled] = useState<boolean>(() => readEnabled());
  const [open, setOpen] = useState(false);
  const [provider, setProviderState] = useState<Provider>(() => readStoredProvider());
  const [hasStoredKey, setHasStoredKey] = useState(false);
  // THI-263 — encrypted mode awareness:
  //   - `isEncryptedMode` reflects whether the current provider's stored key
  //     is in IndexedDB (AES-GCM/PBKDF2) rather than plain localStorage.
  //   - `passphrase` is the user-supplied secret for the current panel session,
  //     never persisted (no localStorage, no sessionStorage). It lives only in
  //     React state and is cleared when the panel closes, the provider changes,
  //     or the user forgets the key. Fixes A1 finding from llm-security-auditor
  //     audit 2026-05-23: AiTutorPanel previously omitted `passphrase` from the
  //     `useAiTutor` call, making encrypted-mode users hit `no_key` forever.
  const [isEncryptedMode, setIsEncryptedMode] = useState(false);
  const [passphrase, setPassphrase] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Single source of truth for "which model is actually used" — `resolveModel`
  // reads the Vercel env override `VITE_AI_TUTOR_<PROVIDER>_MODEL` first and
  // falls back to `DEFAULT_MODELS` only when the var is unset. Same helper is
  // used by `AiSettings` so the two surfaces never disagree.
  const model = useMemo(() => resolveModel(provider), [provider]);

  // THI-148 V1.0.1 — static, public-only platform overview injected as
  // <platform_context>. Same trust class as lessonContext (curriculum data,
  // never user input). Memoized once: curriculum is module-scope constant,
  // so the string is stable across renders.
  const platformContext = useMemo(() => buildPlatformContext(), []);

  const tutor = useAiTutor({
    provider,
    model,
    lang,
    lessonContext,
    platformContext,
    // THI-263 — passphrase only sent when needed. `undefined` for plain mode
    // keeps `keyManager.getKey()` on its happy path (localStorage read).
    passphrase: isEncryptedMode && passphrase.length > 0 ? passphrase : undefined,
    // THI-275 Stage B2 — RBAC role forwarded so `getSystemPrompt` can pick
    // the per-role prompt. `undefined` (anonymous, tests) falls back to the
    // student prompt — the safest default per the dispatcher contract.
    role: role ?? undefined,
  });

  const setProvider = useCallback((next: Provider) => {
    setProviderState(next);
    // THI-263 — switching provider invalidates the passphrase: the new
    // provider may use a different storage mode (plain vs encrypted), or
    // simply require its own secret. Drop the in-memory value rather than
    // leak it across keys.
    setPassphrase('');
    try {
      localStorage.setItem(PROVIDER_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  // Refresh `hasStoredKey` and `isEncryptedMode` whenever the provider
  // changes or the panel opens. Both flags drive the onboarding ↔ passphrase
  // prompt ↔ conversation switch in the render tree.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void Promise.all([kmHasKey(provider), kmIsEncrypted(provider)]).then(
      ([keyPresent, encrypted]) => {
        if (cancelled) return;
        setHasStoredKey(keyPresent);
        setIsEncryptedMode(encrypted);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [provider, open, enabled]);

  // THI-263 — closing the panel must drop the in-memory passphrase so that
  // a re-open forces a fresh unlock. We do this synchronously inside a
  // dedicated `closePanel` callback rather than via a useEffect that watches
  // `open` (that would trigger `react-hooks/set-state-in-effect`). Every
  // existing close path (X button, overlay click, Escape key) routes
  // through this callback below.
  const closePanel = useCallback(() => {
    setOpen(false);
    setPassphrase('');
  }, []);

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
        closePanel();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closePanel]);

  if (!enabled) return null;

  // Inside a lesson, raise the FAB above the bottom chrome: the terminal mobile
  // key bar (~57px, touch only) AND the persistent lesson nav footer (THI-313,
  // shown on every `<lg` viewport). The lift is keyed on the SAME breakpoint as
  // that footer (`lg:hidden`) — NOT on `pointer:coarse` — because the footer
  // also shows on narrow fine-pointer viewports (a resized desktop window),
  // where a coarse-only lift left the FAB overlapping the "Suivant" button.
  // +5rem (80px) clears the footer with a comfortable gap; reset to the corner
  // anchor at `lg` (no footer there). Real-iPhone PWA validation still pending.
  const fabBottomClass = liftAboveMobileBar
    ? 'bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5rem)] lg:bottom-[max(1rem,env(safe-area-inset-bottom))]'
    : 'bottom-[max(1rem,env(safe-area-inset-bottom))]';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ouvrir le tuteur IA (Ctrl+I)"
        // Hover tooltip (desktop) / long-press (touch) — keeps the icon-only FAB
        // discoverable without adding a text pill that would defeat the size
        // reduction. The aria-label remains the screen-reader source of truth.
        title="Tuteur IA — Ctrl+I"
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
        // Sizing (THI-308 UX 2026 recalibration — supersedes THI-152 brick 5/9):
        // mobile 44 px (h-11, exact Apple HIG floor — comfort kept via the
        // 100% opacity + ring + shadow rather than extra surface area),
        // desktop 48 px (md:h-12, Material 3 "default" FAB). The previous
        // 56 px (md:h-14) read as visually heavy on desktop density per
        // @thierry empirical feedback (2026-05-31) — 48 px keeps the FAB a
        // clear primary anchor without dominating the corner.
        //
        // The asymmetry is intentional: a FAB is the only desktop button
        // exempt from the "≤40 px compact density" rule because it is the
        // primary visual anchor of the surface.
        //
        // Always-100% opacity so the Sparkles is unambiguously visible on
        // every background; active:scale-95 gives a tactile press feedback
        // on touch devices that the previous hover-only affordance could
        // not deliver on Safari iOS (no hover state).
        className={`fixed ${fabBottomClass} right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--github-accent)] text-white shadow-lg ring-1 ring-black/30 transition active:scale-95 hover:bg-[var(--github-accent-hover)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0 md:h-12 md:w-12`}
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
            onClick={closePanel}
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
                // close button off-screen. The `title` attribute exposes
                // the full string on hover (desktop) / long-press (mobile)
                // so the model name stays discoverable when truncated.
                className="min-w-0 truncate text-sm font-semibold text-[var(--github-text-primary)]"
                title={`Tuteur IA — ${PROVIDER_LABELS[provider]} • ${getModelLabel(model)}`}
              >
                Tuteur IA — {PROVIDER_LABELS[provider]} • {getModelLabel(model)}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                <RateLimitBadge
                  remaining={tutor.remainingRequests}
                  onReset={tutor.resetRateCounter}
                />
                <button
                  type="button"
                  onClick={closePanel}
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
                onSaved={() => {
                  setHasStoredKey(true);
                  // THI-263 — recheck encryption status: AiKeySetup may have
                  // saved an encrypted record, in which case the next render
                  // should route to AiPassphrasePrompt rather than straight
                  // to the conversation (the panel still has no passphrase
                  // in memory at this point).
                  void kmIsEncrypted(provider).then(setIsEncryptedMode);
                }}
              />
            ) : isEncryptedMode && passphrase.length === 0 ? (
              <AiPassphrasePrompt onSubmit={setPassphrase} />
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
                      // THI-263 — `forgetKey` removes both plain and encrypted
                      // entries, so reset the matching UI state too.
                      setIsEncryptedMode(false);
                      setPassphrase('');
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
