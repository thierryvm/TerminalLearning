import { useNavigate } from 'react-router';
import {
  CheckCircle2, ChevronRight, Terminal, Award, BookOpen, Zap, Lock,
} from 'lucide-react';
import { curriculum } from '../data/curriculum';
import { useProgress } from '../context/ProgressContext';
import { iconMap } from '../data/moduleIcons';
import { usePageSEO } from '../hooks/useLessonSEO';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Progress } from './ui/progress';

const MODULE_GRADIENTS: Record<string, string> = {
  navigation: 'from-emerald-500/20 to-emerald-500/5',
  fichiers: 'from-blue-500/20 to-blue-500/5',
  lecture: 'from-purple-500/20 to-purple-500/5',
  permissions: 'from-amber-500/20 to-amber-500/5',
  processus: 'from-red-500/20 to-red-500/5',
  redirection: 'from-cyan-500/20 to-cyan-500/5',
  variables: 'from-yellow-500/20 to-yellow-500/5',
  reseau: 'from-cyan-400/20 to-cyan-400/5',
  git: 'from-orange-500/20 to-orange-500/5',
  'github-collaboration': 'from-violet-500/20 to-violet-500/5',
};

const MODULE_BORDER: Record<string, string> = {
  navigation: 'border-emerald-500/30 hover:border-emerald-500/60',
  fichiers: 'border-blue-500/30 hover:border-blue-500/60',
  lecture: 'border-purple-500/30 hover:border-purple-500/60',
  permissions: 'border-amber-500/30 hover:border-amber-500/60',
  processus: 'border-red-500/30 hover:border-red-500/60',
  redirection: 'border-cyan-500/30 hover:border-cyan-500/60',
  variables: 'border-yellow-500/30 hover:border-yellow-500/60',
  reseau: 'border-cyan-400/30 hover:border-cyan-400/60',
  git: 'border-orange-500/30 hover:border-orange-500/60',
  'github-collaboration': 'border-violet-500/30 hover:border-violet-500/60',
};

type ModuleProgressStyle = React.CSSProperties & {
  '--tl-progress-color'?: string;
};

