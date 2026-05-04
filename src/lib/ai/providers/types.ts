/**
 * Public contracts shared by all BYOK provider modules — THI-111 step 3/8.
 *
 * Every provider exposes a single `chat(params)` entry point that returns an
 * `AsyncIterable<string>` of decoded text chunks. The hook (`useAiTutor`,
 * step 5/8) iterates the stream chunk-by-chunk, runs each chunk through
 * `sanitizeModelChunk`, and appends the result to React state.
 *
 * No provider module is allowed to:
 *  - log the API key or any request body
 *  - persist the key in any storage
 *  - send cookies (`credentials: 'omit'` is mandatory)
 *  - throw with a message that contains the key body or the request URL
 *    query string (the URL itself is fine, the key is never in the URL)
 */

import type { Provider } from '../keyManager';

export type { Provider };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  /** API key for the chosen provider. Never stored, never logged. */
  apiKey: string;
  /** Provider-specific model identifier (e.g. `meta-llama/llama-3.3-70b-instruct:free`). */
  model: string;
  /** Frozen system prompt produced by `getSystemPrompt`. */
  systemPrompt: string;
  /** Conversation turns. Excludes the system prompt — providers add it per their API convention. */
  messages: ChatMessage[];
  /** Aborts the in-flight fetch and ends the stream. */
  signal?: AbortSignal;
}

export type ChatStream = AsyncIterable<string>;

export interface ProviderModule {
  chat(params: ChatParams): Promise<ChatStream>;
}

/**
 * Error code surfaced to the UI. The mapping is provider-agnostic so the
 * panel can render one generic message per code without leaking provider
 * internals.
 */
export type ChatErrorCode =
  | 'invalid_key'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'model_unavailable'
  | 'network'
  | 'server_error'
  | 'aborted'
  | 'unknown';

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  readonly status?: number;
  constructor(code: ChatErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.status = status;
  }
}
