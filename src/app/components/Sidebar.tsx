import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  Terminal, LayoutDashboard, BookOpen, Compass, FolderOpen,
  FileText, Shield, Cpu, GitMerge, ChevronDown, ChevronRight,
  CheckCircle2, Circle, X, Menu,
} from 'lucide-react';
import { curriculum } from '../data/curriculum';
import { useProgress } from '../context/ProgressContext';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Compass, FolderOpen, FileText, Shield, Cpu, GitMerge,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { isLessonCompleted, getModuleProgress, overallProgress } = useProgress();
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
          >
            <X size={18} />
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

            return (
              <div key={mod.id}>
                {/* Module header */}
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[#161b22] text-[#c9d1d9] group"
                >
                  <span style={{ color: mod.color }}><Icon size={15} /></span>
                  <span className="flex-1 text-left truncate">{mod.title}</span>
                  <span className="text-xs text-[#8b949e] font-mono shrink-0">{completed}/{total}</span>
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-[#8b949e] shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-[#8b949e] shrink-0" />
                  )}
                </button>

                {/* Lessons */}
                {isExpanded && (
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
        <div className="shrink-0 border-t border-[#30363d] px-4 py-3">
          <p className="text-[10px] text-[#8b949e] text-center font-mono">
            Terminal Master · v2.0
          </p>
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
    >
      <Menu size={18} />
    </button>
  );
}
