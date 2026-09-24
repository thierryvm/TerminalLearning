// Types are defined in ./commands/types.ts and re-exported here for backward compatibility.
import type { TerminalEnv, FileNode, DirectoryNode, FSNode, GitCommit, GitState, TerminalState, CommandOutput, OutputLine } from './commands/types';
export type { TerminalEnv, FileNode, DirectoryNode, FSNode, GitCommit, GitState, TerminalState, CommandOutput, OutputLine };

// ─── Command module handlers ──────────────────────────────────────────────────
import { handleGit } from './commands/git';
import { handleNetwork } from './commands/network';
import { handleAiHelp } from './commands/ai';
import { cmdEnv, handleEnv } from './commands/env';
import { handleWindows } from './commands/windows';
import { parseCommandLine, isPlainCommand, isNullDevice } from './commands/shellSyntax';
import type { Stage, Fd } from './commands/shellSyntax';
import { UNIX_DEFAULT_PATH, varsForEnv } from './commands/shellVars';
import type { WindowsCmdDeps } from './commands/windows';

// ─── Initial Filesystem ───────────────────────────────────────────────────────

function makeFile(content: string, permissions = '-rw-r--r--', owner = 'user'): FileNode {
  return {
    type: 'file',
    content,
    permissions,
    owner,
    group: owner,
    size: content.length,
  };
}

function makeDir(
  children: Record<string, FSNode>,
  permissions = 'drwxr-xr-x',
  owner = 'user'
): DirectoryNode {
  return { type: 'directory', children, permissions, owner, group: owner };
}

export function createInitialState(): TerminalState {
  const root: DirectoryNode = makeDir(
    {
      home: makeDir(
        {
          user: makeDir({
            documents: makeDir({
              'notes.txt': makeFile(
                'Mes notes importantes\nTâches du jour:\n1. Apprendre les commandes bash\n2. Pratiquer la navigation\n3. Maîtriser les permissions\nFin du fichier'
              ),
              'rapport.md': makeFile(
                '# Rapport Mensuel\n\n## Introduction\nCe rapport résume les activités du mois.\n\n## Section 1\nLes objectifs ont été atteints à 95%.\n\n## Conclusion\nExcellent travail de l\'équipe.'
              ),
            }),
            downloads: makeDir({}),
            projets: makeDir({
              'script.sh': makeFile(
                '#!/bin/bash\necho "Bonjour le monde !"\necho "Ce script fonctionne !"',
                '-rwxr-xr-x'
              ),
              'README.md': makeFile(
                '# Mes Projets\n\nBienvenue dans mon répertoire de projets.\n\n## Projets actuels\n- script.sh : Script de démonstration'
              ),
              '.env': makeFile(
                '# Variables d\'environnement du projet\n# NE JAMAIS committer ce fichier !\nDB_HOST=localhost\nDB_PORT=5432\nDB_NAME=myapp\nDB_USER=admin\nDB_PASSWORD=EXAMPLE_PASSWORD_NOT_REAL\nAPI_KEY=EXAMPLE_API_KEY_NOT_REAL\nNODE_ENV=development'
              ),
            }),
            '.bashrc': makeFile(
              '# Configuration Bash\nalias ll="ls -la"\nalias la="ls -a"\nexport PATH=$PATH:/usr/local/bin\nexport EDITOR=nano'
            ),
            '.zshrc': makeFile(
              '# Configuration Zsh (Oh My Zsh)\nexport ZSH="$HOME/.oh-my-zsh"\nZSH_THEME="robbyrussell"\nplugins=(git node npm)\nalias ll="ls -la"\nalias la="ls -a"\nexport PATH=$PATH:/usr/local/bin'
            ),
            '.profile': makeFile(
              '# ~/.profile\n# Chargé lors de la connexion\nif [ -f ~/.bashrc ]; then\n  . ~/.bashrc\nfi'
            ),
          }),
        },
        'drwxr-xr-x',
        'root'
      ),
      tmp: makeDir({}, 'drwxrwxrwt', 'root'),
    },
    'drwxr-xr-x',
    'root'
  );

  return {
    root,
    cwd: ['home', 'user'],
    commandHistory: [],
    user: 'user',
    hostname: 'terminal-lab',
    envVars: {
      PATH: UNIX_DEFAULT_PATH,
      HOME: '/home/user',
      USER: 'user',
      SHELL: '/bin/bash',
      TERM: 'xterm-256color',
      LANG: 'en_US.UTF-8',
      EDITOR: 'nano',
    },
  };
}

// ─── Filesystem Helpers ───────────────────────────────────────────────────────

function getNode(root: DirectoryNode, path: string[]): FSNode | null {
  let current: FSNode = root;
  for (const seg of path) {
    if (current.type !== 'directory') return null;
    const child: FSNode | undefined = current.children[seg];
    if (!child) return null;
    current = child;
  }
  return current;
}


/** True while a command runs in the Windows environment (see processCommand). */
let windowsPaths = false;

/**
 * PowerShell accepts `\` as a separator and drive paths:
 * `documents\notes.txt`, `.\script.ps1`, `C:\Users\user\projets` (= /home/user/projets).
 */
function fromWindowsPath(input: string): string {
  const path = input.replace(/\\/g, '/');
  const drive = path.match(/^[A-Za-z]:(\/.*)?$/);
  return drive ? drive[1] ?? '/' : path;
}

/** The simulated /home is shown as C:\Users on Windows (see displayPathForEnv). */
function windowsName(parentPath: string[], name: string, windows: boolean): string {
  return windows && parentPath.length === 0 && name === 'home' ? 'Users' : name;
}

function resolvePath(state: TerminalState, rawInput: string): string[] {
  const path = resolveSegments(state, windowsPaths ? fromWindowsPath(rawInput) : rawInput);
  // `C:\Users`, `\Users` or `Users` from `C:\` all mean the simulated /home.
  if (windowsPaths && path[0]?.toLowerCase() === 'users') path[0] = 'home';
  return path;
}

function resolveSegments(state: TerminalState, input: string): string[] {
  if (!input || input === '~') return ['home', 'user'];
  if (input.startsWith('~/')) {
    const rest = input.slice(2).split('/').filter(Boolean);
    return ['home', 'user', ...rest];
  }
  if (input.startsWith('/')) {
    return input.split('/').filter(Boolean);
  }
  // Relative path
  const base = [...state.cwd];
  for (const seg of input.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (base.length > 0) base.pop();
    } else {
      base.push(seg);
    }
  }
  return base;
}

function displayPath(cwd: string[]): string {
  if (cwd.length >= 2 && cwd[0] === 'home' && cwd[1] === 'user') {
    const rest = cwd.slice(2);
    return rest.length === 0 ? '~' : '~/' + rest.join('/');
  }
  return '/' + cwd.join('/');
}

/**
 * Returns the current path formatted for the target environment.
 * Windows: C:\Users\user\Documents style
 * Linux/macOS: ~/documents style
 */
export function displayPathForEnv(cwd: string[], env: TerminalEnv = 'linux'): string {
  if (env === 'windows') {
    // The simulated /home is C:\Users on Windows (so /home/user is C:\Users\user).
    const parts = cwd[0] === 'home' ? ['Users', ...cwd.slice(1)] : cwd;
    return 'C:\\' + parts.join('\\');
  }
  return displayPath(cwd);
}

export function getPrompt(state: TerminalState, env: TerminalEnv = 'linux'): string {
  if (env === 'windows') {
    return `PS ${displayPathForEnv(state.cwd, 'windows')}>`;
  }
  if (env === 'macos') {
    const path = displayPath(state.cwd);
    return `${state.user}@${state.hostname} ${path} %`;
  }
  return `${state.user}@${state.hostname}:${displayPath(state.cwd)}$`;
}

// ─── Tab Completion ───────────────────────────────────────────────────────────

const COMPLETION_COMMANDS = [
  'pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'echo', 'rm', 'cp', 'mv',
  'grep', 'head', 'tail', 'wc', 'chmod', 'whoami', 'hostname', 'date',
  'uname', 'history', 'ps', 'kill', 'clear', 'help', 'man', 'exit',
  'about', 'hall-of-fame',
  'export', 'env', 'printenv', 'source', 'crontab',
  'chown', 'chgrp', 'sudo', 'top', 'htop', 'jobs', 'fg', 'bg', 'tee',
  'git',
];

/**
 * Returns possible completions for the current input.
 * - No space: completes command names
 * - With space: completes filesystem paths (relative or absolute)
 */
export function getTabCompletions(input: string, state: TerminalState, env: TerminalEnv = 'linux'): string[] {
  const firstSpaceIdx = input.indexOf(' ');

  // No space yet → complete the command name
  if (firstSpaceIdx === -1) {
    return COMPLETION_COMMANDS.filter((c) => c.startsWith(input));
  }

  // Has space → complete a path argument (use last token as the partial path)
  const lastSpaceIdx = input.lastIndexOf(' ');
  const inputPrefix = input.slice(0, lastSpaceIdx + 1); // "cmd " or "cmd arg1 "
  const partial = input.slice(lastSpaceIdx + 1);        // partial path to complete

  let parentPath: string[];
  let namePrefix: string;
  let pathPrefix: string;

  // PowerShell also separates with `\` (`documents\n` → `documents\notes.txt`).
  const slashIdx = env === 'windows'
    ? Math.max(partial.lastIndexOf('/'), partial.lastIndexOf('\\'))
    : partial.lastIndexOf('/');
  const separator = slashIdx >= 0 ? partial[slashIdx] : '/';

  if (slashIdx >= 0) {
    pathPrefix = partial.slice(0, slashIdx + 1); // e.g. "documents/"
    namePrefix = partial.slice(slashIdx + 1);    // e.g. "n"
    const dirPart = pathPrefix.length > 1 ? pathPrefix.slice(0, -1) : '/';
    const wasWindows = windowsPaths;
    windowsPaths = env === 'windows';
    try {
      parentPath = resolvePath(state, dirPart);
    } finally {
      windowsPaths = wasWindows;
    }
  } else {
    pathPrefix = '';
    namePrefix = partial;
    parentPath = state.cwd;
  }

  const parentNode = getNode(state.root, parentPath);
  if (!parentNode || parentNode.type !== 'directory') return [];

  const shown = (name: string) => windowsName(parentPath, name, env === 'windows');
  const matches = Object.keys(parentNode.children).filter((n) => shown(n).startsWith(namePrefix));

  return matches.map((name) => {
    const node = (parentNode as DirectoryNode).children[name];
    const suffix = node.type === 'directory' ? separator : '';
    return inputPrefix + pathPrefix + shown(name) + suffix;
  });
}

/** Maximum number of filesystem nodes allowed in a single clone operation. */
const MAX_FS_NODES = 10_000;

/**
 * Recursively clones a filesystem node (file or directory).
 * Throws if the node count exceeds MAX_FS_NODES, guarding against CPU spikes
 * from pathologically large simulated filesystems.
 */
function cloneFSNode(node: FSNode, counter: { n: number }): FSNode {
  if (++counter.n > MAX_FS_NODES) {
    throw new Error('Filesystem too large to clone safely');
  }
  if (node.type === 'file') {
    return { ...node };
  }
  return {
    type: 'directory',
    permissions: node.permissions,
    owner: node.owner,
    group: node.group,
    children: Object.fromEntries(
      Object.entries(node.children).map(([k, v]) => [k, cloneFSNode(v, counter)])
    ),
  };
}

/**
 * Deep-clones the virtual filesystem root.
 * Includes a node-count guard to prevent CPU spikes from pathologically large
 * simulated filesystems (defensive measure — the curriculum FS is always small).
 */
function deepCloneRoot(root: DirectoryNode): DirectoryNode {
  return cloneFSNode(root, { n: 0 }) as DirectoryNode;
}

// ─── Argument Parser ──────────────────────────────────────────────────────────

function parseArgs(input: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuote) {
      if (ch === quoteChar) inQuote = false;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current) { result.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) result.push(current);
  return result;
}

// ─── Format Helpers ───────────────────────────────────────────────────────────

function formatLongEntry(name: string, node: FSNode): string {
  const perm = node.permissions;
  const owner = node.owner;
  const group = node.group;
  // Bytes on disk, computed from the content (the stored `size` is not kept up to date on edits).
  const size = node.type === 'file' ? String(textCounts(node.content).bytes).padStart(6) : '  4096';
  const date = 'Mar 30 10:00';
  const links = node.type === 'directory' ? ' 2' : ' 1';
  return `${perm}${links} ${owner} ${group} ${size} ${date} ${name}`;
}

// ─── Command Handlers ─────────────────────────────────────────────────────────

/** The absolute path, as `pwd` prints it (the prompt shortens it to `~`, pwd never does). */
function absolutePath(cwd: string[], env: TerminalEnv): string {
  return env === 'windows' ? displayPathForEnv(cwd, env) : '/' + cwd.join('/');
}

