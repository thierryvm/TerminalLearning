import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Terminal, Home, Github, BookOpen, Zap, Shield, Heart, Clock, type LucideIcon } from 'lucide-react';
import { curriculum } from '../data/curriculum';
import { commandCatalogue } from '../data/commandCatalogue';
import { ENVIRONMENTS } from '../types/curriculum';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const TOTAL_LESSONS = curriculum.reduce((sum, mod) => sum + mod.lessons.length, 0);
const TOTAL_COMMANDS = commandCatalogue.reduce((sum, cat) => sum + cat.commands.length, 0);
const ACTIVE_ENVIRONMENTS = ENVIRONMENTS.filter((e) => e.status === 'active').length;

const TERMINAL_LINES = [
  { prompt: '$', command: ' cd /page-introuvable', delay: 0 },
  { prompt: null, command: 'bash: /page-introuvable: No such file or directory', delay: 600, error: true },
  { prompt: '$', command: ' ls ~/', delay: 1200 },
  { prompt: null, command: 'terminal-learning/  commandes/  leçons/', delay: 1800, highlight: true },
];

type PillVariant = 'pill-emerald' | 'pill-blue' | 'pill-amber' | 'pill-purple';

const PILLS: Array<{ icon: LucideIcon; label: string; variant: PillVariant }> = [
  { icon: BookOpen, label: `${TOTAL_LESSONS} leçons`, variant: 'pill-emerald' },
  { icon: Terminal, label: `${TOTAL_COMMANDS}+ commandes`, variant: 'pill-blue' },
  { icon: Zap, label: `${ACTIVE_ENVIRONMENTS} environnements`, variant: 'pill-amber' },
  { icon: Shield, label: '100% gratuit', variant: 'pill-purple' },
];

const USEFUL_LINKS: Array<{ icon: LucideIcon; to: string; label: string; desc: string }> = [
  { icon: BookOpen, to: '/reference', label: 'Référence', desc: 'Toutes les commandes expliquées' },
  { icon: Heart, to: '/story', label: 'L\u2019histoire', desc: 'Pourquoi cette app existe' },
  { icon: Clock, to: '/changelog', label: 'Changelog', desc: 'Nouveautés et mises à jour' },
  { icon: Shield, to: '/privacy', label: 'Confidentialité', desc: 'Tes données, ta vie privée' },
];

/** Animated terminal line — types character by character */
function TerminalLine({ prompt, command, error, highlight, startTyping }: {
  prompt: string | null;
  command: string;
  error?: boolean;
  highlight?: boolean;
  startTyping: boolean;
}) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!startTyping) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(command.slice(0, i));
      if (i >= command.length) clearInterval(interval);
    }, 28);
    return () => clearInterval(interval);
  }, [startTyping, command]);

  if (!startTyping) return null;

  return (
    <div className="flex items-start gap-1 font-mono text-sm leading-relaxed">
      {prompt && <span className="text-emerald-400 shrink-0">{prompt}</span>}
      <span className={
        error ? 'text-red-400' :
        highlight ? 'text-blue-400' :
        'text-[#e6edf3]'
      }>
        {displayed}
        {displayed.length < command.length && (
          <span className="inline-block w-[7px] h-[14px] bg-emerald-400 animate-pulse align-middle ml-0.5" />
        )}
      </span>
    </div>
  );
}

