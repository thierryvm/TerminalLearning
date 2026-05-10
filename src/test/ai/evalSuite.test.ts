/**
 * Eval suite (a) — structural prompt rules — THI-144 / ADR-008.
 *
 * 14 fixtures covering 4 frictions × representative cases + standard
 * pedagogical baselines. Each fixture pins a regex cue that the system
 * prompt MUST contain so a future bump cannot silently drop a rule.
 *
 * The fixture corpus is exported (`EVAL_FIXTURES`) and re-used by the
 * manual eval script `scripts/eval-tutor.ts` which sends each prompt
 * to a real Haiku model via OpenRouter (eval suite b). Together (a)
 * and (b) form the hybrid eval suite mandated by ADR-008.
 *
 * (a) runs in CI on every PR — gate against structural regression.
 * (b) runs manually before each prompt bump — gate against empirical
 *     regression on real model behaviour. Coût ≈ $0.10/run on Haiku.
 *
 * Invariant: any new prompt rule (v1.2.0+) requires a new fixture here
 * AND a re-run of (b) before merge. Adding a fixture without bumping
 * the version means adding a regression check for the current version.
 */
import { describe, expect, it } from 'vitest';
import {
  getSystemPrompt,
  type TutorLang,
  type TutorMode,
} from '@/lib/ai/systemPrompt';

export type EvalCategory =
  | 'friction-1-compound'
  | 'friction-2-internal-mechanics'
  | 'friction-3-repeated-hint'
  | 'friction-4-satisfaction-signal'
  | 'standard-pedagogical';

export interface EvalFixture {
  id: string;
  category: EvalCategory;
  lang: TutorLang;
  mode: TutorMode;
  /** Verbatim learner question that would trigger the friction in v1.0.1. */
  userInput: string;
  /** Regex cue the v1.1.0 system prompt MUST contain to defend against the friction. */
  expectedPromptCue: RegExp;
  /** What a healthy v1.1.0 LLM response should look like (used by eval b script). */
  expectedBehaviour: string;
  notes: string;
}