function cmdPwd(state: TerminalState, env: TerminalEnv = 'linux'): OutputLine[] {
  return [{ text: absolutePath(state.cwd, env), type: 'output' }];
}

function cmdLs(state: TerminalState, args: string[]): OutputLine[] {
  const flags = args.filter((a) => a.startsWith('-'));
  const paths = args.filter((a) => !a.startsWith('-'));
  const showAll = flags.some((f) => f.includes('a'));
  const longFormat = flags.some((f) => f.includes('l'));

  const targetPath = paths[0] ? resolvePath(state, paths[0]) : state.cwd;
  const node = getNode(state.root, targetPath);

  if (!node) return [{ text: `ls: cannot access '${paths[0]}': No such file or directory`, type: 'error' }];
  if (node.type === 'file') {
    return longFormat
      ? [{ text: formatLongEntry(paths[0] || '', node), type: 'output' }]
      : [{ text: paths[0] || '', type: 'output' }];
  }

  // Like `ls` in the C locale: one alphabetical list, hidden files first, no directories-first.
  const entries = Object.entries(node.children)
    .map(([name, child]): [string, FSNode] => [windowsName(targetPath, name, windowsPaths), child])
    .filter(([name]) => showAll || !name.startsWith('.'))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  if (showAll) {
    entries.unshift(['.', node], ['..', node]);
  }

  if (!longFormat) {
    // Into a pipe or a file, a real `ls` writes one plain name per line
    // (that is what `ls | wc -l` counts); `-1` asks for it on screen too.
    if (!stdoutIsTerminal) return entries.map(([name]) => ({ text: name, type: 'output' as const }));
    // `-F` marks directories with `/` and executables with `*`; plain `ls` marks nothing.
    const classify = flags.some((f) => f.includes('F'));
    const names = entries.map(([name, n]) => {
      if (!classify || name === '.' || name === '..') return name;
      if (n.type === 'directory') return name + '/';
      return n.permissions[3] === 'x' ? name + '*' : name;
    });
    if (flags.some((f) => f.includes('1'))) return names.map((text) => ({ text, type: 'output' as const }));
    return [{ text: names.join('  '), type: 'output' }];
  }

  const lines: OutputLine[] = [{ text: `total ${entries.length}`, type: 'output' }];
  for (const [name, n] of entries) {
    lines.push({ text: formatLongEntry(name, n), type: 'output' });
  }
  return lines;
}

function cmdCd(state: TerminalState, args: string[], env: TerminalEnv = 'linux'): { lines: OutputLine[]; newCwd?: string[] } {
  const target = args[0];
  if (target === '-') {
    // `cd -` returns to $OLDPWD; bash prints where it lands. PowerShell 6.2+ (the
    // simulated 7.x) goes back in its location history silently; 5.1 did not have it.
    if (!state.previousCwd) {
      return { lines: env === 'windows' ? [] : [{ text: 'bash: cd: OLDPWD not set', type: 'error' }] };
    }
    const lines: OutputLine[] = env === 'windows' ? [] : [{ text: absolutePath(state.previousCwd, env), type: 'output' }];
    return { lines, newCwd: state.previousCwd };
  }
  if (!target || target === '~') {
    return { lines: [], newCwd: ['home', 'user'] };
  }
  const resolved = resolvePath(state, target);
  const node = getNode(state.root, resolved);
  if (!node) {
    return {
      lines: [{ text: `cd: ${target}: No such file or directory`, type: 'error' }],
    };
  }
  if (node.type !== 'directory') {
    return { lines: [{ text: `cd: ${target}: Not a directory`, type: 'error' }] };
  }
  return { lines: [], newCwd: resolved };
}

function cmdMkdir(state: TerminalState, args: string[]): { lines: OutputLine[]; newRoot?: DirectoryNode } {
  const flags = args.filter((a) => a.startsWith('-'));
  const paths = args.filter((a) => !a.startsWith('-'));
  const makeParents = flags.some((f) => f.includes('p'));

  if (!paths.length) return { lines: [{ text: 'mkdir: missing operand', type: 'error' }] };

  const newRoot = deepCloneRoot(state.root);

  for (const p of paths) {
    const resolved = resolvePath(state, p);
    if (makeParents) {
      let cur: DirectoryNode = newRoot;
      for (const seg of resolved) {
        if (!cur.children[seg]) {
          cur.children[seg] = makeDir({});
        }
        const next = cur.children[seg];
        if (next.type !== 'directory') {
          return { lines: [{ text: `mkdir: cannot create directory '${p}': Not a directory`, type: 'error' }] };
        }
        cur = next;
      }
    } else {
      const parentPath = resolved.slice(0, -1);
      const name = resolved[resolved.length - 1];
      // PowerShell's mkdir (New-Item -ItemType Directory) creates missing parents.
      if (windowsPaths) {
        let cur: DirectoryNode = newRoot;
        for (const seg of parentPath) {
          if (!cur.children[seg]) cur.children[seg] = makeDir({});
          const next = cur.children[seg];
          if (next.type !== 'directory') break;
          cur = next;
        }
      }
      const parent = getNode(newRoot, parentPath) as DirectoryNode;
      if (!parent || parent.type !== 'directory') {
        return { lines: [{ text: `mkdir: cannot create directory '${p}': No such file or directory`, type: 'error' }] };
      }
      if (parent.children[name]) {
        return { lines: [{ text: `mkdir: cannot create directory '${p}': File exists`, type: 'error' }] };
      }
      parent.children[name] = makeDir({});
    }
  }
  return { lines: [], newRoot };
}

function cmdTouch(state: TerminalState, args: string[]): { lines: OutputLine[]; newRoot?: DirectoryNode } {
  if (!args.length) return { lines: [{ text: 'touch: missing file operand', type: 'error' }] };
  const newRoot = deepCloneRoot(state.root);

  for (const p of args) {
    const resolved = resolvePath(state, p);
    const parentPath = resolved.slice(0, -1);
    const name = resolved[resolved.length - 1];
    const parent = getNode(newRoot, parentPath) as DirectoryNode;
    if (!parent || parent.type !== 'directory') {
      return { lines: [{ text: `touch: cannot touch '${p}': No such file or directory`, type: 'error' }] };
    }
    if (!parent.children[name]) {
      parent.children[name] = makeFile('');
    }
  }
  return { lines: [], newRoot };
}

function cmdCat(state: TerminalState, args: string[]): OutputLine[] {
  if (!args.length) return [{ text: 'cat: missing file operand', type: 'error' }];
  const lines: OutputLine[] = [];
  for (const p of args) {
    const node = getNode(state.root, resolvePath(state, p));
    if (!node) {
      lines.push({ text: `cat: ${p}: No such file or directory`, type: 'error' });
    } else if (node.type === 'directory') {
      lines.push({ text: `cat: ${p}: Is a directory`, type: 'error' });
    } else {
      node.content.split('\n').forEach((line) => lines.push({ text: line, type: 'output' }));
    }
  }
  return lines;
}

const MAX_ENV_VAR_LENGTH = 1024;

function cmdEcho(args: string[], envVars?: Record<string, string>): OutputLine[] {
  const text = args.join(' ');
  if (!envVars) return [{ text, type: 'output' }];
  // Interpolate $env:VAR (PowerShell) and $VAR (bash) from envVars
  // Values are capped at MAX_ENV_VAR_LENGTH to prevent terminal flooding [H3]
  const safeVal = (name: string) => {
    if (!Object.prototype.hasOwnProperty.call(envVars, name)) return '';
    const v = envVars[name];
    return v.length > MAX_ENV_VAR_LENGTH ? v.slice(0, MAX_ENV_VAR_LENGTH) + '…' : v;
  };
  const expanded = text
    .replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => safeVal(name))
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => safeVal(name));
  return [{ text: expanded, type: 'output' }];
}

function cmdRm(state: TerminalState, args: string[]): { lines: OutputLine[]; newRoot?: DirectoryNode } {
  const flags = args.filter((a) => a.startsWith('-'));
  const paths = args.filter((a) => !a.startsWith('-'));
  const recursive = flags.some((f) => f.includes('r') || f.includes('R'));

  if (!paths.length) return { lines: [{ text: 'rm: missing operand', type: 'error' }] };
  // GNU rm refuses to wipe the whole system (`rm -rf /`) unless forced explicitly.
  if (recursive && paths.some((p) => resolvePath(state, p).length === 0) && !flags.includes('--no-preserve-root')) {
    return { lines: [
      { text: "rm: it is dangerous to operate recursively on '/'", type: 'error' },
      { text: 'rm: use --no-preserve-root to override this failsafe', type: 'error' },
    ] };
  }

  const newRoot = deepCloneRoot(state.root);

  for (const p of paths) {
    const resolved = resolvePath(state, p);
    const parentPath = resolved.slice(0, -1);
    const name = resolved[resolved.length - 1];
    const parent = getNode(newRoot, parentPath) as DirectoryNode;

    if (!parent || !parent.children[name]) {
      return { lines: [{ text: `rm: cannot remove '${p}': No such file or directory`, type: 'error' }] };
    }
    const target = parent.children[name];
    if (target.type === 'directory' && !recursive) {
      return { lines: [{ text: `rm: cannot remove '${p}': Is a directory (use -r)`, type: 'error' }] };
    }
    delete parent.children[name];
  }
  return { lines: [], newRoot };
}

// ─── cp / mv ──────────────────────────────────────────────────────────────────
// GNU coreutils semantics: when the destination is an existing directory, each
// source goes INSIDE it (`mv notes.txt .`, `cp -r docs backup/`); several
// sources need a directory destination; a directory never lands inside itself.

type TransferResult = { lines: OutputLine[]; newRoot?: DirectoryNode; newCwd?: string[] };

const TRANSFER_LONG_OPTIONS: Record<string, string> = {
  '--recursive': 'r', '--verbose': 'v', '--no-clobber': 'n', '--interactive': 'i', '--force': 'f',
};

function isInside(inner: string[], outer: string[]): boolean {
  return inner.length > outer.length && outer.every((seg, i) => inner[i] === seg);
}

/**
 * Copies every entry of `src` into `dst`, merging sub-directories like `cp -r`
 * does. With `noClobber` (`-n` / `-i`), files already there are kept, at any depth.
 */
function mergeDirInto(dst: DirectoryNode, src: DirectoryNode, noClobber: boolean): void {
  for (const [name, child] of Object.entries(src.children)) {
    const existing = dst.children[name];
    if (existing?.type === 'directory' && child.type === 'directory') mergeDirInto(existing, child, noClobber);
    else if (!existing || (existing.type === child.type && !noClobber)) dst.children[name] = cloneFSNode(child, { n: 0 });
  }
}

