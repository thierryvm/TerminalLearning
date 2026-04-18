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

const ROOT = resolve(__dirname, '../../');

// Kept in sync with MARKDOWN_ROUTE_MAP (src/app/components/MarkdownPage.tsx)
// and the router table (src/app/routes.ts).
const MAPPED_MD_FILES = new Set(['STORY.md', 'CHANGELOG.md']);
const DECLARED_ROUTES = [
  '/',
  '/privacy',
  '/changelog',
  '/story',
  '/auth/callback',
  '/app',
  '/app/reference',
  // dynamic: /app/learn/:moduleId/:lessonId — handled by startsWith below
  '/app/learn/',
  // legacy redirects still valid:
  '/learn/',
  '/reference',
];

type MarkdownLink = { file: string; href: string; line: number };

function extractLinks(filePath: string): MarkdownLink[] {
  const content = readFileSync(filePath, 'utf-8');
  const pattern = /\[[^\]]+\]\(([^)\s]+)\)/g;
  const out: MarkdownLink[] = [];
  content.split('\n').forEach((line, idx) => {
    for (const match of line.matchAll(pattern)) {
      out.push({ file: filePath, href: match[1], line: idx + 1 });
    }
  });
  return out;
}

function isAcceptable(href: string): boolean {
  if (/^https?:\/\//.test(href)) return true;
  if (href.startsWith('mailto:')) return true;
  if (href.startsWith('#')) return true;
  if (MAPPED_MD_FILES.has(href)) return true;
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
