import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate, useMatch } from 'react-router';
import { useFocusTrap } from '../../lib/hooks/useFocusTrap';
import { useUserRole } from '../../lib/hooks/useUserRole';
import {
  Terminal, LayoutDashboard, BookOpen, Settings,
  ChevronDown, ChevronRight, CheckCircle2, Circle, X, Menu, Home, Lock, School, ShieldCheck, ShieldUser, Briefcase, LifeBuoy,
} from 'lucide-react';
import { UserMenu } from './auth/UserMenu';
import { useAuth } from '../context/AuthContext';
import { SupportTicketModal } from './support/SupportTicketModal';
import { curriculum } from '../data/curriculum';
import { useProgress } from '../context/ProgressContext';
import { useEnvironment, ENV_META, type SelectedEnvironment } from '../context/EnvironmentContext';
import { iconMap } from '../data/moduleIcons';
import { Button } from './ui/button';
import { SidebarRowButton } from './ui/sidebar-row-button';
import { SidebarLessonButton } from './ui/sidebar-lesson-button';
import { EnvPill } from './ui/env-pill';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// État d'expansion effectif d'un module : un override utilisateur explicite prime,
// sinon le module est ouvert seulement s'il est le module actif. Source unique
// partagée par toggleModule et le rendu (évite toute divergence si la règle évolue).
function isModuleExpanded(
  overrides: Record<string, boolean>,
  id: string,
  activeModuleId: string | null,
): boolean {
  return overrides[id] ?? (id === activeModuleId);
}

/**
 * Visual section micro-label for the sidebar nav (THI-308, NN/g grouped-sections).
 *
 * `aria-hidden` is intentional (Sourcery review PR #351): the nav links below
 * are individually self-describing ("Tableau de bord", "Paramètres IA"…), so
 * the label is a purely visual scannability aid. Exposing it to assistive tech
 * would add a redundant pre-link announcement with no navigational value, and
 * promoting it to a heading would risk heading-order audit failures since the
 * sidebar <aside> is a landmark separate from the main-content heading tree.
 *
 * `className` carries only the top-padding variant so the shared typography
 * (size, tracking, mono, color) stays defined in one place.
 */
function SidebarSectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      aria-hidden="true"
      className={`text-[11px] text-[var(--github-text-secondary)] uppercase tracking-widest font-mono px-3 pb-0.5 ${className}`}
    >
      {children}
    </p>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { isLessonCompleted, getModuleProgress, overallProgress, syncStatus, unlockTree } = useProgress();
  const { selectedEnv, setEnvironment } = useEnvironment();
  const { role } = useUserRole();
  const { user } = useAuth();
  // Support ticket modal (Sprint 2.C Étape 2) — gated by auth : the ticket RLS
  // requires auth.uid(), so an anonymous visitor never sees the trigger.
  const [supportOpen, setSupportOpen] = useState(false);
  const canSeeTeacherEntry = role === 'teacher' || role === 'super_admin';
  const canSeeInstitutionEntry = role === 'institution_admin' || role === 'super_admin';
  const canSeeAdminEntry = role === 'super_admin';

  // THI-240 — "Mes outils" collapsible section.
  // Sprint 2.B.3 (27 mai 2026) — refactor sidebar saturation pour super_admin
  // qui voit 3 entries role-gated (Mes classes + Mon institution + Administration).
  // Seuil empirique : ≥ 2 entries → collapsible (gain ~132px modules space).
  // ≤ 1 entry → flat (pas de friction inutile click-to-expand pour 1 lien).
  // Persist en localStorage pour préserver le state utilisateur (default = closed
  // pour maximiser l'espace modules immédiat — l'utilisateur peut expand au besoin).
  const roleGatedCount =
    (canSeeTeacherEntry ? 1 : 0) +
    (canSeeInstitutionEntry ? 1 : 0) +
    (canSeeAdminEntry ? 1 : 0);
  const useMesOutilsCollapsible = roleGatedCount >= 2;
  const [mesOutilsOpen, setMesOutilsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tl-sidebar-mes-outils-open') === 'true';
  });
  const toggleMesOutils = () => {
    setMesOutilsOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('tl-sidebar-mes-outils-open', String(next));
      }
      return next;
    });
  };
  // Module actif déduit de la route leçon (/app/learn/:moduleId/:lessonId) via le
  // matching natif du routeur (useMatch) plutôt qu'une regex sur pathname : reste
  // aligné sur la définition de route et ne casse pas silencieusement si la route
  // évolue (base path, emboîtement). null sur le dashboard ou toute page hors leçon.
  const learnMatch = useMatch('/app/learn/:moduleId/*');
  const activeModuleId = learnMatch?.params.moduleId ?? null;

  // `expandedModules` ne stocke QUE les overrides explicites de l'utilisateur.
  // L'état effectif est dérivé au rendu : expandedModules[id] ?? (id === activeModuleId).
  // → par défaut seul le module actif est ouvert (les autres repliés), ce qui supprime
  // la sidebar interminable d'avant (tous forcés ouverts = 65 leçons d'un coup, pénible
  // sur mobile). Le module précédemment actif se replie en changeant de leçon, sauf si
  // l'utilisateur l'a explicitement ouvert. Dérivation pure = pas de setState en effet.
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !isModuleExpanded(prev, id, activeModuleId) }));
  };

  const handleLessonClick = (moduleId: string, lessonId: string) => {
    navigate(`/app/learn/${moduleId}/${lessonId}`);
    onClose();
  };

  // Trap focus inside the sidebar while it acts as a mobile drawer.
  // `isOpen` only flips to true on viewports < lg (the hamburger that
  // toggles it is `lg:hidden`), so this never engages on desktop where
  // the sidebar is a static, always-visible <aside>.
  const asideRef = useRef<HTMLElement>(null);
  useFocusTrap(isOpen, asideRef);

  // Escape closes the mobile drawer (no-op on lg+ where the sidebar is static).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar — on mobile (≤ lg) acts as a modal drawer when isOpen.
          On desktop the sidebar is static (always visible) and is just a
          regular <aside> nav, NOT a dialog. The dialog ARIA only applies
          to the mobile drawer state, otherwise screen readers would
          announce the static desktop nav as a modal incorrectly. */}
      <aside
        ref={asideRef}
        tabIndex={-1}
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen ? 'true' : undefined}
        aria-label="Navigation des modules"
        // THI-152 brick 9/9: pl-[max(0px,env(safe-area-inset-left))]
        // closes the landscape iPhone gap. In portrait or on desktop,
        // env() resolves to 0 → max(0, 0) = 0, no shift. In landscape
        // iPhone with the notch on the rotated side, the inset is ~44 px
        // and the sidebar content shifts inward so it does not get
        // clipped by the notch. Pattern matches the brick 7bis Landing
        // nav `max(...,env())` baseline-preservation idiom.
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[var(--github-bg)] border-r border-[var(--github-border-primary)] flex flex-col transition-transform duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[max(0px,env(safe-area-inset-left))] focus:outline-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-[var(--github-border-primary)]">
          <NavLink to="/app" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Terminal size={18} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-sm text-[var(--github-text-primary)] font-mono">Terminal</div>
              <div className="text-xs text-emerald-400 font-mono">Learning</div>
            </div>
          </NavLink>
          <Button
            type="button"
            variant="tl-sidebar-icon"
            size="icon-lg"
            onClick={onClose}
            className="lg:hidden -mr-2 rounded-lg"
            aria-label="Fermer le menu"
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="shrink-0 px-4 py-3 border-b border-[var(--github-border-primary)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--github-text-secondary)]">Progression</span>
            <span className="text-xs text-emerald-400 font-mono">{overallProgress}%</span>
          </div>
          <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="shrink-0 p-2 border-b border-[var(--github-border-primary)] space-y-0.5">
          {/* THI-308 UX 2026 — light section labels give the nav a scannable
              rhythm (NN/g grouped-sections) without the navigation cost of a
              second menu. Matches the existing "Modules"/"Environnement"
              uppercase micro-label idiom. Non-destructive: no route changes. */}
          <SidebarSectionLabel className="pt-1">Navigation</SidebarSectionLabel>
          <NavLink
            to="/app"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                isActive
                  ? 'bg-[#21262d] text-[var(--github-text-primary)]'
                  : 'text-[var(--github-text-secondary)] hover:bg-[var(--github-border-secondary)] hover:text-[var(--github-text-primary)]'
              }`
            }
          >
            <LayoutDashboard size={16} />
            Tableau de bord
          </NavLink>
          <NavLink
            to="/app/reference"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                isActive
                  ? 'bg-[#21262d] text-[var(--github-text-primary)]'
                  : 'text-[var(--github-text-secondary)] hover:bg-[var(--github-border-secondary)] hover:text-[var(--github-text-primary)]'
              }`
            }
          >
            <BookOpen size={16} />
            Référence
          </NavLink>
          {/* THI-240 — "Mes outils" collapsible role-gated section.
              Sprint 2.B.3 (27 mai 2026, PR #309 — audit ui-auditor Sonnet upgrade).
              ≥ 2 entries role-gated → collapsible (gain ~132px modules space pour
              super_admin avec 3 entries). 1 entry → flat (teacher / institution_admin
              voient 1 lien sans friction expand). */}
          {useMesOutilsCollapsible ? (
            <div>
              {/* ui-auditor C1 fix : réutilise Button variant=tl-sidebar-row + size=tl-sidebar-row
                  au lieu de raw <button> avec classes manuelles dupliquées. Cohérent avec le
                  pattern shadcn existant + SidebarRowButton (modules). text-secondary surcharge
                  le text-primary du variant car le toggle n'est pas "actif" par défaut. */}
              <Button
                type="button"
                variant="tl-sidebar-row"
                size="tl-sidebar-row"
                onClick={toggleMesOutils}
                aria-expanded={mesOutilsOpen}
                aria-controls="sidebar-mes-outils"
                className="text-[var(--github-text-secondary)] hover:text-[var(--github-text-primary)]"
              >
                <Briefcase size={16} />
                <span className="flex-1 text-left">Mes outils</span>
                <span className="text-xs text-[var(--github-text-secondary)] font-mono">{roleGatedCount}</span>
                {mesOutilsOpen ? (
                  <ChevronDown size={14} className="size-[14px] text-[var(--github-text-secondary)] shrink-0" />
                ) : (
                  <ChevronRight size={14} className="size-[14px] text-[var(--github-text-secondary)] shrink-0" />
                )}
              </Button>
              {mesOutilsOpen && (
                <div
                  id="sidebar-mes-outils"
                  className="ml-3 pl-3 border-l border-[var(--github-border-secondary)] space-y-0.5 mt-0.5 mb-1"
                >
                  {canSeeTeacherEntry && (
                    <NavLink
                      to="/app/teacher"
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                          isActive
                            ? 'bg-[#21262d] text-[var(--github-text-primary)]'
                            : 'text-[var(--github-text-secondary)] hover:bg-[var(--github-border-secondary)] hover:text-[var(--github-text-primary)]'
                        }`
                      }
                    >
                      <School size={16} />
                      Mes classes
                    </NavLink>
                  )}
                  {canSeeInstitutionEntry && (
                    <NavLink
                      to="/app/institution"
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                          isActive
                            ? 'bg-[#21262d] text-[var(--github-text-primary)]'
                            : 'text-[var(--github-text-secondary)] hover:bg-[var(--github-border-secondary)] hover:text-[var(--github-text-primary)]'
                        }`
                      }
                    >
                      <ShieldUser size={16} />
                      Mon institution
                    </NavLink>
                  )}
                  {canSeeAdminEntry && (
                    <NavLink
                      to="/app/admin"
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                          isActive
                            ? 'bg-[#21262d] text-[var(--github-text-primary)]'
                            : 'text-[var(--github-text-secondary)] hover:bg-[var(--github-border-secondary)] hover:text-[var(--github-text-primary)]'
                        }`
                      }
                    >
                      <ShieldCheck size={16} />
                      Administration
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ≤ 1 entry role-gated → flat (pas de friction expand inutile) */}
              {canSeeTeacherEntry && (
                <NavLink
                  to="/app/teacher"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                      isActive
                        ? 'bg-[#21262d] text-[var(--github-text-primary)]'
                        : 'text-[var(--github-text-secondary)] hover:bg-[var(--github-border-secondary)] hover:text-[var(--github-text-primary)]'
                    }`
                  }
                >
                  <School size={16} />
                  Mes classes
                </NavLink>
              )}
              {canSeeInstitutionEntry && (
                <NavLink
                  to="/app/institution"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                      isActive
                        ? 'bg-[#21262d] text-[var(--github-text-primary)]'
                        : 'text-[var(--github-text-secondary)] hover:bg-[var(--github-border-secondary)] hover:text-[var(--github-text-primary)]'
                    }`
                  }
                >
                  <ShieldUser size={16} />
                  Mon institution
                </NavLink>
              )}
              {canSeeAdminEntry && (
                <NavLink
                  to="/app/admin"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                      isActive
                        ? 'bg-[#21262d] text-[var(--github-text-primary)]'
                        : 'text-[var(--github-text-secondary)] hover:bg-[var(--github-border-secondary)] hover:text-[var(--github-text-primary)]'
                    }`
                  }
                >
                  <ShieldCheck size={16} />
                  Administration
                </NavLink>
              )}
            </>
          )}
          <SidebarSectionLabel className="pt-2">Compte &amp; aide</SidebarSectionLabel>
          <NavLink
            to="/app/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                isActive
                  ? 'bg-[#21262d] text-[var(--github-text-primary)]'
                  : 'text-[var(--github-text-secondary)] hover:bg-[var(--github-border-secondary)] hover:text-[var(--github-text-primary)]'
              }`
            }
          >
            <Settings size={16} />
            Paramètres IA
          </NavLink>
          {/* Sprint 2.C Étape 2 — support ticket trigger. Button (not NavLink) :
              opens a modal, not a route. Auth-gated : the ticket RLS needs
              auth.uid(), so anonymous visitors never see it. */}
          {user && (
            <Button
              type="button"
              variant="tl-sidebar-row"
              size="tl-sidebar-row"
              onClick={() => setSupportOpen(true)}
              className="text-[var(--github-text-secondary)] hover:text-[var(--github-text-primary)]"
            >
              <LifeBuoy size={16} />
              <span className="flex-1 text-left">Aide &amp; feedback</span>
            </Button>
          )}
        </nav>

        {/* Modules */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <p className="text-xs text-[var(--github-text-secondary)] uppercase tracking-widest px-3 py-2">Modules</p>
          {curriculum.map((mod) => {
            const Icon = iconMap[mod.iconName] ?? BookOpen;
            const { completed, total } = getModuleProgress(mod.id);
            const isExpanded = isModuleExpanded(expandedModules, mod.id, activeModuleId);
            const unlockStatus = unlockTree.find((u) => u.moduleId === mod.id);
            const locked = unlockStatus ? !unlockStatus.unlocked : false;

            return (
              <div key={mod.id}>
                {/* Module header */}
                <SidebarRowButton
                  type="button"
                  locked={locked}
                  onClick={locked ? undefined : () => toggleModule(mod.id)}
                  disabled={locked}
                  aria-label={locked
                    ? `${mod.title} — verrouillé, Niv. ${unlockStatus?.level}`
                    : `${mod.title} — ${completed}/${total} leçons`}
                  className="group"
                  title={locked ? `Prérequis : ${unlockStatus?.missingPrerequisiteLabels.join(', ')}` : undefined}
                >
                  {locked ? (
                    <Lock size={15} className="size-[15px] text-[var(--github-text-secondary)] shrink-0" />
                  ) : (
                    <span style={{ color: mod.color }}><Icon size={15} className="size-[15px]" /></span>
                  )}
                  <span className="flex-1 text-left truncate">{mod.title}</span>
                  {locked ? (
                    <span className="text-xs text-[var(--github-text-secondary)] font-mono shrink-0">Niv. {unlockStatus?.level}</span>
                  ) : (
                    <>
                      <span className="text-xs text-[var(--github-text-secondary)] font-mono shrink-0">{completed}/{total}</span>
                      {isExpanded ? (
                        <ChevronDown size={14} className="size-[14px] text-[var(--github-text-secondary)] shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="size-[14px] text-[var(--github-text-secondary)] shrink-0" />
                      )}
                    </>
                  )}
                </SidebarRowButton>

                {/* Locked hint */}
                {locked && (
                  <div className="ml-8 px-2 py-1 text-xs text-[var(--github-text-secondary)] leading-tight">
                    Complétez {unlockStatus?.missingPrerequisiteLabels.join(' & ')} pour débloquer
                  </div>
                )}

                {/* Lessons — only for unlocked modules */}
                {!locked && isExpanded && (
                  <div className="ml-3 pl-3 border-l border-[var(--github-border-secondary)] space-y-0.5 mt-0.5 mb-1">
                    {mod.lessons.map((lesson) => {
                      const done = isLessonCompleted(mod.id, lesson.id);
                      return (
                        <SidebarLessonButton
                          key={lesson.id}
                          type="button"
                          onClick={() => handleLessonClick(mod.id, lesson.id)}
                        >
                          {done ? (
                            <CheckCircle2 size={12} className="size-[12px] text-emerald-400 shrink-0" />
                          ) : (
                            <Circle size={12} className="size-[12px] text-[#30363d] shrink-0 group-hover:text-[var(--github-text-secondary)]" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </SidebarLessonButton>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--github-border-primary)] px-3 py-4 space-y-3">
          {/* Environment switcher */}
          <div className="px-1">
            <p className="text-xs text-[var(--github-text-secondary)] uppercase tracking-widest font-mono mb-1.5 px-1">
              Environnement
            </p>
            <div className="flex gap-1">
              {(['linux', 'macos', 'windows'] as SelectedEnvironment[]).map((envId) => {
                const meta = ENV_META[envId];
                const active = selectedEnv === envId;
                return (
                  <EnvPill
                    key={envId}
                    type="button"
                    active={active}
                    activeClassName={`${meta.bgColor} ${meta.color} border ${meta.borderColor}`}
                    onClick={() => setEnvironment(envId)}
                    title={`${meta.label} — ${meta.shell}`}
                  >
                    {envId === 'linux' ? (
                      <Terminal size={10} className="size-[10px]" aria-hidden="true" />
                    ) : envId === 'macos' ? (
                      <span className="text-xs leading-none select-none" aria-hidden="true"></span>
                    ) : (
                      <span className="text-xs leading-none select-none" aria-hidden="true">⊞</span>
                    )}
                    {meta.label}
                  </EnvPill>
                );
              })}
            </div>
            <p className="text-xs text-[var(--github-text-secondary)] font-mono mt-1.5 px-1 truncate">
              {ENV_META[selectedEnv].promptPreview}
            </p>
          </div>

          {/* Profile card avec actions intégrées */}
          <UserMenu
            syncStatus={syncStatus}
            extraActions={
              <Button
                asChild
                variant="tl-sidebar-icon"
                size="icon-lg"
                className="hover:bg-[#21262d] rounded-md"
              >
                <NavLink
                  to="/"
                  onClick={onClose}
                  aria-label="Retour à l'accueil"
                  title="Retour à l'accueil"
                >
                  <Home size={13} className="size-[13px]" aria-hidden="true" />
                </NavLink>
              </Button>
            }
          />
        </div>
      </aside>

      {supportOpen && user && (
        <SupportTicketModal userId={user.id} onClose={() => setSupportOpen(false)} />
      )}
    </>
  );
}

export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="tl-menu-fab"
      size="icon-lg"
      onClick={onClick}
      className="lg:hidden shrink-0 rounded-lg"
      aria-label="Ouvrir le menu de navigation"
    >
      <Menu size={18} className="size-[18px]" aria-hidden="true" />
    </Button>
  );
}
