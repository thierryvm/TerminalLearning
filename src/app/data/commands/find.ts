import type { FSNode, OutputLine } from './types';
import { helpNote } from './textTools';

/**
 * `find` and `xargs` as GNU findutils 4.9.0 runs them on Ubuntu 24.04 (WSL 2),
 * captured on 2 October 2026 in a copy of the simulator's home.
 *
 * Order: a real `find` lists a folder in the order the file system stores it,
 * which on Linux (ext4) changes from one machine to another. The simulator
 * lists each folder by name, ignoring case, as Windows' NTFS does (Git Bash's
 * `find`); lessons pipe into `sort` when the order matters.
 *
 * macOS ships BSD find, which needs a starting folder (`find . -name x`); with
 * no Mac to check it on, the macOS terminal shows the GNU behaviour.
 */

export interface FindDeps {
  /** The node at a path typed by the learner, in the current state (it changes as -exec and -delete run). */
  node(typed: string): FSNode | undefined;
  /** Runs one simple command (no pipe, no redirection) in the current state. */
  run(line: string): { lines: OutputLine[]; ok: boolean; notFound: boolean };
}

export interface FindResult { lines: OutputLine[]; status: number }

const err = (text: string): OutputLine => ({ text, type: 'error' });
const out = (text: string): OutputLine => ({ text, type: 'output' });
const note = (text: string): FindResult => ({ lines: [{ text, type: 'info' }], status: 0 });
const utf8 = new TextEncoder();

