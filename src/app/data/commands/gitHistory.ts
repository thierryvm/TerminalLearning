/**
 * The history side of the simulated git: commits as a graph (parents, refs),
 * git's date format, ancestry, three-way merges with conflict markers, and
 * the `--stat` graph. Like gitTree.ts, everything here reproduces what git
 * itself computes, so merges and logs read like a real repository's.
 */
import type { GitCommit } from './types';
import { diffLines, sha1, splitLines, type Tree } from './gitTree';

/** A random id of 40 hex digits (a dropped stash names one). */
export function newHash(): string {
  return Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
}

export const short = (hash: string) => hash.slice(0, 7);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `+0200`: a UTC offset in minutes, as git writes it. */
export function tzOffset(tz: number): string {
  return `${tz < 0 ? '-' : '+'}${pad2(Math.floor(Math.abs(tz) / 60))}${pad2(Math.abs(tz) % 60)}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `Tue Sep 29 19:55:41 2026 +0200`: git's default date, in the author's time zone. */
export function formatGitDate(time: number, tz: number): string {
  const d = new Date((time + tz * 60) * 1000);
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} `
    + `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} ${d.getUTCFullYear()} ${tzOffset(tz)}`;
}

/** The date that orders commits: the committer's. */
const when = (c: GitCommit | undefined) => c?.committed ?? c?.time ?? 0;

/** The time of a new commit: now, and never before the latest commit (a log keeps its order). */
export function commitTime(objects: Record<string, GitCommit>): { time: number; tz: number } {
  const latest = Math.max(0, ...Object.values(objects).map(when));
  return { time: Math.max(Math.floor(Date.now() / 1000), latest + 1), tz: -new Date().getTimezoneOffset() };
}

// ─── Object ids ──────────────────────────────────────────────────────────────

const utf8 = (s: string) => new TextEncoder().encode(s);

