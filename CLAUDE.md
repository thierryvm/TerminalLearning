# CLAUDE.md — Terminal Learning

> Instructions spécifiques à ce projet. Priorité absolue sur le CLAUDE.md global.

## Contexte projet
App pédagogique pour apprendre le terminal. Bénévole, open source, 100% gratuit.
- **Live** : https://terminallearning.dev
- **Repo** : https://github.com/thierryvm/TerminalLearning
- **Vercel** : https://vercel.com/thierry-vanmeeterens-projects/terminal-learning
- **Ko-fi** : https://ko-fi.com/thierryvm (dons suspendus dans l'UI — en attente de l'accord de la mutuelle Solidaris (RIZIV/INAMI))
- **GitHub Sponsors** : https://github.com/sponsors/thierryvm (compte activé le 9 avril 2026 — dons suspendus dans l'UI, en attente de l'accord de la mutuelle Solidaris (RIZIV/INAMI))

## Règles Git — NON NÉGOCIABLES
- **Jamais de commit direct sur `main`** — toujours `feature/xxx` ou `fix/xxx`
- **Toujours créer une PR** avant de merger dans `main`
- **CI doit passer** (type-check + lint + test + build) avant tout merge
- Format commit : `feat|fix|refactor|test|docs|chore|security(scope): description`

## Stack
- Vite 6 + React 18 + React Router v7 + TypeScript strict
- Tailwind CSS v4 + shadcn/ui + Motion
- Supabase (Auth + PostgreSQL + RLS + OAuth GitHub + Google)
- Vitest (tests unitaires) + Playwright (E2E — 3 suites : accessibility, mobile, seo)
- Vercel (déploiement auto sur push main)
- react-markdown + remark-gfm (rendu markdown — pages /changelog et /story)
- react-helmet-async (metas SEO/OG dynamiques par route — `HelmetProvider` dans `App.tsx`)

## Alias & imports
- `@/*` → `./src/*` (Vite + tsconfig)
- `~/` → racine du projet (Vite + tsconfig) — utiliser pour `CHANGELOG.md?raw`, `STORY.md?raw`

## Fichiers critiques — toucher avec précaution
- `src/app/data/curriculum.ts` — toutes les leçons et modules. Toute modification casse potentiellement les tests et la progression des utilisateurs.
- `src/app/context/ProgressContext.tsx` — état global de progression. Bug ici = perte de données utilisateur.
- `src/app/data/terminalEngine.ts` — moteur de commandes. Chaque nouvelle commande doit avoir un test dans `src/test/terminalEngine.test.ts`.

## Sécurité
- Stale chunk errors filtrées dans `src/lib/sentry.ts` `beforeSend` — self-healed par le guard dans `main.tsx`
- Zéro `dangerouslySetInnerHTML` dans le codebase
- Zéro secret côté client
- Zéro `any` TypeScript
- CSP configuré dans `vercel.json` — mettre à jour si nouveaux domaines externes ajoutés
- HSTS activé : `max-age=63072000; includeSubDomains; preload`
- Avatars OAuth (GitHub/Google) : couverts par `img-src 'self' data: https:`

