/**
 * Gemini provider — THI-111 step 4/8 (Tier 4).
 *
 * Streams from `https://generativelanguage.googleapis.com/v1beta/models/
 * {model}:streamGenerateContent?alt=sse`.
 *
 * Gemini diverges substantially from the OpenAI lineage:
 *  - assistant role is named `model` in the request body
 *  - body shape: `{ contents: [{role, parts:[{text}]}], systemInstruction:
 *    { parts:[{text}] }, generationConfig: {...} }`
 *  - SSE frames are unnamed (no `event:` line); each `data:` payload is
 *    `{ candidates: [{ content: { parts: [{ text: '…' }] } }] }`
 *  - no `[DONE]` sentinel; the stream just closes when generation ends
 *
 * Security note: Google supports both `?key=…` URL param and
 * `x-goog-api-key` header. We use the header so the key never appears in a
 * URL that could land in proxy logs or browser history.
 */

import { ChatError, type ChatErrorCode, type ChatParams, type ChatStream } from './types';
import { streamSseEvents } from './_sse';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// `gemini-2.0-flash` was shut down by Google on 1 June 2026. Default is now
// the cheapest current model, `gemini-3.5-flash-lite` ($0.30 / $2.50 per
// million tokens): the learner pays with their own key. `gemini-3.6-flash`
// is offered as the better-quality option (see `modelChoices.ts`).
// Sources (9 November 2026): https://ai.google.dev/gemini-api/docs/models,
// https://ai.google.dev/gemini-api/docs/pricing
export const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
export const GEMINI_MAX_TOKENS = 1024;

/**
 * Thinking tokens count against `maxOutputTokens`: with our 1024 cap a model
 * that thinks at `medium` (the `gemini-3.6-flash` default) could return a cut
 * or empty answer. `MINIMAL` keeps the tutor's previous behaviour
 * (gemini-2.0-flash did not think).
 *
 * `thinkingLevel` is only sent to the models whose documented levels include
 * `minimal` (Gemini thinking guide, table "Controlling thinking", read on
 * 9 November 2026: https://ai.google.dev/gemini-api/docs/thinking).
 * Models before Gemini 3 reject the field with an error, and some Gemini 3+
 * models (3.8 Flash, 3.1 Pro, 4 Argon) do not accept `minimal`.
 * `gemini-3.5-flash-lite` already defaults to minimal; sending it explicitly
 * is harmless and keeps the request deterministic.
 */
export const GEMINI_THINKING_LEVEL = 'MINIMAL';

const MINIMAL_THINKING_MODELS: ReadonlySet<string> = new Set([
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
]);

export function acceptsMinimalThinking(model: string): boolean {
  return MINIMAL_THINKING_MODELS.has(model.toLowerCase());
}

interface GeminiFrame {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function statusToCode(status: number): ChatErrorCode {
  if (status === 400 || status === 401 || status === 403) return 'invalid_key';
  if (status === 429) return 'rate_limited';
  if (status === 402) return 'quota_exceeded';
  if (status === 404) return 'model_unavailable';
  if (status >= 500) return 'server_error';
  return 'unknown';
}

export function geminiUrl(model: string): string {
  return `${GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
}

async function* parseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string> {
  for await (const frame of streamSseEvents(reader)) {
    try {
      const json = JSON.parse(frame.data) as GeminiFrame;
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === 'string' && text.length > 0) yield text;
    } catch {
      /* malformed frame — skip */
    }
  }
}

export async function chat(params: ChatParams): Promise<ChatStream> {
  // Gemini uses 'model' in place of 'assistant'.
  const contents = params.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = JSON.stringify({
    contents,
    systemInstruction: { parts: [{ text: params.systemPrompt }] },
    generationConfig: {
      maxOutputTokens: GEMINI_MAX_TOKENS,
      ...(acceptsMinimalThinking(params.model)
        ? { thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL } }
        : {}),
    },
  });

  let res: Response;
  try {
    res = await fetch(geminiUrl(params.model), {
      method: 'POST',
      credentials: 'omit',
      signal: params.signal,
      headers: {
        'x-goog-api-key': params.apiKey,
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
