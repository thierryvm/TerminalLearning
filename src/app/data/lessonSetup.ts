/**
 * Lesson setups — the terminal state a lesson starts from.
 *
 * Every lesson mounts a fresh terminal (`createInitialState`). That is right for
 * most lessons, but wrong for the ones that teach a command which only makes
 * sense in a prepared context: `git status` needs a repository, `git merge
 * feature/x` needs a branch called `feature/x`, `ls -la ~/.ssh` needs a `.ssh`
 * directory. Without a setup the learner typed exactly what the lesson asked,
 * got `fatal: not a git repository` in red, and was still told "Exercice
 * complété" — the validator only reads the command string (check-up W4b,
 * 23 September 2026: 33 of the 46 desyncs were Git lessons).
 *
 * A setup is a pure function of the initial state, plus a one-line note shown
 * in the terminal welcome message so the learner knows what is already there.
 */
import type { DirectoryNode, FSNode, GitCommit, GitState, TerminalEnv, TerminalState } from './commands/types';
import { dotGit } from './commands/git';
import { fileMode, nodeAt, readTree, type Tree } from './commands/gitTree';

export interface LessonSetup {
  /** Pure: returns a new state, never mutates the one it receives. */
  apply: (state: TerminalState, env?: TerminalEnv) => TerminalState;
  /** Shown in the welcome message, e.g. "Dépôt Git prêt dans ~/projets". Empty = no line. */
  note: string;
  /** Per-environment override of `note`, like `instructionByEnv` on an exercise. */
  noteByEnv?: Partial<Record<'linux' | 'macos' | 'windows', string>>;
}

// Fixed hashes and dates keep the prepared history deterministic (tests, and
// the same screen for every learner).
const INITIAL_COMMIT: GitCommit = {
  hash: 'a3f8c12',
  message: 'feat: premier commit du projet',
  author: 'user',
  date: '2026-01-15',
};

const PROJECT_DIR = ['home', 'user', 'projets'];

/** Keeps `.env` (the fake secrets of ~/projets) out of every prepared repository. */
const GITIGNORE = '# Secrets : jamais dans Git\n.env';

/** The page the merge and conflict lessons talk about (`<title>Mon App</title>`). */
const INDEX_HTML = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <title>Mon App</title>\n</head>\n<body>\n  <h1>Mon App</h1>\n</body>\n</html>';

/**
 * ~/projets as a repository: `.git/` and a `.gitignore`, and, when `committed`,
 * a first commit that holds every file (so `git status` starts clean).
 */
function withGit(state: TerminalState, env: TerminalEnv, git: Partial<GitState>, committed: boolean): TerminalState {
  let root = withNode(state.root, [...PROJECT_DIR, '.gitignore'], file(GITIGNORE, '-rw-r--r--'));
  root = withNode(root, [...PROJECT_DIR, 'index.html'], file(INDEX_HTML, '-rw-r--r--'));
  root = withNode(root, [...PROJECT_DIR, '.git'], dotGit(env));
  const files = readTree(root, PROJECT_DIR);
  const head: Tree = {};
  if (committed) {
    for (const [path, content] of Object.entries(files)) if (path !== '.env') head[path] = content;
  }
  // Modes read now: a lesson may delete script.sh before its first git command.
  const modes = Object.fromEntries(Object.keys(files)
    .map((path) => [path, fileMode(nodeAt(root, [...PROJECT_DIR, ...path.split('/')]), env)]));
  const commits = committed ? [{ ...INITIAL_COMMIT, tree: head }] : [];
  return {
    ...state,
    root,
    cwd: PROJECT_DIR,
    git: {
      initialized: true,
      branch: 'main',
      branches: ['main'],
      stagedFiles: [],
      commits,
      remotes: {},
      repoPath: PROJECT_DIR,
      head,
      index: { ...head },
      modes,
      ...git,
    },
  };
}

/** Returns a copy of `root` with `node` placed at `path` (parents must exist). */
function withNode(root: DirectoryNode, path: string[], node: FSNode): DirectoryNode {
  const [head, ...rest] = path;
  if (rest.length === 0) return { ...root, children: { ...root.children, [head]: node } };
  const child = root.children[head];
  if (!child || child.type !== 'directory') return root;
  return { ...root, children: { ...root.children, [head]: withNode(child, rest, node) } };
}

