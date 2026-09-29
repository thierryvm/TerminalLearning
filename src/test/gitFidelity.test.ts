/**
 * The simulated git against real git. Every expected value below was printed
 * by Git 2.56 (Git for Windows, `core.autocrlf false`) on a copy of the
 * lesson's ~/projets, on 30 September 2026, with the files ending in a
 * newline as the simulator assumes. Tabs are real tabs.
 */
import { describe, it, expect } from 'vitest';
import { createInitialState, processCommand } from '../app/data/terminalEngine';
import type { TerminalEnv, TerminalState } from '../app/data/commands/types';
import { gitRepoEmpty, gitRepoWithChange, gitRepoWithCommit } from '../app/data/lessonSetup';
import { blobId, diffLines, ignoredBy, parseIgnore, splitLines, unifiedHunks } from '../app/data/commands/gitTree';

function run(state: TerminalState, commands: string[], env: TerminalEnv = 'linux') {
  let s = state;
  let last = processCommand(s, 'true', env);
  for (const c of commands) {
    last = processCommand(s, c, env);
    s = last.newState;
  }
  return last;
}
const texts = (r: { lines: { text: string }[] }) => r.lines.map((l) => l.text);

describe('git status, add and commit on the lesson repository', () => {
  it('lists untracked files, the .gitignore hiding .env', () => {
    const r = run(gitRepoEmpty.apply(createInitialState()), ['git status']);
    expect(texts(r)).toEqual([
      'On branch main', '', 'No commits yet', '',
      'Untracked files:',
      '  (use "git add <file>..." to include in what will be committed)',
      '\t.gitignore', '\tREADME.md', '\tindex.html', '\tscript.sh', '',
      'nothing added to commit but untracked files present (use "git add" to track)',
    ]);
  });

  it('git add . prints nothing, then status lists the new files', () => {
    const r = run(gitRepoEmpty.apply(createInitialState()), ['git add .', 'git status']);
    expect(texts(r)).toEqual([
      'On branch main', '', 'No commits yet', '',
      'Changes to be committed:',
      '  (use "git rm --cached <file>..." to unstage)',
      '\tnew file:   .gitignore', '\tnew file:   README.md', '\tnew file:   index.html', '\tnew file:   script.sh', '',
    ]);
    expect(run(gitRepoEmpty.apply(createInitialState()), ['git add .']).lines).toEqual([]);
  });

  it('the first commit is a root commit with its stats and file modes', () => {
    const r = run(gitRepoEmpty.apply(createInitialState()), ['git add .', 'git commit -m "feat: premier commit"']);
    expect(texts(r)[0]).toMatch(/^\[main \(root-commit\) [0-9a-f]{7}\] feat: premier commit$/);
    expect(texts(r).slice(1)).toEqual([
      ' 4 files changed, 20 insertions(+)',
      ' create mode 100644 .gitignore',
      ' create mode 100644 README.md',
      ' create mode 100644 index.html',
      ' create mode 100755 script.sh',
    ]);
  });

  it('Git for Windows ignores the executable bit', () => {
    const r = run(gitRepoEmpty.apply(createInitialState(), 'windows'), ['git add .', 'git commit -m "x"'], 'windows');
    expect(texts(r)).toContain(' create mode 100644 script.sh');
  });

  it('a prepared commit leaves a clean tree', () => {
    expect(texts(run(gitRepoWithCommit.apply(createInitialState()), ['git status']))).toEqual([
      'On branch main', 'nothing to commit, working tree clean',
    ]);
  });

  it('a modified file is listed as not staged', () => {
    const r = run(gitRepoWithChange.apply(createInitialState()), ['git status']);
    expect(texts(r)).toEqual([
      'On branch main',
      'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
      '\tmodified:   README.md', '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
    ]);
  });

  it('a modification commits as one insertion and one deletion', () => {
    const r = run(gitRepoWithChange.apply(createInitialState()), ['git add README.md', 'git commit -m "docs: readme"']);
    expect(texts(r)[0]).toMatch(/^\[main [0-9a-f]{7}\] docs: readme$/);
    expect(texts(r)[1]).toBe(' 1 file changed, 1 insertion(+), 1 deletion(-)');
  });

  it('a deleted file uses git add/rm, and paths are shown from the current directory', () => {
    let s = gitRepoWithCommit.apply(createInitialState());
    s = run(s, ['rm script.sh', 'echo x > README.md', 'mkdir docs', 'echo n > docs/n.txt', 'cd docs']).newState;
    expect(texts(run(s, ['git status']))).toEqual([
      'On branch main',
      'Changes not staged for commit:',
      '  (use "git add/rm <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
      '\tmodified:   ../README.md', '\tdeleted:    ../script.sh', '',
      'Untracked files:',
      '  (use "git add <file>..." to include in what will be committed)',
      '\t./', '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
    ]);
  });

  it('commit -a records modifications and deletions, with delete mode', () => {
    let s = gitRepoWithCommit.apply(createInitialState());
    s = run(s, ['rm script.sh']).newState;
    const r = run(s, ['git commit -am "chore: remove script"']);
    expect(texts(r).slice(1)).toEqual([' 1 file changed, 3 deletions(-)', ' delete mode 100755 script.sh']);
  });

  it('status of the git-status-log lesson, long and short (-s)', () => {
    const s = run(gitRepoWithCommit.apply(createInitialState()), ['echo "<p>Bienvenue</p>" >> index.html', 'touch style.css']).newState;
    expect(texts(run(s, ['git status']))).toEqual([
      'On branch main',
      'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
      '\tmodified:   index.html', '',
      'Untracked files:',
      '  (use "git add <file>..." to include in what will be committed)',
      '\tstyle.css', '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
    ]);
    expect(texts(run(s, ['git status -s']))).toEqual([' M index.html', '?? style.css']);
  });

  it('commit with nothing staged prints the status and fails', () => {
    const r = run(gitRepoEmpty.apply(createInitialState()), ['git commit -m "x"']);
    expect(texts(r).slice(0, 5)).toEqual(['On branch main', '', 'Initial commit', '', 'Untracked files:']);
    expect(r.status).toBe(1);
  });
});

