import type { TerminalState, TerminalEnv, CommandOutput, OutputLine, GitCommit, GitState, DirectoryNode, FSNode } from './types';
import {
  blobId,
  countChanges,
  decidingRule,
  fileMode,
  ignoredBy,
  nodeAt,
  parseIgnore,
  readTree,
  unifiedHunks,
  writeFile,
  type IgnoreRule,
  type Tree,
} from './gitTree';

// Local copy of a tiny helper — avoids circular import with terminalEngine.
function displayPath(cwd: string[]): string {
  if (cwd.length === 0) return '/';
  return '/' + cwd.join('/');
}

/** Git for Windows writes `C:/Users/user/…` (drive letter, forward slashes). */
function gitPath(cwd: string[], env: TerminalEnv): string {
  if (env !== 'windows') return displayPath(cwd);
  return ['C:', ...(cwd[0] === 'home' ? ['Users', ...cwd.slice(1)] : cwd)].join('/');
}

function makeHash(length = 7): string {
  return Array.from({ length }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The message of `git commit`, in every form git accepts: `-m msg`, `-mmsg`,
 * `-am msg` (short options bundled, m last), `--message=msg`, `--message msg`.
 * Null when no message option is given (git would open an editor).
 */
function commitMessage(args: string[]): string | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--message') return args[i + 1] ?? '';
    if (a.startsWith('--message=')) return a.slice('--message='.length);
    if (/^-[a-zA-Z]*m/.test(a)) {
      const attached = a.slice(a.indexOf('m') + 1);
      return attached || (args[i + 1] ?? '');
    }
  }
  return null;
}

// ─── Repository model ────────────────────────────────────────────────────────

/** What `git init` writes in `.git/` (Git 2.56); Git for Windows adds its own core settings. */
export function dotGit(env: TerminalEnv, branch = 'main'): DirectoryNode {
  const dir = (children: Record<string, FSNode> = {}): DirectoryNode =>
    ({ type: 'directory', children, permissions: 'drwxr-xr-x', owner: 'user', group: 'user' });
  const file = (content: string): FSNode =>
    ({ type: 'file', content, permissions: '-rw-r--r--', owner: 'user', group: 'user', size: content.length });
  const core = env === 'windows'
    ? '\tfilemode = false\n\tbare = false\n\tlogallrefupdates = true\n\tsymlinks = false\n\tignorecase = true\n'
    : `\tfilemode = true\n\tbare = false\n\tlogallrefupdates = true\n${env === 'macos' ? '\tignorecase = true\n\tprecomposeunicode = true\n' : ''}`;
  return dir({
    HEAD: file(`ref: refs/heads/${branch}\n`),
    config: file(`[core]\n\trepositoryformatversion = 0\n${core}`),
    description: file("Unnamed repository; edit this file 'description' to name the repository.\n"),
    hooks: dir(),
    info: dir({ exclude: file("# git ls-files --others --exclude-from=.git/info/exclude\n# Lines that start with '#' are comments.\n# For a project mostly in C, the following would be a\n# good set of exclude patterns (uncomment them if you want to use them):\n# *.[oa]\n# *~\n") }),
    objects: dir({ info: dir(), pack: dir() }),
    refs: dir({ heads: dir(), tags: dir() }),
  });
}

/** Paths whose content differs between two trees, sorted as git lists them. */
function changes(from: Tree, to: Tree): Array<{ path: string; kind: 'new file' | 'modified' | 'deleted' }> {
  const paths = [...new Set([...Object.keys(from), ...Object.keys(to)])].sort();
  return paths
    .filter((p) => from[p] !== to[p])
    .map((path) => ({ path, kind: !(path in from) ? 'new file' as const : !(path in to) ? 'deleted' as const : 'modified' as const }));
}

/** `stagedFiles` mirrors the index: the paths a commit would record. */
function synced(g: GitState): GitState {
  return { ...g, stagedFiles: changes(g.head ?? {}, g.index ?? {}).map((c) => c.path) };
}

/**
 * Fills what a git state may leave out (states written by hand in tests):
 * the repository is the current directory, its `.git/` exists, what was
 * committed is the files present if there are commits, and the index adds the
 * files listed as staged.
 */
function withModel(state: TerminalState, env: TerminalEnv): TerminalState {
  const g = state.git;
  if (!g?.initialized || (g.repoPath && g.head && g.index && g.modes)) return state;
  const repoPath = g.repoPath ?? state.cwd;
  const files = readTree(state.root, repoPath);
  const head = g.head ?? (g.commits.length ? { ...files } : {});
  const staged = g.stagedFiles.filter((f) => f in files).map((f) => [f, files[f]]);
  const index = g.index ?? { ...head, ...Object.fromEntries(staged) };
  const modes = g.modes ?? Object.fromEntries(Object.keys({ ...head, ...index })
    .map((p) => [p, fileMode(nodeAt(state.root, [...repoPath, ...p.split('/')]), env)]));
  const root = nodeAt(state.root, [...repoPath, '.git']) ? state.root : placeDir(state.root, [...repoPath, '.git'], dotGit(env));
  return { ...state, root, git: synced({ ...g, repoPath, head, index, modes }) };
}

/** A copy of `root` with `dir` placed at `path` (its parent must exist). */
function placeDir(root: DirectoryNode, path: string[], dir: DirectoryNode): DirectoryNode {
  const [head, ...rest] = path;
  if (rest.length === 0) return { ...root, children: { ...root.children, [head]: dir } };
  const child = root.children[head];
  if (child?.type !== 'directory') return root;
  return { ...root, children: { ...root.children, [head]: placeDir(child, rest, dir) } };
}

function isInside(cwd: string[], dir: string[]): boolean {
  return cwd.length >= dir.length && dir.every((seg, i) => cwd[i] === seg);
}

/** How git shows a repository path from the current directory (`../a.txt`, `./`). */
function shown(path: string, cwdInRepo: string[], isDir = false): string {
  const parts = path ? path.split('/') : [];
  let i = 0;
  while (i < cwdInRepo.length && i < parts.length && cwdInRepo[i] === parts[i]) i++;
  const rel = [...Array<string>(cwdInRepo.length - i).fill('..'), ...parts.slice(i)].join('/');
  return isDir ? `${rel || '.'}/` : rel;
}

interface Repo {
  g: GitState;
  path: string[];
  head: Tree;
  index: Tree;
  work: Tree;
  rules: IgnoreRule[];
  /** The current directory, relative to the repository. */
  cwdInRepo: string[];
}

function openRepo(state: TerminalState): Repo {
  const g = state.git!;
  const path = g.repoPath!;
  const work = readTree(state.root, path);
  return {
    g,
    path,
    head: g.head!,
    index: g.index!,
    work,
    rules: parseIgnore(work['.gitignore'] ?? ''),
    cwdInRepo: state.cwd.slice(path.length),
  };
}

/** Files of `tree` at `rel` or below it (`''` is the whole repository). */
function under(tree: Tree, rel: string): string[] {
  return Object.keys(tree).filter((p) => !rel || p === rel || p.startsWith(`${rel}/`));
}

/**
 * Untracked paths as `git status` lists them: a directory whose files are all
 * untracked shows as `dir/`, ignored files are left out, empty directories too.
 */
function untracked(state: TerminalState, repo: Repo, collapse = true): Array<{ path: string; dir: boolean }> {
  const out: Array<{ path: string; dir: boolean }> = [];
  const visible = (p: string) => !(p in repo.index) && !ignoredBy(repo.rules, p, false);
  const walk = (node: DirectoryNode, rel: string) => {
    for (const [name, child] of Object.entries(node.children)) {
      if (name === '.git') continue;
      const p = rel ? `${rel}/${name}` : name;
      if (child.type === 'file') {
        if (visible(p)) out.push({ path: p, dir: false });
        continue;
      }
      if (ignoredBy(repo.rules, p, true)) continue;
      const files = under(repo.work, p).filter((f) => !ignoredBy(repo.rules, f, false));
      if (!files.length) continue;
      if (collapse && files.every((f) => !(f in repo.index))) out.push({ path: p, dir: true });
      else walk(child, p);
    }
  };
  const start = nodeAt(state.root, repo.path);
  if (start?.type === 'directory') walk(start, '');
  return out.sort((a, b) => (a.path + (a.dir ? '/' : '') < b.path + (b.dir ? '/' : '') ? -1 : 1));
}

