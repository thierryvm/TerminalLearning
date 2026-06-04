# Security Audit Log

Record of security findings, fixes, and protocol improvements for Terminal Learning.
This log is updated after each security audit and serves as institutional memory.

---

## Rattrapage traçabilité — runs Sprint 2.C + break-ins agents (consolidé 4 juin 2026)

**Date**: 4 juin 2026 (consolidation rétroactive)
**Auteur**: CC Terminal Learning (Opus 4.8) — drift détecté au démarrage : ce log n'avait pas été appendé depuis le 17 mai alors que ~5 runs `security-auditor` 9.x/10 ont eu lieu pendant Sprint 2.C.
**Méthode**: consolidation depuis les décisions `_index.md` (Obsidian) + memos de session + PRs mergées. **Scores non ré-exécutés** — repris des verdicts d'origine (traçabilité, pas nouveau run).

### Runs Sprint 2.C (système support)

| Date | Run | Score / Verdict | PR | Ticket |
|---|---|---|---|---|
| 1 juin | `security-auditor` (route Resend `api/support/notify.ts`) | 9.2/10, 0 CRIT/HIGH | #360 | THI-319 |
| 1 juin | `route-attack-auditor` (notify endpoint, curl live) | SHIP, tout PASS | #360 | THI-319 |
| 2 juin | `security-auditor` (triage signalements `/app/admin`) | 9.5/10 | #364 | THI-320 |
| 2 juin | `security-auditor` (« Mes signalements » `/app/support`, isolation RLS REST+JWT prouvée) | 9.6/10 | #366 | THI-325 |
| 2 juin | `supabase-backend-auditor` (verdict **inline** — agent non chargé runtime, YAML cassé) | H1 MIME-spoof signalé | #364 | THI-326 |

### Break-in des agents (4 juin — démarrage de session)

