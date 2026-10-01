import type { OutputLine } from './types';

/** A cmdlet parameter; `type` (the .NET type PowerShell names in its errors) marks one that takes a value. */
export type PsParam = { name: string; aliases?: string[]; type?: string };

const STRING_ARRAY = 'System.String[]';

/**
 * The parameters every cmdlet has, in the order PowerShell 7.6 lists them
 * (checked on 1 October 2026 with `(Get-Command <cmdlet>).Parameters`).
 */
const PS_COMMON_PARAMS: PsParam[] = [
  { name: 'Verbose', aliases: ['vb'] }, { name: 'Debug', aliases: ['db'] },
  ...['ErrorAction:ea', 'WarningAction:wa', 'InformationAction:infa', 'ProgressAction:proga']
    .map((s) => ({ name: s.split(':')[0], aliases: [s.split(':')[1]], type: 'System.Management.Automation.ActionPreference' })),
  ...['ErrorVariable:ev', 'WarningVariable:wv', 'InformationVariable:iv', 'OutVariable:ov']
    .map((s) => ({ name: s.split(':')[0], aliases: [s.split(':')[1]], type: 'System.String' })),
  { name: 'OutBuffer', aliases: ['ob'], type: 'System.Int32' }, { name: 'PipelineVariable', aliases: ['pv'], type: 'System.String' },
];
/** Added to the common ones by cmdlets that change something. */
const SHOULD_PROCESS_PARAMS: PsParam[] = [{ name: 'WhatIf', aliases: ['wi'] }, { name: 'Confirm', aliases: ['cf'] }];

/** A cmdlet's parameters in the three tiers PowerShell resolves a shortened name through. */
export interface PsCmdlet {
  name: string;
  /** Its own parameters, in declaration order. */
  own: PsParam[];
  /** -WhatIf and -Confirm. */
  shouldProcess?: boolean;
  /** Those the file system adds (dynamic parameters), tried last. */
  fileSystem?: PsParam[];
  /** The parameters bare words bind to, in order (`Copy-Item a b` is -Path a -Destination b). */
  positions: string[];
}

const PATH_PARAMS: PsParam[] = [
  { name: 'Path', type: STRING_ARRAY }, { name: 'LiteralPath', aliases: ['PSPath', 'LP'], type: STRING_ARRAY },
];
const FILTER_PARAMS: PsParam[] = [
  { name: 'Filter', type: 'System.String' }, { name: 'Include', type: STRING_ARRAY }, { name: 'Exclude', type: STRING_ARRAY },
];
const CREDENTIAL: PsParam = { name: 'Credential', type: 'System.Management.Automation.PSCredential' };

export const GET_CHILD_ITEM: PsCmdlet = {
  name: 'Get-ChildItem',
  own: [
    ...PATH_PARAMS, ...FILTER_PARAMS,
    { name: 'Recurse', aliases: ['s', 'r'] }, { name: 'Depth', type: 'System.UInt32' }, { name: 'Force' }, { name: 'Name' },
  ],
  fileSystem: [
    { name: 'Attributes', type: 'System.Management.Automation.FlagsExpression`1[System.IO.FileAttributes]' }, { name: 'FollowSymlink' },
    { name: 'Directory', aliases: ['ad'] }, { name: 'File', aliases: ['af'] }, { name: 'Hidden', aliases: ['ah', 'h'] },
    { name: 'ReadOnly', aliases: ['ar'] }, { name: 'System', aliases: ['as'] },
  ],
  positions: ['Path', 'Filter'],
};

export const REMOVE_ITEM: PsCmdlet = {
  name: 'Remove-Item',
  own: [...PATH_PARAMS, ...FILTER_PARAMS, { name: 'Recurse' }, { name: 'Force' }, CREDENTIAL],
  shouldProcess: true,
  fileSystem: [{ name: 'Stream', type: STRING_ARRAY }],
  positions: ['Path'],
};

export const COPY_ITEM: PsCmdlet = {
  name: 'Copy-Item',
  own: [
    ...PATH_PARAMS, { name: 'Destination', type: 'System.String' }, { name: 'Container' }, { name: 'Force' },
    ...FILTER_PARAMS, { name: 'Recurse' }, { name: 'PassThru' }, CREDENTIAL,
  ],
  shouldProcess: true,
  fileSystem: [
    { name: 'FromSession', type: 'System.Management.Automation.Runspaces.PSSession' },
    { name: 'ToSession', type: 'System.Management.Automation.Runspaces.PSSession' },
  ],
  positions: ['Path', 'Destination'],
};

export const MOVE_ITEM: PsCmdlet = {
  name: 'Move-Item',
  own: [...PATH_PARAMS, { name: 'Destination', type: 'System.String' }, { name: 'Force' }, ...FILTER_PARAMS, { name: 'PassThru' }, CREDENTIAL],
  shouldProcess: true,
  positions: ['Path', 'Destination'],
};

/**
 * The parameter a typed `-name` binds to, or the error PowerShell 7.6 gives:
 * an exact name or alias first, then a prefix among the cmdlet's own
 * parameters (`-d` is Get-ChildItem's -Depth, `-f` is ambiguous between
 * -Filter and -Force), then the common ones (`-ea`), then the file system's
 * (`-a` is ambiguous between six of Get-ChildItem's).
 */