function transfer(cmd: 'cp' | 'mv', state: TerminalState, args: string[]): TransferResult {
  const err = (text: string): OutputLine => ({ text: `${cmd}: ${text}`, type: 'error' });
  const flags = new Set<string>();
  const paths: string[] = [];
  let endOfOptions = false;
  for (const a of args) {
    if (!endOfOptions && a === '--') { endOfOptions = true; continue; }
    if (!endOfOptions && a.startsWith('--')) {
      const short = TRANSFER_LONG_OPTIONS[a];
      if (!short || (cmd === 'mv' && short === 'r')) {
        return { lines: [err(`unrecognized option '${a}'`), { text: `Try '${cmd} --help' for more information.`, type: 'error' }] };
      }
      flags.add(short);
      continue;
    }
    if (!endOfOptions && a.startsWith('-') && a.length > 1) {
      for (const f of a.slice(1)) {
        if (!(cmd === 'cp' ? 'rRavinf' : 'vinf').includes(f)) {
          return { lines: [err(`invalid option -- '${f}'`), { text: `Try '${cmd} --help' for more information.`, type: 'error' }] };
        }
        flags.add(f);
      }
      continue;
    }
    paths.push(a);
  }
  if (paths.length === 0) return { lines: [err('missing file operand')] };
  if (paths.length === 1) return { lines: [err(`missing destination file operand after '${paths[0]}'`)] };

  const recursive = cmd === 'mv' || flags.has('r') || flags.has('R') || flags.has('a');
  // -f overrides an earlier -i / -n, as in coreutils when it comes last; kept simple: -f wins.
  const noClobber = !flags.has('f') && (flags.has('n') || flags.has('i'));
  const dst = paths[paths.length - 1];
  const sources = paths.slice(0, -1);
  const newRoot = deepCloneRoot(state.root);
  const dstPath = resolvePath(state, dst);
  const intoDir = getNode(newRoot, dstPath)?.type === 'directory';
  if (sources.length > 1 && !intoDir) return { lines: [err(`target '${dst}' is not a directory`)] };

  const lines: OutputLine[] = [];
  let changed = false;
  let newCwd: string[] | undefined;
  for (const src of sources) {
    const srcPath = resolvePath(state, src);
    const typedName = src.replace(/\/+$/, '').split('/').pop() ?? src;
    const isDotName = typedName === '.' || typedName === '..' || srcPath.length === 0;
    const srcNode = getNode(newRoot, srcPath);
    if (!srcNode) { lines.push(err(`cannot stat '${src}': No such file or directory`)); continue; }
    if (srcNode.type === 'directory' && !recursive) { lines.push(err(`-r not specified; omitting directory '${src}'`)); continue; }

    // `cp -r . dir` copies the contents of `.` into `dir`; `mv .` is refused by the kernel.
    const name = srcPath[srcPath.length - 1];
    const targetPath = intoDir && !isDotName ? [...dstPath, name] : dstPath;
    const shown = intoDir && !isDotName ? `${dst.replace(/\/+$/, '')}/${name}` : dst;
    if (cmd === 'mv' && isDotName) { lines.push(err(`cannot move '${src}' to '${shown}': Device or resource busy`)); continue; }
    if (targetPath.join('/') === srcPath.join('/')) { lines.push(err(`'${src}' and '${shown}' are the same file`)); continue; }
    if (srcNode.type === 'directory' && isInside(targetPath, srcPath)) {
      lines.push(err(cmd === 'mv'
        ? `cannot move '${src}' to a subdirectory of itself, '${shown}'`
        : `cannot copy a directory, '${src}', into itself, '${shown}'`));
      continue;
    }
    const parent = getNode(newRoot, targetPath.slice(0, -1));
    const trailingSlashOnFile = !intoDir && dst.endsWith('/');
    if (!parent || parent.type !== 'directory' || trailingSlashOnFile) {
      const reason = trailingSlashOnFile && parent ? 'Not a directory' : 'No such file or directory';
      lines.push(err(cmd === 'mv'
        ? `cannot move '${src}' to '${shown}': ${reason}`
        : `cannot create ${srcNode.type === 'directory' ? 'directory' : 'regular file'} '${shown}': ${reason}`));
      continue;
    }

    const targetName = targetPath[targetPath.length - 1];
    const existing = targetPath.length ? parent.children[targetName] : newRoot;
    if (existing) {
      if (noClobber && !(cmd === 'cp' && existing.type === 'directory' && srcNode.type === 'directory')) {
        if (flags.has('i')) {
          lines.push({ text: `${cmd}: overwrite '${shown}'? n`, type: 'output' });
          lines.push({ text: '(simulateur : la réponse est « n », rien n\'est écrasé)', type: 'info' });
        }
        continue;
      }
      if (existing.type === 'directory' && srcNode.type === 'file') { lines.push(err(`cannot overwrite directory '${shown}' with non-directory`)); continue; }
      if (existing.type === 'file' && srcNode.type === 'directory') { lines.push(err(`cannot overwrite non-directory '${shown}' with directory '${src}'`)); continue; }
      if (existing.type === 'directory' && srcNode.type === 'directory') {
        if (cmd === 'mv' && Object.keys(existing.children).length) {
          lines.push(err(`cannot move '${src}' to '${shown}': Directory not empty`));
          continue;
        }
        if (cmd === 'cp') {
          mergeDirInto(existing, srcNode, noClobber);
          changed = true;
          if (flags.has('v')) lines.push({ text: `'${src}' -> '${shown}'`, type: 'output' });
          continue;
        }
      }
    }

    if (cmd === 'mv') {
      const srcParent = getNode(newRoot, srcPath.slice(0, -1)) as DirectoryNode;
      delete srcParent.children[name];
      parent.children[targetName] = srcNode;
      // Moving the directory you stand in (or one of its parents) takes you along.
      const cwd = newCwd ?? state.cwd;
      if (cwd.length >= srcPath.length && srcPath.every((seg, i) => cwd[i] === seg)) {
        newCwd = [...targetPath, ...cwd.slice(srcPath.length)];
      }
      if (flags.has('v')) lines.push({ text: `renamed '${src}' -> '${shown}'`, type: 'output' });
    } else {
      parent.children[targetName] = cloneFSNode(srcNode, { n: 0 });
      if (flags.has('v')) lines.push({ text: `'${src}' -> '${shown}'`, type: 'output' });
    }
    changed = true;
  }
  return { lines, newRoot: changed ? newRoot : undefined, newCwd };
}

function cmdCp(state: TerminalState, args: string[]): TransferResult {
  return transfer('cp', state, args);
}

function cmdMv(state: TerminalState, args: string[]): TransferResult {
  return transfer('mv', state, args);
}

const GREP_PATTERN_MAX_LEN = 200;

function buildGrepRegex(
  pattern: string,
  flagStr: string
): { ok: true; regex: RegExp } | { ok: false; error: OutputLine } {
  if (pattern.length > GREP_PATTERN_MAX_LEN) {
    return { ok: false, error: { text: 'grep: pattern too long (max 200 characters)', type: 'error' } };
  }
  try {
    return { ok: true, regex: new RegExp(pattern, flagStr) };
  } catch {
    return { ok: false, error: { text: `grep: invalid regular expression: ${pattern}`, type: 'error' } };
  }
}

function cmdGrep(state: TerminalState, args: string[]): OutputLine[] {
  const flags = args.filter((a) => a.startsWith('-'));
  const rest = args.filter((a) => !a.startsWith('-'));
  if (rest.length < 2) return [{ text: 'grep: usage: grep [OPTIONS] PATTERN FILE', type: 'error' }];

  const pattern = rest[0];
  const filePath = rest[1];
  const showLineNumbers = flags.some((f) => f.includes('n'));
  const ignoreCase = flags.some((f) => f.includes('i'));

  const node = getNode(state.root, resolvePath(state, filePath));
  if (!node) return [{ text: `grep: ${filePath}: No such file or directory`, type: 'error' }];
  if (node.type === 'directory') return [{ text: `grep: ${filePath}: Is a directory`, type: 'error' }];

  const lines = node.content.split('\n');
  const regexResult = buildGrepRegex(pattern, ignoreCase ? 'i' : '');
  if (!regexResult.ok) return [regexResult.error];
  const regex = regexResult.regex;
  const matches = lines
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => regex.test(line));

  if (!matches.length) return [];
  return matches.map(({ line, i }) => ({
    text: showLineNumbers ? `${i + 1}:${line}` : line,
    type: 'output' as const,
  }));
}

function cmdHeadTail(state: TerminalState, args: string[], cmd: 'head' | 'tail'): OutputLine[] {
  let n = 10;
  let filePath = '';
  const parseN = (raw: string) => { const p = parseInt(raw, 10); if (!Number.isNaN(p)) n = p; };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n' && args[i + 1]) { parseN(args[i + 1]); i++; }
    else if (args[i].startsWith('-n')) { parseN(args[i].slice(2)); }
    else filePath = args[i];
  }
  const pfx = `${cmd}:`;
  if (!filePath) return [{ text: `${pfx} missing file operand`, type: 'error' }];
  const node = getNode(state.root, resolvePath(state, filePath));
  if (!node) return [{ text: `${pfx} cannot open '${filePath}': No such file or directory`, type: 'error' }];
  if (node.type === 'directory') return [{ text: `${pfx} ${filePath}: Is a directory`, type: 'error' }];
  const lines = node.content.split('\n');
  return (cmd === 'head' ? lines.slice(0, n) : lines.slice(-n)).map((line) => ({ text: line, type: 'output' as const }));
}

function cmdHead(state: TerminalState, args: string[]): OutputLine[] {
  return cmdHeadTail(state, args, 'head');
}

function cmdTail(state: TerminalState, args: string[]): OutputLine[] {
  return cmdHeadTail(state, args, 'tail');
}

const utf8 = new TextEncoder();

/**
 * What `wc` counts. The simulator stores text without its final newline; a real
 * file (and a real pipe) ends with one, and `wc -c` counts bytes, not characters.
 */
function textCounts(text: string): { lines: number; words: number; bytes: number } {
  if (text === '') return { lines: 0, words: 0, bytes: 0 };
  return {
    lines: text.split('\n').length,
    words: text.split(/\s+/).filter(Boolean).length,
    bytes: utf8.encode(text).length + 1,
  };
}

function cmdWc(state: TerminalState, args: string[]): OutputLine[] {
  const flags = args.filter((a) => a.startsWith('-'));
  const paths = args.filter((a) => !a.startsWith('-'));
  if (!paths.length) return [{ text: 'wc: missing file operand', type: 'error' }];

  const lines: OutputLine[] = [];
  for (const p of paths) {
    const node = getNode(state.root, resolvePath(state, p));
    if (!node) { lines.push({ text: `wc: ${p}: No such file or directory`, type: 'error' }); continue; }
    if (node.type === 'directory') { lines.push({ text: `wc: ${p}: Is a directory`, type: 'error' }); continue; }
    const { lines: lc, words: wc, bytes: cc } = textCounts(node.content);
    if (flags.some((f) => f.includes('l'))) lines.push({ text: ` ${lc} ${p}`, type: 'output' });
    else if (flags.some((f) => f.includes('w'))) lines.push({ text: ` ${wc} ${p}`, type: 'output' });
    else if (flags.some((f) => f.includes('c'))) lines.push({ text: ` ${cc} ${p}`, type: 'output' });
    else lines.push({ text: ` ${lc} ${wc} ${cc} ${p}`, type: 'output' });
  }
  return lines;
}

function cmdChmod(state: TerminalState, args: string[]): { lines: OutputLine[]; newRoot?: DirectoryNode } {
  if (args.length < 2) return { lines: [{ text: 'chmod: missing operand', type: 'error' }] };
  const mode = args[0];
  const filePath = args[1];
  const newRoot = deepCloneRoot(state.root);
  const resolved = resolvePath(state, filePath);
  const node = getNode(newRoot, resolved);
  if (!node) return { lines: [{ text: `chmod: cannot access '${filePath}': No such file or directory`, type: 'error' }] };

  const next = applyChmodMode(node.permissions, mode);
  if (!next) return { lines: [{ text: `chmod: invalid mode: '${mode}'`, type: 'error' }] };
  node.permissions = next;
  return { lines: [{ text: `Mode de '${filePath}' changé`, type: 'success' }], newRoot };
}

/**
 * Applies a chmod mode to a `ls -l` permission string (`-rw-r--r--`).
 * Octal: `755`, `640`… Symbolic: `+x`, `u+x`, `go-w`, `a=r`, comma lists.
 * Returns null for an invalid mode. (The previous version only knew six octal
 * values, and `+x` wrote the bits one position too far: `-rw-r--r--` became
 * `-rw-xr-xr-x`, so the owner still could not run the script.)
 */
function applyChmodMode(current: string, mode: string): string | null {
  const type = current[0];
  if (/^[0-7]{3}$/.test(mode)) {
    const bits = mode.split('').map((d) => {
      const n = Number(d);
      return (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? 'x' : '-');
    });
    return type + bits.join('');
  }
  const perms = current.slice(1).split(''); // 9 chars: owner, group, other
  const offset: Record<string, number> = { u: 0, g: 3, o: 6 };
  const index: Record<string, number> = { r: 0, w: 1, x: 2 };
  for (const clause of mode.split(',')) {
    const m = clause.match(/^([ugoa]*)([+\-=])([rwx]*)$/);
    if (!m) return null;
    const [, whoRaw, op, what] = m;
    const who = !whoRaw || whoRaw.includes('a') ? ['u', 'g', 'o'] : [...new Set(whoRaw.split(''))];
    for (const w of who) {
      if (op === '=') for (const p of 'rwx') perms[offset[w] + index[p]] = '-';
      for (const p of what) perms[offset[w] + index[p]] = op === '-' ? '-' : p;
    }
  }
  return type + perms.join('');
}

// ─── Environment Variable Commands ───────────────────────────────────────────

// cmdExport, cmdEnv, cmdPrintenv, cmdSource → moved to ./commands/env.ts

// ─── Module 5/6 Commands ─────────────────────────────────────────────────────

function cmdChown(args: string[]): OutputLine[] {
  if (args.length < 2) {
    return [{ text: 'chown: missing operand\nUsage: chown [user][:group] file...', type: 'error' }];
  }
  const [ownership, ...files] = args;
  return files.map((f) => ({ text: `${f}: propriétaire changé en '${ownership}'`, type: 'success' as const }));
}

function cmdSudo(args: string[], state: TerminalState, env: TerminalEnv): CommandOutput {
  if (args.length === 0) {
    return { lines: [{ text: 'usage: sudo command [args...]', type: 'error' }], newState: state };
  }
  // The first sudo of a session asks for the password; later ones reuse it (sudo's credential cache).
  const result = cmdSudoRun(args, state, env);
  if (state.sudoAuthenticated) return result;
  return {
    ...result,
    lines: [{ text: `[sudo] password for ${state.user}: ****`, type: 'info' }, ...result.lines],
    newState: { ...result.newState, sudoAuthenticated: true },
  };
}

