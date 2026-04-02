# Conventions de travail — Terminal Learning

> Dernière mise à jour : 1 avril 2026  
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
