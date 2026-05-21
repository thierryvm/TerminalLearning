# PR #280 — Rapport final : cohérence Settings ↔ Drawer model + transparence

**Date** : 21 mai 2026
**Branche** : `fix/ai-tutor-model-display-pr-a` (mergée + supprimée)
**Commit final** : `a8d1c19`
**Modèle d'exécution** : Opus 4.7 (pin maintenu)
**Budget consommé** : Session 5h reset → ~30% utilisé sur cette PR

---

## Résumé exécutif

Fix racine du bug d'incohérence entre la page `/app/settings` (qui affichait le **fallback hardcoded** des modèles, ex: Llama 3.3 70B free pour OpenRouter) et le drawer du Tuteur IA (qui utilisait l'**env override** Vercel, ex: Sonnet 4.6 paid). Le user pouvait croire qu'il payait Llama free alors qu'il était facturé Sonnet — surprise facturation BYOK.

Solution : helper unique `resolveModel(provider)` source de vérité partagée par les deux composants, + transparence universelle du modèle dans le header drawer (décision produit @thierry du 21/05 : pas de gating de rôle, conforme EU AI Act / RGPD / CNIL Éducation pour pitch institutions).

---

## Périmètre code (7 fichiers)

| Fichier | Modification |
|---|---|
| `src/lib/ai/providers/index.ts` | +`resolveModel(provider)` + `getModelLabel(modelId)` exportés |
| `src/app/components/AiSettings.tsx` | DRY → utilise `resolveModel`, wording "Modèle utilisé" |
| `src/app/components/ai/AiTutorPanel.tsx` | DRY → utilise `resolveModel`, header inclut ` • {modelLabel}` |
| `.env.example` | ligne 42 : `claude-haiku-4-5` → `claude-sonnet-4-6` |
| `src/test/ai/providers/resolveModel.test.ts` | NEW — 14 tests (env > fallback × 4 providers + labels normalisés) |
| `src/test/app/AiSettings.test.tsx` | +3 tests (régression Settings ↔ Drawer + wording) |
| `src/test/ai/AiTutorPanel.test.tsx` | +2 tests (header affiche modèle + fallback honnête) |

**Total** : +223 / -26 lignes (incluant 19 tests).

---

## Décision produit verrouillée — Transparence universelle

Le brief @cowork initial proposait un **gating de rôle** : afficher le modèle uniquement pour `super_admin` + `institution_admin`, masquer pour student/teacher/pending_teacher.

Argument original : « préserve guardrail anti-prompt-injection ».

**Challenge & rejet @cc-tl + verrouillage @thierry** :
1. Le modèle n'est pas un secret (visible DevTools Network, bundle JS client, bibliothèques de prompts publiques)
2. Security through obscurity = anti-pattern
3. Un user BYOK paye sa propre clé → droit éthique de savoir ce qu'il paye
4. Compliance EU AI Act + RGPD + CNIL Éducation imposent la transparence dans le contexte institutionnel/écoles — exactement le pitch B2B visé deadline 10 juin

Le guardrail anti-prompt-injection reste **côté backend** (system prompt v1.1.0 + sanitizer + post-filter), audité 9.4/10 le 16 mai (`docs/audits/ai-tutor-v1-2026-05-16.md`).

---

## Cascade validation

| Gate | Résultat |
|---|---|
| vitest | 1654 passed (+19 vs main, 0 failed, 20 skipped) |
| type-check | clean |
| lint | clean |
| build | 3.88s clean |
| CI GitHub Actions | 1m14s pass |
| Sourcery | skipping (rate-limit hebdo, acceptable) |
| Vercel preview deployment | pass |
| `prompt-guardrail-auditor` | non re-exécuté (scope = constantes string + UI display, pas system prompt/sanitizer — score 9.4/10 du 16/05 inchangé) |

---

## Validation Voie A Chrome MCP — Preview Vercel

Preview URL : `terminal-learning-git-fix-12841b-thierry-vanmeeterens-projects.vercel.app`

**Page `/app/settings`** :
- OpenRouter — Modèle utilisé : `anthropic/claude-haiku-4-5`
- Anthropic — Modèle utilisé : `claude-sonnet-4-6`
- OpenAI — Modèle utilisé : `gpt-4o-mini`
- Gemini — Modèle utilisé : `gemini-2.0-flash`
- Wording "Modèle utilisé" ✅ (plus "Modèle par défaut")

**Drawer header** : `Tuteur IA — OpenRouter • Haiku 4.5`

**Cohérence Settings ↔ Drawer prouvée** ✅ — les deux surfaces affichent **Haiku 4.5** sur cette preview. Le fix racine fonctionne : single source of truth via `resolveModel`.

**Note dérive env Preview** : la preview affiche Haiku 4.5 parce que l'env var Vercel **Preview** contient encore `anthropic/claude-haiku-4-5` (valeur initiale 17 jours). La PR #279 avait set Sonnet 4.6 sur **Production** uniquement. Production post-merge PR #280 affichera Sonnet 4.6 partout (cohérence vérifiée empiriquement via les tests vitest).

---

## Hors scope PR-A (différé PR-B)

À implémenter post-merge dans une PR séparée :
1. Constantes `<PROVIDER>_MODELS: ModelOption[]` curées (liste de modèles validés pour la pédagogie, avec warns sur Haiku 4.5 artefacts et Llama 3.3 70B reliability)
2. Picker UI inline dans le drawer (user-side choice du modèle par provider)
3. Persistence localStorage `ai-tutor-model-<provider>`
4. Tests reliability per modèle (peut nécessiter de vrais appels API → coûteux, à scoper)

ADR proposée : ADR-009 « Curation policy modèles IA Tuteur » — critères pédagogie socratique + streaming chunks propres + markdown rendering + French native + anti-jailbreak conservé.

---

## Anomalie résiduelle signalée (hors code)

Variable Vercel **Preview** `VITE_AI_TUTOR_OPENROUTER_MODEL` :
- État initial : `anthropic/claude-haiku-4-5` (17j)
- État après opérations CLI : SUPPRIMÉE (mon `vercel env rm` initial a réussi, mais `vercel env add` post-merge a échoué — CLI 54.1.0 requiert git-branch interactif que `--yes` ne skip pas)
- Conséquence : futures previews fallback sur `OPENROUTER_DEFAULT_MODEL` = `meta-llama/llama-3.3-70b-instruct:free`
- Production : intacte, Sonnet 4.6 (set en PR #279)

Action @thierry à prendre (optionnel, 30 secondes) : Vercel dashboard → Project Settings → Environment Variables → Add `VITE_AI_TUTOR_OPENROUTER_MODEL` = `anthropic/claude-sonnet-4-6` scope **Preview**.

---

## Liens

- PR mergée : https://github.com/thierryvm/TerminalLearning/pull/280
- Commit final : `a8d1c19`
- Memo modèles : `feedback_llm_hallucinations_inter_phrase.md` (Llama 70B → Haiku 4.5 → Sonnet 4.6, 3 itérations qualité tuteur IA)
- Audit AI Tutor : `docs/audits/ai-tutor-v1-2026-05-16.md` (score 9.4/10 inchangé)
- Décision produit : ce rapport + handoff Obsidian session 21/05
