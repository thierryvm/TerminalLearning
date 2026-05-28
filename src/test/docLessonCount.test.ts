/// <reference types="node" />
/**
 * Guard: anti-drift du compteur de leçons dans la doc markdown d'ÉTAT PRÉSENT.
 *
 * Contexte : le curriculum est passé à 65 leçons (Module 11 "IA", avril 2026),
 * mais le "64" a persisté dans plusieurs docs. Le garde-fou `seo.test.ts` ne
 * couvrait que le HTML/SEO public (numberOfLessons === 65), pas la doc markdown.
 * Ce test étend la couverture aux fichiers de doc qui affirment un état présent.
 *
 * Exclus volontairement (traces historiques datées — les "corriger" = falsifier
 * l'historique) : CHANGELOG.md, STORY.md, docs/audits/*, docs/reports/*.
 *
 * Source de vérité : getTotalLessons() (compte réel du curriculum). Si le
 * curriculum change de taille, l'assertion d'ancrage ci-dessous échoue et
 * rappelle de mettre à jour la doc + ce test ensemble.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { getTotalLessons } from '../app/data/curriculum';

const ROOT = resolve(__dirname, '../../');

// Fichiers de doc affirmant un état présent du curriculum (≠ historique daté).
const PRESENT_STATE_DOCS = [
  'README.md',
  'CLAUDE.md',
  'docs/ARCHITECTURE.md',
  'docs/exports/README.md',
];

// Détecte un compteur de leçons obsolète "64 lessons" / "64 leçon(s)".
const STALE_LESSON_COUNT = /64[\s-]*(le[çc]on|lesson)/i;

describe('doc lesson count — anti-drift guard', () => {
  it('le curriculum compte bien 65 leçons (ancrage source de vérité)', () => {
    // Si cette assertion casse, le curriculum a changé de taille : mettre à
    // jour la doc d'état présent ET le pattern de ce test ensemble.
    expect(getTotalLessons()).toBe(65);
  });

  it.each(PRESENT_STATE_DOCS)(
    '%s ne contient aucun compteur "64 leçons/lessons" obsolète',
    (relPath) => {
      const content = readFileSync(resolve(ROOT, relPath), 'utf-8');
      const match = content.match(STALE_LESSON_COUNT);
      expect(
        match,
        match
          ? `"${match[0]}" trouvé dans ${relPath} — le curriculum compte 65 leçons, pas 64. Corriger l'assertion d'état présent (l'historique CHANGELOG/STORY/audits/reports reste inchangé).`
          : undefined,
      ).toBeNull();
    },
  );
});
