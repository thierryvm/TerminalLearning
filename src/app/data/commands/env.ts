import type { TerminalState, TerminalEnv, CommandOutput, OutputLine } from './types';

export function cmdExport(args: string[], state: TerminalState): { lines: OutputLine[]; envVars: Record<string, string> } {
  if (args.length === 0) {
    const lines = Object.entries(state.envVars).map(([k, v]) => ({
      text: `declare -x ${k}="${v}"`,
      type: 'output' as const,
    }));
    return { lines, envVars: state.envVars };
  }
  const newEnv = { ...state.envVars };
  const lines: OutputLine[] = [];
  for (const arg of args) {
    const eqIdx = arg.indexOf('=');
    if (eqIdx === -1) {
      lines.push({ text: '', type: 'output' });
    } else {
      const name = arg.slice(0, eqIdx);
      const value = arg.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        lines.push({ text: `export: '${name}': not a valid identifier`, type: 'error' });
      } else {
        newEnv[name] = value;
        lines.push({ text: '', type: 'output' });
      }
    }
  }
  return { lines: lines.filter((l) => l.text !== ''), envVars: newEnv };
}

export function cmdEnv(state: TerminalState): OutputLine[] {
  return Object.entries(state.envVars).map(([k, v]) => ({
    text: `${k}=${v}`,
    type: 'output' as const,
  }));
}

export function cmdPrintenv(args: string[], state: TerminalState): OutputLine[] {
  if (args.length === 0) return cmdEnv(state);
  return args.map((name) => {
    if (Object.prototype.hasOwnProperty.call(state.envVars, name)) {
      return { text: state.envVars[name], type: 'output' as const };
    }
    return { text: '', type: 'error' as const };
  }).filter((l) => l.text !== '');
}

export function cmdSource(args: string[]): OutputLine[] {
  const file = args[0] ?? '(unknown)';
  const display = file.replace('~/', '$HOME/');
  return [{ text: `${display}: loaded`, type: 'success' }];
}

export function cmdCrontab(args: string[]): OutputLine[] {
  if (args.includes('-l')) {
    return [
      { text: '# Crontab — tâches planifiées', type: 'output' },
      { text: '# Format: minute heure jour mois jour_semaine commande', type: 'output' },
      { text: '0 9 * * 1-5 /home/user/projets/script.sh   # Tous les jours de semaine à 9h', type: 'output' },
      { text: '*/30 * * * * /usr/local/bin/backup.sh       # Toutes les 30 minutes', type: 'output' },
    ];
  }
  if (args.includes('-e')) {
    return [{ text: 'crontab: ouverture de l\'éditeur (nano). En mode simulé, utilisez "crontab -l" pour voir les entrées.', type: 'info' }];
  }
  if (args.includes('-r')) {
    return [{ text: 'crontab supprimé.', type: 'success' }];
  }
  return [{ text: 'Usage: crontab [-l] [-e] [-r]', type: 'error' }];
}

export function handleEnv(cmd: string, args: string[], newState: TerminalState, env: TerminalEnv): CommandOutput {
  switch (cmd) {
    case 'export': {
      if (env === 'windows') {
        return { lines: [{ text: 'Utilisez $env:VAR = "value" en PowerShell pour définir une variable.', type: 'info' }], newState };
      }
      const { lines, envVars } = cmdExport(args, newState);
      return { lines, newState: { ...newState, envVars } };
    }

    case 'env':
      return { lines: cmdEnv(newState), newState };

    case 'printenv':
      return { lines: cmdPrintenv(args, newState), newState };

    case 'source':
    case '.':
      return { lines: cmdSource(args), newState };

    case 'crontab':
      return { lines: cmdCrontab(args), newState };

    default:
      return { lines: [{ text: `${cmd}: commande introuvable.`, type: 'error' }], newState };
  }
}

export const ENV_COMMANDS = new Set(['export', 'env', 'printenv', 'source', '.', 'crontab']);
