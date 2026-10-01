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
import { dotGit, syncGit } from './commands/git';
import { fileMode, nodeAt, readTree, type Tree } from './commands/gitTree';

export interface LessonSetup {
  /** Pure: returns a new state, never mutates the one it receives. */
  apply: (state: TerminalState, env?: TerminalEnv) => TerminalState;
  /** Shown in the welcome message, e.g. "Dépôt Git prêt dans ~/projets". Empty = no line. */
  note: string;
  /** Per-environment override of `note`, like `instructionByEnv` on an exercise. */
  noteByEnv?: Partial<Record<'linux' | 'macos' | 'windows', string>>;
}

/// Fixed hashes and dates keep the prepared history deterministic (tests, and
// the same screen for every learner). The lessons quote these hashes
// (`git show a3f8c12`, `Updating a3f8c12..b7e2d45`).
const INITIAL_HASH = 'a3f8c129e4b7d60c1f25a8e3b9d47f0c6a1e582d';
const BRANCH_HASH = 'b7e2d451c8f3a90e6d2b47c5f18a3e9d0b6c742e';
const MAIN_HASH = 'c9f1e347a2d5b8e0f3c6a91d4e7b2c5f8a0d3e6b';
const INITIAL_MESSAGE = 'feat: premier commit du projet';

