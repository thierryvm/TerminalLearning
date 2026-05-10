/**
 * Eval suite (a) — structural prompt rules — THI-144 / ADR-008.
 *
 * Runs in CI on every PR — gate against structural regression on the
 * prompt content. Each fixture pins a regex cue that the system prompt
 * MUST contain so a future bump cannot silently drop a rule.
 *
 * The fixture corpus lives in `src/lib/ai/eval/fixtures.ts` — outside
 * `src/test/` — so `scripts/eval-tutor.ts` (a production-like manual
 * tool) can import the same data without crossing the test boundary.
 * The earlier co-location inside this file's predecessor caused an
 * `InitSuite` crash when the script ran outside the Vitest runner
 * (10 May 2026 — @thierry, fixed in PR #224, relocated in PR #225+
 * after Sourcery feedback).
 *
 * For empirical regression on real model behaviour see
 * `scripts/eval-tutor.ts` — the manual run script that reads the same
 * `EVAL_FIXTURES` and sends each prompt to a real Haiku model via
 * OpenRouter (eval suite (b), per ADR-008 ship gate).
 */
import { describe, expect, it } from 'vitest';
import {
  getSystemPrompt,
  TUTOR_PROMPT_VERSION,
  type TutorLang,
} from '@/lib/ai/systemPrompt';
import { EVAL_FIXTURES, type EvalCategory } from '@/lib/ai/eval/fixtures';

describe('Eval suite (a) — structural prompt rule fixtures (THI-144 / ADR-008)', () => {
  it('exports a non-empty corpus of 10-15 fixtures', () => {
    expect(EVAL_FIXTURES.length).toBeGreaterThanOrEqual(10);
    expect(EVAL_FIXTURES.length).toBeLessThanOrEqual(15);
  });

  it('covers every friction category at least once', () => {
    const seen = new Set<EvalCategory>(EVAL_FIXTURES.map((f) => f.category));
    expect(seen.has('friction-1-compound')).toBe(true);
    expect(seen.has('friction-2-internal-mechanics')).toBe(true);
    expect(seen.has('friction-3-repeated-hint')).toBe(true);
    expect(seen.has('friction-4-satisfaction-signal')).toBe(true);
    expect(seen.has('standard-pedagogical')).toBe(true);
  });

  it('covers all 4 supported languages at least once', () => {
    const seen = new Set<TutorLang>(EVAL_FIXTURES.map((f) => f.lang));
    expect(seen.size).toBe(4);
  });

  it('has unique fixture ids', () => {
    const ids = EVAL_FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Invariant: every fixture is pinned to the currently shipped tutor
  // prompt version. When the version constant is bumped (e.g. v1.2.0),
  // this test fails until each fixture is either re-validated against
  // the new prompt content (and its `promptVersion` field bumped) or
  // replaced. Prevents older fixtures from silently drifting out of
  // sync with future prompt updates (Sourcery feedback on PR #224).
  it(`every fixture is pinned to the current TUTOR_PROMPT_VERSION (${TUTOR_PROMPT_VERSION})`, () => {
    const driftingIds = EVAL_FIXTURES.filter(
      (f) => f.promptVersion !== TUTOR_PROMPT_VERSION,
    ).map((f) => f.id);
    expect(driftingIds).toEqual([]);
  });

  for (const fix of EVAL_FIXTURES) {
    it(`${fix.id} (${fix.category}, ${fix.lang}/${fix.mode}): system prompt contains the protective cue`, () => {
      const prompt = getSystemPrompt({ lang: fix.lang, mode: fix.mode });
      expect(prompt).toMatch(fix.expectedPromptCue);
    });
  }
});
