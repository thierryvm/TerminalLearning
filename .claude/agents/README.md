# Claude Agents — Terminal Learning

> Index et guide d'usage des agents internes du projet.
> **Dernière mise à jour** : 2 mai 2026

Cet index liste les **11 agents** spécialisés du projet, **quand les invoquer**, et **pourquoi ils ont été créés**. Il complète le frontmatter individuel de chaque fichier `.md` en apportant une vue d'ensemble que les frontmatters ne peuvent pas donner.

> **Référence cycle de vie** : ce README doit être mis à jour à chaque ajout/modification d'agent. Voir `maintenance_docs_checklist.md` (mémoire interne) section "Agents".

---

## Quick reference matrix

| Agent | Modèle | Auto-trigger session | Manuel | Bloquant merge ? |
|---|---|---|---|---|
| [`linear-sync`](linear-sync.md) | Sonnet | ✅ Début session | À la demande | ❌ |
| [`curriculum-validator`](curriculum-validator.md) | Haiku | ✅ Avant edit `curriculum.ts` | Avant PR curriculum | ✅ CRITICAL |
| [`test-runner`](test-runner.md) | Haiku | ✅ Après edit code/tests | Avant push | ✅ CRITICAL |
| [`content-auditor`](content-auditor.md) | Haiku | ❌ | Avant release majeure | ⚠️ WARN seulement |
| [`security-auditor`](security-auditor.md) | Sonnet | ❌ | Avant PR auth/RBAC/RLS/API/crypto + release majeure | ✅ CRITICAL/HIGH |
| [`ui-auditor`](ui-auditor.md) | Haiku | ❌ | Avant PR composant UI | ✅ CRITICAL |
| [`prompt-guardrail-auditor`](prompt-guardrail-auditor.md) | Haiku | ❌ | Avant PR `src/lib/ai/*` ou `src/app/components/ai/*` | ✅ CRITICAL |
| [`route-attack-auditor`](route-attack-auditor.md) | Sonnet | ❌ | Avant PR `api/*` ou nouvel endpoint | ✅ verdict release-ready |
| [`vercel-firewall-auditor`](vercel-firewall-auditor.md) | Sonnet | ❌ | Avant release majeure ou modif firewall | ⚠️ WARN si rules cassées |
| [`rbac-flow-tester`](rbac-flow-tester.md) | (default) | ❌ | Avant chaque release Phase 9+ | ✅ pass/fail |
| [`sustain-auditor-spec`](sustain-auditor-spec.md) | (spec) | ❌ scheduled trimestriel | À la demande | ⚠️ score 1-10 |

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
| `src/lib/ai/*` ou `src/app/components/ai/*` | `prompt-guardrail-auditor` | **Avant** de coder + audit final post-implémentation |
| `api/*`, `supabase/migrations/`, `src/lib/supabase.ts`, JWT, rate limiting, CSP, secrets | `security-auditor` | **Avant** d'ouvrir la PR |
| `api/*` (HTTP-level) | `route-attack-auditor` | **Avant** d'ouvrir la PR |

### 3. Avant chaque release majeure

```bash
content-auditor
security-auditor
vercel-firewall-auditor
route-attack-auditor
rbac-flow-tester  # Si Phase 9+ activée
```

### 4. Trimestriellement (santé du projet long-terme)

```bash
sustain-auditor  # Manuel ou scheduled — voir spec
```

---

## Fiches détaillées

### `linear-sync` — Cohérence GitHub ↔ Linear

**Modèle** : Sonnet (judgment call sur les incohérences)
**MCP** : `linear-server` requis
**Créé** : début avril 2026 — Patterns d'incohérence Linear/GitHub identifiés (issues Done sans PR mergée, In Progress avec PR ouverte). Documenté dans `feedback_session_protocol.md`.
**Vraies victoires** : a détecté la dette Sourcery 14 jours sur PR #149/#150 le 2 mai 2026.

### `curriculum-validator` — Structure curriculum.ts

**Modèle** : Haiku (pattern matching pur)
**Créé** : avril 2026 — `curriculum.ts` est un fichier critique (3000+ lignes, 65 leçons). Toute modif silencieuse peut casser progression utilisateurs. Vérifie : env coverage, IDs uniques, prérequis chain, import/export validators sync, orphan validators.
**Lié** : ADR pédagogie (multi-environment Linux/macOS/Windows).

### `test-runner` — Tests + qualité statique

**Modèle** : Haiku (sortie verbose tsc/eslint/vitest filtrée)
**Créé** : avril 2026, étendu PR #150 (2 mai 2026) — pipeline complète type-check + lint + vitest + détection `.only/.skip` leaked + delta code/tests warning.
**Astuce** : peut tester un worktree d'une autre branche via paramètre `branches: <name>`.

### `content-auditor` — Audit pédagogique global

**Modèle** : Haiku
**Créé** : avril 2026 (THI-45) — coverage env, cohérence curriculum↔terminalEngine↔tests, validité liens externes (WebFetch), cohérence prérequis, qualité `validate()`. Long à exécuter (~5 min).
**Quand l'invoquer** : avant releases majeures uniquement, pas à chaque PR.

