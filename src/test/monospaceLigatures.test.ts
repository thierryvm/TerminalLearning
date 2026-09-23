/**
 * Regression guard (24 September 2026): JetBrains Mono draws `--` as one
 * continuous line, so a learner typing `--no-ff` saw a dash "disappear" and had
 * to paste the command. jsdom does not apply stylesheets, so this checks the
 * rule itself; the visual effect was verified in Chrome.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../styles/theme.css'), 'utf8');

describe('monospace text shows every character as typed', () => {
  it('JetBrains Mono is the monospace font (the reason this rule exists)', () => {
    expect(css).toMatch(/--font-mono:\s*'JetBrains Mono'/);
  });

  it('disables ligatures and contextual alternates for .font-mono, code, kbd, samp and pre', () => {
    const rule = css.match(/\.font-mono,\s*code,\s*kbd,\s*samp,\s*pre\s*\{([^}]*)\}/);
    expect(rule, 'monospace ligature rule missing from theme.css').not.toBeNull();
    expect(rule![1]).toMatch(/font-variant-ligatures:\s*none/);
    expect(rule![1]).toMatch(/"calt"\s*0/);
  });
});
