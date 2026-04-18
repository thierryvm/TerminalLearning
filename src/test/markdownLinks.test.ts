/// <reference types="node" />
/**
 * Guard: every internal link inside narrative markdown docs rendered on the
 * SPA (CHANGELOG.md via /changelog, STORY.md via /story) must either be
 *  - external (http/https),
 *  - a pure anchor (#heading),
 *  - mapped to a known SPA route via MARKDOWN_ROUTE_MAP in MarkdownPage.tsx,
 *  - or matching a declared route in src/app/routes.ts.
 *
 * Prevents silent 404s when markdown is clicked on production (e.g. STORY.md
 * resolved relative to /changelog → /STORY.md → NotFound catch-all).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { MARKDOWN_ROUTE_MAP } from '../app/components/MarkdownPage';

const ROOT = resolve(__dirname, '../../');

// Declared SPA routes — MUST stay in sync with src/app/routes.ts.
// Paths ending with '/' act as dynamic prefixes (e.g. /app/learn/:moduleId/:lessonId).
// If you add a public route in routes.ts, mirror it here.
const DECLARED_ROUTES = [
  '/',
  '/privacy',
  '/changelog',
  '/story',
  '/auth/callback',
  '/app',
  '/app/reference',
  '/app/learn/',
  '/learn/',
  '/reference',
];

type MarkdownLink = { file: string; href: string; line: number };

// Match [text](href) but NOT ![alt](href) (image syntax) — negative lookbehind on '!'.
// Href is any run of non-whitespace, non-closing-paren chars. We intentionally
// skip the rare [text](url "title") form: it's not used anywhere in the narrative
// docs today and supporting it adds brittleness.
const LINK_PATTERN = /(?<!!)\[[^\]]+\]\(([^)\s]+)\)/g;

function extractLinks(filePath: string): MarkdownLink[] {
  const content = readFileSync(filePath, 'utf-8');
  const out: MarkdownLink[] = [];
  content.split('\n').forEach((line, idx) => {
    for (const match of line.matchAll(LINK_PATTERN)) {
      out.push({ file: filePath, href: match[1], line: idx + 1 });
    }
  });
  return out;
}

function isAcceptable(href: string): boolean {
  if (/^https?:\/\//.test(href)) return true;
  if (href.startsWith('mailto:')) return true;
  if (href.startsWith('#')) return true;
  if (href in MARKDOWN_ROUTE_MAP) return true;
  if (DECLARED_ROUTES.some((r) => href === r || (r.endsWith('/') && href.startsWith(r)))) return true;
  return false;
}

describe('Narrative markdown internal links', () => {
  const NARRATIVE_FILES = [
    resolve(ROOT, 'CHANGELOG.md'),
    resolve(ROOT, 'STORY.md'),
  ];

  for (const file of NARRATIVE_FILES) {
    it(`${file.split(/[\\/]/).pop()}: every link resolves to a known target`, () => {
      const links = extractLinks(file);
      const broken = links.filter((l) => !isAcceptable(l.href));
      if (broken.length > 0) {
        const details = broken
          .map((l) => `  line ${l.line}: ${l.href}`)
          .join('\n');
        throw new Error(
          `Unresolvable internal links in ${file.split(/[\\/]/).pop()}:\n${details}\n\n` +
            'Fix: point to an SPA route (/story, /changelog…), an external URL, ' +
            'or add the target to MARKDOWN_ROUTE_MAP in MarkdownPage.tsx.'
        );
      }
      expect(broken).toEqual([]);
    });
  }
});
