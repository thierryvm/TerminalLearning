/**
 * Provider dispatcher — THI-111 step 3/8.
 *
 * Single entry point used by `useAiTutor`. Selects the per-provider `chat`
 * implementation based on the chosen provider id. Each module is responsible
 * for its own request shape, SSE parsing, and error mapping; the dispatcher
 * is intentionally a thin switch with no business logic of its own.
 *
 * V1 Tier 1 (default): OpenRouter. Tiers 2-4 (Anthropic / OpenAI / Gemini)
 * are wired in step 4/8 — until then they throw `not_implemented` so the UI
 * can surface a clear "coming soon" message rather than a runtime crash.
 */

import { ChatError, type ChatParams, type ChatStream, type Provider } from './types';
import { chat as openrouterChat } from './openrouter';

export { OPENROUTER_DEFAULT_MODEL, OPENROUTER_URL } from './openrouter';
export type { Provider, ChatParams, ChatStream, ChatMessage, ChatErrorCode } from './types';
export { ChatError } from './types';

export function chat(provider: Provider, params: ChatParams): Promise<ChatStream> {
  switch (provider) {
    case 'openrouter':
      return openrouterChat(params);
    case 'anthropic':
    case 'openai':
    case 'gemini':
      return Promise.reject(
        new ChatError('unknown', `Provider not yet implemented: ${provider}`),
      );
    default: {
      const exhaustive: never = provider;
      return Promise.reject(
        new ChatError('unknown', `Unknown provider: ${String(exhaustive)}`),
      );
    }
  }
}
