/**
 * How an exercise advances, command after command. Shared by LessonPage and the
 * lesson tests, so what a test replays is what a learner lives.
 *
 * A one-command exercise is a single step. A multi-step exercise checks each
 * step on the terminal state after the command (a merge in progress, a file
 * without conflict markers), so any way of reaching the result counts, and a
 * command that failed never does.
 */
import type { EnvId, Exercise, ExerciseCheckContext, ExerciseStep } from './curriculum';
import type { OutputLine, TerminalState } from './commands/types';
import { nodeAt } from './commands/gitTree';
import { isAncestor } from './commands/gitHistory';
import { exerciseAccepts, type ValidateFn } from './validators';

/** The command printed an error line: it did not do its job. */
export const printedError = (lines: OutputLine[]): boolean => lines.some((l) => l.type === 'error');

/** The learner accepted by `validate`, and the command ran without error. */
export const stepAccepts = (validate: ValidateFn, { command, env, lines }: ExerciseCheckContext): boolean =>
  exerciseAccepts(validate, command, env) && !printedError(lines);

/** `path` is `~/<segments>` (the same path on every environment). */
const isHomePath = (state: TerminalState, path: string[] | undefined, segments: string[]): boolean =>
  path !== undefined &&
  (path.join('/') === ['home', state.user, ...segments].join('/') || path.join('/') === ['home', 'user', ...segments].join('/'));

/** The shell stands in `~/<segments>`. */
export const inHomeDir = (state: TerminalState, ...segments: string[]): boolean => isHomePath(state, state.cwd, segments);

/** `~/<segments>` is a directory. */
export const homeDirExists = (state: TerminalState, ...segments: string[]): boolean =>
  nodeAt(state.root, ['home', 'user', ...segments])?.type === 'directory';

/** A Git repository was initialised in `~/<segments>` (no segment: in `~` itself). */
export const repoInHomeDir = (state: TerminalState, ...segments: string[]): boolean =>
  Boolean(state.git?.initialized) && isHomePath(state, state.git?.repoPath, segments);

/** What a command printed, as one text. */
export const printed = (lines: OutputLine[]): string => lines.map((l) => l.text).join('\n');

/**
 * A file of the working tree, by its path in the repository (or from the
 * current directory without one), as git reads it: the simulator stores text
 * without its final newline, git's `head` and `index` keep it. So the result
 * compares directly with them.
 */
export function repoFile(state: TerminalState, path: string): string | null {
  const base = state.git?.repoPath ?? state.cwd;
  const node = nodeAt(state.root, [...base, ...path.split('/')]);
  if (node?.type !== 'file') return null;
  return node.content ? `${node.content}\n` : '';
}

/** What the remote itself holds for `ref` (`origin/main`): a push or a colleague put it there, a fetch is not needed. */
export function onServer(state: TerminalState, ref: string): string | undefined {
  const git = state.git;
  return (git?.remoteServer ?? git?.remoteRefs ?? {})[ref];
}

/** The local `branch` contains the commit `hash` (it is the tip or one of its ancestors). */
export function branchContains(state: TerminalState, branch: string, hash: string | undefined): boolean {
  const tip = state.git?.refs?.[branch];
  return Boolean(hash && tip && isAncestor(state.git?.objects ?? {}, hash, tip));
}

/** The remote holds `branch` exactly as it is here: everything is pushed. */
export function pushed(state: TerminalState, branch: string, remote = 'origin'): boolean {
  const tip = state.git?.refs?.[branch];
  return Boolean(tip) && onServer(state, `${remote}/${branch}`) === tip;
}

/** Git's conflict markers, each at the start of a line. */
export const hasConflictMarkers = (text: string): boolean => /^(<{7}|={7}|>{7})( |$)/m.test(text);

/** Every exercise as a list of steps: a one-command exercise is a single step. */
export function exerciseSteps(exercise: Exercise): ExerciseStep[] {
  if (exercise.steps) return exercise.steps;
  const { validate } = exercise;
  return [{
    instruction: exercise.instruction,
    instructionByEnv: exercise.instructionByEnv,
    hint: exercise.hint,
    hintByEnv: exercise.hintByEnv,
    check: (ctx) => stepAccepts(validate, ctx),
  }];
}

export const stepInstruction = (step: ExerciseStep, env: EnvId): string => step.instructionByEnv?.[env] ?? step.instruction;
export const stepHint = (step: ExerciseStep, env: EnvId): string => step.hintByEnv?.[env] ?? step.hint;

/** Everything the learner of `env` reads about the exercise: instructions and hints, of every step. */
export function exerciseTexts(exercise: Exercise, env: EnvId): string[] {
  const own = [exercise.instructionByEnv?.[env] ?? exercise.instruction, exercise.hintByEnv?.[env] ?? exercise.hint];
  if (!exercise.steps) return own;
  return [...own, ...exercise.steps.flatMap((s) => [stepInstruction(s, env), stepHint(s, env)])];
}

export interface StepProgress {
  /** The step to do next; `steps.length` once the exercise is done. */
  index: number;
  /** This command finished the exercise. */
  completed: boolean;
  /** What the terminal prints after the command's own output (inline markdown kept). */
  messages: OutputLine[];
}

/**
 * Where the exercise stands after one command. A command can complete several
 * steps at once when their results are already there (`git commit -a` both
 * stages and commits), but never skips a step whose result is missing.
 */
export function progressExercise(exercise: Exercise, index: number, ctx: ExerciseCheckContext): StepProgress {
  const steps = exerciseSteps(exercise);
  const total = steps.length;
  if (index >= total) return { index, completed: false, messages: [] };
  const announce = (i: number): OutputLine => ({ type: 'info', text: `Étape ${i + 1}/${total} : ${stepInstruction(steps[i], ctx.env)}` });

  const why = index > 0 ? exercise.restart?.(ctx) : undefined;
  if (why) return { index: 0, completed: false, messages: [{ type: 'info', text: `↺ ${why}` }, announce(0)] };

  let next = index;
  while (next < total && steps[next].check(ctx)) next++;

  if (next === index) {
    const warning = steps[index].warn?.(ctx);
    return { index, completed: false, messages: warning ? [{ type: 'info', text: `⚠ ${warning}` }] : [] };
  }
  if (next === total) {
    return { index: next, completed: true, messages: [{ type: 'success', text: `✓ Exercice réussi ! ${exercise.successMessage}` }] };
  }
  const done = next - index === 1 ? `✓ Étape ${next}/${total} réussie.` : `✓ Étapes ${index + 1} à ${next} sur ${total} réussies.`;
  return { index: next, completed: false, messages: [{ type: 'success', text: done }, announce(next)] };
}
