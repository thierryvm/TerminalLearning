/**
 * Remotes in the simulated git, against real git. Every expected text below was
 * printed by Git 2.56 (Git for Windows, no user config, no pager, no editor) on
 * 1 October 2026, with a local bare repository `../o.git` playing the remote.
 * Without a terminal git prints no progress lines, and neither does the
 * simulator. Hashes depend on the time of a commit, so they are read from the
 * simulated repository.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, processCommand } from '../app/data/terminalEngine';
import type { TerminalState } from '../app/data/commands/types';

const texts = (r: { lines: { text: string }[] }) => r.lines.map((l) => l.text);
const short = (h: string | undefined) => (h ?? '').slice(0, 7);

/** ~/a with one commit `c1`: each command runs on the state the previous one left. */
function repo() {
  let s: TerminalState = createInitialState();
  const api = {
    run(command: string) {
      const r = processCommand(s, command, 'linux');
      s = r.newState;
      return r;
    },
    ref(name: string) { return s.git!.refs![name]; },
    remoteRef(name: string) { return s.git!.remoteRefs![name]; },
  };
  for (const c of ['mkdir a', 'cd a', 'git init -q', 'echo x > R', 'git add .', 'git commit -q -m c1']) api.run(c);
  return api;
}

describe('git remote', () => {
  it('adds, lists, renames and refuses what real git refuses', () => {
    const t = repo();
    expect(texts(t.run('git remote'))).toEqual([]);
    expect(texts(t.run('git remote add origin ../o.git'))).toEqual([]);

    const dup = t.run('git remote add origin ../o.git');
    expect(texts(dup)).toEqual(['error: remote origin already exists.']);
    expect(dup.status).toBe(3);

    const usage = t.run('git remote add');
    expect(texts(usage)[0]).toBe('usage: git remote add [<options>] <name> <url>');
    expect(usage.status).toBe(129);

    expect(texts(t.run('git remote -v'))).toEqual(['origin\t../o.git (fetch)', 'origin\t../o.git (push)']);
    expect(texts(t.run('git remote get-url origin'))).toEqual(['../o.git']);

    const setUrl = t.run('git remote set-url nope x');
    expect(texts(setUrl)).toEqual(["error: No such remote 'nope'"]);
    expect(setUrl.status).toBe(2);

    expect(texts(t.run('git remote rename origin up'))).toEqual([]);
    expect(texts(t.run('git remote'))).toEqual(['up']);
    const renameDup = t.run('git remote rename up up');
    expect(texts(renameDup)).toEqual(['error: remote up already exists.']);
    expect(renameDup.status).toBe(3);

    const remove = t.run('git remote remove nope');
    expect(texts(remove)).toEqual(["error: No such remote: 'nope'"]);
    expect(remove.status).toBe(2);

    const unknown = t.run('git remote frob');
    expect(texts(unknown).slice(0, 2)).toEqual(["error: unknown subcommand: `frob'", 'usage: git remote [-v | --verbose]']);
    expect(unknown.status).toBe(129);
  });
});

describe('git push', () => {
  it('explains what is missing before anything is pushed', () => {
    const t = repo();
    t.run('git remote add origin ../o.git');
    const noUpstream = [
      'fatal: The current branch main has no upstream branch.',
      'To push the current branch and set the remote as upstream, use',
      '',
      '    git push --set-upstream origin main',
      '',
      'To have this happen automatically for branches without a tracking',
      "upstream, see 'push.autoSetupRemote' in 'git help config'.",
      '',
    ];
    for (const c of ['git push', 'git push origin']) {
      const r = t.run(c);
      expect(texts(r)).toEqual(noUpstream);
      expect(r.status).toBe(128);
    }

    const nope = t.run('git push nope main');
    expect(texts(nope)).toEqual([
      "fatal: 'nope' does not appear to be a git repository",
      'fatal: Could not read from remote repository.',
      '',
      'Please make sure you have the correct access rights',
      'and the repository exists.',
    ]);
    expect(nope.status).toBe(128);

    const refspec = t.run('git push origin nosuch');
    expect(texts(refspec)).toEqual(['error: src refspec nosuch does not match any', "error: failed to push some refs to '../o.git'"]);
    expect(refspec.status).toBe(1);
  });

  it('creates the branch, then reports ahead, pushes the update, and tracks it', () => {
    const t = repo();
    t.run('git remote add origin ../o.git');
    expect(texts(t.run('git push -u origin main'))).toEqual([
      'To ../o.git',
      ' * [new branch]      main -> main',
      "branch 'main' set up to track 'origin/main'.",
    ]);
    const pushed = t.ref('main');

    t.run('echo y >> R');
    t.run('git commit -q -a -m c2');
    expect(texts(t.run('git status'))).toEqual([
      'On branch main',
      "Your branch is ahead of 'origin/main' by 1 commit.",
      '  (use "git push" to publish your local commits)',
      '',
      'nothing to commit, working tree clean',
    ]);
    expect(texts(t.run('git branch -vv'))).toEqual([`* main ${short(t.ref('main'))} [origin/main: ahead 1] c2`]);
    expect(texts(t.run('git push'))).toEqual(['To ../o.git', `   ${short(pushed)}..${short(t.ref('main'))}  main -> main`]);
    expect(t.remoteRef('origin/main')).toBe(t.ref('main'));
    expect(texts(t.run('git push'))).toEqual(['Everything up-to-date']);
  });

  it('refuses a push when the remote moved on, as a colleague would make it', () => {
    const t = repo();
    t.run('git remote add origin ../o.git');
    t.run('git push -q -u origin main');
    // The remote gets c3 (pushed from here, then dropped locally), and main gets c4 instead.
    t.run('echo z >> R');
    t.run('git commit -q -a -m c3');
    t.run('git push -q');
    t.run('git reset -q --hard HEAD~1');
    t.run('echo w >> R');
    t.run('git commit -q -a -m c4');

    expect(texts(t.run('git status'))).toEqual([
      'On branch main',
      "Your branch and 'origin/main' have diverged,",
      'and have 1 and 1 different commits each, respectively.',
      '  (use "git pull" if you want to integrate the remote branch with yours)',
      '',
      'nothing to commit, working tree clean',
    ]);
    expect(texts(t.run('git branch -vv'))).toEqual([`* main ${short(t.ref('main'))} [origin/main: ahead 1, behind 1] c4`]);

    const rejected = t.run('git push');
    expect(texts(rejected)).toEqual([
      'To ../o.git',
      ' ! [rejected]        main -> main (non-fast-forward)',
      "error: failed to push some refs to '../o.git'",
      'hint: Updates were rejected because the tip of your current branch is behind',
      'hint: its remote counterpart. If you want to integrate the remote changes,',
      "hint: use 'git pull' before pushing again.",
      "hint: See the 'Note about fast-forwards' in 'git push --help' for details.",
    ]);
    expect(rejected.status).toBe(1);
  });
});

