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
