// Types are defined in ./commands/types.ts and re-exported here for backward compatibility.
import type { TerminalEnv, FileNode, DirectoryNode, FSNode, GitCommit, GitState, TerminalState, CommandOutput, OutputLine } from './commands/types';
export type { TerminalEnv, FileNode, DirectoryNode, FSNode, GitCommit, GitState, TerminalState, CommandOutput, OutputLine };

// ─── Command module handlers ──────────────────────────────────────────────────
import { handleGit } from './commands/git';
import { handleNetwork } from './commands/network';
import { handleAiHelp } from './commands/ai';
import { cmdEnv, handleEnv } from './commands/env';
import { handleWindows } from './commands/windows';
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
      PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
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


function resolvePath(state: TerminalState, input: string): string[] {
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
    if (cwd.length >= 2 && cwd[0] === 'home' && cwd[1] === 'user') {
      const rest = cwd.slice(2);
      const base = 'C:\\Users\\user';
      return rest.length === 0 ? base : base + '\\' + rest.join('\\');
    }
    return 'C:\\' + cwd.join('\\');
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
  'about', 'donate', 'support', 'hall-of-fame',
  'export', 'env', 'printenv', 'source', 'crontab',
  'chown', 'chgrp', 'sudo', 'top', 'htop', 'jobs', 'fg', 'bg', 'tee',
  'git',
];

/**
 * Returns possible completions for the current input.
 * - No space: completes command names
 * - With space: completes filesystem paths (relative or absolute)
 */
