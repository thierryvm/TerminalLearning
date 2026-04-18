# Next Session Plan — 18-19 avril 2026 (chaîne ADR-005 AI Tutor V1)

> Fichier lu automatiquement par `session-kickoff.md` étape 5.
> À supprimer ou archiver une fois la chaîne ADR-005 close (post-merge THI-113).
> Créé : 18 avril 2026 après merge PR #151 (THI-115 Done).

---

## Contexte d'entrée

Session précédente (18 avril 2026) : PR #151 mergée, THI-115 Done. `docs/plan.md` Phase 7b + ADR-005 alignés sur la nouvelle architecture BYOK 4-tiers OpenRouter (ADR-002). La chaîne d'implémentation AI Tutor V1 est débloquée — le gate zéro est **THI-109** (aucune dépendance entrante).

**Scope prochaine session** : démarrer THI-109 (agent `prompt-guardrail-auditor`) pour poser le test harness AVANT la première ligne de code fonctionnel.

---

## Étape 1 — Checks santé (obligatoire, protocole standard)

Exécuter `session-kickoff.md` étapes 1 à 7. Si signal rouge santé → **stop**, proposer scope réduit.

---

## Étape 2 — Démarrer THI-109 (gate zéro ADR-005)

**Issue** : [THI-109 — Agent prompt-guardrail-auditor (pre-implementation gate)](https://linear.app/thierryvm/issue/THI-109/agent-prompt-guardrail-auditor-pre-implementation-gate)

### Livrables

- Nouveau fichier `.claude/agents/prompt-guardrail-auditor.md` avec :
  - Frontmatter : `model: haiku`, `tools: Read, Grep, Glob`
  - Batterie de patterns d'injection connus (jailbreaks, prompt leaks, system prompt overrides, "ignore previous instructions", base64/unicode, role-play subversif)
  - Analyse future `src/lib/ai/systemPrompt.ts` → détecte instructions faibles, absence de role enforcement
  - Analyse future `src/lib/ai/sanitizer.ts` → détecte bypass triviaux
  - Analyse future `AiTutorPanel.tsx`, `AiHintBubble.tsx` → rendu réponse LLM (anti-XSS)
  - Rapport : CRITICAL (bloque merge) / WARNINGS / RECOMMENDATIONS
- Mention dans `CLAUDE.md` projet (section Agents disponibles)
- Test à blanc sur le repo actuel (aucun composant AI encore) → l'agent doit retourner "No AI components found, ready to audit once implementation starts"

### Critères de merge

- CI verte (type-check + lint + test + build)
- Sourcery OK (ou SKIPPED rate limit acceptable)
- **Preview Vercel pas nécessaire** (agent = fichier markdown, zéro changement visuel)
- Branche : `feature/thi-109-prompt-guardrail-auditor`
- Passer THI-109 en **In Review** dès PR push, puis **Done** au merge

### Dépendances

- Aucune — c'est le gate zéro.

### Débloque

- THI-110 (key manager V1) → THI-111 (AiTutorPanel) → THI-112 (onboarding) → THI-113 (audit final) → merge Phase 7b
- THI-114 (Web Worker isolation V1.5) — post-ship

---

## Étape 3 — Vérification finale

Après merge THI-109 :

- [ ] Passer THI-109 → Done dans Linear
- [ ] Mettre à jour `docs/plan.md` Phase 7b step 1 : ✅
- [ ] Mémoire `project_ai_agent_byok.md` : séquence step 2 marquée "Done"
- [ ] `CLAUDE.md` projet : THI-109 ajouté en ✅
- [ ] Demander à Thierry : démarrer THI-110 ou pause ?

---

## Chaîne ADR-005 complète (référence)

| ID | Titre | Statut 2026-04-18 | Priorité | Dépend de |
|---|---|---|---|---|
| THI-109 | Agent prompt-guardrail-auditor | Backlog | High | — |
| THI-110 | Key manager V1 | Backlog | High | THI-109 |
| THI-111 | AiTutorPanel + providers + system prompt + sanitizer | Backlog | High | THI-110 |
| THI-112 | Onboarding IA — AiKeySetup + AiConsentModal | Backlog | Medium | THI-111 |
| THI-113 | Audit final Tuteur IA | Backlog | High | THI-112 |
| THI-114 | V1.5 — Web Worker isolation keyManager | Backlog | Low | THI-113 (post-ship) |

---

## Mémoires prioritaires à recharger en début de session

- `project_ai_agent_byok.md` — **source de vérité** ADR-002 + ADR-005
- `feedback_doc_alignment.md` — règle doc alignment systématique
- `user_health_signals.md` — règle slow-down
- `feedback_session_protocol.md` — règles opérationnelles
- `reference_vercel_bypass.md` — secret bypass pour visual verification previews

---

## Trigger d'activation

Thierry dira probablement : **"ok, on démarre THI-109"** ou **"suite de l'AI Tutor"**.

→ Répondre par l'exécution directe des étapes 1-2 ci-dessus. Demander confirmation avant : création de PR, push de branche, modification destructive.
