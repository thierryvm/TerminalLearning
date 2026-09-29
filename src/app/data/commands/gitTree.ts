/**
 * The file side of the simulated git: reading the working tree, `.gitignore`
 * rules, line diffs and blob ids. Everything here mirrors what git itself
 * computes, so `git status`, `git diff` and `git commit` show what a real
 * repository would.
 */
import type { DirectoryNode, FSNode, TerminalEnv } from './types';

/** Files of a tree: path relative to the repository (`docs/n.txt`) → content. */
export type Tree = Record<string, string>;

export function nodeAt(root: DirectoryNode, path: string[]): FSNode | null {
  let current: FSNode = root;
  for (const seg of path) {
    if (current.type !== 'directory') return null;
    const child: FSNode | undefined = current.children[seg];
    if (!child) return null;
    current = child;
  }
  return current;
}

/**
 * The simulator stores text without its final newline (see `textCounts` in
 * terminalEngine): the bytes git sees on disk end with one, empty files aside.
 */
const onDisk = (text: string) => (text ? `${text}\n` : '');
const stored = (disk: string) => (disk.endsWith('\n') ? disk.slice(0, -1) : disk);

/** Every file under `dir` as git reads it, keyed by its path below it. Git never looks inside `.git`. */
export function readTree(root: DirectoryNode, dir: string[]): Tree {
  const tree: Tree = {};
  const walk = (node: FSNode, prefix: string) => {
    if (node.type === 'file') {
      tree[prefix] = onDisk(node.content);
      return;
    }
    for (const [name, child] of Object.entries(node.children)) {
      if (name === '.git') continue;
      walk(child, prefix ? `${prefix}/${name}` : name);
    }
  };
  const start = nodeAt(root, dir);
  if (start?.type === 'directory') walk(start, '');
  return tree;
}

/**
 * A copy of `root` where the file at `path` holds `content` (bytes as git
 * sees them), or is removed when `content` is null. Missing parent
 * directories are created, as git does when it restores a file.
 */
export function writeFile(root: DirectoryNode, path: string[], disk: string | null): DirectoryNode {
  return place(root, path, disk === null ? null : stored(disk));
}

function place(root: DirectoryNode, path: string[], content: string | null): DirectoryNode {
  const [head, ...rest] = path;
  const existing = root.children[head];
  if (rest.length === 0) {
    const children = { ...root.children };
    if (content === null) delete children[head];
    else {
      const permissions = existing?.type === 'file' ? existing.permissions : '-rw-r--r--';
      children[head] = { type: 'file', content, permissions, owner: 'user', group: 'user', size: content.length };
    }
    return { ...root, children };
  }
  const dir: DirectoryNode = existing?.type === 'directory'
    ? existing
    : { type: 'directory', children: {}, permissions: 'drwxr-xr-x', owner: 'user', group: 'user' };
  if (content === null && existing?.type !== 'directory') return root;
  const child = place(dir, rest, content);
  // Git removes the directories a deletion leaves empty. The repository root
  // always keeps `.git/`, so this never climbs out of the repository.
  if (content === null && Object.keys(child.children).length === 0) {
    const children = { ...root.children };
    delete children[head];
    return { ...root, children };
  }
  return { ...root, children: { ...root.children, [head]: child } };
}

/** Git's file mode: executable files are 100755, except on Windows where git ignores the bit. */
export function fileMode(node: FSNode | null, env: TerminalEnv): string {
  return env !== 'windows' && node?.type === 'file' && node.permissions[3] === 'x' ? '100755' : '100644';
}

// ─── .gitignore ──────────────────────────────────────────────────────────────

export interface IgnoreRule {
  /** The pattern as written, for `git check-ignore -v`. */
  pattern: string;
  line: number;
  negate: boolean;
  dirOnly: boolean;
  /** A pattern with a slash matches from the repository root, otherwise any name. */
  anchored: boolean;
  regex: RegExp;
}

function globToRegex(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      const slashAfter = glob[i + 2] === '/';
      re += slashAfter ? '(?:.*/)?' : '.*';
      i += slashAfter ? 2 : 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '[') {
      const end = glob.indexOf(']', i + 1);
      if (end < 0) re += '\\[';
      else {
        re += `[${glob.slice(i + 1, end).replace(/^!/, '^').replace(/\\/g, '\\\\')}]`;
        i = end;
      }
    } else re += c.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** The rules of a `.gitignore` file, in order. Comments and blank lines are skipped. */
