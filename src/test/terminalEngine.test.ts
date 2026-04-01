import { describe, it, expect } from 'vitest';
import { processCommand } from '../app/data/terminalEngine';
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
