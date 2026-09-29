/**
 * Replays every /app/reference example through the terminal engine (shared by
 * commandReference.test.ts and ad-hoc checks). Same idea as lessonTheoryReplay:
 * what the reference tells a learner to type must work in the practice terminal,
 * or be listed as a known gap.
 */
import { commandCatalogue } from '../app/data/commandCatalogue';
import { createInitialState, processCommand } from '../app/data/terminalEngine';
import { gitRepoWithRemote } from '../app/data/lessonSetup';
import type { TerminalState } from '../app/data/commands/types';
import type { EnvironmentId } from '../app/types/curriculum';

export const REFERENCE_ENVS = ['linux', 'macos', 'windows'] as const;
export type ReferenceEnv = (typeof REFERENCE_ENVS)[number];

/**
 * Git examples run in the repository they describe: an `origin` remote, a
 * feature/login branch, and a history deep enough for `git rebase -i HEAD~3`
 * that holds the commits the cherry-pick examples name (a1b2c3d, e4f5a6b).
 */
const GIT_CATEGORIES = new Set(['git', 'github-collaboration']);

const HISTORY = [
  { hash: 'e4f5a6b', message: 'fix: corrige le formulaire de contact' },
  { hash: 'c7d8e9f', message: 'docs: complète le README' },
  { hash: 'a1b2c3d', message: 'feat: ajoute la page contact' },
];

function startState(categoryId: string): TerminalState {
  const base = createInitialState();
  if (!GIT_CATEGORIES.has(categoryId)) return base;
  const repo = gitRepoWithRemote.apply(base);
  if (!repo.git) throw new Error('gitRepoWithRemote must create a repository');
  const commits = [...HISTORY.map((c) => ({ ...c, author: 'user', date: '2026-01-20' })), ...repo.git.commits];
  return { ...repo, git: { ...repo.git, commits, branches: [...repo.git.branches, 'feature/login'] } };
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
        let state = startState(category.id);
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
