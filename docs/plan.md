# Terminal Learning — Plan de lancement public

> Dernière mise à jour : 10 avril 2026
> Statut global : **Phase 5 EN COURS** — Curriculum Expansion : 7 modules ✅, 32 leçons, 242 tests unitaires + 176 E2E — Architecture stratégique validée (THI-35) : Terminal Sentinel (Phase 5.5), RBAC complet (Phase 7), Admin Panel 7 sections (Phase 9), PWA avancée (Phase finale)

---

## Correspondance Linear ↔ Phases ↔ Modules

| Issue Linear | Phase | Contenu |
|-------------|-------|---------|
| THI-27 | 5 | Module 8 — Réseau & SSH (`ping`, `curl`, `wget`, `ssh`, `scp`, DNS) |
| THI-28 | 5 | Modules 9+10 — Git Fondamentaux + GitHub & Collaboration *(combinés)* |
| THI-29 | 5 | Module 11 — L'IA comme outil dev |
| THI-35 | docs | Architecture stratégique — Terminal Sentinel, RBAC, Admin Panel, PWA ✅ Done |
| THI-36 | 5.5 | Terminal Sentinel — outil d'audit de sécurité automatisé |
| THI-37 | 7 | RBAC complet — student / teacher / institution / admin |

---

## Objectif

Devenir l'outil pédagogique de référence pour apprendre le terminal et le workflow développeur,
proposé aux **écoles et universités** pour former des développeurs full-stack autonomes à 100%.
Projet open source, 100% gratuit, IA-assisted dev.

---

## ⚠️ Alertes critiques (ne pas ignorer)

### INAMI — GitHub Sponsors (RISQUE MOYEN)
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

### 🔄 Phase 5 — Curriculum Expansion (EN COURS — démarré 9 avril 2026)

#### ✅ Livré (PR #36 + PR #37 + PR #38 + PR #40 + PR #43)
- Module 7 — Variables & Scripts (6 leçons) : `export`, `$PATH`, `.env`, shell config, scripts bash, `cron`
- Enrichissement modules 4–6 : permissions (chown, sudo, security), processus (top, bg/fg), redirection (stderr, tee)
- CommandReference entièrement env-aware : filtres par env, syntaxe + exemples par env, badge environnement
- LessonPage : rendu env-aware (`contentByEnv`, `labelByEnv`), prompt `PS>` en cyan
- TerminalPreview : `text-left` + env-aware (prompt, barre de titre, séquences de commandes)
- 242 tests unitaires + 176 tests Playwright E2E — 32 leçons, 7 modules
- README entièrement réécrit pour 3 audiences (débutants, devs, sponsors) — PR #40 (THI-32)
- Route-level code splitting : `React.lazy()` + `Suspense` + `PageLoader` — chaque route = chunk dédié — PR #43 (THI-33)
- Script `generate-demo-gif.cjs` : capture GIF de l'animation env-switching via Playwright — `npm run generate-demo`

#### ✅ README rewrite (THI-32 — branche `docs/readme-rewrite`)
- Réécriture README orientée débutants + contributeurs + sponsors futurs
- Tagline courte, hook émotionnel, section dédiée environment switching
- Section Multi-Agent Architecture retirée → docs/ARCHITECTURE.md
- Stack corrigée (Vite 6 + React 18, non Next.js)

#### 🔄 Lazy loading routes (THI-33 — branche `perf/lazy-routes`)
> ⚠️ PRIS EN CHARGE par session Claude Code #1 (session README/docs) à la demande de Thierry.
> L'autre session Claude Code active NE DOIT PAS travailler sur ce ticket.
- `React.lazy()` + `Suspense` sur tous les composants de route dans `src/app/routes.ts`
- Fallback `<PageLoader>` accessible dans `App.tsx`
- Objectif : réduire le bundle initial de ~30-40%, améliorer LCP/TTI landing

#### 🔜 Modules planifiés (THI-27 à THI-29)
- **Module 8 — Réseau & SSH** (THI-27) : `ping`, `curl`, `wget`, `ssh`, `scp`, DNS
- **Module 9 + 10 — Git Fondamentaux + GitHub & Collaboration** (THI-28) : `init`, `add`, `commit`, branches, remotes, PRs, Issues, GitHub Actions
- **Module 11 — L'IA comme outil dev** (THI-29) : Claude Code CLI, prompts contextuels, limites et risques

