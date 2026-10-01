import type { TerminalState, TerminalEnv, CommandOutput, OutputLine, DirectoryNode } from './types';
import { dotnetDateFormat, psDefaultDate, strftime } from './dateFormat';

export interface WindowsCmdDeps {
  cmdPwd: (state: TerminalState, env: TerminalEnv) => OutputLine[];
  cmdCd: (state: TerminalState, args: string[], env?: TerminalEnv) => { lines: OutputLine[]; newCwd?: string[] };
  cmdLs: (state: TerminalState, args: string[]) => OutputLine[];
  /** Get-ChildItem as PowerShell prints it (a table per folder). */
  childItems: (state: TerminalState, args: string[]) => OutputLine[];
  cmdCat: (state: TerminalState, args: string[]) => OutputLine[];
  cmdMkdir: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode };
  cmdTouch: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode };
  cmdCp: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode };
  cmdMv: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode; newCwd?: string[] };
  cmdRm: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode };
  cmdEcho: (args: string[]) => OutputLine[];
  cmdGrep: (state: TerminalState, args: string[]) => OutputLine[];
  cmdEnv: (state: TerminalState) => OutputLine[];
  /** Content of a file, or why it cannot be read. */
  readFile: (state: TerminalState, path: string) => { content: string } | { error: 'missing' | 'directory' };
  /** Writes (or appends to) a file; `errors` explains a refusal. */
  writeFile: (state: TerminalState, path: string, content: string, append: boolean, cmdlet?: string) => { root: DirectoryNode; errors: OutputLine[] };
  /** Absolute Windows form of a path, as PowerShell messages show it (`C:\Users\user\documents\x.txt`). */
  winPath: (state: TerminalState, path: string) => string;
}

/** Parameters Get-Content understands here, and whether each takes a value. */
const GET_CONTENT_PARAMS: Record<string, boolean> = {
  '-path': true, '-literalpath': true, '-totalcount': true, '-head': true, '-first': true,
  '-tail': true, '-last': true, '-encoding': true, '-raw': false, '-wait': false,
};

/** Get-Content (and its aliases cat, type, gc) with the parameters and messages of PowerShell 7. */
function getContent(state: TerminalState, args: string[], deps: WindowsCmdDeps): OutputLine[] {
  const fail = (text: string): OutputLine[] => [{ text, type: 'error' }];
  let file: string | undefined;
  let head: number | undefined;
  let tail: number | undefined;
  for (let i = 0; i < args.length; i++) {
    const name = args[i].toLowerCase();
    if (!name.startsWith('-')) {
      file ??= args[i];
      continue;
    }
    if (!(name in GET_CONTENT_PARAMS)) {
      return fail(`Get-Content: A parameter cannot be found that matches parameter name '${args[i].slice(1)}'.`);
    }
    if (!GET_CONTENT_PARAMS[name]) continue;
    const value = args[++i];
    if (name === '-path' || name === '-literalpath') file = value;
    else if (['-totalcount', '-head', '-first'].includes(name)) head = parseInt(value ?? '', 10);
    else if (name === '-tail' || name === '-last') tail = parseInt(value ?? '', 10);
  }
  if (!file) return fail('Get-Content: Cannot process command because of one or more missing mandatory parameters: Path.');
  const read = deps.readFile(state, file);
  if ('error' in read) {
    return fail(read.error === 'missing'
      ? `Get-Content: Cannot find path '${deps.winPath(state, file)}' because it does not exist.`
      : `Get-Content: Unable to get content because it is a directory: '${deps.winPath(state, file)}'. Please use 'Get-ChildItem' instead.`);
  }
  // PowerShell returns the lines without a final empty one for a trailing newline.
  let lines = read.content.split('\n');
  if (read.content.endsWith('\n')) lines.pop();
  if (head !== undefined && !Number.isNaN(head)) lines = lines.slice(0, Math.max(0, head));
  if (tail !== undefined && !Number.isNaN(tail)) lines = tail > 0 ? lines.slice(-tail) : [];
  return lines.map((text) => ({ text, type: 'output' as const }));
}

