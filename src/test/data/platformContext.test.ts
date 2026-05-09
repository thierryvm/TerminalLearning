/**
 * Tests for src/app/data/platformContext.ts — THI-148.
 *
 * Verifies the platform overview block is:
 *  - deterministic (same input → same string)
 *  - statistics-accurate (matches curriculum.ts state)
 *  - leak-free (no PII, no progress, no validator code, no exercise content)
 *
 * If curriculum.ts gets a new module, the count assertions break — that is
 * intentional, force the author to acknowledge the bump.
 */
import { describe, expect, it } from 'vitest';

import { buildPlatformContext } from '@/app/data/platformContext';
import { curriculum, getTotalLessons } from '@/app/data/curriculum';

describe('buildPlatformContext — shape', () => {
  it('starts with the deterministic header', () => {
    const out = buildPlatformContext();
    expect(out.startsWith('Terminal Learning — overview\n')).toBe(true);
  });

  it('reports the live module count from curriculum.ts', () => {
    const out = buildPlatformContext();
    expect(out).toContain(`Total modules: ${curriculum.length}`);
  });

  it('reports the live total lesson count from curriculum.ts', () => {
    const out = buildPlatformContext();
    expect(out).toContain(`Total lessons: ${getTotalLessons()}`);
  });

  it('lists exactly the three supported environments', () => {
    const out = buildPlatformContext();
    expect(out).toContain('Available environments: linux, macos, windows');
  });

  it('contains every module title in order', () => {
    const out = buildPlatformContext();
    const lines = out.split('\n');
    const moduleLines = lines.filter((l) => /^ {2}\d+\. /.test(l));
    expect(moduleLines).toHaveLength(curriculum.length);
    for (let i = 0; i < curriculum.length; i++) {
      expect(moduleLines[i]).toContain(curriculum[i].title);
      expect(moduleLines[i]).toMatch(/Level \d, \d+ lessons?/);
    }
  });
});

describe('buildPlatformContext — determinism', () => {
  it('returns the same byte-for-byte string on repeated calls', () => {
    const a = buildPlatformContext();
    const b = buildPlatformContext();
    expect(a).toBe(b);
  });
});

describe('buildPlatformContext — privacy guards', () => {
  // The block ships INSIDE the user message to the LLM. Anything that leaks
  // here gets shipped to whichever provider the learner chose. V1.0.1 is
  // explicit: NO progress, NO PII, NO validator hints. THI-142 V1.5 will
  // re-open this with a new consent bump (ADR-008).
  const out = buildPlatformContext();

  it('does not contain "progress" / "completion" / "score"', () => {
    expect(out).not.toMatch(/progress/i);
    expect(out).not.toMatch(/completion/i);
    expect(out).not.toMatch(/score/i);
  });

  it('does not contain user / email / id / userid / cookie tokens', () => {
    expect(out).not.toMatch(/\buser\b/i);
    expect(out).not.toMatch(/email/i);
    expect(out).not.toMatch(/cookie/i);
    expect(out).not.toMatch(/\buserId\b/i);
  });

  it('does not embed full lesson exercise text', () => {
    // Pick an exercise instruction string from the live curriculum and assert
    // it does not leak into the overview block.
    const firstExercise = curriculum[0]?.lessons[0]?.exercise?.instruction ?? '';
    if (firstExercise.length > 0) {
      expect(out).not.toContain(firstExercise);
    }
  });

  it('does not embed validator function names', () => {
    expect(out).not.toMatch(/validate[A-Z]\w+/);
  });
});

describe('buildPlatformContext — delimiter-injection defense (THI-148 C1)', () => {
  // Defense-in-depth: even though curriculum.ts is dev-controlled today, the
  // prompt-guardrail-auditor C1 finding (2026-05-09) requires escapeDelimiters
  // on every value injected inside <platform_context>. The DELIMITER_RX in
  // sanitizer.ts must include `platform_context` so any malicious title that
  // ever leaks into the curriculum is neutralised before the LLM sees it.

  it('does not contain a raw closing </platform_context> token in the output', () => {
    // Were any future user-influenced title to inject one, escapeDelimiters()
    // would convert it to `&lt;/platform_context&gt;`. The current curriculum
    // contains none, so the assembled payload (which carries the OPEN tag
    // injected by useAiTutor, not by buildPlatformContext) holds zero raw
    // `</platform_context>` produced by buildPlatformContext itself.
    const out = buildPlatformContext();
    expect(out).not.toMatch(/<\/platform_context>/i);
  });

  it('does not contain raw <user_question> / <lesson_context> tokens', () => {
    const out = buildPlatformContext();
    expect(out).not.toMatch(/<\/?user_question>/i);
    expect(out).not.toMatch(/<\/?lesson_context>/i);
  });
});
