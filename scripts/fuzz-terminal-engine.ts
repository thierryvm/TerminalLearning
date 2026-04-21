/**
 * Fuzzing script for terminal engine — generates adversarial inputs via Claude
 * and reports divergences, crashes, or anomalies.
 *
 * Usage: npx tsx scripts/fuzz-terminal-engine.ts [--count=100]
 *
 * Generates:
 * - Unicode edge cases (RTL, combining chars, zero-width)
 * - Path traversal attempts (../, .., ~, symlink loops)
 * - Command injection patterns (backtick, $(), subshells)
 * - Boundary inputs (empty, very long, special chars)
 * - Recursive/deeply nested commands
 *
 * Output: fuzz-results.jsonl (one test case per line)
 */

import Anthropic from '@anthropic-ai/sdk';
import { processCommand, createInitialState } from '../src/app/data/terminalEngine';
import type { TerminalState } from '../src/app/data/terminalEngine';
import * as fs from 'fs';

const client = new Anthropic();
const COUNT = parseInt(process.argv.find((a) => a.startsWith('--count='))?.split('=')[1] ?? '50');
const OUTPUT = 'fuzz-results.jsonl';

interface FuzzCase {
  input: string;
  category: string;
  result?: 'ok' | 'crash' | 'timeout' | 'anomaly';
  error?: string;
  output_lines?: number;
  duration_ms?: number;
}

async function generateFuzzCases(count: number): Promise<string[]> {
  const categories = [
    'Unicode edge cases (RTL, combining, zero-width, emoji)',
    'Path traversal (../, .., ~, symlinks, loops)',
    'Command injection (backtick, $(), subshell nesting)',
    'Boundary inputs (empty, 10kb, null bytes)',
    'Recursive patterns (deep nesting, circular refs)',
    'Special sequences (ansi codes, control chars, BOM)',
    'Git edge cases (bad refs, corrupted state)',
    'Environment variable tricky values',
  ];

  const prompt = `You are a security/fuzzing expert. Generate ${count} diverse, adversarial terminal commands to stress-test a terminal emulator engine.

Focus on these categories (distribute evenly):
${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Return ONLY a JSON array of strings (command inputs), no explanations:
["cmd1", "cmd2", ...]

Make them:
- Diverse (test different edge cases)
- Realistic (commands a real user might accidentally run)
- Edge-case-heavy (empty strings, very long paths, unicode, injection patterns)
- Safe (no actual destructive commands, but testing behavior)

Examples:
- "ls $(echo $(echo ../../../))"
- "cd ~/../../../../../../../etc"
- "echo -e '\\u202e\\u200e\\u200f'"
- "find . -path '*/.*' -name '' -print"
- "cd $'\\x00\\x00'"`;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Failed to parse Claude response:', text.slice(0, 200));
    return [];
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('JSON parse error:', jsonMatch[0].slice(0, 200));
    return [];
  }
}

async function runFuzzTest(input: string): Promise<FuzzCase> {
  const category = classifyInput(input);
  const start = performance.now();

  let result: FuzzCase = { input, category };

  try {
    // Create fresh state for each test
    const state = createInitialState();

    // Set a timeout for runaway inputs
    const promise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout >5000ms')), 5000);
      try {
        const output = processCommand(state, input);
        clearTimeout(timer);
        result.result = 'ok';
        result.output_lines = output.lines.length;
        resolve();
      } catch (e) {
        clearTimeout(timer);
        reject(e);
      }
    });

    await promise;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    if (error.includes('Timeout')) {
      result.result = 'timeout';
    } else if (error.includes('ReDoS') || error.includes('stack')) {
      result.result = 'crash';
      result.anomaly = true;
    } else {
      result.result = 'anomaly';
      result.error = error.slice(0, 100);
    }
  }

  result.duration_ms = Math.round(performance.now() - start);
  return result;
}

function classifyInput(input: string): string {
  if (input.includes('..') || input.includes('~')) return 'path_traversal';
  if (input.includes('$') || input.includes('`') || input.includes('$(')) return 'injection';
  if (/[‎‏‮]/.test(input)) return 'unicode_bidi';
  if (input.length > 1000) return 'boundary_long';
  if (input === '') return 'boundary_empty';
  if (/[\x00-\x1f]/.test(input)) return 'control_chars';
  if (input.includes('git')) return 'git_edge_case';
  return 'general';
}

async function main() {
  console.log(`🔄 Generating ${COUNT} fuzz cases via Claude...`);
  const inputs = await generateFuzzCases(COUNT);

  if (inputs.length === 0) {
    console.error('Failed to generate test cases');
    process.exit(1);
  }

  console.log(`✅ Generated ${inputs.length} test cases`);
  console.log(`🧪 Running fuzz tests...`);

  const stream = fs.createWriteStream(OUTPUT, { flags: 'w' });
  let passed = 0,
    timeouts = 0,
    crashes = 0,
    anomalies = 0;

  for (let i = 0; i < inputs.length; i++) {
    const result = await runFuzzTest(inputs[i]);
    stream.write(JSON.stringify(result) + '\n');

    if (result.result === 'ok') passed++;
    else if (result.result === 'timeout') timeouts++;
    else if (result.result === 'crash') crashes++;
    else anomalies++;

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\r  ${i + 1}/${inputs.length}`);
    }
  }

  stream.end();
  console.log(`\n\n📊 Fuzz Results:`);
  console.log(`  ✅ Passed:     ${passed}`);
  console.log(`  ⏱️  Timeouts:   ${timeouts}`);
  console.log(`  💥 Crashes:    ${crashes}`);
  console.log(`  ⚠️  Anomalies:  ${anomalies}`);
  console.log(`\n📄 Full results: ${OUTPUT}`);

  if (crashes > 0 || timeouts > 0) {
    console.log(`\n⚠️  Found ${crashes + timeouts} potential issues — review ${OUTPUT}`);
    process.exit(1);
  }
}

main().catch(console.error);
