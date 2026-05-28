---
title: Vision plateforme B2B + parcours métier — challenge architecture & marché
date: 2026-05-30
status: draft-pending-thierry-validation
author: cc-terminal-learning (Opus 4.7)
challenge_skill: pending (/rodin self-critique post-validation @thierry)
---

# Vision plateforme B2B + parcours métier — challenge architecture & marché

> **Demande @thierry 30/05/2026** : la sidebar `/app` accumule les espaces backend (admin / teacher / institution / élève) sans surface pour un vrai dashboard pro B2B. Devrait-on déplacer le backend en pages dédiées (style GitHub / Vercel) ? Et comment offrir des **parcours métier complets** (développeur, sysadmin, réseaux, sécurité) au-delà des 11 modules débutant actuels ?

---

## 1. Diagnostic état actuel (force / faiblesse)

### Forces

- ✅ **11 modules / 65 leçons** terminal débutant solides, env-aware Linux/macOS/Windows
- ✅ **Architecture RBAC mature** : 4 rôles + Sprint 2.B cross-institution isolation 9.5/10
- ✅ **Auth + Multi-tenancy B2B** prêts (institutions, teacher dashboards, approve_teacher RPC)
- ✅ **AI Tutor V1** cloisonné par rôle (student/teacher/admin/super_admin) — fondation pédagogique IA solide
- ✅ **LTI 1.3 Phase 7c** scaffolding posé (gate `LTI_ENABLED=false` actuel)
- ✅ **`/app/institution`** + `/app/teacher` + `/app/admin` shipped (Sprint 2.A + 2.B)
- ✅ **65 leçons + 27 commandes documentées** = base solide auto-apprentissage

### Faiblesses (vs ambition B2B écoles)

- 🔴 **Surface dashboard pro insuffisante** : `/app/admin` v1 = skeleton placeholder. Layout sidebar partagé avec curriculum = pas optimal pour vues data-dense (analytics, listings élèves, stats institution)
- 🔴 **Sidebar surchargée** pour super_admin (résolu partial Sprint 2.B.3 "Mes outils" collapsible mais ne résout pas la surface horizontale)
- 🔴 **Aucun parcours métier** : 11 modules linéaires sans tracks (vs concurrents qui structurent en "Path Développeur Backend / DevOps / Cybersec / Data Engineer")
- 🔴 **Teacher experience minimale** : créer classe + share invitation code OK, mais aucune capacité de créer **track custom** pour ses élèves
- 🔴 **Pas de marketing différencié par persona** : landing `/` parle "Terminal Learning" générique, pas de page dédiée "Pour Écoles" / "Pour Enseignants" / "Pour Centres de Formation"
- 🔴 **Visibilité valeur B2B** faible : le pricing/positioning gratuit risque de positionner le produit comme "outil gratuit pour débutants" plutôt que "infrastructure pédagogique B2B"

---

## 2. Personae cible — déconstruction des besoins

### P1 — Auto-apprenant débutant (`student` solo) — **public actuel principal**
- **Besoin** : découvrir terminal pas-à-pas, retention progression
- **Touchpoint** : Landing `/` → `/app` → Modules → AI Tutor
- **Friction actuelle** : 0 majeure (UX OK, NPS implicite favorable cf. Jimmy Pez)

### P2 — Étudiant en formation (`student` enrollé école)
- **Besoin** : suivre parcours défini par son école + tracker progression vs cohorte
- **Touchpoint** : invitation URL d'enseignant → `/app/join` → `/app` enrôlé
- **Friction actuelle** : Vit dans la même UX que P1, pas de différence visible "tu fais partie de la classe X"
- **Gap** : pas de visualisation cohorte (où en sont mes camarades ?), pas de track custom enseignant

### P3 — Enseignant solo (`teacher` indépendant)
- **Besoin** : créer classe(s), inviter élèves, suivre leur progression, **assigner des modules spécifiques**
- **Touchpoint** : `/app/teacher` (livré Sprint 2.A)
- **Friction actuelle** : Liste classes + code invitation OK, mais **aucun listing des élèves enrôlés**, **aucune stats par élève**, **aucune capacité d'assigner un sous-ensemble de modules**
- **Gap critique** : impossible aujourd'hui de dire "Ma classe Bash 101 → module Navigation + Fichiers seulement, pas Module 11 IA"

