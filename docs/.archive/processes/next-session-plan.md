# Next Session Plan — 20 avril 2026 (chaîne ADR-005 AI Tutor V1, gate avant THI-111)

> Fichier lu automatiquement par `session-kickoff.md` étape 5.
> À supprimer ou archiver une fois la chaîne ADR-005 close (post-merge THI-113).
> Mis à jour : 18 avril 2026 après merge PR #155 (THI-110 Done).

---

## Contexte d'entrée

Session précédente (18 avril 2026) :
- PR #151 mergée, THI-115 Done (doc alignment ADR-002 + ADR-005)
- PR #152 mergée, THI-116 Done (sync CLAUDE.md + next-session-plan.md)
- PR #153 mergée, THI-109 Done (agent `prompt-guardrail-auditor`)
- PR #154 mergée, THI-117 Done (sync doc post-THI-109)
- PR #155 mergée, **THI-110 Done** (key manager V1 — localStorage plain + IndexedDB AES-GCM + PBKDF2 210k, 32 tests, premier audit `prompt-guardrail-auditor` PASS)

**Findings ouverts en Backlog à partir de la session du 18 avril** :
- **THI-118** (High) — perf regression LCP sur `/` (3.87s → 9.31s, ×2.4) — investigation à tête reposée
- **THI-119** (Medium) — filtre Sentry `text/html` MIME type variant — quick win
- **THI-120** (High) — scrubber Sentry `beforeSend` — **gate avant THI-111**

**Scope prochaine session** : démarrer **THI-120** (scrubber Sentry), ensuite **THI-111** (AiTutorPanel + providers + sanitizer). Logique : THI-120 est léger, bloque THI-111, et doit être mergé avant pour qu'aucun fetch LLM ne fuite la clé via Sentry.

Possibilité d'intercaler **THI-119** (quick win complémentaire, même zone de code `src/lib/sentry.ts`) — Thierry décide.

---

## Étape 1 — Checks santé (obligatoire, protocole standard)

Exécuter `session-kickoff.md` étapes 1 à 7. Si signal rouge santé → **stop**, proposer scope réduit.

---

## Étape 2 — Démarrer THI-120 (scrubber Sentry)

**Issue** : [THI-120 — Sentry — durcir beforeSend (scrubber Authorization + champs *key*/*token*/*auth*)](https://linear.app/thierryvm/issue/THI-120)

### Livrables

- `src/lib/sentry.ts` `beforeSend` : scrubber générique avant le `return event` :
  - `event.request.headers.Authorization` / `authorization` → `[REDACTED]`
  - `event.extra` / `event.contexts` : tout champ dont le nom matche `/key|token|secret|auth/i` → `[REDACTED]`
  - `event.breadcrumbs[].data` : idem

- Test unitaire Vitest dans `src/test/sentry.test.ts` (nouveau fichier) :
  - Mock d'un event Sentry avec `extra.apiKey = 'sk-ant-test'` → vérifie `'[REDACTED]'` après `beforeSend`
  - Mock d'un event avec `request.headers.Authorization = 'Bearer sk-or-v1-test'` → vérifie `'[REDACTED]'`
  - Mock d'un breadcrumb avec `data.token = '...'` → vérifie `'[REDACTED]'`
  - Cas safe : un champ `userId` ne doit PAS être scrubé

### Critères de merge

- CI verte (type-check + lint + test + build)
- Sourcery OK (ou SKIPPED rate limit)
- Agent `prompt-guardrail-auditor` clean sur `src/lib/sentry.ts` (scope étape 7 de l'agent)
- Branche : `feature/thi-120-sentry-scrubber`
- Passer THI-120 en **In Review** dès PR push, puis **Done** au merge

### Dépendances

- THI-109 ✅ (agent guardrail existe)
- THI-110 ✅ (premier audit a identifié ce gap)

### Débloque

- **THI-111** — AiTutorPanel + providers + system prompt + sanitizer (ne peut pas merger sans ce scrubber)

---

## Étape 3 (optionnelle, si contexte frais) — Démarrer THI-119

**Issue** : [THI-119 — Sentry filtrer text/html is not a valid JavaScript MIME type](https://linear.app/thierryvm/issue/THI-119)

Quick win ~30 min — même fichier `src/lib/sentry.ts`, étendre le filtre stale chunk existant à 3 variants : `'text/html' is not a valid JavaScript MIME type`, `Failed to load module script`, `Expected a JavaScript module script but the server responded with a MIME type`.

Intéressant d'enchaîner avec THI-120 (même zone de code, gain de contexte).

---

## Étape 4 — Vérification finale

Après merge THI-120 (et éventuellement THI-119) :

- [ ] THI-120 → Done dans Linear
- [ ] `docs/plan.md` Phase 7b step 4 : ✅
- [ ] Mémoire `project_ai_agent_byok.md` : ajouter note « scrubber Sentry en place »
- [ ] `CLAUDE.md` projet : ajouter THI-120 en ✅
- [ ] Mettre à jour ce fichier pour pointer sur THI-111
- [ ] Demander à Thierry : démarrer THI-111 (plus gros ticket — AiTutorPanel + providers + sanitizer) ou pause ?

---

## Chaîne ADR-005 complète (référence)

| ID | Titre | Statut 2026-04-18 | Priorité | Dépend de |
|---|---|---|---|---|
| THI-109 | Agent prompt-guardrail-auditor | ✅ Done (PR #153) | High | — |
| THI-110 | Key manager V1 | ✅ Done (PR #155) | High | THI-109 |
| THI-120 | Scrubber Sentry beforeSend | 🔜 Next | High | THI-110 (finding d'audit) |
| THI-111 | AiTutorPanel + providers + system prompt + sanitizer | Backlog | High | THI-120 |
| THI-112 | Onboarding IA — AiKeySetup + AiConsentModal | Backlog | Medium | THI-111 |
| THI-113 | Audit final Tuteur IA | Backlog | High | THI-112 |
| THI-114 | V1.5 — Web Worker isolation keyManager | Backlog | Low | THI-113 (post-ship) |

### Tickets perf/ops ouverts en parallèle

| ID | Titre | Statut | Priorité |
|---|---|---|---|
| THI-118 | Perf regression LCP sur `/` (3.87s → 9.31s) | Backlog | High |
| THI-119 | Filtre Sentry `text/html` MIME type variant | Backlog | Medium |

---

## Mémoires prioritaires à recharger en début de session

- `project_ai_agent_byok.md` — **source de vérité** ADR-002 + ADR-005 (séquence step 4 = THI-120)
- `feedback_doc_alignment.md` — règle doc alignment systématique
- `user_health_signals.md` — règle slow-down
- `feedback_session_protocol.md` — règles opérationnelles
- `reference_vercel_bypass.md` — secret bypass pour visual verification previews (pas nécessaire pour THI-120 — pas de changement UI)

---

## Trigger d'activation

Thierry dira probablement : **"ok, on démarre THI-120"**, **"suite du tuteur IA"**, ou **"enchaîne"**.

→ Répondre par l'exécution directe des étapes 1-2 ci-dessus. Demander confirmation avant : création de PR, push de branche, modification destructive.
