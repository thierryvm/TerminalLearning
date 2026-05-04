/**
 * OpenRouter provider — THI-111 step 3/8 (Tier 1, default V1).
 *
 * Streams chat completions from `https://openrouter.ai/api/v1/chat/completions`
 * over Server-Sent Events. The hook (`useAiTutor`, step 5/8) iterates the
 * stream chunk-by-chunk through `sanitizeModelChunk`.
 *
 * The default model is selected for French quality + pedagogical reasoning
 * over raw latency (cf. plan §10.2). The user can override via the picker.
 *
 * Security invariants:
 *  - Authorization header is the ONLY place the API key appears.
 *  - `credentials: 'omit'` — cookies are never sent.
 *  - Errors raised here never embed the key body in the message string.
 *  - `HTTP-Referer` and `X-Title` identify the app to OpenRouter so the
 *    free-tier quota attribution is correct.
 */

import { ChatError, type ChatErrorCode, type ChatParams, type ChatStream } from './types';
import { safeCancel, streamSseEvents } from './_sse';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const APP_TITLE = 'Terminal Learning Tutor';
const APP_REFERER = 'https://terminallearning.dev';

interface DeltaFrame {
  choices?: Array<{ delta?: { content?: string; role?: string } }>;
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

/**
 * Parses an OpenAI-style SSE stream into content deltas. Stops on the
 * `[DONE]` sentinel; skips frames whose JSON does not carry a
 * `choices[0].delta.content` string.
 */
async function* parseOpenAiStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string> {
  for await (const frame of streamSseEvents(reader)) {
    if (frame.data === '[DONE]') {
      await safeCancel(reader);
      return;
    }
    try {
      const json = JSON.parse(frame.data) as DeltaFrame;
      const content = json.choices?.[0]?.delta?.content;
      if (typeof content === 'string' && content.length > 0) yield content;
    } catch {
      // Malformed JSON — skip this frame, continue the stream.
    }
  }
}

export async function chat(params: ChatParams): Promise<ChatStream> {
  const body = JSON.stringify({
    model: params.model,
    stream: true,
    messages: [
      { role: 'system', content: params.systemPrompt },
      ...params.messages,
    ],
  });

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      credentials: 'omit',
      signal: params.signal,
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'HTTP-Referer': APP_REFERER,
        'X-Title': APP_TITLE,
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
    // Drain & discard the body to avoid keeping the socket open. Body is
    // intentionally not surfaced to the UI — provider error messages can
    // contain account / key context.
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

  const reader = res.body.getReader();
  return parseOpenAiStream(reader);
}