/** A word for the command line `-exec` and `xargs` build: quoted, so spaces and `;` stay inside it. */
export const shellWord = (word: string) => (/^[\w./@%+=:,-]+$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`);

/** fnmatch without flags, as -name uses it: `*` and `?` also match a leading dot. */
function globRegex(pattern: string, ignoreCase: boolean): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '[') {
      const end = pattern.indexOf(']', i + 2);
      if (end < 0) { re += '\\['; continue; }
      let body = pattern.slice(i + 1, end);
      if (body.startsWith('!')) body = `^${body.slice(1)}`;
      re += `[${body.replace(/\\/g, '\\\\')}]`;
      i = end;
    } else if (c === '\\' && i + 1 < pattern.length) re += `\\${pattern[++i]}`.replace(/^\\(\w)$/, '$1');
    else re += c.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  try {
    return new RegExp(`^${re}$`, ignoreCase ? 'is' : 's');
  } catch {
    // A pattern fnmatch cannot read (`[z-a]`) matches nothing, without an error.
    return /(?!)/;
  }
}

/** find's -regex speaks Emacs: `\(`, `\)` and `\|` group and alternate, bare ( ) | { } are literal. */
function emacsRegex(pattern: string): string {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    const next = pattern[i + 1];
    if (c === '\\' && next !== undefined && '()|'.includes(next)) { re += next; i++; }
    else if (c === '\\' && next !== undefined) { re += c + next; i++; }
    else if ('()|{}'.includes(c)) re += `\\${c}`;
    else re += c;
  }
  return re;
}

// ─── Expression ────────────────────────────────────────────────────────────

interface Entry { path: string; name: string; node: FSNode; depth: number }

type Expr =
  | { kind: 'and' | 'or'; left: Expr; right: Expr }
  | { kind: 'not'; expr: Expr }
  | { kind: 'test'; test: (e: Entry) => boolean }
  | { kind: 'print' }
  | { kind: 'delete' }
  | { kind: 'exec'; argv: string[]; batch: boolean; id: number }
  | { kind: 'true' };

/** Tests and actions this simulator does not act on: a note rather than a wrong answer. */
const NOT_SIMULATED = new Map<string, number>([
  ['-mtime', 1], ['-mmin', 1], ['-atime', 1], ['-amin', 1], ['-ctime', 1], ['-cmin', 1],
  ['-perm', 1], ['-user', 1], ['-group', 1], ['-ok', -1], ['-okdir', -1],
  ['-execdir', -1], ['-print0', 0], ['-printf', 1], ['-fprint', 1], ['-ls', 0], ['-links', 1], ['-inum', 1],
  ['-samefile', 1], ['-depth', 0], ['-prune', 0], ['-quit', 0], ['-xdev', 0], ['-mount', 0], ['-follow', 0],
]);

const SIZE_UNITS: Record<string, number> = { b: 512, c: 1, w: 2, k: 1024, M: 1024 ** 2, G: 1024 ** 3 };

function sizeOf(node: FSNode): number {
  return node.type === 'directory' ? 4096 : node.content === '' ? 0 : utf8.encode(node.content).length + 1;
}

interface Parsed { expr: Expr; maxDepth: number; minDepth: number; hasAction: boolean; deletes: boolean }

/** Parses the expression after the starting points, as GNU find does: `!`, `-a`, `-o`, parentheses. */
function parseExpression(tokens: string[], deps: FindDeps): Parsed | FindResult {
  let i = 0;
  let maxDepth = Infinity;
  let minDepth = 0;
  let hasAction = false;
  let deletes = false;
  let execs = 0;
  let failure: FindResult | undefined;
  // A "not simulated" note gives way to a real error later in the line (`-mtime 1 -bogus`).
  let notice: FindResult | undefined;
  const fail = (text: string) => { failure ??= { lines: [err(text)], status: 1 }; return { kind: 'true' } as Expr; };
  const value = () => (i >= tokens.length ? undefined : tokens[i++]);

  const primary = (): Expr => {
    if (i >= tokens.length) return fail(`find: expected an expression after '${tokens[i - 1]}'`);
    const t = tokens[i++];
    if (t === '(') {
      const inner = or();
      if (tokens[i] !== ')') return fail("find: invalid expression; you have too many '('");
      i++;
      return inner;
    }
    if (t === '!' || t === '-not') return { kind: 'not', expr: primary() };
    const needs = (name: string) => {
      const v = value();
      if (v === undefined) fail(`find: missing argument to \`${name}'`);
      return v ?? '';
    };
    switch (t) {
      case '-name':
      case '-iname': {
        const re = globRegex(needs(t), t === '-iname');
        return { kind: 'test', test: (e) => re.test(e.name) };
      }
      case '-path':
      case '-ipath':
      case '-wholename': {
        const re = globRegex(needs(t), t === '-ipath');
        return { kind: 'test', test: (e) => re.test(e.path) };
      }
      case '-type': {
        const kind = needs(t);
        if (!kind) return { kind: 'true' };
        // findutils 4.9 takes a list (`-type f,d`).
        const kinds = kind.split(',');
        const bad = kinds.find((k) => !/^[bcdpflsD]$/.test(k));
        if (bad !== undefined) return fail(`find: Unknown argument to -type: ${bad}`);
        // The simulator has files and folders only: no links, devices, pipes or sockets.
        return { kind: 'test', test: (e) => kinds.includes(e.node.type === 'file' ? 'f' : 'd') };
      }
      case '-empty':
        return { kind: 'test', test: (e) => (e.node.type === 'directory' ? Object.keys(e.node.children).length === 0 : e.node.content === '') };
      case '-size': {
        const spec = needs(t);
        const m = spec.match(/^([+-]?)(\d+)([bcwkMG]?)$/);
        if (!spec) return { kind: 'true' };
        if (!m) return fail(`find: Invalid argument \`${spec}' to -size`);
        const unit = SIZE_UNITS[m[3] || 'b'];
        const n = parseInt(m[2], 10);
        // Sizes are rounded up to the unit: -size -1k only matches empty files.
        return {
          kind: 'test',
          test: (e) => {
            const units = Math.ceil(sizeOf(e.node) / unit);
            return m[1] === '+' ? units > n : m[1] === '-' ? units < n : units === n;
          },
        };
      }
      case '-maxdepth':
      case '-mindepth': {
        const v = needs(t);
        if (!/^\d+$/.test(v)) return fail(`find: Expected a positive decimal integer argument to ${t}, but got ‘${v}’`);
        if (t === '-maxdepth') maxDepth = parseInt(v, 10);
        else minDepth = parseInt(v, 10);
        return { kind: 'true' };
      }
      case '-print':
        hasAction = true;
        return { kind: 'print' };
      case '-delete':
        hasAction = true;
        deletes = true;
        return { kind: 'delete' };
      case '-exec': {
        const argv: string[] = [];
        while (i < tokens.length && tokens[i] !== ';' && !(tokens[i] === '+' && tokens[i - 1] === '{}')) argv.push(tokens[i++]);
        if (i >= tokens.length || argv.length === 0) return fail("find: missing argument to `-exec'");
        const batch = tokens[i] === '+';
        i++;
        hasAction = true;
        return { kind: 'exec', argv, batch, id: execs++ };
      }
      case '-regex':
      case '-iregex': {
        // The whole path must match.
        const pattern = needs(t);
        try {
          const re = new RegExp(`^(?:${emacsRegex(pattern)})$`, t === '-iregex' ? 'is' : 's');
          return { kind: 'test', test: (e) => re.test(e.path) };
        } catch {
          notice ??= note(`Cette expression de ${t} n'est pas simulée dans ce terminal d'entraînement.`);
          return { kind: 'true' };
        }
      }
      case '-newer': {
        // Times are not simulated, but a missing reference file fails as in find.
        const reference = needs(t);
        if (reference && !deps.node(reference)) return fail(`find: ‘${reference}’: No such file or directory`);
        notice ??= note("Le test -newer de find n'est pas simulé dans ce terminal d'entraînement : les fichiers n'y ont pas de date de modification.");
        return { kind: 'true' };
      }
      case '-true':
        return { kind: 'true' };
      case '-false':
        return { kind: 'test', test: () => false };
      default: {
        if (NOT_SIMULATED.has(t)) {
          // Skip its arguments too: one value, or a whole command up to `;` (-ok, -execdir).
          const arity = NOT_SIMULATED.get(t)!;
          if (arity === 1) i++;
          else if (arity === -1) { while (i < tokens.length && tokens[i] !== ';' && tokens[i] !== '+') i++; i++; }
          notice ??= note(`Le test ${t} de find n'est pas simulé dans ce terminal d'entraînement.`);
          return { kind: 'true' };
        }
        if (t?.startsWith('-')) return fail(`find: unknown predicate \`${t}'`);
        return fail(`find: paths must precede expression: \`${t}'`);
      }
    }
  };

  const and = (): Expr => {
    let left = primary();
    while (i < tokens.length && tokens[i] !== ')' && tokens[i] !== '-o' && tokens[i] !== '-or') {
      if (tokens[i] === '-a' || tokens[i] === '-and') i++;
      left = { kind: 'and', left, right: primary() };
    }
    return left;
  };
  const or = (): Expr => {
    let left = and();
    while (tokens[i] === '-o' || tokens[i] === '-or') {
      i++;
      left = { kind: 'or', left, right: and() };
    }
    return left;
  };

  const expr: Expr = tokens.length ? or() : { kind: 'true' };
  if (!failure && i < tokens.length) fail(`find: unexpected extra predicate '${tokens[i]}'`);
  if (failure) return failure;
  if (notice) return notice;
  return { expr, maxDepth, minDepth, hasAction, deletes };
}

