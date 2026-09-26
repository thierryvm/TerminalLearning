/**
 * Theory ↔ terminal (THI-353). Every terminal session a lesson shows in a code
 * block is replayed in the engine, from the lesson's own starting state
 * (Exercise.setup), in the environment the learner picked. The output the
 * lesson displays must be what the terminal prints (replay: lessonTheoryReplay.ts).
 *
 * Gaps that remain are listed in lessonTheoryGaps.ts — a ratchet: a new gap
 * fails this suite, and a listed gap that gets fixed fails it too until its
 * entry is removed, so the list can only shrink. After a fix, regenerate the
 * list with `npm run theory:gaps` (it refuses to add entries).
 */
import { describe, it, expect } from 'vitest';
import { KNOWN_THEORY_GAPS, BASH_SHOWN_ON_WINDOWS_MAX } from './lessonTheoryGaps';
import { replayTheory, failingKeys, bashOnWindowsLessons } from './lessonTheoryReplay';

const rows = replayTheory();
const failing = failingKeys(rows);

describe('lesson theory ↔ terminal', () => {
  it('replays a meaningful number of theory commands', () => {
    expect(rows.length).toBeGreaterThan(700);
  });

  it('prints what each lesson shows — no new gap', () => {
    const unexpected = [...failing].filter((k) => !KNOWN_THEORY_GAPS.has(k));
    expect(unexpected, 'Fix the engine or the lesson; do not add to lessonTheoryGaps.ts unless the fix is planned').toEqual([]);
  });

  it('the list of known gaps only shrinks', () => {
    const fixed = [...KNOWN_THEORY_GAPS].filter((k) => !failing.has(k));
    expect(fixed, 'These now match: run `npm run theory:gaps` to remove them').toEqual([]);
  });

  it('bash examples shown to Windows learners never increase', () => {
    const lessons = bashOnWindowsLessons(rows);
    expect(lessons.size, `Now ${lessons.size}: run \`npm run theory:gaps\` to lower BASH_SHOWN_ON_WINDOWS_MAX`).toBe(BASH_SHOWN_ON_WINDOWS_MAX);
  });
});