describe('git add errors', () => {
  it('a path that does not exist', () => {
    const r = run(gitRepoEmpty.apply(createInitialState()), ['git add nope.txt']);
    expect(r.lines).toEqual([{ text: "fatal: pathspec 'nope.txt' did not match any files", type: 'error' }]);
    expect(r.status).toBe(128);
  });

  it('an ignored file named explicitly is refused unless forced', () => {
    const s = gitRepoEmpty.apply(createInitialState());
    const r = run(s, ['git add .env README.md']);
    expect(texts(r)).toEqual([
      'The following paths are ignored by one of your .gitignore files:',
      '.env',
      'hint: Use -f if you really want to add them.',
      'hint: Disable this message with "git config set advice.addIgnoredFile false"',
    ]);
    expect(r.status).toBe(1);
    expect(r.newState.git?.stagedFiles).toEqual(['README.md']);
    expect(run(s, ['git add -f .env']).newState.git?.stagedFiles).toEqual(['.env']);
  });

  it('nothing specified', () => {
    const r = run(gitRepoEmpty.apply(createInitialState()), ['git add']);
    expect(texts(r)).toEqual([
      'Nothing specified, nothing added.',
      "hint: Maybe you wanted to say 'git add .'?",
      'hint: Disable this message with "git config set advice.addEmptyPathspec false"',
    ]);
    expect(r.status).toBe(0);
  });

  it('outside a repository', () => {
    const r = run(createInitialState(), ['git status']);
    expect(r.lines).toEqual([{ text: 'fatal: not a git repository (or any of the parent directories): .git', type: 'error' }]);
    expect(r.status).toBe(128);
  });
});