/** Tracked files whose working copy differs from the index. */
function unstaged(repo: Repo): Array<{ path: string; kind: 'modified' | 'deleted' }> {
  return Object.keys(repo.index).sort()
    .filter((p) => repo.work[p] !== repo.index[p])
    .map((path) => ({ path, kind: path in repo.work ? 'modified' as const : 'deleted' as const }));
}

const pad = (kind: string) => `${kind}:`.padEnd(12);

/**
 * The long `git status` report (Git 2.56). `git commit` with nothing staged
 * prints the same report, with "Initial commit" in place of "No commits yet".
 */
function statusLines(state: TerminalState, repo: Repo, forCommit = false, untrackedMode = 'normal'): OutputLine[] {
  const { g } = repo;
  const out: OutputLine[] = [];
  const say = (text: string, type: OutputLine['type'] = 'output') => out.push({ text, type });
  say(`On branch ${g.branch}`);
  if (g.commits.length === 0) { say(''); say(forCommit ? 'Initial commit' : 'No commits yet'); say(''); }

  const staged = changes(repo.head, repo.index);
  const notStaged = unstaged(repo);
  const newFiles = untrackedMode === 'no' ? [] : untracked(state, repo, untrackedMode !== 'all');
  if (staged.length) {
    say('Changes to be committed:');
    say(g.commits.length ? '  (use "git restore --staged <file>..." to unstage)' : '  (use "git rm --cached <file>..." to unstage)');
    staged.forEach((c) => say(`\t${pad(c.kind)}${shown(c.path, repo.cwdInRepo)}`, 'success'));
    say('');
  }
  if (notStaged.length) {
    say('Changes not staged for commit:');
    say(notStaged.some((c) => c.kind === 'deleted')
      ? '  (use "git add/rm <file>..." to update what will be committed)'
      : '  (use "git add <file>..." to update what will be committed)');
    say('  (use "git restore <file>..." to discard changes in working directory)');
    notStaged.forEach((c) => say(`\t${pad(c.kind)}${shown(c.path, repo.cwdInRepo)}`, 'removed'));
    say('');
  }
  if (newFiles.length) {
    say('Untracked files:');
    say('  (use "git add <file>..." to include in what will be committed)');
    newFiles.forEach((f) => say(`\t${shown(f.path, repo.cwdInRepo, f.dir)}`, 'removed'));
    say('');
  }
  if (!staged.length) {
    if (notStaged.length) say('no changes added to commit (use "git add" and/or "git commit -a")');
    else if (newFiles.length) say('nothing added to commit but untracked files present (use "git add" to track)');
    else if (untrackedMode === 'no') say('nothing to commit (use -u to show untracked files)');
    else if (g.commits.length) say('nothing to commit, working tree clean');
    else say('nothing to commit (create/copy files and use "git add" to track)');
  }
  return out;
}

/** The unified diff of every path that differs between two trees (`git diff`). */
function diffLines(from: Tree, to: Tree, paths: string[] | null, state: TerminalState, repo: Repo, env: TerminalEnv, context = 3): OutputLine[] {
  const out: OutputLine[] = [];
  for (const c of changes(from, to)) {
    if (paths && !paths.some((p) => !p || c.path === p || c.path.startsWith(`${p}/`))) continue;
    const mode = repo.g.modes?.[c.path] ?? fileMode(nodeAt(state.root, [...repo.path, ...c.path.split('/')]), env);
    const before = from[c.path] ?? '';
    const after = to[c.path] ?? '';
    out.push({ text: `diff --git a/${c.path} b/${c.path}`, type: 'output' });
    if (c.kind === 'new file') {
      out.push({ text: `new file mode ${mode}`, type: 'output' }, { text: `index 0000000..${blobId(after).slice(0, 7)}`, type: 'output' });
    } else if (c.kind === 'deleted') {
      out.push({ text: `deleted file mode ${mode}`, type: 'output' }, { text: `index ${blobId(before).slice(0, 7)}..0000000`, type: 'output' });
    } else {
      out.push({ text: `index ${blobId(before).slice(0, 7)}..${blobId(after).slice(0, 7)} ${mode}`, type: 'output' });
    }
    const hunks = unifiedHunks(before, after, context);
    // An empty file added or removed has no lines, hence no hunk and no ---/+++ header.
    if (!hunks.length) continue;
    out.push(
      { text: c.kind === 'new file' ? '--- /dev/null' : `--- a/${c.path}`, type: 'output' },
      { text: c.kind === 'deleted' ? '+++ /dev/null' : `+++ b/${c.path}`, type: 'output' },
    );
    hunks.forEach((text) => out.push({
      text,
      type: text.startsWith('+') ? 'success' : text.startsWith('-') ? 'removed' : 'output',
    }));
  }
  return out;
}

/** ` 2 files changed, 3 insertions(+), 1 deletion(-)`, as git words it (both counts shown when both are 0). */
function statLine(files: number, insertions: number, deletions: number): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  let line = ` ${plural(files, 'file')} changed`;
  if (insertions || !deletions) line += `, ${plural(insertions, 'insertion')}(+)`;
  if (deletions || !insertions) line += `, ${plural(deletions, 'deletion')}(-)`;
  return line;
}

interface Options {
  short: Set<string>;
  long: Map<string, string | true>;
  /** Values of the short options that take one (`-m msg`, `-b dev`, `-uno`). */
  values: Map<string, string>;
  /** Arguments that are not options, before `--`. */
  positional: string[];
  /** Arguments after `--`: always paths. */
  paths: string[];
  /** A short option that needs a value and got none (`git commit -m`). */
  missing: string | null;
}

/**
 * Options as git's parser reads them: `-rf` is `-r -f`, `--name=value`
 * carries a value, `--` ends the options. Short options in `valued` take the
 * rest of the word or the next word (`-mmsg`, `-m msg`); those in `attached`
 * only take the rest of the word (`-uno`, `-u`); long options in `longValued` also take the next word.
 */
