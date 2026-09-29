import type { TerminalState, TerminalEnv, CommandOutput, OutputLine, GitCommit, DirectoryNode, FSNode } from './types';

// Local copies of tiny helpers needed by git add — avoids circular import with terminalEngine.
function displayPath(cwd: string[]): string {
  if (cwd.length === 0) return '/';
  return '/' + cwd.join('/');
}

/** Git for Windows writes `C:/Users/user/…` (drive letter, forward slashes). */
function gitPath(cwd: string[], env: TerminalEnv): string {
  if (env !== 'windows') return displayPath(cwd);
  return ['C:', ...(cwd[0] === 'home' ? ['Users', ...cwd.slice(1)] : cwd)].join('/');
}

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

function makeHash(): string {
  return Array.from({ length: 7 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
}

/**
 * The message of `git commit`, in every form git accepts: `-m msg`, `-mmsg`,
 * `-am msg` (short options bundled, m last), `--message=msg`, `--message msg`.
 */
function commitMessage(args: string[]): string {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--message') return args[i + 1] ?? '';
    if (a.startsWith('--message=')) return a.slice('--message='.length);
    if (/^-[a-zA-Z]*m/.test(a)) {
      const attached = a.slice(a.indexOf('m') + 1);
      return attached || (args[i + 1] ?? '');
    }
  }
  return '';
}

export function handleGit(newState: TerminalState, args: string[], env: TerminalEnv): CommandOutput {
  const sub = args[0]?.toLowerCase() ?? '';

  const requireRepo = (): OutputLine | null => {
    if (!newState.git?.initialized) {
      return { text: "fatal: not a git repository (or any parent up to mount point /)\nHint: Run 'git init' to create a new repository.", type: 'error' };
    }
    return null;
  };

  switch (sub) {
    // ── git init ──────────────────────────────────────────────────────────────
    case 'init': {
      if (newState.git?.initialized) {
        return {
          lines: [{ text: `Reinitialized existing Git repository in ${gitPath(newState.cwd, env)}/.git/`, type: 'info' }],
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
          { text: `Initialized empty Git repository in ${gitPath(newState.cwd, env)}/.git/`, type: 'success' },
          { text: "Hint: Use 'git add <file>' to stage files, 'git commit -m' to record changes.", type: 'info' },
        ],
        newState,
      };
    }

    // ── git status ────────────────────────────────────────────────────────────
    case 'status': {
      const repoErr = requireRepo();
      if (repoErr) return { lines: [repoErr], newState };
      const g = newState.git!;
      const lines: OutputLine[] = [{ text: `On branch ${g.branch}`, type: 'output' }];
      if (g.commits.length === 0) lines.push({ text: 'No commits yet', type: 'output' });
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

    // ── git add ───────────────────────────────────────────────────────────────
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
        const cwdNode = getNode(newState.root, newState.cwd);
        filesToStage = cwdNode?.type === 'directory'
          ? Object.keys(cwdNode.children).filter((n) => !n.startsWith('.') && !g.stagedFiles.includes(n))
          : [];
      } else {
        filesToStage = [target].filter((f) => !g.stagedFiles.includes(f));
      }
      if (filesToStage.length === 0) {
        return { lines: [{ text: `'${target}' already staged or no files to add.`, type: 'info' }], newState };
      }
      newState = { ...newState, git: { ...g, stagedFiles: [...g.stagedFiles, ...filesToStage] } };
      return {
        lines: filesToStage.map((f) => ({ text: `staged: ${f}`, type: 'success' as const })),
        newState,
      };
    }

    // ── git restore ───────────────────────────────────────────────────────────
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

    // ── git commit ────────────────────────────────────────────────────────────
    case 'commit': {
      const repoErr = requireRepo();
      if (repoErr) return { lines: [repoErr], newState };
      const g = newState.git!;
      const message = commitMessage(args);
      if (!message) {
        return { lines: [{ text: 'Abort: empty commit message.\nUsage: git commit -m "your message"', type: 'error' }], newState };
      }
      if (g.stagedFiles.length === 0) {
        // Git prints the short status and fails (exit 1) when nothing is staged.
        const text = g.commits.length > 0
          ? [`On branch ${g.branch}`, 'nothing to commit, working tree clean']
          : [`On branch ${g.branch}`, '', 'Initial commit', '', 'nothing to commit (create/copy files and use "git add" to track)'];
        return { lines: text.map((t) => ({ text: t, type: 'output' as const })), newState, status: 1 };
      }
      const hash = makeHash();
      const commit: GitCommit = { hash, message, author: newState.user, date: new Date().toISOString().slice(0, 10) };
      const fileCount = g.stagedFiles.length;
      newState = { ...newState, git: { ...g, commits: [commit, ...g.commits], stagedFiles: [] } };
      return {
        lines: [
          { text: `[${g.branch} ${hash}] ${message}`, type: 'success' },
          { text: ` ${fileCount} file${fileCount !== 1 ? 's' : ''} changed`, type: 'output' },
        ],
        newState,
      };
    }

    // ── git log ───────────────────────────────────────────────────────────────
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

    // ── git diff ──────────────────────────────────────────────────────────────
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

    // ── git branch ────────────────────────────────────────────────────────────
    case 'branch': {
      const repoErr = requireRepo();
      if (repoErr) return { lines: [repoErr], newState };
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
        newState = { ...newState, git: { ...g, branches: g.branches.filter((b) => b !== branchName) } };
        return { lines: [{ text: `Deleted branch ${branchName}.`, type: 'success' }], newState };
      }
      if (branchName) {
        if (g.branches.includes(branchName)) {
          return { lines: [{ text: `fatal: A branch named '${branchName}' already exists.`, type: 'error' }], newState };
        }
        newState = { ...newState, git: { ...g, branches: [...g.branches, branchName] } };
        return { lines: [{ text: `Branch '${branchName}' created.`, type: 'success' }], newState };
      }
      return { lines: [{ text: 'Usage: git branch [<branch-name>] [-d <branch>]', type: 'error' }], newState };
    }

    // ── git checkout ──────────────────────────────────────────────────────────
    case 'checkout': {
      const repoErr = requireRepo();
      if (repoErr) return { lines: [repoErr], newState };
      const g = newState.git!;
      const createFlag = args.includes('-b') || args.includes('-B');
      const branchName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
      if (!branchName) return { lines: [{ text: 'Usage: git checkout [-b] <branch>', type: 'error' }], newState };
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
      if (branchName === g.branch) return { lines: [{ text: `Already on '${branchName}'`, type: 'info' }], newState };
      newState = { ...newState, git: { ...g, branch: branchName } };
      return { lines: [{ text: `Switched to branch '${branchName}'`, type: 'success' }], newState };
    }

    // ── git switch ────────────────────────────────────────────────────────────
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

    // ── git merge ─────────────────────────────────────────────────────────────
    case 'merge': {
      const repoErr = requireRepo();
      if (repoErr) return { lines: [repoErr], newState };
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

    // ── git remote ────────────────────────────────────────────────────────────
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

    // ── git push ──────────────────────────────────────────────────────────────
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

    // ── git pull ──────────────────────────────────────────────────────────────
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

    // ── git fetch ─────────────────────────────────────────────────────────────
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

    // ── git clone ─────────────────────────────────────────────────────────────
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

    // ── git stash ─────────────────────────────────────────────────────────────
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

    // ── git tag ───────────────────────────────────────────────────────────────
    case 'tag': {
      const repoErr = requireRepo();
      if (repoErr) return { lines: [repoErr], newState };
      const tagName = args.find((a) => !a.startsWith('-') && a !== sub) ?? '';
      if (!tagName) return { lines: [{ text: 'Usage: git tag <tagname>', type: 'error' }], newState };
      const g = newState.git!;
      if (g.commits.length === 0) return { lines: [{ text: 'fatal: No commits to tag.', type: 'error' }], newState };
      return { lines: [{ text: `Tag '${tagName}' created at ${g.commits[0].hash}`, type: 'success' }], newState };
    }

    // ── git show ──────────────────────────────────────────────────────────────
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

    // ── git reset ─────────────────────────────────────────────────────────────
    case 'reset': {
      const repoErr = requireRepo();
      if (repoErr) return { lines: [repoErr], newState };
      const g = newState.git!;
      const hard = args.includes('--hard');
      newState = { ...newState, git: { ...g, stagedFiles: [] } };
      return {
        lines: [{ text: hard ? 'HEAD is now at (hard reset simulated). Working tree clean.' : 'Unstaged all changes (simulated).', type: 'info' }],
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
      const repoErr = requireRepo();
      if (repoErr) return { lines: [repoErr], newState };
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
        commits = [{ hash, message: source.message, author: newState.user, date: new Date().toISOString().slice(0, 10) }, ...commits];
        lines.push({ text: `[${g.branch} ${hash}] ${source.message}`, type: 'success' });
        lines.push({ text: ` (cherry-pické depuis ${source.hash} — le commit est ré-appliqué sur ${g.branch})`, type: 'info' });
      }
      newState = { ...newState, git: { ...g, commits } };
      return { lines, newState };
    }

    // ── git rebase ────────────────────────────────────────────────────────────
    case 'rebase': {
      const repoErr = requireRepo();
      if (repoErr) return { lines: [repoErr], newState };
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
          { text: '  commit    Enregistrer les modifications indexées', type: 'output' },
          { text: '  status    Afficher l\'état du répertoire de travail', type: 'output' },
          { text: '  log       Afficher l\'historique des commits', type: 'output' },
          { text: '  diff      Comparer les modifications', type: 'output' },
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
        lines: [{ text: `git: '${sub}' is not a git command. See 'git help'.`, type: 'error' }],
        newState,
      };
  }
}