describe('git diff', () => {
  it('shows the unstaged change with blob ids and context', () => {
    const r = run(gitRepoWithChange.apply(createInitialState()), ['git diff']);
    expect(texts(r)).toEqual([
      'diff --git a/README.md b/README.md',
      'index 7d825c5..6827029 100644',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1,6 +1,6 @@',
      ' # Mes Projets',
      ' ',
      '-Bienvenue dans mon répertoire de projets.',
      '+Bienvenue dans mon répertoire de projets Git.',
      ' ',
      ' ## Projets actuels',
      ' - script.sh : Script de démonstration',
    ]);
    expect(r.lines.find((l) => l.text.startsWith('-B'))?.type).toBe('removed');
    expect(r.lines.find((l) => l.text.startsWith('+B'))?.type).toBe('success');
  });

  it('moves to --staged once the file is added', () => {
    const s = run(gitRepoWithChange.apply(createInitialState()), ['git add README.md']).newState;
    expect(run(s, ['git diff']).lines).toEqual([]);
    expect(texts(run(s, ['git diff --staged']))[1]).toBe('index 7d825c5..6827029 100644');
  });

  it('a new file in --staged', () => {
    const s = run(gitRepoWithCommit.apply(createInitialState()), ['echo x > new.txt', 'echo y >> new.txt', 'git add new.txt']).newState;
    expect(texts(run(s, ['git diff --staged new.txt']))).toEqual([
      'diff --git a/new.txt b/new.txt',
      'new file mode 100644',
      'index 0000000..b77b4eb',
      '--- /dev/null',
      '+++ b/new.txt',
      '@@ -0,0 +1,2 @@',
      '+x',
      '+y',
    ]);
  });

  it('prints nothing on a clean tree', () => {
    expect(run(gitRepoWithCommit.apply(createInitialState()), ['git diff']).lines).toEqual([]);
  });
});

describe('git restore, rm, reset, check-ignore', () => {
  it('restore brings the committed content back, silently', () => {
    const r = run(gitRepoWithChange.apply(createInitialState()), ['git restore README.md']);
    expect(r.lines).toEqual([]);
    expect(texts(run(r.newState, ['git status']))).toEqual(['On branch main', 'nothing to commit, working tree clean']);
  });

  it('restore --staged unstages without touching the file', () => {
    const r = run(gitRepoWithChange.apply(createInitialState()), ['git add README.md', 'git restore --staged README.md']);
    expect(r.lines).toEqual([]);
    expect(r.newState.git?.stagedFiles).toEqual([]);
    expect(texts(run(r.newState, ['git status']))).toContain('\tmodified:   README.md');
  });

  it('restore of an unknown path', () => {
    const r = run(gitRepoWithCommit.apply(createInitialState()), ['git restore nope.txt']);
    expect(texts(r)).toEqual(["error: pathspec 'nope.txt' did not match any file(s) known to git"]);
    expect(r.status).toBe(1);
  });

  it('rm and rm --cached', () => {
    const s = gitRepoWithCommit.apply(createInitialState());
    const rm = run(s, ['git rm script.sh']);
    expect(texts(rm)).toEqual(["rm 'script.sh'"]);
    expect(run(rm.newState, ['ls script.sh']).lines[0].type).toBe('error');
    const cached = run(s, ['git rm --cached script.sh', 'git status']);
    expect(texts(cached)).toContain('\tdeleted:    script.sh');
    expect(texts(cached)).toContain('\tscript.sh');
  });

  it('reset unstages and lists what is left', () => {
    const r = run(gitRepoWithChange.apply(createInitialState()), ['git add README.md', 'git reset']);
    expect(texts(r)).toEqual(['Unstaged changes after reset:', 'M\tREADME.md']);
  });

  it('reset --hard goes back to the last commit', () => {
    const s = gitRepoWithChange.apply(createInitialState());
    const r = run(s, ['git reset --hard']);
    expect(texts(r)).toEqual(['HEAD is now at a3f8c12 feat: premier commit du projet']);
    expect(run(r.newState, ['git diff']).lines).toEqual([]);
  });

  it('check-ignore -v names the rule', () => {
    const s = gitRepoWithCommit.apply(createInitialState());
    expect(texts(run(s, ['git check-ignore -v .env']))).toEqual(['.gitignore:2:.env\t.env']);
    const none = run(s, ['git check-ignore README.md']);
    expect(none.lines).toEqual([]);
    expect(none.status).toBe(1);
  });
});

describe('git init and clone', () => {
  it('git init creates .git/ as git does', () => {
    const r = run(createInitialState(), ['mkdir p', 'cd p', 'git init', 'ls -A .git']);
    expect(texts(r).join(' ').split(/\s+/)).toEqual(['HEAD', 'config', 'description', 'hooks', 'info', 'objects', 'refs']);
  });

  it('git clone creates the directory; git works inside it, not outside', () => {
    const s = run(createInitialState(), ['git clone https://github.com/user/projet.git']).newState;
    expect(run(s, ['git status']).status).toBe(128);
    expect(texts(run(s, ['cd projet', 'git status']))).toEqual(['On branch main', 'nothing to commit, working tree clean']);
  });

  it('git clone -b takes a branch, not a directory, and refuses an existing destination', () => {
    const s = run(createInitialState(), ['git clone -b develop https://github.com/org/projet.git']).newState;
    expect(texts(run(s, ['cd projet', 'git branch']))).toEqual(['* develop']);
    const again = run(s, ['git clone https://github.com/org/projet.git']);
    expect(texts(again)).toEqual(["fatal: destination path 'projet' already exists and is not an empty directory."]);
    expect(again.status).toBe(128);
  });
});

