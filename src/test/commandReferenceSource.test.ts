import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getCommandById, commandCatalogue } from '../app/data/commandCatalogue';

/**
 * Anti-regression guard for the References page unification (Option A, 31/05/2026).
 *
 * Before this chantier, /app/reference rendered from a SECOND hardcoded command
 * list inside `CommandReference.tsx` (44 entries) while `commandCatalogue.ts`
 * (the canonical source) had a different 38. The two could — and did — drift.
 *
 * These tests lock in the unification:
 *  1. STRUCTURAL — `CommandReference.tsx` must consume the catalogue and must
 *     NOT reintroduce a local command array / `CommandEntry` interface.
 *  2. DATA — every command historically visible on /app/reference must still
 *     exist in the catalogue (no command silently lost in the migration).
 */

const componentSource = readFileSync(
  resolve(process.cwd(), 'src/app/components/CommandReference.tsx'),
  'utf-8',
);

describe('CommandReference — single source of truth (catalogue)', () => {
  it('imports the canonical commandCatalogue', () => {
    expect(componentSource).toMatch(/import\s*\{\s*commandCatalogue\s*\}\s*from\s*['"]\.\.\/data\/commandCatalogue['"]/);
  });

  it('does NOT redeclare a local command array (the old divergent source)', () => {
    expect(componentSource).not.toMatch(/const\s+commands\s*:/);
    expect(componentSource).not.toMatch(/interface\s+CommandEntry/);
  });

  it('SEO meta description uses TOTAL_COMMANDS, not a hardcoded count (no drift)', () => {
    // PR #340 bumped 59→75 but the SEO description string lagged at "59 commandes"
    // (caught by code-review). The description must be templated from the constant.
    expect(componentSource).toMatch(/\$\{TOTAL_COMMANDS\}\s*commandes/);
    expect(componentSource, 'SEO description must not hardcode a command count').not.toMatch(
      /\b\d+\s+commandes\b/,
    );
  });
});

describe('catalogue retains every historically-visible command (no regression)', () => {
  // Catalogue ids covering the 50 entries that the legacy CommandReference page
  // showed (44 cross-OS "core" + 6 OS-specific). head/tail and >/>> are
  // intentionally merged into single canonical catalogue entries.
  const HISTORICAL_IDS = [
    // Navigation
    'pwd', 'ls', 'cd', 'tree', 'clear_cls',
    // Files
    'mkdir', 'touch', 'cp', 'mv', 'rm', 'find',
    // Reading
    'cat', 'less_more', 'head_tail',
    // Search
    'grep', 'wc',
    // Permissions
    'chmod', 'chown', 'whoami', 'sudo', 'umask', 'getacl',
    // Processes
    'ps', 'kill', 'top_htop', 'jobs', 'bg', 'fg',
    // Redirection & pipes
    'redirect_output', 'redirect_stderr', 'redirect_stderr_stdout', 'pipes', 'tee',
    // Variables
    'export', 'env', 'printenv', 'source',
    // System
    'echo', 'date', 'uname', 'getcomputerinfo', 'history', 'man', 'alias',
    'open', 'pbcopy_pbpaste', 'brew', 'winget',
  ];

  it.each(HISTORICAL_IDS)('catalogue still contains "%s"', (id) => {
    expect(getCommandById(id), `command "${id}" disappeared from commandCatalogue`).toBeDefined();
  });

  it('catalogue is a superset (>= the 75 unified commands)', () => {
    const total = commandCatalogue.reduce((sum, cat) => sum + cat.commands.length, 0);
    expect(total).toBeGreaterThanOrEqual(75);
  });
});
