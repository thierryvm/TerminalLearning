/// <reference types="node" />
/**
 * Guard: the public files that describe the curriculum to search engines and
 * AI assistants stay in step with the real curriculum.
 *
 * `landingTotals.test.ts` already ties the landing constants and the FAQ
 * sentences of `index.html` to the curriculum. Until 2 October 2026 nothing
 * checked `public/llms.txt`, `public/llms-full.txt` or the "11 modules" in the
 * `index.html` metadata, so a new module or lesson would have left them behind
 * in silence (Phase 5d, lot 0b).
 *
 * When this test fails, update the public file, never the test: it reads the
 * expected values from `curriculum.ts`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { curriculum, getTotalLessons } from '../app/data/curriculum';

const read = (relPath: string) => readFileSync(resolve(process.cwd(), relPath), 'utf-8');
const lessonPath = (moduleId: string, lessonId: string) => `/app/learn/${moduleId}/${lessonId}`;

/** Splits a file on its "### Module N — Title" headings, in order. */
function moduleSections(content: string) {
  const heading = /^### Module (\d+) — (.+)$/gm;
  const found = [...content.matchAll(heading)];
  return found.map((m, i) => ({
    number: Number(m[1]),
    heading: m[2].trim(),
    body: content.slice(m.index! + m[0].length, found[i + 1]?.index ?? content.length),
  }));
}

describe('public/llms.txt follows the curriculum', () => {
  const content = read('public/llms.txt');
  const sections = moduleSections(content);

  it('states the real number of modules and lessons', () => {
    const m = content.match(/## Curriculum \((\d+) modules, (\d+) lessons\)/);
    expect(m, 'the "## Curriculum (N modules, M lessons)" heading was not found').not.toBeNull();
    expect(Number(m![1])).toBe(curriculum.length);
    expect(Number(m![2])).toBe(getTotalLessons());
  });

  it('has one section per module, in curriculum order, with the module title', () => {
    expect(sections.map((s) => s.number)).toEqual(curriculum.map((_, i) => i + 1));
    expect(sections.map((s) => s.heading)).toEqual(curriculum.map((m) => m.title));
  });

  it('lists every lesson URL of each module, in order, and nothing else', () => {
    curriculum.forEach((mod, i) => {
      expect(sections[i], `llms.txt has no "### Module ${i + 1}" heading`).toBeDefined();
      const urls = [...sections[i].body.matchAll(/^- https:\/\/terminallearning\.dev(\/app\/learn\/\S+)$/gm)].map((u) => u[1]);
      expect(urls, `llms.txt, module ${i + 1} (${mod.id})`).toEqual(mod.lessons.map((l) => lessonPath(mod.id, l.id)));
    });
  });
});

describe('public/llms-full.txt follows the curriculum', () => {
  const content = read('public/llms-full.txt');
  const sections = moduleSections(content);

  it('states the real number of modules and lessons', () => {
    const m = content.match(/(\d+) modules, (\d+) lessons total/);
    expect(m, 'the "N modules, M lessons total" sentence was not found').not.toBeNull();
    expect(Number(m![1])).toBe(curriculum.length);
    expect(Number(m![2])).toBe(getTotalLessons());
  });

  it('has one section per module with its title and lesson count', () => {
    expect(sections.map((s) => s.number)).toEqual(curriculum.map((_, i) => i + 1));
    expect(sections.map((s) => s.heading)).toEqual(
      curriculum.map((m) => `${m.title} (${m.lessons.length} lessons)`),
    );
  });

  it('has a table row for every lesson of each module, with its title and URL, in order', () => {
    curriculum.forEach((mod, i) => {
      expect(sections[i], `llms-full.txt has no "### Module ${i + 1}" heading`).toBeDefined();
      const rows = [...sections[i].body.matchAll(/^\| (.+?) \| .* \| (\/app\/learn\/\S+) \|$/gm)].map((r) => ({
        // A "|" inside a Markdown table cell is written "\|".
        title: r[1].trim().replace(/\\\|/g, '|'),
        url: r[2],
      }));
      expect(rows, `llms-full.txt, module ${i + 1} (${mod.id})`).toEqual(
        mod.lessons.map((l) => ({ title: l.title, url: lessonPath(mod.id, l.id) })),
      );
    });
  });
});

describe('index.html metadata follows the curriculum', () => {
  const html = read('index.html');

  it('every "N modules" is the real number of modules', () => {
    const counts = [...html.matchAll(/(\d+) modules/g)].map((m) => Number(m[1]));
    // Meta description, Open Graph, Twitter, two JSON-LD descriptions and the FAQ.
    expect(counts.length).toBeGreaterThanOrEqual(6);
    expect(counts.every((n) => n === curriculum.length), `found ${counts.join(', ')}`).toBe(true);
  });

  it('every "N leçons" is the real number of lessons', () => {
    const counts = [...html.matchAll(/(\d+) leçons/g)].map((m) => Number(m[1]));
    expect(counts.length).toBeGreaterThanOrEqual(1);
    expect(counts.every((n) => n === getTotalLessons()), `found ${counts.join(', ')}`).toBe(true);
  });
});
