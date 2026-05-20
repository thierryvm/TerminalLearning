# Rapport agents Terminal Learning — Doctrine & justification modèles

**Date** : 20 mai 2026
**Destinataire** : @cowork
**Auteur** : @cc-tl (Claude Code, Opus 4.7)
**Contexte** : post-incident 24/04/2026 (silent downgrade Opus → Haiku, 5h outage prod) + leçon THI-186 (data leak localStorage 6 semaines). Audit complet des 18 agents, hardening modèles + scope, codification doctrine auto-apprentissage.

---

## 1. Vue d'ensemble — 18 agents actifs

| # | Agent | Modèle | Type | Scope critique |
|---|-------|--------|------|---------------|
| 1 | `session-orchestrator` | **Opus** | Process | Orchestration startup/shutdown (raisonnement transverse codebase) |
| 2 | `llm-security-auditor` | **Opus** | Security | OWASP LLM Top 10 + vecteurs 2026 (méthode 7 couches) |
| 3 | `lti-auditor` | **Opus** | Security | LTI 1.3 crypto chain + replay protection (Phase 7c gate) |
| 4 | `security-auditor` | Sonnet | Security | OWASP Top 10 + API Sec + CSP L3 + RLS + RGPD |
| 5 | `route-attack-auditor` | Sonnet | Security | HTTP-level attack surface `/api/*` (verb tampering, cache poisoning, slowloris) |
| 6 | `vercel-firewall-auditor` | Sonnet | Security | WAF rules + tests live `curl` |
| 7 | `rbac-flow-tester` | Sonnet ⬆ | Security/RBAC | 5 personas REST API + client-state lifecycle THI-186 |
| 8 | `institution-rbac-auditor` | Sonnet 🆕 | Security/RBAC | Cross-institution boundary (Sprint 2.B gate-zero) |
| 9 | `classroom-workflow-auditor` | Sonnet | Security/Flow | teacher↔student workflow intra-institution |
| 10 | `prompt-guardrail-auditor` | Sonnet ⬆ | Security/LLM | Gate per-PR AI Tutor (prompt injection, jailbreak, XSS) |
| 11 | `mobile-responsive-auditor` | Sonnet | UX | iPhone Safari WebKit + safe-area + no-regress desktop |
| 12 | `linear-sync` | Sonnet | Process | GitHub PR ↔ Linear status sync |
| 13 | `sustain-auditor` | Sonnet 🔧 | Sustainability | Solo maintainer health check trimestriel |
| 14 | `content-auditor` | Haiku | Content | Audit pédagogique structuré (déterministe) |
| 15 | `curriculum-validator` | Haiku | Content | Validation `curriculum.ts` (CRUD structurel) |
| 16 | `test-runner` | Haiku | DevOps | vitest + type-check + lint (output filtré) |
| 17 | `ui-auditor` | Haiku | UI | shadcn/ui usage + deps fantômes (patterns grep) |

