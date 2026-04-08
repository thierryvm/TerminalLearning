# Terminal Learning — Plan de lancement public

> Dernière mise à jour : 8 avril 2026
> Statut global : **Phase 4 TERMINÉE** — Curriculum v2 + sélection d'environnement + terminal profiles en prod

---

## Objectif

Devenir l'outil pédagogique de référence pour apprendre le terminal et le workflow développeur,
proposé aux **écoles et universités** pour former des développeurs full-stack autonomes à 100%.
Projet open source, 100% gratuit, IA-assisted dev.

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
- [x] Sentry free tier — projet `terminal-learning`, DSN configuré dans Vercel env vars

### ✅ Phase 3 — Supabase Auth (TERMINÉ — en production)

#### Implémenté et mergé
- [x] Supabase project `jdnukbpkjyyyjpuwgxhv` — `ACTIVE_HEALTHY`, eu-west-1
- [x] Migration SQL appliquée : `profiles` + `progress` + RLS
- [x] `src/lib/supabase.ts` — client typé, null-safe (fallback localStorage)
- [x] `src/app/types/database.ts` — types DB Supabase v2
- [x] `src/app/context/AuthContext.tsx` — session, user, signOut
- [x] `src/app/context/ProgressContext.tsx` — étendu avec syncStatus + upsert Supabase
- [x] `src/app/lib/progressSync.ts` — mergeProgress() + getDelta()
- [x] `src/app/components/auth/LoginModal.tsx` — email/password + OAuth GitHub + Google (activés le 3 avril 2026)
- [x] `src/app/components/auth/UserMenu.tsx` — avatar + sync badge + logout
- [x] `src/app/components/auth/AuthCallback.tsx` — handler /auth/callback PKCE
- [x] `/auth/callback` route ajoutée dans `routes.ts`
- [x] `vercel.json` CSP : connect-src += *.supabase.co + *.supabase.io
- [x] 10 nouveaux tests (progressSync) — total 42/42
- [x] Variables Vercel configurées : `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` + `VITE_SENTRY_DSN`
- [x] `.env.local` créé localement (non commité)
- [x] Sentry projet `terminal-learning` créé et connecté à Vercel

#### Complété post-Phase 3 (3 avril 2026)
- [x] OAuth GitHub activé — App créée sur github.com/settings/developers
- [x] OAuth Google activé — Projet Google Cloud Console "Terminal Learning"
- [x] Supabase URL Configuration : Site URL + Redirect URLs prod + localhost
- [x] Sidebar : UserMenu + lien Accueil dans le footer (PR #19)

#### Tech debt noté
→ Voir `CLAUDE.md § Tech debt Phase 3` (source de vérité unique)

### ✅ Phase 4 — Curriculum v2 + Environment Selection (TERMINÉ — 8 avril 2026)

- Multi-environnement : Linux / macOS / Windows avec sélecteur landing + sidebar
- Terminal profiles : prompt zsh/bash/PS, chemin Windows-style, MOTD par env
- Help contextuel : `help <cmd>` retourne aide ciblée + exemples par env
- 30+ alias PowerShell, commandes macOS/Windows
- 192 tests unitaires
- Fix sync TOKEN_REFRESHED, OAuth loading states

### 🔜 Phase 5 — Curriculum Expansion (prochain sprint)

5 nouveaux modules vers fullstack autonome :
- Module 7 : Variables & Scripts bash
- Module 8 : Réseau & SSH
- Module 9 : Git Fondamentaux
- Module 10 : GitHub & Collaboration (+ workflow Linear)
- Module 11 : L'IA comme outil dev

### 🔮 Phase 6 — Terminal Multi-Session + Changelog

- Onglets multiples dans le terminal (architecture TerminalManager)
- Changelog visible hebdomadaire/mensuel sur l'app
- Mobile : max 3 sessions, compact tab switcher

### 🔮 Phase 7 — Admin Panel (après signal trafic)

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

- **GitHub Sponsors** : activation suspendue jusqu'à l'accord de la mutuelle RIZIV/INAMI
- **Ko-fi** : compte créé (https://ko-fi.com/thierryvm), même risque RIZIV — en attente d'autorisation

---

## Sentry — validation en prod requise

Sentry est configuré et déployé via Vercel. Pour confirmer que les events remontent :
1. Vérifier que `VITE_SENTRY_DSN` est bien présent dans Vercel → Settings → Environment Variables
2. Sur le live, ouvrir la console DevTools et taper `throw new Error("test sentry")`
3. Vérifier dans le dashboard Sentry que l'event est bien reçu

> Sentry est désactivé en local (`enabled: import.meta.env.PROD`). Ne capture rien hors production.
