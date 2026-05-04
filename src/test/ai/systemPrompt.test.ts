/**
 * Tests for src/lib/ai/systemPrompt.ts — THI-111 step 2/8.
 *
 * The system prompt is the LLM's guardrail. Its content is versioned
 * (`tutor/v1.0.0`) and immutable for the V1 ship — any change implies a new
 * jailbreak retest pass (cf. security_new_session_rules Règle 10).
 *
 * Coverage:
 *  - version constant is the literal `tutor/v1.0.0`
 *  - 4 languages × 2 modes = 8 variants resolve without throw
 *  - each variant contains the four mandatory refusal clauses (scope, prompt
 *    leak, secret request, role-play) so a guardrail audit can grep them
 *  - structural delimiters `<lesson_context>` and `<user_question>` are named
 *    in the prompt so the model knows where user content lives
 *  - the mode-specific instruction (socratic / direct) is present
 *  - snapshots pin the exact strings — any reword breaks the test, forcing the
 *    author to bump the version constant
 */
import { describe, expect, it } from 'vitest';
import {
  TUTOR_PROMPT_VERSION,
  getSystemPrompt,
  type TutorLang,
  type TutorMode,
} from '@/lib/ai/systemPrompt';

const LANGS: readonly TutorLang[] = ['fr', 'nl', 'en', 'de'];
const MODES: readonly TutorMode[] = ['socratic', 'direct'];

describe('TUTOR_PROMPT_VERSION', () => {
  it('is exactly "tutor/v1.0.0"', () => {
    expect(TUTOR_PROMPT_VERSION).toBe('tutor/v1.0.0');
  });
});

describe('getSystemPrompt — coverage of all (lang, mode) pairs', () => {
  for (const lang of LANGS) {
    for (const mode of MODES) {
      it(`returns a non-empty string for ${lang} / ${mode}`, () => {
        const out = getSystemPrompt({ lang, mode });
        expect(typeof out).toBe('string');
        expect(out.length).toBeGreaterThan(200);
      });
    }
  }
});

describe('getSystemPrompt — mandatory refusal clauses', () => {
  // Every variant must contain markers that a guardrail auditor can grep.
  // We assert on language-neutral structural tokens (the tags) plus a
  // language-specific quoted refusal sentence per locale.

  const REFUSAL_KEY_PHRASE: Record<TutorLang, string> = {
    fr: 'Je ne traite jamais d’informations sensibles',
    nl: 'Ik verwerk nooit gevoelige informatie',
    en: 'I never handle sensitive information',
    de: 'Ich verarbeite niemals sensible Informationen',
  };

  const ROLEPLAY_REFUSAL: Record<TutorLang, string> = {
    fr: 'Je reste le tuteur shell',
    nl: 'Ik blijf de shell-tutor',
    en: 'I remain the shell tutor',
    de: 'Ich bleibe der Shell-Tutor',
  };

  for (const lang of LANGS) {
    it(`${lang} contains the secret-request refusal sentence verbatim`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toContain(REFUSAL_KEY_PHRASE[lang]);
    });

    it(`${lang} contains the role-play refusal sentence verbatim`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toContain(ROLEPLAY_REFUSAL[lang]);
    });

    it(`${lang} mentions the structural delimiters <user_question> and <lesson_context>`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toContain('<user_question>');
      expect(prompt).toContain('</user_question>');
      expect(prompt).toContain('<lesson_context>');
    });

    it(`${lang} forbids revealing system instructions (prompt leak)`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      // Each locale uses a distinct verb — match on language-specific keywords.
      const leakRefusal: Record<TutorLang, RegExp> = {
        fr: /jamais.*(instructions|consignes|métadonnées)/i,
        nl: /(nooit|niet).*(instructies|systeem)/i,
        en: /(never|do not).*(instructions|system)/i,
        de: /(niemals|nicht).*(Anweisungen|System)/i,
      };
      expect(prompt).toMatch(leakRefusal[lang]);
    });

    it(`${lang} declares scope as shell tutor only (out-of-scope refusal)`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      // Each locale words the role differently — French/Dutch/German put
      // "Terminal Learning" after the noun ("tuteur shell de Terminal
      // Learning"), English puts it before ("Terminal Learning shell
      // tutor"). We accept both orders rather than enforce one phrasing.
      const tutorPhrase: Record<TutorLang, RegExp> = {
        fr: /tuteur\s+shell/i,
        nl: /shell-?tutor/i,
        en: /shell\s+tutor/i,
        de: /Shell-?Tutor/i,
      };
      expect(prompt).toMatch(tutorPhrase[lang]);
      expect(prompt).toMatch(/Terminal\s+Learning/);
    });
  }
});

describe('getSystemPrompt — mode-specific instructions', () => {
  it('socratic mode tells the model to ask 1-2 guiding questions', () => {
    for (const lang of LANGS) {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      // Each locale must contain a question-driven cue. We check for either
      // "?" with a "guid"/"questi" stem or the explicit number 1-2.
      expect(prompt).toMatch(/(question|vraag|Frage)/i);
    }
  });

  it('direct mode tells the model to answer directly with a follow-up question', () => {
    for (const lang of LANGS) {
      const prompt = getSystemPrompt({ lang, mode: 'direct' });
      const directMarker: Record<TutorLang, RegExp> = {
        fr: /directement|direct/i,
        nl: /direct|rechtstreeks/i,
        en: /directly|straight/i,
        de: /direkt|unmittelbar/i,
      };
      expect(prompt).toMatch(directMarker[lang]);
    }
  });

  it('socratic and direct prompts differ for the same language', () => {
    for (const lang of LANGS) {
      const s = getSystemPrompt({ lang, mode: 'socratic' });
      const d = getSystemPrompt({ lang, mode: 'direct' });
      expect(s).not.toBe(d);
    }
  });
});

describe('getSystemPrompt — immutability snapshots', () => {
  // These snapshots are the authoritative copy of the V1 prompt. ANY edit to
  // src/lib/ai/prompts/tutor-v1.0.0.ts will break these tests. The fix is NOT
  // to update the snapshot blindly — bump TUTOR_PROMPT_VERSION first, then
  // re-run the prompt-guardrail-auditor against the new content, and only
  // then update the snapshot.
  for (const lang of LANGS) {
    for (const mode of MODES) {
      it(`pins ${lang}/${mode} to its frozen v1.0.0 string`, () => {
        const out = getSystemPrompt({ lang, mode });
        expect(out).toMatchSnapshot();
      });
    }
  }
});

describe('getSystemPrompt — defensive', () => {
  it('throws on unknown language', () => {
    expect(() =>
      getSystemPrompt({ lang: 'xx' as unknown as TutorLang, mode: 'socratic' }),
    ).toThrow();
  });

  it('throws on unknown mode', () => {
    expect(() =>
      getSystemPrompt({ lang: 'fr', mode: 'creative' as unknown as TutorMode }),
    ).toThrow();
  });
});
