import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  Terminal, LayoutDashboard, BookOpen,
  ChevronDown, ChevronRight, CheckCircle2, Circle, X, Menu, Home, Lock,
} from 'lucide-react';
import { UserMenu } from './auth/UserMenu';
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

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { isLessonCompleted, getModuleProgress, overallProgress, syncStatus, unlockTree } = useProgress();
  const { selectedEnv, setEnvironment } = useEnvironment();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    curriculum.forEach((m) => { init[m.id] = true; });
    return init;
  });

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLessonClick = (moduleId: string, lessonId: string) => {
    navigate(`/app/learn/${moduleId}/${lessonId}`);
    onClose();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[#0d1117] border-r border-[#30363d] flex flex-col transition-transform duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-[#30363d]">
          <NavLink to="/app" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Terminal size={18} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-sm text-[#e6edf3] font-mono">Terminal</div>
              <div className="text-xs text-emerald-400 font-mono">Master</div>
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
        <div className="shrink-0 px-4 py-3 border-b border-[#30363d]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#8b949e]">Progression</span>
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
        <nav className="shrink-0 p-2 border-b border-[#30363d] space-y-0.5">
          <NavLink
            to="/app"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                isActive
                  ? 'bg-[#21262d] text-[#e6edf3]'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]'
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
                  ? 'bg-[#21262d] text-[#e6edf3]'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]'
              }`
            }
          >
            <BookOpen size={16} />
            Référence
          </NavLink>
        </nav>

        {/* Modules */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <p className="text-[10px] text-[#8b949e] uppercase tracking-widest px-3 py-2">Modules</p>
          {curriculum.map((mod) => {
            const Icon = iconMap[mod.iconName] ?? BookOpen;
            const { completed, total } = getModuleProgress(mod.id);
            const isExpanded = expandedModules[mod.id];
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
                    <Lock size={15} className="size-[15px] text-[#8b949e] shrink-0" />
                  ) : (
                    <span style={{ color: mod.color }}><Icon size={15} className="size-[15px]" /></span>
                  )}
                  <span className="flex-1 text-left truncate">{mod.title}</span>
                  {locked ? (
                    <span className="text-[10px] text-[#8b949e] font-mono shrink-0">Niv. {unlockStatus?.level}</span>
                  ) : (
                    <>
                      <span className="text-xs text-[#8b949e] font-mono shrink-0">{completed}/{total}</span>
                      {isExpanded ? (
                        <ChevronDown size={14} className="size-[14px] text-[#8b949e] shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="size-[14px] text-[#8b949e] shrink-0" />
                      )}
                    </>
                  )}
                </SidebarRowButton>

                {/* Locked hint */}
                {locked && (
                  <div className="ml-8 px-2 py-1 text-[10px] text-[#8b949e] leading-tight">
                    Complétez {unlockStatus?.missingPrerequisiteLabels.join(' & ')} pour débloquer
                  </div>
                )}

                {/* Lessons — only for unlocked modules */}
                {!locked && isExpanded && (
                  <div className="ml-3 pl-3 border-l border-[#21262d] space-y-0.5 mt-0.5 mb-1">
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
                            <Circle size={12} className="size-[12px] text-[#30363d] shrink-0 group-hover:text-[#8b949e]" />
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
        <div className="shrink-0 border-t border-[#30363d] px-3 py-4 space-y-3">
          {/* Environment switcher */}
          <div className="px-1">
            <p className="text-[9px] text-[#8b949e] uppercase tracking-widest font-mono mb-1.5 px-1">
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
                      <span className="text-[10px] leading-none select-none" aria-hidden="true"></span>
                    ) : (
                      <span className="text-[9px] leading-none select-none" aria-hidden="true">⊞</span>
                    )}
                    {meta.label}
                  </EnvPill>
                );
              })}
            </div>
            <p className="text-[9px] text-[#8b949e] font-mono mt-1.5 px-1 truncate">
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
