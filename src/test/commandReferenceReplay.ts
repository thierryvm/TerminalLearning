/**
 * Replays every /app/reference example through the terminal engine (shared by
 * commandReference.test.ts and ad-hoc checks). Same idea as lessonTheoryReplay:
 * what the reference tells a learner to type must work in the practice terminal,
 * or be listed as a known gap.
 */
import { commandCatalogue } from '../app/data/commandCatalogue';
import { createInitialState, processCommand } from '../app/data/terminalEngine';
import { gitRepoWithChange, gitRepoWithCommit } from '../app/data/lessonSetup';
import { syncGit } from '../app/data/commands/git';
import { writeFile, type Tree } from '../app/data/commands/gitTree';
import type { GitCommit, TerminalState } from '../app/data/commands/types';
import type { EnvironmentId } from '../app/types/curriculum';

export const REFERENCE_ENVS = ['linux', 'macos', 'windows'] as const;
export type ReferenceEnv = (typeof REFERENCE_ENVS)[number];

/**
 * Git examples run in the repository they describe: an `origin` remote, a
 * main branch with history enough for `git rebase -i HEAD~3`, and a
 * feature/login branch that holds the commits the cherry-pick examples name
 * (a1b2c3d, e4f5a6b). The examples about local changes (add, commit, diff,
 * status) start with README.md modified; the others from a clean tree.
 */
const GIT_CATEGORIES = new Set(['git', 'github-collaboration']);
const WITH_CHANGE = new Set(['git_add', 'git_commit', 'git_diff', 'git_status']);

/** Commits added to the prepared repository: [hash, message, parent (`main` = the first commit), files]. */
const HISTORY: Array<[string, string, string, Tree]> = [
  ['c7d8e9f04b61a2d93e5c7f18b0a4d6e2c9f13b57', 'docs: ajoute le guide', 'main', { 'docs/guide.md': '# Guide\n' }],
  ['d5e6f7a82c93b4e05f1a6d7c8b9e0f2a3c4d5e6f', 'chore: ajoute la licence', 'c7d8e9f04b61a2d93e5c7f18b0a4d6e2c9f13b57', { LICENSE: 'MIT\n' }],
  ['f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4', 'style: ajoute la feuille de style', 'd5e6f7a82c93b4e05f1a6d7c8b9e0f2a3c4d5e6f', { 'style.css': 'body { margin: 0; }\n' }],
  ['a1b2c3d9f0e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4', 'feat: ajoute la page contact', 'main', { 'contact.html': '<h1>Contact</h1>\n' }],
  ['b3c4d5e6f7a8091b2c3d4e5f6a7b8c9d0e1f2a3b', 'feat: ajoute la page de connexion', 'a1b2c3d9f0e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4', { 'login.html': '<form></form>\n' }],
  ['e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3', 'fix: corrige le formulaire de contact', 'b3c4d5e6f7a8091b2c3d4e5f6a7b8c9d0e1f2a3b', { 'contact.html': '<h1>Contact</h1>\n<form></form>\n' }],
];

function startState(categoryId: string, commandId: string): TerminalState {
  const base = createInitialState();
  if (!GIT_CATEGORIES.has(categoryId)) return base;
  const repo = (WITH_CHANGE.has(commandId) ? gitRepoWithChange : gitRepoWithCommit).apply(base);
  const g = repo.git;
  if (!g?.objects || !g.refs?.main) throw new Error('the lesson setups must create a repository with a commit');
  const objects: Record<string, GitCommit> = { ...g.objects };
  let time = 1768900000;
  for (const [hash, message, from, files] of HISTORY) {
    const parent = from === 'main' ? g.refs.main : from;
    time += 3600;
    objects[hash] = { hash, message, author: 'user', date: '2026-01-20', tree: { ...objects[parent].tree, ...files }, parents: [parent], time, tz: 60 };
  }
  const main = HISTORY[2][0];
  // The files main adds are on disk and in the index, as after a checkout.
  let root = repo.root;
  const added: Tree = {};
  for (const [, , , files] of HISTORY.slice(0, 3)) Object.assign(added, files);
  for (const [path, content] of Object.entries(added)) root = writeFile(root, [...g.repoPath!, ...path.split('/')], content);
  const modes = { ...g.modes, ...Object.fromEntries(HISTORY.flatMap(([, , , files]) => Object.keys(files)).map((p) => [p, '100644'])) };
  return {
    ...repo,
    root,
    git: syncGit({
      ...g,
      objects,
      refs: { main, 'feature/login': HISTORY[5][0] },
      remotes: { origin: 'https://github.com/user/mon-projet.git' },
      remoteRefs: { 'origin/main': main },
      index: { ...g.index, ...added },
      modes,
    }),
  };
}
export interface ReplayedExample {
  /** `<command id> [<env>] <example>` — stable key for the known-gaps list. */
  key: string;
  commandId: string;
  env: ReferenceEnv;
  command: string;
  errors: string[];
}

/** Examples of each command run in order, from a fresh state per command and environment. */
export function replayReference(): ReplayedExample[] {
  const rows: ReplayedExample[] = [];
  for (const category of commandCatalogue) {
    for (const cmd of category.commands) {
      for (const env of REFERENCE_ENVS) {
        if (!cmd.compatibility.includes(env as EnvironmentId)) continue;
        let state = startState(category.id, cmd.id);
        for (const ex of cmd.examples) {
          if (ex.environments && !ex.environments.includes(env)) continue;
          const result = processCommand(state, ex.command, env);
          state = result.newState;
          rows.push({
            key: `${cmd.id} [${env}] ${ex.command}`,
            commandId: cmd.id,
            env,
            command: ex.command,
            errors: result.lines.filter((l) => l.type === 'error').map((l) => l.text),
          });
        }
      }
    }
  }
  return rows;
}
