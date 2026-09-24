/**
 * Theory ↔ terminal (THI-353). Every terminal session a lesson shows in a code
 * block is replayed in the engine, from the lesson's own starting state
 * (Exercise.setup), in the environment the learner picked. The output the
 * lesson displays must be what the terminal prints.
 *
 * Gaps that remain are listed in lessonTheoryGaps.ts — a ratchet: a new gap
 * fails this suite, and a listed gap that gets fixed fails it too until its
 * entry is removed, so the list can only shrink.
 */
import { describe, it, expect } from 'vitest';
import { curriculum, type EnvId } from '../app/data/curriculum';
import { createInitialState, processCommand, type TerminalState } from '../app/data/terminalEngine';
import { KNOWN_THEORY_GAPS, BASH_SHOWN_ON_WINDOWS_MAX } from './lessonTheoryGaps';

const ENVS: EnvId[] = ['linux', 'macos', 'windows'];
/** `user@host:~$ cmd`, `$ cmd`, `% cmd`, `PS> cmd`, `PS C:\…> cmd`. */
const PROMPT = /^(?:[\w.-]+@[\w.-]+:[^$]*\$|\$|%|PS(?:\s[^>]*)?>)\s+(.+)$/;
/** The lesson shows an error on purpose (and so should the terminal). */
const SHOWS_ERROR = /error|erreur|introuvable|not found|No such|cannot|denied|refus|fatal/i;
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

interface Row { key: string; ok: boolean; bashShownOnWindows: boolean }

function replayTheory(): Row[] {
  const rows: Row[] = [];
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

const rows = replayTheory();
const failing = new Set(rows.filter((r) => !r.ok && !r.bashShownOnWindows).map((r) => r.key));

describe('lesson theory ↔ terminal', () => {
  it('replays a meaningful number of theory commands', () => {
    expect(rows.length).toBeGreaterThan(700);
  });

  it('prints what each lesson shows — no new gap', () => {
    const unexpected = [...failing].filter((k) => !KNOWN_THEORY_GAPS.has(k));
    expect(unexpected, 'Fix the engine or the lesson; do not add to lessonTheoryGaps.ts unless the fix is planned').toEqual([]);
  });

  it('the list of known gaps only shrinks', () => {
    const fixed = [...KNOWN_THEORY_GAPS].filter((k) => !failing.has(k));
    expect(fixed, 'These now match: remove them from KNOWN_THEORY_GAPS').toEqual([]);
  });

  it('bash examples shown to Windows learners never increase', () => {
    const lessons = new Set(rows.filter((r) => r.bashShownOnWindows).map((r) => r.key.split(' ')[0]));
    expect(lessons.size, `Now ${lessons.size}: lower BASH_SHOWN_ON_WINDOWS_MAX to it`).toBe(BASH_SHOWN_ON_WINDOWS_MAX);
  });
});
