/**
 * Tests for src/lib/ai/providers/openrouter.ts — THI-111 step 3/8.
 *
 * Covers the network contract (URL, headers, body shape, credentials),
 * the SSE parser (chunked, partial, [DONE] sentinel, keep-alive comments),
 * the error mapping (401/429/500/network/abort), and the no-leak invariant
 * (API key never appears in body or URL).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chat, OPENROUTER_DEFAULT_MODEL, OPENROUTER_URL } from '@/lib/ai/providers/openrouter';
import { ChatError } from '@/lib/ai/providers/types';

const FAKE_KEY = 'sk-or-v1-FAKE_TEST_KEY_DO_NOT_USE_0123';
const FAKE_PROMPT = 'system-prompt-stub';

function ssePayload(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function makeStreamResponse(parts: readonly string[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const p of parts) controller.enqueue(enc.encode(p));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function makeJsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeHtmlResponse(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html' } });
}

async function collect(stream: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of stream) out.push(chunk);
  return out;
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch') as ReturnType<typeof vi.spyOn>;
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe('chat — request shape', () => {
  it('POSTs to the OpenRouter completions endpoint with credentials omitted', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse([ssePayload('hi'), 'data: [DONE]\n\n']));

    const stream = await chat({
      apiKey: FAKE_KEY,
      model: OPENROUTER_DEFAULT_MODEL,
      systemPrompt: FAKE_PROMPT,
      messages: [{ role: 'user', content: 'hello' }],
    });
    await collect(stream);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(OPENROUTER_URL);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
  });

  it('sets Authorization, HTTP-Referer, X-Title and Content-Type headers', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['data: [DONE]\n\n']));

    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );

    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get('Authorization')).toBe(`Bearer ${FAKE_KEY}`);
    expect(headers.get('HTTP-Referer')).toBe('https://terminallearning.dev');
    expect(headers.get('X-Title')).toBe('Terminal Learning Tutor');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('includes the system prompt as a role:system message and user/assistant turns after', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['data: [DONE]\n\n']));

    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
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
      model: string;
      stream: boolean;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe('m');
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([
      { role: 'system', content: 'SYS' },
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
    ]);
  });

  it('never leaks the API key into the request URL or body', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse(['data: [DONE]\n\n']));

    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(FAKE_KEY);
    expect(init.body as string).not.toContain(FAKE_KEY);
  });
});

describe('chat — SSE parser', () => {
  it('yields the content delta of each event in order', async () => {
    fetchSpy.mockResolvedValue(
      makeStreamResponse([
        ssePayload('Hello'),
        ssePayload(' '),
        ssePayload('world'),
        'data: [DONE]\n\n',
      ]),
    );

    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('Hello world');
  });

  it('buffers across split network reads (event boundary inside a chunk)', async () => {
    // Split the SSE event "data: {…}\n\n" at byte 8 to simulate a real
    // wire-level split.
    const full = ssePayload('streamed');
    const half = full.length / 2;
    fetchSpy.mockResolvedValue(
      makeStreamResponse([full.slice(0, half), full.slice(half), 'data: [DONE]\n\n']),
    );

    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('streamed');
  });

  it('ignores SSE keep-alive comments (lines starting with `:`)', async () => {
    fetchSpy.mockResolvedValue(
      makeStreamResponse([
        ': openrouter heartbeat\n\n',
        ssePayload('after'),
        ': another keep-alive\n\n',
        'data: [DONE]\n\n',
      ]),
    );

    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('after');
  });

  it('terminates cleanly on the [DONE] sentinel', async () => {
    fetchSpy.mockResolvedValue(
      makeStreamResponse([ssePayload('one'), 'data: [DONE]\n\n', ssePayload('after-done')]),
    );

    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('one');
  });

  it('skips unparseable JSON deltas without aborting the stream', async () => {
    fetchSpy.mockResolvedValue(
      makeStreamResponse(['data: {malformed\n\n', ssePayload('valid'), 'data: [DONE]\n\n']),
    );

    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('valid');
  });

  it('skips events with no `delta.content` (e.g. role-only frames)', async () => {
    const roleFrame = `data: ${JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] })}\n\n`;
    fetchSpy.mockResolvedValue(
      makeStreamResponse([roleFrame, ssePayload('text'), 'data: [DONE]\n\n']),
    );

    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('text');
  });
});

describe('chat — error mapping', () => {
  it('maps 401 → ChatError(invalid_key) with a generic message', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: { message: 'bad' } }, 401));

    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({
      name: 'ChatError',
      code: 'invalid_key',
      status: 401,
    });
  });

  it('maps 429 → ChatError(rate_limited)', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: 'too many' }, 429));

    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'rate_limited', status: 429 });
  });

  it('maps 500 with HTML body → ChatError(server_error) without throwing JSON.parse', async () => {
    fetchSpy.mockResolvedValue(
      makeHtmlResponse('<html><body>Cloudflare 500</body></html>', 500),
    );

    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'server_error', status: 500 });
  });

  it('maps a network failure → ChatError(network)', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'network' });
  });

  it('maps an aborted fetch → ChatError(aborted)', async () => {
    const ac = new AbortController();
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchSpy.mockRejectedValue(abortError);
    ac.abort();

    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
        signal: ac.signal,
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'aborted' });
  });

  it('error messages never echo back the API key body', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: { message: 'bad' } }, 401));

    try {
      await chat({
        apiKey: FAKE_KEY,
        model: 'm',
        systemPrompt: FAKE_PROMPT,
        messages: [{ role: 'user', content: 'hi' }],
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ChatError);
      expect((err as Error).message).not.toContain(FAKE_KEY);
    }
  });
});
