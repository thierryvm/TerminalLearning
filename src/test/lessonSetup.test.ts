import { describe, it, expect } from 'vitest';
import { createInitialState, processCommand } from '../app/data/terminalEngine';
import {
  gitRepoBehindRemote,
  gitRepoEmpty,
  gitRepoPushed,
  gitRepoWithBranch,
  gitRepoWithCommit,
  gitRepoWithWorkflow,
  powershellProfile,
  sshDirectory,
} from '../app/data/lessonSetup';

describe('lesson setups', () => {
  it('never mutate the state they receive', () => {
    for (const setup of [gitRepoEmpty, gitRepoWithCommit, gitRepoWithBranch('feature/x'), gitRepoPushed, gitRepoBehindRemote, gitRepoWithWorkflow, sshDirectory, powershellProfile]) {
      const base = createInitialState();
      const snapshot = JSON.stringify(base);
      setup.apply(base);
      expect(JSON.stringify(base)).toBe(snapshot);
    }
  });

  it('start Git lessons inside ~/projets, where the project files are', () => {
    const s = gitRepoEmpty.apply(createInitialState());
    expect(s.cwd).toEqual(['home', 'user', 'projets']);
    // Real git: `git add .` prints nothing; the .gitignore keeps .env out.
    const out = processCommand(s, 'git add .', 'linux');
    expect(out.lines).toEqual([]);
    expect(out.newState.git?.stagedFiles).toEqual(['.gitignore', 'README.md', 'index.html', 'script.sh']);
  });

  it('prepare the branch a merge lesson asks for, with main checked out', () => {
    const s = gitRepoWithBranch('feature/ma-feature').apply(createInitialState());
    const out = processCommand(s, 'git branch', 'linux');
    // Git lists branches in name order (Git 2.56).
    expect(out.lines.map((l) => l.text)).toEqual(['  feature/ma-feature', '* main']);
  });

  it('a remote just added holds nothing: the first push creates main there (git 2.56, 1 October 2026)', () => {
    const s = processCommand(gitRepoWithCommit.apply(createInitialState()), 'git remote add origin https://github.com/user/mon-projet.git', 'linux').newState;
    expect(processCommand(s, 'git log --oneline', 'linux').lines[0].text).toBe('a3f8c12 (HEAD -> main) feat: premier commit du projet');
    expect(processCommand(s, 'git push -u origin main', 'linux').lines.map((l) => l.text)).toEqual([
      'To https://github.com/user/mon-projet.git',
      ' * [new branch]      main -> main',
      "branch 'main' set up to track 'origin/main'.",
    ]);
  });

  it('give the GitHub lessons main pushed and tracked, as after git push -u origin main', () => {
    const s = gitRepoPushed.apply(createInitialState());
    expect(processCommand(s, 'git remote -v', 'linux').lines[0].text).toBe('origin\thttps://github.com/user/mon-projet.git (fetch)');
    expect(processCommand(s, 'git status', 'linux').lines[1].text).toBe("Your branch is up to date with 'origin/main'.");
    expect(processCommand(s, 'git push', 'linux').lines.map((l) => l.text)).toEqual(['Everything up-to-date']);
  });

  it('leave the GitHub Actions workflow at the root, untracked, for the lesson to move', () => {
    const s = gitRepoWithWorkflow.apply(createInitialState());
    const status = processCommand(s, 'git status -s', 'linux').lines.map((l) => l.text);
    expect(status).toEqual(['?? ci.yml']);
    expect(processCommand(s, 'cat ci.yml', 'linux').lines.map((l) => l.text)).toContain('      - uses: actions/checkout@v7');
  });

  it('create ~/.ssh with the permissions the lesson teaches (700 / 600 / 644)', () => {
    const s = sshDirectory.apply(createInitialState());
    const out = processCommand(s, 'ls -la ~/.ssh', 'linux').lines.map((l) => l.text).join('\n');
    expect(out).toMatch(/-rw------- .*id_ed25519\b(?!\.pub)/);
    expect(out).toMatch(/-rw-r--r-- .*id_ed25519\.pub/);
    const home = processCommand(s, 'ls -la', 'linux').lines.map((l) => l.text).join('\n');
    expect(home).toMatch(/drwx------ .*\.ssh/);
  });

  it('leave the default state untouched for lessons without a setup', () => {
    expect(processCommand(createInitialState(), 'ls -la ~/.ssh', 'linux').lines[0].type).toBe('error');
  });

  it('put the PowerShell profile where $PROFILE points (Windows)', () => {
    const s = powershellProfile.apply(createInitialState());
    const out = processCommand(s, 'cat $PROFILE', 'windows').lines;
    expect(out.every((l) => l.type !== 'error')).toBe(true);
    expect(out[0].text).toMatch(/Profil PowerShell/);
  });
});
