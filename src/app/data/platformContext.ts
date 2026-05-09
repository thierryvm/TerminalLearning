/**
 * Platform context — THI-148 (V1.0.1).
 *
 * Static, public-only overview of the Terminal Learning curriculum, injected
 * into the AI tutor's user message as a `<platform_context>` block alongside
 * `<lesson_context>`. Lets the tutor answer meta-platform questions ("how
 * many modules?", "which environments are supported?", "where do I find the
 * git module?") without leaking any per-user data.
 *
 * TRUST BOUNDARY: this content is derived from `curriculum.ts` at call time —
 * pure curriculum data, never user input today. Same trust class as
 * `lessonContext` in `src/lib/ai/useAiTutor.ts` (see comment line 147-156
 * there). No PII, no progress, no consent block crossed.
 *
 * Defense-in-depth (`prompt-guardrail-auditor` C1, 2026-05-09): module titles
 * are passed through `escapeDelimiters()` even though the data is currently
 * dev-controlled, to harden against a future where users author or rename
 * modules (V1.5+ custom curriculum). Cost: ~zero. Benefit: removes a
 * structural fragility the audit flagged before it can become real.
 *
 * `userProgress` (% completion, current lesson, completed lessons) is
 * EXPLICITLY out of scope V1.0.1 — that lives behind THI-142 V1.5 with its
 * own consent bump (see ADR-005 + future ADR-008).
 *
 * Output shape is structural English (deterministic, snapshot-friendly). The
 * LLM translates to the learner's language at inference time.
 */
import { escapeDelimiters } from '@/lib/ai/sanitizer';

import { curriculum, getTotalLessons } from './curriculum';

const SUPPORTED_ENVS = ['linux', 'macos', 'windows'] as const;

/**
 * Build the `<platform_context>` payload string. Pure: same curriculum →
 * same output, byte-for-byte.
 */
export function buildPlatformContext(): string {
  const moduleLines = curriculum
    .map((m, idx) => {
      const level = m.level ?? 1;
      const count = m.lessons.length;
      const lessonsLabel = count === 1 ? 'lesson' : 'lessons';
      // Defense-in-depth: escape any structural delimiter that might appear in
      // a future user-controlled module title (cf. file-level comment).
      const safeTitle = escapeDelimiters(m.title);
      return `  ${idx + 1}. ${safeTitle} (Level ${level}, ${count} ${lessonsLabel})`;
    })
    .join('\n');

  return [
    'Terminal Learning — overview',
    `Total modules: ${curriculum.length}`,
    `Total lessons: ${getTotalLessons()}`,
    `Available environments: ${SUPPORTED_ENVS.join(', ')}`,
    'Modules:',
    moduleLines,
  ].join('\n');
}
