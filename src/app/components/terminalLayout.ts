/**
 * Layout of the terminal output. A real terminal never reflows a table: `ps`,
 * `Get-Process` or `ls -l` rows keep their columns, and a narrow window
 * scrolls instead. Lines laid out in columns are therefore grouped so the
 * view can show them unwrapped in one horizontally scrollable block, while
 * prose keeps wrapping.
 */

/** Two spaces or more between words (`Handles  NPM(K)`). */
const SPACED = /\S {2,}\S/;
/** A rule under a header: dashes, possibly in several runs (`-------  ------`). */
const RULE = /^-{2,}(?: +-{2,})*$/;

/**
 * A line laid out in columns. Lines that start with a tab are not tables but
 * `git status` entries (`\tmodified:   style.css`), which may wrap like prose.
 */
export function isColumnar(text: string): boolean {
  if (text.startsWith('\t')) return false;
  return SPACED.test(text) || RULE.test(text.trim());
}

interface LineLike {
  id: number;
  type: string;
  text: string;
}

export type OutputSegment<L extends LineLike> =
  | { kind: 'line'; line: L }
  | { kind: 'columns'; id: number; lines: L[] };

/**
 * Consecutive output lines in columns become one `columns` segment; prompts
 * and prose stay single lines. A table has at least two such lines: a lone
 * `ls` line (`documents  projets  notes.txt`) or a Tab-completion list is a
 * list of names that may wrap, as a real terminal reflows them. A blank line
 * inside a table (between two columnar lines) stays in it, as `Get-History`
 * prints one. The segment id is its last line's, which stays stable when the
 * scrollback cap drops lines from the top.
 */
export function segmentOutput<L extends LineLike>(lines: L[]): OutputSegment<L>[] {
  const segments: OutputSegment<L>[] = [];
  let group: L[] = [];
  const flush = () => {
    // A trailing blank line belongs after the table, not inside it.
    const trailing: L[] = [];
    while (group.length && group[group.length - 1].text === '') trailing.unshift(group.pop() as L);
    const rows = group.filter((l) => l.text !== '').length;
    if (rows >= 2) segments.push({ kind: 'columns', id: group[group.length - 1].id, lines: group });
    else group.forEach((line) => segments.push({ kind: 'line', line }));
    trailing.forEach((line) => segments.push({ kind: 'line', line }));
    group = [];
  };
  for (const line of lines) {
    const inTable = line.type !== 'prompt' && (isColumnar(line.text) || (group.length > 0 && line.text === ''));
    if (inTable) group.push(line);
    else {
      flush();
      segments.push({ kind: 'line', line });
    }
  }
  flush();
  return segments;
}

/** A short name for a table, from its first row (`Handles NPM(K) PM(K)…`). */
export function tableLabel(firstRow: string): string {
  const words = firstRow.trim().replace(/\s+/g, ' ');
  return words.length > 60 ? `${words.slice(0, 60)}…` : words;
}
