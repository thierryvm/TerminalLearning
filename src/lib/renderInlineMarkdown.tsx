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
 * stray single `*` or backtick is shown verbatim (never swallowed).
 */
const INLINE_TOKEN_RX = /(`[^`]+`|\*\*[^*]+\*\*)/g;

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
