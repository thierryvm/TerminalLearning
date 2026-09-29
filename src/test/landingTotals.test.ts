import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TOTAL_LESSONS,
  TOTAL_COMMANDS,
  ACTIVE_ENVIRONMENTS_COUNT,
  MODULE_PREVIEWS,
  ENV_LEVELS,
  ROADMAP_AVAILABLE,
} from '../app/data/landingContent';
import { createInitialState, processCommand } from '../app/data/terminalEngine';
import type { SelectedEnvironment } from '../app/context/EnvironmentContext';
import { curriculum } from '../app/data/curriculum';
import { exerciseTexts } from '../app/data/exerciseSteps';
import { commandCatalogue } from '../app/data/commandCatalogue';
import { ENVIRONMENTS } from '../app/types/curriculum';

// THI-118 — these constants are hardcoded in `landingContent.ts` so the
// landing chunk does not import `curriculum.ts` / `commandCatalogue.ts`
// (~41 kB gzip). If you add lessons / commands / environments, bump the
// constants. This test fails loudly if they drift.
describe('landingContent — totals drift guard (THI-118)', () => {
  it('TOTAL_LESSONS matches the actual curriculum', () => {
    const computed = curriculum.reduce((sum, mod) => sum + mod.lessons.length, 0);
    expect(TOTAL_LESSONS).toBe(computed);
  });

  it('TOTAL_COMMANDS matches the actual command catalogue', () => {
    const computed = commandCatalogue.reduce(
      (sum, cat) => sum + cat.commands.length,
      0,
    );
    expect(TOTAL_COMMANDS).toBe(computed);
  });

  it('ACTIVE_ENVIRONMENTS_COUNT matches active env list', () => {
    const computed = ENVIRONMENTS.filter((e) => e.status === 'active').length;
    expect(ACTIVE_ENVIRONMENTS_COUNT).toBe(computed);
  });

  // Per-module guard — the landing module CARDS use MODULE_PREVIEWS[].lessonCount,
  // a separate hardcoded array from TOTAL_LESSONS. The hero (TOTAL_LESSONS) was
  // correct (65) but a card (github-collaboration) under-reported (6 vs real 7),
  // so the cards summed to 64 while the hero said 65 — a visible inconsistency a
  // visitor could spot. This guard ties EACH card count to the real curriculum
  // module so a per-module drift fails CI (closes the gap the TOTAL_LESSONS
  // check above did not cover).
  it('every MODULE_PREVIEWS.lessonCount matches its curriculum module', () => {
    for (const preview of MODULE_PREVIEWS) {
      const mod = curriculum.find((m) => m.id === preview.id);
      expect(mod, `MODULE_PREVIEWS id "${preview.id}" has no matching curriculum module`).toBeDefined();
      expect(
        preview.lessonCount,
        `MODULE_PREVIEWS "${preview.id}" lessonCount=${preview.lessonCount} but curriculum has ${mod!.lessons.length}`,
      ).toBe(mod!.lessons.length);
    }
  });

  it('MODULE_PREVIEWS covers every curriculum module (no missing/extra card)', () => {
    const previewIds = MODULE_PREVIEWS.map((p) => p.id).sort();
    const curriculumIds = curriculum.map((m) => m.id).sort();
    expect(previewIds).toEqual(curriculumIds);
  });

  it('sum of MODULE_PREVIEWS.lessonCount equals TOTAL_LESSONS (hero = cards)', () => {
    const cardsSum = MODULE_PREVIEWS.reduce((sum, p) => sum + p.lessonCount, 0);
    expect(cardsSum).toBe(TOTAL_LESSONS);
  });

  // index.html carries hardcoded counts in the FAQ JSON-LD ("66 leçons",
  // "Plus de 75 commandes") that are NOT generated from TOTAL_LESSONS /
  // TOTAL_COMMANDS — they would drift silently (Sourcery PR #340). Rather than
  // wire HTML templating into the build, this guard ties the static FAQ numbers
  // to the canonical constants so CI fails loudly if they diverge.
  describe('index.html FAQ counts stay in sync with constants', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');

    it('FAQ "Plus de N commandes" matches TOTAL_COMMANDS', () => {
      const m = html.match(/Plus de (\d+) commandes/);
      expect(m, 'FAQ command-count sentence not found in index.html').not.toBeNull();
      expect(Number(m![1])).toBe(TOTAL_COMMANDS);
    });

    it('FAQ "N leçons" matches TOTAL_LESSONS', () => {
      const m = html.match(/propose (\d+) leçons/);
      expect(m, 'FAQ lesson-count sentence not found in index.html').not.toBeNull();
      expect(Number(m![1])).toBe(TOTAL_LESSONS);
    });
  });
});

// The hero lists commands per environment and level. Until 29 September 2026 it
// promised 22 commands the terminal did not know (systemctl, launchctl,
// Get-Service, New-PSDrive…) and 4 no lesson taught: a visitor who typed one got "commande
// introuvable". Every command shown must run in that environment and be taught.
describe('landingContent — the commands the hero promises exist', () => {
  /** What a learner of `env` reads in code blocks and exercises: the commands a lesson teaches. */
  const taughtIn = (env: SelectedEnvironment) => curriculum.flatMap((m) => m.lessons.flatMap((l) => [
    ...l.blocks.filter((b) => b.type === 'code').map((b) => b.contentByEnv?.[env] ?? b.content),
    ...(l.exercise ? exerciseTexts(l.exercise, env) : []),
  ])).join('\n');
  /** The whole command as a word of its own: `top` does not count inside `stop`, nor `env` inside `environment`. */
  const asWord = (command: string) => new RegExp(`(^|[^\\w-])${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w-])`, 'm');
  for (const [env, levels] of Object.entries(ENV_LEVELS) as Array<[SelectedEnvironment, (typeof ENV_LEVELS)[SelectedEnvironment]]>) {
    for (const level of levels) {
      it(`${env} level ${level.level}: every command runs and is taught`, () => {
        const taught = taughtIn(env);
        for (const command of level.commands.filter((c) => !['|', '>', '>>'].includes(c))) {
          const out = processCommand(createInitialState(), command, env).lines.map((l) => l.text).join('\n');
          expect(out, `${env}: ${command}`).not.toMatch(/commande introuvable|n'est pas reconnu|n'est pas simulée?/);
          expect(asWord(command).test(taught), `${env}: ${command} is in no lesson`).toBe(true);
        }
      });
    }
  }

  it('the module section names as many levels as the modules use', () => {
    const landing = readFileSync(resolve(process.cwd(), 'src/app/components/Landing.tsx'), 'utf-8');
    const words = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept'];
    const said = landing.match(/— (\p{L}+) niveaux/u);
    expect(said, 'the "N niveaux" subtitle was not found in Landing.tsx').not.toBeNull();
    expect(words.indexOf(said![1])).toBe(Math.max(...MODULE_PREVIEWS.map((m) => m.level ?? 1)));
  });

  it('the roadmap counts the modules there are', () => {
    expect(ROADMAP_AVAILABLE.flatMap((g) => g.items).some((item) => item.startsWith(`${MODULE_PREVIEWS.length} modules`))).toBe(true);
  });
});
