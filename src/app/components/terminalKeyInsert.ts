/**
 * Pure cursor-insertion helper for the terminal input (THI-307).
 *
 * Extracted from the component so the splice logic is unit-testable without a
 * DOM. The mobile key bar inserts shell characters (`|`, `>`, `~`, …) at the
 * caret rather than always appending — a learner editing the middle of a
 * command must keep typing where they were.
 */

export interface SpliceResult {
  /** The new input value after the insertion. */
  value: string;
  /** Where to place the caret — immediately after the inserted text. */
  cursor: number;
}

/**
 * Insert `insert` into `value`, replacing the `[start, end)` selection.
 *
 * Indices are clamped to `[0, value.length]` and `start <= end` is enforced so
 * a stale or out-of-range selection can never throw or corrupt the string.
 * When there is no selection (`start === end`) the text is inserted at the
 * caret; when there is one, the selected range is replaced.
 */
export function spliceAtSelection(
  value: string,
  start: number,
  end: number,
  insert: string,
): SpliceResult {
  const len = value.length;
  const s = Math.max(0, Math.min(start, len));
  const e = Math.max(s, Math.min(end, len));
  return {
    value: value.slice(0, s) + insert + value.slice(e),
    cursor: s + insert.length,
  };
}
