/**
 * Branches, merges, conflicts and history in the simulated git, against real
 * git. Every expected text below was printed by Git 2.56 (Git for Windows,
 * `core.autocrlf false`, no pager, no editor) in a throwaway repository with
 * the same files, on 29 September 2026; the order of lines mixing standard
 * output and errors was checked in a real terminal (WSL, `script`). Hashes
 * that depend on the time of a commit are read from the simulated repository;
 * the ids themselves are checked against real git with fixed dates.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, processCommand } from '../app/data/terminalEngine';
import type { TerminalEnv, TerminalState } from '../app/data/commands/types';
import { writeFile } from '../app/data/commands/gitTree';
import { gitRepoWithBranch, gitRepoWithConflict } from '../app/data/lessonSetup';

const texts = (r: { lines: { text: string }[] }) => r.lines.map((l) => l.text);
const short = (h: string | undefined) => (h ?? '').slice(0, 7);

/** A session: each command runs on the state the previous one left. */
function session(state: TerminalState, env: TerminalEnv = 'linux') {
  let s = state;
  const api = {
    run(command: string) {
      const r = processCommand(s, command, env);
      s = r.newState;
      return r;
    },
    /** Writes a file of the current directory, `content` as git sees it (final newline included). */
    put(path: string, content: string) {
      s = { ...s, root: writeFile(s.root, [...s.cwd, ...path.split('/')], content) };
    },
    get state() { return s; },
    ref(name: string) { return s.git!.refs![name]; },
  };
  return api;
}

const INDEX = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <title>Mon App</title>\n</head>\n<body>\n  <h1>Mon App</h1>\n</body>\n</html>\n';

/** An empty directory ~/depot, `git init` done: the start of every real-git script. */
function depot(env: TerminalEnv = 'linux') {
  const t = session(createInitialState(), env);
  t.run('mkdir depot');
  t.run('cd depot');
  t.run('git init -q');
  return t;
}

/** ~/depot with f.txt (a b c) and r.txt committed as "one", like the real-git scripts. */
function seeded(env: TerminalEnv = 'linux') {
  const t = depot(env);
  t.put('f.txt', 'a\nb\nc\n');
  t.put('r.txt', 'r\n');
  t.run('git add .');
  t.run('git commit -q -m one');
  return t;
}

/** `side` and `main` both changed the last line of f.txt, and main merged side: a conflict. */
function conflicted() {
  const t = seeded();
  t.run('git switch -q -c side');
  t.put('f.txt', 'a\nb\nSIDE\n');
  t.run('git commit -q -am side');
  t.run('git switch -q main');
  t.put('f.txt', 'a\nb\nMAIN\n');
  t.run('git commit -q -am main');
  t.run('git merge side');
  return t;
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('commit ids', () => {
  it('commits, a merge and an annotated tag get the ids real git computes', () => {
    vi.useFakeTimers();
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-120);
    const at = (seconds: number) => vi.setSystemTime(seconds * 1000);
    const t = depot();
    t.put('a.txt', 'hello\n');
    t.put('docs/guide.md', 'guide\n');
    t.run('git add .');
    at(1790000000);
    expect(texts(t.run('git commit -m "first"'))).toEqual([
      '[main (root-commit) 52f1600] first', ' 2 files changed, 2 insertions(+)', ' create mode 100644 a.txt', ' create mode 100644 docs/guide.md',
    ]);
    expect(t.ref('main')).toBe('52f1600431f4a4695158e3809f4687f2b4e6ab75');
    t.run('git switch -q -c side');
    t.put('s.txt', 'side\n');
    t.run('git add .');
    at(1790000100);
    t.run('git commit -m "side work"');
    expect(t.ref('side')).toBe('adeb084edf9f6e0fafd06bd602b4fa3246933781');
    t.run('git switch -q main');
    t.run('echo more >> a.txt');
    at(1790000200);
    t.run('git commit -q -am "main work"');
    expect(t.ref('main')).toBe('e68525e0bd7e804f4a3459a866b9c36b13243e83');
    at(1790000300);
    expect(texts(t.run('git merge side'))).toEqual([
      "Merge made by the 'ort' strategy.", ' s.txt | 1 +', ' 1 file changed, 1 insertion(+)', ' create mode 100644 s.txt',
    ]);
    expect(t.ref('main')).toBe('6bdf3ce1adfecfc4e44801c447e3fdf62783daba');
    at(1790000400);
    t.run('git tag -a v1 -m "release one"');
    expect(t.state.git!.tagNotes!.v1.id).toBe('6616dc3600ad682bbc28b54757dfd0f90723b8a5');
  });
});