### P4 — Institution_admin (`institution_admin` école/centre formation)
- **Besoin** : approuver les enseignants de son école, vue d'ensemble institution (nb teachers, nb élèves, leçons complétées agrégées)
- **Touchpoint** : `/app/institution` (livré Sprint 2.B)
- **Friction actuelle** : Liste pending teachers + approve OK, **aucune stats institution agrégées**, **aucune vue cross-classe**, **aucun rapport téléchargeable**
- **Gap critique** : impossible aujourd'hui de présenter à la direction école "Sur les 120 élèves de Terminal Master 2026, 78% ont fini Niveau 1, 45% Niveau 2"

### P5 — Super_admin (Thierry, ops Terminal Learning)
- **Besoin** : supervision plateforme, audits, modération
- **Touchpoint** : `/app/admin` (livré Phase 9 v1 skeleton)
- **Friction actuelle** : 4 widgets placeholder, données live Sprint 2.D prévues
- **Gap** : pas critique car Sprint 2.D va l'adresser

### P6 — **Acheteur B2B / décideur école** (nouveau persona, pas encore servi)
- **Besoin** : évaluer si Terminal Learning vaut le coup pour son école / centre formation
- **Touchpoint actuel** : Landing `/` (générique grand public débutant)
- **Friction critique** : aucune page dédiée B2B, aucune brochure téléchargeable, aucun témoignage école, aucune intégration LMS visible publiquement
- **Gap critique** : un directeur d'école ne sait pas que TL peut connecter en LTI à son Moodle/Canvas

---

## 3. Analyse marché edtech EU/Belgique 2026 (connaissance-based)

### Catégories de concurrents/références

#### Plateformes pédagogiques généralistes B2B
- **OpenClassrooms (FR)** : leader EU edtech, formation pro 100% en ligne + diplômante, B2B partenariats grandes écoles + entreprises. Modèle : abonnement + financement OPCO/CPF.
- **DataCamp (IE)** : scale-up EU spécialisé data/DS. Tracks "Data Engineer / Data Scientist / Data Analyst". UX : `/learn` (public) + `/dashboard` + `/teach` (B2B instructor).
- **Coursera (US)** : partenariats universités (KUL Leuven, ULB, Sciences Po). Modèle Coursera Business = $399/learner/an pour entreprises.
- **Pluralsight (US)** : focus dev/IT. `/skills` (learner) + `/business` (manager dashboard). Skill IQ assessment.
- **edX (US, non-profit)** : partenariat Louvain. MicroMasters, professional certs.

#### Plateformes coding-spécifiques
- **Codecademy (US, big presence EU)** : `/learn` (public catalog) + `/dashboard` (logged-in). **Career Paths** structurés (Back-End Eng / Front-End Eng / DevOps Eng / Cybersec Analyst / Data Analyst).
- **freeCodeCamp (US, free)** : `/learn` linéaire avec certifications projects-based.
- **Le Wagon (FR, bootcamp)** : pas une plateforme mais une école. Pertinent comme partenaire potentiel.

#### Plateformes terminal/Linux spécifiques
- **Linux Academy / A Cloud Guru** : `/courses` + `/labs` hands-on (cloud sandbox).
- **TryHackMe / HackTheBox (UK)** : `/learn` + `/dashboard` + classrooms enseignant. Modèle **rooms** = équivalent de nos "modules" mais hands-on.
- **Exercism (US, free)** : tracks par langage avec mentorat humain async.

#### Marché belge spécifique
- **BeCode (BE)** : coding bootcamp gratuit (financé Forem/Bruxelles Formation). Partenaire potentiel école-école.
- **Forem (Région wallonne)** : formation pro publique. Catalog formations TIC. **Achète des plateformes pédagogiques** pour ses formations.
- **Bruxelles Formation (BE)** : même chose côté bruxellois.
- **Proximus Academy / Telenet Academy** : programmes internes télécoms.
- **VDAB (Flandres)** : équivalent flamand Forem.
- **Eclo (BE)** : edtech B2B école.
- **MolenGeek (BE)** : associatif coding, partenaire potentiel.

### Patterns UX dominants edtech 2026

| Plateforme | Landing public | Learner area | Teacher area | Admin / B2B |
|---|---|---|---|---|
| Codecademy | `codecademy.com/catalog` | `/learn` | `/teach` (Pro) | `/business` |
| Coursera | `coursera.org` | `/learner` | `/instructor` | `/enterprise` |
| OpenClassrooms | `openclassrooms.com` | `/dashboard` | `/teach` | `/business` |
| Khan Academy | `khanacademy.org` | `/learners` | `/teachers` | `/coaches` |
| DataCamp | `datacamp.com` | `/profile` | `/groups` | `/business` |
| Pluralsight | `pluralsight.com` | `/skills` | `/business` (manager) | enterprise SSO |