function file(content: string, permissions: string): FSNode {
  return { type: 'file', content, permissions, owner: 'user', group: 'user', size: content.length };
}

/** A fresh repository: nothing committed yet, files ready to be staged. */
export const gitRepoEmpty: LessonSetup = {
  apply: (s, env = 'linux') => withGit(s, env, {}, false),
  note: 'Dépôt Git prêt dans ~/projets (initialisé, aucun commit ; un .gitignore protège déjà .env).',
};

/** A repository with one commit on `main`. */
export const gitRepoWithCommit: LessonSetup = {
  apply: (s, env = 'linux') => withGit(s, env, {}, true),
  note: 'Dépôt Git prêt dans ~/projets (branche main, 1 commit).',
};

/** One commit, then a line of README.md changed and not staged: `git diff` has something to show. */
export const gitRepoWithChange: LessonSetup = {
  apply: (s, env = 'linux') => {
    const state = withGit(s, env, {}, true);
    const node = nodeAt(state.root, [...PROJECT_DIR, 'README.md']);
    const readme = node?.type === 'file' ? node.content : '';
    const edited = readme.replace('Bienvenue dans mon répertoire de projets.', 'Bienvenue dans mon répertoire de projets Git.');
    return { ...state, root: withNode(state.root, [...PROJECT_DIR, 'README.md'], file(edited, '-rw-r--r--')) };
  },
  note: 'Dépôt Git prêt dans ~/projets (1 commit, puis une ligne de README.md modifiée).',
};

/** A repository whose `main` has one commit and an extra branch to merge. */
export function gitRepoWithBranch(branch: string): LessonSetup {
  return {
    apply: (s, env = 'linux') => withGit(s, env, { branches: ['main', branch] }, true),
    note: `Dépôt Git prêt dans ~/projets (vous êtes sur main, la branche ${branch} existe).`,
  };
}

/** A repository with one commit and an `origin` remote. */
export const gitRepoWithRemote: LessonSetup = {
  apply: (s, env = 'linux') => withGit(s, env, { remotes: { origin: 'https://github.com/user/mon-projet.git' } }, true),
  note: 'Dépôt Git prêt dans ~/projets (1 commit, remote origin configuré).',
};

/**
 * The PowerShell profile that `$PROFILE` points to (see terminalEngine), so
 * `cat $PROFILE` shows a real profile instead of "file not found". It lives in
 * ~/documents, the simulated C:\Users\user\Documents; on Linux and macOS it is
 * just a folder the lesson never mentions.
 */
export const powershellProfile: LessonSetup = {
  apply: (s) => ({
    ...s,
    root: withNode(s.root, ['home', 'user', 'documents', 'PowerShell'], {
      type: 'directory',
      permissions: 'drwxr-xr-x',
      owner: 'user',
      group: 'user',
      children: {
        'Microsoft.PowerShell_profile.ps1': file(
          '# Profil PowerShell — chargé à chaque ouverture de PowerShell\nSet-Alias ll Get-ChildItem\n$env:EDITOR = "code"\nfunction gs { git status }',
          '-rw-r--r--',
        ),
      },
    }),
  }),
  note: '',
  noteByEnv: { windows: 'Votre profil PowerShell ($PROFILE) existe déjà.' },
};

/** A `~/.ssh` directory with the permissions a correct setup has (700 / 600 / 644). */
export const sshDirectory: LessonSetup = {
  apply: (s) => ({
    ...s,
    root: withNode(s.root, ['home', 'user', '.ssh'], {
      type: 'directory',
      permissions: 'drwx------',
      owner: 'user',
      group: 'user',
      children: {
        // Deliberately not shaped like a key: secret scanners flag the PEM header even on a fake.
        id_ed25519: file('(clé privée simulée — une vraie clé ne se partage et ne s\'affiche jamais)', '-rw-------'),
        'id_ed25519.pub': file('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAISimulatedKeyOnly user@terminal-lab', '-rw-r--r--'),
        known_hosts: file('github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAISimulatedHostKey', '-rw-r--r--'),
      },
    }),
  }),
  note: 'Un dossier ~/.ssh (simulé) contient une paire de clés.',
};
