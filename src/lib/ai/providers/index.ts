/**
 * Provider dispatcher — THI-111 step 3-4/8.
 *
 * Single entry point used by `useAiTutor`. Selects the per-provider `chat`
 * implementation based on the chosen provider id. Each module is responsible
 * for its own request shape, SSE parsing, and error mapping; the dispatcher
 * is intentionally a thin switch with no business logic of its own.
 */

import { ChatError, type ChatParams, type ChatStream, type Provider } from './types';
import { chat as openrouterChat } from './openrouter';
import { chat as anthropicChat } from './anthropic';
import { chat as openaiChat } from './openai';
import { chat as geminiChat } from './gemini';

export { OPENROUTER_DEFAULT_MODEL, OPENROUTER_URL } from './openrouter';
export { ANTHROPIC_DEFAULT_MODEL, ANTHROPIC_URL } from './anthropic';
export { OPENAI_DEFAULT_MODEL, OPENAI_URL } from './openai';
export { GEMINI_DEFAULT_MODEL } from './gemini';
export type { Provider, ChatParams, ChatStream, ChatMessage, ChatErrorCode } from './types';
export { ChatError } from './types';

/**
 * Default model per provider — exported as a single map for the UI picker.
 * Each provider module owns its own constant so renaming a default does not
 * have to touch this file.
 */
import { OPENROUTER_DEFAULT_MODEL } from './openrouter';
import { ANTHROPIC_DEFAULT_MODEL } from './anthropic';
import { OPENAI_DEFAULT_MODEL } from './openai';
import { GEMINI_DEFAULT_MODEL } from './gemini';

export const DEFAULT_MODELS: Readonly<Record<Provider, string>> = {
  openrouter: OPENROUTER_DEFAULT_MODEL,
  anthropic: ANTHROPIC_DEFAULT_MODEL,
  openai: OPENAI_DEFAULT_MODEL,
  gemini: GEMINI_DEFAULT_MODEL,
};

/**
 * Single source of truth for "which model is actually used" — reads the
 * deploy-time Vercel env override `VITE_AI_TUTOR_<PROVIDER>_MODEL` first,
 * falls back to `DEFAULT_MODELS` only when the env var is unset/empty.
 *
 * Settings page and Drawer panel must use this helper to avoid the bug
 * where Settings showed the hardcoded fallback (e.g. Llama 3.3 70B free)
 * while the Drawer used the env override (e.g. Sonnet 4.6 paid).
 */
export function resolveModel(provider: Provider): string {
  const envKeys: Readonly<Record<Provider, string>> = {
    openrouter: 'VITE_AI_TUTOR_OPENROUTER_MODEL',
    anthropic: 'VITE_AI_TUTOR_ANTHROPIC_MODEL',
    openai: 'VITE_AI_TUTOR_OPENAI_MODEL',
    gemini: 'VITE_AI_TUTOR_GEMINI_MODEL',
  };
  const override = import.meta.env[envKeys[provider]] as string | undefined;
  return override && override.length > 0 ? override : DEFAULT_MODELS[provider];
}

/**
 * Normalises a provider model id (e.g. `anthropic/claude-sonnet-4-6`) to a
 * short, human-friendly label (e.g. `Sonnet 4.6`) for display in the Drawer
 * header. Falls back to the raw id when the pattern is unknown — keeps the
 * UI honest rather than hiding mysterious models behind a generic label.
 *
 * Transparency principle: every authenticated or anonymous user must see
 * which model is actually answering their prompts (BYOK consent, EU AI Act,
 * RGPD, CNIL Éducation). No role gating.
 */
/**
 * Per-pattern label entries. Order matters — more specific patterns MUST
 * come before generic ones (e.g. `gpt-5-mini` before `gpt-5`, otherwise
 * the mini variant is swallowed by the generic GPT-5 entry).
 *
 * Patterns are matched against a normalised id where `digit-digit` is
 * rewritten to `digit.digit` — this lets a single pattern like `sonnet-4.6`
 * catch both `anthropic/claude-sonnet-4.6` (OpenRouter naming) and
 * `anthropic/claude-sonnet-4-6` (Anthropic direct + test fixtures).
 */
const MODEL_LABELS: ReadonlyArray<readonly [string, string]> = [
  // Claude family
  ['opus-4.7', 'Opus 4.7'],
  ['sonnet-4.6', 'Sonnet 4.6'],
  ['sonnet-4.5', 'Sonnet 4.5'],
  ['haiku-4.5', 'Haiku 4.5'],
  // OpenAI frontier 2025-2026 (more specific first)
  ['gpt-5.5', 'GPT-5.5'],
  ['gpt-5-mini', 'GPT-5 mini'],
  ['gpt-5-nano', 'GPT-5 nano'],
  ['gpt-5', 'GPT-5'],
  // Gemini frontier 2025-2026 (more specific first)
  ['gemini-3.5-flash', 'Gemini 3.5 Flash'],
  ['gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite'],
  ['gemini-2.5-flash', 'Gemini 2.5 Flash'],
  ['gemini-2.5-pro', 'Gemini 2.5 Pro'],
  // Qwen + DeepSeek frontier
  ['qwen3.7-max', 'Qwen 3.7 Max'],
  ['qwen3.5-plus', 'Qwen 3.5 Plus'],
  ['deepseek-v3.2', 'DeepSeek V3.2'],
  ['deepseek-chat-v3.1', 'DeepSeek V3.1'],
  // Legacy display fallback (modèles legacy 2024 retirés Stage B1 24/05/2026
  // — gardés pour ne pas casser l'affichage si une env override pointe encore
  // sur ces ids le temps de la transition)
  ['gpt-4o-mini', 'GPT-4o mini'],
  ['gpt-4o', 'GPT-4o'],
  ['gemini-2.0-flash', 'Gemini 2.0 Flash'],
  ['gemini-1.5-pro', 'Gemini 1.5 Pro'],
  ['gemini-1.5-flash', 'Gemini 1.5 Flash'],
  ['llama-3.3-70b', 'Llama 3.3 70B'],
  ['llama-3.1-70b', 'Llama 3.1 70B'],
];

export function getModelLabel(modelId: string): string {
  // Normalise version-style `digit-digit` → `digit.digit` so we maintain
  // a single set of patterns rather than duplicating each entry for both
  // OpenRouter (`.`) and Anthropic direct (`-`) naming conventions. The
  // negative lookahead `(?!\d)` guarantees we only touch single-digit
  // version markers (e.g. `4-6` → `4.6`) and never multi-digit sequences
  // like `3-70b` in `llama-3.3-70b` (where `70` is one number).
  // Sourcery PR #290 review.
  const normalized = modelId.toLowerCase().replace(/(\d)-(\d)(?!\d)/g, '$1.$2');
  for (const [pattern, label] of MODEL_LABELS) {
    if (normalized.includes(pattern)) return label;
  }
  // Fallback: return raw id so the user still sees something honest.
  return modelId;
}

export function chat(provider: Provider, params: ChatParams): Promise<ChatStream> {
  switch (provider) {
    case 'openrouter':
      return openrouterChat(params);
    case 'anthropic':
      return anthropicChat(params);
    case 'openai':
      return openaiChat(params);
    case 'gemini':
      return geminiChat(params);
    default: {
      const exhaustive: never = provider;
      return Promise.reject(
        new ChatError('unknown', `Unknown provider: ${String(exhaustive)}`),
      );
    }
  }
}
