import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useEnvironment, ENV_META } from '../../context/EnvironmentContext';
import type { SelectedEnvironment } from '../../context/EnvironmentContext';

interface TerminalLine {
  type: 'prompt' | 'output';
  text: string;
}

// ─── Per-environment sequences ────────────────────────────────────────────────

const SEQUENCES: Record<SelectedEnvironment, Array<{ command: string; output: string[] }>> = {
  linux: [
    { command: 'pwd', output: ['/home/user'] },
    { command: 'ls', output: ['documents/  downloads/  projects/  notes.txt'] },
    { command: 'cd projects', output: [] },
    { command: 'mkdir my-app', output: [] },
    { command: 'ls', output: ['my-app/'] },
  ],
  macos: [
    { command: 'pwd', output: ['/Users/user'] },
    { command: 'ls', output: ['Desktop  Documents  Downloads  projects  notes.txt'] },
    { command: 'cd projects', output: [] },
    { command: 'mkdir my-app', output: [] },
    { command: 'ls', output: ['my-app/'] },
  ],
  windows: [
    { command: 'Get-Location', output: ['Path', '----', 'C:\\Users\\user'] },
    { command: 'Get-ChildItem', output: ['Documents  Downloads  projects  notes.txt'] },
    { command: 'Set-Location projects', output: [] },
    { command: 'New-Item -Type Directory my-app', output: ['    Directory: C:\\Users\\user\\projects', '', 'my-app'] },
    { command: 'Get-ChildItem', output: ['my-app/'] },
  ],
};

// ─── Per-environment title bar label ─────────────────────────────────────────

const TITLE_LABELS: Record<SelectedEnvironment, string> = {
  linux: 'terminal — bash',
  macos: 'terminal — zsh',
  windows: 'Windows PowerShell',
};

const TYPING_SPEED = 55; // ms per character
const PAUSE_AFTER_OUTPUT = 700; // ms
const PAUSE_BEFORE_RESTART = 2000; // ms

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

function buildStaticLines(env: SelectedEnvironment): TerminalLine[] {
  return SEQUENCES[env].flatMap((step) => [
    { type: 'prompt' as const, text: step.command },
    ...step.output.map<TerminalLine>((text) => ({ type: 'output', text })),
  ]);
}

// ─── Env-aware prompt renderer ────────────────────────────────────────────────

function PromptSpan({ env }: { env: SelectedEnvironment }) {
  if (env === 'linux') {
    return (
      <>
        <span className="text-emerald-400">user@terminal</span>
        <span className="text-[#8b949e]">:</span>
        <span className="text-blue-400">~</span>
        <span className="text-[#8b949e]">$ </span>
      </>
    );
  }
  if (env === 'macos') {
    return (
      <>
        <span className="text-violet-400">➜</span>
        <span className="text-[#8b949e]"> ~ </span>
        <span className="text-violet-300">% </span>
      </>
    );
  }
  // windows
  return (
    <>
      <span className="text-sky-400">PS </span>
      <span className="text-[#e6edf3]">C:\Users\user</span>
      <span className="text-sky-400">&gt; </span>
    </>
  );
}

export function TerminalPreview() {
  const { selectedEnv } = useEnvironment();
  const reducedMotion = useReducedMotion();

  const [animatedLines, setAnimatedLines] = useState<TerminalLine[]>([]);
  const [typingText, setTypingText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const meta = ENV_META[selectedEnv];

  /* Cursor blink */
  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(id);
  }, [reducedMotion]);

  /* Scroll within the terminal container only — never scroll the page */
  const staticLines = buildStaticLines(selectedEnv);
  const lines = reducedMotion ? staticLines : animatedLines;

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, typingText]);

  /* Re-run animation when env changes */
  useEffect(() => {
    if (reducedMotion) return;

    cancelledRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Small gap so the previous loop fully exits before the new one starts
    const startTimeout = setTimeout(() => {
      cancelledRef.current = false;
      setAnimatedLines([]);
      setTypingText('');

      async function runAnimation() {
        const sequence = SEQUENCES[selectedEnv];
        while (!cancelledRef.current) {
          setAnimatedLines([]);
          setTypingText('');

          for (const step of sequence) {
            if (cancelledRef.current) return;

            for (let i = 0; i <= step.command.length; i++) {
              if (cancelledRef.current) return;
              setTypingText(step.command.slice(0, i));
              await new Promise<void>((r) => { timeoutRef.current = setTimeout(r, TYPING_SPEED); });
            }

            if (cancelledRef.current) return;
            setTypingText('');
            setAnimatedLines((prev) => [...prev, { type: 'prompt', text: step.command }]);

            await new Promise<void>((r) => { timeoutRef.current = setTimeout(r, 120); });

            for (const out of step.output) {
              if (cancelledRef.current) return;
              setAnimatedLines((prev) => [...prev, { type: 'output', text: out }]);
              await new Promise<void>((r) => { timeoutRef.current = setTimeout(r, PAUSE_AFTER_OUTPUT); });
            }

            if (step.output.length === 0) {
              await new Promise<void>((r) => { timeoutRef.current = setTimeout(r, PAUSE_AFTER_OUTPUT); });
            }
          }

          await new Promise<void>((r) => { timeoutRef.current = setTimeout(r, PAUSE_BEFORE_RESTART); });
        }
      }

      runAnimation();
    }, 80);

    return () => {
      cancelledRef.current = true;
      clearTimeout(startTimeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEnv, reducedMotion]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="w-full max-w-2xl mx-auto rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-2xl shadow-emerald-500/10"
      data-testid="terminal-preview"
    >
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" aria-hidden="true" />
        <span className={`ml-3 text-xs font-mono ${meta.color}`}>
          {TITLE_LABELS[selectedEnv]}
        </span>
      </div>

      {/* Content — left-aligned, scrolls internally, never scrolls the page */}
      <div
        ref={containerRef}
        className="p-5 font-mono text-sm text-left h-[260px] overflow-y-auto overflow-x-hidden space-y-1"
      >
        {lines.map((line, i) => (
          <div key={i} className="leading-relaxed">
            {line.type === 'prompt' ? (
              <div>
                <PromptSpan env={selectedEnv} />
                <span className="text-[#e6edf3]">{line.text}</span>
              </div>
            ) : (
              <div className="text-[#8b949e] pl-1">{line.text}</div>
            )}
          </div>
        ))}

        {/* Active typing line */}
        <div className="leading-relaxed">
          <PromptSpan env={selectedEnv} />
          <span className="text-[#e6edf3]">{typingText}</span>
          <span
            className="inline-block w-[7px] h-[14px] bg-[#e6edf3] align-middle ml-px"
            style={{ opacity: showCursor ? 1 : 0 }}
            aria-hidden="true"
          />
        </div>
      </div>
    </motion.div>
  );
}
