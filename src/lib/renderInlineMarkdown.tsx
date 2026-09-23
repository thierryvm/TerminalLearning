import type { ReactNode } from 'react';

/**
 * Minimal inline-markdown renderer for lesson content blocks.
 *
 * Historically `LessonPage` only parsed backtick `` `code` `` spans, so the
 * `**bold**` markdown that ~22 lessons authored leaked to learners as literal
 * asterisks (caught visually 30/05/2026). This helper renders BOTH:
 *
 *  - `` `code` `` → <code> (monospace chip, unchanged styling)
 *  - `**bold**`   → <strong>
 *
 * Scope is deliberately inline-only: no lists, headings, or links (lesson
 * structure uses dedicated `ContentBlock` types — tip/info/warning/code — for
 * those). Nested code inside bold (`` **`x`** ``) is rare; it falls back to
 * literal text inside the <strong> rather than nesting, which is acceptable.
 *
 * Tokens that do not match either pattern render as plain <span> text, so a
 * stray single `*`, an unclosed `**`, or a lone backtick is shown verbatim
 * (never swallowed).
 *
 * The bold sub-pattern allows a single `*` inside the span (e.g. `**a * b**`)
 * via `\*(?!\*)` — it only stops at the closing `**` — so legitimate bold
 * containing an asterisk is not missed (Sourcery PR #332).
 */
const INLINE_TOKEN_RX = /(`[^`]+`|\*\*(?:[^*]|\*(?!\*))+\*\*)/g;

export function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(INLINE_TOKEN_RX).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 bg-[#21262d] text-emerald-400 rounded text-sm font-mono border border-[var(--github-border-primary)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-[var(--github-text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Plain-text twin of `renderInlineMarkdown`, for surfaces that cannot render
 * markup — the terminal welcome message showed the instruction's backticks and
 * asterisks literally (check-up P1, 23 September 2026). Same token rules: only
 * a complete `` `code` `` or `**bold**` span loses its markers; a lone
 * backtick or asterisk stays verbatim.
 */
export function stripInlineMarkdown(text: string): string {
  return text.replace(INLINE_TOKEN_RX, (part) =>
    part.startsWith('`') ? part.slice(1, -1) : part.slice(2, -2),
  );
}
