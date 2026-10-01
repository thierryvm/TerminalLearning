import { describe, it, expect } from 'vitest';
import { processCommand, getTabCompletions, createInitialState, displayPathForEnv } from '../app/data/terminalEngine';
import type { TerminalState } from '../app/data/terminalEngine';
import { fingerprintLine, randomart, sha256 } from '../app/data/commands/sshKeygen';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<TerminalState> = {}): TerminalState {
  return {
    root: {
      type: 'directory',
      children: {},
      permissions: 'drwxr-xr-x',
      owner: 'user',
      group: 'user',
    },
    cwd: [],
    commandHistory: [],
    user: 'user',
    hostname: 'terminal-learning',
    envVars: {
      PATH: '/usr/local/bin:/usr/bin:/bin',
      HOME: '/home/user',
      USER: 'user',
      SHELL: '/bin/bash',
    },
    ...overrides,
  };
}

/** Creates each file (content = its name) in the current directory, as `echo name > name`. */
function withFiles(state: TerminalState, ...names: string[]): TerminalState {
  return names.reduce((s, name) => processCommand(s, `echo ${name} > ${name}`).newState, state);
}

// Pre-populated filesystem for filesystem-command tests
function makeStateWithFS(): TerminalState {
  return makeState({
    cwd: ['home', 'user'],
    root: {
      type: 'directory',
      children: {
        home: {
          type: 'directory',
          children: {
            user: {
              type: 'directory',
              children: {
                'test.txt': {
                  type: 'file',
                  content: 'ligne1\nligne2\nligne3\nligne4\nligne5',
                  permissions: '-rw-r--r--',
                  owner: 'user',
                  group: 'user',
                } as never,
                '.hidden': {
                  type: 'file',
                  content: 'secret',
                  permissions: '-rw-------',
                  owner: 'user',
                  group: 'user',
                } as never,
                docs: {
                  type: 'directory',
                  children: {},
                  permissions: 'drwxr-xr-x',
                  owner: 'user',
                  group: 'user',
                },
              },
              permissions: 'drwxr-xr-x',
              owner: 'user',
              group: 'user',
            },
          },
          permissions: 'drwxr-xr-x',
          owner: 'user',
          group: 'user',
        },
      },
      permissions: 'drwxr-xr-x',
      owner: 'user',
      group: 'user',
    },
  });
}

// ─── about ────────────────────────────────────────────────────────────────────

describe('about', () => {
  it('displays project info block', () => {
    const result = processCommand(makeState(), 'about');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('Terminal Learning');
    expect(text).toContain('MIT');
    expect(text).toContain('thierryvm');
  });

  it('uses info type for all lines', () => {
    const result = processCommand(makeState(), 'about');
    expect(result.lines.every((l) => l.type === 'info')).toBe(true);
  });
});

// ─── hall-of-fame ─────────────────────────────────────────────────────────────

describe('hall-of-fame', () => {
  it('displays the contributors block', () => {
    const result = processCommand(makeState(), 'hall-of-fame');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('Hall of Fame');
  });
});

// ─── help ─────────────────────────────────────────────────────────────────────

describe('help', () => {
  it('lists the new commands', () => {
    const result = processCommand(makeState(), 'help');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('about');
    expect(text).toContain('hall-of-fame');
  });
});

// ─── man ────────────────────────────────────────────────────────────────────
// Backs the "Anatomie d'une commande" lesson exercise (man <cmd>) and closes
// the curriculum-validator WARNING that `man` had no engine test.

describe('man', () => {
  it('returns the ls manual page (linux)', () => {
    const result = processCommand(makeState(), 'man ls');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(result.lines[0].type).not.toBe('error');
    expect(text).toContain('Liste le contenu');
  });

  it('returns the ls manual page on windows env too (simulator)', () => {
    const result = processCommand(makeState(), 'man ls', 'windows');
    expect(result.lines[0].type).not.toBe('error');
  });

  it('errors when no command name is given', () => {
    const result = processCommand(makeState(), 'man');
    expect(result.lines[0].type).toBe('error');
  });

  it('errors for a command with no manual page', () => {
    const result = processCommand(makeState(), 'man zzzznope');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('zzzznope');
  });
});

// ─── unknown command ──────────────────────────────────────────────────────────

describe('unknown command', () => {
  it('returns an error line', () => {
    const result = processCommand(makeState(), 'foobar');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('foobar');
  });
});

// ─── empty input ──────────────────────────────────────────────────────────────

describe('empty input', () => {
  it('returns no output lines', () => {
    const result = processCommand(makeState(), '');
    expect(result.lines).toHaveLength(0);
  });

  it('does not add empty string to history', () => {
    const result = processCommand(makeState(), '');
    expect(result.newState.commandHistory).toHaveLength(0);
  });
});

// ─── getTabCompletions ────────────────────────────────────────────────────────
// cwd in createInitialState() = ['home', 'user']
// children: documents/, downloads/, projets/, .bashrc, .profile

describe('getTabCompletions — command name (no space)', () => {
  const state = createInitialState();

  it('completes a unique prefix', () => {
    expect(getTabCompletions('pw', state)).toEqual(['pwd']);
  });

  it('returns multiple matches for ambiguous prefix', () => {
    const completions = getTabCompletions('c', state);
    expect(completions).toContain('cd');
    expect(completions).toContain('cat');
    expect(completions).toContain('chmod');
    expect(completions.length).toBeGreaterThan(2);
  });

  it('returns empty array for no match', () => {
    expect(getTabCompletions('xyz', state)).toHaveLength(0);
  });

  it('includes new commands', () => {
    expect(getTabCompletions('ab', state)).toContain('about');
    expect(getTabCompletions('hall', state)).toContain('hall-of-fame');
  });

  it('returns all commands for empty input', () => {
    expect(getTabCompletions('', state).length).toBeGreaterThan(20);
  });
});

describe('getTabCompletions — path completion (with space)', () => {
  const state = createInitialState();

  it('completes a directory in cwd with trailing slash', () => {
    expect(getTabCompletions('cd doc', state)).toContain('cd documents/');
  });

  it('completes a file in cwd without trailing slash', () => {
    const completions = getTabCompletions('cat .bash', state);
    expect(completions).toContain('cat .bashrc');
    expect(completions[0]).not.toMatch(/\/$/);
  });

  it('returns multiple matches for ambiguous path prefix', () => {
    // documents/ and downloads/ both start with 'd'
    const completions = getTabCompletions('ls d', state);
    expect(completions).toContain('ls documents/');
    expect(completions).toContain('ls downloads/');
    expect(completions.length).toBeGreaterThanOrEqual(2);
  });

  it('completes inside a subdirectory', () => {
    expect(getTabCompletions('cat documents/n', state)).toContain('cat documents/notes.txt');
  });

  it('lists all entries when path arg is empty', () => {
    const completions = getTabCompletions('ls ', state);
    expect(completions).toContain('ls documents/');
    expect(completions).toContain('ls downloads/');
    expect(completions).toContain('ls .bashrc');
  });

  it('returns empty array for non-existent parent directory', () => {
    expect(getTabCompletions('cd /nonexistent/', state)).toHaveLength(0);
  });
});

// ─── Windows PowerShell aliases ───────────────────────────────────────────────

describe('PowerShell aliases — navigation', () => {
  it('Get-Location returns current directory', () => {
    const state = createInitialState();
    // Without env param, uses linux default → displayPath returns '~'
    const result = processCommand(state, 'Get-Location');
    expect(result.lines[0].text).toBeTruthy();
    // With windows env → Windows-style path
    const resultWin = processCommand(state, 'Get-Location', 'windows');
    expect(resultWin.lines[0].text).toContain('C:\\Users\\user');
  });

  it('gl is an alias for Get-Location', () => {
    const state = createInitialState();
    const r1 = processCommand(state, 'Get-Location');
    const r2 = processCommand(state, 'gl');
    expect(r1.lines[0].text).toBe(r2.lines[0].text);
  });

  it('Set-Location changes directory', () => {
    const state = createInitialState();
    const result = processCommand(state, 'Set-Location documents');
    expect(result.newState.cwd).toContain('documents');
  });

  it('Get-ChildItem lists files', () => {
    const state = createInitialState();
    const result = processCommand(state, 'Get-ChildItem');
    const text = result.lines.map((l) => l.text).join(' ');
    expect(text).toContain('documents');
  });

  it('dir is an alias for Get-ChildItem', () => {
    const state = createInitialState();
    const r1 = processCommand(state, 'Get-ChildItem');
    const r2 = processCommand(state, 'dir');
    expect(r1.lines).toEqual(r2.lines);
  });
});

describe('PowerShell aliases — file operations', () => {
  it('Get-Content reads a file', () => {
    const state = createInitialState();
    const result = processCommand(state, 'Get-Content documents/notes.txt');
    expect(result.lines.some((l) => l.text.includes('Mes notes'))).toBe(true);
  });

  it('gc is an alias for Get-Content', () => {
    const state = createInitialState();
    const r1 = processCommand(state, 'Get-Content documents/notes.txt');
    const r2 = processCommand(state, 'gc documents/notes.txt');
    expect(r1.lines).toEqual(r2.lines);
  });

  it('New-Item creates a file', () => {
    const state = createInitialState();
    const result = processCommand(state, 'New-Item -ItemType File -Name test.txt');
    expect(result.lines[0]?.type).not.toBe('error');
    // File should now exist
    const check = processCommand(result.newState, 'Get-Content test.txt');
    expect(check.lines[0]?.type).not.toBe('error');
  });

  it('New-Item creates a directory', () => {
    const state = createInitialState();
    const result = processCommand(state, 'New-Item -ItemType Directory -Name newfolder');
    expect(result.lines[0]?.type).not.toBe('error');
    const check = processCommand(result.newState, 'Get-ChildItem');
    expect(check.lines.map((l) => l.text).join(' ')).toContain('newfolder');
  });

  it('Copy-Item copies a file', () => {
    const state = createInitialState();
    const result = processCommand(state, 'Copy-Item documents/notes.txt documents/notes-bak.txt');
    expect(result.lines[0]?.type).not.toBe('error');
  });

  it('Remove-Item deletes a file', () => {
    const state = createInitialState();
    const after = processCommand(state, 'Remove-Item documents/notes.txt');
    expect(after.lines[0]?.type).not.toBe('error');
    const check = processCommand(after.newState, 'Get-Content documents/notes.txt');
    expect(check.lines[0]?.type).toBe('error');
  });

  it('del is an alias for Remove-Item', () => {
    const state = createInitialState();
    const result = processCommand(state, 'del documents/notes.txt');
    expect(result.lines[0]?.type).not.toBe('error');
  });
});