// Second batch: cases the terminal-fidelity-auditor found, values from Git 2.56.
describe('git options as git parses them', () => {
  const committed = () => gitRepoWithCommit.apply(createInitialState());

  it('status -sb and -b -s name the branch; --porcelain starts paths at the root', () => {
    const empty = run(gitRepoEmpty.apply(createInitialState()), ['git status -sb']);
    expect(texts(empty)[0]).toBe('## No commits yet on main');
    const s = run(committed(), ['mkdir sub', 'echo s > sub/s.txt', 'echo x >> index.html', 'cd sub']).newState;
    expect(texts(run(s, ['git status -s']))).toEqual([' M ../index.html', '?? ./']);
    expect(texts(run(s, ['git status --porcelain']))).toEqual([' M index.html', '?? sub/']);
    expect(texts(run(s, ['git status -b -s']))[0]).toBe('## main');
  });

  it('status -uno hides untracked files', () => {
    const r = run(committed(), ['touch z', 'git status -uno']);
    expect(texts(r)).toEqual(['On branch main', 'nothing to commit (use -u to show untracked files)']);
  });

  it('git rm refuses to lose work, in git\'s words', () => {
    const s = run(committed(), ['echo x >> README.md', 'echo y >> index.html', 'git add index.html']).newState;
    const r = run(s, ['git rm README.md index.html']);
    expect(texts(r)).toEqual([
      'error: the following file has changes staged in the index:',
      '    index.html',
      '(use --cached to keep the file, or -f to force removal)',
      'error: the following file has local modifications:',
      '    README.md',
      '(use --cached to keep the file, or -f to force removal)',
    ]);
    expect(r.status).toBe(1);
    expect(run(s, ['git rm README.md index.html', 'ls README.md']).lines[0].type).toBe('output');
    const plural = run(committed(), ['echo x >> README.md', 'echo y >> index.html', 'git rm README.md index.html']);
    expect(texts(plural).slice(0, 3)).toEqual(['error: the following files have local modifications:', '    README.md', '    index.html']);
  });

  it('git rm with staged content different from both the file and HEAD', () => {
    const r = run(committed(), ['echo x >> README.md', 'git add README.md', 'echo y >> README.md', 'git rm --cached README.md']);
    expect(texts(r)).toEqual([
      'error: the following file has staged content different from both the',
      'file and the HEAD:',
      '    README.md',
      '(use -f to force removal)',
    ]);
  });

  it('combined short options: rm -rf, add -fA, add -Au', () => {
    const s = run(committed(), ['mkdir d', 'echo a > d/a', 'git add d', 'git commit -m d']).newState;
    expect(texts(run(s, ['git rm -rf d']))).toEqual(["rm 'd/a'"]);
    expect(run(gitRepoEmpty.apply(createInitialState()), ['git add -fA .env']).newState.git?.stagedFiles).toEqual(['.env']);
    const both = run(committed(), ['git add -Au']);
    expect(texts(both)).toEqual(["fatal: options '-u/--update' and '-A/--all' cannot be used together"]);
    expect(both.status).toBe(128);
  });

  it('git diff against HEAD, and its name and stat modes', () => {
    const s = run(committed(), ['echo a2 >> README.md', 'echo b2 >> index.html', 'git add README.md']).newState;
    expect(texts(run(s, ['git diff HEAD --name-only']))).toEqual(['README.md', 'index.html']);
    expect(texts(run(s, ['git diff HEAD --name-only -- index.html']))).toEqual(['index.html']);
    expect(texts(run(s, ['git diff --name-only']))).toEqual(['index.html']);
    expect(texts(run(s, ['git diff HEAD --name-status']))).toEqual(['M\tREADME.md', 'M\tindex.html']);
    expect(texts(run(s, ['git diff HEAD --numstat']))).toEqual(['1\t0\tREADME.md', '1\t0\tindex.html']);
    expect(texts(run(s, ['git diff HEAD --shortstat']))).toEqual([' 2 files changed, 2 insertions(+)']);
  });

  it('git diff -U1 keeps one line of context', () => {
    const r = run(gitRepoWithChange.apply(createInitialState()), ['git diff -U1']);
    expect(texts(r).slice(4)).toEqual([
      '@@ -2,3 +2,3 @@',
      ' ',
      '-Bienvenue dans mon répertoire de projets.',
      '+Bienvenue dans mon répertoire de projets Git.',
      ' ',
    ]);
  });

  it('git init -b names the branch, -q is silent, neither makes a directory', () => {
    const r = run(createInitialState(), ['mkdir x2', 'cd x2', 'git init -b dev', 'git status -sb']);
    expect(texts(r)).toEqual(['## No commits yet on dev']);
    expect(texts(run(r.newState, ['ls -a'])).join(' ').split(/\s+/)).toEqual(['.', '..', '.git']);
    expect(run(r.newState, ['git init -q']).lines).toEqual([]);
  });

  it('git reset: unknown path and unknown option', () => {
    const path = run(committed(), ['git reset nope.txt']);
    expect(texts(path)[0]).toBe("fatal: ambiguous argument 'nope.txt': unknown revision or path not in the working tree.");
    expect(path.status).toBe(128);
    const option = run(committed(), ['git reset --bogus']);
    expect(texts(option).slice(0, 2)).toEqual(["error: unknown option `bogus'", 'usage: git reset [--mixed | --soft | --hard | --merge | --keep] [-q] [<commit>]']);
    expect(option.status).toBe(129);
  });

  it('commit: -m without a value, --allow-empty, -q', () => {
    const noValue = run(committed(), ['git commit -m']);
    expect(texts(noValue)).toEqual(["error: switch `m' requires a value"]);
    expect(noValue.status).toBe(129);
    const empty = run(committed(), ['git commit --allow-empty -m empty']);
    expect(texts(empty)).toHaveLength(1);
    expect(texts(empty)[0]).toMatch(/^\[main [0-9a-f]{7}\] empty$/);
    expect(run(gitRepoWithChange.apply(createInitialState()), ['git commit -qam x']).lines).toEqual([]);
  });

  it('stash -m, a missing entry, and a pop that would overwrite local changes', () => {
    const s = run(committed(), ['echo q >> README.md', 'git stash push -m mymsg']).newState;
    expect(texts(run(s, ['git stash list']))).toEqual(['stash@{0}: On main: mymsg']);
    const missing = run(s, ['git stash pop stash@{3}']);
    expect(texts(missing)).toEqual(["fatal: log for 'stash' only has 1 entries"]);
    expect(missing.status).toBe(128);
    const busy = run(s, ['echo other >> README.md', 'git stash pop']);
    expect(texts(busy).slice(0, 4)).toEqual([
      'error: Your local changes to the following files would be overwritten by merge:',
      '\tREADME.md',
      'Please commit your changes or stash them before you merge.',
      'Aborting',
    ]);
    expect(texts(busy)[texts(busy).length - 1]).toBe('The stash entry is kept in case you need it again.');
    expect(busy.status).toBe(128);
  });

  it('two stashes popped in turn both come back', () => {
    const r = run(committed(), ['echo 1 >> README.md', 'git stash', 'echo 2 >> index.html', 'git stash', 'git stash pop', 'git stash pop', 'git status -s']);
    expect(texts(r)).toEqual([' M README.md', ' M index.html']);
  });

  it('check-ignore -v names a ! rule; -q is silent; -n needs -v', () => {
    const s = run(committed(), ['echo "*.log" >> .gitignore', 'echo "!keep.log" >> .gitignore', 'touch keep.log app.log']).newState;
    expect(texts(run(s, ['git check-ignore -v keep.log app.log']))).toEqual(['.gitignore:4:!keep.log\tkeep.log', '.gitignore:3:*.log\tapp.log']);
    expect(run(s, ['git check-ignore -q app.log']).lines).toEqual([]);
    expect(texts(run(s, ['git check-ignore -n app.log']))).toEqual(['fatal: --non-matching is only valid with --verbose']);
  });
});

