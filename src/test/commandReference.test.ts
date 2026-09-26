/**
 * /app/reference examples (commandExamples.ts): consistent with the catalogue,
 * and runnable in the practice terminal. The replay found 224 of 464 examples
 * printing an error (26 September 2026): made-up file names, comments inside the
 * command, bash shown to Windows learners. Remaining gaps are listed in
 * commandReferenceGaps.ts and may only shrink.
 */
import { describe, it, expect } from 'vitest';
import { commandCatalogue } from '../app/data/commandCatalogue';
import { COMMAND_EXAMPLES, NOT_SIMULATED } from '../app/data/commandExamples';
import { REFERENCE_ENVS, replayReference } from './commandReferenceReplay';
import { KNOWN_REFERENCE_GAPS } from './commandReferenceGaps';

const commands = commandCatalogue.flatMap((c) => c.commands);
const ids = new Set(commands.map((c) => c.id));

describe('reference examples — data', () => {
  it('every catalogue command has explained examples, and every entry belongs to a command', () => {
    expect(commands.length).toBeGreaterThan(70);
    for (const cmd of commands) expect(COMMAND_EXAMPLES[cmd.id], cmd.id).toBeDefined();
    for (const id of Object.keys(COMMAND_EXAMPLES)) expect(ids.has(id), `orphan examples: ${id}`).toBe(true);
  });

  it('each OS a command supports shows at least one example', () => {
    for (const cmd of commands) {
      for (const env of REFERENCE_ENVS) {
        if (!cmd.compatibility.includes(env)) continue;
        const shown = cmd.examples.filter((ex) => !ex.environments || ex.environments.includes(env));
        expect(shown.length, `${cmd.id} shows no example on ${env}`).toBeGreaterThan(0);
      }
    }
  });

  it('examples only target OSes the command supports, and every one is explained', () => {
    for (const cmd of commands) {
      for (const ex of cmd.examples) {
        expect(ex.command.trim(), cmd.id).toBe(ex.command);
        expect(ex.command.length, cmd.id).toBeGreaterThan(0);
        expect(ex.explanation.length, `${cmd.id}: ${ex.command}`).toBeGreaterThan(10);
        for (const env of ex.environments ?? []) {
          expect(cmd.compatibility, `${cmd.id}: ${ex.command} targets ${env}`).toContain(env);
        }
      }
    }
  });

  it('an example is a command, not a command followed by a comment', () => {
    // The old catalogue had "tree /F  (Windows : …)" and "… 2>/dev/null  # ignorer":
    // a learner copying them typed the comment too. Notes belong in `explanation`.
    for (const cmd of commands) {
      for (const ex of cmd.examples) {
        expect(ex.command, cmd.id).not.toMatch(/\s#\s|\s{2,}\(/);
      }
    }
  });

  it('NOT_SIMULATED names real commands and OSes they support', () => {
    for (const [id, envs] of Object.entries(NOT_SIMULATED)) {
      const cmd = commands.find((c) => c.id === id);
      expect(cmd, id).toBeDefined();
      for (const env of envs) expect(cmd!.compatibility, `${id} ${env}`).toContain(env);
      expect(cmd!.notSimulatedOn).toEqual(envs);
    }
  });
});

describe('reference examples — replayed in the practice terminal', () => {
  const rows = replayReference();
  const failing = new Set(
    rows.filter((r) => r.errors.length > 0 && !NOT_SIMULATED[r.commandId]?.includes(r.env)).map((r) => r.key),
  );

  it('replays every shown example', () => {
    expect(rows.length).toBeGreaterThan(300);
  });

  it('no new example prints an error', () => {
    const added = [...failing].filter((k) => !KNOWN_REFERENCE_GAPS.has(k));
    expect(added, 'new failing examples — fix them, or the engine').toEqual([]);
  });

  it('fixed gaps are removed from the list (it may only shrink)', () => {
    const fixed = [...KNOWN_REFERENCE_GAPS].filter((k) => !failing.has(k));
    expect(fixed, 'these now pass — delete them from commandReferenceGaps.ts').toEqual([]);
  });
});
