import { describe, it, expect } from 'vitest';
import { spliceAtSelection } from '../app/components/terminalKeyInsert';

describe('spliceAtSelection (THI-307 cursor insertion)', () => {
  it('inserts at the caret when there is no selection', () => {
    // "ls -l" with caret after "ls " (index 3) → insert "|"
    expect(spliceAtSelection('ls -l', 3, 3, '|')).toBe('ls |-l');
  });

  it('appends at the end', () => {
    expect(spliceAtSelection('cat file', 8, 8, ' | grep x')).toBe('cat file | grep x');
  });

  it('inserts into an empty string', () => {
    expect(spliceAtSelection('', 0, 0, '~')).toBe('~');
  });

  it('replaces a selected range', () => {
    // select "abc" in "abc-l" → replace with ">>"
    expect(spliceAtSelection('abc-l', 0, 3, '>>')).toBe('>>-l');
  });

  it('clamps out-of-range indices instead of throwing', () => {
    expect(spliceAtSelection('ab', 99, 99, '*')).toBe('ab*');
  });

  it('enforces start <= end (swapped/invalid selection is treated as a caret)', () => {
    // end is clamped up to start (4) → caret insert at 4
    expect(spliceAtSelection('hello', 4, 1, '$')).toBe('hell$o');
  });

  it('handles multi-character tokens', () => {
    expect(spliceAtSelection('ab', 1, 1, '&&')).toBe('a&&b');
  });
});