describe('PowerShell aliases — processes & search', () => {
  it('Get-Process returns process list', () => {
    const state = createInitialState();
    const result = processCommand(state, 'Get-Process');
    expect(result.lines.some((l) => l.text.includes('ProcessName') || l.text.includes('pwsh'))).toBe(true);
  });

  it('Stop-Process sends stop signal', () => {
    const state = createInitialState();
    const result = processCommand(state, 'Stop-Process -Name node');
    expect(result.lines[0].type).toBe('success');
  });

  it('Select-String searches in files', () => {
    const state = createInitialState();
    const result = processCommand(state, 'Select-String "notes" documents/notes.txt');
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('cls clears the terminal', () => {
    const state = createInitialState();
    const result = processCommand(state, 'cls');
    expect(result.clear).toBe(true);
  });
});

describe('macOS-specific commands', () => {
  it('open simulates opening a file', () => {
    const state = createInitialState();
    const result = processCommand(state, 'open documents/notes.txt');
    expect(result.lines[0].type).toBe('success');
  });

  it('brew install simulates package install', () => {
    const state = createInitialState();
    const result = processCommand(state, 'brew install wget');
    expect(result.lines.some((l) => l.text.includes('wget'))).toBe(true);
    expect(result.lines[result.lines.length - 1].type).toBe('success');
  });

  it('brew list shows installed packages', () => {
    const state = createInitialState();
    const result = processCommand(state, 'brew list');
    expect(result.lines[0].text).toContain('git');
  });
});

describe('Windows package manager', () => {
  it('winget install simulates package install', () => {
    const state = createInitialState();
    const result = processCommand(state, 'winget install git');
    expect(result.lines.some((l) => l.text.toLowerCase().includes('git'))).toBe(true);
    expect(result.lines[result.lines.length - 1].type).toBe('success');
  });

  it('winget list shows installed packages', () => {
    const state = createInitialState();
    const result = processCommand(state, 'winget list');
    expect(result.lines.some((l) => l.text.includes('Git'))).toBe(true);
  });
});

// ─── help — contextual (env-aware) ───────────────────────────────────────────

describe('help — no args, env-specific command list', () => {
  it('linux: contains bash commands', () => {
    const state = makeState();
    const text = processCommand(state, 'help', 'linux').lines.map((l) => l.text).join('\n');
    expect(text).toContain('pwd');
    expect(text).toContain('grep');
    expect(text).toContain('chmod');
    expect(text).toContain('uname');
  });

  it('windows: contains PowerShell commands', () => {
    const state = makeState();
    const text = processCommand(state, 'help', 'windows').lines.map((l) => l.text).join('\n');
    expect(text).toContain('Get-Location');
    expect(text).toContain('Get-ChildItem');
    expect(text).toContain('winget');
    expect(text).not.toContain('uname');
  });

  it('macos: contains macOS-specific commands', () => {
    const state = makeState();
    const text = processCommand(state, 'help', 'macos').lines.map((l) => l.text).join('\n');
    expect(text).toContain('brew');
    expect(text).toContain('open');
    expect(text).toContain('pbcopy');
    expect(text).not.toContain('uname -a\n');
  });
});

// ─── help — Tip section (THI-39: "apprendre à apprendre") ────────────────────

describe('help — Tip section per environment', () => {
  it('linux: tip mentions man and --help', () => {
    const state = makeState();
    const text = processCommand(state, 'help', 'linux').lines.map((l) => l.text).join('\n');
    expect(text).toContain('man <commande>');
    expect(text).toContain('--help');
  });

  it('linux: tip mentions whatis and apropos', () => {
    const state = makeState();
    const text = processCommand(state, 'help', 'linux').lines.map((l) => l.text).join('\n');
    expect(text).toContain('whatis');
    expect(text).toContain('apropos');
  });

  it('macos: tip mentions man and --help', () => {
    const state = makeState();
    const text = processCommand(state, 'help', 'macos').lines.map((l) => l.text).join('\n');
    expect(text).toContain('man <commande>');
    expect(text).toContain('--help');
  });

  it('macos: tip mentions whatis and apropos', () => {
    const state = makeState();
    const text = processCommand(state, 'help', 'macos').lines.map((l) => l.text).join('\n');
    expect(text).toContain('whatis');
    expect(text).toContain('apropos');
  });

  it('windows: tip mentions Get-Help and -?', () => {
    const state = makeState();
    const text = processCommand(state, 'help', 'windows').lines.map((l) => l.text).join('\n');
    expect(text).toContain('Get-Help');
    expect(text).toContain('-?');
  });

  it('windows: tip mentions Get-Command and Get-Member', () => {
    const state = makeState();
    const text = processCommand(state, 'help', 'windows').lines.map((l) => l.text).join('\n');
    expect(text).toContain('Get-Command');
    expect(text).toContain('Get-Member');
  });

  it('linux and windows tips are different', () => {
    const state = makeState();
    const linuxText = processCommand(state, 'help', 'linux').lines.map((l) => l.text).join('\n');
    const windowsText = processCommand(state, 'help', 'windows').lines.map((l) => l.text).join('\n');
    expect(linuxText).not.toContain('Get-Help');
    expect(windowsText).not.toContain('apropos');
  });

  it('tip section separator is present in all envs', () => {
    const state = makeState();
    for (const env of ['linux', 'macos', 'windows'] as const) {
      const text = processCommand(state, 'help', env).lines.map((l) => l.text).join('\n');
      expect(text).toContain('💡');
    }
  });
});

describe('help <cmd> — targeted contextual help', () => {
  it('returns synopsis and description for a known command', () => {
    const state = makeState();
    const result = processCommand(state, 'help ls', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('ls');
    expect(text).toContain('-l');
    expect(text).toContain('-a');
  });

  it('returns linux examples for linux env', () => {
    const state = makeState();
    const text = processCommand(state, 'help ls', 'linux').lines.map((l) => l.text).join('\n');
    expect(text).toContain('ls -la');
  });

  it('returns windows examples for windows env', () => {
    const state = makeState();
    const text = processCommand(state, 'help ls', 'windows').lines.map((l) => l.text).join('\n');
    expect(text).toContain('Get-ChildItem');
  });

  it('resolves PowerShell alias to correct help entry', () => {
    const state = makeState();
    const r1 = processCommand(state, 'help ls', 'windows');
    const r2 = processCommand(state, 'help get-childitem', 'windows');
    const r3 = processCommand(state, 'help dir', 'windows');
    const t1 = r1.lines.map((l) => l.text).join('\n');
    const t2 = r2.lines.map((l) => l.text).join('\n');
    const t3 = r3.lines.map((l) => l.text).join('\n');
    expect(t1).toContain('Get-ChildItem');
    expect(t2).toContain('Get-ChildItem');
    expect(t3).toContain('Get-ChildItem');
  });

  it('returns error for unknown command', () => {
    const state = makeState();
    const result = processCommand(state, 'help unknowncmd', 'linux');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('unknowncmd');
  });

  it('resolves rm aliases (del, erase, remove-item)', () => {
    const state = makeState();
    ['del', 'erase', 'remove-item', 'ri'].forEach((alias) => {
      const text = processCommand(state, `help ${alias}`, 'windows').lines.map((l) => l.text).join('\n');
      expect(text).toContain('Remove-Item');
    });
  });
});

describe('man — delegates to contextual help', () => {
  it('man ls returns help for ls', () => {
    const state = makeState();
    const text = processCommand(state, 'man ls', 'linux').lines.map((l) => l.text).join('\n');
    expect(text).toContain('ls');
    expect(text).toContain('-l');
  });

  it('man grep returns grep help', () => {
    const state = makeState();
    const text = processCommand(state, 'man grep', 'linux').lines.map((l) => l.text).join('\n');
    expect(text).toContain('grep');
    expect(text).toContain('-n');
    expect(text).toContain('-i');
  });

  it('man without args returns error', () => {
    const state = makeState();
    const result = processCommand(state, 'man');
    expect(result.lines[0].type).toBe('error');
  });

  it('man on unknown command returns error', () => {
    const state = makeState();
    const result = processCommand(state, 'man notacommand');
    expect(result.lines[0].type).toBe('error');
  });
});

// ─── uname — env-aware ───────────────────────────────────────────────────────

// ─── displayPathForEnv — terminal profile ────────────────────────────────────

describe('displayPathForEnv — path formatting per env', () => {
  const home = ['home', 'user'];
  const deep = ['home', 'user', 'documents'];
  const root = ['tmp'];

  it('linux home → ~', () => {
    expect(displayPathForEnv(home, 'linux')).toBe('~');
  });

  it('linux subdir → ~/documents', () => {
    expect(displayPathForEnv(deep, 'linux')).toBe('~/documents');
  });

  it('linux non-home → /tmp', () => {
    expect(displayPathForEnv(root, 'linux')).toBe('/tmp');
  });

  it('macos home → ~ (same as linux)', () => {
    expect(displayPathForEnv(home, 'macos')).toBe('~');
  });

  it('macos subdir → ~/documents', () => {
    expect(displayPathForEnv(deep, 'macos')).toBe('~/documents');
  });

  it('windows home → C:\\Users\\user', () => {
    expect(displayPathForEnv(home, 'windows')).toBe('C:\\Users\\user');
  });

  it('windows subdir → C:\\Users\\user\\documents', () => {
    expect(displayPathForEnv(deep, 'windows')).toBe('C:\\Users\\user\\documents');
  });

  it('windows non-home → C:\\tmp', () => {
    expect(displayPathForEnv(root, 'windows')).toBe('C:\\tmp');
  });
});

describe('pwd — env-aware path output', () => {
  // A real pwd prints the absolute path; only the prompt shortens it to ~ (THI-353).
  it('linux → /home/user for home directory', () => {
    const state = createInitialState();
    const result = processCommand(state, 'pwd', 'linux');
    expect(result.lines[0].text).toBe('/home/user');
  });

  it('macos → /home/user for home directory (the simulator keeps one home for bash and zsh)', () => {
    const state = createInitialState();
    const result = processCommand(state, 'pwd', 'macos');
    expect(result.lines[0].text).toBe('/home/user');
  });

  it('windows → C:\\Users\\user for home directory', () => {
    const state = createInitialState();
    const result = processCommand(state, 'pwd', 'windows');
    expect(result.lines[0].text).toBe('C:\\Users\\user');
  });

  it('windows after cd → shows Windows-style path', () => {
    const state = createInitialState();
    const after = processCommand(state, 'cd documents', 'windows');
    const result = processCommand(after.newState, 'pwd', 'windows');
    expect(result.lines[0].text).toBe('C:\\Users\\user\\documents');
  });

  it('Get-Location on windows → Windows-style path', () => {
    const state = createInitialState();
    const result = processCommand(state, 'Get-Location', 'windows');
    expect(result.lines[0].text).toBe('C:\\Users\\user');
  });

  it('gl alias on windows → Windows-style path', () => {
    const state = createInitialState();
    const result = processCommand(state, 'gl', 'windows');
    expect(result.lines[0].text).toBe('C:\\Users\\user');
  });
});

describe('uname — env-aware', () => {
  it('linux: returns Linux', () => {
    const state = makeState();
    expect(processCommand(state, 'uname', 'linux').lines[0].text).toBe('Linux');
  });

  it('linux -a: returns full Linux info', () => {
    const state = makeState();
    const text = processCommand(state, 'uname -a', 'linux').lines[0].text;
    expect(text).toContain('Linux');
    expect(text).toContain('GNU/Linux');
  });

  it('macos: returns Darwin', () => {
    const state = makeState();
    expect(processCommand(state, 'uname', 'macos').lines[0].text).toBe('Darwin');
  });

  it('macos -a: returns Darwin kernel info', () => {
    const state = makeState();
    const text = processCommand(state, 'uname -a', 'macos').lines[0].text;
    expect(text).toContain('Darwin');
  });

  it('windows: returns error (not available)', () => {
    const state = makeState();
    const result = processCommand(state, 'uname', 'windows');
    expect(result.lines[0].type).toBe('error');
  });
});

// ─── Module 7: Variables & Scripts — engine commands ─────────────────────────

describe('export — set environment variable', () => {
  it('export VAR=value sets the variable', () => {
    const state = makeState();
    const result = processCommand(state, 'export GREETING=Hello', 'linux');
    expect(result.newState.envVars['GREETING']).toBe('Hello');
  });

  it('export with quotes strips them', () => {
    const state = makeState();
    const result = processCommand(state, 'export NODE_ENV="production"', 'linux');
    expect(result.newState.envVars['NODE_ENV']).toBe('production');
  });

  it('export with no args lists all variables', () => {
    const state = makeState();
    const result = processCommand(state, 'export', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('PATH');
  });

  it('export with invalid name returns error', () => {
    const state = makeState();
    const result = processCommand(state, 'export 1INVALID=val', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('export in windows env returns info message', () => {
    const state = makeState();
    const result = processCommand(state, 'export GREETING=Hello', 'windows');
    expect(result.lines[0].type).toBe('info');
  });
});

describe('env — list environment variables', () => {
  it('env lists all KEY=value pairs', () => {
    const state = makeState();
    const result = processCommand(state, 'env', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('PATH=');
    expect(text).toContain('USER=user');
  });

  it('env output has one line per variable', () => {
    const state = makeState();
    const result = processCommand(state, 'env', 'linux');
    expect(result.lines.length).toBeGreaterThan(0);
    result.lines.forEach((l) => expect(l.text).toContain('='));
  });
});

describe('printenv — print specific variables', () => {
  it('printenv PATH returns its value', () => {
    const state = makeState();
    const result = processCommand(state, 'printenv PATH', 'linux');
    expect(result.lines[0].text).toBe('/usr/local/bin:/usr/bin:/bin');
  });

  it('printenv with no args lists all variables', () => {
    const state = makeState();
    const result = processCommand(state, 'printenv', 'linux');
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('printenv UNDEFINED returns no output lines', () => {
    const state = makeState();
    const result = processCommand(state, 'printenv UNDEFINED_VAR_XYZ', 'linux');
    expect(result.lines.length).toBe(0);
  });
});

describe('echo — $VAR interpolation', () => {
  it('echo $PATH expands to the PATH value', () => {
    const state = makeState();
    const result = processCommand(state, 'echo $PATH', 'linux');
    expect(result.lines[0].text).toBe('/usr/local/bin:/usr/bin:/bin');
  });

  it('echo $USER returns username', () => {
    const state = makeState();
    const result = processCommand(state, 'echo $USER', 'linux');
    expect(result.lines[0].text).toBe('user');
  });

  it('echo $env:PATH (PowerShell) expands to PATH value', () => {
    const state = makeState();
    const result = processCommand(state, 'echo $env:PATH', 'windows');
    expect(result.lines[0].text).toBe('/usr/local/bin:/usr/bin:/bin');
  });

  it('echo $UNDEFINED returns empty string', () => {
    const state = makeState();
    const result = processCommand(state, 'echo $UNDEFINED_XYZ', 'linux');
    expect(result.lines[0].text).toBe('');
  });
});

describe('source — reload config file', () => {
  it('source ~/.bashrc returns success', () => {
    const state = makeState();
    const result = processCommand(state, 'source ~/.bashrc', 'linux');
    expect(result.lines[0].type).toBe('success');
    expect(result.lines[0].text).toContain('loaded');
  });

  it('. ~/.profile (dot operator) returns success', () => {
    const state = makeState();
    const result = processCommand(state, '. ~/.profile', 'linux');
    expect(result.lines[0].type).toBe('success');
  });
});

describe('crontab — task scheduling', () => {
  it('crontab -l lists scheduled tasks', () => {
    const state = makeState();
    const result = processCommand(state, 'crontab -l', 'linux');
    expect(result.lines.length).toBeGreaterThan(0);
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('tâches');
  });

  it('crontab -e returns info about editor', () => {
    const state = makeState();
    const result = processCommand(state, 'crontab -e', 'linux');
    expect(result.lines[0].type).toBe('info');
  });

  it('crontab -r returns success', () => {
    const state = makeState();
    const result = processCommand(state, 'crontab -r', 'linux');
    expect(result.lines[0].type).toBe('success');
  });

  it('crontab without args returns error', () => {
    const state = makeState();
    const result = processCommand(state, 'crontab', 'linux');
    expect(result.lines[0].type).toBe('error');
  });
});

describe('PowerShell $env: variable handling', () => {
  it('$env:VAR = "value" sets a variable', () => {
    const state = makeState();
    const result = processCommand(state, '$env:GREETING = "Hello"', 'windows');
    expect(result.newState.envVars['GREETING']).toBe('Hello');
    // Real PowerShell 7 prints nothing for an assignment (0 bytes, checked 26/09/2026);
    // the simulator used to print a success line the real shell never shows.
    expect(result.lines).toEqual([]);
  });

  it('$env:PATH reads the PATH variable', () => {
    const state = makeState();
    const result = processCommand(state, '$env:PATH', 'windows');
    expect(result.lines[0].text).toBe('/usr/local/bin:/usr/bin:/bin');
  });

  it('$env:UNDEFINED returns error', () => {
    const state = makeState();
    const result = processCommand(state, '$env:UNDEFINED_XYZ', 'windows');
    expect(result.lines[0].type).toBe('error');
  });
});

describe('Get-ChildItem Env: — PowerShell env listing', () => {
  it('Get-ChildItem Env: lists all env variables', () => {
    const state = makeState();
    const result = processCommand(state, 'Get-ChildItem Env:', 'windows');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('PATH');
    expect(text).toContain('USER');
  });
});

// ─── Module 4: Permissions — new commands ─────────────────────────────────────

describe('chown — change file ownership', () => {
  it('chown user file returns success', () => {
    const state = makeState();
    const result = processCommand(state, 'chown alice documents/notes.txt', 'linux');
    expect(result.lines[0].type).toBe('success');
    expect(result.lines[0].text).toContain('alice');
  });

  it('chown user:group file returns success', () => {
    const state = makeState();
    const result = processCommand(state, 'chown alice:devs documents/notes.txt', 'linux');
    expect(result.lines[0].type).toBe('success');
  });

  it('chown without args returns error', () => {
    const state = makeState();
    const result = processCommand(state, 'chown', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('chown on windows returns info (not available)', () => {
    const state = makeState();
    const result = processCommand(state, 'chown alice file.txt', 'windows');
    expect(result.lines[0].type).toBe('info');
  });
});

describe('sudo — privilege elevation', () => {
  it('sudo whoami runs the command', () => {
    const state = makeState();
    const result = processCommand(state, 'sudo whoami', 'linux');
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('sudo -l lists authorized commands', () => {
    const state = makeState();
    const result = processCommand(state, 'sudo -l', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('user');
  });

  it('sudo -i opens root shell', () => {
    const state = makeState();
    const result = processCommand(state, 'sudo -i', 'linux');
    // The first sudo shows the password prompt before the root shell.
    expect(result.lines.some((l) => l.text.includes('root@'))).toBe(true);
  });

  it('sudo without args returns error', () => {
    const state = makeState();
    const result = processCommand(state, 'sudo', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('sudo on windows returns info (not available)', () => {
    const state = makeState();
    const result = processCommand(state, 'sudo apt update', 'windows');
    expect(result.lines[0].type).toBe('info');
  });
});

describe('get-acl / icacls — Windows ACL', () => {
  it('Get-Acl returns permissions table', () => {
    const state = makeState();
    const result = processCommand(state, 'Get-Acl documents/notes.txt', 'windows');
    expect(result.lines.length).toBeGreaterThan(0);
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('SYSTEM');
  });

  it('icacls returns permissions table', () => {
    const state = makeState();
    const result = processCommand(state, 'icacls documents/notes.txt', 'windows');
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('icacls without args returns error', () => {
    const state = makeState();
    const result = processCommand(state, 'icacls', 'windows');
    expect(result.lines[0].type).toBe('error');
  });
});

// ─── Module 5: Processus — new commands ──────────────────────────────────────

describe('top / htop — process monitoring', () => {
  it('top returns process table', () => {
    const state = makeState();
    const result = processCommand(state, 'top', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('PID');
    expect(text).toContain('CPU');
  });

  it('htop is also handled', () => {
    const state = makeState();
    const result = processCommand(state, 'htop', 'linux');
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('top works on macos', () => {
    const state = makeState();
    const result = processCommand(state, 'top', 'macos');
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

describe('jobs — background job listing', () => {
  it('jobs returns info about no background jobs', () => {
    const state = makeState();
    const result = processCommand(state, 'jobs', 'linux');
    expect(result.lines[0].type).toBe('info');
  });
});

describe('bg / fg — foreground/background', () => {
  it('fg returns error (no job)', () => {
    const state = makeState();
    const result = processCommand(state, 'fg %1', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('bg returns error (no job)', () => {
    const state = makeState();
    const result = processCommand(state, 'bg %1', 'linux');
    expect(result.lines[0].type).toBe('error');
  });
});

describe('Get-Job — PowerShell background jobs', () => {
  it('Get-Job returns job table', () => {
    const state = makeState();
    const result = processCommand(state, 'Get-Job', 'windows');
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

// ─── Module 6: Redirection — new commands ────────────────────────────────────

describe('tee — split output to file', () => {
  it('ls | tee file.txt returns info', () => {
    const state = makeState();
    // tee is invoked as standalone (pipe handling is separate)
    const result = processCommand(state, 'tee liste.txt', 'linux');
    expect(result.lines[0].type).toBe('info');
    expect(result.lines[0].text).toContain('liste.txt');
  });

  it('tee without args returns error', () => {
    const state = makeState();
    const result = processCommand(state, 'tee', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('Tee-Object is also handled (PowerShell)', () => {
    const state = makeState();
    const result = processCommand(state, 'Tee-Object -FilePath liste.txt', 'windows');
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

// ─── Module 8 — Réseau & SSH ──────────────────────────────────────────────────

describe('ping', () => {
  it('returns ping statistics for a hostname', () => {
    const result = processCommand(makeState(), 'ping google.com', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('google.com');
    expect(text).toContain('packet loss');
  });

  it('last line has success type', () => {
    const result = processCommand(makeState(), 'ping google.com', 'linux');
    expect(result.lines[result.lines.length - 1].type).toBe('success');
  });

  it('works on windows env', () => {
    const result = processCommand(makeState(), 'ping 8.8.8.8', 'windows');
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines[result.lines.length - 1].type).toBe('success');
  });

  it('returns error when no host provided', () => {
    const result = processCommand(makeState(), 'ping', 'linux');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('Usage');
  });

  it('ignores flags and uses hostname', () => {
    const result = processCommand(makeState(), 'ping -c 4 google.com', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('google.com');
  });
});

describe('curl', () => {
  it('returns JSON output for a GET request', () => {
    const result = processCommand(makeState(), 'curl https://api.github.com', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('status');
  });

  it('returns HTTP headers with -I flag', () => {
    const result = processCommand(makeState(), 'curl -I https://example.com', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('HTTP/2 200');
    expect(text).toContain('content-type');
  });

  it('returns error when no URL provided', () => {
    const result = processCommand(makeState(), 'curl', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('works on macos env', () => {
    const result = processCommand(makeState(), 'curl https://api.github.com', 'macos');
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('works on windows env', () => {
    const result = processCommand(makeState(), 'curl https://api.github.com', 'windows');
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

describe('wget', () => {
  it('simulates file download with success', () => {
    const result = processCommand(makeState(), 'wget https://example.com/fichier.zip', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('fichier.zip');
    expect(text).toContain('saved');
  });

  it('last download line has success type', () => {
    const result = processCommand(makeState(), 'wget https://example.com/file.tar.gz', 'linux');
    expect(result.lines[result.lines.length - 1].type).toBe('success');
  });

  it('returns error when no URL provided', () => {
    const result = processCommand(makeState(), 'wget', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('works on macos env', () => {
    const result = processCommand(makeState(), 'wget https://example.com/file.zip', 'macos');
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('works on windows env', () => {
    const result = processCommand(makeState(), 'wget https://example.com/file.zip', 'windows');
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

describe('invoke-webrequest / iwr', () => {
  it('returns StatusCode 200 for a basic request', () => {
    const result = processCommand(makeState(), 'Invoke-WebRequest -Uri https://example.com', 'windows');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('200');
  });

  it('saves to file when -OutFile is specified', () => {
    const result = processCommand(makeState(), 'Invoke-WebRequest -Uri https://example.com/file.zip -OutFile file.zip', 'windows');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('file.zip');
    expect(result.lines[result.lines.length - 1].type).toBe('success');
  });

  it('iwr alias works identically', () => {
    const result = processCommand(makeState(), 'iwr https://example.com', 'windows');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('200');
  });

  it('returns error when no URL provided', () => {
    const result = processCommand(makeState(), 'Invoke-WebRequest', 'windows');
    expect(result.lines[0].type).toBe('error');
  });
});

describe('nslookup', () => {
  it('resolves a hostname and returns IP', () => {
    const result = processCommand(makeState(), 'nslookup google.com', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('google.com');
    expect(text).toContain('142.250.74.46');
  });

  it('shows DNS server used', () => {
    const result = processCommand(makeState(), 'nslookup google.com', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('8.8.8.8');
  });

  it('returns error when no host provided', () => {
    const result = processCommand(makeState(), 'nslookup', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('works on windows env', () => {
    const result = processCommand(makeState(), 'nslookup google.com', 'windows');
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

describe('dig', () => {
  it('returns DNS answer section', () => {
    const result = processCommand(makeState(), 'dig google.com', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('ANSWER SECTION');
    expect(text).toContain('google.com');
  });

  it('returns error when no host provided', () => {
    const result = processCommand(makeState(), 'dig', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('works on macos env', () => {
    const result = processCommand(makeState(), 'dig example.com', 'macos');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('example.com');
  });
});

describe('resolve-dnsname', () => {
  it('returns tabular DNS result on windows', () => {
    const result = processCommand(makeState(), 'Resolve-DnsName google.com', 'windows');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('google.com');
    expect(text).toContain('IPAddress');
  });

  it('returns error when no host provided', () => {
    const result = processCommand(makeState(), 'Resolve-DnsName', 'windows');
    expect(result.lines[0].type).toBe('error');
  });
});

describe('ssh', () => {
  it('simulates connection to a remote host', () => {
    const result = processCommand(makeState(), 'ssh user@serveur.example.com', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('user@serveur.example.com');
  });

  it('returns error when no target provided', () => {
    const result = processCommand(makeState(), 'ssh', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('works on windows env', () => {
    const result = processCommand(makeState(), 'ssh user@host.com', 'windows');
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

// Expected values from OpenSSH 10.5 (ssh-keygen, run in a sandbox on 29 September 2026).
describe('ssh-keygen', () => {
  const text = (r: { lines: { text: string }[] }) => r.lines.map((l) => l.text);

  it('generates ed25519 by default and writes the key pair in a new ~/.ssh', () => {
    const r = processCommand(createInitialState(), 'ssh-keygen', 'linux');
    expect(text(r).slice(0, 7)).toEqual([
      'Generating public/private ed25519 key pair.',
      'Enter file in which to save the key (/home/user/.ssh/id_ed25519): ',
      "Created directory '/home/user/.ssh'.",
      'Enter passphrase for "/home/user/.ssh/id_ed25519" (empty for no passphrase): ',
      'Enter same passphrase again: ',
      'Your identification has been saved in /home/user/.ssh/id_ed25519',
      'Your public key has been saved in /home/user/.ssh/id_ed25519.pub',
    ]);
    expect(text(r)[7]).toBe('The key fingerprint is:');
    expect(text(r)[8]).toMatch(/^SHA256:[A-Za-z0-9+/]{43} user@terminal-lab$/);
    expect(text(r)[10]).toBe('+--[ED25519 256]--+');
    expect(text(r)[text(r).length - 1]).toBe('+----[SHA256]-----+');
    const ls = text(processCommand(r.newState, 'ls -la ~/.ssh', 'linux')).join('\n');
    expect(ls).toMatch(/-rw------- .* id_ed25519\n/);
    expect(ls).toMatch(/-rw-r--r-- .* id_ed25519\.pub/);
  });

  it('puts the -C comment at the end of the public key, with the real ed25519 header', () => {
    const s = processCommand(createInitialState(), 'ssh-keygen -t ed25519 -C "moi@exemple.com"', 'linux').newState;
    const pub = text(processCommand(s, 'cat ~/.ssh/id_ed25519.pub', 'linux'));
    expect(pub).toHaveLength(1);
    expect(pub[0]).toMatch(/^ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI[A-Za-z0-9+/]{43} moi@exemple\.com$/);
    const key = text(processCommand(s, 'cat ~/.ssh/id_ed25519', 'linux'));
    expect(key[0]).toBe('-----BEGIN OPENSSH PRIVATE KEY-----');
    expect(key[key.length - 1]).toBe('-----END OPENSSH PRIVATE KEY-----');
  });

  it('does not recreate ~/.ssh and asks before overwriting an existing key', () => {
    const s = processCommand(createInitialState(), 'ssh-keygen', 'linux').newState;
    const again = text(processCommand(s, 'ssh-keygen', 'linux'));
    expect(again.join('\n')).not.toContain('Created directory');
    expect(again).toContain('/home/user/.ssh/id_ed25519 already exists.');
  });

  it('draws the randomart header for rsa and ecdsa', () => {
    expect(text(processCommand(createInitialState(), 'ssh-keygen -t rsa', 'linux'))).toContain('+---[RSA 3072]----+');
    expect(text(processCommand(createInitialState(), 'ssh-keygen -t ecdsa', 'linux'))).toContain('+---[ECDSA 256]---+');
  });

  it('skips the prompts that -f and -N answer, and fails when the folder is missing', () => {
    const ok = text(processCommand(createInitialState(), 'ssh-keygen -f cle -N ""', 'linux'));
    expect(ok.slice(0, 3)).toEqual([
      'Generating public/private ed25519 key pair.',
      'Your identification has been saved in cle',
      'Your public key has been saved in cle.pub',
    ]);
    const r = processCommand(createInitialState(), 'ssh-keygen -f nulle/part/cle -N ""', 'linux');
    expect(text(r)).toEqual(['Generating public/private ed25519 key pair.', 'Saving key "nulle/part/cle" failed: No such file or directory']);
    expect(r.status).toBe(1);
  });

  // Robustness, not fidelity: the lessons always have a home folder.
  it('fails cleanly when there is no home folder', () => {
    const r = processCommand(makeState(), 'ssh-keygen -N ""', 'linux');
    expect(r.lines[r.lines.length - 1].text).toBe('Saving key "/home/user/.ssh/id_ed25519" failed: No such file or directory');
    expect(r.status).toBe(1);
  });

  it('rejects an unknown key type with status 255', () => {
    const r = processCommand(createInitialState(), 'ssh-keygen -t foo', 'linux');
    expect(text(r)).toEqual(['unknown key type foo']);
    expect(r.status).toBe(255);
  });

  it('writes under C:\\Users\\user\\.ssh on Windows, readable with $env:USERPROFILE', () => {
    const r = processCommand(createInitialState(), 'ssh-keygen', 'windows');
    expect(text(r)[1]).toBe('Enter file in which to save the key (C:\\Users\\user/.ssh/id_ed25519): ');
    const pub = text(processCommand(r.newState, 'Get-Content $env:USERPROFILE\\.ssh\\id_ed25519.pub', 'windows'));
    expect(pub[0]).toMatch(/^ssh-ed25519 AAAA/);
  });
});

describe('ssh-keygen fingerprints', () => {
  it('computes the SHA-256 fingerprint OpenSSH printed for real keys', () => {
    // Throwaway keys made by OpenSSH 10.5 in a sandbox; `ssh-keygen -lf` printed these lines.
    expect(fingerprintLine('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOhycLPlOl7K1dDP8tI8UIrXGAgLUqt6VqYxhJHD8aP/ moi@exemple.com'))
      .toBe('256 SHA256:g9Z14JyNSnPMymEmRjYmBkQEOKHyRJ35HCgji2CdeJU moi@exemple.com (ED25519)');
    expect(fingerprintLine('ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBAW2x7icM6dWkJDcPIR1SN1BVH5lfMKMyshwt2hy4ceHsQnZ2DFcubEU9lyu1vZPaxAeN6qMELpyb73hOa+GDF0= thier@Extractor'))
      .toBe('256 SHA256:1JR7ARFLcDIftBLDgOB3IiJ3LYkm1YOD8mb659xfs6o thier@Extractor (ECDSA)');
    expect(fingerprintLine('bonjour')).toBeNull();
  });

  it('sha256 matches the FIPS 180-4 test vector', () => {
    const hex = (b: number[]) => b.map((x) => x.toString(16).padStart(2, '0')).join('');
    expect(hex(sha256(Array.from('abc', (c) => c.charCodeAt(0))))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('ssh-keygen randomart', () => {
  it('matches the art OpenSSH drew for a real fingerprint', () => {
    // `ssh-keygen -t ed25519` printed this fingerprint and art (OpenSSH 10.5).
    const fp = Array.from(atob('g9Z14JyNSnPMymEmRjYmBkQEOKHyRJ35HCgji2CdeJU='), (c) => c.charCodeAt(0));
    expect(randomart(fp, 'ED25519 256')).toEqual([
      '+--[ED25519 256]--+',
      '|+*Oo==*   .      |',
      '|*+o==E.. = =     |',
      '|*+oo oo.* X o    |',
      '|+o   .oO B .     |',
      '|  .   o S        |',
      '|     .   .       |',
      '|                 |',
      '|                 |',
      '|                 |',
      '+----[SHA256]-----+',
    ]);
  });
});

describe('scp', () => {
  it('simulates file transfer success', () => {
    const result = processCommand(makeState(), 'scp fichier.txt user@serveur.example.com:/home/user/', 'linux');
    expect(result.lines[0].type).toBe('success');
    expect(result.lines[0].text).toContain('100%');
  });

  it('returns error when fewer than 2 args', () => {
    const result = processCommand(makeState(), 'scp fichier.txt', 'linux');
    expect(result.lines[0].type).toBe('error');
  });

  it('works on macos env', () => {
    const result = processCommand(makeState(), 'scp file.txt user@host:/tmp/', 'macos');
    expect(result.lines[0].type).toBe('success');
  });

  it('works on windows env', () => {
    const result = processCommand(makeState(), 'scp file.txt user@host:/tmp/', 'windows');
    expect(result.lines[0].type).toBe('success');
  });
});

// ─── ls ───────────────────────────────────────────────────────────────────────

describe('ls', () => {
  it('returns single empty line on empty directory', () => {
    const result = processCommand(makeState(), 'ls');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].text).toBe('');
  });

  it('lists files and directories', () => {
    const result = processCommand(makeStateWithFS(), 'ls');
    const text = result.lines[0].text;
    // Plain ls marks nothing (no trailing /); ls -F does (THI-353).
    expect(text).toContain('docs');
    expect(text).not.toContain('docs/');
    expect(text).toContain('test.txt');
  });

  it('-a flag shows hidden files', () => {
    const result = processCommand(makeStateWithFS(), 'ls -a');
    const text = result.lines[0].text;
    expect(text).toContain('.hidden');
    expect(text).toContain('.');
  });

  it('-l flag shows long format with total line', () => {
    const result = processCommand(makeStateWithFS(), 'ls -l');
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines[0].text).toMatch(/^total/);
  });

  it('returns error for non-existent path', () => {
    const result = processCommand(makeState(), 'ls /nonexistent');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });
});

// ─── cd ───────────────────────────────────────────────────────────────────────

describe('cd', () => {
  it('changes cwd to existing directory', () => {
    const result = processCommand(makeStateWithFS(), 'cd docs');
    expect(result.newState.cwd).toEqual(['home', 'user', 'docs']);
    expect(result.lines).toHaveLength(0);
  });

  it('cd with no args goes to home', () => {
    const result = processCommand(makeStateWithFS(), 'cd');
    expect(result.newState.cwd).toEqual(['home', 'user']);
  });

  it('cd ~ goes to home', () => {
    const result = processCommand(makeStateWithFS(), 'cd ~');
    expect(result.newState.cwd).toEqual(['home', 'user']);
  });

  it('returns error for non-existent directory', () => {
    const result = processCommand(makeStateWithFS(), 'cd /nonexistent');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });

  it('returns error when target is a file', () => {
    const result = processCommand(makeStateWithFS(), 'cd test.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('Not a directory');
  });
});

// ─── mkdir ────────────────────────────────────────────────────────────────────

describe('mkdir', () => {
  it('creates a new directory', () => {
    const result = processCommand(makeStateWithFS(), 'mkdir newdir');
    expect(result.lines).toHaveLength(0);
    expect(result.newState.root).toBeDefined();
  });

  it('returns error when no operand given', () => {
    const result = processCommand(makeState(), 'mkdir');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing operand');
  });

  it('returns error when directory already exists', () => {
    const result = processCommand(makeStateWithFS(), 'mkdir docs');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('File exists');
  });

  it('-p creates parent directories', () => {
    const result = processCommand(makeStateWithFS(), 'mkdir -p a/b/c');
    expect(result.lines).toHaveLength(0);
    expect(result.newState.root).toBeDefined();
  });
});

// ─── touch ────────────────────────────────────────────────────────────────────

describe('touch', () => {
  it('creates a new file', () => {
    const result = processCommand(makeStateWithFS(), 'touch newfile.txt');
    expect(result.lines).toHaveLength(0);
    expect(result.newState.root).toBeDefined();
  });

  it('returns error when no operand given', () => {
    const result = processCommand(makeState(), 'touch');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing file operand');
  });

  it('is idempotent on existing file (no error)', () => {
    const result = processCommand(makeStateWithFS(), 'touch test.txt');
    expect(result.lines).toHaveLength(0);
  });

  it('returns error for non-existent parent directory', () => {
    const result = processCommand(makeStateWithFS(), 'touch /nodir/file.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });
});

// ─── cat ──────────────────────────────────────────────────────────────────────

describe('cat', () => {
  it('displays file content', () => {
    const result = processCommand(makeStateWithFS(), 'cat test.txt');
    const texts = result.lines.map((l) => l.text);
    expect(texts).toContain('ligne1');
    expect(texts).toContain('ligne5');
  });

  it('returns error when no operand given', () => {
    const result = processCommand(makeState(), 'cat');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing file operand');
  });

  it('returns error for non-existent file', () => {
    const result = processCommand(makeStateWithFS(), 'cat nope.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });

  it('returns error when target is a directory', () => {
    const result = processCommand(makeStateWithFS(), 'cat docs');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('Is a directory');
  });
});

// ─── rm ───────────────────────────────────────────────────────────────────────

describe('rm', () => {
  it('removes a file', () => {
    const result = processCommand(makeStateWithFS(), 'rm test.txt');
    expect(result.lines).toHaveLength(0);
    expect(result.newState.root).toBeDefined();
  });

  it('returns error when no operand given', () => {
    const result = processCommand(makeState(), 'rm');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing operand');
  });

  it('returns error for non-existent file', () => {
    const result = processCommand(makeStateWithFS(), 'rm nope.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });

  it('returns error for directory without -r', () => {
    const result = processCommand(makeStateWithFS(), 'rm docs');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('Is a directory');
  });

  it('-r removes a directory', () => {
    const result = processCommand(makeStateWithFS(), 'rm -r docs');
    expect(result.lines).toHaveLength(0);
    expect(result.newState.root).toBeDefined();
  });
});

// ─── cp ───────────────────────────────────────────────────────────────────────

describe('cp', () => {
  it('copies a file to a new destination', () => {
    const result = processCommand(makeStateWithFS(), 'cp test.txt copy.txt');
    expect(result.lines).toHaveLength(0);
    expect(result.newState.root).toBeDefined();
  });

  it('returns error when destination is missing', () => {
    const result = processCommand(makeStateWithFS(), 'cp test.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing destination');
  });

  it('returns error for non-existent source', () => {
    const result = processCommand(makeStateWithFS(), 'cp nope.txt dst.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });

  it('returns error for directory source without -r', () => {
    const result = processCommand(makeStateWithFS(), 'cp docs docs2');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('-r not specified');
  });

  it('-r copies a directory', () => {
    const result = processCommand(makeStateWithFS(), 'cp -r docs docs2');
    expect(result.lines).toHaveLength(0);
    expect(result.newState.root).toBeDefined();
  });
});

// ─── mv ───────────────────────────────────────────────────────────────────────

describe('mv', () => {
  it('moves (renames) a file', () => {
    const result = processCommand(makeStateWithFS(), 'mv test.txt renamed.txt');
    expect(result.lines).toHaveLength(0);
    expect(result.newState.root).toBeDefined();
  });

  it('returns error when destination is missing', () => {
    const result = processCommand(makeStateWithFS(), 'mv test.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing destination');
  });

  it('returns error for non-existent source', () => {
    const result = processCommand(makeStateWithFS(), 'mv nope.txt dst.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });
});

// ─── Windows paths ────────────────────────────────────────────────────────────
// PowerShell accepts `\` and `/` as separators and drive paths; the simulated
// /home is C:\Users. Bash treats `\` as an escape, so Linux must not accept them.

describe('Windows paths in PowerShell', () => {
  const run = (env: 'linux' | 'windows', ...cmds: string[]) => {
    let state = createInitialState();
    let lines: string[] = [];
    for (const c of cmds) {
      const r = processCommand(state, c, env);
      state = r.newState;
      lines = r.lines.map((l) => l.text);
    }
    return lines;
  };

  it('accepts backslash separators and .\\', () => {
    expect(run('windows', 'Get-Content documents\\notes.txt')[0]).toBe('Mes notes importantes');
    expect(run('windows', 'cat .\\documents\\rapport.md')[0]).toBe('# Rapport Mensuel');
    expect(run('windows', 'cd documents\\', 'pwd')).toEqual(['C:\\Users\\user\\documents']);
  });

  it('accepts drive paths, C:\\Users is the parent of the home', () => {
    expect(run('windows', 'ls C:\\Users\\user\\projets')).toEqual(['README.md  script.sh']);
    expect(run('windows', 'cd C:\\Users\\user\\downloads', 'pwd')).toEqual(['C:\\Users\\user\\downloads']);
    expect(run('windows', 'cd ..', 'pwd')).toEqual(['C:\\Users']);
    expect(run('windows', 'cd \\', 'pwd')).toEqual(['C:\\']);
  });

  it('mkdir creates missing parent folders, like New-Item -ItemType Directory', () => {
    expect(run('windows', 'mkdir archives\\2025', 'ls archives')).toEqual(['2025']);
    expect(run('linux', 'mkdir archives/2025')[0]).toContain('No such file or directory');
  });

  it('Tab completes after a backslash on Windows, keeping the backslash', () => {
    const state = createInitialState();
    expect(getTabCompletions('cat documents\\n', state, 'windows')).toEqual(['cat documents\\notes.txt']);
    expect(getTabCompletions('cd C:\\Users\\user\\doc', state, 'windows')).toEqual(['cd C:\\Users\\user\\documents\\']);
    expect(getTabCompletions('cat documents\\n', state, 'linux')).toEqual([]);
  });

  it('C:\\ shows Users (never the internal home) for ls, cd and Tab', () => {
    expect(run('windows', 'ls C:\\')).toEqual(['Users  tmp']);
    expect(run('windows', 'cd \\', 'cd users', 'pwd')).toEqual(['C:\\Users']);
    expect(getTabCompletions('cd C:\\U', createInitialState(), 'windows')).toEqual(['cd C:\\Users\\']);
    expect(run('linux', 'ls /')).toEqual(['home  tmp']);
  });

  it('Copy-Item and Move-Item read -Path / -Destination in any order', () => {
    expect(run('windows', 'Copy-Item -Destination downloads -Path documents/notes.txt', 'ls downloads')).toEqual(['notes.txt']);
    expect(run('windows', 'Move-Item -Destination projets documents/rapport.md', 'ls projets')).toEqual(['README.md  rapport.md  script.sh']);
  });

  it('bash does not treat a backslash as a separator', () => {
    expect(run('linux', 'cat documents\\notes.txt')[0]).toContain('No such file or directory');
  });
});

// ─── cp / mv — GNU coreutils semantics ───────────────────────────────────────
// Expected values are what GNU cp/mv print and do, not what the engine used to do:
// a destination that is an existing directory receives the source INSIDE it.

describe('cp / mv — destination directory (GNU semantics)', () => {
  function session(env: 'linux' | 'windows', ...cmds: string[]) {
    let state = createInitialState();
    for (const c of cmds) state = processCommand(state, c, env).newState;
    return { out: (c: string) => processCommand(state, c, env).lines.map((l) => l.text) };
  }

  it('mv file . moves it into the current directory — the home is not replaced', () => {
    const { out } = session('linux', 'mv documents/notes.txt .');
    expect(out('ls')).toEqual(['documents  downloads  notes.txt  projets']);
    expect(out('ls documents')).toEqual(['rapport.md']);
  });

  it('mv into an existing directory keeps the name', () => {
    const { out } = session('linux', 'mv documents/notes.txt projets');
    expect(out('ls projets')).toEqual(['README.md  notes.txt  script.sh']);
    expect(out('ls -F')).toEqual(['documents/  downloads/  projets/']);
  });

  it('mv several files needs a directory as last argument', () => {
    const { out } = session('linux', 'mv documents/notes.txt documents/rapport.md downloads');
    expect(out('ls downloads')).toEqual(['notes.txt  rapport.md']);
    expect(out('mv projets/README.md projets/script.sh nouveau.txt')).toEqual(["mv: target 'nouveau.txt' is not a directory"]);
  });

  it('mv refuses to put a directory inside itself', () => {
    const { out } = session('linux');
    expect(out('mv documents documents/archive')).toEqual(["mv: cannot move 'documents' to a subdirectory of itself, 'documents/archive'"]);
  });

  it('mv of a directory you stand in takes you along', () => {
    const { out } = session('linux', 'cd documents', 'mv ../documents ../docs');
    expect(out('pwd')).toEqual(['/home/user/docs']);
    expect(out('ls')).toEqual(['notes.txt  rapport.md']);
  });

  it('mv . is refused, like the kernel does', () => {
    const { out } = session('linux');
    expect(out('mv . ailleurs')).toEqual(["mv: cannot move '.' to 'ailleurs': Device or resource busy"]);
  });

  it('mv -v reports the rename; unknown options are rejected', () => {
    const { out } = session('linux');
    expect(out('mv -v documents/notes.txt documents/mes-notes.txt')).toEqual(["renamed 'documents/notes.txt' -> 'documents/mes-notes.txt'"]);
    expect(out('mv -z a b')).toEqual(["mv: invalid option -- 'z'", "Try 'mv --help' for more information."]);
  });

  it('mv onto the same place is "the same file"', () => {
    const { out } = session('linux');
    expect(out('mv documents/notes.txt documents')).toEqual(["mv: 'documents/notes.txt' and 'documents/notes.txt' are the same file"]);
  });

  it('cp file dir copies inside the directory, the directory survives', () => {
    const { out } = session('linux', 'cp projets/script.sh downloads');
    expect(out('ls -F')).toEqual(['documents/  downloads/  projets/']);
    expect(out('ls downloads')).toEqual(['script.sh']);
    expect(out('ls projets')).toEqual(['README.md  script.sh']);
  });

  it('cp -r dir existing-dir/ creates existing-dir/dir', () => {
    const { out } = session('linux', 'cp -r documents projets/');
    expect(out('ls projets')).toEqual(['README.md  documents  script.sh']);
    expect(out('ls projets/documents')).toEqual(['notes.txt  rapport.md']);
  });

  it('cp -r dir new-name creates a copy under the new name', () => {
    const { out } = session('linux', 'cp -r documents sauvegarde');
    expect(out('ls sauvegarde')).toEqual(['notes.txt  rapport.md']);
    expect(out('ls documents')).toEqual(['notes.txt  rapport.md']);
  });

  it('cp refuses to copy a directory into itself', () => {
    const { out } = session('linux');
    expect(out('cp -r documents documents/copie')).toEqual(["cp: cannot copy a directory, 'documents', into itself, 'documents/copie'"]);
  });

  it('cp -i never overwrites in the simulator, and says so', () => {
    const { out } = session('linux', 'cp projets/script.sh downloads');
    const lines = out('cp -i documents/notes.txt downloads/script.sh');
    expect(lines[0]).toBe("cp: overwrite 'downloads/script.sh'? n");
  });

  it('cp -rn into an existing directory keeps files already there, at any depth', () => {
    const setup = ['mkdir backup', 'cp -r documents backup', 'echo modifié > documents/notes.txt'];
    const kept = session('linux', ...setup, 'cp -rn documents backup');
    expect(kept.out('cat backup/documents/notes.txt')[0]).toBe('Mes notes importantes');
    const replaced = session('linux', ...setup, 'cp -r documents backup');
    expect(replaced.out('cat backup/documents/notes.txt')).toEqual(['modifié']);
  });

  it('cp a file onto an existing directory name inside the target is refused', () => {
    const { out } = session('linux', 'mkdir -p boite/notes.txt');
    expect(out('cp documents/notes.txt boite')).toEqual(["cp: cannot overwrite directory 'boite/notes.txt' with non-directory"]);
  });

  it('Remove-Item -Recurse removes a folder with its content', () => {
    const { out } = session('windows', 'mkdir archives', 'Remove-Item -Recurse archives');
    expect(out('ls')).toEqual(['documents  downloads  projets']);
  });

  it('Move-Item and Copy-Item -Recurse follow the same rules on Windows', () => {
    const { out } = session('windows', 'Move-Item documents/notes.txt projets', 'Copy-Item -Recurse documents downloads');
    expect(out('ls projets').join('\n')).toContain('notes.txt');
    expect(out('ls downloads').join('\n')).toContain('documents');
    expect(out('ls').join('\n')).toContain('projets');
  });
});

// ─── grep ─────────────────────────────────────────────────────────────────────

describe('grep', () => {
  it('returns matching lines', () => {
    const result = processCommand(makeStateWithFS(), 'grep ligne1 test.txt');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].text).toContain('ligne1');
  });

  it('returns empty when no match', () => {
    const result = processCommand(makeStateWithFS(), 'grep zzz test.txt');
    expect(result.lines).toHaveLength(0);
  });

  it('-n flag shows line numbers', () => {
    const result = processCommand(makeStateWithFS(), 'grep -n ligne test.txt');
    expect(result.lines[0].text).toMatch(/^\d+:/);
  });

  it('-i flag is case-insensitive', () => {
    const result = processCommand(makeStateWithFS(), 'grep -i LIGNE1 test.txt');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].text).toContain('ligne1');
  });

  it('returns error when pattern or file is missing', () => {
    const result = processCommand(makeStateWithFS(), 'grep pattern');
    expect(result.lines[0].type).toBe('error');
  });

  it('returns error for non-existent file', () => {
    const result = processCommand(makeStateWithFS(), 'grep foo nope.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });

  it('returns error when target is a directory', () => {
    const result = processCommand(makeStateWithFS(), 'grep foo docs');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('Is a directory');
  });

  it('returns error for invalid regular expression', () => {
    // [unclosed is an invalid regex (unclosed character class)
    const result = processCommand(makeStateWithFS(), 'grep [unclosed test.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('invalid regular expression');
  });

  it('returns error for pattern exceeding 200 characters', () => {
    const longPattern = 'a'.repeat(201);
    const result = processCommand(makeStateWithFS(), `grep ${longPattern} test.txt`);
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('pattern too long');
  });
});

// ─── head ─────────────────────────────────────────────────────────────────────

describe('head', () => {
  it('returns first 10 lines by default', () => {
    const result = processCommand(makeStateWithFS(), 'head test.txt');
    // test.txt has 5 lines — all returned
    expect(result.lines).toHaveLength(5);
    expect(result.lines[0].text).toBe('ligne1');
  });

  it('-n limits the number of lines', () => {
    const result = processCommand(makeStateWithFS(), 'head -n 2 test.txt');
    expect(result.lines).toHaveLength(2);
    expect(result.lines[1].text).toBe('ligne2');
  });

  it('returns error when no operand given', () => {
    const result = processCommand(makeState(), 'head');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing file operand');
  });

  it('returns error for non-existent file', () => {
    const result = processCommand(makeStateWithFS(), 'head nope.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });
});

// ─── tail ─────────────────────────────────────────────────────────────────────

describe('tail', () => {
  it('returns last 10 lines by default', () => {
    const result = processCommand(makeStateWithFS(), 'tail test.txt');
    expect(result.lines).toHaveLength(5);
    expect(result.lines[4].text).toBe('ligne5');
  });

  it('-n limits the number of lines from the end', () => {
    const result = processCommand(makeStateWithFS(), 'tail -n 2 test.txt');
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].text).toBe('ligne4');
    expect(result.lines[1].text).toBe('ligne5');
  });

  it('returns error when no operand given', () => {
    const result = processCommand(makeState(), 'tail');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing file operand');
  });

  it('returns error for non-existent file', () => {
    const result = processCommand(makeStateWithFS(), 'tail nope.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });
});

// ─── wc ───────────────────────────────────────────────────────────────────────

describe('wc', () => {
  it('shows lines, words and chars by default', () => {
    const result = processCommand(makeStateWithFS(), 'wc test.txt');
    expect(result.lines[0].text).toContain('test.txt');
    // Should have at least 3 numbers
    expect(result.lines[0].text).toMatch(/\d+.*\d+.*\d+/);
  });

  it('-l shows only line count', () => {
    const result = processCommand(makeStateWithFS(), 'wc -l test.txt');
    expect(result.lines[0].text).toContain('5');
    expect(result.lines[0].text).toContain('test.txt');
  });

  it('-w shows only word count', () => {
    const result = processCommand(makeStateWithFS(), 'wc -w test.txt');
    expect(result.lines[0].text).toContain('test.txt');
  });

  it('-c shows only char count', () => {
    const result = processCommand(makeStateWithFS(), 'wc -c test.txt');
    expect(result.lines[0].text).toContain('test.txt');
  });

  it('returns error when no operand given', () => {
    const result = processCommand(makeState(), 'wc');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing file operand');
  });
});

// ─── chmod ────────────────────────────────────────────────────────────────────

describe('chmod', () => {
  it('chmod 755 changes permissions', () => {
    const result = processCommand(makeStateWithFS(), 'chmod 755 test.txt');
    expect(result.lines[0].type).toBe('success');
    expect(result.lines[0].text).toContain('test.txt');
  });

  it('chmod +x adds execute bit', () => {
    const result = processCommand(makeStateWithFS(), 'chmod +x test.txt');
    expect(result.lines[0].type).toBe('success');
  });

  it('returns error when fewer than 2 operands', () => {
    const result = processCommand(makeState(), 'chmod 755');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('missing operand');
  });

  it('returns error for non-existent file', () => {
    const result = processCommand(makeStateWithFS(), 'chmod 644 nope.txt');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('No such file or directory');
  });
});

// ─── ps ───────────────────────────────────────────────────────────────────────

describe('ps', () => {
  it('shows process list with PID header', () => {
    const result = processCommand(makeState(), 'ps');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('PID');
    expect(text).toContain('bash');
  });

  it('ps aux shows extended format with USER column', () => {
    const result = processCommand(makeState(), 'ps aux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('USER');
    expect(text).toContain('root');
  });

  it('all lines have output type', () => {
    const result = processCommand(makeState(), 'ps');
    expect(result.lines.every((l) => l.type === 'output')).toBe(true);
  });
});

// ─── kill ─────────────────────────────────────────────────────────────────────

describe('kill', () => {
  it('sends signal to process by PID', () => {
    const result = processCommand(makeState(), 'kill 1234');
    expect(result.lines[0].type).toBe('success');
    expect(result.lines[0].text).toContain('1234');
  });

  it('returns error when no PID given', () => {
    const result = processCommand(makeState(), 'kill');
    expect(result.lines[0].type).toBe('error');
    expect(result.lines[0].text).toContain('usage');
  });

  it('kill -9 PID sends signal to process', () => {
    const result = processCommand(makeState(), 'kill -9 5678');
    expect(result.lines[0].type).toBe('success');
    expect(result.lines[0].text).toContain('5678');
  });
});

// ─── gh (GitHub CLI) ──────────────────────────────────────────────────────────

describe('gh', () => {
  it('says it is not simulated and where to get it, without a red error', () => {
    const r = processCommand(makeState(), 'gh pr create --fill');
    expect(r.status).toBe(1);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].type).toBe('info');
    expect(r.lines[0].text).toContain("gh (GitHub CLI) n'est pas simulé");
    expect(r.lines[0].text).toContain('https://cli.github.com');
  });
});

// ─── git (Modules 9 & 10) ─────────────────────────────────────────────────────

describe('git', () => {
  // ── git --version ────────────────────────────────────────────────────────────
  it('git --version returns version string', () => {
    const r = processCommand(makeState(), 'git --version');
    expect(r.lines[0].text).toContain('git version');
  });

  // ── git init ─────────────────────────────────────────────────────────────────
  it('git init initialises a new repository', () => {
    const r = processCommand(makeState(), 'git init');
    expect(r.lines[0].type).toBe('success');
    expect(r.lines[0].text).toContain('Initialized empty Git repository');
    expect(r.newState.git?.initialized).toBe(true);
    expect(r.newState.git?.branch).toBe('main');
  });

  it('git init on an already-initialised repo says Reinitialized', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} } });
    const r = processCommand(s, 'git init');
    expect(r.lines[0].text).toContain('Reinitialized');
  });

  // ── git status ───────────────────────────────────────────────────────────────
  it('git status without init returns fatal error', () => {
    const r = processCommand(makeState(), 'git status');
    expect(r.lines[0].type).toBe('error');
    expect(r.lines[0].text).toContain('not a git repository');
  });

  it('git status on empty repo shows No commits yet', () => {
    const after = processCommand(makeState(), 'git init');
    const r = processCommand(after.newState, 'git status');
    expect(r.lines.some((l) => l.text.includes('No commits yet'))).toBe(true);
  });

  it('git status shows staged files', () => {
    let s = processCommand(makeState(), 'git init').newState;
    s = withFiles(s, 'fichier.txt');
    s = processCommand(s, 'git add fichier.txt').newState;
    const r = processCommand(s, 'git status');
    expect(r.lines.some((l) => l.text.includes('fichier.txt'))).toBe(true);
  });

  // ── git add ───────────────────────────────────────────────────────────────────
  it('git add without repo returns fatal error', () => {
    const r = processCommand(makeState(), 'git add .');
    expect(r.lines[0].type).toBe('error');
  });

  it('git add . stages files in current directory', () => {
    const s = makeState({
      root: {
        type: 'directory',
        children: { 'index.html': { type: 'file', content: '', permissions: '-rw-r--r--', owner: 'user', group: 'user', size: 0 } },
        permissions: 'drwxr-xr-x', owner: 'user', group: 'user',
      },
      git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} },
    });
    const r = processCommand(s, 'git add .');
    expect(r.newState.git?.stagedFiles).toContain('index.html');
  });

  it('git add <file> stages a specific file', () => {
    const s = withFiles(makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} } }), 'README.md');
    const r = processCommand(s, 'git add README.md');
    expect(r.newState.git?.stagedFiles).toContain('README.md');
  });

  it('git add without args returns error', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} } });
    const r = processCommand(s, 'git add');
    expect(r.lines[0].type).toBe('error');
  });

  // ── git commit ────────────────────────────────────────────────────────────────
  it('git commit without repo returns fatal error', () => {
    const r = processCommand(makeState(), 'git commit -m "test"');
    expect(r.lines[0].type).toBe('error');
  });

  it('git commit -m creates a commit and clears staging', () => {
    let s = processCommand(makeState(), 'git init').newState;
    s = withFiles(s, 'mon-fichier.txt');
    s = processCommand(s, 'git add mon-fichier.txt').newState;
    const r = processCommand(s, 'git commit -m "feat: initial commit"');
    expect(r.lines[0].type).toBe('success');
    expect(r.lines[0].text).toContain('feat: initial commit');
    expect(r.newState.git?.commits).toHaveLength(1);
    expect(r.newState.git?.stagedFiles).toHaveLength(0);
  });

  it('git commit without -m explains that the editor is not simulated, and records nothing', () => {
    const s = withFiles(makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: ['a.txt'], commits: [], remotes: {} } }), 'a.txt');
    const r = processCommand(s, 'git commit');
    expect(r.lines[0].type).toBe('info');
    expect(r.lines[0].text).toContain('git commit -m');
    expect(r.status).toBe(1);
    expect(r.newState.git?.commits).toHaveLength(0);
  });

  // Git 2.56: with something staged, an empty -m aborts (exit 1).
  it('git commit -m "" aborts on the empty message', () => {
    const s = withFiles(makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: ['a.txt'], commits: [], remotes: {} } }), 'a.txt');
    const r = processCommand(s, 'git commit -m ""');
    expect(r.lines).toEqual([{ text: 'Aborting commit due to empty commit message.', type: 'error' }]);
    expect(r.status).toBe(1);
  });

  // Expected values from git in a sandbox (29 September 2026): both cases exit 1.
  it('git commit with nothing staged in a new repository prints the initial-commit status', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} } });
    const r = processCommand(s, 'git commit -m "empty"');
    expect(r.lines.map((l) => l.text)).toEqual([
      'On branch main', '', 'Initial commit', '', 'nothing to commit (create/copy files and use "git add" to track)',
    ]);
    expect(r.status).toBe(1);
  });

  it('git commit with nothing staged after a commit says the tree is clean', () => {
    const commit = { hash: 'a1b2c3d', message: 'first', author: 'user', date: '2026-09-29' };
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [commit], remotes: {} } });
    const r = processCommand(s, 'git commit -m "empty"');
    expect(r.lines.map((l) => [l.text, l.type])).toEqual([['On branch main', 'output'], ['nothing to commit, working tree clean', 'output']]);
    expect(r.status).toBe(1);
  });

  // ── git log ───────────────────────────────────────────────────────────────────
  it('git log without commits returns fatal error', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} } });
    const r = processCommand(s, 'git log');
    expect(r.lines[0].type).toBe('error');
  });

  it('git log shows commit history', () => {
    const s = makeState({
      git: {
        initialized: true, branch: 'main', branches: ['main'], stagedFiles: [],
        commits: [{ hash: 'abc1234', message: 'feat: add feature', author: 'user', date: '2026-04-11' }],
        remotes: {},
      },
    });
    const r = processCommand(s, 'git log');
    expect(r.lines.some((l) => l.text.includes('feat: add feature'))).toBe(true);
  });

  it('git log --oneline shows compact format', () => {
    const s = makeState({
      git: {
        initialized: true, branch: 'main', branches: ['main'], stagedFiles: [],
        commits: [{ hash: 'abc1234', message: 'feat: add feature', author: 'user', date: '2026-04-11' }],
        remotes: {},
      },
    });
    const r = processCommand(s, 'git log --oneline');
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].text).toContain('abc1234');
  });

  // ── git branch ────────────────────────────────────────────────────────────────
  // Branches name commits: these tests start from a repository with one commit.
  // Exact messages are checked against Git 2.56 in gitBranches.test.ts.
  const committed = () => {
    let s = withFiles(processCommand(makeState(), 'git init').newState, 'README.md');
    s = processCommand(s, 'git add README.md').newState;
    return processCommand(s, 'git commit -m "base"').newState;
  };

  it('git branch lists branches with asterisk on current', () => {
    const s = processCommand(committed(), 'git branch feature/x').newState;
    const r = processCommand(s, 'git branch');
    expect(r.lines.map((l) => l.text)).toEqual(['  feature/x', '* main']);
  });

  it('git branch <name> creates a new branch, silently', () => {
    const r = processCommand(committed(), 'git branch feature/login');
    expect(r.lines).toEqual([]);
    expect(r.newState.git?.branches).toContain('feature/login');
    expect(r.newState.git?.branch).toBe('main'); // does not switch
  });

  it('git branch -d removes a merged branch', () => {
    const s = processCommand(committed(), 'git branch feature/login').newState;
    const r = processCommand(s, 'git branch -d feature/login');
    expect(r.newState.git?.branches).not.toContain('feature/login');
  });

  it('git branch -d current branch returns error', () => {
    const r = processCommand(committed(), 'git branch -d main');
    expect(r.lines[0].type).toBe('error');
    expect(r.status).toBe(1);
  });

  // ── git checkout ──────────────────────────────────────────────────────────────
  it('git checkout -b creates and switches to new branch', () => {
    const r = processCommand(committed(), 'git checkout -b feature/cart');
    expect(r.newState.git?.branch).toBe('feature/cart');
    expect(r.newState.git?.branches).toContain('feature/cart');
    expect(r.lines[0].type).toBe('success');
  });

  it('git checkout switches to existing branch', () => {
    const s = processCommand(committed(), 'git branch develop').newState;
    const r = processCommand(s, 'git checkout develop');
    expect(r.newState.git?.branch).toBe('develop');
  });

  it('git checkout non-existent branch returns error', () => {
    const r = processCommand(committed(), 'git checkout non-existent');
    expect(r.lines[0].type).toBe('error');
  });

  it('git checkout -b on existing branch returns error', () => {
    const r = processCommand(committed(), 'git checkout -b main');
    expect(r.lines[0].type).toBe('error');
    expect(r.status).toBe(128);
  });

  // ── git switch (modern) ───────────────────────────────────────────────────────
  it('git switch -c creates and switches to new branch', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} } });
    const r = processCommand(s, 'git switch -c feature/payments');
    expect(r.newState.git?.branch).toBe('feature/payments');
    expect(r.lines[0].type).toBe('success');
  });

  // ── git merge ─────────────────────────────────────────────────────────────────
  /** main and feature/login each gained a commit on a different file. */
  const diverged = () => {
    let s = processCommand(committed(), 'git switch -c feature/login').newState;
    s = processCommand(withFiles(s, 'login.html'), 'git add login.html').newState;
    s = processCommand(s, 'git commit -m "feat: login"').newState;
    s = processCommand(s, 'git switch main').newState;
    s = processCommand(withFiles(s, 'home.html'), 'git add home.html').newState;
    return processCommand(s, 'git commit -m "feat: home"').newState;
  };

  it('git merge of a diverged branch creates a merge commit', () => {
    const r = processCommand(diverged(), 'git merge feature/login');
    expect(r.lines[0].text).toBe("Merge made by the 'ort' strategy.");
    expect(r.newState.git?.commits[0].message).toBe("Merge branch 'feature/login'");
    expect(r.newState.git?.commits[0].parents).toHaveLength(2);
    expect(processCommand(r.newState, 'ls').lines[0].text).toContain('login.html');
  });

  it('git merge of the current branch is already up to date', () => {
    const r = processCommand(committed(), 'git merge main');
    expect(r.lines[0].text).toBe('Already up to date.');
  });

  it('git merge non-existent branch returns error', () => {
    const r = processCommand(committed(), 'git merge ghost-branch');
    expect(r.lines[0].type).toBe('error');
    expect(r.status).toBe(1);
  });

  it('git merge --no-ff <branch> creates a merge commit even when a fast-forward is possible', () => {
    let s = processCommand(committed(), 'git switch -c feature/panier').newState;
    s = processCommand(withFiles(s, 'panier.html'), 'git add panier.html').newState;
    s = processCommand(s, 'git commit -m "feat: panier"').newState;
    s = processCommand(s, 'git switch main').newState;
    const r = processCommand(s, 'git merge --no-ff feature/panier');
    expect(r.lines[0].text).toBe("Merge made by the 'ort' strategy.");
    expect(r.newState.git?.commits[0].message).toBe("Merge branch 'feature/panier'");
  });

  // ── git remote ────────────────────────────────────────────────────────────────
  it('git remote -v shows configured remotes', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: { origin: 'https://github.com/user/repo.git' } } });
    const r = processCommand(s, 'git remote -v');
    expect(r.lines.some((l) => l.text.includes('origin'))).toBe(true);
    expect(r.lines.some((l) => l.text.includes('github.com'))).toBe(true);
  });

  it('git remote add adds a new remote', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} } });
    const r = processCommand(s, 'git remote add origin https://github.com/user/repo.git');
    expect(r.newState.git?.remotes['origin']).toBe('https://github.com/user/repo.git');
  });

  it('git remote add duplicate remote returns error', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: { origin: 'https://x.com/r.git' } } });
    const r = processCommand(s, 'git remote add origin https://github.com/y.git');
    expect(r.lines[0].type).toBe('error');
    expect(r.lines[0].text).toContain('already exists');
  });

  it('git remote remove deletes a remote', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: { origin: 'https://github.com/u/r.git' } } });
    const r = processCommand(s, 'git remote remove origin');
    expect(r.newState.git?.remotes['origin']).toBeUndefined();
  });

  // ── git push ──────────────────────────────────────────────────────────────────
  it('git push without remote returns fatal error', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [{ hash: 'abc', message: 'test', author: 'user', date: '2026-04-11' }], remotes: {} } });
    const r = processCommand(s, 'git push');
    expect(r.lines[0].type).toBe('error');
    expect(r.lines[0].text).toContain('fatal');
  });

  // Expected outputs from git 2.56 pushing to a local bare repository (1 October 2026).
  it('git push -u to a remote that already has the commit: up to date, and tracking set', () => {
    const s = makeState({
      git: {
        initialized: true, branch: 'main', branches: ['main'],
        stagedFiles: [],
        commits: [{ hash: 'abc1234', message: 'feat: x', author: 'user', date: '2026-04-11' }],
        remotes: { origin: 'https://github.com/user/repo.git' },
      },
    });
    const r = processCommand(s, 'git push -u origin main');
    expect(r.lines.map((l) => l.text)).toEqual(['Everything up-to-date', "branch 'main' set up to track 'origin/main'."]);
    expect(r.newState.git?.upstream).toEqual({ main: 'origin/main' });
  });

  // ── git pull ──────────────────────────────────────────────────────────────────
  it('git pull without remote returns error', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} } });
    const r = processCommand(s, 'git pull');
    expect(r.lines[0].type).toBe('error');
  });

  it('git pull on a branch that tracks nothing explains how to set it (git names the remote)', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: { origin: 'https://github.com/u/r.git' } } });
    const r = processCommand(s, 'git pull');
    expect(r.status).toBe(1);
    expect(r.lines.map((l) => l.text)).toEqual([
      'There is no tracking information for the current branch.',
      'Please specify which branch you want to merge with.',
      'See git-pull(1) for details.',
      '',
      '    git pull <remote> <branch>',
      '',
      'If you wish to set tracking information for this branch you can do so with:',
      '',
      '    git branch --set-upstream-to=origin/<branch> main',
      '',
    ]);
  });

  it('git pull --rebase asks which branch to rebase against when nothing is tracked', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: { origin: 'https://github.com/u/r.git' } } });
    const r = processCommand(s, 'git pull --rebase');
    expect(r.status).toBe(1);
    expect(r.lines[1].text).toBe('Please specify which branch you want to rebase against.');
  });

  // ── git fetch ─────────────────────────────────────────────────────────────────
  it('git fetch without configured remote returns error', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: {} } });
    const r = processCommand(s, 'git fetch origin');
    expect(r.lines[0].type).toBe('error');
  });

  it('git fetch with nothing new on the remote prints nothing', () => {
    const s = makeState({ git: { initialized: true, branch: 'main', branches: ['main'], stagedFiles: [], commits: [], remotes: { origin: 'https://github.com/u/r.git' } } });
    const r = processCommand(s, 'git fetch origin');
    expect(r.lines).toEqual([]);
  });

  // ── git clone ─────────────────────────────────────────────────────────────────
  it('git clone initialises a repo with remote and initial commit', () => {
    const r = processCommand(makeState(), 'git clone https://github.com/user/projet.git');
    expect(r.lines.some((l) => l.text.includes('Cloning into'))).toBe(true);
    expect(r.newState.git?.initialized).toBe(true);
    expect(r.newState.git?.remotes['origin']).toBe('https://github.com/user/projet.git');
    expect(r.newState.git?.commits).toHaveLength(1);
  });

  it('git clone without URL returns error', () => {
    const r = processCommand(makeState(), 'git clone');
    expect(r.lines[0].type).toBe('error');
  });

  // ── git diff ──────────────────────────────────────────────────────────────────
  it('git diff shows the unstaged change of a tracked file, and nothing once it is staged', () => {
    let s = withFiles(processCommand(makeState(), 'git init').newState, 'fichier.txt');
    s = processCommand(processCommand(s, 'git add fichier.txt').newState, 'git commit -m "base"').newState;
    s = processCommand(s, 'echo autre > fichier.txt').newState;
    expect(processCommand(s, 'git diff').lines.map((l) => l.text)).toContain('+autre');
    s = processCommand(s, 'git add fichier.txt').newState;
    expect(processCommand(s, 'git diff').lines).toEqual([]);
  });

  // ── git stash ─────────────────────────────────────────────────────────────────
  it('git stash puts changes aside and git stash pop brings them back', () => {
    let s = withFiles(processCommand(makeState(), 'git init').newState, 'a.txt');
    s = processCommand(processCommand(s, 'git add a.txt').newState, 'git commit -m "base"').newState;
    s = processCommand(s, 'echo change > a.txt').newState;
    s = processCommand(s, 'git add a.txt').newState;
    const stash = processCommand(s, 'git stash');
    expect(stash.lines[0].text).toBe(`Saved working directory and index state WIP on main: ${s.git!.commits[0].hash.slice(0, 7)} base`);
    expect(stash.newState.git?.stagedFiles).toHaveLength(0);
    expect(processCommand(stash.newState, 'cat a.txt').lines[0].text).toBe('a.txt');
    const pop = processCommand(stash.newState, 'git stash pop');
    expect(processCommand(pop.newState, 'cat a.txt').lines[0].text).toBe('change');
    expect(pop.lines[pop.lines.length - 1].text).toMatch(/^Dropped refs\/stash@\{0\} \([0-9a-f]{40}\)$/);
  });

  // ── git config ───────────────────────────────────────────────────────────────
  it('git config --list shows configuration', () => {
    const r = processCommand(makeState(), 'git config --list');
    expect(r.lines.some((l) => l.text.includes('user.name'))).toBe(true);
  });

  // ── git help ─────────────────────────────────────────────────────────────────
  it('git help lists available commands', () => {
    const r = processCommand(makeState(), 'git help');
    expect(r.lines.some((l) => l.text.includes('init'))).toBe(true);
    expect(r.lines.some((l) => l.text.includes('commit'))).toBe(true);
  });

  // ── git rebase (THI-305) ──────────────────────────────────────────────────────
  it('git rebase without init returns fatal error', () => {
    const r = processCommand(makeState(), 'git rebase main');
    expect(r.lines[0].text).toContain('not a git repository');
  });

  it('git rebase <branch> replays the commits on top of it (linear history)', () => {
    let s = withFiles(processCommand(makeState(), 'git init').newState, 'a');
    s = processCommand(processCommand(s, 'git add a').newState, 'git commit -m "a"').newState;
    s = processCommand(s, 'git switch -c feature').newState;
    s = processCommand(processCommand(withFiles(s, 'f'), 'git add f').newState, 'git commit -m "f"').newState;
    s = processCommand(s, 'git switch main').newState;
    s = processCommand(processCommand(withFiles(s, 'm'), 'git add m').newState, 'git commit -m "m"').newState;
    s = processCommand(s, 'git switch feature').newState;
    const r = processCommand(s, 'git rebase main');
    expect(r.lines.map((l) => l.text)).toEqual(['Successfully rebased and updated refs/heads/feature.']);
    expect(r.newState.git!.commits.map((c) => c.message)).toEqual(['f', 'm', 'a']);
  });

  it('git rebase on the same branch is up to date', () => {
    let s = withFiles(processCommand(makeState(), 'git init').newState, 'a');
    s = processCommand(processCommand(s, 'git add a').newState, 'git commit -m "a"').newState;
    const r = processCommand(s, 'git rebase main');
    expect(r.lines[0].text).toBe('Current branch main is up to date.');
  });

  it('git rebase -i opens an editor in git: the terminal says it is not simulated, without an error', () => {
    // HEAD~3 needs three commits below HEAD: four commits in all.
    let s = processCommand(makeState(), 'git init').newState;
    for (const f of ['a', 'b', 'c', 'd']) {
      s = processCommand(withFiles(s, f), `git add ${f}`).newState;
      s = processCommand(s, `git commit -m "${f}"`).newState;
    }
    const r = processCommand(s, 'git rebase -i HEAD~3');
    expect(r.lines.some((l) => l.type === 'info' && l.text.toLowerCase().includes('rebase interactif'))).toBe(true);
    expect(r.lines.some((l) => l.type === 'error')).toBe(false);
  });

  it('git rebase -i HEAD~N beyond the history is refused, as git does', () => {
    // Real git 2.x, with 0 or 1 commit: "fatal: invalid upstream 'HEAD~3'" (exit 128).
    let s = processCommand(makeState(), 'git init').newState;
    expect(processCommand(s, 'git rebase -i HEAD~3').lines).toEqual([{ text: "fatal: invalid upstream 'HEAD~3'", type: 'error' }]);
    s = processCommand(processCommand(withFiles(s, 'a'), 'git add a').newState, 'git commit -m "a"').newState;
    expect(processCommand(s, 'git rebase -i HEAD~3').lines[0].text).toBe("fatal: invalid upstream 'HEAD~3'");
  });

  it('git rebase invalid upstream returns error', () => {
    const s = processCommand(makeState(), 'git init').newState;
    const r = processCommand(s, 'git rebase nope');
    expect(r.lines[0].text).toContain('invalid upstream');
  });

  // ── git cherry-pick (THI-305) ─────────────────────────────────────────────────
  it('git cherry-pick without a ref returns usage (repo has commits)', () => {
    let s = withFiles(processCommand(makeState(), 'git init').newState, 'mon-fichier.txt');
    s = processCommand(s, 'git add mon-fichier.txt').newState;
    s = processCommand(s, 'git commit -m "base"').newState;
    const r = processCommand(s, 'git cherry-pick');
    expect(r.lines[0].text).toBe('usage: git cherry-pick [--edit] [-n] [-m <parent-number>] [-s] [-x] [--ff]');
    expect(r.status).toBe(129);
  });

  // Git 2.56: options are checked before the repository, so an empty one gets the usage too.
  it('git cherry-pick without a ref on a repo with no commits returns usage', () => {
    const s = processCommand(makeState(), 'git init').newState;
    const r = processCommand(s, 'git cherry-pick');
    expect(r.lines[0].text).toMatch(/^usage: git cherry-pick/);
    expect(r.status).toBe(129);
  });

  it('git cherry-pick a bad revision returns fatal', () => {
    let s = withFiles(processCommand(makeState(), 'git init').newState, 'mon-fichier.txt');
    s = processCommand(s, 'git add mon-fichier.txt').newState;
    s = processCommand(s, 'git commit -m "first"').newState;
    const r = processCommand(s, 'git cherry-pick deadbee');
    expect(r.lines[0].text).toContain("bad revision");
  });

  it('git cherry-pick <hash> re-applies a commit of another branch on the current one', () => {
    let s = withFiles(processCommand(makeState(), 'git init').newState, 'mon-fichier.txt');
    s = processCommand(s, 'git add mon-fichier.txt').newState;
    s = processCommand(s, 'git commit -m "feat: base"').newState;
    s = processCommand(s, 'git switch -c fix').newState;
    s = processCommand(processCommand(withFiles(s, 'fix.txt'), 'git add fix.txt').newState, 'git commit -m "fix: x"').newState;
    const { hash } = s.git!.commits[0];
    s = processCommand(s, 'git switch main').newState;
    const before = s.git!.commits.length;
    const r = processCommand(s, `git cherry-pick ${hash}`);
    expect(r.newState.git!.commits.length).toBe(before + 1);
    expect(r.lines[0].text).toMatch(/^\[main [0-9a-f]{7}\] fix: x$/);
    expect(processCommand(r.newState, 'ls').lines[0].text).toContain('fix.txt');
  });

  // ── unknown git subcommand ────────────────────────────────────────────────────
  it('unknown git subcommand returns error', () => {
    const r = processCommand(makeState(), 'git foobar');
    expect(r.lines[0].type).toBe('error');
    expect(r.lines[0].text).toContain('foobar');
  });

  // ── full workflow integration ─────────────────────────────────────────────────
  it('full git workflow: init → add → commit → branch → push', () => {
    let s = processCommand(makeState(), 'git init').newState;
    s = processCommand(withFiles(s, 'README.md'), 'git add README.md').newState;
    s = processCommand(s, 'git commit -m "chore: initial commit"').newState;
    s = processCommand(s, 'git checkout -b feature/auth').newState;
    s = processCommand(withFiles(s, 'auth.ts'), 'git add auth.ts').newState;
    s = processCommand(s, 'git commit -m "feat: add auth"').newState;
    s = processCommand(s, 'git remote add origin https://github.com/user/repo.git').newState;
    const push = processCommand(s, 'git push -u origin feature/auth');
    // GitHub answers a new branch with the link to open a pull request; then git's own report.
    expect(push.lines.map((l) => l.text)).toEqual([
      'remote: ',
      "remote: Create a pull request for 'feature/auth' on GitHub by visiting:",
      'remote:      https://github.com/user/repo/pull/new/feature/auth',
      'remote: ',
      'To https://github.com/user/repo.git',
      ' * [new branch]      feature/auth -> feature/auth',
      "branch 'feature/auth' set up to track 'origin/feature/auth'.",
    ]);
    expect(s.git?.commits).toHaveLength(2);
    expect(s.git?.branch).toBe('feature/auth');
  });
});

// ─── Module 11 — L'IA comme outil dev ─────────────────────────────────────────

describe('ai-help', () => {
  it('ai-help without args returns overview', () => {
    const r = processCommand(makeState(), 'ai-help');
    expect(r.lines.some((l) => l.text.includes('ai-help'))).toBe(true);
    expect(r.lines.some((l) => l.text.includes('capabilities'))).toBe(true);
  });

  it('ai-help with unknown subcommand returns overview', () => {
    const r = processCommand(makeState(), 'ai-help foobar');
    expect(r.lines.some((l) => l.text.includes('ai-help'))).toBe(true);
  });

  it('ai-help capabilities lists what AI can do', () => {
    const r = processCommand(makeState(), 'ai-help capabilities');
    expect(r.lines.some((l) => l.text.includes('BIEN'))).toBe(true);
  });

  it('ai-help limits lists what AI cannot do', () => {
    const r = processCommand(makeState(), 'ai-help limits');
    expect(r.lines.some((l) => l.text.includes('SAIT PAS FAIRE'))).toBe(true);
  });

  it('ai-help prompts shows prompt guide', () => {
    const r = processCommand(makeState(), 'ai-help prompts');
    expect(r.lines.some((l) => l.text.includes('RÈGLE'))).toBe(true);
    expect(r.lines.some((l) => l.text.includes('Bon'))).toBe(true);
  });

  it('ai-help context shows advanced prompt guide', () => {
    const r = processCommand(makeState(), 'ai-help context');
    expect(r.lines.some((l) => l.text.includes('TECHNIQUE'))).toBe(true);
  });

  it('ai-help validate shows validation checklist', () => {
    const r = processCommand(makeState(), 'ai-help validate');
    expect(r.lines.some((l) => l.text.includes('checklist') || l.text.includes('COMMIT'))).toBe(true);
  });

  it('ai-help debug shows debug workflow', () => {
    const r = processCommand(makeState(), 'ai-help debug');
    expect(r.lines.some((l) => l.text.includes('debug') || l.text.includes('DEBUG'))).toBe(true);
  });

  it('ai-help security shows security rules', () => {
    const r = processCommand(makeState(), 'ai-help security');
    expect(r.lines.some((l) => l.text.includes('JAMAIS'))).toBe(true);
  });

  it('ai-help claude-cli shows Claude Code commands', () => {
    const r = processCommand(makeState(), 'ai-help claude-cli');
    expect(r.lines.some((l) => l.text.includes('claude'))).toBe(true);
  });

  it('ai-help careers shows career-specific usage', () => {
    const r = processCommand(makeState(), 'ai-help careers');
    expect(r.lines.some((l) => l.text.includes('DEVOPS') || l.text.includes('DevOps'))).toBe(true);
  });

  it('ai-help senior shows senior mindset', () => {
    const r = processCommand(makeState(), 'ai-help senior');
    expect(r.lines.some((l) => l.text.includes('amplifie') || l.text.includes('JUNIOR'))).toBe(true);
  });

  it('ai-help workflow shows full deployment cycle', () => {
    const r = processCommand(makeState(), 'ai-help workflow');
    expect(r.lines.some((l) => l.text.includes('BRIEF') || l.text.includes('déploiement'))).toBe(true);
  });

  it('ai-help is case-insensitive', () => {
    const r1 = processCommand(makeState(), 'AI-HELP');
    const r2 = processCommand(makeState(), 'ai-help');
    expect(r1.lines.length).toBe(r2.lines.length);
  });

  it('all ai-help subcommands return non-empty output', () => {
    const subs = ['capabilities', 'limits', 'prompts', 'context', 'validate',
                  'debug', 'security', 'claude-cli', 'careers', 'senior', 'workflow'];
    for (const sub of subs) {
      const r = processCommand(makeState(), `ai-help ${sub}`);
      expect(r.lines.length).toBeGreaterThan(3);
    }
  });
});

// ─── Scripts, $PROFILE and PowerShell expressions (THI-353) ──────────────────

describe('running a script', () => {
  /** Runs commands in sequence from the default filesystem, returns the last output and state. */
  function run(env: 'linux' | 'macos' | 'windows', ...cmds: string[]) {
    let state = createInitialState();
    let last = processCommand(state, 'pwd', env);
    for (const c of cmds) {
      last = processCommand(state, c, env);
      state = last.newState;
    }
    return { out: last.lines, state };
  }
  const texts = (lines: { text: string }[]) => lines.map((l) => l.text);

  it('./script.sh runs the lines of the script', () => {
    const { out } = run('linux', 'cd projets', './script.sh');
    expect(texts(out)).toEqual(['Bonjour le monde !', 'Ce script fonctionne !']);
  });

  it('bash <file> runs it without the execute bit, from any directory', () => {
    expect(texts(run('linux', 'bash projets/script.sh').out)).toEqual(['Bonjour le monde !', 'Ce script fonctionne !']);
    expect(texts(run('macos', 'cd projets', 'sh script.sh').out)).toHaveLength(2);
  });

  it('.\\script.sh runs on Windows, where there is no execute bit', () => {
    const { out } = run('windows', 'cd projets', '.\\script.sh');
    expect(out.every((l) => l.type !== 'error')).toBe(true);
    expect(texts(out)).toContain('Bonjour le monde !');
  });

  it('./file without the execute bit is refused, as chmod teaches', () => {
    const denied = run('linux', 'cd projets', './README.md').out;
    expect(denied).toEqual([{ text: 'bash: ./README.md: Permission denied', type: 'error' }]);
    const allowed = run('linux', 'cd projets', 'chmod +x README.md', './README.md').out;
    expect(allowed.some((l) => /Permission denied/.test(l.text))).toBe(false);
  });

  it('reports a missing script or a directory', () => {
    expect(run('linux', './absent.sh').out[0].text).toBe('bash: ./absent.sh: No such file or directory');
    expect(run('linux', 'bash projets').out[0].text).toBe('bash: projets: Is a directory');
  });

  it('runs in a child shell: files stay, cd and exported variables do not', () => {
    const { state } = run(
      'linux',
      'echo "cd /tmp" > s.sh',
      'echo "export MARK=1" >> s.sh',
      'echo "touch trace.txt" >> s.sh',
      'bash s.sh',
    );
    expect(state.cwd).toEqual(['home', 'user']);
    expect(state.envVars.MARK).toBeUndefined();
    expect(processCommand(state, 'ls /tmp', 'linux').lines[0].text).toContain('trace.txt');
  });

  it('keeps only the invocation in the history', () => {
    const { state } = run('linux', 'cd projets', './script.sh');
    expect(state.commandHistory).toEqual(['cd projets', './script.sh']);
  });

  it('stops a script that calls itself instead of hanging', () => {
    const { out } = run('linux', 'echo "bash loop.sh" > loop.sh', 'bash loop.sh');
    expect(out.some((l) => l.type === 'error' && /imbriqués/.test(l.text))).toBe(true);
  });
});

describe('PowerShell: $PROFILE, (Get-Content).Count, execution policy', () => {
  const s = () => createInitialState();

  it('$PROFILE prints the profile path on Windows', () => {
    expect(processCommand(s(), '$PROFILE', 'windows').lines[0].text).toBe(
      'C:\\Users\\user\\documents\\PowerShell\\Microsoft.PowerShell_profile.ps1',
    );
    expect(processCommand(s(), 'echo $PROFILE', 'windows').lines[0].text).toMatch(/Microsoft\.PowerShell_profile\.ps1$/);
  });

  it('$PROFILE means nothing in bash', () => {
    expect(processCommand(s(), 'cat $PROFILE', 'linux').lines[0].type).toBe('error');
  });

  it('(Get-Content file).Count counts the lines', () => {
    const lines = processCommand(s(), 'cat documents/rapport.md', 'linux').lines.length;
    expect(processCommand(s(), '(Get-Content documents/rapport.md).Count', 'windows').lines).toEqual([
      { text: String(lines), type: 'output' },
    ]);
    expect(processCommand(s(), '(gc documents/absent.md).Count', 'windows').lines[0].type).toBe('error');
  });

  it('Set-ExecutionPolicy changes what Get-ExecutionPolicy reports', () => {
    expect(processCommand(s(), 'Get-ExecutionPolicy', 'windows').lines[0].text).toBe('Restricted');
    const set = processCommand(s(), 'Set-ExecutionPolicy RemoteSigned -Scope CurrentUser', 'windows');
    expect(set.lines[0].type).toBe('info');
    expect(set.lines[0].text).toContain('CurrentUser');
    expect(processCommand(set.newState, 'Get-ExecutionPolicy', 'windows').lines[0].text).toBe('RemoteSigned');
    expect(processCommand(s(), 'Set-ExecutionPolicy -ExecutionPolicy bypass', 'windows').newState.executionPolicy).toBe('Bypass');
  });

  it('Set-ExecutionPolicy rejects a missing or unknown policy', () => {
    expect(processCommand(s(), 'Set-ExecutionPolicy', 'windows').lines[0].type).toBe('error');
    expect(processCommand(s(), 'Set-ExecutionPolicy Whatever', 'windows').lines[0].text).toMatch(/Cannot convert value "Whatever"/);
  });

  it('the execution policy cmdlets do not exist in bash', () => {
    expect(processCommand(s(), 'Set-ExecutionPolicy RemoteSigned', 'linux').lines[0].text).toMatch(/commande introuvable/);
  });
});

describe('chmod modes (THI-353)', () => {
  function modeAfter(mode: string, file = 'projets/README.md') {
    const s = processCommand(createInitialState(), `chmod ${mode} ${file}`, 'linux').newState;
    const line = processCommand(s, `ls -l ${file}`, 'linux').lines[0].text;
    return line.slice(0, 10);
  }

  it('+x makes the file executable for everyone (was shifted one position)', () => {
    expect(modeAfter('+x')).toBe('-rwxr-xr-x');
  });

  it('u+x only for the owner, go-w removes write, a=r sets exactly read', () => {
    expect(modeAfter('u+x')).toBe('-rwxr--r--');
    expect(modeAfter('777')).toBe('-rwxrwxrwx');
    expect(modeAfter('go-w', 'projets/script.sh')).toBe('-rwxr-xr-x');
    expect(modeAfter('a=r')).toBe('-r--r--r--');
    expect(modeAfter('u+x,g+w')).toBe('-rwxrw-r--');
  });

  it('accepts every octal mode, not only a fixed list', () => {
    expect(modeAfter('750')).toBe('-rwxr-x---');
    expect(modeAfter('640')).toBe('-rw-r-----');
  });

  it('rejects an invalid mode without changing the file', () => {
    const r = processCommand(createInitialState(), 'chmod 9z9 projets/README.md', 'linux');
    expect(r.lines[0]).toEqual({ text: "chmod: invalid mode: '9z9'", type: 'error' });
    expect(modeAfter('+q')).toBe('-rw-r--r--');
  });

  it('keeps the directory marker', () => {
    const s = processCommand(createInitialState(), 'chmod 700 documents', 'linux').newState;
    const line = processCommand(s, 'ls -l', 'linux').lines.find((l) => l.text.endsWith(' documents'));
    expect(line?.text.slice(0, 10)).toBe('drwx------');
  });
});

describe('scripts — review follow-ups (THI-353)', () => {
  function build(env: 'linux' | 'windows', ...cmds: string[]) {
    let state = createInitialState();
    for (const c of cmds) state = processCommand(state, c, env).newState;
    return state;
  }

  it('clear inside a script clears the screen and keeps what follows', () => {
    const s = build('linux', 'echo "echo avant" > c.sh', 'echo "clear" >> c.sh', 'echo "echo après" >> c.sh');
    const r = processCommand(s, 'bash c.sh', 'linux');
    expect(r.clear).toBe(true);
    expect(r.lines.map((l) => l.text)).toEqual(['après']);
  });

  it('(Get-Content $PROFILE).Count counts the profile lines', () => {
    const s = build('windows', 'mkdir -p documents/PowerShell', 'echo "ligne 1" > documents/PowerShell/Microsoft.PowerShell_profile.ps1', 'echo "ligne 2" >> documents/PowerShell/Microsoft.PowerShell_profile.ps1');
    expect(processCommand(s, '(Get-Content $PROFILE).Count', 'windows').lines).toEqual([{ text: '2', type: 'output' }]);
  });

  it('a fan-out of scripts is cut by the shared line budget, quickly', () => {
    // 30 lines, each calling the same 30-line script, 3 levels deep = 27 000 runs without a budget.
    let s = build('linux', 'echo "bash big.sh" > big.sh');
    for (let i = 0; i < 29; i++) s = processCommand(s, 'echo "bash big.sh" >> big.sh', 'linux').newState;
    const t0 = performance.now();
    const r = processCommand(s, 'bash big.sh', 'linux');
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(r.lines.filter((l) => /script interrompu après 500 lignes/.test(l.text))).toHaveLength(1);
    // The budget resets for the next command.
    expect(processCommand(r.newState, 'bash projets/script.sh', 'linux').lines[0].text).toBe('Bonjour le monde !');
  });

  it('a pipe keeps the environment: a Windows script needs no execute bit there either', () => {
    const s = build('windows', 'echo "echo trouvé" > outil.sh');
    const r = processCommand(s, '.\\outil.sh | grep trouvé', 'windows');
    expect(r.lines).toEqual([{ text: 'trouvé', type: 'output' }]);
  });
});

// ─── Shell layer: new commands (full behaviour in shellLayer.test.ts) ─────────

describe('Get-Item and pipeline cmdlets', () => {
  function build(env: 'linux' | 'windows', ...cmds: string[]): TerminalState {
    let s = createInitialState();
    for (const c of cmds) s = processCommand(s, c, env).newState;
    return s;
  }
  const out = (s: TerminalState, cmd: string, env: 'linux' | 'windows' = 'windows') =>
    processCommand(s, cmd, env).lines.map((l) => l.text).join('\n');

  it('Get-Item shows an existing item and names the full missing path', () => {
    const s = createInitialState();
    expect(out(s, 'Get-Item documents')).toBe('documents');
    expect(out(s, 'Get-Item absent')).toBe("Get-Item: Cannot find path 'C:\\Users\\user\\absent' because it does not exist.");
    expect(out(s, 'gi -Path documents')).toBe('documents');
  });

  it('Get-Item is PowerShell only', () => {
    expect(processCommand(createInitialState(), 'Get-Item documents', 'linux').lines[0].type).toBe('error');
  });

  it('Sort-Object sorts a table by a column, header kept', () => {
    const lines = out(createInitialState(), 'Get-Process | Sort-Object Id -Descending').split('\n');
    expect(lines[0]).toContain('ProcessName');
    expect(lines.slice(2).map((l) => l.trim().split(/\s+/)[6])).toEqual(['5678', '2048', '1234']);
  });

  it('Select-Object -First keeps the table header', () => {
    const lines = out(createInitialState(), 'Get-Process | Select-Object -First 1').split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain('WindowsTerminal');
  });

  it('Measure-Object -Line / -Word', () => {
    const s = build('windows', 'echo "un deux" > f.txt', 'echo trois >> f.txt');
    expect(out(s, 'Get-Content f.txt | Measure-Object -Line -Word')).toBe('Lines      : 2\nWords      : 3');
  });

  it('Add-Content appends, Set-Content replaces', () => {
    let s = build('windows', 'echo a | Set-Content f.txt', 'echo b | Add-Content f.txt');
    expect(out(s, 'Get-Content f.txt')).toBe('a\nb');
    s = processCommand(s, 'echo c | Set-Content f.txt', 'windows').newState;
    expect(out(s, 'Get-Content f.txt')).toBe('c');
  });

  it('Select-String and findstr filter piped lines', () => {
    const s = build('windows', 'echo Alpha > f.txt', 'echo beta >> f.txt');
    expect(out(s, 'Get-Content f.txt | Select-String alpha')).toBe('Alpha');
    expect(out(s, 'Get-Content f.txt | findstr alpha')).toBe('');
    expect(out(s, 'Get-Content f.txt | findstr /I alpha')).toBe('Alpha');
  });

  it('uniq -c and sort -k3rn on a pipe (Unix)', () => {
    const s = build('linux', 'echo a > f', 'echo a >> f', 'echo b >> f');
    expect(out(s, 'cat f | uniq -c', 'linux')).toBe('      2 a\n      1 b');
    const t = build('linux', 'echo "x y 5" > g', 'echo "x y 40" >> g', 'echo "x y 9" >> g');
    expect(out(t, 'cat g | sort -k3rn', 'linux')).toBe('x y 40\nx y 9\nx y 5');
  });

  it('git log output goes through a pipe (coloured lines are standard output)', () => {
    const s = build('linux', 'mkdir p', 'cd p', 'git init', 'touch a', 'git add a', 'git commit -m "premier"');
    expect(out(s, 'git log | grep -c commit', 'linux')).toBe('1');
  });
});

// ─── THI-353: what the lessons show must be what the terminal prints ─────────
// Expected values come from real bash / PowerShell, never from this engine.

describe('theory ↔ terminal: engine fidelity', () => {
  type Env = 'linux' | 'macos' | 'windows';
  function build(env: Env, ...cmds: string[]): TerminalState {
    let s = createInitialState();
    for (const c of cmds) s = processCommand(s, c, env).newState;
    return s;
  }
  const out = (s: TerminalState, cmd: string, env: Env = 'linux') =>
    processCommand(s, cmd, env).lines.map((l) => l.text).join('\n');
  const types = (s: TerminalState, cmd: string, env: Env = 'linux') => processCommand(s, cmd, env).lines.map((l) => l.type);

  it('pwd prints the absolute path, never ~', () => {
    expect(out(createInitialState(), 'pwd')).toBe('/home/user');
    expect(out(build('linux', 'cd documents'), 'pwd')).toBe('/home/user/documents');
    expect(out(build('macos', 'cd documents'), 'pwd', 'macos')).toBe('/home/user/documents');
    expect(out(createInitialState(), 'Get-Location', 'windows')).toBe('C:\\Users\\user');
  });

  it('cd - goes back to the previous directory and prints it', () => {
    const s = build('linux', 'cd documents', 'cd ..');
    const r = processCommand(s, 'cd -', 'linux');
    expect(r.lines.map((l) => l.text)).toEqual(['/home/user/documents']);
    expect(r.newState.cwd).toEqual(['home', 'user', 'documents']);
    expect(processCommand(r.newState, 'cd -', 'linux').newState.cwd).toEqual(['home', 'user']);
    expect(out(createInitialState(), 'cd -')).toBe('bash: cd: OLDPWD not set');
  });

  it('export expands the variables of its value', () => {
    const s = build('linux', 'export PATH=$PATH:/opt/myapp/bin', 'export SALUT="Bonjour $USER"');
    expect(out(s, 'echo $PATH')).toBe('/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/myapp/bin');
    expect(out(s, 'echo $SALUT')).toBe('Bonjour user');
  });

  it('PowerShell shows a Windows PATH', () => {
    const s = createInitialState();
    expect(out(s, 'echo $env:PATH', 'windows')).toBe('C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Git\\bin');
    expect(out(s, '$env:PATH', 'windows')).toBe('C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Git\\bin');
    const t = build('windows', '$env:PATH = "C:\\outils"');
    expect(out(t, '$env:PATH', 'windows')).toBe('C:\\outils');
  });

  it('Git for Windows prints C:/ paths with forward slashes', () => {
    const r = processCommand(createInitialState(), 'git init mon-projet', 'windows');
    expect(r.lines[0].text).toBe('Initialized empty Git repository in C:/Users/user/mon-projet/.git/');
    const again = processCommand(build('windows', 'git init mon-projet', 'cd mon-projet'), 'git init', 'windows');
    expect(again.lines[0].text).toBe('Reinitialized existing Git repository in C:/Users/user/mon-projet/.git/');
  });

  it('PowerShell $env:X = "..." expands $env: variables in its value', () => {
    const s = build('windows', '$env:PATH = "$env:PATH;C:\\outils"');
    expect(out(s, '$env:PATH', 'windows')).toBe('C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Git\\bin;C:\\outils');
  });

  it('git init <dir> creates the directory and the repository there', () => {
    const r = processCommand(createInitialState(), 'git init mon-projet', 'linux');
    expect(r.lines[0].text).toBe('Initialized empty Git repository in /home/user/mon-projet/.git/');
    expect(r.newState.cwd).toEqual(['home', 'user']);
    expect(out(r.newState, 'ls')).toContain('mon-projet');
  });

  it('wc counts bytes (UTF-8) and the final newline, like the real wc', () => {
    // Real wc on this exact content: "6 22 143" (â and î are two bytes each).
    const s = createInitialState();
    expect(out(s, 'wc documents/notes.txt')).toBe(' 6 22 143 documents/notes.txt');
    expect(out(s, 'wc -c documents/notes.txt')).toBe(' 143 documents/notes.txt');
    const e = build('linux', 'touch vide.txt', 'echo x > x.txt');
    expect(out(e, 'wc vide.txt')).toBe(' 0 0 0 vide.txt');
    expect(out(e, 'wc x.txt')).toBe(' 1 1 2 x.txt');
    // Real: printf 'pomme\npoire\n' | wc  ->  2 2 12
    const p = build('linux', 'echo pomme > f', 'echo poire >> f');
    expect(out(p, 'cat f | wc')).toBe('2 2 12');
  });

  it('ls sorts like ls (no directories-first) and marks nothing, -F adds the /', () => {
    const s = build('linux', 'touch fichier.txt');
    expect(out(s, 'ls')).toBe('documents  downloads  fichier.txt  projets');
    expect(out(s, 'ls -F')).toBe('documents/  downloads/  fichier.txt  projets/');
    expect(out(createInitialState(), 'ls -a')).toBe('.  ..  .bashrc  .profile  .zshrc  documents  downloads  projets');
  });

  it('!! repeats the previous command (sudo !!)', () => {
    const s = build('linux', 'apt update');
    const r = processCommand(s, 'sudo !!', 'linux');
    expect(r.lines[0]).toEqual({ text: 'sudo apt update', type: 'info' });
    expect(r.lines.some((l) => l.type === 'error')).toBe(false);
    expect(r.newState.commandHistory[r.newState.commandHistory.length - 1]).toBe('sudo apt update');
    expect(out(createInitialState(), 'sudo !!')).toBe('bash: !!: event not found');
  });

  it('apt needs root to change the system, sudo gives it', () => {
    const s = createInitialState();
    expect(types(s, 'apt update')).toContain('error');
    expect(out(s, 'apt update')).toContain('are you root?');
    expect(types(s, 'sudo apt update')).not.toContain('error');
    expect(out(s, 'sudo apt install tree')).toContain('tree');
    expect(types(s, 'apt search tree')).not.toContain('error');
    expect(types(s, 'apt update', 'windows')).toContain('error');
  });

  it('killall and Start-Process exist', () => {
    const s = createInitialState();
    expect(processCommand(s, 'killall node', 'linux').lines).toEqual([]);
    expect(types(s, 'killall')).toEqual(['error']);
    expect(types(s, 'Start-Process powershell -Verb RunAs', 'windows')).toEqual(['info']);
    expect(out(s, 'Start-Process powershell -Verb RunAs', 'windows')).toContain('administrateur');
  });

  it('Linux commands are case-sensitive; the error repeats what was typed', () => {
    const s = createInitialState();
    expect(types(s, 'LS')).toEqual(['error']);
    expect(out(s, 'LS')).toMatch(/^LS: /);
    // macOS (case-insensitive disk) and PowerShell accept any case.
    expect(types(s, 'LS', 'macos')).not.toContain('error');
    expect(types(s, 'get-childitem', 'windows')).not.toContain('error');
    expect(out(s, 'Get-Locaton', 'windows')).toMatch(/^Get-Locaton: /);
  });

  it('ls -l shows the size in bytes, the same number as wc -c, and follows edits', () => {
    const s = createInitialState();
    expect(out(s, 'ls -l documents/notes.txt')).toContain(' 143 ');
    // Real: printf '#!/bin/bash\necho "Bonjour le monde !"\necho "Ce script fonctionne !"\n' | wc -c -> 68
    expect(out(s, 'ls -l projets/script.sh')).toContain(' 68 ');
    const e = build('linux', 'echo abc > f.txt');
    expect(out(e, 'ls -l f.txt')).toContain(' 4 ');
    expect(out(processCommand(e, 'echo abcdef > f.txt', 'linux').newState, 'ls -l f.txt')).toContain(' 7 ');
  });

  it('sudo asks for the password the first time only, like its credential cache', () => {
    const first = processCommand(createInitialState(), 'sudo whoami', 'linux');
    expect(first.lines[0]).toEqual({ text: '[sudo] password for user: ****', type: 'info' });
    const second = processCommand(first.newState, 'sudo whoami', 'linux');
    expect(second.lines.some((l) => l.text.startsWith('[sudo] password'))).toBe(false);
  });

  it('sudo whoami answers root — the point of the sudo exercise', () => {
    const s = createInitialState();
    expect(out(s, 'whoami')).toBe('user');
    const r = processCommand(s, 'sudo whoami', 'linux');
    expect(r.lines.filter((l) => l.type === 'output').map((l) => l.text)).toEqual(['root']);
    expect(out(r.newState, 'whoami')).toBe('user');
  });

  it('PowerShell 7 goes back with cd - / Set-Location -, silently', () => {
    const s = build('windows', 'Set-Location documents', 'Set-Location ..');
    const r = processCommand(s, 'Set-Location -', 'windows');
    expect(r.lines).toEqual([]);
    expect(r.newState.cwd).toEqual(['home', 'user', 'documents']);
  });

  it('rm -rf / hits the GNU safeguard and deletes nothing', () => {
    const s = createInitialState();
    const r = processCommand(s, 'sudo rm -rf /', 'linux');
    expect(r.lines.filter((l) => l.type === 'error').map((l) => l.text)).toEqual([
      "rm: it is dangerous to operate recursively on '/'",
      'rm: use --no-preserve-root to override this failsafe',
    ]);
    expect(out(r.newState, 'ls')).toBe('documents  downloads  projets');
  });

  it('ping answers in the Windows format under PowerShell', () => {
    const w = out(createInitialState(), 'ping google.com', 'windows');
    expect(w).toMatch(/^Pinging google\.com \[142\.250\.74\.46\] with 32 bytes of data:/);
    expect(w).toContain('Reply from 142.250.74.46: bytes=32');
    expect(out(createInitialState(), 'ping google.com')).toMatch(/^PING google\.com/);
  });
});

// ── Simulator gaps found by the /app/reference replay (26 September 2026) ────
// Expected values come from the real shells, run in a sandbox with the same
// files: GNU bash 5.3 (Git Bash), PowerShell 7.6, git 2.x. Never from the engine.
describe('reference replay gaps — engine matches the real shells', () => {
  const run = (cmds: string[], env: 'linux' | 'windows' = 'linux') => {
    let s = createInitialState();
    let last = processCommand(s, cmds[0], env);
    s = last.newState;
    for (const c of cmds.slice(1)) {
      last = processCommand(s, c, env);
      s = last.newState;
    }
    return last;
  };
  const text = (r: { lines: { text: string }[] }) => r.lines.map((l) => l.text).join('\n');
  const errors = (r: { lines: { type: string }[] }) => r.lines.filter((l) => l.type === 'error');

  it('cat -n numbers lines like GNU cat (width 6, then a tab)', () => {
    const r = run(['cat -n documents/notes.txt']);
    expect(r.lines[0].text).toBe('     1\tMes notes importantes');
    expect(r.lines[5].text).toBe('     6\tFin du fichier');
    expect(errors(r)).toEqual([]);
  });

  it('cat rejects an unknown option with the GNU message', () => {
    expect(text(run(['cat -z documents/notes.txt']))).toBe("cat: invalid option -- 'z'\nTry 'cat --help' for more information.");
  });

  it('grep -r searches a directory and prefixes each match with the file', () => {
    expect(text(run(['grep -rn bash documents']))).toBe('documents/notes.txt:3:1. Apprendre les commandes bash');
    expect(text(run(['grep -r notes documents']))).toBe('documents/notes.txt:Mes notes importantes');
  });

  it('grep without -r still refuses a directory', () => {
    expect(text(run(['grep bash documents']))).toBe('grep: documents: Is a directory');
  });

  it('git commit reads the message of -am, -mMSG and --message=MSG', () => {
    for (const commit of ['git commit -am "fix: x"', 'git commit -m"fix: x"', 'git commit --message="fix: x"', 'git commit --message "fix: x"']) {
      const r = run(['cd projets', 'git init', 'git add README.md', commit]);
      // The first commit of a repository: git 2.56 prints `(root-commit)`.
      expect(r.lines[0].text, commit).toMatch(/^\[main \(root-commit\) [0-9a-f]{7}\] fix: x$/);
    }
  });

  it('git cherry-pick A..B picks the commits after A up to B, oldest first', () => {
    let s = run(['git init']).newState;
    s = processCommand(processCommand(withFiles(s, 'one'), 'git add one').newState, 'git commit -m "one"').newState;
    s = processCommand(s, 'git switch -c work').newState;
    for (const m of ['two', 'three']) {
      s = processCommand(withFiles(s, m), `git add ${m}`).newState;
      s = processCommand(s, `git commit -m "${m}"`).newState;
    }
    const [three, two, one] = s.git!.commits.map((c) => c.hash);
    expect(two).toBeDefined();
    s = processCommand(s, 'git switch main').newState;
    const r = processCommand(s, `git cherry-pick ${one}..${three}`);
    expect(r.lines.filter((l) => l.type === 'success').map((l) => l.text.replace(/^\[main [0-9a-f]{7}\] /, ''))).toEqual(['two', 'three']);
  });

  // Values from GNU bash 5 and PowerShell 7: variables expand in every command, never inside single quotes.
  it('expands variables in the arguments of any command, not only echo', () => {
    expect(text(run(["echo '$HOME'"]))).toBe('$HOME');
    expect(text(run(['echo "$HOME et ${USER}"']))).toBe('/home/user et user');
    expect(text(run(['echo $NOPE fin']))).toBe('fin');
    expect(run(['cd /tmp', 'cd $HOME']).newState.cwd).toEqual(['home', 'user']);
    expect(text(run(["export X='$HOME'", 'echo $X']))).toBe('$HOME');
    expect(text(run(['export PATH=$PATH:/opt/bin', 'echo $PATH']))).toBe('/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/bin');
    expect(text(run(['echo $HOME | grep $USER']))).toBe('/home/user');
    expect(text(run(["echo '$env:USERNAME'"], 'windows'))).toBe('$env:USERNAME');
    expect(run(['cd documents', 'cd $env:USERPROFILE'], 'windows').newState.cwd).toEqual(['home', 'user']);
    expect(text(run(['Get-Content $env:USERPROFILE\\documents\\notes.txt'], 'windows'))).toBe(text(run(['cat documents/notes.txt'])));
  });

  // Values from OpenSSH 10.5, PowerShell 7 and GNU bash (29 September 2026).
  it('ssh-keygen refuses odd options the way OpenSSH does, without crashing', () => {
    const lines = (cmd: string) => run([cmd]).lines.map((l) => l.text);
    expect(lines('ssh-keygen -t constructor')).toEqual(['unknown key type constructor']);
    expect(run(['ssh-keygen -t constructor']).status).toBe(255);
    expect(lines('ssh-keygen -t rsa -b 20000')).toEqual(['Invalid RSA key length: maximum is 16384 bits']);
    expect(lines('ssh-keygen -t rsa -b 1000')).toEqual(['Invalid RSA key length: minimum is 1024 bits']);
    expect(lines('ssh-keygen -t')).toEqual(['ssh-keygen: option requires an argument -- t']);
    // -N "" is an empty passphrase, not a missing one: the passphrase prompts are skipped.
    expect(lines('ssh-keygen -N ""').join('\n')).not.toContain('Enter passphrase');
  });

  it('ssh-keygen -f on a folder asks to overwrite and leaves the folder alone', () => {
    const r = run(['ssh-keygen -f documents -N ""']);
    // "documents already exists." + "Overwrite (y/n)?" are OpenSSH's; the failure follows its `Saving key "%s" failed: %s`.
    expect(r.lines.map((l) => l.text)).toEqual([
      'Generating public/private ed25519 key pair.',
      'documents already exists.',
      'Overwrite (y/n)? y',
      'Saving key "documents" failed: Is a directory',
    ]);
    expect(r.status).toBe(1);
    expect(text(processCommand(r.newState, 'ls documents'))).toContain('notes.txt');
  });

  it('$env:Path = "$env:Path;..." keeps the old PATH, whatever the case of the name', () => {
    expect(text(run(['$env:Path = "$env:Path;C:\\outils"', '$env:PATH'], 'windows')))
      .toBe('C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Git\\bin;C:\\outils');
  });

  it('a variable cannot grow without bound [H3]', () => {
    const cmds = [`export A=${'x'.repeat(600)}`, 'export A=$A$A', 'export A=$A$A', 'export A=$A$A'];
    const s = run(cmds).newState;
    expect(s.envVars.A.length).toBeLessThanOrEqual(1024);
    expect(text(processCommand(s, 'echo $A')).length).toBeLessThanOrEqual(1025);
  });

  it('keeps an empty quoted word, like bash ("" is an argument)', () => {
    expect(text(run(['echo "" fin']))).toBe(' fin');
  });

  it('Select-String -Path file pattern, and Set-Content -Force file text', () => {
    const r = run(['Set-Content -Force liste.txt bonjour', 'Get-Content liste.txt'], 'windows');
    expect(text(r)).toBe('bonjour');
    expect(text(run(['Select-String -Path documents\\notes.txt apprendre'], 'windows'))).toBe('documents\\notes.txt:3:1. Apprendre les commandes bash');
  });

  it('Set-Content into a missing folder names the cmdlet and the full path', () => {
    expect(text(run(['Set-Content nulle\\x.txt a'], 'windows'))).toBe("Set-Content: Could not find a part of the path 'C:\\Users\\user\\nulle\\x.txt'.");
  });

  // Values from GNU bash 5.3 and PowerShell 7.6 (terminal-fidelity-auditor, 29 September 2026).
  it('bash: \$ is a literal dollar, ~ starts a home path, $1 is empty, $PWD is the folder', () => {
    expect(text(run(['echo \\$HOME "\\$HOME"']))).toBe('$HOME $HOME');
    expect(text(run(['echo ~ ~/documents "~" a~']))).toBe('/home/user /home/user/documents ~ a~');
    expect(text(run(['echo $1 fin']))).toBe('fin');
    expect(text(run(['cd documents', 'echo $PWD']))).toBe('/home/user/documents');
  });

  it('PowerShell: $HOME and $PWD are automatic variables', () => {
    expect(text(run(['echo $HOME'], 'windows'))).toBe('C:\\Users\\user');
    expect(text(run(['cd documents', 'echo $PWD'], 'windows'))).toBe('C:\\Users\\user\\documents');
    expect(run(['cd documents', 'cd $HOME'], 'windows').newState.cwd).toEqual(['home', 'user']);
  });

  it('ssh-keygen -l prints the fingerprint the key was generated with', () => {
    const made = run(['ssh-keygen -N ""']);
    const shown = made.lines.map((l) => l.text).find((t) => t.startsWith('SHA256:'));
    expect(shown).toBeDefined();
    const [fp, comment] = (shown ?? '').split(' ');
    expect(text(processCommand(made.newState, 'ssh-keygen -lf ~/.ssh/id_ed25519.pub'))).toBe(`256 ${fp} ${comment} (ED25519)`);
    // A private key is read through its .pub, as OpenSSH does.
    expect(text(processCommand(made.newState, 'ssh-keygen -l -f ~/.ssh/id_ed25519'))).toBe(`256 ${fp} ${comment} (ED25519)`);
    const missing = run(['ssh-keygen -lf nope.pub']);
    expect(text(missing)).toBe('ssh-keygen: nope.pub: No such file or directory');
    expect(missing.status).toBe(255);
    expect(text(run(['ssh-keygen -lf documents/notes.txt']))).toBe('documents/notes.txt is not a public key file.');
  });

  it('ssh-keygen modes that are not simulated say so instead of making a key', () => {
    const r = run(['ssh-keygen -y -f x']);
    expect(r.lines.map((l) => l.type)).toEqual(['info']);
    expect(r.newState.root).toEqual(createInitialState().root);
  });

  it('ssh-copy-id reports the key it added on Linux, and does not exist on Windows', () => {
    const unix = run(['ssh-copy-id user@serveur.example.com']);
    expect(errors(unix)).toEqual([]);
    expect(text(unix)).toContain('Number of key(s) added: 1');
    expect(text(unix)).toContain('/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys');
    expect(errors(run(['ssh-copy-id user@serveur.example.com'], 'windows'))).toHaveLength(1);
  });

  it('date +FORMAT applies the format', () => {
    expect(text(run(['date +"%Y-%m-%d"']))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('Get-Content -TotalCount / -Head and -Tail keep the first or last lines', () => {
    expect(text(run(['Get-Content documents\\notes.txt -TotalCount 3'], 'windows'))).toBe('Mes notes importantes\nTâches du jour:\n1. Apprendre les commandes bash');
    expect(text(run(['Get-Content documents\\notes.txt -Head 2'], 'windows'))).toBe('Mes notes importantes\nTâches du jour:');
    expect(text(run(['Get-Content documents\\notes.txt -Tail 2'], 'windows'))).toBe('3. Maîtriser les permissions\nFin du fichier');
  });

  it('Get-Content (and cat under PowerShell) report a missing file like PowerShell', () => {
    const expected = "Get-Content: Cannot find path 'C:\\Users\\user\\documents\\absent.txt' because it does not exist.";
    expect(text(run(['Get-Content documents\\absent.txt'], 'windows'))).toBe(expected);
    expect(text(run(['cat documents\\absent.txt'], 'windows'))).toBe(expected);
  });

  it('Get-Content rejects an unknown parameter like PowerShell', () => {
    expect(text(run(['Get-Content documents\\notes.txt -n'], 'windows'))).toBe("Get-Content: A parameter cannot be found that matches parameter name 'n'.");
  });

  it('Set-Content writes a script that .\\script.ps1 then runs', () => {
    const r = run(['Set-Content bonjour.ps1 \'Write-Output "Bonjour"\'', '.\\bonjour.ps1'], 'windows');
    expect(text(r)).toBe('Bonjour');
    expect(text(run(['Set-Content bonjour.ps1 \'Write-Output "Bonjour"\'', 'Get-Content bonjour.ps1'], 'windows'))).toBe('Write-Output "Bonjour"');
  });

  it('Add-Content appends a line', () => {
    const r = run(['Set-Content liste.txt un', 'Add-Content liste.txt deux', 'Get-Content liste.txt'], 'windows');
    expect(text(r)).toBe('un\ndeux');
  });

  it('Select-String ignores case and prefixes <file>:<line>:, like PowerShell', () => {
    expect(text(run(['Select-String -Pattern apprendre -Path documents\\notes.txt'], 'windows'))).toBe('documents\\notes.txt:3:1. Apprendre les commandes bash');
    expect(text(run(['Select-String -Pattern apprendre -Path documents\\notes.txt -CaseSensitive'], 'windows'))).toBe('');
  });

  it('Select-String without a match succeeds ($? stays True in PowerShell 7), unlike grep', () => {
    expect(run(['Select-String -Pattern zzz -Path documents\\notes.txt'], 'windows').status ?? 0).toBe(0);
    expect(run(['grep zzz documents/notes.txt']).status).toBe(1);
  });

  it('$env:X += appends, names ignore case, and Windows session variables exist', () => {
    const r = run(['$env:Path += ";C:\\outils"', '$env:PATH'], 'windows');
    expect(text(r)).toBe('C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Git\\bin;C:\\outils');
    expect(text(run(['$env:USERNAME'], 'windows'))).toBe('user');
    expect(text(run(['echo $env:userprofile'], 'windows'))).toBe('C:\\Users\\user');
  });

  it('Get-History lists earlier commands in the PowerShell 7 table, without itself', () => {
    const r = run(['ls', 'cd documents', 'Get-History'], 'windows');
    expect(r.lines.map((l) => l.text)).toEqual([
      '',
      '  Id     Duration CommandLine',
      '  --     -------- -----------',
      '   1        0.010 ls',
      '   2        0.010 cd documents',
      '',
    ]);
  });

  it('Get-Date formats with -Format (.NET) and -UFormat (strftime)', () => {
    expect(text(run(['Get-Date -Format "yyyy-MM-dd HH:mm"'], 'windows'))).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(text(run(['Get-Date -UFormat "%Y"'], 'windows'))).toMatch(/^\d{4}$/);
    expect(text(run(['Get-Date'], 'windows'))).toMatch(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} [AP]M$/);
  });

  it('Get-Help shows NAME and SYNOPSIS, and EXAMPLES with -Examples', () => {
    const r = run(['Get-Help Get-ChildItem'], 'windows');
    expect(r.lines.slice(0, 4).map((l) => l.text)).toEqual(['NAME', '    Get-ChildItem', '', 'SYNOPSIS']);
    // The synopsis is a sentence, never the bash syntax line of the help entry.
    expect(text(r)).not.toContain('ls [-la]');
    expect(text(run(['Get-Help Get-ChildItem -Examples'], 'windows'))).toContain('EXAMPLES');
    expect(errors(run(['Get-Help Nimporte'], 'windows'))).toHaveLength(1);
    expect(errors(run(['Get-Help ls']))).toHaveLength(1); // not a bash command
  });

  it('tasklist and Get-ScheduledTask print their Windows tables', () => {
    expect(run(['tasklist'], 'windows').lines[1].text).toMatch(/^Image Name\s+PID Session Name\s+Session#\s+Mem Usage$/);
    expect(run(['Get-ScheduledTask'], 'windows').lines[1].text).toMatch(/^TaskPath\s+TaskName\s+State$/);
  });
});
