import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MODEL_KEY_PREFIX } from '@/lib/ai/keyManager';
import {
  ANTHROPIC_DEFAULT_MODEL,
  DEFAULT_MODELS,
  GEMINI_DEFAULT_MODEL,
  MODEL_CHOICES,
  OPENAI_DEFAULT_MODEL,
  OPENROUTER_DEFAULT_MODEL,
  getModelChoices,
  getModelLabel,
  readStoredModel,
  resolveModel,
  saveModelChoice,
} from '@/lib/ai/providers';

// Neutralise the deploy-time overrides so the default checks below test the
// code, whatever the runner's environment holds (Sourcery on #420). An empty
// value counts as unset; tests that need an override stub it again.
beforeEach(() => {
  for (const name of [
    'VITE_AI_TUTOR_OPENROUTER_MODEL',
    'VITE_AI_TUTOR_ANTHROPIC_MODEL',
    'VITE_AI_TUTOR_OPENAI_MODEL',
    'VITE_AI_TUTOR_GEMINI_MODEL',
  ]) {
    vi.stubEnv(name, '');
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('resolveModel — providers without a picker (OpenAI): env override > fallback', () => {
  it('returns the OpenAI env override when set', () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENAI_MODEL', 'gpt-4o');
    expect(resolveModel('openai')).toBe('gpt-4o');
  });

  it('falls back to DEFAULT_MODELS when env override is empty string', () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENAI_MODEL', '');
    expect(resolveModel('openai')).toBe(OPENAI_DEFAULT_MODEL);
  });

  it('falls back to DEFAULT_MODELS when env override is unset', () => {
    // Reset to unset in `beforeEach` (empty string, same as unset).
    expect(resolveModel('openai')).toBe(OPENAI_DEFAULT_MODEL);
  });
});

describe('resolveModel — providers with a picker (OpenRouter, Anthropic, Gemini)', () => {
  it('uses the cheapest Gemini model by default', () => {
    expect(resolveModel('gemini')).toBe('gemini-3.5-flash-lite');
  });

  it('uses Sonnet 5.5 by default on OpenRouter and Anthropic', () => {
    expect(resolveModel('openrouter')).toBe('anthropic/claude-sonnet-5.5');
    expect(resolveModel('anthropic')).toBe('claude-sonnet-5-5');
  });

  it('honours an env override that is one of the offered models', () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENROUTER_MODEL', 'anthropic/claude-opus-5.5');
    vi.stubEnv('VITE_AI_TUTOR_ANTHROPIC_MODEL', 'claude-opus-5-5');
    vi.stubEnv('VITE_AI_TUTOR_GEMINI_MODEL', 'gemini-3.6-flash');
    expect(resolveModel('openrouter')).toBe('anthropic/claude-opus-5.5');
    expect(resolveModel('anthropic')).toBe('claude-opus-5-5');
    expect(resolveModel('gemini')).toBe('gemini-3.6-flash');
  });

  it('ignores an env override pointing at a model that is not offered (shut down or old)', () => {
    vi.stubEnv('VITE_AI_TUTOR_GEMINI_MODEL', 'gemini-2.0-flash');
    vi.stubEnv('VITE_AI_TUTOR_OPENROUTER_MODEL', 'anthropic/claude-sonnet-4-6');
    vi.stubEnv('VITE_AI_TUTOR_ANTHROPIC_MODEL', 'claude-sonnet-4-6');
    expect(resolveModel('gemini')).toBe(GEMINI_DEFAULT_MODEL);
    expect(resolveModel('openrouter')).toBe(OPENROUTER_DEFAULT_MODEL);
    expect(resolveModel('anthropic')).toBe(ANTHROPIC_DEFAULT_MODEL);
  });

  it('keeps the learner choice across reads (persisted in localStorage)', () => {
    expect(saveModelChoice('gemini', 'gemini-3.6-flash')).toBe(true);
    expect(localStorage.getItem(MODEL_KEY_PREFIX + 'gemini')).toBe('gemini-3.6-flash');
    expect(resolveModel('gemini')).toBe('gemini-3.6-flash');
    expect(resolveModel('gemini')).toBe('gemini-3.6-flash');
    // Other providers are not affected.
    expect(resolveModel('openrouter')).toBe(OPENROUTER_DEFAULT_MODEL);
  });

  it('lets the learner choice win over the env override', () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENROUTER_MODEL', 'anthropic/claude-opus-5.5');
    saveModelChoice('openrouter', 'anthropic/claude-sonnet-5.5');
    expect(resolveModel('openrouter')).toBe('anthropic/claude-sonnet-5.5');
  });

  it.each(['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'nonsense'])(
    'drops a stale stored Gemini value (%s) and falls back to the default',
    (stale) => {
      localStorage.setItem(MODEL_KEY_PREFIX + 'gemini', stale);
      expect(resolveModel('gemini')).toBe(GEMINI_DEFAULT_MODEL);
      expect(localStorage.getItem(MODEL_KEY_PREFIX + 'gemini')).toBeNull();
    },
  );

  it('refuses to store a model that is not offered', () => {
    expect(saveModelChoice('gemini', 'gemini-2.0-flash')).toBe(false);
    expect(saveModelChoice('openai', 'gpt-4o')).toBe(false);
    expect(localStorage.getItem(MODEL_KEY_PREFIX + 'gemini')).toBeNull();
    expect(localStorage.getItem(MODEL_KEY_PREFIX + 'openai')).toBeNull();
  });

  it('readStoredModel returns null when nothing is stored', () => {
    expect(readStoredModel('anthropic')).toBeNull();
  });

  it('lists the default first for every provider with a picker', () => {
    for (const [provider, choices] of Object.entries(MODEL_CHOICES)) {
      expect(choices?.[0]?.id).toBe(DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS]);
      expect(choices?.length).toBe(2);
    }
    expect(getModelChoices('openai')).toEqual([]);
  });
});

