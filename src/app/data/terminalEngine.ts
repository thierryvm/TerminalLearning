// ─── Types ────────────────────────────────────────────────────────────────────

export type TerminalEnv = 'linux' | 'macos' | 'windows';

export interface FileNode {
  type: 'file';
  content: string;
  permissions: string;
  owner: string;
  group: string;
  size: number;
}

export interface DirectoryNode {
  type: 'directory';
  children: Record<string, FSNode>;
  permissions: string;
  owner: string;
  group: string;
}

export type FSNode = FileNode | DirectoryNode;

// ─── Git Simulation Types ─────────────────────────────────────────────────────

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

/**
 * In-memory git state for the terminal simulator.
 * Tracks repo initialization, branches, staging area, history, and remotes.
 * Intentionally simplified — models the concepts taught in Modules 9 & 10,
 * not a full git implementation.
 */
export interface GitState {
  /** Whether `git init` has been run in the current directory */
  initialized: boolean;
  /** Currently checked-out branch name */
  branch: string;
  /** All local branches */
  branches: string[];
  /** Files staged for the next commit (relative paths as strings) */
  stagedFiles: string[];
  /** Commit history, newest first */
  commits: GitCommit[];
  /** Remote name → URL mapping */
  remotes: Record<string, string>;
}

export interface TerminalState {
  root: DirectoryNode;
  cwd: string[];
  commandHistory: string[];
  user: string;
  hostname: string;
  /** Environment variables (export VAR=value / $env:VAR = "value"). */
  envVars: Record<string, string>;
  /**
   * Git simulation state. Undefined until `git init` is run.
   * Persists across commands within the same terminal session.
   */
  git?: GitState;
}

export interface CommandOutput {
  lines: OutputLine[];
  clear?: boolean;
  newState: TerminalState;
}

export interface OutputLine {
  text: string;
  type: 'output' | 'error' | 'success' | 'info';
}

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
                '# Variables d\'environnement du projet\n# NE JAMAIS committer ce fichier !\nDB_HOST=localhost\nDB_PORT=5432\nDB_NAME=myapp\nDB_USER=admin\nDB_PASSWORD=secret123\nAPI_KEY=sk-abc123xyz456\nNODE_ENV=development'
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

function cmdEcho(args: string[], envVars?: Record<string, string>): OutputLine[] {
  const text = args.join(' ');
  if (!envVars) return [{ text, type: 'output' }];
  // Interpolate $env:VAR (PowerShell) and $VAR (bash) from envVars
  const expanded = text.replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(envVars, name) ? envVars[name] : ''
  ).replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(envVars, name) ? envVars[name] : ''
  );
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

function cmdHead(state: TerminalState, args: string[]): OutputLine[] {
  let n = 10;
  let filePath = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n' && args[i + 1]) { n = parseInt(args[i + 1]) || 10; i++; }
    else if (args[i].startsWith('-n')) { n = parseInt(args[i].slice(2)) || 10; }
    else filePath = args[i];
  }
  if (!filePath) return [{ text: 'head: missing file operand', type: 'error' }];
  const node = getNode(state.root, resolvePath(state, filePath));
  if (!node) return [{ text: `head: cannot open '${filePath}': No such file or directory`, type: 'error' }];
  if (node.type === 'directory') return [{ text: `head: ${filePath}: Is a directory`, type: 'error' }];
  return node.content.split('\n').slice(0, n).map((line) => ({ text: line, type: 'output' as const }));
}

function cmdTail(state: TerminalState, args: string[]): OutputLine[] {
  let n = 10;
  let filePath = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n' && args[i + 1]) { n = parseInt(args[i + 1]) || 10; i++; }
    else if (args[i].startsWith('-n')) { n = parseInt(args[i].slice(2)) || 10; }
    else filePath = args[i];
  }
  if (!filePath) return [{ text: 'tail: missing file operand', type: 'error' }];
  const node = getNode(state.root, resolvePath(state, filePath));
  if (!node) return [{ text: `tail: cannot open '${filePath}': No such file or directory`, type: 'error' }];
  if (node.type === 'directory') return [{ text: `tail: ${filePath}: Is a directory`, type: 'error' }];
  const lines = node.content.split('\n');
  return lines.slice(-n).map((line) => ({ text: line, type: 'output' as const }));
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

function cmdExport(args: string[], state: TerminalState): { lines: OutputLine[]; envVars: Record<string, string> } {
  if (args.length === 0) {
    // `export` with no args — list all vars
    const lines = Object.entries(state.envVars).map(([k, v]) => ({
      text: `declare -x ${k}="${v}"`,
      type: 'output' as const,
    }));
    return { lines, envVars: state.envVars };
  }
  const newEnv = { ...state.envVars };
  const lines: OutputLine[] = [];
  for (const arg of args) {
    const eqIdx = arg.indexOf('=');
    if (eqIdx === -1) {
      // `export VAR` without value — just marks for export (no-op here)
      lines.push({ text: '', type: 'output' });
    } else {
      const name = arg.slice(0, eqIdx);
      const value = arg.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        lines.push({ text: `export: '${name}': not a valid identifier`, type: 'error' });
      } else {
        newEnv[name] = value;
        lines.push({ text: '', type: 'output' });
      }
    }
  }
  return { lines: lines.filter((l) => l.text !== ''), envVars: newEnv };
}

function cmdEnv(state: TerminalState): OutputLine[] {
  return Object.entries(state.envVars).map(([k, v]) => ({
    text: `${k}=${v}`,
    type: 'output' as const,
  }));
}

function cmdPrintenv(args: string[], state: TerminalState): OutputLine[] {
  if (args.length === 0) return cmdEnv(state);
  return args.map((name) => {
    if (Object.prototype.hasOwnProperty.call(state.envVars, name)) {
      return { text: state.envVars[name], type: 'output' as const };
    }
    return { text: '', type: 'error' as const };
  }).filter((l) => l.text !== '');
}

function cmdSource(args: string[]): OutputLine[] {
  const file = args[0] ?? '(unknown)';
  const display = file.replace('~/', '$HOME/');
  return [{ text: `${display}: loaded`, type: 'success' }];
}

// ─── New Module 5/6 Commands ──────────────────────────────────────────────────

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

