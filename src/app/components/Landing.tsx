import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { FadeIn } from './landing/FadeIn';
import {
  Terminal, ChevronRight, Github, BookOpen,
  CheckCircle2, Zap, Clock, Star, Coffee, Heart,
  Compass, Monitor, LogIn, Share2, Check, Download, ArrowUp,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { TerminalPreview } from './landing/TerminalPreview';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { UserMenu } from './auth/UserMenu';
import { LoginModal } from './auth/LoginModal';
import { Button } from './ui/button';
import { useEnvironment, ENV_META, type SelectedEnvironment } from '../context/EnvironmentContext';
import {
  TOTAL_LESSONS, TOTAL_COMMANDS,
  FEATURES, ROADMAP_AVAILABLE, ROADMAP_IN_PROGRESS, ROADMAP_PLANNED,
  SUPPORTERS, TRUST_BADGES, MODULE_ICONS, LEVEL_BADGE, STATS, ENV_LEVELS,
  MODULE_PREVIEWS,
} from '../data/landingContent';

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
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
            <Button
              variant="nav-link"
              size="link-inline"
              onClick={() => setLoginOpen(true)}
              aria-label="Se connecter"
              className="gap-1.5 text-sm font-mono"
            >
              <LogIn size={18} className="sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">Se connecter</span>
            </Button>
          )}
          <Button
            variant="emerald-nav"
            size="nav-pill"
            onClick={() => navigate('/app')}
            className="gap-1 sm:gap-1.5 shrink-0"
          >
            Commencer <ChevronRight size={14} aria-hidden="true" />
          </Button>
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
            <div
              key={selectedEnv}
              className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-3xl mx-auto animate-fade-in-up"
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
            </div>
          </div>

          {/* Terminal preview — proof before CTA */}
          <div className="mb-10">
            <TerminalPreview />
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Primary CTA */}
            <Button
              variant="emerald"
              size="cta-hero"
              onClick={() => navigate('/app')}
              aria-label="Commencer l'apprentissage gratuitement"
              className="shadow-lg shadow-emerald-500/20 sm:self-center"
            >
              <Terminal size={18} aria-hidden="true" />
              Commencer l'apprentissage
              <ChevronRight size={16} aria-hidden="true" />
            </Button>

            {/* Secondary CTAs */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center sm:justify-center">
            <Button
              variant="ghost-gh"
              size="cta-pill"
              onClick={() => document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Compass size={15} aria-hidden="true" />
              Voir la roadmap
            </Button>

            <Button
              variant="ghost-gh-neutral"
              size="cta-pill"
              onClick={handleShare}
              aria-label="Partager Terminal Learning"
            >
              {shared ? (
                <>
                  <Check size={15} className="text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">Lien copié !</span>
                </>
              ) : (
                <>
                  <Share2 size={15} aria-hidden="true" />
                  Partager
                </>
              )}
            </Button>

            {!isInstalled && (
              <Button
                variant="ghost-gh"
                size="cta-pill"
                onClick={() => setShowPWAModal(true)}
                aria-label="Installer l'application"
              >
                <Download size={15} aria-hidden="true" />
                Installer l'app
              </Button>
            )}
            </div>
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
              <FadeIn
                as="span"
                delay={i * 70}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#30363d] text-[#8b949e] text-xs font-medium"
              >
                <Icon size={13} aria-hidden="true" />
                {badge.label}
              </FadeIn>
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
        <FadeIn className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </FadeIn>
      </section>

      {/* ── MODULE PREVIEW ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <FadeIn direction="none">
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-2">
            {MODULE_PREVIEWS.length} modules progressifs
          </h2>
          <p className="text-[#8b949e] text-center mb-10">
            Du système de fichiers à la redirection de flux — deux niveaux, sans prérequis pour commencer.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULE_PREVIEWS.map((mod, i) => {
              const Icon = MODULE_ICONS[mod.iconName] ?? BookOpen;
              const levelBadge = LEVEL_BADGE[mod.level ?? 1] ?? LEVEL_BADGE[1];
              return (
                <FadeIn
                  key={mod.id}
                  delay={i * 60}
                  className="p-5 rounded-xl border border-[#30363d] bg-[#161b22] backdrop-blur-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                  onClick={() => navigate(`/app/learn/${mod.id}/${mod.firstLessonId}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/app/learn/${mod.id}/${mod.firstLessonId}`);
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
                    <span className="text-emerald-400 text-xs">{mod.lessonCount} leçons disponibles</span>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <p className="mt-8 text-center text-[#8b949e] text-sm">
            10 modules inclus — aucun compte requis.
          </p>
        </FadeIn>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <FadeIn direction="none">
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-2">Pourquoi Terminal Learning ?</h2>
          <p className="text-[#8b949e] text-center mb-10">Conçu pour les débutants qui veulent apprendre en faisant.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn
                  key={f.title}
                  delay={i * 80}
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
                </FadeIn>
              );
            })}
          </div>
        </FadeIn>
      </section>

      {/* ── ROADMAP ─────────────────────────────────────────────── */}
      <section id="roadmap" className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <FadeIn direction="none">
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
        </FadeIn>
      </section>

      {/* ── ABOUT + SUPPORT ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <FadeIn direction="none" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
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
        </FadeIn>
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

      {/* ── SCROLL TO TOP ───────────────────────────────────────── */}
      {showScrollTop && (
        <Button
          variant="floating"
          size="icon-round"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Retour en haut"
          className="fixed bottom-6 right-6 z-50"
        >
          <ArrowUp size={18} />
        </Button>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#30363d]/50 px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#8b949e] text-sm font-mono">
            <Terminal size={14} className="text-emerald-400" aria-hidden="true" />
            Terminal Learning · MIT License
          </div>
          <nav
            aria-label="Pied de page"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-[#8b949e]"
          >
            <Button variant="nav-link" size="footer-link" onClick={() => navigate('/app')}>Application</Button>
            <a
              href="https://github.com/thierryvm/TerminalLearning"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-11 px-2 hover:text-[#e6edf3] transition-colors"
            >
              GitHub
            </a>
            <span
              className="inline-flex items-center min-h-11 px-2 text-[#7d8590] cursor-not-allowed"
              title="Bientôt disponible"
              aria-disabled="true"
            >
              Ko-fi
            </span>
            <Button variant="nav-link" size="footer-link" onClick={() => navigate('/changelog')}>Changelog</Button>
            <Button variant="nav-link" size="footer-link" onClick={() => navigate('/story')}>Notre histoire</Button>
            <Button variant="nav-link" size="footer-link" onClick={() => navigate('/privacy')}>Confidentialité</Button>
          </nav>
          <p className="text-[#8b949e] text-xs flex items-center gap-1">
            Fait avec <Heart size={10} className="text-pink-400" aria-hidden="true" /> en Belgique
          </p>
        </div>
      </footer>
    </div>
  );
}
