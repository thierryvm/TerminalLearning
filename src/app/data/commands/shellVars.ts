import type { TerminalEnv } from './types';

/** PATH of the simulated Linux / macOS session. */
export const UNIX_DEFAULT_PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

/** What `$env:PATH` shows on a fresh Windows session (the lessons print this value). */
export const WINDOWS_DEFAULT_PATH = 'C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Git\\bin';

/** Variables every Windows session defines (`$env:USERNAME`, `$env:USERPROFILE`…). */
const WINDOWS_SESSION_VARS: Record<string, string> = {
  USERNAME: 'user',
  USERPROFILE: 'C:\\Users\\user',
  COMPUTERNAME: 'TERMINAL-LAB',
  OS: 'Windows_NT',
};

/**
 * The variables as the given shell shows them. The session keeps one set of
 * variables; under PowerShell an untouched PATH reads as a Windows PATH and the
 * Windows session variables are present. A variable the learner set wins.
 * Never written back to the state: switching environment keeps each view.
 */
export function varsForEnv(vars: Record<string, string>, env: TerminalEnv): Record<string, string> {
  if (env !== 'windows') return vars;
  const shown = { ...WINDOWS_SESSION_VARS, ...vars };
  if (vars.PATH === UNIX_DEFAULT_PATH) shown.PATH = WINDOWS_DEFAULT_PATH;
  return shown;
}