#### 🔮 Couches additionnelles (backlog)
- **Monitoring & Outils système** : module dédié `htop`, `ps`, `lsof`, `df`/`du`, `free`
- **Éditeurs de texte** : nano (éditions rapides) + vim/neovim (cours complet interactif avec exercices)
  - nano : bases, sauvegarder, quitter, rechercher
  - vim : modes, navigation, édition, `.vimrc`
  - neovim : intro, écosystème plugins (lazy.nvim), workflow développeur
- **Cours complets dédiés** (vision long terme) : Git approfondi, Docker, shell scripting masterclass

### 🔮 Phase 5b — Qualité pédagogique des exercices (après merge PR #36/#37)

> Inspiré de : OverTheWire (niveaux enchaînés), Missing Semester MIT (contexte réel), cmdchallenge (one-liners)

#### Principes (best practices 2026)
- **Niveau 1–2** : 3–5 exercices guidés + 1 défi libre par leçon
- **Niveau 3** : 5–7 exercices dont 2 en contexte réel (ex. "structure un projet")
- **Niveau 4–5** : 3–5 exercices ouverts, validés par output attendu (pas par commande exacte)
- **Hint progressif** : après 2 tentatives → indice partiel ; après 4 → commande suggérée
- **Répétition espacée implicite** : chaque commande apprise réutilisée dans les 2 leçons suivantes
- **Types d'exercices à implémenter** :
  1. `fill-in-flag` — commande fournie, trouver le bon flag
  2. `objective-result` — objectif donné, l'utilisateur choisit sa commande
  3. `error-correction` — commande cassée à réparer
  4. `one-liner-progressif` — construire une pipeline étape par étape
  5. `scenario-context` — scénario réaliste (déployer, déboguer, analyser un log)

#### Nouveaux champs à ajouter à `Exercise`
```typescript
type ExerciseType = 'fill-flag' | 'objective' | 'error-fix' | 'pipeline' | 'scenario'
// Exercise.type?: ExerciseType
// Exercise.hintAfterAttempts?: number  (défaut: 2)
// Exercise.alternatives?: string[]     (commandes équivalentes acceptées)
// Exercise.contextSetup?: string       (description du scénario)
```

---

### 🔮 Phase 5c — Modules avancés : fullstack → expert réseaux/serveurs

> Objectif : atteindre le niveau senior fullstack autonome + expert réseaux/serveurs.
> Chaque module = env-aware (Linux / macOS / Windows).

| Module | Titre | Niveau | Priorité |
|--------|-------|--------|---------|
| 8 | Réseau & SSH | 3 | THI-27 |
| 9 | Git Fondamentaux | 3 | THI-28 |
| 10 | GitHub & Collaboration | 3 | THI-29 |
| 11 | Monitoring & Outils système | 4 | Backlog |
| 12 | Éditeurs de texte (nano + vim/neovim) | 3 | Backlog |
| 13 | Shell Scripting avancé | 4 | Backlog |
| 14 | Docker CLI | 4 | Backlog |
| 15 | Cybersécurité fondamentale | 4 | Backlog |
| 16 | Administration serveur | 5 | Backlog |
| 17 | L'IA comme outil dev | 3 | THI-30 |

#### Catégories de commandes manquantes identifiées
**Fullstack** : `sed`, `awk`, `xargs`, `find` (regex), `ln`, `which`, `type`, `nohup`, `apt`/`brew`, `dpkg`, scripts bash (boucles, conditions, fonctions), Git avancé (`stash`, `rebase`, `bisect`, `reflog`)

**Réseaux/Serveurs** : `ping`, `traceroute`/`mtr`, `netstat`/`ss`, `curl` (avancé), `wget`, `rsync`, `scp`, `sftp`, `systemctl`, `journalctl`, `ufw`, `iptables`, `df`/`du`/`free`, `iostat`, `lsof`, Docker CLI, Nginx config via CLI

**Cybersécurité (non-offensif)** : `sha256sum`/`md5sum`, `getfacl`/`setfacl`, `visudo`, `last`/`who`/`w`, `gpg --verify`, `lsof -i`, `netstat -tulnp`, `wevtutil` (Windows), `Get-EventLog`

