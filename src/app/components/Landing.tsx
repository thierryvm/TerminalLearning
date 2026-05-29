import { useState, useEffect, Suspense } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { FadeIn } from './landing/FadeIn';
import {
  Terminal, ChevronRight, Github, BookOpen,
  CheckCircle2, Zap, Clock, Star, Heart,
  Compass, Monitor, LogIn, Share2, Check, Download, ArrowUp,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { TerminalPreview } from './landing/TerminalPreview';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// THI-118 — defer non-critical chunks to keep the landing critical path lean.
// UserMenu only renders for logged-in users (minority of landing visitors);
// LoginModal / PWAInstallModal only mount after user interaction.
// lazyWithRetry (not bare lazy) so a stale chunk after a deploy auto-recovers
// instead of surfacing React Router's default error screen — see the
// `UserMenu-<hash>.js` "Failed to fetch dynamically imported module" report.
const UserMenu = lazyWithRetry(() => import('./auth/UserMenu').then((m) => ({ default: m.UserMenu })));
const LoginModal = lazyWithRetry(() => import('./auth/LoginModal').then((m) => ({ default: m.LoginModal })));
const PWAInstallModal = lazyWithRetry(() => import('./PWAInstallModal').then((m) => ({ default: m.PWAInstallModal })));
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
  if (envId === 'macos') return <span className="text-sm leading-none select-none" aria-hidden="true"></span>;
  return <span className="text-xs leading-none select-none" aria-hidden="true">⊞</span>;
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
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // THI-235 Sprint 2.A étape 2.bis — open LoginModal automatically when a
  // guest is redirected here from a role-gated route (RequireRole/RequireAuth
  // fallback `Se connecter` button). The intended destination is stored in
  // sessionStorage (`auth_return_to`) and consumed by AuthCallback post-login.
  // We immediately strip the query param to keep the URL clean + avoid the
  // modal reopening on history.back navigation.
  // security-auditor M1 fix : the cleanup runs whenever the param is present,
  // even for already-authenticated users — keeps the URL clean rather than
  // leaving `?login=open` stuck in the address bar.
  useEffect(() => {
    if (searchParams.get('login') !== 'open') return;
    // Synchronous setState within an effect is acceptable here because it
    // runs once per query-param transition and is bracketed by setSearchParams
    // which also schedules its own batched update (no cascading renders).
    /* eslint-disable react-hooks/set-state-in-effect -- intentional one-shot trigger on query param entry */
    if (!user) {
      setLoginOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('login');
    setSearchParams(next, { replace: true });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams, setSearchParams, user]);

  const handleShare = async () => {
    const url = 'https://terminallearning.dev';
    const text = 'Apprends le terminal gratuitement — 11 modules interactifs, Linux / macOS / Windows.';
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
    <div className="min-h-dvh bg-[var(--github-bg)] text-[var(--github-text-primary)]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Mount LoginModal only after the user opens it — keeps the lazy
          chunk out of the landing critical path (THI-118). */}
      {loginOpen && (
        <Suspense fallback={null}>
          <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
        </Suspense>
      )}

      {/* ── NAV ─────────────────────────────────────────────────── */}
      {/* THI-152 brick 7bis: pt-[max(1rem,env(safe-area-inset-top))]
          shifts the nav (Terminal logo + GitHub + Login + "Commencer →")
          below the iOS status bar in PWA standalone mode (Add to Home
          Screen). On Safari classic mobile and on desktop, env() resolves
          to 0 → max(1rem, 0) = 1rem (= py-4 baseline, no regression).
          Pattern matches the footer (line 593) `pb-[max(2rem,env(...))]`.
          Layout.tsx already handles its own mobile top bar via the flex-1
          wrapper safe-area paddings (mini-PR 7/9), but Landing does NOT
          use Layout — it has its own nav, hence this dedicated fix. */}
      <nav className="border-b border-[var(--github-border-primary)]/50 px-4 sm:px-6 pb-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Terminal size={18} className="text-emerald-400" aria-hidden="true" />
          </div>
          <span className="font-mono text-[var(--github-text-primary)] text-sm hidden sm:block whitespace-nowrap">Terminal Learning</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sourcery #248 fixup: use TL design system variant (tl-icon-ghost + icon-lg = 44×44 built-in) via asChild, NOT shadcn ghost+icon which uses default ring-ring/50 tokens incompatible with TL emerald focus rings. Negative margin preserves visual spacing unchanged. */}
          <Button
            asChild
            variant="tl-icon-ghost"
            size="icon-lg"
            className="-m-2.5"
          >
            <a
              href="https://github.com/thierryvm/TerminalLearning"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Voir le projet sur GitHub"
            >
              <Github size={18} aria-hidden="true" />
            </a>
          </Button>
          {user ? (
            <Suspense fallback={null}>
              <UserMenu syncStatus={syncStatus} variant="compact" />
            </Suspense>
          ) : (
            <Button
              variant="nav-link"
              size="link-inline"
              onClick={() => setLoginOpen(true)}
              aria-label="Se connecter"
              className="gap-1.5 text-sm font-mono min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 sm:h-auto"
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

          <h1 className="text-4xl md:text-6xl font-bold text-[var(--github-text-primary)] leading-tight mb-4">
            Maîtrise le terminal{' '}
            <span className="text-emerald-400">pas à pas</span>
          </h1>

          <p className="text-[var(--github-text-secondary)] text-lg md:text-xl max-w-2xl mx-auto mb-6 leading-relaxed">
            {TOTAL_LESSONS} leçons interactives, {TOTAL_COMMANDS}+ commandes documentées.
            Pratique réelle dans un terminal simulé — progression sauvegardée, aucune inscription requise.
          </p>

          {/* ── Environment selector ─────────────────────────────── */}
          <div className="mb-8">
            <p className="text-[var(--github-text-secondary)] text-xs font-mono mb-3 uppercase tracking-widest">
              Choisissez votre environnement
            </p>
            <div className="flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1 rounded-xl bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)]">
              {(['linux', 'macos', 'windows'] as SelectedEnvironment[]).map((envId) => {
                const meta = ENV_META[envId];
                const active = selectedEnv === envId;
                return (
                  <button
                    key={envId}
                    type="button"
                    onClick={() => setEnvironment(envId)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-11 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-w-[75px] sm:min-w-[100px] justify-center focus:outline-none focus:border-emerald-500/40 focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                      active
                        ? `${meta.bgColor} ${meta.color} ${meta.borderColor} border`
                        : 'text-[var(--github-text-secondary)] hover:text-[var(--github-text-primary)] hover:bg-[#21262d] border border-transparent'
                    }`}
                    aria-pressed={active}
                  >
                    <EnvIcon envId={envId} size={14} />
                    {meta.label}
                  </button>
                );
              })}
              {/* WSL — future only — min-h-11 pour alignement visuel avec les 3 buttons interactifs (THI-211) */}
              <span
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-11 rounded-lg text-xs sm:text-sm text-[#484f58] cursor-not-allowed border border-transparent"
                title="WSL — bientôt disponible"
                aria-disabled="true"
              >
                <Monitor size={14} aria-hidden="true" />
                WSL
                <span className="text-xs font-mono bg-[#21262d] px-1.5 py-0.5 rounded text-[var(--github-text-secondary)] hidden sm:inline">bientôt</span>
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
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${lvl.border} ${lvl.color} bg-black/20`}>
                      Niveau {lvl.level}
                    </span>
                  </div>
                  <div className={`text-sm font-semibold ${lvl.color} mb-1`}>{lvl.label}</div>
                  <div className="text-[var(--github-text-secondary)] text-xs mb-3 leading-relaxed">{lvl.description}</div>
                  <div className="flex flex-wrap gap-1">
                    {lvl.commands.map((cmd) => (
                      <code
                        key={cmd}
                        className="text-xs font-mono px-1.5 py-0.5 rounded bg-black/30 text-[var(--github-text-primary)] border border-[var(--github-border-primary)]"
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

      {showPWAModal && (
        <Suspense fallback={null}>
          <PWAInstallModal onClose={() => setShowPWAModal(false)} />
        </Suspense>
      )}

      {/* ── TRUST BADGES ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-3 justify-center">
          {TRUST_BADGES.map((badge, i) => {
            const Icon = badge.icon;
            const pill = (
              <FadeIn as="span" delay={i * 70} className="inline-flex">
                <Badge variant="pill-muted" className="text-xs [&>svg]:size-[13px]">
                  <Icon aria-hidden="true" />
                  {badge.label}
                </Badge>
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
                  className="hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-full"
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
      <section className="max-w-6xl mx-auto px-6 py-6 border-t border-[var(--github-border-primary)]/50">
        <FadeIn className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col items-center gap-1 p-4 rounded-xl border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <Icon size={16} className="text-emerald-400 mb-1" aria-hidden="true" />
                <span className="text-2xl font-bold text-[var(--github-text-primary)] font-mono">{stat.value}</span>
                <span className="text-[var(--github-text-secondary)] text-xs">{stat.label}</span>
              </div>
            );
          })}
        </FadeIn>
      </section>

      {/* ── MODULE PREVIEW ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[var(--github-border-primary)]/50">
        <FadeIn direction="none">
          <h2 className="text-2xl font-bold text-center text-[var(--github-text-primary)] mb-2">
            {MODULE_PREVIEWS.length} modules progressifs
          </h2>
          <p className="text-[var(--github-text-secondary)] text-center mb-10">
            Du système de fichiers à la redirection de flux — deux niveaux, sans prérequis pour commencer.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULE_PREVIEWS.map((mod, i) => {
              const Icon = MODULE_ICONS[mod.iconName] ?? BookOpen;
              const levelBadge = LEVEL_BADGE[mod.level ?? 1] ?? LEVEL_BADGE[1];
              return (
                <FadeIn key={mod.id} delay={i * 60}>
                  <Link
                    to={`/app/learn/${mod.id}/${mod.firstLessonId}`}
                    aria-label={`Accéder au module ${mod.title} : ${mod.description}`}
                    className="block h-full p-5 rounded-xl border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] focus:outline-none focus:border-emerald-500/40 focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--github-bg)]/80 border border-[var(--github-border-primary)]">
                          <Icon size={16} style={{ color: mod.color }} aria-hidden="true" />
                        </div>
                        <span className="text-[var(--github-text-secondary)] text-xs font-mono">Module {i + 1}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-mono ${levelBadge.text} ${levelBadge.border} ${levelBadge.bg}`}
                      >
                        {levelBadge.label}
                      </span>
                    </div>
                    <h3 className="text-[var(--github-text-primary)] font-semibold text-sm mb-1">{mod.title}</h3>
                    <p className="text-[var(--github-text-secondary)] text-xs leading-relaxed">{mod.description}</p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400 text-xs">{mod.lessonCount} leçons disponibles</span>
                    </div>
                  </Link>
                </FadeIn>
              );
            })}
          </div>

          <p className="mt-8 text-center text-[var(--github-text-secondary)] text-sm">
            11 modules inclus — aucun compte requis.
          </p>
        </FadeIn>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[var(--github-border-primary)]/50">
        <FadeIn direction="none">
          <h2 className="text-2xl font-bold text-center text-[var(--github-text-primary)] mb-2">Pourquoi Terminal Learning ?</h2>
          <p className="text-[var(--github-text-secondary)] text-center mb-10">Conçu pour les débutants qui veulent apprendre en faisant.</p>

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
                    <div className={`p-2 rounded-lg bg-[var(--github-bg)]/60 border ${f.border}`}>
                      <Icon size={18} className={f.color} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-[var(--github-text-primary)] font-medium mb-1">{f.title}</h3>
                      <p className="text-[var(--github-text-secondary)] text-sm leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </FadeIn>
      </section>

      {/* ── ROADMAP ─────────────────────────────────────────────── */}
      <section id="roadmap" className="max-w-6xl mx-auto px-6 py-16 border-t border-[var(--github-border-primary)]/50">
        <FadeIn direction="none">
          <h2 className="text-2xl font-bold text-center text-[var(--github-text-primary)] mb-2">Roadmap publique</h2>
          <p className="text-[var(--github-text-secondary)] text-center mb-10">Ce qui est disponible, ce qu'on construit, et ce qui vient ensuite.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Available */}
            <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 size={16} className="text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400 text-sm font-semibold">Disponible</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">live</span>
              </div>
              <div className="space-y-4">
                {ROADMAP_AVAILABLE.map((group) => (
                  <div key={group.group}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80 mb-1.5">
                      {group.group}
                    </h3>
                    <ul className="space-y-1.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-[var(--github-text-secondary)] leading-snug">
                          <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* In progress */}
            <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-4 h-4 flex items-center justify-center shrink-0" aria-hidden="true">
                  <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                </span>
                <span className="text-blue-400 text-sm font-semibold">En cours</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">beta</span>
              </div>
              <div className="space-y-4">
                {ROADMAP_IN_PROGRESS.map((group) => (
                  <div key={group.group}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400/80 mb-1.5">
                      {group.group}
                    </h3>
                    <ul className="space-y-1.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-[var(--github-text-secondary)] leading-snug">
                          <Zap size={12} className="text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Planned */}
            <div className="p-5 rounded-xl border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
              <div className="flex items-center gap-2 mb-5">
                <Clock size={16} className="text-amber-400" aria-hidden="true" />
                <span className="text-[var(--github-text-secondary)] text-sm font-semibold">Plus tard</span>
              </div>
              <div className="space-y-4">
                {ROADMAP_PLANNED.map((group) => (
                  <div key={group.group}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400/80 mb-1.5">
                      {group.group}
                    </h3>
                    <ul className="space-y-1.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-[var(--github-text-secondary)] leading-snug">
                          <span className="w-3 h-3 rounded-full border border-[var(--github-border-primary)] mt-0.5 shrink-0" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── ABOUT ───────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-[var(--github-border-primary)]/50">
        <FadeIn direction="none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--github-border-primary)] text-[var(--github-text-secondary)] text-xs font-mono mb-6">
            <Star size={12} className="text-amber-400" aria-hidden="true" />
            Projet bénévole · Belgique
          </div>
          <h2 className="text-2xl font-bold text-[var(--github-text-primary)] mb-4">À propos du projet</h2>
          <p className="text-[var(--github-text-secondary)] leading-relaxed mb-4">
            Terminal Learning est un projet open source créé avec passion pour rendre
            l'apprentissage du terminal accessible à tous. L'application restera
            <strong className="text-[var(--github-text-primary)]"> toujours gratuite</strong> — sans publicité,
            sans données vendues, sans friction.
          </p>
          <p className="text-[var(--github-text-secondary)] leading-relaxed">
            Si l'application t'a été utile, tu peux contribuer autrement :{' '}
            <a
              href="https://github.com/thierryvm/TerminalLearning"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 decoration-emerald-400/40 hover:decoration-emerald-300 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--github-bg)]"
            >
              ajouter une étoile sur GitHub
            </a>
            ,{' '}
            <a
              href="https://github.com/thierryvm/TerminalLearning/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 decoration-emerald-400/40 hover:decoration-emerald-300 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--github-bg)]"
            >
              signaler un bug
            </a>
            {' '}ou contribuer au code, au curriculum, aux traductions.
          </p>
        </FadeIn>
      </section>

      {/* ── HALL OF FAME ────────────────────────────────────────── */}
      {SUPPORTERS.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[var(--github-border-primary)]/50">
          <h2 className="text-2xl font-bold text-[var(--github-text-primary)] mb-8">Hall of Fame</h2>
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
          className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-50"
        >
          <ArrowUp size={18} />
        </Button>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--github-border-primary)]/50 px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[var(--github-text-secondary)] text-sm font-mono">
            <Terminal size={14} className="text-emerald-400" aria-hidden="true" />
            Terminal Learning · MIT License
          </div>
          <nav
            aria-label="Pied de page"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-[var(--github-text-secondary)]"
          >
            <Button variant="nav-link" size="footer-link" onClick={() => navigate('/app')}>Application</Button>
            <a
              href="https://github.com/thierryvm/TerminalLearning"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-11 px-2 hover:text-[var(--github-text-primary)] transition-colors"
            >
              GitHub
            </a>
            <Button variant="nav-link" size="footer-link" onClick={() => navigate('/changelog')}>Changelog</Button>
            <Button variant="nav-link" size="footer-link" onClick={() => navigate('/story')}>Notre histoire</Button>
            <Button variant="nav-link" size="footer-link" onClick={() => navigate('/privacy')}>Confidentialité</Button>
          </nav>
          <p className="text-[var(--github-text-secondary)] text-xs flex items-center gap-1">
            Fait avec <Heart size={10} className="text-pink-400" aria-hidden="true" /> en Belgique
          </p>
        </div>
      </footer>
    </div>
  );
}
