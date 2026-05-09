# Mini-prompt de reprise — THI-144 (system prompt v1.1.0 + ADR-008 + eval suite)

> **Pour la prochaine session CC TL** : copier ce fichier dans le contexte au démarrage, ou pointer ce path. Conçu pour absorber tout le contexte THI-144 sans recharger l'historique de la session 2026-05-09.
>
> Si VS Code a tué la TodoList ou si /compact a dilué le contexte : ce fichier est la source de vérité authoritative pour la reprise.

## État au 9 mai 2026 (clôture session)

- **Branche `feature/thi-148-platform-context`** ouverte sur PR [#208](https://github.com/thierryvm/TerminalLearning/pull/208), CI verte attendue, Vercel preview à valider empiriquement par @thierry. Status Linear THI-148 = `In Review`.
- **Branche `docs/sprint-1-thi-148-shutdown`** porte ce mini-prompt + maj CHANGELOG / plan / ROADMAP / STORY (PR séparée).
- `main` HEAD au démarrage de la prochaine session : vérifier si #208 est mergée. Si oui, `git pull origin main` avant de brancher THI-144. Si non, attendre validation empirique @thierry et merge avant d'attaquer THI-144 (cohérence prompt v1.0.1 → v1.1.0).
- Vitest baseline : **1291 passed** (post-#208 merge).

## Scope verrouillé THI-144

| Livrable | Contraintes |
|---|---|
| **Nouveau fichier** `src/lib/ai/prompts/tutor-v1.1.0.ts` | Frozen pattern v1.0.0/v1.0.1. Ne PAS éditer in-place les versions précédentes (rollback safety + git blame propre). |
| **Bump** `TUTOR_PROMPT_VERSION` → `'tutor/v1.1.0'` dans `systemPrompt.ts` | Bump MINOR — c'est un changement comportemental majeur (anti-frictions, pas juste scope). |
| **ADR-008** (PAS ADR-007 — déjà pris par solo-maintainer-sustainability) | Le scope ADR couvre les 5 micro-frictions ChatGPT cross-validation + le system prompt v1.1.0 + l'eval suite. |
| **Eval suite 10-15 questions** | Corpus reproductible. Format à choisir au démarrage (JSON fixtures + script vitest dédié `src/test/ai/evalSuite.test.ts` ?). Doit pouvoir tourner en CI ET localement avec un vrai modèle (Haiku 4.5 via OpenRouter clé env). |
| **Snapshots regenerated** | Tous les `systemPrompt.test.ts` snapshots invalidés par v1.1.0. Update assertions + snapshots (vitest -u). |
| **44 injection-fixtures inchangées** | Refusals block doit rester verbatim. Si v1.1.0 modifie le wording des refusals, prévoir update fixtures + audit guardrail double. |
| **Audit `prompt-guardrail-auditor` mandatory** (Règle 10 ADR-005) | Bump prompt = re-test jailbreak obligatoire. Pattern THI-148 : appliquer fix CRITICAL/MEDIUM dans le même commit (Règle 1 working_discipline_rules). |

## Décisions héritées de THI-148 V1.0.1 (orientent v1.1.0)

1. **Format du `<platform_context>` block stabilisé** : structural English (deterministic, snapshot-friendly), 6 lignes max + liste modules. Le LLM gère traduction. v1.1.0 NE doit PAS modifier ce format sans bump majeur.
2. **TRUST BOUNDARY documentée** : `lessonContext` + `platformContext` = curriculum data only. Si v1.1.0 ajoute `userProgress` (THI-142 V1.5 territoire), il FAUT un nouveau consent block + ADR séparé (probablement ADR-009).
3. **`escapeDelimiters()` exporté + DELIMITER_RX étendu** : tout nouveau bloc XML injecté dans le user message DOIT être ajouté au regex et passer par `escapeDelimiters()` côté builder.
4. **Defense-in-depth obligatoire** : audit guardrail-auditor a remonté C1 (escapeDelimiters platformContext) avant THI-148 merge. v1.1.0 doit anticiper le même finding sur tout nouveau bloc/champ.
5. **Out-of-scope refusal list** v1.0.1 : `médecine, droit, finance, code offensif, langages de programmation hors-scope leçon, données personnelles, météo, actualité, opinions politiques`. v1.1.0 peut ÉTENDRE cette liste mais NE doit PAS la réduire.

## Les 5 micro-frictions à intégrer (ChatGPT cross-validation 8 tours @thierry)

Tracées dans plan.md ligne 4. Sans ce mini-prompt, ces 5 sont à recharger à la main — **c'est précisément le coût du recovery que ce fichier évite** :

1. **Compound questions** — le tuteur traite une question multi-part comme une seule, perd les sous-parties. Mitigation v1.1.0 : ajouter une instruction explicite "si la question contient plusieurs sous-questions, réponds-y une par une avec des bullets numérotés".
2. **Sur-explication internal mechanics** — explique trop le fonctionnement interne du shell quand l'apprenant veut juste savoir "comment faire X". Mitigation : "concentre-toi sur le 'comment' demandé, l'explication 'pourquoi' vient APRÈS si l'apprenant la demande explicitement".
3. **Indices répétés** — répète la même hint d'une question à l'autre quand l'apprenant essaie une variation. Mitigation : "n'offre jamais deux fois la même hint à l'apprenant — varie la formulation ou bascule en mode direct si tu détectes la répétition".
4. **`platformContext` absent (confirme THI-148)** — déjà résolu par THI-148 V1.0.1.
5. **Conclusion ouverte** — termine systématiquement par une question, même quand l'apprenant a explicitement signalé qu'il avait compris. Mitigation : "si l'apprenant exprime de la satisfaction (« merci », « ok je vois », « j'ai compris »), conclus avec un résumé d'1 phrase au lieu d'une question".

## 3 questions ouvertes à clarifier avec @thierry au démarrage

1. **Numérotation ADR** : on confirme **ADR-008** pour THI-144 (puisque ADR-007 = solo-maintainer-sustainability déjà existant et toujours en `Proposed`) ? Ou on bascule l'ADR existant en `Accepted/Implementing` et on prend ADR-008 ? Vérifier aussi que plan.md / ROADMAP.md / mémoires CC qui mentionnent "ADR-007" pour THI-144 sont corrigés en "ADR-008". *Risque si pas clarifié : doc drift permanent entre les références passées (qui pointent ADR-007) et le fichier réellement créé.*

2. **Format eval suite** : 3 options sur la table.
   - (a) `src/test/ai/evalSuite.test.ts` avec mock fetch + assertions sur réponses attendues (rapide, CI-friendly, mais évalue le PROMPT pas le MODÈLE).
   - (b) `scripts/eval-tutor.ts` lancé manuellement avec vrai modèle Haiku 4.5 + clé env (cher, lent, mais évalue le système entier).
   - (c) Hybride : (a) en CI pour régression structurelle + (b) en local manual avant chaque bump prompt.
   *@thierry doit trancher selon budget tokens disponible et fréquence des bumps anticipée.*

3. **Scope v1.1.0 vs v1.0.2** : les 5 micro-frictions sont-elles toutes shippées en une fois (v1.1.0 = "AI Tutor Anti-Frictions Pack") ou découpées en plusieurs bumps mineurs (v1.0.2 → 1.0.5 → 1.1.0) ? *Avantage one-shot : un seul audit guardrail-auditor + une seule eval suite à valider. Avantage découpage : rollback granulaire si une friction casse + validation empirique étape par étape.*

## Ordre d'attaque recommandé (ne pas dévier sans @thierry)

1. **Clarifier les 3 questions ouvertes ci-dessus avec @thierry** (5 min) — bloque tout le reste si non résolu.
2. **Créer ADR-008** d'abord, AVANT toute ligne de code. ADR contient : contexte (5 micro-frictions + verdict empirique Haiku 9.3/10), décisions par friction, alternatives écartées, conséquences. Pattern ADR-005.
3. **Concevoir l'eval suite** AVANT v1.1.0 (TDD-light) : écrire le corpus 10-15 Q d'abord, run avec v1.0.1 (baseline), capturer les scores avant bump.
4. **Implémenter v1.1.0** en patchant le scope/refusals/socratic blocks selon ADR-008. Garder le pattern `PromptSections` 4 langues.
5. **Run eval suite** sur v1.1.0, comparer scores avec baseline. Si régression sur une friction, corriger v1.1.0.
6. **Audit `prompt-guardrail-auditor`** mandatory. Pattern THI-148 : findings CRITICAL/MEDIUM appliqués dans le même commit.
7. **PR + validation empirique @thierry** : 5-6 prompts manuels sur Vercel preview (cf. les 5 frictions, vérifier qu'elles sont absorbées).

## Estimation honnête

| Étape | Temps |
|---|---|
| Clarification 3 questions ouvertes | 15 min |
| ADR-008 rédaction | 1h |
| Eval suite design + corpus 10-15 Q | 1h |
| v1.1.0 patching FR/NL/EN/DE (5 frictions × 4 langues) | 1h |
| Tests update (snapshots + assertions micro-frictions) | 45 min |
| Audit guardrail + fix éventuel | 30 min |
| PR + validation empirique | 30 min |
| **Total** | **~5h** (était estimé 4-6h dans plan.md, OK) |

## Files à toucher (prévision)

- NEW `docs/adr/ADR-008-ai-tutor-v1-1-0-anti-frictions.md` *(nom à valider Q1)*
- NEW `src/lib/ai/prompts/tutor-v1.1.0.ts`
- MOD `src/lib/ai/systemPrompt.ts` (bump version + dispatch)
- NEW `src/test/ai/evalSuite.test.ts` (ou autre selon Q2)
- MOD `src/test/ai/systemPrompt.test.ts` (assertions v1.1.0 + snapshots)
- MOD `src/test/ai/__snapshots__/systemPrompt.test.ts.snap` (regenerated)
- MOD `docs/plan.md` ligne 4 (référence ADR-008, marquer THI-144 done)
- MOD `docs/ROADMAP.md` (Phase 7c progress)
- MOD `CHANGELOG.md` (section THI-144)
- MOD `STORY.md` (narratif court)

Si la migration des références "ADR-007" → "ADR-008" est validée Q1, ajouter dans la PR : MOD `plan.md` (lignes citées), MOD `ROADMAP.md`, MOD mémoires CC `project_*.md` qui pointent ADR-007.

## Liens utiles

- ADR-005 (AI Tutor V1 implementation) : `docs/adr/ADR-005-ai-tutor-v1-implementation.md` — pattern à suivre pour ADR-008
- ADR-006 (LTI 1.3) : `docs/adr/ADR-006-lti-1-3-implementation.md` — référence Phase 7c, **pas** lié à THI-144 directement
- ADR-007 (solo-maintainer-sustainability) : `docs/adr/ADR-007-solo-maintainer-sustainability.md` — **NE PAS écraser**
- THI-148 PR : https://github.com/thierryvm/TerminalLearning/pull/208 — référence pattern v1.0.1 frozen
- THI-148 audit guardrail finding C1 (escapeDelimiters) : verdict 8.8/10 → full PASS post-fix, archivé dans le commentaire PR + memo `feedback_finish_what_started.md`
- Linear THI-144 : https://linear.app/thierryvm/issue/THI-144 — scope original
- Memo CC `feedback_finish_what_started.md` : règle "fermer une phase avant d'en ouvrir une nouvelle"
- Memo CC `project_lti_spike_state.md` : NE PAS confondre Phase 7b (en cours) avec Phase 7c LTI (sprint suivant)

## Garde-fou

- ❌ **NE PAS modifier `tutor-v1.0.0.ts` ni `tutor-v1.0.1.ts`** — versions frozen, rollback safety.
- ❌ **NE PAS injecter `userProgress` dans `<platform_context>`** — c'est THI-142 V1.5 + ADR-009, pas THI-144.
- ❌ **NE PAS sauter l'audit guardrail-auditor** — bump prompt sans audit = violation Règle 10 ADR-005.
- ❌ **NE PAS toucher `feature/lti-spike` ni le code `api/lti/launch.ts`** — Phase 7c, pas Sprint 1.
- ✅ **Toujours sur branche `feature/thi-144-system-prompt-v1-1-0`** depuis main à jour.
- ✅ **Validation empirique @thierry obligatoire** avant merge — préciser dans PR : 5-6 prompts manuels sur les 5 frictions.

---

*Fichier généré le 9 mai 2026 par CC TL en clôture de session post-THI-148. Ne pas dater au-delà de THI-144 done — supprimer après merge THI-144 ou archiver dans `docs/sessions/archive/`.*
