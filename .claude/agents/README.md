# Claude Agents — Terminal Learning

> Index et guide d'usage des agents internes du projet.
> **Dernière mise à jour** : 28 mai 2026 (audit méta post-switch Opus 4.8 : création `supabase-backend-auditor` Opus — gate-zero Edge Functions Deno + Storage RLS + file upload, avant Sprint 2.C Étape 3 Resend + Phase X3b import. Sync modèles README↔frontmatter — fin du drift Haiku stale. Règle dure @thierry : **zéro Haiku**).
> ⚠️ **Maintenance** : ce champ "Dernière mise à jour" doit être bumpé à chaque ajout/modification d'agent (cf. section "Convention — ajouter un nouvel agent").
> 🧠 **Limitation technique connue** : les agents `.md` créés en cours de session ne sont disponibles qu'à la session suivante (rechargement framework). Pattern : si un agent doit gater une PR créé pendant la même session, faire l'audit empirique inline avec exactement la méthode documentée dans l'agent, l'agent prendra le relais aux PRs suivantes.

Cet index liste les **20 agents** spécialisés du projet, **quand les invoquer**, et **pourquoi ils ont été créés**. Il complète le frontmatter individuel de chaque fichier `.md` en apportant une vue d'ensemble que les frontmatters ne peuvent pas donner.

> 🚫 **Règle dure (@thierry 28/05/2026)** : **JAMAIS `model: haiku`** sur aucun agent, quel que soit le scope (même déterministe pur). Plancher absolu = **Sonnet**, Opus pour le critique. Distribution actuelle : **0 Haiku / 12 Sonnet / 8 Opus**. Cf. mémoire CC `feedback_never_use_haiku.md`.

## 🛡 Doctrine modèles agents — post-incident 24/04/2026

L'incident 24 avril 2026 (downgrade silencieux Opus → Haiku/Sonnet → push direct main + CSP retiré + secret exposé URL MCP + HTTP 504 prod ~5h) a établi que **Haiku est l'attractor par défaut** quand Claude Code downgrade silencieusement un modèle. Conséquence : un agent en `model: haiku` ne peut PAS être trusted pour des scopes critiques sécurité/RBAC parce qu'au moindre downgrade, le scope critique tombe sans avertissement visible.

**Doctrine de mapping modèle → scope agent** (effective 20/05/2026, post-audit Sprint 2.A ; modèles re-tag 27/05 ; règle zéro-Haiku 28/05) :

| Modèle | Scope acceptable | Exemples |
|---|---|---|
| ~~**Haiku**~~ | 🚫 **INTERDIT** depuis 28/05/2026 (@thierry). Aucun agent en Haiku, quel que soit le scope. | — (0 agent) |
| **Sonnet** *(plancher absolu)* | Audit sécurité standard, RBAC empirique, multi-personas, edge cases, mobile responsive, dénombrement/extrapolation, validation structurelle, process | `rbac-flow-tester`, `classroom-workflow-auditor`, `route-attack-auditor`, `mobile-responsive-auditor`, `vercel-firewall-auditor`, `linear-sync`, `sustain-auditor`, `content-auditor`, `test-runner`, `curriculum-validator`, `ui-auditor`, `user-forensics-auditor` |
| **Opus 4.8** | Audits critiques cross-couches : sécurité gate-zero (OWASP/RLS/LLM/crypto/backend), multi-tenancy B2B, orchestration session, conformité juridique multi-règlementations | `security-auditor`, `prompt-guardrail-auditor`, `institution-rbac-auditor`, `llm-security-auditor`, `lti-auditor`, `session-orchestrator`, `legal-compliance-auditor`, `supabase-backend-auditor` |

