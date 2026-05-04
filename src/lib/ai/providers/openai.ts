/**
 * OpenAI provider — THI-111 step 4/8 (Tier 3).
 *
 * Streams chat completions from `https://api.openai.com/v1/chat/completions`.
 * Wire format is identical to OpenRouter (in fact OpenRouter is OpenAI-
 * compatible by design), so the request body, the SSE payload shape, and
 * the `[DONE]` sentinel are reused. Differences vs OpenRouter:
 *  - no `HTTP-Referer` / `X-Title` headers (OpenAI quota is per-key only)
 *  - 402 → quota_exceeded (insufficient_quota in OpenAI parlance)
 */

import { ChatError, type ChatErrorCode, type ChatParams, type ChatStream } from './types';
import { safeCancel, streamSseEvents } from './_sse';

export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';

interface DeltaFrame {
  choices?: Array<{ delta?: { content?: string } }>;
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
    if (frame.data === '[DONE]') {
      await safeCancel(reader);
      return;
    }
    try {
      const json = JSON.parse(frame.data) as DeltaFrame;
      const content = json.choices?.[0]?.delta?.content;
      if (typeof content === 'string' && content.length > 0) yield content;
    } catch {
      /* malformed frame — skip */
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
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      credentials: 'omit',
      signal: params.signal,
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
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
