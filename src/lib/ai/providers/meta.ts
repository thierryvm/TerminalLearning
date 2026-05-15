/**
 * Provider display metadata — single source of truth.
 *
 * Centralises the human-facing labels, prefix hints and quick-help
 * blurbs that the three onboarding surfaces share:
 *
 *  - `AiTutorPanel` (provider picker header, key entry prefix)
 *  - `AiKeySetup` (provider hint paragraph above the key input)
 *  - `AiSettings` (per-row provider name)
 *
 * Before this module these three constants were duplicated inline
 * inside each consumer; adding a provider or renaming a label meant
 * editing the same dictionary in three places, with the obvious risk
 * of drift (Sourcery review on PR #228, 11 May 2026). Now every
 * surface imports from here; one edit, three updates.
 *
 * Keep the keys strictly in sync with the `Provider` union in
 * `keyManager.ts` — the `Readonly<Record<Provider, string>>` typing
 * makes a missing key a compile error.
 */
import type { Provider } from '../keyManager';

export const PROVIDER_LABELS: Readonly<Record<Provider, string>> = {
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
};

export const PROVIDER_PREFIX_HINT: Readonly<Record<Provider, string>> = {
  openrouter: 'sk-or-v1-…',
  anthropic: 'sk-ant-…',
  openai: 'sk-…',
  gemini: 'AIza…',
};

export const PROVIDER_QUICK_HELP: Readonly<Record<Provider, string>> = {
  openrouter:
    '🔄 Hub multi-providers — modèles `:free` gratuits (Llama 3.3 70B par défaut, GPT-OSS 20B…). Recommandé pour débuter.',
  anthropic:
    '🧠 Claude (Anthropic) — raisonnement haute qualité, excellent en code. Crédit Anthropic requis.',
  openai:
    '⚠️ OpenAI direct refuse les requêtes navigateur (CORS). Préfère OpenRouter pour accéder à GPT-4o-mini & co.',
  gemini:
    '✨ Gemini (Google) — quota gratuit généreux (Gemini 2.0 Flash). Crédit Google AI Studio requis.',
};
