/**
 * Tests for src/lib/ai/providers/anthropic.ts — THI-111 step 4/8.
 *
 * Anthropic-specific differences vs OpenAI: x-api-key header (not Bearer),
 * `anthropic-version` header, browser-access opt-in header, system as a
 * top-level body field (not a role:system message), max_tokens required,
 * and event-named SSE frames terminated by `event: message_stop`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chat,
  ANTHROPIC_URL,
  ANTHROPIC_VERSION,
  ANTHROPIC_MAX_TOKENS,
} from '@/lib/ai/providers/anthropic';

const FAKE_KEY = 'sk-ant-FAKE_TEST_KEY_DO_NOT_USE_0123';

function deltaEvent(text: string): string {
  const data = JSON.stringify({
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text },
  });
  return `event: content_block_delta\ndata: ${data}\n\n`;
}

function makeStreamResponse(parts: readonly string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const p of parts) controller.enqueue(enc.encode(p));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}
function makeJsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
async function collect(stream: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const c of stream) out.push(c);
  return out;
}

let fetchSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch') as ReturnType<typeof vi.spyOn>;
});
afterEach(() => {
  fetchSpy.mockRestore();
});

describe('Anthropic chat — request shape', () => {
  it('POSTs to the Anthropic messages endpoint with credentials omitted', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['event: message_stop\ndata: {}\n\n']));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'claude-haiku-4-5',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ANTHROPIC_URL);
    expect(init.credentials).toBe('omit');
  });

  it('uses x-api-key header (not Authorization Bearer) and the anthropic-version header', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['event: message_stop\ndata: {}\n\n']));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'claude-haiku-4-5',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    const headers = new Headers(
      (fetchSpy.mock.calls[0]![1] as RequestInit).headers as HeadersInit,
    );
    expect(headers.get('x-api-key')).toBe(FAKE_KEY);
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('anthropic-version')).toBe(ANTHROPIC_VERSION);
    expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
  });

  it('puts system prompt at top-level (not as a role:system message) and includes max_tokens', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['event: message_stop\ndata: {}\n\n']));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'claude-haiku-4-5',
        systemPrompt: 'SYS',
        messages: [
          { role: 'user', content: 'q1' },
          { role: 'assistant', content: 'a1' },
          { role: 'user', content: 'q2' },
        ],
      }),
    );
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      system: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.system).toBe('SYS');
    expect(body.max_tokens).toBe(ANTHROPIC_MAX_TOKENS);
    expect(body.messages).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
    ]);
    expect(body.messages.some((m) => m.role === 'system')).toBe(false);
  });

  it('never leaks the API key into the URL or body', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['event: message_stop\ndata: {}\n\n']));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'claude-haiku-4-5',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(FAKE_KEY);
    expect(init.body as string).not.toContain(FAKE_KEY);
  });
});

describe('Anthropic chat — streaming + errors', () => {
  it('extracts delta.text only from content_block_delta events', async () => {
    fetchSpy.mockResolvedValue(
      makeStreamResponse([
        `event: message_start\ndata: {"type":"message_start"}\n\n`,
        `event: content_block_start\ndata: {"index":0}\n\n`,
        deltaEvent('Hello'),
        deltaEvent(' world'),
        `event: content_block_stop\ndata: {"index":0}\n\n`,
        `event: message_delta\ndata: {"delta":{"stop_reason":"end_turn"}}\n\n`,
        `event: message_stop\ndata: {}\n\n`,
      ]),
    );
    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'claude-haiku-4-5',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('Hello world');
  });

  it('terminates on event: error', async () => {
    fetchSpy.mockResolvedValue(
      makeStreamResponse([
        deltaEvent('partial'),
        `event: error\ndata: {"type":"error","error":{"type":"overloaded_error"}}\n\n`,
        deltaEvent('after-error'),
      ]),
    );
    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'claude-haiku-4-5',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('partial');
  });

  it('maps 401 → invalid_key', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: 'unauthorized' }, 401));
    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'claude-haiku-4-5',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'invalid_key', status: 401 });
  });

  it('maps 429 → rate_limited', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: 'rate_limit' }, 429));
    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'claude-haiku-4-5',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'rate_limited', status: 429 });
  });
});
