import { describe, it, expect } from 'vitest';
import {
  TOTAL_LESSONS,
  TOTAL_COMMANDS,
  ACTIVE_ENVIRONMENTS_COUNT,
} from '../app/data/landingContent';
import { curriculum } from '../app/data/curriculum';
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
});
