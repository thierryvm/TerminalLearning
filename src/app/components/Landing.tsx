import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Terminal, ChevronRight, Github, BookOpen,
  CheckCircle2, Zap, Clock, Star, Coffee, Heart,
  Compass, Monitor, LogIn, Share2, Check, Download,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { TerminalPreview } from './landing/TerminalPreview';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { UserMenu } from './auth/UserMenu';
import { LoginModal } from './auth/LoginModal';
import { useEnvironment, ENV_META, type SelectedEnvironment } from '../context/EnvironmentContext';
import {
  TOTAL_LESSONS, TOTAL_COMMANDS,
  FEATURES, ROADMAP_AVAILABLE, ROADMAP_IN_PROGRESS, ROADMAP_PLANNED,
  SUPPORTERS, TRUST_BADGES, MODULE_ICONS, LEVEL_BADGE, STATS, ENV_LEVELS,
} from '../data/landingContent';
import { curriculum } from '../data/curriculum';

// ── Environment icon helper ──────────────────────────────────────────────────

function EnvIcon({ envId, size = 14 }: { envId: SelectedEnvironment; size?: number }) {
  if (envId === 'linux') return <Terminal size={size} aria-hidden="true" />;
  if (envId === 'macos') return <span className="text-[13px] leading-none select-none" aria-hidden="true"></span>;
  return <span className="text-[11px] leading-none select-none" aria-hidden="true">⊞</span>;
}

// ── Component ────────────────────────────────────────────────────────────────

