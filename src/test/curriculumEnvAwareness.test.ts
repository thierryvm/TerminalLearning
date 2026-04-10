/**
 * curriculumEnvAwareness.test.ts
 *
 * Guards the multi-environment correctness of the curriculum at three levels:
 *
 *  1. STRUCTURAL — auto-runs on every exercise (past + future).
 *     Catches typos in env keys, missing hintByEnv siblings, empty fields, etc.
 *
 *  2. SAFETY CONTRACTS — validate() must never throw and must reject garbage/
 *     injection inputs on every env. Auto-discovers all exercises.
 *
 *  3. ENV DIFFERENTIATION — exercises whose instructionByEnv.X differs from
 *     the default must have a validate() that actually behaves differently
 *     per env, not just display-different text (the "illusion" bug).
 *
 *  4. SPOT-CHECKS — concrete assertions per lesson × env to pin exact accepted
 *     and rejected commands. Added manually when a lesson is created/modified.
 *
 * Design principle: sections 1 and 2 require NO changes when you add a lesson.
 * Sections 3 and 4 need a new entry per lesson that introduces env-specific
 * commands. The TODO comments mark exactly where to add them.
 */

import { describe, it, expect } from 'vitest';
import { curriculum } from '../app/data/curriculum';
import type { EnvId } from '../app/data/curriculum';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const VALID_ENV_IDS: EnvId[] = ['linux', 'macos', 'windows'];

/** All lessons flattened with their parent module id. */
const ALL_LESSONS = curriculum.flatMap((m) =>
  m.lessons.map((l) => ({ ...l, moduleId: m.id }))
);

/** All lessons that have an exercise. */
const ALL_EXERCISES = ALL_LESSONS.filter((l) => l.exercise != null).map((l) => ({
  lessonId: l.id,
  moduleId: l.moduleId,
  exercise: l.exercise!,
}));

/** Lookup helper — returns exercise or throws a clear error. */
function ex(moduleId: string, lessonId: string) {
  const e = curriculum.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId)
    ?.exercise;
  if (!e) throw new Error(`Exercise not found: ${moduleId}/${lessonId}`);
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STRUCTURAL INTEGRITY
// Auto-runs on every exercise and content block — no changes needed when you
// add new lessons.
// ─────────────────────────────────────────────────────────────────────────────

