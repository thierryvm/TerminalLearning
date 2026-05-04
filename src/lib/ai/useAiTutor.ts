/**
 * AI tutor hook — THI-111 step 5/8.
 *
 * Single React state machine the panel binds to. Owns:
 *  - the conversation transcript (in-memory only, lost on unmount)
 *  - input pre-filter via `sanitizeUserInput`
 *  - per-chunk output filter via `sanitizeModelChunk`
 *  - assembled-message leak guard via `detectKeyLeak` (THI-111 W3 contract)
 *  - soft client-side rate limiter (30 / 5 min, persisted in sessionStorage)
 *  - frustration heuristic (plan §10.4): two consecutive socratic answers
 *    (start with `?` or contain ≥ 2 `?` in the first 200 chars) flag
 *    `shouldOfferDirectMode` so the UI can prompt to switch to direct mode
 *  - abort + forgetKey + consent gates
 *
 * The hook does NOT touch Sentry directly — that is a separate concern
 * handled at the panel boundary so the hook stays unit-testable without a
 * Sentry mock in every test.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import { detectKeyLeak, sanitizeModelChunk, sanitizeUserInput } from './sanitizer';
import {
  forgetKey as kmForgetKey,
  getKey as kmGetKey,
  type Provider,
} from './keyManager';
import { chat as providerChat, ChatError } from './providers';
import type { ChatMessage } from './providers/types';
import { getSystemPrompt, type TutorLang, type TutorMode } from './systemPrompt';

export const RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
export const CONSENT_KEY = 'ai_consent_v1';
export const RATE_STORAGE_KEY = 'ai_rate_v1';
export const MODE_STORAGE_KEY = 'ai_tutor_mode';

const FRUSTRATION_PEEK_CHARS = 200;
const FRUSTRATION_QUESTION_THRESHOLD = 2;

export interface LessonContext {
  moduleSlug: string;
  lessonSlug: string;
  env: 'linux' | 'macos' | 'windows';
  goal: string;
}

export interface UseAiTutorOpts {
  provider: Provider;
  model: string;
  lang: TutorLang;
  /** Defaults to 'socratic' on first call; persisted in sessionStorage thereafter. */
  initialMode?: TutorMode;
  lessonContext?: LessonContext;
  /** Required only when the stored key is encrypted. */
  passphrase?: string;
}

export type UseAiTutorErrorCode =
  | 'no_consent'
  | 'no_key'
  | 'rate_limited_local'
  | 'invalid_input'
  | 'invalid_key'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'model_unavailable'
  | 'network'
  | 'server_error'
  | 'unknown';

export interface UseAiTutorState {
  messages: ChatMessage[];
  isStreaming: boolean;
  remainingRequests: number;
  error: { code: UseAiTutorErrorCode; safeMessage: string } | null;
  consentGiven: boolean;
  /** True when the assembled answer matched a key pattern and was scrubbed. */
  leakWarning: boolean;
  /** True after two consecutive socratic answers — UI offers a direct-mode toast. */
  shouldOfferDirectMode: boolean;
  mode: TutorMode;
  send: (text: string) => Promise<void>;
  abort: () => void;
  forgetKey: () => Promise<void>;
  giveConsent: () => void;
  revokeConsent: () => void;
  setMode: (mode: TutorMode) => void;
  dismissDirectModeOffer: () => void;
}

interface RateState {
  count: number;
  windowStart: number;
}

function readRate(): RateState {
  try {
    const raw = sessionStorage.getItem(RATE_STORAGE_KEY);
    if (!raw) return { count: 0, windowStart: Date.now() };
    const parsed = JSON.parse(raw) as Partial<RateState>;
    if (typeof parsed.count !== 'number' || typeof parsed.windowStart !== 'number') {
      return { count: 0, windowStart: Date.now() };
    }
    return { count: parsed.count, windowStart: parsed.windowStart };
  } catch {
    return { count: 0, windowStart: Date.now() };
  }
}

function writeRate(state: RateState): void {
  try {
    sessionStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage may be disabled — best effort */
  }
}

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

function readMode(fallback: TutorMode): TutorMode {
  try {
    const v = sessionStorage.getItem(MODE_STORAGE_KEY);
    if (v === 'direct' || v === 'socratic') return v;
  } catch {
    /* ignore */
  }
  return fallback;
}

