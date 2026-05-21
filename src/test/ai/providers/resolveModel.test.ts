import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ANTHROPIC_DEFAULT_MODEL,
  DEFAULT_MODELS,
  GEMINI_DEFAULT_MODEL,
  OPENAI_DEFAULT_MODEL,
  OPENROUTER_DEFAULT_MODEL,
  getModelLabel,
  resolveModel,
} from '@/lib/ai/providers';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveModel — env override > fallback', () => {
  it('returns the OpenRouter env override when set', () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENROUTER_MODEL', 'anthropic/claude-sonnet-4-6');
    expect(resolveModel('openrouter')).toBe('anthropic/claude-sonnet-4-6');
  });

  it('returns the Anthropic env override when set', () => {
    vi.stubEnv('VITE_AI_TUTOR_ANTHROPIC_MODEL', 'claude-opus-4-7');
    expect(resolveModel('anthropic')).toBe('claude-opus-4-7');
  });

  it('returns the OpenAI env override when set', () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENAI_MODEL', 'gpt-4o');
    expect(resolveModel('openai')).toBe('gpt-4o');
  });

  it('returns the Gemini env override when set', () => {
    vi.stubEnv('VITE_AI_TUTOR_GEMINI_MODEL', 'gemini-1.5-pro');
    expect(resolveModel('gemini')).toBe('gemini-1.5-pro');
  });

  it('falls back to DEFAULT_MODELS when env override is empty string', () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENROUTER_MODEL', '');
    expect(resolveModel('openrouter')).toBe(OPENROUTER_DEFAULT_MODEL);
  });

  it('falls back to DEFAULT_MODELS when env override is unset', () => {
    // No stubEnv call — the var is undefined in the test environment.
    expect(resolveModel('anthropic')).toBe(ANTHROPIC_DEFAULT_MODEL);
  });

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

  it('normalises GPT-4o and GPT-4o mini (mini before generic gpt-4o)', () => {
    expect(getModelLabel('gpt-4o-mini')).toBe('GPT-4o mini');
    expect(getModelLabel('openai/gpt-4o')).toBe('GPT-4o');
  });

  it('normalises Gemini variants', () => {
    expect(getModelLabel('gemini-2.0-flash')).toBe('Gemini 2.0 Flash');
    expect(getModelLabel('google/gemini-1.5-pro')).toBe('Gemini 1.5 Pro');
  });

  it('normalises Llama 3.3 70B', () => {
    expect(getModelLabel('meta-llama/llama-3.3-70b-instruct:free')).toBe('Llama 3.3 70B');
  });

  it('returns the raw id when the pattern is unknown (honest fallback)', () => {
    expect(getModelLabel('unknown/mystery-model-v2')).toBe('unknown/mystery-model-v2');
  });
});
