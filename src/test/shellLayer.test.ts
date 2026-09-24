import { describe, it, expect } from 'vitest';
import { createInitialState, processCommand } from '../app/data/terminalEngine';
import { parseCommandLine } from '../app/data/commands/shellSyntax';
import type { TerminalEnv, TerminalState, OutputLine } from '../app/data/commands/types';

function run(env: TerminalEnv, ...cmds: string[]): { state: TerminalState; last: OutputLine[] } {
  let state = createInitialState();
  let last: OutputLine[] = [];
  for (const c of cmds) {
    const r = processCommand(state, c, env);
    state = r.newState;
    last = r.lines;
  }
  return { state, last };
}

/** File content as the learner would read it back. */
function cat(state: TerminalState, file: string, env: TerminalEnv = 'linux'): string {
  return processCommand(state, `cat ${file}`, env).lines.map((l) => l.text).join('\n');
}

const text = (lines: OutputLine[]) => lines.map((l) => l.text).join('\n');
const errors = (lines: OutputLine[]) => lines.filter((l) => l.type === 'error');
/** What a real `ls` writes into a pipe or a file: one plain name per line. */
const entries = (env: TerminalEnv) => text(run(env, env === 'windows' ? 'Get-ChildItem' : 'ls').last)
  .split(/\s+/).filter(Boolean).map((n) => n.replace(/\/$/, ''));

describe('shell syntax — parseCommandLine', () => {
  it('quotes protect the pipe and redirection characters', () => {
    const r = parseCommandLine('grep "a|b" f > "x > y.txt"', 'linux');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.list).toHaveLength(1);
    expect(r.list[0].stages).toHaveLength(1);
    expect(r.list[0].stages[0].text).toBe('grep "a|b" f');
    expect(r.list[0].stages[0].redirects).toEqual([{ kind: 'file', fd: 1, append: false, target: 'x > y.txt' }]);
  });

  it('keeps redirections in the order they are written', () => {
    const r = parseCommandLine('cmd > out.txt 2>&1', 'linux');
    expect(r.ok && r.list[0].stages[0].redirects).toEqual([
      { kind: 'file', fd: 1, append: false, target: 'out.txt' },
      { kind: 'dup', fd: 2, to: 1 },
    ]);
  });

  it('splits lists and pipelines', () => {
    const r = parseCommandLine('mkdir d && cd d; ls | wc -l || echo ko', 'linux');
    expect(r.ok && r.list.map((i) => [i.op, i.stages.map((s) => s.text)])).toEqual([
      [null, ['mkdir d']],
      ['&&', ['cd d']],
      [';', ['ls', 'wc -l']],
      ['||', ['echo ko']],
    ]);
  });

  it('an escaped semicolon is part of the word (find -exec … \\;)', () => {
    const r = parseCommandLine('find . -name x -exec rm {} \\;', 'linux');
    expect(r.ok && r.list).toHaveLength(1);
  });

  it('a PowerShell path keeps its backslashes', () => {
    const r = parseCommandLine('.\\script.sh | grep ok', 'windows');
    expect(r.ok && r.list[0].stages.map((s) => s.text)).toEqual(['.\\script.sh', 'grep ok']);
  });

  it.each([['ls |'], ['| ls'], ['ls >'], ['ls &&'], ['echo "abc']])('rejects %s', (line) => {
    expect(parseCommandLine(line, 'linux').ok).toBe(false);
  });

  it('accepts a trailing semicolon', () => {
    expect(parseCommandLine('ls;', 'linux').ok).toBe(true);
  });
});

describe('redirections — standard output', () => {
  it('> sends any command output to the file, nothing on screen', () => {
    const listing = entries('linux').join('\n');
    const { state, last } = run('linux', 'ls > liste.txt');
    expect(last).toEqual([]);
    expect(cat(state, 'liste.txt')).toBe(listing);
  });

  it('>> appends', () => {
    // `ls d` rather than `pwd`: pwd prints `~` today, a separate THI-353 gap.
    const { state } = run('linux', 'mkdir d', 'touch d/x', 'echo un > f.txt', 'echo deux >> f.txt', 'ls d >> f.txt');
    expect(cat(state, 'f.txt')).toBe('un\ndeux\nx');
  });

  it('echo > still writes exactly what it wrote before', () => {
    const { state } = run('linux', 'echo "Bonjour le monde!" > bonjour.txt');
    expect(cat(state, 'bonjour.txt')).toBe('Bonjour le monde!');
  });

  it('a script\'s output can be redirected', () => {
    const { state, last } = run('linux', 'echo "echo depuis le script" > s.sh', 'bash s.sh > out.txt');
    expect(last).toEqual([]);
    expect(cat(state, 'out.txt')).toBe('depuis le script');
  });

  it('writing into a missing directory is an error and runs nothing', () => {
    const { state, last } = run('linux', 'mkdir -p x', 'echo a > dossier-absent/f.txt');
    expect(text(errors(last))).toContain('dossier-absent/f.txt: No such file or directory');
    expect(text(run('linux', 'ls dossier-absent').last)).toContain('No such file or directory');
    expect(state).toBeDefined();
  });

  it('< reads standard input from a file', () => {
    const { last } = run('linux', 'echo a > f.txt', 'echo b >> f.txt', 'wc -l < f.txt');
    expect(text(last)).toBe('2');
  });
});