describe('branches', () => {
  it('create, list, switch; the files follow the branch', () => {
    const t = depot();
    t.put('index.html', INDEX);
    t.put('README.md', '# Mes Projets\n');
    t.run('git add .');
    t.run('git commit -q -m "feat: premier commit"');
    expect(t.run('git branch feature/panier').lines).toEqual([]);
    expect(texts(t.run('git branch'))).toEqual(['  feature/panier', '* main']);
    expect(texts(t.run('git switch feature/panier'))).toEqual(["Switched to branch 'feature/panier'"]);
    expect(texts(t.run('git switch feature/panier'))).toEqual(["Already on 'feature/panier'"]);
    expect(texts(t.run('git checkout feature/panier'))).toEqual(["Already on 'feature/panier'"]);
    t.put('panier.html', '<h2>Panier</h2>\n');
    t.run('git add panier.html');
    const before = t.ref('main');
    const commit = t.run('git commit -m "feat(panier): add cart page"');
    expect(texts(commit)).toEqual([
      `[feature/panier ${short(t.ref('feature/panier'))}] feat(panier): add cart page`, ' 1 file changed, 1 insertion(+)', ' create mode 100644 panier.html',
    ]);
    expect(texts(t.run('git switch main'))).toEqual(["Switched to branch 'main'"]);
    expect(texts(t.run('ls'))).toEqual(['README.md  index.html']);

    // Fast-forward: main simply moves to the branch's commit.
    const after = t.ref('feature/panier');
    const ff = t.run('git merge feature/panier');
    expect(texts(ff)).toEqual([
      `Updating ${short(before)}..${short(after)}`, 'Fast-forward', ' panier.html | 1 +', ' 1 file changed, 1 insertion(+)', ' create mode 100644 panier.html',
    ]);
    expect(ff.status ?? 0).toBe(0);
    expect(texts(t.run('ls'))).toEqual(['README.md  index.html  panier.html']);
    expect(texts(t.run('git merge feature/panier'))).toEqual(['Already up to date.']);
    expect(texts(t.run('git branch -d feature/panier'))).toEqual([`Deleted branch feature/panier (was ${short(after)}).`]);
    expect(texts(t.run('git switch -c feature/a'))).toEqual(["Switched to a new branch 'feature/a'"]);
    expect(texts(t.run('git checkout -b feature/b'))).toEqual(["Switched to a new branch 'feature/b'"]);
    expect(texts(t.run('git checkout main'))).toEqual(["Switched to branch 'main'"]);
  });

  it('a local change is carried to the other branch, and listed before the switch message', () => {
    const t = seeded();
    t.run('git branch feature/a');
    t.run('echo x >> r.txt');
    expect(texts(t.run('git switch feature/a'))).toEqual(['M\tr.txt', "Switched to branch 'feature/a'"]);
    // A new branch where HEAD already is: git lists nothing.
    expect(texts(t.run('git switch -c withlocal'))).toEqual(["Switched to a new branch 'withlocal'"]);
  });

  it('a local change the switch would overwrite blocks it, as does an untracked file in the way', () => {
    const t = seeded();
    t.run('git switch -q -c feature/a');
    t.put('f.txt', 'a\nb\nA\n');
    t.run('git commit -q -am A');
    t.run('git switch -q main');
    t.put('f.txt', 'a\nb\nlocal\n');
    for (const cmd of ['git switch feature/a', 'git checkout feature/a']) {
      const r = t.run(cmd);
      expect(texts(r)).toEqual([
        'error: Your local changes to the following files would be overwritten by checkout:', '\tf.txt',
        'Please commit your changes or stash them before you switch branches.', 'Aborting',
      ]);
      expect(r.status).toBe(1);
    }
    t.run('git checkout -- f.txt');
    t.run('git switch -q -c u1');
    t.put('u.txt', 'tracked\n');
    t.run('git add u.txt');
    t.run('git commit -q -m u');
    t.run('git switch -q main');
    t.put('u.txt', 'untracked\n');
    const r = t.run('git switch u1');
    expect(texts(r)).toEqual([
      'error: The following untracked working tree files would be overwritten by checkout:', '\tu.txt',
      'Please move or remove them before you switch branches.', 'Aborting',
    ]);
    expect(r.status).toBe(1);
    const m = t.run('git merge u1');
    expect(texts(m)).toEqual([
      `Updating ${short(t.ref('main'))}..${short(t.ref('u1'))}`,
      'error: The following untracked working tree files would be overwritten by merge:', '\tu.txt',
      'Please move or remove them before you merge.', 'Aborting',
    ]);
    expect(m.status).toBe(1);
  });

  it('a fast-forward over a locally changed file prints Updating, then refuses', () => {
    const t = seeded();
    t.run('git switch -q -c side');
    t.put('f.txt', 'a\nb\nC\n');
    t.run('git commit -q -am side');
    t.run('git switch -q main');
    t.run('echo zz >> f.txt');
    const r = t.run('git merge side');
    expect(texts(r)).toEqual([
      `Updating ${short(t.ref('main'))}..${short(t.ref('side'))}`,
      'error: Your local changes to the following files would be overwritten by merge:', '\tf.txt',
      'Please commit your changes or stash them before you merge.', 'Aborting',
    ]);
    expect(r.status).toBe(1);
  });

  it('branch -d refuses the current branch and an unmerged one; -D forces', () => {
    const t = seeded();
    t.run('git switch -q -c feature/a');
    t.run('echo A >> f.txt');
    t.run('git commit -q -am A');
    t.run('git switch -q main');
    const unmerged = t.run('git branch -d feature/a');
    expect(texts(unmerged)).toEqual([
      "error: the branch 'feature/a' is not fully merged",
      "hint: If you are sure you want to delete it, run 'git branch -D feature/a'",
      'hint: Disable this message with "git config set advice.forceDeleteBranch false"',
    ]);
    expect(unmerged.status).toBe(1);
    const current = t.run('git branch -d main');
    expect(texts(current)).toEqual(["error: cannot delete branch 'main' used by worktree at '/home/user/depot'"]);
    expect(current.status).toBe(1);
    expect(texts(t.run('git branch -D feature/a'))).toEqual([`Deleted branch feature/a (was ${short(unmerged.newState.git!.refs!['feature/a'])}).`]);
  });

  it('Git for Windows names the worktree with a drive letter', () => {
    const t = seeded('windows');
    expect(texts(t.run('git branch -d main'))).toEqual(["error: cannot delete branch 'main' used by worktree at 'C:/Users/user/depot'"]);
  });

  it('errors of branch, switch and checkout', () => {
    const t = seeded();
    t.run('git branch feature/x');
    const cases: Array<[string, string[], number]> = [
      ['git branch feature/x', ["fatal: a branch named 'feature/x' already exists"], 128],
      ['git checkout -b feature/x', ["fatal: a branch named 'feature/x' already exists"], 128],
      ['git switch -c feature/x', ["fatal: a branch named 'feature/x' already exists"], 128],
      ['git branch -d nope', ["error: branch 'nope' not found"], 1],
      ['git branch -d', ['fatal: branch name required'], 128],
      ['git branch x nope', ["fatal: not a valid object name: 'nope'"], 128],
      ['git branch -m nope other', ["fatal: no branch named 'nope'"], 128],
      ['git switch nope', ['fatal: invalid reference: nope'], 128],
      ['git switch', ['fatal: missing branch or commit argument'], 128],
      ['git checkout nope', ["error: pathspec 'nope' did not match any file(s) known to git"], 1],
      ['git merge nope', ['merge: nope - not something we can merge'], 1],
      ['git merge', ['fatal: No remote for the current branch.'], 128],
      ['git merge --abort', ['fatal: There is no merge to abort (MERGE_HEAD missing).'], 128],
    ];
    for (const [cmd, expected, status] of cases) {
      const r = processCommand(t.state, cmd, 'linux');
      expect(texts(r), cmd).toEqual(expected);
      expect(r.status, cmd).toBe(status);
    }
  });

  it('a branch on a repository without commits', () => {
    const t = depot();
    const r = t.run('git branch x');
    expect(texts(r)).toEqual(["fatal: not a valid object name: 'main'"]);
    expect(r.status).toBe(128);
    expect(t.run('git branch').lines).toEqual([]);
  });

  it('branch -m renames silently; branch -v aligns names; switch - goes back', () => {
    const t = seeded();
    t.run('git branch feature/x');
    expect(t.run('git branch -m feature/x feature/y').lines).toEqual([]);
    const tip = short(t.ref('main'));
    expect(texts(t.run('git branch -v'))).toEqual([`  feature/y ${tip} one`, `* main      ${tip} one`]);
    t.run('git switch -q feature/y');
    expect(texts(t.run('git switch -'))).toEqual(["Switched to branch 'main'"]);
  });
});

describe('merges', () => {
  it('a merge of diverged branches makes a merge commit, "into" off main', () => {
    const t = seeded();
    t.run('git switch -q -c feature');
    t.run('git switch -q -c topic');
    t.put('t.txt', 't\n');
    t.run('git add t.txt');
    t.run('git commit -q -m topic');
    t.run('git switch -q feature');
    t.put('g.txt', 'g\n');
    t.run('git add g.txt');
    t.run('git commit -q -m g');
    expect(texts(t.run('git merge topic'))).toEqual([
      "Merge made by the 'ort' strategy.", ' t.txt | 1 +', ' 1 file changed, 1 insertion(+)', ' create mode 100644 t.txt',
    ]);
    expect(t.state.git!.commits[0].message).toBe("Merge branch 'topic' into feature");
    expect(t.state.git!.commits[0].parents).toHaveLength(2);
  });

  it('--no-ff records a merge commit even when a fast-forward was possible', () => {
    const t = seeded();
    t.run('git switch -q -c feature/x');
    t.put('y.txt', 'y\n');
    t.run('git add y.txt');
    t.run('git commit -q -m "feat: y"');
    t.run('git switch -q main');
    expect(texts(t.run('git merge --no-ff feature/x'))).toEqual([
      "Merge made by the 'ort' strategy.", ' y.txt | 1 +', ' 1 file changed, 1 insertion(+)', ' create mode 100644 y.txt',
    ]);
    expect(t.state.git!.commits[0].message).toBe("Merge branch 'feature/x'");
  });

  it('--ff-only refuses diverged branches with git\'s hints', () => {
    const t = seeded();
    t.run('git switch -q -c side');
    t.run('echo S >> f.txt');
    t.run('git commit -q -am side');
    t.run('git switch -q main');
    t.run('echo M >> r.txt');
    t.run('git commit -q -am main');
    const r = t.run('git merge --ff-only side');
    expect(texts(r)).toEqual([
      "hint: Diverging branches can't be fast-forwarded, you need to either:", 'hint:', 'hint: \tgit merge --no-ff', 'hint:', 'hint: or:', 'hint:',
      'hint: \tgit rebase', 'hint:', 'hint: Disable this message with "git config set advice.diverging false"', 'fatal: Not possible to fast-forward, aborting.',
    ]);
    expect(r.status).toBe(128);
  });

  it('a wide diffstat is scaled like git scales it for 80 columns', () => {
    const t = seeded();
    t.run('git switch -q -c wide');
    t.put('big.txt', `${Array.from({ length: 120 }, (_, i) => i + 1).join('\n')}\n`);
    t.put('a-very-long-file-name-for-the-stat-column.txt', 'x\n');
    t.put('mid.txt', `${Array.from({ length: 30 }, (_, i) => i + 1).join('\n')}\n`);
    t.run('git add .');
    t.run('git commit -q -m wide');
    t.run('git switch -q main');
    expect(texts(t.run('git merge wide')).slice(1)).toEqual([
      'Fast-forward',
      ' a-very-long-file-name-for-the-stat-column.txt |   1 +',
      ' big.txt                                       | 120 ++++++++++++++++++++++++++',
      ' mid.txt                                       |  30 +++++++',
      ' 3 files changed, 151 insertions(+)',
      ' create mode 100644 a-very-long-file-name-for-the-stat-column.txt',
      ' create mode 100644 big.txt',
      ' create mode 100644 mid.txt',
    ]);
  });

  it('--squash stages the result without committing', () => {
    const t = seeded();
    t.run('git switch -q -c sq');
    t.put('q.txt', 'q\n');
    t.run('git add .');
    t.run('git commit -q -m q');
    t.run('git switch -q main');
    const tip = t.ref('main');
    expect(texts(t.run('git merge --squash sq'))).toEqual([
      `Updating ${short(tip)}..${short(t.ref('sq'))}`, 'Fast-forward', 'Squash commit -- not updating HEAD',
      ' q.txt | 1 +', ' 1 file changed, 1 insertion(+)', ' create mode 100644 q.txt',
    ]);
    expect(t.ref('main')).toBe(tip);
    expect(texts(t.run('git status -s'))).toEqual(['A  q.txt']);
  });
});

