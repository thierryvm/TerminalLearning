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
import type { DirectoryNode, FSNode, GitCommit, GitState, TerminalState } from './commands/types';

export interface LessonSetup {
  /** Pure: returns a new state, never mutates the one it receives. */
  apply: (state: TerminalState) => TerminalState;
  /** Shown in the welcome message, e.g. "Dépôt Git prêt dans ~/projets". */
  note: string;
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

function withGit(state: TerminalState, git: Partial<GitState>): TerminalState {
  return {
    ...state,
    cwd: PROJECT_DIR,
    git: {
      initialized: true,
      branch: 'main',
      branches: ['main'],
      stagedFiles: [],
      commits: [],
      remotes: {},
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
  apply: (s) => withGit(s, {}),
  note: 'Dépôt Git prêt dans ~/projets (initialisé, aucun commit).',
};

/** A repository with one commit on `main`. */
export const gitRepoWithCommit: LessonSetup = {
  apply: (s) => withGit(s, { commits: [INITIAL_COMMIT] }),
  note: 'Dépôt Git prêt dans ~/projets (branche main, 1 commit).',
};

/** A repository whose `main` has one commit and an extra branch to merge. */
export function gitRepoWithBranch(branch: string): LessonSetup {
  return {
    apply: (s) => withGit(s, { commits: [INITIAL_COMMIT], branches: ['main', branch] }),
    note: `Dépôt Git prêt dans ~/projets (vous êtes sur main, la branche ${branch} existe).`,
  };
}

/** A repository with one commit and an `origin` remote. */
export const gitRepoWithRemote: LessonSetup = {
  apply: (s) =>
    withGit(s, {
      commits: [INITIAL_COMMIT],
      remotes: { origin: 'https://github.com/user/mon-projet.git' },
    }),
  note: 'Dépôt Git prêt dans ~/projets (1 commit, remote origin configuré).',
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