function cmdSudoRun(args: string[], state: TerminalState, env: TerminalEnv): CommandOutput {
  if (args[0] === '-i' || args[0] === '-s') {
    return { lines: [{ text: `root@${state.hostname}:~# (session root simulée — tapez "exit" pour revenir)`, type: 'success' }], newState: state };
  }
  if (args[0] === '-l') {
    return { lines: [
      { text: 'Matching Defaults entries for user:', type: 'output' },
      { text: '    env_reset, mail_badpass', type: 'output' },
      { text: '', type: 'output' },
      { text: 'User user may run the following commands on terminal-lab:', type: 'output' },
      { text: '    (ALL : ALL) ALL', type: 'output' },
    ], newState: state };
  }
  // Run the command as root — just delegate but mark it as sudo
  // Run the command as root. runLine, not processCommand: the history already
  // holds `sudo …`, the inner command must not be recorded a second time.
  const wasRoot = runningAsRoot;
  runningAsRoot = true;
  try {
    return runLine(state, args.join(' '), env);
  } finally {
    runningAsRoot = wasRoot;
  }
}

/** True while `sudo` runs a command (apt refuses to change the system otherwise). */
let runningAsRoot = false;

const APT_NEEDS_ROOT = new Set(['update', 'upgrade', 'install', 'remove', 'purge', 'autoremove', 'full-upgrade']);

function cmdApt(cmd: string, args: string[]): OutputLine[] {
  const sub = args[0] ?? '';
  const pkgs = args.slice(1).filter((a) => !a.startsWith('-'));
  if (!sub) return [{ text: `Usage: ${cmd} update | upgrade | install <paquet> | remove <paquet> | search <mot>`, type: 'error' }];
  if (APT_NEEDS_ROOT.has(sub) && !runningAsRoot) {
    return [
      { text: 'E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)', type: 'error' },
      { text: 'E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?', type: 'error' },
    ];
  }
  switch (sub) {
    case 'update':
      return [
        { text: 'Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease', type: 'output' },
        { text: 'Get:2 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]', type: 'output' },
        { text: 'Reading package lists... Done', type: 'output' },
        { text: 'All packages are up to date.', type: 'success' },
      ];
    case 'upgrade':
    case 'full-upgrade':
      return [
        { text: 'Reading package lists... Done', type: 'output' },
        { text: '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.', type: 'success' },
      ];
    case 'install':
      if (!pkgs.length) return [{ text: 'E: Aucun paquet indiqué — par exemple : sudo apt install tree', type: 'error' }];
      return [
        { text: 'Reading package lists... Done', type: 'output' },
        { text: `The following NEW packages will be installed: ${pkgs.join(' ')}`, type: 'output' },
        ...pkgs.map((p) => ({ text: `Setting up ${p} ...`, type: 'success' as const })),
      ];
    case 'remove':
    case 'purge':
    case 'autoremove':
      return pkgs.map((p) => ({ text: `Removing ${p} ...`, type: 'success' as const }));
    case 'search':
    case 'show':
    case 'list':
      return [{ text: `(recherche simulée : ${pkgs.join(' ') || 'tous les paquets'} — sur une vraie machine, apt interroge les dépôts Ubuntu)`, type: 'info' }];
    default:
      return [{ text: `E: Invalid operation ${sub}`, type: 'error' }];
  }
}

function cmdTop(state: TerminalState): OutputLine[] {
  return [
    { text: `top - ${new Date().toLocaleTimeString()} up 2 days, 1 user, load average: 0.12, 0.08, 0.05`, type: 'output' },
    { text: 'Tasks:  95 total,   1 running,  94 sleeping,   0 stopped,   0 zombie', type: 'output' },
    { text: '%Cpu(s):  1.5 us,  0.5 sy,  0.0 ni, 97.8 id,  0.0 wa,  0.1 hi,  0.1 si', type: 'output' },
    { text: 'MiB Mem :   7900.0 total,   4200.0 free,   2400.0 used,   1300.0 buff/cache', type: 'output' },
    { text: '', type: 'output' },
    { text: '  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND', type: 'output' },
    { text: ` 1234 ${state.user}      20   0  450000  25000  10000 S   2.3   0.3   0:05.23 node`, type: 'output' },
    { text: '    1 root      20   0   22000   1500   1000 S   0.0   0.0   0:01.00 systemd', type: 'output' },
    { text: '  100 root      20   0   15000   1000    800 S   0.0   0.0   0:00.50 sshd', type: 'output' },
    { text: '', type: 'info' },
    { text: '[Simulation] top interactif non disponible — utilisez q pour quitter en vrai.', type: 'info' },
  ];
}

function cmdJobs(): OutputLine[] {
  return [{ text: '(aucun job en arrière-plan dans ce terminal simulé)', type: 'info' }];
}

function cmdBgFg(cmd: string, args: string[]): OutputLine[] {
  const job = args[0] ?? '%1';
  if (cmd === 'fg') {
    return [{ text: `${job}: aucun job correspondant (terminal simulé)`, type: 'error' }];
  }
  return [{ text: `${job}: aucun job correspondant (terminal simulé)`, type: 'error' }];
}

function cmdTee(args: string[]): OutputLine[] {
  const files = args.filter((a) => !a.startsWith('-'));
  if (files.length === 0) {
    return [{ text: 'tee: missing file operand\nUsage: tee [-a] file...', type: 'error' }];
  }
  return [{ text: `(tee: la sortie serait copiée vers ${files.join(', ')} — simulation sans stdin)`, type: 'info' }];
}

function cmdGetJob(): OutputLine[] {
  return [
    { text: 'Id     Name            PSJobTypeName   State         HasMoreData', type: 'output' },
    { text: '--     ----            -------------   -----         -----------', type: 'output' },
    { text: '(aucun job actif dans ce terminal simulé)', type: 'info' },
  ];
}

// cmdCrontab → moved to ./commands/env.ts

// ─── Scripts ──────────────────────────────────────────────────────────────────

/** PowerShell's $PROFILE for the simulated user (C:\Users\user = ~ in this filesystem). */
const PS_PROFILE_PATH = '~/documents/PowerShell/Microsoft.PowerShell_profile.ps1';
const PS_PROFILE_DISPLAY = 'C:\\Users\\user\\documents\\PowerShell\\Microsoft.PowerShell_profile.ps1';

/**
 * A script that calls itself (or two that call each other) must not hang the
 * tab. Depth alone is not enough: N lines each calling an N-line script is N³
 * runs within the depth limit, so the whole call tree also shares a line budget.
 */
const MAX_SCRIPT_DEPTH = 3;
const MAX_SCRIPT_LINES = 500;
let scriptDepth = 0;
let scriptLinesRun = 0;
let scriptBudgetHit = false;

interface ScriptCall {
  /** As typed, for error messages (`./script.sh`, `.\script.sh`). */
  invoked: string;
  file: string;
  /** `./x` needs the execute bit; `bash x` does not — the lesson on chmod relies on it. */
  requireExec: boolean;
}

function scriptCall(parts: string[], env: TerminalEnv): ScriptCall | null {
  const [first = '', second] = parts;
  if (/^\.[\\/]./.test(first)) {
    return { invoked: first, file: first.slice(2).replace(/\\/g, '/'), requireExec: env !== 'windows' };
  }
  if (['bash', 'sh', 'zsh'].includes(first.toLowerCase()) && second && !second.startsWith('-')) {
    return { invoked: second, file: second.replace(/\\/g, '/'), requireExec: false };
  }
  return null;
}

function runScript(state: TerminalState, call: ScriptCall, env: TerminalEnv): CommandOutput {
  const prefix = env === 'windows' ? '' : 'bash: ';
  const fail = (reason: string): CommandOutput => ({
    lines: [{ text: `${prefix}${call.invoked}: ${reason}`, type: 'error' }],
    newState: state,
  });
  const node = getNode(state.root, resolvePath(state, call.file));
  if (!node) return fail('No such file or directory');
  if (node.type === 'directory') return fail('Is a directory');
  if (call.requireExec && node.permissions[3] !== 'x') return fail('Permission denied');
  if (scriptDepth >= MAX_SCRIPT_DEPTH) return fail('trop de scripts imbriqués (limite du simulateur)');

  if (scriptDepth === 0) {
    scriptLinesRun = 0;
    scriptBudgetHit = false;
  }
  scriptDepth++;
  try {
    let s = state;
    let lines: OutputLine[] = [];
    let cleared = false;
    for (const raw of node.content.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue; // comments and the #! shebang
      if (scriptBudgetHit) break;
      if (++scriptLinesRun > MAX_SCRIPT_LINES) {
        scriptBudgetHit = true;
        lines = [...lines, { text: `${prefix}${call.invoked}: script interrompu après ${MAX_SCRIPT_LINES} lignes exécutées (limite du simulateur)`, type: 'error' }];
        break;
      }
      const out = processCommand(s, line, env);
      if (out.clear) cleared = true;
      // `clear` wipes what the script printed so far; later lines still show.
      lines = out.clear ? [...out.lines] : [...lines, ...out.lines];
      s = out.newState;
    }
    // A script runs in a child shell: the files it writes stay, but its `cd`
    // and the variables it exports vanish with it (the difference with
    // `source`), and its lines never enter the caller's history.
    return { lines, clear: cleared || undefined, newState: { ...state, root: s.root, git: s.git } };
  } finally {
    scriptDepth--;
  }
}

// ─── Shell layer: lists, pipelines, redirections ─────────────────────────────

/**
 * Whether the command running now writes to the screen. Commands that format
 * for a person (like `ls` in columns) switch to one item per line otherwise.
 * Set around each command by runPipeline, restored after it.
 */
let stdoutIsTerminal = true;

/** Where a stream goes: the screen, the next command, a file, or nowhere. */
type Sink = { kind: 'screen' } | { kind: 'pipe' } | { kind: 'null' } | { kind: 'file'; key: string };

interface OpenFile { path: string[]; typed: string; append: boolean; chunks: string[] }

interface PipelineResult { lines: OutputLine[]; newState: TerminalState; ok: boolean; clear: boolean }

const outLines = (texts: string[]): OutputLine[] => texts.map((text) => ({ text, type: 'output' as const }));

function openFailure(typed: string, reason: string, env: TerminalEnv): OutputLine {
  return env === 'windows'
    ? { text: `Out-File: Could not find a part of the path '${typed}'.`, type: 'error' }
    : { text: `bash: ${typed}: ${reason}`, type: 'error' };
}

/** Checks a redirection target the way the shell opens it: before the command runs. */
function checkWritable(state: TerminalState, typed: string, env: TerminalEnv): { path: string[] } | { error: OutputLine } {
  const path = resolvePath(state, typed);
  const parent = getNode(state.root, path.slice(0, -1));
  if (!parent || parent.type !== 'directory' || path.length === 0) {
    return { error: openFailure(typed, 'No such file or directory', env) };
  }
  if (getNode(state.root, path)?.type === 'directory') return { error: openFailure(typed, 'Is a directory', env) };
  return { path };
}

/** Writes (or appends) text to a file; the target was already checked. */
function writeFileAt(root: DirectoryNode, path: string[], content: string, append: boolean): DirectoryNode {
  const newRoot = deepCloneRoot(root);
  const parent = getNode(newRoot, path.slice(0, -1)) as DirectoryNode;
  const name = path[path.length - 1];
  const existing = parent.children[name];
  const before = existing?.type === 'file' ? existing.content : '';
  const text = append ? before + (before && content ? '\n' : '') + content : content;
  parent.children[name] = existing?.type === 'file' ? { ...existing, content: text } : makeFile(text);
  return newRoot;
}

/** `tee`, `Tee-Object`, `Out-File`… : write the piped text to each file. */
function writeFromPipe(state: TerminalState, files: string[], text: string, append: boolean, env: TerminalEnv): { root: DirectoryNode; errors: OutputLine[] } {
  let root = state.root;
  const errors: OutputLine[] = [];
  for (const f of files) {
    const target = checkWritable({ ...state, root }, f, env);
    if ('error' in target) errors.push(target.error);
    else root = writeFileAt(root, target.path, text, append);
  }
  return { root, errors };
}

/** Value that follows a PowerShell parameter (`-FilePath x`), case-insensitive. */
function psParam(args: string[], ...names: string[]): string | undefined {
  const i = args.findIndex((a) => names.includes(a.toLowerCase()));
  return i >= 0 ? args[i + 1] : undefined;
}

/** A table printed by the simulator (`Get-Process`, `ps aux`): header line + `----` line. */
function splitHeader(lines: string[]): { header: string[]; rows: string[] } {
  return lines.length >= 2 && /^[\s-]+$/.test(lines[1]) && lines[1].includes('--')
    ? { header: lines.slice(0, 2), rows: lines.slice(2) }
    : { header: [], rows: lines };
}

