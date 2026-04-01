# Terminal Learning — Plan de lancement public

> Dernière mise à jour : 31 mars 2026
> Statut global : **Phase 0 en cours** (build validé, déploiement Vercel imminent)

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
Sources : INAMI activité autorisée bénévole.

### Licence MIT — implications
Tout le monde peut copier/modifier/vendre le code sans rétribution.
Acceptable pour portfolio. Alternative AGPL-3.0 si protection commerciale souhaitée plus tard.

### RGPD Belgique
Politique de confidentialité obligatoire même sans newsletter.
Page `/privacy` à créer. Pas de bannière cookie si Vercel Analytics sans cookies.

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

**FRONTEND** : Landing, routing /app, composants, design system, animations (Motion).
**SECURITY** : Headers CSP/HSTS, rate limiting, CSRF/XSS, Zod validation, OSINT check, Dependabot.
**HACKER BLACK** : Tests offensifs basés sur OWASP ZAP / Burp Suite patterns — XSS payloads,
  rate limit bypass (X-Forwarded-For, GraphQL batching, WebSocket), CSRF bypass,
  RLS bypass Supabase, JWT leakage, CORS misconfiguration, DDoS simulation.
**QA** : Tests unitaires Vitest obligatoires par feature, E2E Playwright, coverage report.

---

## Statut des phases

### ✅ Phase 0 — Déploiement Vercel (TERMINÉ)
- [x] Build validé (`npm run build` → 2.37s, 0 erreur)
- [x] `vercel.json` créé (SPA routing + headers sécurisés)
- [x] `.gitignore` vérifié (conforme)
- [x] Déployé sur Vercel — URL live : https://terminal-learning.vercel.app
- [ ] Vérification headers sécurisés (securityheaders.com) — à faire

**Fichiers créés :**
- `vercel.json` — SPA rewrites + X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
  Referrer-Policy, Permissions-Policy

---

### ✅ Phase 1 — Landing Page + /app routing + Documentation (TERMINÉ)

#### Routing
```
/ → Landing.tsx (nouveau)
/app → Layout actuel (Dashboard, LessonPage, CommandReference)
/privacy → PrivacyPolicy.tsx (RGPD)
```

#### Design Landing (2026 trends + charte existante)
- Couleurs existantes : bg `#0d1117`, cards `#161b22`, accent `emerald-500`, fonts JetBrains Mono + Inter
- Hero : glassmorphism sombre + prompt terminal animé (effet typing via Motion)
- Micro-interactions : 150–300ms, parallax léger au scroll
- Structure :
  ```
  Hero dark (prompt animé "$ learn-terminal --for-beginners")
  ├── CTA : [Commencer →] [Soutenir ♥]
  Features dark/glassmorphic (3 cards)
  Roadmap (phases avec statuts)
  Support (GitHub Sponsors désactivé jusqu'à autorisation mutuelle)
  About (projet bénévole, open source, sans infos personnelles sensibles)
  Footer (App · GitHub · Privacy · MIT License)
  ```

#### SEO + GEO + OpenGraph (réseaux sociaux)
- `index.html` : title, meta description, canonical URL
- OpenGraph : `og:title`, `og:description`, `og:image` (1200×630px), `og:url`, `og:type`
- Twitter/X Card : `twitter:card=summary_large_image`, `twitter:image`
- TikTok / Instagram : même og:image utilisée (format carré 1080×1080 en variante)
- GEO meta : `geo.region=BE`, `geo.placename=Belgium` pour visibilité locale
- `robots.txt` + `sitemap.xml` générés au build
- `og:image` = screenshot de l'app ou illustration terminal aux couleurs du projet

#### Logo
- Fichier : `public/logo.svg` — créé (voir section Logo)
- Favicon : `public/favicon.svg` dérivé du logo
- Usage : `og:image`, header app, README badges

#### Commandes terminal nouvelles
- `donate` / `support` : bloc ASCII avec liens GitHub Sponsors + Ko-fi
- `about` : infos projet, version, licence MIT
- `hall-of-fame` : liste des supporters publics

