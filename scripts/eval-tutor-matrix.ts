/// <reference types="node" />
/**
 * Eval suite — matrix run — Stage B1 (THI-260).
 *
 * Boucle sur N modèles × M fixtures EVAL_FIXTURES pour valider
 * empiriquement la qualité des modèles candidats du tuteur IA BYOK.
 *
 * Scope Stage B1 LITE (décision @cc-tl 24/05/2026) : matrice modèles ×
 * fixtures actuelles. L'aspect "rôles" est reporté Stage B1.b (gate
 * Stage B2 system prompts par rôle — n'existent pas encore au moment
 * de l'écriture de ce script).
 *
 * Usage :
 *   OPENROUTER_API_KEY=sk-or-v1-... npx tsx scripts/eval-tutor-matrix.ts
 *
 *   # Override liste modèles via CSV (utile pour debug ciblé) :
 *   MODELS_CSV="anthropic/claude-haiku-4.5,openai/gpt-4o-mini" npx tsx scripts/eval-tutor-matrix.ts
 *
 * Coût estimé matrice complète (10 modèles × 14 fixtures = 140 calls,
 * ~700 tokens par call) : ~$0.60 USD avec frontier 2025-2026 (gpt-5.5
 * et opus 4.7 dominent le budget — output 25-30 $/M). Budget OpenRouter
 * dispo cap key terminal-learning : ~$4.67. Marge x7.
 *
 * Refresh modèles 2026-05-24 (post-feedback @thierry : « les modèles
 * choisi doivent être récents, 2026 voire 2025 si pertinent ») —
 * pas de gpt-4o, pas de gemini-2.0-flash, pas de qwen-2.5, pas de
 * llama-3.3 (Llama 4 non hosté sur OpenRouter au 24/05/2026).
 *
 * Outputs :
 *   - `.tmp/eval-tutor-matrix-<timestamp>.md` (verbose, par-call)
 *   - `docs/audits/eval-tutor-matrix-<date>.md` (synthèse table modèle ×
 *     catégorie, exploitée pour décider la whitelist V1.5)
 *
 * Note sécurité : le script lit la clé via env var (pas .env.local
 * directement). Pour éviter tout leak, **ne jamais** afficher la clé dans
 * un message d'erreur ou un log — la doctrine 17/05/2026 (token output
 * side) s'applique à toute valeur sensible passée à un sub-processus.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { EVAL_FIXTURES, type EvalFixture } from '../src/lib/ai/eval/fixtures';
import { getSystemPrompt } from '../src/lib/ai/systemPrompt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

// ─── Configuration matrice ───────────────────────────────────────────────

/**
 * Naming OpenRouter officiel (avec point, pas tiret). Brief 21/05 verrouille.
 *
 * Refresh whitelist 24/05/2026 — frontier 2025-2026 uniquement, classés
 * par date de release OpenRouter décroissante :
 *  - Claude 4.x (Opus 4.7 avr 2026 / Sonnet 4.6 fév 2026 / Haiku 4.5 oct 2025)
 *  - OpenAI GPT-5.5 (avr 2026) + GPT-5 / 5-mini (août 2025)
 *  - Google Gemini 3.5 Flash (mai 2026) + 2.5 Flash Lite (juil 2025)
 *  - Qwen 3.7 Max (mai 2026, flagship)
 *  - DeepSeek V3.2 (déc 2025)
 *
 * Pas de Meta Llama 4 (non hosté sur OpenRouter au 24/05/2026). Pas
 * de Grok / Mistral / Nova (hors scope provider pour le tuteur — focus
 * 4 providers stratégiques de l'app).
 */
const DEFAULT_MODELS: readonly string[] = [
  'anthropic/claude-opus-4.7',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-haiku-4.5',
  'openai/gpt-5.5',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'google/gemini-3.5-flash',
  'google/gemini-2.5-flash-lite',
  'qwen/qwen3.7-max',
  'deepseek/deepseek-v3.2',
];

/**
 * Prix OpenRouter publics (validés via API live `/api/v1/models` au
 * 24/05/2026, post-refresh frontier) — USD per million tokens.
 */
