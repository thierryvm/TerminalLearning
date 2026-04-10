# CLAUDE.md — Terminal Learning

> Instructions spécifiques à ce projet. Priorité absolue sur le CLAUDE.md global.

## Contexte projet
App pédagogique pour apprendre le terminal. Bénévole, open source, 100% gratuit.
- **Live** : https://terminal-learning.vercel.app
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
- Vitest (tests unitaires) — pas de Playwright encore
- Vercel (déploiement auto sur push main)

## Fichiers critiques — toucher avec précaution
- `src/app/data/curriculum.ts` — toutes les leçons et modules. Toute modification casse potentiellement les tests et la progression des utilisateurs.
- `src/app/context/ProgressContext.tsx` — état global de progression. Bug ici = perte de données utilisateur.
- `src/app/data/terminalEngine.ts` — moteur de commandes. Chaque nouvelle commande doit avoir un test dans `src/test/terminalEngine.test.ts`.

## Sécurité
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
- Phase 5 🔄 Curriculum expansion — 7 modules, 32 leçons, 242 tests unitaires + 176 E2E Playwright (en cours)

## Tech debt
- `src/lib/supabase.ts` importe depuis `src/app/types/` — dépendance inversée
  → à terme : déplacer vers `src/types/database.ts`
- `Dashboard.tsx` lignes 51 + 204 : `navigate('/learn/...')` → `navigate('/app/learn/...')` (redirect actif mais incohérent)

## Protocole de session — OBLIGATOIRE

### Début de chaque session
1. `gh pr list --state open` → état réel des PRs
2. Consulter Linear pour chaque PR ouverte → corriger les incohérences de statut immédiatement
3. `git status` + `git log --oneline -5` → état de la branche courante
4. Lire l'issue Linear active avant d'écrire la moindre ligne

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
- **Jamais merger sans validation visuelle Vercel explicite de Thierry** (Chrome + mobile)
- Après merge → issue Linear → Done + mettre à jour `docs/plan.md`

### Scope
- Changement hors scope détecté → signaler, commit séparé, ne pas agir silencieusement
- Chaque préoccupation = son propre commit (feature ≠ chore ≠ fix)

## Décisions en attente
- **Ko-fi + GitHub Sponsors** — dons suspendus dans l'UI jusqu'à l'accord de la mutuelle Solidaris (RIZIV/INAMI). GitHub Sponsors est activé sur la plateforme (9 avril 2026) mais les boutons dans l'app restent désactivés. Quand l'accord arrive : réactiver les cartes dans `Landing.tsx`, le lien footer, et mettre à jour le `donate` dans `terminalEngine.ts`.
- **Playwright** — e2e/ ajouté (3 suites : accessibility, mobile, seo). Exclure de vitest (`exclude: ['node_modules/**', 'e2e/**']` dans vitest.config.ts — ne jamais retirer).