export function getTabCompletions(input: string, state: TerminalState): string[] {
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

  if (partial.includes('/')) {
    const slashIdx = partial.lastIndexOf('/');
    pathPrefix = partial.slice(0, slashIdx + 1); // e.g. "documents/"
    namePrefix = partial.slice(slashIdx + 1);    // e.g. "n"
    const dirPart = pathPrefix.length > 1 ? pathPrefix.slice(0, -1) : '/';
    parentPath = resolvePath(state, dirPart);
  } else {
    pathPrefix = '';
    namePrefix = partial;
    parentPath = state.cwd;
  }

  const parentNode = getNode(state.root, parentPath);
  if (!parentNode || parentNode.type !== 'directory') return [];

  const matches = Object.keys(parentNode.children).filter((n) => n.startsWith(namePrefix));

  return matches.map((name) => {
    const node = (parentNode as DirectoryNode).children[name];
    const suffix = node.type === 'directory' ? '/' : '';
    return inputPrefix + pathPrefix + name + suffix;
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
  const size = node.type === 'file' ? String(node.size).padStart(6) : '  4096';
  const date = 'Mar 30 10:00';
  const links = node.type === 'directory' ? ' 2' : ' 1';
  return `${perm}${links} ${owner} ${group} ${size} ${date} ${name}`;
}

// ─── Command Handlers ─────────────────────────────────────────────────────────

function cmdPwd(state: TerminalState, env: TerminalEnv = 'linux'): OutputLine[] {
  return [{ text: displayPathForEnv(state.cwd, env), type: 'output' }];
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

  const entries = Object.entries(node.children)
    .filter(([name]) => showAll || !name.startsWith('.'))
    .sort(([a], [b]) => {
      const aIsDir = node.children[a].type === 'directory';
      const bIsDir = node.children[b].type === 'directory';
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

  if (showAll) {
    entries.unshift(['.', node], ['..', node]);
  }

  if (!longFormat) {
    const names = entries.map(([name, n]) => (n.type === 'directory' ? name + '/' : name));
    return [{ text: names.join('  '), type: 'output' }];
  }

  const lines: OutputLine[] = [{ text: `total ${entries.length}`, type: 'output' }];
  for (const [name, n] of entries) {
    lines.push({ text: formatLongEntry(name, n), type: 'output' });
  }
  return lines;
}

function cmdCd(state: TerminalState, args: string[]): { lines: OutputLine[]; newCwd?: string[] } {
  const target = args[0];
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

function cmdCp(state: TerminalState, args: string[]): { lines: OutputLine[]; newRoot?: DirectoryNode } {
  const flags = args.filter((a) => a.startsWith('-'));
  const paths = args.filter((a) => !a.startsWith('-'));
  const recursive = flags.some((f) => f.includes('r') || f.includes('R'));

  if (paths.length < 2) return { lines: [{ text: 'cp: missing destination file operand', type: 'error' }] };

  const src = paths[0];
  const dst = paths[1];
  const newRoot = deepCloneRoot(state.root);

  const srcResolved = resolvePath(state, src);
  const srcNode = getNode(newRoot, srcResolved);
  if (!srcNode) return { lines: [{ text: `cp: cannot stat '${src}': No such file or directory`, type: 'error' }] };
  if (srcNode.type === 'directory' && !recursive) {
    return { lines: [{ text: `cp: -r not specified; omitting directory '${src}'`, type: 'error' }] };
  }

  const dstResolved = resolvePath(state, dst);
  const dstParentPath = dstResolved.slice(0, -1);
  const dstName = dstResolved[dstResolved.length - 1];
  const dstParent = getNode(newRoot, dstParentPath) as DirectoryNode;
  if (!dstParent || dstParent.type !== 'directory') {
    return { lines: [{ text: `cp: cannot create file '${dst}': No such file or directory`, type: 'error' }] };
  }

  dstParent.children[dstName] = cloneFSNode(srcNode, { n: 0 });
  return { lines: [], newRoot };
}

function cmdMv(state: TerminalState, args: string[]): { lines: OutputLine[]; newRoot?: DirectoryNode } {
  if (args.length < 2) return { lines: [{ text: 'mv: missing destination file operand', type: 'error' }] };
  const src = args[0];
  const dst = args[1];
  const newRoot = deepCloneRoot(state.root);

  const srcResolved = resolvePath(state, src);
  const srcParentPath = srcResolved.slice(0, -1);
  const srcName = srcResolved[srcResolved.length - 1];
  const srcParent = getNode(newRoot, srcParentPath) as DirectoryNode;

  if (!srcParent || !srcParent.children[srcName]) {
    return { lines: [{ text: `mv: cannot stat '${src}': No such file or directory`, type: 'error' }] };
  }

  const dstResolved = resolvePath(state, dst);
  const dstParentPath = dstResolved.slice(0, -1);
  const dstName = dstResolved[dstResolved.length - 1];
  const dstParent = getNode(newRoot, dstParentPath) as DirectoryNode;

  if (!dstParent || dstParent.type !== 'directory') {
    return { lines: [{ text: `mv: cannot move '${src}' to '${dst}': No such file or directory`, type: 'error' }] };
  }

  dstParent.children[dstName] = srcParent.children[srcName];
  delete srcParent.children[srcName];
  return { lines: [], newRoot };
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

function cmdWc(state: TerminalState, args: string[]): OutputLine[] {
  const flags = args.filter((a) => a.startsWith('-'));
  const paths = args.filter((a) => !a.startsWith('-'));
  if (!paths.length) return [{ text: 'wc: missing file operand', type: 'error' }];

  const lines: OutputLine[] = [];
  for (const p of paths) {
    const node = getNode(state.root, resolvePath(state, p));
    if (!node) { lines.push({ text: `wc: ${p}: No such file or directory`, type: 'error' }); continue; }
    if (node.type === 'directory') { lines.push({ text: `wc: ${p}: Is a directory`, type: 'error' }); continue; }
    const lc = node.content.split('\n').length;
    const wc = node.content.split(/\s+/).filter(Boolean).length;
    const cc = node.content.length;
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

  // Apply permission change (simplified)
  const permsMap: Record<string, string> = {
    '755': 'rwxr-xr-x', '644': 'rw-r--r--', '600': 'rw-------',
    '777': 'rwxrwxrwx', '700': 'rwx------', '444': 'r--r--r--',
  };
  const prefix = node.type === 'directory' ? 'd' : '-';
  if (permsMap[mode]) {
    node.permissions = prefix + permsMap[mode];
  } else if (mode.includes('+x')) {
    const cur = node.permissions;
    node.permissions = cur.slice(0, 4) + 'x' + cur.slice(5, 7) + 'x' + cur.slice(8, 10) + 'x';
  }
  return { lines: [{ text: `Mode de '${filePath}' changé`, type: 'success' }], newRoot };
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
  const subCmd = args.join(' ');
  const subResult = processCommand(state, subCmd, env);
  return subResult;
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

function cmdEchoRedirect(
  state: TerminalState,
  text: string,
  filePath: string,
  append: boolean
): { lines: OutputLine[]; newRoot?: DirectoryNode } {
  const newRoot = deepCloneRoot(state.root);
  const resolved = resolvePath(state, filePath);
  const parentPath = resolved.slice(0, -1);
  const name = resolved[resolved.length - 1];
  const parent = getNode(newRoot, parentPath) as DirectoryNode;
  if (!parent || parent.type !== 'directory') {
    return { lines: [{ text: `bash: ${filePath}: No such file or directory`, type: 'error' }] };
  }
  const existing = parent.children[name];
  const existingContent = existing?.type === 'file' ? existing.content : '';
  const newContent = append ? existingContent + (existingContent ? '\n' : '') + text : text;
  parent.children[name] = makeFile(newContent);
  return { lines: [], newRoot };
}

function cmdPipe(state: TerminalState, left: string, right: string): OutputLine[] {
  // Execute left side and feed output to right side's stdin
  const leftResult = processCommand(state, left, 'linux');
  const inputText = leftResult.lines.filter((l) => l.type === 'output').map((l) => l.text).join('\n');

  // Simulate stdin for right command
  const rightParts = parseArgs(right.trim());
  const rightCmd = rightParts[0];
  const rightArgs = rightParts.slice(1);

  if (rightCmd === 'wc') {
    const flags = rightArgs.filter((a) => a.startsWith('-'));
    const lines = inputText.split('\n').filter(Boolean);
    const words = inputText.split(/\s+/).filter(Boolean);
    const bytes = inputText.length;
    if (flags.some((f) => f.includes('l'))) return [{ text: String(lines.length), type: 'output' }];
    if (flags.some((f) => f.includes('w'))) return [{ text: String(words.length), type: 'output' }];
    if (flags.some((f) => f.includes('c'))) return [{ text: String(bytes), type: 'output' }];
    return [{ text: `${lines.length} ${words.length} ${bytes}`, type: 'output' }];
  }

  if (rightCmd === 'grep') {
    const flags = rightArgs.filter((a) => a.startsWith('-'));
    const pattern = rightArgs.find((a) => !a.startsWith('-')) || '';
    const ignoreCase = flags.some((f) => f.includes('i'));
    const showLineNumbers = flags.some((f) => f.includes('n'));
    const regexResult = buildGrepRegex(pattern, ignoreCase ? 'i' : '');
    if (!regexResult.ok) return [regexResult.error];
    const lines = inputText.split('\n');
    const matches = lines.map((line, i) => ({ line, i })).filter(({ line }) => regexResult.regex.test(line));
    return matches.map(({ line, i }) => ({
      text: showLineNumbers ? `${i + 1}:${line}` : line,
      type: 'output' as const,
    }));
  }

  if (rightCmd === 'sort') {
    const lines = inputText.split('\n').filter(Boolean);
    const flags = rightArgs.filter((a) => a.startsWith('-'));
    const sorted = [...lines].sort();
    if (flags.some((f) => f.includes('r'))) sorted.reverse();
    return sorted.map((l) => ({ text: l, type: 'output' as const }));
  }

  if (rightCmd === 'head') {
    const nFlag = rightArgs.find((a) => a.startsWith('-n'));
    const n = nFlag ? parseInt(nFlag.slice(2)) || 10 : 10;
    return inputText.split('\n').slice(0, n).map((l) => ({ text: l, type: 'output' as const }));
  }

  return leftResult.lines;
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
      `  ${'donate / support'.padEnd(COL)}Soutenir le projet`,
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
  const trimmed = input.trim();
  const newHistory = trimmed ? [...state.commandHistory, trimmed] : state.commandHistory;
  let newState: TerminalState = { ...state, commandHistory: newHistory };

  if (!trimmed) return { lines: [], newState };

  // Handle pipes
  if (trimmed.includes('|')) {
    const [left, ...rest] = trimmed.split('|');
    const right = rest.join('|');
    const pipeLines = cmdPipe(state, left.trim(), right.trim());
    return { lines: pipeLines, newState };
  }

  // Handle output redirection
  const appendMatch = trimmed.match(/^(.+?)\s*>>\s*(.+)$/);
  const writeMatch = trimmed.match(/^(.+?)\s*>\s*(.+)$/);
  if (appendMatch) {
    const cmd = appendMatch[1].trim();
    const file = appendMatch[2].trim();
    const echoArgs = parseArgs(cmd);
    if (echoArgs[0] === 'echo') {
      const { lines, newRoot } = cmdEchoRedirect(state, echoArgs.slice(1).join(' '), file, true);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }
  } else if (writeMatch) {
    const cmd = writeMatch[1].trim();
    const file = writeMatch[2].trim();
    const echoArgs = parseArgs(cmd);
    if (echoArgs[0] === 'echo') {
      const { lines, newRoot } = cmdEchoRedirect(state, echoArgs.slice(1).join(' '), file, false);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }
  }

  // Handle PowerShell $env: variable assignment ($env:VAR = "value")
  const psEnvSet = trimmed.match(/^\$env:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (psEnvSet) {
    const [, varName, rawValue] = psEnvSet;
    const varValue = rawValue.replace(/^["']|["']$/g, '');
    return {
      lines: [{ text: `$env:${varName} défini à "${varValue}"`, type: 'success' }],
      newState: { ...newState, envVars: { ...newState.envVars, [varName]: varValue } },
    };
  }

  // Handle PowerShell standalone $env:VAR read
  const psEnvGet = trimmed.match(/^\$env:([A-Za-z_][A-Za-z0-9_]*)$/);
  if (psEnvGet) {
    const [, varName] = psEnvGet;
    const value = newState.envVars[varName];
    return {
      lines: value !== undefined
        ? [{ text: value, type: 'output' }]
        : [{ text: `La variable $env:${varName} n'est pas définie.`, type: 'error' }],
      newState,
    };
  }

  // Parse command
  const parts = parseArgs(trimmed);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

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
      const { lines, newCwd } = cmdCd(newState, args);
      if (newCwd) newState = { ...newState, cwd: newCwd };
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
      return { lines: cmdEcho(args, newState.envVars), newState };

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
      const { lines, newRoot } = cmdMv(newState, args);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    case 'grep':
      return { lines: cmdGrep(newState, args), newState };

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
      return { lines: [{ text: newState.user, type: 'output' }], newState };

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

    case 'donate':
    case 'support':
      return {
        lines: [
          { text: '╔══════════════════════════════════════════════════╗', type: 'success' },
          { text: '║        Soutenir Terminal Learning  ♥             ║', type: 'success' },
          { text: '╠══════════════════════════════════════════════════╣', type: 'success' },
          { text: '║  Ce projet est 100% gratuit et open source.      ║', type: 'success' },
          { text: '║  Si l\'app t\'a aidé, tu peux soutenir :           ║', type: 'success' },
          { text: '║                                                  ║', type: 'success' },
          { text: '║  ⭐ Star le repo GitHub                          ║', type: 'success' },
          { text: '║     github.com/thierryvm/TerminalLearning        ║', type: 'output' },
          { text: '║                                                  ║', type: 'success' },
          { text: '║  💜 GitHub Sponsors — bientôt disponible         ║', type: 'success' },
          { text: '║     github.com/sponsors/thierryvm               ║', type: 'output' },
          { text: '║  ☕ Ko-fi — bientôt disponible                   ║', type: 'success' },
          { text: '║     ko-fi.com/thierryvm                          ║', type: 'output' },
          { text: '║                                                  ║', type: 'success' },
          { text: '║  ⏳ En attente d\'accord mutuelle (RIZIV/INAMI)  ║', type: 'info' },
          { text: '║                                                  ║', type: 'success' },
          { text: '║  Merci pour ton soutien !                        ║', type: 'success' },
          { text: '╚══════════════════════════════════════════════════╝', type: 'success' },
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
          { text: '║  Sois le premier ! → tapez "donate"              ║', type: 'info' },
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
      return handleNetwork(cmd, args, newState);

    // ── Git (Modules 9 & 10) → commands/git.ts ───────────────────────────────
    case 'git':
      return handleGit(newState, args, env);

    // ── IA (Module 11) → commands/ai.ts ──────────────────────────────────────
    case 'ai-help':
      return handleAiHelp(args, newState);

    // ── Windows/macOS aliases & platform commands → commands/windows.ts ───────
    default: {
      const winResult = handleWindows(cmd, args, newState, env, winDeps);
      if (winResult !== null) return winResult;
      return {
        lines: [{ text: `${cmd}: commande introuvable. Tapez 'help' pour la liste des commandes.`, type: 'error' }],
        newState,
      };
    }
  }
}
