# Release Sync Checklist — Terminal Learning

> Checklist appliquée à chaque release majeure ou décision structurante.
> Dernière mise à jour : 17 avril 2026

## Les 6 fichiers à synchroniser

À chaque release majeure (nouvelle phase, nouveau module, gros refactor, décision stratégique), les 6 fichiers suivants doivent être mis à jour **dans la même session** :

| # | Fichier | Quoi mettre à jour |
|---|---------|---------------------|
| 1 | `CHANGELOG.md` (racine) | Entry user-facing : version, date, features, fixes (format Keep a Changelog) |
| 2 | `STORY.md` (racine) | Contexte décisionnel, débats humain+IA, apprentissages — pour la communauté |
| 3 | `docs/ROADMAP.md` | Mettre à jour header (date + résumé courant) + ajouter phase livrée, déplacer items ✅ |
| 4 | `docs/plan.md` | Header (date + phase globale) + ligne(s) dans table Correspondance Linear↔Phases↔Modules |
| 5 | `src/app/data/landingContent.ts` | `TRUST_BADGES` (compteur tests si évolué), `ROADMAP_AVAILABLE` / `ROADMAP_PLANNED` si phase bouge |
| 6 | `CLAUDE.md` (projet) | Section "Phases" — ajouter la phase ou mettre à jour son statut ✅/🔄 |

## Checklist opérationnelle

Avant de clôturer la session de release :

- [ ] `CHANGELOG.md` — version bumpée + date + 3 sections (Added/Changed/Fixed)
- [ ] `STORY.md` — paragraphe court expliquant le contexte et les apprentissages
- [ ] `docs/ROADMAP.md` — date header mise à jour + phase déplacée en ✅
- [ ] `docs/plan.md` — date header + table Correspondance à jour
- [ ] `src/app/data/landingContent.ts` — trust badges + roadmap public cohérents
- [ ] `CLAUDE.md` (projet) — section Phases à jour
- [ ] Vérifier cohérence entre les 6 fichiers (dates, numéros de phase, compteurs)
- [ ] Commit unique `docs(release): sync [version] — [résumé court]`
- [ ] PR dédiée (pas de mélange avec feature code)
- [ ] Merge après CI verte + Sourcery checked (Sourcery peut être SKIPPED si rate limit hebdo)

## Règle d'or

**Une incohérence entre un de ces 6 fichiers = bug documentaire.** Exemple récent : oubli de mettre à jour `landingContent.ts` lors du Web 2026 epic → roadmap publique périmée pendant 2 jours. Éviter absolument.

## Automatisation future (THI à créer)

Idée : script `scripts/release-sync.ts` qui prend une version + résumé et propose diff pour les 6 fichiers à valider. Effort : 1 session. ROI : élimine 100% des oublis.

## Claims à vérifier avant release publique

Voir `docs/GUIDELINES.md` section "Crédibilité B2B". Avant tout texte public :
- ❌ Aucun claim non vérifiable
- ❌ Aucune métrique inventée
- ❌ Aucune référence à des features pas encore live
- ✅ Transparence sur l'état réel (bénévole solo, en développement)
- ✅ Source code lien pour auditabilité
