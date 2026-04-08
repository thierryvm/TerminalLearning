import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface TerminalLine {
  type: 'prompt' | 'output';
  text: string;
}

const SEQUENCE: Array<{ command: string; output: string[] }> = [
  {
    command: 'pwd',
    output: ['/home/user'],
  },
  {
    command: 'ls',
    output: ['documents/  downloads/  projects/  notes.txt'],
  },
  {
    command: 'cd projects',
    output: [],
  },
  {
    command: 'mkdir my-app',
    output: [],
  },
  {
    command: 'ls',
    output: ['my-app/'],
  },
];

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

/** Pre-built static state for reduced-motion users */
const STATIC_LINES: TerminalLine[] = SEQUENCE.flatMap((step) => [
  { type: 'prompt', text: step.command },
  ...step.output.map<TerminalLine>((text) => ({ type: 'output', text })),
]);

export function TerminalPreview() {
  const reducedMotion = useReducedMotion();
  const [animatedLines, setAnimatedLines] = useState<TerminalLine[]>([]);
  const [typingText, setTypingText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Cursor blink */
  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(id);
  }, [reducedMotion]);

  /* Derive visible lines — static for reduced-motion, animated otherwise */
  const lines = reducedMotion ? STATIC_LINES : animatedLines;

  /* Scroll within the terminal container only — never scroll the page */
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, typingText]);

  /* Animation engine — only runs when reduced motion is off */
  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;

    function clear() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }

    function delay(ms: number): Promise<void> {
      return new Promise((resolve) => {
        timeoutRef.current = setTimeout(resolve, ms);
      });
    }

    async function runAnimation() {
      while (!cancelled) {
        setAnimatedLines([]);
        setTypingText('');

        for (const step of SEQUENCE) {
          if (cancelled) return;

          // Type the command character by character
          for (let i = 0; i <= step.command.length; i++) {
            if (cancelled) return;
            setTypingText(step.command.slice(0, i));
            await delay(TYPING_SPEED);
          }

          // Commit the typed line to the lines array
          if (cancelled) return;
          setTypingText('');
          setAnimatedLines((prev) => [
            ...prev,
            { type: 'prompt', text: step.command },
          ]);

          await delay(120);

          // Show output lines
          for (const out of step.output) {
            if (cancelled) return;
            setAnimatedLines((prev) => [...prev, { type: 'output', text: out }]);
            await delay(PAUSE_AFTER_OUTPUT);
          }

          if (step.output.length === 0) {
            await delay(PAUSE_AFTER_OUTPUT);
          }
        }

        // Pause before restarting the loop
        await delay(PAUSE_BEFORE_RESTART);
      }
    }

    runAnimation();

    return () => {
      cancelled = true;
      clear();
    };
  }, [reducedMotion]);

  const prompt = (
    <>
      <span className="text-emerald-400">user@terminal</span>
      <span className="text-[#8b949e]">:</span>
      <span className="text-blue-400">~</span>
      <span className="text-[#8b949e]">$ </span>
    </>
  );

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
        <span className="ml-3 text-xs text-[#8b949e] font-mono">terminal — bash</span>
      </div>

      {/* Content — scrolls internally, never scrolls the page */}
      <div ref={containerRef} className="p-5 font-mono text-sm h-[260px] overflow-y-auto overflow-x-hidden space-y-1">
        {lines.map((line, i) => (
          <div key={i} className="leading-relaxed">
            {line.type === 'prompt' ? (
              <div>
                {prompt}
                <span className="text-[#e6edf3]">{line.text}</span>
              </div>
            ) : (
              <div className="text-[#8b949e] pl-1">{line.text}</div>
            )}
          </div>
        ))}

        {/* Active typing line */}
        <div className="leading-relaxed">
          {prompt}
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