function objectId(type: string, body: Uint8Array): string {
  const header = utf8(`${type} ${body.length}\0`);
  const all = new Uint8Array(header.length + body.length);
  all.set(header);
  all.set(body, header.length);
  return sha1(all);
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

/** The id git gives the file content `content`. */
const blob = (content: string) => objectId('blob', utf8(content));

/**
 * The id of the tree object git writes for these files: one tree per
 * directory, entries sorted by name (a directory as if its name ended in `/`),
 * each `<mode> <name>\0` followed by the 20 bytes of the entry's id.
 */
export function treeId(tree: Tree, modes: Record<string, string> = {}): string {
  const write = (prefix: string): string => {
    const names = new Map<string, 'file' | 'dir'>();
    for (const path of Object.keys(tree)) {
      if (prefix && !path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      const slash = rest.indexOf('/');
      names.set(slash < 0 ? rest : rest.slice(0, slash), slash < 0 ? 'file' : 'dir');
    }
    const key = (name: string) => (names.get(name) === 'dir' ? `${name}/` : name);
    const sorted = [...names.keys()].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
    const entries = sorted.map((name) => {
      const isDir = names.get(name) === 'dir';
      const id = isDir ? write(`${prefix}${name}/`) : blob(tree[prefix + name]);
      const mode = isDir ? '40000' : modes[prefix + name] ?? '100644';
      const raw = new Uint8Array(20);
      for (let i = 0; i < 20; i++) raw[i] = parseInt(id.slice(i * 2, i * 2 + 2), 16);
      return concat([utf8(`${mode} ${name}\0`), raw]);
    });
    return objectId('tree', concat(entries));
  };
  return write('');
}

/** `user <user@terminal-lab.local>`: who the simulated git says wrote a commit. */
export const ident = (user: string) => `${user} <${user}@terminal-lab.local>`;

/**
 * The id of a commit object, computed as git computes it: the same files,
 * parents, author, dates and message give the same id as in a real repository.
 */
export function commitId(c: { tree: string; parents: string[]; author: string; time: number; tz: number; committed?: number; message: string }): string {
  const lines = [
    `tree ${c.tree}`,
    ...c.parents.map((p) => `parent ${p}`),
    `author ${ident(c.author)} ${c.time} ${tzOffset(c.tz)}`,
    `committer ${ident(c.author)} ${c.committed ?? c.time} ${tzOffset(c.tz)}`,
    '',
    `${c.message}\n`,
  ];
  return objectId('commit', utf8(lines.join('\n')));
}

/** The id of an annotated tag object (`git tag -a`). */
export function tagId(t: { object: string; name: string; author: string; time: number; tz: number; message: string }): string {
  return objectId('tag', utf8(`object ${t.object}\ntype commit\ntag ${t.name}\ntagger ${ident(t.author)} ${t.time} ${tzOffset(t.tz)}\n\n${t.message}\n`));
}

/** Every commit reachable from `start`, `start` included. */
export function ancestors(objects: Record<string, GitCommit>, start: string | undefined): Set<string> {
  const seen = new Set<string>();
  const todo = start ? [start] : [];
  while (todo.length) {
    const h = todo.pop()!;
    if (seen.has(h) || !objects[h]) continue;
    seen.add(h);
    todo.push(...(objects[h].parents ?? []));
  }
  return seen;
}

/** Whether `a` is `b` or one of its ancestors. */
export function isAncestor(objects: Record<string, GitCommit>, a: string, b: string): boolean {
  return ancestors(objects, b).has(a);
}

/** The best common ancestor of two commits: the most recent one reachable from both. */
export function mergeBase(objects: Record<string, GitCommit>, a: string, b: string): string | null {
  const fromA = ancestors(objects, a);
  const common = [...ancestors(objects, b)].filter((h) => fromA.has(h));
  // Drop the common commits that are ancestors of another common commit.
  const best = common.filter((h) => !common.some((o) => o !== h && isAncestor(objects, h, o)));
  best.sort((x, y) => when(objects[y]) - when(objects[x]));
  return best[0] ?? null;
}

/**
 * Commits reachable from `starts` in git log's default order: newest commit
 * date first, a commit never before one of its children.
 */
export function logOrder(objects: Record<string, GitCommit>, starts: string[]): GitCommit[] {
  const reachable = new Set<string>();
  for (const s of starts) ancestors(objects, s).forEach((h) => reachable.add(h));
  const children = new Map<string, number>();
  for (const h of reachable) for (const p of objects[h].parents ?? []) if (reachable.has(p)) children.set(p, (children.get(p) ?? 0) + 1);
  const ready = [...reachable].filter((h) => !children.get(h));
  const out: GitCommit[] = [];
  while (ready.length) {
    ready.sort((x, y) => when(objects[y]) - when(objects[x]));
    const h = ready.shift()!;
    out.push(objects[h]);
    for (const p of objects[h].parents ?? []) {
      if (!reachable.has(p)) continue;
      const left = (children.get(p) ?? 1) - 1;
      children.set(p, left);
      if (left === 0) ready.push(p);
    }
  }
  return out;
}

// ─── Three-way merge ─────────────────────────────────────────────────────────

interface Hunk {
  /** Lines `start` to `end` (exclusive) of the base are replaced by `lines`. */
  start: number;
  end: number;
  lines: string[];
}

/** The changes from `base` to `other`, as base ranges and their replacement lines. */
function hunks(base: string[], other: string[]): Hunk[] {
  const out: Hunk[] = [];
  let baseAt = 0;
  let current: Hunk | null = null;
  for (const op of diffLines(base, other)) {
    if (op.kind === ' ') {
      if (current) { out.push(current); current = null; }
      baseAt = op.index + 1;
      continue;
    }
    if (!current) current = { start: baseAt, end: baseAt, lines: [] };
    if (op.kind === '-') { current.end = op.index + 1; baseAt = op.index + 1; } else current.lines.push(op.line);
  }
  if (current) out.push(current);
  return out;
}

/** `base[start, end)` with the hunks that fall inside that range applied. */
function applyWithin(base: string[], start: number, end: number, list: Hunk[]): string[] {
  const out: string[] = [];
  let at = start;
  for (const h of list) {
    out.push(...base.slice(at, h.start), ...h.lines);
    at = h.end;
  }
  out.push(...base.slice(at, end));
  return out;
}

export interface MergedFile {
  content: string;
  conflict: boolean;
}

/**
 * Merges two versions of a file changed from a common base, the way git's
 * default strategy does: changes that do not touch each other both apply;
 * changes that overlap or touch conflict, unless they are identical, and the
 * conflict is written between `<<<<<<< ours` / `=======` / `>>>>>>> theirs`
 * markers, with the lines both sides share moved out of it.
 */
export function mergeText(base: string, ours: string, theirs: string, oursLabel: string, theirsLabel: string): MergedFile {
  const b = splitLines(base);
  const tagged = [
    ...hunks(b, splitLines(ours)).map((h) => ({ ...h, side: 'ours' as const })),
    ...hunks(b, splitLines(theirs)).map((h) => ({ ...h, side: 'theirs' as const })),
  ].sort((x, y) => x.start - y.start || x.end - y.end);

  const out: string[] = [];
  let at = 0;
  let conflict = false;
  for (let i = 0; i < tagged.length;) {
    // A group: hunks whose base ranges overlap or touch.
    const group = [tagged[i]];
    let end = tagged[i].end;
    i++;
    while (i < tagged.length && tagged[i].start <= end) {
      end = Math.max(end, tagged[i].end);
      group.push(tagged[i]);
      i++;
    }
    const start = group[0].start;
    out.push(...b.slice(at, start));
    at = end;
    const mine = applyWithin(b, start, end, group.filter((h) => h.side === 'ours'));
    const yours = applyWithin(b, start, end, group.filter((h) => h.side === 'theirs'));
    const sides = new Set(group.map((h) => h.side));
    if (sides.size === 1) { out.push(...(sides.has('ours') ? mine : yours)); continue; }
    if (mine.join('') === yours.join('')) { out.push(...mine); continue; }
    // Lines both sides agree on at the edges stay outside the markers.
    let head = 0;
    while (head < mine.length && head < yours.length && mine[head] === yours[head]) head++;
    let tail = 0;
    while (tail < mine.length - head && tail < yours.length - head
      && mine[mine.length - 1 - tail] === yours[yours.length - 1 - tail]) tail++;
    const eol = (lines: string[]) => lines.map((l) => (l.endsWith('\n') ? l : `${l}\n`));
    out.push(
      ...mine.slice(0, head),
      `<<<<<<< ${oursLabel}\n`,
      ...eol(mine.slice(head, mine.length - tail)),
      '=======\n',
      ...eol(yours.slice(head, yours.length - tail)),
      `>>>>>>> ${theirsLabel}\n`,
      ...mine.slice(mine.length - tail),
    );
    conflict = true;
  }
  out.push(...b.slice(at));
  return { content: out.join(''), conflict };
}

// ─── --stat ──────────────────────────────────────────────────────────────────

export interface FileStat {
  path: string;
  insertions: number;
  deletions: number;
}

/**
 * The per-file lines of `--stat` (` big.txt | 120 ++++…`), laid out as git
 * lays them out for an 80-column output: long names are shortened with
 * `...`, and the +/- graph is scaled down when it does not fit.
 */
export function statGraph(files: FileStat[], width = 80): string[] {
  if (!files.length) return [];
  const changes = files.map((f) => f.insertions + f.deletions);
  const maxChange = Math.max(...changes);
  const maxLen = Math.max(...files.map((f) => f.path.length));
  const numberWidth = String(maxChange).length;
  // diff.c show_stats(), without binary files.
  let graphWidth = maxChange;
  let nameWidth = maxLen;
  if (nameWidth + numberWidth + 6 + graphWidth > width) {
    if (graphWidth > Math.floor((width * 3) / 8) - numberWidth - 6) {
      graphWidth = Math.max(6, Math.floor((width * 3) / 8) - numberWidth - 6);
    }
    if (nameWidth > width - numberWidth - 6 - graphWidth) nameWidth = width - numberWidth - 6 - graphWidth;
    else graphWidth = width - numberWidth - 6 - nameWidth;
  }
  const scale = (n: number) => (n ? 1 + Math.floor((n * (graphWidth - 1)) / maxChange) : 0);
  return files.map((f) => {
    const name = f.path.length > nameWidth ? `...${f.path.slice(f.path.length - nameWidth + 3)}` : f.path.padEnd(nameWidth);
    let add = f.insertions;
    let del = f.deletions;
    if (graphWidth <= maxChange) {
      // The total is scaled, then the smaller side, and the larger side takes the rest.
      let total = scale(add + del);
      if (total < 2 && add && del) total = 2;
      if (add < del) { add = scale(add); del = total - add; } else { del = scale(del); add = total - del; }
    }
    const count = String(f.insertions + f.deletions).padStart(numberWidth);
    return ` ${name} | ${count}${add + del ? ' ' : ''}${'+'.repeat(add)}${'-'.repeat(del)}`;
  });
}

/** `Tree` for the files a commit records, with a fallback for commits written without one. */
export function treeOf(commit: GitCommit | undefined, fallback: Tree): Tree {
  return commit?.tree ?? fallback;
}