function parseOptions(args: string[], valued = '', attached = '', longValued: string[] = []): Options {
  const o: Options = { short: new Set(), long: new Map(), values: new Map(), positional: [], paths: [], missing: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { o.paths.push(...args.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const name = eq > 0 ? a.slice(2, eq) : a.slice(2);
      // `--source HEAD~1` as well as `--source=HEAD~1`, for the options that take a value.
      o.long.set(name, eq > 0 ? a.slice(eq + 1) : longValued.includes(name) && i + 1 < args.length ? args[++i] : true);
    } else if (a.startsWith('-') && a.length > 1) {
      for (let j = 1; j < a.length; j++) {
        const c = a[j];
        if (attached.includes(c)) { o.values.set(c, a.slice(j + 1)); break; }
        if (valued.includes(c)) {
          const value = a.slice(j + 1) || args[++i];
          if (value === undefined) o.missing = c;
          else o.values.set(c, value);
          break;
        }
        o.short.add(c);
      }
    } else o.positional.push(a);
  }
  return o;
}

const text = (v: string | true | undefined) => (typeof v === 'string' ? v : undefined);

const AMBIGUOUS = (arg: string): OutputLine[] => [
  { text: `fatal: ambiguous argument '${arg}': unknown revision or path not in the working tree.`, type: 'error' },
  { text: "Use '--' to separate paths from revisions, like this:", type: 'error' },
  { text: "'git <command> [<revision>...] -- [<file>...]'", type: 'error' },
];

/** `git reset --bogus`: the option error and git 2.56's usage, on stderr. */
const RESET_USAGE = [
  'usage: git reset [--mixed | --soft | --hard | --merge | --keep] [-q] [<commit>]',
  '   or: git reset [-q] [<tree-ish>] [--] <pathspec>...',
  '   or: git reset [-q] [--pathspec-from-file [--pathspec-file-nul]] [<tree-ish>]',
  '   or: git reset --patch [<tree-ish>] [--] [<pathspec>...]',
  '   or: DEPRECATED: git reset [-q] [--stdin [-z]] [<tree-ish>]',
  '',
  '    -q, --[no-]quiet      be quiet, only report errors',
  '    --no-refresh          skip refreshing the index after reset',
  '    --refresh             opposite of --no-refresh',
  '    --mixed               reset HEAD and index',
  '    --soft                reset only HEAD',
  '    --hard                reset HEAD, index and working tree',
  '    --merge               reset HEAD, index and working tree',
  '    --keep                reset HEAD but keep local changes',
  '    --[no-]recurse-submodules[=<reset>]',
  '                          control recursive updating of submodules',
  '    -p, --[no-]patch      select hunks interactively',
  '    --[no-]auto-advance   auto advance to the next file when selecting hunks interactively',
  '    -U, --unified <n>     generate diffs with <n> lines context',
  '    --inter-hunk-context <n>',
  '                          show context between diff hunks up to the specified number of lines',
  '    -N, --[no-]intent-to-add',
  '                          record only the fact that removed paths will be added later',
  '    --[no-]pathspec-from-file <file>',
  '                          read pathspec from file',
  '    --[no-]pathspec-file-nul',
  '                          with --pathspec-from-file, pathspec elements are separated with NUL character',
  '    -z                    DEPRECATED (use --pathspec-file-nul instead): paths are separated with NUL character',
  '    --[no-]stdin          DEPRECATED (use --pathspec-from-file=- instead): read paths from <stdin>',
  '',
];

const NOT_A_REPO = 'fatal: not a git repository (or any of the parent directories): .git';

function notSimulated(what: string, newState: TerminalState): CommandOutput {
  return { lines: [{ text: `${what} n'est pas simulé dans ce terminal d'entraînement.`, type: 'info' }], newState, status: 1 };
}

export function handleGit(
  state: TerminalState,
  args: string[],
  env: TerminalEnv,
  /** Resolves a path typed by the learner to an absolute path (the engine's `resolvePath`). */
  resolve: (path: string) => string[] = (p) => (p.startsWith('/') ? p.split('/').filter(Boolean) : [...state.cwd, ...p.split('/').filter((s) => s && s !== '.')]),
): CommandOutput {
  const sub = args[0]?.toLowerCase() ?? '';
  let newState = withModel(state, env);

  /** The repository around the current directory, or null (git looks for `.git/` upwards). */
  const inRepo = (): boolean => {
    const g = newState.git;
    return !!g?.initialized && isInside(newState.cwd, g.repoPath!) && !!nodeAt(newState.root, [...g.repoPath!, '.git']);
  };
  const notARepo = (): CommandOutput => ({ lines: [{ text: NOT_A_REPO, type: 'error' }], newState, status: 128 });
  const setGit = (git: GitState, root = newState.root) => { newState = { ...newState, root, git: synced(git) }; };

  /** The repository path of `arg`, or null when it points outside the repository. */
  const repoRel = (arg: string): string | null => {
    const abs = resolve(arg);
    const repoPath = newState.git!.repoPath!;
    return isInside(abs, repoPath) ? abs.slice(repoPath.length).join('/') : null;
  };

  /** The files of the commit `ref` names (HEAD, HEAD~N, HEAD^, a hash prefix), or null. */
  const commitTree = (ref: string): Tree | null => {
    const g = newState.git!;
    const back = ref.match(/^(?:HEAD|@)(?:~(\d*)|(\^))?$/);
    const at = back
      ? (back[2] ? 1 : back[1] === undefined ? 0 : Number(back[1] || 1))
      : ref.length >= 4 && /^[0-9a-f]+$/.test(ref) ? g.commits.findIndex((c) => c.hash.startsWith(ref)) : -1;
    if (at < 0 || at >= g.commits.length) return null;
    return g.commits[at].tree ?? g.head!;
  };
  /** Whether `rel` names something git knows or sees: a file or directory, or a path in a tree. */
  const known = (rel: string | null, ...trees: Tree[]) =>
    rel !== null && (!!nodeAt(newState.root, [...newState.git!.repoPath!, ...rel.split('/').filter(Boolean)])
      || trees.some((t) => under(t, rel).length > 0));

  switch (sub) {
    // ── git init ──────────────────────────────────────────────────────────────
    case 'init': {
      const o = parseOptions(args.slice(1), 'b', '', ['initial-branch']);
      const quiet = o.short.has('q') || o.long.has('quiet');
      const initial = o.values.get('b') ?? text(o.long.get('initial-branch')) ?? 'main';
      const where = gitPath(newState.cwd, env);
      if (newState.git?.initialized && newState.git.repoPath && displayPath(newState.git.repoPath) === displayPath(newState.cwd)
        && nodeAt(newState.root, [...newState.cwd, '.git'])) {
        return { lines: quiet ? [] : [{ text: `Reinitialized existing Git repository in ${where}/.git/`, type: 'output' }], newState };
      }
      const git: GitState = {
        initialized: true,
        branch: initial,
        branches: [initial],
        stagedFiles: [],
        commits: [],
        remotes: {},
        repoPath: newState.cwd,
        head: {},
        index: {},
        modes: {},
      };
      setGit(git, placeDir(newState.root, [...newState.cwd, '.git'], dotGit(env, initial)));
      return { lines: quiet ? [] : [{ text: `Initialized empty Git repository in ${where}/.git/`, type: 'success' }], newState };
    }

    // ── git status ────────────────────────────────────────────────────────────
    case 'status': {
      if (!inRepo()) return notARepo();
      const repo = openRepo(newState);
      const g = repo.g;
      const o = parseOptions(args.slice(1), '', 'u');
      const porcelain = o.long.has('porcelain');
      const untrackedMode = (o.values.get('u') ?? text(o.long.get('untracked-files'))) || 'normal';
      if (!porcelain && !o.short.has('s') && !o.long.has('short')) {
        return { lines: statusLines(newState, repo, false, untrackedMode), newState };
      }
      // XY path: X compares the index with HEAD, Y the working tree with the index.
      // Porcelain paths start at the repository root, short ones at the current directory.
      const from = porcelain ? [] : repo.cwdInRepo;
      const letter = { 'new file': 'A', modified: 'M', deleted: 'D' } as const;
      const x = new Map(changes(repo.head, repo.index).map((c) => [c.path, letter[c.kind]]));
      const y = new Map(unstaged(repo).map((c) => [c.path, letter[c.kind]]));
      const lines: OutputLine[] = [];
      if (o.short.has('b') || o.long.has('branch')) {
        lines.push({ text: `## ${g.commits.length ? g.branch : `No commits yet on ${g.branch}`}`, type: 'output' });
      }
      [...new Set([...x.keys(), ...y.keys()])].sort()
        .forEach((p) => lines.push({ text: `${x.get(p) ?? ' '}${y.get(p) ?? ' '} ${shown(p, from)}`, type: 'output' }));
      if (untrackedMode !== 'no') {
        untracked(newState, repo, untrackedMode !== 'all')
          .forEach((f) => lines.push({ text: `?? ${shown(f.path, from, f.dir)}`, type: 'output' }));
      }
      return { lines, newState };
    }

    // ── git add ───────────────────────────────────────────────────────────────
    case 'add': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1));
      if (o.short.has('p') || o.long.has('patch') || o.short.has('i') || o.long.has('interactive')) {
        return notSimulated('Le mode interactif de git add (-p)', newState);
      }
      const force = o.short.has('f') || o.long.has('force');
      const all = o.short.has('A') || o.long.has('all');
      const update = o.short.has('u') || o.long.has('update');
      const dryRun = o.short.has('n') || o.long.has('dry-run');
      const verbose = dryRun || o.short.has('v') || o.long.has('verbose');
      if (all && update) {
        return { lines: [{ text: "fatal: options '-u/--update' and '-A/--all' cannot be used together", type: 'error' }], newState, status: 128 };
      }
      const specs = [...o.positional, ...o.paths];
      if (!specs.length && !all && !update) {
        return {
          lines: [
            { text: 'Nothing specified, nothing added.', type: 'error' },
            { text: "hint: Maybe you wanted to say 'git add .'?", type: 'error' },
            { text: 'hint: Disable this message with "git config set advice.addEmptyPathspec false"', type: 'error' },
          ],
          newState,
          status: 0,
        };
      }
      const repo = openRepo(newState);
      // Without a path, -A and -u cover the whole repository.
      const targets = specs.length ? specs.map((arg) => ({ arg, rel: repoRel(arg) })) : [{ arg: '', rel: '' as string | null }];
      for (const t of targets) {
        if (!known(t.rel, repo.index)) {
          return { lines: [{ text: `fatal: pathspec '${t.arg}' did not match any files`, type: 'error' }], newState, status: 128 };
        }
      }
      const index = { ...repo.index };
      const modes = { ...repo.g.modes };
      const refused: string[] = [];
      const said: OutputLine[] = [];
      for (const t of targets) {
        const rel = t.rel!;
        const isFile = rel in repo.work;
        if (isFile && !force && !(rel in index) && ignoredBy(repo.rules, rel, false)) { refused.push(t.arg); continue; }
        if (!isFile && rel && !force && ignoredBy(repo.rules, rel, true)) { refused.push(t.arg); continue; }
        for (const p of new Set([...under(repo.work, rel), ...under(index, rel)])) {
          if (update && !(p in index)) continue;
          if (!(p in repo.work)) {
            if (p in index) said.push({ text: `remove '${p}'`, type: 'output' });
            delete index[p];
            continue;
          }
          if (!(p in index) && !force && ignoredBy(repo.rules, p, false)) continue;
          if (index[p] !== repo.work[p]) said.push({ text: `add '${p}'`, type: 'output' });
          index[p] = repo.work[p];
          modes[p] = fileMode(nodeAt(newState.root, [...repo.path, ...p.split('/')]), env);
        }
      }
      if (!dryRun) setGit({ ...repo.g, index, modes });
      const lines = verbose ? said : [];
      if (!refused.length) return { lines, newState };
      return {
        lines: [
          ...lines,
          { text: 'The following paths are ignored by one of your .gitignore files:', type: 'error' },
          ...refused.map((path) => ({ text: path, type: 'error' as const })),
          { text: 'hint: Use -f if you really want to add them.', type: 'error' },
          { text: 'hint: Disable this message with "git config set advice.addIgnoredFile false"', type: 'error' },
        ],
        newState,
        status: 1,
      };
    }

    // ── git rm ────────────────────────────────────────────────────────────────
    case 'rm': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1));
      const cached = o.long.has('cached');
      const force = o.short.has('f') || o.long.has('force');
      const quiet = o.short.has('q') || o.long.has('quiet');
      const specs = [...o.positional, ...o.paths];
      if (!specs.length) return { lines: [{ text: 'usage: git rm [<options>] [--] <file>...', type: 'error' }], newState, status: 129 };
      const repo = openRepo(newState);
      const paths: string[] = [];
      for (const arg of specs) {
        const rel = repoRel(arg);
        const found = rel === null ? [] : under(repo.index, rel);
        if (!found.length) return { lines: [{ text: `fatal: pathspec '${arg}' did not match any files`, type: 'error' }], newState, status: 128 };
        if (found.some((p) => p !== rel) && !o.short.has('r')) {
          return { lines: [{ text: `fatal: not removing '${arg}' recursively without -r`, type: 'error' }], newState, status: 128 };
        }
        paths.push(...found);
      }
      if (!force) {
        // Git refuses to lose work: a change staged, or a change on disk, not committed anywhere.
        const both: string[] = [];
        const staged: string[] = [];
        const local: string[] = [];
        for (const p of paths) {
          const stagedChange = repo.index[p] !== repo.head[p];
          const diskChange = p in repo.work && repo.work[p] !== repo.index[p];
          if (stagedChange && diskChange && repo.work[p] !== repo.head[p]) both.push(p);
          else if (!cached && stagedChange) staged.push(p);
          else if (!cached && diskChange) local.push(p);
        }
        const block = (list: string[], one: string, many: string, hint: string): OutputLine[] => (list.length
          ? [...(list.length === 1 ? one : many).split('\n'), ...list.map((p) => `    ${p}`), hint].map((t) => ({ text: t, type: 'error' as const }))
          : []);
        const lines = [
          ...block(both, 'error: the following file has staged content different from both the\nfile and the HEAD:',
            'error: the following files have staged content different from both the\nfile and the HEAD:', '(use -f to force removal)'),
          ...block(staged, 'error: the following file has changes staged in the index:',
            'error: the following files have changes staged in the index:', '(use --cached to keep the file, or -f to force removal)'),
          ...block(local, 'error: the following file has local modifications:',
            'error: the following files have local modifications:', '(use --cached to keep the file, or -f to force removal)'),
        ];
        if (lines.length) return { lines, newState, status: 1 };
      }
      const index = { ...repo.index };
      let root = newState.root;
      for (const p of paths) {
        delete index[p];
        if (!cached) root = writeFile(root, [...repo.path, ...p.split('/')], null);
      }
      setGit({ ...repo.g, index }, root);
      return { lines: quiet ? [] : paths.map((p) => ({ text: `rm '${p}'`, type: 'output' as const })), newState };
    }

    // ── git restore ───────────────────────────────────────────────────────────
    case 'restore': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1), 's', '', ['source']);
      const staged = o.short.has('S') || o.long.has('staged');
      const worktree = !staged || o.short.has('W') || o.long.has('worktree');
      const specs = [...o.positional, ...o.paths];
      if (!specs.length) return { lines: [{ text: 'fatal: you must specify path(s) to restore', type: 'error' }], newState, status: 128 };
      const repo = openRepo(newState);
      const sourceRef = o.values.get('s') ?? text(o.long.get('source'));
      const source = sourceRef ? commitTree(sourceRef) : null;
      if (sourceRef && !source) {
        return { lines: [{ text: `fatal: could not resolve ${sourceRef}`, type: 'error' }], newState, status: 128 };
      }
      const index = { ...repo.index };
      let root = newState.root;
      for (const arg of specs) {
        const rel = repoRel(arg);
        const paths = rel === null ? [] : [...new Set([...under(source ?? repo.head, rel), ...under(repo.index, rel)])];
        if (!paths.length) {
          return { lines: [{ text: `error: pathspec '${arg}' did not match any file(s) known to git`, type: 'error' }], newState, status: 1 };
        }
        for (const p of paths) {
          // --staged takes HEAD (or the source); the working tree takes the index (or the source).
          if (staged) {
            const from = source ?? repo.head;
            if (p in from) index[p] = from[p];
            else delete index[p];
          }
          if (worktree) {
            const from = source && !staged ? source : index;
            const want = p in from ? from[p] : null;
            if ((p in repo.work ? repo.work[p] : null) !== want && (want !== null || p in repo.index)) {
              root = writeFile(root, [...repo.path, ...p.split('/')], want);
            }
          }
        }
      }
      setGit({ ...repo.g, index }, root);
      return { lines: [], newState };
    }

    // ── git commit ────────────────────────────────────────────────────────────
    case 'commit': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1), 'm');
      if (o.missing === 'm') return { lines: [{ text: "error: switch `m' requires a value", type: 'error' }], newState, status: 129 };
      if (o.long.has('amend')) return notSimulated('git commit --amend', newState);
      const quiet = o.short.has('q') || o.long.has('quiet');
      const allowEmpty = o.long.has('allow-empty');
      const message = commitMessage(args);
      let repo = openRepo(newState);
      if (o.short.has('a') || o.long.has('all')) {
        const index = { ...repo.index };
        for (const p of Object.keys(index)) {
          if (p in repo.work) index[p] = repo.work[p];
          else delete index[p];
        }
        setGit({ ...repo.g, index });
        repo = openRepo(newState);
      }
      const recorded = changes(repo.head, repo.index);
      if (!recorded.length && !allowEmpty) {
        // Git prints the status and fails (exit 1) when nothing is staged.
        return { lines: statusLines(newState, repo, true), newState, status: 1 };
      }
      if (message === null) {
        return {
          lines: [{ text: 'Sans -m, git commit ouvre un éditeur pour écrire le message : il n\'est pas simulé ici. Écrivez git commit -m "votre message".', type: 'info' }],
          newState,
          status: 1,
        };
      }
      if (!message.trim()) {
        return { lines: [{ text: 'Aborting commit due to empty commit message.', type: 'error' }], newState, status: 1 };
      }
      const g = repo.g;
      const hash = makeHash();
      const tree = { ...repo.index };
      const commit: GitCommit = { hash, message, author: newState.user, date: today(), tree };
      let insertions = 0;
      let deletions = 0;
      for (const c of recorded) {
        const n = countChanges(repo.head[c.path] ?? '', repo.index[c.path] ?? '');
        insertions += n.insertions;
        deletions += n.deletions;
      }
      const lines: OutputLine[] = [
        { text: `[${g.branch}${g.commits.length ? '' : ' (root-commit)'} ${hash}] ${message.split('\n')[0]}`, type: 'success' },
      ];
      if (recorded.length) lines.push({ text: statLine(recorded.length, insertions, deletions), type: 'output' });
      for (const c of recorded) {
        if (c.kind === 'modified') continue;
        const mode = g.modes?.[c.path] ?? fileMode(nodeAt(newState.root, [...repo.path, ...c.path.split('/')]), env);
        lines.push({ text: ` ${c.kind === 'new file' ? 'create' : 'delete'} mode ${mode} ${c.path}`, type: 'output' });
      }
      setGit({ ...g, commits: [commit, ...g.commits], head: tree });
      return { lines: quiet ? [] : lines, newState };
    }

    // ── git log ───────────────────────────────────────────────────────────────
    case 'log': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      if (g.commits.length === 0) {
        return { lines: [{ text: `fatal: your current branch '${g.branch}' does not have any commits yet`, type: 'error' }], newState, status: 128 };
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

    // ── git diff ──────────────────────────────────────────────────────────────
    case 'diff': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1), 'U');
      if (o.long.has('stat')) return notSimulated('git diff --stat', newState);
      const repo = openRepo(newState);
      if (o.positional.some((s) => repo.g.branches.includes(s))) return notSimulated('La comparaison entre branches (git diff branche1 branche2)', newState);
      // Leading arguments that name commits are revisions; the others must be paths.
      const trees: Tree[] = [];
      const rels: string[] = [];
      for (const arg of o.positional) {
        const tree = !rels.length && trees.length < 2 ? commitTree(arg) : null;
        if (tree) { trees.push(tree); continue; }
        const rel = repoRel(arg);
        if (!known(rel, repo.index, repo.head)) return { lines: AMBIGUOUS(arg), newState, status: 128 };
        rels.push(rel!);
      }
      for (const arg of o.paths) { const rel = repoRel(arg); if (rel !== null) rels.push(rel); }
      const staged = o.long.has('staged') || o.long.has('cached');
      /** The working tree as git compares it: the files it tracks in `these` trees. */
      const onDisk = (...these: Tree[]) => Object.fromEntries(Object.keys(Object.assign({}, ...these))
        .filter((p) => p in repo.work).map((p) => [p, repo.work[p]]));
      const [from, to] = trees.length === 2 ? [trees[0], trees[1]]
        : trees.length === 1 ? [trees[0], staged ? repo.index : onDisk(trees[0], repo.index)]
          : staged ? [repo.head, repo.index] : [repo.index, onDisk(repo.index)];
      const paths = rels.length || o.paths.length ? rels : null;
      const picked = changes(from, to).filter((c) => !paths || paths.some((p) => !p || c.path === p || c.path.startsWith(`${p}/`)));
      const counts = (c: { path: string }) => countChanges(from[c.path] ?? '', to[c.path] ?? '');
      if (o.long.has('name-only')) return { lines: picked.map((c) => ({ text: c.path, type: 'output' as const })), newState };
      if (o.long.has('name-status')) {
        const letter = { 'new file': 'A', modified: 'M', deleted: 'D' } as const;
        return { lines: picked.map((c) => ({ text: `${letter[c.kind]}\t${c.path}`, type: 'output' as const })), newState };
      }
      if (o.long.has('numstat')) {
        return { lines: picked.map((c) => { const n = counts(c); return { text: `${n.insertions}\t${n.deletions}\t${c.path}`, type: 'output' as const }; }), newState };
      }
      if (o.long.has('shortstat')) {
        if (!picked.length) return { lines: [], newState };
        const total = picked.map(counts).reduce((t, n) => ({ insertions: t.insertions + n.insertions, deletions: t.deletions + n.deletions }), { insertions: 0, deletions: 0 });
        return { lines: [{ text: statLine(picked.length, total.insertions, total.deletions), type: 'output' }], newState };
      }
      const context = Number(o.values.get('U') ?? text(o.long.get('unified')) ?? 3);
      return { lines: diffLines(from, to, paths, newState, repo, env, Number.isFinite(context) ? context : 3), newState };
    }

    // ── git check-ignore ──────────────────────────────────────────────────────
    case 'check-ignore': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1));
      const verbose = o.short.has('v') || o.long.has('verbose');
      const quiet = o.short.has('q') || o.long.has('quiet');
      const nonMatching = o.short.has('n') || o.long.has('non-matching');
      if (nonMatching && !verbose) return { lines: [{ text: 'fatal: --non-matching is only valid with --verbose', type: 'error' }], newState, status: 128 };
      const specs = [...o.positional, ...o.paths];
      if (!specs.length) return { lines: [{ text: 'fatal: no path specified', type: 'error' }], newState, status: 128 };
      const repo = openRepo(newState);
      const lines: OutputLine[] = [];
      let matched = false;
      for (const arg of specs) {
        const rel = repoRel(arg);
        if (rel === null) continue;
        const node = nodeAt(newState.root, [...repo.path, ...rel.split('/').filter(Boolean)]);
        // -v names the deciding rule, a `!` rule included; without -v only ignored paths are listed.
        // A tracked file is never ignored, whatever the rules say.
        const rule = rel in repo.index ? null
          : verbose ? decidingRule(repo.rules, rel, node?.type === 'directory') : ignoredBy(repo.rules, rel, node?.type === 'directory');
        if (rule && !rule.negate) matched = true;
        if (rule) lines.push({ text: verbose ? `.gitignore:${rule.line}:${rule.pattern}\t${arg}` : arg, type: 'output' });
        else if (nonMatching) lines.push({ text: `::\t${arg}`, type: 'output' });
      }
      return { lines: quiet ? [] : lines, newState, status: matched ? 0 : 1 };
    }

    // ── git branch ────────────────────────────────────────────────────────────
    case 'branch': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const deleteFlag = args.includes('-d') || args.includes('-D');
      const branchName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';

      if (!branchName && !deleteFlag) {
        return {
          lines: g.branches.map((b) => ({
            text: b === g.branch ? `* ${b}` : `  ${b}`,
            type: b === g.branch ? 'success' : 'output',
          })),
          newState,
        };
      }
      if (deleteFlag && branchName) {
        if (branchName === g.branch) {
          return { lines: [{ text: `error: Cannot delete branch '${branchName}' checked out at current worktree.`, type: 'error' }], newState };
        }
        if (!g.branches.includes(branchName)) {
          return { lines: [{ text: `error: branch '${branchName}' not found.`, type: 'error' }], newState };
        }
        setGit({ ...g, branches: g.branches.filter((b) => b !== branchName) });
        return { lines: [{ text: `Deleted branch ${branchName}.`, type: 'success' }], newState };
      }
      if (branchName) {
        if (g.branches.includes(branchName)) {
          return { lines: [{ text: `fatal: A branch named '${branchName}' already exists.`, type: 'error' }], newState };
        }
        setGit({ ...g, branches: [...g.branches, branchName] });
        return { lines: [{ text: `Branch '${branchName}' created.`, type: 'success' }], newState };
      }
      return { lines: [{ text: 'Usage: git branch [<branch-name>] [-d <branch>]', type: 'error' }], newState };
    }

    // ── git checkout ──────────────────────────────────────────────────────────
    case 'checkout': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const createFlag = args.includes('-b') || args.includes('-B');
      const branchName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
      if (!branchName) return { lines: [{ text: 'Usage: git checkout [-b] <branch>', type: 'error' }], newState };
      if (createFlag) {
        if (g.branches.includes(branchName)) {
          return { lines: [{ text: `fatal: A branch named '${branchName}' already exists.`, type: 'error' }], newState };
        }
        setGit({ ...g, branch: branchName, branches: [...g.branches, branchName] });
        return { lines: [{ text: `Switched to a new branch '${branchName}'`, type: 'success' }], newState };
      }
      if (!g.branches.includes(branchName)) {
        return { lines: [{ text: `error: pathspec '${branchName}' did not match any file(s) known to git`, type: 'error' }], newState, status: 1 };
      }
      if (branchName === g.branch) return { lines: [{ text: `Already on '${branchName}'`, type: 'info' }], newState };
      setGit({ ...g, branch: branchName });
      return { lines: [{ text: `Switched to branch '${branchName}'`, type: 'success' }], newState };
    }

    // ── git switch ────────────────────────────────────────────────────────────
    case 'switch': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const createFlag = args.includes('-c') || args.includes('-C');
      const branchName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
      if (!branchName) return { lines: [{ text: 'Usage: git switch [-c] <branch>', type: 'error' }], newState };
      if (createFlag) {
        if (g.branches.includes(branchName)) {
          return { lines: [{ text: `fatal: A branch named '${branchName}' already exists.`, type: 'error' }], newState };
        }
        setGit({ ...g, branch: branchName, branches: [...g.branches, branchName] });
        return { lines: [{ text: `Switched to a new branch '${branchName}'`, type: 'success' }], newState };
      }
      if (!g.branches.includes(branchName)) {
        return { lines: [{ text: `fatal: invalid reference: ${branchName}`, type: 'error' }], newState };
      }
      setGit({ ...g, branch: branchName });
      return { lines: [{ text: `Switched to branch '${branchName}'`, type: 'success' }], newState };
    }

    // ── git merge ─────────────────────────────────────────────────────────────
    case 'merge': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const branchName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
      if (!branchName) return { lines: [{ text: 'Usage: git merge <branch>', type: 'error' }], newState };
      if (!g.branches.includes(branchName)) {
        return { lines: [{ text: `merge: ${branchName} - not something we can merge`, type: 'error' }], newState };
      }
      if (branchName === g.branch) return { lines: [{ text: 'Already up to date.', type: 'info' }], newState };
      const hash = makeHash();
      const mergeCommit: GitCommit = {
        hash,
        message: `Merge branch '${branchName}' into ${g.branch}`,
        author: newState.user,
        date: today(),
        tree: g.head,
      };
      setGit({ ...g, commits: [mergeCommit, ...g.commits] });
      return {
        lines: [
          { text: `Merge made by the 'ort' strategy.`, type: 'success' },
          { text: `[${g.branch} ${hash}] Merge branch '${branchName}'`, type: 'output' },
        ],
        newState,
      };
    }

    // ── git remote ────────────────────────────────────────────────────────────
    case 'remote': {
      if (!inRepo()) return notARepo();
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
        setGit({ ...g, remotes: { ...g.remotes, [name]: url } });
        return { lines: [{ text: `Remote '${name}' added (${url})`, type: 'success' }], newState };
      }
      if (remoteSub === 'remove' || remoteSub === 'rm') {
        const name = args[2] ?? '';
        if (!name) return { lines: [{ text: 'Usage: git remote remove <name>', type: 'error' }], newState };
        if (!g.remotes[name]) return { lines: [{ text: `error: No such remote '${name}'`, type: 'error' }], newState };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [name]: _r, ...rest } = g.remotes;
        setGit({ ...g, remotes: rest });
        return { lines: [{ text: `Remote '${name}' removed.`, type: 'success' }], newState };
      }
      return { lines: [{ text: 'Usage: git remote add|remove|[-v]', type: 'error' }], newState };
    }

    // ── git push ──────────────────────────────────────────────────────────────
    case 'push': {
      if (!inRepo()) return notARepo();
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

    // ── git pull ──────────────────────────────────────────────────────────────
    case 'pull': {
      if (!inRepo()) return notARepo();
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

    // ── git fetch ─────────────────────────────────────────────────────────────
    case 'fetch': {
      if (!inRepo()) return notARepo();
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

    // ── git clone ─────────────────────────────────────────────────────────────
    case 'clone': {
      // Options that take a value (`-b develop`) are not the URL or the directory.
      const positional: string[] = [];
      let branch = 'main';
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '-b' || a === '--branch') branch = args[++i] ?? branch;
        else if (a === '--depth' || a === '-o' || a === '--origin') i++;
        else if (!a.startsWith('-')) positional.push(a);
      }
      const [url = '', dirArg] = positional;
      if (!url) return { lines: [{ text: 'Usage: git clone <url> [directory]', type: 'error' }], newState };
      const dirName = dirArg ?? url.split(/[/:]/).pop()?.replace(/\.git$/, '') ?? 'repo';
      const target = resolve(dirName);
      const existing = nodeAt(newState.root, target);
      if (existing && (existing.type === 'file' || Object.keys(existing.children).length > 0)) {
        return { lines: [{ text: `fatal: destination path '${dirName}' already exists and is not an empty directory.`, type: 'error' }], newState, status: 128 };
      }
      // The simulated remote holds one commit with a README, placed in its own directory as git does.
      const readme = `# ${dirName}\n`;
      const tree: Tree = { 'README.md': readme };
      let root = placeDir(newState.root, target, { type: 'directory', children: {}, permissions: 'drwxr-xr-x', owner: 'user', group: 'user' });
      root = placeDir(root, [...target, '.git'], dotGit(env));
      root = writeFile(root, [...target, 'README.md'], readme);
      setGit({
        initialized: true,
        branch,
        branches: [branch],
        stagedFiles: [],
        commits: [{ hash: makeHash(), message: 'Initial commit', author: 'remote', date: today(), tree }],
        remotes: { origin: url },
        repoPath: target,
        head: tree,
        index: tree,
        modes: { 'README.md': '100644' },
      }, root);
      return {
        lines: [
          { text: `Cloning into '${dirName}'...`, type: 'output' },
          { text: 'remote: Enumerating objects: 3, done.', type: 'output' },
          { text: 'remote: Counting objects: 100% (3/3), done.', type: 'output' },
          { text: 'remote: Total 3 (delta 0), reused 0 (delta 0), pack-reused 0', type: 'output' },
          { text: 'Receiving objects: 100% (3/3), done.', type: 'output' },
        ],
        newState,
      };
    }

    // ── git stash ─────────────────────────────────────────────────────────────
    case 'stash': {
      if (!inRepo()) return notARepo();
      const rest = args.slice(1);
      const action = rest[0] && !rest[0].startsWith('-') ? rest.shift()!.toLowerCase() : 'push';
      const o = parseOptions(rest, 'm', '', ['message']);
      const quiet = o.short.has('q') || o.long.has('quiet');
      const repo = openRepo(newState);
      const g = repo.g;
      const stash = g.stash ?? [];
      /** `stash@{n}` (or `n`) → its position; the latest when absent. */
      const pick = (): number | CommandOutput => {
        const ref = o.positional[0];
        if (!stash.length) return { lines: [{ text: 'No stash entries found.', type: 'error' }], newState, status: 128 };
        if (!ref) return 0;
        const n = Number(ref.match(/^(?:stash@\{(\d+)\}|(\d+))$/)?.slice(1).find((v) => v !== undefined) ?? NaN);
        if (Number.isNaN(n)) return { lines: [{ text: `error: ${ref} is not a valid reference`, type: 'error' }], newState, status: 128 };
        if (n >= stash.length) return { lines: [{ text: `fatal: log for 'stash' only has ${stash.length} entries`, type: 'error' }], newState, status: 128 };
        return n;
      };
      if (action === 'push' || action === 'save') {
        if (o.short.has('u') || o.long.has('include-untracked') || o.short.has('p') || o.long.has('patch')) {
          return notSimulated('git stash -u / -p', newState);
        }
        if (!g.commits.length) return { lines: [{ text: 'You do not have the initial commit yet', type: 'error' }], newState, status: 1 };
        const paths = [...new Set([...Object.keys(repo.head), ...Object.keys(repo.index)])];
        const dirty = changes(repo.head, repo.index).length > 0 || paths.some((p) => repo.work[p] !== repo.index[p] && p in repo.index);
        if (!dirty) return { lines: [{ text: 'No local changes to save', type: 'output' }], newState };
        const note = o.values.get('m') ?? text(o.long.get('message')) ?? (action === 'save' ? o.positional.join(' ') : '');
        const message = note ? `On ${g.branch}: ${note}` : `WIP on ${g.branch}: ${g.commits[0].hash} ${g.commits[0].message}`;
        const work = Object.fromEntries(paths.map((p) => [p, p in repo.work ? repo.work[p] : null]));
        const newFiles = Object.fromEntries(Object.keys(repo.index).filter((p) => !(p in repo.head)).map((p) => [p, repo.index[p]]));
        // The working tree and the index go back to the last commit.
        let root = newState.root;
        for (const p of paths) {
          const committed = p in repo.head ? repo.head[p] : null;
          if ((p in repo.work ? repo.work[p] : null) !== committed) root = writeFile(root, [...repo.path, ...p.split('/')], committed);
        }
        setGit({ ...g, index: { ...repo.head }, stash: [{ message, work, newFiles, base: { ...repo.head } }, ...stash] }, root);
        return { lines: quiet ? [] : [{ text: `Saved working directory and index state ${message}`, type: 'output' }], newState };
      }
      if (action === 'pop' || action === 'apply') {
        const at = pick();
        if (typeof at !== 'number') return at;
        const entry = stash[at];
        const base = entry.base ?? repo.head;
        // Only what the stash changed is applied, on top of the current files.
        const touched = Object.keys(entry.work).filter((p) => entry.work[p] !== (p in base ? base[p] : null));
        const busy = touched.filter((p) => repo.work[p] !== repo.head[p] || repo.index[p] !== repo.head[p]).sort();
        if (busy.length) {
          const lines: OutputLine[] = [
            { text: 'error: Your local changes to the following files would be overwritten by merge:', type: 'error' },
            ...busy.map((p) => ({ text: `\t${p}`, type: 'error' as const })),
            { text: 'Please commit your changes or stash them before you merge.', type: 'error' },
            { text: 'Aborting', type: 'error' },
            ...statusLines(newState, repo),
          ];
          if (action === 'pop') lines.push({ text: 'The stash entry is kept in case you need it again.', type: 'output' });
          return { lines, newState, status: 128 };
        }
        let root = newState.root;
        for (const p of touched) root = writeFile(root, [...repo.path, ...p.split('/')], entry.work[p]);
        // Files that were new come back staged; other changes come back unstaged.
        const kept = action === 'pop' ? stash.filter((_, i) => i !== at) : stash;
        setGit({ ...g, index: { ...repo.index, ...entry.newFiles }, stash: kept }, root);
        if (quiet) return { lines: [], newState };
        const lines = statusLines(newState, openRepo(newState));
        if (action === 'pop') lines.push({ text: `Dropped refs/stash@{${at}} (${makeHash(40)})`, type: 'output' });
        return { lines, newState };
      }
      if (action === 'drop') {
        const at = pick();
        if (typeof at !== 'number') return at;
        setGit({ ...g, stash: stash.filter((_, i) => i !== at) });
        return { lines: quiet ? [] : [{ text: `Dropped refs/stash@{${at}} (${makeHash(40)})`, type: 'output' }], newState };
      }
      if (action === 'clear') {
        setGit({ ...g, stash: [] });
        return { lines: [], newState };
      }
      if (action === 'list') {
        return { lines: stash.map((s, i) => ({ text: `stash@{${i}}: ${s.message}`, type: 'output' as const })), newState };
      }
      return notSimulated(`git stash ${action}`, newState);
    }

    // ── git tag ───────────────────────────────────────────────────────────────
    case 'tag': {
      if (!inRepo()) return notARepo();
      const tagName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
      if (!tagName) return { lines: [{ text: 'Usage: git tag <tagname>', type: 'error' }], newState };
      const g = newState.git!;
      if (g.commits.length === 0) return { lines: [{ text: 'fatal: No commits to tag.', type: 'error' }], newState };
      return { lines: [{ text: `Tag '${tagName}' created at ${g.commits[0].hash}`, type: 'success' }], newState };
    }

    // ── git show ──────────────────────────────────────────────────────────────
    case 'show': {
      if (!inRepo()) return notARepo();
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

    // ── git reset ─────────────────────────────────────────────────────────────
    case 'reset': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1));
      const unknown = [...o.short].find((c) => c !== 'q') ?? [...o.long.keys()].find((k) => !['soft', 'mixed', 'hard', 'keep', 'merge', 'quiet'].includes(k));
      if (unknown) {
        const name = unknown.length === 1 ? `switch \`${unknown}'` : `option \`${unknown}'`;
        return { lines: [`error: unknown ${name}`, ...RESET_USAGE].map((t) => ({ text: t, type: 'error' as const })), newState, status: 129 };
      }
      const repo = openRepo(newState);
      const g = repo.g;
      const mode = o.long.has('hard') ? 'hard' : o.long.has('soft') ? 'soft' : 'mixed';
      const quiet = o.short.has('q') || o.long.has('quiet');
      // A first argument that names a commit moves HEAD; the others are paths.
      let back = 0;
      let rest = o.positional;
      if (rest.length && commitTree(rest[0])) {
        const ref = rest[0];
        const m = ref.match(/^(?:HEAD|@)(?:~(\d*)|(\^))?$/);
        back = m ? (m[2] ? 1 : m[1] === undefined ? 0 : Number(m[1] || 1)) : g.commits.findIndex((c) => c.hash.startsWith(ref));
        rest = rest.slice(1);
      }
      for (const arg of rest) {
        if (!known(repoRel(arg), repo.index, repo.head)) return { lines: AMBIGUOUS(arg), newState, status: 128 };
      }
      const paths = [...rest, ...o.paths];
      if (paths.length && mode !== 'mixed') {
        return { lines: [{ text: `fatal: Cannot do ${mode} reset with paths.`, type: 'error' }], newState, status: 128 };
      }
      if (o.long.has('keep') || o.long.has('merge')) {
        // Without a commit to move to, both keep every file as it is.
        if (!back && !paths.length) return { lines: [], newState };
        return notSimulated('git reset --keep / --merge', newState);
      }
      // With paths, only the index changes: HEAD stays where it is.
      const source = back ? g.commits[back]?.tree ?? repo.head : repo.head;
      const commits = paths.length ? g.commits : g.commits.slice(back);
      const head = paths.length ? repo.head : source;
      let index: Tree;
      if (paths.length) {
        index = { ...repo.index };
        for (const arg of paths) {
          const rel = repoRel(arg) ?? '';
          for (const p of new Set([...under(repo.index, rel), ...under(source, rel)])) {
            if (p in source) index[p] = source[p];
            else delete index[p];
          }
        }
      } else index = mode === 'soft' ? repo.index : { ...head };
      let root = newState.root;
      if (mode === 'hard') {
        for (const p of new Set([...Object.keys(repo.index), ...Object.keys(head)])) {
          const content = p in head ? head[p] : null;
          if ((p in repo.work ? repo.work[p] : null) !== content) root = writeFile(root, [...repo.path, ...p.split('/')], content);
        }
      }
      setGit({ ...g, commits, head, index }, root);
      if (quiet || mode === 'soft') return { lines: [], newState };
      if (mode === 'hard') {
        const top = commits[0];
        return { lines: top ? [{ text: `HEAD is now at ${top.hash} ${top.message}`, type: 'output' }] : [], newState };
      }
      const left = unstaged(openRepo(newState));
      if (!left.length) return { lines: [], newState };
      return {
        lines: [
          { text: 'Unstaged changes after reset:', type: 'output' },
          ...left.map((c) => ({ text: `${c.kind === 'deleted' ? 'D' : 'M'}\t${c.path}`, type: 'output' as const })),
        ],
        newState,
      };
    }

    // ── git config ────────────────────────────────────────────────────────────
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
            { text: 'init.defaultBranch=main', type: 'output' },
            ...(globalFlag ? [{ text: 'credential.helper=store', type: 'output' as const }] : []),
          ],
          newState,
        };
      }
      return { lines: [{ text: `git config ${key || '--list'}`, type: 'info' }], newState };
    }

    // ── git cherry-pick ─────────────────────────────────────────────────────────
    case 'cherry-pick': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      // No commits → no ref can ever be valid; give the contextual error first (like git log/tag).
      if (g.commits.length === 0) {
        return { lines: [{ text: 'fatal: your current branch does not have any commits yet.', type: 'error' }], newState };
      }
      const ref = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
      if (!ref) {
        return { lines: [{ text: "Usage: git cherry-pick <commit>\nHint: récupère le hash via 'git log --oneline'.", type: 'error' }], newState };
      }
      // `A..B` picks the commits after A up to B (A itself excluded), oldest first.
      const find = (r: string) => g.commits.findIndex((c) => c.hash.startsWith(r));
      const range = ref.match(/^([^.]+)\.\.([^.]+)$/);
      let picked: GitCommit[];
      if (range) {
        const from = find(range[1]);
        const to = find(range[2]);
        if (from < 0 || to < 0) return { lines: [{ text: `fatal: bad revision '${ref}'`, type: 'error' }], newState };
        // `commits` is newest first: B sits before A in the list.
        picked = g.commits.slice(to, from).reverse();
      } else {
        const one = find(ref);
        if (one < 0) return { lines: [{ text: `fatal: bad revision '${ref}'`, type: 'error' }], newState };
        picked = [g.commits[one]];
      }
      if (!picked.length) return { lines: [{ text: 'fatal: empty commit set passed', type: 'error' }], newState };
      const lines: OutputLine[] = [];
      let commits = g.commits;
      for (const source of picked) {
        const hash = makeHash();
        commits = [{ hash, message: source.message, author: newState.user, date: today(), tree: g.head }, ...commits];
        lines.push({ text: `[${g.branch} ${hash}] ${source.message}`, type: 'success' });
        lines.push({ text: ` (cherry-pické depuis ${source.hash} — le commit est ré-appliqué sur ${g.branch})`, type: 'info' });
      }
      setGit({ ...g, commits });
      return { lines, newState };
    }

    // ── git rebase ────────────────────────────────────────────────────────────
    case 'rebase': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const interactive = args.includes('-i') || args.includes('--interactive');
      if (interactive) {
        // `HEAD~N` needs N commits below HEAD, as in git: otherwise "invalid upstream".
        const upstream = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
        const back = upstream.match(/^HEAD~(\d+)$/);
        if (back && Number(back[1]) >= g.commits.length) {
          return { lines: [{ text: `fatal: invalid upstream '${upstream}'`, type: 'error' }], newState };
        }
        return {
          lines: [
            { text: 'Rebase interactif (simulé) — réécriture de l\'historique.', type: 'info' },
            { text: 'En réel : un éditeur s\'ouvre avec pick/reword/squash/drop pour chaque commit.', type: 'output' },
            // A warning, not an error: nothing failed.
            { text: '⚠️  Ne JAMAIS réécrire un historique déjà poussé sur une branche partagée.', type: 'info' },
          ],
          newState,
        };
      }
      const target = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
      if (!target) {
        return { lines: [{ text: 'Usage: git rebase <branche-de-base> | git rebase -i HEAD~N', type: 'error' }], newState };
      }
      if (!g.branches.includes(target)) {
        return { lines: [{ text: `fatal: invalid upstream '${target}'`, type: 'error' }], newState };
      }
      if (target === g.branch) {
        return { lines: [{ text: `Current branch ${g.branch} is up to date.`, type: 'info' }], newState };
      }
      return {
        lines: [
          { text: `Successfully rebased and updated refs/heads/${g.branch}.`, type: 'success' },
          { text: `Les commits de ${g.branch} sont rejoués au-dessus de ${target} (historique linéaire, pas de merge commit).`, type: 'info' },
          { text: '⚠️  Rebaser réécrit les hashes — à éviter sur une branche déjà partagée.', type: 'output' },
        ],
        newState,
      };
    }

    // ── git --version / --help ────────────────────────────────────────────────
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
          { text: '  rm        Retirer des fichiers du suivi (et du disque)', type: 'output' },
          { text: '  restore   Annuler une modification ou un git add', type: 'output' },
          { text: '  commit    Enregistrer les modifications indexées', type: 'output' },
          { text: '  status    Afficher l\'état du répertoire de travail', type: 'output' },
          { text: '  log       Afficher l\'historique des commits', type: 'output' },
          { text: '  diff      Comparer les modifications', type: 'output' },
          { text: '  check-ignore  Dire quelle règle du .gitignore ignore un fichier', type: 'output' },
          { text: '  branch    Lister, créer ou supprimer des branches', type: 'output' },
          { text: '  checkout  Changer de branche ou restaurer des fichiers', type: 'output' },
          { text: '  switch    Changer de branche (commande moderne)', type: 'output' },
          { text: '  merge     Fusionner une branche dans la branche active', type: 'output' },
          { text: '  rebase    Rejouer des commits sur une autre base (historique linéaire)', type: 'output' },
          { text: '  cherry-pick  Ré-appliquer un commit précis sur la branche courante', type: 'output' },
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
        lines: [{ text: `git: '${sub}' is not a git command. See 'git --help'.`, type: 'error' }],
        newState,
        status: 1,
      };
  }
}
