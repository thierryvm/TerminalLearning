import type { TerminalState, TerminalEnv, CommandOutput, OutputLine, GitCommit, GitState, DirectoryNode, FSNode } from './types';
import {
  ancestors,
  commitId,
  commitTime,
  formatGitDate,
  ident,
  isAncestor,
  logOrder,
  mergeBase,
  mergeText,
  newHash,
  short,
  statGraph,
  tagId,
  treeId,
} from './gitHistory';
import { BRANCH_USAGE, CHECKOUT_USAGE, MERGE_USAGE, REMOTE_ADD_USAGE, REMOTE_USAGE, SWITCH_USAGE, TAG_USAGE } from './gitUsage';
import {
  blobId,
  countChanges,
  decidingRule,
  fileMode,
  ignoredBy,
  nodeAt,
  parseIgnore,
  readTree,
  splitLines,
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

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The message of `git commit`, in every form git accepts: `-m msg`, `-mmsg`,
 * `-am msg` (short options bundled, m last), `--message=msg`, `--message msg`.
 * Null when no message option is given (git would open an editor).
 */
function commitMessage(args: string[]): string | null {
  // Each -m is a paragraph: git joins them with a blank line.
  const given: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') break;
    if (a === '--message') given.push(args[++i] ?? '');
    else if (a.startsWith('--message=')) given.push(a.slice('--message='.length));
    else if (/^-[a-zA-Z]*m/.test(a)) {
      const attached = a.slice(a.indexOf('m') + 1);
      given.push(attached || (args[++i] ?? ''));
    }
  }
  return given.length ? given.join('\n\n') : null;
}

/**
 * Git's default regex for --grep and --author is POSIX basic: `( ) { } | + ?` are plain
 * characters, and `\( \) \{ \} \| \+ \?` the operators. JavaScript reads them the other way.
 */
function basicRegex(pattern: string): string {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < pattern.length) {
      const next = pattern[++i];
      out += '(){}|+?'.includes(next) ? next : `\\${next}`;
    } else out += '(){}|+?'.includes(c) ? `\\${c}` : c;
  }
  return out;
}

/** Every value of a long option given several times (`--grep=a --grep b`). */
function allValues(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--') break;
    if (args[i] === `--${name}`) values.push(args[++i] ?? '');
    else if (args[i].startsWith(`--${name}=`)) values.push(args[i].slice(name.length + 3));
  }
  return values;
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

/**
 * Derives what the commit graph decides: HEAD's files and history, the branch
 * list, and `stagedFiles` (the paths a commit would record).
 */
function synced(g: GitState): GitState {
  const objects = g.objects ?? {};
  const refs = g.refs ?? {};
  const tip = refs[g.branch];
  const head = tip ? objects[tip]?.tree ?? {} : {};
  return {
    ...g,
    head,
    commits: tip ? logOrder(objects, [tip]) : [],
    branches: [...new Set([...Object.keys(refs), g.branch])].sort(),
    stagedFiles: changes(head, g.index ?? {}).map((c) => c.path),
  };
}

/** For prepared states (lesson setups): derive the fields git computes from the graph. */
export const syncGit = synced;

/**
 * A commit graph for a state that lists its commits by hand (tests, older
 * saved states): a straight line, newest first, every branch at the newest
 * commit. Short hashes are completed to 40 digits.
 */
function graphFrom(g: GitState, head: Tree): Pick<GitState, 'objects' | 'refs' | 'remoteRefs'> {
  const full = (h: string) => (/^[0-9a-f]{40}$/.test(h) ? h : (h + blobId(h)).slice(0, 40));
  const objects: Record<string, GitCommit> = {};
  let later = Infinity;
  g.commits.forEach((c, i) => {
    const parsed = Date.parse(`${c.date}T09:00:00Z`) / 1000;
    const time = c.time ?? Math.min(Number.isFinite(parsed) ? parsed : 1768467600, later - 60);
    later = time;
    const hash = full(c.hash);
    const parents = c.parents ?? (g.commits[i + 1] ? [g.commits[i + 1].hash] : []);
    objects[hash] = { ...c, hash, tree: c.tree ?? head, parents: parents.map(full), time, tz: c.tz ?? 60 };
  });
  const tip = g.commits[0] ? full(g.commits[0].hash) : undefined;
  const refs = tip ? Object.fromEntries([...new Set([...g.branches, g.branch])].map((b) => [b, tip])) : {};
  const remoteRefs = g.remoteRefs ?? (tip ? Object.fromEntries(Object.keys(g.remotes).map((r) => [`${r}/${g.branch}`, tip])) : {});
  return { objects, refs, remoteRefs };
}

/**
 * Fills what a git state may leave out (states written by hand in tests):
 * the repository is the current directory, its `.git/` exists, what was
 * committed is the files present if there are commits, and the index adds the
 * files listed as staged.
 */