describe('DEFAULT_MODELS', () => {
  it('DEFAULT_MODELS map matches the per-provider constants', () => {
    expect(DEFAULT_MODELS.openrouter).toBe(OPENROUTER_DEFAULT_MODEL);
    expect(DEFAULT_MODELS.anthropic).toBe(ANTHROPIC_DEFAULT_MODEL);
    expect(DEFAULT_MODELS.openai).toBe(OPENAI_DEFAULT_MODEL);
    expect(DEFAULT_MODELS.gemini).toBe(GEMINI_DEFAULT_MODEL);
  });
});

describe('getModelLabel — short human-friendly labels', () => {
  it('normalises Claude Sonnet 4.6', () => {
    expect(getModelLabel('anthropic/claude-sonnet-4-6')).toBe('Sonnet 4.6');
    expect(getModelLabel('claude-sonnet-4-6')).toBe('Sonnet 4.6');
  });

  it('normalises Claude Haiku 4.5', () => {
    expect(getModelLabel('anthropic/claude-haiku-4-5')).toBe('Haiku 4.5');
    expect(getModelLabel('claude-haiku-4-5')).toBe('Haiku 4.5');
  });

  it('normalises Claude Opus 4.7', () => {
    expect(getModelLabel('claude-opus-4-7')).toBe('Opus 4.7');
  });

  it('normalises Claude Sonnet 5.5 and Opus 5.5 (both naming conventions)', () => {
    expect(getModelLabel('anthropic/claude-sonnet-5.5')).toBe('Sonnet 5.5');
    expect(getModelLabel('claude-sonnet-5-5')).toBe('Sonnet 5.5');
    expect(getModelLabel('anthropic/claude-opus-5.5')).toBe('Opus 5.5');
    expect(getModelLabel('claude-opus-5-5')).toBe('Opus 5.5');
  });

  it('normalises GPT-4o and GPT-4o mini (mini before generic gpt-4o)', () => {
    expect(getModelLabel('gpt-4o-mini')).toBe('GPT-4o mini');
    expect(getModelLabel('openai/gpt-4o')).toBe('GPT-4o');
  });

  it('normalises Gemini variants', () => {
    expect(getModelLabel('gemini-2.0-flash')).toBe('Gemini 2.0 Flash');
    expect(getModelLabel('google/gemini-1.5-pro')).toBe('Gemini 1.5 Pro');
  });

  it('normalises Llama 3.3 70B (legacy display fallback)', () => {
    expect(getModelLabel('meta-llama/llama-3.3-70b-instruct:free')).toBe('Llama 3.3 70B');
  });

  // Frontier 2025-2026 — Stage B1 whitelist (THI-260, 24/05/2026).
  it('normalises OpenAI GPT-5 family (frontier 2025-2026)', () => {
    expect(getModelLabel('openai/gpt-5.5')).toBe('GPT-5.5');
    expect(getModelLabel('openai/gpt-5-mini')).toBe('GPT-5 mini');
    expect(getModelLabel('openai/gpt-5-nano')).toBe('GPT-5 nano');
    expect(getModelLabel('openai/gpt-5')).toBe('GPT-5');
  });

  it('normalises Gemini frontier (2.5 Flash Lite + 3.5 Flash + 2.5 Pro)', () => {
    expect(getModelLabel('gemini-3.6-flash')).toBe('Gemini 3.6 Flash');
    expect(getModelLabel('gemini-3.5-flash-lite')).toBe('Gemini 3.5 Flash-Lite');
    expect(getModelLabel('google/gemini-3.5-flash')).toBe('Gemini 3.5 Flash');
    expect(getModelLabel('google/gemini-2.5-flash-lite')).toBe('Gemini 2.5 Flash Lite');
    expect(getModelLabel('google/gemini-2.5-flash')).toBe('Gemini 2.5 Flash');
    expect(getModelLabel('google/gemini-2.5-pro')).toBe('Gemini 2.5 Pro');
  });

  it('normalises Qwen frontier (3.7 Max + 3.5 Plus)', () => {
    expect(getModelLabel('qwen/qwen3.7-max')).toBe('Qwen 3.7 Max');
    expect(getModelLabel('qwen/qwen3.5-plus')).toBe('Qwen 3.5 Plus');
  });

  it('normalises DeepSeek frontier (V3.1 + V3.2)', () => {
    expect(getModelLabel('deepseek/deepseek-v3.2')).toBe('DeepSeek V3.2');
    expect(getModelLabel('deepseek/deepseek-chat-v3.1')).toBe('DeepSeek V3.1');
  });

  it('handles both `-` and `.` naming for Claude (Anthropic direct vs OpenRouter)', () => {
    // OpenRouter naming officiel utilise le point ; Anthropic direct utilise le tiret.
    expect(getModelLabel('anthropic/claude-sonnet-4.6')).toBe('Sonnet 4.6');
    expect(getModelLabel('anthropic/claude-opus-4.7')).toBe('Opus 4.7');
    expect(getModelLabel('claude-haiku-4.5')).toBe('Haiku 4.5');
  });

  it('returns the raw id when the pattern is unknown (honest fallback)', () => {
    expect(getModelLabel('unknown/mystery-model-v2')).toBe('unknown/mystery-model-v2');
  });
});