const PRICING: Record<string, { promptPerM: number; completionPerM: number }> = {
  'anthropic/claude-opus-4.7': { promptPerM: 5.0, completionPerM: 25.0 },
  'anthropic/claude-sonnet-4.6': { promptPerM: 3.0, completionPerM: 15.0 },
  'anthropic/claude-haiku-4.5': { promptPerM: 1.0, completionPerM: 5.0 },
  'openai/gpt-5.5': { promptPerM: 5.0, completionPerM: 30.0 },
  'openai/gpt-5': { promptPerM: 1.25, completionPerM: 10.0 },
  'openai/gpt-5-mini': { promptPerM: 0.25, completionPerM: 2.0 },
  'google/gemini-3.5-flash': { promptPerM: 1.5, completionPerM: 9.0 },
  'google/gemini-2.5-flash-lite': { promptPerM: 0.1, completionPerM: 0.4 },
  'qwen/qwen3.7-max': { promptPerM: 2.5, completionPerM: 7.5 },
  'deepseek/deepseek-v3.2': { promptPerM: 0.252, completionPerM: 0.378 },
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── Types ────────────────────────────────────────────────────────────────

type Verdict = 'PASS' | 'WARN' | 'FAIL' | 'N/A' | 'ERROR';

interface CallResult {
  model: string;
  fixture: EvalFixture;
  verdict: Verdict;
  notes: string[];
  responseChars: number;
  durationMs: number;
  modelResponse: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

interface OpenRouterChoice {
  message: { role: string; content: string };
  finish_reason?: string;
}

interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  usage?: OpenRouterUsage;
  error?: { message: string; code?: string };
}

// ─── Heuristics (clone de eval-tutor.ts, single-call grade) ──────────────

function applyHeuristics(
  fix: EvalFixture,
  response: string,
): { verdict: Verdict; notes: string[] } {
  const notes: string[] = [];
  const trimmed = response.trim();
  const questionMarks = (trimmed.match(/\?/g) || []).length;
  const numberedBullets = (trimmed.match(/^\s*\d[\.\)]/gm) || []).length;
  const chars = trimmed.length;

  switch (fix.category) {
    case 'friction-1-compound':
      if (numberedBullets >= 2) {
        notes.push(`PASS: ${numberedBullets} numbered bullets.`);
        return { verdict: 'PASS', notes };
      }
      notes.push(`WARN: ${numberedBullets} bullets (expected ≥2 for compound input).`);
      return { verdict: 'WARN', notes };

    case 'friction-2-internal-mechanics':
      if (chars < 800) {
        notes.push(`PASS: ${chars} chars (< 800, curbed).`);
        return { verdict: 'PASS', notes };
      }
      if (chars < 1500) {
        notes.push(`WARN: ${chars} chars (over 800 threshold).`);
        return { verdict: 'WARN', notes };
      }
      notes.push(`FAIL: ${chars} chars (significantly over 800).`);
      return { verdict: 'FAIL', notes };

    case 'friction-3-repeated-hint':
      notes.push('N/A: requires multi-turn run (current eval is single-turn).');
      return { verdict: 'N/A', notes };

    case 'friction-4-satisfaction-signal':
      if (questionMarks === 0) {
        notes.push('PASS: 0 question marks (closed with summary).');
        return { verdict: 'PASS', notes };
      }
      if (questionMarks === 1) {
        notes.push('WARN: 1 question mark (may be rhetorical).');
        return { verdict: 'WARN', notes };
      }
      notes.push(`FAIL: ${questionMarks} question marks (closed with questions).`);
      return { verdict: 'FAIL', notes };

    case 'standard-pedagogical':
      notes.push(`Captured: ${chars} chars, ${questionMarks} question marks.`);
      return { verdict: 'N/A', notes };
  }
}

// ─── OpenRouter call ─────────────────────────────────────────────────────

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ content: string; ms: number; usage: OpenRouterUsage }> {
  const start = Date.now();
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://terminallearning.dev',
      'X-Title': 'Terminal Learning - eval-tutor-matrix.ts',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });
  const ms = Date.now() - start;
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const data = (await res.json()) as OpenRouterResponse;
  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    ms,
    usage: data.usage ?? {},
  };
}

function buildUserMessage(fix: EvalFixture): string {
  return `<user_question>\n${fix.userInput}\n</user_question>`;
}

function computeCost(model: string, usage: OpenRouterUsage): number {
  const p = PRICING[model];
  if (!p) return 0;
  const prompt = ((usage.prompt_tokens ?? 0) * p.promptPerM) / 1_000_000;
  const completion = ((usage.completion_tokens ?? 0) * p.completionPerM) / 1_000_000;
  return prompt + completion;
}

// ─── Report generation ──────────────────────────────────────────────────

