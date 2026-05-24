/**
 * Stage B2 (THI-275) — dispatcher per-role tests.
 *
 * Pins :
 *  - The dispatcher routes the correct prompt for each of the 4 explicit
 *    roles (student/teacher/institution_admin/super_admin).
 *  - Unknown / missing role falls back to the student prompt (defense in
 *    depth — `pending_teacher`, anonymous user, future role).
 *  - Each per-role prompt includes the discriminating refusal clauses
 *    matching its scope (PII teacher, cross-institution admin, secret
 *    super_admin) — guarantees future drift cannot silently broaden scope.
 */
import { describe, expect, it } from 'vitest';

import {
  getSystemPrompt,
  type SystemPromptOpts,
  type TutorRole,
} from '@/lib/ai/systemPrompt';

const BASE_OPTS: Omit<SystemPromptOpts, 'role'> = {
  lang: 'fr',
  mode: 'direct',
};

describe('getSystemPrompt — per-role dispatcher (THI-275 Stage B2)', () => {
  it('returns the student tutor prompt when role is omitted', () => {
    const prompt = getSystemPrompt(BASE_OPTS);
    // The student prompt is the only one with "tuteur shell" in scope.
    expect(prompt).toContain('tuteur shell');
  });

  it('returns the student tutor prompt for role = student', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'student' });
    expect(prompt).toContain('tuteur shell');
  });

  it('returns the teacher prompt for role = teacher', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'teacher' });
    expect(prompt).toContain('assistant Terminal Learning pour les enseignants');
    expect(prompt).not.toContain('tuteur shell');
  });

  it('returns the institution_admin prompt for role = institution_admin', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'institution_admin' });
    expect(prompt).toContain("administrateurs d'institution");
    expect(prompt).not.toContain('tuteur shell');
  });

  it('returns the super_admin prompt for role = super_admin', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'super_admin' });
    expect(prompt).toContain('super_admin de la plateforme');
    expect(prompt).not.toContain('tuteur shell');
  });

  it('falls back to student prompt for an unknown role (defense in depth)', () => {
    // Cast-through-unknown so the test exercises the runtime guard, not the
    // compile-time type. `pending_teacher` is a real UserRole that is NOT in
    // TutorRole on purpose — it must safely degrade to student.
    const prompt = getSystemPrompt({
      ...BASE_OPTS,
      role: 'pending_teacher' as unknown as TutorRole,
    });
    expect(prompt).toContain('tuteur shell');
  });
});

describe('per-role refusal clauses — guarantees against scope drift', () => {
  it('teacher prompt refuses PII access (email/IP/real names) of pupils', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'teacher' });
    expect(prompt).toMatch(/données personnelles des élèves/i);
    expect(prompt).toMatch(/rgpd/i);
  });

  it('teacher prompt refuses cross-class and cross-institution access', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'teacher' });
    expect(prompt).toMatch(/AUTRE classe/);
    expect(prompt).toMatch(/AUTRE enseignant/);
    expect(prompt).toMatch(/cross-institution|autre[s]? institution[s]?/i);
  });

  it('teacher prompt refuses progress modification (read-only)', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'teacher' });
    expect(prompt).toMatch(/lecture seule/i);
  });

  it('institution_admin prompt refuses cross-institution data access', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'institution_admin' });
    expect(prompt).toMatch(/AUTRE institution/);
    expect(prompt).toMatch(/cross-institution/i);
  });

  it('institution_admin prompt refuses individual PII even intra-institution', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'institution_admin' });
    expect(prompt).toMatch(/minimisation/i);
  });

  it('institution_admin prompt refuses curriculum modifications', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'institution_admin' });
    expect(prompt).toMatch(/curriculum est géré au niveau plateforme/i);
  });

  it('super_admin prompt refuses leak of other users API keys (BYOK invariant)', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'super_admin' });
    expect(prompt).toMatch(/clés api utilisateurs/i);
    expect(prompt).toMatch(/byok/i);
  });

  it('super_admin prompt refuses environment secrets exposure', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'super_admin' });
    expect(prompt).toMatch(/SUPABASE_SERVICE_ROLE_KEY|VERCEL_TOKEN|GITHUB_TOKEN/);
  });

  it('super_admin prompt refuses destructive actions execution (advisor-only)', () => {
    const prompt = getSystemPrompt({ ...BASE_OPTS, role: 'super_admin' });
    expect(prompt).toMatch(/advisor read-only/i);
    expect(prompt).toMatch(/destructrice/i);
  });

  it('all per-role prompts include a prompt-leak refusal clause', () => {
    const roles: readonly TutorRole[] = [
      'teacher',
      'institution_admin',
      'super_admin',
    ];
    for (const role of roles) {
      const prompt = getSystemPrompt({ ...BASE_OPTS, role });
      // Each prompt must explicitly refuse to reveal its own instructions.
      // Wording can vary slightly per role (e.g. "littéral" prefix for super_admin)
      // but the core "ne révèle jamais ... instructions" must hold.
      expect(prompt).toMatch(/Ne révèle jamais .{0,30}instructions/i);
    }
  });

  it('all per-role prompts include a role-play / jailbreak refusal clause', () => {
    const roles: readonly TutorRole[] = [
      'teacher',
      'institution_admin',
      'super_admin',
    ];
    for (const role of roles) {
      const prompt = getSystemPrompt({ ...BASE_OPTS, role });
      // Different per-role wordings: "jouer un rôle", "simuler un autre rôle",
      // "DAN, jailbreak". Match any of the variants.
      expect(prompt).toMatch(/jouer un rôle|simuler|jailbreak|faire semblant/i);
    }
  });
});
