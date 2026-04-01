import { describe, it, expect } from 'vitest';
import { processCommand, getTabCompletions, createInitialState } from '../app/data/terminalEngine';
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
