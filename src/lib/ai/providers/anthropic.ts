/**
 * Anthropic provider — THI-111 step 4/8 (Tier 2).
 *
 * Streams from `https://api.anthropic.com/v1/messages`. Two notable
 * differences vs OpenAI / OpenRouter:
 *
 *  1. The system prompt is a top-level `system` parameter, not a message
 *     with `role:'system'`. Messages must alternate user/assistant.
 *  2. SSE events are named (`event: content_block_delta`, `message_stop`,
 *     etc.). We extract `delta.text` only from `content_block_delta` events
 *     whose delta type is `text_delta`. `message_stop` terminates the stream.
 *
 * Anthropic blocks direct browser calls by default. The
 * `anthropic-dangerous-direct-browser-access: true` header opts into the
 * BYOK / client-side flow that the user has knowingly chosen.
 */

import { ChatError, type ChatErrorCode, type ChatParams, type ChatStream } from './types';
import { safeCancel, streamSseEvents } from './_sse';

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
// Claude Sonnet 5.5 (`claude-sonnet-5-5`, $2 / $10 per million tokens);
// Claude Opus 5.5 (`claude-opus-5-5`) is offered as the stronger option in
// `modelChoices.ts`. Previous default `claude-sonnet-4-6` is still active but
// older. Source (9 November 2026):
// https://platform.claude.com/docs/en/about-claude/models/overview
export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-5-5';
export const ANTHROPIC_MAX_TOKENS = 1024;
/**
 * Output cap for models whose thinking cannot be turned off. Thinking counts
 * toward `max_tokens` (Effort guide), so 1024 could leave a cut or empty
 * answer. This is a ceiling, not a spend: short answers stay short.
 */
export const ANTHROPIC_THINKING_MAX_TOKENS = 4096;

/**
 * Thinking settings per model, from the Anthropic docs read on 9 November
 * 2026 (https://platform.claude.com/docs/en/build-with-claude/effort and
 * https://platform.claude.com/docs/en/models/sonnet-5-5/overview):
 *  - Sonnet 5.5 thinks by default; `thinking: {type: "between_tools"}` turns
 *    off up-front thinking (`"disabled"` returns 400). It works at `high`
 *    effort or below, and `high` is the default we keep. With no tools in
 *    the tutor, the answer gets the whole 1024-token budget, as before.
 *  - Opus 5.5 thinking is always on and cannot be turned off (`disabled`
 *    returns 400 at every effort level): we only raise the output cap.
 *  - Other models (env override, older ids) get the request unchanged.
 */
const BETWEEN_TOOLS_MODELS: ReadonlySet<string> = new Set(['claude-sonnet-5-5']);
const ALWAYS_THINKING_MODELS: ReadonlySet<string> = new Set(['claude-opus-5-5']);

export function anthropicThinkingOptions(model: string): {
  max_tokens: number;
  thinking?: { type: 'between_tools' };
} {
  if (BETWEEN_TOOLS_MODELS.has(model)) {
    return { max_tokens: ANTHROPIC_MAX_TOKENS, thinking: { type: 'between_tools' } };
  }
  if (ALWAYS_THINKING_MODELS.has(model)) {
    return { max_tokens: ANTHROPIC_THINKING_MAX_TOKENS };
  }
  return { max_tokens: ANTHROPIC_MAX_TOKENS };
}

interface ContentBlockDelta {
  type?: 'content_block_delta';
  delta?: { type?: 'text_delta'; text?: string };
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function statusToCode(status: number): ChatErrorCode {
  if (status === 401 || status === 403) return 'invalid_key';
  if (status === 429) return 'rate_limited';
  if (status === 402) return 'quota_exceeded';
  if (status === 404) return 'model_unavailable';
  if (status >= 500) return 'server_error';
  return 'unknown';
}

async function* parseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string> {
  for await (const frame of streamSseEvents(reader)) {
    if (frame.event === 'message_stop' || frame.event === 'error') {
      await safeCancel(reader);
      return;
    }
    if (frame.event !== 'content_block_delta') continue;
    try {
      const json = JSON.parse(frame.data) as ContentBlockDelta;
      const text = json.delta?.type === 'text_delta' ? json.delta.text : undefined;
      if (typeof text === 'string' && text.length > 0) yield text;
    } catch {
      /* malformed frame — skip */
    }
  }
}

export async function chat(params: ChatParams): Promise<ChatStream> {
  const body = JSON.stringify({
    model: params.model,
    ...anthropicThinkingOptions(params.model),
    stream: true,
    system: params.systemPrompt,
    messages: params.messages, // already user/assistant alternating
  });

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      credentials: 'omit',
      signal: params.signal,
      headers: {
        'x-api-key': params.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body,
    });
  } catch (err) {
    if (isAbortError(err)) {
      throw new ChatError('aborted', 'Request aborted by the client.');
    }
    throw new ChatError('network', 'Network error reaching the AI provider.');
  }

  if (!res.ok) {
    try {
      await res.text();
    } catch {
      /* ignore */
    }
    throw new ChatError(statusToCode(res.status), 'Provider returned an error.', res.status);
  }
  if (!res.body) {
    throw new ChatError('server_error', 'Provider returned an empty body.', res.status);
  }
  return parseStream(res.body.getReader());
}
