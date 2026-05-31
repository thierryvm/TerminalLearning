import { useState, useRef, useEffect, useCallback, useMemo, startTransition } from 'react';
import { TerminalState, OutputLine, processCommand, displayPathForEnv, getTabCompletions, createInitialState } from '../data/terminalEngine';
import type { SelectedEnvironment } from '../context/EnvironmentContext';
import { spliceAtSelection } from './terminalKeyInsert';
import { TerminalKeyBar } from './TerminalKeyBar';

// ─── Security helpers ─────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 500;
// Cap output history to prevent O(n) layout thrashing on long sessions.
// 300 lines ≈ ~30 commands with multi-line output — well above practical usage.
const MAX_LINES = 300;

/** Append new lines and enforce the MAX_LINES cap in one place. */
function appendLines(prev: TerminalLine[], ...next: TerminalLine[]): TerminalLine[] {
  return [...prev, ...next].slice(-MAX_LINES);
}

/**
 * Sanitise raw terminal input.
 * - Trims whitespace
 * - Enforces max length (500 chars) to prevent memory issues
 * - Strips ASCII control characters (except common ones like newline handled by form submit)
 * This terminal is simulated — no real execution occurs.
 */
function sanitiseInput(raw: string): string {
  return raw
    .slice(0, MAX_INPUT_LENGTH)
    // Strip ASCII control chars (0x00–0x1F) except tab (0x09) which is used for completion
    .replace(/[\x00-\x08\x0A-\x1F\x7F]/g, '');
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

/** Environment-specific prompt styles */
const ENV_PROMPT_COLOR: Record<SelectedEnvironment, string> = {
  linux: 'text-[#3fb950]',   // green — classic bash
  macos: 'text-[#a78bfa]',   // violet — zsh / Oh My Zsh
  windows: 'text-[#56b6c2]', // cyan — PowerShell blue
};

const ENV_TITLE_LABEL: Record<SelectedEnvironment, string> = {
  linux: 'bash',
  macos: 'zsh',
  windows: 'PowerShell',
};

/** MOTD shown when no welcomeMessage prop is provided */
const ENV_MOTD: Record<SelectedEnvironment, string[]> = {
  linux: [
    'Ubuntu 22.04.4 LTS — GNU/Linux x86_64',
    "Type 'help' for available commands.",
    '',
  ],
  macos: [
    'Last login: ' + new Date().toDateString() + ' on ttys000',
    "Type 'help' for available commands.",
    '',
  ],
  windows: [
    'Windows PowerShell 7.4.1',
    'Copyright (C) Microsoft Corporation. All rights reserved.',
    "Type 'help' for available commands.",
    '',
  ],
};

/**
 * Build the visible prompt string for the current environment.
 * Linux  : user@hostname:~$
 * macOS  : ➜ ~ (zsh / Oh My Zsh style)
 * Windows: PS C:\Users\user>
 */
function getEnvPrompt(state: TerminalState, env: SelectedEnvironment): string {
  const path = displayPathForEnv(state.cwd, env);
  switch (env) {
    case 'macos': {
      // Shorten path for zsh style: C shows just the last segment or ~
      const short = path === '~' ? '~' : path.startsWith('~/') ? path : '~';
      return `➜  ${short}`;
    }
    case 'windows':
      return `PS ${path}>`;
    case 'linux':
    default:
      return `${state.user}@${state.hostname}:${path}$`;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TerminalLine {
  id: number;
  type: 'prompt' | 'output' | 'error' | 'success' | 'info';
  text: string;
  prompt?: string;
}

interface TerminalEmulatorProps {
  onCommand?: (command: string, state: TerminalState) => void;
  welcomeMessage?: string[];
  className?: string;
  /** Unix username to show in prompt. Defaults to 'user' when not authenticated. */
  username?: string;
  /** Active environment — controls prompt style and display. Defaults to 'linux'. */
  environment?: SelectedEnvironment;
}

let lineCounter = 0;
const nextId = () => ++lineCounter;

/**
 * Reactive coarse-pointer detection (THI-307). True on touch devices (phones,
 * tablets) where the mobile key bar is useful; false on desktop so it never
 * pollutes the pointer/keyboard experience. Starts `false` and flips after
 * mount — the SPA has no SSR so there is no hydration mismatch to worry about.
 */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return coarse;
}

export function TerminalEmulator({ onCommand, welcomeMessage, className = '', username, environment = 'linux' }: TerminalEmulatorProps) {
  const [termState, setTermState] = useState<TerminalState>(createInitialState);
  const [lines, setLines] = useState<TerminalLine[]>(() => {
    const welcome = welcomeMessage ?? ENV_MOTD[environment];
    return welcome.map((text) => ({ id: nextId(), type: 'info' as const, text }));
  });
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const isCoarse = useCoarsePointer();

  // Instant scroll — smooth triggers a separate animation that delays the next
  // paint and inflates INP on mid-range mobile devices (measured: +200–400 ms).
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const focusInput = () => inputRef.current?.focus();

  // THI-152 brick 7/9: replace the previous `autoFocus` HTML attribute
  // with a controlled mount-time focus that:
  //   - skips touch devices (pattern matches MessageInput.tsx — opening
  //     the on-screen keyboard auto on lesson load is intrusive when the
  //     learner is still reading the briefing; they tap the terminal
  //     explicitly when ready, the wrapper onClick already delegates
  //     to focusInput),
  //   - skips when a modal/drawer is already open on mount (focus trap
  //     conflict — LoginModal / AiTutorPanel both render role="dialog"
  //     aria-modal="true" while open).
  // The HTML `autoFocus` attribute on <input> below is removed so this
  // is the single source of truth for initial focus.
  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isTouch) return;
    const openDialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (openDialog) return;
    inputRef.current?.focus();
  }, []);

  // Derive active state from the username prop so auth changes (login/logout)
  // are reflected immediately without a setState round-trip.
  const activeState = useMemo<TerminalState>(
    () => (username ? { ...termState, user: username } : termState),
    [termState, username]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Sanitise before any processing — terminal is simulated, defence in depth
      const trimmed = sanitiseInput(input.trim());
      const prompt = getEnvPrompt(activeState, environment);

      if (!trimmed) {
        setLines((prev) => appendLines(prev, { id: nextId(), type: 'prompt', text: '', prompt }));
        return;
      }

      const result = processCommand(activeState, trimmed, environment);

      if (result.clear) {
        setLines([]);
        setTermState(result.newState);
        setInput('');
        setHistoryIndex(-1);
        return;
      }

      const newLines: TerminalLine[] = [
        { id: nextId(), type: 'prompt', text: trimmed, prompt },
        ...result.lines.map((l: OutputLine) => ({
          id: nextId(),
          type: l.type === 'error' ? 'error' as const : l.type === 'success' ? 'success' as const : 'output' as const,
          text: l.text,
        })),
      ];

      startTransition(() => {
        setLines((prev) => appendLines(prev, ...newLines));
      });
      setTermState(result.newState);
      onCommand?.(trimmed, result.newState);
      setInput('');
      setHistoryIndex(-1);
    },
    [input, activeState, onCommand, environment]
  );

  // Recall the previous command (history ↑). Shared by the keyboard handler
  // and the mobile key bar.
  const historyPrev = useCallback(() => {
    const history = activeState.commandHistory;
    if (history.length === 0) return;
    const newIndex = Math.min(historyIndex + 1, history.length - 1);
    setHistoryIndex(newIndex);
    setInput(history[history.length - 1 - newIndex] ?? '');
  }, [activeState, historyIndex]);

  // Recall the next command (history ↓), back to an empty line at the bottom.
  const historyNext = useCallback(() => {
    const history = activeState.commandHistory;
    const newIndex = Math.max(historyIndex - 1, -1);
    setHistoryIndex(newIndex);
    setInput(newIndex === -1 ? '' : history[history.length - 1 - newIndex] ?? '');
  }, [activeState, historyIndex]);

  // Tab autocompletion. Shared by the keyboard handler and the mobile key bar.
  const triggerTabCompletion = useCallback(() => {
    const completions = getTabCompletions(input, activeState);
    if (completions.length === 1) {
      setInput(completions[0]);
    } else if (completions.length > 1) {
      const prompt = getEnvPrompt(activeState, environment);
      setLines((prev) => appendLines(
        prev,
        { id: nextId(), type: 'prompt', text: input, prompt },
        { id: nextId(), type: 'output', text: completions.join('  ') },
      ));
    }
  }, [input, activeState, environment]);

  // Insert text at the caret (mobile key bar). Replaces any selection, then
  // restores focus + caret after React commits the controlled value so the
  // native keyboard stays open and the learner keeps typing in place.
  const insertAtCursor = useCallback((text: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? input.length;
    const end = el?.selectionEnd ?? input.length;
    const { value } = spliceAtSelection(input, start, end, text);
    const sanitized = sanitiseInput(value);
    setInput(sanitized);
    // Place the caret after the *sanitised* inserted token. The chars before
    // the insertion point are already clean (input is always sanitised), so the
    // caret = clamped start + sanitised-token length, clamped to the final
    // length (covers the 500-char truncation). Deriving from sanitiseInput(text)
    // keeps the caret correct even if a control char were ever inserted.
    const safeStart = Math.max(0, Math.min(start, input.length));
    const pos = Math.min(safeStart + sanitiseInput(text).length, sanitized.length);
    requestAnimationFrame(() => {
      const node = inputRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(pos, pos);
    });
  }, [input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      historyPrev();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyNext();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      triggerTabCompletion();
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setLines((prev) => appendLines(
        prev,
        { id: nextId(), type: 'prompt', text: input + '^C', prompt: getEnvPrompt(activeState, environment) },
      ));
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
      setHistoryIndex(-1);
    }
  }, [historyPrev, historyNext, triggerTabCompletion, input, activeState, environment]);

  const prompt = getEnvPrompt(activeState, environment);
  const promptColor = ENV_PROMPT_COLOR[environment];

  return (
    <div
      className={`flex flex-col bg-[var(--github-bg)] rounded-xl overflow-hidden border border-[var(--github-border-primary)] ${className}`}
      onClick={focusInput}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--github-border-secondary)] border-b border-[var(--github-border-primary)] shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28ca42]" />
        </div>
        <span className={`ml-2 text-xs font-mono ${ENV_PROMPT_COLOR[environment]}`}>
          {ENV_TITLE_LABEL[environment]}
        </span>
        <span className="text-[var(--github-text-secondary)] text-xs font-mono">
          — {activeState.user}@{activeState.hostname}
        </span>
      </div>

      {/* Output area */}
      <div ref={outputRef} className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-sm min-h-0">
        {lines.map((line) => (
          <div key={line.id} className="leading-5">
            {line.type === 'prompt' ? (
              <div className="flex items-start gap-1 flex-wrap">
                <span className={`${promptColor} shrink-0`}>{line.prompt}</span>
                <span className="text-[var(--github-text-primary)] break-all">{line.text}</span>
              </div>
            ) : line.type === 'error' ? (
              <div className="text-[var(--github-red)]">{line.text}</div>
            ) : line.type === 'success' ? (
              <div className="text-[#3fb950]">{line.text}</div>
            ) : line.type === 'info' ? (
              <div className="text-[#58a6ff]">{line.text}</div>
            ) : (
              <div className="text-[var(--github-text-primary)]">{line.text}</div>
            )}
          </div>
        ))}

        {/* Input line */}
        <form onSubmit={handleSubmit} className="flex items-center gap-1 mt-1">
          <span className={`${promptColor} shrink-0 font-mono text-base md:text-sm`}>{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(sanitiseInput(e.target.value))}
            maxLength={MAX_INPUT_LENGTH}
            onKeyDown={handleKeyDown}
            className={`flex-1 bg-transparent text-[var(--github-text-primary)] font-mono text-base md:text-sm outline-none min-w-0 ${environment === 'windows' ? 'caret-[#56b6c2]' : environment === 'macos' ? 'caret-[#58a6ff]' : 'caret-[#3fb950]'}`}
            aria-label="Commande terminal"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </form>
      </div>

      {/* Mobile special-character bar — touch viewports only (THI-307).
          Sits outside the scroll area so it stays pinned above the keyboard. */}
      {isCoarse && (
        <TerminalKeyBar
          onInsert={insertAtCursor}
          onTab={triggerTabCompletion}
          onHistoryPrev={historyPrev}
          onHistoryNext={historyNext}
        />
      )}
    </div>
  );
}