### `security-auditor` — OWASP black-hat

**Modèle** : Sonnet (judgment call sur exploitabilité)
**Créé** : avril 2026 (THI-53), renforcé 2 mai 2026 (PR #182 — section Vercel posture audit ajoutée suite à incident bypass forensic).
**Couvre** : OWASP Top 10 (2021), OWASP API Sec (2023), CSP L3, HTTP headers, rate limiting, RLS Supabase, auth, supply chain, privacy/GDPR, terminal injection, SQL credential leakage, **Vercel posture** (tokens + bypass + events log), 2026 cybersecurity norms.
**Lié** : incidents 006/007/008 SECURITY.md.

### `ui-auditor` — Discipline shadcn/ui

**Modèle** : Haiku
**Créé** : 13 avril 2026 (THI-86) — détecte composants HTML/Tailwind custom où shadcn/ui devrait être utilisé, deps inutilisées, composants installés jamais importés, couleurs/tailles en dur. **Bloquant** sur les PR UI.
**Contexte historique** : 39 composants Radix installés mais pas utilisés au départ, l'umbrella THI-91 a tout migré.

### `prompt-guardrail-auditor` — Sécurité LLM (OWASP LLM Top 10)

**Modèle** : Haiku
**Créé** : 18 avril 2026 (THI-109) — gate-zero **AVANT** implémentation Tuteur IA (anti-pattern "tests à la fin"). Couvre : prompt injection, jailbreaks, prompt leaks, role enforcement, bypass sanitizer, XSS sur rendu réponse, fuite clé API.
**Lié** : ADR-002 (BYOK 4-tiers), ADR-005 (V1 implementation), THI-110 (keyManager), THI-111 (panel + sanitizer + providers).
**Premier audit gate-zero** : 2 mai 2026 ✅ CLEAN avant THI-111.

### `route-attack-auditor` — HTTP/route attack surface

**Modèle** : Sonnet (judgment call sur exploitabilité)
**Créé** : 2 mai 2026 (sprint sécurité 1-2 mai, PR #176) — comble la lacune entre `security-auditor` (app-layer) et `vercel-firewall-auditor` (WAF). Couvre : status code fingerprinting, verb tampering, cache poisoning via 503, slowloris, side-channel timing, header smuggling, CORS edge cases.

### `vercel-firewall-auditor` — WAF Vercel

**Modèle** : Sonnet
**Créé** : 14 avril 2026 — lit la config Vercel Firewall (WAF + custom rules) via API REST, exécute une batterie de tests HTTP live contre la prod pour valider que les rules bloquent ce qu'elles doivent. Nécessite `VERCEL_TOKEN`.
**Lié** : `docs/vercel-firewall.md` (rules + rationale + rollback).

### `rbac-flow-tester` — Vérification flow RBAC

**Modèle** : (default — non spécifié)
**Créé** : avril 2026 — vérifie le flow complet RBAC pour les 5 test users via Supabase REST API. Invoke avant chaque release Phase 9+. Confirme login + role assignment + RLS isolation intacts.
**Lié** : THI-37 (RBAC complet, PR #92).

### `sustain-auditor-spec` — Santé du mainteneur solo

**Modèle** : (spec — pas un agent invocable, c'est une spécification de cron task)
**Créé** : avril 2026 — quarterly sustainability health check. Document freshness, git pattern analysis (commits weekend/nuit, streaks), Sentry alert load, memory drift. Score 1-10 + warnings + recommendations.
**Trigger** : manuel via comment, ou scheduled trimestriel.
**Note** : agent file porte le suffixe `-spec` car la spec attend une implémentation `schedule` qui n'a pas encore été instanciée. À convertir en agent invocable avant Q3 2026.

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

## Convention — modèle Haiku vs Sonnet

| Tâche | Modèle |
|---|---|
| Pattern matching pur (regex, grep, count) | **Haiku** |
| Décision judgment (exploitabilité, severity, contexte business) | **Sonnet** |
| Exécution shell + parsing structuré | **Haiku** |
| Audit black-hat avec hypothèses adversariales | **Sonnet** |

L'objectif est de **garder Haiku par défaut** (rapide, économique) sauf si le judgment call justifie Sonnet (sécurité, architecture, exploitabilité).

---

## Histoire — pourquoi cet index existe

Au 2 mai 2026, le projet a 11 agents internes accumulés sur 1 mois. Les frontmatters individuels ne suffisaient plus à savoir **quand invoquer quoi** ni **pourquoi un agent existe**. Le risque concret : dans 6 mois (pause santé Thierry, contexte Claude effacé), redécouverte douloureuse sans documentation.

L'index résout ça : un fichier unique, accessible GitHub, lié dans `CLAUDE.md` projet, à charge cognitive de redécouverte 5 min au lieu de 30+ min de fouille.

Issue Linear de traçabilité : à créer en parallèle de cette PR.
