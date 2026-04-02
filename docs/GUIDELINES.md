# Terminal Learning — Guidelines

> Ce projet a été initié via **Figma Make** (IA de Figma) + **Claude Code** (Anthropic),
> exporté en React + Vite + Tailwind + shadcn/ui.
> Ces guidelines s'appliquent à toute contribution humaine ou par agent IA.

---

## 1. Origine du projet

| Outil | Rôle |
|-------|------|
| **Figma** | Design source (maquettes, design tokens, composants) |
| **Figma Make** | Génération du code initial (React + Tailwind + shadcn/ui) |
| **Claude Code** | Développement assisté IA (refactoring, features, sécurité, tests) |
| **Vite** | Bundler + dev server |
| **React Router v7** | Routing SPA |

Toute modification du design doit partir de Figma en premier (source de vérité visuelle),
puis être traduite en code selon ces guidelines.

---

## 2. Design System

### Couleurs (ne pas modifier sans mise à jour Figma)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--background` | `#0d1117` | Fond principal |
| `--card` | `#161b22` | Cartes, panels |
| `--border` | `#30363d` | Bordures |
| `--foreground` | `#e6edf3` | Texte principal |
| `--muted-foreground` | `#8b949e` | Texte secondaire |
| `--primary` (accent) | `emerald-500` / `#10b981` | CTAs, progress, highlights |
| `--destructive` | `#d4183d` | Erreurs, suppressions |

Couleurs modules (ne pas changer, liées au curriculum) :
- Navigation → `emerald-500`
- Fichiers → `blue-500`
- Lecture → `purple-500`
- Permissions → `amber-500`
- Processus → `red-500`
- Redirection → `cyan-500`

### Typographie

| Font | Usage | Poids |
|------|-------|-------|
| **JetBrains Mono** | Terminal, code, valeurs numériques, prompts | 400, 500, 600 |
| **Inter** | UI générale, descriptions, labels | 300, 400, 500, 600, 700 |

Règle : toute valeur de type "code" ou "commande" utilise JetBrains Mono + classe `font-mono`.

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

- `strict: true` obligatoire (même si pas de `tsconfig.json` — Vite transpile via esbuild)
- Zéro `any` — typer explicitement ou utiliser `unknown`
- Props des composants : interface nommée `ComponentNameProps`
- Exports : named exports uniquement (`export function Foo`, pas `export default`)

### Structure des composants

```tsx
/**
 * @component NomComposant
 * @description Ce que fait le composant en une ligne.
 * @example
 * <NomComposant prop="valeur" />
 */

interface NomComposantProps {
  /** Description de la prop */
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
/app/learn/:moduleId/:lessonId → Leçon
/app/reference → Référence des commandes
/privacy    → Politique de confidentialité (RGPD)
/admin      → Panel admin (Phase 4, protégé RBAC)
```

Règle : toute nouvelle route doit être documentée ici avant implémentation.

---

## 5. Sécurité — règles non négociables

- **Pas de `dangerouslySetInnerHTML`** sauf cas exceptionnel validé + sanitisation DOMPurify
- **Pas de secrets côté client** — uniquement via variables d'environnement (`import.meta.env`)
- **Validation Zod** sur tous les inputs utilisateur dès Phase 1
- **CSP** configurée dans `vercel.json` — ne pas assouplir sans justification
- Tout nouveau endpoint API (Phase 3+) : rate limiting obligatoire
- Dépendances : `npm audit` avant chaque PR, Dependabot activé sur GitHub

---

## 6. Tests — obligatoires par feature

Outil : **Vitest** (à installer en Phase 1)

| Type | Scope | Outil |
|------|-------|-------|
| Unitaires | Logique pure, hooks, utils | Vitest |
| Composants | Render, interactions | Vitest + Testing Library |
| E2E | Parcours utilisateur complets | Playwright |

Règle : **chaque nouvelle feature = au moins 1 test unitaire**. Pas de merge sans tests.

Coverage minimum cible : **80%** sur les parties critiques (terminal engine, auth, routing).

---

## 7. Workflow Git

### Branches
```
main        → production (protégée, déploiement Vercel auto)
develop     → intégration
feature/xxx → nouvelles features
hotfix/xxx  → corrections urgentes
```

### Format des commits
```
type(scope): description courte

Types : feat | fix | refactor | test | docs | chore | security | style
Exemples :
  feat(landing): add hero section with animated terminal prompt
  security(headers): strengthen CSP policy in vercel.json
  fix(routing): correct base path for /app routes
```

### Avant chaque push
1. `npm run build` → doit passer sans erreur
2. `npm test` → doit passer sans erreur (quand Vitest installé)
3. Headers sécurisés non modifiés sauf intention explicite

---

## 8. Workflow IA-Assisted Development

Ce projet utilise **Claude Code** comme partenaire de développement principal.

### Agents disponibles

| Agent | Rôle |
|-------|------|
| **Orchestrator** | Coordination générale, découpe des tâches |
| **Frontend** | UI, composants, design system, animations |
| **Security** | OWASP, CSP, rate limiting, audit dépendances |
| **HACKER BLACK** | Tests offensifs (XSS, CSRF, rate limit bypass, RLS bypass) |
| **QA** | Tests Vitest + Playwright, coverage |

### Règles pour les agents IA

- Lire ce fichier + `plan.md` avant toute modification
- Ne jamais assouplir les règles de sécurité
- Documenter chaque composant créé (JSDoc)
- Respecter les conventions de nommage et la structure de fichiers
- Toute nouvelle dépendance = justification explicite dans le commit

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
| `plan.md` | Roadmap, phases, statut des tâches |
| `guidelines/Guidelines.md` | Ce fichier — conventions et contrat de dev |
| `ATTRIBUTIONS.md` | Crédits des librairies et assets |
| `LICENSE` | MIT License |
| `ARCHITECTURE.md` | *(à créer Phase 1)* Diagramme technique complet |
| `SECURITY.md` | *(à créer Phase 1)* Politique de sécurité |
| `CONTRIBUTING.md` | *(à créer Phase 1)* Guide de contribution |
| `README.md` | *(à refactorer Phase 1)* Présentation publique |
