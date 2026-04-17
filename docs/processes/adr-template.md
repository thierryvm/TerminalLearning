# ADR Template

> Copier ce fichier dans `docs/adr/ADR-XXX-kebab-case-titre.md` pour créer un nouvel ADR.
> Format : court (< 300 mots idéal), un fichier par décision, immutable après acceptation.

---

```markdown
# ADR-XXX — Titre court de la décision

**Date** : JJ mois YYYY
**Statut** : Proposed | Accepted | Deprecated (jamais supprimé)
**Décideurs** : Thierry (owner), Claude (architecte)

## Contexte

Quelle question se pose ? Quelles contraintes ? Pourquoi maintenant ?
(2-4 phrases max)

## Décision

Quelle est la décision prise, formulée de manière actionnable.
(1-3 phrases pour le core + détails éventuels en sous-sections)

## Conséquences

### Positives
- Bénéfice 1
- Bénéfice 2

### Négatives / risques
- Risque 1 + mitigation si possible
- Risque 2

### Alternatives rejetées
- **Alternative A** : raison de rejet
- **Alternative B** : raison de rejet

## Implémentation
(Optionnel — référence vers issue Linear ou chantier prioritaire)

## Mémoires liées
- `project_xxx.md`
```

---

## Règles ADR

- **Numérotation séquentielle** (ADR-001, ADR-002, ...). Jamais de gap ni de réutilisation.
- **Immutable** : un ADR `Accepted` ne se modifie jamais. Pour changer une décision, créer un nouvel ADR qui deprecate l'ancien.
- **Deprecated** : l'ADR marqué `Deprecated` doit référencer l'ADR qui le remplace.
- **Court** : < 300 mots si possible. Si plus long, extraire détails dans un doc technique dédié.
- **Décision d'abord** : le cœur du document est la décision, pas le contexte.
- **Index** : ajouter au tableau dans `docs/adr/README.md` dès la création.

## Quand créer un ADR

- Changement d'architecture majeur (framework, DB, pattern global)
- Positionnement stratégique produit
- Choix technique structurant (BYOK vs serveur, LTI vs SCORM, etc.)
- Règle métier impactant le code sur la durée

## Quand NE PAS créer un ADR

- Micro-refacto sans impact architectural
- Bug fix (commit message suffit)
- Choix ergonomique local (un composant UI)
- Décision d'opportunité temporaire