/** Landing page — public entry point at "/" */
export function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { syncStatus } = useProgress();
  const [loginOpen, setLoginOpen] = useState(false);
  const { selectedEnv, setEnvironment } = useEnvironment();
  const [shared, setShared] = useState(false);
  const { isInstalled } = usePWAInstall();
  const [showPWAModal, setShowPWAModal] = useState(false);

  const handleShare = async () => {
    const url = 'https://terminallearning.dev';
    const text = 'Apprends le terminal gratuitement — 10 modules interactifs, Linux / macOS / Windows.';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Terminal Learning', text, url });
      } catch {
        // user cancelled — no action needed
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="border-b border-[#30363d]/50 px-4 sm:px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Terminal size={18} className="text-emerald-400" aria-hidden="true" />
          </div>
          <span className="font-mono text-[#e6edf3] text-sm hidden sm:block whitespace-nowrap">Terminal Learning</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://github.com/thierryvm/TerminalLearning"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors shrink-0"
            aria-label="Voir le projet sur GitHub"
          >
            <Github size={18} aria-hidden="true" />
          </a>
          {user ? (
            <UserMenu syncStatus={syncStatus} variant="compact" />
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="text-[#8b949e] hover:text-[#e6edf3] text-sm font-mono transition-colors flex items-center gap-1.5"
              aria-label="Se connecter"
            >
              <LogIn size={18} className="sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">Se connecter</span>
            </button>
          )}
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            Commencer <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <main>
      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Glow background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="w-[300px] h-[300px] sm:w-[500px] sm:h-[400px] md:w-[700px] md:h-[500px] bg-emerald-500/8 rounded-full blur-3xl" />
        </div>

        {/* Hero content — no JS animation so the h1 (LCP element) is visible on first paint */}
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            Gratuit · Open Source · Pour débutants
          </span>

          <h1 className="text-4xl md:text-6xl font-bold text-[#e6edf3] leading-tight mb-4">
            Maîtrise le terminal{' '}
            <span className="text-emerald-400">pas à pas</span>
          </h1>

          <p className="text-[#8b949e] text-lg md:text-xl max-w-2xl mx-auto mb-6 leading-relaxed">
            {TOTAL_LESSONS} leçons interactives, {TOTAL_COMMANDS}+ commandes documentées.
            Pratique réelle dans un terminal simulé — progression sauvegardée, aucune inscription requise.
          </p>

          {/* ── Environment selector ─────────────────────────────── */}
          <div className="mb-8">
            <p className="text-[#8b949e] text-xs font-mono mb-3 uppercase tracking-widest">
              Choisissez votre environnement
            </p>
            <div className="flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1 rounded-xl bg-[#161b22] border border-[#30363d]">
              {(['linux', 'macos', 'windows'] as SelectedEnvironment[]).map((envId) => {
                const meta = ENV_META[envId];
                const active = selectedEnv === envId;
                return (
                  <button
                    key={envId}
                    onClick={() => setEnvironment(envId)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-w-[75px] sm:min-w-[100px] justify-center ${
                      active
                        ? `${meta.bgColor} ${meta.color} ${meta.borderColor} border`
                        : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] border border-transparent'
                    }`}
                    aria-pressed={active}
                  >
                    <EnvIcon envId={envId} size={14} />
                    {meta.label}
                  </button>
                );
              })}
              {/* WSL — future only */}
              <span
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm text-[#484f58] cursor-not-allowed border border-transparent"
                title="WSL — bientôt disponible"
                aria-disabled="true"
              >
                <Monitor size={14} aria-hidden="true" />
                WSL
                <span className="text-[10px] font-mono bg-[#21262d] px-1.5 py-0.5 rounded text-[#8b949e] hidden sm:inline">bientôt</span>
              </span>
            </div>
            </div>

            {/* ── 3 levels per environment ──────────────────────── */}
            <motion.div
              key={selectedEnv}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-3xl mx-auto"
            >
              {ENV_LEVELS[selectedEnv].map((lvl) => (
                <div
                  key={lvl.level}
                  className={`${lvl.bg} border ${lvl.border} rounded-xl p-4`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${lvl.border} ${lvl.color} bg-black/20`}>
                      Niveau {lvl.level}
                    </span>
                  </div>
                  <div className={`text-sm font-semibold ${lvl.color} mb-1`}>{lvl.label}</div>
                  <div className="text-[#8b949e] text-xs mb-3 leading-relaxed">{lvl.description}</div>
                  <div className="flex flex-wrap gap-1">
                    {lvl.commands.map((cmd) => (
                      <code
                        key={cmd}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-[#e6edf3] border border-[#30363d]"
                      >
                        {cmd}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

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

            <button
              onClick={() => document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[#30363d] hover:border-emerald-500/40 text-[#8b949e] hover:text-emerald-400 font-medium text-base transition-all"
            >
              <Compass size={16} aria-hidden="true" />
              Voir la roadmap
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#30363d] hover:border-[#8b949e]/40 text-[#8b949e] hover:text-[#e6edf3] font-medium text-base transition-all"
              aria-label="Partager Terminal Learning"
            >
              {shared ? (
                <>
                  <Check size={16} className="text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">Lien copié !</span>
                </>
              ) : (
                <>
                  <Share2 size={16} aria-hidden="true" />
                  Partager
                </>
              )}
            </button>

            {!isInstalled && (
              <button
                onClick={() => setShowPWAModal(true)}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#30363d] hover:border-emerald-500/40 text-[#8b949e] hover:text-emerald-400 font-medium text-base transition-all"
                aria-label="Installer l'application"
              >
                <Download size={16} aria-hidden="true" />
                Installer l'app
              </button>
            )}
          </div>
        </div>
      </section>

      {showPWAModal && <PWAInstallModal onClose={() => setShowPWAModal(false)} />}

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

      {/* ── STATS BAR ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-6 border-t border-[#30363d]/50">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col items-center gap-1 p-4 rounded-xl border border-[#30363d] bg-[#161b22]">
                <Icon size={16} className="text-emerald-400 mb-1" aria-hidden="true" />
                <span className="text-2xl font-bold text-[#e6edf3] font-mono">{stat.value}</span>
                <span className="text-[#8b949e] text-xs">{stat.label}</span>
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* ── MODULE PREVIEW ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-2">
            {curriculum.length} modules progressifs
          </h2>
          <p className="text-[#8b949e] text-center mb-10">
            Du système de fichiers à la redirection de flux — deux niveaux, sans prérequis pour commencer.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {curriculum.map((mod, i) => {
              const Icon = MODULE_ICONS[mod.iconName] ?? BookOpen;
              const levelBadge = LEVEL_BADGE[mod.level ?? 1] ?? LEVEL_BADGE[1];
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
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#0d1117]/80 border border-[#30363d]">
                        <Icon size={16} style={{ color: mod.color }} aria-hidden="true" />
                      </div>
                      <span className="text-[#8b949e] text-xs font-mono">Module {i + 1}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${levelBadge.text} ${levelBadge.border} ${levelBadge.bg}`}
                    >
                      {levelBadge.label}
                    </span>
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

          <p className="mt-8 text-center text-[#8b949e] text-sm">
            10 modules inclus — aucun compte requis.
          </p>
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
      <section id="roadmap" className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-2">Roadmap publique</h2>
          <p className="text-[#8b949e] text-center mb-10">Ce qui est disponible, ce qu'on construit, et ce qui vient ensuite.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Available */}
            <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} className="text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400 text-sm font-semibold">Disponible</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">live</span>
              </div>
              <ul className="space-y-2">
                {ROADMAP_AVAILABLE.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-[#8b949e]">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* In progress */}
            <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-4 h-4 flex items-center justify-center shrink-0" aria-hidden="true">
                  <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                </span>
                <span className="text-blue-400 text-sm font-semibold">En cours</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">beta</span>
              </div>
              <ul className="space-y-2">
                {ROADMAP_IN_PROGRESS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-[#8b949e]">
                    <Zap size={12} className="text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Planned */}
            <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-amber-400" aria-hidden="true" />
                <span className="text-[#8b949e] text-sm font-semibold">Plus tard</span>
              </div>
              <ul className="space-y-2">
                {ROADMAP_PLANNED.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-[#8b949e]">
                    <span className="w-3 h-3 rounded-full border border-[#30363d] mt-0.5 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
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
            {/* Ko-fi — on hold pending Solidaris authorization */}
            <div
              role="group"
              aria-disabled="true"
              aria-label="Ko-fi — bientôt disponible (en attente d'accord de la mutuelle Solidaris)"
              className="p-5 rounded-xl border border-[#30363d] bg-[#161b22] opacity-60 cursor-not-allowed"
              title="En attente de l'accord de la mutuelle Solidaris (RIZIV/INAMI)"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-[#0d1117] border border-[#30363d] shrink-0">
                  <Coffee size={16} className="text-[#8b949e]" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[#e6edf3] text-sm font-semibold">Ko-fi — Don ponctuel</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#30363d] text-[#8b949e] font-mono">
                      bientôt
                    </span>
                  </div>
                  <p className="text-[#8b949e] text-xs leading-relaxed mt-0.5">
                    Offre un café. En attente d'accord mutuelle — bientôt disponible.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#30363d] text-[#8b949e] text-sm font-medium select-none">
                <Coffee size={14} aria-hidden="true" />
                Bientôt disponible
              </span>
            </div>

            {/* GitHub Sponsors — on hold pending Solidaris authorization */}
            <div
              role="group"
              aria-disabled="true"
              aria-label="GitHub Sponsors — bientôt disponible (en attente d'accord de la mutuelle Solidaris)"
              className="p-5 rounded-xl border border-[#30363d] bg-[#161b22] opacity-60 cursor-not-allowed"
              title="En attente de l'accord de la mutuelle Solidaris (RIZIV/INAMI)"
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
                    Sponsoring mensuel récurrent — en attente d'accord mutuelle.
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

      </main>

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
            <span className="text-[#7d8590] cursor-not-allowed" title="Bientôt disponible" aria-disabled="true">Ko-fi</span>
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
