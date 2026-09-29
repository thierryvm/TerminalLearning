/**
 * Reference examples that still print an error in the practice terminal
 * (commandReference.test.ts). The list may only shrink: fix the engine, then
 * delete the line. Commands listed in NOT_SIMULATED (commandExamples.ts) are
 * exempt, since the reference already tells the learner they are not simulated.
 *
 * Empty since 26 September 2026: the 32 engine gaps the first replay found
 * (cat -n, grep -r, Get-Date, Get-Help, Set-Content, git commit -am…) are fixed.
 * A new entry needs a planned engine fix, never a way to silence a new failure.
 *
 * Key: `<command id> [<env>] <example>`.
 */
export const KNOWN_REFERENCE_GAPS = new Set<string>([]);
