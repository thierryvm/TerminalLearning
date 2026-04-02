# Terminal Learning — Plan de lancement public

> Dernière mise à jour : 2 avril 2026
> Statut global : **Phase 3 en cours** (Supabase Auth implémenté — PR #11 ouverte)

---

## Objectif

Publier Terminal Learning en ligne, attirer des débutants, et ouvrir une voie de revenu
passif via dons sans agressivité. Projet portfolio IA-assisted dev.

---

## ⚠️ Alertes critiques (ne pas ignorer)

### RIZIV/INAMI — GitHub Sponsors (RISQUE MOYEN)
Invalidité longue durée → les dons pourraient être interprétés comme revenus professionnels.
**Action obligatoire** : contacter le conseiller médical de la mutuelle par écrit AVANT
d'activer GitHub Sponsors. En attendant : boutons présents dans le code mais désactivés.

### Licence MIT
Tout le monde peut copier/modifier/vendre le code sans rétribution.
Acceptable pour portfolio. Alternative AGPL-3.0 si protection commerciale souhaitée plus tard.

### RGPD Belgique ✅ TRAITÉ
Page `/privacy` créée. Vercel Analytics sans cookies → pas de bannière cookie.

---

## PRs ouvertes (2 avril 2026)

| PR | Branche | Contenu | Statut |
|----|---------|---------|--------|
| #10 | `chore/update-project-state` | CLAUDE.md ✅, og-image.png, Sourcery fixes | CI ✅ — prêt à merger |
| #11 | `feat/supabase-phase3-auth` | Phase 3 complète (Auth + DB + ProgressSync) | ⚠️ Configurer env vars Vercel avant merge |
| #12 | `docs/restructure-project` | /docs structure, zombie hook supprimé, docs à jour | CI en attente |

**Ordre de merge recommandé : #10 → #12 → #11**

**Avant de merger #11 :**
1. Supabase dashboard → Authentication → Providers → activer GitHub OAuth
2. Supabase dashboard → Authentication → Providers → activer Google OAuth
3. Vercel → Settings → Environment Variables → ajouter `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

---

## Statut des phases

### ✅ Phase 0 — Déploiement (TERMINÉ)
- [x] Build validé, vercel.json, .gitignore
- [x] Déployé sur Vercel — https://terminal-learning.vercel.app
- [x] Headers sécurisés (CSP, X-Frame-Options, etc.)

### ✅ Phase 1 — Landing + Routing + CI (TERMINÉ)
- [x] Landing page (hero animé, features, roadmap, support)
- [x] Routing : `/` Landing, `/app` Dashboard, `/privacy` RGPD
- [x] SEO + OpenGraph + og-image.png (1200×630, Twitter/X compatible)
- [x] Commandes terminal : `donate`, `support`, `about`, `hall-of-fame`
- [x] CI GitHub Actions (type-check → lint → test → build)
- [x] Documentation : README, CONTRIBUTING, SECURITY, ARCHITECTURE

### ✅ Phase 2 — Analytics + Monitoring (TERMINÉ)
- [x] Vercel Analytics (GDPR-friendly, sans cookies)
- [x] Sentry free tier erreurs front (PR #9)

### 🔜 Phase 3 — Supabase Auth (EN COURS — PR #11)

#### Implémenté (PR #11, pas encore mergé)
- [x] Supabase project `jdnukbpkjyyyjpuwgxhv` — `ACTIVE_HEALTHY`, eu-west-1
- [x] Migration SQL appliquée : `profiles` + `progress` + RLS
- [x] `src/lib/supabase.ts` — client typé, null-safe (fallback localStorage)
- [x] `src/app/types/database.ts` — types DB Supabase v2
- [x] `src/app/context/AuthContext.tsx` — session, user, signOut
- [x] `src/app/context/ProgressContext.tsx` — étendu avec syncStatus + upsert Supabase
- [x] `src/app/lib/progressSync.ts` — mergeProgress() + getDelta()
- [x] `src/app/components/auth/LoginModal.tsx` — email + GitHub + Google OAuth
- [x] `src/app/components/auth/UserMenu.tsx` — avatar + sync badge + logout
- [x] `src/app/components/auth/AuthCallback.tsx` — handler /auth/callback PKCE
- [x] `/auth/callback` route ajoutée dans `routes.ts`
- [x] `vercel.json` CSP : connect-src += *.supabase.co
- [x] 10 nouveaux tests (progressSync) — total 42/42

#### À faire avant mise en production
- [ ] Activer GitHub OAuth dans Supabase dashboard
- [ ] Activer Google OAuth dans Supabase dashboard
- [ ] Ajouter VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY dans Vercel env vars
- [ ] Tester login/logout/OAuth en local avec .env.local
- [ ] Vérifier sync local→remote après connexion

#### Tech debt noté (post-merge)
- `src/lib/supabase.ts` importe depuis `src/app/types/` — dépendance inversée
  → à terme : déplacer vers `src/types/database.ts`

### 🔮 Phase 4 — Admin Panel (après signal trafic)

#### Backend stack
- Supabase PostgreSQL + Auth + RLS + Edge Functions + Audit Log
- GitHub Actions cron : npm audit quotidien, Dependabot
- Vercel Analytics, Sentry, UptimeRobot (free)

#### Sécurité admin — 7 couches
| Couche | Mécanisme |
|--------|-----------|
| Auth | Supabase Auth + 2FA TOTP obligatoire |
| JWT | Access token 15min + refresh 7j + rotation auto |
| RBAC | Rôle `admin` vérifié Edge Function + RLS |
| Rate limit | Max 5 tentatives → lockout 30min |
| Audit log | Qui / quoi / quand / IP — table immuable |
| CSP | Nonce-based strict pour `/admin` |
| Secrets | Supabase Vault + Vercel env vars |

#### Fichiers à créer Phase 4
- `src/app/components/admin/AdminLayout.tsx`
- `src/app/components/admin/AnalyticsDashboard.tsx`
- `src/app/components/admin/HealthMonitor.tsx`
- `src/app/components/admin/SecurityCenter.tsx`
- `src/app/components/admin/UpdatesPanel.tsx`
- `src/app/components/admin/HallOfFameManager.tsx`
- `supabase/functions/audit-log/index.ts`
- `supabase/functions/security-report/index.ts`
- `.github/workflows/security-audit.yml`

---

## Architecture Multi-Agents

```
┌──────────────────────────────────────────┐
│           ORCHESTRATOR AGENT             │
│  Coordonne, valide, intègre, merge       │
└──────┬──────────┬────────────┬───────────┘
       │          │            │
  ┌────▼───┐ ┌───▼────┐ ┌────▼───────┐
  │FRONTEND│ │SECURITY│ │HACKER BLACK│
  │ Agent  │ │ Agent  │ │   Agent    │
  └────────┘ └────────┘ └────────────┘
                  └──────────┬──────────┘
              ┌──────────────▼───────────┐
              │      QA / TEST Agent     │
              │  Vitest + Playwright     │
              └──────────────────────────┘
```

---

## Logo

Concept : `>_` dans un conteneur rounded square.
Couleurs : fond `#0d1117`, symbole `emerald-500` (#10b981).
Fichiers : `public/logo.svg` ✅, `public/favicon.svg` ✅, `public/og-image.png` ✅

---

## Décisions en attente

- **GitHub Sponsors + Ko-fi** : activation suspendue jusqu'à l'accord de la mutuelle RIZIV/INAMI
- **og:image compte social** : compte perso (@thierryvm) vs compte projet — pas encore décidé
