import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Terminal, ChevronRight, Github, BookOpen, Zap, Shield, Heart,
  CheckCircle2, Clock, Star, Coffee, ShieldCheck, Lock, Infinity,
  Compass, FolderOpen, FileText, Cpu, GitMerge, ExternalLink,
} from 'lucide-react';
import { curriculum } from '../data/curriculum';
import { TerminalPreview } from './landing/TerminalPreview';
import { useAuth } from '../context/AuthContext';
import { UserMenu } from './auth/UserMenu';
import { LoginModal } from './auth/LoginModal';

// ── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Terminal,
    title: 'Émulateur terminal réel',
    description: 'Pratique les commandes dans un vrai terminal interactif — pas de la théorie, de la pratique.',
    color: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
  },
  {
    icon: BookOpen,
    title: '6 modules progressifs',
    description: 'Navigation, fichiers, lecture, permissions, processus, redirection — du débutant au confirmé.',
    color: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
  },
  {
    icon: Zap,
    title: 'Progression sauvegardée',
    description: "Reprends exactement où tu t'es arrêté. Tes accomplissements sont mémorisés localement.",
    color: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
  },
  {
    icon: Shield,
    title: '100% gratuit & open source',
    description: "Pas d'inscription, pas de paywall, pas de tracking agressif. Juste apprendre.",
    color: 'text-purple-400',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/5',
  },
];

const ROADMAP = [
  { phase: 'Phase 0', label: 'Lancement public', status: 'done' },
  { phase: 'Phase 1', label: 'Landing + donations', status: 'done' },
  { phase: 'Phase 2', label: 'Analytics + monitoring', status: 'done' },
  { phase: 'Phase 3', label: 'Comptes utilisateurs', status: 'done' },
  { phase: 'Phase 4', label: 'Admin panel sécurisé', status: 'future' },
];

const SUPPORTERS: string[] = [
  // Populated when Hall of Fame is active
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'A+ Security Rating', href: undefined },
  {
    icon: Github,
    label: '100% Open Source',
    href: 'https://github.com/thierryvm/TerminalLearning',
  },
  { icon: Infinity, label: 'Free Forever', href: undefined },
  { icon: Lock, label: 'GDPR Compliant', href: undefined },
] as const;

const MODULE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  Compass,
  FolderOpen,
  FileText,
  Shield,
  Cpu,
  GitMerge,
};

// ── Component ────────────────────────────────────────────────────────────────