describe('redirections — standard error', () => {
  it('2> captures the error message in the file, the screen stays clean', () => {
    const { state, last } = run('linux', 'ls fichier-inexistant 2> erreurs.txt');
    expect(last).toEqual([]);
    expect(cat(state, 'erreurs.txt')).toContain("ls: cannot access 'fichier-inexistant': No such file or directory");
  });

  it('2> creates an empty file when there is no error, and output still shows', () => {
    const { state, last } = run('linux', 'mkdir d', 'touch d/x', 'ls d 2> erreurs.txt');
    expect(text(last)).toBe('x');
    expect(cat(state, 'erreurs.txt')).toBe('');
  });

  it('2>/dev/null silences the error and creates no file', () => {
    const { state, last } = run('linux', 'ls absent 2>/dev/null');
    expect(last).toEqual([]);
    expect(text(processCommand(state, 'ls /dev', 'linux').lines)).not.toContain('null');
  });

  it('> file 2>&1 puts both streams in the file', () => {
    const { state, last } = run('linux', 'ls absent > tout.txt 2>&1');
    expect(last).toEqual([]);
    expect(cat(state, 'tout.txt')).toContain('cannot access');
  });

  it('2>&1 > file keeps the error on screen (order matters, like bash)', () => {
    const { state, last } = run('linux', 'ls absent 2>&1 > tout.txt');
    expect(text(errors(last))).toContain('cannot access');
    expect(cat(state, 'tout.txt')).toBe('');
  });

  it('&> sends both streams to the file', () => {
    const { state, last } = run('linux', 'ls absent &> tout.txt');
    expect(last).toEqual([]);
    expect(cat(state, 'tout.txt')).toContain('cannot access');
  });

  it('2>&1 lets an error travel through a pipe', () => {
    const { last } = run('linux', 'ls absent 2>&1 | grep cannot');
    expect(last.map((l) => l.type)).toEqual(['output']);
    expect(text(last)).toContain('cannot access');
  });
});

describe('pipelines', () => {
  it('ls | wc -l counts the entries', () => {
    const n = entries('linux').length;
    expect(text(run('linux', 'ls | wc -l').last)).toBe(String(n));
  });

  it('ls writes columns on screen, one name per line into a pipe or a file, and with -1', () => {
    expect(run('linux', 'ls').last).toHaveLength(1);
    expect(text(run('linux', 'ls -1').last)).toBe(['documents/', 'downloads/', 'projets/'].join('\n'));
    expect(text(run('linux', 'ls | cat').last)).toBe('documents\ndownloads\nprojets');
  });

  it('runs more than two stages', () => {
    const { last } = run('linux', 'echo "pomme" > f.txt', 'echo "poire" >> f.txt', 'echo "kiwi" >> f.txt', 'cat f.txt | grep p | wc -l');
    expect(text(last)).toBe('2');
  });

  it('a quoted pipe is a character, not a pipe', () => {
    const { last } = run('linux', 'echo "a|b" > f.txt', 'grep "a|b" f.txt');
    expect(text(last)).toBe('a|b');
  });

  it('tee shows the output AND writes the file', () => {
    const listing = entries('linux').join('\n');
    const { state, last } = run('linux', 'ls | tee ma-liste.txt');
    expect(text(last)).toBe(listing);
    expect(cat(state, 'ma-liste.txt')).toBe(listing);
  });

  it('tee -a appends', () => {
    const { state } = run('linux', 'echo un | tee f.txt', 'echo deux | tee -a f.txt');
    expect(cat(state, 'f.txt')).toBe('un\ndeux');
  });

  it('errors of the left side stay on screen, the pipe only carries output', () => {
    const { last } = run('linux', 'ls absent | wc -l');
    expect(text(errors(last))).toContain('cannot access');
    expect(last.filter((l) => l.type === 'output').map((l) => l.text)).toEqual(['0']);
  });

  it('sort -r, head -n, tail and uniq read the pipe', () => {
    const { last } = run('linux', 'echo b > f', 'echo a >> f', 'echo b >> f', 'echo c >> f', 'cat f | sort | uniq | sort -r | head -n 2');
    expect(text(last)).toBe('c\nb');
    expect(text(run('linux', 'echo 1 > f', 'echo 2 >> f', 'echo 3 >> f', 'cat f | tail -1').last)).toBe('3');
  });

  it('grep -v and grep -c on a pipe', () => {
    const base = ['echo alpha > f', 'echo beta >> f', 'echo gamma >> f'];
    expect(text(run('linux', ...base, 'cat f | grep -v beta').last)).toBe('alpha\ngamma');
    expect(text(run('linux', ...base, 'cat f | grep -c a').last)).toBe('3');
  });

  it('records the whole line once in the history', () => {
    const { state } = run('linux', 'ls | wc -l', 'echo a && echo b');
    expect(state.commandHistory.slice(-2)).toEqual(['ls | wc -l', 'echo a && echo b']);
  });
});

