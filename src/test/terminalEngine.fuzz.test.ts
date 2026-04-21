/**
 * Fuzzing tests for terminal engine — generated adversarial inputs to find edge cases.
 * These tests are generated via Claude and cover:
 * - Unicode edge cases (RTL, combining chars, zero-width)
 * - Path traversal attempts
 * - Command injection patterns
 * - Boundary inputs
 * - Recursive/deeply nested commands
 *
 * Run with: npm test -- terminalEngine.fuzz
 */

import { describe, it, expect } from 'vitest';
import { processCommand, createInitialState } from '../app/data/terminalEngine';

// Fuzz case generator — produces diverse adversarial inputs
function* generateFuzzCases(): Generator<{ input: string; category: string }> {
  const cases = [
    // Unicode edge cases
    { input: 'ls', category: 'unicode_bidi' }, // RTL override char would go here
    { input: 'echo "‎‏"', category: 'unicode_bidi' }, // Zero-width directional
    { input: 'cd "á̂̃"', category: 'unicode_combining' }, // Combining diacritics
    { input: 'ls 🎯📁🔒', category: 'unicode_emoji' },

    // Path traversal & symlink attempts
    { input: 'cd ..', category: 'path_traversal' },
    { input: 'cd ../../../../etc/passwd', category: 'path_traversal' },
    { input: 'cd ~/../../../root', category: 'path_traversal' },
    { input: 'cd ./.././.././././..', category: 'path_traversal' },
    { input: 'ls -la .../.../..', category: 'path_traversal' },

    // Command injection patterns (should be safe in this implementation)
    { input: 'echo $(echo test)', category: 'injection_subshell' },
    { input: 'echo `echo test`', category: 'injection_backtick' },
    { input: 'ls $(cd / && pwd)', category: 'injection_nested_subshell' },
    { input: 'echo "$(pwd)$(whoami)$(id)"', category: 'injection_multiple' },

    // Boundary inputs
    { input: '', category: 'boundary_empty' },
    { input: ' ', category: 'boundary_space' },
    { input: '     ', category: 'boundary_spaces' },
    { input: '\t\t\t', category: 'boundary_tabs' },
    { input: 'ls ' + 'a'.repeat(1000), category: 'boundary_long_arg' },
    { input: 'ls ' + '/'.repeat(500), category: 'boundary_long_path' },

    // Recursive/nested patterns
    { input: 'ls -la | grep -v "^d" | head -n 1000', category: 'recursive_pipes' },
    { input: 'find . -name "*.txt" -o -name "*.md" -o -name "*.js"', category: 'recursive_complex' },
    { input: 'cd /home/user && cd /home/user && cd /home/user', category: 'recursive_commands' },

    // Special characters & sequences
    { input: 'ls\0test', category: 'special_null_byte' }, // Null byte
    { input: 'ls\x1b[31m', category: 'special_ansi_codes' }, // ANSI color codes
    { input: 'echo -e "\\x00\\x01\\x02"', category: 'special_control_chars' },

    // Git-specific edge cases
    { input: 'git log --all --graph', category: 'git_complex_log' },
    { input: 'git log invalid-ref', category: 'git_invalid_ref' },
    { input: 'git diff //', category: 'git_odd_paths' },

    // Environment variable edge cases
    { input: 'echo $NONEXISTENT_VAR_12345', category: 'env_nonexistent' },
    { input: 'echo $PATH$PATH$PATH', category: 'env_multiple' },
    { input: 'export VAR=""', category: 'env_empty_value' },
    { input: 'export VAR=$(echo hi)', category: 'env_subshell_value' },

    // Windows-specific commands (cross-platform test)
    { input: 'dir /s /b', category: 'windows_dir' },
    { input: 'Get-ChildItem -Recurse', category: 'windows_powershell' },
    { input: 'dir ..\\..\\..\\', category: 'windows_traversal' },

    // macOS-specific
    { input: 'open .', category: 'macos_open' },
    { input: 'pbcopy < file.txt', category: 'macos_pbcopy' },

    // Mixed case / whitespace handling
    { input: 'LS', category: 'case_upper' },
    { input: 'Ls -LA', category: 'case_mixed' },
    { input: 'ls\n\nls', category: 'multiline_commands' },

    // Very long single command
    {
      input: 'echo "' + 'a'.repeat(10000) + '"',
      category: 'boundary_very_long_string',
    },

    // Deeply nested quotes
    { input: 'echo "$(echo $(echo $(echo test)))"', category: 'nested_quotes' },

    // Special patterns that might cause ReDoS in naive regex
    { input: 'find . -regex "a*a*a*a*a*a*a*a*a*a*a*a*a*a*b"', category: 'regex_dos_pattern' },
  ];

  for (const c of cases) {
    yield c;
  }
}

describe('terminalEngine — Fuzz Tests', () => {
  for (const fuzzCase of generateFuzzCases()) {
    const { input, category } = fuzzCase;
    const displayInput = input.length > 50 ? input.slice(0, 47) + '...' : input;

    it(`handles ${category}: "${displayInput}"`, () => {
      const state = createInitialState();

      // Should never crash, timeout, or throw
      expect(() => {
        const startTime = performance.now();
        const result = processCommand(state, input);
        const duration = performance.now() - startTime;

        // Sanity checks
        expect(result).toBeDefined();
        expect(Array.isArray(result.lines)).toBe(true);
        expect(duration).toBeLessThan(1000); // Should complete in < 1 second

        // Lines should be valid
        for (const line of result.lines) {
          expect(typeof line.text).toBe('string');
          expect(['output', 'error', 'info', 'success']).toContain(line.type);
        }
      }).not.toThrow();
    });
  }

  it('completes all fuzz cases under 10 seconds total', () => {
    const state = createInitialState();
    const startTime = performance.now();
    let caseCount = 0;

    for (const fuzzCase of generateFuzzCases()) {
      processCommand(state, fuzzCase.input);
      caseCount++;
    }

    const totalDuration = performance.now() - startTime;
    expect(totalDuration).toBeLessThan(10000);
    console.log(
      `✅ Fuzzed ${caseCount} cases in ${totalDuration.toFixed(1)}ms (avg ${(totalDuration / caseCount).toFixed(1)}ms/case)`
    );
  });
});