// Points from the code review, checked against Git 2.56.
describe('git — review fixes', () => {
  const committed = () => gitRepoWithCommit.apply(createInitialState());

  it('hunk headers are standard output: they reach a file', () => {
    const r = run(gitRepoWithChange.apply(createInitialState()), ['git diff > p.patch', 'grep @@ p.patch']);
    expect(texts(r)).toEqual(['@@ -1,6 +1,6 @@']);
  });

  it('reset with paths refuses --hard and --soft, and never moves HEAD', () => {
    const s = run(committed(), ['echo a2 >> README.md', 'git commit -qam two']).newState;
    expect(texts(run(s, ['git reset --hard HEAD~1 -- README.md']))).toEqual(['fatal: Cannot do hard reset with paths.']);
    expect(texts(run(s, ['git reset --soft README.md']))).toEqual(['fatal: Cannot do soft reset with paths.']);
    const r = run(s, ['git reset HEAD~1 -- README.md']);
    expect(texts(r)).toEqual(['Unstaged changes after reset:', 'M\tREADME.md']);
    expect(r.newState.git?.commits).toHaveLength(2);
    expect(texts(run(r.newState, ['git status -s']))).toEqual(['MM README.md']);
    expect(run(s, ['git reset --keep']).lines).toEqual([]);
  });

  it('long options take the next word: restore --source, stash push --message', () => {
    const s = run(committed(), ['echo a2 >> README.md', 'git commit -qam two']).newState;
    const restored = run(s, ['git restore --source HEAD~1 README.md', 'git diff --name-only']);
    expect(texts(restored)).toEqual(['README.md']);
    const stashed = run(committed(), ['echo q >> README.md', 'git stash push --message "note"', 'git stash list']);
    expect(texts(stashed)).toEqual(['stash@{0}: On main: note']);
  });

  it('git init -b dev dev keeps the branch name', () => {
    expect(texts(run(createInitialState(), ['git init -b dev dev', 'cd dev', 'git status -sb']))).toEqual(['## No commits yet on dev']);
  });

  it('check-ignore never reports a tracked file', () => {
    const r = run(committed(), ['echo "*.md" >> .gitignore', 'touch notes.md', 'git check-ignore README.md notes.md']);
    expect(texts(r)).toEqual(['notes.md']);
    expect(run(r.newState, ['git check-ignore README.md']).status).toBe(1);
  });

  it('git rm -r removes the directories it empties', () => {
    const r = run(committed(), ['mkdir -p d/e', 'echo x > d/e/f', 'git add d', 'git commit -qm d', 'git rm -q -r d', 'ls d']);
    expect(r.lines[0].type).toBe('error');
  });
});