describe('conflicts', () => {
  it('a content conflict: the markers, status long and short, exit 1', () => {
    const t = seeded();
    t.run('git switch -q -c side');
    t.put('f.txt', 'a\nb\nSIDE\n');
    t.run('git commit -q -am side');
    t.run('git switch -q main');
    t.put('f.txt', 'a\nb\nMAIN\n');
    t.run('git commit -q -am main');
    const r = t.run('git merge side');
    expect(texts(r)).toEqual([
      'Auto-merging f.txt', 'CONFLICT (content): Merge conflict in f.txt', 'Automatic merge failed; fix conflicts and then commit the result.',
    ]);
    expect(r.status).toBe(1);
    expect(texts(t.run('cat f.txt'))).toEqual(['a', 'b', '<<<<<<< HEAD', 'MAIN', '=======', 'SIDE', '>>>>>>> side']);
    expect(texts(t.run('git status'))).toEqual([
      'On branch main', 'You have unmerged paths.', '  (fix conflicts and run "git commit")', '  (use "git merge --abort" to abort the merge)', '',
      'Unmerged paths:', '  (use "git add <file>..." to mark resolution)', '\tboth modified:   f.txt', '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
    ]);
    expect(texts(t.run('git status -s'))).toEqual(['UU f.txt']);
  });

  it('what git refuses during a conflict', () => {
    const t = conflicted();
    const cases: Array<[string, string[], number]> = [
      ['git commit -m x', ['U\tf.txt', 'error: Committing is not possible because you have unmerged files.',
        "hint: Fix them up in the work tree, and then use 'git add/rm <file>'", 'hint: as appropriate to mark resolution and make a commit.',
        'fatal: Exiting because of an unresolved conflict.'], 128],
      ['git switch main', ['fatal: cannot switch branch while merging', 'Consider "git merge --quit" or "git worktree add".'], 128],
      ['git checkout main', ['error: you need to resolve your current index first', 'f.txt: needs merge'], 1],
      ['git merge side', ['error: Merging is not possible because you have unmerged files.',
        "hint: Fix them up in the work tree, and then use 'git add/rm <file>'", 'hint: as appropriate to mark resolution and make a commit.',
        'fatal: Exiting because of an unresolved conflict.'], 128],
      ['git stash', ['f.txt: needs merge', 'error: could not write index'], 1],
    ];
    for (const [cmd, expected, status] of cases) {
      const r = processCommand(t.state, cmd, 'linux');
      expect(texts(r), cmd).toEqual(expected);
      expect(r.status, cmd).toBe(status);
    }
  });

  it('resolved with --theirs and git add, then concluded by git commit', () => {
    const t = conflicted();
    expect(texts(t.run('git checkout --theirs f.txt'))).toEqual(['Updated 1 path from the index']);
    expect(texts(t.run('git status -s'))).toEqual(['UU f.txt']);
    t.run('git add f.txt');
    expect(texts(t.run('git status'))).toEqual([
      'On branch main', 'All conflicts fixed but you are still merging.', '  (use "git commit" to conclude merge)', '',
      'Changes to be committed:', '\tmodified:   f.txt', '',
    ]);
    const merge = processCommand(t.state, 'git merge side', 'linux');
    expect(texts(merge)).toEqual(['fatal: You have not concluded your merge (MERGE_HEAD exists).', 'Please, commit your changes before you merge.']);
    expect(texts(processCommand(t.state, 'git switch side', 'linux'))[0]).toBe('fatal: cannot switch branch while merging');
    const main = t.ref('main');
    const commit = t.run('git commit -m "merge: resolve"');
    expect(texts(commit)).toEqual([`[main ${short(t.ref('main'))}] merge: resolve`]);
    expect(t.state.git!.commits[0].parents).toEqual([main, t.ref('side')]);
    expect(texts(t.run('cat f.txt'))).toEqual(['a', 'b', 'SIDE']);
  });

  it('git commit without -m keeps the proposed message; commit -a commits the markers', () => {
    const a = conflicted();
    a.run('git add f.txt');
    const r = a.run('git commit');
    expect(r.lines.filter((l) => l.type !== 'info').map((l) => l.text)).toEqual([`[main ${short(a.ref('main'))}] Merge branch 'side'`]);
    const b = conflicted();
    expect(texts(b.run('git commit -am x'))).toEqual([`[main ${short(b.ref('main'))}] x`]);
  });

  it('--abort puts the files back and ends the merge', () => {
    const t = conflicted();
    expect(t.run('git merge --abort').lines).toEqual([]);
    expect(texts(t.run('git status -s'))).toEqual([]);
    expect(texts(t.run('cat f.txt'))).toEqual(['a', 'b', 'MAIN']);
  });

  it('add/add and modify/delete conflicts', () => {
    const aa = seeded();
    aa.run('git switch -q -c aa1');
    aa.put('n.txt', 'one\n');
    aa.run('git add n.txt');
    aa.run('git commit -q -m aa1');
    aa.run('git switch -q main');
    aa.put('n.txt', 'two\n');
    aa.run('git add n.txt');
    aa.run('git commit -q -m aa2');
    expect(texts(aa.run('git merge aa1'))).toEqual([
      'Auto-merging n.txt', 'CONFLICT (add/add): Merge conflict in n.txt', 'Automatic merge failed; fix conflicts and then commit the result.',
    ]);
    expect(texts(aa.run('git status -s'))).toEqual(['AA n.txt']);

    const them = seeded();
    them.run('git switch -q -c md1');
    them.run('git rm -q f.txt');
    them.run('git commit -q -m del');
    them.run('git switch -q main');
    them.put('f.txt', 'a\nB\nc\n');
    them.run('git commit -q -am mod');
    expect(texts(them.run('git merge md1'))).toEqual([
      'CONFLICT (modify/delete): f.txt deleted in md1 and modified in HEAD.  Version HEAD of f.txt left in tree.',
      'Automatic merge failed; fix conflicts and then commit the result.',
    ]);
    expect(texts(them.run('git status -s'))).toEqual(['UD f.txt']);
    expect(texts(them.run('git status')).slice(5, 8)).toEqual([
      'Unmerged paths:', '  (use "git add/rm <file>..." as appropriate to mark resolution)', '\tdeleted by them: f.txt',
    ]);
    expect(texts(them.run('git checkout --theirs f.txt'))).toEqual(["error: path 'f.txt' does not have their version"]);
    expect(texts(them.run('git rm f.txt'))).toEqual(["rm 'f.txt'"]);
    expect(texts(them.run('git status'))).toEqual([
      'On branch main', 'All conflicts fixed but you are still merging.', '  (use "git commit" to conclude merge)', '',
      'Changes to be committed:', '\tdeleted:    f.txt', '',
    ]);

    const us = seeded();
    us.run('git switch -q -c mod2');
    us.put('f.txt', 'a\nB2\nc\n');
    us.run('git commit -q -am mod2');
    us.run('git switch -q main');
    us.run('git rm -q f.txt');
    us.run('git commit -q -m del2');
    expect(texts(us.run('git merge mod2'))[0]).toBe(
      'CONFLICT (modify/delete): f.txt deleted in HEAD and modified in mod2.  Version mod2 of f.txt left in tree.',
    );
    expect(texts(us.run('git status -s'))).toEqual(['DU f.txt']);
    expect(texts(us.run('git status'))).toContain('\tdeleted by us:   f.txt');
  });

  it('in one file, the line both sides changed conflicts while a change on one side only is kept', () => {
    const t = depot();
    t.put('n.txt', '1\n2\n3\n4\n5\n6\n7\n8\n9\n');
    t.run('git add .');
    t.run('git commit -q -m n');
    t.run('git switch -q -c s');
    t.put('n.txt', '1\nS2\n3\n4\n5\n6\n7\nS8\n9\n');
    t.run('git commit -q -am s');
    t.run('git switch -q main');
    t.put('n.txt', '1\nM2\n3\n4\n5\n6\n7\n8\n9\n');
    t.run('git commit -q -am m');
    t.run('git merge s');
    expect(texts(t.run('cat n.txt'))).toEqual(['1', '<<<<<<< HEAD', 'M2', '=======', 'S2', '>>>>>>> s', '3', '4', '5', '6', '7', 'S8', '9']);
  });
});