/** Set-Content / Add-Content: `Set-Content file 'text'` or `-Path file -Value text`. */
function setContent(state: TerminalState, cmdlet: string, args: string[], append: boolean, deps: WindowsCmdDeps): CommandOutput {
  const named = (names: string[]) => {
    const i = args.findIndex((a) => names.includes(a.toLowerCase()));
    return i >= 0 ? args[i + 1] : undefined;
  };
  // Values of named parameters are not positional; switches (-Force, -NoNewline) take no value.
  const takesValue = ['-path', '-literalpath', '-value', '-encoding'];
  const positional = args.filter((a, i) => !a.startsWith('-') && !(i > 0 && takesValue.includes(args[i - 1].toLowerCase())));
  const file = named(['-path', '-literalpath']) ?? positional.shift();
  const value = named(['-value']) ?? positional.shift() ?? '';
  if (!file) {
    return { lines: [{ text: `${cmdlet}: Cannot process command because of one or more missing mandatory parameters: Path.`, type: 'error' }], newState: state };
  }
  // Files here hold their text without a final newline; appending adds the line break.
  const { root, errors } = deps.writeFile(state, file, value, append, cmdlet);
  return { lines: errors, newState: errors.length ? state : { ...state, root } };
}

/** Get-History: the same Id / Duration / CommandLine table as PowerShell 7. */
function getHistory(state: TerminalState): OutputLine[] {
  // The command being run is not in PowerShell's history yet; our history already holds it.
  const past = state.commandHistory.slice(0, -1);
  if (!past.length) return [];
  const row = (id: string, duration: string, line: string) => `${id.padStart(4)} ${duration.padStart(12)} ${line}`;
  return [
    '',
    row('Id', 'Duration', 'CommandLine'),
    row('--', '--------', '-----------'),
    ...past.map((c, i) => row(String(i + 1), '0.010', c)),
    '',
  ].map((text) => ({ text, type: 'output' as const }));
}

/** `-Recurse`, or any prefix PowerShell accepts for it (`-r`, `-rec`…). */
const RECURSE_PARAM = /^-r(e(c(u(r(se?)?)?)?)?)?$/i;

const EXECUTION_POLICIES = ['Restricted', 'AllSigned', 'RemoteSigned', 'Unrestricted', 'Bypass', 'Undefined', 'Default'];

/** Value that follows a PowerShell parameter (`-Verb RunAs`), case-insensitive. */
function psParam(args: string[], name: string): string | undefined {
  const i = args.findIndex((a) => a.toLowerCase() === name);
  return i >= 0 ? args[i + 1] : undefined;
}

/** `-Path x`, `-LiteralPath x`, or the first positional argument. */
function psPath(args: string[]): string | undefined {
  const i = args.findIndex((a) => ['-path', '-literalpath'].includes(a.toLowerCase()));
  return i >= 0 ? args[i + 1] : args.find((a) => !a.startsWith('-'));
}

/** `Copy-Item a b`, or `-Path a -Destination b` in any order → `[a, b]`. */
function psSourceAndDestination(args: string[]): string[] {
  const NAMED = ['-path', '-literalpath', '-destination'];
  const valueOf = (names: string[]) => {
    const i = args.findIndex((a) => names.includes(a.toLowerCase()));
    return i >= 0 ? args[i + 1] : undefined;
  };
  const positional = args.filter((a, i) => !a.startsWith('-') && !(i > 0 && NAMED.includes(args[i - 1].toLowerCase())));
  const source = valueOf(['-path', '-literalpath']) ?? positional.shift();
  const destination = valueOf(['-destination']) ?? positional.shift();
  return [source, destination].filter((a): a is string => a !== undefined);
}

/**
 * The shared file commands answer like GNU tools; under PowerShell the same
 * failure reads differently. These are PowerShell 7.6's messages (en-US,
 * checked on 1 October 2026), with the full Windows path it shows.
 */
