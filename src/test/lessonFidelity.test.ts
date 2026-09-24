/**
 * Lesson fidelity — P1 of the check-up (23 September 2026).
 *
 * For every lesson × environment, typing what the lesson tells the learner to
 * type must (1) complete the exercise AND (2) print no error. Before this test,
 * 46 of 198 combinations validated while the terminal showed a red error line:
 * the validator only reads the command string, never the engine output
 * (TerminalEmulator → onCommand(command, state)).
 *
 * The terminal state each case starts from is the one LessonPage builds:
 * createInitialState(), then the exercise's optional `setup`.
 *
 * KNOWN_DESYNCS is a ratchet, not an allowlist: each entry runs as `it.fails`,
 * so fixing one turns this suite red until the entry is removed. It may only
 * shrink.
 */
import { describe, it, expect } from 'vitest';
import { curriculum, type EnvId } from '../app/data/curriculum';
import { createInitialState, processCommand, type TerminalState } from '../app/data/terminalEngine';
import { LESSON_SOLUTIONS } from './lessonSolutions';

const ENVS: EnvId[] = ['linux', 'macos', 'windows'];

/**
 * Cases still broken in the engine — each one names the P1 cluster that fixes it.
 * Empty since the shell layer (redirections, THI-353): keep it empty. A new entry
 * is only acceptable for a gap found by this test, with the fix already planned.
 */
const KNOWN_DESYNCS = new Set<string>([]);

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

const cases = curriculum.flatMap((m) =>
  m.lessons
    .filter((l) => l.exercise)
    .flatMap((l) => ENVS.map((env) => ({ key: `${m.id}/${l.id}`, env, exercise: l.exercise! }))),
);

describe('lesson solutions table', () => {
  it('covers every lesson that has an exercise, and nothing else', () => {
    const keys = [...new Set(cases.map((c) => c.key))].sort();
    expect(Object.keys(LESSON_SOLUTIONS).sort()).toEqual(keys);
  });

  it.each(cases)('$key [$env] — every solution command is written in the lesson', ({ key, env, exercise }) => {
    const solution = LESSON_SOLUTIONS[key][env] ?? LESSON_SOLUTIONS[key].all;
    expect(solution, `no solution for ${key} [${env}]`).toBeDefined();
    const shown = norm(
      `${exercise.instructionByEnv?.[env] ?? exercise.instruction} ${exercise.hintByEnv?.[env] ?? exercise.hint}`,
    );
    for (const cmd of solution!) expect(shown).toContain(norm(cmd));
  });

  it('only lists known desyncs that exist', () => {
    const all = new Set(cases.map((c) => `${c.key} [${c.env}]`));
    for (const k of KNOWN_DESYNCS) expect(all.has(k), k).toBe(true);
  });
});

describe('lesson fidelity — the lesson command validates and prints no error', () => {
  for (const { key, env, exercise } of cases) {
    const id = `${key} [${env}]`;
    const run = KNOWN_DESYNCS.has(id) ? it.fails : it;
    run(id, () => {
      const solution = LESSON_SOLUTIONS[key][env] ?? LESSON_SOLUTIONS[key].all ?? [];
      let state: TerminalState = createInitialState();
      if (exercise.setup) state = exercise.setup.apply(state);
      const errors: string[] = [];
      for (const cmd of solution) {
        const out = processCommand(state, cmd, env);
        state = out.newState;
        for (const line of out.lines) if (line.type === 'error') errors.push(`${cmd} → ${line.text}`);
      }
      expect(errors).toEqual([]);
      expect(exercise.validate(solution[solution.length - 1], env)).toBe(true);
    });
  }
});