/** Folders listed by name, case ignored, like NTFS (see the note at the top). */
const byName = (a: string, b: string) => {
  const x = a.toUpperCase();
  const y = b.toUpperCase();
  return x < y ? -1 : x > y ? 1 : a < b ? -1 : a > b ? 1 : 0;
};

/** `find [path...] [expression]` (GNU findutils 4.9.0). */
export function runFind(args: string[], deps: FindDeps): FindResult {
  if (args[0] === '--help' || args[0] === '--version') return helpNote('find', args[0] === '--help' ? 'help' : 'version');
  const firstExpr = args.findIndex((a) => a.startsWith('-') || a === '(' || a === '!');
  const starts = firstExpr < 0 ? args : args.slice(0, firstExpr);
  const parsed = parseExpression(firstExpr < 0 ? [] : args.slice(firstExpr), deps);
  if ('status' in parsed) return parsed;
  const expr: Expr = parsed.hasAction ? parsed.expr : { kind: 'and', left: parsed.expr, right: { kind: 'print' } };

  const lines: OutputLine[] = [];
  let status = 0;
  const batches = new Map<number, { argv: string[]; paths: string[] }>();
  const runExec = (argv: string[], paths: string[]) => {
    const words = argv.flatMap((a) => (a === '{}' && paths.length > 1 ? paths : [a.split('{}').join(paths[0])]));
    const result = deps.run(words.map(shellWord).join(' '));
    if (result.notFound) { lines.push(err(`find: ‘${words[0]}’: No such file or directory`)); return false; }
    lines.push(...result.lines);
    return result.ok;
  };

  const evaluate = (e: Expr, entry: Entry): boolean => {
    switch (e.kind) {
      case 'and': return evaluate(e.left, entry) && evaluate(e.right, entry);
      case 'or': return evaluate(e.left, entry) || evaluate(e.right, entry);
      case 'not': return !evaluate(e.expr, entry);
      case 'test': return e.test(entry);
      case 'true': return true;
      case 'print': lines.push(out(entry.path)); return true;
      case 'exec':
        if (!e.batch) return runExec(e.argv, [entry.path]);
        if (!batches.has(e.id)) batches.set(e.id, { argv: e.argv, paths: [] });
        batches.get(e.id)!.paths.push(entry.path);
        return true;
      case 'delete': {
        // Deleted bottom-up (-delete implies -depth); a folder goes once it is empty. find never deletes ".".
        if (entry.path === '.') return true;
        const live = deps.node(entry.path);
        if (!live) return true;
        if (live.type === 'directory' && Object.keys(live.children).length) {
          lines.push(err(`find: cannot delete ‘${entry.path}’: Directory not empty`));
          status = 1;
          return false;
        }
        deps.run(`rm -r -- ${shellWord(entry.path)}`);
        return true;
      }
    }
  };

  const visit = (entry: Entry) => {
    const children = entry.node.type === 'directory' && entry.depth < parsed.maxDepth
      ? Object.keys(entry.node.children).sort(byName).map((name) => ({
        path: entry.path.endsWith('/') ? `${entry.path}${name}` : `${entry.path}/${name}`,
        name,
        node: (entry.node as Extract<FSNode, { type: 'directory' }>).children[name],
        depth: entry.depth + 1,
      }))
      : [];
    if (!parsed.deletes && entry.depth >= parsed.minDepth) evaluate(expr, entry);
    for (const child of children) visit(child);
    // After its contents went, a folder is tested as it is now (`-type d -empty -delete` removes parents too).
    if (parsed.deletes && entry.depth >= parsed.minDepth) {
      const live = deps.node(entry.path);
      if (live) evaluate(expr, { ...entry, node: live });
    }
  };

  for (const start of starts.length ? starts : ['.']) {
    const node = deps.node(start);
    if (!node) {
      lines.push(err(`find: ‘${start}’: No such file or directory`));
      status = 1;
      continue;
    }
    const name = start === '/' ? '/' : start.replace(/\/+$/, '').split('/').pop() || start;
    visit({ path: start, name, node, depth: 0 });
  }
  for (const { argv, paths } of batches.values()) if (paths.length && !runExec(argv, paths)) status = 1;
  return { lines, status };
}