function cmdCrontab(args: string[]): OutputLine[] {
  if (args.includes('-l')) {
    return [
      { text: '# Crontab — tâches planifiées', type: 'output' },
      { text: '# Format: minute heure jour mois jour_semaine commande', type: 'output' },
      { text: '0 9 * * 1-5 /home/user/projets/script.sh   # Tous les jours de semaine à 9h', type: 'output' },
      { text: '*/30 * * * * /usr/local/bin/backup.sh       # Toutes les 30 minutes', type: 'output' },
    ];
  }
  if (args.includes('-e')) {
    return [{ text: 'crontab: ouverture de l\'éditeur (nano). En mode simulé, utilisez "crontab -l" pour voir les entrées.', type: 'info' }];
  }
  if (args.includes('-r')) {
    return [{ text: 'crontab supprimé.', type: 'success' }];
  }
  return [{ text: 'Usage: crontab [-l] [-e] [-r]', type: 'error' }];
}

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

function getHelpText(env: TerminalEnv = 'linux'): string {
  if (env === 'windows') {
    return `Commandes disponibles — PowerShell / Windows:
  Get-Location (gl)           Afficher le répertoire courant
  Set-Location (sl) [path]    Changer de répertoire
  Get-ChildItem (dir)         Lister les fichiers et dossiers
  Get-Content (gc) [file]     Afficher le contenu d'un fichier
  New-Item (ni) [name]        Créer un fichier ou dossier
  Copy-Item (copy) src dst    Copier un fichier
  Move-Item (move) src dst    Déplacer / renommer
  Remove-Item (del) [file]    Supprimer un fichier
  Write-Host [texte]          Afficher du texte (supporte $env:VAR)
  $env:VAR = "val"            Définir une variable d'environnement
  Get-ChildItem Env:          Lister toutes les variables d'env
  Start-Job { ... }           Lancer un job en arrière-plan
  Get-Job / Stop-Job          Gérer les jobs PowerShell
  Tee-Object -FilePath f      Afficher ET sauvegarder la sortie
  Get-Process (gps)           Lister les processus
  Stop-Process -Name [nom]    Arrêter un processus
  Select-String pat file      Rechercher dans un fichier
  Clear-Host (cls)            Effacer le terminal
  history                     Historique des commandes
  winget install|list         Gestionnaire de paquets
  help [commande]             Aide sur une commande
  about                       Informations sur le projet

─────────────────────────────────────────────────────────────
💡 Dans un vrai PowerShell, cherche de l'aide avec :
  Get-Help <commande>   # aide complète (ex: Get-Help Get-ChildItem)
  <commande> -?         # aide rapide
  Get-Command           # lister toutes les commandes disponibles
  Get-Member            # explorer les propriétés et méthodes d'un objet`;
  }
  if (env === 'macos') {
    return `Commandes disponibles — macOS / zsh:
  pwd              Afficher le répertoire courant
  ls [-la] [path]  Lister les fichiers (-l: détails, -a: cachés)
  cd [chemin]      Changer de répertoire
  mkdir [-p] [nom] Créer un répertoire
  touch [nom]      Créer un fichier
  cat [file]       Afficher le contenu d'un fichier
  echo [texte]     Afficher du texte (supporte $VAR)
  rm [-r] [file]   Supprimer un fichier
  cp [-r] src dst  Copier
  mv src dst       Déplacer / renommer
  grep [-ni] p f   Rechercher dans un fichier
  head / tail      Début / fin d'un fichier (-n N)
  wc [-lwc] [file] Compter lignes/mots/octets
  chmod m file     Changer les permissions
  export [VAR=val] Définir une variable d'environnement
  env / printenv   Afficher les variables d'environnement
  source ~/.zshrc  Recharger la configuration shell
  crontab [-l|-e]  Gérer les tâches planifiées
  chown u[:g] f    Changer le propriétaire d'un fichier
  sudo commande    Exécuter avec les droits root
  top / htop       Monitoring processus en temps réel
  jobs / fg / bg   Gérer les processus en arrière-plan
  tee [-a] fichier Afficher ET sauvegarder la sortie
  open [file|URL]  Ouvrir avec l'app par défaut
  pbcopy/pbpaste   Presse-papiers
  brew install|list Gestionnaire de paquets Homebrew
  ps [aux]         Lister les processus
  kill [PID]       Arrêter un processus
  history          Historique des commandes
  clear            Effacer le terminal
  help [commande]  Aide sur une commande
  about            Informations sur le projet

─────────────────────────────────────────────────────────────
💡 Dans un vrai terminal macOS, cherche de l'aide avec :
  man <commande>       # manuel complet (q pour quitter)
  <commande> --help    # aide rapide
  whatis <commande>    # description en une ligne
  apropos <mot-clé>    # trouver une commande par description`;
  }
  // linux (default)
  return `Commandes disponibles — Linux / bash:
  pwd              Afficher le répertoire courant
  ls [-la] [path]  Lister les fichiers (-l: détails, -a: cachés)
  cd [chemin]      Changer de répertoire
  mkdir [-p] [nom] Créer un répertoire
  touch [nom]      Créer un fichier
  cat [file]       Afficher le contenu d'un fichier
  echo [texte]     Afficher du texte (supporte $VAR)
  rm [-r] [file]   Supprimer un fichier (-r: répertoire)
  cp [-r] src dst  Copier un fichier
  mv src dst       Déplacer / renommer
  grep [-ni] p f   Rechercher dans un fichier
  head / tail      Début / fin d'un fichier (-n N)
  wc [-lwc] [file] Compter lignes/mots/octets
  chmod m file     Changer les permissions
  export [VAR=val] Définir une variable d'environnement
  env / printenv   Afficher les variables d'environnement
  source fichier   Recharger la configuration shell
  crontab [-l|-e]  Gérer les tâches planifiées
  chown u[:g] f    Changer le propriétaire d'un fichier
  sudo commande    Exécuter avec les droits root
  top / htop       Monitoring processus en temps réel
  jobs / fg / bg   Gérer les processus en arrière-plan
  tee [-a] fichier Afficher ET sauvegarder la sortie
  whoami           Utilisateur courant
  date             Date et heure
  uname [-a]       Informations système
  ps [aux]         Lister les processus
  kill [PID]       Arrêter un processus
  history          Historique des commandes
  clear            Effacer le terminal
  man [commande]   Manuel d'une commande
  help [commande]  Aide sur une commande
  about            Informations sur le projet
  donate / support Soutenir le projet
  hall-of-fame     Liste des contributeurs

─────────────────────────────────────────────────────────────
💡 Dans un vrai terminal Linux, cherche de l'aide avec :
  man <commande>       # manuel complet (q pour quitter)
  <commande> --help    # aide rapide
  whatis <commande>    # description en une ligne
  apropos <mot-clé>    # trouver une commande par description`;
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

    case 'export': {
      if (env === 'windows') return { lines: [{ text: 'Utilisez $env:VAR = "value" en PowerShell pour définir une variable.', type: 'info' }], newState };
      const { lines: exportLines, envVars: newEnv } = cmdExport(args, newState);
      return { lines: exportLines, newState: { ...newState, envVars: newEnv } };
    }

    case 'env':
      return { lines: cmdEnv(newState), newState };

    case 'printenv':
      return { lines: cmdPrintenv(args, newState), newState };

    case 'source':
    case '.':
      return { lines: cmdSource(args), newState };

    case 'crontab':
      return { lines: cmdCrontab(args), newState };

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

    // ── Windows PowerShell aliases ─────────────────────────────────────────────

    // pwd equivalents
    case 'get-location':
    case 'gl':
      return { lines: cmdPwd(newState, env), newState };

    // cd equivalents
    case 'set-location':
    case 'sl': {
      const { lines: slLines, newCwd: slCwd } = cmdCd(newState, args);
      if (slCwd) newState = { ...newState, cwd: slCwd };
      return { lines: slLines, newState };
    }

    // ls equivalents (get-childitem also handles Env: provider)
    case 'get-childitem':
    case 'gci':
    case 'dir':
      if (args[0]?.toLowerCase() === 'env:') {
        return { lines: cmdEnv(newState), newState };
      }
      return { lines: cmdLs(newState, args), newState };

    // cat equivalents
    case 'get-content':
    case 'gc':
      return { lines: cmdCat(newState, args), newState };

    // New-Item: creates file or directory
    // Usage: New-Item name | New-Item -ItemType Directory -Name name | New-Item -ItemType File -Name name
    case 'new-item':
    case 'ni': {
      const isDir = args.some((a) => a.toLowerCase() === 'directory');
      // -Name flag or first non-flag arg
      const nameIdx = args.findIndex((a) => a.toLowerCase() === '-name');
      const pathIdx = args.findIndex((a) => a.toLowerCase() === '-path');
      const name =
        nameIdx >= 0 ? args[nameIdx + 1] :
        pathIdx >= 0 ? args[pathIdx + 1] :
        args.find((a) => !a.startsWith('-'));
      if (!name) return { lines: [{ text: 'New-Item: -Name ou chemin requis', type: 'error' }], newState };
      if (isDir) {
        const { lines: niLines, newRoot: niRoot } = cmdMkdir(newState, [name]);
        if (niRoot) newState = { ...newState, root: niRoot };
        return { lines: niLines, newState };
      } else {
        const { lines: niLines, newRoot: niRoot } = cmdTouch(newState, [name]);
        if (niRoot) newState = { ...newState, root: niRoot };
        return { lines: niLines, newState };
      }
    }

    // cp equivalents
    case 'copy-item':
    case 'cpi':
    case 'copy': {
      const cpArgs = args.filter((a) => !a.startsWith('-'));
      const { lines: cpLines, newRoot: cpRoot } = cmdCp(newState, cpArgs);
      if (cpRoot) newState = { ...newState, root: cpRoot };
      return { lines: cpLines, newState };
    }

    // mv equivalents
    case 'move-item':
    case 'mi':
    case 'move': {
      const mvArgs = args.filter((a) => !a.startsWith('-'));
      const { lines: mvLines, newRoot: mvRoot } = cmdMv(newState, mvArgs);
      if (mvRoot) newState = { ...newState, root: mvRoot };
      return { lines: mvLines, newState };
    }

    // rm equivalents
    case 'remove-item':
    case 'ri':
    case 'del':
    case 'erase': {
      const rmArgs = args.filter((a) => !a.startsWith('-'));
      const { lines: rmLines, newRoot: rmRoot } = cmdRm(newState, rmArgs);
      if (rmRoot) newState = { ...newState, root: rmRoot };
      return { lines: rmLines, newState };
    }

    // echo equivalents
    case 'write-host':
    case 'write-output':
      return { lines: cmdEcho(args.filter((a) => !a.startsWith('-')), newState.envVars), newState };

    // PowerShell env var listing — handled inline in get-childitem below

    // ps equivalents
    case 'get-process':
    case 'gps': {
      const psLines = [
        { text: 'Handles  NPM(K)  PM(K)  WS(K) VM(M)   CPU(s)   Id ProcessName', type: 'output' as const },
        { text: '-------  ------  -----  ----- -----   ------   -- -----------', type: 'output' as const },
        { text: `    256      14   4560   8192   120    0.047 1234 WindowsTerminal`, type: 'output' as const },
        { text: `     64       8   2048   4096    80    0.016 2048 node`, type: 'output' as const },
        { text: `     32       4   1024   2048    40    0.003 5678 pwsh`, type: 'output' as const },
      ];
      return { lines: psLines, newState };
    }

    // kill equivalents
    case 'stop-process':
    case 'spps':
    case 'taskkill': {
      if (!args.length) return { lines: [{ text: 'Stop-Process: -Id ou -Name requis', type: 'error' }], newState };
      const target = args[args.length - 1];
      return { lines: [{ text: `Processus '${target}' arrêté.`, type: 'success' }], newState };
    }

    // grep equivalents
    // Select-String -Pattern "pattern" -Path file  OR  Select-String "pattern" file
    case 'select-string':
    case 'sls': {
      const patternIdx = args.findIndex((a) => a.toLowerCase() === '-pattern');
      const pathIdx = args.findIndex((a) => a.toLowerCase() === '-path');
      let pattern: string;
      let filePath: string;
      if (patternIdx >= 0) {
        pattern = args[patternIdx + 1] ?? '';
        filePath = pathIdx >= 0 ? args[pathIdx + 1] : (args.find((a, i) => !a.startsWith('-') && i !== patternIdx + 1) ?? '');
      } else {
        const nonFlags = args.filter((a) => !a.startsWith('-'));
        pattern = nonFlags[0] ?? '';
        filePath = nonFlags[1] ?? '';
      }
      return { lines: cmdGrep(newState, [pattern, filePath]), newState };
    }

    // clear equivalents
    case 'clear-host':
    case 'cls':
      return { lines: [], clear: true, newState };

    // mkdir alias (works on all OS)
    case 'md':
      return (() => {
        const { lines: mdLines, newRoot: mdRoot } = cmdMkdir(newState, args);
        if (mdRoot) newState = { ...newState, root: mdRoot };
        return { lines: mdLines, newState };
      })();

    // ── macOS-specific ─────────────────────────────────────────────────────────

    // open: simulates opening a file/app
    case 'open': {
      if (!args.length) return { lines: [{ text: 'open: missing argument', type: 'error' }], newState };
      const target = args[args.length - 1];
      return { lines: [{ text: `Ouverture de '${target}'…`, type: 'success' }], newState };
    }

    // pbcopy: copy stdin to clipboard (simulated)
    case 'pbcopy':
      return { lines: [{ text: '[contenu copié dans le presse-papiers]', type: 'success' }], newState };

    // pbpaste: paste clipboard content (simulated)
    case 'pbpaste':
      return { lines: [{ text: '[contenu du presse-papiers]', type: 'output' }], newState };

    // brew: Homebrew package manager (simulated)
    case 'brew': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'install' && args[1]) {
        return { lines: [
          { text: `==> Fetching ${args[1]}...`, type: 'info' },
          { text: `==> Installing ${args[1]}...`, type: 'info' },
          { text: `✓  ${args[1]} installed successfully`, type: 'success' },
        ], newState };
      }
      if (sub === 'update') {
        return { lines: [{ text: '==> Updated Homebrew. Nothing to upgrade.', type: 'success' }], newState };
      }
      if (sub === 'list') {
        return { lines: [{ text: 'git  node  python  wget  curl', type: 'output' }], newState };
      }
      return { lines: [{ text: 'Homebrew — Usage: brew install|update|list', type: 'output' }], newState };
    }

    // winget: Windows package manager (simulated)
    case 'winget': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'install' && args[1]) {
        return { lines: [
          { text: `Found ${args[1]}`, type: 'info' },
          { text: `Downloading ${args[1]}...`, type: 'info' },
          { text: `Successfully installed ${args[1]}`, type: 'success' },
        ], newState };
      }
      if (sub === 'list') {
        return { lines: [{ text: 'Name          Id                  Version', type: 'output' },
          { text: 'Git           Git.Git             2.44.0', type: 'output' },
          { text: 'Node.js       OpenJS.NodeJS       20.11.0', type: 'output' },
        ], newState };
      }
      return { lines: [{ text: 'winget — Usage: winget install|list', type: 'output' }], newState };
    }

    // ── Réseau & SSH (Module 8) ───────────────────────────────────────────────

    case 'ping': {
      const host = args.find((a) => !a.startsWith('-') && isNaN(Number(a))) ?? '';
      if (!host) return { lines: [{ text: 'Usage: ping <hostname>', type: 'error' }], newState };
      return {
        lines: [
          { text: `PING ${host}: 56 data bytes`, type: 'output' },
          { text: `64 bytes from ${host}: icmp_seq=0 ttl=54 time=12.3 ms`, type: 'output' },
          { text: `64 bytes from ${host}: icmp_seq=1 ttl=54 time=11.8 ms`, type: 'output' },
          { text: `64 bytes from ${host}: icmp_seq=2 ttl=54 time=12.1 ms`, type: 'output' },
          { text: `--- ${host} ping statistics ---`, type: 'output' },
          { text: '3 packets transmitted, 3 received, 0% packet loss', type: 'success' },
        ],
        newState,
      };
    }

    case 'curl': {
      const url = args.find((a) => !a.startsWith('-')) ?? '';
      if (!url) return { lines: [{ text: 'Usage: curl [options] <url>', type: 'error' }], newState };
      const urlHost = url.replace(/^https?:\/\//, '').split('/')[0] ?? 'server';
      if (args[0] === '-I' || args[0] === '--head') {
        return {
          lines: [
            { text: 'HTTP/2 200', type: 'success' },
            { text: 'content-type: application/json; charset=utf-8', type: 'output' },
            { text: `server: ${urlHost}`, type: 'output' },
            { text: 'x-content-type-options: nosniff', type: 'output' },
          ],
          newState,
        };
      }
      return {
        lines: [
          { text: `{"url":"${url}","status":"ok"}`, type: 'output' },
        ],
        newState,
      };
    }

    case 'wget': {
      const url = args.find((a) => !a.startsWith('-')) ?? '';
      if (!url) return { lines: [{ text: 'Usage: wget <url>', type: 'error' }], newState };
      const filename = url.split('/').pop() || 'index.html';
      return {
        lines: [
          { text: `Connecting to ${url.split('/')[2] ?? 'host'}... connected.`, type: 'output' },
          { text: 'HTTP request sent, awaiting response... 200 OK', type: 'success' },
          { text: `Saving to: '${filename}'`, type: 'output' },
          { text: `'${filename}' saved [1024]`, type: 'success' },
        ],
        newState,
      };
    }

    case 'invoke-webrequest':
    case 'iwr': {
      const url = args.find((a) => !a.startsWith('-')) ?? '';
      if (!url) return { lines: [{ text: 'Usage: Invoke-WebRequest -Uri <url>', type: 'error' }], newState };
      const outFile = (() => { const i = args.indexOf('-OutFile'); return i >= 0 ? args[i + 1] : null; })();
      if (outFile) {
        return {
          lines: [
            { text: `Downloading ${url}...`, type: 'output' },
            { text: `Content saved to '${outFile}'`, type: 'success' },
          ],
          newState,
        };
      }
      return {
        lines: [
          { text: 'StatusCode        : 200', type: 'output' },
          { text: 'StatusDescription : OK', type: 'output' },
          { text: `Content           : {"url":"${url}","status":"ok"}`, type: 'output' },
        ],
        newState,
      };
    }

    case 'nslookup': {
      const host = args[0] ?? '';
      if (!host) return { lines: [{ text: 'Usage: nslookup <hostname>', type: 'error' }], newState };
      return {
        lines: [
          { text: 'Server:  8.8.8.8', type: 'output' },
          { text: 'Address: 8.8.8.8#53', type: 'output' },
          { text: 'Non-authoritative answer:', type: 'output' },
          { text: `Name: ${host}`, type: 'output' },
          { text: 'Address: 142.250.74.46', type: 'output' },
        ],
        newState,
      };
    }

    case 'dig': {
      const host = args.find((a) => !a.startsWith('+') && !a.startsWith('@')) ?? '';
      if (!host) return { lines: [{ text: 'Usage: dig <hostname>', type: 'error' }], newState };
      return {
        lines: [
          { text: `; <<>> DiG 9.18.1 <<>> ${host}`, type: 'output' },
          { text: ';; ANSWER SECTION:', type: 'output' },
          { text: `${host}. 299 IN A 142.250.74.46`, type: 'output' },
          { text: ';; Query time: 12 msec', type: 'output' },
          { text: ';; SERVER: 8.8.8.8#53', type: 'output' },
        ],
        newState,
      };
    }

    case 'resolve-dnsname': {
      const host = args.find((a) => !a.startsWith('-')) ?? '';
      if (!host) return { lines: [{ text: 'Usage: Resolve-DnsName <hostname>', type: 'error' }], newState };
      return {
        lines: [
          { text: 'Name                           Type TTL  Section IPAddress', type: 'output' },
          { text: '----                           ---- ---  ------- ---------', type: 'output' },
          { text: `${host.padEnd(31)}A    299  Answer  142.250.74.46`, type: 'output' },
        ],
        newState,
      };
    }

    case 'ssh': {
      const target = args.find((a) => !a.startsWith('-')) ?? '';
      if (!target) return { lines: [{ text: 'Usage: ssh user@hostname', type: 'error' }], newState };
      return {
        lines: [
          { text: `ssh: connexion simulée vers ${target}`, type: 'info' },
          { text: '(Dans un vrai terminal, vous seriez connecté à l\'hôte distant)', type: 'info' },
        ],
        newState,
      };
    }

    case 'ssh-keygen': {
      const tIdx = args.indexOf('-t');
      const keyType = tIdx >= 0 ? (args[tIdx + 1] ?? 'rsa') : 'rsa';
      return {
        lines: [
          { text: `Generating public/private ${keyType} key pair.`, type: 'output' },
          { text: `Enter file in which to save the key (/home/user/.ssh/id_${keyType}): (simulé)`, type: 'output' },
          { text: `Your identification has been saved in /home/user/.ssh/id_${keyType}`, type: 'success' },
          { text: `Your public key has been saved in /home/user/.ssh/id_${keyType}.pub`, type: 'success' },
          { text: `+--[${keyType.toUpperCase()}]--+`, type: 'output' },
          { text: '|     .o+.        |', type: 'output' },
          { text: '+----[SHA256]-----+', type: 'output' },
        ],
        newState,
      };
    }

    case 'scp': {
      if (args.length < 2) return { lines: [{ text: 'Usage: scp <source> user@host:<dest>', type: 'error' }], newState };
      const src = args.find((a) => !a.startsWith('-') && !a.includes('@')) ?? args[0];
      return {
        lines: [
          { text: `${src}      100%  1024   512.0KB/s   00:00`, type: 'success' },
        ],
        newState,
      };
    }

    // ── Git (Modules 9 & 10) ──────────────────────────────────────────────────
    // Full git simulation: init, add, commit, status, log, diff, branch,
    // checkout, merge, remote, push, pull, fetch, clone.
    // State is persisted in TerminalState.git across commands.

    case 'git': {
      const sub = args[0]?.toLowerCase() ?? '';

      /** Require an initialised repo for sub-commands that need one. */
      const requireRepo = (): OutputLine | null => {
        if (!newState.git?.initialized) {
          return { text: "fatal: not a git repository (or any parent up to mount point /)\nHint: Run 'git init' to create a new repository.", type: 'error' };
        }
        return null;
      };

      /** Generate a short 7-char hex hash. */
      const makeHash = (): string =>
        Array.from({ length: 7 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

      switch (sub) {
        // ── git init ──────────────────────────────────────────────────────────
        case 'init': {
          if (newState.git?.initialized) {
            return {
              lines: [{ text: `Reinitialized existing Git repository in ${displayPath(newState.cwd)}/.git/`, type: 'info' }],
              newState,
            };
          }
          newState = {
            ...newState,
            git: {
              initialized: true,
              branch: 'main',
              branches: ['main'],
              stagedFiles: [],
              commits: [],
              remotes: {},
            },
          };
          return {
            lines: [
              { text: `Initialized empty Git repository in ${displayPath(newState.cwd)}/.git/`, type: 'success' },
              { text: "Hint: Use 'git add <file>' to stage files, 'git commit -m' to record changes.", type: 'info' },
            ],
            newState,
          };
        }

        // ── git status ────────────────────────────────────────────────────────
        case 'status': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const lines: OutputLine[] = [
            { text: `On branch ${g.branch}`, type: 'output' },
          ];
          if (g.commits.length === 0) {
            lines.push({ text: 'No commits yet', type: 'output' });
          }
          if (g.stagedFiles.length > 0) {
            lines.push({ text: '', type: 'output' });
            lines.push({ text: 'Changes to be committed:', type: 'success' });
            lines.push({ text: '  (use "git restore --staged <file>" to unstage)', type: 'info' });
            g.stagedFiles.forEach((f) => lines.push({ text: `\tnew file:   ${f}`, type: 'success' }));
          }
          if (g.stagedFiles.length === 0 && g.commits.length === 0) {
            lines.push({ text: '', type: 'output' });
            lines.push({ text: 'Nothing to commit.', type: 'output' });
            lines.push({ text: "Hint: Stage files with 'git add <file>' or 'git add .'", type: 'info' });
          }
          if (g.stagedFiles.length === 0 && g.commits.length > 0) {
            lines.push({ text: '', type: 'output' });
            lines.push({ text: 'nothing to commit, working tree clean', type: 'output' });
          }
          return { lines, newState };
        }

        // ── git add ───────────────────────────────────────────────────────────
        case 'add': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const target = args[1] ?? '';
          if (!target) {
            return { lines: [{ text: 'Nothing specified, nothing added.\nHint: git add <file> or git add .', type: 'error' }], newState };
          }
          const g = newState.git!;
          let filesToStage: string[];
          if (target === '.' || target === '-A' || target === '--all') {
            // Stage all visible files in cwd (simulated)
            const cwdNode = getNode(newState.root, newState.cwd);
            if (cwdNode?.type === 'directory') {
              filesToStage = Object.keys(cwdNode.children)
                .filter((n) => !n.startsWith('.') && !g.stagedFiles.includes(n));
            } else {
              filesToStage = [];
            }
          } else {
            filesToStage = [target].filter((f) => !g.stagedFiles.includes(f));
          }
          if (filesToStage.length === 0) {
            return { lines: [{ text: `'${target}' already staged or no files to add.`, type: 'info' }], newState };
          }
          newState = { ...newState, git: { ...g, stagedFiles: [...g.stagedFiles, ...filesToStage] } };
          return {
            lines: filesToStage.map((f) => ({ text: `staged: ${f}`, type: 'success' })),
            newState,
          };
        }

        // ── git restore ───────────────────────────────────────────────────────
        case 'restore': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const staged = args.includes('--staged');
          const file = args.find((a) => !a.startsWith('-')) ?? '';
          if (!file) return { lines: [{ text: 'Usage: git restore [--staged] <file>', type: 'error' }], newState };
          if (staged) {
            const g = newState.git!;
            newState = { ...newState, git: { ...g, stagedFiles: g.stagedFiles.filter((f) => f !== file) } };
            return { lines: [{ text: `unstaged: ${file}`, type: 'info' }], newState };
          }
          return { lines: [{ text: `Restored '${file}' (simulated)`, type: 'info' }], newState };
        }

        // ── git commit ────────────────────────────────────────────────────────
        case 'commit': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const mIdx = args.indexOf('-m');
          const message = mIdx >= 0 ? (args[mIdx + 1] ?? '') : '';
          if (!message) {
            return { lines: [{ text: 'Abort: empty commit message.\nUsage: git commit -m "your message"', type: 'error' }], newState };
          }
          if (g.stagedFiles.length === 0) {
            return { lines: [{ text: 'nothing to commit, working tree clean', type: 'info' }], newState };
          }
          const hash = makeHash();
          const commit: GitCommit = {
            hash,
            message,
            author: newState.user,
            date: new Date().toISOString().slice(0, 10),
          };
          const fileCount = g.stagedFiles.length;
          newState = {
            ...newState,
            git: { ...g, commits: [commit, ...g.commits], stagedFiles: [] },
          };
          return {
            lines: [
              { text: `[${g.branch} ${hash}] ${message}`, type: 'success' },
              { text: ` ${fileCount} file${fileCount !== 1 ? 's' : ''} changed`, type: 'output' },
            ],
            newState,
          };
        }

        // ── git log ───────────────────────────────────────────────────────────
        case 'log': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          if (g.commits.length === 0) {
            return { lines: [{ text: 'fatal: your current branch has no commits yet.', type: 'error' }], newState };
          }
          const oneline = args.includes('--oneline');
          const lines: OutputLine[] = [];
          g.commits.forEach((c) => {
            if (oneline) {
              lines.push({ text: `${c.hash} ${c.message}`, type: 'output' });
            } else {
              lines.push({ text: `commit ${c.hash}`, type: 'success' });
              lines.push({ text: `Author: ${c.author} <${c.author}@terminal-lab.local>`, type: 'output' });
              lines.push({ text: `Date:   ${c.date}`, type: 'output' });
              lines.push({ text: '', type: 'output' });
              lines.push({ text: `    ${c.message}`, type: 'output' });
              lines.push({ text: '', type: 'output' });
            }
          });
          return { lines, newState };
        }

        // ── git diff ──────────────────────────────────────────────────────────
        case 'diff': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          if (g.stagedFiles.length === 0 && g.commits.length > 0) {
            return { lines: [{ text: '(nothing to diff — working tree clean)', type: 'info' }], newState };
          }
          return {
            lines: [
              { text: 'diff --git a/fichier.txt b/fichier.txt', type: 'output' },
              { text: '--- a/fichier.txt', type: 'output' },
              { text: '+++ b/fichier.txt', type: 'output' },
              { text: '@@ -1,3 +1,4 @@', type: 'info' },
              { text: ' Ligne existante', type: 'output' },
              { text: '+Nouvelle ligne ajoutée', type: 'success' },
              { text: '-Ligne supprimée', type: 'error' },
              { text: ' Autre ligne', type: 'output' },
            ],
            newState,
          };
        }

        // ── git branch ────────────────────────────────────────────────────────
        case 'branch': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const deleteFlag = args.includes('-d') || args.includes('-D');
          const branchName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';

          // List branches
          if (!branchName && !deleteFlag) {
            return {
              lines: g.branches.map((b) => ({
                text: b === g.branch ? `* ${b}` : `  ${b}`,
                type: b === g.branch ? 'success' : 'output',
              })),
              newState,
            };
          }

          // Delete branch
          if (deleteFlag && branchName) {
            if (branchName === g.branch) {
              return { lines: [{ text: `error: Cannot delete branch '${branchName}' checked out at current worktree.`, type: 'error' }], newState };
            }
            if (!g.branches.includes(branchName)) {
              return { lines: [{ text: `error: branch '${branchName}' not found.`, type: 'error' }], newState };
            }
            newState = { ...newState, git: { ...g, branches: g.branches.filter((b) => b !== branchName) } };
            return { lines: [{ text: `Deleted branch ${branchName}.`, type: 'success' }], newState };
          }

          // Create branch
          if (branchName) {
            if (g.branches.includes(branchName)) {
              return { lines: [{ text: `fatal: A branch named '${branchName}' already exists.`, type: 'error' }], newState };
            }
            newState = { ...newState, git: { ...g, branches: [...g.branches, branchName] } };
            return { lines: [{ text: `Branch '${branchName}' created.`, type: 'success' }], newState };
          }

          return { lines: [{ text: 'Usage: git branch [<branch-name>] [-d <branch>]', type: 'error' }], newState };
        }

        // ── git checkout ──────────────────────────────────────────────────────
        case 'checkout': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const createFlag = args.includes('-b') || args.includes('-B');
          const branchName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';

          if (!branchName) {
            return { lines: [{ text: 'Usage: git checkout [-b] <branch>', type: 'error' }], newState };
          }

          if (createFlag) {
            if (g.branches.includes(branchName)) {
              return { lines: [{ text: `fatal: A branch named '${branchName}' already exists.`, type: 'error' }], newState };
            }
            newState = { ...newState, git: { ...g, branch: branchName, branches: [...g.branches, branchName] } };
            return { lines: [{ text: `Switched to a new branch '${branchName}'`, type: 'success' }], newState };
          }

          if (!g.branches.includes(branchName)) {
            return { lines: [{ text: `error: pathspec '${branchName}' did not match any branch known to git.`, type: 'error' }], newState };
          }
          if (branchName === g.branch) {
            return { lines: [{ text: `Already on '${branchName}'`, type: 'info' }], newState };
          }
          newState = { ...newState, git: { ...g, branch: branchName } };
          return { lines: [{ text: `Switched to branch '${branchName}'`, type: 'success' }], newState };
        }

        // ── git switch (modern alias for checkout) ────────────────────────────
        case 'switch': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const createFlag = args.includes('-c') || args.includes('-C');
          const branchName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';

          if (!branchName) return { lines: [{ text: 'Usage: git switch [-c] <branch>', type: 'error' }], newState };

          if (createFlag) {
            if (g.branches.includes(branchName)) {
              return { lines: [{ text: `fatal: A branch named '${branchName}' already exists.`, type: 'error' }], newState };
            }
            newState = { ...newState, git: { ...g, branch: branchName, branches: [...g.branches, branchName] } };
            return { lines: [{ text: `Switched to a new branch '${branchName}'`, type: 'success' }], newState };
          }
          if (!g.branches.includes(branchName)) {
            return { lines: [{ text: `fatal: invalid reference: ${branchName}`, type: 'error' }], newState };
          }
          newState = { ...newState, git: { ...g, branch: branchName } };
          return { lines: [{ text: `Switched to branch '${branchName}'`, type: 'success' }], newState };
        }

        // ── git merge ─────────────────────────────────────────────────────────
        case 'merge': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const branchName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
          if (!branchName) return { lines: [{ text: 'Usage: git merge <branch>', type: 'error' }], newState };
          if (!g.branches.includes(branchName)) {
            return { lines: [{ text: `merge: ${branchName} - not something we can merge`, type: 'error' }], newState };
          }
          if (branchName === g.branch) {
            return { lines: [{ text: 'Already up to date.', type: 'info' }], newState };
          }
          const hash = makeHash();
          const mergeCommit: GitCommit = {
            hash,
            message: `Merge branch '${branchName}' into ${g.branch}`,
            author: newState.user,
            date: new Date().toISOString().slice(0, 10),
          };
          newState = { ...newState, git: { ...g, commits: [mergeCommit, ...g.commits] } };
          return {
            lines: [
              { text: `Merge made by the 'ort' strategy.`, type: 'success' },
              { text: `[${g.branch} ${hash}] Merge branch '${branchName}'`, type: 'output' },
            ],
            newState,
          };
        }

        // ── git remote ────────────────────────────────────────────────────────
        case 'remote': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const remoteSub = args[1]?.toLowerCase() ?? '';

          if (!remoteSub || remoteSub === '-v' || remoteSub === '--verbose') {
            if (Object.keys(g.remotes).length === 0) {
              return { lines: [{ text: '(no remotes configured)', type: 'info' }], newState };
            }
            const lines: OutputLine[] = [];
            Object.entries(g.remotes).forEach(([name, url]) => {
              lines.push({ text: `${name}\t${url} (fetch)`, type: 'output' });
              lines.push({ text: `${name}\t${url} (push)`, type: 'output' });
            });
            return { lines, newState };
          }

          if (remoteSub === 'add') {
            const name = args[2] ?? '';
            const url = args[3] ?? '';
            if (!name || !url) return { lines: [{ text: 'Usage: git remote add <name> <url>', type: 'error' }], newState };
            if (g.remotes[name]) return { lines: [{ text: `error: remote '${name}' already exists.`, type: 'error' }], newState };
            newState = { ...newState, git: { ...g, remotes: { ...g.remotes, [name]: url } } };
            return { lines: [{ text: `Remote '${name}' added (${url})`, type: 'success' }], newState };
          }

          if (remoteSub === 'remove' || remoteSub === 'rm') {
            const name = args[2] ?? '';
            if (!name) return { lines: [{ text: 'Usage: git remote remove <name>', type: 'error' }], newState };
            if (!g.remotes[name]) return { lines: [{ text: `error: No such remote '${name}'`, type: 'error' }], newState };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [name]: _r, ...rest } = g.remotes;
            newState = { ...newState, git: { ...g, remotes: rest } };
            return { lines: [{ text: `Remote '${name}' removed.`, type: 'success' }], newState };
          }

          return { lines: [{ text: 'Usage: git remote add|remove|[-v]', type: 'error' }], newState };
        }

        // ── git push ──────────────────────────────────────────────────────────
        case 'push': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const hasRemote = Object.keys(g.remotes).length > 0;
          const remoteName = args.find((a) => !a.startsWith('-') && a !== sub) ?? 'origin';
          if (!hasRemote) {
            return { lines: [{ text: `fatal: '${remoteName}' does not appear to be a git repository.\nHint: git remote add origin <url>`, type: 'error' }], newState };
          }
          if (g.commits.length === 0) {
            return { lines: [{ text: 'Everything up-to-date (no commits to push).', type: 'info' }], newState };
          }
          const upstreamFlag = args.includes('-u') || args.includes('--set-upstream');
          const lines: OutputLine[] = [
            { text: `Enumerating objects: ${g.commits.length}, done.`, type: 'output' },
            { text: `Counting objects: 100% (${g.commits.length}/${g.commits.length}), done.`, type: 'output' },
            { text: `Writing objects: 100% (${g.commits.length}/${g.commits.length}), done.`, type: 'output' },
            { text: `To ${Object.values(g.remotes)[0]}`, type: 'output' },
            { text: `   ${g.commits[g.commits.length - 1]?.hash ?? '0000000'}..${g.commits[0]?.hash ?? '0000000'}  ${g.branch} -> ${g.branch}`, type: 'success' },
          ];
          if (upstreamFlag) {
            lines.push({ text: `Branch '${g.branch}' set up to track remote branch '${g.branch}' from '${remoteName}'.`, type: 'success' });
          }
          return { lines, newState };
        }

        // ── git pull ──────────────────────────────────────────────────────────
        case 'pull': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          if (Object.keys(g.remotes).length === 0) {
            return { lines: [{ text: "There is no tracking information for the current branch.\nHint: git remote add origin <url>", type: 'error' }], newState };
          }
          return {
            lines: [
              { text: 'remote: Enumerating objects: 3, done.', type: 'output' },
              { text: 'remote: Counting objects: 100% (3/3), done.', type: 'output' },
              { text: 'Updating... Fast-forward', type: 'output' },
              { text: 'Already up to date.', type: 'success' },
            ],
            newState,
          };
        }

        // ── git fetch ─────────────────────────────────────────────────────────
        case 'fetch': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const remote = args.find((a) => !a.startsWith('-') && a !== sub) ?? 'origin';
          if (!g.remotes[remote]) {
            return { lines: [{ text: `error: '${remote}' does not appear to be a git repository.`, type: 'error' }], newState };
          }
          return {
            lines: [
              { text: `From ${g.remotes[remote]}`, type: 'output' },
              { text: ` * branch            ${g.branch}     -> FETCH_HEAD`, type: 'output' },
              { text: 'Fetched all remote refs.', type: 'success' },
            ],
            newState,
          };
        }

        // ── git clone ─────────────────────────────────────────────────────────
        case 'clone': {
          const url = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
          if (!url) return { lines: [{ text: 'Usage: git clone <url> [directory]', type: 'error' }], newState };
          const dirName = args.find((a) => !a.startsWith('-') && a !== sub && a !== url)
            ?? url.split('/').pop()?.replace(/\.git$/, '') ?? 'repo';
          newState = {
            ...newState,
            git: {
              initialized: true,
              branch: 'main',
              branches: ['main'],
              stagedFiles: [],
              commits: [{ hash: makeHash(), message: 'Initial commit', author: 'remote', date: new Date().toISOString().slice(0, 10) }],
              remotes: { origin: url },
            },
          };
          return {
            lines: [
              { text: `Cloning into '${dirName}'...`, type: 'output' },
              { text: 'remote: Enumerating objects: 12, done.', type: 'output' },
              { text: 'remote: Counting objects: 100% (12/12), done.', type: 'output' },
              { text: 'Receiving objects: 100% (12/12), done.', type: 'success' },
              { text: `Repository cloned into '${dirName}'`, type: 'success' },
            ],
            newState,
          };
        }

        // ── git stash ─────────────────────────────────────────────────────────
        case 'stash': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const stashSub = args[1]?.toLowerCase() ?? 'push';
          if (stashSub === 'push' || stashSub === '') {
            const g = newState.git!;
            if (g.stagedFiles.length === 0) return { lines: [{ text: 'No local changes to save.', type: 'info' }], newState };
            newState = { ...newState, git: { ...g, stagedFiles: [] } };
            return { lines: [{ text: `Saved working directory and index state WIP on ${g.branch}: stash@{0}`, type: 'success' }], newState };
          }
          if (stashSub === 'pop' || stashSub === 'apply') {
            return { lines: [{ text: 'Applied stash@{0} (simulated)', type: 'success' }], newState };
          }
          if (stashSub === 'list') {
            return { lines: [{ text: 'stash@{0}: WIP on main (simulated)', type: 'output' }], newState };
          }
          return { lines: [{ text: 'Usage: git stash [push|pop|apply|list]', type: 'error' }], newState };
        }

        // ── git tag ───────────────────────────────────────────────────────────
        case 'tag': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const tagName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
          if (!tagName) return { lines: [{ text: 'Usage: git tag <tagname>', type: 'error' }], newState };
          const g = newState.git!;
          if (g.commits.length === 0) return { lines: [{ text: 'fatal: No commits to tag.', type: 'error' }], newState };
          return { lines: [{ text: `Tag '${tagName}' created at ${g.commits[0].hash}`, type: 'success' }], newState };
        }

        // ── git show ──────────────────────────────────────────────────────────
        case 'show': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          if (g.commits.length === 0) return { lines: [{ text: 'fatal: No commits yet.', type: 'error' }], newState };
          const c = g.commits[0];
          return {
            lines: [
              { text: `commit ${c.hash}`, type: 'success' },
              { text: `Author: ${c.author} <${c.author}@terminal-lab.local>`, type: 'output' },
              { text: `Date:   ${c.date}`, type: 'output' },
              { text: '', type: 'output' },
              { text: `    ${c.message}`, type: 'output' },
            ],
            newState,
          };
        }

        // ── git reset ─────────────────────────────────────────────────────────
        case 'reset': {
          const repoErr = requireRepo();
          if (repoErr) return { lines: [repoErr], newState };
          const g = newState.git!;
          const soft = args.includes('--soft');
          const hard = args.includes('--hard');
          const mixed = !soft && !hard;
          if (mixed || soft) {
            newState = { ...newState, git: { ...g, stagedFiles: [] } };
            return { lines: [{ text: 'Unstaged all changes (simulated).', type: 'info' }], newState };
          }
          if (hard) {
            newState = { ...newState, git: { ...g, stagedFiles: [] } };
            return { lines: [{ text: 'HEAD is now at (hard reset simulated). Working tree clean.', type: 'info' }], newState };
          }
          return { lines: [{ text: 'Usage: git reset [--soft|--hard] [<commit>]', type: 'error' }], newState };
        }

        // ── git config ────────────────────────────────────────────────────────
        case 'config': {
          const globalFlag = args.includes('--global');
          const key = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
          const value = args[args.indexOf(key) + 1] ?? '';
          if (key === 'user.name' || key === 'user.email') {
            return { lines: [{ text: `${key} = ${value || newState.user} (configuré)`, type: 'success' }], newState };
          }
          if (key === '--list' || args.includes('--list')) {
            return {
              lines: [
                { text: `user.name=${newState.user}`, type: 'output' },
                { text: `user.email=${newState.user}@terminal-lab.local`, type: 'output' },
                { text: 'core.editor=nano', type: 'output' },
                { text: `init.defaultBranch=main`, type: 'output' },
                ...(globalFlag ? [{ text: 'credential.helper=store', type: 'output' as const }] : []),
              ],
              newState,
            };
          }
          return { lines: [{ text: `git config ${key || '--list'}`, type: 'info' }], newState };
        }

        // ── git --version / --help ────────────────────────────────────────────
        case '--version':
          return { lines: [{ text: 'git version 2.45.0 (simulated)', type: 'output' }], newState };

        case '--help':
        case 'help':
          return {
            lines: [
              { text: 'usage: git <command> [<args>]', type: 'output' },
              { text: '', type: 'output' },
              { text: 'Commandes essentielles :', type: 'info' },
              { text: '  init      Initialiser un nouveau dépôt', type: 'output' },
              { text: '  clone     Cloner un dépôt distant', type: 'output' },
              { text: '  add       Ajouter des fichiers à l\'index (staging)', type: 'output' },
              { text: '  commit    Enregistrer les modifications indexées', type: 'output' },
              { text: '  status    Afficher l\'état du répertoire de travail', type: 'output' },
              { text: '  log       Afficher l\'historique des commits', type: 'output' },
              { text: '  diff      Comparer les modifications', type: 'output' },
              { text: '  branch    Lister, créer ou supprimer des branches', type: 'output' },
              { text: '  checkout  Changer de branche ou restaurer des fichiers', type: 'output' },
              { text: '  switch    Changer de branche (commande moderne)', type: 'output' },
              { text: '  merge     Fusionner une branche dans la branche active', type: 'output' },
              { text: '  remote    Gérer les dépôts distants', type: 'output' },
              { text: '  push      Envoyer les commits vers le dépôt distant', type: 'output' },
              { text: '  pull      Récupérer et intégrer les commits distants', type: 'output' },
              { text: '  fetch     Récupérer sans intégrer (pull sans merge)', type: 'output' },
              { text: '  stash     Mettre de côté des modifications temporairement', type: 'output' },
              { text: '  tag       Créer un tag sur un commit', type: 'output' },
              { text: '  show      Afficher un commit en détail', type: 'output' },
              { text: '  reset     Annuler des modifications', type: 'output' },
              { text: '  config    Configurer git (user.name, user.email…)', type: 'output' },
            ],
            newState,
          };

        default:
          return {
            lines: [{
              text: `git: '${sub}' is not a git command. See 'git help'.`,
              type: 'error',
            }],
            newState,
          };
      }
    }

    default:
      return {
        lines: [{ text: `${cmd}: commande introuvable. Tapez 'help' pour la liste des commandes.`, type: 'error' }],
        newState,
      };
  }
}
