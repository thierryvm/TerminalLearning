# Terminal Learning — Guidelines

> Ces guidelines s'appliquent à toute contribution humaine ou par agent IA.
> Dernière mise à jour : 11 avril 2026

---

## 1. Origine du projet

| Outil | Rôle |
|-------|------|
| **Claude Code** | Développement assisté IA (architecture, features, sécurité, tests) |
| **Vite 6** | Bundler + dev server |
| **React Router v7** | Routing SPA |
| **Supabase** | Auth + PostgreSQL + RLS |
| **Vercel** | Déploiement continu |

---

## 2. Design System

### Couleurs (tokens projet — ne pas modifier sans décision explicite)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--background` | `#0d1117` | Fond principal |
| `--card` | `#161b22` | Cartes, panels |
| `--border` | `#30363d` | Bordures |
| `--foreground` | `#e6edf3` | Texte principal |
| `--muted-foreground` | `#8b949e` | Texte secondaire |
| `--primary` (accent) | `emerald-500` / `#10b981` | CTAs, progress, highlights |
| `--destructive` | `#d4183d` | Erreurs, suppressions |

Couleurs modules (liées au curriculum — ne pas changer sans mettre à jour Dashboard, Sidebar, Landing) :

| Module | ID | Couleur |
|--------|----|---------|
| Navigation | `navigation` | `emerald-500` |
| Fichiers & Dossiers | `fichiers` | `blue-500` |
| Lecture de fichiers | `lecture` | `purple-500` |
| Permissions | `permissions` | `amber-500` |
| Processus | `processus` | `red-500` |
| Redirection & Pipes | `redirection` | `cyan-500` |
| Variables & Scripts | `variables` | `yellow-500` |
| Réseau & SSH | `reseau` | `cyan-400` |
| Git Fondamentaux | `git` | `orange-500` |
| GitHub & Collaboration | `github-collaboration` | `violet-500` |

### Typographie

| Font | Usage | Poids |
|------|-------|-------|
| **JetBrains Mono** | Terminal, code, valeurs numériques, prompts | 400, 500, 600 |
| **Inter** | UI générale, descriptions, labels | 300, 400, 500, 600, 700 |

Règle : toute valeur de type "code" ou "commande" utilise JetBrains Mono + classe `font-mono`.
Les deux fonts sont auto-hébergées via `@fontsource` (pas de CDN externe).

### Espacements et rayons

- Border radius standard : `0.625rem` (`--radius`)
- Cards : `rounded-xl` (radius-lg)
- Boutons : `rounded-xl`
- Badges / chips : `rounded-full`
- Espacement interne cards : `p-4` (compact) ou `p-5` (standard)

### Animations (module Motion installé)

- Durée micro-interactions : **150–300ms** (jamais plus)
- Easing : `ease-out` pour les entrées, `ease-in` pour les sorties
- Parallax : max `20px` de déplacement vertical (landing uniquement)
- Respecter `prefers-reduced-motion` : toujours prévoir une version sans animation

---

## 3. Conventions de code

### TypeScript

- `strict: true` obligatoire
- Zéro `any` — typer explicitement ou utiliser `unknown`
- Props des composants : interface nommée `ComponentNameProps`
- Exports : named exports uniquement (`export function Foo`, pas `export default`)

### Structure des composants

```tsx
interface NomComposantProps {
  prop: string;
}

export function NomComposant({ prop }: NomComposantProps) {
  // ...
}
```

Règles :
- Un composant = un fichier = une responsabilité
- Pas de logique métier dans les composants UI (extraire dans des hooks)
- Hooks custom dans `src/app/hooks/`
- Data/logique dans `src/app/data/`

### Styling

