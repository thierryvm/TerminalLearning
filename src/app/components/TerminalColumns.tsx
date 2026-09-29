import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A table printed in the terminal (`ps`, `Get-Process`, `ls -l`), kept
 * unwrapped so its columns stay aligned. When it is wider than the terminal it
 * scrolls sideways: iOS shows no scrollbar at rest, so a fade on the right edge
 * says more is there, and the block becomes a focusable region so a keyboard
 * can scroll it. A table that fits adds no tab stop.
 */
export function TerminalColumns({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [atEnd, setAtEnd] = useState(true);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflows(max > 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(el);
    // The content can widen without the box resizing (a font that loads late).
    if (contentRef.current) observer?.observe(contentRef.current);
    return () => {
      el.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [update]);

  return (
    <div className="relative">
      <div
        ref={ref}
        tabIndex={overflows ? 0 : undefined}
        role={overflows ? 'region' : undefined}
        aria-label={overflows ? `Tableau : ${label}` : undefined}
        className="overflow-x-auto overscroll-x-contain pb-1.5 [scrollbar-width:thin] rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <div ref={contentRef} className="w-max min-w-full space-y-0.5">{children}</div>
      </div>
      {overflows && !atEnd && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[var(--github-bg)] to-transparent"
        />
      )}
    </div>
  );
}
