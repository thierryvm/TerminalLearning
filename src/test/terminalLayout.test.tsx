import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalColumns } from '../app/components/TerminalColumns';
import { isColumnar, segmentOutput, tableLabel } from '../app/components/terminalLayout';
import { TerminalKeyBar } from '../app/components/TerminalKeyBar';
import { processCommand, createInitialState } from '../app/data/terminalEngine';

let id = 0;
const line = (text: string, type = 'output') => ({ id: ++id, type, text });

describe('terminal output layout', () => {
  it('recognises lines laid out in columns, not prose', () => {
    expect(isColumnar('Handles  NPM(K)    PM(K)')).toBe(true);
    expect(isColumnar('-------  ------    -----')).toBe(true);
    expect(isColumnar('    256      14   4560')).toBe(true);
    expect(isColumnar('Liste le contenu d\'un répertoire.')).toBe(false);
    expect(isColumnar('    Get-ChildItem')).toBe(false); // an indent alone is not a column
    expect(isColumnar('')).toBe(false);
    // git status entries start with a tab; they are not tables.
    expect(isColumnar('\tmodified:   style.css')).toBe(false);
  });

  it('leaves a single line of names (ls, Tab completion) as prose that wraps', () => {
    const ls = processCommand(createInitialState(), 'ls').lines.map((l) => line(l.text, l.type));
    expect(ls).toHaveLength(1);
    expect(segmentOutput(ls).map((s) => s.kind)).toEqual(['line']);
    expect(segmentOutput([line('documents/  projets/  notes.txt')]).map((s) => s.kind)).toEqual(['line']);
  });

  it('names a table after its header row', () => {
    expect(tableLabel('Handles  NPM(K)    PM(K)')).toBe('Handles NPM(K) PM(K)');
  });

  it('groups a table into one block and keeps prompts and prose as lines', () => {
    const lines = [
      line('Get-Process', 'prompt'),
      line('Handles  NPM(K)'),
      line('-------  ------'),
      line('    256      14'),
      line('fin du tableau'),
    ];
    const segments = segmentOutput(lines);
    expect(segments.map((s) => s.kind)).toEqual(['line', 'columns', 'line']);
    const table = segments[1];
    expect(table.kind === 'columns' && table.lines.map((l) => l.text)).toEqual(['Handles  NPM(K)', '-------  ------', '    256      14']);
  });

  it('keeps a blank line inside a table, and a trailing one after it', () => {
    const lines = [line('a  b'), line(''), line('c  d'), line('')];
    const segments = segmentOutput(lines);
    expect(segments.map((s) => s.kind)).toEqual(['columns', 'line']);
    // The id is the last row's: stable when the scrollback cap drops the first.
    expect(segments[0].kind === 'columns' && segments[0].id).toBe(lines[2].id);
    expect(segments[0].kind === 'columns' && segments[0].lines).toHaveLength(3);
  });

  it('puts every row of the real Get-History table in one block', () => {
    let s = createInitialState();
    s = processCommand(s, 'ls', 'windows').newState;
    const out = processCommand(s, 'Get-History', 'windows').lines.map((l) => line(l.text, l.type));
    const segments = segmentOutput(out);
    // Blank, table (header, rule, row), blank — PowerShell 7's layout.
    expect(segments.map((x) => x.kind)).toEqual(['line', 'columns', 'line']);
  });
});

describe('TerminalKeyBar reserveEnd', () => {
  const handlers = { onInsert: vi.fn(), onTab: vi.fn(), onHistoryPrev: vi.fn(), onHistoryNext: vi.fn() };

  it('keeps the right end free for the AI tutor button when asked', () => {
    const { container } = render(<TerminalKeyBar {...handlers} reserveEnd />);
    expect(container.firstElementChild).toHaveClass('pe-16');
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('uses the full width otherwise', () => {
    const { container } = render(<TerminalKeyBar {...handlers} />);
    expect(container.firstElementChild).not.toHaveClass('pe-16');
  });
});

describe('TerminalColumns', () => {
  const sizes = (scrollWidth: number, clientWidth: number) => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
  };
  afterEach(() => vi.restoreAllMocks());

  it('adds no tab stop when the table fits', () => {
    sizes(300, 300);
    render(<TerminalColumns label="a b"><div>a  b</div></TerminalColumns>);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('becomes a focusable, labelled region with a fade when the table is wider', () => {
    sizes(600, 300);
    const { container } = render(<TerminalColumns label="Handles NPM(K)"><div>a  b</div></TerminalColumns>);
    const region = screen.getByRole('region', { name: 'Tableau : Handles NPM(K)' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