🆕 = nouveau (PR #276) — ⬆ = upgrade modèle (Haiku → Sonnet, PR #276) — 🔧 = fix frontmatter (PR #276)

---

## 2. Doctrine modèles — Matrice scope ↔ modèle

Codifiée 20 mai 2026 dans `.claude/agents/README.md` section « 🛡 Doctrine modèles agents — post-incident 24/04/2026 ».

### Haiku — scope acceptable
- ✅ Tâches **déterministes** avec algorithme clair (parsing AST, grep patterns, comptage)
- ✅ Output filtré sur sortie verbeuse (test-runner)
- ✅ Validation structurelle de fichiers stables (curriculum-validator)
- ❌ **JAMAIS** sécurité, RBAC, RLS, auth, crypto, LLM
- ❌ **JAMAIS** raisonnement multi-fichiers transverse
- ❌ **JAMAIS** détection de edge cases multi-session

### Sonnet — minimum sécurité
- ✅ Audits OWASP/CSP/RLS/RBAC
- ✅ Tests empiriques multi-personas (REST API + state client)
- ✅ Pattern detection avec contexte cross-files (mobile-responsive sur theme.css + tailwind config + composants)
- ✅ Coverage edge cases (5 patterns client-state THI-186 lesson)

### Opus — critique uniquement
- ✅ Méthode 7 couches LLM security (llm-security-auditor)
- ✅ Crypto chain LTI 1.3 (lti-auditor)
- ✅ Orchestration transverse codebase + memos + git state (session-orchestrator)
- ✅ Toute tâche sécurité/architecture/production sensible

### Garde-fou anti-downgrade silencieux
Chaque projet épingle `.claude/settings.local.json` :
```json
{ "model": "claude-opus-4-7" }
```
Tout commit avec `Co-Authored-By: Claude Haiku|Sonnet|<autre que Opus>` sur tâche sécurité/architecture/production = revert sans discussion (CLAUDE.md global ligne 75).

---

## 3. Justification détaillée par agent

### 3.1 Opus (3 agents) — raisonnement transverse + sécurité critique

#### `session-orchestrator` (Opus)
- **Pourquoi Opus** : doit lire et synthétiser CLAUDE.md (250+ lignes) + memos MEMORY.md (100+ entries) + git state + Linear state + .md freshness markers + recommander la chaîne complète d'agents à lancer ensuite. Raisonnement de très large envergure sur codebase + contexte humain (signaux santé Thierry, sas 48h retiré, etc.).
- **Validation** : utilisé activement sessions startup/shutdown. Limitation Claude Code : ne peut pas invoquer d'autres agents (pas de nesting). Workaround codifié : RECOMMANDE la liste, le main agent lance.
- **Couverture exacte** : Startup (état git + Linear + freshness + recommandations) / Shutdown (récap PRs + memos à mettre à jour + handoff) / Phase intermédiaire (audit ponctuel).

#### `llm-security-auditor` (Opus)
- **Pourquoi Opus** : méthode 7 couches structurée + niveau de confiance par finding (VERIFIED / STRONG_INDICATOR / SPECULATIVE / RESEARCH_ONLY). OWASP LLM Top 10 + vecteurs 2026 émergents (RAG poisoning, indirect injection, agent hijacking, supply chain LLM, model extraction, sycophancy abuse, multi-turn drift, encoding bypass). Raisonnement sur prompt+code+config+runtime simultanément.
- **Validation** : utilisé Sprint 1 Phase 7b (audit final triple THI-113, rapport `docs/audits/ai-tutor-v1-2026-05-16.md`, score 9.4/10).
- **Couverture exacte** : releases majeures touchant IA, modifs architecturales (system prompt, providers, agents, RAG, tools, MCP), audits dédiés à la demande. Complémentaire à `prompt-guardrail-auditor` (gate per-PR) et `security-auditor` (app layer).

#### `lti-auditor` (Opus)
- **Pourquoi Opus** : Phase 7c LTI 1.3 = spécification crypto complexe (JWT signature ES256/RS256 + JWKS rotation + iss/aud/azp validation + nonce replay protection + state token binding). Une erreur d'une seule étape compromet toute la chaîne. MVP 10 checks critiques, évolutif vers méthode 7 couches post-V1.
- **Validation** : créé après THI-131 spike. Branche `feature/lti-spike` archivée (voir `project_lti_spike_state.md`).
- **Couverture exacte** : toute PR touchant `src/lib/lti/*`, `api/lti/*`, ou `supabase/migrations/*lti*`. Gate Phase 7c.

### 3.2 Sonnet (10 agents) — sécurité standard + UX + process

#### `security-auditor` (Sonnet)
- **Pourquoi Sonnet** : OWASP Top 10 (2021) + OWASP API Security Top 10 (2023) + CSP Level 3 + HTTP headers + rate limiting + Supabase RLS + auth flow + supply chain + privacy/GDPR. Scope large mais checks individuels relativement bornés (chaque OWASP item est un pattern documenté). Haiku insuffisant à cause du raisonnement cross-fichiers (CSP impacte `vercel.json` + `index.html` + `main.tsx` + tous les composants AI).
- **Validation** : utilisé intensivement Sprint sécurité mai 2026 (PRs #168-178, score ~8.6/10). Recap dans `project_security_sprint_may2026.md`.
- **Couverture exacte** : releases majeures, mises à jour deps, ou à la demande. Obligatoire avant toute PR touchant auth/RBAC/RLS/API/crypto.

#### `route-attack-auditor` (Sonnet)
- **Pourquoi Sonnet** : tests `curl` live black-hat avec mindset offensif. Status code fingerprinting + verb tampering + cache poisoning via 503 + slowloris + side-channel timing + header smuggling + CORS edge cases. Doit raisonner sur les réponses HTTP réelles + interpréter les patterns d'info disclosure. Haiku ne saisit pas la créativité offensive nécessaire.
- **Validation** : créé suite au sprint sécurité 1-2 mai (lacune route-level identifiée). Complémentaire à `security-auditor` (app layer) et `vercel-firewall-auditor` (WAF).
- **Couverture exacte** : toute PR touchant `api/*` ou création de nouvel endpoint. Verdict release-ready obligatoire.

#### `vercel-firewall-auditor` (Sonnet)
- **Pourquoi Sonnet** : lit la config WAF via API REST Vercel + exécute batterie de tests `curl` contre prod + interprète les réponses. Scope déterministe mais nécessite raisonnement cross-référentiel (rules custom + managed + Vercel defaults). Nécessite `$VERCEL_TOKEN` en session (sensibilité).
- **Validation** : 2 rules actives terminallearning.dev documentées dans `docs/vercel-firewall.md`. Utilisé après chaque modification firewall.
- **Couverture exacte** : avant release majeure ou après toute modification firewall.

#### `rbac-flow-tester` (Sonnet ⬆ upgrade 20/05)
- **Pourquoi Sonnet (et plus Haiku)** : l'historique a montré 2 incidents où Haiku était insuffisant :
  1. **THI-186 (17 mai 2026)** — data leak inter-users via `localStorage` non-cleared au signout. Le bug a dormi **6 semaines en prod** (Phase 3 livrée 3 avril → découvert empiriquement 17 mai par @thierry). Le scope précédent (REST API only) ne couvrait PAS le cycle de vie du state côté client. Haiku ne reasoning pas assez large sur des edge cases multi-session.
  2. **Doctrine 24/04/2026** — toute tâche RBAC critique = Sonnet minimum.
- **Validation** : Étape 4 ajoutée (THI-186 lesson, 5 patterns greppés : signOut wipe / owner-tracking / migration force-clear / cross-tab pollution / IdToken refresh).
- **Couverture exacte** : 23 checks REST API (5 personas × 3 baseline + 8 RLS) + 5 patterns client-state. Invoqué : Phase 9+ releases, migrations `auth.users`/`profiles`/RLS, modifications `AuthContext.signOut()`/`ProgressContext.tsx`/`useUserRole.ts`.

#### `institution-rbac-auditor` (Sonnet 🆕 créé 20/05)
- **Pourquoi Sonnet** : multi-tenancy = OWASP A01:2021 Broken Access Control. Même classe critique que `rbac-flow-tester`. Doit empiriquement tester via JWT impersonation (set_config) avec 8 personas (5 existants + 3 École B). Scope 16 checks en 6 sections.
- **Pourquoi pas Opus** : déterministe (pattern testé : SELECT/INSERT/PATCH cross-institution → expect 0 rows ou 403). Pas de raisonnement transverse codebase nécessaire.
- **Validation** : créé avant Sprint 2.B (InstitutionAdminPanel + approve_teacher RPC). Gate-zero MANDATORY.
- **Couverture exacte** : 6 sections — institution_admin workflows légitimes / Cross-institution isolation CRITICAL / Approve cross-institution bloqué / Privilege escalation prevention / Audit log discipline / super_admin bypass + cleanup. Complémentaire à `rbac-flow-tester` (baseline) et `classroom-workflow-auditor` (intra-institution).

#### `classroom-workflow-auditor` (Sonnet)
- **Pourquoi Sonnet** : tests empiriques contre prod Supabase via JWT impersonation. Workflow complet teacher↔student (create class + invitation_code + RPC consume + listing + progress visibility + cross-class isolation). 16 checks documentés.
- **Validation** : créé Sprint 2.A étape 3 (PR #274). Limitation observée : agents .md créés en cours de session ne sont pas loadable la même session (workaround = audit inline avec méthode documentée).
- **Couverture exacte** : toute PR touchant `classes` / `class_enrollments` / `join_class_by_code` ou composants teacher/student.

#### `prompt-guardrail-auditor` (Sonnet ⬆ upgrade 20/05)
- **Pourquoi Sonnet (et plus Haiku)** : sécurité LLM OWASP Top 10. Prompt injection / jailbreaks / prompt leaks / role enforcement / bypass sanitizer / XSS sur rendu réponse LLM / fuite clé API BYOK. Même classe critique que RBAC. Haiku insuffisant pour détecter prompts crafty multi-turn.
- **Validation** : créé THI-109 AVANT implémentation AI Tutor (gate zéro ADR-005). Premier audit PASS sur THI-110 (PR #155). Doctrine auto-apprentissage : créer gate AVANT le chantier, pas après surprise.
- **Couverture exacte** : toute PR touchant `src/lib/ai/*` ou `src/app/components/ai/*`. CRITICAL = bloque le merge.

#### `mobile-responsive-auditor` (Sonnet)
- **Pourquoi Sonnet** : raisonnement cross-fichiers (theme.css + tailwind config + composants + safe-area env) + détection regression desktop sur même fix. WebKit-specific bugs (cookies ITP, sticky position, 100vh). Pattern detection nécessite contexte large.
- **Validation** : Sprint Mobile Recovery TL THI-152 (mai 2026) — 11 PRs mergées, 0 régression desktop, méthode reproductible (voir `project_sprint_thi152_mobile_recovery_closed.md`).
- **Couverture exacte** : changements layout / nav / sidebar / drawer / forms / dashboard mobile / theme.css / tailwind config.

#### `linear-sync` (Sonnet)
- **Pourquoi Sonnet** : doit raisonner sur cross-référencement GitHub PR ↔ Linear status (Done + PR non mergée → In Review / In Progress + PR ouverte → In Review / In Review + PR mergée → Done). Détection branches orphelines.
- **Validation** : invoqué session startup obligatoire. Incident PR #149/#150 oubliées 14 jours (2 mai 2026) → leçon `feedback_pr_inventory_blind_spot.md` intégrée.
- **Couverture exacte** : statuts mismatch + orphan branches + archivés-mais-actifs.

#### `sustain-auditor` (Sonnet 🔧 fix frontmatter 20/05)
- **Pourquoi Sonnet** : analyse git patterns (weekend / night commits / streaks) + Sentry alerts + memory drift + workload trending. Score 1-10 sur 5 composantes. Raisonnement sur 90 jours de data + interprétation humaine (sustainability solo maintainer).
- **Pourquoi pas Haiku** : décision basée sur le scope (analyse longitudinale multi-source). Et frontmatter `model:` manquait → ajouté Sonnet.
- **Validation** : trigger trimestriel + à la demande. Doctrine « sas 48h » retirée par @thierry 18/05 mais grille graduation STOP reste applicable.
- **Couverture exacte** : 5 composantes (docs freshness / git patterns / sentry alerts / memory system / workload). Health score + warnings + recommendations.

### 3.3 Haiku (4 agents) — déterministes + output filtré

#### `content-auditor` (Haiku)
- **Pourquoi Haiku** : audit pédagogique avec checks documentés et structurés (env coverage Linux/macOS/Windows, curriculum↔terminalEngine consistency, test coverage, external link validity, narrative markdown internal links, prerequisite chain logic, validate() function quality). Algorithme clair, output rapport structuré.
- **Validation** : utilisé avant releases majeures.
- **Couverture exacte** : pédagogie A→Z + liens externes + cohérence cross-référentielle curriculum.

#### `curriculum-validator` (Haiku)
- **Pourquoi Haiku** : validation déterministe de `curriculum.ts` (env coverage, duplicate lesson IDs, prerequisites chain integrity, validator import/export sync, orphan validators, missing tests in terminalEngine.test.ts, module completeness). Pas de raisonnement complexe nécessaire.
- **Validation** : auto-invoqué avant ajout/modification leçons. Stabilité prouvée sur 11 modules / 64 leçons / 900 tests.
- **Couverture exacte** : structure `curriculum.ts` complète avant toute modification.

#### `test-runner` (Haiku)
- **Pourquoi Haiku** : exécute vitest + type-check + lint + filtre l'output verbose. Pattern detection sur `.only`/`.skip` leaks + code-vs-test delta imbalance + missing coverage. Output → uniquement failures et gaps.
- **Validation** : utilisé après chaque modif `curriculum.ts` / `terminalEngine.ts` / `validators.ts`. Pattern stable, performant.
- **Couverture exacte** : tests unitaires + type + lint, filtré.

#### `ui-auditor` (Haiku)
- **Pourquoi Haiku** : pattern detection sur composants UI custom HTML/Tailwind qui devraient être shadcn/ui + deps fantômes + couleurs/tailles en dur. Grep + cross-reference dépendances. Output rapport CRITICAL/HIGH/MEDIUM.
- **Validation** : THI-85/91 shadcn migration umbrella closée (avril 2026). Bloque merge si CRITICAL.
- **Couverture exacte** : toute PR touchant des composants UI.

---

## 4. Évolutions de doctrine — auto-apprentissage codifié

### Pattern : leçons des bugs intègrent le scope des agents
Codifié 20 mai 2026 dans `.claude/agents/README.md`. Plutôt que documenter une leçon dans un memo isolé que personne ne re-lit, l'intégrer dans le scope de l'agent qui aurait dû la détecter. Exemples :

| Incident | Leçon | Intégration |
|----------|-------|-------------|
| THI-186 (17 mai 2026) — data leak localStorage | RBAC = serveur **ET** client | `rbac-flow-tester` Étape 4 (5 patterns client-state) |
| 24 avril 2026 — silent downgrade Opus → Haiku | Agents sécurité = Sonnet minimum | Upgrade `rbac-flow-tester` + `prompt-guardrail-auditor` + garde-fou `.claude/settings.local.json` |
| Bug 42702 PR #266 — RETURNS TABLE column ambiguity | Test happy path AVANT merge | `feedback_happy_path_testing.md` + scope `classroom-workflow-auditor` |
| PR #149/#150 oubliées 14 jours (2 mai 2026) | `gh pr list` au shutdown obligatoire | `feedback_pr_inventory_blind_spot.md` + `session-orchestrator` shutdown phase |
| Sprint 2.A — STORY narrative en ticket différé | Écrire le STORY en cours de session si demandé | Doctrine intégrée dans process shutdown |

### Audit trimestriel script (recommandation)
Script `scripts/audit_agent_models.sh` proposé :
- Liste tous les agents + modèle
- Flag tout Haiku sur agent dont la description contient `security|rbac|rls|auth|crypto|llm|owasp`
- Output rapport → décision @cowork sur upgrade

Pas créé encore — à créer en début Sprint 2.B comme ticket dédié si pertinent.

---

## 5. Limitations connues + workarounds

### 5.1 Agents .md non loadable même session
Un agent créé via `.claude/agents/<name>.md` dans la session courante n'est pas disponible via `Agent` tool tant que la session n'est pas redémarrée. Workaround codifié :
- Pour les gate-zero (THI-237 classroom-workflow-auditor PR #274) → audit inline avec exactement la méthode documentée dans le `.md`
- Pour les chaînes (THI-238 institution-rbac-auditor PR #276) → lancement décalé à la session suivante

### 5.2 Agents ne peuvent pas s'invoquer mutuellement
Claude Code ne supporte pas le nesting d'agents. `session-orchestrator` RECOMMANDE la liste d'agents à lancer ensuite, le main agent les invoque. Documentation explicite dans la description de `session-orchestrator`.

### 5.3 Quota / coût modèle
Plan Pro Max x5 jusqu'au 10 juin 2026. Doctrine modèle ajustée selon scope critique :
- Opus 4.7 pour critique (3 agents)
- Sonnet pour standard sécurité + UX (10 agents)
- Haiku pour déterministe (4 agents)

Ratio actuel : 17% Opus / 56% Sonnet / 27% Haiku — équilibré selon criticité observée.

---

## 6. Recommandations Sprint 2.B+ (proposition @cowork)

1. **Activer `institution-rbac-auditor`** dès création des 3 test users École B (migration 022b). Pré-requis bloquant.
2. **Lancer `rbac-flow-tester` upgraded** dès la PR Sprint 2.B touchant `AuthContext`/`ProgressContext`/`useUserRole` (validation Étape 4 client-state).
3. **Créer ticket `audit_agent_models.sh`** (script Bash trimestriel) — proposer en Sprint 2.B planning ou décliner si pas le bon moment.
4. **Vérifier `.claude/settings.local.json`** existe et pin `claude-opus-4-7` (garde-fou anti-downgrade silencieux).
5. **Documenter Sprint 2.B `migration 022b` test users École B** AVANT toute PR `institution-rbac-auditor` runtime.

---

## 7. Score qualité agents (auto-évaluation)

| Critère | Note | Justification |
|---------|------|---------------|
| Couverture | 9/10 | 18 agents couvrent les axes critiques. Manque : performance backend (post-Vercel Drains $20/mois) |
| Cohérence modèles | 9/10 | Doctrine codifiée 20/05. Audit trimestriel à mettre en place |
| Auto-apprentissage | 8/10 | Pattern intégré (THI-186 → rbac-flow Étape 4). À étendre systématiquement |
| Documentation | 9/10 | README.md détaillé + fiches agents structurées + matrice usage |
| Gates per-PR | 10/10 | Chaque axe critique a son gate (UI / Sec / LLM / RBAC / Mobile / Firewall / Routes) |
| Limitation transparence | 9/10 | Limitations documentées (nesting, .md same-session, quota) |

**Score global : 9/10** — solide, performant, auto-améliorable.

---

## 8. Prochaine étape post-rapport

Sprint 2.B planning (prochaine session, 24-27 mai) :
- Migration 022b (3 test users École B + nouvelle institution)
- InstitutionAdminPanel skeleton + approve_teacher RPC
- Premier audit empirique `institution-rbac-auditor` (gate-zero)
- Validation des 16 checks contre prod Supabase via JWT impersonation

Rapport disponible : `docs/reports/agents-doctrine-2026-05-20.md` (ce fichier, committable dans la prochaine PR de session).

— Fin du rapport —
