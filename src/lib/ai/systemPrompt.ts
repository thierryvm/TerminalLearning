/**
 * System prompt entry point — THI-111 step 2/8 + THI-148 (V1.0.1).
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
 * environments) routed through the new <platform_context> block. Refusal
 * clauses (role-play, secret-request, prompt-leak) are preserved verbatim.
 */

import { buildTutorPromptV1_0_1 } from './prompts/tutor-v1.0.1';

export const TUTOR_PROMPT_VERSION = 'tutor/v1.0.1';

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
  return buildTutorPromptV1_0_1(opts.lang, opts.mode);
}