describe('curriculum — structural env consistency', () => {
  it('all contentByEnv keys on content blocks are valid EnvIds', () => {
    for (const mod of curriculum) {
      for (const lesson of mod.lessons) {
        for (const block of lesson.blocks) {
          for (const key of Object.keys(block.contentByEnv ?? {})) {
            expect(
              VALID_ENV_IDS,
              `${mod.id}/${lesson.id} — block.contentByEnv has invalid key "${key}"`
            ).toContain(key);
          }
          for (const key of Object.keys(block.labelByEnv ?? {})) {
            expect(
              VALID_ENV_IDS,
              `${mod.id}/${lesson.id} — block.labelByEnv has invalid key "${key}"`
            ).toContain(key);
          }
        }
      }
    }
  });

  it('all instructionByEnv keys are valid EnvIds', () => {
    for (const { moduleId, lessonId, exercise } of ALL_EXERCISES) {
      for (const key of Object.keys(exercise.instructionByEnv ?? {})) {
        expect(
          VALID_ENV_IDS,
          `${moduleId}/${lessonId} — instructionByEnv has invalid key "${key}"`
        ).toContain(key);
      }
    }
  });

  it('all hintByEnv keys are valid EnvIds', () => {
    for (const { moduleId, lessonId, exercise } of ALL_EXERCISES) {
      for (const key of Object.keys(exercise.hintByEnv ?? {})) {
        expect(
          VALID_ENV_IDS,
          `${moduleId}/${lessonId} — hintByEnv has invalid key "${key}"`
        ).toContain(key);
      }
    }
  });

  it('if instructionByEnv[env] exists then hintByEnv[env] must also exist', () => {
    for (const { moduleId, lessonId, exercise } of ALL_EXERCISES) {
      for (const env of Object.keys(exercise.instructionByEnv ?? {}) as EnvId[]) {
        expect(
          exercise.hintByEnv?.[env],
          `${moduleId}/${lessonId} — instructionByEnv.${env} defined but hintByEnv.${env} is missing`
        ).toBeDefined();
      }
    }
  });

  it('if hintByEnv[env] exists then instructionByEnv[env] must also exist', () => {
    // Reverse check: orphan hintByEnv without matching instruction is a data smell.
    for (const { moduleId, lessonId, exercise } of ALL_EXERCISES) {
      for (const env of Object.keys(exercise.hintByEnv ?? {}) as EnvId[]) {
        expect(
          exercise.instructionByEnv?.[env],
          `${moduleId}/${lessonId} — hintByEnv.${env} defined but instructionByEnv.${env} is missing`
        ).toBeDefined();
      }
    }
  });

  it('all lesson ids are unique across the entire curriculum', () => {
    const ids = ALL_LESSONS.map((l) => l.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `Duplicate lesson ids found: [${dupes.join(', ')}]`).toHaveLength(0);
  });

  it('all block types are valid', () => {
    const VALID_TYPES = new Set(['text', 'code', 'tip', 'warning', 'info']);
    for (const mod of curriculum) {
      for (const lesson of mod.lessons) {
        for (const block of lesson.blocks) {
          expect(
            VALID_TYPES.has(block.type),
            `${mod.id}/${lesson.id} — invalid block type "${block.type}"`
          ).toBe(true);
        }
      }
    }
  });

  it('every exercise has a non-empty default instruction and hint', () => {
    for (const { moduleId, lessonId, exercise } of ALL_EXERCISES) {
      expect(
        exercise.instruction.trim().length,
        `${moduleId}/${lessonId} — instruction is empty`
      ).toBeGreaterThan(0);
      expect(
        exercise.hint.trim().length,
        `${moduleId}/${lessonId} — hint is empty`
      ).toBeGreaterThan(0);
    }
  });

  it('every exercise has a non-empty successMessage', () => {
    for (const { moduleId, lessonId, exercise } of ALL_EXERCISES) {
      expect(
        exercise.successMessage.trim().length,
        `${moduleId}/${lessonId} — successMessage is empty`
      ).toBeGreaterThan(0);
    }
  });

  it('every module has at least one lesson', () => {
    for (const mod of curriculum) {
      expect(
        mod.lessons.length,
        `module "${mod.id}" has no lessons`
      ).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SAFETY CONTRACTS
// validate() must be robust against garbage, injection attempts, and edge
// inputs on every env for every exercise. Auto-discovers all exercises.
// ─────────────────────────────────────────────────────────────────────────────

describe('curriculum — validate() safety contracts', () => {
  const GARBAGE_INPUTS = [
    '',
    '   ',
    '\t\n\r',
    // Prototype pollution / injection attempts
    '__proto__',
    'constructor',
    'toString',
    // Shell injection patterns (not valid commands for any exercise)
    '; rm -rf /',
    '$(whoami)',
    '`id`',
    '${IFS}cat /etc/passwd',
    'linux\n--',
    // XSS-style
    '<script>alert(1)</script>',
    // Semantically close but wrong
    'null',
    'undefined',
    'true',
    'false',
    // Very long input (DoS-style fuzzing) — must not match any exercise pattern
    'a'.repeat(500),
    'x'.repeat(500),
    // Note: 'ls '.repeat(N) is intentionally excluded — it is a syntactically
    // valid ls invocation (ls with arguments) and the ls validate() regex
    // intentionally accepts ls with any arguments. That is correct behaviour.
  ];

  it('garbage inputs never validate on any env for any exercise', () => {
    for (const { moduleId, lessonId, exercise } of ALL_EXERCISES) {
      for (const env of VALID_ENV_IDS) {
        for (const input of GARBAGE_INPUTS) {
          expect(
            exercise.validate(input, env),
            `${moduleId}/${lessonId} — garbage "${input.substring(0, 40)}" validated on env=${env}`
          ).toBe(false);
        }
      }
    }
  });

  it('validate() never throws on any env or edge input', () => {
    // Note: undefined is excluded — TypeScript signature guarantees cmd: string.
    // Calling validate(undefined) violates the type contract; guard belongs in
    // the caller (LessonPage), not in every validate() closure.
    const EDGE_CASES = [
      '',
      'x'.repeat(2000),
      '\0',
      '\n\t\r',
      '${IFS}',
      '`id`',
      '$(whoami)',
      'null',
    ];
    for (const { moduleId, lessonId, exercise } of ALL_EXERCISES) {
      for (const env of VALID_ENV_IDS) {
        for (const input of EDGE_CASES) {
          expect(
            () => exercise.validate(input, env),
            `${moduleId}/${lessonId} — validate() threw on env=${env}, input="${String(input).substring(0, 30)}"`
          ).not.toThrow();
        }
      }
    }
  });

  it('validate() returns a boolean (not truthy/falsy) for all exercises', () => {
    // Guards against accidental string/number returns from validate()
    const TEST_COMMANDS = ['pwd', 'ls', 'cd', 'Get-Location', '', 'xyz'];
    for (const { moduleId, lessonId, exercise } of ALL_EXERCISES) {
      for (const env of VALID_ENV_IDS) {
        for (const cmd of TEST_COMMANDS) {
          const result = exercise.validate(cmd, env);
          expect(
            typeof result,
            `${moduleId}/${lessonId} — validate() returned ${typeof result}, expected boolean`
          ).toBe('boolean');
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENV DIFFERENTIATION
// Exercises where instructionByEnv diverges must have a validate() that
// actually rejects the "other env" canonical command — not just different UI.
//
// When you add a lesson with env-specific commands, add a row to
// ENV_ISOLATED_CASES below.
// ─────────────────────────────────────────────────────────────────────────────

describe('curriculum — validate() env differentiation', () => {
  /**
   * Cases where the canonical Linux command must NOT pass on Windows
   * (and vice-versa) — i.e. the exercise teaches a genuinely different command.
   *
   * Format: [moduleId, lessonId, linuxCmd, windowsCmd]
   * Both must pass on their own env; the linux cmd must fail on windows
   * and the windows cmd must fail on linux.
   */
  const ENV_ISOLATED_CASES: [string, string, string, string][] = [
    // variables module — real divergence, no cross-acceptance
    ['variables', 'env-vars', 'export GREETING=Hello', '$env:GREETING = "Hello"'],
    ['variables', 'path-variable', 'echo $PATH', 'echo $env:PATH'],
  ];

  for (const [moduleId, lessonId, linuxCmd, windowsCmd] of ENV_ISOLATED_CASES) {
    describe(`${moduleId}/${lessonId}`, () => {
      it('linux canonical passes on linux', () => {
        expect(ex(moduleId, lessonId).validate(linuxCmd, 'linux')).toBe(true);
      });
      it('windows canonical passes on windows', () => {
        expect(ex(moduleId, lessonId).validate(windowsCmd, 'windows')).toBe(true);
      });
      it('linux canonical fails on windows', () => {
        expect(ex(moduleId, lessonId).validate(linuxCmd, 'windows')).toBe(false);
      });
      it('windows canonical fails on linux', () => {
        expect(ex(moduleId, lessonId).validate(windowsCmd, 'linux')).toBe(false);
      });
    });
  }

  /**
   * 3-env exercises: shell-config and top have separate canonical commands
   * for linux, macos AND windows.
   * TODO: add new 3-env exercises here as they are created.
   */
  describe('variables/shell-config — 3-env isolation', () => {
    it('linux: cat ~/.bashrc passes, others do not', () => {
      expect(ex('variables', 'shell-config').validate('cat ~/.bashrc', 'linux')).toBe(true);
      expect(ex('variables', 'shell-config').validate('cat ~/.zshrc', 'linux')).toBe(false);
    });
    it('macos: cat ~/.zshrc passes, ~/.bashrc does not', () => {
      expect(ex('variables', 'shell-config').validate('cat ~/.zshrc', 'macos')).toBe(true);
      expect(ex('variables', 'shell-config').validate('cat ~/.bashrc', 'macos')).toBe(false);
    });
    it('windows: cat $PROFILE passes', () => {
      expect(ex('variables', 'shell-config').validate('cat $PROFILE', 'windows')).toBe(true);
    });
  });

  describe('processus/top — 3-env isolation', () => {
    it('linux: ps aux passes', () => {
      expect(ex('processus', 'top').validate('ps aux --sort=-%mem | head -5', 'linux')).toBe(true);
    });
    it('macos: ps aux + sort passes', () => {
      expect(ex('processus', 'top').validate('ps aux | sort -k3rn | head -5', 'macos')).toBe(true);
    });
    it('windows: Get-Process pipeline passes', () => {
      expect(
        ex('processus', 'top').validate(
          'Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5',
          'windows'
        )
      ).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SPOT-CHECKS — concrete accepted / rejected commands per lesson × env
//
// Purpose: pin the exact acceptance logic so regressions are caught
// immediately. These are the "unit tests for validate()".
//
// When adding a new lesson, add a describe block here following the same
// pattern. Keep the structure: ✓ canonical → ✓ aliases → ✗ wrong-env.
// ─────────────────────────────────────────────────────────────────────────────

describe('curriculum — spot-checks per lesson × env', () => {
  // ── MODULE: navigation ────────────────────────────────────────────────────

  describe('navigation/pwd', () => {
    it('linux + macos: pwd passes', () => {
      expect(ex('navigation', 'pwd').validate('pwd', 'linux')).toBe(true);
      expect(ex('navigation', 'pwd').validate('pwd', 'macos')).toBe(true);
    });
    it('windows: Get-Location, gl, and pwd (documented alias) all pass', () => {
      expect(ex('navigation', 'pwd').validate('Get-Location', 'windows')).toBe(true);
      expect(ex('navigation', 'pwd').validate('gl', 'windows')).toBe(true);
      expect(ex('navigation', 'pwd').validate('pwd', 'windows')).toBe(true);
    });
    it('linux: Get-Location does not pass', () => {
      expect(ex('navigation', 'pwd').validate('Get-Location', 'linux')).toBe(false);
    });
  });

  describe('navigation/ls', () => {
    it('linux + macos: ls passes, ls with path also passes', () => {
      expect(ex('navigation', 'ls').validate('ls', 'linux')).toBe(true);
      expect(ex('navigation', 'ls').validate('ls documents', 'linux')).toBe(true);
      expect(ex('navigation', 'ls').validate('ls', 'macos')).toBe(true);
    });
    it('windows: Get-ChildItem, gci, dir all pass', () => {
      expect(ex('navigation', 'ls').validate('Get-ChildItem', 'windows')).toBe(true);
      expect(ex('navigation', 'ls').validate('gci', 'windows')).toBe(true);
      expect(ex('navigation', 'ls').validate('dir', 'windows')).toBe(true);
    });
    it('linux: Get-ChildItem does not pass', () => {
      expect(ex('navigation', 'ls').validate('Get-ChildItem', 'linux')).toBe(false);
    });
  });

  describe('navigation/ls-la', () => {
    it('linux + macos: ls -la and ls -al pass', () => {
      expect(ex('navigation', 'ls-la').validate('ls -la', 'linux')).toBe(true);
      expect(ex('navigation', 'ls-la').validate('ls -al', 'linux')).toBe(true);
      expect(ex('navigation', 'ls-la').validate('ls -la', 'macos')).toBe(true);
    });
    it('linux: plain ls does not pass (exercise requires flags)', () => {
      expect(ex('navigation', 'ls-la').validate('ls', 'linux')).toBe(false);
    });
    it('windows: Get-ChildItem -Force, gci -Force, dir -Force pass', () => {
      expect(ex('navigation', 'ls-la').validate('Get-ChildItem -Force', 'windows')).toBe(true);
      expect(ex('navigation', 'ls-la').validate('gci -Force', 'windows')).toBe(true);
      expect(ex('navigation', 'ls-la').validate('dir -Force', 'windows')).toBe(true);
    });
  });

  describe('navigation/cd', () => {
    it('all 3 envs: cd documents passes', () => {
      expect(ex('navigation', 'cd').validate('cd documents', 'linux')).toBe(true);
      expect(ex('navigation', 'cd').validate('cd documents', 'macos')).toBe(true);
      expect(ex('navigation', 'cd').validate('cd documents', 'windows')).toBe(true);
    });
    it('windows: Set-Location and sl also pass', () => {
      expect(ex('navigation', 'cd').validate('set-location documents', 'windows')).toBe(true);
      expect(ex('navigation', 'cd').validate('sl documents', 'windows')).toBe(true);
    });
    it('bare cd without target does not pass on any env', () => {
      expect(ex('navigation', 'cd').validate('cd', 'linux')).toBe(false);
      expect(ex('navigation', 'cd').validate('cd', 'windows')).toBe(false);
    });
  });

  // ── MODULE: fichiers ──────────────────────────────────────────────────────

  describe('fichiers/mkdir', () => {
    it('linux + macos: mkdir test and mkdir -p test pass', () => {
      expect(ex('fichiers', 'mkdir').validate('mkdir test', 'linux')).toBe(true);
      expect(ex('fichiers', 'mkdir').validate('mkdir -p test', 'linux')).toBe(true);
      expect(ex('fichiers', 'mkdir').validate('mkdir test', 'macos')).toBe(true);
    });
    it('windows: mkdir test and New-Item pass', () => {
      expect(ex('fichiers', 'mkdir').validate('mkdir test', 'windows')).toBe(true);
      expect(
        ex('fichiers', 'mkdir').validate('New-Item -ItemType Directory -Name test', 'windows')
      ).toBe(true);
    });
    it('bare mkdir without name does not pass', () => {
      expect(ex('fichiers', 'mkdir').validate('mkdir', 'linux')).toBe(false);
      expect(ex('fichiers', 'mkdir').validate('mkdir', 'windows')).toBe(false);
    });
  });

  describe('fichiers/touch', () => {
    it('linux + macos: touch memo.txt passes', () => {
      expect(ex('fichiers', 'touch').validate('touch memo.txt', 'linux')).toBe(true);
      expect(ex('fichiers', 'touch').validate('touch memo.txt', 'macos')).toBe(true);
    });
    it('windows: New-Item, ni pass; touch is accepted as documented fallback', () => {
      expect(
        ex('fichiers', 'touch').validate('New-Item -ItemType File -Name memo.txt', 'windows')
      ).toBe(true);
      expect(ex('fichiers', 'touch').validate('ni memo.txt', 'windows')).toBe(true);
      expect(ex('fichiers', 'touch').validate('touch memo.txt', 'windows')).toBe(true);
    });
    it('linux: New-Item does not pass', () => {
      expect(
        ex('fichiers', 'touch').validate('New-Item -ItemType File -Name memo.txt', 'linux')
      ).toBe(false);
    });
    it('wrong filename does not pass', () => {
      expect(ex('fichiers', 'touch').validate('touch note.txt', 'linux')).toBe(false);
    });
  });

  describe('fichiers/cp', () => {
    const SRC = 'documents/notes.txt';
    const DST = 'documents/notes-copy.txt';
    it('linux: cp exact command passes', () => {
      expect(ex('fichiers', 'cp').validate(`cp ${SRC} ${DST}`, 'linux')).toBe(true);
    });
    it('windows: Copy-Item, cpi, copy all pass', () => {
      expect(ex('fichiers', 'cp').validate(`Copy-Item ${SRC} ${DST}`, 'windows')).toBe(true);
      expect(ex('fichiers', 'cp').validate(`cpi ${SRC} ${DST}`, 'windows')).toBe(true);
      expect(ex('fichiers', 'cp').validate(`copy ${SRC} ${DST}`, 'windows')).toBe(true);
    });
    it('linux: Copy-Item does not pass', () => {
      expect(ex('fichiers', 'cp').validate(`Copy-Item ${SRC} ${DST}`, 'linux')).toBe(false);
    });
  });

  describe('fichiers/mv', () => {
    const SRC = 'documents/rapport.md';
    const DST = 'documents/rapport-final.md';
    it('linux: mv passes', () => {
      expect(ex('fichiers', 'mv').validate(`mv ${SRC} ${DST}`, 'linux')).toBe(true);
    });
    it('windows: Move-Item, mi, move pass', () => {
      expect(ex('fichiers', 'mv').validate(`Move-Item ${SRC} ${DST}`, 'windows')).toBe(true);
      expect(ex('fichiers', 'mv').validate(`mi ${SRC} ${DST}`, 'windows')).toBe(true);
      expect(ex('fichiers', 'mv').validate(`move ${SRC} ${DST}`, 'windows')).toBe(true);
    });
    it('linux: Move-Item does not pass', () => {
      expect(ex('fichiers', 'mv').validate(`Move-Item ${SRC} ${DST}`, 'linux')).toBe(false);
    });
  });

  describe('fichiers/rm', () => {
    const TARGET = 'documents/notes.txt';
    it('linux: rm passes', () => {
      expect(ex('fichiers', 'rm').validate(`rm ${TARGET}`, 'linux')).toBe(true);
    });
    it('windows: Remove-Item, ri, del, erase all pass', () => {
      expect(ex('fichiers', 'rm').validate(`Remove-Item ${TARGET}`, 'windows')).toBe(true);
      expect(ex('fichiers', 'rm').validate(`ri ${TARGET}`, 'windows')).toBe(true);
      expect(ex('fichiers', 'rm').validate(`del ${TARGET}`, 'windows')).toBe(true);
      expect(ex('fichiers', 'rm').validate(`erase ${TARGET}`, 'windows')).toBe(true);
    });
    it('linux: Remove-Item does not pass', () => {
      expect(ex('fichiers', 'rm').validate(`Remove-Item ${TARGET}`, 'linux')).toBe(false);
    });
  });

  // ── MODULE: lecture ───────────────────────────────────────────────────────

  describe('lecture/cat', () => {
    it('linux: cat passes', () => {
      expect(ex('lecture', 'cat').validate('cat documents/notes.txt', 'linux')).toBe(true);
    });
    it('windows: Get-Content, gc, cat, type all pass', () => {
      expect(ex('lecture', 'cat').validate('Get-Content documents/notes.txt', 'windows')).toBe(true);
      expect(ex('lecture', 'cat').validate('gc documents/notes.txt', 'windows')).toBe(true);
      expect(ex('lecture', 'cat').validate('type documents/notes.txt', 'windows')).toBe(true);
    });
    it('linux: Get-Content does not pass', () => {
      expect(ex('lecture', 'cat').validate('Get-Content documents/notes.txt', 'linux')).toBe(false);
    });
  });

  describe('lecture/head-tail', () => {
    it('linux: head -n 3 passes', () => {
      expect(
        ex('lecture', 'head-tail').validate('head -n 3 documents/rapport.md', 'linux')
      ).toBe(true);
    });
    it('windows: Get-Content pipeline passes; head -n 3 is accepted as fallback', () => {
      expect(
        ex('lecture', 'head-tail').validate(
          'Get-Content documents/rapport.md | Select-Object -First 3',
          'windows'
        )
      ).toBe(true);
      // documented fallback — accepted on windows too
      expect(
        ex('lecture', 'head-tail').validate('head -n 3 documents/rapport.md', 'windows')
      ).toBe(true);
    });
  });

  describe('lecture/grep', () => {
    it('linux: grep with and without quotes passes', () => {
      expect(
        ex('lecture', 'grep').validate('grep important documents/notes.txt', 'linux')
      ).toBe(true);
      expect(
        ex('lecture', 'grep').validate('grep "important" documents/notes.txt', 'linux')
      ).toBe(true);
    });
    it('windows: Select-String and sls pass', () => {
      expect(
        ex('lecture', 'grep').validate('Select-String "important" documents/notes.txt', 'windows')
      ).toBe(true);
      expect(
        ex('lecture', 'grep').validate('sls "important" documents/notes.txt', 'windows')
      ).toBe(true);
    });
  });

  describe('lecture/wc', () => {
    it('linux: wc -l passes', () => {
      expect(ex('lecture', 'wc').validate('wc -l documents/rapport.md', 'linux')).toBe(true);
    });
    it('windows: (Get-Content ...).Count passes; wc -l accepted as fallback', () => {
      expect(
        ex('lecture', 'wc').validate('(Get-Content documents/rapport.md).Count', 'windows')
      ).toBe(true);
      expect(ex('lecture', 'wc').validate('wc -l documents/rapport.md', 'windows')).toBe(true);
    });
  });

  // ── MODULE: permissions ───────────────────────────────────────────────────

  describe('permissions/comprendre-permissions', () => {
    it('linux: ls -l passes', () => {
      expect(
        ex('permissions', 'comprendre-permissions').validate('ls -l', 'linux')
      ).toBe(true);
    });
    it('windows: Get-Acl, icacls pass', () => {
      expect(
        ex('permissions', 'comprendre-permissions').validate(
          'Get-Acl documents/notes.txt',
          'windows'
        )
      ).toBe(true);
      expect(
        ex('permissions', 'comprendre-permissions').validate('icacls documents/notes.txt', 'windows')
      ).toBe(true);
    });
  });

  describe('permissions/chmod', () => {
    it('linux: chmod +x, chmod 755, chmod u+x all pass', () => {
      expect(
        ex('permissions', 'chmod').validate('chmod +x projets/script.sh', 'linux')
      ).toBe(true);
      expect(
        ex('permissions', 'chmod').validate('chmod 755 projets/script.sh', 'linux')
      ).toBe(true);
      expect(
        ex('permissions', 'chmod').validate('chmod u+x projets/script.sh', 'linux')
      ).toBe(true);
    });
    it('windows: Set-ExecutionPolicy RemoteSigned and Unrestricted pass', () => {
      expect(
        ex('permissions', 'chmod').validate('Set-ExecutionPolicy RemoteSigned', 'windows')
      ).toBe(true);
      expect(
        ex('permissions', 'chmod').validate('Set-ExecutionPolicy Unrestricted', 'windows')
      ).toBe(true);
    });
    it('linux: Set-ExecutionPolicy does not pass', () => {
      expect(
        ex('permissions', 'chmod').validate('Set-ExecutionPolicy RemoteSigned', 'linux')
      ).toBe(false);
    });
  });

  describe('permissions/chown', () => {
    it('linux: ls -la passes', () => {
      expect(ex('permissions', 'chown').validate('ls -la', 'linux')).toBe(true);
      expect(ex('permissions', 'chown').validate('ls -al', 'linux')).toBe(true);
    });
    it('windows: Get-Acl passes', () => {
      expect(
        ex('permissions', 'chown').validate('Get-Acl documents/notes.txt', 'windows')
      ).toBe(true);
    });
  });

  describe('permissions/sudo', () => {
    it('all 3 envs: whoami and sudo whoami pass (env-agnostic by design)', () => {
      expect(ex('permissions', 'sudo').validate('whoami', 'linux')).toBe(true);
      expect(ex('permissions', 'sudo').validate('whoami', 'macos')).toBe(true);
      expect(ex('permissions', 'sudo').validate('whoami', 'windows')).toBe(true);
      expect(ex('permissions', 'sudo').validate('sudo whoami', 'linux')).toBe(true);
    });
  });

  describe('permissions/security-permissions', () => {
    it('linux: ls variants pass', () => {
      expect(ex('permissions', 'security-permissions').validate('ls -la', 'linux')).toBe(true);
      expect(ex('permissions', 'security-permissions').validate('ls -l', 'linux')).toBe(true);
    });
    it('windows: Get-Acl and icacls pass', () => {
      expect(
        ex('permissions', 'security-permissions').validate('Get-Acl $HOME', 'windows')
      ).toBe(true);
      expect(
        ex('permissions', 'security-permissions').validate('icacls C:\\Users\\user', 'windows')
      ).toBe(true);
    });
  });

  // ── MODULE: processus ─────────────────────────────────────────────────────

  describe('processus/ps', () => {
    it('linux: ps and ps with flags pass', () => {
      expect(ex('processus', 'ps').validate('ps', 'linux')).toBe(true);
      expect(ex('processus', 'ps').validate('ps aux', 'linux')).toBe(true);
    });
    it('windows: Get-Process, gps, tasklist pass', () => {
      expect(ex('processus', 'ps').validate('Get-Process', 'windows')).toBe(true);
      expect(ex('processus', 'ps').validate('gps', 'windows')).toBe(true);
      expect(ex('processus', 'ps').validate('tasklist', 'windows')).toBe(true);
    });
  });

  describe('processus/kill', () => {
    it('linux: ps aux passes (exercise asks to list to identify)', () => {
      expect(ex('processus', 'kill').validate('ps aux', 'linux')).toBe(true);
    });
    it('windows: Stop-Process, Get-Process variants pass', () => {
      expect(ex('processus', 'kill').validate('Stop-Process -Id 1234', 'windows')).toBe(true);
      expect(ex('processus', 'kill').validate('Get-Process', 'windows')).toBe(true);
    });
  });

  describe('processus/background', () => {
    it('linux + macos: jobs passes', () => {
      expect(ex('processus', 'background').validate('jobs', 'linux')).toBe(true);
      expect(ex('processus', 'background').validate('jobs', 'macos')).toBe(true);
    });
    it('windows: Get-Job passes; jobs also accepted as documented fallback', () => {
      expect(ex('processus', 'background').validate('Get-Job', 'windows')).toBe(true);
      expect(ex('processus', 'background').validate('jobs', 'windows')).toBe(true);
    });
  });

  // ── MODULE: redirection ───────────────────────────────────────────────────

  describe('redirection/redirection-sortie', () => {
    it('linux: echo "Bonjour le monde!" > bonjour.txt passes (case-sensitive)', () => {
      expect(
        ex('redirection', 'redirection-sortie').validate(
          'echo "Bonjour le monde!" > bonjour.txt',
          'linux'
        )
      ).toBe(true);
    });
    it('windows: echo and Write-Output with redirect pass (case-insensitive)', () => {
      expect(
        ex('redirection', 'redirection-sortie').validate(
          'echo "Bonjour le monde!" > bonjour.txt',
          'windows'
        )
      ).toBe(true);
      expect(
        ex('redirection', 'redirection-sortie').validate(
          'Write-Output "Bonjour le monde!" > bonjour.txt',
          'windows'
        )
      ).toBe(true);
    });
  });

  describe('redirection/pipes', () => {
    it('linux: ls | wc -l passes', () => {
      expect(ex('redirection', 'pipes').validate('ls | wc -l', 'linux')).toBe(true);
    });
    it('windows: Get-ChildItem | Measure-Object passes', () => {
      expect(
        ex('redirection', 'pipes').validate('Get-ChildItem | Measure-Object', 'windows')
      ).toBe(true);
      expect(
        ex('redirection', 'pipes').validate('dir | Measure-Object', 'windows')
      ).toBe(true);
    });
    it('linux: PowerShell pipe syntax does not pass', () => {
      expect(
        ex('redirection', 'pipes').validate('Get-ChildItem | Measure-Object', 'linux')
      ).toBe(false);
    });
  });

  describe('redirection/stderr', () => {
    it('linux: any 2> redirect passes', () => {
      expect(
        ex('redirection', 'stderr').validate('ls fichier-inexistant 2> erreurs.txt', 'linux')
      ).toBe(true);
      expect(
        ex('redirection', 'stderr').validate('command 2>/dev/null', 'linux')
      ).toBe(true);
    });
    it('windows: 2> and 2>$null pass', () => {
      expect(
        ex('redirection', 'stderr').validate(
          'Get-Item fichier-inexistant 2> erreurs.txt',
          'windows'
        )
      ).toBe(true);
      expect(
        ex('redirection', 'stderr').validate('command 2>$null', 'windows')
      ).toBe(true);
    });
  });

  describe('redirection/tee', () => {
    it('linux: ls | tee passes', () => {
      expect(ex('redirection', 'tee').validate('ls | tee ma-liste.txt', 'linux')).toBe(true);
    });
    it('windows: Tee-Object passes; unix tee also accepted as fallback', () => {
      expect(
        ex('redirection', 'tee').validate(
          'Get-ChildItem | Tee-Object -FilePath ma-liste.txt',
          'windows'
        )
      ).toBe(true);
      expect(ex('redirection', 'tee').validate('ls | tee ma-liste.txt', 'windows')).toBe(true);
    });
  });

  // ── MODULE: variables ─────────────────────────────────────────────────────

  describe('variables/env-vars', () => {
    it('linux + macos: export passes', () => {
      expect(ex('variables', 'env-vars').validate('export GREETING=Hello', 'linux')).toBe(true);
      expect(ex('variables', 'env-vars').validate('export GREETING=Hello', 'macos')).toBe(true);
    });
    it('windows: $env:VAR = value passes', () => {
      expect(ex('variables', 'env-vars').validate('$env:GREETING = "Hello"', 'windows')).toBe(true);
    });
    it('linux: $env: syntax does not pass', () => {
      expect(ex('variables', 'env-vars').validate('$env:GREETING = "Hello"', 'linux')).toBe(false);
    });
    it('windows: export syntax does not pass', () => {
      expect(ex('variables', 'env-vars').validate('export GREETING=Hello', 'windows')).toBe(false);
    });
  });

  describe('variables/path-variable', () => {
    it('linux + macos: echo $PATH passes', () => {
      expect(ex('variables', 'path-variable').validate('echo $PATH', 'linux')).toBe(true);
      expect(ex('variables', 'path-variable').validate('echo $PATH', 'macos')).toBe(true);
    });
    it('windows: echo $env:PATH and bare $env:PATH pass', () => {
      expect(ex('variables', 'path-variable').validate('echo $env:PATH', 'windows')).toBe(true);
      expect(ex('variables', 'path-variable').validate('$env:PATH', 'windows')).toBe(true);
    });
    it('windows: echo $PATH does not pass (wrong syntax)', () => {
      expect(ex('variables', 'path-variable').validate('echo $PATH', 'windows')).toBe(false);
    });
    it('linux: echo $env:PATH does not pass', () => {
      expect(ex('variables', 'path-variable').validate('echo $env:PATH', 'linux')).toBe(false);
    });
  });

  describe('variables/shell-config', () => {
    it('linux: cat ~/.bashrc passes', () => {
      expect(ex('variables', 'shell-config').validate('cat ~/.bashrc', 'linux')).toBe(true);
    });
    it('macos: cat ~/.zshrc passes', () => {
      expect(ex('variables', 'shell-config').validate('cat ~/.zshrc', 'macos')).toBe(true);
    });
    it('windows: cat $PROFILE and get-content $PROFILE pass', () => {
      expect(ex('variables', 'shell-config').validate('cat $PROFILE', 'windows')).toBe(true);
      expect(
        ex('variables', 'shell-config').validate('get-content $PROFILE', 'windows')
      ).toBe(true);
    });
    it('cross-env guard: wrong config file for env does not pass', () => {
      expect(ex('variables', 'shell-config').validate('cat ~/.zshrc', 'linux')).toBe(false);
      expect(ex('variables', 'shell-config').validate('cat ~/.bashrc', 'macos')).toBe(false);
      expect(ex('variables', 'shell-config').validate('cat ~/.bashrc', 'windows')).toBe(false);
    });
  });

  describe('variables/dotenv', () => {
    it('linux: cat .env passes', () => {
      expect(ex('variables', 'dotenv').validate('cat .env', 'linux')).toBe(true);
    });
    it('windows: Get-Content .env passes; cat .env also accepted', () => {
      expect(ex('variables', 'dotenv').validate('Get-Content .env', 'windows')).toBe(true);
      expect(ex('variables', 'dotenv').validate('cat .env', 'windows')).toBe(true);
    });
  });

  describe('variables/scripts', () => {
    it('linux + macos: ./script.sh and bash script.sh pass', () => {
      expect(ex('variables', 'scripts').validate('./script.sh', 'linux')).toBe(true);
      expect(ex('variables', 'scripts').validate('bash script.sh', 'linux')).toBe(true);
      expect(ex('variables', 'scripts').validate('./script.sh', 'macos')).toBe(true);
    });
    it('windows: .\\script.sh and bash script.sh pass', () => {
      expect(ex('variables', 'scripts').validate('.\\script.sh', 'windows')).toBe(true);
      expect(ex('variables', 'scripts').validate('bash script.sh', 'windows')).toBe(true);
    });
  });

  describe('variables/cron', () => {
    it('all 3 envs: crontab -l passes (env-agnostic by design — windows shows example)', () => {
      expect(ex('variables', 'cron').validate('crontab -l', 'linux')).toBe(true);
      expect(ex('variables', 'cron').validate('crontab -l', 'macos')).toBe(true);
      expect(ex('variables', 'cron').validate('crontab -l', 'windows')).toBe(true);
    });
    it('crontab -e and other variants do not pass (exercise is specific)', () => {
      expect(ex('variables', 'cron').validate('crontab -e', 'linux')).toBe(false);
      expect(ex('variables', 'cron').validate('crontab', 'linux')).toBe(false);
    });
  });
});
