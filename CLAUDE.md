# CLAUDE.md — Terminal Learning

> Instructions spécifiques à ce projet. Priorité absolue sur le CLAUDE.md global.

## Contexte projet
App pédagogique pour apprendre le terminal. Bénévole, open source, 100% gratuit.
- **Live** : https://terminal-learning.vercel.app
- **Repo** : https://github.com/thierryvm/TerminalLearning
- **Vercel** : https://vercel.com/thierry-vanmeeterens-projects/terminal-learning
- **Ko-fi** : https://ko-fi.com/thierryvm (dons désactivés — attente autorisation mutuelle RIZIV)
- **GitHub Sponsors** : https://github.com/sponsors/thierryvm (idem)

## Règles Git — NON NÉGOCIABLES
- **Jamais de commit direct sur `main`** — toujours `feature/xxx` ou `fix/xxx`
- **Toujours créer une PR** avant de merger dans `main`
- **CI doit passer** (type-check + lint + test + build) avant tout merge
- Format commit : `feat|fix|refactor|test|docs|chore|security(scope): description`

## Stack
- Vite 6 + React 18 + React Router v7 + TypeScript strict
- Tailwind CSS v4 + shadcn/ui + Motion
- Supabase (Auth + PostgreSQL + RLS) — Phase 3
- Vitest (tests unitaires) — pas de Playwright encore (Phase 3+)
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

## Phases
- Phase 0 ✅ Vercel live
- Phase 1 ✅ Landing + routing + RGPD + SEO + CI
- Phase 2 ✅ Analytics (Vercel Analytics + Sentry)
- Phase 3 🔜 Supabase Auth + DB (projet: `jdnukbpkjyyyjpuwgxhv`, region: eu-west-1)
- Phase 4 🔮 Admin panel

## Décisions en attente
- GitHub Sponsors + Ko-fi — activation suspendue jusqu'à l'accord de la mutuelle RIZIV/INAMI