// ─── xargs ─────────────────────────────────────────────────────────────────

/** Splits xargs input into arguments: blanks and newlines separate, quotes and backslashes group. */
function xargsWords(text: string): string[] | string {
  const words: string[] = [];
  let word = '';
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"') {
      const end = text.indexOf(c, i + 1);
      const nl = text.indexOf('\n', i + 1);
      if (end < 0 || (nl >= 0 && nl < end)) {
        return `xargs: unmatched ${c === "'" ? 'single' : 'double'} quote; by default quotes are special to xargs unless you use the -0 option`;
      }
      word += text.slice(i + 1, end);
      inWord = true;
      i = end;
    } else if (c === '\\' && i + 1 < text.length) {
      word += text[++i];
      inWord = true;
    } else if (/\s/.test(c)) {
      if (inWord) words.push(word);
      word = '';
      inWord = false;
    } else {
      word += c;
      inWord = true;
    }
  }
  if (inWord) words.push(word);
  return words;
}

const XARGS_HELP = "Try 'xargs --help' for more information.";

/** `xargs [options] [command [initial-arguments]]` (GNU findutils 4.9.0). `stdin` is undefined without a pipe. */
export function runXargs(args: string[], stdin: string | undefined, deps: FindDeps): FindResult {
  const fail = (...texts: string[]): FindResult => ({ lines: texts.map(err), status: 1 });
  let maxArgs: number | undefined;
  let maxLines: number | undefined;
  let replace: string | undefined;
  let noRunIfEmpty = false;
  let trace = false;
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { i++; break; }
    if (!a.startsWith('-') || a === '-') break;
    if (a === '--help' || a === '--version') return helpNote('xargs', a === '--help' ? 'help' : 'version');
    if (a === '--no-run-if-empty') { noRunIfEmpty = true; continue; }
    if (a === '--verbose') { trace = true; continue; }
    const long = a.match(/^--(max-args|max-lines|replace)(?:=(.*))?$/);
    if (long) {
      if (long[1] === 'replace') { replace = long[2] ?? '{}'; maxLines = 1; continue; }
      const v = long[2] ?? args[++i];
      if (v === undefined) return fail(`xargs: option '--${long[1]}' requires an argument`, XARGS_HELP);
      if (!/^\d+$/.test(v)) return fail(`xargs: invalid number "${v}" for -${long[1] === 'max-args' ? 'n' : 'L'} option`, XARGS_HELP);
      if (parseInt(v, 10) < 1) return fail(`xargs: value ${v} for -${long[1] === 'max-args' ? 'n' : 'L'} option should be >= 1`, XARGS_HELP);
      if (long[1] === 'max-args') maxArgs = parseInt(v, 10); else maxLines = parseInt(v, 10);
      continue;
    }
    if (a.startsWith('--')) return fail(`xargs: unrecognized option '${a}'`, XARGS_HELP);
    for (let j = 1; j < a.length; j++) {
      const c = a[j];
      if ('nLI'.includes(c)) {
        const v = j + 1 < a.length ? a.slice(j + 1) : args[++i];
        if (v === undefined) return fail(`xargs: option requires an argument -- '${c}'`, XARGS_HELP);
        if (c === 'I') { replace = v; maxLines = 1; }
        else {
          const n = parseInt(v, 10);
          if (!/^\d+$/.test(v)) return fail(`xargs: invalid number "${v}" for -${c} option`, XARGS_HELP);
          if (n < 1) return fail(`xargs: value ${v} for -${c} option should be >= 1`, XARGS_HELP);
          if (c === 'n') maxArgs = n; else maxLines = n;
        }
        break;
      }
      // -i is the old spelling of -I {}.
      if (c === 'i') { replace = j + 1 < a.length ? a.slice(j + 1) : '{}'; maxLines = 1; break; }
      if (c === 'r') noRunIfEmpty = true;
      else if (c === 't') trace = true;
      else if (c === 'x') continue;
      else if ('0dPpsaE'.includes(c)) return note(`L'option -${c} de xargs n'est pas simulée dans ce terminal d'entraînement.`);
      else return fail(`xargs: invalid option -- '${c}'`, XARGS_HELP);
    }
  }
  const command = args.slice(i).length ? args.slice(i) : ['echo'];
  if (stdin === undefined) {
    return note(`xargs attend du texte tapé au clavier quand il n'a pas de pipe. Donnez-lui la sortie d'une autre commande, par exemple find . -name "*.txt" | xargs ${command.join(' ')}.`);
  }

  // Each command gets a group of arguments: all of them, -n at a time, or -L / -I lines at a time.
  let groups: string[][];
  if (maxLines !== undefined) {
    const lines = stdin.split('\n').filter((l) => l.trim() !== '');
    groups = [];
    for (let k = 0; k < lines.length; k += maxLines) {
      const chunk = lines.slice(k, k + maxLines);
      if (replace !== undefined) groups.push([chunk[0].replace(/^\s+/, '')]);
      else {
        const words = xargsWords(chunk.join('\n'));
        if (typeof words === 'string') return fail(words);
        groups.push(words);
      }
    }
  } else {
    const words = xargsWords(stdin);
    if (typeof words === 'string') return fail(words);
    groups = [];
    for (let k = 0; k < words.length; k += maxArgs ?? (words.length || 1)) groups.push(words.slice(k, k + (maxArgs ?? words.length)));
  }
  // Without input, GNU xargs still runs the command once (unless -r); -I never does.
  if (!groups.length && !noRunIfEmpty && replace === undefined) groups = [[]];

  const lines: OutputLine[] = [];
  let status = 0;
  for (const group of groups) {
    const argv = replace !== undefined ? command.map((w) => w.split(replace!).join(group[0])) : [...command, ...group];
    const line = argv.map(shellWord).join(' ');
    // -t writes each command on standard error before running it.
    if (trace) lines.push(err(argv.map(shellWord).join(' ')));
    const result = deps.run(line);
    if (result.notFound) return { lines: [...lines, err(`xargs: ${command[0]}: No such file or directory`)], status: 127 };
    lines.push(...result.lines);
    if (!result.ok) status = 123;
  }
  return { lines, status };
}