**Pattern dominant** :
- 1 landing publique marketing avec **landing pages segmentées par persona** (`/teach`, `/business`, `/educators`)
- 1 dashboard apprenant principal
- 1 dashboard instructor/teacher dédié (souvent layout différent, plus data-dense)
- 1 console B2B / enterprise pour décideurs (analytics agrégés, billing, SSO mgmt)

### Conformité EU edtech 2026 (déjà adressée TL)

- ✅ **RGPD** (déjà couvert privacy + DPA Resend)
- ✅ **AI Act EU** (`legal-compliance-auditor` Opus + AI Tutor cloisonné)
- ✅ **DSA** (déjà flagué)
- ✅ **LTI 1.3** (Phase 7c partiel — gate `LTI_ENABLED=false`)
- ⏳ **SCORM 2004** (compatible LMS écoles legacy) — pas encore implémenté, à évaluer
- ⏳ **xAPI** (compatible LRS modern) — pas encore, à évaluer
- ⏳ **WCAG 2.2 AA** (déjà visé, audits mobile-responsive-auditor)
- ⏳ **CPF / OPCO** (FR) — certification Qualiopi si TL veut être financée pour adultes en reconversion

---

## 4. Options architecture — challenge avec trade-offs

### Option A — Status quo extend `/app` (continue current direction)

```
terminallearning.dev/ → Landing publique grand public
terminallearning.dev/app → Layout sidebar partagé
  ├─ /app                  Dashboard student (modules)
  ├─ /app/learn/...        Lessons
  ├─ /app/reference        Référence commandes
  ├─ /app/settings         AI keys
  ├─ /app/teacher          Teacher dashboard
  ├─ /app/institution      Institution admin
  └─ /app/admin            Super admin
```

**Pros** :
- Pas de breaking change
- Réutilise Layout existant
- Sidebar uniforme

**Cons** :
- Sidebar saturée (Sprint 2.B.3 "Mes outils" partial fix, pas suffisant pour Phase 9 v2)
- **Pas de "feel pro" B2B** : un directeur d'école qui ouvre `/app/institution` voit la même chrome qu'un élève — pas différencié
- Layout sidebar 288px = perd 30% surface horizontale pour les dashboards data-dense (charts, listings, KPIs)
- Pas de marketing segmenté par persona

**Effort** : 0 (status quo)
**Verdict** : ❌ Insuffisant pour ambition B2B écoles + parcours métier

---

### Option B — Sub-routes avec layouts dédiés (compromis modéré)

```
terminallearning.dev/ → Landing publique avec segments
  ├─ /                Landing générique
  ├─ /educators       Landing dédiée enseignants/institutions
  └─ /pricing         (gated post-monetization)

terminallearning.dev/app → Layout adaptatif par sous-route
  ├─ /app/learn/...        Layout sidebar curriculum (current student)
  ├─ /app/teach/...        Layout top-nav workspace teacher
  │   ├─ /teach            Dashboard teacher (vue d'ensemble)
  │   ├─ /teach/classes    Listing + détails par classe
  │   ├─ /teach/students   Listing élèves cross-classe
  │   └─ /teach/tracks     Création tracks custom (futur)
  ├─ /app/manage/...       Layout top-nav workspace institution_admin
  │   ├─ /manage           Dashboard institution
  │   ├─ /manage/teachers  Listing teachers + approve
  │   ├─ /manage/insights  Analytics agrégées institution
  │   └─ /manage/billing   (futur post-monetization)
  └─ /app/admin/...        Layout top-nav super_admin (current)
```

**Pros** :
- Layouts spécialisés par persona = vraie surface horizontale pour dashboards
- Navigation contextuelle (teacher dashboard ne montre PAS les modules curriculum)
- **Pas de breaking change radical** sur `/app/learn/` (student current)
- Switch contextuel via UserMenu "Espace apprentissage / Espace pro"

**Cons** :
- 2 layouts à maintenir (curriculum sidebar VS pro top-nav)
- Migration progressive : `/app/teacher` → `/app/teach`, `/app/institution` → `/app/manage` (redirects 301 à mettre en place)
- Investissement dev ~30-50h pour la refonte layouts

**Effort** : Medium (~50h)
**Verdict** : ✅ **Recommandé** comme cible mid-term

---

### Option C — Refonte multi-sub-domain GitHub-pattern (radicale)

