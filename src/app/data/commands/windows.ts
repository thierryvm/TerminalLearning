import type { TerminalState, TerminalEnv, CommandOutput, OutputLine, DirectoryNode } from './types';

export interface WindowsCmdDeps {
  cmdPwd: (state: TerminalState, env: TerminalEnv) => OutputLine[];
  cmdCd: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newCwd?: string[] };
  cmdLs: (state: TerminalState, args: string[]) => OutputLine[];
  cmdCat: (state: TerminalState, args: string[]) => OutputLine[];
  cmdMkdir: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode };
  cmdTouch: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode };
  cmdCp: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode };
  cmdMv: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode };
  cmdRm: (state: TerminalState, args: string[]) => { lines: OutputLine[]; newRoot?: DirectoryNode };
  cmdEcho: (args: string[], envVars?: Record<string, string>) => OutputLine[];
  cmdGrep: (state: TerminalState, args: string[]) => OutputLine[];
  cmdEnv: (state: TerminalState) => OutputLine[];
}

/**
 * Handles PowerShell aliases and Windows/macOS-specific commands.
 * Returns null if the command is not handled by this module (caller falls through to default).
 */
export function handleWindows(
  cmd: string,
  args: string[],
  newState: TerminalState,
  env: TerminalEnv,
  deps: WindowsCmdDeps,
): CommandOutput | null {
  switch (cmd) {
    // ── pwd equivalents ───────────────────────────────────────────────────────
    case 'get-location':
    case 'gl':
      return { lines: deps.cmdPwd(newState, env), newState };

    // ── cd equivalents ────────────────────────────────────────────────────────
    case 'set-location':
    case 'sl': {
      const { lines, newCwd } = deps.cmdCd(newState, args);
      if (newCwd) newState = { ...newState, cwd: newCwd };
      return { lines, newState };
    }

    // ── ls equivalents ────────────────────────────────────────────────────────
    case 'get-childitem':
    case 'gci':
    case 'dir':
      if (args[0]?.toLowerCase() === 'env:') {
        return { lines: deps.cmdEnv(newState), newState };
      }
      return { lines: deps.cmdLs(newState, args), newState };

    // ── cat equivalents ───────────────────────────────────────────────────────
    case 'get-content':
    case 'gc':
      return { lines: deps.cmdCat(newState, args), newState };

    // ── New-Item: file or directory ───────────────────────────────────────────
    case 'new-item':
    case 'ni': {
      const isDir = args.some((a) => a.toLowerCase() === 'directory');
      const nameIdx = args.findIndex((a) => a.toLowerCase() === '-name');
      const pathIdx = args.findIndex((a) => a.toLowerCase() === '-path');
      const name =
        nameIdx >= 0 ? args[nameIdx + 1] :
        pathIdx >= 0 ? args[pathIdx + 1] :
        args.find((a) => !a.startsWith('-'));
      if (!name) return { lines: [{ text: 'New-Item: -Name ou chemin requis', type: 'error' }], newState };
      if (isDir) {
        const { lines, newRoot } = deps.cmdMkdir(newState, [name]);
        if (newRoot) newState = { ...newState, root: newRoot };
        return { lines, newState };
      } else {
        const { lines, newRoot } = deps.cmdTouch(newState, [name]);
        if (newRoot) newState = { ...newState, root: newRoot };
        return { lines, newState };
      }
    }

    // ── cp equivalents ────────────────────────────────────────────────────────
    case 'copy-item':
    case 'cpi':
    case 'copy': {
      const cpArgs = args.filter((a) => !a.startsWith('-'));
      const { lines, newRoot } = deps.cmdCp(newState, cpArgs);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    // ── mv equivalents ────────────────────────────────────────────────────────
    case 'move-item':
    case 'mi':
    case 'move': {
      const mvArgs = args.filter((a) => !a.startsWith('-'));
      const { lines, newRoot } = deps.cmdMv(newState, mvArgs);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    // ── rm equivalents ────────────────────────────────────────────────────────
    case 'remove-item':
    case 'ri':
    case 'del':
    case 'erase': {
      const rmArgs = args.filter((a) => !a.startsWith('-'));
      const { lines, newRoot } = deps.cmdRm(newState, rmArgs);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    // ── echo equivalents ──────────────────────────────────────────────────────
    case 'write-host':
    case 'write-output':
      return { lines: deps.cmdEcho(args.filter((a) => !a.startsWith('-')), newState.envVars), newState };

    // ── ps equivalents ────────────────────────────────────────────────────────
    case 'get-process':
    case 'gps':
      return {
        lines: [
          { text: 'Handles  NPM(K)  PM(K)  WS(K) VM(M)   CPU(s)   Id ProcessName', type: 'output' },
          { text: '-------  ------  -----  ----- -----   ------   -- -----------', type: 'output' },
          { text: '    256      14   4560   8192   120    0.047 1234 WindowsTerminal', type: 'output' },
          { text: '     64       8   2048   4096    80    0.016 2048 node', type: 'output' },
          { text: '     32       4   1024   2048    40    0.003 5678 pwsh', type: 'output' },
        ],
        newState,
      };

    // ── kill equivalents ──────────────────────────────────────────────────────
    case 'stop-process':
    case 'spps':
    case 'taskkill': {
      if (!args.length) return { lines: [{ text: 'Stop-Process: -Id ou -Name requis', type: 'error' }], newState };
      const target = args[args.length - 1];
      return { lines: [{ text: `Processus '${target}' arrêté.`, type: 'success' }], newState };
    }

    // ── grep equivalents ──────────────────────────────────────────────────────
    case 'select-string':
    case 'sls': {
      const patternIdx = args.findIndex((a) => a.toLowerCase() === '-pattern');
      const pathIdx = args.findIndex((a) => a.toLowerCase() === '-path');
      let pattern: string;
      let filePath: string;
      if (patternIdx >= 0) {
        pattern = args[patternIdx + 1] ?? '';
        filePath = pathIdx >= 0 ? args[pathIdx + 1] : (args.find((a, i) => !a.startsWith('-') && i !== patternIdx + 1) ?? '');
      } else {
        const nonFlags = args.filter((a) => !a.startsWith('-'));
        pattern = nonFlags[0] ?? '';
        filePath = nonFlags[1] ?? '';
      }
      return { lines: deps.cmdGrep(newState, [pattern, filePath]), newState };
    }

    // ── clear equivalents ─────────────────────────────────────────────────────
    case 'clear-host':
    case 'cls':
      return { lines: [], clear: true, newState };

    // ── mkdir alias ───────────────────────────────────────────────────────────
    case 'md': {
      const { lines, newRoot } = deps.cmdMkdir(newState, args);
      if (newRoot) newState = { ...newState, root: newRoot };
      return { lines, newState };
    }

    // ── permissions ───────────────────────────────────────────────────────────
    case 'get-acl':
    case 'icacls': {
      if (args.length === 0) return { lines: [{ text: `Usage: ${cmd} fichier`, type: 'error' }], newState };
      const target = args[0];
      return {
        lines: [
          { text: `${target}  NT AUTHORITY\\SYSTEM:(I)(F)`, type: 'output' },
          { text: '      BUILTIN\\Administrators:(I)(F)', type: 'output' },
          { text: `      ${newState.user}:(I)(M)`, type: 'output' },
          { text: '      BUILTIN\\Users:(I)(RX)', type: 'output' },
        ],
        newState,
      };
    }

    case 'takeown': {
      const fileArg = args.find((a) => !a.startsWith('/'));
      return { lines: [{ text: `SUCCESS: The file (or folder): "${fileArg ?? '.'}" now owned by "${newState.user}".`, type: 'success' }], newState };
    }

    // ── jobs equivalents ──────────────────────────────────────────────────────
    case 'get-job':
    case 'receive-job':
    case 'stop-job':
    case 'start-job':
      return {
        lines: [
          { text: 'Id     Name            PSJobTypeName   State         HasMoreData', type: 'output' },
          { text: '--     ----            -------------   -----         -----------', type: 'output' },
          { text: '(aucun job actif dans ce terminal simulé)', type: 'info' },
        ],
        newState,
      };

    // ── macOS-specific ────────────────────────────────────────────────────────
    case 'open': {
      if (!args.length) return { lines: [{ text: 'open: missing argument', type: 'error' }], newState };
      const target = args[args.length - 1];
      return { lines: [{ text: `Ouverture de '${target}'…`, type: 'success' }], newState };
    }

    case 'pbcopy':
      return { lines: [{ text: '[contenu copié dans le presse-papiers]', type: 'success' }], newState };

    case 'pbpaste':
      return { lines: [{ text: '[contenu du presse-papiers]', type: 'output' }], newState };

    case 'brew': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'install' && args[1]) {
        return {
          lines: [
            { text: `==> Fetching ${args[1]}...`, type: 'info' },
            { text: `==> Installing ${args[1]}...`, type: 'info' },
            { text: `✓  ${args[1]} installed successfully`, type: 'success' },
          ],
          newState,
        };
      }
      if (sub === 'update') return { lines: [{ text: '==> Updated Homebrew. Nothing to upgrade.', type: 'success' }], newState };
      if (sub === 'list') return { lines: [{ text: 'git  node  python  wget  curl', type: 'output' }], newState };
      return { lines: [{ text: 'Homebrew — Usage: brew install|update|list', type: 'output' }], newState };
    }

    case 'winget': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'install' && args[1]) {
        return {
          lines: [
            { text: `Found ${args[1]}`, type: 'info' },
            { text: `Downloading ${args[1]}...`, type: 'info' },
            { text: `Successfully installed ${args[1]}`, type: 'success' },
          ],
          newState,
        };
      }
      if (sub === 'list') {
        return {
          lines: [
            { text: 'Name          Id                  Version', type: 'output' },
            { text: 'Git           Git.Git             2.44.0', type: 'output' },
            { text: 'Node.js       OpenJS.NodeJS       20.11.0', type: 'output' },
          ],
          newState,
        };
      }
      return { lines: [{ text: 'winget — Usage: winget install|list', type: 'output' }], newState };
    }

    default:
      return null;
  }
}

export const WINDOWS_COMMANDS = new Set([
  'get-location', 'gl', 'set-location', 'sl',
  'get-childitem', 'gci', 'dir',
  'get-content', 'gc',
  'new-item', 'ni',
  'copy-item', 'cpi', 'copy',
  'move-item', 'mi', 'move',
  'remove-item', 'ri', 'del', 'erase',
  'write-host', 'write-output',
  'get-process', 'gps',
  'stop-process', 'spps', 'taskkill',
  'select-string', 'sls',
  'clear-host', 'cls',
  'md',
  'get-acl', 'icacls', 'takeown',
  'get-job', 'receive-job', 'stop-job', 'start-job',
  'open', 'pbcopy', 'pbpaste', 'brew', 'winget',
]);
