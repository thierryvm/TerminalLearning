/**
 * Internal SSE event reader — shared across all providers.
 *
 * Parses a `ReadableStream<Uint8Array>` into successive `{ event, data }`
 * frames. Each provider then extracts its own delta payload from the `data`
 * string. The reader handles:
 *  - decoding UTF-8 with stream-safe boundaries (TextDecoder stream mode)
 *  - buffering across split network reads (event split mid-bytes is reassembled)
 *  - SSE comment lines (`:`-prefixed) — silently ignored
 *  - multi-line `data:` fields (concatenated with `\n` per spec)
 *
 * Termination is provider-specific (`[DONE]` for OpenAI/OpenRouter, event
 * type `message_stop` for Anthropic, `finishReason` for Gemini), so this
 * helper does not interpret payloads — it just yields them.
 */

export interface SseFrame {
  event?: string;
  data: string;
}

export async function* streamSseEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SseFrame> {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      const tail = parseBlock(buffer);
      if (tail) yield tail;
      return;
    }
    buffer += decoder.decode(value, { stream: true });

    let sep = buffer.indexOf('\n\n');
    while (sep !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const frame = parseBlock(block);
      if (frame) yield frame;
      sep = buffer.indexOf('\n\n');
    }
  }
}

function parseBlock(block: string): SseFrame | null {
  if (block.length === 0) return null;
  let event: string | undefined;
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.length === 0 || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
    // Other fields (id:, retry:) are not used by any provider here.
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

/** Cancels the underlying reader, swallowing any "already closed" error. */
export async function safeCancel(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    /* stream already closed */
  }
}