// TRUST BOUNDARY: lessonContext fields are internal curriculum data only —
// never user input. They are sourced from `src/app/data/curriculum.ts` and
// passed by `LessonPage` as a prop. If a future feature ever lets the user
// influence `goal` or `moduleSlug` (custom lessons, user-named modules),
// these fields MUST be passed through `escapeDelimiters` first to prevent
// indirect prompt injection via the <lesson_context> block.
// (security-auditor M2 finding, 2026-05-04.)
function formatLessonContext(ctx: LessonContext): string {
  return `<lesson_context>\nModule: ${ctx.moduleSlug} / Lesson: ${ctx.lessonSlug} / Env: ${ctx.env}\nGoal: ${ctx.goal}\n</lesson_context>\n\n`;
}

function buildUserMessage(sanitized: string, ctx: LessonContext | undefined): string {
  const prefix = ctx ? formatLessonContext(ctx) : '';
  return `${prefix}<user_question>\n${sanitized}\n</user_question>`;
}

function isFrustratingAnswer(text: string): boolean {
  const head = text.trimStart().slice(0, FRUSTRATION_PEEK_CHARS);
  if (head.startsWith('?')) return true;
  let qCount = 0;
  for (const ch of head) if (ch === '?') qCount++;
  return qCount >= FRUSTRATION_QUESTION_THRESHOLD;
}

function chatErrorToCode(err: unknown): UseAiTutorErrorCode {
  if (err instanceof ChatError) {
    if (err.code === 'aborted') return 'unknown'; // surfaced as silent reset
    return err.code as UseAiTutorErrorCode;
  }
  return 'unknown';
}

