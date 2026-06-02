# CLAUDE.md — Terminal Learning

> Instructions spécifiques à ce projet. Priorité absolue sur le CLAUDE.md global.

## Contexte projet
App pédagogique pour apprendre le terminal. Bénévole, open source, 100% gratuit.
- **Live** : https://terminallearning.dev
- **Repo** : https://github.com/thierryvm/TerminalLearning
- **Vercel** : https://vercel.com/thierry-vanmeeterens-projects/terminal-learning

## Règles Git — NON NÉGOCIABLES
- **Jamais de commit direct sur `main`** — toujours `feature/xxx` ou `fix/xxx`
- **Toujours créer une PR** avant de merger dans `main`
- **CI doit passer** (type-check + lint + test + build) avant tout merge
- Format commit : `feat|fix|refactor|test|docs|chore|security(scope): description`
- **JAMAIS hardcoder de passwords, API keys, tokens en clair** — même dans les migrations SQL, même "temporairement", même en commentaires. Utiliser toujours `${{ secrets.VAR }}` ou variables d'environnement gitignorées. Les git histories publiques ne permettent pas la revocation de credentials exposés — ils demeurent exploitables à jamais.

## Intégrité — RÈGLE ABSOLUE (anti-hallucination, anti-triche)
- **JAMAIS d'hallucination, JAMAIS de triche pour atteindre le résultat.** Aucune exception (quota, fatigue, pression de clôture).
- **Ne rien inventer** : fichier, chemin, API, fonction, n° de PR/issue, métrique, résultat de test, statut CI. Si non vérifié → le dire explicitement (« je SUPPOSE » vs « j'AI VÉRIFIÉ ») ou aller chercher la preuve (Read/Grep/Bash/curl/MCP, Context7 pour les libs).
- **Ne jamais affirmer « fait / corrigé / vert / mergé / testé » sans la preuve réelle** (sortie de commande, code HTTP, run CI, diff). `push done ≠ task done`.
- **Ne jamais maquiller un échec** : test rouge présenté vert, étape sautée présentée faite, `.only`/`.skip`/mock masquant la couverture, valeur hardcodée pour faire passer un test. Un **résultat honnête incomplet > un faux résultat complet**.
- Vaut pour moi (main agent) ET pour tout sous-agent. Détail : mémoire CC `feedback_no_hallucination_no_cheating.md`.

## Stack
- Vite 6 + React 18 + React Router v7 + TypeScript strict
- Tailwind CSS v4 + shadcn/ui (Radix UI) + CSS animations (motion/react retiré PR #108)
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
- Zéro injection HTML dans le codebase
- Zéro secret côté client
- Zéro `any` TypeScript
- CSP configuré dans `vercel.json` — mettre à jour si nouveaux domaines externes ajoutés
- HSTS activé : `max-age=63072000; includeSubDomains; preload`
- Avatars OAuth (GitHub/Google) : couverts par `img-src 'self' data: https:`

### Protection des credentials — RÈGLE ABSOLUE
- **JAMAIS** de password/API key/token en clair dans code/migrations/scripts/commentaires
- Utiliser `.env.local` (gitignorée) ou `${{ secrets.XXX }}` pour test credentials
- **L'historique git est permanent** — un credential committé = exposé à vie. Aucune revocation possible.
- **Avant tout merge** : `git diff main HEAD` scan pour `password`, `secret`, `token`, `key`, `sk-` → zéro hits requis
- **Si exposure post-merge** : Revert immédiat + rota ALL clés exposées + document dans SECURITY.md + envisager `git filter-repo`

**Incident 006 (21 avril 2026)**: `TerminalLearning2026!` exposé puis retiré. Historique contaminé. 5 test users rotés via Supabase Admin API. Risque résiduel accepté mais documenté.

## Phases
- Phase 0 ✅ Vercel live
- Phase 1 ✅ Landing + routing + RGPD + SEO + CI
- Phase 2 ✅ Analytics (Vercel Analytics + Sentry)
- Phase 3 ✅ Supabase Auth + DB — live (projet: `jdnukbpkjyyyjpuwgxhv`, eu-west-1)
- Phase 3.5 ✅ Landing upgrade + OAuth GitHub/Google + security hardening + sidebar auth (3 avril 2026)
- Phase 4 ✅ Curriculum v2 + multi-environment (Linux/macOS/Windows) + terminal profiles (9 avril 2026)
- Phase 5 🔄 Curriculum expansion — 11 modules, 66 leçons, 900 tests unitaires + 176 E2E Playwright (en cours)
- Phase 5.5 ✅ Terminal Sentinel — agents sécurité + contenus automatisés (PR #90, 12 avril 2026)
- Phase 7 ✅ RBAC complet — student/teacher/institution_admin/super_admin + RLS + audit log (PR #92, 12 avril 2026)
- THI-29 ✅ Module 11 — L'IA comme outil dev (12 leçons, `ai-help` + 11 sous-commandes, PR #103, 13 avril 2026)
- THI-84 ✅ Changelog public — CHANGELOG.md + STORY.md + routes /changelog /story + SEO (PRs #100–102, 13 avril 2026)
- THI-87 ✅ Bundle optimization — motion/react retiré, 22 deps inutilisées supprimées, 8 composants shadcn dormants supprimés (PR #108, 13 avril 2026)
- Phase 4c ✅ Bundle Optimization complète — Landing chunk ~65kB→~25kB gzip
- THI-90 ✅ INP fix — `setEnvironment` wrappé dans `startTransition`, lab CPU 4× : 515ms → 26ms (−95%) sur env switcher (PR #114, 14 avril 2026)
- THI-85 ✅ shadcn migration — NotFound.tsx (PR #116, 14 avril 2026)
- THI-91 ✅ shadcn migration umbrella — Dashboard, LessonPage, Landing A/B/C, ChangelogPage, StoryPage, CommandReference migrés (PRs #131/134/135/137/139/140/142, 15-17 avril 2026)
- THI-105 ✅ button.tsx consolidation — Sidebar wrappers + `icon-lg` neutre (PR #147, 18 avril 2026)
- THI-107 ✅ A11y focus-visible + 11 native `<button>` migrés (PRs #140/142, 17 avril 2026)
- THI-96 🔄 Web 2026 compliance — 6/8 sub-issues shipped (THI-97 à 102), reste desktop a11y + CSS moderne 2026
- THI-115 ✅ Doc alignment ADR-002 + ADR-005 (AI Tutor V1) — plan.md Phase 7b réécrit, 4 décisions figées (PR #151, 18 avril 2026)
- THI-109 ✅ Agent `prompt-guardrail-auditor` — gate zéro ADR-005, OWASP LLM Top 10, créé AVANT implémentation (PR #153, 18 avril 2026)
- THI-110 ✅ Key manager V1 — `src/lib/ai/keyManager.ts` + 32 tests, localStorage plain + IndexedDB AES-GCM + PBKDF2 210k iter, premier audit `prompt-guardrail-auditor` PASS (PR #155, 18 avril 2026)
- **Phase 7b 🔄 AI Tutor V1 (chaîne ADR-005)** — ✅ THI-109 · ✅ THI-110 · 🔜 THI-120 (scrubber Sentry, gate avant THI-111) → THI-111 (AiTutorPanel + providers + sanitizer) → THI-112 (onboarding AiKeySetup/AiConsentModal) → THI-113 (audit final) · THI-114 (Web Worker isolation V1.5 post-ship)

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
- **shadcn/ui non utilisé** — 39 composants Radix UI installés, mais l'UI est 100% custom Tailwind. THI-85 planifié pour migrer page par page. Ne jamais installer de nouveau composant shadcn sans l'utiliser immédiatement.

## Protocole de session — OBLIGATOIRE

### Agents disponibles (`.claude/agents/`)

> 📖 **Index complet + matrice d'usage + fiches détaillées** : voir [`.claude/agents/README.md`](.claude/agents/README.md). Le présent CLAUDE.md liste seulement les bullets condensés.

- **`linear-sync`** — vérifie PRs GitHub vs statuts Linear, détecte incohérences
- **`curriculum-validator`** — valide structure de `curriculum.ts` avant toute modification
- **`test-runner`** — lance vitest, retourne uniquement failures + commandes sans test
- **`content-auditor`** — audit pédagogique A→Z : env coverage, cohérence curriculum↔moteur↔tests, liens externes, chaîne de prérequis, qualité validate(). Lancer avant chaque release majeure ou à la demande.
- **`security-auditor`** — audit cybersécurité black hat : OWASP Top 10 (2021), OWASP API Sec (2023), CSP L3, rate limiting, RLS, auth flow, supply chain, RGPD, vecteurs 2026. Lancer avant chaque release majeure, après mise à jour de dépendances, ou à la demande. (THI-53)
- **`ui-auditor`** — détecte composants custom qui devraient utiliser shadcn/ui, deps fantômes, composants installés mais jamais importés, couleurs/tailles en dur. **Obligatoire avant toute PR touchant des composants UI.** CRITICAL = bloque le merge. (THI-86)
- **`vercel-firewall-auditor`** — lit la config Vercel Firewall active (WAF, managed rules, custom rules) et exécute une batterie de tests HTTP live contre `terminallearning.dev` pour confirmer que les rules bloquent bien les patterns d'attaque et laissent passer les users légitimes. Nécessite `$VERCEL_TOKEN` en session. Lancer avant chaque release majeure ou après toute modification firewall. Détails : `docs/vercel-firewall.md`.
- **`prompt-guardrail-auditor`** — audit sécurité LLM (OWASP LLM Top 10) du Tuteur IA (BYOK OpenRouter — ADR-002 + ADR-005) : prompt injection, jailbreaks, prompt leaks, role enforcement, bypass sanitizer, XSS sur rendu réponse, fuite clé API. **Obligatoire avant toute PR touchant `src/lib/ai/*` ou `src/app/components/ai/*`.** CRITICAL = bloque le merge. Créé AVANT implémentation (THI-109, gate zéro ADR-005) pour éviter la surprise en fin de chantier.
- **`route-attack-auditor`** — audit HTTP-level black-hat des endpoints `api/*` : status code fingerprinting, verb tampering, cache poisoning via 503, slowloris, side-channel timing, header smuggling, CORS edge cases, body guards, rate limit bypass, info disclosure. Tests live via `curl`. **Obligatoire avant toute PR touchant `api/*` ou après création d'un nouvel endpoint.** Complémentaire à `security-auditor` (qui couvre l'app layer) et `vercel-firewall-auditor` (qui couvre WAF). Créé suite au sprint sécurité 1-2 mai (lacune route-level identifiée).
- **`session-orchestrator`** — orchestrateur de session, exécute les phases startup et shutdown dans son contexte isolé (économie tokens main agent). Lit les memos CC `session_startup_process.md` et `session_shutdown_process.md`, fait les checks d'état (git + GitHub + Linear + health check prod + banner scan plan.md/ROADMAP.md + freshness markers), met à jour les .md vitaux en shutdown, et produit un rapport structuré 8 sections avec recommandation des sous-agents à lancer ensuite par le main agent. **À invoquer en début de chaque session (mode `startup`) ET en fin (mode `shutdown`)**. Ne peut pas invoquer d'autres agents (limitation runtime CC) — il RECOMMANDE leurs prompts prêts-à-coller.
- **`legal-compliance-auditor`** — audit conformité juridique européenne et belge (Opus 4.7, méthode 5 couches, auto-update via WebSearch live). Scope : RGPD UE 2016/679, AI Act EU 2024/1689, DSA 2022/2065, recommandations CNIL Éducation, droit belge DPA, eIDAS, droits mineurs (consentement parental). Audite `/privacy`, mentions légales, cookie banner, JSON-LD, ADRs sécurité, procédures RGPD Art. 15-22. Couche 1 inventory **avant** Couche 4 recommandations (anti-doublon Linear). Couche 5 self-critique signale explicitement ce qui demande un avocat humain professionnel — l'agent **ne remplace pas** un avis juridique pro. Lancer trimestriellement, avant releases majeures B2B écoles / publication AI Tutor / activation LTI / traitement mineurs, ou après changement règlementaire UE majeur. Coût ~$3-5 par run (Opus + 8-12 WebSearch). Créé suite décision @thierry 24/05/2026 — qualité premium + responsabilité juridique B2B écoles (THI-270).

### Début de chaque session
**Méthode primaire (en parallèle)** :
1. Invoquer l'agent **`session-orchestrator`** mode `startup`. Il lit `session_startup_process.md`, exécute les Phases 0→4 (model check + contexte/mémoire + état projet + **health check prod** + **banner scan plan/ROADMAP** + challenge personnel), recommande `linear-sync` au main agent, et produit un rapport go/no-go.
2. Invoquer le skill **`/obsidian-session-sync`** mode startup. Il lit le vault Athenaeum via MCP `claude-code-mcp` : daily note + sources of truth + handoffs @cowork pending. Critique en mode trio binôme (@cowork ↔ @cc-tl ↔ @thierry).

**Méthode dégradée** (fallback si les outils ne sont pas invoqués) :
1. Invoquer l'agent **`linear-sync`** → analyser son rapport, corriger les statuts Linear signalés
2. `git status` + `git log --oneline -5` + `gh pr list --state open` → état de la branche courante + scope projet
3. Health check prod (4× `curl https://terminallearning.dev/...`) + CI main (`gh run list --branch main --limit 3`)
4. Lire **lignes 1-5 uniquement** de `docs/plan.md` + `docs/ROADMAP.md` (banner statut)
5. Lire l'issue Linear active avant d'écrire la moindre ligne
6. Si vault Athenaeum accessible : lire daily note + handoffs @cowork manuellement (fallback du skill Obsidian)

### Fin de chaque session — récap obligatoire avant "stop"
**Méthode primaire (en parallèle)** :
1. Invoquer l'agent **`session-orchestrator`** mode `shutdown`. Il lit `session_shutdown_process.md`, exécute les 10 phases (état local + PRs ouvertes début ET final + audit agents par fichier modifié + mémoires CC + Linear sync exhaustif + .md vitaux + freshness markers + ADR libre + rapport 8 sections).
2. Invoquer le skill **`/obsidian-session-sync`** mode shutdown. Il écrit dans le vault Athenaeum : décisions/learnings/blockers, crée des Zettels si pattern réutilisable, dépose un rapport pour @cowork (symbiose multi-agents).

**Méthode dégradée** (fallback) :
1. ✅ `git status` clean (rien d'uncommit ou stagé sans raison documentée)
2. ✅ `gh pr list --state open` → **lister TOUTES les PRs ouvertes**, pas seulement celles de la session
3. Pour chaque PR ouverte > 7 jours : la mentionner explicitement avec date + statut CI/Sourcery/Vercel + action attendue (validation utilisateur, merge, etc.)
4. Distinguer dans le récap : "PRs livrées cette session" / "PRs externes en attente" / "Branches orphelines"
5. **Mot interdit** : "rien d'orphelin" sans `gh pr list` au préalable. Le scope d'un récap shutdown est le **projet entier**, pas la session courante. (Incident 2 mai 2026 — #149/#150 oubliées 14 jours, leçon documentée dans `memory/feedback_pr_inventory_blind_spot.md`.)

### Avant toute modification de `curriculum.ts`
- Invoquer l'agent **`curriculum-validator`** → analyser le rapport, corriger les CRITICAL avant de continuer

### Après chaque modification de `curriculum.ts` ou `terminalEngine.ts`
- Invoquer l'agent **`test-runner`** → si VERDICT = ❌ Fix required, corriger avant de proposer un commit

### Incohérences Linear à corriger dès détection
- Issue Done + PR non mergée → **In Review**
- Issue In Progress + PR ouverte → **In Review**
- Issue In Review + PR mergée → **Done**

### Avant toute PR de code (`src/`, `api/`, `supabase/`) — gate code-review (codifié 31/05/2026)
- Invoquer l'agent **`feature-dev:code-reviewer`** sur le diff → corriger les findings CRITICAL/IMPORTANT avant merge.
- **En plus** de Sourcery (review automatique CI), pas à la place : ils sont complémentaires. *Incident #340 (31/05)* : Sourcery + mes vérifs manuelles ont laissé passer un drift SEO (compteur `/app/reference` figé 59→75) que `feature-dev:code-reviewer` a attrapé en post-merge (fix #342). Le code-review confidence-based attrape la correctness/maintainability que Sourcery ne flague pas toujours.
- Ne remplace PAS les gates spécialisés ci-dessous (ui-auditor / prompt-guardrail / security-auditor / route-attack) — c'est une passe correctness générale qui s'ajoute.
- **Exemptions** : PR **docs-only** (`*.md`, `docs/`) ou **config-only** triviale (ex. `.gitignore`) → pas de `feature-dev:code-reviewer` (ce sont des Voie C, smoke test suffit). Le gate vise le code exécutable (`src/`, `api/`, `supabase/`).
- **Ordre pour PR à périmètre mixte** : lancer d'abord les gates **spécialisés** pertinents (ui-auditor / prompt-guardrail / security-auditor / route-attack selon le scope), corriger leurs CRITICAL, **puis** `feature-dev:code-reviewer` en dernier sur le diff stabilisé (évite de reviewer du code qui va changer). Les findings des deux se cumulent avant merge.
- Sweep full-codebase périodique des zones jamais couvertes par un review-agent : tracké **THI-306**.

### Avant toute PR touchant des composants UI
- Invoquer l'agent **`ui-auditor`** → analyser le rapport, corriger les CRITICAL avant de proposer la PR
- Tout CRITICAL dans le rapport bloque le merge — pas d'exception

### Avant toute PR touchant le Tuteur IA (`src/lib/ai/*` ou `src/app/components/ai/*`)
- Invoquer l'agent **`prompt-guardrail-auditor`** → analyser le rapport, corriger les CRITICAL avant de proposer la PR
- Tout CRITICAL dans le rapport bloque le merge — pas d'exception
- Lancer aussi `security-auditor` pour les aspects transverses (CSP `connect-src`, fuite clé dans Sentry, etc.)

### Avant toute PR touchant auth/RBAC/RLS/API/crypto
- **Obligatoire** : invoquer l'agent **`security-auditor`** → analyser le rapport COMPLET, corriger les CRITICAL et HIGH avant merge
- Scope: modifications à `api/`, `supabase/migrations/`, `src/lib/ai/`, `src/lib/supabase.ts`, JWT handling, rate limiting, CSP, secrets
- Résumé pré-merge: type des changements sécurité (auth, RLS, encryption, API protection, etc.)
- Le rapport security-auditor devient obligatoire pour l'approbation de PR — archiver le résultat dans le commentaire PR

### Avant toute PR touchant un endpoint `api/*` (HTTP-level)
- **Obligatoire** : invoquer l'agent **`route-attack-auditor`** → tests `curl` live contre la preview Vercel
- Vérifie : status fingerprinting, verb tampering, cache poisoning, slowloris, CORS edge cases, info disclosure, rate limit bypass
- Complémentaire à `security-auditor` (app-layer) et `vercel-firewall-auditor` (WAF)
- Verdict release-ready obligatoire avant merge (✅ ship / ⚠️ ship avec mitigations / 🔴 bloque)

### Vercel Firewall — modifications
- Toute modification firewall passe par l'**API REST Vercel** (pas par `vercel.json`)
- Documenter chaque changement dans `docs/vercel-firewall.md` (IDs, patterns, rationale, rollback)
- Lancer l'agent **`vercel-firewall-auditor`** après chaque modification pour valider en conditions réelles
- **Ne jamais commiter le `VERCEL_TOKEN`** — variable d'environnement en session uniquement, révoquer après usage

### Règles merge
- CI verte **ET** Sourcery vérifié avant de proposer un merge — **dans cet ordre, sans exception**
  ```bash
  gh pr view N --comments 2>&1 | grep -A 15 -i "sourcery\|issue\|suggestion\|bug"
  ```
  Si Sourcery a commenté → corriger dans un commit fixup → repousser → ALORS proposer le merge
  Si Sourcery = SKIPPED (rate limit hebdomadaire atteint) → acceptable, procéder au merge
- **Jamais merger sans validation visuelle Vercel explicite de Thierry** (Chrome + mobile) — sauf Voie C ci-dessous
- Après merge → issue Linear → Done + mettre à jour `docs/plan.md`

### Validation visuelle preview Vercel — matrice 3 voies (codifié 17 mai 2026)
Toute PR DOIT être validée visuellement avant merge, SAUF exception explicite Voie C. Choix de la voie en fonction du scope :

**Voie A — Chrome DevTools MCP avec bypass header (par défaut)**
- Quand : PR touche `src/` (UI, composants, routes), `api/`, `vercel.json`, ou tout fichier impactant le runtime
- Méthode : Chrome MCP `new_page` sur preview URL avec query param unique :
  `?x-vercel-protection-bypass=<VALEUR>&x-vercel-set-bypass-cookie=samesitenone`
- Une seule navigation avec query param par hostname (le cookie persiste) — règle anti-leak `reference_vercel_bypass.md`
- Vérifs obligatoires : `take_snapshot` + `take_screenshot` + `list_console_messages` (zéro erreur rouge) + `list_network_requests` (zéro 4xx/5xx)
- Pages à tester : selon scope PR (au minimum la page modifiée, idéalement `/` + page modifiée)
- **Mobile obligatoire (codifié 31/05/2026)** : toute PR touchant du rendu DOIT être validée aussi en **viewport mobile 390px** (`resize` 390×844), pas seulement desktop. Check empirique décisif : `document.documentElement.scrollWidth - clientWidth === 0` (zéro overflow horizontal) via `evaluate`, + screenshot de l'élément modifié. Red flags qui rendent ce check non-optionnel : labels/textes longs, `inline-flex`/`whitespace-nowrap`, largeurs fixes px, tableaux, code spans longs. Changement de layout sensible (nav, drawer, grille, cards, formulaires) → invoquer en plus `mobile-responsive-auditor`. *Incident #337 (31/05) : Voie A desktop-seul, overflow mobile possible non testé sur labels longs `inline-flex` — sans conséquence (le texte wrappait) mais par chance, pas par rigueur.*

**Voie B — Browser utilisateur direct (fallback)**
- Quand : Chrome MCP coince sur l'injection bypass, ou si validation rapide suffit
- Méthode : Thierry charge l'URL dans son browser (session Vercel SSO déjà active)
- Durée : 30 secondes max, pas de babysitting
- Limite : pas adaptée si scope PR > 1-2 pages à tester en profondeur

**Voie C — Skip validation visuelle PROFONDE (exceptionnel, conditions cumulatives)**
- PR 100% docs (`*.md` seulement, ou `docs/`)
- 0 fichier `src/`, `api/`, `supabase/`, `package.json`, `vercel.json`, ou tout fichier impactant runtime
- CI verte + Sourcery vert (ou SKIPPED rate-limit acceptable)
- **Smoke test preview OBLIGATOIRE** (≠ validation visuelle profonde) — codifié 23 mai 2026 : `curl` HTTP 200 sur 4-8 endpoints clés (`/`, `/app`, `/sitemap.xml` + page modifiée si applicable) via pattern bypass header. Confirme que le deploy n'a pas cassé l'app et qu'aucune régression silencieuse n'est introduite (cf. PR #283 où sitemap servi ≠ sitemap committé à cause d'un script prebuild caché).
- Mention obligatoire dans le message merge : "Voie C — docs-only, scope vérifié, 0 risque runtime, smoke test preview PASS"

**Règle d'or préview** : TOUJOURS vérifier la preview Vercel quand cela se justifie, même en Voie C. Le smoke test minimal (`curl` HTTP 200 + spot-check du contenu modifié) prend 10 secondes et attrape des régressions silencieuses qu'aucun check CI ne détecte (cf. incident sitemap PR #283 — CI verte + Vercel SUCCESS mais contenu obsolète servi à cause d'un build script qui écrasait le fichier).

### Sécurité tokens bypass — input ET output side (codifié 17 mai 2026)
- **JAMAIS `curl -I`** sur URL Vercel protégée : la response `Set-Cookie: _vercel_jwt=<JWT>` contient le RAW bypass token dans son payload base64-décodable. Capter ce header en tool result = compromission du contexte de conversation.
- **Pattern obligatoire** smoke test (placeholders : `$bypass` = valeur du token, `<PREVIEW_URL>` = URL `https://terminal-learning-*.vercel.app/...`) :
  ```bash
  bypass="<VERCEL_PROTECTION_BYPASS_VALUE>"
  curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
       -H "x-vercel-protection-bypass: $bypass" \
       "<PREVIEW_URL>"
  ```
- Si headers nécessaires (debug) : `curl -sS -D /tmp/h -o /tmp/b ...` puis `grep -vi '^set-cookie:\|_vercel_jwt' /tmp/h` puis `rm /tmp/h /tmp/b`
- **Principe discard-by-default** : afficher uniquement ce qu'on veut, jamais filtrer ce qu'on ne veut pas (un filtre dépend de connaître tous les noms de headers possibles, le discard ne dépend que de savoir ce qu'on demande)
- Référence détaillée : `~/.claude/projects/.../memory/reference_vercel_bypass.md` — Vecteurs 1 (input 24/04) + 2 (output 17/05) — *ressource locale développeur (mémoire Claude Code), hors repo*

### Graduation STOP sécurité (codifié 17 mai 2026)
- STOP sécurité ≠ rotation automatique. STOP = pause + **évaluation graduée**.
- Grille d'évaluation AVANT toute demande de rotation à l'humain :
  1. **Surface** : publique (commit, log CI public, URL partagée hors machine) → ROTATE | locale (conversation context, `.secrets/` gitignored) → CLEAR + CONTINUE
  2. **Durée** : leak conversation-only meurt au prochain `/compact` ou fin de session — pas de fenêtre d'exploitation au-delà
  3. **Coût rotation** : cheap (regen 3 min) vs cher (clé API avec crédit consommé, 5 comptes test liés)
  4. **Pattern reproductible** : FIX pattern d'abord, ROTATE seulement si surface publique
- Référence : `~/.claude/projects/.../memory/feedback_graduation_stop_security.md` — *ressource locale développeur (mémoire Claude Code), hors repo*

### Décision sécurité après 22h — DOCTRINE RETIRÉE par @thierry le 18 mai 2026
- **Statut** : codifiée 17 mai 2026 (sustainability THI-212), **explicitement retirée par @thierry le 18 mai 2026 soir** (« sas 48h tu ne dois plus du tout en tenir compte nulle part »).
- @thierry se déclare résistant à la fatigue mentale et préfère ne pas s'imposer ce cadre. La grille graduation STOP `feedback_graduation_stop_security.md` reste applicable comme évaluation des leaks, mais le cutoff horaire 22h n'est plus une règle.
- La grille reste pertinente pour la qualité décisionnelle objective ; seul l'auto-déclaration horaire est annulée. `sustain-auditor` peut continuer à reporter des signaux objectifs trimestriellement.

### Discipline séquentielle PR ↔ branche
- **Une PR à la fois jusqu'à merge.** Pas de création de branche pour PR N+1 avant que PR N soit mergée.
- **Exception 1 — review externe long terme** : si PR N est bloquée par review externe (Sourcery, Vercel, validation visuelle pending), documenter explicitement dans la session le démarrage en parallèle (sinon dette mentale d'oubli garantie).
- **Exception 2 — hotfix production cassée** : si la prod est down ou un bug critique impacte les utilisateurs, un `fix/hotfix-*` court (≤ 5 fichiers, scope chirurgical) peut être ouvert en parallèle d'une PR feature en cours. Conditions cumulatives :
  - Branche **depuis `main`** (pas depuis la branche feature en cours)
  - Une seule responsabilité (le hotfix), pas d'embarquement de polish
  - Mention explicite dans la PR : `[HOTFIX]` en titre + lien vers incident (Sentry, rapport user, etc.)
  - Validation Voie A obligatoire (pas Voie C même si docs) sauf si la prod est inaccessible — auquel cas Voie B humaine immédiate
  - Reprise de la PR feature interrompue documentée à la fin du hotfix (todo + branche checkout explicite)

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
- **Playwright** — e2e/ ajouté (3 suites : accessibility, mobile, seo). Exclure de vitest (`exclude: ['node_modules/**', 'e2e/**']` dans vitest.config.ts — ne jamais retirer).
