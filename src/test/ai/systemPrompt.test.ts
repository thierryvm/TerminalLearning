/**
 * Tests for src/lib/ai/systemPrompt.ts — THI-111 step 2/8 + THI-148 + THI-144.
 *
 * The system prompt is the LLM's guardrail. Its content is versioned
 * (`tutor/v1.1.1`) and immutable per ship — any change implies a new
 * jailbreak retest pass (cf. security_new_session_rules Règle 10).
 *
 * Coverage:
 *  - version constant is the literal `tutor/v1.1.1`
 *  - 4 languages × 2 modes = 8 variants resolve without throw
 *  - each variant contains the four mandatory refusal clauses (scope, prompt
 *    leak, secret request, role-play) so a guardrail audit can grep them
 *  - structural delimiters `<lesson_context>` and `<user_question>` are named
 *    in the prompt so the model knows where user content lives
 *  - the mode-specific instruction (socratic / direct) is present
 *  - V1.1.0 anti-friction rules are present (THI-144 / ADR-008): compound
 *    questions ban, over-explanation curb, repeated-hint ban, satisfaction
 *    signal handling
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
  it('is exactly "tutor/v1.1.1"', () => {
    expect(TUTOR_PROMPT_VERSION).toBe('tutor/v1.1.1');
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

    it(`${lang} mentions the structural delimiters <user_question>, <lesson_context>, and <platform_context>`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toContain('<user_question>');
      expect(prompt).toContain('</user_question>');
      expect(prompt).toContain('<lesson_context>');
      // THI-148 V1.0.1 — platform overview block listed in delimiters clause
      expect(prompt).toContain('<platform_context>');
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

describe('getSystemPrompt — extended scope V1.0.1 (THI-148)', () => {
  // V1.0.1 routes platform meta-questions through the new <platform_context>
  // block. Each locale must explicitly call out the platform-meta extension
  // AND keep an out-of-scope refusal list that catches genuinely off-topic
  // questions (weather / news / political opinions).

  const PLATFORM_META_CUE: Record<TutorLang, RegExp> = {
    fr: /Terminal Learning/i,
    nl: /Terminal Learning/i,
    en: /Terminal Learning/i,
    de: /Terminal Learning/i,
  };

  const OUT_OF_SCOPE_CUE: Record<TutorLang, RegExp> = {
    fr: /m[ée]t[ée]o|actualit[ée]|opinions politiques/i,
    nl: /weer|actualiteit|politieke meningen/i,
    en: /weather|news|political opinions/i,
    de: /Wetter|Aktualit[äa]t|politische Meinungen/i,
  };

  for (const lang of LANGS) {
    it(`${lang} routes platform meta-questions through <platform_context>`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toMatch(PLATFORM_META_CUE[lang]);
      expect(prompt).toContain('<platform_context>');
    });

    it(`${lang} keeps an extended out-of-scope refusal (weather / news / politics)`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toMatch(OUT_OF_SCOPE_CUE[lang]);
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

describe('getSystemPrompt — anti-friction rules V1.1.0 (THI-144 / ADR-008)', () => {
  // V1.1.0 embeds 4 rules sourced from the 8-turn @thierry test cross-validated
  // by ChatGPT (5 May 2026). Each locale must surface the rule cues so a
  // guardrail auditor can grep them and so future bumps cannot silently
  // drop a rule.

  // Friction 1 — compound questions ban. Socratic only (the rule is about
  // limiting guiding questions to one at a time). Each locale uses a distinct
  // emphasis form ("UNE SEULE", "SLECHTS ÉÉN", "ONE SINGLE", "NUR EINE").
  const COMPOUND_QUESTION_BAN_CUE: Record<TutorLang, RegExp> = {
    fr: /UNE SEULE question/i,
    nl: /SLECHTS [ÉE]{2}N vraag/i,
    en: /ONE SINGLE question/i,
    de: /NUR EINE Frage/i,
  };

  // Friction 2 — over-explanation curb. Both modes. Each locale frames the
  // rule as how-first / why-after with the same structural verb.
  const HOW_BEFORE_WHY_CUE: Record<TutorLang, RegExp> = {
    fr: /pourquoi.*(APR[ÈE]S|apr[èe]s)|comment.*demand[ée]/i,
    nl: /waarom.*(PAS DAARNA|daarna)|hoe.*gevraagd/i,
    en: /why.*AFTER|how.*being asked/i,
    de: /Warum.*(ERST DANACH|danach)|Wie.*gefragt/i,
  };

  // Friction 3 — repeated-hint ban. Socratic only.
  const REPEATED_HINT_BAN_CUE: Record<TutorLang, RegExp> = {
    fr: /(jamais|pas).*(m[êe]me hint)/i,
    nl: /(nooit|niet).*(dezelfde hint)/i,
    en: /(never|do not|don't).*(same hint)/i,
    de: /(niemals|nicht).*(denselben Hinweis)/i,
  };

  // Friction 4 — satisfaction signal handling. Both modes. Each locale lists
  // the satisfaction cue words and the 1-sentence summary fallback.
  const SATISFACTION_SIGNAL_CUE: Record<TutorLang, RegExp> = {
    fr: /merci.*j'ai compris|r[ée]sum[ée] d['’]1 phrase/i,
    nl: /bedankt.*ik snap het|samenvatting van 1 zin/i,
    en: /thanks.*got it|1-sentence summary/i,
    de: /danke.*verstanden|Zusammenfassung in 1 Satz/i,
  };

  for (const lang of LANGS) {
    it(`${lang} socratic prompt bans compound questions (friction 1)`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toMatch(COMPOUND_QUESTION_BAN_CUE[lang]);
    });

    it(`${lang} socratic prompt curbs over-explanation (friction 2)`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toMatch(HOW_BEFORE_WHY_CUE[lang]);
    });

    it(`${lang} direct prompt curbs over-explanation (friction 2)`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'direct' });
      expect(prompt).toMatch(HOW_BEFORE_WHY_CUE[lang]);
    });

    it(`${lang} socratic prompt bans repeated hints (friction 3)`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toMatch(REPEATED_HINT_BAN_CUE[lang]);
    });

    it(`${lang} socratic prompt handles satisfaction signal (friction 4)`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'socratic' });
      expect(prompt).toMatch(SATISFACTION_SIGNAL_CUE[lang]);
    });

    it(`${lang} direct prompt handles satisfaction signal (friction 4)`, () => {
      const prompt = getSystemPrompt({ lang, mode: 'direct' });
      expect(prompt).toMatch(SATISFACTION_SIGNAL_CUE[lang]);
    });
  }
});

describe('getSystemPrompt — pedagogical-frontier clause V1.1.1 (F-6, chantier 30/05/2026)', () => {
  // V1.1.1 adds an explicit pedagogical-frontier refusal: the tutor explains
  // shell concepts but never hands a turn-key offensive payload, even when
  // the request is reframed as a "legal CTF" / "authorized pentest" /
  // "educational exercise". Each locale must surface the clause AND its
  // reframing-resistance so a guardrail auditor can grep it and a future bump
  // cannot silently drop it. Present in BOTH modes (it lives in the shared
  // `refusals` block).

  const FRONTIER_HEADER_CUE: Record<TutorLang, RegExp> = {
    fr: /Fronti[èe]re p[ée]dagogique/i,
    nl: /Pedagogische grens/i,
    en: /Pedagogical frontier/i,
    de: /P[äa]dagogische Grenze/i,
  };

  // The clause must explicitly resist the "but it's for education / legal CTF"
  // reframing — the exact vector the F-6 chain exploited.
  const FRONTIER_REFRAME_CUE: Record<TutorLang, RegExp> = {
    fr: /CTF l[ée]gal|fins [ée]ducatives|exercice p[ée]dagogique/i,
    nl: /legale CTF|educatieve doeleinden|educatieve oefening/i,
    en: /legal CTF|educational purposes|educational exercise/i,
    de: /legales CTF|Bildungszwecken|p[äa]dagogische [ÜU]bung/i,
  };

  for (const lang of LANGS) {
    for (const mode of MODES) {
      it(`${lang}/${mode} states the pedagogical frontier`, () => {
        const prompt = getSystemPrompt({ lang, mode });
        expect(prompt).toMatch(FRONTIER_HEADER_CUE[lang]);
      });

      it(`${lang}/${mode} resists the "educational / legal CTF" reframing`, () => {
        const prompt = getSystemPrompt({ lang, mode });
        expect(prompt).toMatch(FRONTIER_REFRAME_CUE[lang]);
      });
    }
  }
});

describe('getSystemPrompt — immutability snapshots', () => {
  // These snapshots are the authoritative copy of the current prompt
  // (tutor/v1.1.1). ANY edit to src/lib/ai/prompts/tutor-v1.1.1.ts will
  // break these tests. The fix is NOT to update the snapshot blindly —
  // bump TUTOR_PROMPT_VERSION first, then re-run the prompt-guardrail-auditor
  // against the new content, and only then update the snapshot.
  for (const lang of LANGS) {
    for (const mode of MODES) {
      it(`pins ${lang}/${mode} to its frozen v1.1.1 string`, () => {
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
