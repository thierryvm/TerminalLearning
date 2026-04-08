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

export interface TerminalState {
  root: DirectoryNode;
  cwd: string[];
  commandHistory: string[];
  user: string;
  hostname: string;
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
            }),
            '.bashrc': makeFile(
              '# Configuration Bash\nalias ll="ls -la"\nalias la="ls -a"\nexport PATH=$PATH:/usr/local/bin\nexport EDITOR=nano'
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

function deepCloneRoot(root: DirectoryNode): DirectoryNode {
  return JSON.parse(JSON.stringify(root));
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

function cmdEcho(args: string[]): OutputLine[] {
  return [{ text: args.join(' '), type: 'output' }];
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

  dstParent.children[dstName] = JSON.parse(JSON.stringify(srcNode));
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
  const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
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
    const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
    const lines = inputText.split('\n');
    const matches = lines.map((line, i) => ({ line, i })).filter(({ line }) => regex.test(line));
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
};

function getHelpText(env: TerminalEnv = 'linux'): string {
  if (env === 'windows') {
    return `Commandes disponibles — PowerShell / Windows:
  Get-Location (gl)         Afficher le répertoire courant
  Set-Location (sl) [path]  Changer de répertoire
  Get-ChildItem (dir)       Lister les fichiers et dossiers
  Get-Content (gc) [file]   Afficher le contenu d'un fichier
  New-Item (ni) [name]      Créer un fichier ou dossier
  Copy-Item (copy) src dst  Copier un fichier
  Move-Item (move) src dst  Déplacer / renommer
  Remove-Item (del) [file]  Supprimer un fichier
  Write-Host [texte]        Afficher du texte
  Get-Process (gps)         Lister les processus
  Stop-Process -Name [nom]  Arrêter un processus
  Select-String pat file    Rechercher dans un fichier
  Clear-Host (cls)          Effacer le terminal
  history                   Historique des commandes
  winget install|list       Gestionnaire de paquets
  help [commande]           Aide sur une commande
  about                     Informations sur le projet`;
  }
  if (env === 'macos') {
    return `Commandes disponibles — macOS / zsh:
  pwd              Afficher le répertoire courant
  ls [-la] [path]  Lister les fichiers (-l: détails, -a: cachés)
  cd [chemin]      Changer de répertoire
  mkdir [-p] [nom] Créer un répertoire
  touch [nom]      Créer un fichier
  cat [file]       Afficher le contenu d'un fichier
  echo [texte]     Afficher du texte
  rm [-r] [file]   Supprimer un fichier
  cp [-r] src dst  Copier
  mv src dst       Déplacer / renommer
  grep [-ni] p f   Rechercher dans un fichier
  head / tail      Début / fin d'un fichier (-n N)
  wc [-lwc] [file] Compter lignes/mots/octets
  chmod m file     Changer les permissions
  open [file|URL]  Ouvrir avec l'app par défaut
  pbcopy/pbpaste   Presse-papiers
  brew install|list Gestionnaire de paquets Homebrew
  ps [aux]         Lister les processus
  kill [PID]       Arrêter un processus
  history          Historique des commandes
  clear            Effacer le terminal
  help [commande]  Aide sur une commande
  about            Informations sur le projet`;
  }
  // linux (default)
  return `Commandes disponibles — Linux / bash:
  pwd              Afficher le répertoire courant
  ls [-la] [path]  Lister les fichiers (-l: détails, -a: cachés)
  cd [chemin]      Changer de répertoire
  mkdir [-p] [nom] Créer un répertoire
  touch [nom]      Créer un fichier
  cat [file]       Afficher le contenu d'un fichier
  echo [texte]     Afficher du texte
  rm [-r] [file]   Supprimer un fichier (-r: répertoire)
  cp [-r] src dst  Copier un fichier
  mv src dst       Déplacer / renommer
  grep [-ni] p f   Rechercher dans un fichier
  head / tail      Début / fin d'un fichier (-n N)
  wc [-lwc] [file] Compter lignes/mots/octets
  chmod m file     Changer les permissions
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
  hall-of-fame     Liste des contributeurs`;
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
      return { lines: cmdEcho(args), newState };

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
          { text: '║  Live      : terminal-learning.vercel.app        ║', type: 'info' },
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
          { text: '║  💜 GitHub Sponsors (bientôt disponible)         ║', type: 'success' },
          { text: '║  ☕ Ko-fi (bientôt disponible)                   ║', type: 'success' },
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

    // ls equivalents
    case 'get-childitem':
    case 'gci':
    case 'dir':
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
      return { lines: cmdEcho(args.filter((a) => !a.startsWith('-'))), newState };

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

    default:
      return {
        lines: [{ text: `${cmd}: commande introuvable. Tapez 'help' pour la liste des commandes.`, type: 'error' }],
        newState,
      };
  }
}