describe('the merge lessons', () => {
  it('gitRepoWithBranch: the branch is one commit ahead, the merge a fast-forward', () => {
    const t = session(gitRepoWithBranch('feature/ma-feature').apply(createInitialState()));
    expect(texts(t.run('git log --oneline --all'))).toEqual([
      'b7e2d45 (feature/ma-feature) feat(ma-feature): ajoute la page ma-feature.html',
      'a3f8c12 (HEAD -> main) feat: premier commit du projet',
    ]);
    expect(texts(t.run('git merge feature/ma-feature'))).toEqual([
      'Updating a3f8c12..b7e2d45', 'Fast-forward', ' ma-feature.html | 1 +', ' 1 file changed, 1 insertion(+)', ' create mode 100644 ma-feature.html',
    ]);
  });

  it('gitRepoWithConflict: merging the branch stops on the title of index.html', () => {
    const t = session(gitRepoWithConflict('feature/nouvelle-feature').apply(createInitialState()));
    const r = t.run('git merge feature/nouvelle-feature');
    expect(r.status).toBe(1);
    expect(texts(r)[1]).toBe('CONFLICT (content): Merge conflict in index.html');
    expect(texts(t.run('cat index.html')).slice(3, 8)).toEqual([
      '<<<<<<< HEAD', '  <title>Mon App v2</title>', '=======', '  <title>nouvelle-feature — Mon App</title>', '>>>>>>> feature/nouvelle-feature',
    ]);
  });
});

describe('git log and git show', () => {
  /** main: one, then side (f.txt changed); branch zeta and tag v1.0 on side. */
  function history() {
    const t = seeded();
    t.put('f.txt', 'a\nb\nSIDE\n');
    t.run('git commit -q -am side');
    t.run('git branch zeta');
    t.run('git tag v1.0');
    return t;
  }

  it('the default format, a blank line between entries', () => {
    const t = history();
    const [side, one] = t.state.git!.commits;
    const r = texts(t.run('git log'));
    expect(r).toEqual([
      `commit ${side.hash} (HEAD -> main, tag: v1.0, zeta)`, 'Author: user <user@terminal-lab.local>', expect.stringMatching(/^Date: {3}\w{3} \w{3} \d+ \d\d:\d\d:\d\d \d{4} [+-]\d{4}$/), '', '    side', '',
      `commit ${one.hash}`, 'Author: user <user@terminal-lab.local>', expect.stringMatching(/^Date: {3}/), '', '    one',
    ]);
  });

  it('--oneline with decorations, -n forms, --author, --grep, ranges and paths', () => {
    const t = history();
    const [side, one] = t.state.git!.commits.map((c) => short(c.hash));
    expect(texts(t.run('git log --oneline'))).toEqual([`${side} (HEAD -> main, tag: v1.0, zeta) side`, `${one} one`]);
    for (const form of ['-n 1', '-1', '-n1', '--max-count=1']) expect(texts(t.run(`git log --oneline ${form}`)), form).toEqual([`${side} (HEAD -> main, tag: v1.0, zeta) side`]);
    expect(t.run('git log --oneline --author=nobody').lines).toEqual([]);
    expect(texts(t.run('git log --oneline --grep=side'))).toEqual([`${side} (HEAD -> main, tag: v1.0, zeta) side`]);
    expect(texts(t.run('git log --oneline HEAD~1..main'))).toEqual([`${side} (HEAD -> main, tag: v1.0, zeta) side`]);
    expect(texts(t.run('git log --oneline -- r.txt'))).toEqual([`${one} one`]);
    const bad = t.run('git log --oneline nope..main');
    expect(texts(bad)).toEqual([
      "fatal: ambiguous argument 'nope..main': unknown revision or path not in the working tree.",
      "Use '--' to separate paths from revisions, like this:", "'git <command> [<revision>...] -- [<file>...]'",
    ]);
    expect(bad.status).toBe(128);
  });

  it('--stat and -p after the message; --oneline --stat without blank lines', () => {
    const t = history();
    const side = t.state.git!.commits[0];
    expect(texts(t.run('git log --stat -1')).slice(4)).toEqual(['    side', '', ' f.txt | 2 +-', ' 1 file changed, 1 insertion(+), 1 deletion(-)']);
    expect(texts(t.run('git log -p -1')).slice(4)).toEqual([
      '    side', '', 'diff --git a/f.txt b/f.txt', 'index de98044..ca032aa 100644', '--- a/f.txt', '+++ b/f.txt', '@@ -1,3 +1,3 @@', ' a', ' b', '-c', '+SIDE',
    ]);
    expect(texts(t.run('git log --oneline --stat --no-decorate'))).toEqual([
      `${short(side.hash)} side`, ' f.txt | 2 +-', ' 1 file changed, 1 insertion(+), 1 deletion(-)',
      `${short(side.parents![0])} one`, ' f.txt | 3 +++', ' r.txt | 1 +', ' 2 files changed, 4 insertions(+)',
    ]);
  });

  it('--graph on a straight history', () => {
    const t = history();
    const [side, one] = t.state.git!.commits;
    expect(texts(t.run('git log --oneline --graph --no-decorate'))).toEqual([`* ${short(side.hash)} side`, `* ${short(one.hash)} one`]);
    const full = texts(t.run('git log --graph --no-decorate'));
    expect(full.map((l) => l.replace(/Date: .*/, 'Date:'))).toEqual([
      `* commit ${side.hash}`, '| Author: user <user@terminal-lab.local>', '| Date:', '| ', '|     side', '| ',
      `* commit ${one.hash}`, '  Author: user <user@terminal-lab.local>', '  Date:', '  ', '      one',
    ]);
  });

  it('git show: a commit with its patch or its stat, a merge, a file at a revision', () => {
    const t = history();
    expect(texts(t.run('git show')).slice(4)).toEqual([
      '    side', '', 'diff --git a/f.txt b/f.txt', 'index de98044..ca032aa 100644', '--- a/f.txt', '+++ b/f.txt', '@@ -1,3 +1,3 @@', ' a', ' b', '-c', '+SIDE',
    ]);
    expect(texts(t.run('git show HEAD~1:f.txt'))).toEqual(['a', 'b', 'c']);
    const missing = t.run('git show HEAD:nope.txt');
    expect(texts(missing)).toEqual(["fatal: path 'nope.txt' does not exist in 'HEAD'"]);
    expect(missing.status).toBe(128);
    t.run('git switch -q -c other HEAD~1');
    t.put('s.txt', 's\n');
    t.run('git add .');
    t.run('git commit -q -m s');
    t.run('git switch -q main');
    t.run('git merge -q other');
    const merge = t.state.git!.commits[0];
    const [p1, p2] = merge.parents!.map(short);
    expect(texts(t.run('git show')).slice(1)).toEqual([`Merge: ${p1} ${p2}`, 'Author: user <user@terminal-lab.local>', expect.stringMatching(/^Date:/), '', "    Merge branch 'other'", '']);
    expect(texts(t.run('git show --stat')).slice(6)).toEqual(['', ' s.txt | 1 +', ' 1 file changed, 1 insertion(+)']);
    // A log shows no diff for a merge.
    expect(texts(t.run('git log -p -1')).slice(5)).toEqual(["    Merge branch 'other'"]);
  });

  it('a repository without commits', () => {
    const t = depot();
    for (const cmd of ['git log', 'git show']) {
      const r = t.run(cmd);
      expect(texts(r)).toEqual(["fatal: your current branch 'main' does not have any commits yet"]);
      expect(r.status).toBe(128);
    }
  });
});