```
terminallearning.dev          → Landing publique marketing
app.terminallearning.dev      → Learner app (current /app)
teach.terminallearning.dev    → Teacher pro dashboard standalone
institution.terminallearning.dev → Institution_admin dashboard standalone
admin.terminallearning.dev    → Super_admin (déconnexion ops vs marketing)
```

**Pros** :
- Pattern GitHub / Stripe / Vercel → "feel premium"
- Séparation totale marketing vs produit
- Différenciation immédiate par persona

**Cons** :
- **Breaking changes massifs** : auth cross-domain (cookies SameSite + CORS), domain config Vercel × 4
- Coût certificat SSL × 4 (gratuit Vercel mais setup)
- SEO disper sur 4 domaines (au lieu d'un seul fort)
- Investissement dev ~80-120h
- Risque haut de bugs auth cross-domain
- **Pas adapté au stade actuel** (3 stars GitHub, pas encore de traction B2B)

**Effort** : High (~100h)
**Verdict** : ❌ Prématuré. À reconsidérer post-1ère école payante.

---

### Option D — Hybrid "espace ciblé" Landing + app unifiée avec layouts adaptatifs (recommandation préliminaire)

= **Option B + landing segments marketing** + **switch contextuel UserMenu**

```
terminallearning.dev/ → Landing publique grand public (current)
  ├─ /                Landing apprenants débutants (current)
  ├─ /educators       Landing dédiée enseignants/écoles
  │                     - Témoignages écoles
  │                     - Démo classe + invitation flow
  │                     - LTI 1.3 + intégration LMS
  │                     - Tracks personnalisables
  ├─ /b2b             Landing dédiée centres formation / corporate
  │                     - Pricing post-monetization
  │                     - Conformité Qualiopi / OPCO
  │                     - Analytics agrégées
  └─ /pricing         (gated)

terminallearning.dev/app → 2 modes via UserMenu toggle
  ├─ Mode "Apprentissage" (layout sidebar curriculum — current)
  │   ├─ /app                  Dashboard student
  │   ├─ /app/learn/...        Lessons
  │   ├─ /app/reference        Référence
  │   └─ /app/tracks/{slug}    Parcours métier (NOUVEAU)
  └─ Mode "Espace pro" (layout top-nav workspace data-dense — NOUVEAU)
      ├─ /app/workspace             Dashboard workspace (vue agrégée par rôle)
      ├─ /app/workspace/classes     Mes classes (teacher / institution_admin scope)
      ├─ /app/workspace/students    Mes élèves
      ├─ /app/workspace/tracks      Mes parcours custom (teacher / institution_admin)
      ├─ /app/workspace/insights    Analytics
      ├─ /app/workspace/manage      Approve teachers (institution_admin only)
      └─ /app/workspace/admin       Super_admin (global)
```

**Pros** :
- Meilleur des 2 mondes : pas de breaking change radical, **surface pro** disponible
- **Tracks métier** intégrés comme premier-citizen (parcours développeur / sysadmin / réseaux / cybersec)
- Marketing segmenté par persona (/educators / /b2b) = positioning B2B explicite
- UserMenu toggle "Apprentissage / Pro" = pattern Notion/Linear (workspace switcher)
- Migration progressive sans casser current student UX
- LTI integration vit naturellement dans `/app/workspace/manage`

**Cons** :
- Investissement dev ~60-80h total (landing marketing + layout workspace + tracks)
- 2 layouts à maintenir mais clairement scoped par mode
- Routes `/app/teacher` + `/app/institution` + `/app/admin` actuelles → redirects 301 vers `/app/workspace/*`

**Effort** : Medium-High (~70h sur 2-3 sprints)
**Verdict** : ✅✅ **RECOMMANDÉ** — vision long-terme cohérente avec ambition B2B + parcours métier

---

## 5. Parcours métier — vision tracks system

### Problème actuel

11 modules linéaires figés. Aucune capacité de :
- Créer un track personnalisé pour une classe
- Offrir des parcours métier (Développeur / SysAdmin / Cybersec / Data / Réseaux)
- Adapter le contenu selon le niveau (débutant / intermédiaire / avancé)

### Vision parcours métier

```
Tracks publics curated par Terminal Learning :
├─ "Découverte Terminal" (current, 11 modules débutant)
├─ "Développeur Backend" (terminal + git + bash scripting + docker + ssh + cron + tmux)
├─ "SysAdmin Linux" (terminal + users + permissions + systemd + networking + monitoring + backup)
├─ "Réseaux & SSH" (terminal + ssh + scp + curl + dig + iptables + tcpdump)
├─ "Cybersec Fondamentaux" (terminal + permissions + audit log + grep forensics + firewall basics)
└─ "Data Engineer" (terminal + bash + python CLI + jq + awk + cron pipelines)

Tracks custom B2B :
├─ Teacher peut créer track = sous-ensemble de modules + ordre custom
├─ Institution_admin peut publier track institution-wide
└─ Élève voit son track assigné en priorité dans /app/learn
```

### Implémentation tracks (Sprint 2.E ou 2.F)

- Migration : table `tracks` (id, slug, name, description, scope: 'platform' | 'institution' | 'teacher', author_id, created_at)
- Migration : table `track_modules` (track_id, module_id, order, optional)
- RLS : tracks platform = visible à tous · tracks institution = scoped institution_id · tracks teacher = scoped teacher_id + ses classes
- UI : `/app/tracks` listing + `/app/tracks/{slug}` parcours détail + `/app/workspace/tracks` création teacher

**Contenu additionnel** : créer 5 tracks platform curated avant annonce B2B = 5-10h création contenu par track (40-50h total). À planifier post-MVP architecture.

---

## 6. Recommandation finale orchestrateur

### Décision : **Option D + Tracks System** (Hybrid layout + parcours métier)

**Rationale** :
1. **Pas de breaking change radical** sur la base student actuelle (consigne @thierry "rien casser de la partie base")
2. **Surface pro réelle** via `/app/workspace/*` top-nav layout data-dense pour B2B
3. **Marketing segmenté** `/educators` + `/b2b` = positioning B2B clair pour les décideurs (P6 acheteur école)
4. **Tracks system** = vraie différenciation vs concurrents qui n'ont pas la simplicité Terminal Learning + permet aux institutions/teachers de créer leurs parcours custom
5. **Pattern industry-aligned** : Notion/Linear (workspace switcher) + Codecademy/Coursera (landing segments)
6. **Modularité** : peut shipper en 3 phases indépendantes

### Roadmap proposée (post Sprint 2.C)

| Phase | Scope | Effort | Sprint |
|---|---|---|---|
| **Phase X1** | Landing segments `/educators` + `/b2b` + nouveau Helmet/SEO | 8-12h | Sprint 2.D ou parallèle à Sprint 2.C |
| **Phase X2** | Layout `/app/workspace/*` top-nav + Dashboard pro (teacher + institution_admin views) | 15-20h | Sprint 2.E |
| **Phase X3** | Migrations 028+ : table `tracks` + `track_modules` + RLS scopée + UI listing + détail | 20-25h | Sprint 2.F |
| **Phase X4** | Création contenu : 4 tracks platform curated (Backend / SysAdmin / Cybersec / Réseaux) | 30-50h | Sprint 2.G (peut être parallélisé avec @cowork ou freelance) |
| **Phase X5** | Migration progressive `/app/teacher` → `/app/workspace/classes` + redirects 301 + tests | 5-10h | Sprint 2.H |

**Total dev tech** : ~50-77h sur 4-5 sprints (Sprint 2.D → 2.H, soit ~10 semaines à 5h/semaine)

**Sprint 2.C Support System Resend** reste prioritaire avant cette refonte (déjà cadré).

### Sprints prochains ordre verrouillé

1. **Sprint 2.C** (déjà cadré) : Support System Resend (~5h)
2. **Sprint 2.D** : Phase X1 landing segments + analyse Phase X2 layout (parallèle widgets data live admin si bandwidth)
3. **Sprint 2.E** : Phase X2 `/app/workspace/*` layout
4. **Sprint 2.F** : Phase X3 tracks system DB + UI
5. **Sprint 2.G** : Phase X4 contenu tracks platform
6. **Sprint 2.H** : Phase X5 migration + redirects

**Annonce B2B écoles** : déplacer du 10 juin → fin juin / début juillet (post Phase X1+X2 minimum) OU annonce en 2 temps :
- **10 juin** : annonce v1 "Outil pédagogique terminal pour écoles" avec ce qui existe + landing /educators
- **fin juillet** : annonce v2 "Parcours métier + workspace pro" avec tracks shipped

### Risques + STOP criteria

- ⚠ **Scope creep** : la vision étendue ajoute ~70h dev. À cadrer strictement par phase pour ne pas dériver.
- ⚠ **Solo maintainer** : 70h dev sur 10 semaines = 7h/semaine = soutenable. Ne PAS doubler la cadence (ADR-006).
- ⚠ **Contenu tracks** : 30-50h création contenu = nouveau type d'effort. Considérer @cowork ou freelance contributor.
- ✅ **Tech debt MINIME** : pas de refonte radical, hybrid avec migrations progressives.

---

## 7. Self-challenge orchestrateur (anti-chambre d'écho)

> Ce que je n'ai pas considéré explicitement et qui mérite challenge :

### Q1 — Le marché B2B Belgique petit, est-ce que ça vaut le ROI dev ?
- Belgique = 1300 écoles secondaires + ~250 centres formation pro. Si TL capture 5% = 75 institutions. Si gratuit = 0 revenu direct, mais possible monétisation freemium (tracks platform gratuits + tracks B2B custom payants).
- **Bémol** : @thierry est explicite "100% gratuit MIT à vie" (CLAUDE.md). Donc le ROI n'est pas monétaire mais reputational / impact pédagogique.
- → La vision B2B reste valide MÊME sans monétisation : positionner TL comme infrastructure pédagogique référence pour les écoles EU.

### Q2 — Est-ce qu'on ne sur-investit pas en architecture quand on devrait sur-investir en contenu ?
- 50h architecture vs 50h contenu = même budget. Mais l'architecture débloquée = capacité 10× pour le contenu futur (tracks custom B2B).
- → **Architecture first, contenu second** = bon ordre.

### Q3 — Et si on faisait juste Option B (sub-routes layout) sans le marketing segmenté ?
- Option B sans /educators = pas de différenciation visible pour acheteur B2B. Le directeur d'école qui visite `/` ne sait pas que c'est pour lui.
- → Le segment landing est ce qui débloque la conversation B2B. Vaut les 8-12h Phase X1.

### Q4 — LTI 1.3 vs SCORM vs xAPI — lequel pousser ?
- LTI 1.3 = standard moderne, intégration in-place avec Moodle/Canvas/Brightspace.
- SCORM 2004 = legacy mais 80% LMS écoles encore SCORM-only.
- xAPI = futur mais peu d'adoption EU écoles.
- → LTI 1.3 reste priorité (Phase 7c). SCORM = à évaluer Sprint 2.I (POC export module → SCORM .zip téléchargeable).

### Q5 — Pourquoi `/app/workspace/*` plutôt que sub-domain `workspace.terminallearning.dev` ?
- Sub-domain = breaking auth (cookies cross-domain). Sub-path = même auth, même CSP, même CSRF protection.
- → Sub-path = bon choix pragmatique.

### Q6 — Risque de cannibaliser le student journey actuel avec tracks ?
- Si tracks platform poussent "Développeur Backend" comme parcours principal, est-ce que le "Découverte Terminal" (current) perd visibilité ?
- → Solution : "Découverte Terminal" = track par défaut pour anonymous + onboarding student. Les autres tracks = opt-in après level débutant fini.

---

## 8. Décisions à valider par @thierry

1. **Option D approuvée ?** (Hybrid layout + tracks system + landing segments)
2. **Roadmap Sprint 2.D → 2.H acceptée ?** (10 semaines, 70h dev)
3. **Annonce B2B 10 juin reportée à fin juin / juillet ?**
4. **Création contenu tracks platform** = vous-même / @cowork / freelance ?
5. **LTI 1.3 activation** : avant ou après Phase X1-X2 ? (mon vote : après — gate `LTI_ENABLED=true` Sprint 2.I post-tracks)
6. **Monétisation freemium** : tracks B2B custom payants vs gratuit total à vie ? (cohérence CLAUDE.md à confirmer)

---

## 9. Prochaine étape post-validation

Si @thierry valide Option D :
- Créer Linear umbrella **THI-X** "Phase X B2B Platform Vision" (sub-tickets X1-X5)
- Brief de reprise Sprint 2.D dans `.tmp/cc-handoffs/`
- Self-challenge final via `/rodin` (anti-chambre d'écho) avant démarrage technique

Si @thierry préfère Option B (modéré) ou modification :
- Itérer ce document
- Re-cadrer phases

Si @thierry préfère statu quo Option A :
- Document archivé pour référence future
- Continuer Sprint 2.C → 2.E sans refonte architecture

---

**Budget consommé pour ce document** : ~10 min réflexion structurée + ~5 min écriture = ~15 min équivalent budget hebdo (estimation modeste).

**Document committable** : oui (Voie C-eligible quand validé).

🤖 Generated with [Claude Code](https://claude.com/claude-code) — Opus 4.7 — 30 mai 2026