- **Tailwind CSS uniquement** — pas de CSS inline, pas de fichiers `.css` par composant
- Classes conditionnelles : utiliser `clsx` ou `cn()` (utilitaire dans `ui/utils.ts`)
- Ordre des classes Tailwind : layout → spacing → typography → colors → borders → effects
- Pas de valeurs arbitraires `[valeur]` sauf pour les couleurs du design system existant
  (ex: `bg-[#0d1117]` est accepté car c'est un token du projet)

### Nommage

- Composants : `PascalCase` (`LandingPage`, `SupportCard`)
- Hooks : `camelCase` préfixé `use` (`useProgress`, `useTheme`)
- Fonctions utilitaires : `camelCase` (`formatDate`, `parseCommand`)
- Fichiers composants : `PascalCase.tsx`
- Fichiers hooks/utils : `camelCase.ts`
- Constantes : `SCREAMING_SNAKE_CASE`

---

## 4. Architecture des routes

```
/           → Landing page (public, SEO-optimisée)
/app        → Application principale (Dashboard)
/app/learn/:moduleId/:lessonId → Leçon interactive
/app/reference → Référence des commandes
/privacy    → Politique de confidentialité (RGPD)
```

Règle : toute nouvelle route doit être documentée ici avant implémentation.

---

## 5. Sécurité — règles non négociables

- **Zéro injection HTML brute** dans les composants React — utiliser du texte pur ou JSX
- **Pas de secrets côté client** — uniquement via variables d'environnement (`import.meta.env`)
- **CSP** configurée dans `vercel.json` — ne pas assouplir sans justification
- Tout nouvel endpoint API : rate limiting obligatoire
- Dépendances : `npm audit` avant chaque PR, Dependabot activé sur GitHub
- Voir `SECURITY.md` pour la politique de sécurité complète

---

## 6. Tests

Outil actif : **Vitest** (579 tests, 12 fichiers de test — avril 2026)
E2E : **Playwright** (3 suites dans `e2e/` : accessibility, mobile, seo — exclues de vitest)

| Type | Scope | Outil |
|------|-------|-------|
| Unitaires | Logique pure, terminal engine, unlocking | Vitest |
| Composants | Render, interactions | Vitest + Testing Library |
| E2E | Parcours utilisateur complets | Playwright (pre-release) |

Règles :
- **Chaque nouvelle commande dans `terminalEngine.ts` = test obligatoire** dans `src/test/terminalEngine.test.ts`
- **Chaque modification de `curriculum.ts`** : invoquer l'agent `curriculum-validator` avant
- Coverage minimum cible : **80%** sur les parties critiques (terminal engine, auth, routing)
- Ne jamais retirer `exclude: ['node_modules/**', 'e2e/**']` de `vitest.config.ts`

---

## 7. Workflow Git

### Branches
```
main        → production (protégée, déploiement Vercel auto)
feature/xxx → nouvelles features
fix/xxx     → corrections
hotfix/xxx  → corrections urgentes production
release/vX.Y.Z → préparation release
```

### Format des commits
```
type(scope): description courte

Types : feat | fix | refactor | test | docs | chore | security | style
Exemples :
  feat(curriculum): add Git module with 7 lessons
  security(headers): strengthen CSP policy in vercel.json
  fix(routing): correct base path for /app routes
```

### Avant chaque merge
1. CI verte (type-check + lint + test + build)
2. Sourcery review vérifié : `gh pr view N --comments 2>&1 | grep -A 15 -i "sourcery"`
3. Validation visuelle Vercel Preview (Thierry — Chrome + mobile)

---

## 8. Workflow IA-Assisted Development

Ce projet utilise **Claude Code** comme partenaire de développement principal.

### Agents disponibles (`.claude/agents/`)

| Agent | Rôle | Quand l'invoquer |
|-------|------|-----------------|
| **`linear-sync`** | Vérifie cohérence PRs GitHub ↔ statuts Linear | Début de chaque session |
| **`curriculum-validator`** | Valide structure de `curriculum.ts` | Avant toute modification de `curriculum.ts` |
| **`test-runner`** | Lance vitest, retourne uniquement failures + gaps | Après modification de `curriculum.ts` ou `terminalEngine.ts` |
| **`content-auditor`** | Audit pédagogique complet (env coverage, liens, prérequis, validate()) | Avant chaque release majeure |
| **`security-auditor`** | Audit cybersécurité OWASP Top 10, CSP, RLS, auth, supply chain | Avant chaque release majeure ou après mise à jour dépendances |

### Règles pour les agents IA

- Lire `CLAUDE.md` + `plan.md` avant toute modification
- Ne jamais assouplir les règles de sécurité
- Respecter les conventions de nommage et la structure de fichiers
- Toute nouvelle dépendance = justification explicite dans le commit
- Mettre à jour ce fichier et `plan.md` dès qu'une info devient obsolète — sans attendre la demande

### Sessions de travail

- 1 session = 1 objectif précis (feature / bug / refactor)
- Utiliser `/compact` aux points de rupture logiques
- Mettre à jour `plan.md` avec le statut des tâches après chaque session

---

## 9. Internationalisation

Langue de l'interface : **français** (public cible débutants francophones)
Langue du code / commentaires / commits : **anglais**
Langue de la documentation technique : **anglais**

---

## 10. Fichiers de référence du projet

| Fichier | Rôle |
|---------|------|
| `docs/plan.md` | Roadmap, phases, statut des tâches, tech debt |
| `docs/GUIDELINES.md` | Ce fichier — conventions et contrat de dev |
| `docs/ARCHITECTURE.md` | Diagramme technique complet |
| `docs/CONVENTIONS.md` | Règles de travail (git, PR, workflow, validation) |
| `docs/ROADMAP.md` | Vision long terme, phases futures |
| `docs/ATTRIBUTIONS.md` | Crédits des librairies et assets |
| `SECURITY.md` | Politique de sécurité, contacts, sprints hardening |
| `CONTRIBUTING.md` | Guide de contribution |
| `README.md` | Présentation publique (stack, démo, setup) |
| `CLAUDE.md` | Instructions projet pour Claude Code |
| `LICENSE` | MIT License |
