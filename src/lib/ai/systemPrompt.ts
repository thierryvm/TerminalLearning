/**
 * System prompt entry point — THI-111 step 2/8 + THI-148 (V1.0.1) +
 * THI-144 (V1.1.0) + THI-275 (Stage B2 per-role prompts).
 *
 * Public surface:
 *   - `TUTOR_PROMPT_VERSION`: the frozen identifier of the student (élève)
 *     prompt shipped to every LLM call when role = 'student'. Bump it
 *     whenever the underlying tutor string changes; never edit a frozen
 *     `prompts/tutor-vX.Y.Z.ts` file in place.
 *   - `TEACHER_PROMPT_VERSION`, `ADMIN_PROMPT_VERSION`,
 *     `SUPERADMIN_PROMPT_VERSION`: same discipline for the staff prompts
 *     introduced in THI-275 Stage B2.
 *   - `getSystemPrompt({ lang, mode, role })`: returns the immutable system
 *     prompt for the requested language, pedagogical mode (student only),
 *     and user role. Fallback to the student prompt for any unauthenticated
 *     or unrecognised role (defence in depth).
 *
 * The user input is NOT injected here. The hook (`useAiTutor`, step 5/8)
 * builds the user message in `<platform_context>...</platform_context>` +
 * `<lesson_context>...</lesson_context>` + `<user_question>...</user_question>`
 * (or `<role_context>` for staff prompts) and ships it as a separate
 * `role: 'user'` turn. This separation keeps the system prompt invariant
 * across requests and prevents user content from ever interpolating into
 * the frozen guardrail string.
 *
 * V1.0.1 extends scope to platform meta-questions (module count, navigation,
 * environments) routed through the new <platform_context> block.
 *
 * V1.1.0 (THI-144) embeds 4 anti-friction rules in the socratic and direct
 * blocks. See docs/adr/ADR-008-ai-tutor-v1-1-0-anti-frictions.md.
 *
 * Stage B2 (THI-275) adds 3 per-role prompts (teacher, institution_admin,
 * super_admin) with FR-only sections. NL/EN/DE fallback to FR (the LLM is
 * multilingual and answers in the user's language even when system prompt
 * is FR). NL/EN/DE translation backlogged as sub-task post-merge.
 */

import { buildTutorPromptV1_1_0 } from './prompts/tutor-v1.1.0';
import { buildTeacherPromptV1_0_0 } from './prompts/teacher-v1.0.0';
import { buildAdminPromptV1_0_0 } from './prompts/admin-v1.0.0';
import { buildSuperadminPromptV1_0_0 } from './prompts/superadmin-v1.0.0';

export const TUTOR_PROMPT_VERSION = 'tutor/v1.1.0';
export const TEACHER_PROMPT_VERSION = 'teacher/v1.0.0';
export const ADMIN_PROMPT_VERSION = 'admin/v1.0.0';
export const SUPERADMIN_PROMPT_VERSION = 'superadmin/v1.0.0';

/**
 * Literal type of the currently shipped student prompt version, derived
 * from `TUTOR_PROMPT_VERSION` so the two stay in lock-step automatically.
 *
 * Other roles have their own constants but no exposed literal type yet —
 * add them here when an invariant test needs them.
 */
export type TutorPromptVersion = typeof TUTOR_PROMPT_VERSION;

export type TutorLang = 'fr' | 'nl' | 'en' | 'de';
export type TutorMode = 'socratic' | 'direct';

/**
 * Roles recognised by the prompt dispatcher. Mirrors `UserRole` in
 * `src/app/types/database.ts` (5 RBAC roles) but unifies `pending_teacher`
 * with student-level prompt as a defensive fallback: pending teachers are
 * authenticated but not yet approved, so they should not have full teacher
 * scope. They see the student prompt until their `pending_teacher` state is
 * lifted to `teacher` by an institution_admin.
 */
export type TutorRole = 'student' | 'teacher' | 'institution_admin' | 'super_admin';

export interface SystemPromptOpts {
  lang: TutorLang;
  mode: TutorMode;
  /**
   * The role of the current user. Defaults to 'student' (the safest, most
   * restrictive prompt) when omitted — preserves backward-compat with the
   * pre-B2 call-sites that did not pass a role.
   */
  role?: TutorRole;
}

const VALID_LANGS: ReadonlySet<TutorLang> = new Set<TutorLang>(['fr', 'nl', 'en', 'de']);
const VALID_MODES: ReadonlySet<TutorMode> = new Set<TutorMode>(['socratic', 'direct']);
const VALID_ROLES: ReadonlySet<TutorRole> = new Set<TutorRole>([
  'student',
  'teacher',
  'institution_admin',
  'super_admin',
]);

export function getSystemPrompt(opts: SystemPromptOpts): string {
  if (!VALID_LANGS.has(opts.lang)) {
    throw new Error(`Unknown tutor language: ${String(opts.lang)}`);
  }
  if (!VALID_MODES.has(opts.mode)) {
    throw new Error(`Unknown tutor mode: ${String(opts.mode)}`);
  }
  // Role defaults to 'student' (safest) when omitted or unknown. This is
  // defense-in-depth: an unauthenticated user, a `pending_teacher`, or any
  // future role added to UserRole but not wired into TutorRole will get the
  // most restrictive prompt by default rather than e.g. accidentally leaking
  // staff scope.
  const role: TutorRole = opts.role && VALID_ROLES.has(opts.role) ? opts.role : 'student';

  switch (role) {
    case 'teacher':
      return buildTeacherPromptV1_0_0(opts.lang);
    case 'institution_admin':
      return buildAdminPromptV1_0_0(opts.lang);
    case 'super_admin':
      return buildSuperadminPromptV1_0_0(opts.lang);
    case 'student':
    default:
      return buildTutorPromptV1_1_0(opts.lang, opts.mode);
  }
}
