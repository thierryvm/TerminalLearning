import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { TerminalState, OutputLine, processCommand, getPrompt, getTabCompletions, createInitialState } from '../data/terminalEngine';
import type { SelectedEnvironment } from '../context/EnvironmentContext';

// ─── Security helpers ─────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 500;

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
  macos: 'text-[#58a6ff]',   // blue — zsh default
  windows: 'text-[#56b6c2]', // cyan — PowerShell blue
};

const ENV_TITLE_LABEL: Record<SelectedEnvironment, string> = {
  linux: 'bash',
  macos: 'zsh',
  windows: 'PowerShell',
};

/**
 * Build the visible prompt string for the current environment.
 * Keeps terminalEngine's getPrompt() intact for Linux/macOS,
 * overrides format for Windows.
 */
function getEnvPrompt(state: TerminalState, env: SelectedEnvironment): string {
  const username = state.user || 'user';
  switch (env) {
    case 'macos':
      return `${state.hostname} ~ %`;
    case 'windows':
      return `PS C:\\Users\\${username}>`;
    case 'linux':
    default:
      return getPrompt(state);
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

export function TerminalEmulator({ onCommand, welcomeMessage, className = '', username, environment = 'linux' }: TerminalEmulatorProps) {
  const [termState, setTermState] = useState<TerminalState>(createInitialState);
  const [lines, setLines] = useState<TerminalLine[]>(() => {
    const welcome = welcomeMessage ?? [
      "Bienvenue dans Terminal Lab ! Tapez 'help' pour la liste des commandes.",
      '',
    ];
    return welcome.map((text) => ({ id: nextId(), type: 'info' as const, text }));
  });
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const focusInput = () => inputRef.current?.focus();

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
        setLines((prev) => [...prev, { id: nextId(), type: 'prompt', text: '', prompt }]);
        return;
      }

      const result = processCommand(activeState, trimmed);

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

      setLines((prev) => [...prev, ...newLines]);
      setTermState(result.newState);
      onCommand?.(trimmed, result.newState);
      setInput('');
      setHistoryIndex(-1);
    },
    [input, activeState, onCommand, environment]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const history = activeState.commandHistory;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      setInput(history[history.length - 1 - newIndex] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? '' : history[history.length - 1 - newIndex] ?? '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const completions = getTabCompletions(input, activeState);
      if (completions.length === 1) {
        setInput(completions[0]);
      } else if (completions.length > 1) {
        const prompt = getEnvPrompt(activeState, environment);
        setLines((prev) => [
          ...prev,
          { id: nextId(), type: 'prompt', text: input, prompt },
          { id: nextId(), type: 'output', text: completions.join('  ') },
        ]);
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setLines((prev) => [
        ...prev,
        { id: nextId(), type: 'prompt', text: input + '^C', prompt: getEnvPrompt(activeState, environment) },
      ]);
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const prompt = getEnvPrompt(activeState, environment);
  const promptColor = ENV_PROMPT_COLOR[environment];

  return (
    <div
      className={`flex flex-col bg-[#0d1117] rounded-xl overflow-hidden border border-[#30363d] ${className}`}
      onClick={focusInput}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-[#30363d] shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28ca42]" />
        </div>
        <span className="ml-2 text-[#8b949e] text-xs font-mono">
          {ENV_TITLE_LABEL[environment]} — {activeState.user}@{activeState.hostname}
        </span>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-sm min-h-0">
        {lines.map((line) => (
          <div key={line.id} className="leading-5">
            {line.type === 'prompt' ? (
              <div className="flex items-start gap-1 flex-wrap">
                <span className={`${promptColor} shrink-0`}>{line.prompt}</span>
                <span className="text-[#e6edf3] break-all">{line.text}</span>
              </div>
            ) : line.type === 'error' ? (
              <div className="text-[#f85149]">{line.text}</div>
            ) : line.type === 'success' ? (
              <div className="text-[#3fb950]">{line.text}</div>
            ) : line.type === 'info' ? (
              <div className="text-[#58a6ff]">{line.text}</div>
            ) : (
              <div className="text-[#e6edf3]">{line.text}</div>
            )}
          </div>
        ))}

        {/* Input line */}
        <form onSubmit={handleSubmit} className="flex items-center gap-1 mt-1">
          <span className={`${promptColor} shrink-0 font-mono text-sm`}>{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(sanitiseInput(e.target.value))}
            maxLength={MAX_INPUT_LENGTH}
            onKeyDown={handleKeyDown}
            className={`flex-1 bg-transparent text-[#e6edf3] font-mono text-sm outline-none min-w-0 ${environment === 'windows' ? 'caret-[#56b6c2]' : environment === 'macos' ? 'caret-[#58a6ff]' : 'caret-[#3fb950]'}`}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </form>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
