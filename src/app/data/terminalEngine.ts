// ─── Types ────────────────────────────────────────────────────────────────────

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
    const child = current.children[seg];
    if (!child) return null;
    current = child;
  }
  return current;
}

function getParentNode(root: DirectoryNode, path: string[]): DirectoryNode | null {
  if (path.length === 0) return root;
  const parentPath = path.slice(0, -1);
  const node = getNode(root, parentPath);
  return node?.type === 'directory' ? node : null;
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

export function getPrompt(state: TerminalState): string {
  return `${state.user}@${state.hostname}:${displayPath(state.cwd)}$`;
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

function cmdPwd(state: TerminalState): OutputLine[] {
  return [{ text: '/' + state.cwd.join('/'), type: 'output' }];
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
  const leftResult = processCommand(state, left);
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

const HELP_TEXT = `Commandes disponibles:
  pwd          Afficher le répertoire courant
  ls [options] Lister les fichiers (-l: détails, -a: cachés)
  cd [chemin]  Changer de répertoire
  mkdir [nom]  Créer un répertoire (-p: parents)
  touch [nom]  Créer un fichier
  cat [file]   Afficher le contenu d'un fichier
  echo [texte] Afficher du texte
  rm [file]    Supprimer un fichier (-r: répertoire)
  cp src dst   Copier un fichier (-r: répertoire)
  mv src dst   Déplacer / renommer
  grep pat f   Chercher dans un fichier (-n: lignes, -i: casse)
  head [file]  Afficher le début (-n N: N lignes)
  tail [file]  Afficher la fin (-n N: N lignes)
  wc [file]    Compter lignes/mots/octets (-l -w -c)
  chmod m file Changer les permissions
  whoami       Afficher l'utilisateur courant
  date         Afficher la date et l'heure
  uname [-a]   Informations système
  ps [aux]     Lister les processus
  history      Historique des commandes
  clear        Effacer le terminal
  help         Afficher cette aide`;

const MAN_PAGES: Record<string, string> = {
  pwd: 'PWD(1)\n\nNOM\n  pwd - afficher le répertoire de travail courant\n\nSYNOPSIS\n  pwd\n\nDESCRIPTION\n  Affiche le chemin absolu du répertoire courant.',
  ls: 'LS(1)\n\nNOM\n  ls - lister le contenu d\'un répertoire\n\nSYNOPSIS\n  ls [-la] [FICHIER...]\n\nOPTIONS\n  -l  format long\n  -a  afficher les fichiers cachés',
  cd: 'CD(1)\n\nNOM\n  cd - changer de répertoire\n\nSYNOPSIS\n  cd [RÉPERTOIRE]\n\nDESCRIPTION\n  Change le répertoire courant. Sans argument, va dans ~.',
  grep: 'GREP(1)\n\nNOM\n  grep - rechercher des lignes correspondant à un motif\n\nSYNOPSIS\n  grep [-ni] MOTIF FICHIER\n\nOPTIONS\n  -n  afficher les numéros de lignes\n  -i  ignorer la casse',
  chmod: 'CHMOD(1)\n\nNOM\n  chmod - changer les permissions d\'un fichier\n\nSYNOPSIS\n  chmod MODE FICHIER\n\nDESCRIPTION\n  MODE en octal (755) ou symbolique (+x, u+x, o-r)',
};

// ─── Main Command Processor ───────────────────────────────────────────────────

export function processCommand(state: TerminalState, input: string): CommandOutput {
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
      return { lines: cmdPwd(newState), newState };

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

    case 'help':
      return {
        lines: HELP_TEXT.split('\n').map((t) => ({ text: t, type: 'output' as const })),
        newState,
      };

    case 'man': {
      if (!args.length) return { lines: [{ text: 'man: quelle commande voulez-vous ?', type: 'error' }], newState };
      const page = MAN_PAGES[args[0]];
      if (!page) return { lines: [{ text: `man: pas de page de manuel pour '${args[0]}'`, type: 'error' }], newState };
      return { lines: page.split('\n').map((t) => ({ text: t, type: 'output' as const })), newState };
    }

    case 'exit':
    case 'logout':
      return { lines: [{ text: 'logout', type: 'output' }], newState };

    default:
      return {
        lines: [{ text: `bash: ${cmd}: commande introuvable. Tapez 'help' pour la liste des commandes.`, type: 'error' }],
        newState,
      };
  }
}