function compareValues(a: string, b: string, numeric: boolean): number {
  if (numeric) return (parseFloat(a) || 0) - (parseFloat(b) || 0);
  return a.localeCompare(b);
}

/** A number of lines from `-n 5`, `-n5`, `-5` (head/tail), or the default. */
function lineCount(args: string[], fallback: number): number {
  const i = args.findIndex((a) => a === '-n');
  if (i >= 0) return parseInt(args[i + 1] ?? '', 10) || fallback;
  const attached = args.find((a) => /^-n?\d+$/.test(a));
  return attached ? parseInt(attached.replace(/^-n?/, ''), 10) : fallback;
}

/**
 * A command that reads standard input (the right side of `|`, or `< file`).
 * Commands that do not read it run as usual; unknown readers pass the text through.
 */
function runFilter(state: TerminalState, text: string, stdin: string, env: TerminalEnv): CommandOutput {
  const parts = parseArgs(text);
  const cmd = (parts[0] ?? '').toLowerCase();
  const args = parts.slice(1);
  const flags = args.filter((a) => a.startsWith('-'));
  const operands = args.filter((a) => !a.startsWith('-'));
  const input = stdin === '' ? [] : stdin.split('\n');
  const same = (lines: OutputLine[], s: TerminalState = state): CommandOutput => ({ lines, newState: s });

  switch (cmd) {
    case 'wc': {
      const { lines, words, bytes } = textCounts(stdin);
      if (flags.some((f) => f.includes('l'))) return same(outLines([String(lines)]));
      if (flags.some((f) => f.includes('w'))) return same(outLines([String(words)]));
      if (flags.some((f) => f.includes('c'))) return same(outLines([String(bytes)]));
      return same(outLines([`${lines} ${words} ${bytes}`]));
    }

    case 'grep': {
      const pattern = operands[0] ?? '';
      const ignoreCase = flags.some((f) => f.includes('i'));
      const regexResult = buildGrepRegex(pattern, ignoreCase ? 'i' : '');
      if (!regexResult.ok) return same([regexResult.error]);
      const invert = flags.some((f) => f.includes('v'));
      const matches = input.map((line, i) => ({ line, i })).filter(({ line }) => regexResult.regex.test(line) !== invert);
      const status = matches.length ? 0 : 1;
      if (flags.some((f) => f.includes('c'))) return { ...same(outLines([String(matches.length)])), status };
      const numbered = flags.some((f) => f.includes('n'));
      return { ...same(outLines(matches.map(({ line, i }) => (numbered ? `${i + 1}:${line}` : line)))), status };
    }

    case 'select-string':
    case 'sls':
    case 'findstr': {
      // Select-String ignores case by default; findstr only with /I.
      const pattern = psParam(args, '-pattern') ?? args.find((a) => !a.startsWith('-') && !a.startsWith('/')) ?? '';
      const ignoreCase = cmd !== 'findstr' || args.some((a) => a.toLowerCase() === '/i');
      const regexResult = buildGrepRegex(pattern, ignoreCase ? 'i' : '');
      if (!regexResult.ok) return same([regexResult.error]);
      const matches = input.filter((line) => regexResult.regex.test(line));
      return { ...same(outLines(matches)), status: matches.length ? 0 : 1 };
    }

    case 'sort': {
      // `-r`, `-n`, `-k3`, and combined forms such as `-k3rn` or `-rn`.
      const joined = flags.join('');
      const keyArg = args.find((a) => /^-k\d/.test(a)) ?? (args.includes('-k') ? `-k${args[args.indexOf('-k') + 1]}` : undefined);
      const key = keyArg ? parseInt(keyArg.slice(2), 10) : 0;
      const numeric = /n/.test(joined);
      const reverse = /r/.test(joined);
      const field = (l: string) => (key ? l.trim().split(/\s+/)[key - 1] ?? '' : l);
      const sorted = input.filter(Boolean).sort((a, b) => compareValues(field(a), field(b), numeric));
      if (reverse) sorted.reverse();
      return same(outLines(sorted));
    }

    case 'sort-object': {
      const { header, rows } = splitHeader(input.filter(Boolean));
      const prop = operands[0]?.toLowerCase();
      const column = prop && header.length ? header[0].trim().split(/\s+/).findIndex((h) => h.toLowerCase() === prop) : -1;
      const cell = (row: string) => (column >= 0 ? row.trim().split(/\s+/)[column] ?? '' : row);
      const numeric = rows.length > 0 && rows.every((r) => !Number.isNaN(parseFloat(cell(r))));
      const sorted = [...rows].sort((a, b) => compareValues(cell(a), cell(b), numeric));
      if (flags.some((f) => f.toLowerCase().startsWith('-desc'))) sorted.reverse();
      return same(outLines([...header, ...sorted]));
    }

    case 'head':
      return same(outLines(input.slice(0, lineCount(args, 10))));

    case 'tail': {
      const n = lineCount(args, 10);
      return same(outLines(input.slice(Math.max(0, input.length - n))));
    }

    case 'select-object': {
      const { header, rows } = splitHeader(input);
      const first = psParam(args, '-first');
      const last = psParam(args, '-last');
      const skip = parseInt(psParam(args, '-skip') ?? '0', 10) || 0;
      let picked = rows.slice(skip);
      if (first !== undefined) picked = picked.slice(0, parseInt(first, 10) || 0);
      else if (last !== undefined) picked = picked.slice(Math.max(0, picked.length - (parseInt(last, 10) || 0)));
      return same(outLines([...header, ...picked]));
    }

    case 'uniq': {
      const groups: { line: string; count: number }[] = [];
      for (const line of input) {
        const prev = groups[groups.length - 1];
        if (prev && prev.line === line) prev.count++;
        else groups.push({ line, count: 1 });
      }
      const counted = flags.some((f) => f.includes('c'));
      return same(outLines(groups.map((g) => (counted ? `${String(g.count).padStart(7)} ${g.line}` : g.line))));
    }

    case 'measure-object':
    case 'measure': {
      const items = input.filter((l) => l.trim() !== '');
      const lower = flags.map((f) => f.toLowerCase());
      if (lower.some((f) => ['-line', '-word', '-character'].includes(f))) {
        const out: string[] = [];
        if (lower.includes('-line')) out.push(`Lines      : ${items.length}`);
        if (lower.includes('-word')) out.push(`Words      : ${stdin.split(/\s+/).filter(Boolean).length}`);
        if (lower.includes('-character')) out.push(`Characters : ${stdin.length}`);
        return same(outLines(out));
      }
      return same(outLines([`Count    : ${items.length}`, 'Average  :', 'Sum      :', 'Maximum  :', 'Minimum  :', 'Property :']));
    }

    case 'tee':
    case 'tee-object': {
      const append = flags.some((f) => ['-a', '--append', '-append'].includes(f.toLowerCase()));
      const files = cmd === 'tee'
        ? operands
        : [psParam(args, '-filepath', '-path', '-literalpath') ?? (psParam(args, '-variable') ? undefined : operands[0])].filter((f): f is string => !!f);
      const { root, errors } = writeFromPipe(state, files, stdin, append, env);
      return same([...outLines(input), ...errors], { ...state, root });
    }

    case 'out-file':
    case 'set-content':
    case 'add-content': {
      const file = psParam(args, '-filepath', '-path', '-literalpath') ?? operands[0];
      if (!file) return same([{ text: `${parts[0]}: indiquez un fichier, par exemple ${parts[0]} sortie.txt`, type: 'error' }]);
      const append = cmd === 'add-content' || flags.some((f) => f.toLowerCase() === '-append');
      const { root, errors } = writeFromPipe(state, [file], stdin, append, env);
      return same(errors, { ...state, root });
    }

    case 'out-null':
      return same([]);

    case 'stop-process':
    case 'spps':
      // The processes arrive through the pipe (`Get-Process node | Stop-Process`).
      return same([{ text: 'Processus arrêté.', type: 'success' }]);

    case 'cat':
    case 'get-content':
    case 'gc':
      // With a file argument they read the file and ignore standard input.
      return operands.length ? runSimple(state, text, env) : same(outLines(input));

    case 'less':
    case 'more':
    case 'where-object':
    case '?':
    case 'format-list':
    case 'fl':
    case 'format-table':
    case 'ft':
    case 'out-host':
    case 'out-string':
    case 'jq':
      // Displayed as received: the simulator does not filter objects or JSON.
      return same(outLines(input));

    case 'claude':
      // `git diff | claude "…"`: the lessons teach the pattern; the tool runs on the learner's machine.
      return same([{ text: `(claude reçoit ${input.length} ligne(s) par le pipe — Claude Code n'est pas simulé dans ce terminal, essayez-le sur votre machine.)`, type: 'info' }]);

    case 'sed':
    case 'awk':
    case 'cut':
    case 'tr':
    case 'xargs':
      // Not simulated yet: say so rather than pretend the text was transformed.
      return same([...outLines(input), { text: `(${cmd} n'est pas encore simulé : le texte passe tel quel.)`, type: 'info' }]);

    default:
      // A command that does not read standard input runs as usual (`echo x | mkdir d`).
      return runSimple(state, text, env);
  }
}

/** Runs `a | b | c` with its redirections; `ok` is the status of the last command. */
function runPipeline(state: TerminalState, stages: Stage[], env: TerminalEnv): PipelineResult {
  let s = state;
  let screen: OutputLine[] = [];
  let piped: string | undefined;
  let ok = true;
  let clear = false;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const isLast = i === stages.length - 1;
    // Every command of a pipeline starts in the caller's directory and variables;
    // only the files written by earlier commands are shared.
    const base: TerminalState = i === 0 ? state : { ...state, root: s.root, git: s.git };
    const fds: Record<Fd, Sink> = { 1: isLast ? { kind: 'screen' } : { kind: 'pipe' }, 2: { kind: 'screen' } };
    const files = new Map<string, OpenFile>();
    let openError: OutputLine | undefined;

    for (const r of stage.redirects) {
      if (r.kind === 'dup') {
        fds[r.fd] = fds[r.to];
        continue;
      }
      let sink: Sink;
      if (isNullDevice(r.target, env)) {
        sink = { kind: 'null' };
      } else {
        const target = checkWritable(base, r.target, env);
        if ('error' in target) { openError = target.error; break; }
        const key = target.path.join('/');
        if (!files.has(key)) files.set(key, { path: target.path, typed: r.target, append: r.append, chunks: [] });
        sink = { kind: 'file', key };
      }
      if (r.fd === 'both') { fds[1] = sink; fds[2] = sink; } else fds[r.fd] = sink;
    }

    let stdin = piped;
    if (!openError && stage.stdinFile !== undefined) {
      const node = getNode(base.root, resolvePath(base, stage.stdinFile));
      if (node?.type === 'file') stdin = node.content;
      else openError = openFailure(stage.stdinFile, node ? 'Is a directory' : 'No such file or directory', env);
    }

    piped = '';
    if (openError) {
      // Like bash: a redirection that cannot be opened stops this command only.
      screen.push(openError);
      ok = false;
      continue;
    }

    const outerTerminal = stdoutIsTerminal;
    stdoutIsTerminal = outerTerminal && fds[1].kind === 'screen';
    let result: CommandOutput;
    try {
      result = stdin !== undefined ? runFilter(base, stage.text, stdin, env) : runSimple(base, stage.text, env);
    } finally {
      stdoutIsTerminal = outerTerminal;
    }
    if (result.clear) { screen = []; clear = true; }
    ok = result.status !== undefined ? result.status === 0 : !result.lines.some((l) => l.type === 'error');

    const toPipe: string[] = [];
    for (const line of result.lines) {
      // Simulator notes are for the learner, never part of a stream.
      const sink = line.type === 'info' ? { kind: 'screen' as const } : fds[line.type === 'error' ? 2 : 1];
      if (sink.kind === 'screen') screen.push(line);
      else if (sink.kind === 'pipe') toPipe.push(line.text);
      else if (sink.kind === 'file') files.get(sink.key)!.chunks.push(line.text);
    }
    piped = toPipe.join('\n');

    s = result.newState;
    for (const f of files.values()) s = { ...s, root: writeFileAt(s.root, f.path, f.chunks.join('\n'), f.append) };
  }

  // Each command of a real pipeline runs in a subshell: only what it writes to disk stays.
  const newState = stages.length > 1 ? { ...state, root: s.root, git: s.git } : s;
  return { lines: screen, newState, ok, clear };
}

function syntaxError(message: string, env: TerminalEnv): OutputLine {
  return { text: env === 'windows' ? `ParserError: ${message}` : `bash: ${message}`, type: 'error' };
}

