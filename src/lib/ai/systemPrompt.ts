/**
 * System prompt entry point — THI-111 step 2/8 + THI-148 (V1.0.1) + THI-144 (V1.1.0).
 *
 * Public surface:
 *   - `TUTOR_PROMPT_VERSION`: the frozen identifier shipped to every LLM call.
 *     Bump this constant whenever the underlying string changes; never edit
 *     a frozen `prompts/tutor-vX.Y.Z.ts` file in place.
 *   - `getSystemPrompt({ lang, mode })`: returns the immutable system prompt
 *     for the requested language and pedagogical mode.
 *
 * The user input is NOT injected here. The hook (`useAiTutor`, step 5/8)
 * builds the user message in `<platform_context>...</platform_context>` +
 * `<lesson_context>...</lesson_context>` + `<user_question>...</user_question>`
 * form and ships it as a separate `role: 'user'` turn. This separation keeps
 * the system prompt invariant across requests and prevents user content from
 * ever interpolating into the frozen guardrail string.
 *
 * V1.0.1 extends scope to platform meta-questions (module count, navigation,
 * environments) routed through the new <platform_context> block.
 *
 * V1.1.0 (THI-144) embeds 4 anti-friction rules in the socratic and direct
 * blocks (compound questions, over-explanation, repeated hints, satisfaction
 * signal handling). Refusal clauses (role-play, secret-request, prompt-leak)
 * are preserved verbatim. See docs/adr/ADR-008-ai-tutor-v1-1-0-anti-frictions.md
 * for the full rationale.
 */

import { buildTutorPromptV1_1_0 } from './prompts/tutor-v1.1.0';

export const TUTOR_PROMPT_VERSION = 'tutor/v1.1.0';

/**
 * Literal type of the currently shipped prompt version, derived from
 * `TUTOR_PROMPT_VERSION` so the two stay in lock-step automatically.
 *
 * This resolves to a single literal at any point in time — older versions
 * are intentionally NOT preserved in the type. The eval-suite fixtures
 * (`src/lib/ai/eval/fixtures.ts`) all set `promptVersion: TUTOR_PROMPT_VERSION`
 * and the invariant test in `evalSuite.test.ts` asserts equality at
 * runtime; together they force any future bump to also re-validate or
 * replace every fixture rather than letting old versions silently drift
 * in alongside the new one.
 *
 * If you need to keep multiple versions valid simultaneously (e.g. dual
 * shipping during a migration window), switch this to an explicit union
 * literal you maintain by hand and adapt the invariant test to allow
 * the configured set instead of strict equality.
 */
export type TutorPromptVersion = typeof TUTOR_PROMPT_VERSION;

export type TutorLang = 'fr' | 'nl' | 'en' | 'de';
export type TutorMode = 'socratic' | 'direct';

export interface SystemPromptOpts {
  lang: TutorLang;
  mode: TutorMode;
}

const VALID_LANGS: ReadonlySet<TutorLang> = new Set<TutorLang>(['fr', 'nl', 'en', 'de']);
const VALID_MODES: ReadonlySet<TutorMode> = new Set<TutorMode>(['socratic', 'direct']);

export function getSystemPrompt(opts: SystemPromptOpts): string {
  if (!VALID_LANGS.has(opts.lang)) {
    throw new Error(`Unknown tutor language: ${String(opts.lang)}`);
  }
  if (!VALID_MODES.has(opts.mode)) {
    throw new Error(`Unknown tutor mode: ${String(opts.mode)}`);
  }
  return buildTutorPromptV1_1_0(opts.lang, opts.mode);
}