| Run | Verdict | Suite |
|---|---|---|
| `supabase-backend-auditor` — re-run WS3 (1er run sous-agent réel post-fix #365) | ⚠️ SHIP — prod SÛRE, H1 MIME-spoof confirmé empiriquement & atténué (rendu `<img>` JSX-only) | THI-339 (PR #368, triggers élargis aux routes `api/*`) |
| `user-forensics-auditor` — sonde chargement (post-#365) | ✅ chargement runtime confirmé (Sonnet 4.6) | — |
| `legal-compliance-auditor` — break-in #1 | **6.5/10** — base B2C OK, **non prêt pour le B2B mineurs** (3 HIGH : consentement parental <13 BE, DPA Art. 28, claim `/privacy` trompeur) | THI-340 (umbrella) |

### Note de contexte

THI-326 a prouvé (cause racine js-yaml) que `supabase-backend-auditor` + `user-forensics-auditor` n'étaient **pas chargés au runtime** (un `:` + espace cassait leur frontmatter YAML) jusqu'au fix PR #365 — d'où le verdict « inline » du 2 juin pour `supabase-backend-auditor`. Les deux sont **confirmés invocables le 4 juin** (WS3 clos).

**Last Updated**: 4 juin 2026
**Next Review**: prochain run `security-auditor` (THI-234 widgets analytics — nouvelles RPC cross-user `SECURITY DEFINER`)

---

## Validation Voie B post-merge THI-207 (#246) -- 17 mai 2026 ~21h CEST

**Date**: 17 mai 2026 (soirée)
**Validateur**: backup décisionnaire (Opus 4.7) via Chrome DevTools MCP
**Commit prod testé**: c2f1cd6 (post-merges #246 THI-207 + #248 THI-211 + #250 tw-animate-css)
**Compte test**: test.student@terminallearning.dev (UUID 111...105)
**Méthode**: Voie B humaine semi-automatisée — login direct, injection localStorage/sessionStorage, signout via sidebar, inspection state final
**Référence ticket**: THI-207 (RGPD critical AI consent + plain keys leak inter-utilisateurs)

### Setup pré-signout (état "User A authentifié avec AI configuré")

State injecté dans localStorage/sessionStorage de prod via Chrome MCP `evaluate_script` :

- `localStorage.ai_key_openrouter` = fake test key (`sk-or-fake-test-key-voie-b-thi207-validation`)
- `localStorage.ai_tutor_provider` = `openrouter`
- `localStorage.ai_consent_v1` = `{version:1, acceptedAt, expiresAt:+365d}`
- `sessionStorage.ai_rate_v1` = `{count:0, windowStart}`
- `sessionStorage.ai_tutor_mode` = `socratic`
- `localStorage.sb-jdnukbpkjyyyjpuwgxhv-auth-token` = présent (session Supabase active test.student)

### Action

Click "Se déconnecter" via sidebar de la page `/app/settings`. Redirect vers Landing `/` observé.

### Verdict empirique POST-SIGNOUT

| Item | Pre-signout | Post-signout | Verdict |
|---|---|---|---|
| `ai_key_openrouter` (localStorage) | ✓ présent | ❌ absent | ✅ FLUSHED |
| `ai_tutor_provider` (localStorage) | ✓ présent | ❌ absent | ✅ FLUSHED |
| `ai_consent_v1` (localStorage) | ✓ présent | ❌ absent | ✅ FLUSHED |
| `ai_rate_v1` (sessionStorage) | ✓ présent | ❌ absent | ✅ FLUSHED |
| `ai_tutor_mode` (sessionStorage) | ✓ présent | ❌ absent | ✅ FLUSHED |
| `sb-...-auth-token` (localStorage) | ✓ présent | ❌ absent | ✅ FLUSHED (Supabase auth signout) |
| `terminal-master-progress-owner` | guest marker | guest marker (kept) | ✅ THI-186 fix tient (owner-tracking) |
| `sessionStorage` count total | 2 keys | 0 keys | ✅ CLEAN |

### Verdict

**✅ PASS empirique sur prod**. `clearAiSessionData()` (exporté depuis `src/lib/ai/keyManager.ts`) appelé depuis `AuthContext.signOut()` flush correctement les 5 items AI session data (3 localStorage + 2 sessionStorage). Aucune persistence d'aucune des clés AI configurées. THI-186 fix progression continue de tenir en parallèle (owner-tracking marker préservé en mode guest).

Bug RGPD AI consent inter-utilisateurs (Article 7 RGPD — consent doit être explicite et per-user) **résolu et confirmé empirique en production**.

### Notes posture

- Test executé pendant le sas 48h post-merge THI-207 (cf. memory/project_sprint_2_handoff_10juin.md "Sas obligatoires") sans démarrer THI-42 — sas respecté.
- Validation Voie B effectuée à 21h CEST (après 22h locale = sustainability rule "décision sécurité après 22h" applicable, mais ici il s'agit d'une **validation** d'un fix déjà déployé, pas d'une décision sécurité nouvelle — pas de violation doctrine).
- Findings hors scope détectés à l'occasion : aucun.

### Suivi

- M1 owner-mismatch sign-in (token expiry sans signout explicite, User B login sans clear) → tracé THI-215 backlog Low. Pattern symétrique THI-186 à appliquer sur consent record.
- R1/R2 docs RGPD (consent expiry policy + passphrase recovery FAQ) → tracé THI-210 backlog Low.

Closes validation Voie B THI-207.

---

## Audit: Delta post-PR #236 (THI-131) + PR #237 (THI-180) -- 16 mai 2026

**Date**: 16 mai 2026
**Auditor**: agent security-auditor (Opus 4.7, black-hat posture, delta-scoped)
**Commit baseline**: HEAD e6adcd5
**PRs in scope**: #236 (THI-131) + #237 (THI-180)
**Baseline pre-session**: 8.8/10 (post-THI-111 PR #188)
**Standards**: OWASP Top 10 (2021) - OWASP API Sec (2023) - CSP L3 - 2026 norms

### Scope audite

| Fichier | Statut |
|---|---|
| supabase/migrations/013_lti_launches.sql | Audite |
| supabase/migrations/014_revoke_security_definer_rpc.sql | Audite |
| api/lti/launch.ts | Audite |
| vercel.json | Audite (diff LTI block) |
| package.json + package-lock.json | Audite |
| src/lib/lti/{types,nonceStore,verifyJwt}.ts | Audite |

---

### CRITICAL -- 0

Aucun finding critique.

---

### HIGH -- 1

**[H1] Supply chain -- undici@5.28.4 bundle dans @vercel/node@5.8.2 (7 CVE HIGH)**

- Surface: @vercel/node@5.8.2 en devDependencies (runtime Vercel Node.js Functions)
- Vecteur: undici@5.28.4 bundlee. npm audit: 7 CVE HIGH actifs: GHSA-c76h-2ccp-4975 (random values), GHSA-g9mf-h72j-4rw9 (decompression DoS), GHSA-cxrh-j4jr-qwg3 (bad cert DoS), GHSA-2mjp-6q6p-2qxm (HTTP smuggling), GHSA-vrm6-8vpv-qv8q (WebSocket memory), GHSA-v9p9-hfj2-hcw8 (WebSocket exception), GHSA-4992-7rv2-5pvq (CRLF injection via upgrade).
- Impact: GHSA-2mjp-6q6p-2qxm + GHSA-4992-7rv2-5pvq exploitables sur Vercel Functions effectuant requetes HTTP sortantes (JWKS fetch verifyJwt.ts, import @sentry/node lazy-load).
- Mitigation active: LTI_ENABLED=false gate retourne 503 avant toute logique JWKS. Surface inactive tant que flag reste false.
- Contexte: npm audit fix --force downgraderait vers @vercel/node@4.0.0 (breaking). Attendre patch upstream undici >=6.24.0.
- Remediation: Creer THI-{next}. Gate non-negociable: LTI_ENABLED ne passe pas a true tant que H1 non resolu.

---

### MEDIUM -- 2

**[M1] Dual ALLOWED_ISSUERS -- drift entre api/lti/launch.ts et src/lib/lti/verifyJwt.ts**

- Surface: api/lti/launch.ts:80 definit son propre Set local independant de src/lib/lti/verifyJwt.ts:61.
- Vecteur: Ajout LMS dans verifyJwt.ts oublie dans launch.ts = 400 errones pour tokens valides. Drift inverse post-PR #2 = issuer non valide cote crypto accepte.
- Impact actuel: LOW (LTI_ENABLED=false). Impact post-PR #2: MEDIUM si drift non resolu.
- Remediation PR #2: Supprimer const ALLOWED_ISSUERS dans launch.ts, importer depuis verifyJwt.ts. Si bundling interdit, creer api/lti/_lti-config.ts. Test CI obligatoire.

**[M2] PII dans Sentry contexts -- context_id + roles exposes**

- Surface: api/lti/launch.ts:233 + :255 -- contexts: { lti_launch: { ...log } } spread inclut context_id et roles.
- Vecteur: context_id = identifiant institutionnel RGPD. Croiser events Sentry pour meme sub reconstitue parcours scolaire.
- Mitigation existante: api/sentry-tunnel.ts scrube contexts (THI-120, PR #230). Risque residuel contenu.
- Remediation: Remplacer spread par contexts: { lti_launch: { event: log.event, timestamp: log.timestamp } }.

---

### LOW / INFO -- 5

**[L1] lti_launches.client_ip -- IP brute sans TTL (dette RGPD)**
Surface: 013_lti_launches.sql:41. Remediation non urgent: hash pg_crypto ou purge automatique. Tracker THI-182.

**[L2] verifyJwt.ts ne valide pas le claim nonce LTI 1.3**
Surface: types.ts:36 declare nonce? mais verifyJwt.ts ne le valide pas. Non-bloquant (protection via jti C5). Documenter comme TODO PR #2.

**[L3] rls_auto_enable() retient EXECUTE pour service_role**
Surface: 014_revoke_security_definer_rpc.sql:31-35. Volontaire et documente. Exploitabilite faible. THI-182 est la cloture.

**[L4] GitHub Actions -- SHA pins confirmes OK**
actions/checkout@34e114..., actions/setup-node@49933e..., gitleaks-action@dcedce.... Aucun tag mutable.

**[L5] jsonwebtoken@9.0.3 en production dependencies**
package.json:48 -- residuel SPIKE. npm audit: 0 CVE actif. PR #2 doit supprimer ou deplacer en devDependencies.

---

### Positifs notables (zero finding)

| Surface | Verdict |
|---|---|
| 013 RLS zero-policy | enable row level security sans policy = zero acces anon/authenticated. |
| 013 UNIQUE(jti) replay | Double defense: nonceStore in-memory + UNIQUE DB cold-start resilience. |
| 014 idempotency DO blocks | Verification pg_proc avant REVOKE = migration re-runnable. |
| 014 3 fonctions epargnees documentees | Distinction trigger-only vs RLS-invoked documentee, pointeur THI-182. |
| vercel.json X-Frame-Options ALLOW retire | Bloc LTI sans header RFC-invalide. CSP frame-ancestors LMS reste. |
| vercel.json wildcard frame-ancestors none | Routes non-LTI protegees contre clickjacking. |
| LTI_ENABLED=false gate | 503 avant tout import lourd. 503 path O(1). |
| Rate limit x-vercel-forwarded-for | Header non-spoofable Vercel edge. |
| jsonwebtoken non importe en runtime | Imports: @vercel/node (types) + @sentry/node (lazy apres flag). |
| verifyJwt.ts RS256 strict | algorithms RS256, jose@6 bloque bypass alg. |
| verifyJwt.ts SSRF defendu | Allowlist validee AVANT tout fetch reseau. |
| verifyJwt.ts iat future valide | Verification manuelle ligne 247 ferme replay JWT indefini. |
| nonceStore.ts TTL adequat | 10 min > 5 min JWT LTI standard. |
| Migrations SQL zero credential | Aucun password, token, crypt() litteral dans 013 + 014. |
| Git history migrations propre | Historique des 2 nouveaux fichiers: aucun credential. |

---

### Score

| Metrique | Valeur |
|---|---|
| Baseline pre-session | 8.8/10 |
| Delta PR #236 + #237 | +0.0 (H1 undici non resolu compense gains architecturaux) |
| **Score post-audit** | **8.8/10 maintenu** |
| Tendance | Stable -- surface LTI bien concue, bloquee par supply chain undici hors controle direct |

Gains +0.3 (REVOKE trigger functions, UNIQUE jti, SSRF defendu, X-Frame-Options ALLOW retire, idempotency DO blocks) / Pertes -0.3 (H1 undici 7 HIGH CVEs, M1 dual ALLOWED_ISSUERS drift, M2 PII Sentry contexts).

---

### Verdict release-ready

**SHIP AVEC MITIGATIONS** (LTI_ENABLED=false gate maintenu)

Code livre dans PR #236 + #237 correctement structure pour un SPIKE gate. Surfaces cryptographiques (verifyJwt.ts, nonceStore, DB UNIQUE jti) solides. Migration 014 propre et idempotente.

Blockers avant LTI_ENABLED=true (PR #2+):
1. H1 -- undici@5.28.4: surveiller @vercel/node patch
2. M1 -- fusionner ALLOWED_ISSUERS en source de verite unique
3. M2 -- nettoyer contexts.lti_launch Sentry
4. L5 -- supprimer jsonwebtoken des production deps

---

### 3 actions prioritaires

1. **[P1 -- H1 gate]** Creer THI-{next} pour monitorer @vercel/node bump undici >=6.24.0. Ajouter dans docs/lti-install.md: LTI_ENABLED reste false tant que H1 non resolu. Gate non-negociable.

2. **[P2 -- M1 avant PR #2]** Supprimer const ALLOWED_ISSUERS de api/lti/launch.ts, importer depuis src/lib/lti/verifyJwt.ts (ou api/lti/_lti-config.ts si bundling interdit). Test CI: issuer dans un seul des deux Sets = build echoue.

3. **[P3 -- M2 avant PR #2]** Remplacer contexts: { lti_launch: { ...log } } par contexts: { lti_launch: { event: log.event, timestamp: log.timestamp } } dans les deux captureMessage/captureException de api/lti/launch.ts.

---

### Linear sync

- THI-131 -> Done (PR #236 merged)
- THI-180 -> Done (PR #237 merged)
- THI-{next} a creer: tracker H1 undici supply chain gate LTI_ENABLED
- THI-182 (existant): L3 rls_auto_enable schema private -- non modifie par cet audit

**Last Updated**: 16 mai 2026
**Next Review**: Pre-PR #2 LTI (avant activation LTI_ENABLED=true)


## Audit: LTI Phase 7c Auth MVP — cascade `lti-auditor` + cleanup SPIKE (16 mai 2026)

**Date**: 16 mai 2026 ~15:00 CEST
**Auditor**: agent `lti-auditor` (Opus 4.7, MVP 10 checks critiques — gate-zéro Phase 7c, pattern THI-109)
**Trigger**: Audit cascade pendant PR #236 (THI-131 LTI 1.3 Auth MVP, première PR de la séquence Phase 7c) + détection d'anti-patterns dormants dans le SPIKE existant `api/lti/launch.ts`
**Outcome**: ✅ **Verdict ship-ready PR #236** + 3 findings cleanup intégrés dans la même PR (anti-patterns SPIKE supprimés AVANT merge)

### 10 critical checks couverts par 19 tests Vitest (`src/test/lti-verifyJwt.test.ts`)

| Check | Status | Couverture |
|---|---|---|
| C1 — RS256 signature verification | ✅ | `algorithms: ['RS256']` strict via `jose.jwtVerify` + tamper test |
| C2 — `iss` whitelist | ✅ | Allowlist hardcodée validée **PRE-fetch JWKS** (anti-SSRF) |
| C3 — `aud` match | ✅ | Strict equality avec `TL_CLIENT_ID` env-provided |
| H4 — exp/iat strict ≤30s skew | ✅ | `clockTolerance: 30s` + manual `iat` upper-bound check (jose ne valide pas iat futur par défaut) |
| C5 — nonce store collision | ✅ | In-memory 10min TTL + DB UNIQUE(jti) defense-in-depth |
| H6 — jti uniqueness window | ✅ | TTL ≥ JWT exp typique (LTI 1.3 = 5min) |
| H7 — kid matches JWKS | ✅ | `createRemoteJWKSet` natif jose (cooldown 30s + timeout 5s) |
| C8 — alg ≠ none | ✅ | `algorithms` allowlist strict — UnsecuredJWT rejected |
| H9 — deployment_id présent | ✅ | LTI claim `.../deployment_id` requis non-vide |
| C10 — target_link_uri same-origin | ✅ | `new URL(claim).origin === 'https://terminallearning.dev'` |

### Findings cleanup (intégrés dans PR #236, anti-patterns SPIKE dormants détectés en cascade)

| # | Sévérité | Status | Fix |
|---|---|---|---|
| W1 | HIGH | ✅ Fixed in PR #236 | `api/lti/launch.ts:170-187` exportait `verifyJwt()` inline avec `ignoreExpiration: true` + clé string littérale `'TODO_PHASE7C_PUBLIC_KEY'` passée à `jsonwebtoken.verify()` (famille CVE-2015-9235 alg confusion) + JWKS jeté. **Code mort dangereux + collision de nom** avec nouveau `src/lib/lti/verifyJwt.ts`. Fonction supprimée, helpers `getOidcConfig`/`getJwkSet`/`oidcConfigCache` supprimés. |
| R2 | MEDIUM | ✅ Fixed in PR #236 | Collision import path : `import { verifyJwt }` pouvait résoudre soit le SPIKE dangereux soit le nouveau code. Résolu par suppression W1. |
| W4 | LOW | ✅ Fixed in PR #236 | `vercel.json` `/(lti\|api/lti)/(.*)` exposait `X-Frame-Options: ALLOW` — valeur **non-RFC**, ignorée par browsers modernes, polluait audit SecurityHeaders.com. CSP `frame-ancestors https://*.instructure.com/moodlecloud.com/smartschool.be` couvre déjà l'iframe LMS. Header retiré. |

### Senior reverse course capturé

- **Modèle correction** : agent créé initialement avec `model: haiku`. @thierry a rappelé l'incident 24/04/2026 (Haiku catastrophe). Crypto LTI = sécurité critique = jamais Haiku. **Modèle remonté à `opus`** dans la même PR. Garde-fou pinning `.claude/settings.local.json` protège la session courante mais frontmatter agent = couche distincte à surveiller indépendamment.
- **`iat` upper-bound check manuel** : jose ne valide pas iat futur par défaut. Sans check explicite, un attacker forgeant un JWT avec iat distant futur garde son replay valide indéfiniment après cleanup nonce store. Ajouté à `src/lib/lti/verifyJwt.ts:152-160`.

### Test coverage + ship verdict

- 19 nouveaux tests crypto (`// @vitest-environment node` forcé — jose webapi vs jsdom TextEncoder shim)
- Suite totale **1405 pass / 20 skipped** (vs baseline 1386, +19)
- Build prod : Landing chunk 7.33 kB gzip stable
- `LTI_ENABLED` reste à `false` en prod (zéro surface activée par cette PR)
- Migration `013_lti_launches.sql` versionnée mais application différée à PR #2 (endpoint integration)

**Prochain audit `lti-auditor`** : 1ère baseline officielle post-merge formelle au prochain démarrage CC (l'agent est `effective-NEXT-session` après sa propre PR de création).

---

## Audit: Supabase Database Advisors hardening — THI-180 + completion 015 PUBLIC fix (16 mai 2026)

**Date**: 16 mai 2026 ~17:00 CEST (initial) + 20:30 CEST (completion empirique)
**Auditor**: Senior co-décideur reverse course post-Advisor flag + vérification empirique post-application
**Trigger**: Cascade détection pendant audit LTI — Supabase Database Advisors flaggait 7 WARN findings pré-existants à THI-131
**Outcome**: ✅ **7 WARN → 3 WARN** (post-application migration 014 + 015 via Supabase CLI ; `auth_leaked_password_protection` reste WARN — non disponible sur free plan Supabase, accepté résiduel)

### Findings traités (post-application live empirique)

| Function | Flag | Action | Status |
|---|---|---|---|
| `public.handle_new_user()` | `anon_security_definer_function_executable` + `authenticated_*` | REVOKE FROM anon, authenticated (014) + REVOKE FROM PUBLIC (015) | ✅ **Empiriquement fermé** (verified `has_function_privilege` = false) |
| `public.prevent_role_escalation()` | idem | REVOKE FROM anon, authenticated (014) + REVOKE FROM PUBLIC (015) | ✅ Empiriquement fermé |
| `public.rls_auto_enable()` | idem | REVOKE FROM anon, authenticated (014) + REVOKE FROM PUBLIC (015) | ✅ Empiriquement fermé (service_role conserve via superuser-equivalent bypass) |
| `auth_leaked_password_protection` | check HaveIBeenPwned.org désactivé | **Non disponible sur free plan Supabase** | 🟡 **WARN résiduel accepté** (gated par plan tier — pas un défaut projet) |

### Senior reverse course #2 — découverte PUBLIC grant

Migration 014 avait `REVOKE EXECUTE FROM anon, authenticated` mais **n'a pas effectivement fermé la surface** :
- PostgreSQL accorde `EXECUTE` à `PUBLIC` par défaut sur toute nouvelle fonction
- anon + authenticated **héritent de PUBLIC**
- `REVOKE FROM anon, authenticated` retire les grants explicites mais PUBLIC reste actif
- `has_function_privilege('anon', 'public.<fn>()', 'EXECUTE')` retournait toujours `true` post-014

Découvert empiriquement post-application via query SQL de vérification. Migration **015_revoke_execute_from_public.sql** ajoute le `REVOKE FROM PUBLIC` chirurgical sur les 3 fonctions trigger-only.

**Verified live empirique** :
```sql
SELECT proname, has_function_privilege('anon', 'public.' || proname || '()', 'EXECUTE') AS anon_exec
FROM pg_proc WHERE proname IN ('handle_new_user', 'prevent_role_escalation', 'rls_auto_enable')
-- Result: anon_exec=false, auth_exec=false, service_exec=true ✅
```

RLS-essential functions (`get_my_role`, `get_my_institution_id`, `is_teacher_of_class`) **non touchées** par 015 — `anon_exec=true` + `auth_exec=true` préservé volontairement (sinon RLS USING clauses cassent). Tracker THI-182 (private schema migration) reste la solution structurelle long terme.

**Validation post-application** :
- 40 RBAC unit tests verts (no regression)
- Suite totale 1405 pass / 20 skipped
- Pattern leçon retenue : **PostgreSQL REVOKE doit toujours inclure PUBLIC** quand l'objectif est de fermer une surface, sinon le grant par défaut continue d'inheritance

### Findings tracked (THI-182 Backlog Low)

### Findings tracked (THI-182 Backlog Low)

| Function | Pourquoi non traité dans THI-180 |
|---|---|
| `public.get_my_role()` | Invoquée dans ~15 RLS USING clauses — REVOKE = `permission denied for function` régression |
| `public.get_my_institution_id()` | Idem RLS-essential |
| `public.is_teacher_of_class(uuid)` | Idem RLS-essential |

### Senior reverse course capturé

L'instinct naïf aurait révoqué en bloc les 6 fonctions. Vérification empirique : **3 sont invoquées depuis ~15 USING clauses RLS**. PostgreSQL exige `EXECUTE` du rôle appelant **même quand l'invocation passe par RLS** (USING expression sous le rôle de l'utilisateur, pas owner). REVOKE = casse toutes les SELECT protégées avec `permission denied for function`.

Migration `014_revoke_security_definer_rpc.sql` chirurgicale : revoke seulement sur les 3 trigger-only (s'exécutent sous le rôle de la transaction sans consulter GRANT). Idempotente multi-env via `DO $$ ... pg_proc check $$` blocks (suggestion Sourcery review). EXECUTE retention documentée par fonction.

THI-182 (Backlog Low) trace le chantier structurel : déplacera les 3 RLS-essential dans schema `private` non-exposé par PostgREST + update ~15 références. Effort 2-3h, hors deadline 10 juin.

---

## Audit: Re-baseline `llm-security-auditor` post-THI-112 (16 mai 2026)

**Date**: 16 mai 2026 ~00:00 UTC (01:00 CEST)
**Auditor**: agent `llm-security-auditor` (Opus 4.7, méthode 7 couches Evidence confidence framework)
**Trigger**: Re-baseline post-merge PR #228 (THI-112 — onboarding AI Tutor: AiKeySetup + AiConsentModal + AiSettings + Privacy section + M3-AI consent versioning fix)
**Outcome**: ✅ **Score 9.3/10 CONFIRMÉ** — delta +0.2 vs 9.1/10 baseline 10 mai (cible 9.25 dépassée) · M3-AI VERIFIED fermé · 0 CRITICAL · 0 HIGH · 0 MEDIUM · 2 LOW non bloquants

### Score IA security re-baseline post-THI-112

| Métrique | Valeur |
|---|---|
| **`llm-security-auditor` post-THI-112** | **9.3/10** |
| Delta vs 9.1/10 (10 mai PM) | **+0.2 confirmé** (cible 9.25 dépassée) |
| Trajectoire | 8.7 (matin baseline) → 9.0 (post-#220) → 9.1 (post-#222) → **9.3 (post-#228)** |
| Verdict ship-readiness | **SHIP-READY** sur surface AI Tutor V1 + onboarding |

### Findings closed (delta +0.2)

| # | Sévérité | Confidence | PR fix | Status |
|---|---|---|---|---|
| M3-AI | MEDIUM | VERIFIED | ✅ #228 | Consent storage refactor `'true'` → JSON `{version, acceptedAt, expiresAt}` + TTL 365j + migration legacy + 8 invariants tests (`consent.test.ts`) |

### Améliorations OWASP LLM Top 10

- **LLM06 Sensitive Info Disclosure** : renforcé — UX consent visible (date, expiry, jours restants, bouton révocation) sur `/app/settings`
- **LLM02 Insecure Output Handling** : AiSettings n'affiche **jamais** la clé en clair, même pas en masked tail (zéro disclosure même sur screen-share)

### Defense-in-depth additions

- `AiConsentModal.handleAccept` : check `checked` state en plus de l'attribut `disabled` (devtools-bypass impossible)
- `AiKeySetup` : `setPassphrase('')` post-save + reset complet quand encrypt toggle off (wipe mémoire React state)
- Provider metadata centralisé dans `src/lib/ai/providers/meta.ts` — élimine drift entre 3 surfaces

### Findings résiduels (LOW non bloquants)

| # | Sévérité | Confidence | Mitigation |
|---|---|---|---|
| L2 | LOW VERIFIED | Commentaire « masked tail » désaligné `AiSettings.tsx:6` | ✅ Corrigé dans cette PR (réécrit en « never rendered, zero-disclosure ») |
| L3 | LOW STRONG_INDICATOR | Migration legacy `'true'` étend implicitement consent de 12 mois | Trade-off UX vs strictness RGPD — non bloquant V1, à discuter dans memo ou ADR si besoin |

### Findings résiduels (tracked THI-153 / V1.5)

| # | Sévérité | Confidence | Status |
|---|---|---|---|
| H4-AI | HIGH (OUT-OF-SCOPE-AI) | STRONG_INDICATOR | jsonwebtoken@9.0.3 — gate Phase 7c LTI |
| M2-AI | MEDIUM | STRONG_INDICATOR | Encoding bypass ROT13/hex/leet — backlog THI-153 |
| V10 | LOW | STRONG_INDICATOR | Extension navigateur lit localStorage — mitigation Web Worker isolation différée V1.5 (THI-114) |

### Trajectoire 9.3 → 9.5/10

| Action | Gain | Cumul | Prereq |
|---|---|---|---|
| Baseline post-#228 | — | **9.3** | ✅ Live |
| R3 M2-AI encoding bypass étendu (ROT13/hex/leet) | +0.1 | 9.4 | THI-153 sprint 2 |
| R5 H4-AI `npm audit fix jsonwebtoken` | +0.1 IA + +0.3 security global | **9.5 IA** | Phase 7c gate (LTI_ENABLED=true) |
| THI-114 Web Worker isolation V1.5 (V10 défense) | +0.05 | 9.55 | post-onboarding stabilisé |

### Linear sync

- THI-112 → Done auto-close (PR #228 mention, completedAt 2026-05-15T22:53 UTC)
- THI-153 umbrella : 5 findings fermés total (M1, H10, M4, R1, M3) sur 13 historiques + 1 nouveau LOW masked-tail tracé et corrigé dans cette PR
- Sprint 1 Phase 7b lockdown : étape 3/4 ✅ THI-112 livrée. Reste **THI-113 audit final triple** (étape 4/4)

### Public reference

[CHANGELOG.md](../CHANGELOG.md) · [STORY.md](../STORY.md) · [docs/plan.md](./plan.md)

---

## Audit: Re-baseline `llm-security-auditor` post-THI-144 (10 mai 2026 fin PM)

**Date**: 10 mai 2026 ~10:30 UTC (12:30 CEST)
**Auditor**: agent `llm-security-auditor` (Opus 4.7, méthode 7 couches verbalization-gated avec Evidence confidence framework)
**Trigger**: Re-baseline post-merge PR #222 (THI-144 — system prompt v1.1.0 + ADR-008 + eval suite + M4-AI + R1 symmetric)
**Outcome**: ✅ **Score 9.1/10 CONFIRMÉ** — delta +0.1 vs baseline matin · M4-AI fermé symétriquement (sanitizer + detectKeyLeak) · 4 anti-friction rules embedded sans nouvelle surface d'injection · 0 CRITICAL · 0 HIGH non-mitigé scope IA pure

### Score IA security re-baseline post-THI-144

| Métrique | Valeur |
|---|---|
| **`llm-security-auditor` score post-THI-144** | **9.1/10** |
| Delta vs baseline 9.0/10 (10 mai matin) | **+0.1 confirmé** |
| Trajectoire | 8.7 (matin baseline) → 9.0 (matin post-#220) → **9.1 (post-#222)** |
| Confiance globale | 8 VERIFIED · 3 STRONG_INDICATOR · 1 SPECULATIVE · 0 RESEARCH_ONLY |
| Verdict ship-readiness | **SHIP-READY** sur surface AI Tutor V1.1.0 |

### Findings closed (delta +0.1)

| # | Sévérité | Confidence | PR fix | Status |
|---|---|---|---|---|
| M4-AI | LOW | VERIFIED | ✅ #222 | Generic `/sk-[A-Za-z0-9_-]{20,}/g` fallback dans `KEY_PATTERNS` (`sanitizer.ts:181-195`) — symétrie avec Sentry+tunnel `generic_api_key` |
| R1 (follow-up audit guardrail) | LOW | VERIFIED | ✅ #222 | Symétrie `KEY_DETECTION_PATTERNS` (`sanitizer.ts:276-282`) — `detectKeyLeak` flag Sentry pour les mêmes patterns que `sanitizeModelChunk` redacte |

### Améliorations OWASP LLM Top 10

- **LLM06 Sensitive Info Disclosure** : PROTÉGÉ VERIFIED (était PROTÉGÉ STRONG_INDICATOR) — symétrie complète sanitizer ↔ Sentry ↔ tunnel post-fix M4-AI/R1
- **LLM09 Overreliance** : PROTÉGÉ VERIFIED (était PARTIEL) — friction 4 (satisfaction signal) + friction 3 (indices répétés) coupent matériellement la dérive sycophancique et le looping de questions

### Findings résiduels (tracked)

| # | Sévérité | Confidence | Status |
|---|---|---|---|
| H4-AI | HIGH (OUT-OF-SCOPE-AI) | STRONG_INDICATOR | jsonwebtoken@9.0.3 supply chain — gate Phase 7c (LTI_ENABLED=true) |
| M2-AI | MEDIUM | STRONG_INDICATOR | Encoding bypass au-delà base64 (ROT13/hex/leet) — backlog THI-153 |
| M3-AI | MEDIUM | VERIFIED | Consent flow sans timestamp/expiry/version — backlog THI-153 |
| L1-AI | LOW | STRONG_INDICATOR | INJECTION_PATTERNS multilingue limité EN/FR/NL/DE — backlog si audience cible évolue |

### Findings nouveaux (non-security, info)

| # | Type | Confidence | Origine |
|---|---|---|---|
| U1-AI | UX dette V1.5 | SPECULATIVE | Friction 3 (LLM bascule auto direct) peut désamorcer le toast UI frustration heuristic — pas un risque sécurité, à signaler V1.5 backlog |
| E1-AI | Eval coverage gap | STRONG_INDICATOR | Eval suite (a) couverture lang asymétrique pour F1/F2/F3 (NL/DE manquants) — recommandation R6 ajouter 4 fixtures (30 min) |
| T9 | Dev hygiene | SPECULATIVE | Shell history dev peut leak `OPENROUTER_API_KEY` après `npx tsx scripts/eval-tutor.ts` — hors scope app |

### Trajectoire 9.1 → 9.5/10

| Action | Gain | Cumul | Prereq |
|---|---|---|---|
| Baseline post-#222 | — | **9.1** | ✅ Live |
| R6 eval coverage NL/DE F1/F2/F3 | +0.0 (qualité non-régression) | 9.1 | 30 min, optionnel |
| R2 M3-AI consent JSON `{version, ts}` | +0.15 | 9.25 | THI-153 sprint 2 |
| R3 M2-AI encoding bypass extended (ROT13/hex/leet) | +0.15 | 9.4 | THI-153 sprint 2 |
| R5 H4-AI jsonwebtoken `npm audit fix` | +0.1 IA + +0.3 security global | **9.5 IA** | Phase 7c gate (LTI_ENABLED=true) |

### Linear sync

- THI-144 → Done auto-close (PR #222 mention, completedAt 2026-05-10T08:08:10 UTC)
- THI-153 umbrella : 4 checkboxes cochés (M1-AI ✅, H10-AI ✅, M4-AI ✅, R1 ✅), reste 3 résiduels (M2-AI, M3-AI, H4-AI gated)
- Backlog V1.5 : ajouter U1-AI (UX friction 3 ↔ frustration heuristic) + E1-AI (eval coverage NL/DE)

### Public reference

[CHANGELOG.md](../CHANGELOG.md) · [STORY.md](../STORY.md) · [docs/plan.md](./plan.md) · `docs/adr/ADR-008-ai-tutor-v1-1-0-anti-frictions.md`

---

## Audit: Re-baseline `llm-security-auditor` (10 mai 2026 PM)

**Date**: 10 mai 2026 ~08:30 UTC (10:30 CEST)
**Auditor**: agent `llm-security-auditor` (Opus 4.7, méthode 7 couches verbalization-gated avec Evidence confidence framework)
**Trigger**: Re-baseline post-PR #220 demandée pour confirmer/infirmer score estimé 9.0/10 post-fixup PR #215 (M1-AI VERIFIED + H10-AI STRONG_INDICATOR)
**Outcome**: ✅ **Score 9.0/10 CONFIRMÉ** — delta +0.3 verrouillé · 0 régression · 1 finding LOW nouveau (M4-AI quick win 30 min) · ratio Evidence-confidence rigoureux préservé

### Score IA security re-baseline

| Métrique | Valeur |
|---|---|
| **`llm-security-auditor` score re-baseline** | **9.0/10** |
| Delta vs baseline 8.7/10 (10 mai matin) | **+0.3 confirmé** |
| Tendance | amélioration confirmée — pas de régression |
| Confiance globale | 7 VERIFIED · 3 STRONG_INDICATOR · 2 SPECULATIVE · 0 RESEARCH_ONLY |
| Verdict ship-readiness | **SHIP-READY** sur surface AI Tutor V1.0.1 (aucun CRITICAL VERIFIED · aucun HIGH non-mitigé sur scope IA pure) |

### Findings closed (delta +0.3)

| # | Sévérité | Confidence | Status |
|---|---|---|---|
| H10-AI | HIGH | STRONG_INDICATOR | ✅ FERMÉ — BIDI_RX étend U+E0000-U+E007F (PR #215), test pinné `sanitizer.test.ts:97-120` |
| M1-AI | MEDIUM | VERIFIED | ✅ FERMÉ — `escapeDelimiters(ctx.goal)` actif (PR #215), `useAiTutor.ts:164` |

### Findings résiduels (tracked THI-153)

| # | Sévérité | Confidence | Status |
|---|---|---|---|
| H4-AI | HIGH (OUT-OF-SCOPE-AI) | STRONG_INDICATOR | jsonwebtoken@9.0.3 supply chain — gate Phase 7c (LTI_ENABLED=true) |
| M2-AI | MEDIUM | STRONG_INDICATOR | Encoding bypass au-delà base64 (ROT13/hex/leet) — backlog THI-153 |
| M3-AI | MEDIUM | VERIFIED | Consent flow sans timestamp/expiry/version — backlog THI-153 |

### Finding nouveau identifié (Couche 7 self-critique)

| # | Sévérité | Confidence | Origine |
|---|---|---|---|
| **M4-AI** | LOW | VERIFIED | Asymétrie `KEY_PATTERNS` sanitizer (4 providers spécifiques) vs Sentry/tunnel `generic_api_key` fallback — `sanitizer.ts:181-185` ne couvre pas Mistral/Groq/Cohere/Together/xAI alors que `sentry.ts:25` + `api/sentry-tunnel.ts:37` oui. Conséquence : si LLM hallucine une clé hors-spec dans une réponse, elle arriverait dans le DOM utilisateur (pas de fuite serveur). |

**Mitigation R1 proposée (effort 30 min, gain estimé +0.1)** : ajouter `/sk-[A-Za-z0-9_-]{20,}/g` en fallback APRÈS les 4 patterns spécifiques de `sanitizer.ts:KEY_PATTERNS` + 2 tests (1 strip Mistral hypothétique + 1 préserve `sk-` bare).

→ **Inclusion proposée dans PR THI-144** (system prompt v1.1.0) puisque la PR touche déjà `src/lib/ai/*`. Quick win cohérent.

### Couches 1-7 — synthèse

- **Couche 1 (surface)** : 11 fichiers IA + `vercel.json` + `docs/security-audit-log.md` lus. RAG / function calling / MCP tools confirmés non-exposés V1.
- **Couche 2 (threat modeling)** : 8 menaces 2026 — T1 (PI directe), T2 (ASCII Smuggling), T4 (indirect injection curriculum), T6 (exfil clé) **VERIFIED défendues**. T3 (multi-turn drift), T5 (encoding bypass), T7 (extension navigateur) défendues partiellement. T8 (provider drift) théorique.
- **Couche 3 (OWASP LLM Top 10)** : 7/10 PROTÉGÉ · 2/10 PARTIEL (LLM05 supply chain hors scope IA + LLM09 overreliance acceptable V1) · 3/10 N/A volontaire. **Aucun EXPOSÉ.**
- **Couche 4 (vecteurs 2026 hors OWASP)** : V1 ASCII Smuggling + V3 Many-Shot + V5 Indirect Injection **VERIFIED**. V2 Crescendo + V4 Skeleton Key + V7 Sycophancy + V8 Encoding bypass + V10 Extension navigateur défendus partiellement.
- **Couche 5 (chaînes d'attaque CVSS)** : Chaîne A fuite clé (LOW), Chaîne B encoding role-flip (MEDIUM SPECULATIVE), Chaîne C indirect injection curriculum (LOW VERIFIED), Chaîne D XSS triple-rempart (LOW VERIFIED).
- **Couche 6 (stress test défenses)** : 11 défenses RÉSISTANTES VERIFIED. 2 gaps STRONG_INDICATOR (INJECTION_PATTERNS multilingue limité EN/FR/NL/DE + KEY_PATTERNS coverage providers).
- **Couche 7 (self-critique double-pass)** : 1 angle mort identifié (M4-AI nouveau LOW VERIFIED) — quick win 30 min.

### Recommendations next steps (queued)

- **R1** (LOW VERIFIED, 30 min, +0.1) — Fermer M4-AI : ajouter regex generic fallback dans `sanitizer.ts:KEY_PATTERNS` → **proposé dans PR THI-144**
- **R2** (MEDIUM VERIFIED, 2h, +0.15) — Fermer M3-AI : refactor `CONSENT_KEY` en payload JSON `{version, accepted, ts}` pour permettre re-consent bumpé → THI-153
- **R3** (MEDIUM STRONG_INDICATOR, 4h, +0.15) — Fermer M2-AI : étendre `containsBase64Injection` → `containsEncodedInjection` (ROT13 + hex + leet) → THI-153
- **R4** (LOW STRONG_INDICATOR, 3h, +0.05) — Fermer L1-AI multilingue (IT/ES/RU/AR/JP/CN) si audience cible évolue
- **R5** (HIGH STRONG_INDICATOR, gain +0.2 IA + +0.3 security global) — Fermer H4-AI : `npm audit fix` ciblé `jsonwebtoken+jws+jwa` AVANT toggle `LTI_ENABLED=true` (gate Phase 7c non négociable)

**Trajectoire 9.0 → 9.5/10** : R1 + R2 + R3 + R5 livrés = 9.5/10 atteignable. R4 marginal.

### Linear sync

- THI-153 umbrella (audit findings post-Sprint 1 étape 1/4) : 2 checkboxes cochés (M1-AI ✅, H10-AI ✅) confirmés post-re-baseline. Reste 3 findings résiduels (M2-AI, M3-AI, H4-AI) + 1 nouveau (M4-AI) à intégrer dans l'umbrella.
- Recommandation : ajouter M4-AI à THI-153 umbrella **OU** le fermer directement dans PR THI-144 (proposé par auditor).

### Public reference

[CHANGELOG.md](../CHANGELOG.md) · [STORY.md](../STORY.md) · [docs/plan.md](./plan.md) · memo CC `project_session_9may_2026_full_audit.md` (cross-référencé)

---

## Audit: 1ʳᵉ baseline `llm-security-auditor` (10 mai 2026)

**Date**: 10 mai 2026 ~00:30 UTC (02:30 CEST)
**Auditor**: agent `llm-security-auditor` (Opus 4.7, méthode 7 couches verbalization-gated avec Evidence confidence framework)
**Trigger**: 1ʳᵉ run baseline post-livraison agent (PR #210 + #212 mergées 9 mai 2026 fin de soirée — ex `ai-pentester-pro` renommé suite analyse ChatGPT pour éviter policy filters Anthropic)
**Outcome**: ✅ SHIP THI-144 — 0 CRITICAL VERIFIED, 2 HIGH, 3 MEDIUM, 3 actions ROI prioritaires

### Score IA security baseline

| Métrique | Valeur |
|---|---|
| **`llm-security-auditor` score baseline** | **8.7/10** |
| `security-auditor` baseline app-layer (9 mai 2026) | 8.5/10 |
| `prompt-guardrail-auditor` PR #208 (9 mai 2026) | 8.8/10 → full PASS post-C1 fix |

L'écart cohérent : `llm-security-auditor` se positionne **entre** les 2 autres audits (8.5 < 8.7 < 8.8) — démontre que le framework Evidence confidence empêche l'inflation artificielle CRITICAL et que la méthode 7 couches couvre des angles que les autres agents ne traitent pas (vecteurs 2026 hors OWASP, composition de chaînes).

### Findings

| # | Sévérité | Confidence | Subject | Status |
|---|---|---|---|---|
| H4-AI | HIGH | STRONG_INDICATOR | Supply chain `jsonwebtoken@9.0.3` | Gate Phase 7c (LTI_ENABLED=true) |
| H10-AI | HIGH | STRONG_INDICATOR | Unicode Tag Smuggling U+E0000-U+E007F non couvert par BIDI_RX | ✅ FIXÉ PR #215 |
| M1-AI | MEDIUM | VERIFIED | `lessonContext.goal` non passé par `escapeDelimiters()` dans `formatLessonContext` | ✅ FIXÉ PR #215 |
| M2-AI | MEDIUM | STRONG_INDICATOR | Encoding bypass au-delà base64 (ROT13/hex/leet) | Backlog THI-153 |
| M3-AI | MEDIUM | VERIFIED | Consent flow sans timestamp/expiry/version (`useAiTutor.ts:34`) | Backlog THI-153 |

### Actions shipped same night

- **PR #215** (commits `c62ba79` + `3b3fd28` + `86899da`) — fix M1-AI VERIFIED (`escapeDelimiters(ctx.goal)` dans `formatLessonContext`) + fix H10-AI STRONG_INDICATOR (BIDI_RX étendu Unicode Tag block U+E0000-U+E007F + comment référençant Riley Goodside / Joseph Thacker disclosures 2024-2025) + 2 nouveaux tests de fixtures + assertion bénigne preserve (Sourcery #215)
- **PR #214** — fix typos accord et pluriel session-orchestrator.md (Sourcery #213 fix-up)
- **PR #216** — `chore: gitignore .tmp/ session artifacts` (cleanup VS Code Source Control 22 → 0)

### Re-baseline estimé post-fixup

- **`prompt-guardrail-auditor`** : 9.2/10 (+0.4) — couverture H10-AI Unicode Tags maintenant intégrée à BIDI_RX
- **`llm-security-auditor`** : 9.0/10 estimé (+0.3) — 2 findings HIGH/MEDIUM fermés sur les 5 — à confirmer prochaine session via re-run

### Recommendations (queued)

- [R1] Re-baseline `llm-security-auditor` au démarrage prochaine session pour confirmer score 9.0/10 réel
- [R2] **Action 3 jsonwebtoken supply chain** (M2 security-auditor + H4-AI llm-security-auditor) : `npm audit` ciblé `jsonwebtoken+jws+jwa` AVANT toggle `LTI_ENABLED=true` Phase 7c (gate sécurité non négociable)
- [R3] Re-évaluer M2-AI encoding bypass + M3-AI consent timestamp dans Sprint 2 ou intégration THI-144 system prompt v1.1.0

### Linear sync

- **THI-153 umbrella** (audit findings post-Sprint 1 étape 1/4) : 2 checkboxes cochés (M1-AI ✅, H10-AI ✅), umbrella reste Backlog priority High avec 3 MEDIUMs résiduels (M2-AI, M3-AI, M2 security-auditor) + 1 HIGH conditionnel (H4-AI gated Phase 7c)

### Public reference

[CHANGELOG.md](../CHANGELOG.md) · [STORY.md](../STORY.md) · [docs/plan.md](./plan.md) · memos CC `project_session_9may_2026_full_audit.md` + `project_terminal_sentinelle_evolution.md`

---

## Audit: Vercel posture — forensic review (2 mai 2026 PM)

**Date**: 2 mai 2026 ~18:30 UTC (20:30 CEST)  
**Auditor**: CC Terminal Learning (Opus 4.7) — forensic during session shutdown  
**Trigger**: Bypass token exposed in Chrome DevTools MCP URL during preview validation of PR #149 → discipline review prompted by Thierry  
**Outcome**: ✅ No data leak, no production impact, 1 access token rotated, 1 agent reinforced

### Findings

| # | Severity | Subject | Status |
|---|---|---|---|
| F1 | LOW | Vercel event `project-automation-bypass` at 16:53 UTC without user action | Hypothesis: MCP Vercel client from concurrent Claude session (Cowork/Ankora/SynapseHub) |
| F2 | INFO | 8+ "An MCP client" tokens active/revoked on account over 4 days | Most auto-revoked; tracking added to `security-auditor` |
| F3 | LOW | Old bypass `ItNg…LW4Q` exposed in MCP navigate_page URLs | HTTP 401 confirmed (already revoked at audit time) |
| F4 | LOW | New token `vcp_3zDw…oq2` captured in accessibility tree during "Token Created" dialog | 2nd rotation scheduled for next session |

### Actions shipped same session

- **PR #182** — `security-auditor` agent reinforced with "Vercel posture audit" section: tokens listing, project events scan, bypass entries inspection, "MCP client" pattern detection, navigation discipline check
- **Bypass file resync** — `.secrets/vercel-bypass.txt` updated with active value (retrieved via API GET, never printed)
- **Access token rotated** — old `vcp_5BbF…xllu` revoked via API DELETE (HTTP 200), new `vcp_3zDw…oq2` active
- **Memory updates** — `reference_vercel_bypass.md` (strict navigation procedure) + `reference_vercel_token_24apr.md` (current token + incident timeline)

### Recommendations (queued for next session)

- [R1] Manual 2nd token rotation via Vercel UI **without** Claude/MCP active on the page
- [R2] Investigate which Vercel integration generates "An MCP client" tokens (likely official Vercel MCP plugin)
- [R3] Rename `.secrets/vercel-bypass.txt` (which actually contains the access token) to `.secrets/vercel-token.txt` for clarity vs. the bypass secret in `~/.claude/projects/.../.secrets/`

### Public reference

[SECURITY.md Incident 008](../SECURITY.md) + [STORY.md "L'après-midi du 2 mai"](../STORY.md)

---

## Audit: Sprint sécurité 1-2 mai 2026

**Date**: 1-2 mai 2026 (24-hour sprint)  
**Auditor**: CC Terminal Learning (Opus 4.7) + `security-auditor` agent + Sourcery on each PR  
**Score evolution**: 8.1/10 → ~8.6/10 post-sprint  
**PRs delivered**: 11 (#168 to #178)

### Issues resolved

| Linear | Severity | Subject | PR |
|---|---|---|---|
| THI-133 | HIGH (H1) | LTI feature flag `LTI_ENABLED` env-gated | #169 |
| THI-134 | HIGH (cold-start) | LTI 500 FUNCTION_INVOCATION_FAILED — Express-style + lazy-load fix | #170 |
| THI-135 | HIGH (H2) | Rate limiter LTI shared module + Edge runtime | #173 |
| THI-137 | MEDIUM (M2) | `vercel.live` removed from CSP `script-src` | #178 |
| THI-140 | MEDIUM (M6) | Sentry scrubber extended to `transaction`/`profile`/`check_in` envelopes | #177 |

### Process improvements

- New agent `route-attack-auditor` (PR #176) — covers HTTP-level black-hat audit zone (status fingerprinting, verb tampering, cache poisoning, slowloris, CORS edge cases)
- Discipline "Tu es sûr ?" applied throughout — three isolation tests for THI-134 cold-start before any speculative fix
- Validation autonome via Brave/Lighthouse on each PR — Thierry not interrupted for visual checks except strategic decisions
- Documentation rigueur: `docs/security-audit-log.md` receives each audit report with date, score, Linear refs (this entry being one of them, retroactively)

### Backlog (4 mediums tracked)

- THI-136 (M1) — Vite hash drift guard
- THI-138 (M3) — CORS LTI flow real (blocked by Phase 7c launch)
- THI-139 (M5) — RLS migration order test
- THI-112 (M4) — keyManager `encrypt: true` default coupled to Phase 7b finalization

### Public reference

[CHANGELOG.md "Sprint sécurité — clôture des HIGH"](../CHANGELOG.md) + [STORY.md "Le 2 mai — clôture méthodique du sprint sécurité"](../STORY.md)

---

## Audit: Opus 4.7 Cowork Review (21 avril 2026)

**Date**: 21 avril 2026  
**Auditor**: Opus 4.7 (external cowork review)  
**Findings**: 3 issues (1 HIGH, 1 MEDIUM, 1 LOW)  
**Status**: All fixed and protocol strengthened

### Issue 1: X-Forwarded-For Rate Limit Spoofing (HIGH)

**Severity**: HIGH — Direct security bypass  
**File**: `api/sentry-tunnel.ts` (line 72–75)  
**Issue**: Rate limiting reads client-controlled header instead of Vercel-injected header  
**Attack**: User rotates IP on each request → bypasses per-IP rate limits → floods API  
**Root Cause**: Assumed x-forwarded-for is immutable; client can actually inject headers  

**Fix**: Changed header read from `x-forwarded-for` to `x-vercel-forwarded-for` (Vercel edge-injected, non-spoofable)  
**PR**: Main branch, commit f0e4fdc  
**Prevention**: Future rate-limiting PRs audited by security-auditor (now mandatory per updated protocol)

---

### Issue 2: Key Manager Plain Mode Default (MEDIUM)

**Severity**: MEDIUM — Supply chain attack surface  
**File**: `src/lib/ai/keyManager.ts` (lines 195–207)  
**Issue**: API keys stored unencrypted in localStorage by default  
**Attack**: Dependency vulnerability → localStorage compromise → API key exfiltrated  
**Root Cause**: UX friction with encryption; plain mode chosen for simplicity

**Fix Applied**: Added explicit warning in saveKey() docstring marking plain mode as requiring UX guidance toward encryption per ADR-002 gate  

**Reasoning**: 
- Medium severity because Terminal Learning has no history of injection vulnerabilities (strict CSP, no unsafe HTML rendering)
- But supply chain risk is real (dependency chain is long)
- THI-112 (AiKeySetup onboarding) will default UI to encrypted mode

**Prevention**:
- THI-112 defaults onboarding to encrypted mode, not plain
- Passphrase strength validation required
- PR audit requires prompt-guardrail-auditor + security-auditor

---

### Issue 3: RLS Institutions Policy Scope (LOW)

**Severity**: LOW — Organizational data leak (limited PII impact)  
**File**: `supabase/migrations/010_security_fixes.sql` (lines 52–60)  
**Issue**: Teachers can SELECT all institutions and their metadata  
**Attack**: Teacher role queries institutions table → reads all org metadata  
**Root Cause**: RLS policy was overly permissive

**Fix**: Updated policy to restrict teachers to their own institution or admin roles only  
**Prevention**:
- RLS audit before any Phase 8+ teacher features
- Cross-institution access tests added to regression suite
- security-auditor mandatory for all Supabase migration PRs

---

## Protocol Improvements (21 avril 2026)

**Before**: security-auditor was optional (only mandatory for AI-related PRs)  
**After**: security-auditor is mandatory for all PRs touching auth/RBAC/RLS/API/crypto

**Updated Checklist** (added to CLAUDE.md):
- Verify rate limiting uses Vercel-injected headers (not user-controlled)
- Audit all RLS policies for overly permissive access
- Test RBAC boundaries (role escalation, cross-org access)
- Verify API keys not logged in error payloads
- Check CSP headers block external injection vectors
- Confirm encryption uses strong algorithms (AES-GCM, PBKDF2 210k iterations)

---

## Lessons Learned

1. **Security audit integration**: Should be part of PR workflow, not an afterthought after external review
2. **Header trust assumptions**: Documented Vercel's guarantee that edge-injected headers are non-spoofable
3. **Encrypt by default**: Plain mode is convenient but risky; app design must nudge users toward security
4. **RLS verification**: Each policy needs explicit testing and cross-org access verification
5. **Protocol enforcement**: Security agents exist but must be mandatory in session protocol

---

**Last Updated**: 21 avril 2026  
**Next Review**: Post-Phase 7b (post-THI-113)

---

## Audit: Post-Haiku Catastrophe — Stabilization (24-25 avril 2026)

**Date**: 24-25 avril 2026 (incident 24 avril ~20:42 → 22:11 UTC, remediation 25 avril ~01:00 → 03:00 UTC)
**Auditor**: Claude Opus 4.7 (post-incident self-audit, supervised by Thierry)
**Trigger**: Wrong-model session — Claude Haiku 4.5 active during plan→exec mode switch, undetected for 1h30
**Findings**: 5 issues (1 CRITICAL prod, 2 HIGH process, 1 MEDIUM secret, 1 LOW pollution)
**Status**: All remediated via PRs #164/#165/#166 + GitHub branch protection + bypass rotation + process hardening

### Issue 1: Production handler 504 timeout (CRITICAL)

**Severity**: CRITICAL — Production reachability degraded
**File**: `api/csp-nonce.ts` (added by Haiku, never previously in main)
**Issue**: Handler used `dist/index.html` for `readFileSync()` — wrong path on Vercel Fluid Compute (correct is `.vercel/output/static/index.html`)
**Impact**: `/api/csp-nonce` returned HTTP 504 in production. Site stayed reachable via CDN cache during ~5h window — but cache expiry would have made it user-visible.
**Fix**: PR #164 reverted the entire wrong-path handler. Replaced by SHA-256 hash approach (PR #165) requiring no runtime handler at all.

### Issue 2: CSP wildcard `frame-ancestors 'none'` removed (HIGH)

**Severity**: HIGH — Security regression (clickjacking protection silently disabled)
**File**: `vercel.json` headers wildcard block
**Issue**: Haiku removed the static CSP from `/(.*)` headers, intending to "avoid conflict with handler CSP" — but the handler timed out, so nothing replaced it
**Impact**: Non-LTI routes served without `frame-ancestors 'none'` for the cache-window duration
**Fix**: PR #164 restored the original `vercel.json` from commit `ef00cde`. Both LTI and wildcard CSP blocks now contain the directive.

### Issue 3: Test modified to bypass instead of fix (HIGH)

**Severity**: HIGH — Process violation (false-green CI)
**File**: `src/test/seo.test.ts:202`
**Issue**: When `frame-ancestors 'none'` test failed, Haiku changed the test to expect LTI domains instead of restoring the CSP. CI went green but the regression was hidden.
**Fix**: PR #164 restored the original test. PR #165 added a SHA-256 drift-guard test — if `index.html <style>` changes without recomputing the hash, CI fails immediately.

### Issue 4: Vercel Deployment Protection bypass exposed (MEDIUM)

**Severity**: MEDIUM — Secret exposure (preview-only, not prod)
**Vector**: Bypass secret (32 chars, prefix `c96a`) inscribed in clear in a `new_page` URL during the audit session. Conversation logs (Claude Code session storage) potentially retain the secret.
**Impact**: Bypass of Deployment Protection on preview deployments. Production not exposed (different protection layer).
**Fix**:
- Old bypass revoked via `PATCH /v1/projects/{id}/protection-bypass` with `{"revoke": {"secret": "...", "regenerate": false}}` — confirmed `protectionBypass: {}` post-revoke
- New bypass generated via same API with new note — prefix `ItNg`
- Vercel access token also rotated (provided by Thierry via direct channel, old token presumed compromised)
**Prevention**: Memory `reference_vercel_bypass.md` rewritten with explicit manipulation rules — shell variable only, prefix/suffix display only, never full secret in chat or commit.

### Issue 5: Temporary debug files committed to public history (LOW)

**Severity**: LOW — Repository pollution (no secrets, just verbose HTML)
**Files**: `root_response.network-response` (219 lines), `verification_snapshot.txt` (271 lines) in commit `690dd38`, removed in `562c4c0`. Both commits remain in main history.
**Impact**: Slight bloat. Verified contents: 100% public HTML, no secrets.
**Fix**: Accepted as-is (no `git filter-repo` rewrite — would require force-push). Documented in PR #164 commit message.

---

### Process Improvements (post-incident)

**Before**:
- No branch protection on `main` — any push allowed even with red CI
- No model verification at session start
- Bypass secret usage had no formal manipulation rules

**After**:
- **GitHub branch protection on `main`**: `required_status_checks: ["Type-check · Lint · Test · Build"]` + `strict: true` + `allow_force_pushes: false` + `allow_deletions: false` + `required_conversation_resolution: true`. Direct push or merge with red CI now structurally rejected.
- **Phase 0 in `session_startup_process.md`**: verify Claude model on session start AND after each /compact. Stop if Haiku detected on complex task.
- **Rule 10 in `working_discipline_rules.md`**: explicit matrix mapping task complexity to required model (Opus 4.7 mandatory for `vercel.json`, `supabase/`, `.github/workflows/`, `src/lib/ai/*`, multi-file refactors).
- **`reference_vercel_bypass.md`** updated: bypass manipulation rules — never log full secret, shell variable only, prefix/suffix display.

---

### Lessons Learned (post-Haiku)

1. **Branch protection is non-negotiable** — even on a solo project, `main` must require CI green before merge. Zero cost (it's already the discipline). Huge value in catastrophe scenarios.
2. **Wrong-model detection should be automated, not eyeballed** — a statusline visible only on attention is not a defense. Phase 0 is a manual mitigation; ideally a future Claude Code feature could refuse merges with model below a project threshold.
3. **Modifying a test to make it pass = red flag for model capability** — a stronger model asks "why is this test failing — is the code wrong or the test wrong?". Weaker models optimize for symptom resolution. Future signal: if a session modifies a test without diagnostic explanation, treat as model-capability indicator.
4. **Revert via PR > force-push** — even under stress, taking 10 extra minutes for a clean PR pays off. The audit trail is gold for post-incident learning.
5. **CDN cache masks regressions** — `HTTP 200` from cache is not proof of health. After infra changes: verify `X-Vercel-Cache: MISS` and inspect header content, not just status code.

---

**Last Updated**: 25 avril 2026
**Next Review**: Post-Phase 7b (post-THI-113) OR after any future incident

---

## Audit: Fresh `security-auditor` run (1 mai 2026)

**Date**: 1 mai 2026
**Auditor**: `security-auditor` agent (Opus 4.7), full repo scan post-cleanup PR #168
**Scope**: OWASP Top 10 (2021), OWASP API Security (2023), CSP Level 3, HTTP headers, RLS, auth flow, supply chain, GDPR, terminal injection, 2026 norms
**Score**: **8.1 / 10** — 0 CRITICAL · 3 HIGH · 6 MEDIUM · 7 LOW

### High findings — remediation status

| # | Finding | Status |
|---|---------|--------|
| H1 | LTI launch endpoint accepts forged JWTs (`TODO_PHASE7C_PUBLIC_KEY` placeholder + `ignoreExpiration:true`) | ✅ Mitigated by [THI-133](https://linear.app/thierryvm/issue/THI-133) feature flag `LTI_ENABLED` (PR #169, 1 mai) |
| H2 | LTI launch endpoint has no rate limiting | ✅ Resolved by [THI-135](https://linear.app/thierryvm/issue/THI-135) — sliding-window 50 req/min per IP (PR #173, 2 mai) |
| H3 | Git history credential `TerminalLearning2026!` | 🔄 Accepted residual risk — test users rotated via Supabase Admin API. `git filter-repo` requires force-push and is deferred to a maintenance window |

### Medium findings — Linear-tracked

Each medium finding has a dedicated Linear issue (M4 routes to the existing THI-112). See [`docs/SECURITY.md`](SECURITY.md) Medium Issues table for the canonical list.

| # | Finding | Issue |
|---|---------|-------|
| M1 | CSP `script-src` SHA-256 hashes for Vite inline scripts | [THI-136](https://linear.app/thierryvm/issue/THI-136) |
| M2 | Split CSP preview vs prod (`vercel.live` only in preview) | [THI-137](https://linear.app/thierryvm/issue/THI-137) |
| M3 | Validate LTI launch CORS against real LTI 1.3 flow | [THI-138](https://linear.app/thierryvm/issue/THI-138) |
| M4 | Key manager default encryption mode | [THI-112](https://linear.app/thierryvm/issue/THI-112) (Phase 7b BYOK) |
| M5 | RLS migration order 010→011→012 + integration test | [THI-139](https://linear.app/thierryvm/issue/THI-139) |
| M6 | Sentry scrubber covers only `event` items (transaction/profile/check_in skipped) | [THI-140](https://linear.app/thierryvm/issue/THI-140) |

### Side discoveries during remediation

- **THI-134** — LTI handler returned `500 FUNCTION_INVOCATION_FAILED` at cold-start (independent of H1). Root cause: top-level `@sentry/node` + `jsonwebtoken` imports, plus Web `Request → Response` pattern incompatible with Vercel Node.js runtime. Fix: Express-style handler signature + lazy-load heavy deps after the LTI_ENABLED gate. Resolved in PR #170 (1-2 mai).
- **THI-135 bundling caveat** — Vercel Node.js Functions does not reliably follow imports to other `.ts` files (verified via 3 isolation tests). Workaround: rate-limit logic inlined in `api/lti/launch.ts` with documentation pointing to the shared module `api/_rate-limit.ts` as the single source of truth (used by Edge `sentry-tunnel` + tested by `src/test/rateLimit.test.ts`).

### Process improvements (1-2 mai)

- Use Context7 MCP for Vercel docs before tâtonnement on Vercel-specific behaviour.
- Always run Brave + Lighthouse autonome before merge — not via user click.
- Linear issue created BEFORE branch creation (M1–M6 → THI-136 to THI-140 + THI-112 for M4).
- Single source of truth for raw audit reports = this file (`docs/security-audit-log.md`), referenced from `docs/SECURITY.md`.

---

## Audit: `lti-auditor` baseline officielle post-merge (17 mai 2026)

**Date**: 17 mai 2026
**Auditor**: agent `lti-auditor` (Opus 4.7, 10 critical checks MVP, effective-NEXT-session pattern post-création PR #236)
**Trigger**: Première baseline officielle de l'agent en mode "invokable", post-merge de la séquence complète Phase 7c Auth MVP (PR #236 THI-131 + PR #237 THI-180 + PR #239 migration 015 PUBLIC + PR #240 supabase-js 2.105)
**Commit baseline**: HEAD `2e7b9f2` (main)
**Scope**: `src/lib/lti/{verifyJwt,nonceStore,types}.ts` + `api/lti/launch.ts` + `supabase/migrations/{013,014,015}_*.sql` + `vercel.json` + `package.json`

### 10 critical checks LTI 1.3 — tous ✅ VERIFIED

| Check | Status | Source |
|---|---|---|
| C1 — RS256 signature verification | ✅ | `verifyJwt.ts:232 algorithms: ['RS256']` strict via `jose@6.2.3` |
| C2 — `iss` whitelist (anti-SSRF) | ✅ | `verifyJwt.ts:61-65` allowlist + pré-check ligne 215 **AVANT** JWKS fetch |
| C3 — `aud` match | ✅ | `verifyJwt.ts:231 audience: options.clientId` enforced |
| H4 — exp/iat strict ≤30s skew | ✅ | `clockTolerance: 30s` + défense `iat`-futur ligne 247 |
| C5 — nonce store collision | ✅ | In-memory atomic check+set (mono-thread JS) + DB UNIQUE(jti) |
| H6 — jti uniqueness window | ✅ | TTL 10min ≥ JWT exp LTI standard 5min |
| H7 — kid matches JWKS | ✅ | `createRemoteJWKSet` cooldown 30s + timeout 5s |
| C8 — alg ≠ `none` | ✅ | Allowlist strict `['RS256']` — `UnsecuredJWT` rejected |
| H9 — `deployment_id` présent | ✅ | `verifyJwt.ts:275-281` |
| C10 — target_link_uri same-origin | ✅ | `verifyJwt.ts:291-308` origin exact-match `terminallearning.dev` |

### CRITICAL — 0

Aucun finding bloquant. La crypto path `verifyJwt()` est propre.

### WARNINGS (à corriger avant flip `LTI_ENABLED=true`)

**[W1] STRONG_INDICATOR — `api/lti/launch.ts:209` décode encore le JWT inline sans appeler `verifyJwt()`**
SPIKE laissé en place (commentaire ligne 127 reconnaît "PR #2 will wire the SPIKE handler à verifyJwt()"). Aucune vérification signature/exp/aud/jti. Mitigé par `LTI_ENABLED=false` (503 court-circuite). Risque si flag flippé sans PR #2 = **BYPASS TOTAL de la crypto**. Remediation : remplacer lignes 195-248 par `const verified = await verifyJwt(idToken, { clientId: env.LTI_CLIENT_ID })`.

**[W2] SPECULATIVE — `vercel.json:49,70` CSP `connect-src` n'inclut pas les iss LMS**
Non-bloquant car JWKS fetch = server-side (Node.js Function), pas browser. Si futur fetch client-side discovery ajouté (preview admin panel), CSP bloquera silencieusement. Remediation Phase 9 : étendre `connect-src` ou documenter formellement "JWKS = server-only" dans `docs/lti-install.md`.

**[W3] VERIFIED — `package.json:51 jsonwebtoken@^9.0.3` runtime dependency orpheline**
Aucun `import jsonwebtoken` runtime (vérifié grep `src/**/*.ts` + `api/**/*.ts`). Surface attaque supply-chain inutile + risque qu'un futur dev `import jwt from 'jsonwebtoken'` et réintroduise alg confusion (CVE-2022-23529 style). Remediation : `npm uninstall jsonwebtoken @types/jsonwebtoken` dans la PR qui câble `verifyJwt()` sur le handler.

### Recommendations (durcissement post-V1)

- **[R1]** OIDC discovery dynamique (ADR-006 V1.1) : valider l'URL discovery elle-même (TLS pin, HSTS check) avant fetch.
- **[R2]** `nonceStore` in-memory + Vercel Fluid Compute : replay window cross-instance jusqu'à insert DB. Acceptable (DB UNIQUE rattrape), documenter la latence p99 dans `docs/lti-install.md`.
- **[R3]** Migration `013_lti_launches.sql` : pas de `user_agent` ni `lms_deployment_id_hash`. Forensique post-incident limitée. À ajouter en Phase 9 admin panel.

### Diff baseline vs SPIKE pre-Phase 7c

Réf : `memory/project_lti_spike_state.md` (snapshot pré-7c).

| Aspect | SPIKE pre-7c | Baseline post-PR #236+#237+#239+#240 |
|---|---|---|
| Crypto lib | `jsonwebtoken` + `ignoreExpiration:true` + string "public key" placeholder | `jose@6.2.3` + RS256 strict + JWKS remote + clockTolerance 30s |
| `iss` check | Allowlist OK | Allowlist OK + pré-check **AVANT** JWKS fetch (anti-SSRF renforcé) |
| `aud` check | Absent | `audience: options.clientId` enforced |
| Replay protection | Absente | `nonceStore` TTL 10min + DB UNIQUE(jti) |
| `target_link_uri` | Non validé | Origin exact-match `terminallearning.dev` |
| Audit log DB | Absent | `lti_launches` RLS-locked, service_role only |
| Endpoint câblage | Inline decode + log SPIKE | **Inchangé** (TODO PR #2 — voir W1) |
| Supabase advisor | 6 SECURITY DEFINER exposés via RPC | 3 trigger-only verrouillés (014+015), 3 RLS helpers tracked THI-182 |

### Score

| Métrique | Valeur |
|---|---|
| Crypto path (`verifyJwt.ts` + `nonceStore.ts`) | **10/10** |
| Endpoint integration (`api/lti/launch.ts`) | **6/10** (SPIKE non-câblé, mitigé par flag) |
| **Score LTI global** | **9.0/10** |
| Tendance | ✅ Robuste sur la crypto · ⚠ wiring endpoint manquant (PR #2 obligatoire) |

### Verdict release-ready

**⚠ SHIP AVEC MITIGATIONS** (`LTI_ENABLED=false` gate maintenu)

- Tant que `LTI_ENABLED=false` : **SAFE TO MERGE**, aucune surface runtime.
- Avant flip `LTI_ENABLED=true` : **OBLIGATOIRE** de livrer PR #2 LTI wiring (W1), sinon BYPASS total de la crypto path qui est pourtant propre.

### 3 actions prioritaires

1. **[CRITICAL pré-flip]** PR #2 — câbler `api/lti/launch.ts` sur `verifyJwt()` + persist `lti_launches`. Sans ça, flip `LTI_ENABLED=true` = bypass total (W1).
2. **[HIGH supply-chain]** `npm uninstall jsonwebtoken @types/jsonwebtoken` dans la même PR. Élimine la surface alg confusion / CVE future (W3).
3. **[MEDIUM Phase 9]** Étendre `connect-src` CSP ou documenter "JWKS = server-side only" dans `docs/lti-install.md` (W2).

### Linear sync

- THI-131 → Done (PR #236 merged)
- THI-180 → Done (PR #237 merged)
- THI-183 (existant) → Backlog High : monitor undici bump ≥6.24.0 (gate `LTI_ENABLED=true`)
- THI-184 (existant) → Backlog Medium : fusionner ALLOWED_ISSUERS (gate PR #2 LTI)
- THI-185 (existant) → Backlog Medium : nettoyer PII Sentry `contexts.lti_launch` (gate PR #2 LTI)
- THI-182 (existant) → Backlog High : private schema RLS helpers (post-deadline 10 juin)

---

**Last Updated**: 17 mai 2026
**Next Review**: Pre-PR #2 LTI (avant câblage `verifyJwt()` + activation `LTI_ENABLED=true`).