export function parseIgnore(text: string): IgnoreRule[] {
  const rules: IgnoreRule[] = [];
  text.split('\n').forEach((raw, i) => {
    const pattern = raw.replace(/\r$/, '').replace(/(?<!\\)\s+$/, '');
    if (!pattern || pattern.startsWith('#')) return;
    let body = pattern;
    const negate = body.startsWith('!');
    if (negate) body = body.slice(1);
    const dirOnly = body.endsWith('/');
    if (dirOnly) body = body.slice(0, -1);
    const anchored = body.includes('/');
    if (body.startsWith('/')) body = body.slice(1);
    rules.push({ pattern, line: i + 1, negate, dirOnly, anchored, regex: globToRegex(body) });
  });
  return rules;
}

function lastMatch(rules: IgnoreRule[], path: string, isDir: boolean): IgnoreRule | null {
  const name = path.slice(path.lastIndexOf('/') + 1);
  for (let i = rules.length - 1; i >= 0; i--) {
    const r = rules[i];
    if (r.dirOnly && !isDir) continue;
    if (r.regex.test(r.anchored ? path : name)) return r;
  }
  return null;
}

/**
 * The rule that makes git ignore `path`, or null. The last matching pattern
 * wins, and a file inside an ignored directory stays ignored: git never looks
 * inside that directory, so a later `!` pattern cannot bring the file back.
 */
export function ignoredBy(rules: IgnoreRule[], path: string, isDir: boolean): IgnoreRule | null {
  const rule = decidingRule(rules, path, isDir);
  return rule && !rule.negate ? rule : null;
}

/**
 * The rule that decides `path`, a `!` pattern included: `git check-ignore -v`
 * names it even when it brings the file back.
 */
export function decidingRule(rules: IgnoreRule[], path: string, isDir: boolean): IgnoreRule | null {
  if (!rules.length) return null;
  const parts = path.split('/');
  for (let i = 1; i < parts.length; i++) {
    const rule = lastMatch(rules, parts.slice(0, i).join('/'), true);
    if (rule && !rule.negate) return rule;
  }
  return lastMatch(rules, path, isDir);
}

// ─── Line diff ───────────────────────────────────────────────────────────────

/**
 * Lines with their end of line kept, so that a last line without one
 * (`l3`) differs from the same text followed by a newline (`l3\n`), as in git.
 */
export function splitLines(content: string): string[] {
  if (!content) return [];
  const lines = content.split('\n').map((l) => `${l}\n`);
  if (content.endsWith('\n')) lines.pop();
  else lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
  return lines;
}

export interface DiffOp {
  kind: ' ' | '-' | '+';
  line: string;
  /** Index of the line in the old file (for ' ' and '-') or the new one (for '+'). */
  index: number;
}

/**
 * Myers' shortest edit script, the default algorithm of git. Within a run of
 * changes, deletions come before insertions, as git prints them.
 */
export function diffLines(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const off = max + 1;
  const v = new Array<number>(2 * max + 3).fill(0);
  const trace: number[][] = [];
  let found = false;
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) { found = true; break; }
    }
  }
  // Walk the trace back from the end to recover the edits.
  const ops: DiffOp[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d];
    const k = x - y;
    const down = k === -d || (k !== d && vd[off + k - 1] < vd[off + k + 1]);
    const prevK = down ? k + 1 : k - 1;
    const prevX = d === 0 ? 0 : vd[off + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { x--; y--; ops.push({ kind: ' ', line: a[x], index: x }); }
    if (d > 0) {
      if (down) { y--; ops.push({ kind: '+', line: b[y], index: y }); }
      else { x--; ops.push({ kind: '-', line: a[x], index: x }); }
    }
  }
  ops.reverse();
  // Deletions first within each run of changes.
  const out: DiffOp[] = [];
  let run: DiffOp[] = [];
  const flush = () => {
    out.push(...run.filter((o) => o.kind === '-'), ...run.filter((o) => o.kind === '+'));
    run = [];
  };
  for (const op of ops) {
    if (op.kind === ' ') { flush(); out.push(op); } else run.push(op);
  }
  flush();
  return out;
}