export const EVAL_FIXTURES: readonly EvalFixture[] = [
  // ─── Friction 1 — compound questions interdites ──────────────────────────
  {
    id: 'F1-fr-1',
    category: 'friction-1-compound',
    lang: 'fr',
    mode: 'socratic',
    userInput:
      'Comment lister les fichiers, comment me déplacer dans un dossier, et comment supprimer un fichier ?',
    expectedPromptCue: /UNE SEULE question/i,
    expectedBehaviour:
      'LLM splits into 3 numbered bullets, one guiding question per bullet (not 3 bullets of 2-3 questions each).',
    notes: 'Compound 3-part question — pre-v1.1.0 behaviour: cluttered single block.',
  },
  {
    id: 'F1-en-1',
    category: 'friction-1-compound',
    lang: 'en',
    mode: 'socratic',
    userInput: 'How do I list files, change directory, and remove a file?',
    expectedPromptCue: /ONE SINGLE question/i,
    expectedBehaviour:
      'LLM splits into 3 numbered bullets, one guiding question per bullet.',
    notes: 'Same compound pattern in EN.',
  },

  // ─── Friction 2 — sur-explication des mécaniques internes ────────────────
  {
    id: 'F2-fr-1',
    category: 'friction-2-internal-mechanics',
    lang: 'fr',
    mode: 'direct',
    userInput: 'Comment rediriger la sortie de ls dans un fichier ?',
    expectedPromptCue: /pourquoi.*(APR[ÈE]S|apr[èe]s)/i,
    expectedBehaviour:
      'LLM gives the syntax `ls > fichier.txt` directly. Does NOT explain pipe buffering / file descriptors / shell parsing internals unless asked.',
    notes:
      'Pre-v1.1.0 behaviour: tutor over-explains "internal mechanics" (parsing, fd 1, etc.) when learner just wants the syntax.',
  },
  {
    id: 'F2-en-1',
    category: 'friction-2-internal-mechanics',
    lang: 'en',
    mode: 'socratic',
    userInput: 'How do I count lines in a file?',
    expectedPromptCue: /why.*AFTER/i,
    expectedBehaviour:
      'LLM asks 1 guiding question pointing toward `wc -l`. Does NOT digress into how `wc` reads streams / counts newlines / handles BOM unless asked.',
    notes: 'EN socratic over-explanation case.',
  },

  // ─── Friction 3 — indices répétés interdits ──────────────────────────────
  {
    id: 'F3-fr-1',
    category: 'friction-3-repeated-hint',
    lang: 'fr',
    mode: 'socratic',
    userInput:
      'J\'ai essayé `chmod 644` mais ça ne marche toujours pas. Tu as une autre idée ?',
    expectedPromptCue: /(jamais|pas).*(m[êe]me hint)/i,
    expectedBehaviour:
      'LLM reformulates the angle (e.g. "as-tu vérifié le propriétaire du fichier ?") OR switches to direct mode. Does NOT repeat the original hint about chmod modes.',
    notes:
      'Pre-v1.1.0 behaviour: same hint about chmod numeric vs symbolic re-served two turns in a row.',
  },
  {
    id: 'F3-nl-1',
    category: 'friction-3-repeated-hint',
    lang: 'nl',
    mode: 'socratic',
    userInput: 'Ik heb `cat fichier.txt` geprobeerd maar het werkt niet. Wat nog?',
    expectedPromptCue: /(nooit|niet).*(dezelfde hint)/i,
    expectedBehaviour:
      'LLM reformulates angle (path? permissions? file existence?) OR switches to direct. No re-served identical hint.',
    notes: 'NL socratic repeated-hint case.',
  },

  // ─── Friction 4 — conclusion ouverte interdite si satisfait ──────────────
  {
    id: 'F4-fr-soc-1',
    category: 'friction-4-satisfaction-signal',
    lang: 'fr',
    mode: 'socratic',
    userInput: 'Ah ok j\'ai compris, merci !',
    expectedPromptCue: /merci.*j'ai compris|r[ée]sum[ée] d['’]1 phrase/i,
    expectedBehaviour:
      'LLM closes with a single 1-sentence summary. Does NOT close with a new guiding question.',
    notes: 'Pre-v1.1.0 behaviour: even "ok j\'ai compris" got a follow-up question.',
  },
  {
    id: 'F4-fr-dir-1',
    category: 'friction-4-satisfaction-signal',
    lang: 'fr',
    mode: 'direct',
    userInput: 'Parfait, c\'est noté.',
    expectedPromptCue: /merci.*j'ai compris|r[ée]sum[ée] d['’]1 phrase/i,
    expectedBehaviour:
      'LLM closes with a 1-sentence summary instead of a practical follow-up question.',
    notes: 'Direct mode satisfaction signal — same rule applies.',
  },
  {
    id: 'F4-en-soc-1',
    category: 'friction-4-satisfaction-signal',
    lang: 'en',
    mode: 'socratic',
    userInput: 'Got it, thanks!',
    expectedPromptCue: /thanks.*got it|1-sentence summary/i,
    expectedBehaviour:
      'LLM closes with a 1-sentence summary, no new guiding question.',
    notes: 'EN satisfaction signal case.',
  },
  {
    id: 'F4-de-dir-1',
    category: 'friction-4-satisfaction-signal',
    lang: 'de',
    mode: 'direct',
    userInput: 'Perfekt, danke!',
    expectedPromptCue: /danke.*verstanden|Zusammenfassung in 1 Satz/i,
    expectedBehaviour:
      'LLM closes with a 1-sentence summary, no follow-up question.',
    notes: 'DE direct mode satisfaction signal case.',
  },

  // ─── Standard pédagogiques (baseline coverage) ────────────────────────────
  {
    id: 'STD-fr-soc-1',
    category: 'standard-pedagogical',
    lang: 'fr',
    mode: 'socratic',
    userInput: 'Comment je vois où je suis dans le terminal ?',
    expectedPromptCue: /tuteur\s+shell/i,
    expectedBehaviour:
      'LLM asks 1 guiding question pointing toward `pwd`. Stays in shell-tutor scope.',
    notes: 'Standard single-question pedagogical baseline.',
  },
  {
    id: 'STD-en-dir-1',
    category: 'standard-pedagogical',
    lang: 'en',
    mode: 'direct',
    userInput: 'What does `chmod +x` do?',
    expectedPromptCue: /shell\s+tutor/i,
    expectedBehaviour:
      'LLM gives the answer directly (makes file executable) and closes with one practical follow-up question.',
    notes: 'Standard direct mode baseline.',
  },
  {
    id: 'STD-nl-soc-1',
    category: 'standard-pedagogical',
    lang: 'nl',
    mode: 'socratic',
    userInput: 'Hoe weet ik welke processen er draaien?',
    expectedPromptCue: /shell-?tutor/i,
    expectedBehaviour:
      'LLM asks 1 guiding question pointing toward `ps`. Stays in shell-tutor scope.',
    notes: 'Standard NL socratic baseline.',
  },
  {
    id: 'STD-de-dir-1',
    category: 'standard-pedagogical',
    lang: 'de',
    mode: 'direct',
    userInput: 'Wie kopiere ich eine Datei?',
    expectedPromptCue: /Shell-?Tutor/i,
    expectedBehaviour:
      'LLM gives `cp source target` directly and closes with one practical follow-up question.',
    notes: 'Standard DE direct baseline.',
  },
];

describe('Eval suite (a) — structural prompt rule fixtures (THI-144 / ADR-008)', () => {
  it('exports a non-empty corpus of 10-15 fixtures', () => {
    expect(EVAL_FIXTURES.length).toBeGreaterThanOrEqual(10);
    expect(EVAL_FIXTURES.length).toBeLessThanOrEqual(15);
  });

  it('covers every friction category at least once', () => {
    const seen = new Set<EvalCategory>(EVAL_FIXTURES.map((f) => f.category));
    expect(seen.has('friction-1-compound')).toBe(true);
    expect(seen.has('friction-2-internal-mechanics')).toBe(true);
    expect(seen.has('friction-3-repeated-hint')).toBe(true);
    expect(seen.has('friction-4-satisfaction-signal')).toBe(true);
    expect(seen.has('standard-pedagogical')).toBe(true);
  });

  it('covers all 4 supported languages at least once', () => {
    const seen = new Set<TutorLang>(EVAL_FIXTURES.map((f) => f.lang));
    expect(seen.size).toBe(4);
  });

  it('has unique fixture ids', () => {
    const ids = EVAL_FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const fix of EVAL_FIXTURES) {
    it(`${fix.id} (${fix.category}, ${fix.lang}/${fix.mode}): system prompt contains the protective cue`, () => {
      const prompt = getSystemPrompt({ lang: fix.lang, mode: fix.mode });
      expect(prompt).toMatch(fix.expectedPromptCue);
    });
  }
});
