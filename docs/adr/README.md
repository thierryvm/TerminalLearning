# Architecture Decision Records — Terminal Learning

> ADRs capturent les décisions stratégiques structurantes du projet.
> Format : court (< 300 mots), un fichier par décision, jamais modifié après acceptation (seulement deprecated + nouveau ADR).

## Index

| ID | Titre | Date | Statut |
|----|-------|------|--------|
| [ADR-001](./ADR-001-lti-first-positioning.md) | Positionnement LTI-first, pas LMS complet | 17 avril 2026 | Accepted |
| [ADR-002](./ADR-002-openrouter-byok-tiers.md) | BYOK 4-tiers avec OpenRouter prioritaire | 17 avril 2026 | Accepted |
| [ADR-003](./ADR-003-ttfr-kpi.md) | TTFR (Time To First Real-world command) comme KPI central | 17 avril 2026 | Accepted |
| [ADR-004](./ADR-004-classroom-composer-ui.md) | Classroom-as-Code via UI composer (JSON en stockage) | 17 avril 2026 | Accepted |

## Process

- Chaque décision stratégique majeure → nouvel ADR
- Template : [docs/processes/adr-template.md](../processes/adr-template.md)
- Numérotation séquentielle (ADR-XXX)
- Statuts : `Proposed` → `Accepted` → `Deprecated` (never deleted)
- Une ADR `Deprecated` doit référencer l'ADR qui la remplace
