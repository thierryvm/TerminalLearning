/**
 * Tests for src/lib/ai/providers/openai.ts — THI-111 step 4/8.
 *
 * Focused on OpenAI-specific differences vs OpenRouter (URL, absence of
 * HTTP-Referer/X-Title, status 402 mapping). The shared SSE parser is
 * already covered in openrouter.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chat, OPENAI_URL } from '@/lib/ai/providers/openai';

const FAKE_KEY = 'sk-proj-FAKE_TEST_KEY_DO_NOT_USE_0123';

function ssePayload(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
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

describe('OpenAI chat — request shape', () => {
  it('POSTs to the OpenAI completions endpoint with credentials omitted', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['data: [DONE]\n\n']));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'gpt-4o-mini',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(OPENAI_URL);
    expect(init.credentials).toBe('omit');
  });

  it('does NOT send HTTP-Referer or X-Title headers (those are OpenRouter-specific)', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['data: [DONE]\n\n']));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'gpt-4o-mini',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    const headers = new Headers(
      (fetchSpy.mock.calls[0]![1] as RequestInit).headers as HeadersInit,
    );
    expect(headers.get('Authorization')).toBe(`Bearer ${FAKE_KEY}`);
    expect(headers.get('HTTP-Referer')).toBeNull();
    expect(headers.get('X-Title')).toBeNull();
  });

  it('never leaks the API key into the URL or body', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['data: [DONE]\n\n']));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'gpt-4o-mini',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(FAKE_KEY);
    expect(init.body as string).not.toContain(FAKE_KEY);
  });
});

describe('OpenAI chat — streaming + errors', () => {
  it('streams content deltas in order', async () => {
    fetchSpy.mockResolvedValue(
      makeStreamResponse([ssePayload('Hi'), ssePayload(' there'), 'data: [DONE]\n\n']),
    );
    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'gpt-4o-mini',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('Hi there');
  });

  it('maps 401 → invalid_key', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: 'unauthorized' }, 401));
    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'gpt-4o-mini',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'invalid_key', status: 401 });
  });

  it('maps 402 → quota_exceeded (insufficient_quota)', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: 'insufficient_quota' }, 402));
    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'gpt-4o-mini',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'quota_exceeded', status: 402 });
  });

  it('maps 429 → rate_limited', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: 'rate' }, 429));
    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'gpt-4o-mini',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'rate_limited', status: 429 });
  });
});