describe('git branch and the upstream', () => {
  it('unsets and sets the upstream like real git', () => {
    const t = repo();
    t.run('git remote add origin ../o.git');
    t.run('git push -q -u origin main');
    expect(texts(t.run('git branch --unset-upstream'))).toEqual([]);
    const again = t.run('git branch --unset-upstream');
    expect(texts(again)).toEqual(["fatal: branch 'main' has no upstream information"]);
    expect(again.status).toBe(128);
    expect(texts(t.run('git branch -u origin/main'))).toEqual(["branch 'main' set up to track 'origin/main'."]);
    const missing = t.run('git branch -u origin/nope');
    expect(texts(missing)[0]).toBe("fatal: the requested upstream branch 'origin/nope' does not exist");
    expect(missing.status).toBe(128);
  });
});

describe('switching branches tells where the upstream stands', () => {
  it('after Switched to branch and Already on, never after a new branch', () => {
    const t = repo();
    t.run('git remote add origin ../o.git');
    t.run('git push -q -u origin main');
    expect(texts(t.run('git switch -c x'))).toEqual(["Switched to a new branch 'x'"]);
    expect(texts(t.run('git switch main'))).toEqual(["Switched to branch 'main'", "Your branch is up to date with 'origin/main'."]);
    expect(texts(t.run('git checkout x'))).toEqual(["Switched to branch 'x'"]);
    expect(texts(t.run('git checkout -'))).toEqual(["Switched to branch 'main'", "Your branch is up to date with 'origin/main'."]);
    expect(texts(t.run('git switch main'))).toEqual(["Already on 'main'", "Your branch is up to date with 'origin/main'."]);
    expect(texts(t.run('git status -sb'))).toEqual(['## main...origin/main']);

    t.run('echo y >> R');
    t.run('git commit -q -a -m c2');
    expect(texts(t.run('git status -sb'))).toEqual(['## main...origin/main [ahead 1]']);
    t.run('git switch -q x');
    expect(texts(t.run('git status -sb'))).toEqual(['## x']);
    expect(texts(t.run('git switch main'))).toEqual([
      "Switched to branch 'main'",
      "Your branch is ahead of 'origin/main' by 1 commit.",
      '  (use "git push" to publish your local commits)',
    ]);
  });

  it('a branch started from origin/main tracks it, and git push then refuses the name mismatch', () => {
    const t = repo();
    t.run('git remote add origin ../o.git');
    t.run('git push -q -u origin main');
    expect(texts(t.run('git switch -c new origin/main'))).toEqual(["Switched to a new branch 'new'", "branch 'new' set up to track 'origin/main'."]);
    expect(texts(t.run('git status -sb'))).toEqual(['## new...origin/main']);
    const mismatch = [
      'fatal: The upstream branch of your current branch does not match',
      'the name of your current branch.  To push to the upstream branch',
      'on the remote, use',
      '',
      '    git push origin HEAD:main',
      '',
      'To push to the branch of the same name on the remote, use',
      '',
      '    git push origin HEAD',
      '',
      "To choose either option permanently, see push.default in 'git help config'.",
      '',
      'To avoid automatically configuring an upstream branch when its name',
      "won't match the local branch, see option 'simple' of branch.autoSetupMerge",
      "in 'git help config'.",
      '',
    ];
    for (const c of ['git push', 'git push origin']) {
      const r = t.run(c);
      expect(texts(r)).toEqual(mismatch);
      expect(r.status).toBe(128);
    }
    t.run('git switch -q main');
    expect(texts(t.run('git checkout -b y --track origin/main'))).toEqual(["Switched to a new branch 'y'", "branch 'y' set up to track 'origin/main'."]);
  });
});

