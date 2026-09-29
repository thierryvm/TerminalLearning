import { useEffect, useRef, useState } from 'react';
import { useEnvironment, ENV_META } from '../../context/EnvironmentContext';
import type { SelectedEnvironment } from '../../context/EnvironmentContext';

interface TerminalLine {
  type: 'prompt' | 'output';
  text: string;
  /** Folder the command was typed in, below the home folder ('' = home): the prompt shows it. */
  dir?: string;
}

/** A step of the demo; `into` is the folder a `cd` step enters, so the next prompts show it. */
interface Step {
  command: string;
  output: string[];
  into?: string;
}

// ─── Per-environment sequences ────────────────────────────────────────────────
// What a real shell prints (GNU bash, macOS zsh, PowerShell 7): `ls` sorts its
// names and adds no `/` to folders; PowerShell answers Get-Location with a table.

const SEQUENCES: Record<SelectedEnvironment, Step[]> = {
  linux: [
    { command: 'pwd', output: ['/home/user'] },
    { command: 'ls', output: ['documents  downloads  notes.txt  projects'] },
    { command: 'cd projects', output: [], into: 'projects' },
    { command: 'mkdir my-app', output: [] },
    { command: 'ls', output: ['my-app'] },
  ],
  macos: [
    { command: 'pwd', output: ['/Users/user'] },
    { command: 'ls', output: ['Desktop  Documents  Downloads  notes.txt  projects'] },
    { command: 'cd projects', output: [], into: 'projects' },
    { command: 'mkdir my-app', output: [] },
    { command: 'ls', output: ['my-app'] },
  ],
  windows: [
    { command: 'Get-Location', output: ['', 'Path', '----', 'C:\\Users\\user', ''] },
    { command: 'Set-Location projects', output: [], into: 'projects' },
    { command: 'New-Item -ItemType Directory my-app | Out-Null', output: [] },
    { command: 'Test-Path my-app', output: ['True'] },
    { command: 'Get-ChildItem -Name', output: ['my-app'] },
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

/** The folder each step is typed in: home, then wherever the last `cd` went. */
function stepDirs(env: SelectedEnvironment): string[] {
  let dir = '';
  return SEQUENCES[env].map((step) => {
    const here = dir;
    if (step.into !== undefined) dir = step.into;
    return here;
  });
}

function buildStaticLines(env: SelectedEnvironment): TerminalLine[] {
  const dirs = stepDirs(env);
  return SEQUENCES[env].flatMap((step, i) => [
    { type: 'prompt' as const, text: step.command, dir: dirs[i] },
    ...step.output.map<TerminalLine>((text) => ({ type: 'output', text })),
  ]);
}

/** Where the demo ends: the folder of the prompt left waiting after the last step. */
function finalDir(env: SelectedEnvironment): string {
  const last = SEQUENCES[env].filter((step) => step.into !== undefined).pop();
  return last?.into ?? '';
}

// ─── Env-aware prompt renderer ────────────────────────────────────────────────

// The prompts of the practice terminal (TerminalEmulator.tsx getEnvPrompt), which show the current folder.
function PromptSpan({ env, dir = '' }: { env: SelectedEnvironment; dir?: string }) {
  if (env === 'linux') {
    return (
      <>
        <span className="text-emerald-400">user@terminal</span>
        <span className="text-[var(--github-text-secondary)]">:</span>
        <span className="text-blue-400">{dir ? `~/${dir}` : '~'}</span>
        <span className="text-[var(--github-text-secondary)]">$ </span>
      </>
    );
  }
  if (env === 'macos') {
    return (
      <>
        <span className="text-violet-400">➜</span>
        <span className="text-[var(--github-text-secondary)]">{`  ${dir ? `~/${dir}` : '~'} `}</span>
      </>
    );
  }
  // windows
  return (
    <>
      <span className="text-sky-400">PS </span>
      <span className="text-[var(--github-text-primary)]">{dir ? `C:\\Users\\user\\${dir}` : 'C:\\Users\\user'}</span>
      <span className="text-sky-400">&gt; </span>
    </>
  );
}

export function TerminalPreview() {
  const { selectedEnv } = useEnvironment();
  const reducedMotion = useReducedMotion();

  const [animatedLines, setAnimatedLines] = useState<TerminalLine[]>([]);
  const [typingText, setTypingText] = useState('');
  const [typingDir, setTypingDir] = useState('');
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
        const dirs = stepDirs(selectedEnv);
        while (!cancelledRef.current) {
          setAnimatedLines([]);
          setTypingText('');
          setTypingDir('');

          for (const [index, step] of sequence.entries()) {
            if (cancelledRef.current) return;
            const dir = dirs[index];

            for (let i = 0; i <= step.command.length; i++) {
              if (cancelledRef.current) return;
              setTypingText(step.command.slice(0, i));
              await new Promise<void>((r) => { timeoutRef.current = setTimeout(r, TYPING_SPEED); });
            }

            if (cancelledRef.current) return;
            setTypingText('');
            setAnimatedLines((prev) => [...prev, { type: 'prompt', text: step.command, dir }]);
            if (step.into !== undefined) setTypingDir(step.into);

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
  }, [selectedEnv, reducedMotion]);

  return (
    <div
      className="animate-fade-in-up w-full max-w-2xl mx-auto rounded-xl border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)] overflow-hidden shadow-2xl shadow-emerald-500/10"
      style={{ animationDelay: '350ms' }}
      data-testid="terminal-preview"
    >
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--github-border-primary)] bg-[var(--github-bg)]">
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
              // A terminal wraps a long command at the screen's edge, not after a hyphen.
              <div className="break-all">
                <PromptSpan env={selectedEnv} dir={line.dir} />
                <span className="text-[var(--github-text-primary)]">{line.text}</span>
              </div>
            ) : (
              // A blank line of output keeps its height (PowerShell frames its tables with them).
              <div className="text-[var(--github-text-secondary)] pl-1 whitespace-pre-wrap">{line.text || '\u00a0'}</div>
            )}
          </div>
        ))}

        {/* Active typing line */}
        <div className="leading-relaxed break-all">
          <PromptSpan env={selectedEnv} dir={reducedMotion ? finalDir(selectedEnv) : typingDir} />
          <span className="text-[var(--github-text-primary)]">{typingText}</span>
          <span
            className="inline-block w-[7px] h-[14px] bg-[#e6edf3] align-middle ml-px"
            style={{ opacity: showCursor ? 1 : 0 }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
