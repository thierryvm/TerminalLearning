/**
 * Models the learner can pick per provider, and the stored choice.
 *
 * Extends the existing `resolveModel` mechanism (see `./index.ts`) instead of
 * adding a second one: `resolveModel(provider)` reads the stored choice first,
 * then the deploy-time env override, then the provider default.
 *
 * Rules:
 *  - The FIRST entry of each list is the provider default (asserted by tests
 *    against the provider's `*_DEFAULT_MODEL` constant).
 *  - Only ids listed here can be stored. A stored value that is not in the
 *    list (a model Google or Anthropic has shut down since, a hand-edited
 *    value) is removed and the default applies again.
 *  - Providers without a list (OpenAI) keep the env override / default only.
 *
 * The choice is not a secret: it lives in plain localStorage under
 * `MODEL_KEY_PREFIX + provider`, and `clearAiSessionData()` removes it at
 * signout like the selected provider.
 *
 * Model ids and prices were checked on 9 November 2026:
 *  - Gemini: https://ai.google.dev/gemini-api/docs/models and
 *    https://ai.google.dev/gemini-api/docs/pricing
 *  - Anthropic: https://platform.claude.com/docs/en/about-claude/models/overview
 *  - OpenRouter: GET https://openrouter.ai/api/v1/models
 */
import { MODEL_KEY_PREFIX, type Provider } from '../keyManager';
import { ANTHROPIC_DEFAULT_MODEL } from './anthropic';
import { GEMINI_DEFAULT_MODEL } from './gemini';
import { OPENROUTER_DEFAULT_MODEL } from './openrouter';

export interface ModelChoice {
  /** Exact provider model id sent in the request. */
  readonly id: string;
  /** Name shown to the learner. */
  readonly label: string;
  /** Short French hint: quality and relative cost. */
  readonly hint: string;
}

export const MODEL_CHOICES: Readonly<Partial<Record<Provider, readonly ModelChoice[]>>> = {
  // Sonnet 5.5: $2 / $10 per million tokens; Opus 5.5: $4 / $20.
  openrouter: [
    {
      id: OPENROUTER_DEFAULT_MODEL,
      label: 'Claude Sonnet 5.5',
      hint: 'Rapide et précis · choix par défaut',
    },
    {
      id: 'anthropic/claude-opus-5.5',
      label: 'Claude Opus 5.5',
      hint: 'Réponses plus poussées · environ 2 fois plus cher',
    },
  ],
  anthropic: [
    {
      id: ANTHROPIC_DEFAULT_MODEL,
      label: 'Claude Sonnet 5.5',
      hint: 'Rapide et précis · choix par défaut',
    },
    {
      id: 'claude-opus-5-5',
      label: 'Claude Opus 5.5',
      hint: 'Réponses plus poussées · environ 2 fois plus cher',
    },
  ],
  // Flash-Lite: $0.30 / $2.50 per million tokens. 3.6 Flash: $0.75 / $3.75
  // until 31 December 2026, then $1.50 / $7.50 (Google pricing page).
  gemini: [
    {
      id: GEMINI_DEFAULT_MODEL,
      label: 'Gemini 3.5 Flash-Lite',
      hint: 'Le moins cher · choix par défaut',
    },
    {
      id: 'gemini-3.6-flash',
      label: 'Gemini 3.6 Flash',
      hint: 'Meilleures réponses · plusieurs fois plus cher',
    },
  ],
};

/** Models offered for this provider; empty when the provider has no picker. */
export function getModelChoices(provider: Provider): readonly ModelChoice[] {
  return MODEL_CHOICES[provider] ?? [];
}

export function isOfferedModel(provider: Provider, model: string): boolean {
  return getModelChoices(provider).some((c) => c.id === model);
}

function storage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * The learner's stored model for this provider, or `null` when none is
 * stored. An invalid stored value (e.g. `gemini-2.0-flash`, shut down by
 * Google) is removed so the default applies.
 */
export function readStoredModel(provider: Provider): string | null {
  const ls = storage();
  if (!ls) return null;
  const key = MODEL_KEY_PREFIX + provider;
  try {
    const value = ls.getItem(key);
    if (value === null) return null;
    if (isOfferedModel(provider, value)) return value;
    ls.removeItem(key);
  } catch {
    /* storage disabled — fall back to the default */
  }
  return null;
}

/** Stores the learner's choice. Returns false for a model that is not offered. */
export function saveModelChoice(provider: Provider, model: string): boolean {
  if (!isOfferedModel(provider, model)) return false;
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(MODEL_KEY_PREFIX + provider, model);
    return true;
  } catch {
    return false;
  }
}