describe('gitTree', () => {
  it('blob ids are SHA-1 of `blob <size>\\0<content>` (git hash-object)', () => {
    expect(blobId('x\ny\n').slice(0, 7)).toBe('b77b4eb');
    expect(blobId('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  });

  it('a line without newline differs from the same line with one', () => {
    expect(splitLines('l1\nl2')).toEqual(['l1\n', 'l2']);
    expect(diffLines(splitLines('a\nb'), splitLines('a\nb\n')).map((o) => o.kind)).toEqual([' ', '-', '+']);
  });

  it('distant changes make two hunks, the second with its function context', () => {
    const before = 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\nl\nm\n';
    const after = 'a\nB\nc\nd\ne\nf\ng\nh\ni\nj\nk\nL\nm\n';
    expect(unifiedHunks(before, after)).toEqual([
      '@@ -1,5 +1,5 @@', ' a', '-b', '+B', ' c', ' d', ' e',
      '@@ -9,5 +9,5 @@ h', ' i', ' j', ' k', '-l', '+L', ' m',
    ]);
  });

  it('.gitignore: names, directories, globs and the last matching rule', () => {
    const rules = parseIgnore('node_modules/\n# secrets\n.env\n*.log\n!keep.log\n');
    expect(ignoredBy(rules, '.env', false)?.line).toBe(3);
    expect(ignoredBy(rules, 'node_modules/x/i.js', false)?.pattern).toBe('node_modules/');
    expect(ignoredBy(rules, 'logs/app.log', false)?.pattern).toBe('*.log');
    expect(ignoredBy(rules, 'keep.log', false)).toBeNull();
    expect(ignoredBy(rules, 'README.md', false)).toBeNull();
  });
});