describe('tags, reset, checkout of paths', () => {
  it('tags: silent creation, sorted list, duplicates, deletion', () => {
    const t = seeded();
    expect(t.run('git tag v1.0').lines).toEqual([]);
    expect(t.run('git tag -a v1.1 -m "release"').lines).toEqual([]);
    expect(texts(t.run('git tag'))).toEqual(['v1.0', 'v1.1']);
    const dup = t.run('git tag v1.0');
    expect(texts(dup)).toEqual(["fatal: tag 'v1.0' already exists"]);
    expect(dup.status).toBe(128);
    // An annotated tag is its own object: its id, not the commit's.
    const tagObject = t.state.git!.tagNotes!['v1.1'].id;
    expect(tagObject).not.toBe(t.ref('main'));
    expect(texts(t.run('git tag -d v1.1'))).toEqual([`Deleted tag 'v1.1' (was ${short(tagObject)})`]);
    const gone = t.run('git tag -d nope');
    expect(texts(gone)).toEqual(["error: tag 'nope' not found."]);
    expect(gone.status).toBe(1);
    const empty = depot().run('git tag v0');
    expect(texts(empty)).toEqual(["fatal: Failed to resolve 'HEAD' as a valid ref."]);
    expect(empty.status).toBe(128);
  });

  it('reset --hard to a branch moves HEAD and says where', () => {
    const t = seeded();
    t.run('git switch -q -c side');
    t.run('echo s >> f.txt');
    t.run('git commit -q -am side');
    t.run('git switch -q main');
    expect(texts(t.run('git reset --hard side'))).toEqual([`HEAD is now at ${short(t.ref('side'))} side`]);
    expect(t.ref('main')).toBe(t.ref('side'));
  });

  it('checkout of paths: counted without --, silent with it, named after the tree of a commit', () => {
    const t = seeded();
    t.run('echo zz >> f.txt');
    expect(texts(t.run('git checkout f.txt'))).toEqual(['Updated 1 path from the index']);
    t.run('echo zz >> f.txt');
    expect(t.run('git checkout -- f.txt').lines).toEqual([]);
    t.run('echo zz >> f.txt');
    t.run('echo zz >> r.txt');
    expect(texts(t.run('git checkout .'))).toEqual(['Updated 2 paths from the index']);
    expect(texts(t.run('git checkout .'))).toEqual(['Updated 0 paths from the index']);
    const unknown = t.run('git checkout -- nope.txt');
    expect(texts(unknown)).toEqual(["error: pathspec 'nope.txt' did not match any file(s) known to git"]);
    expect(unknown.status).toBe(1);
    t.run('echo zz >> f.txt');
    t.run('git commit -q -am two');
    expect(t.run('git checkout HEAD~1 -- f.txt').lines).toEqual([]);
    expect(texts(t.run('git status -s'))).toEqual(['M  f.txt']);
    // 39e95da: the tree of "one" (f.txt a b c, r.txt r), as real git names it.
    expect(texts(t.run('git checkout HEAD~1 f.txt'))).toEqual(['Updated 0 paths from 39e95da']);
  });
});

describe('cherry-pick and rebase', () => {
  it('cherry-pick applies a commit with its author date; a range, oldest first', () => {
    const t = seeded();
    t.run('git switch -q -c src');
    t.put('c1.txt', '1\n');
    t.run('git add .');
    t.run('git commit -q -m c1');
    t.put('c2.txt', '2\n');
    t.run('git add .');
    t.run('git commit -q -m c2');
    t.run('git switch -q main');
    const r = texts(t.run('git cherry-pick main..src'));
    const [c2, c1] = t.state.git!.commits;
    expect(r).toEqual([
      `[main ${short(c1.hash)}] c1`, expect.stringMatching(/^ Date: \w{3} \w{3} \d+ [\d:]{8} \d{4} [+-]\d{4}$/), ' 1 file changed, 1 insertion(+)', ' create mode 100644 c1.txt',
      `[main ${short(c2.hash)}] c2`, expect.stringMatching(/^ Date: /), ' 1 file changed, 1 insertion(+)', ' create mode 100644 c2.txt',
    ]);
    expect(texts(t.run('ls'))).toEqual(['c1.txt  c2.txt  f.txt  r.txt']);
  });

  it('cherry-pick errors', () => {
    const t = seeded();
    const bad = t.run('git cherry-pick nope');
    expect(texts(bad)).toEqual(["fatal: bad revision 'nope'"]);
    expect(bad.status).toBe(128);
    const usage = t.run('git cherry-pick');
    expect(texts(usage)[0]).toBe('usage: git cherry-pick [--edit] [-n] [-m <parent-number>] [-s] [-x] [--ff]');
    expect(usage.status).toBe(129);
    t.run('echo zz >> f.txt');
    t.run('git add f.txt');
    const staged = t.run('git cherry-pick HEAD');
    expect(texts(staged)).toEqual(['error: your local changes would be overwritten by cherry-pick.', 'hint: commit your changes or stash them to proceed.', 'fatal: cherry-pick failed']);
    expect(staged.status).toBe(128);
  });

  it('rebase: up to date, fast-forward, replayed; refused with local changes', () => {
    const t = seeded();
    t.run('git switch -q -c feature');
    t.put('g.txt', 'g\n');
    t.run('git add .');
    t.run('git commit -q -m g');
    expect(texts(t.run('git rebase main'))).toEqual(['Current branch feature is up to date.']);
    t.run('git switch -q main');
    t.put('m.txt', 'm\n');
    t.run('git add .');
    t.run('git commit -q -m m');
    t.run('git switch -q feature');
    expect(texts(t.run('git rebase main'))).toEqual(['Successfully rebased and updated refs/heads/feature.']);
    expect(t.state.git!.commits.map((c) => c.message)).toEqual(['g', 'm', 'one']);
    expect(texts(t.run('ls'))).toEqual(['f.txt  g.txt  m.txt  r.txt']);
    t.run('echo zz >> f.txt');
    const dirty = t.run('git rebase main');
    expect(texts(dirty)).toEqual(['error: cannot rebase: You have unstaged changes.', 'error: Please commit or stash them.']);
    expect(dirty.status).toBe(1);
    t.run('git add f.txt');
    expect(texts(t.run('git rebase main'))[0]).toBe('error: cannot rebase: Your index contains uncommitted changes.');
    const none = t.run('git rebase');
    expect(texts(none)[0]).toBe('There is no tracking information for the current branch.');
    expect(none.status).toBe(1);
  });
});

/**
 * What the fidelity audit of 29 September 2026 found against real git, and
 * what real git printed instead (scratchpad scripts gitbranch7, gittag8,
 * gitlog9, gitdiff10 and gitrebase11, Git 2.56).
 */