function psErrors(cmdlet: string, lines: OutputLine[], state: TerminalState, env: TerminalEnv, deps: WindowsCmdDeps): OutputLine[] {
  if (env !== 'windows') return lines;
  const win = (p: string) => deps.winPath(state, p);
  const err = (text: string): OutputLine => ({ text, type: 'error' });
  return lines.map((l) => {
    if (l.type !== 'error') return l;
    let m: RegExpMatchArray | null;
    if ((m = l.text.match(/cannot create directory '(.+)': File exists$/))) return err(`New-Item: An item with the specified name ${win(m[1])} already exists.`);
    if ((m = l.text.match(/^(?:mv|cp): cannot stat '(.+)': No such file or directory$/) ?? l.text.match(/^rm: cannot remove '(.+)': No such file or directory$/))) {
      return err(`${cmdlet}: Cannot find path '${win(m[1])}' because it does not exist.`);
    }
    if ((m = l.text.match(/^touch: cannot touch '(.+)': No such file or directory$/))) return err(`New-Item: Could not find a part of the path '${win(m[1])}'.`);
    if (/^mv: cannot move '.+' to '.+': No such file or directory$/.test(l.text)) return err('Move-Item: Could not find a part of the path.');
    if ((m = l.text.match(/^cd: (.+): No such file or directory$/))) return err(`Set-Location: Cannot find path '${win(m[1])}' because it does not exist.`);
    return l;
  });
}

/**
 * Handles PowerShell aliases and Windows/macOS-specific commands.
 * Returns null if the command is not handled by this module (caller falls through to default).
 */