/** A full command line: `a && b; c | d > f`. */
function runLine(state: TerminalState, line: string, env: TerminalEnv): CommandOutput {
  const parsed = parseCommandLine(line, env);
  if (!parsed.ok) return { lines: [syntaxError(parsed.error, env)], newState: state };
  // Plain command: exactly the historical path, character for character.
  if (isPlainCommand(parsed.list)) return runSimple(state, line, env);

  let s = state;
  let screen: OutputLine[] = [];
  let lastOk = true;
  let clear = false;
  for (const item of parsed.list) {
    if (item.op === '&&' && !lastOk) continue;
    if (item.op === '||' && lastOk) continue;
    const r = runPipeline(s, item.stages, env);
    if (r.clear) { screen = []; clear = true; }
    screen = [...screen, ...r.lines];
    s = r.newState;
    lastOk = r.ok;
  }
  return { lines: screen, newState: s, clear: clear || undefined };
}

// ─── Help & Man (env-aware) ───────────────────────────────────────────────────

type CmdHelp = {
  synopsis: string;
  description: string;
  options?: string[];
  examples?: Partial<Record<TerminalEnv, string[]>>;
};

const CMD_HELP: Record<string, CmdHelp> = {
  pwd: {
    synopsis: 'pwd',
    description: 'Affiche le chemin absolu du répertoire courant.',
    examples: {
      linux: ['pwd  →  /home/user/documents'],
      macos: ['pwd  →  /Users/user/documents'],
      windows: ['Get-Location  →  C:\\Users\\user\\Documents', 'gl           (alias court)'],
    },
  },
  ls: {
    synopsis: 'ls [-la] [chemin]',
    description: 'Liste le contenu d\'un répertoire.',
    options: ['-l  format long (permissions, taille, date)', '-a  inclure les fichiers cachés'],
    examples: {
      linux: ['ls', 'ls -la', 'ls documents/'],
      macos: ['ls', 'ls -la', 'ls -G  (couleurs)'],
      windows: ['Get-ChildItem', 'dir', 'gci -Hidden  (fichiers cachés)'],
    },
  },
  cd: {
    synopsis: 'cd [répertoire]',
    description: 'Change le répertoire courant. Sans argument, retourne dans ~.',
    options: ['..   répertoire parent', '~    répertoire home', '/    racine'],
    examples: {
      linux: ['cd documents', 'cd ..', 'cd ~', 'cd /tmp'],
      macos: ['cd documents', 'cd ..', 'cd ~', 'cd /private/tmp'],
      windows: ['Set-Location documents', 'sl ..', 'cd ~'],
    },
  },
  mkdir: {
    synopsis: 'mkdir [-p] nom',
    description: 'Crée un ou plusieurs répertoires.',
    options: ['-p  crée les répertoires parents si nécessaire'],
    examples: {
      linux: ['mkdir projets', 'mkdir -p a/b/c'],
      macos: ['mkdir projets', 'mkdir -p a/b/c'],
      windows: ['New-Item -ItemType Directory -Name projets', 'md projets'],
    },
  },
  touch: {
    synopsis: 'touch fichier',
    description: 'Crée un fichier vide ou met à jour sa date.',
    examples: {
      linux: ['touch notes.txt', 'touch a.txt b.txt'],
      macos: ['touch notes.txt'],
      windows: ['New-Item -ItemType File -Name notes.txt', 'ni notes.txt'],
    },
  },
  cat: {
    synopsis: 'cat fichier [fichier2...]',
    description: 'Affiche le contenu d\'un ou plusieurs fichiers.',
    examples: {
      linux: ['cat notes.txt', 'cat a.txt b.txt'],
      macos: ['cat notes.txt'],
      windows: ['Get-Content notes.txt', 'gc notes.txt'],
    },
  },
  echo: {
    synopsis: 'echo texte',
    description: 'Affiche du texte dans le terminal. Supporte la redirection.',
    examples: {
      linux: ['echo "Bonjour"', 'echo "texte" > fichier.txt'],
      macos: ['echo "Bonjour"', 'echo "texte" > fichier.txt'],
      windows: ['Write-Host "Bonjour"', 'Write-Output "texte"'],
    },
  },
  rm: {
    synopsis: 'rm [-r] fichier',
    description: 'Supprime un fichier ou un répertoire.',
    options: ['-r  suppression récursive d\'un répertoire'],
    examples: {
      linux: ['rm notes.txt', 'rm -r dossier/'],
      macos: ['rm notes.txt', 'rm -r dossier/'],
      windows: ['Remove-Item notes.txt', 'del notes.txt', 'Remove-Item -Recurse dossier'],
    },
  },
  cp: {
    synopsis: 'cp [-r] source destination',
    description: 'Copie un fichier ou répertoire.',
    options: ['-r  copie récursive d\'un répertoire'],
    examples: {
      linux: ['cp a.txt b.txt', 'cp -r src/ dst/'],
      macos: ['cp a.txt b.txt', 'cp -r src/ dst/'],
      windows: ['Copy-Item a.txt b.txt', 'copy a.txt b.txt'],
    },
  },
  mv: {
    synopsis: 'mv source destination',
    description: 'Déplace ou renomme un fichier.',
    examples: {
      linux: ['mv a.txt b.txt', 'mv a.txt dossier/'],
      macos: ['mv a.txt b.txt'],
      windows: ['Move-Item a.txt b.txt', 'move a.txt b.txt'],
    },
  },
  grep: {
    synopsis: 'grep [-ni] motif fichier',
    description: 'Recherche les lignes correspondant à un motif dans un fichier.',
    options: ['-n  afficher les numéros de lignes', '-i  ignorer la casse'],
    examples: {
      linux: ['grep "erreur" log.txt', 'grep -ni "TODO" script.sh'],
      macos: ['grep "erreur" log.txt', 'grep -in "TODO" script.sh'],
      windows: ['Select-String "erreur" log.txt', 'sls -Pattern "TODO" -Path script.ps1'],
    },
  },
  head: {
    synopsis: 'head [-n N] fichier',
    description: 'Affiche les premières lignes d\'un fichier (10 par défaut).',
    options: ['-n N  afficher les N premières lignes'],
    examples: {
      linux: ['head notes.txt', 'head -n 5 notes.txt'],
      macos: ['head notes.txt', 'head -n 5 notes.txt'],
      windows: ['Get-Content notes.txt -TotalCount 10', 'gc notes.txt | Select-Object -First 5'],
    },
  },
  tail: {
    synopsis: 'tail [-n N] fichier',
    description: 'Affiche les dernières lignes d\'un fichier (10 par défaut).',
    options: ['-n N  afficher les N dernières lignes'],
    examples: {
      linux: ['tail notes.txt', 'tail -n 5 notes.txt'],
      macos: ['tail notes.txt', 'tail -n 5 notes.txt'],
      windows: ['Get-Content notes.txt -Tail 10', 'gc notes.txt | Select-Object -Last 5'],
    },
  },
  wc: {
    synopsis: 'wc [-lwc] fichier',
    description: 'Compte les lignes, mots et octets d\'un fichier.',
    options: ['-l  lignes seulement', '-w  mots seulement', '-c  octets seulement'],
    examples: {
      linux: ['wc notes.txt', 'wc -l notes.txt'],
      macos: ['wc notes.txt', 'wc -l notes.txt'],
      windows: ['(Get-Content notes.txt).Count  # lignes', 'gc notes.txt | Measure-Object -Word'],
    },
  },
  chmod: {
    synopsis: 'chmod mode fichier',
    description: 'Change les permissions d\'un fichier ou répertoire.',
    options: ['755  rwxr-xr-x (exécutable)', '644  rw-r--r-- (lecture)', '+x  ajouter l\'exécution'],
    examples: {
      linux: ['chmod 755 script.sh', 'chmod +x script.sh'],
      macos: ['chmod 755 script.sh', 'chmod +x script.sh'],
      windows: ['# Permissions gérées via ACL sous Windows', 'icacls fichier.txt /grant User:F'],
    },
  },
  whoami: {
    synopsis: 'whoami',
    description: 'Affiche le nom de l\'utilisateur courant.',
    examples: {
      linux: ['whoami  →  user'],
      macos: ['whoami  →  user'],
      windows: ['whoami', '$env:USERNAME'],
    },
  },
  ps: {
    synopsis: 'ps [aux]',
    description: 'Liste les processus en cours d\'exécution.',
    options: ['aux  afficher tous les processus avec détails'],
    examples: {
      linux: ['ps', 'ps aux', 'ps aux | grep node'],
      macos: ['ps', 'ps aux', 'ps aux | grep node'],
      windows: ['Get-Process', 'gps', 'Get-Process node'],
    },
  },
  kill: {
    synopsis: 'kill PID',
    description: 'Envoie un signal à un processus (par défaut SIGTERM).',
    examples: {
      linux: ['kill 1234', 'kill -9 1234  (SIGKILL)'],
      macos: ['kill 1234', 'kill -9 1234'],
      windows: ['Stop-Process -Id 1234', 'Stop-Process -Name node'],
    },
  },
  history: {
    synopsis: 'history',
    description: 'Affiche l\'historique des commandes de la session.',
    examples: {
      linux: ['history', 'history | grep cd'],
      macos: ['history', 'history | grep cd'],
      windows: ['Get-History', 'history'],
    },
  },
  clear: {
    synopsis: 'clear',
    description: 'Efface l\'écran du terminal.',
    examples: {
      linux: ['clear'],
      macos: ['clear'],
      windows: ['Clear-Host', 'cls', 'clear'],
    },
  },
  man: {
    synopsis: 'man commande',
    description: 'Affiche l\'aide d\'une commande. Équivalent de "help <commande>".',
    examples: {
      linux: ['man ls', 'man grep'],
      macos: ['man ls', 'man grep'],
      windows: ['Get-Help Get-ChildItem', 'help ls'],
    },
  },
  brew: {
    synopsis: 'brew install|update|list [paquet]',
    description: 'Gestionnaire de paquets Homebrew (macOS).',
    examples: {
      macos: ['brew install wget', 'brew update', 'brew list'],
    },
  },
  winget: {
    synopsis: 'winget install|list [paquet]',
    description: 'Gestionnaire de paquets Windows (winget).',
    examples: {
      windows: ['winget install git', 'winget list'],
    },
  },
  open: {
    synopsis: 'open fichier|dossier|URL',
    description: 'Ouvre un fichier, dossier ou URL avec l\'application par défaut (macOS).',
    examples: {
      macos: ['open notes.txt', 'open .', 'open https://example.com'],
    },
  },
  chown: {
    synopsis: 'chown [user][:group] fichier...',
    description: 'Change le propriétaire et/ou le groupe d\'un fichier (requiert sudo).',
    examples: {
      linux: ['sudo chown alice notes.txt', 'sudo chown alice:devs notes.txt', 'sudo chown -R user:user projets/'],
      macos: ['sudo chown alice notes.txt', 'sudo chown -R user:staff projets/'],
    },
  },
  sudo: {
    synopsis: 'sudo commande [args...]',
    description: 'Exécute une commande avec les droits superutilisateur (root). Principe du moindre privilège.',
    options: [
      '-i  : ouvrir un shell root interactif',
      '-l  : lister les commandes autorisées',
      '-s  : shell root sans changer de répertoire',
    ],
    examples: {
      linux: ['sudo apt update', 'sudo chmod 600 ~/.ssh/id_rsa', 'sudo -i'],
      macos: ['sudo brew install htop', 'sudo dscacheutil -flushcache', 'sudo -i'],
    },
  },
  top: {
    synopsis: 'top',
    description: 'Affiche les processus en temps réel avec leur consommation CPU/mémoire. q=quitter, k=kill, M=tri mémoire.',
    examples: {
      linux: ['top', 'htop'],
      macos: ['top', 'top -o cpu'],
      windows: ['Get-Process | Sort-Object CPU -Descending | Select-Object -First 10'],
    },
  },
  tee: {
    synopsis: 'tee [-a] fichier...',
    description: 'Lit stdin et écrit simultanément vers stdout et vers un fichier. -a pour ajouter.',
    examples: {
      linux: ['ls -la | tee liste.txt', 'npm run build 2>&1 | tee build.log', 'cat fichier | tee -a log.txt'],
      macos: ['ls -la | tee liste.txt', 'make install 2>&1 | tee install.log'],
      windows: ['Get-ChildItem | Tee-Object -FilePath liste.txt', 'npm run build | Tee-Object -FilePath build.log'],
    },
  },
  jobs: {
    synopsis: 'jobs',
    description: 'Liste les processus lancés en arrière-plan dans le shell courant.',
    examples: {
      linux: ['jobs', 'npm run dev &  # puis jobs pour voir'],
      macos: ['jobs', 'python3 script.py & ; jobs'],
      windows: ['Get-Job', 'Start-Job { npm run dev } ; Get-Job'],
    },
  },
  export: {
    synopsis: 'export [NOM[=VALEUR]]',
    description: 'Définit ou affiche les variables d\'environnement exportées.',
    examples: {
      linux: ['export GREETING=Hello', 'export PATH=$PATH:/opt/bin', 'export'],
      macos: ['export GREETING=Hello', 'export NODE_ENV=development', 'export'],
    },
  },
  env: {
    synopsis: 'env',
    description: 'Affiche toutes les variables d\'environnement.',
    examples: {
      linux: ['env', 'env | grep PATH'],
      macos: ['env', 'env | grep USER'],
      windows: ['Get-ChildItem Env:', 'Get-ChildItem Env: | Where-Object { $_.Name -eq "PATH" }'],
    },
  },
  printenv: {
    synopsis: 'printenv [NOM...]',
    description: 'Affiche la valeur d\'une ou plusieurs variables d\'environnement.',
    examples: {
      linux: ['printenv PATH', 'printenv USER HOME', 'printenv'],
      macos: ['printenv PATH', 'printenv SHELL'],
    },
  },
  source: {
    synopsis: 'source fichier  ou  . fichier',
    description: 'Exécute un fichier de configuration dans le shell courant (recharge .bashrc, .zshrc, etc.).',
    examples: {
      linux: ['source ~/.bashrc', '. ~/.profile'],
      macos: ['source ~/.zshrc', '. ~/.profile'],
    },
  },
  crontab: {
    synopsis: 'crontab [-l] [-e] [-r]',
    description: 'Gère les tâches planifiées (cron jobs). -l liste, -e édite, -r supprime.',
    examples: {
      linux: ['crontab -l', 'crontab -e'],
      macos: ['crontab -l', 'crontab -e'],
    },
  },
  uname: {
    synopsis: 'uname [-a]',
    description: 'Affiche les informations du système (nom, version, architecture).',
    examples: {
      linux: ['uname', 'uname -a'],
    },
  },
  date: {
    synopsis: 'date',
    description: 'Affiche la date et l\'heure courante.',
    examples: {
      linux: ['date'],
      macos: ['date'],
    },
  },
  pbcopy: {
    synopsis: 'pbcopy / pbpaste',
    description: 'Copie stdin vers / colle depuis le presse-papiers (macOS).',
    examples: {
      macos: ['echo "texte" | pbcopy', 'pbpaste'],
    },
  },
};