function formatVerboseReport(results: CallResult[], models: readonly string[]): string {
  const ts = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`# Eval suite matrix — verbose report`);
  lines.push('');
  lines.push(`- **Date** : ${ts}`);
  lines.push(`- **Models** : ${models.length}`);
  lines.push(`- **Fixtures** : ${EVAL_FIXTURES.length}`);
  lines.push(`- **Total calls** : ${results.length}`);

  const totalCost = results.reduce((s, r) => s + r.costUsd, 0);
  lines.push(`- **Total cost** : $${totalCost.toFixed(4)} USD`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const model of models) {
    lines.push(`## ${model}`);
    lines.push('');
    const modelResults = results.filter((r) => r.model === model);
    for (const r of modelResults) {
      lines.push(`### ${r.fixture.id} — ${r.fixture.category}`);
      lines.push(
        `- **Verdict** : ${r.verdict} · **Notes** : ${r.notes.join(' · ')}`,
      );
      lines.push(
        `- **Tokens** : ${r.promptTokens} prompt + ${r.completionTokens} completion = ${r.promptTokens + r.completionTokens}`,
      );
      lines.push(`- **Cost** : $${r.costUsd.toFixed(5)} · **Duration** : ${r.durationMs} ms`);
      lines.push('');
      lines.push('```');
      lines.push(r.modelResponse);
      lines.push('```');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function formatSynthesisReport(
  results: CallResult[],
  models: readonly string[],
): string {
  const ts = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`# Eval matrix synthesis — Stage B1 (THI-260)`);
  lines.push('');
  lines.push(`> Generated by \`scripts/eval-tutor-matrix.ts\` — ${ts}`);
  lines.push('');
  lines.push(
    '## Scope du run',
  );
  lines.push('');
  lines.push(
    `**Stage B1 LITE** : matrice ${models.length} modèles × ${EVAL_FIXTURES.length} fixtures EVAL_FIXTURES (frictions ChatGPT cross-validation + standard pédagogique). System prompt unique = \`tutor/v1.1.0\` rôle élève (les rôles teacher/admin/superadmin sont gated Stage B2 — system prompts par rôle pas encore créés).`,
  );
  lines.push('');

  // Tableau modèle × verdict counts
  lines.push('## Table modèles × verdicts');
  lines.push('');
  lines.push(
    '| Modèle | PASS | WARN | FAIL | N/A | ERROR | Cost USD | Avg ms |',
  );
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const model of models) {
    const mr = results.filter((r) => r.model === model);
    const pass = mr.filter((r) => r.verdict === 'PASS').length;
    const warn = mr.filter((r) => r.verdict === 'WARN').length;
    const fail = mr.filter((r) => r.verdict === 'FAIL').length;
    const na = mr.filter((r) => r.verdict === 'N/A').length;
    const err = mr.filter((r) => r.verdict === 'ERROR').length;
    const cost = mr.reduce((s, r) => s + r.costUsd, 0).toFixed(4);
    const validResults = mr.filter((r) => r.verdict !== 'ERROR' && r.durationMs > 0);
    const avgMs =
      validResults.length > 0
        ? Math.round(
            validResults.reduce((s, r) => s + r.durationMs, 0) / validResults.length,
          )
        : 0;
    lines.push(
      `| \`${model}\` | ${pass} | ${warn} | ${fail} | ${na} | ${err} | $${cost} | ${avgMs} |`,
    );
  }

  lines.push('');

  // Tableau modèle × catégorie (PASS rate)
  lines.push('## Table modèles × catégories (PASS count)');
  lines.push('');
  const categories = [
    'friction-1-compound',
    'friction-2-internal-mechanics',
    'friction-3-repeated-hint',
    'friction-4-satisfaction-signal',
    'standard-pedagogical',
  ] as const;
  const headerCats = categories.map((c) => c.replace('friction-', 'F').replace(/-.*/, '')).join(' | ');
  lines.push(`| Modèle | ${headerCats} |`);
  lines.push(`|---|${categories.map(() => '---').join('|')}|`);
  for (const model of models) {
    const cells: string[] = [];
    for (const cat of categories) {
      const subset = results.filter((r) => r.model === model && r.fixture.category === cat);
      const pass = subset.filter((r) => r.verdict === 'PASS').length;
      const total = subset.length;
      cells.push(`${pass}/${total}`);
    }
    lines.push(`| \`${model}\` | ${cells.join(' | ')} |`);
  }

  lines.push('');
  lines.push('## Recommandation whitelist (à valider @thierry)');
  lines.push('');
  lines.push(
    '> Critère brut : PASS count sur frictions F1/F2/F4 (F3 est N/A en single-turn). Lire les réponses verbatim dans le rapport `.tmp/eval-tutor-matrix-*.md` pour la décision finale.',
  );
  lines.push('');
  lines.push(
    '## Coût total',
  );
  const totalCost = results.reduce((s, r) => s + r.costUsd, 0);
  const totalTokens = results.reduce(
    (s, r) => s + r.promptTokens + r.completionTokens,
    0,
  );
  lines.push('');
  lines.push(`- **Total tokens** : ${totalTokens.toLocaleString()}`);
  lines.push(`- **Total cost** : $${totalCost.toFixed(4)} USD`);
  lines.push(
    // Budget restant non hardcodé : la cap key OpenRouter peut évoluer
    // (recharge, rotation, modif Vercel env). Le total cost ci-dessus est
    // suffisant pour décider si un run rentre dans la marge ; le restant
    // exact reste consultable via `openrouter.ai/settings/keys`.
  );

  lines.push('');
  lines.push('## Étapes suivantes');
  lines.push('');
  lines.push('1. @thierry lit les réponses verbatim et valide la whitelist par catégorie');
  lines.push('2. Lancer `llm-security-auditor` (Opus 4.7, 7 couches) post-eval pour challenger empiriquement refus + jailbreaks + multi-turn drift');
  lines.push('3. Décider configuration UI : picker modèle drawer + filtrage par rôle (Stage B3)');
  lines.push('4. Stage B2 : system prompts par rôle (tutor/teacher/admin/superadmin) — débloque Stage B1.b (4 rôles × 5 fixtures réel)');

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing OPENROUTER_API_KEY env var.');
    console.error('   OPENROUTER_API_KEY=sk-or-v1-... npx tsx scripts/eval-tutor-matrix.ts');
    process.exit(2);
  }

  const modelsCsv = process.env.MODELS_CSV;
  const models = modelsCsv
    ? modelsCsv.split(',').map((m) => m.trim()).filter((m) => m.length > 0)
    : DEFAULT_MODELS;

  console.log(`Matrix eval — ${models.length} models × ${EVAL_FIXTURES.length} fixtures = ${models.length * EVAL_FIXTURES.length} calls`);
  console.log('Models:');
  for (const m of models) console.log(`  - ${m}`);
  console.log('');

  const results: CallResult[] = [];
  const totalCalls = models.length * EVAL_FIXTURES.length;
  let callIndex = 0;

  for (const model of models) {
    console.log(`\n=== ${model} ===`);
    for (const fix of EVAL_FIXTURES) {
      callIndex++;
      const systemPrompt = getSystemPrompt({ lang: fix.lang, mode: fix.mode });
      const userMessage = buildUserMessage(fix);
      process.stdout.write(
        `  [${callIndex}/${totalCalls}] ${fix.id} (${fix.category}, ${fix.lang}/${fix.mode}) ... `,
      );
      try {
        const { content, ms, usage } = await callOpenRouter(
          apiKey,
          model,
          systemPrompt,
          userMessage,
        );
        const h = applyHeuristics(fix, content);
        const cost = computeCost(model, usage);
        results.push({
          model,
          fixture: fix,
          verdict: h.verdict,
          notes: h.notes,
          responseChars: content.trim().length,
          durationMs: ms,
          modelResponse: content,
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
          costUsd: cost,
        });
        console.log(`${h.verdict} (${ms}ms, $${cost.toFixed(5)})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`ERROR: ${msg}`);
        results.push({
          model,
          fixture: fix,
          verdict: 'ERROR',
          notes: [msg],
          responseChars: 0,
          durationMs: 0,
          modelResponse: `[ERROR] ${msg}`,
          promptTokens: 0,
          completionTokens: 0,
          costUsd: 0,
        });
      }
    }
  }

  const tmpDir = join(REPO_ROOT, '.tmp');
  const auditsDir = join(REPO_ROOT, 'docs', 'audits');
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(auditsDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dateOnly = new Date().toISOString().slice(0, 10);
  const verbosePath = join(tmpDir, `eval-tutor-matrix-${stamp}.md`);
  const synthesisPath = join(auditsDir, `eval-tutor-matrix-${dateOnly}.md`);

  writeFileSync(verbosePath, formatVerboseReport(results, models), 'utf8');
  writeFileSync(synthesisPath, formatSynthesisReport(results, models), 'utf8');

  console.log('');
  console.log(`Verbose report (gitignored .tmp/) : ${verbosePath}`);
  console.log(`Synthesis report (docs/audits)    : ${synthesisPath}`);
  console.log('');
  const totalCost = results.reduce((s, r) => s + r.costUsd, 0);
  console.log(`Total cost: $${totalCost.toFixed(4)} USD`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