describe('command lists', () => {
  it('&& runs the next command only on success', () => {
    const ok = run('linux', 'mkdir projet && cd projet && pwd');
    expect(text(ok.last)).toMatch(/\/projet$/);
    expect(ok.state.cwd).toEqual(['home', 'user', 'projet']);
    expect(text(run('linux', 'ls absent && echo suite').last)).not.toContain('suite');
  });

  it('|| runs the next command only on failure', () => {
    expect(text(run('linux', 'ls absent || echo repli').last)).toContain('repli');
    expect(text(run('linux', 'pwd || echo repli').last)).not.toContain('repli');
  });

  it('; always runs the next command', () => {
    expect(text(run('linux', 'ls absent; echo toujours').last)).toContain('toujours');
  });

  it('chmod +x script.sh && ./script.sh (the pattern the lessons cite)', () => {
    // The simulator confirms chmod on screen (a real chmod is silent), then the script runs.
    const { last } = run('linux', 'echo "echo lancé" > s.sh', 'chmod +x s.sh && ./s.sh');
    expect(errors(last)).toEqual([]);
    expect(last[last.length - 1].text).toBe('lancé');
  });

  it('a syntax error is reported, nothing runs', () => {
    const { state, last } = run('linux', 'mkdir a |');
    expect(text(errors(last))).toContain('syntax error');
    expect(text(processCommand(state, 'ls a', 'linux').lines)).toContain('No such file or directory');
  });
});

describe('PowerShell — redirections and pipeline cmdlets', () => {
  it('Get-Item on a missing path is an error; 2> captures it', () => {
    const shown = run('windows', 'Get-Item fichier-inexistant').last;
    expect(text(errors(shown))).toContain("Cannot find path");
    const { state, last } = run('windows', 'Get-Item fichier-inexistant 2> erreurs.txt');
    expect(last).toEqual([]);
    expect(cat(state, 'erreurs.txt', 'windows')).toContain('Cannot find path');
  });

  it('Get-Item on an existing path shows it', () => {
    const { last } = run('windows', 'Get-Item documents');
    expect(errors(last)).toEqual([]);
    expect(text(last)).toContain('documents');
  });

  it('2>$null silences the error', () => {
    expect(run('windows', 'Get-Item absent 2>$null').last).toEqual([]);
  });

  it('Write-Output > file writes the text, not the operator', () => {
    const { state, last } = run('windows', 'Write-Output "Bonjour le monde!" > bonjour.txt');
    expect(last).toEqual([]);
    expect(cat(state, 'bonjour.txt', 'windows')).toBe('Bonjour le monde!');
  });

  it('Tee-Object -FilePath shows and writes', () => {
    const listing = entries('windows').join('\n');
    const { state, last } = run('windows', 'Get-ChildItem | Tee-Object -FilePath ma-liste.txt');
    expect(text(last)).toBe(listing);
    expect(cat(state, 'ma-liste.txt', 'windows')).toBe(listing);
  });

  it('Measure-Object counts the items', () => {
    const n = entries('windows').length;
    expect(text(run('windows', 'Get-ChildItem | Measure-Object').last)).toContain(`Count    : ${n}`);
  });

  it('Select-Object -First keeps the first lines', () => {
    const { last } = run('windows', 'echo a > f.txt', 'echo b >> f.txt', 'echo c >> f.txt', 'Get-Content f.txt | Select-Object -First 2');
    expect(text(last)).toBe('a\nb');
  });

  it('Out-File writes without printing; Out-Null prints nothing', () => {
    const { state, last } = run('windows', 'Get-Location | Out-File ici.txt');
    expect(last).toEqual([]);
    expect(cat(state, 'ici.txt', 'windows')).toContain('Users');
    expect(run('windows', 'Get-ChildItem | Out-Null').last).toEqual([]);
  });

  it('Get-Process node | Stop-Process stops it without an error', () => {
    expect(errors(run('windows', 'Get-Process node | Stop-Process').last)).toEqual([]);
  });
});
