import type { TerminalEnv } from './types';

/**
 * Shell syntax of one command line: lists (`;`, `&&`, `||`), pipelines (`|`)
 * and redirections (`>`, `>>`, `2>`, `2>&1`, `&>`, `<`, PowerShell `*>`).
 * Pure parsing — nothing is executed here. Quotes protect every operator, so
 * `grep "a|b" f` or `git commit -m "x > y"` stay single commands.
 */

export type Fd = 1 | 2;

export type Redirect =
  /** `>`, `>>`, `2>`, `&>` (fd 'both'): send a stream to a file. */
  | { kind: 'file'; fd: Fd | 'both'; append: boolean; target: string }
  /** `2>&1`, `>&2`: point `fd` wherever `to` currently points. */
  | { kind: 'dup'; fd: Fd; to: Fd };

export interface Stage {
  /** The command without its redirections, quotes kept for the argument parser. */
  text: string;
  redirects: Redirect[];
  /** `< file`: read standard input from a file. */
  stdinFile?: string;
}

export interface ListItem {
  /** Operator that joins this pipeline to the previous one (`null` for the first). */
  op: ';' | '&&' | '||' | null;
  stages: Stage[];
}

export type ParseResult = { ok: true; list: ListItem[] } | { ok: false; error: string };

type Token =
  | { t: 'word'; raw: string }
  | { t: 'op'; op: '|' | '||' | '&&' | ';' }
  | { t: 'redir'; fd: Fd | 'both'; append: boolean; dupTo?: Fd; inFile?: boolean };

const OPERATOR_CHARS = new Set(['|', ';', '&', '<', '>']);

/** Split into words and operators; quoted text is copied verbatim, quotes included. */
function tokenize(line: string, env: TerminalEnv): { tokens: Token[] } | { error: string } {
  const tokens: Token[] = [];
  const escape = env === 'windows' ? '`' : '\\';
  let word = '';
  let quote = '';
  const flush = () => {
    if (word) tokens.push({ t: 'word', raw: word });
    word = '';
  };

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (quote) {
      word += ch;
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      word += ch;
      continue;
    }
    // An escaped operator is a literal character (`find … -exec rm {} \;`).
    if (ch === escape && next !== undefined && (OPERATOR_CHARS.has(next) || next === '"' || next === "'")) {
      word += ch + next;
      i++;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      flush();
      continue;
    }

    // Redirections that start with an fd number or `&` / `*` — only at a word boundary,
    // so `a2>f` stays `a2` + `>f` like in bash.
    if (!word) {
      const m = /^(&>>|&>|\*>>|\*>&1|\*>|[12]?>>|[12]?>&[12]|[12]?>|<)/.exec(line.slice(i));
      if (m) {
        const op = m[1];
        i += op.length - 1;
        if (op === '<') tokens.push({ t: 'redir', fd: 1, append: false, inFile: true });
        else if (op === '*>&1') tokens.push({ t: 'redir', fd: 2, append: false, dupTo: 1 });
        else if (op.startsWith('&') || op.startsWith('*')) tokens.push({ t: 'redir', fd: 'both', append: op.endsWith('>>') });
        else {
          const fd: Fd = op.startsWith('2') ? 2 : 1;
          const dup = /&([12])$/.exec(op);
          if (dup) tokens.push({ t: 'redir', fd, append: false, dupTo: Number(dup[1]) as Fd });
          else tokens.push({ t: 'redir', fd, append: op.endsWith('>>') });
        }
        continue;
      }
    } else if (ch === '>' || ch === '<') {
      // `echo hi>f`: the redirection ends the current word.
      flush();
      i--;
      continue;
    }

    if (ch === '|' || ch === ';' || (ch === '&' && next === '&')) {
      flush();
      if (ch === '|' && next === '|') { tokens.push({ t: 'op', op: '||' }); i++; }
      else if (ch === '&') { tokens.push({ t: 'op', op: '&&' }); i++; }
      else tokens.push({ t: 'op', op: ch as '|' | ';' });
      continue;
    }
    word += ch;
  }
  if (quote) return { error: `unexpected EOF while looking for matching \`${quote}'` };
  flush();
  return { tokens };
}

export function parseCommandLine(line: string, env: TerminalEnv): ParseResult {
  const tok = tokenize(line, env);
  if ('error' in tok) return { ok: false, error: tok.error };
  const { tokens } = tok;

  const list: ListItem[] = [];
  let stages: Stage[] = [];
  let words: string[] = [];
  let redirects: Redirect[] = [];
  let stdinFile: string | undefined;
  let pendingOp: ListItem['op'] = null;

  const endStage = (next: string): string | null => {
    if (words.length === 0) return `syntax error near unexpected token \`${next}'`;
    stages.push({ text: words.join(' '), redirects, ...(stdinFile !== undefined ? { stdinFile } : {}) });
    words = [];
    redirects = [];
    stdinFile = undefined;
    return null;
  };

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t === 'word') {
      words.push(tk.raw);
    } else if (tk.t === 'redir') {
      if (tk.dupTo !== undefined) {
        redirects.push({ kind: 'dup', fd: tk.fd as Fd, to: tk.dupTo });
        continue;
      }
      const target = tokens[i + 1];
      if (!target || target.t !== 'word') {
        return { ok: false, error: `syntax error near unexpected token \`${target && target.t === 'op' ? target.op : 'newline'}'` };
      }
      i++;
      const path = unquote(target.raw);
      if (tk.inFile) stdinFile = path;
      else redirects.push({ kind: 'file', fd: tk.fd, append: tk.append, target: path });
    } else if (tk.op === '|') {
      const err = endStage('|');
      if (err) return { ok: false, error: err };
    } else {
      const err = endStage(tk.op);
      if (err) return { ok: false, error: err };
      list.push({ op: pendingOp, stages });
      stages = [];
      pendingOp = tk.op;
    }
  }
  if (words.length === 0) {
    // A list may end with `;` (`ls;`), not with `|`, `&&` or `||`.
    if (stages.length === 0 && pendingOp === ';') return { ok: true, list };
    return { ok: false, error: 'syntax error near unexpected token `newline\'' };
  }
  endStage('newline');
  list.push({ op: pendingOp, stages });
  return { ok: true, list };
}

function unquote(raw: string): string {
  const q = raw[0];
  return (q === '"' || q === "'") && raw.endsWith(q) && raw.length >= 2 ? raw.slice(1, -1) : raw;
}

/** True when the line needs the shell layer at all (fast path for plain commands). */
export function isPlainCommand(list: ListItem[]): boolean {
  return list.length === 1 && list[0].stages.length === 1
    && list[0].stages[0].redirects.length === 0 && list[0].stages[0].stdinFile === undefined;
}

/** `/dev/null` (Unix) and `$null` / `NUL` (PowerShell) swallow what is written to them. */
export function isNullDevice(target: string, env: TerminalEnv): boolean {
  if (env === 'windows') return /^(\$null|nul)$/i.test(target);
  return target === '/dev/null';
}
