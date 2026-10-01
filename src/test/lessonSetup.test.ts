import { describe, it, expect } from 'vitest';
import { createInitialState, processCommand } from '../app/data/terminalEngine';
import {
  gitRepoEmpty,
  gitRepoWithBranch,
  gitRepoWithCommit,
  gitRepoWithRemote,
  powershellProfile,
  sshDirectory,
} from '../app/data/lessonSetup';

describe('lesson setups', () => {
  it('never mutate the state they receive', () => {
    for (const setup of [gitRepoEmpty, gitRepoWithCommit, gitRepoWithRemote, gitRepoWithBranch('feature/x'), sshDirectory, powershellProfile]) {
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

  it('give push lessons a commit and an origin remote', () => {
    const s = gitRepoWithRemote.apply(createInitialState());
    const out = processCommand(s, 'git remote -v', 'linux');
    expect(out.lines[0].text).toBe('origin\thttps://github.com/user/mon-projet.git (fetch)');
    // Nothing pushed yet: no origin/main, so the first push creates it (git 2.56, 1 October 2026).
    expect(processCommand(s, 'git log --oneline', 'linux').lines[0].text).toBe('a3f8c12 (HEAD -> main) feat: premier commit du projet');
    expect(processCommand(s, 'git push -u origin main', 'linux').lines.map((l) => l.text)).toEqual([
      'To https://github.com/user/mon-projet.git',
      ' * [new branch]      main -> main',
      "branch 'main' set up to track 'origin/main'.",
    ]);
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