describe('the fidelity audit', () => {
  /** one (f.txt a b c, r.txt r), then two (r.txt gets s); v1 on two, v2 annotated "release two". */
  function tagged(env: TerminalEnv = 'linux') {
    const t = seeded(env);
    t.run('echo s >> r.txt');
    t.run('git commit -q -am two');
    t.run('git tag v1');
    t.run('git tag -a v2 -m "release two"');
    return t;
  }

  const check = (t: ReturnType<typeof session>, cases: Array<[string, string[], number]>) => {
    for (const [cmd, expected, status] of cases) {
      const r = t.run(cmd);
      expect(texts(r), cmd).toEqual(expected);
      expect(r.status ?? 0, cmd).toBe(status);
    }
  };
  const DETACH = 'hint: If you want to detach HEAD at the commit, try again with the --detach option.';
  const TAG_USAGE_FIRST = 'usage: git tag [-a | -s | -u <key-id>] [-f] [-m <msg> | -F <file>] [-e]';

  it('branch, switch and checkout refuse what git refuses, with its words', () => {
    const t = tagged('windows');
    t.run('git branch side');
    check(t, [
      ['git switch HEAD', ["fatal: a branch is expected, got 'refs/heads/main'", DETACH], 128],
      ['git switch HEAD~1', ["fatal: a branch is expected, got commit 'HEAD~1'", DETACH], 128],
      ['git switch v2', ["fatal: a branch is expected, got tag 'v2'", DETACH], 128],
      ['git switch main side', ['fatal: only one reference expected'], 128],
      ['git switch -c a b c', ['fatal: only one reference expected'], 128],
      ['git switch --track side', ['fatal: missing branch name; try -c'], 128],
      ['git checkout -t side', ['fatal: missing branch name; try -b'], 128],
      ['git checkout main --', ["Already on 'main'"], 0],
      ['git checkout nope --', ['fatal: invalid reference: nope'], 128],
      ['git checkout --ours', ["fatal: '--ours/--theirs' needs the paths to check out"], 128],
      ['git checkout --ours side', ["fatal: '--ours/--theirs' cannot be used with switching branches"], 128],
      ['git branch "a b"', ["fatal: 'a b' is not a valid branch name", "hint: See 'git help check-ref-format'", 'hint: Disable this message with "git config set advice.refSyntax false"'], 128],
      ['git branch side/x', ["fatal: cannot lock ref 'refs/heads/side/x': 'refs/heads/side' exists; cannot create 'refs/heads/side/x'"], 128],
      ['git branch -f main HEAD~1', ["fatal: cannot force update the branch 'main' used by worktree at 'C:/Users/user/depot'"], 128],
      ['git branch --unset-upstream', ["fatal: branch 'main' has no upstream information"], 128],
      ['git branch -c side copy', [], 0],
      ['git branch', ['  copy', '* main', '  side'], 0],
      ['git branch --merged', ['  copy', '* main', '  side'], 0],
      ['git branch --contains HEAD~1', ['  copy', '* main', '  side'], 0],
      ['git switch -C side', ["Switched to and reset branch 'side'"], 0],
      ['git switch -C main HEAD', ["Switched to and reset branch 'main'"], 0],
      ['git checkout -B side main', ["Switched to and reset branch 'side'"], 0],
    ]);
    expect(texts(t.run('git branch -h'))[0]).toBe('usage: git branch [<options>] [-r | -a] [--merged] [--no-merged] [(--forked <branch>)...]');
  });

  it('merge: nothing to squash, merge -, bad names, bad options, a refused strategy', () => {
    const t = tagged();
    t.run('git branch side');
    check(t, [
      ['git merge --squash side', ['Already up to date. (nothing to squash)'], 0],
      ['git switch -q side', [], 0],
      ['git switch -q main', [], 0],
      ['git merge -', ['Already up to date.'], 0],
      ['git merge side branch', ['merge: branch - not something we can merge'], 1],
    ]);
    const abort = t.run('git merge --abort side');
    expect(texts(abort).slice(0, 3)).toEqual(['fatal: --abort expects no arguments', '', 'usage: git merge [<options>] [<commit>...]']);
    expect(abort.status).toBe(129);
    const unknown = t.run('git merge --unknown side');
    expect(texts(unknown).slice(0, 2)).toEqual(["error: unknown option `unknown'", 'usage: git merge [<options>] [<commit>...]']);
    expect(unknown.status).toBe(129);
    // Diverged branches, and a local change to a file the merge needs: the ort strategy fails, exit 2.
    t.run('git switch -q -c d1');
    t.run('echo d >> f.txt');
    t.run('git commit -q -am d1');
    t.run('git switch -q main');
    t.run('echo m >> r.txt');
    t.run('git commit -q -am m1');
    t.run('echo local >> f.txt');
    check(t, [['git merge d1', [
      'error: Your local changes to the following files would be overwritten by merge:', '\tf.txt',
      'Please commit your changes or stash them before you merge.', 'Aborting', 'Merge with strategy ort failed.',
    ], 2]]);
  });

  it('tag: -n, filters, -f, invalid names, usage', () => {
    const t = tagged();
    const [two, one] = t.state.git!.commits.map((c) => c.hash);
    const oldV2 = t.state.git!.tagNotes!.v2.id;
    check(t, [
      ['git tag -n', ['v1              two', 'v2              release two'], 0],
      ['git tag -n1 -l "v*"', ['v1              two', 'v2              release two'], 0],
      ['git tag -n2', ['v1              two', 'v2              release two'], 0],
      ['git tag -n v2', ['v2              release two'], 0],
      ['git tag "a b"', ["fatal: 'a b' is not a valid tag name."], 128],
      ['git tag HEAD', ["fatal: 'HEAD' is not a valid tag name."], 128],
      ['git tag v1/x', ["fatal: cannot lock ref 'refs/tags/v1/x': 'refs/tags/v1' exists; cannot create 'refs/tags/v1/x'"], 128],
      ['git tag v5 nope', ["fatal: Failed to resolve 'nope' as a valid ref."], 128],
      ['git tag a b c', ['fatal: too many arguments'], 128],
      ['git tag --contains nope', ['error: malformed object name nope'], 129],
      ['git tag -d', [], 0],
      ['git tag -f v1', [], 0],
      ['git tag -f v1 HEAD~1', [`Updated tag 'v1' (was ${short(two)})`], 0],
      ['git tag -f -a v2 -m again', [`Updated tag 'v2' (was ${short(oldV2)})`], 0],
      ['git tag --contains HEAD~1', ['v1', 'v2'], 0],
      ['git tag --points-at HEAD', ['v2'], 0],
      ['git tag --merged HEAD~1', ['v1'], 0],
    ]);
    expect(t.state.git!.tags!.v1).toBe(one);
    for (const cmd of ['git tag -a', 'git tag -m x', 'git tag -l -a']) {
      const r = t.run(cmd);
      expect(texts(r)[0], cmd).toBe(TAG_USAGE_FIRST);
      expect(r.status, cmd).toBe(129);
    }
    for (const [cmd, first] of [['git tag --zzz', "error: unknown option `zzz'"], ['git tag -z', "error: unknown switch `z'"]]) {
      const r = t.run(cmd);
      expect(texts(r).slice(0, 2), cmd).toEqual([first, TAG_USAGE_FIRST]);
      expect(r.status, cmd).toBe(129);
    }
  });

  it('status once every conflict is fixed; reset of a conflicted path', () => {
    const t = conflicted();
    expect(texts(t.run('git checkout --ours f.txt'))).toEqual(['Updated 1 path from the index']);
    t.run('git add f.txt');
    // The index equals HEAD, yet the merge can be committed: no closing line.
    expect(texts(t.run('git status'))).toEqual([
      'On branch main', 'All conflicts fixed but you are still merging.', '  (use "git commit" to conclude merge)', '',
    ]);
    t.run('git merge --abort');
    t.run('git merge side');
    check(t, [
      ['git reset f.txt', ['Unstaged changes after reset:', 'M\tf.txt'], 0],
      ['git status -s', [' M f.txt'], 0],
      ['git merge --abort', [], 0],
    ]);
  });

  describe('git log', () => {
    /** one, two (f.txt gets b), three (r.txt gets s). */
    function three() {
      const t = seeded();
      t.run('echo b >> f.txt');
      t.run('git commit -q -am two');
      t.run('echo s >> r.txt');
      t.run('git commit -q -am three');
      const [c3, c2, c1] = t.state.git!.commits.map((c) => c.hash);
      return { t, c3, c2, c1 };
    }
    const dateless = (lines: string[]) => lines.map((l) => l.replace(/Date: {3}.*/, 'Date:'));
    const R_PATCH = ['diff --git a/r.txt b/r.txt', 'index 4286f42..7f3f9b3 100644', '--- a/r.txt', '+++ b/r.txt', '@@ -1 +1,2 @@', ' r', '+s'];
    const R_STAT = [' r.txt | 1 +', ' 1 file changed, 1 insertion(+)'];

    it('--stat with -p: a --- line in the full format, a blank line before the patch', () => {
      const { t, c3 } = three();
      expect(texts(t.run('git log --oneline --stat -p -1 --no-decorate'))).toEqual([`${short(c3)} three`, ...R_STAT, '', ...R_PATCH]);
      expect(dateless(texts(t.run('git log --patch --stat -1 --no-decorate')))).toEqual([
        `commit ${c3}`, 'Author: user <user@terminal-lab.local>', 'Date:', '', '    three', '---', ...R_STAT, '', ...R_PATCH,
      ]);
    });

    it('--graph: a | under the last commit only when history goes on', () => {
      const { t, c3, c2, c1 } = three();
      expect(dateless(texts(t.run('git log --graph -1 --no-decorate')))).toEqual([
        `* commit ${c3}`, '| Author: user <user@terminal-lab.local>', '| Date:', '| ', '|     three',
      ]);
      expect(texts(t.run('git log --graph --oneline --no-decorate HEAD~1..HEAD'))).toEqual([`* ${short(c3)} three`]);
      // With --grep, real git shifts columns around the commits it skips (`  * main` then `* one`
      // for --grep=one --grep=main): not simulated rather than drawn wrong.
      expect(t.run('git log --graph --no-decorate --grep=two').lines.map((l) => l.type)).toEqual(['info']);
      expect(texts(t.run('git log --graph --oneline --no-decorate -- r.txt'))).toEqual([`* ${short(c3)} three`, `* ${short(c1)} one`]);
      expect(dateless(texts(t.run('git log --graph --no-decorate --stat -1')))).toEqual([
        `* commit ${c3}`, '| Author: user <user@terminal-lab.local>', '| Date:', '| ', '|     three', '| ', ...R_STAT.map((l) => `| ${l}`),
      ]);
      expect(texts(t.run('git log --graph --oneline --stat --no-decorate -2'))).toEqual([
        `* ${short(c3)} three`, ...R_STAT.map((l) => `| ${l}`), `* ${short(c2)} two`, '|  f.txt | 1 +', '|  1 file changed, 1 insertion(+)',
      ]);
      const reversed = t.run('git log --reverse --graph --oneline');
      expect(texts(reversed)).toEqual(["fatal: options '--graph' and '--reverse' cannot be used together"]);
      expect(reversed.status).toBe(128);
    });

    it('hashes: --pretty=oneline in full, --abbrev-commit and --no-abbrev-commit', () => {
      const { t, c3 } = three();
      expect(texts(t.run('git log --pretty=oneline -1 --no-decorate'))).toEqual([`${c3} three`]);
      expect(texts(t.run('git log --pretty=oneline --abbrev-commit -1 --no-decorate'))).toEqual([`${short(c3)} three`]);
      expect(texts(t.run('git log --oneline --no-abbrev-commit -1 --no-decorate'))).toEqual([`${c3} three`]);
      expect(texts(t.run('git log --abbrev-commit -1 --no-decorate'))[0]).toBe(`commit ${short(c3)}`);
    });

    it('with paths, --stat and -p show only those paths', () => {
      const { t, c2, c1 } = three();
      expect(texts(t.run('git log --stat --no-decorate --oneline -- f.txt'))).toEqual([
        `${short(c2)} two`, ' f.txt | 1 +', ' 1 file changed, 1 insertion(+)',
        `${short(c1)} one`, ' f.txt | 3 +++', ' 1 file changed, 3 insertions(+)',
      ]);
      expect(texts(t.run('git log -p --no-decorate --oneline -1 HEAD~1 -- r.txt'))).toEqual([
        `${short(c1)} one`, 'diff --git a/r.txt b/r.txt', 'new file mode 100644', 'index 0000000..4286f42', '--- /dev/null', '+++ b/r.txt', '@@ -0,0 +1 @@', '+r',
      ]);
    });
  });

  describe('show, diff and rebase', () => {
    /** side: f.txt ends with S, n.txt added; main: f.txt ends with M, r.txt gets s. */
    function forked() {
      const t = seeded();
      t.run('git switch -q -c side');
      t.put('f.txt', 'a\nb\nS\n');
      t.put('n.txt', 'n\n');
      t.run('git add .');
      t.run('git commit -q -m side1');
      t.run('git switch -q main');
      t.put('f.txt', 'a\nb\nM\n');
      t.run('echo s >> r.txt');
      t.run('git commit -q -am main1');
      return t;
    }
    const F_SIDE = ['diff --git a/f.txt b/f.txt', 'index de98044..bae5bea 100644', '--- a/f.txt', '+++ b/f.txt', '@@ -1,3 +1,3 @@', ' a', ' b', '-c', '+S'];
    const N_NEW = ['diff --git a/n.txt b/n.txt', 'new file mode 100644', 'index 0000000..8ba3a16', '--- /dev/null', '+++ b/n.txt', '@@ -0,0 +1 @@', '+n'];

    it('git show with paths', () => {
      const t = forked();
      const main1 = t.ref('main');
      check(t, [['git show HEAD -- n.txt', [], 0]]);
      // In a terminal git decorates the commit line; the capture, piped, did not.
      expect(texts(t.run('git show HEAD -- r.txt'))[0]).toBe(`commit ${main1} (HEAD -> main)`);
      expect(texts(t.run('git show HEAD r.txt'))[0]).toBe(`commit ${main1} (HEAD -> main)`);
      check(t, [['git show HEAD nope.txt', [
        "fatal: ambiguous argument 'nope.txt': unknown revision or path not in the working tree.",
        "Use '--' to separate paths from revisions, like this:", "'git <command> [<revision>...] -- [<file>...]'",
      ], 128]]);
    });

    it('git diff between branches, A..B, A...B and --stat', () => {
      const t = forked();
      check(t, [
        ['git diff main side', [
          'diff --git a/f.txt b/f.txt', 'index 6747b54..bae5bea 100644', '--- a/f.txt', '+++ b/f.txt', '@@ -1,3 +1,3 @@', ' a', ' b', '-M', '+S',
          ...N_NEW,
          'diff --git a/r.txt b/r.txt', 'index 7f3f9b3..4286f42 100644', '--- a/r.txt', '+++ b/r.txt', '@@ -1,2 +1 @@', ' r', '-s',
        ], 0],
        ['git diff main..side --stat', [' f.txt | 2 +-', ' n.txt | 1 +', ' r.txt | 1 -', ' 3 files changed, 2 insertions(+), 2 deletions(-)'], 0],
        ['git diff --stat main side', [' f.txt | 2 +-', ' n.txt | 1 +', ' r.txt | 1 -', ' 3 files changed, 2 insertions(+), 2 deletions(-)'], 0],
        ['git diff main...side', [...F_SIDE, ...N_NEW], 0],
      ]);
      t.run('echo x >> r.txt');
      check(t, [['git diff --stat', [' r.txt | 1 +', ' 1 file changed, 1 insertion(+)'], 0]]);
    });

    it('git diff during a conflict', () => {
      const t = forked();
      t.run('git merge side');
      check(t, [
        ['git diff --staged', ['* Unmerged path f.txt', ...N_NEW], 0],
        ['git diff HEAD', [
          'diff --git a/f.txt b/f.txt', 'index 6747b54..6686565 100644', '--- a/f.txt', '+++ b/f.txt', '@@ -1,3 +1,7 @@',
          ' a', ' b', '+<<<<<<< HEAD', ' M', '+=======', '+S', '+>>>>>>> side',
          ...N_NEW,
        ], 0],
      ]);
      // The combined diff (`diff --cc`) is not simulated: it must not pass for a plain one.
      expect(t.run('git diff').lines.map((l) => l.type)).toEqual(['info']);
    });

    it('git rebase <upstream> <branch> switches to the branch first', () => {
      const t = seeded();
      t.run('git switch -q -c side');
      t.put('n.txt', 'n\n');
      t.run('git add .');
      t.run('git commit -q -m side1');
      t.run('git switch -q main');
      t.put('m.txt', 'm\n');
      t.run('git add .');
      t.run('git commit -q -m main1');
      check(t, [
        ['git rebase main nope', ["fatal: no such branch/commit 'nope'"], 128],
        ['git rebase main side', ['Successfully rebased and updated refs/heads/side.'], 0],
        ['git branch --show-current', ['side'], 0],
        ['git switch -q main', [], 0],
        ['git rebase main side', ['Current branch side is up to date.'], 0],
        ['git branch --show-current', ['side'], 0],
        ['git switch -q main', [], 0],
        ['git rebase side main', ['Successfully rebased and updated refs/heads/main.'], 0],
        ['git branch --show-current', ['main'], 0],
      ]);
      expect(texts(t.run('ls'))).toEqual(['f.txt  m.txt  n.txt  r.txt']);
    });
  });
});