// Alias map: maps PS cmdlet names / aliases back to CMD_HELP keys
const CMD_HELP_ALIASES: Record<string, string> = {
  'get-location': 'pwd', 'gl': 'pwd',
  'set-location': 'cd', 'sl': 'cd',
  'get-childitem': 'ls', 'gci': 'ls', 'dir': 'ls',
  'get-content': 'cat', 'gc': 'cat',
  'new-item': 'touch', 'ni': 'touch',
  'copy-item': 'cp', 'cpi': 'cp', 'copy': 'cp',
  'move-item': 'mv', 'mi': 'mv', 'move': 'mv',
  'remove-item': 'rm', 'ri': 'rm', 'del': 'rm', 'erase': 'rm',
  'write-host': 'echo', 'write-output': 'echo',
  'get-process': 'ps', 'gps': 'ps',
  'stop-process': 'kill', 'spps': 'kill', 'taskkill': 'kill',
  'select-string': 'grep', 'sls': 'grep',
  'clear-host': 'clear', 'cls': 'clear', 'md': 'mkdir',
  'tee-object': 'tee',
};

function toPascalCase(s: string): string {
  return s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
}

function getHelpText(env: TerminalEnv = 'linux'): string {
  // Reverse alias map: CMD_HELP key → list of PS aliases (insertion order preserved)
  const reverseAliases: Record<string, string[]> = {};
  for (const [alias, key] of Object.entries(CMD_HELP_ALIASES)) {
    (reverseAliases[key] ??= []).push(alias);
  }

  const COL = 28;
  // Commands whose bash synopsis would be misleading in Windows context —
  // they are covered by the specialByEnv.windows entries instead
  const SKIP_WINDOWS = new Set(['jobs', 'export', 'env', 'printenv', 'source']);

  const cmdLines: string[] = [];
  for (const [key, entry] of Object.entries(CMD_HELP)) {
    if (!entry.examples?.[env]) continue;
    if (env === 'windows' && SKIP_WINDOWS.has(key)) continue;

    let synopsis: string;
    if (env === 'windows') {
      const aliases = reverseAliases[key] ?? [];
      const fullName = aliases.find((a) => a.includes('-'));
      const shortAlias = aliases.find((a) => !a.includes('-'));
      synopsis = fullName
        ? shortAlias ? `${toPascalCase(fullName)} (${shortAlias})` : toPascalCase(fullName)
        : entry.synopsis;
    } else {
      synopsis = entry.synopsis;
    }
    cmdLines.push(`  ${synopsis.padEnd(COL)}${entry.description}`);
  }

  const specialByEnv: Record<TerminalEnv, string[]> = {
    linux: [
      `  ${'man [commande]'.padEnd(COL)}Manuel d'une commande`,
      `  ${'help [commande]'.padEnd(COL)}Aide sur une commande`,
      `  ${'about'.padEnd(COL)}Informations sur le projet`,
      `  ${'hall-of-fame'.padEnd(COL)}Liste des contributeurs`,
    ],
    macos: [
      `  ${'help [commande]'.padEnd(COL)}Aide sur une commande`,
      `  ${'about'.padEnd(COL)}Informations sur le projet`,
    ],
    windows: [
      `  ${'$env:VAR = "val"'.padEnd(COL)}Définir une variable d'environnement`,
      `  ${'Get-ChildItem Env:'.padEnd(COL)}Lister toutes les variables d'env`,
      `  ${'Start-Job { ... }'.padEnd(COL)}Lancer un job en arrière-plan`,
      `  ${'Get-Job / Stop-Job'.padEnd(COL)}Gérer les jobs PowerShell`,
      `  ${'help [commande]'.padEnd(COL)}Aide sur une commande`,
      `  ${'about'.padEnd(COL)}Informations sur le projet`,
    ],
  };

  const HEADERS: Record<TerminalEnv, string> = {
    linux:   'Commandes disponibles — Linux / bash:',
    macos:   'Commandes disponibles — macOS / zsh:',
    windows: 'Commandes disponibles — PowerShell / Windows:',
  };

  const TIPS: Record<TerminalEnv, string> = {
    linux: `─────────────────────────────────────────────────────────────
💡 Dans un vrai terminal Linux, cherche de l'aide avec :
  man <commande>       # manuel complet (q pour quitter)
  <commande> --help    # aide rapide
  whatis <commande>    # description en une ligne
  apropos <mot-clé>    # trouver une commande par description`,
    macos: `─────────────────────────────────────────────────────────────
💡 Dans un vrai terminal macOS, cherche de l'aide avec :
  man <commande>       # manuel complet (q pour quitter)
  <commande> --help    # aide rapide
  whatis <commande>    # description en une ligne
  apropos <mot-clé>    # trouver une commande par description`,
    windows: `─────────────────────────────────────────────────────────────
💡 Dans un vrai PowerShell, cherche de l'aide avec :
  Get-Help <commande>   # aide complète (ex: Get-Help Get-ChildItem)
  <commande> -?         # aide rapide
  Get-Command           # lister toutes les commandes disponibles
  Get-Member            # explorer les propriétés et méthodes d'un objet`,
  };

  return [HEADERS[env], ...cmdLines, ...specialByEnv[env], '', TIPS[env]].join('\n');
}

function getCmdHelp(cmdName: string, env: TerminalEnv = 'linux'): OutputLine[] | null {
  const key = CMD_HELP_ALIASES[cmdName] ?? cmdName;
  const entry = CMD_HELP[key];
  if (!entry) return null;

  const lines: OutputLine[] = [
    { text: `${key.toUpperCase()} — ${entry.synopsis}`, type: 'info' },
    { text: '', type: 'output' },
    { text: entry.description, type: 'output' },
  ];

  if (entry.options?.length) {
    lines.push({ text: '', type: 'output' });
    lines.push({ text: 'Options :', type: 'info' });
    entry.options.forEach((o) => lines.push({ text: `  ${o}`, type: 'output' }));
  }

  const envExamples = entry.examples?.[env] ?? entry.examples?.linux;
  if (envExamples?.length) {
    lines.push({ text: '', type: 'output' });
    lines.push({ text: 'Exemples :', type: 'info' });
    envExamples.forEach((e) => lines.push({ text: `  ${e}`, type: 'output' }));
  }

  return lines;
}

// ─── Main Command Processor ───────────────────────────────────────────────────

export function processCommand(state: TerminalState, input: string, env: TerminalEnv = 'linux'): CommandOutput {
  let trimmed = input.trim();
  let expandedFrom: OutputLine | null = null;

  // Bash history expansion: `!!` is the previous command (`sudo !!`), outside single quotes.
  if (env !== 'windows' && hasHistoryBang(trimmed)) {
    const previous = state.commandHistory[state.commandHistory.length - 1];
    if (previous === undefined) return { lines: [{ text: 'bash: !!: event not found', type: 'error' }], newState: state };
    trimmed = expandHistoryBang(trimmed, previous);
    // Bash prints the expanded line before running it.
    expandedFrom = { text: trimmed, type: 'info' };
  }

  const newHistory = trimmed ? [...state.commandHistory, trimmed] : state.commandHistory;
  const newState: TerminalState = { ...state, commandHistory: newHistory };

  if (!trimmed) return { lines: [], newState };
  const wasWindows = windowsPaths;
  windowsPaths = env === 'windows';
  let result: CommandOutput;
  try {
    result = runLine(newState, trimmed, env);
  } finally {
    windowsPaths = wasWindows;
  }
  return expandedFrom && !result.clear ? { ...result, lines: [expandedFrom, ...result.lines] } : result;
}

/** `!!` outside single quotes. */
function hasHistoryBang(line: string): boolean {
  return splitSingleQuoted(line).some((part, i) => i % 2 === 0 && part.includes('!!'));
}

function expandHistoryBang(line: string, previous: string): string {
  return splitSingleQuoted(line).map((part, i) => (i % 2 === 0 ? part.split('!!').join(previous) : `'${part}'`)).join('');
}

/** Even indexes: outside single quotes; odd indexes: the quoted text, quotes removed. */
function splitSingleQuoted(line: string): string[] {
  return line.split("'");
}

/** The command name as typed (not lower-cased): that is what a real shell repeats. */
function commandNotFound(typed: string, state: TerminalState): CommandOutput {
  return { lines: [{ text: `${typed}: commande introuvable. Tapez 'help' pour la liste des commandes.`, type: 'error' }], newState: state };
}