**Historique distinction Haiku-OK/KO (PR #286 du 23/05, désormais MOOT)** : on avait testé Haiku OK sur "cite file:line exact" / KO sur "compte/extrapole" (content-auditor "356+" → réel 62 ; test-runner "56 files" → réel 77). La règle 28/05 tranche : **plus aucun Haiku** — le coût marginal Sonnet vs Haiku sous Opus 4.8 est négligeable face au risque de findings faux.

**Garde-fou utilisateur** : épingler `"model": "claude-opus-4-8"` dans `.claude/settings.local.json` du projet (cf. CLAUDE.md global) — évite que la main session bascule en Haiku/Sonnet sans notification. **Re-pin obligatoire à chaque bump de version Opus** (incident latent : pin resté sur 4.7 après switch 4.8, corrigé 28/05).

**Pattern auto-apprentissage** : les leçons des bugs passés s'intègrent dans le **scope** des agents existants (ex : section "Client-state lifecycle" ajoutée à `rbac-flow-tester` après THI-186), pas dans des memos CC isolés que personne ne re-lit. Trimestriellement, re-audit des modèles agents (script `audit_agent_models.sh` à créer post-deadline).

**Patterns récurrents** :
- **Début de session** : invoquer `linear-sync` (status PR↔Linear) puis optionnellement `session-orchestrator` mode `startup` pour récap freshness + tickets In Progress
- **Fin de session** : invoquer `session-orchestrator` mode `shutdown` pour audit complet (git, Linear, docs vitaux freshness, agent coverage gaps, orphan cleanup, recommandations actions prioritaires) — évite à @thierry de répéter les process à chaque shutdown

> **Référence cycle de vie** : ce README doit être mis à jour à chaque ajout/modification d'agent. Voir `maintenance_docs_checklist.md` (mémoire interne) section "Agents".

---

## Quick reference matrix

| Agent | Modèle | Auto-trigger session | Manuel | Bloquant merge ? |
|---|---|---|---|---|
| [`linear-sync`](linear-sync.md) | Sonnet | ✅ Début session | À la demande | ❌ |
| [`curriculum-validator`](curriculum-validator.md) | Sonnet | ✅ Avant edit `curriculum.ts` | Avant PR curriculum | ✅ CRITICAL |
| [`test-runner`](test-runner.md) | Sonnet | ✅ Après edit code/tests | Avant push | ✅ CRITICAL |
| [`content-auditor`](content-auditor.md) | Sonnet | ❌ | Avant release majeure | ⚠️ WARN seulement |
| [`security-auditor`](security-auditor.md) | **Opus 4.8** | ❌ | Avant PR auth/RBAC/RLS/API/crypto + release majeure | ✅ CRITICAL/HIGH |
| [`ui-auditor`](ui-auditor.md) | Sonnet | ❌ | Avant PR composant UI | ✅ CRITICAL |
| [`mobile-responsive-auditor`](mobile-responsive-auditor.md) | Sonnet | ❌ | Avant PR layout/nav/sidebar/drawer/forms/theme.css | ⚠️ verdict PASS/PASS_WITH_NOTES/BLOCK |
| [`prompt-guardrail-auditor`](prompt-guardrail-auditor.md) | **Opus 4.8** | ❌ | Avant PR `src/lib/ai/*` ou `src/app/components/ai/*` | ✅ CRITICAL |
| [`lti-auditor`](lti-auditor.md) | **Opus 4.8** | ❌ | Avant PR `src/lib/lti/*`, `api/lti/*`, `supabase/migrations/*lti*` | ✅ CRITICAL/HIGH |
| [`route-attack-auditor`](route-attack-auditor.md) | Sonnet | ❌ | Avant PR `api/*` ou nouvel endpoint | ✅ verdict release-ready |
| [`supabase-backend-auditor`](supabase-backend-auditor.md) | **Opus 4.8** | ❌ | Avant PR `supabase/functions/*`, policy `storage.objects`, ou code d'upload fichier | ✅ CRITICAL |
| [`vercel-firewall-auditor`](vercel-firewall-auditor.md) | Sonnet | ❌ | Avant release majeure ou modif firewall | ⚠️ WARN si rules cassées |
| [`rbac-flow-tester`](rbac-flow-tester.md) | Sonnet | ❌ | Avant chaque release Phase 9+ | ✅ pass/fail |
| [`sustain-auditor`](sustain-auditor.md) | Sonnet | ❌ scheduled trimestriel (cron à implémenter Phase 9+) | À la demande ou trimestriel | ⚠️ score 1-10 |
| [`classroom-workflow-auditor`](classroom-workflow-auditor.md) | Sonnet | ❌ | Avant PR `classes`/`class_enrollments`/`join_class_by_code` | ✅ CRITICAL |
| [`institution-rbac-auditor`](institution-rbac-auditor.md) | **Opus 4.8** | ❌ | Avant PR `profiles.institution_id`/`institutions`/`approve_teacher` | ✅ CRITICAL |
| [`llm-security-auditor`](llm-security-auditor.md) | **Opus 4.8** | ❌ | Avant release majeure IA + après modif architecturale | ✅ CRITICAL/HIGH |
| [`session-orchestrator`](session-orchestrator.md) | **Opus 4.8** | ✅ Début et fin session | À la demande | ❌ (méta-orchestration) |
| [`legal-compliance-auditor`](legal-compliance-auditor.md) | **Opus 4.8** | ❌ scheduled trimestriel | Avant release B2B écoles / publication AI Tutor / activation LTI / traitement mineurs | ⚠️ HIGH = avocat humain requis |
| [`user-forensics-auditor`](user-forensics-auditor.md) | Sonnet | ❌ | Incident sécurité user / RGPD Art. 15 / anti-abuse / observation drop-off | ⚠️ verdict 4 niveaux (LÉGITIME/SUSPECT/RGPD/ABUS) |

---

## When to invoke which (par phase de session)

### 1. Session start (obligatoire)

```bash
# Vérifier la cohérence GitHub ↔ Linear
linear-sync
```

### 2. Pendant la session — selon ce qui est modifié

| Modification | Agent à invoquer | Quand |
|---|---|---|
| `src/app/data/curriculum.ts` | `curriculum-validator` | **Avant** d'écrire la modification |
| `src/app/data/curriculum.ts` ou `terminalEngine.ts` ou `validators.ts` | `test-runner` | **Après** la modification, avant push |
| Composant UI (`*.tsx`) | `ui-auditor` | **Avant** d'ouvrir la PR |
| Layout, nav, sidebar, drawer, forms, dashboard mobile, `theme.css`, tailwind config, `index.html` | `mobile-responsive-auditor` | **Avant** d'ouvrir la PR (complémentaire `ui-auditor`, vise WebKit iOS + desktop preserve) |
| `src/lib/ai/*` ou `src/app/components/ai/*` | `prompt-guardrail-auditor` | **Avant** de coder + audit final post-implémentation |
| `api/*`, `supabase/migrations/`, `src/lib/supabase.ts`, JWT, rate limiting, CSP, secrets | `security-auditor` | **Avant** d'ouvrir la PR |
| `api/*` (HTTP-level) | `route-attack-auditor` | **Avant** d'ouvrir la PR |
| `supabase/functions/*` (Edge Function Deno), policy `storage.objects`, code d'upload fichier | `supabase-backend-auditor` | **Avant** d'ouvrir la PR (secret handling + Storage RLS + file upload) |

### 3. Avant chaque release majeure

```bash
content-auditor
security-auditor
vercel-firewall-auditor
route-attack-auditor
supabase-backend-auditor  # Si Edge Functions / Storage buckets actifs
rbac-flow-tester  # Si Phase 9+ activée
```

### 4. Trimestriellement (santé du projet long terme)

```bash
# sustain-auditor — agent invocable, première run baseline 17 mai 2026.
# Score initial 5.5/10 (RED côté git patterns weekend/nuit). Voir THI-212.
sustain-auditor  # Quarterly health check ou à la demande
```

---

## Fiches détaillées

### `linear-sync` — Cohérence GitHub ↔ Linear

**Modèle** : Sonnet (judgment call sur les incohérences)
**MCP** : `linear-server` requis
**Créé** : début avril 2026 — Patterns d'incohérence Linear/GitHub identifiés (issues Done sans PR mergée, In Progress avec PR ouverte). Documenté dans `feedback_session_protocol.md`.
**Vraies victoires** : a détecté la dette Sourcery 14 jours sur PR #149/#150 le 2 mai 2026.

### `curriculum-validator` — Structure curriculum.ts

**Modèle** : Sonnet (chain logic prérequis + détection tests manquants au-delà du grep pur ; jamais Haiku)
**Créé** : avril 2026 — `curriculum.ts` est un fichier critique (3000+ lignes, 65 leçons). Toute modif silencieuse peut casser progression utilisateurs. Vérifie : env coverage, IDs uniques, prérequis chain, import/export validators sync, orphan validators.
**Lié** : ADR pédagogie (multi-environment Linux/macOS/Windows).

### `test-runner` — Tests + qualité statique

**Modèle** : Sonnet (upgrade PR #286 — Haiku KO sur dénombrement, "56 files" → réel 77)
**Créé** : avril 2026, étendu PR #150 (2 mai 2026) — pipeline complète type-check + lint + vitest + détection `.only/.skip` leaked + delta code/tests warning.
**Astuce** : peut tester un worktree d'une autre branche via paramètre `branches: <name>`.

### `content-auditor` — Audit pédagogique global

**Modèle** : Sonnet (upgrade PR #286 — Haiku KO sur dénombrement, "356+ describes" → réel 62)
**Créé** : avril 2026 (THI-45) — coverage env, cohérence curriculum↔terminalEngine↔tests, validité des liens externes (WebFetch), cohérence prérequis, qualité `validate()`. Long à exécuter (~5 min).
**Quand l'invoquer** : avant releases majeures uniquement, pas à chaque PR.

### `security-auditor` — OWASP black-hat

**Modèle** : **Opus 4.8** (upgrade 27/05 — gate-zero release, OWASP black-hat edge cases multi-couches, incident prod = $$$)
**Créé** : avril 2026 (THI-53), renforcé 2 mai 2026 (PR #182 — section Vercel posture audit ajoutée suite à incident bypass forensic).
**Couvre** : OWASP Top 10 (2021), OWASP API Sec (2023), CSP L3, HTTP headers, rate limiting, RLS Supabase, auth, supply chain, privacy/GDPR, terminal injection, SQL credential leakage, **Vercel posture** (tokens + bypass + events log), 2026 cybersecurity norms.
**Lié** : incidents 006/007/008 SECURITY.md.

### `ui-auditor` — Discipline shadcn/ui

**Modèle** : Sonnet (upgrade 27/05 — règle zéro-Haiku ; scope strict shadcn lint + design tokens)
**Créé** : 13 avril 2026 (THI-86) — détecte composants HTML/Tailwind custom où shadcn/ui devrait être utilisé, deps inutilisées, composants installés jamais importés, couleurs/tailles en dur. **Bloquant** sur les PR UI.
**Contexte historique** : 39 composants Radix installés mais pas utilisés au départ, l'umbrella THI-91 a tout migré.

### `mobile-responsive-auditor` — WebKit iOS + Desktop preserve

**Modèle** : Sonnet (judgment call sur regression desktop + sévérité WebKit-spécifique)
**Créé** : 5 mai 2026 (THI-150, ex-brick 3a de THI-149 epic) — comble la lacune `ui-auditor` (Chromium-only). 11 sections / ≥48 checkpoints, ciblage iPhone Safari (WebKit) avec **bonus Section 11 Desktop Preservation** (TL-critical, mandate @cowork).
**Pattern source** : `F:/PROJECTS/Apps/ankora/.claude/agents/mobile-ios-auditor.md` (cross-projet convergence). Adapté Vite/React/Tailwind v4/Vitest/Playwright (drop Next.js spécifique).
**Adaptations TL** : env switcher pill (Linux/macOS/Windows/WSL), Terminal emulator interactif, AiTutorPanel drawer (Phase 7b), checkpoints **BUG-FAB-001** (visibility + contrast + detachment FAB Sparkles ✨) distribués §3 #14 + §8 #36a + §8 #36b.
**Output** : verdict `PASS` / `PASS_WITH_NOTES` / `BLOCK` + findings `file:line` + sévérité (`ios-critical`/`ios-high`/`ios-medium`/`ios-low`/`desktop-regression`) + flag `WebKit-specific` + recommendations Tailwind/CSS + Playwright WebKit + Chromium desktop specs.
**Lié** : THI-149 epic (P0 v0.9 publique), THI-151 (audit Playwright), THI-152 (mini-PRs fix séquentielles), PR #189 (THI-147 safe-area iPhone PWA), PR #191 (THI-149 hot fix overflow body).

### `prompt-guardrail-auditor` — Sécurité LLM (OWASP LLM Top 10)

**Modèle** : **Opus 4.8** (upgrade 27/05 — gate per-PR Tuteur IA, jailbreaks/sanitizer bypass = méthode adversariale créative, incident IA prod = brand risk B2B + AI Act EU)
**Créé** : 18 avril 2026 (THI-109) — gate-zero **AVANT** implémentation Tuteur IA (anti-pattern "tests à la fin"). Couvre : prompt injection, jailbreaks, prompt leaks, role enforcement, bypass sanitizer, XSS sur rendu réponse, fuite clé API.
**Lié** : ADR-002 (BYOK 4-tiers), ADR-005 (V1 implementation), THI-110 (keyManager), THI-111 (panel + sanitizer + providers).
**Premier audit gate-zero** : 2 mai 2026 ✅ CLEAN avant THI-111.

### `lti-auditor` — Sécurité LTI 1.3 (10 critical checks MVP)

**Modèle** : **Opus 4.8** (anti-Haiku discipline post-incident 24/04, crypto LTI = sécurité critique)
**Créé** : 16 mai 2026 (THI-131 Phase 7c) — gate-zero **AVANT** implémentation Auth MVP. Pattern repris de `prompt-guardrail-auditor` (THI-109). Couvre 10 checks critiques sur la chaîne crypto LTI : RS256 signature (`jose@6`), iss allowlist (anti-SSRF pre-fetch JWKS), aud match, exp/iat clock tolerance ≤30s, nonce store replay collision, jti uniqueness window, kid matches JWKS, alg ≠ none, deployment_id présent, target_link_uri same-origin.
**Lié** : ADR-001 (LTI-first positioning), ADR-006 (LTI 1.3 implementation), THI-131 (PR #236 Auth MVP), THI-180 (revoke SECURITY DEFINER trigger functions cascade), THI-182 (private schema RLS helpers follow-up).
**Premier audit cascade** : 16 mai 2026 ✅ ship-ready PR #236 + 3 findings cleanup SPIKE intégrés AVANT merge (W1 `ignoreExpiration: true` + clé string littérale + JWKS jeté = famille CVE-2015-9235 alg confusion · R2 collision import path · W4 `X-Frame-Options: ALLOW` non-RFC retiré).
**Évolutif** : méthode 7-couches post-V1 LTI (alignement `llm-security-auditor`) quand AGS grade passback + NRPS + Deep Linking arriveront.
**Note** : effective-NEXT-session après PR de création (runtime CC ne voit pas l'agent dans la session qui le crée — 1ère baseline officielle au prochain démarrage).

### `route-attack-auditor` — HTTP/route attack surface

**Modèle** : Sonnet (judgment call sur exploitabilité)
**Créé** : 2 mai 2026 (sprint sécurité 1-2 mai, PR #176) — comble la lacune entre `security-auditor` (app-layer) et `vercel-firewall-auditor` (WAF). Couvre : status code fingerprinting, verb tampering, cache poisoning via 503, slowloris, side-channel timing, header smuggling, CORS edge cases.

### `supabase-backend-auditor` — Edge Functions + Storage + file upload

**Modèle** : **Opus 4.8** (secret handling + file upload malware/zip slip/XXE/SVG-XSS + BOLA Edge Functions = classe « incident = brand killer + DPA + AI Act »)
**Créé** : 28 mai 2026 (audit méta post-4.8) — gate-zero **AVANT** Sprint 2.C Étape 3 (Edge Function Resend) + Phase X3b (import curriculum), pattern pré-chantier (cf. `lti-auditor`, `prompt-guardrail-auditor`). Comble le gap identifié : aucun agent ne couvrait les surfaces backend Supabase au-delà des tables/RPC.
**Couvre** : Edge Functions Deno (secret handling RESEND_API_KEY/service_role, JWT verify, BOLA autorisation objet, SSRF, CORS, rate limit) · Storage buckets (RLS `storage.objects`, public/private, naming path-traversal) · file upload (MIME spoofing, magic bytes, zip slip, XXE, decompression bomb, SVG-XSS, oversized).
**Indépendance MCP** : teste en `curl` + JWT (PAS de dépendance MCP — leçon `linear-sync` 28/05, fonctionne en sous-agent). Mode pré-chantier honnête si surface absente (ne fabrique pas de findings).
**Lié** : Sprint 2.C Étape 3 (Resend Edge Function), THI-286 (X3b import curriculum — Urgent), migration 029 (CHECK `screenshot_url` Supabase Storage only).

### `vercel-firewall-auditor` — WAF Vercel

**Modèle** : Sonnet
**Créé** : 14 avril 2026 — lit la config Vercel Firewall (WAF + custom rules) via API REST, exécute une batterie de tests HTTP live contre la prod pour valider que les rules bloquent ce qu'elles doivent. Nécessite `VERCEL_TOKEN`.
**Lié** : `docs/vercel-firewall.md` (rules + rationale + rollback).

### `rbac-flow-tester` — Vérification flow RBAC

**Modèle** : Sonnet (upgrade 20/05 — THI-186 data leak 6 semaines : RBAC = serveur ET client, edge cases multi-session)
**Créé** : avril 2026 — vérifie le flow complet RBAC pour les 5 test users via Supabase REST API. À invoquer avant chaque release Phase 9+. Confirme login + role assignment + RLS isolation intacts.
**Lié** : THI-37 (RBAC complet, PR #92).

### `sustain-auditor` — Santé du mainteneur solo

**Modèle** : Sonnet (judgment sur signaux santé + recommendations actionables)
**Créé** : avril 2026 (spec), instancié 17 mai 2026 — quarterly sustainability health check. Document freshness, git pattern analysis (commits weekend/nuit, streaks), Sentry alert load, memory drift. Score 1-10 + warnings + recommendations.
**Trigger** : manuel via comment, ou scheduled trimestriel (cron auto-trigger à implémenter post-Phase 9).
**Première baseline** : 17 mai 2026 — score **5.5/10** (RED côté git patterns : 47% weekend, 31% nuit sur 90j). 3 recommendations actionables capturées dans **THI-212** (sustainability doctrine activation).

---

## Convention — ajouter un nouvel agent

1. Créer le fichier `.claude/agents/<nom>.md` avec frontmatter YAML strict :
   ```yaml
   ---
   name: <nom-kebab-case>
   description: <une phrase claire — quand l'invoquer + ce qu'il vérifie>
   tools: <Bash, Read, Grep, Glob, WebFetch> (uniquement ce qui est nécessaire)
   model: <haiku | sonnet>  # haiku = pattern matching, sonnet = judgment
   ---
   ```
2. **Ajouter une ligne dans la matrice** ci-dessus
3. **Ajouter une fiche détaillée** dans la section "Fiches détaillées" (modèle, créé, contexte, lié)
4. Si auto-trigger : mettre à jour `CLAUDE.md` projet section "Protocole de session"
5. Si bloquant merge : mettre à jour `feedback_session_protocol.md` (mémoire) section "Avant toute PR ..."
6. **Bumper le champ "Dernière mise à jour"** au tout début de ce README (ligne 4) avec la date du jour (format `JJ mois AAAA`)

Frontmatter `model:` : **toujours `sonnet` au minimum**, `opus` pour le critique. **Jamais `haiku`** (règle dure @thierry 28/05/2026).

## Convention — modèle Sonnet vs Opus (Haiku INTERDIT)

🚫 **Haiku est interdit** depuis le 28/05/2026 (@thierry) — cf. `feedback_never_use_haiku.md`. Le tableau ci-dessous ne fait plus arbitrer qu'entre Sonnet et Opus.

| Tâche | Modèle |
|---|---|
| Validation structurelle, dénombrement, process, pattern detection, mobile/UI lint | **Sonnet** (plancher) |
| Audit sécurité gate-zero (OWASP/RLS/LLM/crypto/backend), multi-tenancy B2B, orchestration session, conformité juridique | **Opus 4.8** |

L'objectif est de **garder Sonnet par défaut** (le plancher absolu) sauf si le scope est critique sécurité/architecture/conformité → **Opus**. Le coût marginal Sonnet vs Haiku sous Opus 4.8 est négligeable face au risque de findings faux (Haiku KO empirique sur dénombrement, PR #286).

---

## Histoire — pourquoi cet index existe

Au 5 mai 2026, le projet a 12 agents internes accumulés sur 1 mois. Les frontmatters individuels ne suffisaient plus à savoir **quand invoquer quoi** ni **pourquoi un agent existe**. Le risque concret : dans 6 mois (pause santé Thierry, contexte Claude effacé), redécouverte douloureuse sans documentation.

L'index résout ça : un fichier unique, accessible GitHub, lié dans `CLAUDE.md` projet, à charge cognitive de redécouverte 5 min au lieu de 30+ min de fouille.

Issue Linear de traçabilité : à créer en parallèle de cette PR.