export function countChanges(a: string, b: string): { insertions: number; deletions: number } {
  const ops = diffLines(splitLines(a), splitLines(b));
  return {
    insertions: ops.filter((o) => o.kind === '+').length,
    deletions: ops.filter((o) => o.kind === '-').length,
  };
}



function range(start: number, count: number): string {
  // An empty range names the line before it: `-0,0` for a new file.
  const first = count === 0 ? start : start + 1;
  return count === 1 ? `${first}` : `${first},${count}`;
}

/**
 * The hunks of a unified diff with git's defaults: `context` lines around each change (3, or `-U<n>`),
 * hunks closer than that merged, and the nearest line above each hunk that
 * starts with a letter, `_` or `$` shown after `@@` as its "function" context.
 */
export function unifiedHunks(oldText: string, newText: string, context = 3): string[] {
  const a = splitLines(oldText);
  const b = splitLines(newText);
  const ops = diffLines(a, b);
  const changed = ops.map((o, i) => (o.kind === ' ' ? -1 : i)).filter((i) => i >= 0);
  if (!changed.length) return [];

  // Group changes whose context would touch or overlap.
  const groups: Array<[number, number]> = [];
  for (const i of changed) {
    const last = groups[groups.length - 1];
    if (last && i - last[1] <= 2 * context + 1) last[1] = i;
    else groups.push([i, i]);
  }

  const lines: string[] = [];
  for (const [first, lastChange] of groups) {
    const from = Math.max(0, first - context);
    const to = Math.min(ops.length - 1, lastChange + context);
    const slice = ops.slice(from, to + 1);
    // Position of the hunk in each file: lines of that file before `from`.
    const before = ops.slice(0, from);
    const oldStart = before.filter((o) => o.kind !== '+').length;
    const newStart = before.filter((o) => o.kind !== '-').length;
    const oldCount = slice.filter((o) => o.kind !== '+').length;
    const newCount = slice.filter((o) => o.kind !== '-').length;
    let heading = '';
    for (let i = oldStart - 1; i >= 0; i--) {
      if (/^[A-Za-z_$]/.test(a[i])) { heading = ` ${a[i].replace(/\n$/, '').slice(0, 80).trimEnd()}`; break; }
    }
    lines.push(`@@ -${range(oldStart, oldCount)} +${range(newStart, newCount)} @@${heading}`);
    for (const op of slice) {
      lines.push(`${op.kind}${op.line.replace(/\n$/, '')}`);
      if (!op.line.endsWith('\n')) lines.push('\\ No newline at end of file');
    }
  }
  return lines;
}

// ─── Blob ids ────────────────────────────────────────────────────────────────

/** SHA-1 (FIPS 180-4). Only names file contents in `git diff`, never protects anything. */
export function sha1(data: Uint8Array): string {
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const bitLength = data.length * 8;
  const msg = [...data, 0x80];
  while (msg.length % 64 !== 56) msg.push(0);
  const hi = Math.floor(bitLength / 2 ** 32);
  const lo = bitLength >>> 0;
  msg.push(hi >>> 24, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255, lo >>> 24, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  const w = new Array<number>(80);
  for (let off = 0; off < msg.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4;
      w[i] = (msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3];
    }
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      const [f, k] = i < 20 ? [(b & c) | (~b & d), 0x5a827999]
        : i < 40 ? [b ^ c ^ d, 0x6ed9eba1]
          : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc]
            : [b ^ c ^ d, 0xca62c1d6];
      const t = (rotl(a, 5) + f + e + k + w[i]) | 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = t;
    }
    [a, b, c, d, e].forEach((val, i) => { h[i] = (h[i] + val) | 0; });
  }
  return h.map((val) => (val >>> 0).toString(16).padStart(8, '0')).join('');
}

/** The object id git gives a file's content: SHA-1 of `blob <size>\0<content>`. */
export function blobId(content: string): string {
  const body = new TextEncoder().encode(content);
  const header = new TextEncoder().encode(`blob ${body.length}\0`);
  const all = new Uint8Array(header.length + body.length);
  all.set(header);
  all.set(body, header.length);
  return sha1(all);
}
