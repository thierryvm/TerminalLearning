import { describe, it, expect } from 'vitest';
import {
  TOTAL_LESSONS,
  TOTAL_COMMANDS,
  ACTIVE_ENVIRONMENTS_COUNT,
  MODULE_PREVIEWS,
} from '../app/data/landingContent';
import { curriculum } from '../app/data/curriculum';
import { commandCatalogue } from '../app/data/commandCatalogue';
import { ENVIRONMENTS } from '../app/types/curriculum';

// THI-118 — these constants are hardcoded in `landingContent.ts` so the
// landing chunk does not import `curriculum.ts` / `commandCatalogue.ts`
// (~41 kB gzip). If you add lessons / commands / environments, bump the
// constants. This test fails loudly if they drift.
describe('landingContent — totals drift guard (THI-118)', () => {
  it('TOTAL_LESSONS matches the actual curriculum', () => {
    const computed = curriculum.reduce((sum, mod) => sum + mod.lessons.length, 0);
    expect(TOTAL_LESSONS).toBe(computed);
  });

  it('TOTAL_COMMANDS matches the actual command catalogue', () => {
    const computed = commandCatalogue.reduce(
      (sum, cat) => sum + cat.commands.length,
      0,
    );
    expect(TOTAL_COMMANDS).toBe(computed);
  });

  it('ACTIVE_ENVIRONMENTS_COUNT matches active env list', () => {
    const computed = ENVIRONMENTS.filter((e) => e.status === 'active').length;
    expect(ACTIVE_ENVIRONMENTS_COUNT).toBe(computed);
  });

  // Per-module guard — the landing module CARDS use MODULE_PREVIEWS[].lessonCount,
  // a separate hardcoded array from TOTAL_LESSONS. The hero (TOTAL_LESSONS) was
  // correct (65) but a card (github-collaboration) under-reported (6 vs real 7),
  // so the cards summed to 64 while the hero said 65 — a visible inconsistency a
  // visitor could spot. This guard ties EACH card count to the real curriculum
  // module so a per-module drift fails CI (closes the gap the TOTAL_LESSONS
  // check above did not cover).
  it('every MODULE_PREVIEWS.lessonCount matches its curriculum module', () => {
    for (const preview of MODULE_PREVIEWS) {
      const mod = curriculum.find((m) => m.id === preview.id);
      expect(mod, `MODULE_PREVIEWS id "${preview.id}" has no matching curriculum module`).toBeDefined();
      expect(
        preview.lessonCount,
        `MODULE_PREVIEWS "${preview.id}" lessonCount=${preview.lessonCount} but curriculum has ${mod!.lessons.length}`,
      ).toBe(mod!.lessons.length);
    }
  });

  it('MODULE_PREVIEWS covers every curriculum module (no missing/extra card)', () => {
    const previewIds = MODULE_PREVIEWS.map((p) => p.id).sort();
    const curriculumIds = curriculum.map((m) => m.id).sort();
    expect(previewIds).toEqual(curriculumIds);
  });

  it('sum of MODULE_PREVIEWS.lessonCount equals TOTAL_LESSONS (hero = cards)', () => {
    const cardsSum = MODULE_PREVIEWS.reduce((sum, p) => sum + p.lessonCount, 0);
    expect(cardsSum).toBe(TOTAL_LESSONS);
  });
});