/**
 * What the code review found, checked against real git (scratchpad scripts
 * gitrestore12 and gitmsg13, Git 2.56, 29 September 2026).
 */
describe('after the code review', () => {
  const infoOnly = (r: { lines: { type: string }[]; status?: number }) => {
    expect(r.lines.map((l) => l.type)).toEqual(['info']);
    expect(r.status).toBe(1);
  };

  it('an option git knows but the simulator does not do says so; an option git does not know gets its usage', () => {
    const t = seeded();
    t.run('git branch side');
    t.put('f.txt', 'a\nb\nLOCAL\n');
    // Real git switches with -f and discards the change: not simulated, and the change is still there.
    infoOnly(t.run('git switch -f side'));
    infoOnly(t.run('git checkout -f side'));
    infoOnly(t.run('git switch --discard-changes side'));
    expect(t.state.git!.branch).toBe('main');
    // Simulated since the remotes work (1 October 2026): with no origin/main, git refuses as real git does.
    const noUpstream = t.run('git branch -u origin/main');
    expect(texts(noUpstream)[0]).toBe("fatal: the requested upstream branch 'origin/main' does not exist");
    expect(noUpstream.status).toBe(128);
    infoOnly(t.run('git merge -s ours side'));
    infoOnly(t.run('git tag -v v1'));
    const bogus = t.run('git branch --bogus');
    expect(texts(bogus).slice(0, 2)).toEqual(["error: unknown option `bogus'", 'usage: git branch [<options>] [-r | -a] [--merged] [--no-merged] [(--forked <branch>)...]']);
    expect(bogus.status).toBe(129);
  });

  it('git restore on a conflicted file: refused in the working tree, resolved with --staged', () => {
    const t = conflicted();
    const markers = t.run('cat f.txt');
    for (const cmd of ['git restore f.txt', 'git restore .']) {
      const r = t.run(cmd);
      expect(texts(r), cmd).toEqual(["error: path 'f.txt' is unmerged"]);
      expect(r.status, cmd).toBe(1);
    }
    expect(texts(t.run('cat f.txt'))).toEqual(texts(markers));
    expect(t.run('git restore --staged f.txt').lines).toEqual([]);
    expect(texts(t.run('git status -s'))).toEqual([' M f.txt']);
    expect(texts(t.run('git status')).slice(0, 4)).toEqual([
      'On branch main', 'All conflicts fixed but you are still merging.', '  (use "git commit" to conclude merge)', '',
    ]);
  });

  it('the merge message lists the conflicts as comments: the editor removes them, --no-edit keeps them', () => {
    for (const [how, message] of [
      ['git commit', "Merge branch 'side'"],
      ['git merge --continue', "Merge branch 'side'"],
      ['git commit --no-edit', "Merge branch 'side'\n\n# Conflicts:\n#\tf.txt"],
    ]) {
      const t = conflicted();
      t.run('git add f.txt');
      const r = t.run(how);
      expect(r.lines.filter((l) => l.type !== 'info').map((l) => l.text), how).toEqual([`[main ${short(t.ref('main'))}] Merge branch 'side'`]);
      expect(t.state.git!.commits[0].message, how).toBe(message);
    }
  });

  it('git show on a merge fixed by hand: the combined diff is not simulated', () => {
    const t = conflicted();
    t.put('f.txt', 'a\nb\nBOTH\n');
    t.run('git add f.txt');
    t.run('git commit -q -m merged');
    infoOnly(t.run('git show'));
  });
});