/** One command, without list, pipe or redirection — the shell layer handles those. */
function runSimple(state: TerminalState, trimmed: string, env: TerminalEnv): CommandOutput {
  let newState = state;

  // Handle PowerShell $env: variable assignment ($env:VAR = "value")
  const psEnvSet = trimmed.match(/^\$env:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (psEnvSet) {
    const [, varName, rawValue] = psEnvSet;
    // Double quotes expand `$env:X` (`"$env:PATH;C:\outils"`); single quotes keep it literal.
    const shown = varsForEnv(newState.envVars, env);
    const unquoted = rawValue.replace(/^["']|["']$/g, '');
    const varValue = rawValue.startsWith("'")
      ? unquoted
      : unquoted.replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/g, (_, ref: string) => shown[ref] ?? '');
    return {
      lines: [{ text: `$env:${varName} défini à "${varValue}"`, type: 'success' }],
      newState: { ...newState, envVars: { ...newState.envVars, [varName]: varValue } },
    };
  }

  // Handle PowerShell standalone $env:VAR read
  const psEnvGet = trimmed.match(/^\$env:([A-Za-z_][A-Za-z0-9_]*)$/);
  if (psEnvGet) {
    const [, varName] = psEnvGet;
    const value = varsForEnv(newState.envVars, env)[varName];
    return {
      lines: value !== undefined
        ? [{ text: value, type: 'output' }]
        : [{ text: `La variable $env:${varName} n'est pas définie.`, type: 'error' }],
      newState,
    };
  }

  if (env === 'windows') {
    // `$PROFILE` alone prints the path of the profile script, like PowerShell.
    if (/^\$profile$/i.test(trimmed)) {
      return { lines: [{ text: PS_PROFILE_DISPLAY, type: 'output' }], newState };
    }
    // `(Get-Content file).Count` — number of lines, the PowerShell `wc -l`.
    const psCount = trimmed.match(/^\(\s*(?:get-content|gc|cat)\s+(.+?)\s*\)\.count$/i);
    if (psCount) {
      const target = parseArgs(psCount[1]).map((p) => (/^\$profile$/i.test(p) ? PS_PROFILE_PATH : p));
      const out = cmdCat(newState, target);
      const errors = out.filter((l) => l.type === 'error');
      return { lines: errors.length ? errors : [{ text: String(out.length), type: 'output' }], newState };
    }
  }

  // Parse command
  let parts = parseArgs(trimmed);
  const cmd = parts[0]?.toLowerCase();
  if (env === 'windows') {
    // `$PROFILE` as an argument: a readable path for echo, the file itself otherwise.
    const shown = ['echo', 'write-output', 'write-host'].includes(cmd ?? '');
    parts = parts.map((p) => (/^\$profile$/i.test(p) ? (shown ? PS_PROFILE_DISPLAY : PS_PROFILE_PATH) : p));
  }
  const args = parts.slice(1);

  // Linux looks commands up case-sensitively: `LS` is not `ls`. (macOS disks and
  // PowerShell ignore case; names with a dash are PowerShell cmdlets.)
  // Only bare names: a path (`./README.md`) keeps its case and is a file, not a command.
  if (env === 'linux' && parts[0] !== cmd && !/[-/\\]/.test(parts[0])) return commandNotFound(parts[0], newState);

  const script = scriptCall(parts, env);
  if (script) return runScript(newState, script, env);

  // Dependencies for Windows/macOS alias handler
  const winDeps: WindowsCmdDeps = {
    cmdPwd, cmdCd, cmdLs, cmdCat, cmdMkdir, cmdTouch,
    cmdCp, cmdMv, cmdRm, cmdEcho, cmdGrep, cmdEnv,
  };

  switch (cmd) {
    case 'pwd':
      return { lines: cmdPwd(newState, env), newState };

    case 'ls':
      return { lines: cmdLs(newState, args), newState };

    case 'cd': {
      const { lines, newCwd } = cmdCd(newState, args, env);
      if (newCwd) newState = { ...newState, cwd: newCwd, previousCwd: newState.cwd };
      return { lines, newState };
    }

    case 'mkdir': {
      const { lines, newRoot } = cmdMkdir(newState, args);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    case 'touch': {
      const { lines, newRoot } = cmdTouch(newState, args);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    case 'cat':
      return { lines: cmdCat(newState, args), newState };

    case 'echo':
      return { lines: cmdEcho(args, varsForEnv(newState.envVars, env)), newState };

    // ── Environment & scripts → commands/env.ts ───────────────────────────────
    case 'export':
    case 'env':
    case 'printenv':
    case 'source':
    case '.':
    case 'crontab':
      return handleEnv(cmd, args, newState, env);

    case 'chown': {
      if (env === 'windows') return { lines: [{ text: 'chown n\'est pas disponible sur Windows. Utilisez icacls ou takeown.', type: 'info' }], newState };
      return { lines: cmdChown(args), newState };
    }

    case 'chgrp': {
      if (env === 'windows') return { lines: [{ text: 'chgrp n\'est pas disponible sur Windows. Utilisez icacls.', type: 'info' }], newState };
      const [group, ...files] = args;
      if (!group || !files.length) return { lines: [{ text: 'chgrp: missing operand', type: 'error' }], newState };
      return { lines: files.map((f) => ({ text: `${f}: groupe changé en '${group}'`, type: 'success' as const })), newState };
    }

    case 'sudo': {
      if (env === 'windows') return { lines: [{ text: 'sudo n\'est pas disponible sur Windows. Utilisez "Exécuter en tant qu\'administrateur" ou Start-Process -Verb RunAs.', type: 'info' }], newState };
      return cmdSudo(args, newState, env);
    }

    case 'top':
    case 'htop':
      return { lines: cmdTop(newState), newState };

    case 'jobs':
      return { lines: cmdJobs(), newState };

    case 'fg':
    case 'bg':
      return { lines: cmdBgFg(cmd, args), newState };

    case 'tee':
    case 'tee-object':
      return { lines: cmdTee(args), newState };

    case 'get-acl':
    case 'icacls': {
      if (args.length === 0) return { lines: [{ text: `Usage: ${cmd} fichier`, type: 'error' }], newState };
      const target = args[0];
      return { lines: [
        { text: `${target}  NT AUTHORITY\\SYSTEM:(I)(F)`, type: 'output' },
        { text: `      BUILTIN\\Administrators:(I)(F)`, type: 'output' },
        { text: `      ${newState.user}:(I)(M)`, type: 'output' },
        { text: `      BUILTIN\\Users:(I)(RX)`, type: 'output' },
      ], newState };
    }

    case 'takeown': {
      const fileArg = args.find((a) => !a.startsWith('/'));
      return { lines: [{ text: `SUCCESS: The file (or folder): "${fileArg ?? '.'}" now owned by "${newState.user}".`, type: 'success' }], newState };
    }

    case 'get-job':
    case 'receive-job':
    case 'stop-job':
    case 'start-job':
      return { lines: cmdGetJob(), newState };

    case 'rm': {
      const { lines, newRoot } = cmdRm(newState, args);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    case 'cp': {
      const { lines, newRoot } = cmdCp(newState, args);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    case 'mv': {
      const { lines, newRoot, newCwd } = cmdMv(newState, args);
      if (newRoot) newState = { ...newState, root: newRoot };
      if (newCwd) newState = { ...newState, cwd: newCwd };
      return { lines, newState };
    }

    case 'grep': {
      const lines = cmdGrep(newState, args);
      // Exit 1 when nothing matched, so `grep x f || …` works.
      return { lines, newState, status: lines.some((l) => l.type === 'output') ? 0 : 1 };
    }

    case 'head':
      return { lines: cmdHead(newState, args), newState };

    case 'tail':
      return { lines: cmdTail(newState, args), newState };

    case 'wc':
      return { lines: cmdWc(newState, args), newState };

    case 'chmod': {
      const { lines, newRoot } = cmdChmod(newState, args);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    case 'whoami':
      // Under sudo the command runs as root: that is what `sudo whoami` demonstrates.
      return { lines: [{ text: runningAsRoot ? 'root' : newState.user, type: 'output' }], newState };

    case 'hostname':
      return { lines: [{ text: newState.hostname, type: 'output' }], newState };

    case 'date':
      return { lines: [{ text: new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'medium' }), type: 'output' }], newState };

    case 'uname':
      if (env === 'macos') {
        return { lines: [{ text: args.includes('-a') ? `Darwin ${newState.hostname} 23.0.0 Darwin Kernel Version 23.0.0 arm64` : 'Darwin', type: 'output' }], newState };
      }
      if (env === 'windows') {
        return { lines: [{ text: `uname: commande non disponible. Utilisez 'Get-ComputerInfo' sous PowerShell.`, type: 'error' }], newState };
      }
      if (args.includes('-a')) {
        return { lines: [{ text: `Linux ${newState.hostname} 5.15.0 #1 SMP x86_64 GNU/Linux`, type: 'output' }], newState };
      }
      return { lines: [{ text: 'Linux', type: 'output' }], newState };

    case 'history':
      return {
        lines: newState.commandHistory.map((c, i) => ({
          text: `  ${String(i + 1).padStart(3)}  ${c}`,
          type: 'output' as const,
        })),
        newState,
      };

    case 'ps': {
      const header = '  PID TTY          TIME CMD';
      const rows = [
        '    1 ?        00:00:01 init',
        ' 1234 pts/0    00:00:00 bash',
        ' 2048 pts/0    00:00:02 node',
        ' 5678 pts/0    00:00:00 ps',
      ];
      if (args.includes('aux')) {
        return {
          lines: [
            { text: 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND', type: 'output' },
            { text: 'root         1  0.0  0.1  22544  1024 ?        Ss   10:00   0:01 /sbin/init', type: 'output' },
            { text: `${newState.user}      1234  0.0  0.2  15000  2048 pts/0    Ss   10:01   0:00 bash`, type: 'output' },
            { text: `${newState.user}      2048  0.1  1.2 450000 12288 pts/0    Sl   10:02   0:02 node`, type: 'output' },
            { text: `${newState.user}      5678  0.0  0.1   8000  1024 pts/0    R+   10:05   0:00 ps aux`, type: 'output' },
          ],
          newState,
        };
      }
      return {
        lines: [header, ...rows].map((t) => ({ text: t, type: 'output' as const })),
        newState,
      };
    }

    case 'apt':
    case 'apt-get':
      // Debian / Ubuntu package manager: Linux only.
      if (env !== 'linux') return commandNotFound(parts[0], newState);
      return { lines: cmdApt(cmd, args), newState };

    case 'killall':
      if (env === 'windows') return commandNotFound(parts[0], newState);
      // Real killall prints nothing on success.
      if (!args.filter((a) => !a.startsWith('-')).length) return { lines: [{ text: 'killall: usage: killall [-s signal] nom', type: 'error' }], newState };
      return { lines: [], newState };

    case 'kill':
      if (!args.length) return { lines: [{ text: 'kill: usage: kill PID', type: 'error' }], newState };
      return { lines: [{ text: `Signal envoyé au processus ${args[args.length - 1]}`, type: 'success' }], newState };

    case 'clear':
      return { lines: [], clear: true, newState };

    case 'help': {
      if (args.length) {
        const target = args[0].toLowerCase();
        const helpLines = getCmdHelp(target, env);
        if (helpLines) return { lines: helpLines, newState };
        return { lines: [{ text: `help: pas d'aide disponible pour '${args[0]}'`, type: 'error' }], newState };
      }
      return {
        lines: getHelpText(env).split('\n').map((t) => ({ text: t, type: 'output' as const })),
        newState,
      };
    }

    case 'man': {
      if (!args.length) return { lines: [{ text: 'man: quelle commande voulez-vous ?', type: 'error' }], newState };
      const target = args[0].toLowerCase();
      const manLines = getCmdHelp(target, env);
      if (manLines) return { lines: manLines, newState };
      return { lines: [{ text: `man: pas de page de manuel pour '${args[0]}'`, type: 'error' }], newState };
    }

    case 'exit':
    case 'logout':
      return { lines: [{ text: 'logout', type: 'output' }], newState };

    case 'about':
      return {
        lines: [
          { text: '╔══════════════════════════════════════════════════╗', type: 'info' },
          { text: '║           Terminal Learning  v0.1.0              ║', type: 'info' },
          { text: '╠══════════════════════════════════════════════════╣', type: 'info' },
          { text: '║  Application interactive d\'apprentissage         ║', type: 'info' },
          { text: '║  du terminal pour débutants.                     ║', type: 'info' },
          { text: '║                                                  ║', type: 'info' },
          { text: '║  Licence   : MIT                                 ║', type: 'info' },
          { text: '║  Auteur    : Thierry Vanmeeteren                 ║', type: 'info' },
          { text: '║  GitHub    : github.com/thierryvm/TerminalLearning ║', type: 'info' },
          { text: '║  Live      : terminallearning.dev        ║', type: 'info' },
          { text: '║                                                  ║', type: 'info' },
          { text: '║  Stack     : React 18 · Vite 6 · Tailwind 4     ║', type: 'info' },
          { text: '╚══════════════════════════════════════════════════╝', type: 'info' },
        ],
        newState,
      };

    case 'hall-of-fame':
      return {
        lines: [
          { text: '╔══════════════════════════════════════════════════╗', type: 'info' },
          { text: '║           Hall of Fame — Contributeurs           ║', type: 'info' },
          { text: '╠══════════════════════════════════════════════════╣', type: 'info' },
          { text: '║  Aucun contributeur pour le moment.              ║', type: 'info' },
          { text: '║  Star le repo GitHub pour soutenir le projet.    ║', type: 'info' },
          { text: '╚══════════════════════════════════════════════════╝', type: 'info' },
        ],
        newState,
      };


    // ── Network & SSH (Module 8) → commands/network.ts ──────────────────────
    case 'ping':
    case 'curl':
    case 'wget':
    case 'invoke-webrequest':
    case 'iwr':
    case 'nslookup':
    case 'dig':
    case 'resolve-dnsname':
    case 'ssh':
    case 'ssh-keygen':
    case 'scp':
      return handleNetwork(cmd, args, newState, env);

    // ── Git (Modules 9 & 10) → commands/git.ts ───────────────────────────────
    case 'git': {
      // `git init <dir>` creates the directory and initialises the repository inside it.
      const initDir = args[0]?.toLowerCase() === 'init' ? args.slice(1).find((a) => !a.startsWith('-')) : undefined;
      if (initDir) {
        const made = cmdMkdir(newState, ['-p', initDir]);
        if (!made.newRoot) return { lines: made.lines, newState };
        const inside = { ...newState, root: made.newRoot, cwd: resolvePath(newState, initDir) };
        const r = handleGit(inside, ['init'], env);
        return { ...r, newState: { ...r.newState, cwd: newState.cwd } };
      }
      return handleGit(newState, args, env);
    }

    // ── IA (Module 11) → commands/ai.ts ──────────────────────────────────────
    case 'ai-help':
      return handleAiHelp(args, newState);

    // ── Windows/macOS aliases & platform commands → commands/windows.ts ───────
    default: {
      const winResult = handleWindows(cmd, args, newState, env, winDeps);
      if (winResult !== null) return winResult;
      return commandNotFound(parts[0], newState);
    }
  }
}
