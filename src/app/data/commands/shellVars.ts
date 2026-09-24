import type { TerminalEnv } from './types';

/** PATH of the simulated Linux / macOS session. */
export const UNIX_DEFAULT_PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

/** What `$env:PATH` shows on a fresh Windows session (the lessons print this value). */
export const WINDOWS_DEFAULT_PATH = 'C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Git\\bin';

/**
 * The variables as the given shell shows them. The session keeps one set of
 * variables; an untouched PATH reads as a Windows PATH under PowerShell.
 * Never written back to the state: switching environment keeps each view.
 */
export function varsForEnv(vars: Record<string, string>, env: TerminalEnv): Record<string, string> {
  if (env === 'windows' && vars.PATH === UNIX_DEFAULT_PATH) return { ...vars, PATH: WINDOWS_DEFAULT_PATH };
  return vars;
}
