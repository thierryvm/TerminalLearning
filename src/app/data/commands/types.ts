// Shared types for the terminal engine and command modules.
// terminalEngine.ts re-exports all of these for backward compatibility.

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

export interface GitCommit {
  /** 40 hex digits (7 in states written by hand); git shows the first 7. */
  hash: string;
  message: string;
  author: string;
  date: string;
  /** Files recorded by the commit (path relative to the repository → content). */
  tree?: Record<string, string>;
  /** Parent commits: none for the first commit, two for a merge. */
  parents?: string[];
  /** Author date: seconds since the epoch, and the UTC offset in minutes. */
  time?: number;
  tz?: number;
  /** Committer date, when it differs from the author date (a cherry-pick keeps the author's). */
  committed?: number;
}

/** A merge that stopped on conflicts, until `git commit` or `git merge --abort`. */
export interface GitMergeState {
  /** The commit being merged (MERGE_HEAD) and the name the learner typed. */
  head: string;
  name: string;
  /** The message `git commit` proposes: `Merge branch 'x'`. */
  message: string;
  /** Unresolved paths, with the version of each side (null = absent). */
  conflicts: Record<string, { base: string | null; ours: string | null; theirs: string | null }>;
}

/** A `git stash` entry: tracked files as they were (null = deleted) and the files that were newly staged. */
export interface GitStashEntry {
  message: string;
  work: Record<string, string | null>;
  newFiles: Record<string, string>;
  /** Files of HEAD when the entry was made: `pop` applies only what differs from them. */
  base?: Record<string, string>;
}

/**
 * In-memory git state for the terminal simulator.
 * Tracks repo initialization, branches, staging area, history, and remotes.
 * Intentionally simplified — models the concepts taught in Modules 9 & 10.
 */
export interface GitState {
  initialized: boolean;
  /** The branch HEAD points to. */
  branch: string;
  /** Branch names, sorted as `git branch` lists them. Kept in sync with `refs`. */
  branches: string[];
  /** Paths a commit would record: where the index differs from HEAD. Kept in sync with `index`. */
  stagedFiles: string[];
  /** History of HEAD in `git log` order. Kept in sync with `objects` and `refs`. */
  commits: GitCommit[];
  /** Every commit, by hash. */
  objects?: Record<string, GitCommit>;
  /** Each branch and the commit it points to. A branch without commits has no entry. */
  refs?: Record<string, string>;
  /** Tags and the commit each one names. */
  tags?: Record<string, string>;
  /** Remote-tracking branches (`origin/main`) and their commit, as the last push or fetch left them. */
  remoteRefs?: Record<string, string>;
  /** The branch each local branch tracks (`main` → `origin/main`), set by `push -u`, `clone`, `branch -u`. */
  upstream?: Record<string, string>;
  /** Each remote's default branch, as `clone` records it (`origin/HEAD -> origin/main`). */
  remoteHead?: Record<string, string>;
  /** Annotated tags: their message, date and object id (`git tag -a`). */
  tagNotes?: Record<string, { message: string; time: number; tz: number; id: string }>;
  /** The branch before the last switch, for `git switch -`. */
  previousBranch?: string;
  merge?: GitMergeState;
  remotes: Record<string, string>;
  /** Absolute path of the working tree, where `git init` ran. */
  repoPath?: string[];
  /** Files of the last commit (path relative to the repository → content). */
  head?: Record<string, string>;
  /** The index (staging area): what the next commit will record. */
  index?: Record<string, string>;
  /** Git file mode of each path ever staged (`100755` for an executable), kept for its deletion. */
  modes?: Record<string, string>;
  stash?: GitStashEntry[];
}

export interface TerminalState {
  root: DirectoryNode;
  cwd: string[];
  /** Directory before the last `cd` ($OLDPWD), for `cd -`. */
  previousCwd?: string[];
  commandHistory: string[];
  /** sudo already asked for the password in this session (its credential cache). */
  sudoAuthenticated?: boolean;
  user: string;
  hostname: string;
  envVars: Record<string, string>;
  git?: GitState;
  /** PowerShell execution policy set by Set-ExecutionPolicy (absent = Windows default, Restricted). */
  executionPolicy?: string;
}

export interface CommandOutput {
  lines: OutputLine[];
  clear?: boolean;
  newState: TerminalState;
  /**
   * Exit code, for commands that can fail without printing an error
   * (`grep` without a match exits 1). When absent, a command fails if it
   * printed an error line.
   */
  status?: number;
}

export interface OutputLine {
  text: string;
  /** `removed` is standard output that git shows in red (a deleted line in a diff, a change not staged yet). */
  type: 'output' | 'error' | 'success' | 'info' | 'removed';
}
