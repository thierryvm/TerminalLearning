/**
 * P1 (23 September 2026) — the terminal starts from the lesson's setup state.
 * Before, every lesson started from createInitialState(), so `git status` in a
 * Git lesson printed "fatal: not a git repository" and still validated.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TerminalEmulator } from '../app/components/TerminalEmulator';
import { createInitialState } from '../app/data/terminalEngine';
import { gitRepoWithBranch, gitRepoWithCommit } from '../app/data/lessonSetup';

function type(command: string) {
  const input = screen.getByLabelText('Commande terminal');
  fireEvent.change(input, { target: { value: command } });
  fireEvent.submit(input.closest('form')!);
}

describe('TerminalEmulator initialState', () => {
  it('starts from the setup state when one is given', () => {
    const onCommand = vi.fn();
    render(<TerminalEmulator onCommand={onCommand} initialState={() => gitRepoWithCommit.apply(createInitialState())} />);
    type('git status');
    expect(screen.getByText('On branch main')).toBeInTheDocument();
    expect(screen.queryByText(/not a git repository/)).toBeNull();
    // The prompt reflects the prepared working directory.
    expect(screen.getAllByText('user@terminal-lab:~/projets$').length).toBeGreaterThan(0);
    expect(onCommand).toHaveBeenCalledWith('git status', expect.objectContaining({ git: expect.objectContaining({ initialized: true }) }));
  });

  it('keeps the default state when no setup is given', () => {
    render(<TerminalEmulator />);
    type('git status');
    expect(screen.getByText(/not a git repository/)).toBeInTheDocument();
  });

  it('builds the state once, not on every render', () => {
    const build = vi.fn(() => createInitialState());
    render(<TerminalEmulator initialState={build} />);
    type('ls');
    type('pwd');
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('keeps the spacing of command output (git branch indents non-current branches)', () => {
    render(<TerminalEmulator initialState={() => gitRepoWithBranch('feature/x').apply(createInitialState())} />);
    type('git branch');
    const line = screen.getByText((_, el) => el?.textContent === '  feature/x' && el.children.length === 0);
    expect(line.className).toContain('whitespace-pre-wrap');
  });
});
