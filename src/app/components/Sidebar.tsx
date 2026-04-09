import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  Terminal, LayoutDashboard, BookOpen, Compass, FolderOpen,
  FileText, Shield, Cpu, GitMerge, ChevronDown, ChevronRight,
  CheckCircle2, Circle, X, Menu, Home, Lock,
} from 'lucide-react';
import { UserMenu } from './auth/UserMenu';
import { curriculum } from '../data/curriculum';
import { useProgress } from '../context/ProgressContext';
import { useEnvironment, ENV_META, type SelectedEnvironment } from '../context/EnvironmentContext';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Compass, FolderOpen, FileText, Shield, Cpu, GitMerge,
};

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
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[#0d1117] border-r border-[#30363d] flex flex-col transition-transform duration-300 ${
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
          <button
            onClick={onClose}
            className="lg:hidden text-[#8b949e] hover:text-[#e6edf3] transition-colors p-1"
            aria-label="Fermer le menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
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
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
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
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
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
                <button
                  onClick={() => !locked && toggleModule(mod.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group ${
                    locked
                      ? 'cursor-not-allowed text-[#8b949e]'
                      : 'hover:bg-[#161b22] text-[#c9d1d9]'
                  }`}
                  title={locked ? `Prérequis : ${unlockStatus?.missingPrerequisiteLabels.join(', ')}` : undefined}
                >
                  {locked ? (
                    <Lock size={15} className="text-[#8b949e] shrink-0" />
                  ) : (
                    <span style={{ color: mod.color }}><Icon size={15} /></span>
                  )}
                  <span className="flex-1 text-left truncate">{mod.title}</span>
                  {locked ? (
                    <span className="text-[10px] text-[#8b949e] font-mono shrink-0">Niv. {unlockStatus?.level}</span>
                  ) : (
                    <>
                      <span className="text-xs text-[#8b949e] font-mono shrink-0">{completed}/{total}</span>
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-[#8b949e] shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-[#8b949e] shrink-0" />
                      )}
                    </>
                  )}
                </button>

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
                        <button
                          key={lesson.id}
                          onClick={() => handleLessonClick(mod.id, lesson.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-[#161b22] text-[#8b949e] hover:text-[#e6edf3] group text-left"
                        >
                          {done ? (
                            <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                          ) : (
                            <Circle size={12} className="text-[#30363d] shrink-0 group-hover:text-[#8b949e]" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </button>
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
                  <button
                    key={envId}
                    onClick={() => setEnvironment(envId)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-mono transition-all ${
                      active
                        ? `${meta.bgColor} ${meta.color} border ${meta.borderColor}`
                        : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22] border border-transparent'
                    }`}
                    title={`${meta.label} — ${meta.shell}`}
                    aria-pressed={active}
                  >
                    {envId === 'linux' ? (
                      <Terminal size={10} aria-hidden="true" />
                    ) : envId === 'macos' ? (
                      <span className="text-[10px] leading-none select-none" aria-hidden="true"></span>
                    ) : (
                      <span className="text-[9px] leading-none select-none" aria-hidden="true">⊞</span>
                    )}
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-[#8b949e] font-mono mt-1.5 px-1 truncate">
              {ENV_META[selectedEnv].promptPreview}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-[#21262d]" />

          <UserMenu syncStatus={syncStatus} placement="top" />
          <NavLink
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22] transition-colors font-mono border border-transparent hover:border-[#30363d]"
          >
            <Home size={14} aria-hidden="true" />
            Accueil
          </NavLink>
        </div>
      </aside>
    </>
  );
}

export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
      aria-label="Ouvrir le menu de navigation"
    >
      <Menu size={18} aria-hidden="true" />
    </button>
  );
}
