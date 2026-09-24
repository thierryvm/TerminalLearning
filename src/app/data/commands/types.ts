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
  stagedFiles: string[];
  commits: GitCommit[];
  remotes: Record<string, string>;
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
  type: 'output' | 'error' | 'success' | 'info';
}
