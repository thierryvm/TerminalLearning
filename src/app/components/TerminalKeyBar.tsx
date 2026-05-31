import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Mobile special-character toolbar for the terminal sandbox (THI-307).
 *
 * On soft keyboards (iOS/Android) the shell characters that unlock the
 * redirection / pipes / options lessons (`|` `>` `~` `-` …) are buried 2–4
 * taps deep or simply absent. This horizontal, scrollable bar surfaces them as
 * 44px tap targets right above the input. It is rendered only on coarse-pointer
 * (touch) viewports by the parent — never on desktop.
 *
 * The full set never fits a phone width, so the row scrolls horizontally and
 * shows edge fades (right while more keys remain, left once scrolled) to make
 * the scrollability obvious — otherwise a clipped key reads as a bug.
 *
 * Keyboard-persistence: every button prevents the default `pointerdown` action
 * so the input never loses focus (iOS Safari fires pointerdown, not mousedown,
 * on buttons). The native keyboard stays open while keys are tapped; the
 * `click` still fires.
 */

interface TerminalKeyBarProps {
  /** Insert text at the current caret position in the terminal input. */
  onInsert: (text: string) => void;
  /** Trigger Tab autocompletion. */
  onTab: () => void;
  /** Recall the previous command (history ↑). */
  onHistoryPrev: () => void;
  /** Recall the next command (history ↓). */
  onHistoryNext: () => void;
}

interface InsertKey {
  /** Character(s) inserted at the caret. */
  value: string;
  /** Visible glyph on the key. */
  display: string;
  /** Accessible name (announced by screen readers). */
  label: string;
}

// Shell characters buried deep on (or absent from) mobile soft keyboards,
// ordered by beginner frequency — the pipe and redirections lead because they
// unlock the redirection/pipes lessons that are otherwise untypable on a phone.
const INSERT_KEYS: InsertKey[] = [
  { value: '|', display: '|', label: 'pipe (barre verticale)' },
  { value: '>', display: '>', label: 'redirection sortie' },
  { value: '>>', display: '>>', label: 'redirection en ajout' },
  { value: '<', display: '<', label: 'redirection entrée' },
  { value: '~', display: '~', label: 'tilde (dossier personnel)' },
  { value: '/', display: '/', label: 'slash' },
  { value: '-', display: '-', label: 'tiret (options)' },
  { value: '*', display: '*', label: 'astérisque (joker)' },
  { value: '&', display: '&', label: 'esperluette (arrière-plan)' },
  { value: '&&', display: '&&', label: 'et logique' },
  { value: '$', display: '$', label: 'dollar (variable)' },
  { value: ';', display: ';', label: 'point-virgule' },
  { value: '"', display: '"', label: 'guillemet double' },
  { value: "'", display: "'", label: 'apostrophe' },
  { value: '`', display: '`', label: 'accent grave (backtick)' },
];

function KeyButton({
  children,
  onPress,
  label,
}: {
  children: ReactNode;
  onPress: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      // Touch-only bar — keep it out of the physical-keyboard Tab order (the
      // input already exposes ↑/↓/Tab). VoiceOver can still reach it by swipe.
      tabIndex={-1}
      // Keep the input focused so the native mobile keyboard stays open while
      // tapping keys. preventDefault on pointerdown blocks the focus shift on
      // both touch (iOS Safari fires pointerdown, not mousedown, on buttons)
      // and mouse; the subsequent click still fires the action.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onPress}
      aria-label={label}
      className="flex shrink-0 items-center justify-center min-w-[2.75rem] h-11 px-2 rounded-md font-mono text-sm text-[var(--github-text-primary)] bg-[var(--github-bg)] border border-[var(--github-border-primary)] active:bg-[var(--github-border-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0"
    >
      {children}
    </button>
  );
}

export function TerminalKeyBar({ onInsert, onTab, onHistoryPrev, onHistoryNext }: TerminalKeyBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  // Starts false: on a phone the key set always overflows, so the right fade
  // must be present from the first paint (updateEdges corrects it after mount
  // for the rare non-overflowing case). Avoids a one-frame missing-fade flash.
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [updateEdges]);

  return (
    <div className="relative shrink-0 border-t border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
      <div
        ref={scrollRef}
        role="toolbar"
        aria-label="Touches spéciales du terminal"
        aria-orientation="horizontal"
        className="flex items-stretch gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none]"
      >
        <KeyButton onPress={onHistoryPrev} label="commande précédente">↑</KeyButton>
        <KeyButton onPress={onHistoryNext} label="commande suivante">↓</KeyButton>
        <KeyButton onPress={onTab} label="autocomplétion (Tab)">⇥</KeyButton>
        <span
          className="w-px self-center h-6 mx-0.5 shrink-0 bg-[var(--github-border-primary)]"
          aria-hidden="true"
        />
        {INSERT_KEYS.map((k) => (
          <KeyButton key={k.value} onPress={() => onInsert(k.value)} label={`insérer ${k.label}`}>
            {k.display}
          </KeyButton>
        ))}
      </div>

      {/* Scroll affordances — fade the edge that still hides keys. */}
      {!atStart && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[var(--github-border-secondary)] to-transparent"
        />
      )}
      {!atEnd && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[var(--github-border-secondary)] to-transparent"
        />
      )}
    </div>
  );
}

// Exported for the invariants test (every key must be labelled and non-empty).
export { INSERT_KEYS };
