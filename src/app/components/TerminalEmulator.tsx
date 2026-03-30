import { useState, useRef, useEffect, useCallback } from 'react';
import { TerminalState, OutputLine, processCommand, getPrompt, createInitialState } from '../data/terminalEngine';

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
}

let lineCounter = 0;
const nextId = () => ++lineCounter;

export function TerminalEmulator({ onCommand, welcomeMessage, className = '' }: TerminalEmulatorProps) {
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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      const prompt = getPrompt(termState);

      if (!trimmed) {
        setLines((prev) => [...prev, { id: nextId(), type: 'prompt', text: '', prompt }]);
        return;
      }

      const result = processCommand(termState, trimmed);

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
    [input, termState, onCommand]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const history = termState.commandHistory;
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
      // Simple tab completion for common commands
      const cmds = ['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'echo', 'rm', 'cp', 'mv', 'grep', 'head', 'tail', 'wc', 'chmod', 'whoami', 'date', 'uname', 'history', 'ps', 'kill', 'clear', 'help', 'man'];
      const match = cmds.find((c) => c.startsWith(input));
      if (match) setInput(match + ' ');
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setLines((prev) => [
        ...prev,
        { id: nextId(), type: 'prompt', text: input + '^C', prompt: getPrompt(termState) },
      ]);
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const prompt = getPrompt(termState);

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
          {termState.user}@{termState.hostname}
        </span>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-sm min-h-0">
        {lines.map((line) => (
          <div key={line.id} className="leading-5">
            {line.type === 'prompt' ? (
              <div className="flex items-start gap-1 flex-wrap">
                <span className="text-[#3fb950] shrink-0">{line.prompt}</span>
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
          <span className="text-[#3fb950] shrink-0 font-mono text-sm">{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[#e6edf3] font-mono text-sm outline-none caret-[#3fb950] min-w-0"
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
