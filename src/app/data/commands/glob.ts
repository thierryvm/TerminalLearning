import { compareLocale } from './textTools';

/**
 * Pathname expansion (globbing) as bash 5.2 does it in the Linux and macOS
 * terminals, captured on Ubuntu 24.04 on 2 October 2026:
 * - `*`, `?` and `[...]` (`[!x]` and `[^x]` negate) in an unquoted word;
 * - names that start with a dot only match a pattern that starts with a dot,
 *   and `.` and `..` never do (bash 5.2's globskipdots);
 * - a trailing slash keeps folders only (`echo *` then `/` lists the folders);
 * - the matches are sorted in the locale's order, like `sort`;
 * - a word that matches nothing is left as typed (`ls *.txt` →
 *   `ls: cannot access '*.txt'`).
 * PowerShell does not expand words: its cmdlets read wildcards themselves.
 */

export interface GlobEntry { name: string; isDir: boolean }

/** The entries of the folder at these absolute path parts, or null when it is not a folder. */
export type ListDir = (parts: string[]) => GlobEntry[] | null;

/** Does this word hold a wildcard typed without quotes or backslash? */
export const hasActiveWildcard = (meta: boolean[]) => meta.some(Boolean);

/** The character classes bash knows inside brackets (`[[:alpha:]]*`). */
const CHAR_CLASSES: Record<string, string> = {
  alpha: '\\p{L}', upper: '\\p{Lu}', lower: '\\p{Ll}', digit: '0-9', alnum: '\\p{L}\\p{N}',
  space: '\\s', blank: ' \\t', punct: '\\p{P}\\p{S}', xdigit: '0-9A-Fa-f',
  graph: '\\p{L}\\p{M}\\p{N}\\p{P}\\p{S}', print: '\\p{L}\\p{M}\\p{N}\\p{P}\\p{S} ', cntrl: '\\p{Cc}',
};

/**
 * The bracket expression that starts at `chars[start]` (a `[`), as bash reads it:
 * `!` or `^` negates, a `]` right after the opening is a member, and `[:name:]`
 * is a class. Returns its RegExp text and where it ends; 'literal' when there is
 * no closing bracket (the `[` is then an ordinary character); 'never' for an
 * unknown class, which matches nothing.
 */
function bracketExpression(chars: string[], start: number): { re: string; end: number } | 'literal' | 'never' {
  let i = start + 1;
  const negate = chars[i] === '!' || chars[i] === '^';
  if (negate) i++;
  let body = '';
  // A `-` right after a class is a plain member (`[[:digit:]-a]`), not a range.
  let afterClass = false;
  for (let first = true; i < chars.length; i++, first = false) {
    const c = chars[i];
    if (c === ']' && !first) return { re: `[${negate ? '^' : ''}${body}]`, end: i };
    if (c === '[' && chars[i + 1] === ':') {
      const close = chars.join('').indexOf(':]', i + 2);
      if (close > 0) {
        const name = chars.slice(i + 2, close).join('');
        if (!Object.prototype.hasOwnProperty.call(CHAR_CLASSES, name)) return 'never';
        body += CHAR_CLASSES[name];
        i = close + 1;
        afterClass = true;
        continue;
      }
    }
    body += '\\[]^'.includes(c) || (c === '-' && afterClass) ? `\\${c}` : c;
    afterClass = false;
  }
  return 'literal';
}

/** One path segment as a RegExp; null when the pattern cannot match anything (`[z-a]`). */
function segmentRegex(chars: string[], meta: boolean[]): RegExp | null {
  let re = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    // `**` is `*` (no globstar); one `.*` per run keeps backtracking low.
    if (meta[i] && c === '*') { if (!re.endsWith('.*')) re += '.*'; }
    else if (meta[i] && c === '?') re += '.';
    else if (meta[i] && c === '[') {
      const bracket = bracketExpression(chars, i);
      if (bracket === 'never') return null;
      if (bracket === 'literal') { re += '\\['; continue; }
      re += bracket.re;
      i = bracket.end;
    } else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  try {
    return new RegExp(`^${re}$`, 'su');
  } catch {
    return null;
  }
}

/**
 * Expands `word` (with `meta[i]` true for each active wildcard character),
 * relative to `cwd`. Returns the sorted matches, or [] when there is none.
 */
export function expandGlob(word: string, meta: boolean[], cwd: string[], list: ListDir): string[] {
  // UTF-16 units, like the flags parseArgs keeps for each character.
  const chars = word.split('');
  // Split into segments on "/", keeping each character's flag.
  const segments: { chars: string[]; meta: boolean[] }[] = [{ chars: [], meta: [] }];
  chars.forEach((c, i) => {
    if (c === '/') segments.push({ chars: [], meta: [] });
    else {
      segments[segments.length - 1].chars.push(c);
      segments[segments.length - 1].meta.push(meta[i] ?? false);
    }
  });
  const absolute = word.startsWith('/');
  let found: { parts: string[]; shown: string; isDir: boolean }[] = [{ parts: absolute ? [] : [...cwd], shown: absolute ? '/' : '', isDir: true }];

  segments.forEach((seg, index) => {
    const last = index === segments.length - 1;
    if (seg.chars.length === 0) {
      // A leading "/" (already in `shown`), "//", or a trailing "/": folders only.
      if (index === 0) return;
      found = found.filter((f) => f.isDir).map((f) => ({ ...f, shown: `${f.shown}/` }));
      return;
    }
    const join = (shown: string, name: string) => (shown === '' || shown.endsWith('/') ? `${shown}${name}` : `${shown}/${name}`);
    const text = seg.chars.join('');
    if (!seg.meta.some(Boolean)) {
      // A literal segment: it must exist (a folder, unless it is the last one).
      found = found.flatMap((f) => {
        const parts = text === '.' ? f.parts : text === '..' ? f.parts.slice(0, -1) : [...f.parts, text];
        const parent = list(f.parts);
        const entry = text === '.' || text === '..' ? { isDir: true } : parent?.find((e) => e.name === text);
        if (!entry || (!last && !entry.isDir)) return [];
        return [{ parts, shown: join(f.shown, text), isDir: entry.isDir }];
      });
      return;
    }
    const re = segmentRegex(seg.chars, seg.meta);
    if (!re) { found = []; return; }
    const dotted = seg.chars[0] === '.' && !seg.meta[0];
    found = found.flatMap((f) => (list(f.parts) ?? [])
      .filter((e) => (dotted || !e.name.startsWith('.')) && e.name !== '.' && e.name !== '..' && re.test(e.name))
      .filter((e) => last || e.isDir)
      .map((e) => ({ parts: [...f.parts, e.name], shown: join(f.shown, e.name), isDir: e.isDir })));
  });
  return found.map((f) => f.shown).sort(compareLocale);
}