export function resolvePsParam(cmdlet: PsCmdlet, typed: string): PsParam | string {
  const t = typed.toLowerCase();
  const common = [...PS_COMMON_PARAMS, ...(cmdlet.shouldProcess ? SHOULD_PROCESS_PARAMS : [])];
  const fileSystem = cmdlet.fileSystem ?? [];
  const exact = [...cmdlet.own, ...common, ...fileSystem].find((p) => [p.name, ...(p.aliases ?? [])].some((n) => n.toLowerCase() === t));
  if (exact) return exact;
  // Name matches are listed before alias matches (`-p`: Path, ProgressAction, PipelineVariable, LiteralPath).
  const matching = (tier: PsParam[]) => [
    ...tier.filter((p) => p.name.toLowerCase().startsWith(t)),
    ...tier.filter((p) => !p.name.toLowerCase().startsWith(t) && (p.aliases ?? []).some((a) => a.toLowerCase().startsWith(t))),
  ];
  const ambiguous = (list: PsParam[]) => `Parameter cannot be processed because the parameter name '${typed}' is ambiguous. Possible matches include: ${list.map((p) => `-${p.name}`).join(' ')}.`;
  const own = matching(cmdlet.own);
  if (own.length === 1) return own[0];
  if (own.length > 1) return ambiguous(matching([...cmdlet.own, ...common]));
  const shared = matching(common);
  if (shared.length === 1) return shared[0];
  if (shared.length > 1) return ambiguous(shared);
  const dynamic = matching(fileSystem);
  if (dynamic.length === 1) return dynamic[0];
  if (dynamic.length > 1) return ambiguous(dynamic);
  return `A parameter cannot be found that matches parameter name '${typed}'.`;
}

/**
 * The note shown for a parameter this simulator does not act on, rather than
 * quietly ignoring it; null when none of `names` was given.
 */
export function psNotSimulated(cmdlet: PsCmdlet, parsed: PsArgs, names: string[]): OutputLine[] | null {
  const given = names.find((n) => parsed.switches.has(n) || parsed.values[n] !== undefined);
  return given ? [{ text: `Le paramètre -${given} de ${cmdlet.name} n'est pas simulé dans ce terminal d'entraînement.`, type: 'info' }] : null;
}

export interface PsArgs {
  /** Switches given, by their full name. */
  switches: Set<string>;
  /** Values given by name or by position, by the parameter's full name; a list stays `a.txt,b.txt` (see psList). */
  values: Record<string, string>;
}

/** The items of a list value: `Remove-Item a.txt, b.txt` removes both. */
export const psList = (value: string | undefined): string[] =>
  value === undefined ? [] : value.split(',').map((v) => v.trim()).filter(Boolean);

/**
 * Binds a cmdlet's arguments as PowerShell 7.6 does (checked on 1 October
 * 2026): `-Path docs` and `-Path:docs` alike, bare words to the cmdlet's
 * positions, `a.txt, b.txt` as one list, everything after `--` as bare
 * words. Otherwise, the error line PowerShell prints (`Remove-Item: A
 * parameter cannot be found that matches parameter name 'rf'.`, or `A
 * positional parameter cannot be found that accepts argument 'b.txt'.` for
 * `rm a.txt b.txt`).
 */
export function parsePsArgs(cmdlet: PsCmdlet, typedArgs: string[]): PsArgs | OutputLine {
  const fail = (text: string): OutputLine => ({ text: `${cmdlet.name}: ${text}`, type: 'error' });
  // `a.txt, b.txt`, `a.txt ,b.txt` and `a.txt , b.txt` are one argument.
  const args: string[] = [];
  for (const arg of typedArgs) {
    const last = args.length - 1;
    if (last >= 0 && (args[last].endsWith(',') || arg.startsWith(','))) args[last] += arg;
    else args.push(arg);
  }
  const parsed: PsArgs = { switches: new Set(), values: {} };
  const bare: string[] = [];
  let endOfParameters = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--' && !endOfParameters) { endOfParameters = true; continue; }
    if (endOfParameters || !arg.startsWith('-') || arg === '-') { bare.push(arg); continue; }
    const colon = arg.indexOf(':');
    const typed = colon > 0 ? arg.slice(1, colon) : arg.slice(1);
    const inline = colon > 0 ? arg.slice(colon + 1) : undefined;
    const param = resolvePsParam(cmdlet, typed);
    if (typeof param === 'string') return fail(param);
    if (param.type) {
      const value = inline || args[i + 1];
      if (value === undefined) return fail(`Missing an argument for parameter '${param.name}'. Specify a parameter of type '${param.type}' and try again.`);
      parsed.values[param.name] = value;
      if (!inline) i++;
    } else if (!/^\$false$/i.test(inline ?? '')) {
      // `-Force:$false` turns the switch off.
      parsed.switches.add(param.name);
    }
  }
  // A position is free unless its parameter was named (-LiteralPath takes the place of -Path).
  const free = cmdlet.positions.filter((p) => parsed.values[p] === undefined && !(p === 'Path' && parsed.values.LiteralPath !== undefined));
  for (const [i, word] of bare.entries()) {
    if (i >= free.length) return fail(`A positional parameter cannot be found that accepts argument '${word}'.`);
    parsed.values[free[i]] = word;
  }
  return parsed;
}