/** 404 page — with animated terminal and app showcase */
export function NotFound() {
  const navigate = useNavigate();
  const [activeLine, setActiveLine] = useState(0);

  useEffect(() => {
    const timers = TERMINAL_LINES.map((line, i) =>
      setTimeout(() => setActiveLine(i + 1), line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="min-h-dvh bg-[#0d1117] text-[#e6edf3] flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Background glow — top center */}
      <div className="absolute inset-0 flex items-start justify-center pointer-events-none" aria-hidden="true">
        <div className="w-[300px] h-[300px] sm:w-[500px] sm:h-[400px] bg-emerald-500/8 rounded-full blur-3xl mt-[-80px]" />
      </div>
      {/* Glow under terminal */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none" aria-hidden="true">
        <div className="w-[280px] h-[60px] sm:w-[420px] sm:h-[80px] bg-emerald-500/15 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">

        {/* Terminal mock */}
        <div
          className="animate-fade-in-up bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden mb-8 shadow-xl shadow-black/40"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#30363d] bg-[#0d1117]/50">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" aria-hidden="true" />
            <span className="flex-1 text-center text-[10px] text-[#484f58] font-mono">terminal — zsh</span>
          </div>

          {/* Terminal content */}
          <div className="p-4 space-y-1.5 min-h-[110px]">
            {TERMINAL_LINES.map((line, i) => (
              <TerminalLine
                key={i}
                prompt={line.prompt}
                command={line.command}
                error={line.error}
                highlight={line.highlight}
                startTyping={activeLine > i}
              />
            ))}
          </div>
        </div>

        {/* 404 + message */}
        <div
          className="animate-fade-in-up text-center mb-8"
          style={{ animationDelay: '200ms' }}
        >
          <div className="text-6xl font-bold text-[#e6edf3] mb-2 tracking-tight">
            4<span className="text-emerald-400">0</span>4
          </div>
          <p className="text-[#8b949e] text-base">
            Cette page n'existe pas — mais le terminal, lui, t'attend.
          </p>
        </div>

        {/* Stats pills */}
        <div
          className="animate-fade-in-up flex flex-wrap gap-2 justify-center mb-8"
          style={{ animationDelay: '350ms' }}
        >
          {PILLS.map(({ icon: Icon, label, variant }) => (
            <Badge key={label} variant={variant}>
              <Icon size={12} aria-hidden="true" className="size-[12px]" />
              {label}
            </Badge>
          ))}
        </div>

        {/* CTA */}
        <div
          className="animate-fade-in-up flex flex-col sm:flex-row gap-3 justify-center"
          style={{ animationDelay: '500ms' }}
        >
          <Button variant="emerald" size="cta-pill" onClick={() => navigate('/')}>
            <Home size={15} aria-hidden="true" className="size-[15px]" />
            Accueil
          </Button>
          <Button variant="ghost-gh" size="cta-pill" onClick={() => navigate('/app')}>
            <Terminal size={15} aria-hidden="true" className="size-[15px]" />
            Commencer l'apprentissage
          </Button>
        </div>

        {/* Useful links — nav de secours (SEO crawlable + UX) */}
        <nav
          aria-label="Navigation de secours"
          className="animate-fade-in-up mt-8"
          style={{ animationDelay: '650ms' }}
        >
          <h2 className="text-center text-[#8b949e] text-xs font-mono mb-4 uppercase tracking-wider">
            Pages utiles
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-none p-0 m-0">
            {USEFUL_LINKS.map(({ icon: Icon, to, label, desc }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-start gap-3 p-3 rounded-lg border border-[#30363d] bg-[#161b22]/50 hover:border-emerald-500/40 hover:bg-[#161b22] transition-all"
                >
                  <Icon size={16} aria-hidden="true" className="size-[16px] text-emerald-400 shrink-0 mt-0.5" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[#e6edf3] text-sm font-medium">{label}</span>
                    <span className="block text-[#8b949e] text-xs mt-0.5">{desc}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Open source mention */}
        <div
          className="animate-fade-in text-center mt-8"
          style={{ animationDelay: '800ms' }}
        >
          <a
            href="https://github.com/thierryvm/TerminalLearning"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#8b949e] hover:text-[#e6edf3] text-xs font-mono transition-colors"
          >
            <Github size={12} aria-hidden="true" />
            open source · 100% gratuit · pour débutants
          </a>
        </div>

      </div>
    </div>
  );
}
