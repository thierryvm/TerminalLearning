import { describe, it, expect } from 'vitest';
import { processCommand, getTabCompletions, createInitialState, displayPathForEnv } from '../app/data/terminalEngine';
import type { TerminalState } from '../app/data/terminalEngine';

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

// ─── donate / support ─────────────────────────────────────────────────────────

describe('donate', () => {
  it('displays support block', () => {
    const result = processCommand(makeState(), 'donate');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('Soutenir');
    expect(text).toContain('GitHub');
  });
});

describe('support', () => {
  it('is an alias of donate', () => {
    const donate = processCommand(makeState(), 'donate');
    const support = processCommand(makeState(), 'support');
    expect(support.lines.map((l) => l.text)).toEqual(donate.lines.map((l) => l.text));
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
    expect(text).toContain('donate');
    expect(text).toContain('support');
    expect(text).toContain('hall-of-fame');
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
    expect(getTabCompletions('don', state)).toContain('donate');
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
    expect(text).toContain('donate');
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
  it('linux → ~ for home directory', () => {
    const state = createInitialState();
    const result = processCommand(state, 'pwd', 'linux');
    expect(result.lines[0].text).toBe('~');
  });

  it('macos → ~ for home directory', () => {
    const state = createInitialState();
    const result = processCommand(state, 'pwd', 'macos');
    expect(result.lines[0].text).toBe('~');
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
    expect(result.lines[0].type).toBe('success');
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
    expect(result.lines[0].text).toContain('root');
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

describe('ssh-keygen', () => {
  it('generates ed25519 key pair', () => {
    const result = processCommand(makeState(), 'ssh-keygen -t ed25519', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('ed25519');
    expect(text).toContain('.pub');
  });

  it('reports both private and public key paths', () => {
    const result = processCommand(makeState(), 'ssh-keygen -t ed25519', 'linux');
    const successes = result.lines.filter((l) => l.type === 'success');
    expect(successes.length).toBeGreaterThanOrEqual(2);
  });

  it('uses rsa as default key type when -t is omitted', () => {
    const result = processCommand(makeState(), 'ssh-keygen', 'linux');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('rsa');
  });

  it('works on windows env', () => {
    const result = processCommand(makeState(), 'ssh-keygen -t ed25519', 'windows');
    const text = result.lines.map((l) => l.text).join('\n');
    expect(text).toContain('ed25519');
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
    expect(text).toContain('docs/');
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
