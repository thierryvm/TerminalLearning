# Conventions de travail — Terminal Learning

> Dernière mise à jour : 10 avril 2026  
> Issue Linear : [THI-8](https://linear.app/thierryvm/issue/THI-8/set-project-workflow-conventions)

---

## Branches

| Type | Pattern | Exemple |
|------|---------|---------|
| Feature | `feat/THI-XX-description` | `feat/THI-12-add-git-module` |
| Fix | `fix/THI-XX-description` | `fix/THI-15-progress-reset-bug` |
| Docs | `docs/THI-XX-description` | `docs/THI-8-add-conventions` |
| Chore | `chore/THI-XX-description` | `chore/THI-3-update-deps` |

**Règles :**
- Toujours partir de `main` à jour
- Jamais de commit direct sur `main`
- Inclure l'identifiant Linear (`THI-XX`) dans le nom de branche → lie automatiquement la PR à l'issue

---

## Commits (Conventional Commits)

```
type(scope): description courte en anglais
```

**Types autorisés :** `feat` `fix` `docs` `chore` `refactor` `test` `security`

**Exemples :**
```
feat(curriculum): add git basics module
fix(terminal): handle empty input without crash
docs(readme): update installation steps
chore(deps): upgrade vite to 6.2
```

---

## Pull Requests

**Titre :** `type(THI-XX): description courte`  
**Exemple :** `feat(THI-12): add git basics module`

**Template body :**
```
## Summary
- Ce que cette PR fait (1-3 bullets)

## Motivation
Pourquoi ce changement est nécessaire.

## Changes
- Liste des fichiers/fonctions modifiés

## Test plan
- [ ] CI passe (type-check + lint + test + build)
- [ ] Testé localement sur Chrome + Firefox
- [ ] Pas de régression sur curriculum.ts / ProgressContext
```

**Règles :**
- CI doit passer avant merge
- Au moins 1 review si collaborateur présent
- Squash merge préféré pour garder `main` propre

---

## Issues Linear

| État | Signification |
|------|--------------|
| **Triage** | Idée à évaluer, pas encore décidée |
| **Todo** | Décidée, prête à être traitée |
| **In Progress** | Branche créée, travail en cours |
| **In Review** | PR ouverte sur GitHub |
| **Done** | PR mergée dans `main` |

**Convention de nommage :**
```
type: description courte en anglais
```
Exemples : `feat: add progress export`, `fix: lesson 3 typo`, `docs: update roadmap`

---

## Workflow simple (débutant)

### Rôle de chaque outil

- **Linear** = définir et suivre le travail
- **Claude Code** = aider à réaliser le travail
- **GitHub** = héberger le code, les branches et les pull requests
- **Slack** = recevoir les notifications et discuter des changements

### Ordre de travail recommandé

1. Créer ou choisir une issue dans Linear
2. Passer l'issue en **Todo** si elle est prête
3. Créer une branche GitHub liée à l'issue
4. Travailler avec Claude Code dans cette branche
5. Ouvrir une pull request sur GitHub
6. Passer l'issue en **In Review** si une PR est ouverte
7. Vérifier que la CI passe
8. Merger la pull request
9. Passer l'issue en **Done** une fois mergée dans `main`

### Règle mentale simple

- **Pas commencé** → Todo
- **En train de faire** → In Progress
- **PR ouverte** → In Review
- **Terminé et mergé** → Done

### Schéma rapide

```text
Linear -> Issue à faire
GitHub -> Branche + PR
Claude Code -> Aide à coder
Linear -> Suit l'avancement
Slack -> Notifie et permet d'en discuter
```

---

## Design System — shadcn/ui obligatoire (THI-85)

**Règle :** ne jamais créer de composant custom quand un équivalent shadcn/ui existe.

| Besoin | Composant shadcn | Import |
|--------|-----------------|--------|
| Bouton | `<Button>` | `ui/button` |
| Carte | `<Card>` | `ui/card` |
| Badge | `<Badge>` | `ui/badge` |
| Input | `<Input>` | `ui/input` |
| Onglets | `<Tabs>` | `ui/tabs` |
| Barre de progression | `<Progress>` | `ui/progress` |
| Dialog/Modal | `<Dialog>` | `ui/dialog` |
| Menu déroulant | `<DropdownMenu>` | `ui/dropdown-menu` |
| Tooltip | `<Tooltip>` | `ui/tooltip` |
| Tableau | `<Table>` | `ui/table` |

**Exceptions :** composants métier (TerminalEmulator, TerminalPreview) et designs spécifiques Landing hero.

**Garde-fou :** lancer l'agent `ui-auditor` avant toute PR qui touche des composants UI. Tout CRITICAL dans le rapport bloque le merge.

---

## Validation visuelle obligatoire (projet vitrine)

**Toute PR sur `main` doit passer par cette checklist avant merge :**

1. CI passe (type-check + lint + test + build) — automatique
2. Vercel génère une **preview URL** automatiquement pour chaque PR (visible dans les commentaires GitHub)
3. **Thierry valide visuellement** sur la preview Vercel (Chrome + mobile)
4. Merge seulement après validation explicite

> Ne jamais merger sur `main` sans avoir validé la preview Vercel.

---

## Synchronisation de la documentation

**À la fin de chaque session de développement, vérifier :**

| Fichier | Quand le mettre à jour |
|---------|----------------------|
| `docs/plan.md` | Statut de phase changé, item coché, décision prise |
| `docs/CONVENTIONS.md` | Nouvelle règle ou workflow ajouté |
| `README.md` | Stack change, nouvelle phase live, nouvelle URL |
| `CLAUDE.md` | Règle projet ou décision technique durable |

**Règle anti-doublon :**
- `plan.md` = état du projet (phases, to-do, décisions en attente)
- `CONVENTIONS.md` = règles de travail (git, PR, workflow)
- `README.md` = documentation publique (stack, démo, setup)
- `CLAUDE.md` = instructions pour Claude Code (règles projet, stack, fichiers critiques)

Ne jamais copier le même contenu dans deux fichiers — pointer vers la source si nécessaire.