---

---

### 🔮 Phase 5.5 — Terminal Sentinel (THI-36)

> Outil d'audit de sécurité périodique — vitrine de sécurité professionnelle et signal de confiance pour les écoles/universités.

#### Principe
- **Audite les défenses** — ne simule pas d'attaque active sur la production (risque ban Vercel/Supabase)
- Résultats visibles dans le Security Center (Phase 9)
- Open source : démontre la maturité sécurité du projet

#### Composant A — GitHub Actions hebdomadaire
```yaml
# .github/workflows/security-sentinel.yml
# Cron : lundi 06:00 UTC + dispatch manuel
checks:
  - npm audit (vulnérabilités des dépendances)
  - gitleaks (secrets accidentellement commités)
  - Headers HTTP : CSP, HSTS, X-Frame-Options, Referrer-Policy
  - Cookies : Secure + HttpOnly + SameSite sur tous les cookies auth
output:
  - Rapport JSON → table `security_reports` Supabase
  - Email résumé hebdo → Thierry
```

#### Composant B — Script Playwright local
```bash
# scripts/security-audit.cjs — avant chaque release majeure
node scripts/security-audit.cjs [--url https://terminal-learning.vercel.app]
checks:
  - Messages d'erreur auth génériques (pas de leak "user not found" vs "wrong password")
  - Rate limiting actif sur /auth et /api endpoints
  - Routes /admin inaccessibles sans RBAC (retournent 401/403, pas 404)
  - Absence de stack traces / console.error en prod
  - Validation que les chunks lazy ne contiennent pas de secrets
output:
  - Rapport JSON : security-audit-report.json
  - Résumé terminal lisible avec score de santé
```

#### Tests requis
- Tests unitaires : fonctions de parsing et scoring des rapports
- Dry-run CI : le workflow GitHub Actions est valide syntaxiquement

---

### 🔮 Phase 6 — Terminal Multi-Session + Changelog

- Onglets multiples dans le terminal (architecture `TerminalManager`)
- Changelog visible hebdomadaire/mensuel sur l'app
- Mobile : max 3 sessions, compact tab switcher
- Desktop : split-pane optionnel

---

### 🔮 Phase 7 — Espace Membre + RBAC complet (THI-37)

> Couche utilisateur complète — pré-requis à l'Admin Panel et à l'ouverture aux écoles/universités.

#### Modèle de rôles (validé — 10 avril 2026)

| Rôle / État | Type | Périmètre | Notes |
|-------------|------|-----------|-------|
| `super_admin` | Rôle permanent | Global | Thierry uniquement — accès total |
| `institution_admin` | Rôle permanent | Son institution | Approuve ses enseignants, voit ses étudiants |
| `teacher` | Rôle permanent | Ses classes | Statut vérifié via approval flow |
| `pending_teacher` | État transitoire | Aucun (en attente) | Inscrit comme enseignant, en attente d'approbation admin — accès student uniquement |
| `student` | Rôle permanent | Sa progression | Self-register ou invitation enseignant |
| `public` | Non authentifié | Lecture curriculum | Anonyme — pas de compte requis |

#### Flow de vérification enseignant
```
1. Inscription → role_request = 'teacher' + nom institution
2. Compte passe en statut pending_teacher
3. Notification → super_admin ou institution_admin dans l'Admin Panel
4. Approbation manuelle → statut teacher actif
   ✗ Pas d'upload de document (RGPD, complexité, maintenance)
   ✓ Optionnel v2 : liste blanche de domaines email par institution (@ulb.be, @vub.be…)
```

