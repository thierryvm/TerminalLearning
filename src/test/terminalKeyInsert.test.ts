import { describe, it, expect } from 'vitest';
import { spliceAtSelection } from '../app/components/terminalKeyInsert';

describe('spliceAtSelection (THI-307 cursor insertion)', () => {
  it('inserts at the caret when there is no selection', () => {
    // "ls -l" with caret after "ls " (index 3) → insert "|"
    const r = spliceAtSelection('ls -l', 3, 3, '|');
    expect(r.value).toBe('ls |-l');
    expect(r.cursor).toBe(4);
  });

  it('appends at the end', () => {
    const r = spliceAtSelection('cat file', 8, 8, ' | grep x');
    expect(r.value).toBe('cat file | grep x');
    expect(r.cursor).toBe('cat file | grep x'.length);
  });

  it('inserts into an empty string', () => {
    const r = spliceAtSelection('', 0, 0, '~');
    expect(r.value).toBe('~');
    expect(r.cursor).toBe(1);
  });

  it('replaces a selected range', () => {
    // select "abc" in "abc-l" → replace with ">>"
    const r = spliceAtSelection('abc-l', 0, 3, '>>');
    expect(r.value).toBe('>>-l');
    expect(r.cursor).toBe(2);
  });

  it('clamps out-of-range indices instead of throwing', () => {
    const r = spliceAtSelection('ab', 99, 99, '*');
    expect(r.value).toBe('ab*');
    expect(r.cursor).toBe(3);
  });

  it('enforces start <= end (swapped/invalid selection is treated as a caret)', () => {
    const r = spliceAtSelection('hello', 4, 1, '$');
    // end is clamped up to start (4) → caret insert at 4
    expect(r.value).toBe('hell$o');
    expect(r.cursor).toBe(5);
  });

  it('handles multi-character tokens', () => {
    const r = spliceAtSelection('ab', 1, 1, '&&');
    expect(r.value).toBe('a&&b');
    expect(r.cursor).toBe(3);
  });
});
