import { useNavigate } from 'react-router';
import {
  Compass, FolderOpen, FileText, Shield, Cpu, GitMerge,
  CheckCircle2, Circle, ChevronRight, Terminal, Award, BookOpen, Zap,
} from 'lucide-react';
import { curriculum } from '../data/curriculum';
import { useProgress } from '../hooks/useProgress';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Compass, FolderOpen, FileText, Shield, Cpu, GitMerge,
};

const MODULE_GRADIENTS: Record<string, string> = {
  navigation: 'from-emerald-500/20 to-emerald-500/5',
  fichiers: 'from-blue-500/20 to-blue-500/5',
  lecture: 'from-purple-500/20 to-purple-500/5',
  permissions: 'from-amber-500/20 to-amber-500/5',
  processus: 'from-red-500/20 to-red-500/5',
  redirection: 'from-cyan-500/20 to-cyan-500/5',
};

const MODULE_BORDER: Record<string, string> = {
  navigation: 'border-emerald-500/30 hover:border-emerald-500/60',
  fichiers: 'border-blue-500/30 hover:border-blue-500/60',
  lecture: 'border-purple-500/30 hover:border-purple-500/60',
  permissions: 'border-amber-500/30 hover:border-amber-500/60',
  processus: 'border-red-500/30 hover:border-red-500/60',
  redirection: 'border-cyan-500/30 hover:border-cyan-500/60',
};

export function Dashboard() {
  const navigate = useNavigate();
  const { overallProgress, totalCompleted, totalLessons, getModuleProgress, isLessonCompleted } = useProgress();

  const firstIncompleteLesson = () => {
    for (const mod of curriculum) {
      for (const lesson of mod.lessons) {
        if (!isLessonCompleted(mod.id, lesson.id)) {
          return { moduleId: mod.id, lessonId: lesson.id };
        }
      }
    }
    return null;
  };

  const handleContinue = () => {
    const next = firstIncompleteLesson();
    if (next) {
      navigate(`/learn/${next.moduleId}/${next.lessonId}`);
    } else {
      navigate(`/learn/${curriculum[0].id}/${curriculum[0].lessons[0].id}`);
    }
  };

  return (
    <div className="min-h-full bg-[#0d1117] text-[#e6edf3] p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Terminal size={24} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-[#e6edf3]">Tableau de bord</h1>
            <p className="text-[#8b949e] text-sm">Votre parcours d'apprentissage du terminal</p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-400" />
              <span className="text-sm text-[#8b949e]">Progression globale</span>
            </div>
            <span className="text-emerald-400 font-mono text-sm">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#8b949e]">
            <span>{totalCompleted} leçons complétées</span>
            <span>{totalLessons - totalCompleted} restantes</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col items-center">
          <BookOpen size={20} className="text-blue-400 mb-2" />
          <div className="text-xl text-[#e6edf3] font-mono">{totalLessons}</div>
          <div className="text-xs text-[#8b949e] text-center">Leçons au total</div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col items-center">
          <CheckCircle2 size={20} className="text-emerald-400 mb-2" />
          <div className="text-xl text-[#e6edf3] font-mono">{totalCompleted}</div>
          <div className="text-xs text-[#8b949e] text-center">Complétées</div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col items-center">
          <Zap size={20} className="text-amber-400 mb-2" />
          <div className="text-xl text-[#e6edf3] font-mono">{curriculum.length}</div>
          <div className="text-xs text-[#8b949e] text-center">Modules</div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleContinue}
        className="w-full mb-8 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] rounded-xl py-3 px-4 transition-colors"
      >
        <Terminal size={18} />
        <span>{totalCompleted === 0 ? 'Commencer l\'apprentissage' : totalCompleted === totalLessons ? 'Revoir depuis le début' : 'Continuer'}</span>
        <ChevronRight size={16} />
      </button>

      {/* Modules */}
      <div>
        <h2 className="text-[#e6edf3] mb-4">Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {curriculum.map((mod) => {
            const Icon = iconMap[mod.iconName] ?? BookOpen;
            const { completed, total } = getModuleProgress(mod.id);
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const gradient = MODULE_GRADIENTS[mod.id] ?? 'from-gray-500/20 to-gray-500/5';
            const border = MODULE_BORDER[mod.id] ?? 'border-gray-500/30 hover:border-gray-500/60';

            return (
              <div
                key={mod.id}
                className={`relative bg-gradient-to-br ${gradient} border ${border} rounded-xl p-4 cursor-pointer transition-all duration-200 group`}
                onClick={() => navigate(`/learn/${mod.id}/${mod.lessons[0].id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-black/20">
                      <Icon size={18} style={{ color: mod.color }} />
                    </div>
                    <div>
                      <div className="text-[#e6edf3] text-sm">{mod.title}</div>
                      <div className="text-[#8b949e] text-xs">{total} leçons</div>
                    </div>
                  </div>
                  {completed === total && total > 0 ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronRight size={16} className="text-[#8b949e] shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                  )}
                </div>

                <p className="text-[#8b949e] text-xs mb-3 leading-relaxed">{mod.description}</p>

                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: mod.color }}
                    />
                  </div>
                  <span className="text-xs text-[#8b949e] font-mono shrink-0">{completed}/{total}</span>
                </div>

                {/* Lessons dots */}
                <div className="flex gap-1 mt-2.5">
                  {mod.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex-1 h-1 rounded-full"
                      style={{
                        backgroundColor: isLessonCompleted(mod.id, lesson.id) ? mod.color : 'rgba(255,255,255,0.1)',
                      }}
                      title={lesson.title}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent lessons */}
      {totalCompleted > 0 && (
        <div className="mt-8">
          <h2 className="text-[#e6edf3] mb-4">Leçons récentes</h2>
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl divide-y divide-[#21262d]">
            {curriculum
              .flatMap((mod) =>
                mod.lessons
                  .filter((l) => isLessonCompleted(mod.id, l.id))
                  .map((l) => ({ mod, lesson: l }))
              )
              .slice(-5)
              .reverse()
              .map(({ mod, lesson }) => {
                const Icon = iconMap[mod.iconName] ?? BookOpen;
                return (
                  <button
                    key={`${mod.id}/${lesson.id}`}
                    onClick={() => navigate(`/learn/${mod.id}/${lesson.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#21262d] transition-colors text-left"
                  >
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#e6edf3] truncate">{lesson.title}</div>
                      <div className="text-xs text-[#8b949e] flex items-center gap-1">
                        <Icon size={10} style={{ color: mod.color }} />
                        {mod.title}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[#8b949e] shrink-0" />
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