#### DB — nouvelles tables/colonnes
```sql
-- profiles (extensions)
ALTER TABLE profiles ADD COLUMN
  role text DEFAULT 'student'
    CHECK (role IN ('super_admin','institution_admin','teacher','pending_teacher','student')),
  sector text CHECK (sector IN ('school','university','self-taught')),
  institution_id uuid REFERENCES institutions(id),
  display_name text,
  bio text,
  preferred_env text DEFAULT 'linux';

-- institutions
CREATE TABLE institutions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  domain_whitelist text[],       -- ex. ['ulb.be', 'vub.be']
  admin_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- classes
CREATE TABLE classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES profiles(id),
  institution_id uuid REFERENCES institutions(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- class_enrollments
CREATE TABLE class_enrollments (
  class_id uuid REFERENCES classes(id),
  student_id uuid REFERENCES profiles(id),
  enrolled_at timestamptz DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

-- progress (extensions)
ALTER TABLE progress ADD COLUMN
  time_spent_seconds int DEFAULT 0,
  attempts_count int DEFAULT 0,
  hints_used int DEFAULT 0;

-- badges
CREATE TABLE badges (
  user_id uuid REFERENCES profiles(id),
  badge_id text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- teacher_notes
CREATE TABLE teacher_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES profiles(id),
  student_id uuid REFERENCES profiles(id),
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- audit_log (insert-only — actions admin traçables)
CREATE TABLE audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,   -- ex. 'approve_teacher', 'suspend_user'
  target_id uuid,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);
```

#### Sécurité — RLS obligatoire sur toutes les nouvelles tables
- `institutions` : lecture publique du nom, écriture → super_admin uniquement
- `classes` : visible par teacher + ses enrolled students + institution_admin
- `class_enrollments` : teacher peut enroller, student voit les siennes, admin voit tout
- `audit_log` : **insert-only** — stratégie RLS explicite :
  ```sql
  -- Autoriser INSERT pour tous les rôles authentifiés
  CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT
    TO authenticated WITH CHECK (true);
  -- Autoriser SELECT pour super_admin uniquement
  CREATE POLICY "audit_log_select" ON audit_log FOR SELECT
    USING (auth.jwt() ->> 'role' = 'super_admin');
  -- UPDATE et DELETE : aucune policy → interdits par défaut (RLS enforced)
  ```
  *Note : pas de trigger nécessaire — l'absence de policy UPDATE/DELETE suffit avec RLS activé.*

#### Composants `/app/profile`
- `ProfilePage.tsx` — stats globales, badges, préférences
- `ProgressHeatmap.tsx` — calendrier de complétion (style GitHub)
- `SkillRadar.tsx` — radar chart des compétences par module (Recharts)
- `BadgeGallery.tsx` — collection de badges gagnés
- `TeacherNotesPanel.tsx` — visible élève (lecture) + prof (écriture)
- `ClassroomView.tsx` — vue professeur : liste élèves + progression

#### Badges à implémenter (exemples)
`first-command`, `module-complete`, `week-streak`, `speed-runner`, `no-hints`, `explorer` (tous les envs)

---

### 🔮 Phase 8 — Système de Tickets

> Bug reports, suggestions, améliorations — directement depuis l'app

