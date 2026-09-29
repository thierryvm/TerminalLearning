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
  hash: string;
  message: string;
  author: string;
  date: string;
  /** Files recorded by the commit (path relative to the repository → content). */
  tree?: Record<string, string>;
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
  branch: string;
  branches: string[];
  /** Paths a commit would record: where the index differs from HEAD. Kept in sync with `index`. */
  stagedFiles: string[];
  commits: GitCommit[];
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
