/// <reference types="node" />
/**
 * Guard: anti-drift du compteur de leçons dans la doc markdown d'ÉTAT PRÉSENT.
 *
 * Contexte : le curriculum est passé à 66 leçons (ajout « Anatomie d'une
 * commande » au Module 1, mai 2026), mais un compteur obsolète peut persister
 * dans plusieurs docs. Le garde-fou `seo.test.ts` ne couvre que le HTML/SEO
 * public (numberOfLessons dérivé), pas la doc markdown.
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

// Détecte un compteur de leçons obsolète "65 lessons" / "65 leçon(s)".
const STALE_LESSON_COUNT = /65[\s-]*(le[çc]on|lesson)/i;

describe('doc lesson count — anti-drift guard', () => {
  it('le curriculum compte bien 66 leçons (ancrage source de vérité)', () => {
    // Si cette assertion casse, le curriculum a changé de taille : mettre à
    // jour la doc d'état présent ET le pattern de ce test ensemble.
    expect(getTotalLessons()).toBe(66);
  });

  it.each(PRESENT_STATE_DOCS)(
    '%s ne contient aucun compteur "64 leçons/lessons" obsolète',
    (relPath) => {
      const content = readFileSync(resolve(ROOT, relPath), 'utf-8');
      const match = content.match(STALE_LESSON_COUNT);
      expect(
        match,
        match
          ? `"${match[0]}" trouvé dans ${relPath} — le curriculum compte 66 leçons, pas 65. Corriger l'assertion d'état présent (l'historique CHANGELOG/STORY/audits/reports reste inchangé).`
          : undefined,
      ).toBeNull();
    },
  );
});