## Phases
- Phase 0 ✅ Vercel live
- Phase 1 ✅ Landing + routing + RGPD + SEO + CI
- Phase 2 ✅ Analytics (Vercel Analytics + Sentry)
- Phase 3 ✅ Supabase Auth + DB — live (projet: `jdnukbpkjyyyjpuwgxhv`, eu-west-1)
- Phase 3.5 ✅ Landing upgrade + OAuth GitHub/Google + security hardening + sidebar auth (3 avril 2026)
- Phase 4 ✅ Curriculum v2 + multi-environment (Linux/macOS/Windows) + terminal profiles (9 avril 2026)
- Phase 5 🔄 Curriculum expansion — 10 modules, 52 leçons, 792 tests unitaires + 176 E2E Playwright (en cours)
- THI-84 ✅ Changelog public — CHANGELOG.md + STORY.md + routes /changelog /story + SEO (PRs #100–102, 13 avril 2026)

## Contenus narratifs — règle d'enrichissement
- `CHANGELOG.md` et `STORY.md` à la racine : mettre à jour à chaque release majeure ou décision significative
- Ne pas attendre une "grande release" — petits enrichissements réguliers préférables
- `/changelog` → décideurs/enseignants (métriques, releases) · `/story` → communauté (débats, décisions humain+IA)

## Sourcery — patterns récurrents à anticiper
- Imports relatifs profonds (`../../../`) → utiliser alias `~/` ou `@/`
- Détection inline vs block code dans react-markdown → utiliser présence de `className`, pas `'node' in props`
- `<pre>` remplacé par `<div>` → conserver la sémantique `<pre>` pour l'accessibilité

## Tech debt
- `src/lib/supabase.ts` importe depuis `src/app/types/` — dépendance inversée
  → à terme : déplacer vers `src/types/database.ts`
- `Dashboard.tsx` lignes 51 + 204 : `navigate('/learn/...')` → `navigate('/app/learn/...')` (redirect actif mais incohérent)

## Protocole de session — OBLIGATOIRE

### Agents disponibles (`.claude/agents/`)
- **`linear-sync`** — vérifie PRs GitHub vs statuts Linear, détecte incohérences
- **`curriculum-validator`** — valide structure de `curriculum.ts` avant toute modification
- **`test-runner`** — lance vitest, retourne uniquement failures + commandes sans test
- **`content-auditor`** — audit pédagogique A→Z : env coverage, cohérence curriculum↔moteur↔tests, liens externes, chaîne de prérequis, qualité validate(). Lancer avant chaque release majeure ou à la demande.
- **`security-auditor`** — audit cybersécurité black hat : OWASP Top 10 (2021), OWASP API Sec (2023), CSP L3, rate limiting, RLS, auth flow, supply chain, RGPD, vecteurs 2026. Lancer avant chaque release majeure, après mise à jour de dépendances, ou à la demande. (THI-53)

### Début de chaque session
1. Invoquer l'agent **`linear-sync`** → analyser son rapport, corriger les statuts Linear signalés
2. `git status` + `git log --oneline -5` → état de la branche courante
3. Lire l'issue Linear active avant d'écrire la moindre ligne

### Avant toute modification de `curriculum.ts`
- Invoquer l'agent **`curriculum-validator`** → analyser le rapport, corriger les CRITICAL avant de continuer

### Après chaque modification de `curriculum.ts` ou `terminalEngine.ts`
- Invoquer l'agent **`test-runner`** → si VERDICT = ❌ Fix required, corriger avant de proposer un commit

### Incohérences Linear à corriger dès détection
- Issue Done + PR non mergée → **In Review**
- Issue In Progress + PR ouverte → **In Review**
- Issue In Review + PR mergée → **Done**

### Règles merge
- CI verte **ET** Sourcery vérifié avant de proposer un merge — **dans cet ordre, sans exception**
  ```bash
  gh pr view N --comments 2>&1 | grep -A 15 -i "sourcery\|issue\|suggestion\|bug"
  ```
  Si Sourcery a commenté → corriger dans un commit fixup → repousser → ALORS proposer le merge
  Si Sourcery = SKIPPED (rate limit hebdomadaire atteint) → acceptable, procéder au merge
- **Jamais merger sans validation visuelle Vercel explicite de Thierry** (Chrome + mobile)
- Après merge → issue Linear → Done + mettre à jour `docs/plan.md`

### Migrations Supabase — auto-géré
- Toute nouvelle migration doit être appliquée **sans attendre** via le MCP Supabase ou le CLI
- MCP (prioritaire, Docker non requis) : `mcp__claude_ai_Supabase__apply_migration` avec `project_id: jdnukbpkjyyyjpuwgxhv`
- CLI (fallback si MCP indisponible) : `supabase db push --project-ref jdnukbpkjyyyjpuwgxhv`
- Ne jamais laisser une migration en attente dans les "post-merge à faire"

### Secrets GitHub — auto-géré
- Les secrets nécessaires au workflow CI/CD sont ajoutés via `gh secret set --repo thierryvm/TerminalLearning`
- Clés Supabase récupérées via `supabase projects api-keys --project-ref jdnukbpkjyyyjpuwgxhv`
- Ne jamais laisser un secret en attente dans les "post-merge à faire"

### Scope
- Changement hors scope détecté → signaler, commit séparé, ne pas agir silencieusement
- Chaque préoccupation = son propre commit (feature ≠ chore ≠ fix)

## Décisions en attente
- **Ko-fi + GitHub Sponsors** — dons suspendus dans l'UI jusqu'à l'accord de la mutuelle Solidaris (RIZIV/INAMI). GitHub Sponsors est activé sur la plateforme (9 avril 2026) mais les boutons dans l'app restent désactivés. Quand l'accord arrive : réactiver les cartes dans `Landing.tsx`, le lien footer, et mettre à jour le `donate` dans `terminalEngine.ts`.
- **Playwright** — e2e/ ajouté (3 suites : accessibility, mobile, seo). Exclure de vitest (`exclude: ['node_modules/**', 'e2e/**']` dans vitest.config.ts — ne jamais retirer).
