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
export function getModelLabel(modelId: string): string {
  const lower = modelId.toLowerCase();
  // Claude family
  if (lower.includes('sonnet-4-6')) return 'Sonnet 4.6';
  if (lower.includes('sonnet-4-5')) return 'Sonnet 4.5';
  if (lower.includes('haiku-4-5')) return 'Haiku 4.5';
  if (lower.includes('opus-4-7')) return 'Opus 4.7';
  // OpenAI family
  if (lower.includes('gpt-4o-mini')) return 'GPT-4o mini';
  if (lower.includes('gpt-4o')) return 'GPT-4o';
  // Gemini family
  if (lower.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash';
  if (lower.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
  if (lower.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';
  // Llama family
  if (lower.includes('llama-3.3-70b')) return 'Llama 3.3 70B';
  if (lower.includes('llama-3.1-70b')) return 'Llama 3.1 70B';
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
