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
    const out = processCommand(s, 'git add .', 'linux');
    expect(out.lines.map((l) => l.text)).toEqual(['staged: script.sh', 'staged: README.md']);
  });

  it('prepare the branch a merge lesson asks for, with main checked out', () => {
    const s = gitRepoWithBranch('feature/ma-feature').apply(createInitialState());
    const out = processCommand(s, 'git branch', 'linux');
    expect(out.lines.map((l) => l.text)).toEqual(['* main', '  feature/ma-feature']);
  });

  it('give push lessons a commit and an origin remote', () => {
    const s = gitRepoWithRemote.apply(createInitialState());
    const out = processCommand(s, 'git remote -v', 'linux');
    expect(out.lines[0].text).toBe('origin\thttps://github.com/user/mon-projet.git (fetch)');
    expect(processCommand(s, 'git log --oneline', 'linux').lines[0].text).toBe('a3f8c12 feat: premier commit du projet');
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
