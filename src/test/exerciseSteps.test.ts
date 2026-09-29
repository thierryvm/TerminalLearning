/**
 * Multi-step exercises (29 September 2026): each step is checked on the
 * terminal state after the command, not on the text typed. The conflict lesson
 * is the reference case: every command and output below was checked against
 * real Git 2.56 in a throwaway repository (merge, checkout --theirs, add,
 * commit --no-edit, and the two ways learners go wrong: `git add` with the
 * markers still in, `git merge --abort`).
 */
import { describe, it, expect } from 'vitest';
import { curriculum, type EnvId, type Exercise } from '../app/data/curriculum';
import { createInitialState, processCommand, type TerminalState } from '../app/data/terminalEngine';
import { exerciseSteps, exerciseTexts, hasConflictMarkers, progressExercise, type StepProgress } from '../app/data/exerciseSteps';

const find = (moduleId: string, lessonId: string): Exercise =>
  curriculum.find((m) => m.id === moduleId)!.lessons.find((l) => l.id === lessonId)!.exercise!;

/** A lesson terminal: type commands one by one, as LessonPage does, and keep every step result. */
function session(exercise: Exercise, env: EnvId = 'linux') {
  let state: TerminalState = createInitialState();
  if (exercise.setup) state = exercise.setup.apply(state, env);
  let step = 0;
  return {
    type(command: string): StepProgress & { output: string[] } {
      const out = processCommand(state, command, env);
      const progress = progressExercise(exercise, step, { command, env, state: out.newState, prevState: state, lines: out.lines });
      state = out.newState;
      step = progress.index;
      return { ...progress, output: out.lines.map((l) => l.text) };
    },
    get step() { return step; },
  };
}

const conflicts = find('github-collaboration', 'conflicts');

describe('the conflict lesson, step by step', () => {
  it('has five steps', () => expect(exerciseSteps(conflicts)).toHaveLength(5));

  it('walks the learner through a real resolution, announcing each next step', () => {
    const t = session(conflicts);
    const merge = t.type('git merge feature/nouvelle-feature');
    expect(merge.output).toContain('CONFLICT (content): Merge conflict in index.html');
    expect(merge.messages.map((m) => m.text)).toEqual([
      '✓ Étape 1/5 réussie.',
      expect.stringMatching(/^Étape 2\/5 : Regardez ce que Git a écrit/),
    ]);
    expect(t.type('cat index.html').index).toBe(2);
    expect(t.type('git checkout --theirs index.html').index).toBe(3);
    expect(t.type('git add index.html').index).toBe(4);
    const commit = t.type('git commit --no-edit');
    expect(commit.output[0]).toMatch(/^\[main [0-9a-f]{7}\] Merge branch 'feature\/nouvelle-feature'$/);
    expect(commit.completed).toBe(true);
    expect(commit.messages[0]).toEqual({ type: 'success', text: `✓ Exercice réussi ! ${conflicts.successMessage}` });
  });

  it('does not count a command that leaves the goal unreached', () => {
    const t = session(conflicts);
    expect(t.type('git status').index).toBe(0);
    t.type('git merge feature/nouvelle-feature');
    // `git log` shows no <title>: the learner has not looked at the file yet.
    expect(t.type('git log --oneline').index).toBe(1);
    // A file that does not exist prints an error, and an error never counts.
    expect(t.type('cat index.htm').index).toBe(1);
  });

  it('warns about `git add` with the markers still in, and the advice gets the learner out', () => {
    const t = session(conflicts);
    t.type('git merge feature/nouvelle-feature');
    t.type('cat index.html');
    const add = t.type('git add index.html');
    expect(add.index).toBe(2);
    expect(add.messages).toHaveLength(1);
    expect(add.messages[0].text).toMatch(/^⚠ index\.html contient encore les marqueurs/);
    expect(add.messages[0].text).toContain('git checkout feature/nouvelle-feature -- index.html');
    // Real git after that add: `checkout --theirs` finds no "their" version any more.
    expect(t.type('git checkout --theirs index.html').output).toEqual(['Updated 0 paths from the index']);
    // The advised command restores the file and stages it: steps 3 and 4 at once.
    const fix = t.type('git checkout feature/nouvelle-feature -- index.html');
    expect(fix.output).toEqual([]);
    expect(fix.index).toBe(4);
    expect(fix.messages[0].text).toBe('✓ Étapes 3 à 4 sur 5 réussies.');
    expect(t.type('git commit --no-edit').completed).toBe(true);
  });

  it('starts over after `git merge --abort`, and the merge can be redone', () => {
    const t = session(conflicts);
    t.type('git merge feature/nouvelle-feature');
    t.type('cat index.html');
    const abort = t.type('git merge --abort');
    expect(abort.index).toBe(0);
    expect(abort.messages[0].text).toMatch(/^↺ La fusion a été annulée \(git merge --abort\)/);
    expect(abort.messages[1].text).toMatch(/^Étape 1\/5 : /);
    expect(t.type('git merge feature/nouvelle-feature').index).toBe(1);
  });

  it('never completes on a merge commit that recorded the markers', () => {
    const t = session(conflicts);
    t.type('git merge feature/nouvelle-feature');
    t.type('cat index.html');
    t.type('git add index.html');
    const commit = t.type('git commit --no-edit');
    expect(commit.completed).toBe(false);
    expect(commit.index).toBe(0);
    expect(commit.messages[0].text).toContain('« Réinitialiser »');
  });

  it('reads the same on Windows, with Get-Content', () => {
    const t = session(conflicts, 'windows');
    for (const cmd of ['git merge feature/nouvelle-feature', 'Get-Content index.html', 'git checkout --theirs index.html', 'git add index.html']) t.type(cmd);
    expect(t.type('git commit --no-edit').completed).toBe(true);
    expect(exerciseTexts(conflicts, 'windows').join(' ')).toContain('Get-Content index.html');
  });
});

describe('one-command exercises', () => {
  it('are a single step, done by the command the lesson asks for', () => {
    const pwd = find('navigation', 'pwd');
    expect(exerciseSteps(pwd)).toHaveLength(1);
    const done = session(pwd).type('pwd');
    expect(done.completed).toBe(true);
    expect(done.messages).toEqual([{ type: 'success', text: `✓ Exercice réussi ! ${pwd.successMessage}` }]);
  });

  it('are not done by the right command when it fails', () => {
    // validateRm accepts the command, but from ~/documents the path leads nowhere: rm prints an error.
    const t = session(find('fichiers', 'rm'));
    t.type('cd documents');
    const failed = t.type('rm documents/notes.txt');
    expect(failed.output).toEqual(["rm: cannot remove 'documents/notes.txt': No such file or directory"]);
    expect(failed.completed).toBe(false);
  });

  it('say nothing more once done', () => {
    const t = session(find('navigation', 'pwd'));
    t.type('pwd');
    expect(t.type('pwd')).toMatchObject({ completed: false, messages: [] });
  });
});

describe('hasConflictMarkers', () => {
  it('finds the markers only at the start of a line', () => {
    expect(hasConflictMarkers('a\n<<<<<<< HEAD\nb')).toBe(true);
    expect(hasConflictMarkers('=======')).toBe(true);
    expect(hasConflictMarkers('>>>>>>> feature/x')).toBe(true);
    expect(hasConflictMarkers('x <<<<<<< y')).toBe(false);
    expect(hasConflictMarkers('========')).toBe(false);
  });
});
