/**
 * Multi-step exercises (29 September 2026): each step is checked on the
 * terminal state after the command, not on the text typed. The conflict lesson
 * is the reference case: every command and output below was checked against
 * real Git 2.56 in a throwaway repository (merge, checkout --theirs, add,
 * commit --no-edit, and the two ways learners go wrong: `git add` with the
 * markers still in, `git merge --abort`). The Git module's expected outputs
 * (`branch -d` refused before the merge, a staged file carried along by
 * `git switch`, an empty `git diff` after `git add`) come from the same kind of
 * sandbox, run on 30 September 2026.
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

describe('the Git module, step by step', () => {
  it('git init: the repository lands in the project folder, not in ~', () => {
    const t = session(find('git', 'git-init'));
    const wrong = t.type('git init');
    expect(wrong.index).toBe(0);
    expect(wrong.messages[0].text).toMatch(/^⚠ git init vient de créer un dépôt dans votre dossier personnel/);
    const right = session(find('git', 'git-init'));
    right.type('mkdir mon-projet');
    right.type('cd mon-projet');
    const init = right.type('git init');
    expect(init.output).toEqual(['Initialized empty Git repository in /home/user/mon-projet/.git/']);
    expect(init.completed).toBe(true);
  });

  it('git add & commit: any way of staging everything counts (git add -A)', () => {
    const t = session(find('git', 'git-add-commit'));
    t.type('git status');
    expect(t.type('git add -A').index).toBe(2);
    expect(t.type('git commit -m "feat: premier commit"').completed).toBe(true);
  });

  it('git add & commit: committing nothing staged does not count', () => {
    const t = session(find('git', 'git-add-commit'));
    t.type('git status');
    const commit = t.type('git commit -m "feat: premier commit"');
    expect(commit.index).toBe(1);
  });

  it('git diff: after git add, only the staged diff shows the change (--cached is the same)', () => {
    const t = session(find('git', 'git-diff-gitignore'));
    t.type('git diff');
    t.type('git add README.md');
    // Real git: nothing left between the files and the staging area.
    const plain = t.type('git diff');
    expect(plain.output).toEqual([]);
    expect(plain.index).toBe(2);
    expect(t.type('git diff --cached').index).toBe(3);
    expect(t.type('git commit -m "docs: précise le README"').completed).toBe(true);
  });

  it('git branch: switch -c works too, and back on main the committed file is gone', () => {
    const t = session(find('git', 'git-branch'));
    expect(t.type('git switch -c feature/ma-feature').index).toBe(1);
    t.type('echo "Nouvelle fonctionnalité" > feature.txt');
    t.type('git add feature.txt');
    t.type('git commit -m "feat: ajoute feature.txt"');
    const back = t.type('git switch main');
    expect(back.output).toEqual(["Switched to branch 'main'"]);
    expect(back.completed).toBe(true);
    expect(t.type('ls').output).toEqual(['README.md  index.html  script.sh']);
  });

  it('git branch: a file left uncommitted follows the learner back to main, so it does not count', () => {
    const t = session(find('git', 'git-branch'));
    t.type('git checkout -b feature/ma-feature');
    t.type('echo "Nouvelle fonctionnalité" > feature.txt');
    t.type('git add feature.txt');
    const back = t.type('git switch main');
    // Real git names the staged file it carries along.
    expect(back.output).toEqual(['A\tfeature.txt', "Switched to branch 'main'"]);
    expect(back.index).toBe(3);
  });

  it('git merge: deleting the branch before merging is refused by Git and does not count', () => {
    const t = session(find('git', 'git-merge'));
    const early = t.type('git branch -d feature/ma-feature');
    expect(early.output).toEqual([
      "error: the branch 'feature/ma-feature' is not fully merged",
      "hint: If you are sure you want to delete it, run 'git branch -D feature/ma-feature'",
      'hint: Disable this message with "git config set advice.forceDeleteBranch false"',
    ]);
    expect(early.index).toBe(0);
    t.type('git merge feature/ma-feature');
    expect(t.type('git branch -d feature/ma-feature').completed).toBe(true);
  });
});

// A learner who types the commands in another order must never be stuck:
// either a later command still completes the steps, or the terminal says what to do.
describe('the Git module, out of order', () => {
  it('git init in ~ after mkdir is flagged at the cd step too', () => {
    const t = session(find('git', 'git-init'));
    t.type('mkdir mon-projet');
    const wrong = t.type('git init');
    expect(wrong.index).toBe(1);
    expect(wrong.messages[0].text).toMatch(/^⚠ git init vient de créer un dépôt dans votre dossier personnel/);
  });

  it('first commit: add and commit before looking, then git status still completes it', () => {
    const t = session(find('git', 'git-add-commit'));
    expect(t.type('git add .').index).toBe(0);
    expect(t.type('git commit -m "feat: premier commit"').index).toBe(0);
    expect(t.type('git status').completed).toBe(true);
  });

  it('diff: after git add, git diff shows nothing and the terminal points to --staged', () => {
    const t = session(find('git', 'git-diff-gitignore'));
    t.type('git add README.md');
    const empty = t.type('git diff');
    expect(empty.output).toEqual([]);
    expect(empty.messages[0].text).toMatch(/^⚠ README\.md est déjà préparé .* git diff --staged montre le changement\.$/);
    expect(t.type('git diff --staged').index).toBe(3);
    expect(t.type('git commit -m "docs: précise le README"').completed).toBe(true);
  });

  it('diff: git commit -a first, then git show completes it', () => {
    const t = session(find('git', 'git-diff-gitignore'));
    const commit = t.type('git commit -am "docs: précise le README"');
    expect(commit.index).toBe(0);
    expect(commit.messages[0].text).toMatch(/^⚠ La modification est déjà commitée .* git show affiche le diff du dernier commit\.$/);
    expect(t.type('git show').completed).toBe(true);
  });

  it('branch: the staged file carried to main gets advice, and following it completes the exercise', () => {
    const t = session(find('git', 'git-branch'));
    t.type('git checkout -b feature/ma-feature');
    t.type('echo "Nouvelle fonctionnalité" > feature.txt');
    t.type('git add feature.txt');
    const carried = t.type('git switch main');
    expect(carried.messages[0].text).toMatch(/^⚠ feature\.txt est préparé mais pas encore commité, et vous êtes sur main\. Revenez avec git switch feature\/ma-feature/);
    t.type('git switch feature/ma-feature');
    expect(t.type('git commit -m "feat: ajoute feature.txt"').index).toBe(4);
    expect(t.type('git switch main').completed).toBe(true);
  });

  it('branch: a commit made on main by mistake is flagged', () => {
    const t = session(find('git', 'git-branch'));
    t.type('git checkout -b feature/ma-feature');
    t.type('git switch main');
    t.type('echo "Nouvelle fonctionnalité" > feature.txt');
    t.type('git add feature.txt');
    const onMain = t.type('git commit -m "feat: ajoute feature.txt"');
    expect(onMain.index).toBe(3);
    expect(onMain.messages[0].text).toMatch(/^⚠ Ce commit est parti sur main/);
  });

  it('merge: git branch -D before the merge is flagged', () => {
    const t = session(find('git', 'git-merge'));
    const gone = t.type('git branch -D feature/ma-feature');
    expect(gone.output[0]).toMatch(/^Deleted branch feature\/ma-feature \(was [0-9a-f]{7}\)\.$/);
    expect(gone.messages[0].text).toMatch(/^⚠ La branche feature\/ma-feature n'existe plus \(supprimée avec -D, ou renommée\)/);
  });

  it('branch: feature.txt committed on main before the branch exists is flagged', () => {
    const t = session(find('git', 'git-branch'));
    t.type('echo "Nouvelle fonctionnalité" > feature.txt');
    t.type('git add feature.txt');
    const early = t.type('git commit -m "feat: ajoute feature.txt"');
    expect(early.index).toBe(0);
    expect(early.messages[0].text).toMatch(/^⚠ feature\.txt vient d'être commité sur main, avant la création de la branche/);
  });

  it('diff: a change discarded with git restore is flagged', () => {
    const t = session(find('git', 'git-diff-gitignore'));
    const restored = t.type('git restore README.md');
    expect(restored.index).toBe(0);
    expect(restored.messages[0].text).toMatch(/^⚠ La modification de README\.md a été annulée/);
  });
});

/**
 * The GitHub module (1 October 2026). The outputs asserted here ("fetch first",
 * the divergent-branches refusal, `push -u` on a branch already pushed) were
 * checked against real Git 2.56 with a bare repository and two clones.
 */