/** 15 January 2026, 10:00 in Brussels (UTC+1): the first commit of every prepared repository. */
const T0 = 1768467600;
const DAY = 86400;
const BRUSSELS_WINTER = 60;

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
  const first: GitCommit = {
    hash: INITIAL_HASH, message: INITIAL_MESSAGE, author: 'user', date: '2026-01-15', tree: head, parents: [], time: T0, tz: BRUSSELS_WINTER,
  };
  return {
    ...state,
    root,
    cwd: PROJECT_DIR,
    git: syncGit({
      initialized: true,
      branch: 'main',
      branches: ['main'],
      stagedFiles: [],
      commits: [],
      remotes: {},
      repoPath: PROJECT_DIR,
      head,
      index: { ...head },
      modes,
      objects: committed ? { [INITIAL_HASH]: first } : {},
      refs: committed ? { main: INITIAL_HASH } : {},
      ...git,
    }),
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

/**
 * A commit on `branch` (created from the current branch if needed) that
 * changes `files` (content as git sees it, final newline included). When the
 * branch is checked out, its files are written to ~/projets too.
 */
function commitOn(state: TerminalState, branch: string, c: { hash: string; message: string; time: number; files: Tree }): TerminalState {
  const g = state.git!;
  const parent = g.refs![branch] ?? g.refs![g.branch];
  const tree = { ...g.objects![parent].tree, ...c.files };
  const commit: GitCommit = {
    hash: c.hash, message: c.message, author: 'user', date: new Date(c.time * 1000).toISOString().slice(0, 10), tree, parents: [parent], time: c.time, tz: BRUSSELS_WINTER,
  };
  let root = state.root;
  if (branch === g.branch) {
    for (const [path, content] of Object.entries(c.files)) {
      root = withNode(root, [...PROJECT_DIR, ...path.split('/')], file(content.replace(/\n$/, ''), '-rw-r--r--'));
    }
  }
  const modes = { ...g.modes, ...Object.fromEntries(Object.keys(c.files).map((p) => [p, g.modes?.[p] ?? '100644'])) };
  const index = branch === g.branch ? { ...tree } : g.index;
  return {
    ...state,
    root,
    git: syncGit({ ...g, objects: { ...g.objects, [c.hash]: commit }, refs: { ...g.refs, [branch]: c.hash }, modes, index }),
  };
}

/** `feature/ma-feature` → `ma-feature`: the name a branch's work is about. */
const topic = (branch: string) => branch.slice(branch.lastIndexOf('/') + 1);

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

/**
 * `main` checked out, and `branch` one commit ahead of it (a new page): the
 * merge is a fast-forward, or a merge commit with `--no-ff`.
 */
export function gitRepoWithBranch(branch: string): LessonSetup {
  const page = `${topic(branch)}.html`;
  return {
    apply: (s, env = 'linux') => commitOn(withGit(s, env, {}, true), branch, {
      hash: BRANCH_HASH,
      message: `feat(${topic(branch)}): ajoute la page ${page}`,
      time: T0 + DAY + 4.5 * 3600,
      files: { [page]: `<h2>${topic(branch)}</h2>\n` },
    }),
    note: `Dépôt Git prêt dans ~/projets (vous êtes sur main ; la branche ${branch} a un commit d'avance).`,
  };
}

/**
 * `main` and `branch` both changed the `<title>` of index.html since they
 * split: merging `branch` stops on a real conflict.
 */
export function gitRepoWithConflict(branch: string): LessonSetup {
  const withTitle = (title: string) => `${INDEX_HTML.replace('<title>Mon App</title>', `<title>${title}</title>`)}\n`;
  return {
    apply: (s, env = 'linux') => {
      const base = withGit(s, env, {}, true);
      const onBranch = commitOn(base, branch, {
        hash: BRANCH_HASH,
        message: `feat(${topic(branch)}): nouveau titre de la page`,
        time: T0 + DAY + 4.5 * 3600,
        files: { 'index.html': withTitle(`${topic(branch)} — Mon App`) },
      });
      return commitOn(onBranch, 'main', {
        hash: MAIN_HASH,
        message: 'feat: passe le titre en v2',
        time: T0 + 2 * DAY + 2 * 3600,
        files: { 'index.html': withTitle('Mon App v2') },
      });
    },
    note: `Dépôt Git prêt dans ~/projets (vous êtes sur main ; main et ${branch} ont chacune changé le titre de index.html).`,
  };
}

const REMOTE_URL = 'https://github.com/user/mon-projet.git';
const COLLEAGUE_HASH = 'e5d1a8c3f7b29e04d6a3c81f5b7e2d90c4a6f13b';

/** `main` pushed with `git push -u origin main`: on GitHub, tracked, nothing new on either side. */
export const gitRepoPushed: LessonSetup = {
  apply: (s, env = 'linux') => withGit(s, env, {
    remotes: { origin: REMOTE_URL },
    remoteRefs: { 'origin/main': INITIAL_HASH },
    upstream: { main: 'origin/main' },
  }, true),
  note: 'Dépôt Git prêt dans ~/projets (main envoyée sur GitHub et suivie).',
};

/**
 * `main` pushed with `git push -u origin main`; since then a colleague pushed
 * a commit to GitHub (an Installation section in README.md) that this
 * repository has not fetched. As in real git: `git status` still says up to
 * date, `git fetch` brings the commit, `git pull` fast-forwards, and a push
 * before that is rejected with "fetch first".
 */
export const gitRepoBehindRemote: LessonSetup = {
  apply: (s, env = 'linux') => {
    const base = gitRepoPushed.apply(s, env);
    const g = base.git!;
    const first = g.objects![INITIAL_HASH];
    const readme = first.tree?.['README.md'] ?? '';
    const commit: GitCommit = {
      hash: COLLEAGUE_HASH,
      message: 'docs: ajoute la section Installation au README',
      author: 'alice',
      date: '2026-01-16',
      tree: { ...first.tree, 'README.md': `${readme}\n## Installation\n\nnpm install\n` },
      parents: [INITIAL_HASH],
      time: T0 + DAY + 3 * 3600,
      tz: BRUSSELS_WINTER,
    };
    return {
      ...base,
      git: syncGit({ ...g, objects: { ...g.objects, [COLLEAGUE_HASH]: commit }, remoteServer: { 'origin/main': COLLEAGUE_HASH } }),
    };
  },
  note: 'Dépôt Git prêt dans ~/projets (main envoyée sur GitHub et suivie ; depuis, une collègue a poussé un commit).',
};

/**
 * A GitHub Actions workflow, as checked on 1 October 2026: actions/checkout
 * v7 is the current major. It runs the repository's own script, so it would
 * pass on GitHub as it is.
 */
const CI_WORKFLOW = 'name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\n\njobs:\n  verifier:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v7\n      - run: bash script.sh';

/**
 * `main` pushed and tracked, and a workflow written at the root of ~/projets
 * (`ci.yml`, not tracked yet): GitHub only runs it from `.github/workflows/`.
 */
export const gitRepoWithWorkflow: LessonSetup = {
  apply: (s, env = 'linux') => {
    const state = gitRepoPushed.apply(s, env);
    return { ...state, root: withNode(state.root, [...PROJECT_DIR, 'ci.yml'], file(CI_WORKFLOW, '-rw-r--r--')) };
  },
  note: 'Dépôt Git prêt dans ~/projets (main envoyée sur GitHub et suivie ; un workflow ci.yml attend à la racine, pas encore suivi).',
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