/** The second fidelity audit, checked against real git (scratchpad script gitaudit14, Git 2.56, 29 September 2026). */
describe('the second fidelity audit', () => {
  /** one (f.txt a b c, h.txt 1, g.txt g); v1 lightweight, v2 annotated with three paragraphs. */
  function repo() {
    const t = depot();
    t.put('f.txt', 'a\nb\nc\n');
    t.put('h.txt', '1\n');
    t.put('g.txt', 'g\n');
    t.run('git add .');
    t.run('git commit -q -m one');
    t.run('git tag v1');
    t.run('git tag -a v2 -m first -m "para two" -m "para three"');
    return t;
  }
  const check = (t: ReturnType<typeof session>, cases: Array<[string, string[], number]>) => {
    for (const [cmd, expected, status] of cases) {
      const r = t.run(cmd);
      expect(texts(r), cmd).toEqual(expected);
      expect(r.status ?? 0, cmd).toBe(status);
    }
  };

  it('tag: -nN, modes that exclude each other, --points-at a tag, errors, globs, @', () => {
    const t = repo();
    check(t, [
      ['git tag -n3', ['v1              one', 'v2              first', '    ', '    para two'], 0],
      ['git tag -n0', ['v1', 'v2'], 0],
      ['git tag -n5x', ["error: switch `n' expects an integer value with an optional k/m/g suffix"], 129],
      ['git tag -l -d v2', ["error: options '-d' and '-l' cannot be used together"], 129],
      ['git tag -d -l v1', ["error: options '-l' and '-d' cannot be used together"], 129],
      ['git tag --points-at v2', ['v2'], 0],
      ['git tag --points-at nope', ["error: malformed object name 'nope'"], 129],
      ['git tag --merged nope', ['fatal: malformed object name nope'], 128],
      ['git tag -l "v[0-9]"', ['v1', 'v2'], 0],
      ['git tag -l "v[!1]"', ['v2'], 0],
      ['git tag -l "v[^1]"', ['v2'], 0],
      ['git tag @', [], 0],
    ]);
    // Nothing was deleted by the refused -l -d.
    expect(Object.keys(t.state.git!.tags!).sort()).toEqual(['@', 'v1', 'v2']);
    const fd = t.run('git tag -fd v1');
    expect(texts(fd)[0]).toBe('usage: git tag [-a | -s | -u <key-id>] [-f] [-m <msg> | -F <file>] [-e]');
    expect(fd.status).toBe(129);
    expect(t.state.git!.tags!.v1).toBeDefined();
    // The annotated tag keeps its three paragraphs.
    expect(t.state.git!.tagNotes!.v2.message).toBe('first\n\npara two\n\npara three');
  });

  it('commit: each -m is a paragraph', () => {
    const t = repo();
    t.run('git commit -q --allow-empty -m sub -m "body para"');
    expect(t.state.git!.commits[0].message).toBe('sub\n\nbody para');
    expect(texts(t.run('git log -1 --no-decorate')).slice(4)).toEqual(['    sub', '    ', '    body para']);
  });

  it('reset of paths during a merge: U for the paths still in conflict, a warning with --mixed', () => {
    const t = repo();
    t.run('git switch -q -c side');
    t.put('f.txt', 'a\nb\nS\n');
    t.put('h.txt', 'S\n');
    t.put('g.txt', 'G\n');
    t.run('git commit -q -am side');
    t.run('git switch -q main');
    t.put('f.txt', 'a\nb\nM\n');
    t.put('h.txt', 'M\n');
    t.run('git commit -q -am main');
    t.run('git merge side');
    check(t, [
      ['git reset f.txt', ['Unstaged changes after reset:', 'M\tf.txt', 'U\th.txt'], 0],
      ['git reset g.txt', ['Unstaged changes after reset:', 'M\tf.txt', 'M\tg.txt', 'U\th.txt'], 0],
      ['git reset --mixed h.txt', [
        "warning: --mixed with paths is deprecated; use 'git reset -- <paths>' instead.",
        'Unstaged changes after reset:', 'M\tf.txt', 'M\tg.txt', 'M\th.txt',
      ], 0],
    ]);
  });

  it('log: --decorate=no, several --grep, -n without a count; show: bad revision, a file alone', () => {
    const t = repo();
    t.run('git commit -q --allow-empty -m sub -m "body para"');
    t.run('echo M >> h.txt');
    t.run('git commit -q -am main');
    const [main, sub, one] = t.state.git!.commits.map((c) => short(c.hash));
    check(t, [
      ['git log -1 --oneline --decorate=no', [`${main} main`], 0],
      ['git log --oneline --no-decorate --grep=one --grep=main', [`${main} main`, `${one} one`], 0],
      ['git log --oneline --no-decorate --grep=o', [`${sub} sub`, `${one} one`], 0],
      ['git log --graph -n', ['error: -n requires an argument'], 128],
      ['git show nope -- f.txt', ["fatal: bad revision 'nope'"], 128],
    ]);
    // A file alone limits HEAD to it: the last commit changed h.txt, not f.txt.
    expect(texts(t.run('git show h.txt'))[0]).toBe(`commit ${t.ref('main')} (HEAD -> main)`);
    expect(t.run('git show f.txt').lines).toEqual([]);
    expect(texts(depot().run('git show HEAD -- f.txt'))).toEqual(["fatal: bad revision 'HEAD'"]);
  });
});

/** The second code review, checked against real git (Git 2.56, 29 September 2026). */
describe('after the second code review', () => {
  it('--grep reads a POSIX basic regex, line by line', () => {
    const t = depot();
    for (const m of ['fix(auth): login', 'fixauth', 'feat|fix x']) t.run(`git commit -q --allow-empty -m "${m}"`);
    t.run('git commit -q --allow-empty -m sub -m "body line"');
    const grep = (p: string) => texts(t.run(`git log --oneline --no-decorate --grep='${p}'`)).map((l) => l.slice(8));
    expect(grep('fix(auth)')).toEqual(['fix(auth): login']);
    expect(grep('feat|fix')).toEqual(['feat|fix x']);
    expect(grep('feat\\|fixauth')).toEqual(['feat|fix x', 'fixauth']);
    expect(grep('fix+')).toEqual([]);
    expect(grep('^body')).toEqual(['sub']);
  });

  it('log -n needs an integer; commit --message needs a value', () => {
    const t = seeded();
    for (const cmd of ['git log -n abc', 'git log --max-count=abc']) {
      const r = t.run(cmd);
      expect(texts(r), cmd).toEqual(["fatal: 'abc': not an integer"]);
      expect(r.status, cmd).toBe(128);
    }
    const r = t.run('git commit --allow-empty --message');
    expect(texts(r)).toEqual(["error: option `message' requires a value"]);
    expect(r.status).toBe(129);
  });

  it('tag -l globs: a reversed range matches nothing, POSIX classes work; -m values are not options', () => {
    const t = seeded();
    t.run('git tag v1');
    expect(t.run("git tag -l '[z-a]'").lines).toEqual([]);
    expect(texts(t.run("git tag -l '[[:alpha:]]1'"))).toEqual(['v1']);
    expect(texts(t.run("git branch --list '[[:lower:]]*'"))).toEqual(['* main']);
    const r = t.run('git tag -a v2 -mold');
    expect(r.lines).toEqual([]);
    expect(texts(t.run('git tag -n v2'))).toEqual(['v2              old']);
    expect(t.run('git tag -a v3 -m -l').lines).toEqual([]);
    expect(t.state.git!.tagNotes!.v3.message).toBe('-l');
  });

  it('git restore -p, --ours and --theirs are not simulated rather than ignored', () => {
    const t = seeded();
    t.run('echo zz >> f.txt');
    for (const cmd of ['git restore -p f.txt', 'git restore --ours f.txt', 'git restore --theirs f.txt']) {
      expect(t.run(cmd).lines.map((l) => l.type), cmd).toEqual(['info']);
    }
    expect(texts(t.run('git status -s'))).toEqual([' M f.txt']);
  });
});
