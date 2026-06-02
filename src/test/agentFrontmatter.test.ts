import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Repo-integrity guard for Claude Code agent definitions (THI-326, 02/06/2026).
 *
 * Root cause of THI-326: `supabase-backend-auditor.md` and
 * `user-forensics-auditor.md` silently failed to register as invocable
 * subagents because their YAML frontmatter `description:` contained a `": "`
 * (colon + space). YAML reads `": "` as a nested mapping key/value separator
 * inside a plain scalar → "incomplete explicit mapping pair" → the WHOLE
 * frontmatter is invalid → the agent is dropped from the registry with no error
 * surfaced anywhere. Proven with js-yaml at fix time: the two broken files threw
 * at the exact colon column, the 18 healthy agents parsed fine.
 *
 * This guard fails loudly if, on ANY frontmatter value (not just `description`):
 *  - the value contains an embedded `": "` or `" #"` — the two combinations YAML
 *    forbids inside an unquoted plain scalar, or
 *  - a required top-level key (name / description / tools / model) is missing.
 *
 * It tolerates legitimate nested frontmatter (e.g. `mcpServers:` / `pathPatterns:`
 * with `- item` sequences) by only inspecting lines that actually carry an
 * inline `key: value`; block-introducer and sequence lines have no `": "` to
 * break on and are skipped.
 *
 * Scope note (honest): this is a TARGETED structural validator for the THI-326
 * failure class, intentionally dependency-free. The only transitive YAML parser
 * (js-yaml v3) ships no TypeScript types; wiring it in would mean adding
 * @types/js-yaml — a new devDependency. If agent frontmatter ever grows
 * complex YAML (block scalars, flow collections), swap this for a real parser
 * behind a proper dependency.
 */

const AGENTS_DIR = resolve(process.cwd(), '.claude/agents');
const REQUIRED_KEYS = ['name', 'description', 'tools', 'model'] as const;
const FRONTMATTER_RX = /^---\r?\n([\s\S]*?)\r?\n---/;

function readFrontmatter(file: string): string {
  const txt = readFileSync(resolve(AGENTS_DIR, file), 'utf-8');
  const match = FRONTMATTER_RX.exec(txt);
  if (!match) throw new Error(`${file}: no YAML frontmatter block found`);
  return match[1];
}

const agentFiles = readdirSync(AGENTS_DIR).filter(
  (f) => f.endsWith('.md') && f !== 'README.md',
);

describe('Claude Code agent frontmatter — registry integrity (THI-326)', () => {
  it('discovers the agent definition files', () => {
    expect(agentFiles.length).toBeGreaterThan(0);
  });

  it.each(agentFiles)('%s — no YAML-breaking value, all required keys present', (file) => {
    const topLevel: Record<string, string> = {};

    for (const line of readFrontmatter(file).split(/\r?\n/)) {
      if (line.trim() === '') continue;

      const sep = line.indexOf(': ');
      // Block-introducer (`key:`) or sequence item (`- x`): no inline value,
      // nothing that can break a plain scalar — valid nesting, skip.
      if (sep === -1) continue;

      const value = line.slice(sep + 2);
      expect(
        value.includes(': '),
        `${file}: a frontmatter value contains ": " (colon+space) — breaks the YAML plain scalar and silently drops the agent (THI-326). Use "—" or quote the value. Line: ${JSON.stringify(line)}`,
      ).toBe(false);
      expect(
        value.includes(' #'),
        `${file}: a frontmatter value contains " #" (space+hash) — YAML reads it as a comment, truncating the value. Line: ${JSON.stringify(line)}`,
      ).toBe(false);

      // Record top-level (non-indented) keys for the required-keys check.
      if (!/^\s/.test(line)) topLevel[line.slice(0, sep)] = value;
    }

    for (const key of REQUIRED_KEYS) {
      expect(
        topLevel[key],
        `${file}: missing or empty required top-level frontmatter key "${key}"`,
      ).toBeTruthy();
    }
  });
});
