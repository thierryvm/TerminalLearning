# ADR-002 — BYOK 4-tiers avec OpenRouter prioritaire

**Date** : 17 avril 2026
**Statut** : Accepted
**Décideurs** : Thierry (owner), Claude (architecte)

## Contexte

Le projet cible des publics en reconversion et en formation (AVIQ, Forem, Bruxelles Formation, secondaires FWB), souvent sans budget pour une API LLM payante. Exiger une clé API payante Anthropic ou OpenAI = filtre social inacceptable. Par ailleurs, Terminal Learning est bénévole, 100% gratuit, et ne peut absorber les coûts IA côté serveur (risque financier direct pour un mainteneur en situation de fragilité).

OpenRouter est un gateway unifié qui :
- Expose plusieurs modèles gratuits (DeepSeek V3.1, Llama 3.3 70B, Gemini 2.0 Flash free, Qwen 2.5 72B)
- Offre du pay-as-you-go ultra bas (fractions de cent par requête)
- API compatible OpenAI SDK (drop-in remplacement)
- Rate limits permissifs sur les modèles free

## Décision

**Architecture BYOK (Bring Your Own Key) à 4 tiers, OpenRouter prioritaire :**

| Tier | Provider | Coût étudiant typique | Cible |
|------|----------|------------------------|-------|
| 0 · Free | OpenRouter free models | 0 € | Sans budget API (défaut) |
| 1 · Pay-as-you-go | OpenRouter payant | ~0.20-0.50 €/mois | Étudiant autonome |
| 2 · Pro direct | Anthropic / OpenAI / Google | $5-20/mois | Prof ou institution avec budget |
| 3 · Local | LM Studio / Ollama (URL custom) | 0 €, privacy max | Institution privacy-stricte |

### Principes d'implémentation
- **Un seul client SDK** — l'interface OpenAI-compatible d'OpenRouter permet un client unique (`fetch('/v1/chat/completions')`)
- **Détection automatique** du provider via préfixe de clé (`sk-or-v1-*` = OpenRouter, `sk-ant-*` = Anthropic, `sk-*` = OpenAI)
- **Picker de modèles dynamique** selon provider détecté
- **Zéro clé côté serveur** — aucun risque financier pour le mainteneur
- **Stockage client-side uniquement** (localStorage chiffré ou Supabase profile encrypted field, à arbitrer dans l'implémentation)

## Conséquences

### Positives
- Tuteur IA gratuit et accessible à 100% des étudiants (Tier 0)
- Aucun coût pour Terminal Learning — scalabilité infinie
- Code maintenance-friendly (un seul client SDK)
- Privacy-friendly (Tier 3 local pour institutions strictes)

### Négatives / risques
- Qualité pédagogique variable selon modèle choisi (Tier 0 < Tier 2)
- Dépendance à la disponibilité d'OpenRouter (SPOF si down)
- Onboarding étudiant = "crée un compte OpenRouter" (friction, mais documentable)

### Alternatives rejetées
- **Serveur Claude/OpenAI intégré par Terminal Learning** : risque financier inacceptable
- **Claude direct uniquement** : exclusion des apprenants sans budget API
- **Pas de tuteur IA** : différenciation 2026 perdue

## Sécurité
- `prompt-guardrail-auditor` agent obligatoire pour valider chaque system prompt socratique
- OWASP LLM Top 10 appliqué (prompt injection, insecure output, sensitive data)
- Stockage clé : jamais en clair, jamais en logs, jamais en Sentry

## Mémoires liées
- `project_platform_vision_v2.md`
- `project_ai_agent_byok.md` (existant — à mettre à jour)
