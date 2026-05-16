/**
 * MessageInput — auto-growing textarea bound to `useAiTutor.send`.
 *
 * Submits on Enter, inserts a newline on Shift+Enter. Caps input at the
 * sanitizer's 2000-char ceiling so the user gets immediate feedback rather
 * than a `too_long` rejection downstream. Disables itself while a stream
 * is in flight; the parent owns the abort affordance.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

const MAX_CHARS = 2000;

interface Props {
  onSend: (text: string) => Promise<void>;
  disabled: boolean;
}

export function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Skip auto-focus on touch devices: focusing a textarea pops the on-screen
    // keyboard immediately, which is intrusive when the user is still reading
    // the onboarding text. The user taps the textarea explicitly when ready.
    const isTouch =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (!isTouch) ref.current?.focus();
  }, []);

  const submit = async () => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || disabled) return;
    setText('');
    await onSend(trimmed);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
      e.preventDefault();
      void submit();
    }
  };

  const remaining = MAX_CHARS - text.length;
  const overshoot = remaining < 0;

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--github-border-primary)] p-3">
      <textarea
        ref={ref}
        name="ai-tutor-question"
        id="ai-tutor-question"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS + 100))}
        onKeyDown={onKey}
        rows={3}
        maxLength={MAX_CHARS}
        disabled={disabled}
        placeholder="Pose ta question sur la commande…"
        aria-label="Question pour le tuteur IA"
        className="w-full resize-none rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] p-2 text-base md:text-sm text-[var(--github-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0 disabled:opacity-60"
      />
      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${overshoot ? 'text-[var(--github-red)]' : 'text-[var(--github-text-secondary)]'}`}
          aria-live="polite"
        >
          {Math.max(0, remaining)} / {MAX_CHARS}
        </span>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || text.trim().length === 0}
          // THI-152 brick 5/9: min-h-11 (44 px) on mobile keeps the
          // critical "Envoyer" action above the Apple HIG floor;
          // md:min-h-9 (36 px) preserves the compact desktop density
          // matching the surrounding character-count meta line.
          className="rounded-md bg-[var(--github-accent)] px-3 py-1.5 text-sm font-medium text-white transition min-h-11 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--github-accent-hover)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0 md:min-h-9"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
