import type { OutputLine } from './types';
import type { PsArgs, PsCmdlet } from './psParams';
import { parsePsArgs, psNotSimulated } from './psParams';

/**
 * `sort`, `uniq` and `cut` as GNU coreutils 9.4 runs them on Ubuntu 24.04 in
 * an en_US.UTF-8 locale, and the PowerShell 7.6 cmdlets that do the same jobs
 * (`Sort-Object`, `Get-Unique`, `Select-Object -Unique`, `Group-Object`).
 * Every behaviour here was captured in those real shells on 2 October 2026.
 *
 * macOS ships BSD versions of these three tools; with no Mac to check them on,
 * the macOS terminal shows the GNU behaviour.
 */

export type ReadText = (path: string) => { content: string } | { error: 'missing' | 'directory' };

export interface TextToolResult {
  lines: OutputLine[];
  status: number;
  /** `sort -o file` and `uniq in out` write their result to a file instead of the screen. */
  writeTo?: { path: string; lines: string[] };
}

const out = (texts: string[]): OutputLine[] => texts.map((text) => ({ text, type: 'output' }));
const err = (...texts: string[]): OutputLine[] => texts.map((text) => ({ text, type: 'error' }));
const tryHelp = (cmd: string) => `Try '${cmd} --help' for more information.`;
const notSimulated = (cmd: string, option: string): TextToolResult => ({
  lines: [{ text: `L'option ${option} de ${cmd} n'est pas simulée dans ce terminal d'entraînement.`, type: 'info' }],
  status: 0,
});

/**
 * With neither a file nor a pipe, the real tool waits for text typed at the
 * keyboard (until Ctrl+D); the practice terminal says what to give it instead.
 */
function waitsForKeyboard(cmd: string, operands: string[], stdin: string | undefined): TextToolResult | null {
  if (stdin !== undefined || (operands.length && !operands.includes('-'))) return null;
  return {
    lines: [{ text: `${cmd} attend du texte tapé au clavier quand il n'a ni fichier ni pipe. Donnez-lui un fichier (${cmd} fichier.txt) ou la sortie d'une autre commande (cat fichier.txt | ${cmd}).`, type: 'info' }],
    status: 0,
  };
}

/**
 * The lines of a text as the simulator stores it: files and pipes hold lines
 * joined by "\n" with no final newline, so a trailing "\n" is an empty last line
 * (the convention `cat` and `wc` follow).
 */
export function textLines(text: string): string[] {
  return text === '' ? [] : text.split('\n');
}

// ─── Collation ─────────────────────────────────────────────────────────────

const glibcCollator = new Intl.Collator('en', { ignorePunctuation: true });
const utf8 = new TextEncoder();

