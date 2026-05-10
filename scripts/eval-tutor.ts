/**
 * Eval suite (b) — manual run on a real Haiku model — THI-144 / ADR-008.
 *
 * Reads the EVAL_FIXTURES corpus from `src/lib/ai/eval/fixtures.ts` and
 * sends each fixture to Claude Haiku 4.5 via OpenRouter. Writes a markdown
 * report to `.tmp/eval-tutor-<timestamp>.md` with per-fixture model
 * response + simple heuristic checks.
 *
 * The corpus lives under `src/lib/ai/eval/` (not `src/test/`) so this
 * production-like manual tool does not transitively depend on the test
 * directory and does not pull Vitest globals — those caused an
 * `InitSuite` crash when the script ran outside the test runner.
 * Reported by @thierry on 10 May 2026 PM, fixed in PR #224, relocated
 * after Sourcery feedback.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-v1-... npx tsx scripts/eval-tutor.ts
 *
 *   # Optional: override default model
 *   OPENROUTER_MODEL=anthropic/claude-haiku-4-5 npx tsx scripts/eval-tutor.ts
 *
 * Cost: ~$0.10 per full run on Haiku 4.5 (14 fixtures × ~500 input + 200
 * output tokens). Use a personal dev key — TL has no server-side key
 * (BYOK pure per ADR-002).
 *
 * Output: structured markdown report (gitignored under .tmp/) with:
 *   - Summary line per fixture: PASS / WARN / FAIL based on heuristics
 *   - Full LLM response captured verbatim (for human verdict)
 *   - Aggregate counters per friction category
 *
 * Heuristics applied (best-effort, NOT a substitute for human judgement):
 *   - Friction 1 (compound): expects ≥2 numbered bullets in response
 *   - Friction 2 (over-explanation): expects response < 800 chars (curbed)
 *   - Friction 3 (repeated hint): N/A in single-turn — flagged manually
 *   - Friction 4 (satisfaction): expects 0 question marks in response
 *   - Standard: just captures response, no auto-grade
 *
 * The final verdict is HUMAN — read the report, decide if v1.1.0 ships.
 * Per ADR-008: if eval suite (b) reveals regression on a friction → do
 * NOT ship v1.1.0, split into v1.0.2 patches instead.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EVAL_FIXTURES, type EvalFixture } from '../src/lib/ai/eval/fixtures';
import { getSystemPrompt } from '../src/lib/ai/systemPrompt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

const DEFAULT_MODEL = 'anthropic/claude-haiku-4-5';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterChoice {
  message: { role: string; content: string };
  finish_reason?: string;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: { message: string; code?: string };
}

interface FixtureResult {
  fixture: EvalFixture;
  systemPrompt: string;
  userMessage: string;
  modelResponse: string;
  responseChars: number;
  heuristicVerdict: 'PASS' | 'WARN' | 'FAIL' | 'N/A';
  heuristicNotes: string[];
  durationMs: number;
}

function applyHeuristics(fix: EvalFixture, response: string): {
  verdict: FixtureResult['heuristicVerdict'];
  notes: string[];
} {
  const notes: string[] = [];
  const trimmed = response.trim();
  const questionMarks = (trimmed.match(/\?/g) || []).length;
  const numberedBullets = (trimmed.match(/^\s*\d[\.\)]/gm) || []).length;
  const chars = trimmed.length;

  switch (fix.category) {
    case 'friction-1-compound': {
      // Expect numbered bullets when learner asked compound question
      if (numberedBullets >= 2) {
        notes.push(`PASS: ${numberedBullets} numbered bullets detected.`);
        return { verdict: 'PASS', notes };
      }
      notes.push(
        `WARN: ${numberedBullets} numbered bullets — expected ≥2 for a compound 3-question input.`,
      );
      return { verdict: 'WARN', notes };
    }
    case 'friction-2-internal-mechanics': {
      if (chars < 800) {
        notes.push(`PASS: response ${chars} chars (< 800, curbed).`);
        return { verdict: 'PASS', notes };
      }
      if (chars < 1500) {
        notes.push(
          `WARN: response ${chars} chars — exceeds 800 chars, may include over-explanation.`,
        );
        return { verdict: 'WARN', notes };
      }
      notes.push(
        `FAIL: response ${chars} chars — significantly over the 800 char curb threshold.`,
      );
      return { verdict: 'FAIL', notes };
    }
    case 'friction-3-repeated-hint': {
      // Single-turn run cannot detect repetition across turns.
      notes.push(
        'N/A: friction 3 requires multi-turn run (current eval is single-turn). Verify manually that the angle is reformulated.',
      );
      return { verdict: 'N/A', notes };
    }
    case 'friction-4-satisfaction-signal': {
      if (questionMarks === 0) {
        notes.push('PASS: 0 question marks — closed with a summary, not a question.');
        return { verdict: 'PASS', notes };
      }
      if (questionMarks === 1) {
        notes.push(
          'WARN: 1 question mark detected — may be rhetorical or trailing summary; verify manually.',
        );
        return { verdict: 'WARN', notes };
      }
      notes.push(
        `FAIL: ${questionMarks} question marks — closed with a question instead of a summary.`,
      );
      return { verdict: 'FAIL', notes };
    }
    case 'standard-pedagogical': {
      // No auto-grade for baselines — just capture.
      notes.push(`Captured: ${chars} chars, ${questionMarks} question marks.`);
      return { verdict: 'N/A', notes };
    }
  }
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ content: string; ms: number }> {
  const start = Date.now();
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://terminallearning.dev',
      'X-Title': 'Terminal Learning — eval-tutor.ts',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });
  const ms = Date.now() - start;
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`OpenRouter HTTP ${res.status}: ${txt}`);
  }
  const data = (await res.json()) as OpenRouterResponse;
  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }
  const content = data.choices?.[0]?.message?.content ?? '';
  return { content, ms };
}

function buildUserMessage(fix: EvalFixture): string {
  // Mirror the production builder shape: the system prompt expects a
  // <user_question>...</user_question> block. We don't inject lesson_context
  // or platform_context here — fixtures focus on the friction rules in the
  // prompt, not on grounding.
  return `<user_question>\n${fix.userInput}\n</user_question>`;
}

function formatReport(results: FixtureResult[], model: string): string {
  const ts = new Date().toISOString();
  const total = results.length;
  const counts = {
    PASS: results.filter((r) => r.heuristicVerdict === 'PASS').length,
    WARN: results.filter((r) => r.heuristicVerdict === 'WARN').length,
    FAIL: results.filter((r) => r.heuristicVerdict === 'FAIL').length,
    'N/A': results.filter((r) => r.heuristicVerdict === 'N/A').length,
  };
  // Surface every distinct prompt version present in the corpus so the
  // human reading the report can confirm at a glance that all fixtures
  // were authored against the version under evaluation.
  const versions = Array.from(
    new Set(results.map((r) => r.fixture.promptVersion)),
  ).join(', ');

  const lines: string[] = [];
  lines.push(`# Eval suite (b) — manual run report`);
  lines.push('');
  lines.push(`- **Date**: ${ts}`);
  lines.push(`- **Model**: \`${model}\``);
  lines.push(`- **Prompt version(s) in corpus**: \`${versions}\``);
  lines.push(`- **Fixtures**: ${total}`);
  lines.push(
    `- **Heuristic counts**: ✅ PASS ${counts.PASS} · ⚠️ WARN ${counts.WARN} · ❌ FAIL ${counts.FAIL} · ⚪ N/A ${counts['N/A']}`,
  );
  lines.push('');
  lines.push(
    '> Heuristics are best-effort. The final verdict on whether v1.1.0 ships is HUMAN — read each response, judge against `expectedBehaviour`. Per ADR-008: any FAIL on a friction = do NOT ship one-shot v1.1.0, split into v1.0.2 patches.',
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const r of results) {
    const f = r.fixture;
    lines.push(`## ${f.id} — ${f.category} — ${f.lang}/${f.mode}`);
    lines.push('');
    lines.push(`**Verdict heuristique**: ${r.heuristicVerdict}`);
    lines.push(`**Notes**: ${r.heuristicNotes.join(' · ')}`);
    lines.push(`**Durée**: ${r.durationMs} ms`);
    lines.push(`**Réponse**: ${r.responseChars} chars`);
    lines.push('');
    lines.push(`**User input**: ${f.userInput}`);
    lines.push('');
    lines.push(`**Expected behaviour**: ${f.expectedBehaviour}`);
    lines.push('');
    lines.push('**Model response**:');
    lines.push('');
    lines.push('```');
    lines.push(r.modelResponse);
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error(
      '❌ Missing OPENROUTER_API_KEY env var. Set a personal dev key (BYOK pure per ADR-002, no server-side key on TL):',
    );
    console.error('   OPENROUTER_API_KEY=sk-or-v1-... npx tsx scripts/eval-tutor.ts');
    process.exit(2);
  }
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  console.log(`Eval suite (b) — running ${EVAL_FIXTURES.length} fixtures on ${model}`);
  console.log('Cost estimate: ~$0.10 (Haiku pricing × ~700 tokens × 14 fixtures).');
  console.log('');

  const results: FixtureResult[] = [];
  for (const fix of EVAL_FIXTURES) {
    const systemPrompt = getSystemPrompt({ lang: fix.lang, mode: fix.mode });
    const userMessage = buildUserMessage(fix);
    process.stdout.write(`  ${fix.id} (${fix.category}, ${fix.lang}/${fix.mode}) ... `);
    try {
      const { content, ms } = await callOpenRouter(apiKey, model, systemPrompt, userMessage);
      const heuristic = applyHeuristics(fix, content);
      results.push({
        fixture: fix,
        systemPrompt,
        userMessage,
        modelResponse: content,
        responseChars: content.trim().length,
        heuristicVerdict: heuristic.verdict,
        heuristicNotes: heuristic.notes,
        durationMs: ms,
      });
      console.log(`${heuristic.verdict} (${ms} ms, ${content.trim().length} chars)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`ERROR: ${msg}`);
      results.push({
        fixture: fix,
        systemPrompt,
        userMessage,
        modelResponse: `[ERROR] ${msg}`,
        responseChars: 0,
        heuristicVerdict: 'FAIL',
        heuristicNotes: [`Network/API error: ${msg}`],
        durationMs: 0,
      });
    }
  }

  const tmpDir = join(REPO_ROOT, '.tmp');
  mkdirSync(tmpDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = join(tmpDir, `eval-tutor-${stamp}.md`);
  writeFileSync(outPath, formatReport(results, model), 'utf8');
  console.log('');
  console.log(`Report written: ${outPath}`);
  console.log('Read it manually before deciding to ship v1.1.0 (ADR-008 ship gate).');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
