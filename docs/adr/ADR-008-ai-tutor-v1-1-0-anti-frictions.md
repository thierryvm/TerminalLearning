# ADR-008 — AI Tutor V1.1.0 — Anti-Frictions ChatGPT Cross-Validation

**Date** : 10 mai 2026
**Statut** : Proposed (implementation THI-144)
**Décideurs** : Thierry (owner), Claude (architecte), @cowork (orchestrateur), ChatGPT (cross-validateur externe)

---

## Contexte

V1.0.0 (PR #188) a livré le tuteur IA BYOK end-to-end (sanitizer, 4 providers, panel, 287 tests). V1.0.1 (THI-148, PR #208) a étendu le scope aux questions méta-plateforme via un bloc `<platform_context>` statique. Verdict empirique du 4 mai 2026 (Haiku 4.5 sur 5 tests qualitatifs) : **9.3/10**, classe la qualité globale comme excellente.

Cependant, une session 8 tours @thierry sur la leçon Redirection/Pipes (5 mai 2026), cross-validée par ChatGPT, a identifié **5 micro-frictions** dans la pédagogie produite. La 5ᵉ (`platformContext` absent) est résolue par THI-148. Les **4 résiduelles** ne viennent pas du modèle (Haiku résout les bugs visibles : hallucinations, jailbreaks, bascule mode direct sur frustration), elles viennent du **system prompt v1.0.0/v1.0.1** qui demande au tuteur d'être thorough et qui le fait juste un peu trop.

C'est nous qui avons écrit la consigne. C'est à nous de l'affiner.

## Décision

**Bump `tutor/v1.0.1` → `tutor/v1.1.0`** en one-shot package "anti-frictions" couvrant les 4 ajustements sémantiquement liés (tone & flow), en frozen pattern. Création d'un nouveau fichier `src/lib/ai/prompts/tutor-v1.1.0.ts` — pas d'édition in-place de v1.0.1 (rollback safety + git blame propre).

### Friction 1 — Compound questions interdites

- **Observation** : tuteur pose 2-3 questions guidantes dans un même tour, l'apprenant perd les sous-parties.
- **Règle v1.1.0** (mode socratic) : "Pose une seule question guidante à la fois. Si l'apprenant a posé plusieurs sous-questions, traite-les une par une avec des bullets numérotés, en gardant une question guidante par bullet."
- **Cohérence** : aligné avec le mode socratique — guider sans noyer.

### Friction 2 — Sur-explication des mécaniques internes réfrénée

- **Observation** : tuteur explique le fonctionnement interne du shell (pipe buffering, file descriptors) quand l'apprenant veut juste savoir "comment faire X".
- **Règle v1.1.0** (les 2 modes) : "Concentre-toi sur le comment demandé. L'explication pourquoi (mécaniques internes du shell) vient APRÈS, uniquement si l'apprenant la demande explicitement."
- **Trade-off** : pédagogie socratique conservée, mais hiérarchie comment > pourquoi explicite.

### Friction 3 — Indices répétés interdits

- **Observation** : tuteur répète le même indice quand l'apprenant essaie une variation (rounds 5+6 de la session test).
- **Règle v1.1.0** (mode socratic) : "Si tu as déjà donné une hint à l'apprenant et qu'il essaie une variation, n'offre pas la même hint deux fois. Reformule l'angle, ou bascule en mode direct si tu détectes la répétition."
- **Cohérence** : compose avec la frustration heuristic existante (`useAiTutor.ts:184-190` détecte 2 réponses socratic consécutives et propose le mode direct via toast UI).

### Friction 4 — Conclusion ouverte interdite si apprenant satisfait

- **Observation** : tuteur termine systématiquement par une question, même quand l'apprenant a explicitement signalé qu'il avait compris (« merci », « ok je vois », « j'ai compris », « parfait »).
- **Règle v1.1.0** (les 2 modes) : "Si l'apprenant exprime de la satisfaction (« merci », « ok je vois », « j'ai compris », « parfait »), conclus avec un résumé d'1 phrase au lieu d'une question."
- **Cohérence** : respecte les signaux de fin de cycle pédagogique. S'applique aux deux modes — la consigne par défaut "follow-up question to anchor" cède face au signal de satisfaction.

### Eval suite hybride (Q2 tranchée 10 mai)

- **(a) `src/test/ai/evalSuite.test.ts`** — mock fetch + assertions structurelles sur le prompt généré. Gate régression CI, coût $0, exécuté à chaque PR.
- **(b) `scripts/eval-tutor.ts`** — script manuel + vrai Haiku 4.5 via OpenRouter clé env personnelle (cohérent avec ADR-002 BYOK pur — pas de clé serveur). Exécuté avant chaque bump prompt. Budget : 10-15 prompts × 1 modèle ≈ <$0.10. Pas en CI (coût tokens + clé serveur évitée).
- **Discipline** : (a) vérifie que le prompt **structurel** est correct, (b) vérifie que le **comportement empirique** du modèle change comme attendu. Ni l'un ni l'autre n'est suffisant seul. Les deux tournent avant ouverture de PR THI-144.

---

## Sécurité

### Audit guardrail mandatory (Règle 10 ADR-005)

- **`prompt-guardrail-auditor`** sur tutor-v1.1.0 — bump prompt = retest jailbreak obligatoire.
- 44 fixtures jailbreak existantes (`src/test/ai/injection-fixtures.test.ts`) doivent rester rejetées.
- Pattern THI-148 : findings CRITICAL/MEDIUM appliqués dans le même commit, pas une PR séparée.

### Quick-win bundled : R1 (M4-AI LOW VERIFIED)

L'audit re-baseline `llm-security-auditor` du 10 mai PM (9.0/10 confirmé) a identifié **M4-AI** : asymétrie entre `KEY_PATTERNS` dans `sanitizer.ts:181-185` (4 providers spécifiques) et le scrubber Sentry `generic_api_key` fallback (`sentry.ts:25` + `api/sentry-tunnel.ts:37`). Si le LLM hallucine une clé Mistral / Groq / Cohere / Together / xAI dans une réponse, `sanitizeModelChunk` ne la redacte pas alors que Sentry et le tunnel oui.

- **Mitigation** : ajouter `/sk-[A-Za-z0-9_-]{20,}/g` en fallback APRÈS les 4 patterns spécifiques de `sanitizer.ts:KEY_PATTERNS` + 2 tests `sanitizer.test.ts` (1 strip Mistral hypothétique + 1 préserve `sk-` bare).
- **Effort** : 30 min, gain estimé +0.1 (trajectoire 9.0 → 9.1).
- **Co-located commit dédié** : `fix(security): generic key pattern fallback (M4-AI LOW VERIFIED)` dans la PR THI-144 (touche déjà `src/lib/ai/*`, scope cohérent).

### Frozen pattern (rollback safety)

- `prompts/tutor-v1.0.0.ts` et `tutor-v1.0.1.ts` ne sont **jamais édités**. v1.1.0 = nouveau fichier, dispatché par `systemPrompt.ts`.
- Si v1.1.0 introduit une régression non détectée par eval suite (a)+(b), le rollback est trivial : revert un seul commit qui change `TUTOR_PROMPT_VERSION` et le dispatch.

---

## Conséquences

### Positives
- 4 frictions sémantiquement liées résolues en un seul bump (un audit guardrail + une eval suite + une PR au lieu de 4)
- Frozen pattern v1.0.0/v1.0.1 préservé (rollback safety, git blame propre)
- Eval suite hybride (a)+(b) en place pour les bumps futurs (réutilisable v1.2.0+)
- Trajectoire `llm-security-auditor` 9.0 → 9.1 absorbée dans la même PR (M4-AI fallback bundled)

### Négatives / risques
- 4 frictions corrigées simultanément = surface de test plus large, risque de régression non-détectée par eval suite si elle n'est pas représentative.
- **Mitigation** : eval suite (a) couvre minimum 2 cas par friction (8/15 questions sur les frictions, 7/15 sur cas pédagogiques standards). Eval suite (b) capture le diff comportemental empirique sur Haiku.
- **Garde-fou ship** : si eval suite (b) révèle régression sur une friction → on ne ship pas v1.1.0, on découpe en patches v1.0.2 → 1.0.5.

### Alternatives rejetées
- **Découpage v1.0.2 → 1.0.5 (4 patches successifs)** : noise dans CHANGELOG, 4 audits guardrail, 4 eval suites — pour 4 frictions sémantiquement liées (toutes "tone & flow"), surcoût sans bénéfice.
- **Édition in-place de tutor-v1.0.1.ts** : rollback impossible, git blame pollué, contredit la convention frozen établie depuis v1.0.0.
- **Eval suite (a) seulement** : évalue le PROMPT pas le MODÈLE — angle aveugle sur la qualité empirique réelle.
- **Eval suite (b) seulement** : pas de gate régression CI — un futur bump pourrait casser l'eval mock structurel sans qu'on s'en aperçoive.
- **Reporter THI-144 V2** : Haiku 9.3/10 résout 80% des bugs, mais les 20% résiduels sont précisément ce qui crée la friction perçue. ROI : ~5h pour passer de 8.0 à 9.5 perçu = excellent.

---

## Séquence d'exécution

1. ✅ ADR-008 rédigé (ce document)
2. Eval suite (a) `src/test/ai/evalSuite.test.ts` : mock fetch + 10-15 assertions structurelles (corpus baseline avant bump = v1.0.1)
3. Eval suite (b) `scripts/eval-tutor.ts` : corpus 10-15 questions (4 patterns frictions × 2 cas + 6-7 patterns pédagogiques standards)
4. Implémenter `src/lib/ai/prompts/tutor-v1.1.0.ts` (4 langues × 2 modes, frozen pattern, 4 frictions intégrées)
5. Bump `TUTOR_PROMPT_VERSION = 'tutor/v1.1.0'` + dispatch v1.1.0 dans `systemPrompt.ts`
6. Update snapshots `systemPrompt.test.ts.snap` (`vitest -u`) + assertions micro-frictions
7. **Quick-win bundled** : fix M4-AI dans `sanitizer.ts:KEY_PATTERNS` + 2 tests
8. Run eval suite (a) sur v1.1.0 → assert régression structurelle = 0
9. Run eval suite (b) manuel sur Haiku → comparer baseline v1.0.1 → si régression sur une friction, corriger v1.1.0
10. Audit `prompt-guardrail-auditor` → fix CRITICAL/MEDIUM dans même commit (pattern THI-148)
11. Type-check + lint + build OK
12. PR THI-144 → review @thierry → validation empirique 5-6 prompts manuels Vercel preview
13. Merge → re-baseline `llm-security-auditor` (cible 9.1+/10 avec M4-AI fermé)

---

## Mémoires liées

- `project_thi144_pending_prompt.md` (V1.5 backlog, name field corrigé ADR-008 dans PR #220)
- `feedback_finish_what_started.md` (Phase 7b lockdown séquence — THI-148 → THI-144 → THI-112 → THI-113)
- `feedback_llm_hallucinations_inter_phrase.md` (eval suite qualitative obligatoire avant bump prompt)
- `feedback_frustration_heuristic_window.md` (compose avec règle 3 — indices répétés peut bascule mode direct)
- ADR-002 (BYOK pur — clarifie que `scripts/eval-tutor.ts` utilise une clé personnelle dev, jamais serveur)
- ADR-005 (gate `prompt-guardrail-auditor` mandatory post-bump — Règle 10)
- `docs/security-audit-log.md` re-baseline 10 mai PM (M4-AI fix bundled, R1 trajectoire 9.0 → 9.1)