/** Landing page — public entry point at "/" */
export function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="border-b border-[#30363d]/50 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Terminal size={18} className="text-emerald-400" aria-hidden="true" />
          </div>
          <span className="font-mono text-[#e6edf3] text-sm">Terminal Learning</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/thierryvm/TerminalLearning"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            aria-label="Voir le projet sur GitHub"
          >
            <Github size={18} aria-hidden="true" />
          </a>
          {user ? (
            <UserMenu syncStatus="local" />
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="text-[#8b949e] hover:text-[#e6edf3] text-sm font-mono transition-colors"
            >
              Se connecter
            </button>
          )}
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] text-sm font-medium transition-colors"
          >
            Commencer <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Glow background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="w-[700px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl" />
        </div>

        {/* Hero content — no JS animation so the h1 (LCP element) is visible on first paint */}
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            Gratuit · Open Source · Pour débutants
          </span>

          <h1 className="text-4xl md:text-6xl font-bold text-[#e6edf3] leading-tight mb-6">
            Maîtrise le terminal{' '}
            <span className="text-emerald-400">pas à pas</span>
          </h1>

          <p className="text-[#8b949e] text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Un environnement interactif pour apprendre les commandes du terminal.
            Pratique réelle, progression sauvegardée, aucune inscription requise.
          </p>

          {/* Terminal preview — proof before CTA */}
          <div className="mb-10">
            <TerminalPreview />
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
              aria-label="Commencer l'apprentissage gratuitement"
            >
              <Terminal size={18} aria-hidden="true" />
              Commencer l'apprentissage
              <ChevronRight size={16} aria-hidden="true" />
            </button>

            <a
              href="https://ko-fi.com/thierryvm"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[#30363d] hover:border-pink-500/40 text-[#8b949e] hover:text-pink-400 font-medium text-base transition-all"
              aria-label="Soutenir Terminal Learning sur Ko-fi"
            >
              <Heart size={16} className="text-pink-500" aria-hidden="true" />
              Soutenir le projet
            </a>
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-3 justify-center">
          {TRUST_BADGES.map((badge, i) => {
            const Icon = badge.icon;
            const pill = (
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#30363d] text-[#8b949e] text-xs font-medium"
              >
                <Icon size={13} aria-hidden="true" />
                {badge.label}
              </motion.span>
            );

            if (badge.href) {
              return (
                <a
                  key={badge.label}
                  href={badge.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={badge.label}
                  className="hover:opacity-80 transition-opacity"
                >
                  {pill}
                </a>
              );
            }
            return <span key={badge.label}>{pill}</span>;
          })}
        </div>
      </section>

      {/* ── MODULE PREVIEW ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-2">6 modules progressifs</h2>
          <p className="text-[#8b949e] text-center mb-10">Du système de fichiers à la redirection de flux — sans prérequis.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {curriculum.map((mod, i) => {
              const Icon = MODULE_ICONS[mod.iconName] ?? BookOpen;
              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="p-5 rounded-xl border border-[#30363d] bg-[#161b22] backdrop-blur-sm cursor-pointer"
                  onClick={() => navigate(`/app/learn/${mod.id}/${mod.lessons[0].id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/app/learn/${mod.id}/${mod.lessons[0].id}`);
                    }
                  }}
                  aria-label={`Accéder au module ${mod.title}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[#0d1117]/80 border border-[#30363d]">
                      <Icon size={16} style={{ color: mod.color }} aria-hidden="true" />
                    </div>
                    <span className="text-[#8b949e] text-xs font-mono">Module {i + 1}</span>
                  </div>
                  <h3 className="text-[#e6edf3] font-semibold text-sm mb-1">{mod.title}</h3>
                  <p className="text-[#8b949e] text-xs leading-relaxed">{mod.description}</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400 text-xs">{mod.lessons.length} leçons disponibles</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-[#8b949e] text-sm">6 modules inclus — aucun compte requis.</p>
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-2">Pourquoi Terminal Learning ?</h2>
          <p className="text-[#8b949e] text-center mb-10">Conçu pour les débutants qui veulent apprendre en faisant.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.08 }}
                  className={`p-5 rounded-xl border ${f.border} ${f.bg} backdrop-blur-sm`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-[#0d1117]/60 border ${f.border}`}>
                      <Icon size={18} className={f.color} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-[#e6edf3] font-medium mb-1">{f.title}</h3>
                      <p className="text-[#8b949e] text-sm leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── ROADMAP ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-2">Roadmap publique</h2>
          <p className="text-[#8b949e] text-center mb-10">Ce que nous construisons, et ce qui vient ensuite.</p>

          <div className="max-w-lg mx-auto space-y-3">
            {ROADMAP.map((item) => (
              <div key={item.phase} className="flex items-center gap-4 p-4 rounded-xl border border-[#30363d] bg-[#161b22]">
                <div className="shrink-0">
                  {item.status === 'done' && <CheckCircle2 size={18} className="text-emerald-400" aria-hidden="true" />}
                  {item.status === 'current' && (
                    <span className="w-4 h-4 flex items-center justify-center" aria-hidden="true">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    </span>
                  )}
                  {item.status === 'soon' && <Clock size={18} className="text-amber-400" aria-hidden="true" />}
                  {item.status === 'future' && <div className="w-4 h-4 rounded-full border-2 border-[#30363d]" aria-hidden="true" />}
                </div>
                <div className="flex-1">
                  <span className="text-xs text-[#8b949e] font-mono">{item.phase}</span>
                  <p className={`text-sm font-medium ${item.status === 'done' ? 'text-[#e6edf3]' : item.status === 'current' ? 'text-emerald-400' : 'text-[#8b949e]'}`}>
                    {item.label}
                  </p>
                </div>
                {item.status === 'done' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">live</span>
                )}
                {item.status === 'current' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">en cours</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── ABOUT + SUPPORT ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start"
        >
          {/* Left — About (SEO) */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#30363d] text-[#8b949e] text-xs font-mono mb-6">
              <Star size={12} className="text-amber-400" aria-hidden="true" />
              Projet bénévole · Belgique
            </div>
            <h2 className="text-2xl font-bold text-[#e6edf3] mb-4">À propos du projet</h2>
            <p className="text-[#8b949e] leading-relaxed mb-4">
              Terminal Learning est un projet open source créé avec passion pour rendre
              l'apprentissage du terminal accessible à tous. L'application restera
              <strong className="text-[#e6edf3]"> toujours gratuite</strong> — sans publicité,
              sans données vendues, sans friction.
            </p>
            <p className="text-[#8b949e] leading-relaxed">
              Si l'application t'a été utile, tu peux soutenir le développement. Chaque contribution
              aide à couvrir les frais d'hébergement et de maintenance.
            </p>
          </div>

          {/* Right — Support cards */}
          <div className="space-y-4">
            {/* Ko-fi */}
            <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <Coffee size={16} className="text-amber-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[#e6edf3] text-sm font-semibold">Ko-fi — Don ponctuel</p>
                  <p className="text-[#8b949e] text-xs leading-relaxed mt-0.5">
                    Offre un café. Chaque don, même petit, aide à couvrir l'hébergement.
                  </p>
                </div>
              </div>
              <a
                href="https://ko-fi.com/thierryvm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/15 text-amber-400 hover:text-amber-300 text-sm font-medium transition-all"
                aria-label="Soutenir Terminal Learning sur Ko-fi"
              >
                <Coffee size={14} aria-hidden="true" />
                Offrir un café sur Ko-fi
                <ExternalLink size={12} className="opacity-60" aria-hidden="true" />
              </a>
            </div>

            {/* GitHub Sponsors — coming soon */}
            <div
              className="p-5 rounded-xl border border-[#30363d] bg-[#161b22] opacity-60 cursor-not-allowed"
              title="En attente d'accord RIZIV/INAMI — bientôt disponible"
              aria-label="GitHub Sponsors — bientôt disponible"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-[#0d1117] border border-[#30363d] shrink-0">
                  <Github size={16} className="text-[#8b949e]" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[#e6edf3] text-sm font-semibold">GitHub Sponsors</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#30363d] text-[#8b949e] font-mono">
                      bientôt
                    </span>
                  </div>
                  <p className="text-[#8b949e] text-xs leading-relaxed mt-0.5">
                    Sponsoring mensuel récurrent — en cours d'activation.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#30363d] text-[#8b949e] text-sm font-medium select-none">
                <Github size={14} aria-hidden="true" />
                Bientôt disponible
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── HALL OF FAME ────────────────────────────────────────── */}
      {SUPPORTERS.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
          <h2 className="text-2xl font-bold text-[#e6edf3] mb-8">Hall of Fame</h2>
          <div className="flex flex-wrap gap-2">
            {SUPPORTERS.map((name) => (
              <span key={name} className="px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-sm font-mono">
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#30363d]/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#8b949e] text-sm font-mono">
            <Terminal size={14} className="text-emerald-400" aria-hidden="true" />
            Terminal Learning · MIT License
          </div>
          <div className="flex items-center gap-6 text-sm text-[#8b949e]">
            <button onClick={() => navigate('/app')} className="hover:text-[#e6edf3] transition-colors">Application</button>
            <a href="https://github.com/thierryvm/TerminalLearning" target="_blank" rel="noopener noreferrer" className="hover:text-[#e6edf3] transition-colors">GitHub</a>
            <a href="https://ko-fi.com/thierryvm" target="_blank" rel="noopener noreferrer" className="hover:text-[#e6edf3] transition-colors">Ko-fi</a>
            <button onClick={() => navigate('/privacy')} className="hover:text-[#e6edf3] transition-colors">Confidentialité</button>
          </div>
          <p className="text-[#8b949e] text-xs flex items-center gap-1">
            Fait avec <Heart size={10} className="text-pink-400" aria-hidden="true" /> en Belgique
          </p>
        </div>
      </footer>
    </div>
  );
}
