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

/** One path segment as a RegExp; null when the pattern cannot match anything (`[z-a]`). */
function segmentRegex(chars: string[], meta: boolean[]): RegExp | null {
  let re = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    // `**` is `*` (no globstar); one `.*` per run keeps backtracking low.
    if (meta[i] && c === '*') { if (!re.endsWith('.*')) re += '.*'; }
    else if (meta[i] && c === '?') re += '.';
    else if (meta[i] && c === '[') {
      const end = chars.indexOf(']', i + 2);
      if (end < 0) { re += '\\['; continue; }
      let body = chars.slice(i + 1, end).join('');
      if (body.startsWith('!') || body.startsWith('^')) body = `^${body.slice(1)}`;
      re += `[${body.replace(/\\/g, '\\\\')}]`;
      i = end;
    } else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  try {
    return new RegExp(`^${re}$`, 's');
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