function safeMessageFor(code: UseAiTutorErrorCode): string {
  switch (code) {
    case 'no_consent':
      return 'Consent required before using the tutor.';
    case 'no_key':
      return 'No API key configured for the selected provider.';
    case 'rate_limited_local':
      return 'Too many requests in this session. Please wait a moment.';
    case 'invalid_input':
      return 'Question rejected by the input filter.';
    case 'invalid_key':
      return 'The provider rejected the API key.';
    case 'rate_limited':
      return 'The provider is rate-limiting requests. Try again shortly.';
    case 'quota_exceeded':
      // Actionable hint: since Feb 2025 OpenRouter requires a $10 credit
      // top-up to unlock the `:free` model tiers (anti-abuse). Surface that
      // explicitly so the learner knows what to do, instead of dead-ending
      // on a generic "quota exhausted".
      return 'Quota épuisé sur cette clé. Pour OpenRouter `:free`, vérifie qu\'au moins 1 $ de crédit est ajouté sur openrouter.ai/credits (politique anti-abus). Sinon, essaie Anthropic ou Gemini.';
    case 'model_unavailable':
      return 'The selected model is unavailable.';
    case 'network':
      return 'Network error reaching the provider.';
    case 'server_error':
      return 'The provider returned a server error.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function useAiTutor(opts: UseAiTutorOpts): UseAiTutorState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<UseAiTutorState['error']>(null);
  const [consentGiven, setConsentGiven] = useState<boolean>(() => readConsent());
  const [rate, setRate] = useState<RateState>(() => readRate());
  const [mode, setModeState] = useState<TutorMode>(() => readMode(opts.initialMode ?? 'socratic'));
  const [leakWarning, setLeakWarning] = useState(false);
  const [shouldOfferDirectMode, setShouldOfferDirectMode] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Destructure once per render so each callback only depends on the
  // primitives it actually reads, not the whole opts object identity.
  const { provider, model, lang, lessonContext, passphrase } = opts;

  // Snapshot view of remaining requests for badges. The window-expiry check
  // lives in `send()` because reading `Date.now()` here would make the memo
  // impure (react-hooks/purity). The badge therefore lags behind a window
  // rollover until the next send fires; acceptable trade-off for V1.
  const remainingRequests = useMemo(
    () => Math.max(0, RATE_LIMIT_MAX - rate.count),
    [rate.count],
  );

  const giveConsent = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, 'true');
    } catch {
      /* ignore */
    }
    setConsentGiven(true);
  }, []);

  const revokeConsent = useCallback(() => {
    try {
      localStorage.removeItem(CONSENT_KEY);
    } catch {
      /* ignore */
    }
    setConsentGiven(false);
  }, []);

  const setMode = useCallback((next: TutorMode) => {
    try {
      sessionStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setModeState(next);
    setShouldOfferDirectMode(false);
  }, []);

  const dismissDirectModeOffer = useCallback(() => {
    setShouldOfferDirectMode(false);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const forgetKey = useCallback(async () => {
    await kmForgetKey(provider);
  }, [provider]);

  const send = useCallback(
    async (text: string): Promise<void> => {
      if (!consentGiven) {
        setError({ code: 'no_consent', safeMessage: safeMessageFor('no_consent') });
        return;
      }

      // Refresh rate window if expired.
      const now = Date.now();
      const currentRate =
        now - rate.windowStart > RATE_LIMIT_WINDOW_MS ? { count: 0, windowStart: now } : rate;
      if (currentRate.count >= RATE_LIMIT_MAX) {
        setError({
          code: 'rate_limited_local',
          safeMessage: safeMessageFor('rate_limited_local'),
        });
        return;
      }

      const checked = sanitizeUserInput(text);
      if (!checked.ok) {
        setError({ code: 'invalid_input', safeMessage: safeMessageFor('invalid_input') });
        return;
      }

      // Pre-fetch the key BEFORE committing messages so a missing key leaves
      // the conversation untouched (no orphan user bubble in the UI).
      let apiKey: string | null;
      try {
        apiKey = await kmGetKey(provider, passphrase);
      } catch {
        apiKey = null;
      }
      if (!apiKey) {
        setError({ code: 'no_key', safeMessage: safeMessageFor('no_key') });
        return;
      }

      setError(null);
      setLeakWarning(false);

      const prevMessages = messages;
      const userMsg: ChatMessage = {
        role: 'user',
        content: buildUserMessage(checked.clean, lessonContext),
      };
      const conversationBeforeAssistant = [...prevMessages, userMsg];
      const assistantPlaceholder: ChatMessage = { role: 'assistant', content: '' };
      setMessages([...conversationBeforeAssistant, assistantPlaceholder]);

      const nextRate: RateState = {
        count: currentRate.count + 1,
        windowStart: currentRate.windowStart,
      };
      setRate(nextRate);
      writeRate(nextRate);

      const ac = new AbortController();
      abortRef.current = ac;
      setIsStreaming(true);

      let assembled = '';
      try {
        const stream = await providerChat(provider, {
          apiKey,
          model,
          systemPrompt: getSystemPrompt({ lang, mode }),
          messages: conversationBeforeAssistant,
          signal: ac.signal,
        });

        for await (const rawChunk of stream) {
          if (ac.signal.aborted) break;
          const safe = sanitizeModelChunk(rawChunk);
          assembled += safe;
          setMessages([
            ...conversationBeforeAssistant,
            { role: 'assistant', content: assembled },
          ]);
        }

        if (detectKeyLeak(assembled)) {
          // Scrub once more on the full text — sanitizeModelChunk is best-effort
          // per chunk, the assembled scrub catches keys split across chunks.
          // (Refers to prompt-guardrail-auditor W3 contract pinned in
          //  src/test/ai/sanitizer.test.ts.)
          const scrubbed = sanitizeModelChunk(assembled);
          setMessages([
            ...conversationBeforeAssistant,
            { role: 'assistant', content: scrubbed },
          ]);
          setLeakWarning(true);
        }

        // Frustration heuristic: look at the last two assistant answers.
        if (mode === 'socratic') {
          const finalAssembled = detectKeyLeak(assembled)
            ? sanitizeModelChunk(assembled)
            : assembled;
          const priorAssistantTexts = prevMessages
            .filter((m) => m.role === 'assistant')
            .map((m) => m.content);
          const allAssistantTexts = [...priorAssistantTexts, finalAssembled];
          const lastTwo = allAssistantTexts.slice(-2);
          if (lastTwo.length === 2 && lastTwo.every((t) => isFrustratingAnswer(t))) {
            setShouldOfferDirectMode(true);
          }
        }
      } catch (err) {
        // On any failure (including abort), roll back the conversation to its
        // pre-send state so the user's input is not stranded next to an empty
        // assistant bubble.
        setMessages(prevMessages);
        // Refund the soft rate-limit slot since the request did not actually
        // consume a successful turn — without this the badge would degrade
        // (e.g. 28/30) on consecutive provider rate_limited / invalid_key
        // errors that the user can fix and retry.
        setRate(currentRate);
        writeRate(currentRate);
        if (!(err instanceof ChatError && err.code === 'aborted')) {
          const code = chatErrorToCode(err);
          setError({ code, safeMessage: safeMessageFor(code) });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [consentGiven, messages, mode, rate, provider, model, lang, lessonContext, passphrase],
  );

  // (Mode change resets shouldOfferDirectMode inside `setMode` itself —
  // no separate effect needed.)

  return {
    messages,
    isStreaming,
    remainingRequests,
    error,
    consentGiven,
    leakWarning,
    shouldOfferDirectMode,
    mode,
    send,
    abort,
    forgetKey,
    giveConsent,
    revokeConsent,
    setMode,
    dismissDirectModeOffer,
  };
}