describe('the GitHub module, out of order', () => {
  const remote = () => session(find('github-collaboration', 'git-remote'));
  const pushPull = () => session(find('github-collaboration', 'git-push-pull'));

  it('remote: set-url before looking, then git remote -v completes it', () => {
    const t = remote();
    expect(t.type('git remote add origin https://github.com/user/mon-projet.git').index).toBe(1);
    expect(t.type('git remote set-url origin git@github.com:user/mon-projet.git').index).toBe(1);
    expect(t.type('git remote -v').completed).toBe(true);
  });

  it('remote: a remote with another name is flagged, and renaming it to origin counts', () => {
    const t = remote();
    const other = t.type('git remote add github https://github.com/user/mon-projet.git');
    expect(other.index).toBe(0);
    expect(other.messages[0].text).toBe('⚠ Ce remote s\'appelle github, pas origin. Renommez-le avec git remote rename github origin');
    expect(t.type('git remote rename github origin').index).toBe(1);
  });

  it('remote: removing origin starts over at step 1', () => {
    const t = remote();
    t.type('git remote add origin https://github.com/user/mon-projet.git');
    const removed = t.type('git remote remove origin');
    expect(removed.index).toBe(0);
    expect(removed.messages[0].text).toMatch(/^↺ Le remote origin n'existe plus/);
    expect(t.type('git remote add origin https://github.com/user/mon-projet.git').index).toBe(1);
  });

  it('push & pull: pushing first is refused (fetch first), and the terminal says to pull', () => {
    const t = pushPull();
    const push = t.type('git push');
    expect(push.output[1]).toBe(' ! [rejected]        main -> main (fetch first)');
    expect(push.index).toBe(0);
    expect(push.messages[0].text).toMatch(/^⚠ GitHub refuse votre push : .* git pull\.$/);
    expect(t.type('git pull').index).toBe(1);
  });

  it('push & pull: committing before pulling diverges, and the advice (--no-rebase --no-edit) gets the learner out', () => {
    const t = pushPull();
    t.type('echo "Contact" > contact.html');
    t.type('git add contact.html');
    expect(t.type('git commit -m "feat: ajoute la page contact"').index).toBe(0);
    expect(t.type('git push').messages[0].text).toMatch(/divergé\. Fusionnez-les avec git pull --no-rebase --no-edit/);
    const pull = t.type('git pull');
    expect(pull.output.slice(-1)[0]).toBe('fatal: Need to specify how to reconcile divergent branches.');
    expect(pull.messages[0].text).toMatch(/git pull --no-rebase --no-edit/);
    expect(t.type('git pull --no-rebase --no-edit').index).toBe(4);
    expect(t.type('git push').completed).toBe(true);
  });

  it('fetch & clone: git pull does fetch and merge at once, and completes the exercise', () => {
    expect(session(find('github-collaboration', 'git-fetch-clone')).type('git pull').completed).toBe(true);
  });

  it('fetch & clone: merging without looking first still completes it', () => {
    const t = session(find('github-collaboration', 'git-fetch-clone'));
    expect(t.type('git fetch').index).toBe(1);
    expect(t.type('git merge origin/main').completed).toBe(true);
  });

  it('pull requests: a push without -u is flagged, and pushing again with -u completes it', () => {
    const t = session(find('github-collaboration', 'pull-requests'));
    t.type('git checkout -b feature/contact');
    t.type('echo "Contact" > contact.html');
    t.type('git add contact.html');
    expect(t.type('git commit -m "feat: ajoute la page contact"').index).toBe(4);
    const bare = t.type('git push origin feature/contact');
    expect(bare.index).toBe(4);
    expect(bare.messages[0].text).toMatch(/^⚠ La branche est sur GitHub, mais votre copie ne la suit pas .* git push -u origin feature\/contact$/);
    const again = t.type('git push -u origin feature/contact');
    expect(again.output).toEqual(['Everything up-to-date', "branch 'feature/contact' set up to track 'origin/feature/contact'."]);
    expect(again.completed).toBe(true);
  });

  it('pull requests: the page committed on main before the branch is flagged', () => {
    const t = session(find('github-collaboration', 'pull-requests'));
    t.type('echo "Contact" > contact.html');
    t.type('git add contact.html');
    const early = t.type('git commit -m "feat: ajoute la page contact"');
    expect(early.index).toBe(0);
    expect(early.messages[0].text).toMatch(/^⚠ contact\.html vient d'être commité sur main/);
  });

  it('merge strategies: a fast-forward is flagged, since nothing is left to merge', () => {
    const t = session(find('github-collaboration', 'merge-strategies'));
    const ff = t.type('git merge feature/ma-feature');
    expect(ff.output[1]).toBe('Fast-forward');
    expect(ff.index).toBe(0);
    expect(ff.messages[0].text).toMatch(/^⚠ Git a avancé main sans commit de fusion/);
    expect(t.type('git merge --no-ff --no-edit feature/ma-feature').output).toEqual(['Already up to date.']);
  });

  it('merge strategies: --squash staged blocks the merge (as in git 2.56), and the terminal says to start over', () => {
    const t = session(find('github-collaboration', 'merge-strategies'));
    const squash = t.type('git merge --squash feature/ma-feature');
    expect(squash.output[2]).toBe('Squash commit -- not updating HEAD');
    expect(squash.messages[0].text).toMatch(/^⚠ --squash a préparé le travail de la branche sans fusionner/);
    expect(t.type('git merge --no-ff --no-edit feature/ma-feature').output[0])
      .toBe('error: Your local changes to the following files would be overwritten by merge:');
  });

  it('merge strategies: --squash committed is flagged, and the advised merge --no-ff still completes it', () => {
    const t = session(find('github-collaboration', 'merge-strategies'));
    t.type('git merge --squash feature/ma-feature');
    const committed = t.type('git commit -m "feat: ajoute la page ma-feature (#42)"');
    expect(committed.index).toBe(0);
    expect(committed.messages[0].text).toMatch(/^⚠ Ce commit vient de --squash/);
    // git 2.56: the branch tip is not in main yet, so --no-ff makes a real merge commit.
    expect(t.type('git merge --no-ff --no-edit feature/ma-feature')).toMatchObject({ index: 1, output: ["Merge made by the 'ort' strategy."] });
  });

  it('merge strategies: undoing the merge with git reset --hard starts over at step 1', () => {
    const t = session(find('github-collaboration', 'merge-strategies'));
    t.type('git merge --no-ff --no-edit feature/ma-feature');
    const undone = t.type('git reset --hard HEAD~1');
    expect(undone.output).toEqual(['HEAD is now at a3f8c12 feat: premier commit du projet']);
    expect(undone.index).toBe(0);
    expect(undone.messages[0].text).toMatch(/^↺ La fusion a été annulée/);
    expect(t.type('git merge --no-ff --no-edit feature/ma-feature').index).toBe(1);
  });

  it('push & pull: git pull --ff-only on diverged branches gets the same advice', () => {
    const t = pushPull();
    t.type('echo "Contact" > contact.html');
    t.type('git add contact.html');
    t.type('git commit -m "feat: ajoute la page contact"');
    const ffOnly = t.type('git pull --ff-only');
    expect(ffOnly.output.slice(-1)[0]).toBe('fatal: Not possible to fast-forward, aborting.');
    expect(ffOnly.messages[0].text).toMatch(/git pull --no-rebase --no-edit/);
  });

  it('merge strategies: without --no-edit the merge commit counts too', () => {
    const t = session(find('github-collaboration', 'merge-strategies'));
    expect(t.type('git merge --no-ff feature/ma-feature').index).toBe(1);
    expect(t.type('git branch -d feature/ma-feature').completed).toBe(true);
  });

  it('actions: mv before mkdir fails and changes nothing, then the steps go on', () => {
    const t = session(find('github-collaboration', 'github-actions'));
    const early = t.type('mv ci.yml .github/workflows/');
    expect(early.output).toEqual(["mv: cannot move 'ci.yml' to '.github/workflows/': No such file or directory"]);
    expect(early.messages).toEqual([]);
    expect(t.type('mkdir -p .github/workflows').index).toBe(1);
    expect(t.type('mv ci.yml .github/workflows/').index).toBe(2);
    expect(t.type('git add .').index).toBe(3);
  });

  it('actions: ci.yml renamed to .github/workflows (no such folder yet) is flagged', () => {
    const t = session(find('github-collaboration', 'github-actions'));
    t.type('mkdir .github');
    const renamed = t.type('mv ci.yml .github/workflows');
    expect(renamed.index).toBe(0);
    expect(renamed.messages[0].text).toMatch(/^⚠ ci\.yml n'est plus à la racine ni dans \.github\/workflows\//);
  });

  it('actions: on Windows, New-Item creates .github too and Move-Item moves the workflow in', () => {
    const t = session(find('github-collaboration', 'github-actions'), 'windows');
    expect(t.type('New-Item -ItemType Directory .github\\workflows').index).toBe(1);
    expect(t.type('Move-Item ci.yml .github\\workflows\\').index).toBe(2);
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