describe('push, pull and fetch: the less common answers', () => {
  it('git push origin before any remote, or naming one that does not exist', () => {
    const t = repo();
    const noUpstream = (remote: string) => `    git push --set-upstream ${remote} main`;
    expect(texts(t.run('git push origin'))[3]).toBe(noUpstream('origin'));
    expect(texts(t.run('git push nope'))[3]).toBe(noUpstream('nope'));
    t.run('git remote add up ../o.git');
    expect(texts(t.run('git push origin'))[3]).toBe(noUpstream('origin'));
    expect(texts(t.run('git push nope'))[0]).toBe("fatal: 'nope' does not appear to be a git repository");
    expect(texts(t.run('git push origin main'))[0]).toBe("fatal: 'origin' does not appear to be a git repository");
  });

  it('a rejected branch that is not the current one gets its own hint', () => {
    const t = repo();
    t.run('git remote add origin ../o.git');
    t.run('git push -q -u origin main');
    t.run('echo y >> R');
    t.run('git commit -q -a -m c2');
    t.run('git push -q');
    t.run('git reset -q --hard HEAD~1');
    t.run('echo z >> R');
    t.run('git commit -q -a -m c3');
    t.run('git switch -q -c work');
    const r = t.run('git push origin main');
    expect(texts(r)).toEqual([
      'To ../o.git',
      ' ! [rejected]        main -> main (non-fast-forward)',
      "error: failed to push some refs to '../o.git'",
      'hint: Updates were rejected because a pushed branch tip is behind its remote',
      "hint: counterpart. If you want to integrate the remote changes, use 'git pull'",
      'hint: before pushing again.',
      "hint: See the 'Note about fast-forwards' in 'git push --help' for details.",
    ]);
    expect(texts(t.run('git push origin work:main'))[1]).toBe(' ! [rejected]        work -> main (non-fast-forward)');
  });

  it('git pull with a remote but no branch, an unknown remote, or no remote at all', () => {
    const t = repo();
    expect(texts(t.run('git pull --rebase'))[8]).toBe('    git branch --set-upstream-to=origin/<branch> main');
    expect(texts(t.run('git pull'))[8]).toBe('    git branch --set-upstream-to=<remote>/<branch> main');
    t.run('git remote add origin ../o.git');
    t.run('git push -q origin main');
    const notDefault = t.run('git pull origin');
    expect(texts(notDefault)).toEqual([
      "You asked to pull from the remote 'origin', but did not specify",
      'a branch. Because this is not the default configured remote',
      'for your current branch, you must specify a branch on the command line.',
    ]);
    expect(notDefault.status).toBe(1);
    for (const c of ['git pull nope', 'git pull nope main']) {
      const r = t.run(c);
      expect(texts(r)[0]).toBe("fatal: 'nope' does not appear to be a git repository");
      expect(r.status).toBe(1);
    }
    t.run('git branch -q -u origin/main');
    expect(texts(t.run('git pull origin'))).toEqual(['Already up to date.']);
  });

  it('git fetch names FETCH_HEAD for a branch, and records origin/HEAD', () => {
    const t = repo();
    t.run('git remote add origin ../o.git');
    t.run('git push -q -u origin main');
    expect(texts(t.run('git fetch origin main'))).toEqual(['From ../o', ' * branch            main       -> FETCH_HEAD']);
    const nope = t.run('git fetch origin nope');
    expect(texts(nope)).toEqual(["fatal: couldn't find remote ref nope"]);
    expect(nope.status).toBe(128);
    // Naming the branch does not record the remote's HEAD; a plain fetch does.
    expect(texts(t.run('git pull origin main'))).toEqual(['From ../o', ' * branch            main       -> FETCH_HEAD', 'Already up to date.']);
    expect(texts(t.run('git branch -r'))).toEqual(['  origin/main']);
    expect(texts(t.run('git fetch'))).toEqual([]);
    expect(texts(t.run('git branch -r'))).toEqual(['  origin/HEAD -> origin/main', '  origin/main']);
  });

  it('git branch -u checks its value and the branch', () => {
    const t = repo();
    t.run('git remote add origin ../o.git');
    t.run('git push -q origin main');
    const cases: [string, string, number][] = [
      ['git branch -u origin/main nobranch', "fatal: branch 'nobranch' does not exist", 128],
      ['git branch -u', "error: switch `u' requires a value", 129],
      ['git branch --set-upstream-to', "error: option `set-upstream-to' requires a value", 129],
    ];
    for (const [c, line, status] of cases) {
      const r = t.run(c);
      expect(texts(r)).toEqual([line]);
      expect(r.status).toBe(status);
    }
  });
});