#### DB
```sql
CREATE TABLE tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  type text CHECK (type IN ('bug','suggestion','improvement','content_request')),
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open','in_review','resolved','closed','wont_fix')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  assigned_to uuid REFERENCES profiles(id),
  context jsonb,    -- env sélectionné, module, leçon, commande tapée
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### UX
- Bouton flottant `?` accessible depuis toutes les pages `/app/*`
- Contexte capturé automatiquement (env, module, leçon en cours)
- Utilisateur suit ses tickets : `/app/my-tickets`
- Admin gère tout dans le panel admin

---

### 🔮 Phase 9 — Admin Panel (après Phase 7 + signal trafic significatif)

> Inspiré de : Grafana, Sentry, Linear, Datadog — adapté à une app pédagogique open source.
> Vitrine de sécurité et de maîtrise technique. 7 sections. Terminal Sentinel alimente le Security Center.
> Stack visuelle : Recharts + Supabase Realtime + dark theme `#0d1117` cohérent avec l'app.

#### Sécurité admin — 8 couches (normes 2026)
| Couche | Mécanisme |
|--------|-----------|
| Auth | Supabase Auth + 2FA TOTP obligatoire (authenticator app) |
| JWT | Access token 15min + refresh 7j + rotation auto |
| RBAC | Rôle `admin` vérifié Edge Function + RLS — jamais côté client |
| Rate limit | Max 5 tentatives → lockout 30min → alert email |
| Audit log | Qui / quoi / quand / IP / user-agent — table immuable (insert only) |
| CSP | Nonce-based strict pour `/admin` — séparé de l'app principale |
| Secrets | Supabase Vault + Vercel env vars — zéro secret en clair |
| SSRF guard | Edge Function : validation URL stricte, liste blanche domaines autorisés |

#### Sections du panel admin

**1. Dashboard santé en temps réel**
- Uptime (UptimeRobot webhook → Supabase)
- Latence API (p50/p95/p99 via Vercel Analytics)
- Taux d'erreur Sentry (widget live)
- Tests CI dernière exécution (GitHub Actions API)
- Alertes actives (rouge/orange/vert)

**2. Analytics utilisateurs** (graphiques Recharts/Tremor)
- DAU/MAU avec tendance
- Heatmap horaire d'activité
- Taux de complétion par module (funnel)
- Commandes les plus tapées (top 20)
- Abandon par leçon (où les gens décrochent)
- Répartition Linux/macOS/Windows
- Nouveaux comptes par jour

**3. Security Center** *(alimenté par Terminal Sentinel — Phase 5.5)*
- Rapports Terminal Sentinel : historique des audits hebdomadaires, score de santé, tendances
- Tentatives de connexion échouées (carte géo IP si disponible)
- Rate limit hits (par IP, par endpoint)
- Comportements anormaux du terminal :
  - Commandes inattendues répétées (bruit de fuzzing)
  - Patterns XSS/injection dans les inputs
  - Fréquence anormalement élevée de requêtes
- Audit log consultable (filtres : qui, quoi, quand) — table `audit_log` insert-only
- Rapport hebdomadaire auto (Edge Function → email)

**4. Gestion contenu**
- Activer/désactiver modules
- Planificateur de contenu (scheduler commandes)
- Éditeur de catalogue commandes (CRUD)
- Prévisualisation leçon par env

**5. Gestion utilisateurs**
- Liste membres (filtre par rôle/secteur/activité)
- Modifier rôle (student ↔ teacher)
- Suspendre/réactiver compte
- Assigner élève à un professeur
- Voir progression détaillée d'un utilisateur

**6. Tickets & Feedback**
- Vue Kanban : open → in_review → resolved
- Assignation, changement priorité, réponse
- Export CSV
- Filtres : type / priorité / module concerné

**7. Health Monitor**
- Supabase : quota DB, connexions actives, latence requêtes
- Vercel : bandwidth, build time derniers déploiements
- Sentry : issues non résolues, régression détectée
- npm audit : vulnérabilités connues (cron quotidien)

#### Fichiers à créer (Phase 9)
```
src/app/components/admin/
├── AdminLayout.tsx           # Shell /admin avec nav + auth guard (RBAC)
├── AdminDashboard.tsx        # Vue d'ensemble santé + alertes
├── AnalyticsDashboard.tsx    # DAU/MAU, funnels, heatmaps
├── SecurityCenter.tsx        # Tentatives hack, anomalies terminal, audit log
├── ContentManager.tsx        # Modules, leçons, catalogue commandes
├── UserManager.tsx           # Gestion membres, rôles, suspension
├── TicketBoard.tsx           # Kanban tickets
├── HealthMonitor.tsx         # Supabase + Vercel + Sentry + CI
└── charts/
    ├── ActivityHeatmap.tsx   # Recharts heatmap
    ├── CompletionFunnel.tsx  # Funnel par module
    ├── CommandsTopChart.tsx  # Bar chart commandes populaires
    └── SecurityTimeline.tsx  # Timeline événements sécurité

supabase/functions/
├── audit-log/index.ts        # Insert-only audit log
├── security-report/index.ts  # Rapport hebdo sécurité → email
├── health-check/index.ts     # Ping services externes
└── content-scheduler/index.ts # Déverrouillage contenu toutes les 2 semaines

.github/workflows/
├── security-audit.yml        # npm audit + Snyk quotidien
└── health-report.yml         # Rapport hebdo CI → Slack/email
```

---

### 🔮 Phase 10 — Contenu Automatisé (Catalogue évolutif)

> Chaque commande de chaque environnement référencée, déverrouillée progressivement

#### Principe
- Le catalogue de commandes (`commandCatalogue.ts`) versionné en DB Supabase
- Scheduler (Edge Function + cron) : nouveau contenu toutes les **2 semaines**
- Notification in-app quand nouveau module/leçon disponible
- Admin peut ajuster le calendrier manuellement

#### Sources des commandes (exhaustivité)
- Linux : `man -k .` + pages tldr + SS64.com + cheat.sh
- macOS : `man` pages Apple + Homebrew formula list
- Windows : PowerShell Get-Command + cmdlets documentation Microsoft
- Cross-platform : Node CLI, Git, Docker, curl

#### DB — table scheduler
```sql
CREATE TABLE content_releases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text CHECK (content_type IN ('module','lesson','command')),
  content_id text NOT NULL,
  scheduled_for date NOT NULL,
  released boolean DEFAULT false,
  released_at timestamptz
);
```

---

## Architecture Multi-Agents (v2)

> Pour chaque chantier > 3 fichiers ou touchant plusieurs domaines,
> l'orchestrateur répartit le travail entre agents spécialisés.
> Terminal Sentinel s'intègre comme outil du Security Agent.

```
┌─────────────────────────────────────────────────────┐
│                 ORCHESTRATOR AGENT                  │
│  Thierry (décision) + Claude Code (coordination)    │
│  → cartographie, plan, validation, merge, PR        │
└──────┬──────────┬────────────┬────────────┬─────────┘
       │          │            │            │
  ┌────▼───┐ ┌───▼─────┐ ┌───▼────┐ ┌─────▼──────┐
  │FRONTEND│ │BACKEND  │ │SECURITY│ │CURRICULUM  │
  │ Agent  │ │Supabase │ │ Agent  │ │  Agent     │
  │        │ │ Agent   │ │ ↓TS    │ │            │
  └────────┘ └─────────┘ └────────┘ └────────────┘
       │           │          │            │
       └───────────┴──────────┴────────────┘
                          │
              ┌───────────▼──────────────┐
              │       QA / TEST Agent    │
              │  Vitest unit + Playwright│
              │  Lighthouse CI           │
              └──────────────────────────┘

TS = Terminal Sentinel (audit périodique → Security Center)
```

**Rôles :**
| Agent | Responsabilité | Outils |
|-------|---------------|--------|
| Orchestrateur | Plan, coordination, review, merge | Tous |
| Frontend | UI/UX, composants, charts, design tokens | Edit, Write, Bash |
| Backend/Supabase | Schema SQL, RLS, Edge Functions, migrations | Supabase MCP, Edit |
| Security | OWASP audit, CSP, RLS review, Terminal Sentinel | Grep, Bash, WebSearch |
| Curriculum | Leçons, exercices, catalogue commandes | Edit, Context7 |
| QA | Tests Vitest, Playwright, Lighthouse | Bash, Write |

**Règles d'activation :**
- Security obligatoire dès qu'un sujet touche auth, secrets, webhooks, RBAC, inputs utilisateur
- Backend obligatoire dès qu'une migration SQL est nécessaire
- QA obligatoire après chaque feature (unit + E2E avant merge)
- Terminal Sentinel lancé manuellement avant chaque release majeure
- Jamais d'agent sans plan validé par Thierry d'abord

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

---

## 🔮 Phase finale — PWA Avancée (après tout le reste)

> À traiter uniquement quand curriculum complet + Admin Panel + RBAC sont en prod.
> Validé comme approche finale — 10 avril 2026.

**Valeur ajoutée pour le contexte scolaire :**
- Installable sur tablette/mobile/PC sans App Store (icône écran d'accueil)
- Offline partiel : leçons déjà visitées accessibles sans wifi (idéal pour les salles informatiques sans internet stable)
- `display: standalone` : supprime la barre d'adresse → immersion terminal authentique
- Push notifications : "nouveau module disponible", "streak en danger"

**Stack :** `vite-plugin-pwa` + Workbox, stratégie `NetworkFirst`
- Supabase Auth incompatible avec `CacheFirst` → NetworkFirst obligatoire
- Service Worker scope limité : ne pas mettre en cache les appels Supabase RLS
- Manifest : icônes 192px + 512px, `theme_color: #0d1117`, `background_color: #0d1117`

**Effort estimé :** 2–3 jours. Ne pas commencer avant Phase 9 terminée.
