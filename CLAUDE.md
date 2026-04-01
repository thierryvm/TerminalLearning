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
- Vitest (tests unitaires) — pas de Playwright encore (Phase 2)
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
- Phase 2 🔜 Analytics (Vercel Analytics ✅) + Sentry
- Phase 3 🔮 Supabase Auth + DB
- Phase 4 🔮 Admin panel

## Décisions en attente
- `og:image` PNG pour Twitter/X — décision réseaux sociaux pas encore prise (compte perso vs compte projet)
- GitHub Sponsors + Ko-fi — activation suspendue jusqu'à accord mutuelle RIZIV/INAMI