/** Byte order, the C locale's: uppercase before lowercase, accents last. */
function compareBytes(a: string, b: string): number {
  const x = utf8.encode(a);
  const y = utf8.encode(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

/**
 * glibc 2.39's order in en_US.UTF-8 and fr_FR.UTF-8 (identical on a list of
 * 69 tricky lines): punctuation, symbols and spaces count only to break ties
 * (`.cache` sorts as "cache", `+7` as "7"), case comes after accents, and two
 * different lines are never equal.
 */
export function compareLocale(a: string, b: string): number {
  const strip = (s: string) => s.replace(/\p{S}/gu, '');
  return glibcCollator.compare(strip(a), strip(b)) || glibcCollator.compare(a, b) || compareBytes(a, b);
}

// ─── Options, GNU style ────────────────────────────────────────────────────

interface OptionSpec {
  /** Short options that take no value. */
  flags: string;
  /** Short options that take a value (`-k2`, `-k 2`). */
  valued: string;
  /** Real options this simulator does not act on: a note, rather than a wrong result. */
  unsupported: string;
  /** Long name → short letter (or the long name itself) and whether it takes a value. */
  long: Record<string, { key: string; valued: boolean }>;
  unsupportedLong: string[];
}

type Parsed = { options: Array<{ key: string; value?: string }>; operands: string[] };

/** getopt_long as GNU tools use it: grouped flags (`-rn`), values attached or not, options after operands, `--`. */
function getopt(cmd: string, args: string[], spec: OptionSpec): Parsed | TextToolResult {
  const status = cmd === 'sort' ? 2 : 1;
  const fail = (...texts: string[]): TextToolResult => ({ lines: err(...texts), status });
  const options: Parsed['options'] = [];
  const operands: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') { operands.push(...args.slice(i + 1)); break; }
    if (arg.startsWith('--')) {
      const [name, inline] = arg.slice(2).split(/=(.*)/s, 2) as [string, string | undefined];
      // Own keys only: `--constructor` must not find Object's.
      const known = Object.prototype.hasOwnProperty.call(spec.long, name) ? spec.long[name] : undefined;
      if (!known) {
        if (spec.unsupportedLong.includes(name)) return notSimulated(cmd, `--${name}`);
        if (name === 'help') {
          return {
            lines: [{ text: `Sur un vrai système, ${cmd} --help affiche le mode d'emploi complet de ${cmd}. Ici, la page Référence en donne l'essentiel, avec des exemples à essayer.`, type: 'info' }],
            status: 0,
          };
        }
        return fail(`${cmd}: unrecognized option '${arg}'`, tryHelp(cmd));
      }
      if (known.valued) {
        const value = inline ?? args[i + 1];
        if (value === undefined) return fail(`${cmd}: option '--${name}' requires an argument`, tryHelp(cmd));
        if (inline === undefined) i++;
        options.push({ key: known.key, value });
      } else options.push({ key: known.key });
      continue;
    }
    if (!arg.startsWith('-') || arg === '-') { operands.push(arg); continue; }
    for (let j = 1; j < arg.length; j++) {
      const c = arg[j];
      if (spec.valued.includes(c)) {
        const value = j + 1 < arg.length ? arg.slice(j + 1) : args[i + 1];
        if (value === undefined) return fail(`${cmd}: option requires an argument -- '${c}'`, tryHelp(cmd));
        if (j + 1 >= arg.length) i++;
        options.push({ key: c, value });
        break;
      }
      if (spec.flags.includes(c)) { options.push({ key: c }); continue; }
      if (spec.unsupported.includes(c)) return notSimulated(cmd, `-${c}`);
      return fail(`${cmd}: invalid option -- '${c}'`, tryHelp(cmd));
    }
  }
  return { options, operands };
}

/** Reads the operands (`-` is standard input), GNU style: every file, or the error of the first one that fails. */
function readInputs(
  operands: string[],
  stdin: string | undefined,
  read: ReadText,
  failure: (path: string, why: 'missing' | 'directory') => string,
): { lines: string[] } | { error: string; path: string } {
  const names = operands.length ? operands : ['-'];
  const lines: string[] = [];
  for (const name of names) {
    if (name === '-') { lines.push(...textLines(stdin ?? '')); continue; }
    const file = read(name);
    if ('error' in file) return { error: failure(name, file.error), path: name };
    lines.push(...textLines(file.content));
  }
  return { lines };
}

// ─── sort ──────────────────────────────────────────────────────────────────

interface Ordering { blanks: boolean; dictionary: boolean; fold: boolean; numeric: boolean; human: boolean; reverse: boolean }
interface SortKey { startField: number; startChar: number; endField: number; endChar: number; hasEnd: boolean; ordering: Ordering; blanksAtEnd: boolean }

const ORDERING_LETTERS = 'bdfhnr';
const noOrdering = (): Ordering => ({ blanks: false, dictionary: false, fold: false, numeric: false, human: false, reverse: false });
const hasOrdering = (o: Ordering) => o.blanks || o.dictionary || o.fold || o.numeric || o.human || o.reverse;

function applyOrdering(o: Ordering, letter: string) {
  if (letter === 'b') o.blanks = true;
  else if (letter === 'd') o.dictionary = true;
  else if (letter === 'f') o.fold = true;
  else if (letter === 'h') o.human = true;
  else if (letter === 'n') o.numeric = true;
  else if (letter === 'r') o.reverse = true;
}

/** `-k2`, `-k2,2n`, `-k2.3`: a key, or GNU's message for a malformed one. */
function parseKey(spec: string): SortKey | string {
  const bad = (why: string) => `sort: ${why}: invalid field specification ‘${spec}’`;
  const start = spec.match(/^(\d+)(?:\.(\d+))?([A-Za-z]*)/);
  if (!start) return `sort: invalid number at field start: invalid count at start of ‘${spec}’`;
  const startField = parseInt(start[1], 10);
  if (startField === 0) return bad('field number is zero');
  if (start[2] !== undefined && parseInt(start[2], 10) === 0) return bad('character offset is zero');
  const ordering = noOrdering();
  let blanksAtEnd = false;
  for (const letter of start[3]) {
    if (!ORDERING_LETTERS.includes(letter)) return 'gMRVi'.includes(letter) ? `unsupported:${letter}` : bad('stray character in field spec');
    applyOrdering(ordering, letter);
  }
  let rest = spec.slice(start[0].length);
  let endField = 0;
  let endChar = 0;
  let hasEnd = false;
  if (rest.startsWith(',')) {
    const end = rest.match(/^,(\d+)(?:\.(\d+))?([A-Za-z]*)/);
    if (!end) return bad("invalid number after ','");
    endField = parseInt(end[1], 10);
    if (endField === 0) return bad('field number is zero');
    endChar = end[2] !== undefined ? parseInt(end[2], 10) : 0;
    for (const letter of end[3]) {
      if (!ORDERING_LETTERS.includes(letter)) return 'gMRVi'.includes(letter) ? `unsupported:${letter}` : bad('stray character in field spec');
      if (letter === 'b') blanksAtEnd = true;
      else applyOrdering(ordering, letter);
    }
    hasEnd = true;
    rest = rest.slice(end[0].length);
  }
  if (rest) return bad('stray character in field spec');
  return { startField, startChar: start[2] !== undefined ? parseInt(start[2], 10) : 1, endField, endChar, hasEnd, ordering, blanksAtEnd };
}

const isBlank = (c: string) => c === ' ' || c === '\t';

/** The part of `line` a key covers, as GNU sort's begfield and limfield find it. */
function keyText(line: string, key: SortKey, tab: string | undefined): string {
  const lim = line.length;
  // Start: skip startField - 1 fields, then startChar - 1 characters.
  let p = 0;
  for (let n = key.startField - 1; p < lim && n > 0; n--) {
    if (tab !== undefined) {
      while (p < lim && line[p] !== tab) p++;
      if (p < lim) p++;
    } else {
      while (p < lim && isBlank(line[p])) p++;
      while (p < lim && !isBlank(line[p])) p++;
    }
  }
  if (key.ordering.blanks) while (p < lim && isBlank(line[p])) p++;
  p = Math.min(lim, p + key.startChar - 1);
  if (!key.hasEnd) return line.slice(p);
  // End: past endField fields (the whole field when no character is given).
  let e = 0;
  let words = key.endChar === 0 ? key.endField : key.endField - 1;
  while (e < lim && words-- > 0) {
    if (tab !== undefined) {
      while (e < lim && line[e] !== tab) e++;
      if (e < lim && (words > 0 || key.endChar !== 0)) e++;
    } else {
      while (e < lim && isBlank(line[e])) e++;
      while (e < lim && !isBlank(line[e])) e++;
    }
  }
  if (key.endChar !== 0) {
    if (key.blanksAtEnd) while (e < lim && isBlank(line[e])) e++;
    e = Math.min(lim, e + key.endChar);
  }
  return e <= p ? '' : line.slice(p, e);
}

/** A number as `sort -n` reads it: blanks, an optional minus, digits (the thousands comma skipped) and a decimal point. */
function leadingNumber(text: string): { value: number; rest: string } {
  const m = text.match(/^[ \t]*(-?)(\d(?:\d|,(?=\d))*)?(?:\.(\d*))?/);
  const digits = (m?.[2] ?? '').replace(/,/g, '');
  const decimals = m?.[3] ?? '';
  if (!digits && !decimals) return { value: 0, rest: text };
  const value = parseFloat(`${digits || '0'}.${decimals || '0'}`) * (m![1] ? -1 : 1);
  return { value, rest: text.slice(m![0].length) };
}

const HUMAN_UNITS = 'KMGTPEZYRQ';

function compareKeyText(a: string, b: string, o: Ordering): number {
  if (o.numeric || o.human) {
    const x = leadingNumber(a);
    const y = leadingNumber(b);
    if (o.human) {
      const unit = (n: { value: number; rest: string }) => {
        // No suffix ranks below K: 500 < 1K (indexOf('') would give the rank of K).
        const suffix = (n.rest[0] ?? '').replace('k', 'K');
        const order = suffix ? HUMAN_UNITS.indexOf(suffix) + 1 : 0;
        return n.value < 0 ? -order : order;
      };
      const diff = unit(x) - unit(y);
      if (diff) return diff;
    }
    return x.value - y.value;
  }
  let x = a;
  let y = b;
  if (o.dictionary) { x = x.replace(/[^\p{L}\p{N} \t]/gu, ''); y = y.replace(/[^\p{L}\p{N} \t]/gu, ''); }
  if (o.fold) { x = x.toUpperCase(); y = y.toUpperCase(); }
  return compareLocale(x, y);
}

const SORT_SPEC: OptionSpec = {
  flags: 'bdfhnrusc',
  valued: 'kto',
  unsupported: 'gMRVzimSTC',
  long: {
    'ignore-leading-blanks': { key: 'b', valued: false }, 'dictionary-order': { key: 'd', valued: false },
    'ignore-case': { key: 'f', valued: false }, 'human-numeric-sort': { key: 'h', valued: false },
    'numeric-sort': { key: 'n', valued: false }, reverse: { key: 'r', valued: false }, unique: { key: 'u', valued: false },
    stable: { key: 's', valued: false }, key: { key: 'k', valued: true }, 'field-separator': { key: 't', valued: true },
    output: { key: 'o', valued: true },
  },
  unsupportedLong: [
    'general-numeric-sort', 'month-sort', 'random-sort', 'version-sort', 'zero-terminated', 'ignore-nonprinting',
    'merge', 'parallel', 'buffer-size', 'temporary-directory', 'compress-program', 'files0-from', 'debug', 'random-source', 'sort', 'check',
  ],
};

/** `sort` in GNU coreutils 9.4 (en_US.UTF-8). `stdin` is undefined when nothing is piped in. */
export function runSort(args: string[], stdin: string | undefined, read: ReadText): TextToolResult {
  const parsed = getopt('sort', args, SORT_SPEC);
  if ('status' in parsed) return parsed;
  const global = noOrdering();
  const keys: SortKey[] = [];
  let tab: string | undefined;
  let unique = false;
  let stable = false;
  let check = false;
  let output: string | undefined;
  for (const { key, value } of parsed.options) {
    if (key === 'k') {
      const k = parseKey(value!);
      if (typeof k === 'string') {
        if (k.startsWith('unsupported:')) return notSimulated('sort', `-k…${k.slice(12)}`);
        return { lines: err(k), status: 2 };
      }
      keys.push(k);
    } else if (key === 't') {
      if (value === '') return { lines: err('sort: empty tab'), status: 2 };
      if ([...value!].length > 1) return { lines: err(`sort: multi-character tab ‘${value}’`), status: 2 };
      tab = value;
    } else if (key === 'u') unique = true;
    else if (key === 's') stable = true;
    else if (key === 'c') check = true;
    else if (key === 'o') output = value;
    else applyOrdering(global, key);
  }
  // A key with no ordering letters of its own takes the global ones, -r included.
  for (const k of keys) if (!hasOrdering(k.ordering)) k.ordering = { ...global };
  if (!keys.length) keys.push({ startField: 1, startChar: 1, endField: 0, endChar: 0, hasEnd: false, ordering: { ...global }, blanksAtEnd: false });
  // Options are checked first: `sort -k x` fails before it would read anything.
  const waiting = waitsForKeyboard('sort', parsed.operands, stdin);
  if (waiting) return waiting;

  const input = readInputs(parsed.operands, stdin, read, (p, why) => why === 'missing'
    ? `sort: cannot read: ${p}: No such file or directory`
    : `sort: read failed: ${p}: Is a directory`);
  if ('error' in input) return { lines: err(input.error), status: 2 };

  const compareKeys = (a: string, b: string) => {
    for (const k of keys) {
      const diff = compareKeyText(keyText(a, k, tab), keyText(b, k, tab), k.ordering);
      if (diff) return k.ordering.reverse ? -diff : diff;
    }
    return 0;
  };
  // With every key equal, the whole lines decide, unless -s or -u; a global -r reverses that too.
  const compare = (a: string, b: string) => {
    const diff = compareKeys(a, b);
    if (diff || stable || unique) return diff;
    const last = compareLocale(a, b);
    return global.reverse ? -last : last;
  };

  if (check) {
    const name = parsed.operands[0] ?? '-';
    for (let i = 1; i < input.lines.length; i++) {
      const diff = compare(input.lines[i - 1], input.lines[i]);
      if (diff > 0 || (unique && diff === 0)) return { lines: err(`sort: ${name}:${i + 1}: disorder: ${input.lines[i]}`), status: 1 };
    }
    return { lines: [], status: 0 };
  }

  const sorted = [...input.lines].sort(compare);
  const result = unique ? sorted.filter((line, i) => i === 0 || compareKeys(sorted[i - 1], line) !== 0) : sorted;
  if (output !== undefined) return { lines: [], status: 0, writeTo: { path: output, lines: result } };
  return { lines: out(result), status: 0 };
}

// ─── uniq ──────────────────────────────────────────────────────────────────

const UNIQ_SPEC: OptionSpec = {
  flags: 'cdDui',
  valued: '',
  unsupported: 'fswz',
  long: {
    count: { key: 'c', valued: false }, repeated: { key: 'd', valued: false }, unique: { key: 'u', valued: false },
    'ignore-case': { key: 'i', valued: false },
  },
  unsupportedLong: ['all-repeated', 'group', 'skip-fields', 'skip-chars', 'check-chars', 'zero-terminated'],
};

/** `uniq` in GNU coreutils 9.4: neighbouring lines only, compared byte for byte (`-i` folds ASCII letters only). */
export function runUniq(args: string[], stdin: string | undefined, read: ReadText): TextToolResult {
  const parsed = getopt('uniq', args, UNIQ_SPEC);
  if ('status' in parsed) return parsed;
  const waiting = waitsForKeyboard('uniq', parsed.operands.slice(0, 1), stdin);
  if (waiting) return waiting;
  const has = (k: string) => parsed.options.some((o) => o.key === k);
  if (parsed.operands.length > 2) return { lines: err(`uniq: extra operand ‘${parsed.operands[2]}’`, tryHelp('uniq')), status: 1 };
  const [inputName, outputName] = parsed.operands;
  const input = readInputs(inputName ? [inputName] : [], stdin, read, (p, why) => why === 'missing'
    ? `uniq: ${p}: No such file or directory`
    : `uniq: error reading '${p}': Is a directory`);
  if ('error' in input) return { lines: err(input.error), status: 1 };

  const fold = (s: string) => (has('i') ? s.replace(/[A-Z]/g, (c) => c.toLowerCase()) : s);
  const groups: { lines: string[] }[] = [];
  for (const line of input.lines) {
    const last = groups[groups.length - 1];
    if (last && fold(last.lines[0]) === fold(line)) last.lines.push(line);
    else groups.push({ lines: [line] });
  }
  const repeated = has('d') || has('D');
  const result: string[] = [];
  for (const g of groups) {
    if (repeated && g.lines.length < 2) continue;
    if (has('u') && g.lines.length > 1) continue;
    if (has('D')) { result.push(...g.lines); continue; }
    result.push(has('c') ? `${String(g.lines.length).padStart(7)} ${g.lines[0]}` : g.lines[0]);
  }
  if (outputName !== undefined && outputName !== '-') {
    return { lines: [], status: 0, writeTo: { path: outputName, lines: result } };
  }
  return { lines: out(result), status: 0 };
}

// ─── cut ───────────────────────────────────────────────────────────────────

const CUT_SPEC: OptionSpec = {
  flags: 'sn',
  valued: 'bcfd',
  unsupported: 'z',
  long: {
    bytes: { key: 'b', valued: true }, characters: { key: 'c', valued: true }, fields: { key: 'f', valued: true },
    delimiter: { key: 'd', valued: true }, 'only-delimited': { key: 's', valued: false },
    complement: { key: 'complement', valued: false }, 'output-delimiter': { key: 'output-delimiter', valued: true },
  },
  unsupportedLong: ['zero-terminated'],
};

type Range = { from: number; to: number };

/** `1,3`, `2-`, `-3`, `2-4`: the ranges, or GNU's message. */
function parseList(list: string, fields: boolean): Range[] | string[] {
  const ranges: Range[] = [];
  for (let i = 0; i < list.length;) {
    const m = list.slice(i).match(/^(\d*)(-?)(\d*)/)!;
    const [whole, a, dash, b] = m;
    const next = list[i + whole.length];
    if (next !== undefined && next !== ',' ) {
      const bad = list.slice(i + whole.length);
      return [`cut: ${fields ? 'invalid field value' : 'invalid byte/character position'} ‘${bad}’`, tryHelp('cut')];
    }
    if (!a && !b) return [dash ? 'cut: invalid range with no endpoint: -' : `cut: ${fields ? 'fields' : 'byte/character positions'} are numbered from 1`, tryHelp('cut')];
    const from = a ? parseInt(a, 10) : 1;
    const to = dash ? (b ? parseInt(b, 10) : Infinity) : from;
    if (from === 0 || to === 0) return [`cut: ${fields ? 'fields' : 'byte/character positions'} are numbered from 1`, tryHelp('cut')];
    if (to < from) return ['cut: invalid decreasing range', tryHelp('cut')];
    ranges.push({ from, to });
    i += whole.length + 1;
  }
  return ranges;
}

const decoder = new TextDecoder();

/** `cut` in GNU coreutils 9.4, where `-c` counts bytes like `-b` (`cut -c1-5` on "Tâches" prints "Tâch"). */
export function runCut(args: string[], stdin: string | undefined, read: ReadText): TextToolResult {
  const parsed = getopt('cut', args, CUT_SPEC);
  if ('status' in parsed) return parsed;
  const fail = (...texts: string[]): TextToolResult => ({ lines: err(...texts), status: 1 });
  const lists = parsed.options.filter((o) => 'bcf'.includes(o.key) && o.key.length === 1);
  if (lists.length > 1 && new Set(lists.map((l) => l.key)).size > 1) return fail('cut: only one list may be specified', tryHelp('cut'));
  if (!lists.length) return fail('cut: you must specify a list of bytes, characters, or fields', tryHelp('cut'));
  const mode = lists[lists.length - 1].key;
  const fields = mode === 'f';
  const delimiter = parsed.options.filter((o) => o.key === 'd').pop()?.value;
  if (delimiter !== undefined && !fields) return fail('cut: an input delimiter may be specified only when operating on fields', tryHelp('cut'));
  // An empty delimiter (`-d ''`) is the NUL character for GNU cut.
  if (delimiter !== undefined && [...delimiter].length > 1) return fail('cut: the delimiter must be a single character', tryHelp('cut'));
  const ranges = parseList(lists[lists.length - 1].value!, fields);
  if (typeof ranges[0] === 'string') return fail(...(ranges as string[]));
  const complement = parsed.options.some((o) => o.key === 'complement');
  const onlyDelimited = parsed.options.some((o) => o.key === 's');
  const selected = (n: number) => (ranges as Range[]).some((r) => n >= r.from && n <= r.to) !== complement;

  const waiting = waitsForKeyboard('cut', parsed.operands, stdin);
  if (waiting) return waiting;
  const outputDelimiter = parsed.options.filter((o) => o.key === 'output-delimiter').pop()?.value;
  const cutLine = (line: string): string | undefined => {
    if (fields) {
      const sep = delimiter === '' ? '\0' : delimiter ?? '\t';
      if (!line.includes(sep)) return onlyDelimited ? undefined : line;
      return line.split(sep).filter((_, i) => selected(i + 1)).join(outputDelimiter ?? sep);
    }
    const parts: number[][] = [];
    utf8.encode(line).forEach((byte, i) => {
      if (!selected(i + 1)) return;
      const last = parts[parts.length - 1];
      // --output-delimiter goes between ranges that do not touch.
      if (last && (outputDelimiter === undefined || selected(i))) last.push(byte);
      else parts.push([byte]);
    });
    return parts.map((p) => decoder.decode(new Uint8Array(p))).join(outputDelimiter ?? '');
  };

  // Like GNU cut, each file in turn: a missing one is reported and the others still print.
  const lines: OutputLine[] = [];
  let status = 0;
  for (const name of parsed.operands.length ? parsed.operands : ['-']) {
    let text: string;
    if (name === '-') text = stdin ?? '';
    else {
      const file = read(name);
      if ('error' in file) {
        lines.push(...err(`cut: ${name}: ${file.error === 'missing' ? 'No such file or directory' : 'Is a directory'}`));
        status = 1;
        continue;
      }
      text = file.content;
    }
    for (const line of textLines(text)) {
      const kept = cutLine(line);
      if (kept !== undefined) lines.push({ text: kept, type: 'output' });
    }
  }
  return { lines, status };
}

// ─── PowerShell ────────────────────────────────────────────────────────────

/** Parameters as PowerShell 7.6 lists them (`(Get-Command Sort-Object).Parameters`, 2 October 2026). */
export const SORT_OBJECT: PsCmdlet = {
  name: 'Sort-Object',
  own: [
    { name: 'Stable' }, { name: 'Descending' }, { name: 'Unique' }, { name: 'Top', type: 'System.Int32' },
    { name: 'Bottom', type: 'System.Int32' }, { name: 'InputObject', type: 'System.Management.Automation.PSObject' },
    { name: 'Property', type: 'System.Object[]' }, { name: 'Culture', type: 'System.String' }, { name: 'CaseSensitive' },
  ],
  positions: ['Property'],
};

export const GET_UNIQUE: PsCmdlet = {
  name: 'Get-Unique',
  own: [
    { name: 'InputObject', type: 'System.Management.Automation.PSObject' }, { name: 'AsString' }, { name: 'OnType' },
    { name: 'CaseInsensitive' },
  ],
  positions: [],
};

export const GROUP_OBJECT: PsCmdlet = {
  name: 'Group-Object',
  own: [
    { name: 'NoElement' }, { name: 'AsHashTable', aliases: ['AHT'] }, { name: 'AsString' },
    { name: 'InputObject', type: 'System.Management.Automation.PSObject' }, { name: 'Property', type: 'System.Object[]' },
    { name: 'Culture', type: 'System.String' }, { name: 'CaseSensitive' },
  ],
  positions: ['Property'],
};

/** .NET's comparison in the en-US culture: punctuation counts, case does not (unless -CaseSensitive). */
const psIgnoreCase = new Intl.Collator('en-US', { sensitivity: 'accent' });
const psCaseSensitive = new Intl.Collator('en-US', { sensitivity: 'variant', caseFirst: 'lower' });

const psFail = (line: OutputLine): TextToolResult => ({ lines: [line], status: 1 });

/**
 * `Sort-Object` on lines of text (`Get-Content f | Sort-Object`). Ties keep
 * their input order: true of PowerShell's sort up to 16 lines, which is all a
 * lesson file holds (beyond that, .NET's introsort may swap lines that differ
 * only by case).
 */
export function psSortLines(args: string[], lines: string[]): TextToolResult {
  const parsed = parsePsArgs(SORT_OBJECT, args);
  if (!('switches' in parsed)) return psFail(parsed);
  // A property of plain text lines (`Sort-Object Length`) is not simulated: say so rather than sort by the text.
  const note = psNotSimulated(SORT_OBJECT, parsed, ['Property', 'Culture', 'InputObject']);
  if (note) return { lines: note, status: 0 };
  const collator = parsed.switches.has('CaseSensitive') ? psCaseSensitive : psIgnoreCase;
  const direction = parsed.switches.has('Descending') ? -1 : 1;
  let sorted = [...lines].sort((a, b) => direction * collator.compare(a, b));
  if (parsed.switches.has('Unique')) sorted = sorted.filter((line, i) => !sorted.slice(0, i).some((s) => collator.compare(s, line) === 0));
  return { lines: out(topOrBottom(parsed, sorted)), status: 0 };
}

function topOrBottom(parsed: PsArgs, rows: string[]): string[] {
  if (parsed.values.Top !== undefined) return rows.slice(0, parseInt(parsed.values.Top, 10) || 0);
  if (parsed.values.Bottom !== undefined) return rows.slice(Math.max(0, rows.length - (parseInt(parsed.values.Bottom, 10) || 0)));
  return rows;
}

/** `Get-Unique`: drops a line equal to the one before it, case included unless -CaseInsensitive. */
export function psGetUnique(args: string[], lines: string[]): TextToolResult {
  const parsed = parsePsArgs(GET_UNIQUE, args);
  if (!('switches' in parsed)) return psFail(parsed);
  const note = psNotSimulated(GET_UNIQUE, parsed, ['InputObject']);
  if (note) return { lines: note, status: 0 };
  const same = parsed.switches.has('CaseInsensitive') ? (a: string, b: string) => psIgnoreCase.compare(a, b) === 0 : (a: string, b: string) => a === b;
  return { lines: out(lines.filter((line, i) => i === 0 || !same(lines[i - 1], line))), status: 0 };
}

/**
 * `Group-Object` on lines of text: one row per distinct line (case ignored),
 * groups in sorted order, formatted as PowerShell 7.6's table.
 */
export function psGroupLines(args: string[], lines: string[]): TextToolResult {
  const parsed = parsePsArgs(GROUP_OBJECT, args);
  if (!('switches' in parsed)) return psFail(parsed);
  const note = psNotSimulated(GROUP_OBJECT, parsed, ['Property', 'AsHashTable', 'Culture', 'InputObject']);
  if (note) return { lines: note, status: 0 };
  const collator = parsed.switches.has('CaseSensitive') ? psCaseSensitive : psIgnoreCase;
  const groups: string[][] = [];
  for (const line of lines) {
    const group = groups.find((g) => collator.compare(g[0], line) === 0);
    if (group) group.push(line);
    else groups.push([line]);
  }
  groups.sort((a, b) => collator.compare(a[0], b[0]));
  if (!groups.length) return { lines: [], status: 0 };
  const name = (s: string) => (s.length > 25 ? `${s.slice(0, 24)}…` : s);
  const rows = parsed.switches.has('NoElement')
    ? ['Count Name', '----- ----', ...groups.map((g) => `${String(g.length).padStart(5)} ${name(g[0])}`)]
    : ['Count Name                      Group', '----- ----                      -----',
      ...groups.map((g) => `${String(g.length).padStart(5)} ${name(g[0]).padEnd(25)} {${g.join(', ')}}`)];
  return { lines: out(['', ...rows, '']), status: 0 };
}
