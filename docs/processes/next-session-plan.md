# Next Session Plan — 19 avril 2026 (chaîne ADR-005 AI Tutor V1, step 3)

> Fichier lu automatiquement par `session-kickoff.md` étape 5.
> À supprimer ou archiver une fois la chaîne ADR-005 close (post-merge THI-113).
> Mis à jour : 18 avril 2026 après merge PR #153 (THI-109 Done).

---

## Contexte d'entrée

Session précédente (18 avril 2026) :
- PR #151 mergée, THI-115 Done (doc alignment ADR-002 + ADR-005)
- PR #152 mergée, THI-116 Done (sync CLAUDE.md + next-session-plan.md)
- PR #153 mergée, **THI-109 Done** (agent `prompt-guardrail-auditor`, gate zéro ADR-005 — OWASP LLM Top 10, batterie injections, test à blanc ✅)

**Scope prochaine session** : démarrer **THI-110** (Key manager V1 — localStorage plain + opt-in IndexedDB Web Crypto). C'est la première ligne de code fonctionnel du Tuteur IA — l'agent `prompt-guardrail-auditor` est prêt à auditer dès ce step.

---

## Étape 1 — Checks santé (obligatoire, protocole standard)

Exécuter `session-kickoff.md` étapes 1 à 7. Si signal rouge santé → **stop**, proposer scope réduit.

---

## Étape 2 — Démarrer THI-110 (key manager V1)

**Issue** : [THI-110 — Key manager V1 (localStorage plain + opt-in Web Crypto)](https://linear.app/thierryvm/issue/THI-110)

### Livrables

- `src/lib/ai/keyManager.ts` avec API stable :
  - `getApiKey(): Promise<string | null>` — lecture à la demande, jamais de cache global long-lived
  - `setApiKey(key: string, opts?: { encrypt?: boolean; passphrase?: string }): Promise<void>`
  - `forgetApiKey(): Promise<void>` — efface localStorage + IndexedDB + variables RAM
  - `hasEncryptedKey(): Promise<boolean>` — true si l'utilisateur a opt-in au chiffrement
- Implémentation V1 :
  - **Défaut** : `localStorage` plain, warning visible à configurer côté UI (pas dans ce ticket)
  - **Opt-in** : IndexedDB + Web Crypto AES-GCM, PBKDF2 ≥ 210 000 itérations, sel aléatoire par user, IV unique par opération
- Détection auto du provider via préfixe de clé (`sk-or-v1-*`, `sk-ant-*`, `sk-*`, custom base URL) — exposée via `detectProvider(key: string)`
- Tests unitaires Vitest :
  - Round-trip set/get en mode plain
  - Round-trip set/get en mode chiffré avec passphrase correcte
  - Échec de get avec mauvaise passphrase (pas de crash, retourne null + log sanitisé)
  - `forgetApiKey()` efface réellement les deux stores
  - `detectProvider()` renvoie le bon tier pour chaque format

### Critères de merge

- CI verte (type-check + lint + test + build)
- Sourcery OK (ou SKIPPED rate limit)
- **Agent `prompt-guardrail-auditor` lancé** → doit maintenant détecter `keyManager.ts` et auditer les leakage surfaces (console.log, Sentry `beforeSend`, etc.)
- Agent `security-auditor` complémentaire pour PBKDF2 iter count + CSP `connect-src` inchangé (pas de fetch dans ce ticket)
- Branche : `feature/thi-110-key-manager-v1`
- Passer THI-110 en **In Review** dès PR push, puis **Done** au merge

### Dépendances

- THI-109 ✅ (prompt-guardrail-auditor créé)

### Débloque

- THI-111 (AiTutorPanel + providers + system prompt + sanitizer)
- THI-112 → THI-113 → merge Phase 7b

---

## Étape 3 — Vérification finale

Après merge THI-110 :

- [ ] THI-110 → Done dans Linear
- [ ] `docs/plan.md` Phase 7b step 3 : ✅
- [ ] Mémoire `project_ai_agent_byok.md` : séquence step 3 marquée "Done"
- [ ] `CLAUDE.md` projet : THI-110 ajouté en ✅
- [ ] Mettre à jour ce fichier pour pointer sur THI-111
- [ ] Demander à Thierry : démarrer THI-111 (plus gros ticket — AiTutorPanel + providers + sanitizer) ou pause ?

---

## Chaîne ADR-005 complète (référence)

| ID | Titre | Statut 2026-04-18 | Priorité | Dépend de |
|---|---|---|---|---|
| THI-109 | Agent prompt-guardrail-auditor | ✅ Done (PR #153) | High | — |
| THI-110 | Key manager V1 | 🔜 Next | High | THI-109 |
| THI-111 | AiTutorPanel + providers + system prompt + sanitizer | Backlog | High | THI-110 |
| THI-112 | Onboarding IA — AiKeySetup + AiConsentModal | Backlog | Medium | THI-111 |
| THI-113 | Audit final Tuteur IA | Backlog | High | THI-112 |
| THI-114 | V1.5 — Web Worker isolation keyManager | Backlog | Low | THI-113 (post-ship) |

---

## Mémoires prioritaires à recharger en début de session

- `project_ai_agent_byok.md` — **source de vérité** ADR-002 + ADR-005 (séquence step 3 = THI-110)
- `feedback_doc_alignment.md` — règle doc alignment systématique
- `user_health_signals.md` — règle slow-down
- `feedback_session_protocol.md` — règles opérationnelles
- `reference_vercel_bypass.md` — secret bypass pour visual verification previews (pas nécessaire pour THI-110 — pas de changement UI)

---

## Trigger d'activation

Thierry dira probablement : **"ok, on démarre THI-110"**, **"suite du tuteur IA"**, ou **"enchaîne"**.

→ Répondre par l'exécution directe des étapes 1-2 ci-dessus. Demander confirmation avant : création de PR, push de branche, modification destructive.