#### Page À propos
- Histoire du projet (bénévole, open source, 100% gratuit)
- Sans données personnelles sensibles
- Lien GitHub Sponsors (désactivé jusqu'à autorisation mutuelle)

#### Hall of Fame
- Section publique sur la landing ET dans l'app
- Opt-in : les supporters choisissent d'apparaître publiquement
- Structure préparée dès Phase 1, alimentée manuellement en Phase 4

#### Documentation obligatoire
- `README.md` — restructuré : badges, démo live, install, architecture, roadmap, licence
- `CONTRIBUTING.md` — guide contribution open source
- `SECURITY.md` — politique sécurité, procédure report faille
- `ARCHITECTURE.md` — diagramme multi-agents, stack, flux données
- Commentaires JSDoc sur tous les nouveaux composants
- Chaque composant : header de fichier avec description, props, usage

#### Fichiers impactés Phase 1
- `src/app/routes.ts` — restructuration routing
- `src/app/components/Landing.tsx` — nouveau
- `src/app/components/PrivacyPolicy.tsx` — nouveau
- `src/app/components/SupportCard.tsx` — nouveau
- `src/app/data/terminalEngine.ts` — +3 commandes
- `src/app/components/Layout.tsx` — vérifier base path /app
- `index.html` — SEO meta tags + OpenGraph
- `public/logo.svg` — logo créé ✅
- `public/favicon.svg` — favicon
- `public/robots.txt` — nouveau
- `README.md` — refonte
- `CONTRIBUTING.md` — nouveau
- `SECURITY.md` — nouveau
- `ARCHITECTURE.md` — nouveau

#### Tests unitaires Vitest (obligatoires)
| Feature | Tests |
|---------|-------|
| donate/support/about commands | Input/output, error cases |
| Routing /app vs / | Render correct, redirections |
| Landing CTA | Navigation /app, liens externes |
| PrivacyPolicy | Éléments RGPD obligatoires présents |
| Progress tracking | Save/load, edge cases 0%/100% |

#### Sécurité champs (dès Phase 1)
- Validation Zod sur tous les inputs
- Pas de dangerouslySetInnerHTML
- CSP déjà dans vercel.json
- Aucun secret côté client

---

### ✅ Phase 2 — Analytics + Monitoring (TERMINÉ)
- Vercel Analytics (GDPR-friendly, sans cookies) ✅
- Sentry free tier erreurs front ✅ (PR #9)
- Pas de bannière cookie si Analytics sans cookies

---

### 🔮 Phase 3 — Supabase Auth (sur signal trafic)

> Décisions architecturales (01 avril 2026)

#### Auth
- Email/password + GitHub OAuth + Google OAuth
- Supabase Auth (pas de lib custom)
- 2FA TOTP optionnel pour l'utilisateur standard (obligatoire pour admin en Phase 4)
- Rate limiting : 5 tentatives → lockout progressif (Supabase Auth built-in)
- JWT access token 1h + refresh 7j + rotation auto
- Protection brute-force, CSRF, session fixation

#### Stratégie progression — Hybrid Sync
- **Supabase = source de vérité** (connecté)
- **localStorage = cache offline** (non connecté ou session expirée)
- **Merge à la connexion** : `Math.max(local, remote)` par leçon — jamais rétrograder
- **Sync en temps réel** : upsert Supabase à chaque leçon complétée
- **ProgressContext.tsx** étendu : `syncStatus: 'local' | 'synced' | 'syncing' | 'error'`

#### DB Schema (Supabase)
```sql
-- profiles (étend auth.users)
id uuid references auth.users primary key
username text unique
created_at timestamptz default now()

-- progress
user_id uuid references profiles(id)
lesson_id text not null
completed boolean default false
completed_at timestamptz
score integer  -- 0-100
primary key (user_id, lesson_id)

-- RLS obligatoire sur les 2 tables
```

#### Sécurité
- RLS activé sur toutes les tables (users ne voient que leurs données)
- Zod validation sur tout input avant upsert
- Pas de service_role key côté client
- PKCE flow pour OAuth (pas implicit flow)

#### Fichiers à créer/modifier
- `src/app/context/AuthContext.tsx` — nouveau
- `src/app/context/ProgressContext.tsx` — étendre avec sync Supabase
- `src/app/components/auth/LoginModal.tsx` — email + GitHub + Google
- `src/app/components/auth/UserMenu.tsx` — avatar, déconnexion, sync status
- `src/app/lib/supabase.ts` — client Supabase
- `src/app/lib/progressSync.ts` — logique merge local/remote
- `supabase/migrations/001_init.sql` — schema initial
- `src/test/progressSync.test.ts` — tests merge obligatoires

#### Tests obligatoires
| Scénario | Test |
|---------|------|
| Merge local > remote | local wins |
| Merge remote > local | remote wins |
| Merge égal | no upsert |
| Sync offline → online | queue flushed |
| RLS bypass attempt | rejected |

- Prérequis : autorisation mutuelle pour GitHub Sponsors (indépendant de la Phase 3)

---

### 🔮 Phase 4 — Admin Panel (hyper-sécurisé)

#### Backend stack
- **Supabase** : PostgreSQL + Auth + RLS + Edge Functions + Audit Log
- **Pas de Prisma** : Supabase génère les types TS automatiquement (`supabase gen types`)
- **GitHub Actions cron** : npm audit quotidien, vérification versions frameworks, Dependabot
- **Vercel Analytics** : usage graphs, sessions, page views
- **Sentry** : erreurs front en temps réel
- **UptimeRobot** (free) : monitoring uptime externe

#### Sécurité admin — 7 couches
| Couche | Mécanisme |
|--------|-----------|
| Auth | Supabase Auth + 2FA TOTP obligatoire (Google Authenticator) |
| JWT | Access token 15min + refresh 7j + rotation auto |
| RBAC | Rôle `admin` vérifié Edge Function + RLS Supabase |
| Rate limit | Max 5 tentatives login → lockout 30min |
| Audit log | Qui / quoi / quand / IP — table Supabase immuable |
| CSP | Nonce-based strict pour `/admin` uniquement |
| Secrets | Supabase Vault + Vercel env vars — jamais en clair |

#### Dashboard /admin — fonctionnalités

**📊 Analytics**
- Visiteurs, sessions, leçons les plus consultées
- Taux de complétion par module
- Graphiques utilisation (Recharts — déjà installé)
- Retention utilisateurs

**🏥 Santé du site**
- Uptime (UptimeRobot free)
- Temps de réponse, status build Vercel
- Erreurs Sentry feed temps réel
- Score headers sécurisés

**🔐 Sécurité**
- npm audit résultats (cron GitHub Actions quotidien)
- CVEs détectés dans les 87 dépendances actuelles
- Alertes Dependabot via GitHub API
- Tentatives connexion échouées + IPs bloquées
- Rapport HACKER BLACK (dernière analyse offensive)

**🔄 Mises à jour frameworks**
- React / Vite / Tailwind / shadcn / React Router / Motion
- Badge "Mise à jour disponible" + niveau risque (patch/minor/major)
- Lien direct vers le CHANGELOG du package

**👥 Utilisateurs** *(Phase 3 requise)*
- Users actifs, progression individuelle, modération

**🏆 Hall of Fame** *(depuis Terminal Learning.md)*
- Liste supporters opt-in, validation avant affichage public

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
- `.github/workflows/deps-check.yml`

---

## Logo

Concept : `>_` (prompt terminal universel) dans un conteneur rounded square.
Couleurs : fond `#0d1117`, symbole `emerald-500` (#10b981).
Simple, mémorable, scalable — fonctionne en favicon 16px comme en banner 800px.

Fichier : `public/logo.svg`

---

## Vérification end-to-end

**Phase 0** :
1. `npm run build` ✅ (2.37s, 0 erreur)
2. `vercel --prod` → URL live
3. Accès mobile + desktop sans 404
4. `/learn/navigation/intro` accessible
5. Headers sécurisés sur securityheaders.com

**Phase 1** :
1. `/` → landing (hero animé visible)
2. `/app` → dashboard
3. `/privacy` → politique RGPD
4. Commande `donate` → bloc ASCII
5. `npm test` → 100% pass
6. OpenGraph visible sur Twitter Card Validator

**Phase 4** :
1. `/admin` sans token → redirect login
2. 2FA prompt après login admin
3. HACKER BLACK : aucun bypass sur endpoints critiques