export function Dashboard() {
  const navigate = useNavigate();
  const { overallProgress, totalCompleted, totalLessons, getModuleProgress, isLessonCompleted, isModuleUnlocked, unlockTree } = useProgress();

  usePageSEO({
    title: 'Tableau de bord — Terminal Learning',
    description: 'Suivez votre progression dans l\'apprentissage du terminal. 11 modules progressifs, exercices interactifs, Linux / macOS / Windows.',
    path: '/app',
  });

  const firstIncompleteLesson = () => {
    for (const mod of curriculum) {
      if (!isModuleUnlocked(mod.id)) continue;
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
      navigate(`/app/learn/${next.moduleId}/${next.lessonId}`);
    } else {
      navigate(`/app/learn/${curriculum[0].id}/${curriculum[0].lessons[0].id}`);
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
        <Card variant="tl-surface" className="p-5">
          <CardHeader className="p-0 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                <span className="text-sm text-[#8b949e]">Progression globale</span>
              </div>
              <span className="text-emerald-400 font-mono text-sm">{overallProgress}%</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Progress
              variant="tl"
              value={overallProgress}
              aria-label={`Progression globale : ${overallProgress}%`}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-[#8b949e]">
              <span>{totalCompleted} leçons complétées</span>
              <span>{totalLessons - totalCompleted} restantes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card variant="tl-stat">
          <BookOpen size={20} className="text-blue-400 mb-2" />
          <div className="text-xl text-[#e6edf3] font-mono">{totalLessons}</div>
          <div className="text-xs text-[#8b949e] text-center">Leçons au total</div>
        </Card>
        <Card variant="tl-stat">
          <CheckCircle2 size={20} className="text-emerald-400 mb-2" />
          <div className="text-xl text-[#e6edf3] font-mono">{totalCompleted}</div>
          <div className="text-xs text-[#8b949e] text-center">Complétées</div>
        </Card>
        <Card variant="tl-stat">
          <Zap size={20} className="text-amber-400 mb-2" />
          <div className="text-xl text-[#e6edf3] font-mono">{curriculum.length}</div>
          <div className="text-xs text-[#8b949e] text-center">Modules</div>
        </Card>
      </div>

      {/* CTA */}
      <Button
        variant="emerald"
        size="cta-pill"
        onClick={handleContinue}
        className="w-full mb-8 min-h-11"
      >
        <Terminal size={18} aria-hidden="true" />
        <span>{totalCompleted === 0 ? 'Commencer l\'apprentissage' : totalCompleted === totalLessons ? 'Revoir depuis le début' : 'Continuer'}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Button>

      {/* Modules */}
      <div>
        <h2 className="text-[#e6edf3] mb-4">Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {curriculum.map((mod) => {
            const Icon = iconMap[mod.iconName] ?? BookOpen;
            const { completed, total } = getModuleProgress(mod.id);
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const unlockStatus = unlockTree.find((u) => u.moduleId === mod.id);
            const locked = unlockStatus ? !unlockStatus.unlocked : false;
            const gradient = locked
              ? 'from-gray-500/10 to-gray-500/5'
              : (MODULE_GRADIENTS[mod.id] ?? 'from-gray-500/20 to-gray-500/5');
            const border = locked
              ? 'border-[#30363d]'
              : (MODULE_BORDER[mod.id] ?? 'border-gray-500/30 hover:border-gray-500/60');

            const ariaLabel = locked
              ? `${mod.title} — verrouillé, Niv. ${unlockStatus?.level}`
              : `${mod.title} — ${completed}/${total} leçons`;

            return (
              <Card
                key={mod.id}
                variant="tl-module"
                role={locked ? undefined : 'button'}
                tabIndex={locked ? undefined : 0}
                aria-label={ariaLabel}
                aria-disabled={locked ? true : undefined}
                className={`relative min-h-11 border group ${gradient} ${border} ${
                  locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={() => !locked && navigate(`/app/learn/${mod.id}/${mod.lessons[0].id}`)}
                onKeyDown={locked ? undefined : (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/app/learn/${mod.id}/${mod.lessons[0].id}`);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-black/20">
                      {locked ? (
                        <Lock size={18} className="text-[#8b949e]" />
                      ) : (
                        <span style={{ color: mod.color }}><Icon size={18} /></span>
                      )}
                    </div>
                    <div>
                      <div className={`text-sm ${locked ? 'text-[#8b949e]' : 'text-[#e6edf3]'}`}>{mod.title}</div>
                      <div className="text-[#8b949e] text-xs">
                        {locked ? `Niveau ${unlockStatus?.level}` : `${total} leçons`}
                      </div>
                    </div>
                  </div>
                  {locked ? (
                    <Lock size={16} className="text-[#8b949e] shrink-0 mt-1" />
                  ) : completed === total && total > 0 ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronRight size={16} className="text-[#8b949e] shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                  )}
                </div>

                {locked ? (
                  <p className="text-[#8b949e] text-xs mb-3 leading-relaxed">
                    Complétez {unlockStatus?.missingPrerequisiteLabels.join(' & ')} pour débloquer
                  </p>
                ) : (
                  <p className="text-[#8b949e] text-xs mb-3 leading-relaxed">{mod.description}</p>
                )}

                {/* Progress — only for unlocked modules */}
                {!locked && (
                  <>
                    <div className="flex items-center gap-2">
                      <Progress
                        variant="tl-thin"
                        value={pct}
                        className="flex-1"
                        style={{ '--tl-progress-color': mod.color } as ModuleProgressStyle}
                        aria-label={`${mod.title} : ${completed} sur ${total} leçons`}
                      />
                      <span className="text-xs text-[#8b949e] font-mono shrink-0">{completed}/{total}</span>
                    </div>

                    {/* Lessons dots — micro decoration, no shadcn equivalent */}
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
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent lessons */}
      {totalCompleted > 0 && (
        <div className="mt-8">
          <h2 className="text-[#e6edf3] mb-4">Leçons récentes</h2>
          <Card variant="tl-surface" className="divide-y divide-[#21262d] overflow-hidden">
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
                  <Button
                    key={`${mod.id}/${lesson.id}`}
                    type="button"
                    variant="tl-ghost"
                    size="tl-list-row"
                    onClick={() => navigate(`/app/learn/${mod.id}/${lesson.id}`)}
                  >
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#e6edf3] truncate">{lesson.title}</div>
                      <div className="text-xs text-[#8b949e] flex items-center gap-1">
                        <span style={{ color: mod.color }}><Icon size={10} /></span>
                        {mod.title}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[#8b949e] shrink-0" />
                  </Button>
                );
              })}
          </Card>
        </div>
      )}
    </div>
  );
}
