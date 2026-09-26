/**
 * Replay of the lesson theory (THI-353), shared by lessonTheory.test.ts and
 * scripts/generate-theory-gaps.ts so the test and the generator can never drift.
 *
 * Every terminal session a lesson shows in a code block is replayed in the
 * engine, from the lesson's own starting state (Exercise.setup), in the
 * environment the learner picked, and compared with the output the lesson shows.
 */
import { curriculum, type EnvId } from '../app/data/curriculum';
import { createInitialState, processCommand, type TerminalState } from '../app/data/terminalEngine';

export const ENVS: EnvId[] = ['linux', 'macos', 'windows'];
/** `user@host:~$ cmd`, `$ cmd`, `% cmd`, `PS> cmd`, `PS C:\…> cmd`. */
export const PROMPT = /^(?:[\w.-]+@[\w.-]+:[^$]*\$|\$|%|PS(?:\s[^>]*)?>)\s+(.+)$/;
/** The lesson shows an error on purpose (and so should the terminal). */
const SHOWS_ERROR = /error|erreur|introuvable|not found|No such|cannot|denied|refus|fatal/i;
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export interface TheoryRow {
  /** `<module>/<lesson> b<block index> [<env>] <command>` */
  key: string;
  ok: boolean;
  /** A Windows learner is shown a bash block (the block has no Windows variant). */
  bashShownOnWindows: boolean;
}

export function replayTheory(): TheoryRow[] {
  const rows: TheoryRow[] = [];
  for (const m of curriculum) {
    for (const l of m.lessons) {
      l.blocks.forEach((b, bi) => {
        if (b.type !== 'code') return;
        for (const env of ENVS) {
          const text = b.contentByEnv?.[env] ?? b.content;
          const lines = text.split('\n');
          if (!lines.some((x) => PROMPT.test(x))) continue; // a file, not a terminal session
          const bashShownOnWindows = env === 'windows' && !b.contentByEnv?.windows && /^\$\s/m.test(b.content);
          let state: TerminalState = l.exercise?.setup ? l.exercise.setup.apply(createInitialState()) : createInitialState();
          for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(PROMPT);
            if (!match) continue;
            const cmd = match[1].replace(/\s+#.*$/, '').trim();
            const expected: string[] = [];
            for (let j = i + 1; j < lines.length && !PROMPT.test(lines[j]); j++) {
              const t = lines[j].trim();
              if (t && !t.startsWith('#') && t !== '...' && t !== '…') expected.push(t);
            }
            const r = processCommand(state, cmd, env);
            state = r.newState;
            const errors = r.lines.filter((x) => x.type === 'error').map((x) => x.text);
            const printed = r.lines
              .filter((x) => x.type !== 'error')
              .flatMap((x) => x.text.split('\n'))
              .map((s) => s.trim())
              .filter(Boolean);
            let ok: boolean;
            if (errors.length && !expected.some((e) => SHOWS_ERROR.test(e))) ok = false;
            else if (!expected.length) ok = true;
            else {
              const actual = printed.concat(errors).map(norm);
              const wanted = expected.map(norm);
              ok = actual.join('\n') === wanted.join('\n')
                || wanted.every((e) => actual.some((a) => a.includes(e) || (e.includes(a) && a.length > 3)));
            }
            rows.push({ key: `${m.id}/${l.id} b${bi} [${env}] ${cmd}`, ok, bashShownOnWindows });
          }
        }
      });
    }
  }
  return rows;
}

/** Keys that fail today (bash shown on Windows is counted separately). */
export function failingKeys(rows: TheoryRow[]): Set<string> {
  return new Set(rows.filter((r) => !r.ok && !r.bashShownOnWindows).map((r) => r.key));
}

/** Lessons whose code blocks show bash to a Windows learner. */
export function bashOnWindowsLessons(rows: TheoryRow[]): Set<string> {
  return new Set(rows.filter((r) => r.bashShownOnWindows).map((r) => r.key.split(' ')[0]));
}
