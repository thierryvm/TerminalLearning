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
    ...overrides,
  };
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