export function handleWindows(
  cmd: string,
  args: string[],
  newState: TerminalState,
  env: TerminalEnv,
  deps: WindowsCmdDeps,
): CommandOutput | null {
  switch (cmd) {
    // ── pwd equivalents ───────────────────────────────────────────────────────
    case 'get-location':
    case 'gl':
      return { lines: deps.cmdPwd(newState, env), newState };

    // ── cd equivalents ────────────────────────────────────────────────────────
    case 'set-location':
    case 'sl': {
      const { lines, newCwd } = deps.cmdCd(newState, args, env);
      if (newCwd) newState = { ...newState, cwd: newCwd, previousCwd: newState.cwd };
      return { lines: psErrors('Set-Location', lines, newState, env, deps), newState };
    }

    // ── ls equivalents ────────────────────────────────────────────────────────
    case 'get-childitem':
    case 'gci':
    case 'dir':
      if (args[0]?.toLowerCase() === 'env:') {
        return { lines: deps.cmdEnv(newState), newState };
      }
      return { lines: env === 'windows' ? deps.childItems(newState, args) : deps.cmdLs(newState, args), newState };

    // ── Get-Item: the item itself (not its content), or a "cannot find path" error ──
    case 'get-item':
    case 'gi': {
      if (env !== 'windows') return null;
      const target = psPath(args);
      if (!target) return { lines: [{ text: 'Get-Item: indiquez un chemin, par exemple Get-Item documents', type: 'error' }], newState };
      if (deps.cmdLs(newState, [target]).some((l) => l.type === 'error')) {
        const cwd = deps.cmdPwd(newState, env)[0]?.text ?? '';
        const full = /^([a-z]:|[\\/~])/i.test(target) ? target : `${cwd}\\${target.replace(/\//g, '\\')}`;
        return { lines: [{ text: `Get-Item: Cannot find path '${full}' because it does not exist.`, type: 'error' }], newState };
      }
      return { lines: [{ text: target, type: 'output' }], newState };
    }

    // ── Start-Process: opens a program in a new window (nothing to show here) ──
    case 'start-process':
    case 'saps':
    case 'start': {
      if (env !== 'windows') return null;
      const program = psParam(args, '-filepath') ?? args.find((a) => !a.startsWith('-'));
      if (!program) return { lines: [{ text: 'Start-Process: indiquez un programme, par exemple Start-Process notepad', type: 'error' }], newState };
      const asAdmin = args.some((a) => a.toLowerCase() === '-verb') && /runas/i.test(psParam(args, '-verb') ?? '');
      return {
        lines: [{
          text: asAdmin
            ? `(Windows demanderait une confirmation (UAC), puis ouvrirait « ${program} » en administrateur dans une nouvelle fenêtre.)`
            : `(« ${program} » s'ouvrirait dans une nouvelle fenêtre.)`,
          type: 'info',
        }],
        newState,
      };
    }

    // ── cat equivalents ───────────────────────────────────────────────────────
    case 'get-content':
    case 'gc':
      return { lines: getContent(newState, args, deps), newState };

    // (No `sc` alias: in PowerShell 7 `sc` runs sc.exe, the service tool.)
    case 'set-content':
    case 'add-content': {
      if (env !== 'windows') return null;
      const append = cmd === 'add-content';
      return setContent(newState, append ? 'Add-Content' : 'Set-Content', args, append, deps);
    }

    // ── date, history, scheduled tasks ────────────────────────────────────────
    case 'get-date': {
      if (env !== 'windows') return null;
      const now = new Date();
      const format = psParam(args, '-format');
      const uformat = psParam(args, '-uformat');
      const text = format !== undefined ? dotnetDateFormat(now, format) : uformat !== undefined ? strftime(now, uformat) : psDefaultDate(now);
      return { lines: [{ text, type: 'output' }], newState };
    }

    case 'get-history':
    case 'ghy':
      if (env !== 'windows') return null;
      return { lines: getHistory(newState), newState };

    case 'get-scheduledtask': {
      if (env !== 'windows') return null;
      const row = (path: string, name: string, state: string) => `${path.padEnd(47)}${name.padEnd(34)}${state}`;
      return {
        lines: [
          '',
          row('TaskPath', 'TaskName', 'State'),
          row('--------', '--------', '-----'),
          row('\\', 'Sauvegarde du soir', 'Ready'),
          row('\\Microsoft\\Windows\\Defrag\\', 'ScheduledDefrag', 'Ready'),
          row('\\Microsoft\\Windows\\WindowsUpdate\\', 'Scheduled Start', 'Ready'),
          '',
        ].map((text) => ({ text, type: 'output' as const })),
        newState,
      };
    }

    case 'tasklist': {
      if (env !== 'windows') return null;
      const row = (image: string, pid: string, session: string, num: string, mem: string) =>
        `${image.padEnd(25)} ${pid.padStart(8)} ${session.padEnd(16)} ${num.padStart(11)} ${mem.padStart(12)}`;
      return {
        lines: [
          '',
          row('Image Name', 'PID', 'Session Name', 'Session#', 'Mem Usage'),
          row('='.repeat(25), '='.repeat(8), '='.repeat(16), '='.repeat(11), '='.repeat(12)),
          row('System Idle Process', '0', 'Services', '0', '8 K'),
          row('System', '4', 'Services', '0', '7,484 K'),
          row('WindowsTerminal.exe', '1234', 'Console', '1', '8,192 K'),
          row('node.exe', '2048', 'Console', '1', '4,096 K'),
          row('pwsh.exe', '5678', 'Console', '1', '2,048 K'),
        ].map((text) => ({ text, type: 'output' as const })),
        newState,
      };
    }

    // ── New-Item: file or directory ───────────────────────────────────────────
    case 'new-item':
    case 'ni': {
      // The value of a named parameter is not the path: in
      // `New-Item -ItemType Directory .github/workflows` the path is the last word.
      const NAMED = ['-name', '-path', '-itemtype', '-type', '-value'];
      const valueOf = (names: string[]) => {
        const i = args.findIndex((a) => names.includes(a.toLowerCase()));
        return i >= 0 ? args[i + 1] : undefined;
      };
      const isDir = valueOf(['-itemtype', '-type'])?.toLowerCase() === 'directory';
      const positional = args.find((a, i) => !a.startsWith('-') && !(i > 0 && NAMED.includes(args[i - 1].toLowerCase())));
      const path = valueOf(['-path']) ?? positional;
      const leaf = valueOf(['-name']);
      const name = path && leaf ? `${path}/${leaf}` : leaf ?? path;
      if (!name) return { lines: [{ text: 'New-Item: -Name ou chemin requis', type: 'error' }], newState };
      if (isDir) {
        const { lines, newRoot } = deps.cmdMkdir(newState, [name]);
        if (newRoot) newState = { ...newState, root: newRoot };
        return { lines: psErrors('New-Item', lines, newState, env, deps), newState };
      }
      // Unlike touch, New-Item refuses a file that is already there.
      if (env === 'windows' && 'content' in deps.readFile(newState, name)) {
        return { lines: [{ text: `New-Item: The file '${deps.winPath(newState, name)}' already exists.`, type: 'error' }], newState };
      }
      const { lines, newRoot } = deps.cmdTouch(newState, [name]);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines: psErrors('New-Item', lines, newState, env, deps), newState };
    }

    // ── cp equivalents ────────────────────────────────────────────────────────
    case 'copy-item':
    case 'cpi':
    case 'copy': {
      const cpArgs = psSourceAndDestination(args);
      // -Recurse copies a folder with its content, like `cp -r`.
      const recurse = args.some((a) => RECURSE_PARAM.test(a));
      const { lines, newRoot } = deps.cmdCp(newState, [...(recurse ? ['-r'] : []), '--', ...cpArgs]);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines: psErrors('Copy-Item', lines, newState, env, deps), newState };
    }

    // ── mv equivalents ────────────────────────────────────────────────────────
    case 'move-item':
    case 'mi':
    case 'move': {
      const mvArgs = psSourceAndDestination(args);
      const [source, destination] = mvArgs;
      if (env === 'windows' && source !== undefined && destination !== undefined) {
        const read = (p: string) => deps.readFile(newState, p);
        const isFile = (p: string) => 'content' in read(p);
        const is = (p: string, error: 'missing' | 'directory') => { const r = read(p); return 'error' in r && r.error === error; };
        // Move-Item does not overwrite a file without -Force.
        if (isFile(source) && isFile(destination) && !args.some((a) => /^-force$/i.test(a))) {
          return { lines: [{ text: 'Move-Item: Cannot create a file when that file already exists.', type: 'error' }], newState };
        }
        // A missing `dir/` in an existing folder is no folder to move into: PowerShell renames the file to `dir`.
        const bare = destination.replace(/[\\/]+$/, '');
        const cut = Math.max(bare.lastIndexOf('/'), bare.lastIndexOf('\\'));
        if (bare !== destination && is(bare, 'missing') && is(cut >= 0 ? bare.slice(0, cut) || '/' : '.', 'directory')) mvArgs[1] = bare;
      }
      const { lines, newRoot, newCwd } = deps.cmdMv(newState, ['--', ...mvArgs]);
      if (newRoot) newState = { ...newState, root: newRoot };
      if (newCwd) newState = { ...newState, cwd: newCwd };
      return { lines: psErrors('Move-Item', lines, newState, env, deps), newState };
    }

    // ── rm equivalents ────────────────────────────────────────────────────────
    case 'remove-item':
    case 'ri':
    case 'del':
    case 'erase': {
      const rmArgs = args.filter((a) => !a.startsWith('-'));
      // -Recurse removes a folder with its content, like `rm -r`.
      const recurse = args.some((a) => RECURSE_PARAM.test(a));
      const { lines, newRoot } = deps.cmdRm(newState, recurse ? ['-r', ...rmArgs] : rmArgs);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines: psErrors('Remove-Item', lines, newState, env, deps), newState };
    }

    // ── echo equivalents ──────────────────────────────────────────────────────
    case 'write-host':
    case 'write-output':
      return { lines: deps.cmdEcho(args.filter((a) => !a.startsWith('-'))), newState };

    // ── ps equivalents ────────────────────────────────────────────────────────
    case 'get-process':
    case 'gps':
      return {
        lines: [
          { text: 'Handles  NPM(K)  PM(K)  WS(K) VM(M)   CPU(s)   Id ProcessName', type: 'output' },
          { text: '-------  ------  -----  ----- -----   ------   -- -----------', type: 'output' },
          { text: '    256      14   4560   8192   120    0.047 1234 WindowsTerminal', type: 'output' },
          { text: '     64       8   2048   4096    80    0.016 2048 node', type: 'output' },
          { text: '     32       4   1024   2048    40    0.003 5678 pwsh', type: 'output' },
        ],
        newState,
      };

    // ── kill equivalents ──────────────────────────────────────────────────────
    case 'stop-process':
    case 'spps':
    case 'taskkill': {
      if (!args.length) return { lines: [{ text: 'Stop-Process: -Id ou -Name requis', type: 'error' }], newState };
      const target = args[args.length - 1];
      return { lines: [{ text: `Processus '${target}' arrêté.`, type: 'success' }], newState };
    }

    // ── grep equivalents ──────────────────────────────────────────────────────
    case 'select-string':
    case 'sls': {
      const patternIdx = args.findIndex((a) => a.toLowerCase() === '-pattern');
      const pathIdx = args.findIndex((a) => a.toLowerCase() === '-path');
      let pattern: string;
      let filePath: string;
      if (patternIdx >= 0) {
        pattern = args[patternIdx + 1] ?? '';
        filePath = pathIdx >= 0 ? args[pathIdx + 1] : (args.find((a, i) => !a.startsWith('-') && i !== patternIdx + 1) ?? '');
      } else if (pathIdx >= 0) {
        // `Select-String -Path f.txt motif`: the pattern is the first word that is not the path.
        filePath = args[pathIdx + 1] ?? '';
        pattern = args.find((a, i) => !a.startsWith('-') && i !== pathIdx + 1) ?? '';
      } else {
        const nonFlags = args.filter((a) => !a.startsWith('-'));
        pattern = nonFlags[0] ?? '';
        filePath = nonFlags[1] ?? '';
      }
      if (filePath && 'error' in deps.readFile(newState, filePath)) {
        return { lines: [{ text: `Select-String: Cannot find path '${deps.winPath(newState, filePath)}' because it does not exist.`, type: 'error' }], newState };
      }
      // Case-insensitive unless -CaseSensitive; each match reads `<file>:<line>:<text>`, like PowerShell.
      const caseSensitive = args.some((a) => a.toLowerCase() === '-casesensitive');
      const found = deps.cmdGrep(newState, [caseSensitive ? '-n' : '-in', pattern, filePath]);
      const shown = filePath.replace(/\//g, '\\');
      return {
        lines: found.map((l) => (l.type === 'output' ? { ...l, text: `${shown}:${l.text}` } : l)),
        newState,
        // No match is not a failure for a cmdlet ($? stays True); only grep returns 1.
        status: found.some((l) => l.type === 'error') ? 1 : 0,
      };
    }

    // ── clear equivalents ─────────────────────────────────────────────────────
    case 'clear-host':
    case 'cls':
      return { lines: [], clear: true, newState };

    // ── mkdir alias ───────────────────────────────────────────────────────────
    case 'md': {
      const { lines, newRoot } = deps.cmdMkdir(newState, args);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines: psErrors('New-Item', lines, newState, env, deps), newState };
    }

    // ── script execution policy (PowerShell only) ─────────────────────────────
    case 'set-executionpolicy': {
      if (env !== 'windows') return null;
      let value: string | undefined;
      let scope = 'LocalMachine';
      for (let i = 0; i < args.length; i++) {
        const a = args[i].toLowerCase();
        if (a === '-executionpolicy') value = args[++i];
        else if (a === '-scope') scope = args[++i] ?? scope;
        else if (!a.startsWith('-') && value === undefined) value = args[i];
      }
      if (!value) {
        return { lines: [{ text: 'Set-ExecutionPolicy: indiquez une politique, par exemple Set-ExecutionPolicy RemoteSigned', type: 'error' }], newState };
      }
      const policy = EXECUTION_POLICIES.find((p) => p.toLowerCase() === value!.toLowerCase());
      if (!policy) {
        return {
          lines: [{ text: `Set-ExecutionPolicy: Cannot bind parameter 'ExecutionPolicy'. Cannot convert value "${value}" to type "Microsoft.PowerShell.ExecutionPolicy".`, type: 'error' }],
          newState,
        };
      }
      // Real PowerShell prints nothing on success; the info line says what changed.
      return {
        lines: [{ text: `Politique d'exécution définie sur ${policy} (portée ${scope}). Vérifiez avec Get-ExecutionPolicy.`, type: 'info' }],
        newState: { ...newState, executionPolicy: policy },
      };
    }

    case 'get-executionpolicy':
      if (env !== 'windows') return null;
      return { lines: [{ text: newState.executionPolicy ?? 'Restricted', type: 'output' }], newState };

    // ── permissions ───────────────────────────────────────────────────────────
    case 'get-acl':
    case 'icacls': {
      if (args.length === 0) return { lines: [{ text: `Usage: ${cmd} fichier`, type: 'error' }], newState };
      const target = args[0];
      return {
        lines: [
          { text: `${target}  NT AUTHORITY\\SYSTEM:(I)(F)`, type: 'output' },
          { text: '      BUILTIN\\Administrators:(I)(F)', type: 'output' },
          { text: `      ${newState.user}:(I)(M)`, type: 'output' },
          { text: '      BUILTIN\\Users:(I)(RX)', type: 'output' },
        ],
        newState,
      };
    }

    case 'takeown': {
      const fileArg = args.find((a) => !a.startsWith('/'));
      return { lines: [{ text: `SUCCESS: The file (or folder): "${fileArg ?? '.'}" now owned by "${newState.user}".`, type: 'success' }], newState };
    }

    // ── jobs equivalents ──────────────────────────────────────────────────────
    case 'get-job':
    case 'receive-job':
    case 'stop-job':
    case 'start-job':
      return {
        lines: [
          { text: 'Id     Name            PSJobTypeName   State         HasMoreData', type: 'output' },
          { text: '--     ----            -------------   -----         -----------', type: 'output' },
          { text: '(aucun job actif dans ce terminal simulé)', type: 'info' },
        ],
        newState,
      };

    // ── macOS-specific ────────────────────────────────────────────────────────
    case 'open': {
      if (!args.length) return { lines: [{ text: 'open: missing argument', type: 'error' }], newState };
      const target = args[args.length - 1];
      return { lines: [{ text: `Ouverture de '${target}'…`, type: 'success' }], newState };
    }

    case 'pbcopy':
      return { lines: [{ text: '[contenu copié dans le presse-papiers]', type: 'success' }], newState };

    case 'pbpaste':
      return { lines: [{ text: '[contenu du presse-papiers]', type: 'output' }], newState };

    case 'brew': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'install' && args[1]) {
        return {
          lines: [
            { text: `==> Fetching ${args[1]}...`, type: 'info' },
            { text: `==> Installing ${args[1]}...`, type: 'info' },
            { text: `✓  ${args[1]} installed successfully`, type: 'success' },
          ],
          newState,
        };
      }
      if (sub === 'update') return { lines: [{ text: '==> Updated Homebrew. Nothing to upgrade.', type: 'success' }], newState };
      if (sub === 'list') return { lines: [{ text: 'git  node  python  wget  curl', type: 'output' }], newState };
      return { lines: [{ text: 'Homebrew — Usage: brew install|update|list', type: 'output' }], newState };
    }

    case 'winget': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'install' && args[1]) {
        return {
          lines: [
            { text: `Found ${args[1]}`, type: 'info' },
            { text: `Downloading ${args[1]}...`, type: 'info' },
            { text: `Successfully installed ${args[1]}`, type: 'success' },
          ],
          newState,
        };
      }
      if (sub === 'list') {
        return {
          lines: [
            { text: 'Name          Id                  Version', type: 'output' },
            { text: 'Git           Git.Git             2.44.0', type: 'output' },
            { text: 'Node.js       OpenJS.NodeJS       20.11.0', type: 'output' },
          ],
          newState,
        };
      }
      return { lines: [{ text: 'winget — Usage: winget install|list', type: 'output' }], newState };
    }

    default:
      return null;
  }
}

export const WINDOWS_COMMANDS = new Set([
  'get-location', 'gl', 'set-location', 'sl',
  'get-childitem', 'gci', 'dir',
  'get-content', 'gc',
  'get-item', 'gi',
  'start-process', 'saps', 'start',
  'new-item', 'ni',
  'copy-item', 'cpi', 'copy',
  'move-item', 'mi', 'move',
  'remove-item', 'ri', 'del', 'erase',
  'write-host', 'write-output',
  'get-process', 'gps',
  'stop-process', 'spps', 'taskkill',
  'select-string', 'sls',
  'clear-host', 'cls',
  'md',
  'get-acl', 'icacls', 'takeown',
  'get-job', 'receive-job', 'stop-job', 'start-job',
  'open', 'pbcopy', 'pbpaste', 'brew', 'winget',
]);
