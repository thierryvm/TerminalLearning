/**
 * Tests for src/lib/ai/providers/gemini.ts — THI-111 step 4/8.
 *
 * Gemini diverges substantially from the OpenAI lineage: model in URL path,
 * x-goog-api-key header, role 'model' instead of 'assistant', body shape
 * with `contents` + `systemInstruction`, no [DONE] sentinel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chat, geminiUrl, GEMINI_DEFAULT_MODEL } from '@/lib/ai/providers/gemini';

const FAKE_KEY = 'AIzaFAKE_TEST_KEY_DO_NOT_USE_0123';

function geminiFrame(text: string): string {
  const data = JSON.stringify({
    candidates: [{ content: { parts: [{ text }] } }],
  });
  return `data: ${data}\n\n`;
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

describe('Gemini chat — request shape', () => {
  it('POSTs to the streamGenerateContent endpoint with model in URL and alt=sse', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse([geminiFrame('ok')]));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: GEMINI_DEFAULT_MODEL,
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(geminiUrl(GEMINI_DEFAULT_MODEL));
    expect(url).toContain('alt=sse');
    expect(url).toContain(GEMINI_DEFAULT_MODEL);
    expect(init.credentials).toBe('omit');
  });

  it('sends the API key in x-goog-api-key header (NOT in URL, NOT as Bearer)', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse([geminiFrame('ok')]));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: GEMINI_DEFAULT_MODEL,
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get('x-goog-api-key')).toBe(FAKE_KEY);
    expect(headers.get('Authorization')).toBeNull();
    expect(url).not.toContain(FAKE_KEY);
    expect(url).not.toMatch(/[?&]key=/);
  });

  it("maps assistant→'model' role and shapes contents + systemInstruction correctly", async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse([geminiFrame('ok')]));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: GEMINI_DEFAULT_MODEL,
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
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
      systemInstruction: { parts: Array<{ text: string }> };
      generationConfig: { maxOutputTokens: number };
    };
    expect(body.systemInstruction.parts[0]!.text).toBe('SYS');
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'q1' }] },
      { role: 'model', parts: [{ text: 'a1' }] },
      { role: 'user', parts: [{ text: 'q2' }] },
    ]);
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThan(0);
  });

  it('never leaks the API key into the URL or body', async () => {
    fetchSpy.mockResolvedValue(makeStreamResponse([geminiFrame('ok')]));
    await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: GEMINI_DEFAULT_MODEL,
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(FAKE_KEY);
    expect(init.body as string).not.toContain(FAKE_KEY);
  });
});

describe('Gemini chat — streaming + errors', () => {
  it('extracts candidates[0].content.parts[0].text from each frame', async () => {
    fetchSpy.mockResolvedValue(
      makeStreamResponse([geminiFrame('Hello'), geminiFrame(' world')]),
    );
    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: GEMINI_DEFAULT_MODEL,
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('Hello world');
  });

  it('skips malformed frames without aborting', async () => {
    fetchSpy.mockResolvedValue(
      makeStreamResponse(['data: {malformed\n\n', geminiFrame('valid')]),
    );
    const out = await collect(
      await chat({
        apiKey: FAKE_KEY,
        model: GEMINI_DEFAULT_MODEL,
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
    expect(out.join('')).toBe('valid');
  });

  it('maps 401 / 403 → invalid_key', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: 'unauthorized' }, 403));
    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: GEMINI_DEFAULT_MODEL,
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'invalid_key', status: 403 });
  });

  it('maps 429 → rate_limited', async () => {
    fetchSpy.mockResolvedValue(makeJsonResponse({ error: 'rate' }, 429));
    await expect(
      chat({
        apiKey: FAKE_KEY,
        model: GEMINI_DEFAULT_MODEL,
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ name: 'ChatError', code: 'rate_limited', status: 429 });
  });
});