function withModel(state: TerminalState, env: TerminalEnv): TerminalState {
  const g = state.git;
  if (!g?.initialized || (g.repoPath && g.head && g.index && g.modes && g.objects && g.refs)) return state;
  const repoPath = g.repoPath ?? state.cwd;
  const files = readTree(state.root, repoPath);
  const head = g.head ?? (g.commits.length ? { ...files } : {});
  const staged = g.stagedFiles.filter((f) => f in files).map((f) => [f, files[f]]);
  const index = g.index ?? { ...head, ...Object.fromEntries(staged) };
  const modes = g.modes ?? Object.fromEntries(Object.keys({ ...head, ...index })
    .map((p) => [p, fileMode(nodeAt(state.root, [...repoPath, ...p.split('/')]), env)]));
  const graph = g.objects && g.refs ? {} : graphFrom(g, head);
  const root = nodeAt(state.root, [...repoPath, '.git']) ? state.root : placeDir(state.root, [...repoPath, '.git'], dotGit(env));
  return { ...state, root, git: synced({ ...g, repoPath, head, index, modes, ...graph }) };
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
function under(tree: Record<string, unknown>, rel: string): string[] {
  return Object.keys(tree).filter((p) => !rel || p === rel || p.startsWith(`${rel}/`));
}

/**
 * Untracked paths as `git status` lists them: a directory whose files are all
 * untracked shows as `dir/`, ignored files are left out, empty directories too.
 */
function untracked(state: TerminalState, repo: Repo, collapse = true): Array<{ path: string; dir: boolean }> {
  const out: Array<{ path: string; dir: boolean }> = [];
  // An unmerged path is tracked even when the index has no version of it (deleted by us).
  const tracked = (p: string) => p in repo.index || !!repo.g.merge?.conflicts[p];
  const visible = (p: string) => !tracked(p) && !ignoredBy(repo.rules, p, false);
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
      if (collapse && files.every((f) => !tracked(f))) out.push({ path: p, dir: true });
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
  // `git commit` with nothing to record prints the same lines.
  trackingLines(g).forEach((t) => say(t));
  if (g.commits.length === 0) { say(''); say(forCommit ? 'Initial commit' : 'No commits yet'); say(''); }

  const conflicts = g.merge?.conflicts ?? {};
  const unmerged = Object.keys(conflicts).sort();
  if (g.merge) {
    if (unmerged.length) {
      say('You have unmerged paths.');
      say('  (fix conflicts and run "git commit")');
      say('  (use "git merge --abort" to abort the merge)');
    } else {
      say('All conflicts fixed but you are still merging.');
      say('  (use "git commit" to conclude merge)');
    }
    say('');
  }
  const staged = changes(repo.head, repo.index).filter((c) => !(c.path in conflicts));
  const notStaged = unstaged(repo).filter((c) => !(c.path in conflicts));
  const newFiles = untrackedMode === 'no' ? [] : untracked(state, repo, untrackedMode !== 'all');
  if (staged.length) {
    say('Changes to be committed:');
    // During a merge git gives no hint here.
    if (!g.merge) say(g.commits.length ? '  (use "git restore --staged <file>..." to unstage)' : '  (use "git rm --cached <file>..." to unstage)');
    staged.forEach((c) => say(`\t${pad(c.kind)}${shown(c.path, repo.cwdInRepo)}`, 'success'));
    say('');
  }
  if (unmerged.length) {
    say('Unmerged paths:');
    say(unmerged.some((p) => conflicts[p].ours === null || conflicts[p].theirs === null)
      ? '  (use "git add/rm <file>..." as appropriate to mark resolution)'
      : '  (use "git add <file>..." to mark resolution)');
    unmerged.forEach((p) => say(`\t${conflictKind(conflicts[p]).label.padEnd(17)}${shown(p, repo.cwdInRepo)}`, 'removed'));
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
  // A merge whose conflicts are all fixed can be committed even when the index equals HEAD: no closing line.
  const committable = staged.length > 0 || (g.merge !== undefined && !unmerged.length);
  if (!committable) {
    if (notStaged.length || unmerged.length) say('no changes added to commit (use "git add" and/or "git commit -a")');
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

// ─── History ─────────────────────────────────────────────────────────────────

/**
 * The commit a revision names, as git reads it: HEAD (or @), a branch, a tag,
 * a remote-tracking branch (`origin/main`) or a unique hash prefix, followed
 * by any number of `~N` (Nth first-parent ancestor) and `^N` (Nth parent).
 */
function resolveRev(g: GitState, spec: string): string | null {
  const m = spec.match(/^(.+?)((?:[~^]\d*)*)$/);
  if (!m) return null;
  const [, name, ops] = m;
  const objects = g.objects ?? {};
  const refs = g.refs ?? {};
  const bare = name.replace(/^refs\/(heads|tags|remotes)\//, '');
  let h: string | undefined;
  if (name === 'HEAD' || name === '@') h = refs[g.branch];
  else if (name === '@{-1}') h = g.previousBranch ? refs[g.previousBranch] : undefined;
  else if (g.tags?.[bare]) h = g.tags[bare];
  else if (refs[bare]) h = refs[bare];
  else if (g.remoteRefs?.[bare.replace(/^remotes\//, '')]) h = g.remoteRefs[bare.replace(/^remotes\//, '')];
  else if (/^[0-9a-f]{4,40}$/.test(name)) {
    const found = Object.keys(objects).filter((k) => k.startsWith(name));
    if (found.length === 1) h = found[0];
  }
  for (const op of ops.match(/[~^]\d*/g) ?? []) {
    if (!h) return null;
    const n = op.length > 1 ? Number(op.slice(1)) : 1;
    if (op[0] === '~') for (let i = 0; i < n && h; i++) h = objects[h]?.parents?.[0];
    else if (n > 0) h = objects[h]?.parents?.[n - 1];
  }
  return h && objects[h] ? h : null;
}

const subject = (c: GitCommit) => c.message.split('\n')[0];

/** ` (HEAD -> main, tag: v1.0, origin/main, feature)`: what a terminal shows next to a commit. */
function decorations(g: GitState, hash: string): string {
  const refs = g.refs ?? {};
  const headHere = refs[g.branch] === hash;
  // Git lists the other names in reverse order of their full ref name.
  const names = [
    ...Object.entries(refs).filter(([b, h]) => h === hash && !(headHere && b === g.branch)).map(([b]) => `refs/heads/${b}`),
    ...Object.entries(g.remoteRefs ?? {}).filter(([, h]) => h === hash).map(([r]) => `refs/remotes/${r}`),
    // origin/HEAD (after a clone or a fetch) sits on the remote's default branch.
    ...Object.entries(g.remoteHead ?? {}).filter(([r, b]) => g.remoteRefs?.[`${r}/${b}`] === hash).map(([r]) => `refs/remotes/${r}/HEAD`),
    ...Object.entries(g.tags ?? {}).filter(([, h]) => h === hash).map(([t]) => `refs/tags/${t}`),
  ].sort().reverse().map((n) => (n.startsWith('refs/tags/') ? `tag: ${n.slice(10)}` : n.replace(/^refs\/(heads|remotes)\//, '')));
  const all = [...(headHere ? [`HEAD -> ${g.branch}`] : []), ...names];
  return all.length ? ` (${all.join(', ')})` : '';
}

/** The header `git log` and `git show` print for a commit. */
function commitHeader(g: GitState, c: GitCommit, decorate = true, abbrev = false): OutputLine[] {
  return [
    { text: `commit ${abbrev ? short(c.hash) : c.hash}${decorate ? decorations(g, c.hash) : ''}`, type: 'success' },
    ...((c.parents?.length ?? 0) > 1 ? [{ text: `Merge: ${c.parents!.map(short).join(' ')}`, type: 'output' as const }] : []),
    { text: `Author: ${ident(c.author)}`, type: 'output' },
    { text: `Date:   ${formatGitDate(c.time ?? 0, c.tz ?? 0)}`, type: 'output' },
    { text: '', type: 'output' },
    ...c.message.split('\n').map((l) => ({ text: `    ${l}`, type: 'output' as const })),
  ];
}

/** The `--stat` block from one tree to another: a line per file, the totals, created and deleted files. */
function statBlock(from: Tree, to: Tree, modes: Record<string, string>, withModes = true, withGraph = true): OutputLine[] {
  const changed = changes(from, to);
  if (!changed.length) return [];
  const counts = changed.map((c) => ({ path: c.path, ...countChanges(from[c.path] ?? '', to[c.path] ?? '') }));
  const total = counts.reduce((t, n) => ({ insertions: t.insertions + n.insertions, deletions: t.deletions + n.deletions }), { insertions: 0, deletions: 0 });
  return [
    ...(withGraph ? statGraph(counts).map((text) => ({ text, type: 'output' as const })) : []),
    { text: statLine(changed.length, total.insertions, total.deletions), type: 'output' },
    ...(withModes ? changed.filter((c) => c.kind !== 'modified').map((c) => ({
      text: ` ${c.kind === 'new file' ? 'create' : 'delete'} mode ${modes[c.path] ?? '100644'} ${c.path}`,
      type: 'output' as const,
    })) : []),
  ];
}

/** A new commit on top of `parents`, with an id computed as git computes it. */
function makeCommit(g: GitState, user: string, tree: Tree, parents: string[], message: string, author?: GitCommit): GitCommit {
  const now = commitTime(g.objects ?? {});
  const time = author?.time ?? now.time;
  const tz = author?.tz ?? now.tz;
  const committed = author ? now.time : undefined;
  const hash = commitId({ tree: treeId(tree, g.modes), parents, author: author?.author ?? user, time, tz, committed, message });
  return { hash, message, author: author?.author ?? user, date: today(), tree, parents, time, tz, ...(committed === undefined ? {} : { committed }) };
}

/** `g` with `commit` stored and the current branch moved to it. */
function advance(g: GitState, commit: GitCommit): GitState {
  return { ...g, objects: { ...g.objects, [commit.hash]: commit }, refs: { ...g.refs, [g.branch]: commit.hash } };
}

type Conflict = { base: string | null; ours: string | null; theirs: string | null };

interface ThreeWay {
  /** What the index holds after the merge: the merged files, and our side of each conflict. */
  tree: Tree;
  /** What the working tree holds where it differs from `tree`: files with conflict markers. */
  work: Record<string, string | null>;
  conflicts: Record<string, Conflict>;
  lines: OutputLine[];
}

/**
 * Git's default merge of two commits from their common ancestor: a change made
 * on one side only is taken; a file changed on both sides is merged line by
 * line (`Auto-merging`), and what cannot be merged is a conflict.
 */
function threeWay(base: Tree, ours: Tree, theirs: Tree, theirsLabel: string): ThreeWay {
  const out: ThreeWay = { tree: {}, work: {}, conflicts: {}, lines: [] };
  const paths = [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort();
  for (const p of paths) {
    const b = base[p];
    const o = ours[p];
    const t = theirs[p];
    const take = (v: string | undefined) => { if (v !== undefined) out.tree[p] = v; };
    if (o === t || b === t) { take(o); continue; }
    if (b === o) { take(t); continue; }
    if (o !== undefined && t !== undefined) {
      const merged = mergeText(b ?? '', o, t, 'HEAD', theirsLabel);
      out.lines.push({ text: `Auto-merging ${p}`, type: 'output' });
      if (!merged.conflict) { take(merged.content); continue; }
      out.lines.push({ text: `CONFLICT (${b === undefined ? 'add/add' : 'content'}): Merge conflict in ${p}`, type: 'removed' });
      out.work[p] = merged.content;
    } else {
      const [gone, kept] = o === undefined ? ['HEAD', theirsLabel] : [theirsLabel, 'HEAD'];
      out.lines.push({ text: `CONFLICT (modify/delete): ${p} deleted in ${gone} and modified in ${kept}.  Version ${kept} of ${p} left in tree.`, type: 'removed' });
      out.work[p] = o ?? t ?? null;
    }
    take(o);
    out.conflicts[p] = { base: b ?? null, ours: o ?? null, theirs: t ?? null };
  }
  return out;
}

/** Whether git accepts `name` for a branch or a tag (`git check-ref-format`). */
function validRefName(name: string): boolean {
  if (!name || name === 'HEAD' || name === '@' || name.startsWith('-') || name.startsWith('/') || name.endsWith('/') || name.endsWith('.')) return false;
  // Spaces, control characters and the characters revisions use (~ ^ : ? * [ \) are refused.
  if (/[\s~^:?*[\\\x00-\x1f\x7f]|\.\.|@\{|\/\//.test(name)) return false;
  return name.split('/').every((part) => !part.startsWith('.') && !part.endsWith('.lock'));
}

/** Git refuses `feature` next to `feature/login` (and the reverse): one would be a file, the other a folder. */
function refClash(name: string, existing: string[], kind: 'heads' | 'tags'): string | null {
  const other = existing.find((e) => e !== name && (e.startsWith(`${name}/`) || name.startsWith(`${e}/`)));
  return other ? `fatal: cannot lock ref 'refs/${kind}/${name}': 'refs/${kind}/${other}' exists; cannot create 'refs/${kind}/${name}'` : null;
}

/** A message as git's default clean-up leaves it: no `#` lines, no blank lines at the end. */
function stripComments(message: string): string {
  return message.split('\n').filter((l) => !l.startsWith('#')).join('\n').replace(/\s+$/, '');
}

/**
 * An option the simulator does not handle. When git's usage lists it, git knows it:
 * it is only not simulated (the info line, exit 1). Otherwise git itself refuses it with
 * `error: unknown option ...` and the command's usage (exit 129).
 */
function unknownOption(o: Options, shortOk: string, longOk: string[], usage: string[]): { lines: OutputLine[]; status: number } | null {
  const bad = [...o.short, ...o.values.keys()].find((c) => !shortOk.includes(c));
  const badLong = [...o.long.keys()].find((k) => !longOk.includes(k));
  if (bad === undefined && badLong === undefined) return null;
  const text = usage.join('\n');
  const listed = bad !== undefined
    ? new RegExp(`(^|[\\s[(|])-${bad.replace(/[^\w]/g, '\\$&')}[\\s,[\\]<|)]`, 'm').test(text)
    : [badLong!, badLong!.replace(/^no-/, '')].some((name) => {
      const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`--(\\[no-\\])?${n}([\\s=[\\]<|)]|$)`, 'm').test(text);
    });
  if (listed) {
    const command = usage[0].split(' ')[2];
    const option = bad !== undefined ? `-${bad}` : `--${badLong}`;
    return { lines: [{ text: `L'option ${option} de git ${command} n'est pas simulée dans ce terminal d'entraînement.`, type: 'info' }], status: 1 };
  }
  const first = bad !== undefined ? `error: unknown switch \`${bad}'` : `error: unknown option \`${badLong}'`;
  return { lines: [first, ...usage].map((line) => ({ text: line, type: 'error' as const })), status: 129 };
}

/** The merge state once `paths` are staged (`git add`, `git rm`): their conflicts are resolved. */
function resolving(g: GitState, paths: Set<string>): GitState['merge'] {
  if (!g.merge) return undefined;
  return { ...g.merge, conflicts: Object.fromEntries(Object.entries(g.merge.conflicts).filter(([p]) => !paths.has(p))) };
}

/** How `git status` names a conflict, and its two letters in `git status -s`. */
function conflictKind(c: Conflict): { label: string; code: string } {
  if (c.ours === null) return { label: 'deleted by us:', code: 'DU' };
  if (c.theirs === null) return { label: 'deleted by them:', code: 'UD' };
  return c.base === null ? { label: 'both added:', code: 'AA' } : { label: 'both modified:', code: 'UU' };
}

/** POSIX classes git's wildmatch accepts inside brackets (`[[:digit:]]`). */
const POSIX_CLASSES: Record<string, string> = {
  alpha: 'a-zA-Z', digit: '0-9', alnum: 'a-zA-Z0-9', upper: 'A-Z', lower: 'a-z', space: '\\s', xdigit: '0-9a-fA-F', punct: '!-\\/:-@\\[-`{-~',
};

/**
 * The glob of `git tag -l` and `git branch --list` (wildmatch): `*`, `?`, `[a-z]`, `[!x]` or `[^x]`,
 * `[[:digit:]]`, `\` escapes. A class git cannot use (a reversed range) matches nothing.
 */
function globMatch(pattern: string, name: string): boolean {
  const quote = (c: string) => c.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '\\' && i + 1 < pattern.length) re += quote(pattern[++i]);
    else if (c === '[') {
      // The class ends at the first `]` that is not its first character nor part of `[:name:]`.
      let j = i + 1;
      if (pattern[j] === '!' || pattern[j] === '^') j++;
      if (pattern[j] === ']') j++;
      while (j < pattern.length && pattern[j] !== ']') {
        const posix = pattern.slice(j).match(/^\[:([a-z]+):\]/);
        j += posix ? posix[0].length : 1;
      }
      if (j >= pattern.length) { re += quote(c); continue; }
      let body = pattern.slice(i + 1, j);
      const negate = body[0] === '!' || body[0] === '^';
      if (negate) body = body.slice(1);
      let cls = '';
      for (let k = 0; k < body.length; k++) {
        const posix = body.slice(k).match(/^\[:([a-z]+):\]/);
        if (posix) {
          if (!(posix[1] in POSIX_CLASSES)) return false;
          cls += POSIX_CLASSES[posix[1]];
          k += posix[0].length - 1;
        } else if (body[k + 1] === '-' && k + 2 < body.length) {
          if (body[k] > body[k + 2]) return false;
          cls += `${quote(body[k])}-${quote(body[k + 2])}`;
          k += 2;
        } else cls += quote(body[k]);
      }
      re += `[${negate ? '^' : ''}${cls}]`;
      i = j;
    } else re += quote(c);
  }
  return new RegExp(`^${re}$`).test(name);
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

/** The `git log` options the simulator knows; any other is reported as not simulated. */
const LOG_OPTIONS = ['oneline', 'all', 'graph', 'decorate', 'no-decorate', 'stat', 'patch', 'author', 'grep', 'max-count', 'pretty', 'no-merges', 'reverse', 'abbrev-commit', 'no-abbrev-commit'];

/** Git 2.56's usage of `git cherry-pick`, printed when no commit is given. */
const CHERRY_PICK_USAGE = [
  'usage: git cherry-pick [--edit] [-n] [-m <parent-number>] [-s] [-x] [--ff]',
  '                       [-S[<keyid>]] <commit>...',
  '   or: git cherry-pick (--continue | --skip | --abort | --quit)',
  '',
  '    --quit                end revert or cherry-pick sequence',
  '    --continue            resume revert or cherry-pick sequence',
  '    --abort               cancel revert or cherry-pick sequence',
  '    --skip                skip current commit and continue',
  '    --[no-]cleanup <mode> how to strip spaces and #comments from message',
  "    -n, --no-commit       don't automatically commit",
  '    --commit              opposite of --no-commit',
  '    -e, --[no-]edit       edit the commit message',
  '    -s, --[no-]signoff    add a Signed-off-by trailer',
  '    -m, --[no-]mainline <parent-number>',
  '                          select mainline parent',
  '    --[no-]rerere-autoupdate',
  '                          update the index with reused conflict resolution if possible',
  '    --[no-]strategy <strategy>',
  '                          merge strategy',
  '    -X, --[no-]strategy-option <option>',
  '                          option for merge strategy',
  '    -S, --[no-]gpg-sign[=<key-id>]',
  '                          GPG sign commit',
  '    -x                    append commit name',
  '    --[no-]ff             allow fast-forward',
  '    --[no-]allow-empty    preserve initially empty commits',
  '    --[no-]allow-empty-message',
  '                          allow commits with empty messages',
  '    --[no-]keep-redundant-commits',
  '                          deprecated: use --empty=keep instead',
  '    --empty (stop|drop|keep)',
  '                          how to handle commits that become empty',
  '',
];

/** `git merge --ff-only` on branches that diverged. */
const DIVERGING = [
  "hint: Diverging branches can't be fast-forwarded, you need to either:",
  'hint:',
  'hint: \tgit merge --no-ff',
  'hint:',
  'hint: or:',
  'hint:',
  'hint: \tgit rebase',
  'hint:',
  'hint: Disable this message with "git config set advice.diverging false"',
  'fatal: Not possible to fast-forward, aborting.',
];

/** `git rebase` with no upstream on a branch that tracks none. */
const NO_TRACKING = (branch: string) => [
  'There is no tracking information for the current branch.',
  'Please specify which branch you want to rebase against.',
  'See git-rebase(1) for details.',
  '',
  "    git rebase '<branch>'",
  '',
  'If you wish to set tracking information for this branch you can do so with:',
  '',
  `    git branch --set-upstream-to=<remote>/<branch> ${branch}`,
  '',
];

// ── Remotes ──────────────────────────────────────────────────────────────────
// Every text below is git 2.56's, read from a real repository pushing to a
// local bare one. Without a terminal git prints no progress ("Enumerating
// objects…"), whose counts and byte rates cannot be reproduced honestly: the
// simulator prints what non-interactive git prints.

/** `git pull` on a branch that tracks nothing. With no remote at all, git names none. */
const PULL_NO_TRACKING = (branch: string, remote: string | null, rebase = false) => [
  'There is no tracking information for the current branch.',
  `Please specify which branch you want to ${rebase ? 'rebase against' : 'merge with'}.`,
  'See git-pull(1) for details.',
  '',
  '    git pull <remote> <branch>',
  '',
  'If you wish to set tracking information for this branch you can do so with:',
  '',
  `    git branch --set-upstream-to=${remote ?? '<remote>'}/<branch> ${branch}`,
  '',
];

const PUSH_NO_DESTINATION = [
  'fatal: No configured push destination.',
  'Either specify the URL from the command-line or configure a remote repository using',
  '',
  '    git remote add <name> <url>',
  '',
  'and then push using the remote name',
  '',
  '    git push <name>',
  '',
  'To push to multiple remotes at once, configure a remote group using',
  '',
  '    git config remotes.<groupname> "<remote1> <remote2>"',
  '',
  'and then push using the group name',
  '',
  '    git push <groupname>',
];

const PUSH_NO_UPSTREAM = (branch: string, remote: string) => [
  `fatal: The current branch ${branch} has no upstream branch.`,
  'To push the current branch and set the remote as upstream, use',
  '',
  `    git push --set-upstream ${remote} ${branch}`,
  '',
  'To have this happen automatically for branches without a tracking',
  "upstream, see 'push.autoSetupRemote' in 'git help config'.",
  '',
];

const NOT_A_REMOTE = (name: string) => [
  `fatal: '${name}' does not appear to be a git repository`,
  'fatal: Could not read from remote repository.',
  '',
  'Please make sure you have the correct access rights',
  'and the repository exists.',
];

const PUSH_REJECTED_HINTS = [
  'hint: Updates were rejected because the tip of your current branch is behind',
  'hint: its remote counterpart. If you want to integrate the remote changes,',
  "hint: use 'git pull' before pushing again.",
  "hint: See the 'Note about fast-forwards' in 'git push --help' for details.",
];

/** The rejected branch is not the one checked out (`git push origin main` from another branch). */
const PUSH_REJECTED_OTHER_HINTS = [
  'hint: Updates were rejected because a pushed branch tip is behind its remote',
  "hint: counterpart. If you want to integrate the remote changes, use 'git pull'",
  'hint: before pushing again.',
  "hint: See the 'Note about fast-forwards' in 'git push --help' for details.",
];

/** `git push` on a branch whose upstream has another name (`git switch -c work origin/main`). */
const PUSH_NAME_MISMATCH = (remote: string, upstreamBranch: string) => [
  'fatal: The upstream branch of your current branch does not match',
  'the name of your current branch.  To push to the upstream branch',
  'on the remote, use',
  '',
  `    git push ${remote} HEAD:${upstreamBranch}`,
  '',
  'To push to the branch of the same name on the remote, use',
  '',
  `    git push ${remote} HEAD`,
  '',
  "To choose either option permanently, see push.default in 'git help config'.",
  '',
  'To avoid automatically configuring an upstream branch when its name',
  "won't match the local branch, see option 'simple' of branch.autoSetupMerge",
  "in 'git help config'.",
  '',
];

/** `git pull --ff-only` when both sides have commits (git 2.56, 1 October 2026). */
const PULL_FF_ONLY_DIVERGENT = [
  "hint: Diverging branches can't be fast-forwarded, you need to either:",
  'hint:',
  'hint: \tgit merge --no-ff',
  'hint:',
  'hint: or:',
  'hint:',
  'hint: \tgit rebase',
  'hint:',
  'hint: Disable this message with "git config set advice.diverging false"',
  'fatal: Not possible to fast-forward, aborting.',
];

const PULL_NOT_DEFAULT_REMOTE = (remote: string) => [
  `You asked to pull from the remote '${remote}', but did not specify`,
  'a branch. Because this is not the default configured remote',
  'for your current branch, you must specify a branch on the command line.',
];

const PULL_DIVERGENT = [
  'hint: You have divergent branches and need to specify how to reconcile them.',
  'hint: You can do so by running one of the following commands sometime before',
  'hint: your next pull:',
  'hint:',
  'hint:   git config pull.rebase false  # merge',
  'hint:   git config pull.rebase true   # rebase',
  'hint:   git config pull.ff only       # fast-forward only',
  'hint:',
  'hint: You can replace "git config" with "git config --global" to set a default',
  'hint: preference for all repositories. You can also pass --rebase, --no-rebase,',
  'hint: or --ff-only on the command line to override the configured default per',
  'hint: invocation.',
  'fatal: Need to specify how to reconcile divergent branches.',
];

const UPSTREAM_MISSING = (ref: string) => [
  `fatal: the requested upstream branch '${ref}' does not exist`,
  'hint:',
  'hint: If you are planning on basing your work on an upstream',
  'hint: branch that already exists at the remote, you may need to',
  'hint: run "git fetch" to retrieve it.',
  'hint:',
  'hint: If you are planning to push out a new local branch that',
  'hint: will track its remote counterpart, you may want to use',
  'hint: "git push -u" to set the upstream config as you push.',
  'hint: Disable this message with "git config set advice.setUpstreamFailure false"',
];

/** The remote git uses when none is named: `origin`, or the only one there is. */
function defaultRemote(g: GitState): string | null {
  const names = Object.keys(g.remotes);
  return names.includes('origin') ? 'origin' : names.length === 1 ? names[0] : null;
}

/** Commits on `ours` that `theirs` lacks, and the reverse. */
function aheadBehind(g: GitState, ours: string, theirs: string): { ahead: number; behind: number } {
  const objects = g.objects ?? {};
  const a = ancestors(objects, ours);
  const b = ancestors(objects, theirs);
  return { ahead: [...a].filter((h) => !b.has(h)).length, behind: [...b].filter((h) => !a.has(h)).length };
}

const commits = (n: number) => `${n} commit${n === 1 ? '' : 's'}`;

/** What `git status` says under "On branch" about the branch's upstream, blank line included. */
function trackingLines(g: GitState): string[] {
  const up = g.upstream?.[g.branch];
  const tip = g.refs?.[g.branch];
  if (!up || !tip) return [];
  const theirs = g.remoteRefs?.[up];
  if (!theirs) return [`Your branch is based on '${up}', but the upstream is gone.`, '  (use "git branch --unset-upstream" to fixup)', ''];
  const { ahead, behind } = aheadBehind(g, tip, theirs);
  if (!ahead && !behind) return [`Your branch is up to date with '${up}'.`, ''];
  if (!behind) return [`Your branch is ahead of '${up}' by ${commits(ahead)}.`, '  (use "git push" to publish your local commits)', ''];
  if (!ahead) return [`Your branch is behind '${up}' by ${commits(behind)}, and can be fast-forwarded.`, '  (use "git pull" to update your local branch)', ''];
  return [
    `Your branch and '${up}' have diverged,`,
    `and have ${ahead} and ${behind} different commits each, respectively.`,
    '  (use "git pull" if you want to integrate the remote branch with yours)',
    '',
  ];
}

/** `[origin/main: ahead 1]` after `git branch -vv`; `-v` alone drops the name and says nothing when even. */
function trackingTag(g: GitState, branch: string, withName: boolean): string {
  const up = g.upstream?.[branch];
  const tip = g.refs?.[branch];
  if (!up || !tip) return '';
  const theirs = g.remoteRefs?.[up];
  const parts: string[] = [];
  if (!theirs) parts.push('gone');
  else {
    const { ahead, behind } = aheadBehind(g, tip, theirs);
    if (ahead) parts.push(`ahead ${ahead}`);
    if (behind) parts.push(`behind ${behind}`);
  }
  if (withName) return ` [${up}${parts.length ? `: ${parts.join(', ')}` : ''}]`;
  return parts.length ? ` [${parts.join(', ')}]` : '';
}

/** One line of push's report: flag, summary padded to 17, then `from -> to`. */
const pushLine = (flag: string, summary: string, from: string, to: string, note = '') =>
  ` ${flag} ${summary.padEnd(17)} ${from} -> ${to}${note}`;

/** One line of fetch's report: like push's, the remote branch padded to 10. */
const fetchLine = (flag: string, summary: string, from: string, to: string, note = '') =>
  pushLine(flag, summary, from.padEnd(10), to, note);

const PUSH_FETCH_FIRST_HINTS = [
  'hint: Updates were rejected because the remote contains work that you do not',
  'hint: have locally. This is usually caused by another repository pushing to',
  'hint: the same ref. If you want to integrate the remote changes, use',
  "hint: 'git pull' before pushing again.",
  "hint: See the 'Note about fast-forwards' in 'git push --help' for details.",
];

/**
 * GitHub answers the first push of a branch with a link to open a pull
 * request (any branch but the default one).
 */
function githubPullRequestHint(url: string, branch: string): string[] {
  const m = url.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/);
  if (!m) return [];
  return [
    'remote: ',
    `remote: Create a pull request for '${branch}' on GitHub by visiting:`,
    `remote:      https://github.com/${m[1]}/pull/new/${branch}`,
    'remote: ',
  ];
}


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

  /** The commit a revision names (see `resolveRev`), or null. */
  const rev = (ref: string) => resolveRev(newState.git!, ref);
  /** The files of the commit `ref` names, or null. */
  const commitTree = (ref: string): Tree | null => {
    const h = rev(ref);
    return h ? newState.git!.objects![h].tree ?? {} : null;
  };
  const commitOf = (hash: string) => newState.git!.objects![hash];
  const err = (t: string): OutputLine => ({ text: t, type: 'error' });
  const fail = (status: number, ...texts: string[]): CommandOutput => ({ lines: texts.map(err), newState, status });

  /**
   * Moves the index and working tree from HEAD's files to `target`'s, as a
   * branch switch or a fast-forward does: files that differ between the two
   * commits take the target's version, local changes to the others stay.
   * `local` and `inTheWay` list what prevents the move.
   */
  const moveTo = (repo: Repo, target: Tree) => {
    const index = { ...repo.index };
    let root = newState.root;
    const local: string[] = [];
    const inTheWay: string[] = [];
    for (const p of [...new Set([...Object.keys(repo.head), ...Object.keys(target)])].sort()) {
      if (repo.head[p] === target[p]) continue;
      const tracked = p in repo.index || p in repo.head;
      if (!tracked && p in repo.work && repo.work[p] !== target[p] && !ignoredBy(repo.rules, p, false)) { inTheWay.push(p); continue; }
      const changed = tracked && (repo.index[p] !== repo.head[p] || (p in repo.index && repo.work[p] !== repo.index[p]));
      if (changed && !(repo.index[p] === target[p] && repo.work[p] === target[p])) { local.push(p); continue; }
      if (p in target) index[p] = target[p];
      else delete index[p];
      root = writeFile(root, [...repo.path, ...p.split('/')], target[p] ?? null);
    }
    return { root, index, local, inTheWay };
  };

  /** Git's refusal to lose local changes or untracked files (`op` is `checkout` or `merge`). */
  const blockedBy = (m: { local: string[]; inTheWay: string[] }, op: 'checkout' | 'merge'): OutputLine[] => {
    const lines: OutputLine[] = [];
    if (m.local.length) {
      lines.push(err(`error: Your local changes to the following files would be overwritten by ${op}:`), ...m.local.map((p) => err(`\t${p}`)),
        err(`Please commit your changes or stash them before you ${op === 'checkout' ? 'switch branches' : 'merge'}.`));
    }
    if (m.inTheWay.length) {
      lines.push(err(`error: The following untracked working tree files would be overwritten by ${op}:`), ...m.inTheWay.map((p) => err(`\t${p}`)),
        err(`Please move or remove them before you ${op === 'checkout' ? 'switch branches' : 'merge'}.`));
    }
    if (lines.length) lines.push(err('Aborting'));
    return lines;
  };

  /** `M\tREADME.md`: the local changes a switch carries over, as git lists them. */
  const localChanges = (): OutputLine[] => {
    const repo = openRepo(newState);
    const out: OutputLine[] = [];
    for (const p of [...new Set([...Object.keys(repo.head), ...Object.keys(repo.index)])].sort()) {
      const letter = !(p in repo.head) ? 'A'
        : !(p in repo.work) ? 'D'
          : repo.work[p] !== repo.head[p] || repo.index[p] !== repo.head[p] ? 'M' : '';
      if (letter) out.push({ text: `${letter}\t${p}`, type: 'output' });
    }
    return out;
  };

  /** `git checkout <branch>` in the middle of a conflict. */
  const needsMerge = (): CommandOutput => fail(1, 'error: you need to resolve your current index first',
    ...Object.keys(newState.git!.merge?.conflicts ?? {}).sort().map((p) => `${p}: needs merge`));

  /** The remote-tracking branch `name` can be created from (`origin/name`), when exactly one exists. */
  const remoteFor = (name: string): string | null => {
    const found = Object.keys(newState.git!.remoteRefs ?? {}).filter((r) => r.slice(r.indexOf('/') + 1) === name);
    return found.length === 1 ? found[0] : null;
  };

  /**
   * Moves HEAD to `branch`, created at `start` (HEAD by default) when
   * `create`: the files follow, local changes are carried over or block it.
   */
  const switchTo = (branch: string, verb: 'switch' | 'checkout', create = false, start?: string, how: { quiet?: boolean; reset?: boolean } = {}): CommandOutput => {
    const out = switchBranch(branch, verb, create, start, how.reset);
    if (out.status) return out;
    return how.quiet ? { ...out, lines: [] } : out;
  };

  /** `-c` / `-b` with a name git refuses. */
  const badBranchName = (name: string): CommandOutput | null => {
    if (!validRefName(name)) {
      return fail(128, `fatal: '${name}' is not a valid branch name`, "hint: See 'git help check-ref-format'", 'hint: Disable this message with "git config set advice.refSyntax false"');
    }
    const clash = refClash(name, Object.keys(newState.git!.refs ?? {}), 'heads');
    return clash ? fail(128, clash) : null;
  };

  const switchBranch = (branch: string, verb: 'switch' | 'checkout', create: boolean, start: string | undefined, reset?: boolean): CommandOutput => {
    const g = newState.git!;
    const tip = g.refs![g.branch];
    let target = create ? tip : g.refs![branch];
    if (create && start !== undefined) {
      const h = rev(start);
      if (!h) {
        return fail(128, verb === 'switch' ? `fatal: invalid reference: ${start}` : `fatal: '${start}' is not a commit and a branch '${branch}' cannot be created from it`);
      }
      target = h;
    }
    const refs = create && target ? { ...g.refs!, [branch]: target } : g.refs!;
    // A branch started from a remote-tracking branch tracks it (branch.autoSetupMerge).
    const tracks = create && start !== undefined && g.remoteRefs?.[start] ? start : undefined;
    const upstream = tracks ? { ...g.upstream, [branch]: tracks } : g.upstream;
    if (target !== tip) {
      const m = moveTo(openRepo(newState), target ? commitOf(target).tree ?? {} : {});
      const blocked = blockedBy(m, 'checkout');
      if (blocked.length) return { lines: blocked, newState, status: 1 };
      setGit({ ...g, refs, branch, upstream, index: m.index, previousBranch: g.branch, merge: undefined }, m.root);
    } else setGit({ ...g, refs, branch, upstream, previousBranch: g.branch, merge: undefined });
    // A new branch where HEAD already is changes no file: git lists nothing then.
    const carried = create && start === undefined ? [] : localChanges();
    const said = reset
      ? (branch === g.branch ? `Reset branch '${branch}'` : `Switched to and reset branch '${branch}'`)
      : create ? `Switched to a new branch '${branch}'` : `Switched to branch '${branch}'`;
    const after = tracks ? [`branch '${branch}' set up to track '${tracks}'.`] : create ? [] : branchTracking();
    return { lines: [...carried, { text: said, type: 'success' }, ...after.map((text) => ({ text, type: 'output' as const }))], newState };
  };

  /** What switching to a branch says about its upstream: status's lines, without the blank one. */
  const branchTracking = () => trackingLines(newState.git!).filter(Boolean);

  /** `git switch feature` when only `origin/feature` exists: a local branch that tracks it. */
  const track = (branch: string, remote: string, verb: 'switch' | 'checkout', quiet = false): CommandOutput => {
    const out = switchTo(branch, verb, true, remote, { quiet });
    if (out.status || quiet) return out;
    // Here git says it first: the tracking line comes before "Switched to a new branch".
    const lines = [...out.lines];
    const said = lines.splice(lines.length - 2, 1);
    return { ...out, lines: [...lines, ...said] };
  };
  /** A fetch that names no branch records the remote's default branch as `origin/HEAD` (git 2.48+). */
  const recordRemoteHead = (remote: string) => {
    const g = newState.git!;
    if (g.remoteHead?.[remote] || !g.remoteRefs?.[`${remote}/main`]) return;
    setGit({ ...g, remoteHead: { ...g.remoteHead, [remote]: 'main' } });
  };

  /** The branches the remote itself holds, by name (`main`, not `origin/main`). */
  const serverBranches = (remote: string): Record<string, string> => Object.fromEntries(
    Object.entries(newState.git!.remoteServer ?? newState.git!.remoteRefs ?? {})
      .filter(([ref]) => ref.startsWith(`${remote}/`))
      .map(([ref, hash]) => [ref.slice(remote.length + 1), hash]),
  );

  /**
   * Brings `remote`'s branches (only `branch` when one is named) into the
   * remote-tracking branches, and returns git's report: one line per change,
   * alphabetical, except that the fetch recording origin/HEAD lists the default
   * branch first; `prune` drops what the remote deleted (git 2.56, 1 October 2026).
   */
  const fetchFrom = (remote: string, opts: { branch?: string; prune?: boolean } = {}): string[] => {
    const g = newState.git!;
    const server = serverBranches(remote);
    const remoteRefs = { ...g.remoteRefs };
    const lines: string[] = [];
    if (opts.prune) {
      for (const ref of Object.keys(remoteRefs).filter((r) => r.startsWith(`${remote}/`)).sort()) {
        if (server[ref.slice(remote.length + 1)]) continue;
        lines.push(fetchLine('-', '[deleted]', '(none)', ref));
        delete remoteRefs[ref];
      }
    }
    const names = opts.branch ? [opts.branch] : Object.keys(server).sort();
    const headFirst = !opts.branch && !g.remoteHead?.[remote] && names.includes('main');
    for (const name of headFirst ? ['main', ...names.filter((n) => n !== 'main')] : names) {
      const ref = `${remote}/${name}`;
      const [ours, theirs] = [remoteRefs[ref], server[name]];
      if (!theirs || ours === theirs) continue;
      if (!ours) lines.push(fetchLine('*', '[new branch]', name, ref));
      else if (isAncestor(g.objects ?? {}, ours, theirs)) lines.push(fetchLine(' ', `${short(ours)}..${short(theirs)}`, name, ref));
      else lines.push(fetchLine('+', `${short(ours)}...${short(theirs)}`, name, ref, '  (forced update)'));
      remoteRefs[ref] = theirs;
    }
    setGit({ ...g, remoteRefs });
    if (!opts.branch) recordRemoteHead(remote);
    return lines;
  };

  /** `From <url>` heads a fetch report that has something to say. */
  const fromLine = (remote: string) => `From ${newState.git!.remotes[remote].replace(/\.git$/, '')}`;

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
        objects: {},
        refs: {},
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
      const conflicts = g.merge?.conflicts ?? {};
      const x = new Map(changes(repo.head, repo.index).map((c) => [c.path, letter[c.kind] as string]));
      const y = new Map(unstaged(repo).map((c) => [c.path, letter[c.kind] as string]));
      for (const [p, c] of Object.entries(conflicts)) {
        const code = conflictKind(c).code;
        x.set(p, code[0]);
        y.set(p, code[1]);
      }
      const lines: OutputLine[] = [];
      if (o.short.has('b') || o.long.has('branch')) {
        // `## main...origin/main [ahead 1]`: the upstream and how far apart, when there is one.
        const up = g.upstream?.[g.branch];
        const head = g.commits.length ? `${g.branch}${up ? `...${up}${trackingTag(g, g.branch, false)}` : ''}` : `No commits yet on ${g.branch}`;
        lines.push({ text: `## ${head}`, type: 'output' });
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
      const staged = new Set<string>();
      for (const t of targets) {
        const rel = t.rel!;
        const isFile = rel in repo.work;
        if (isFile && !force && !(rel in index) && ignoredBy(repo.rules, rel, false)) { refused.push(t.arg); continue; }
        if (!isFile && rel && !force && ignoredBy(repo.rules, rel, true)) { refused.push(t.arg); continue; }
        for (const p of new Set([...under(repo.work, rel), ...under(index, rel)])) {
          if (update && !(p in index)) continue;
          staged.add(p);
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
      if (!dryRun) setGit({ ...repo.g, index, modes, merge: resolving(repo.g, staged) });
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
        const found = rel === null ? [] : under({ ...repo.index, ...repo.g.merge?.conflicts }, rel);
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
          // An unmerged path is removed as it is: that resolves the conflict.
          if (repo.g.merge?.conflicts[p]) continue;
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
      setGit({ ...repo.g, index, merge: resolving(repo.g, new Set(paths)) }, root);
      return { lines: quiet ? [] : paths.map((p) => ({ text: `rm '${p}'`, type: 'output' as const })), newState };
    }

    // ── git restore ───────────────────────────────────────────────────────────
    case 'restore': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1), 's', '', ['source']);
      // -p (interactive), --ours/--theirs, --merge...: git does them, the simulator does not.
      const other = [...o.short].find((c) => !'SWq'.includes(c)) ?? [...o.long.keys()].find((k) => !['staged', 'worktree', 'source', 'quiet'].includes(k));
      if (other) return notSimulated(`L'option ${other.length === 1 ? '-' : '--'}${other} de git restore`, newState);
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
      const conflicts = repo.g.merge?.conflicts ?? {};
      // --staged takes a conflicted path out of the conflict, as git add would.
      const touched = new Set<string>();
      for (const arg of specs) {
        const rel = repoRel(arg);
        const paths = rel === null ? [] : [...new Set([...under(source ?? repo.head, rel), ...under(repo.index, rel), ...under(conflicts, rel)])];
        if (!paths.length) {
          return { lines: [{ text: `error: pathspec '${arg}' did not match any file(s) known to git`, type: 'error' }], newState, status: 1 };
        }
        // The working tree cannot take "the index" version of a file that has three of them.
        const unmerged = worktree && !staged ? paths.filter((p) => p in conflicts) : [];
        if (unmerged.length) {
          if (source) return notSimulated('git restore --source sur un fichier en conflit', newState);
          return { lines: unmerged.map((p) => ({ text: `error: path '${p}' is unmerged`, type: 'error' as const })), newState, status: 1 };
        }
        paths.forEach((p) => touched.add(p));
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
      setGit({ ...repo.g, index, merge: staged ? resolving(repo.g, touched) : repo.g.merge }, root);
      return { lines: [], newState };
    }

    // ── git commit ────────────────────────────────────────────────────────────
    case 'commit': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1), 'm');
      if (o.missing === 'm') return { lines: [{ text: "error: switch `m' requires a value", type: 'error' }], newState, status: 129 };
      if (args[args.length - 1] === '--message') return fail(129, "error: option `message' requires a value");
      if (o.long.has('amend')) return notSimulated('git commit --amend', newState);
      const quiet = o.short.has('q') || o.long.has('quiet');
      const allowEmpty = o.long.has('allow-empty');
      let message = commitMessage(args);
      let repo = openRepo(newState);
      if (o.short.has('a') || o.long.has('all')) {
        // -a stages every tracked file, conflict markers included: that resolves the conflicts.
        const index = { ...repo.index };
        for (const p of new Set([...Object.keys(index), ...Object.keys(repo.g.merge?.conflicts ?? {})])) {
          if (p in repo.work) index[p] = repo.work[p];
          else delete index[p];
        }
        setGit({ ...repo.g, index, merge: repo.g.merge && { ...repo.g.merge, conflicts: {} } });
        repo = openRepo(newState);
      }
      const merging = repo.g.merge;
      const unmerged = Object.keys(merging?.conflicts ?? {}).sort();
      if (unmerged.length) {
        return {
          lines: [
            ...unmerged.map((p) => ({ text: `U\t${p}`, type: 'output' as const })),
            { text: 'error: Committing is not possible because you have unmerged files.', type: 'error' },
            { text: "hint: Fix them up in the work tree, and then use 'git add/rm <file>'", type: 'error' },
            { text: 'hint: as appropriate to mark resolution and make a commit.', type: 'error' },
            { text: 'fatal: Exiting because of an unresolved conflict.', type: 'error' },
          ],
          newState,
          status: 128,
        };
      }
      const recorded = changes(repo.head, repo.index);
      if (!recorded.length && !allowEmpty && !merging) {
        // Git prints the status and fails (exit 1) when nothing is staged.
        return { lines: statusLines(newState, repo, true), newState, status: 1 };
      }
      const said: OutputLine[] = [];
      if (message === null && merging) {
        // Git opens an editor on the message it proposes; closing it keeps that message
        // without its `#` lines. --no-edit skips the editor and its clean-up: they stay.
        message = o.long.has('no-edit') ? merging.message : stripComments(merging.message);
        if (!o.long.has('no-edit')) said.push({ text: `Sans -m, git ouvre un éditeur sur le message proposé (non simulé ici) : ce terminal le garde tel quel, « ${message} ».`, type: 'info' });
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
      const tip = g.refs?.[g.branch];
      const tree = { ...repo.index };
      const commit = makeCommit(g, newState.user, tree, [...(tip ? [tip] : []), ...(merging ? [merging.head] : [])], message);
      if (merging) {
        // Concluding a merge: git prints the new commit and nothing else.
        setGit({ ...advance(g, commit), merge: undefined });
        return { lines: quiet ? [] : [...said, { text: `[${g.branch} ${short(commit.hash)}] ${subject(commit)}`, type: 'success' }], newState };
      }
      let insertions = 0;
      let deletions = 0;
      for (const c of recorded) {
        const n = countChanges(repo.head[c.path] ?? '', repo.index[c.path] ?? '');
        insertions += n.insertions;
        deletions += n.deletions;
      }
      const lines: OutputLine[] = [
        { text: `[${g.branch}${tip ? '' : ' (root-commit)'} ${short(commit.hash)}] ${subject(commit)}`, type: 'success' },
      ];
      if (recorded.length) lines.push({ text: statLine(recorded.length, insertions, deletions), type: 'output' });
      for (const c of recorded) {
        if (c.kind === 'modified') continue;
        const mode = g.modes?.[c.path] ?? fileMode(nodeAt(newState.root, [...repo.path, ...c.path.split('/')]), env);
        lines.push({ text: ` ${c.kind === 'new file' ? 'create' : 'delete'} mode ${mode} ${c.path}`, type: 'output' });
      }
      setGit(advance(g, commit));
      return { lines: quiet ? [] : lines, newState };
    }

    // ── git log ───────────────────────────────────────────────────────────────
    case 'log': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const objects = g.objects!;
      // `-3` is `-n 3`.
      let limit = Infinity;
      const words: string[] = [];
      for (const a of args.slice(1)) {
        const count = a.match(/^-(\d+)$/);
        if (count) limit = Number(count[1]);
        else words.push(a);
      }
      const o = parseOptions(words, 'n', '', ['author', 'grep', 'max-count']);
      if (o.missing === 'n') return fail(128, 'error: -n requires an argument');
      // Several --grep (or --author) keep the commits that match any of them.
      const greps = allValues(words, 'grep');
      const authors = allValues(words, 'author');
      // Without parent rewriting, git draws the skipped commits' lines in ways not simulated here.
      if (o.long.has('graph') && (greps.length || authors.length)) return notSimulated('git log --graph avec --grep ou --author', newState);
      const bad = [...o.short].find((c) => c !== 'p') ?? [...o.long.keys()].find((k) => !LOG_OPTIONS.includes(k));
      if (bad) return notSimulated(`L'option ${bad.length === 1 ? '-' : '--'}${bad} de git log`, newState);
      if (o.long.has('graph') && o.long.has('reverse')) return fail(128, "fatal: options '--graph' and '--reverse' cannot be used together");
      const pretty = text(o.long.get('pretty'));
      if (pretty !== undefined && pretty !== 'oneline') return notSimulated(`git log --pretty=${pretty}`, newState);
      const oneline = o.long.has('oneline') || pretty === 'oneline';
      const count = o.values.get('n') ?? text(o.long.get('max-count'));
      if (count !== undefined) {
        if (!/^-?\d+$/.test(count)) return fail(128, `fatal: '${count}': not an integer`);
        limit = Number(count);
      }

      // Revisions come first (`main`, `HEAD~2`, `main..feature`, `^main`); what follows is paths.
      const include: string[] = [];
      const exclude: string[] = [];
      const rels: string[] = [];
      for (const arg of o.positional) {
        if (!rels.length) {
          const range = arg.match(/^(.*?)\.\.(\.?)(.*)$/);
          if (range && range[2]) return notSimulated('git log A...B', newState);
          const [from, to] = range ? [rev(range[1] || 'HEAD'), rev(range[3] || 'HEAD')] : [null, null];
          if (from && to) { exclude.push(from); include.push(to); continue; }
          const hidden = arg.startsWith('^') ? rev(arg.slice(1)) : null;
          if (hidden) { exclude.push(hidden); continue; }
          const h = rev(arg);
          if (h) { include.push(h); continue; }
        }
        const rel = repoRel(arg);
        if (rel === null || !nodeAt(newState.root, [...g.repoPath!, ...rel.split('/').filter(Boolean)])) {
          return { lines: AMBIGUOUS(arg), newState, status: 128 };
        }
        rels.push(rel);
      }
      for (const arg of o.paths) { const rel = repoRel(arg); if (rel !== null) rels.push(rel); }
      if (o.long.has('all')) include.push(...Object.values(g.refs ?? {}), ...Object.values(g.tags ?? {}), ...Object.values(g.remoteRefs ?? {}));
      else if (!include.length) {
        const tip = g.refs?.[g.branch];
        if (!tip) return { lines: [{ text: `fatal: your current branch '${g.branch}' does not have any commits yet`, type: 'error' }], newState, status: 128 };
        include.push(tip);
      }

      const hiddenSet = new Set<string>();
      exclude.forEach((h) => ancestors(objects, h).forEach((x) => hiddenSet.add(x)));
      const matches = (patterns: string[], value: string) => !patterns.length || patterns.some((pattern) => {
        try { return new RegExp(basicRegex(pattern), 'm').test(value); } catch { return value.includes(pattern); }
      });
      /** With paths, a commit is shown when it changed one of them (compared with each of its parents). */
      const touches = (c: GitCommit) => {
        if (!rels.length) return true;
        const mine = c.tree ?? {};
        const differs = (other: Tree) => rels.some((r) => [...new Set([...under(mine, r), ...under(other, r)])].some((p) => mine[p] !== other[p]));
        return c.parents?.length ? c.parents.every((p) => differs(objects[p]?.tree ?? {})) : differs({});
      };
      const walked = logOrder(objects, [...new Set(include)]).filter((c) => !hiddenSet.has(c.hash));
      const selected = walked
        .filter((c) => matches(authors, ident(c.author)))
        .filter((c) => matches(greps, c.message))
        .filter((c) => !o.long.has('no-merges') || (c.parents?.length ?? 0) < 2)
        .filter(touches);
      const picked = selected.slice(0, limit);
      if (o.long.has('reverse')) picked.reverse();

      const graph = o.long.has('graph');
      if (graph) {
        // Only a straight history is drawn: each commit walked has one parent, the next one walked.
        const linear = walked.every((c, i) => (c.parents?.length ?? 0) < 2 && (i === walked.length - 1 || c.parents?.[0] === walked[i + 1].hash));
        if (!linear) return notSimulated('Le dessin de git log --graph pour un historique qui se sépare en branches', newState);
      }
      const decorate = !o.long.has('no-decorate') && text(o.long.get('decorate')) !== 'no';
      // `--oneline` abbreviates the hash, `--pretty=oneline` does not; both give way to --(no-)abbrev-commit.
      const abbrev = !o.long.has('no-abbrev-commit') && (o.long.has('oneline') || o.long.has('abbrev-commit'));
      const withStat = o.long.has('stat');
      const withPatch = o.short.has('p') || o.long.has('patch');
      /** With paths, --stat and -p only show those paths. */
      const limited = (t: Tree): Tree => (rels.length ? Object.fromEntries([...new Set(rels.flatMap((r) => under(t, r)))].map((p) => [p, t[p]])) : t);
      const repo = openRepo(newState);
      const blank: OutputLine = { text: '', type: 'output' };
      const lines: OutputLine[] = [];
      picked.forEach((c, i) => {
        const entry: OutputLine[] = [];
        if (oneline) entry.push({ text: `${abbrev ? short(c.hash) : c.hash}${decorate ? decorations(g, c.hash) : ''} ${subject(c)}`, type: 'output' });
        else entry.push(...commitHeader(g, c, decorate, abbrev));
        // Git shows no diff for a merge commit in a log.
        if ((c.parents?.length ?? 0) < 2) {
          const before = limited(c.parents?.[0] ? objects[c.parents[0]].tree ?? {} : {});
          const after = limited(c.tree ?? {});
          const stat = withStat ? statBlock(before, after, g.modes ?? {}, false) : [];
          const patch = withPatch ? diffLines(before, after, null, newState, repo, env) : [];
          // A full entry puts a blank line before its details, or `---` when it has both.
          // Between the stat and the patch comes a blank line.
          if (stat.length || patch.length) {
            if (!oneline) entry.push(stat.length && patch.length ? { text: '---', type: 'output' } : blank);
            entry.push(...stat, ...(stat.length && patch.length ? [blank] : []), ...patch);
          }
        }
        // A blank line separates full entries; `--oneline` entries follow each other.
        if (i && !oneline) entry.unshift(blank);
        if (!graph) { lines.push(...entry); return; }
        // A straight history: `*` on the commit's line, `|` down to the next commit
        // (the separating blank line included). Below the last commit shown, `|` goes on
        // only when more commits would follow without the limit (`-1`).
        const continues = i < picked.length - 1 || selected.length > picked.length;
        const at = i && !oneline ? 1 : 0;
        entry.forEach((l, j) => {
          const lead = j === at ? '* ' : j < at || continues ? '| ' : '  ';
          lines.push({ ...l, text: `${lead}${l.text}` });
        });
      });
      return { lines, newState };
    }

    // ── git diff ──────────────────────────────────────────────────────────────
    case 'diff': {
      if (!inRepo()) return notARepo();
      const o = parseOptions(args.slice(1), 'U');
      const repo = openRepo(newState);
      // Leading arguments that name commits are revisions; the others must be paths.
      const trees: Tree[] = [];
      const rels: string[] = [];
      for (const arg of o.positional) {
        const range = !rels.length && !trees.length ? arg.match(/^(.*?)\.\.(\.?)(.*)$/) : null;
        if (range) {
          // `A..B` compares A with B; `A...B` compares their merge base with B.
          const a = rev(range[1] || 'HEAD');
          const b = rev(range[3] || 'HEAD');
          const from = a && b && range[2] ? mergeBase(repo.g.objects!, a, b) : a;
          if (from && b) { trees.push(commitOf(from).tree ?? {}, commitOf(b).tree ?? {}); continue; }
        }
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
      const inPaths = (path: string) => !paths || paths.some((p) => !p || path === p || path.startsWith(`${p}/`));
      // During a merge, a conflicted path has no single index entry: git diff compares its three versions.
      const unmerged = trees.length ? [] : Object.keys(repo.g.merge?.conflicts ?? {}).filter(inPaths);
      const summary = ['stat', 'name-only', 'name-status', 'numstat', 'shortstat'].some((k) => o.long.has(k));
      if (unmerged.length && (!staged || summary)) return notSimulated('git diff sur un fichier en conflit (diff combiné)', newState);
      const picked = changes(from, to).filter((c) => inPaths(c.path) && !unmerged.includes(c.path));
      if (unmerged.length) {
        // `git diff --staged`: each conflicted path is announced where it sorts, the others show as usual.
        const lines: OutputLine[] = [];
        for (const p of [...new Set([...unmerged, ...picked.map((c) => c.path)])].sort()) {
          if (unmerged.includes(p)) lines.push({ text: `* Unmerged path ${p}`, type: 'output' });
          else lines.push(...diffLines(from, to, [p], newState, repo, env));
        }
        return { lines, newState };
      }
      if (o.long.has('stat')) {
        const only = (t: Tree): Tree => Object.fromEntries(Object.entries(t).filter(([p]) => inPaths(p)));
        return { lines: statBlock(only(from), only(to), repo.g.modes ?? {}, false), newState };
      }
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
      const refs = g.refs!;
      const objects = g.objects!;
      const o = parseOptions(args.slice(1), 'u', '', ['contains', 'no-contains', 'points-at', 'merged', 'no-merged', 'set-upstream-to']);
      if (o.short.has('h')) return { lines: BRANCH_USAGE.map((text) => ({ text, type: 'output' as const })), newState };
      const unknown = unknownOption(o, 'dDmMcCvarlfqu',
        ['delete', 'move', 'copy', 'list', 'all', 'remotes', 'verbose', 'force', 'quiet', 'show-current', 'merged', 'no-merged', 'contains', 'no-contains', 'points-at', 'unset-upstream', 'set-upstream-to'], BRANCH_USAGE);
      if (unknown) return { ...unknown, newState };
      if (o.long.has('show-current')) return { lines: [{ text: g.branch, type: 'output' }], newState };
      if (o.long.has('unset-upstream')) {
        const name = o.positional[0] ?? g.branch;
        if (!g.upstream?.[name]) return fail(128, `fatal: branch '${name}' has no upstream information`);
        const { [name]: _gone, ...rest } = g.upstream;
        void _gone;
        setGit({ ...g, upstream: rest });
        return { lines: [], newState };
      }
      if (o.missing === 'u') return fail(129, "error: switch `u' requires a value");
      if (o.long.get('set-upstream-to') === true) return fail(129, "error: option `set-upstream-to' requires a value");
      const upstreamArg = o.values.get('u') ?? text(o.long.get('set-upstream-to'));
      if (upstreamArg !== undefined) {
        // `git branch -u origin/main [branch]`: the branch now tracks that remote branch.
        const name = o.positional[0] ?? g.branch;
        if (!refs[name]) return fail(128, `fatal: branch '${name}' does not exist`);
        if (!g.remoteRefs?.[upstreamArg]) return fail(128, ...UPSTREAM_MISSING(upstreamArg));
        setGit({ ...g, upstream: { ...g.upstream, [name]: upstreamArg } });
        return { lines: [{ text: `branch '${name}' set up to track '${upstreamArg}'.`, type: 'output' }], newState };
      }
      const force = o.short.has('D') || o.short.has('M') || o.short.has('C') || o.short.has('f') || o.long.has('force');
      const names = o.positional;
      const tip = refs[g.branch];

      if (o.short.has('d') || o.short.has('D') || o.long.has('delete')) {
        if (!names.length) return fail(128, 'fatal: branch name required');
        const next = { ...refs };
        const upstream = { ...g.upstream };
        const lines: OutputLine[] = [];
        let status = 0;
        for (const name of names) {
          if (name === g.branch) {
            lines.push(err(`error: cannot delete branch '${name}' used by worktree at '${gitPath(g.repoPath!, env)}'`));
            status = 1;
          } else if (!next[name]) {
            lines.push(err(`error: branch '${name}' not found`));
            status = 1;
          } else if (!force && !(tip && isAncestor(objects, next[name], tip))) {
            // -d only deletes a branch whose commits are all in the current one.
            lines.push(
              err(`error: the branch '${name}' is not fully merged`),
              err(`hint: If you are sure you want to delete it, run 'git branch -D ${name}'`),
              err('hint: Disable this message with "git config set advice.forceDeleteBranch false"'),
            );
            status = 1;
          } else {
            lines.push({ text: `Deleted branch ${name} (was ${short(next[name])}).`, type: 'output' });
            delete next[name];
            delete upstream[name];
          }
        }
        setGit({ ...g, refs: next, upstream });
        return { lines, newState, status };
      }

      const moving = o.short.has('m') || o.short.has('M') || o.long.has('move');
      if (moving || o.short.has('c') || o.short.has('C') || o.long.has('copy')) {
        const [from, to] = names.length >= 2 ? names : [g.branch, names[0]];
        if (!to) return fail(128, 'fatal: branch name required');
        if (!refs[from] && from !== g.branch) return fail(128, `fatal: no branch named '${from}'`);
        const bad = badBranchName(to);
        if (bad && !(refs[to] && force && validRefName(to))) return bad;
        if (refs[to] && !force) return fail(128, `fatal: a branch named '${to}' already exists`);
        const next = { ...refs };
        if (refs[from]) {
          next[to] = refs[from];
          if (moving && to !== from) delete next[from];
        }
        // A renamed branch keeps tracking what it tracked.
        const upstream = { ...g.upstream };
        if (moving && upstream[from] && to !== from) { upstream[to] = upstream[from]; delete upstream[from]; }
        setGit({ ...g, refs: next, upstream, branch: moving && g.branch === from ? to : g.branch });
        return { lines: [], newState };
      }

      const listing = !names.length || o.short.has('l') || o.long.has('list') || o.short.has('a') || o.short.has('r')
        || ['merged', 'no-merged', 'contains', 'no-contains', 'points-at'].some((k) => o.long.has(k));
      if (listing) {
        /** The commit a filter names: `--merged main`, or HEAD for a bare `--merged`. */
        const target = (key: string): string | null => { const v = o.long.get(key); return rev(typeof v === 'string' ? v : 'HEAD'); };
        const filters: Array<(h: string) => boolean> = [];
        for (const key of ['merged', 'no-merged', 'contains', 'no-contains', 'points-at']) {
          if (!o.long.has(key)) continue;
          const at = target(key);
          const v = o.long.get(key);
          if (!at) return fail(129, `error: malformed object name ${typeof v === 'string' ? v : 'HEAD'}`);
          filters.push({
            merged: (h: string) => isAncestor(objects, h, at),
            'no-merged': (h: string) => !isAncestor(objects, h, at),
            contains: (h: string) => isAncestor(objects, at, h),
            'no-contains': (h: string) => !isAncestor(objects, at, h),
            'points-at': (h: string) => h === at,
          }[key]!);
        }
        const verbose = o.short.has('v') || o.long.has('verbose');
        // `-vv` adds the upstream's name: count every v, in clusters (`-avv`) and repeated flags.
        const vv = args.slice(1).reduce((n, a) => n + (a === '--verbose' ? 1 : /^-[^-]/.test(a) ? [...a.slice(1)].filter((c) => c === 'v').length : 0), 0) >= 2;
        const remotesOnly = o.short.has('r') || o.long.has('remotes');
        const withRemotes = remotesOnly || o.short.has('a') || o.long.has('all');
        const local = remotesOnly ? [] : Object.keys(refs).sort()
          .filter((b) => !names.length || names.some((p) => globMatch(p, b)))
          .filter((b) => filters.every((f) => f(refs[b])));
        const width = Math.max(0, ...local.map((b) => b.length));
        const lines: OutputLine[] = local.map((b) => ({
          text: `${b === g.branch ? '* ' : '  '}${verbose ? `${b.padEnd(width)} ${short(refs[b])}${trackingTag(g, b, vv)} ${subject(commitOf(refs[b]))}` : b}`,
          type: b === g.branch ? 'success' : 'output',
        }));
        if (withRemotes) {
          // `origin/HEAD -> origin/main` after a clone, sorted with the others.
          const heads = Object.entries(g.remoteHead ?? {}).map(([remote, b]) => [`${remote}/HEAD`, ` -> ${remote}/${b}`] as const);
          const entries = [
            ...Object.keys(g.remoteRefs ?? {}).filter((r) => filters.every((f) => f(g.remoteRefs![r]))).map((r) => [r, ''] as const),
            ...(filters.length ? [] : heads),
          ].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
          entries.forEach(([r, arrow]) => lines.push({ text: `  ${remotesOnly ? r : `remotes/${r}`}${arrow}`, type: 'removed' }));
        }
        return { lines, newState };
      }

      const [name, start] = names;
      const bad = badBranchName(name);
      if (bad) return bad;
      if (refs[name] && !force) return fail(128, `fatal: a branch named '${name}' already exists`);
      if (name === g.branch) return fail(128, `fatal: cannot force update the branch '${name}' used by worktree at '${gitPath(g.repoPath!, env)}'`);
      const at = rev(start ?? 'HEAD');
      if (!at) return fail(128, `fatal: not a valid object name: '${start ?? g.branch}'`);
      setGit({ ...g, refs: { ...refs, [name]: at } });
      return { lines: [], newState };
    }

    // ── git switch ────────────────────────────────────────────────────────────
    case 'switch': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const o = parseOptions(args.slice(1), 'cC', '', ['create', 'force-create']);
      if (o.missing) return fail(129, `error: switch \`${o.missing}' requires a value`);
      const unknown = unknownOption(o, 'cCqdt', ['create', 'force-create', 'quiet', 'detach', 'track'], SWITCH_USAGE);
      if (unknown) return { ...unknown, newState };
      const quiet = o.short.has('q') || o.long.has('quiet');
      if (g.merge) return fail(128, 'fatal: cannot switch branch while merging', 'Consider "git merge --quit" or "git worktree add".');
      const created = o.values.get('c') ?? o.values.get('C') ?? text(o.long.get('create')) ?? text(o.long.get('force-create'));
      if (created !== undefined) {
        if (o.positional.length > 1) return fail(128, 'fatal: only one reference expected');
        const forced = o.values.has('C') || o.long.has('force-create');
        const bad = badBranchName(created);
        if (bad && !(forced && g.refs![created])) return bad;
        if (g.refs![created] && !forced) return fail(128, `fatal: a branch named '${created}' already exists`);
        return switchTo(created, 'switch', true, o.positional[0], { quiet, reset: forced && !!g.refs![created] });
      }
      if (o.short.has('d') || o.long.has('detach')) return notSimulated('La tête détachée (git switch --detach)', newState);
      if (o.positional.length > 1) return fail(128, 'fatal: only one reference expected');
      let name = o.positional[0];
      if (!name) return fail(128, 'fatal: missing branch or commit argument');
      if (name === '-') {
        if (!g.previousBranch) return notSimulated('git switch - sans branche précédente', newState);
        name = g.previousBranch;
      }
      const remote = g.refs![name] ? null : remoteFor(name);
      if (o.short.has('t') || o.long.has('track')) {
        if (!remote) return fail(128, 'fatal: missing branch name; try -c');
        return track(name, remote, 'switch', quiet);
      }
      if (name === g.branch) return { lines: quiet ? [] : [...localChanges(), ...[`Already on '${name}'`, ...branchTracking()].map((text) => ({ text, type: 'output' as const }))], newState };
      if (g.refs![name]) return switchTo(name, 'switch', false, undefined, { quiet });
      if (remote) return track(name, remote, 'switch', quiet);
      // A commit, a tag or HEAD is not a branch: switch refuses (checkout would detach HEAD).
      const detachHint = 'hint: If you want to detach HEAD at the commit, try again with the --detach option.';
      if (name === 'HEAD' || name === '@') return fail(128, `fatal: a branch is expected, got 'refs/heads/${g.branch}'`, detachHint);
      if (g.tags?.[name]) return fail(128, `fatal: a branch is expected, got tag '${name}'`, detachHint);
      if (rev(name)) return fail(128, `fatal: a branch is expected, got commit '${name}'`, detachHint);
      return fail(128, `fatal: invalid reference: ${name}`);
    }

    // ── git checkout ──────────────────────────────────────────────────────────
    case 'checkout': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const o = parseOptions(args.slice(1), 'bB');
      if (o.missing) return fail(129, `error: switch \`${o.missing}' requires a value`);
      const unknown = unknownOption(o, 'bBqt', ['quiet', 'ours', 'theirs', 'track', 'detach', 'orphan', 'merge', 'conflict'], CHECKOUT_USAGE);
      if (unknown) return { ...unknown, newState };
      if (o.long.has('orphan') || o.long.has('detach') || o.long.has('merge') || o.long.has('conflict')) {
        return notSimulated(`git checkout --${['orphan', 'detach', 'merge', 'conflict'].find((k) => o.long.has(k))}`, newState);
      }
      const quiet = o.short.has('q') || o.long.has('quiet');
      const conflicted = Object.keys(g.merge?.conflicts ?? {}).length > 0;
      const created = o.values.get('b') ?? o.values.get('B');
      if (created !== undefined) {
        if (conflicted) return needsMerge();
        const forced = o.values.has('B');
        const bad = badBranchName(created);
        if (bad && !(forced && g.refs![created])) return bad;
        if (g.refs![created] && !forced) return fail(128, `fatal: a branch named '${created}' already exists`);
        return switchTo(created, 'checkout', true, o.positional[0], { quiet, reset: forced && !!g.refs![created] });
      }
      const ours = o.long.has('ours');
      const theirs = o.long.has('theirs');
      const dashDash = args.includes('--');
      // `git checkout <branch>` (or `<branch> --`): a branch name alone switches to it.
      if (o.positional.length === 1 && (!dashDash || !o.paths.length)) {
        const name = o.positional[0] === '-' ? g.previousBranch ?? '-' : o.positional[0];
        const remote = g.refs![name] ? null : remoteFor(name);
        const isBranch = name === g.branch || !!g.refs![name] || !!remote;
        if ((ours || theirs) && isBranch && !dashDash) return fail(128, "fatal: '--ours/--theirs' cannot be used with switching branches");
        if (o.short.has('t') || o.long.has('track')) {
          if (!remote) return fail(128, 'fatal: missing branch name; try -b');
          return track(name, remote, 'checkout', quiet);
        }
        if (!ours && !theirs) {
          if (conflicted && isBranch) return needsMerge();
          if (name === g.branch) return { lines: quiet ? [] : [...localChanges(), ...[`Already on '${name}'`, ...branchTracking()].map((text) => ({ text, type: 'output' as const }))], newState };
          if (g.refs![name]) return switchTo(name, 'checkout', false, undefined, { quiet });
          if (remote) return track(name, remote, 'checkout', quiet);
          if (dashDash) return rev(name) ? notSimulated('La tête détachée (git checkout sur un commit)', newState) : fail(128, `fatal: invalid reference: ${name}`);
          if (rev(name) && !known(repoRel(name), openRepo(newState).index)) return notSimulated('La tête détachée (git checkout sur un commit)', newState);
        }
      }
      if ((ours || theirs) && !o.positional.length && !o.paths.length) return fail(128, "fatal: '--ours/--theirs' needs the paths to check out");
      if (!o.positional.length && !o.paths.length) return { lines: quiet ? [] : localChanges(), newState };

      // Paths: restored from the index, or from a commit named first.
      const repo = openRepo(newState);
      let source: Tree | null = null;
      let specs = [...o.positional, ...o.paths];
      if (o.positional.length && (dashDash || o.positional.length >= 2)) {
        const h = rev(o.positional[0]);
        if (h) {
          source = commitOf(h).tree ?? {};
          specs = [...o.positional.slice(1), ...o.paths];
        }
      }
      const conflicts = g.merge?.conflicts ?? {};
      const index = { ...repo.index };
      let root = newState.root;
      let count = 0;
      for (const arg of specs) {
        const rel = repoRel(arg);
        const found = rel === null ? [] : under(source ?? { ...repo.index, ...conflicts }, rel);
        if (!found.length) return fail(1, `error: pathspec '${arg}' did not match any file(s) known to git`);
        for (const p of found) {
          let want: string | null;
          if (source) {
            want = source[p];
            if (index[p] !== want || (repo.work[p] ?? null) !== want) count++;
            index[p] = source[p];
          } else if (conflicts[p]) {
            if (!ours && !theirs) return fail(1, `error: path '${p}' is unmerged`);
            want = ours ? conflicts[p].ours : conflicts[p].theirs;
            if (want === null) return fail(1, `error: path '${p}' does not have ${ours ? 'our' : 'their'} version`);
          } else want = repo.index[p];
          if ((repo.work[p] ?? null) !== want) {
            root = writeFile(root, [...repo.path, ...p.split('/')], want);
            if (!source) count++;
          }
        }
      }
      setGit({ ...g, index }, root);
      // Git counts the paths it rewrote, unless `--` made the request explicit.
      if (dashDash || quiet) return { lines: [], newState };
      const from = source ? short(treeId(source, g.modes)) : 'the index';
      return { lines: [{ text: `Updated ${count} path${count === 1 ? '' : 's'} from ${from}`, type: 'output' }], newState };
    }

    // ── git merge ─────────────────────────────────────────────────────────────
    case 'merge': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const o = parseOptions(args.slice(1), 'm', '', ['message']);
      if (o.missing) return fail(129, `error: switch \`${o.missing}' requires a value`);
      const unknown = unknownOption(o, 'mqnev', ['no-ff', 'ff', 'ff-only', 'squash', 'no-squash', 'abort', 'quit', 'continue', 'commit', 'no-commit',
        'edit', 'no-edit', 'stat', 'no-stat', 'quiet', 'verbose', 'message'], MERGE_USAGE);
      if (unknown) return { ...unknown, newState };
      const unmerged = Object.keys(g.merge?.conflicts ?? {});
      for (const action of ['abort', 'quit', 'continue']) {
        if (o.long.has(action) && o.positional.length) {
          return { lines: [`fatal: --${action} expects no arguments`, '', ...MERGE_USAGE].map(err), newState, status: 129 };
        }
      }
      if (o.long.has('abort')) {
        if (!g.merge) return fail(128, 'fatal: There is no merge to abort (MERGE_HEAD missing).');
        // Back to HEAD for what the merge changed; other local changes stay.
        const repo = openRepo(newState);
        const index = { ...repo.index };
        let root = newState.root;
        for (const p of new Set([...Object.keys(repo.head), ...Object.keys(repo.index), ...unmerged])) {
          if (repo.index[p] === repo.head[p] && !unmerged.includes(p)) continue;
          if (p in repo.head) index[p] = repo.head[p];
          else delete index[p];
          if ((repo.work[p] ?? null) !== (repo.head[p] ?? null)) root = writeFile(root, [...repo.path, ...p.split('/')], repo.head[p] ?? null);
        }
        setGit({ ...g, index, merge: undefined }, root);
        return { lines: [], newState };
      }
      if (o.long.has('quit')) { setGit({ ...g, merge: undefined }); return { lines: [], newState }; }
      if (o.long.has('continue')) {
        if (!g.merge) return fail(128, 'fatal: There is no merge in progress (MERGE_HEAD missing).');
        // Like git commit: the editor opens on the proposed message.
        return handleGit(newState, ['commit'], env, resolve);
      }
      if (g.merge) {
        if (unmerged.length) {
          return fail(128, 'error: Merging is not possible because you have unmerged files.',
            "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
            'hint: as appropriate to mark resolution and make a commit.',
            'fatal: Exiting because of an unresolved conflict.');
        }
        return fail(128, 'fatal: You have not concluded your merge (MERGE_HEAD exists).', 'Please, commit your changes before you merge.');
      }
      if (o.long.has('no-commit') || o.long.has('edit') || o.short.has('e')) return notSimulated('git merge --no-commit / --edit', newState);
      if (!o.positional.length) return fail(128, 'fatal: No remote for the current branch.');
      // `git merge -` is the branch before the last switch.
      const names = o.positional.map((n) => (n === '-' ? '@{-1}' : n));
      const missing = names.find((n) => !rev(n));
      if (missing) return fail(1, `merge: ${missing} - not something we can merge`);
      if (names.length > 1) return notSimulated('La fusion de plusieurs branches à la fois', newState);
      const name = names[0] === '@{-1}' && g.previousBranch ? g.previousBranch : names[0];
      const theirs = rev(name)!;
      const ours = g.refs![g.branch];
      if (!ours) return notSimulated('git merge sur une branche sans commit', newState);
      const objects = g.objects!;
      const repo = openRepo(newState);
      const quiet = o.short.has('q') || o.long.has('quiet');
      const noStat = quiet || o.short.has('n') || o.long.has('no-stat');
      const squash = o.long.has('squash');
      if (isAncestor(objects, theirs, ours)) {
        return { lines: quiet ? [] : [{ text: squash ? 'Already up to date. (nothing to squash)' : 'Already up to date.', type: 'output' }], newState };
      }
      const kind = g.tags?.[name] ? 'tag' : g.refs![name] ? 'branch' : g.remoteRefs?.[name] ? 'remote-tracking branch' : 'commit';
      // Several -m make several paragraphs, as with git commit.
      const given: string[] = [];
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '-m' || a === '--message') given.push(args[++i] ?? '');
        else if (a.startsWith('--message=')) given.push(a.slice('--message='.length));
        else if (/^-m./.test(a)) given.push(a.slice(2));
      }
      const message = given.length ? given.join('\n\n') : `Merge ${kind} '${name}'${['main', 'master'].includes(g.branch) ? '' : ` into ${g.branch}`}`;
      const theirsTree = commitOf(theirs).tree ?? {};

      if (isAncestor(objects, ours, theirs) && !o.long.has('no-ff')) {
        // Fast-forward: the branch just moves ahead, no merge commit.
        const lines: OutputLine[] = [{ text: `Updating ${short(ours)}..${short(theirs)}`, type: 'output' }];
        const m = moveTo(repo, theirsTree);
        const blocked = blockedBy(m, 'merge');
        if (blocked.length) return { lines: [...lines, ...blocked], newState, status: 1 };
        lines.push({ text: 'Fast-forward', type: 'output' });
        if (squash) lines.push({ text: 'Squash commit -- not updating HEAD', type: 'output' });
        if (!noStat) lines.push(...statBlock(repo.head, theirsTree, g.modes ?? {}));
        setGit({ ...g, index: m.index, refs: squash ? g.refs : { ...g.refs, [g.branch]: theirs } }, m.root);
        return { lines: quiet ? [] : lines, newState };
      }
      if (o.long.has('ff-only')) return fail(128, ...DIVERGING);

      const base = mergeBase(objects, ours, theirs);
      if (!base) return fail(128, 'fatal: refusing to merge unrelated histories');
      const result = threeWay(commitOf(base).tree ?? {}, repo.head, theirsTree, name);
      const touched = [...new Set([...Object.keys(repo.head), ...Object.keys(result.tree), ...Object.keys(result.work)])]
        .filter((p) => repo.head[p] !== result.tree[p] || p in result.work).sort();
      // Git merges only into a clean index, and never over a local change or an untracked file.
      const staged = changes(repo.head, repo.index).map((c) => c.path);
      const local = [...new Set([...staged, ...touched.filter((p) => p in repo.index && repo.work[p] !== repo.index[p])])].sort();
      const inTheWay = touched.filter((p) => !(p in repo.head) && !(p in repo.index) && p in repo.work
        && repo.work[p] !== (p in result.work ? result.work[p] : result.tree[p]) && !ignoredBy(repo.rules, p, false));
      const blocked = blockedBy({ local, inTheWay }, 'merge');
      // Unlike a fast-forward, a refused merge strategy exits 2 and says so.
      if (blocked.length) return { lines: [...blocked, err('Merge with strategy ort failed.')], newState, status: 2 };

      const conflicts = Object.keys(result.conflicts);
      if (conflicts.length && squash) return notSimulated('Un conflit pendant git merge --squash', newState);
      const index = { ...repo.index };
      let root = newState.root;
      for (const p of touched) {
        if (p in result.tree) index[p] = result.tree[p];
        else delete index[p];
        const want = p in result.work ? result.work[p] : result.tree[p] ?? null;
        if ((repo.work[p] ?? null) !== want) root = writeFile(root, [...repo.path, ...p.split('/')], want);
      }
      if (conflicts.length) {
        // The proposed message lists the conflicts as comments (MERGE_MSG).
        const proposed = `${message}\n\n# Conflicts:\n${Object.keys(result.conflicts).sort().map((p) => `#\t${p}`).join('\n')}`;
        setGit({ ...g, index, merge: { head: theirs, name, message: proposed, conflicts: result.conflicts } }, root);
        return { lines: [...result.lines, { text: 'Automatic merge failed; fix conflicts and then commit the result.', type: 'output' }], newState, status: 1 };
      }
      if (squash) {
        setGit({ ...g, index }, root);
        return {
          lines: [
            ...result.lines,
            { text: 'Squash commit -- not updating HEAD', type: 'output' },
            { text: 'Automatic merge went well; stopped before committing as requested', type: 'output' },
          ],
          newState,
        };
      }
      const commit = makeCommit(g, newState.user, index, [ours, theirs], message);
      setGit({ ...advance(g, commit), index }, root);
      if (quiet) return { lines: [], newState };
      return {
        lines: [...result.lines, { text: "Merge made by the 'ort' strategy.", type: 'output' }, ...(noStat ? [] : statBlock(repo.head, index, g.modes ?? {}))],
        newState,
      };
    }

    // ── git remote ────────────────────────────────────────────────────────────
    case 'remote': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const verboseFirst = args[1] === '-v' || args[1] === '--verbose';
      const remoteSub = args[verboseFirst ? 2 : 1] ?? '';
      const rest = args.slice(verboseFirst ? 3 : 2);
      const names = Object.keys(g.remotes).sort();
      const noSuch = (name: string, colon: boolean) => fail(2, `error: No such remote${colon ? ':' : ''} '${name}'`);
      if (!remoteSub) {
        // Nothing configured: git prints nothing at all.
        const lines: OutputLine[] = verboseFirst
          ? names.flatMap((n) => [`${n}\t${g.remotes[n]} (fetch)`, `${n}\t${g.remotes[n]} (push)`]).map((text) => ({ text, type: 'output' as const }))
          : names.map((text) => ({ text, type: 'output' as const }));
        return { lines, newState };
      }
      switch (remoteSub) {
        case 'add': {
          const [name, url] = rest.filter((a) => !a.startsWith('-'));
          if (!name || !url) return { lines: REMOTE_ADD_USAGE.map(err), newState, status: 129 };
          if (g.remotes[name]) return fail(3, `error: remote ${name} already exists.`);
          setGit({ ...g, remotes: { ...g.remotes, [name]: url } });
          return { lines: [], newState };
        }
        case 'remove':
        case 'rm': {
          const name = rest[0];
          if (!name) return { lines: ['usage: git remote remove <name>', ''].map(err), newState, status: 129 };
          if (!g.remotes[name]) return noSuch(name, true);
          // Its remote-tracking branches and every branch's tracking of it go too.
          const { [name]: _url, ...remotes } = g.remotes;
          void _url;
          const keep = ([ref]: [string, string]) => !ref.startsWith(`${name}/`);
          const { [name]: _head, ...remoteHead } = g.remoteHead ?? {};
          void _head;
          setGit({
            ...g,
            remotes,
            remoteRefs: Object.fromEntries(Object.entries(g.remoteRefs ?? {}).filter(keep)),
            remoteServer: g.remoteServer && Object.fromEntries(Object.entries(g.remoteServer).filter(keep)),
            upstream: Object.fromEntries(Object.entries(g.upstream ?? {}).filter(([, up]) => !up.startsWith(`${name}/`))),
            remoteHead,
          });
          return { lines: [], newState };
        }
        case 'rename': {
          const [from, to] = rest.filter((a) => !a.startsWith('-'));
          if (!from || !to) return { lines: ['usage: git remote rename [--[no-]progress] <old> <new>', ''].map(err), newState, status: 129 };
          if (!g.remotes[from]) return noSuch(from, true);
          if (g.remotes[to]) return fail(3, `error: remote ${to} already exists.`);
          const moved = (ref: string) => (ref.startsWith(`${from}/`) ? `${to}/${ref.slice(from.length + 1)}` : ref);
          const { [from]: url, ...others } = g.remotes;
          const { [from]: head, ...heads } = g.remoteHead ?? {};
          setGit({
            ...g,
            remotes: { ...others, [to]: url },
            remoteRefs: Object.fromEntries(Object.entries(g.remoteRefs ?? {}).map(([r, h]) => [moved(r), h])),
            remoteServer: g.remoteServer && Object.fromEntries(Object.entries(g.remoteServer).map(([r, h]) => [moved(r), h])),
            upstream: Object.fromEntries(Object.entries(g.upstream ?? {}).map(([b, up]) => [b, moved(up)])),
            remoteHead: head ? { ...heads, [to]: head } : heads,
          });
          return { lines: [], newState };
        }
        case 'get-url': {
          const name = rest.find((a) => !a.startsWith('-'));
          if (!name) return notSimulated('git remote get-url sans nom', newState);
          if (!g.remotes[name]) return noSuch(name, false);
          return { lines: [{ text: g.remotes[name], type: 'output' }], newState };
        }
        case 'set-url': {
          if (rest.some((a) => a.startsWith('-'))) return notSimulated(`L'option ${rest.find((a) => a.startsWith('-'))} de git remote set-url`, newState);
          const [name, url] = rest;
          if (!name || !url) return notSimulated('git remote set-url sans nom ni adresse', newState);
          if (!g.remotes[name]) return noSuch(name, false);
          setGit({ ...g, remotes: { ...g.remotes, [name]: url } });
          return { lines: [], newState };
        }
        case 'show': case 'prune': case 'update': case 'set-head': case 'set-branches':
          return notSimulated(`git remote ${remoteSub}`, newState);
        default:
          return { lines: [`error: unknown subcommand: \`${remoteSub}'`, ...REMOTE_USAGE].map(err), newState, status: 129 };
      }
    }

    // ── git push ──────────────────────────────────────────────────────────────
    case 'push': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const o = parseOptions(args.slice(1));
      const known = new Set(['u', 'q']);
      const knownLong = new Set(['set-upstream', 'quiet']);
      const other = [...o.short].find((c) => !known.has(c)) ?? [...o.long.keys()].find((k) => !knownLong.has(k));
      if (other) return notSimulated(`L'option ${other.length === 1 ? '-' : '--'}${other} de git push`, newState);
      const setUpstream = o.short.has('u') || o.long.has('set-upstream');
      let [remote, refspec] = o.positional;
      // push.default=simple: with no branch named, git pushes the branch to its upstream,
      // and only when both have the same name.
      const up = g.upstream?.[g.branch];
      const upRemote = up?.slice(0, up.indexOf('/'));
      const upBranch = up?.slice(up.indexOf('/') + 1);
      if (!remote) {
        const fallback = defaultRemote(g);
        if (!up || !upRemote || !upBranch) return fallback ? fail(128, ...PUSH_NO_UPSTREAM(g.branch, fallback)) : fail(128, ...PUSH_NO_DESTINATION);
        if (upBranch !== g.branch) return fail(128, ...PUSH_NAME_MISMATCH(upRemote, upBranch));
        remote = upRemote;
        refspec = g.branch;
      }
      const url = g.remotes[remote];
      if (!url) {
        // With no branch named, `origin` (or any name while no remote exists) gets the upstream answer first.
        if (!refspec && (remote === 'origin' || !Object.keys(g.remotes).length)) return fail(128, ...PUSH_NO_UPSTREAM(g.branch, remote));
        return fail(128, ...NOT_A_REMOTE(remote));
      }
      if (!refspec) {
        // `git push origin`: only the branch's own upstream, on that remote.
        if (!upBranch || upRemote !== remote) return fail(128, ...PUSH_NO_UPSTREAM(g.branch, remote));
        if (upBranch !== g.branch) return fail(128, ...PUSH_NAME_MISMATCH(remote, upBranch));
        refspec = g.branch;
      }
      const [srcTyped, dstTyped] = refspec.includes(':') ? refspec.split(':') : [refspec, refspec];
      const src = srcTyped === 'HEAD' ? g.branch : srcTyped;
      const dst = dstTyped === 'HEAD' ? g.branch : dstTyped;
      const tip = g.refs?.[src];
      if (!tip) return fail(1, `error: src refspec ${srcTyped} does not match any`, `error: failed to push some refs to '${url}'`);
      const key = `${remote}/${dst}`;
      // What the remote holds, which a colleague may have moved since our last fetch.
      const old = serverBranches(remote)[dst];
      const tracking = setUpstream ? [{ text: `branch '${src}' set up to track '${key}'.`, type: 'output' as const }] : [];
      const upstream = setUpstream ? { ...g.upstream, [src]: key } : g.upstream;
      const pushed = {
        remoteRefs: { ...g.remoteRefs, [key]: tip },
        remoteServer: g.remoteServer && { ...g.remoteServer, [key]: tip },
      };
      if (old === tip) {
        setGit({ ...g, ...pushed, upstream });
        return { lines: [{ text: 'Everything up-to-date', type: 'output' }, ...tracking], newState };
      }
      if (old && !isAncestor(g.objects ?? {}, old, tip)) {
        // A commit this repository never fetched: git asks to fetch first.
        const objects = g.objects ?? {};
        const known = [...Object.values(g.refs ?? {}), ...Object.values(g.remoteRefs ?? {})].some((h) => ancestors(objects, h).has(old));
        return {
          lines: [
            { text: `To ${url}`, type: 'output' },
            err(pushLine('!', '[rejected]', srcTyped, dst, known ? ' (non-fast-forward)' : ' (fetch first)')),
            err(`error: failed to push some refs to '${url}'`),
            ...(!known ? PUSH_FETCH_FIRST_HINTS : src === g.branch ? PUSH_REJECTED_HINTS : PUSH_REJECTED_OTHER_HINTS).map(err),
          ],
          newState,
          status: 1,
        };
      }
      const defaultBranch = g.remoteHead?.[remote] ?? 'main';
      const hint = !old && dst !== defaultBranch ? githubPullRequestHint(url, dst) : [];
      setGit({ ...g, ...pushed, upstream });
      return {
        lines: [
          ...hint.map((text) => ({ text, type: 'output' as const })),
          { text: `To ${url}`, type: 'output' },
          { text: old ? pushLine(' ', `${short(old)}..${short(tip)}`, srcTyped, dst) : pushLine('*', '[new branch]', srcTyped, dst), type: 'output' },
          ...tracking,
        ],
        newState,
      };
    }

    // ── git pull ──────────────────────────────────────────────────────────────
    // A fetch first (its report under `From <url>`), then a merge of what it brought.
    case 'pull': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const o = parseOptions(args.slice(1));
      // --rebase prints what a merge prints when the branch is up to date or can be
      // fast-forwarded; only replaying diverged commits differs (git 2.56, 1 October 2026).
      const rebase = [o.short.delete('r'), o.long.delete('rebase')].some(Boolean);
      // --no-rebase merges diverged branches; --ff-only refuses them.
      const merge = o.long.delete('no-rebase');
      const ffOnly = o.long.delete('ff-only');
      if (o.short.size || o.long.size) return notSimulated(`L'option ${[...o.short].map((c) => `-${c}`).concat([...o.long.keys()].map((k) => `--${k}`))[0]} de git pull`, newState);
      const [remote, branch] = o.positional;
      let ref: string;
      let fetched: string[];
      const up = g.upstream?.[g.branch];
      if (!remote) {
        // With no remote at all, git still suggests origin for a rebase, `<remote>` for a merge.
        if (!up) return fail(1, ...PULL_NO_TRACKING(g.branch, defaultRemote(g) ?? (rebase ? 'origin' : null), rebase));
        ref = up;
        const from = up.slice(0, up.indexOf('/'));
        const report = fetchFrom(from);
        fetched = report.length ? [fromLine(from), ...report] : [];
      } else {
        // git pull exits with 1 where fetch and push exit with 128.
        if (!g.remotes[remote]) return fail(1, ...NOT_A_REMOTE(remote));
        if (!branch) {
          // `git pull origin` pulls the upstream, and only from the remote it lives on.
          if (!up?.startsWith(`${remote}/`)) return fail(1, ...PULL_NOT_DEFAULT_REMOTE(remote));
          ref = up;
          const report = fetchFrom(remote);
          fetched = report.length ? [fromLine(remote), ...report] : [];
        } else {
          ref = `${remote}/${branch}`;
          if (!serverBranches(remote)[branch]) return fail(1, `fatal: couldn't find remote ref ${branch}`);
          // Naming the branch fetches it into FETCH_HEAD, and git says so.
          fetched = [fromLine(remote), fetchLine('*', 'branch', branch, 'FETCH_HEAD'), ...fetchFrom(remote, { branch })];
        }
      }
      const fromLines: OutputLine[] = fetched.map((text) => ({ text, type: 'output' }));
      const now = newState.git!;
      const theirs = now.remoteRefs?.[ref];
      const tip = now.refs?.[now.branch];
      if (!theirs) return fail(1, `fatal: couldn't find remote ref ${ref.slice(ref.indexOf('/') + 1)}`);
      if (tip && isAncestor(now.objects ?? {}, theirs, tip)) return { lines: [...fromLines, { text: 'Already up to date.', type: 'output' }], newState };
      if (tip && !isAncestor(now.objects ?? {}, tip, theirs)) {
        if (ffOnly) return { lines: [...fromLines, ...PULL_FF_ONLY_DIVERGENT.map(err)], newState, status: 128 };
        if (merge) {
          // The merge commit names the branch and where it came from: "Merge branch 'main' of <url>".
          const from = ref.slice(0, ref.indexOf('/'));
          const message = `Merge branch '${ref.slice(from.length + 1)}' of ${now.remotes[from].replace(/\.git$/, '')}`;
          const merged = handleGit(newState, ['merge', '-m', message, ref], env, resolve);
          return { ...merged, lines: [...fromLines, ...merged.lines] };
        }
        if (rebase) return notSimulated('git pull --rebase sur des branches divergentes', newState);
        return { lines: [...fromLines, ...PULL_DIVERGENT.map(err)], newState, status: 128 };
      }
      const merged = handleGit(newState, ['merge', '--ff-only', ref], env, resolve);
      return { ...merged, lines: [...fromLines, ...merged.lines] };
    }

    // ── git fetch ─────────────────────────────────────────────────────────────
    case 'fetch': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const o = parseOptions(args.slice(1));
      const [remote, branch] = o.positional;
      if (remote && !g.remotes[remote]) return fail(128, ...NOT_A_REMOTE(remote));
      // -q fetches all the same, and prints nothing.
      const quiet = o.short.has('q') || o.long.has('quiet');
      const output = (texts: string[]) => (quiet ? [] : texts.map((text): OutputLine => ({ text, type: 'output' })));
      if (remote && branch) {
        if (!serverBranches(remote)[branch]) return fail(128, `fatal: couldn't find remote ref ${branch}`);
        return { lines: output([fromLine(remote), fetchLine('*', 'branch', branch, 'FETCH_HEAD'), ...fetchFrom(remote, { branch })]), newState };
      }
      // Nothing new on the remote: git fetches silently (and still notes the remote's HEAD).
      const prune = o.short.has('p') || o.long.has('prune');
      const names = o.long.has('all') ? Object.keys(g.remotes) : [remote ?? g.upstream?.[g.branch]?.split('/')[0] ?? defaultRemote(g)];
      const lines = names.flatMap((name) => {
        if (!name) return [];
        const report = fetchFrom(name, { prune });
        return report.length ? [fromLine(name), ...report] : [];
      });
      return { lines: output(lines), newState };
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
      const cloned: GitState = {
        initialized: true,
        branch,
        branches: [branch],
        stagedFiles: [],
        commits: [],
        remotes: { origin: url },
        repoPath: target,
        head: tree,
        index: tree,
        modes: { 'README.md': '100644' },
        objects: {},
        refs: {},
      };
      const first = makeCommit(cloned, newState.user, tree, [], 'Initial commit');
      // The cloned branch tracks its remote one, and origin/HEAD names the remote's default branch.
      setGit({
        ...advance(cloned, first),
        remoteRefs: { [`origin/${branch}`]: first.hash },
        upstream: { [branch]: `origin/${branch}` },
        remoteHead: { origin: branch },
      }, root);
      // Without a terminal git prints no progress: only this line.
      return { lines: [{ text: `Cloning into '${dirName}'...`, type: 'output' }], newState };
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
        const unmerged = Object.keys(g.merge?.conflicts ?? {}).sort();
        if (unmerged.length) {
          return {
            lines: [...unmerged.map((p) => ({ text: `${p}: needs merge`, type: 'output' as const })), err('error: could not write index')],
            newState,
            status: 1,
          };
        }
        const paths = [...new Set([...Object.keys(repo.head), ...Object.keys(repo.index)])];
        const dirty = changes(repo.head, repo.index).length > 0 || paths.some((p) => repo.work[p] !== repo.index[p] && p in repo.index);
        if (!dirty) return { lines: [{ text: 'No local changes to save', type: 'output' }], newState };
        const note = o.values.get('m') ?? text(o.long.get('message')) ?? (action === 'save' ? o.positional.join(' ') : '');
        const message = note ? `On ${g.branch}: ${note}` : `WIP on ${g.branch}: ${short(g.commits[0].hash)} ${subject(g.commits[0])}`;
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
        if (action === 'pop') lines.push({ text: `Dropped refs/stash@{${at}} (${newHash()})`, type: 'output' });
        return { lines, newState };
      }
      if (action === 'drop') {
        const at = pick();
        if (typeof at !== 'number') return at;
        setGit({ ...g, stash: stash.filter((_, i) => i !== at) });
        return { lines: quiet ? [] : [{ text: `Dropped refs/stash@{${at}} (${newHash()})`, type: 'output' }], newState };
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
      const g = newState.git!;
      const filterKeys = ['contains', 'no-contains', 'points-at', 'merged', 'no-merged'];
      const o = parseOptions(args.slice(1), 'muF', 'n', ['message', 'local-user', ...filterKeys]);
      if (o.missing) return fail(129, `error: switch \`${o.missing}' requires a value`);
      const unknown = unknownOption(o, 'adflnmsu',
        ['annotate', 'delete', 'force', 'list', 'message', 'sign', 'local-user', ...filterKeys], TAG_USAGE);
      if (unknown) return { ...unknown, newState };
      // Signing needs a GPG key: the simulator has none.
      if (o.short.has('s') || o.short.has('u') || o.long.has('sign') || o.long.has('local-user')) return notSimulated('git tag -s', newState);
      const usage = { lines: TAG_USAGE.map((line) => ({ text: line, type: 'error' as const })), newState, status: 129 };
      const tags = g.tags ?? {};
      // -l and -d are two modes: git refuses both at once, naming the later one first.
      const modes: string[] = [];
      const words = args.slice(1);
      for (let i = 0; i < words.length; i++) {
        const a = words[i];
        if (a === '--') break;
        if (['--message', '--local-user', ...filterKeys.map((k) => `--${k}`)].includes(a)) { i++; continue; }
        // In `-amold`, what follows -m is its value: only the letters before it are options.
        // A cluster ending with -m, -u or -F takes the next word as that value.
        let flags = '';
        if (/^-[^-]/.test(a)) {
          const body = a.slice(1);
          const at = body.search(/[nmuF]/);
          flags = at < 0 ? body : body.slice(0, at);
          if (at >= 0 && body[at] !== 'n' && at === body.length - 1) i++;
        }
        const found = a === '--list' ? ['l'] : a === '--delete' ? ['d'] : [...flags].filter((c) => c === 'l' || c === 'd');
        found.forEach((m) => { if (!modes.includes(m)) modes.push(m); });
      }
      if (modes.length > 1) return fail(129, `error: options '-${modes[1]}' and '-${modes[0]}' cannot be used together`);
      const message = commitMessage(args.slice(1)) ?? undefined;
      const annotated = o.short.has('a') || o.long.has('annotate') || message !== undefined;
      const force = o.short.has('f') || o.long.has('force');
      if (o.short.has('d') || o.long.has('delete')) {
        if (annotated || force) return usage;
        const next = { ...tags };
        const notes = { ...g.tagNotes };
        const lines: OutputLine[] = [];
        let status = 0;
        for (const name of o.positional) {
          if (!next[name]) { lines.push(err(`error: tag '${name}' not found.`)); status = 1; continue; }
          // An annotated tag is its own object: git names that object, not the commit.
          lines.push({ text: `Deleted tag '${name}' (was ${short(notes[name]?.id ?? next[name])})`, type: 'output' });
          delete next[name];
          delete notes[name];
        }
        setGit({ ...g, tags: next, tagNotes: notes });
        return { lines, newState, status };
      }
      const nLines = o.values.get('n');
      // -n takes an optional count, with git's k/m/g suffixes; 0 or less shows names only.
      if (nLines !== undefined && nLines !== '' && !/^-?\d+[kmg]?$/i.test(nLines)) {
        return fail(129, "error: switch `n' expects an integer value with an optional k/m/g suffix");
      }
      const suffix: Record<string, number> = { k: 1024, m: 1024 ** 2, g: 1024 ** 3 };
      const count = nLines === undefined ? 0 : nLines === '' ? 1 : parseInt(nLines, 10) * (suffix[nLines.slice(-1).toLowerCase()] ?? 1);
      // A filter or -n lists tags: the names that follow are then patterns.
      const listing = !o.positional.length || o.short.has('l') || o.long.has('list') || nLines !== undefined || filterKeys.some((k) => o.long.has(k));
      if (listing) {
        // Creating options make no sense in a listing: git prints its usage.
        if (annotated || force) return usage;
        const filters: Array<(h: string) => boolean> = [];
        for (const key of filterKeys) {
          if (!o.long.has(key)) continue;
          const spec = text(o.long.get(key)) ?? 'HEAD';
          const at = rev(spec);
          if (!at) {
            if (key === 'points-at') return fail(129, `error: malformed object name '${spec}'`);
            if (key === 'merged' || key === 'no-merged') return fail(128, `fatal: malformed object name ${spec}`);
            return fail(129, `error: malformed object name ${spec}`);
          }
          // --points-at an annotated tag names that tag object, not its commit.
          const object = g.tags?.[spec] === at ? g.tagNotes?.[spec]?.id ?? at : at;
          filters.push({
            contains: (t: string) => isAncestor(g.objects!, at, tags[t]),
            'no-contains': (t: string) => !isAncestor(g.objects!, at, tags[t]),
            'points-at': (t: string) => tags[t] === object || g.tagNotes?.[t]?.id === object,
            merged: (t: string) => isAncestor(g.objects!, tags[t], at),
            'no-merged': (t: string) => !isAncestor(g.objects!, tags[t], at),
          }[key]!);
        }
        const patterns = o.positional;
        const shown = Object.keys(tags).sort()
          .filter((t) => !patterns.length || patterns.some((p) => globMatch(p, t)))
          .filter((t) => filters.every((f) => f(t)));
        return {
          lines: shown.flatMap((t) => {
            if (count <= 0) return [{ text: t, type: 'output' as const }];
            // -nN: the first N lines of the tag's message (the commit's, for a lightweight
            // tag), the first beside the name, the others indented by four spaces.
            const [first, ...rest] = (g.tagNotes?.[t]?.message ?? commitOf(tags[t]).message).split('\n').slice(0, count);
            return [`${t.padEnd(15)} ${first}`, ...rest.map((l) => `    ${l}`)].map((line) => ({ text: line, type: 'output' as const }));
          }),
          newState,
        };
      }
      if (o.positional.length > 2) return fail(128, 'fatal: too many arguments');
      const [name, target = 'HEAD'] = o.positional;
      const at = rev(target);
      if (!at) return fail(128, `fatal: Failed to resolve '${target}' as a valid ref.`);
      // `@` alone is HEAD for a revision, but refs/tags/@ is a valid tag.
      if (name !== '@' && !validRefName(name)) return fail(128, `fatal: '${name}' is not a valid tag name.`);
      const clash = refClash(name, Object.keys(tags), 'tags');
      if (clash) return fail(128, clash);
      if (tags[name] && !force) return fail(128, `fatal: tag '${name}' already exists`);
      if (annotated && message === undefined) {
        return {
          lines: [{ text: 'Sans -m, git tag -a ouvre un éditeur pour écrire le message : il n\'est pas simulé ici. Écrivez git tag -a v1.0 -m "votre message".', type: 'info' }],
          newState,
          status: 1,
        };
      }
      const notes = { ...g.tagNotes };
      // An annotated tag is its own object: -f reports that object, not the commit.
      const before = tags[name] ? notes[name]?.id ?? tags[name] : undefined;
      delete notes[name];
      if (annotated && message !== undefined) {
        const time = Math.floor(Date.now() / 1000);
        const tz = -new Date().getTimezoneOffset();
        notes[name] = { message, time, tz, id: tagId({ object: at, name, author: newState.user, time, tz, message }) };
      }
      setGit({ ...g, tags: { ...tags, [name]: at }, tagNotes: notes });
      const after = notes[name]?.id ?? at;
      return { lines: before && before !== after ? [{ text: `Updated tag '${name}' (was ${short(before)})`, type: 'output' }] : [], newState };
    }

    // ── git show ──────────────────────────────────────────────────────────────
    case 'show': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const o = parseOptions(args.slice(1));
      const bad = [...o.short][0] ?? [...o.long.keys()].find((k) => !['stat', 'no-patch'].includes(k));
      if (bad) return notSimulated(`L'option ${bad.length === 1 ? '-' : '--'}${bad} de git show`, newState);
      const dashDash = args.includes('--');
      const onDisk = (arg: string) => {
        const rel = repoRel(arg);
        return rel !== null && !!nodeAt(newState.root, [...g.repoPath!, ...rel.split('/').filter(Boolean)]);
      };
      // The first word is the commit unless it is an existing file (`git show README.md` shows HEAD, limited to it).
      const first = o.positional[0];
      const named = first !== undefined && (first.includes(':') || !!rev(first) || dashDash || !onDisk(first));
      const spec = named ? first : 'HEAD';
      if (dashDash && !spec.includes(':') && !rev(spec)) return fail(128, `fatal: bad revision '${spec}'`);
      if (!g.refs![g.branch] && /^(HEAD|@)/.test(spec)) {
        return fail(128, `fatal: your current branch '${g.branch}' does not have any commits yet`);
      }
      const colon = spec.indexOf(':');
      if (colon >= 0) {
        // `HEAD:README.md`: a file as a commit recorded it (`:README.md` is the index).
        const where = spec.slice(0, colon);
        const tree = where ? commitTree(where) : openRepo(newState).index;
        if (!tree) return fail(128, `fatal: invalid object name '${where}'.`);
        const path = spec.slice(colon + 1).replace(/^\.\//, '');
        if (!(path in tree)) {
          if (under(tree, path).length) return notSimulated('git show sur un dossier', newState);
          return fail(128, `fatal: path '${path}' does not exist in '${where || 'the index'}'`);
        }
        return { lines: splitLines(tree[path]).map((l) => ({ text: l.replace(/\n$/, ''), type: 'output' as const })), newState };
      }
      const h = rev(spec);
      if (!h) return { lines: AMBIGUOUS(spec), newState, status: 128 };
      // After the commit come paths, which must exist in the working tree (or follow `--`).
      const rels: string[] = [];
      for (const arg of o.positional.slice(named ? 1 : 0)) {
        if (!rels.length && rev(arg)) return notSimulated('git show avec plusieurs commits', newState);
        if (!onDisk(arg)) return { lines: AMBIGUOUS(arg), newState, status: 128 };
        rels.push(repoRel(arg)!);
      }
      for (const arg of o.paths) { const rel = repoRel(arg); if (rel !== null) rels.push(rel); }
      const c = commitOf(h);
      const note = g.tags?.[spec] === h ? g.tagNotes?.[spec] : undefined;
      if (rels.length && note) return notSimulated('git show sur un tag annoté avec des chemins', newState);
      /** With paths, only those paths count: a commit that changed none of them shows nothing at all. */
      const limited = (t: Tree): Tree => (rels.length ? Object.fromEntries([...new Set(rels.flatMap((r) => under(t, r)))].map((p) => [p, t[p]])) : t);
      if (rels.length) {
        const mine = limited(c.tree ?? {});
        const parents = c.parents?.length ? c.parents.map((p) => limited(commitOf(p).tree ?? {})) : [{}];
        if (parents.some((t) => !changes(t, mine).length)) return { lines: [], newState };
      }
      const blank: OutputLine = { text: '', type: 'output' };
      const lines: OutputLine[] = [];
      if (note) {
        lines.push(
          { text: `tag ${spec}`, type: 'success' },
          { text: `Tagger: ${ident(newState.user)}`, type: 'output' },
          { text: `Date:   ${formatGitDate(note.time, note.tz)}`, type: 'output' },
          blank,
          ...note.message.split('\n').map((l) => ({ text: l, type: 'output' as const })),
          blank,
        );
      }
      lines.push(...commitHeader(g, c));
      const before = limited(c.parents?.[0] ? commitOf(c.parents[0]).tree ?? {} : {});
      const after = limited(c.tree ?? {});
      if (o.long.has('no-patch')) return { lines, newState };
      if (o.long.has('stat')) {
        const stat = statBlock(before, after, g.modes ?? {}, false);
        if (stat.length) lines.push(blank, ...stat);
      } else if ((c.parents?.length ?? 0) > 1) {
        // A merge that needed no manual fix has an empty combined diff. A file that differs
        // from every parent (a conflict fixed by hand) gets a `diff --cc`, not simulated.
        const parents = c.parents!.map((p) => limited(commitOf(p).tree ?? {}));
        const paths = new Set([...Object.keys(after), ...parents.flatMap((t) => Object.keys(t))]);
        if ([...paths].some((p) => parents.every((t) => (t[p] ?? null) !== (after[p] ?? null)))) {
          return notSimulated('git show sur une fusion corrigée à la main (diff combiné)', newState);
        }
        lines.push(blank);
      } else {
        const diff = diffLines(before, after, null, newState, openRepo(newState), env);
        if (diff.length) lines.push(blank, ...diff);
      }
      return { lines, newState };
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
      const tip = g.refs![g.branch];
      let target = tip;
      let rest = o.positional;
      if (rest.length) {
        const h = rev(rest[0]);
        if (h) { target = h; rest = rest.slice(1); }
      }
      for (const arg of rest) {
        if (!known(repoRel(arg), repo.index, repo.head)) return { lines: AMBIGUOUS(arg), newState, status: 128 };
      }
      const paths = [...rest, ...o.paths];
      if (paths.length && mode !== 'mixed') {
        return { lines: [{ text: `fatal: Cannot do ${mode} reset with paths.`, type: 'error' }], newState, status: 128 };
      }
      if (g.merge && mode === 'soft' && !o.long.has('keep') && !o.long.has('merge')) {
        return fail(128, 'fatal: Cannot do a soft reset in the middle of a merge.');
      }
      if (o.long.has('keep') || o.long.has('merge')) {
        // Without a commit to move to, both keep every file as it is.
        if (target === tip && !paths.length) return { lines: [], newState };
        return notSimulated('git reset --keep / --merge', newState);
      }
      // With paths, only the index changes: HEAD stays where it is.
      const source = target ? commitOf(target).tree ?? {} : {};
      let index: Tree;
      // Paths reset during a merge leave their conflict: the index holds HEAD's version again.
      const touched = new Set<string>();
      if (paths.length) {
        index = { ...repo.index };
        const conflicted: Tree = Object.fromEntries(Object.keys(g.merge?.conflicts ?? {}).map((p) => [p, '']));
        for (const arg of paths) {
          const rel = repoRel(arg) ?? '';
          for (const p of new Set([...under(repo.index, rel), ...under(source, rel), ...under(conflicted, rel)])) {
            touched.add(p);
            if (p in source) index[p] = source[p];
            else delete index[p];
          }
        }
      } else index = mode === 'soft' ? repo.index : { ...source };
      let root = newState.root;
      if (mode === 'hard') {
        for (const p of new Set([...Object.keys(repo.index), ...Object.keys(source), ...Object.keys(g.merge?.conflicts ?? {})])) {
          const content = p in source ? source[p] : null;
          if ((p in repo.work ? repo.work[p] : null) !== content) root = writeFile(root, [...repo.path, ...p.split('/')], content);
        }
      }
      // Moving HEAD (and any reset without paths) ends a merge in progress.
      setGit({
        ...g,
        refs: paths.length || !target ? g.refs : { ...g.refs, [g.branch]: target },
        index,
        merge: paths.length ? resolving(g, touched) : undefined,
      }, root);
      if (quiet || mode === 'soft') return { lines: [], newState };
      if (mode === 'hard') {
        return { lines: target ? [{ text: `HEAD is now at ${short(target)} ${subject(commitOf(target))}`, type: 'output' }] : [], newState };
      }
      const warning: OutputLine[] = paths.length && o.long.has('mixed')
        ? [err("warning: --mixed with paths is deprecated; use 'git reset -- <paths>' instead.")] : [];
      // A path still in conflict shows as U, the others as M or D, in path order.
      const stillUnmerged = newState.git!.merge?.conflicts ?? {};
      const left = [
        ...unstaged(openRepo(newState)).filter((c) => !(c.path in stillUnmerged)).map((c) => ({ path: c.path, code: c.kind === 'deleted' ? 'D' : 'M' })),
        ...Object.keys(stillUnmerged).map((path) => ({ path, code: 'U' })),
      ].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
      if (!left.length) return { lines: warning, newState };
      return {
        lines: [
          ...warning,
          { text: 'Unstaged changes after reset:', type: 'output' },
          ...left.map((c) => ({ text: `${c.code}\t${c.path}`, type: 'output' as const })),
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
      const objects = g.objects!;
      const o = parseOptions(args.slice(1));
      if (['abort', 'continue', 'skip', 'quit'].some((k) => o.long.has(k))) {
        return fail(128, 'error: no cherry-pick or revert in progress', 'fatal: cherry-pick failed');
      }
      if (!o.positional.length) return { lines: CHERRY_PICK_USAGE.map(err), newState, status: 129 };
      if (o.short.size || [...o.long.keys()].length) return notSimulated('Les options de git cherry-pick', newState);
      // The commits to apply, oldest first: `A..B` is those after A up to B.
      const picks: string[] = [];
      for (const arg of o.positional) {
        const range = arg.match(/^(.*?)\.\.([^.].*)$/);
        if (range) {
          const from = rev(range[1] || 'HEAD');
          const to = rev(range[2]);
          if (!from || !to) return fail(128, `fatal: bad revision '${arg}'`);
          const hidden = ancestors(objects, from);
          picks.push(...logOrder(objects, [to]).filter((c) => !hidden.has(c.hash)).reverse().map((c) => c.hash));
          continue;
        }
        const h = rev(arg);
        if (!h) return fail(128, `fatal: bad revision '${arg}'`);
        picks.push(h);
      }
      if (!picks.length) return fail(128, 'fatal: empty commit set passed');
      const merged = picks.find((h) => (commitOf(h).parents?.length ?? 0) > 1);
      if (merged) return fail(128, `error: commit ${merged} is a merge but no -m option was given.`, 'fatal: cherry-pick failed');
      const tip = g.refs![g.branch];
      if (!tip) return notSimulated('git cherry-pick sur une branche sans commit', newState);
      const repo = openRepo(newState);
      if (changes(repo.head, repo.index).length) {
        return fail(128, 'error: your local changes would be overwritten by cherry-pick.', 'hint: commit your changes or stash them to proceed.', 'fatal: cherry-pick failed');
      }

      // Each commit's change (from its parent) is merged into the current files.
      let state = g;
      let current = repo.head;
      const lines: OutputLine[] = [];
      for (const h of picks) {
        const c = commitOf(h);
        const parent = c.parents?.[0] ? commitOf(c.parents[0]).tree ?? {} : {};
        const result = threeWay(parent, current, c.tree ?? {}, `${short(h)} (${subject(c)})`);
        if (Object.keys(result.conflicts).length) return notSimulated('Un conflit pendant git cherry-pick', newState);
        if (!changes(current, result.tree).length) return notSimulated('Un cherry-pick qui ne change rien (commit déjà présent)', newState);
        const localHit = changes(current, result.tree).map((x) => x.path).filter((p) => p in repo.index && repo.work[p] !== repo.index[p]);
        const inTheWay = changes(current, result.tree).map((x) => x.path)
          .filter((p) => !(p in repo.index) && p in repo.work && repo.work[p] !== result.tree[p] && !ignoredBy(repo.rules, p, false));
        const blocked = blockedBy({ local: localHit, inTheWay }, 'merge');
        if (blocked.length) return { lines: [...blocked, err('fatal: cherry-pick failed')], newState, status: 128 };
        const commit = makeCommit(state, newState.user, result.tree, [state.refs![state.branch]], c.message, c);
        lines.push(
          ...result.lines,
          { text: `[${g.branch} ${short(commit.hash)}] ${subject(commit)}`, type: 'success' },
          // The author date is the original commit's.
          { text: ` Date: ${formatGitDate(c.time ?? 0, c.tz ?? 0)}`, type: 'output' },
          ...statBlock(current, result.tree, g.modes ?? {}, true, false),
        );
        state = advance(state, commit);
        current = result.tree;
      }
      const m = moveTo(repo, current);
      setGit({ ...state, index: m.index }, m.root);
      return { lines, newState };
    }

    // ── git rebase ────────────────────────────────────────────────────────────
    case 'rebase': {
      if (!inRepo()) return notARepo();
      const g = newState.git!;
      const objects = g.objects!;
      const o = parseOptions(args.slice(1));
      if (['abort', 'continue', 'skip', 'quit'].some((k) => o.long.has(k))) return fail(128, 'fatal: no rebase in progress');
      const upstream = o.positional[0];
      if (o.short.has('i') || o.long.has('interactive')) {
        if (upstream && !rev(upstream)) return fail(128, `fatal: invalid upstream '${upstream}'`);
        return notSimulated('Le rebase interactif (git rebase -i, qui ouvre un éditeur)', newState);
      }
      if (!upstream) return { lines: NO_TRACKING(g.branch).map((t) => ({ text: t, type: 'output' as const })), newState, status: 1 };
      if (o.long.has('root')) return notSimulated('git rebase --root', newState);
      const onto = rev(upstream);
      if (!onto) return fail(128, `fatal: invalid upstream '${upstream}'`);
      // `git rebase main side` first switches to side, then rebases it.
      const named = o.positional[1];
      if (named !== undefined && !g.refs![named]) {
        if (rev(named)) return notSimulated('git rebase d\'un commit sans branche (HEAD détachée)', newState);
        return fail(128, `fatal: no such branch/commit '${named}'`);
      }
      const branch = named ?? g.branch;
      const tip = g.refs![branch];
      if (!tip) return notSimulated('git rebase sur une branche sans commit', newState);
      const repo = openRepo(newState);
      if (unstaged(repo).length) return fail(1, 'error: cannot rebase: You have unstaged changes.', 'error: Please commit or stash them.');
      if (changes(repo.head, repo.index).length) return fail(1, 'error: cannot rebase: Your index contains uncommitted changes.', 'error: Please commit or stash them.');
      if (isAncestor(objects, onto, tip)) {
        if (branch !== g.branch) {
          const m = moveTo(repo, commitOf(tip).tree ?? {});
          setGit({ ...g, branch, index: m.index }, m.root);
        }
        return { lines: [{ text: `Current branch ${branch} is up to date.`, type: 'output' }], newState };
      }

      // The commits of this branch that `upstream` lacks are replayed on top of it, oldest first.
      let state: GitState = { ...g, branch, refs: { ...g.refs, [branch]: onto } };
      let current = commitOf(onto).tree ?? {};
      if (!isAncestor(objects, tip, onto)) {
        const hidden = ancestors(objects, onto);
        const replay = logOrder(objects, [tip]).filter((c) => !hidden.has(c.hash) && (c.parents?.length ?? 0) < 2).reverse();
        for (const c of replay) {
          const parent = c.parents?.[0] ? commitOf(c.parents[0]).tree ?? {} : {};
          const result = threeWay(parent, current, c.tree ?? {}, `${short(c.hash)} (${subject(c)})`);
          if (Object.keys(result.conflicts).length) return notSimulated('Un conflit pendant git rebase', newState);
          // A change the upstream already has is dropped.
          if (!changes(current, result.tree).length) continue;
          const commit = makeCommit(state, newState.user, result.tree, [state.refs![branch]], c.message, c);
          state = advance(state, commit);
          current = result.tree;
        }
      }
      const m = moveTo(repo, current);
      setGit({ ...state, index: m.index }, m.root);
      return { lines: [{ text: `Successfully rebased and updated refs/heads/${branch}.`, type: 'output' }], newState };
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
