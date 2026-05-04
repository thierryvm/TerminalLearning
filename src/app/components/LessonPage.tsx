import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Terminal,
  Lightbulb, AlertTriangle, Info, Code2, RotateCcw, BookOpen, Lock,
} from 'lucide-react';
import {
  getModuleById, getLessonById, getNextLesson, getPrevLesson, ContentBlock,
  Module, Lesson, EnvId,
} from '../data/curriculum';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';
import { useEnvironment } from '../context/EnvironmentContext';
import { useLessonSEO } from '../hooks/useLessonSEO';
import { toUnixUsername } from '../../lib/username';
import { TerminalState } from '../data/terminalEngine';
import { TerminalEmulator } from './TerminalEmulator';
import { Button } from './ui/button';
import { AiTutorPanel } from './ai/AiTutorPanel';

function BlockRenderer({ block, env = 'linux' }: { block: ContentBlock; env?: EnvId }) {
  // Resolve env-specific content/label, falling back to defaults
  const content = block.contentByEnv?.[env] ?? block.content;
  const label = block.labelByEnv?.[env] ?? block.label;

  const renderText = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) =>
      part.startsWith('`') && part.endsWith('`') ? (
        <code key={i} className="px-1.5 py-0.5 bg-[#21262d] text-emerald-400 rounded text-sm font-mono border border-[var(--github-border-primary)]">
          {part.slice(1, -1)}
        </code>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  switch (block.type) {
    case 'text':
      return (
        <p className="text-[var(--github-text-primary)] leading-relaxed text-sm">{renderText(content)}</p>
      );

    case 'code':
      return (
        <div className="rounded-lg overflow-hidden border border-[var(--github-border-primary)]">
          {label && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--github-border-secondary)] border-b border-[var(--github-border-primary)]">
              <Code2 size={12} className="text-[var(--github-text-secondary)]" />
              <span className="text-[var(--github-text-secondary)] text-xs">{label}</span>
            </div>
          )}
          <pre className="bg-[var(--github-bg)] p-4 overflow-x-auto text-sm font-mono leading-relaxed max-w-full">
            {content.split('\n').map((line, i) => {
              if (line.startsWith('$') || line.startsWith('PS>')) {
                const promptEnd = line.startsWith('PS>') ? 3 : 1;
                return (
                  <div key={i}>
                    <span className="text-emerald-400">{line.slice(0, promptEnd)}</span>
                    <span className="text-[var(--github-text-primary)]">{line.slice(promptEnd)}</span>
                  </div>
                );
              }
              if (line.startsWith('#')) {
                return <div key={i} className="text-[var(--github-text-secondary)]">{line}</div>;
              }
              return <div key={i} className="text-[#a5d6ff]">{line}</div>;
            })}
          </pre>
        </div>
      );

    case 'tip':
      return (
        <div className="flex gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <Lightbulb size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[var(--github-text-primary)] text-sm leading-relaxed">{renderText(content)}</p>
        </div>
      );

    case 'warning':
      return (
        <div className="flex gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[var(--github-text-primary)] text-sm leading-relaxed">{renderText(content)}</p>
        </div>
      );

    case 'info':
      return (
        <div className="flex gap-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
          <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[var(--github-text-primary)] text-sm leading-relaxed">{renderText(content)}</p>
        </div>
      );

    default:
      return null;
  }
}

// Separated so the parent can remount it with a key when the lesson changes,
// resetting all local state without needing useEffect + setState.
function LessonContent({ mod, lesson, moduleId, lessonId }: {
  mod: Module;
  lesson: Lesson;
  moduleId: string;
  lessonId: string;
}) {
  const navigate = useNavigate();
  const { completeLesson, isLessonCompleted } = useProgress();
  const { user } = useAuth();
  const { selectedEnv } = useEnvironment();

  useLessonSEO(mod, lesson, moduleId, lessonId);
  const terminalUsername = toUnixUsername(user);
  // Derived from context on every render — no local state needed
  const exerciseCompleted = isLessonCompleted(moduleId, lessonId);
  const [exerciseMessage, setExerciseMessage] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalKey, setTerminalKey] = useState(`${moduleId}-${lessonId}`);
  // True only when exercise was completed in this session (not on a previous visit)
  const [justCompleted, setJustCompleted] = useState(false);

  const nextLesson = getNextLesson(moduleId, lessonId);
  const prevLesson = getPrevLesson(moduleId, lessonId);

  const handleCommand = useCallback(
    (command: string, _state: TerminalState) => {
      if (!lesson.exercise || exerciseCompleted) return;
      if (lesson.exercise.validate(command, selectedEnv)) {
        completeLesson(moduleId, lessonId);
        setExerciseMessage(lesson.exercise.successMessage);
        setJustCompleted(true);
      }
    },
    [lesson, exerciseCompleted, completeLesson, moduleId, lessonId, selectedEnv]
  );

  // Auto-navigate to next lesson after completion.
  // wasAlreadyCompleted guards against navigating when arriving on an already-done lesson.
  const wasAlreadyCompleted = useRef(exerciseCompleted);
  useEffect(() => {
    if (!exerciseCompleted || wasAlreadyCompleted.current) return;
    const timer = setTimeout(() => {
      if (nextLesson) {
        navigate(`/app/learn/${nextLesson.moduleId}/${nextLesson.lessonId}`);
      } else {
        navigate('/app');
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [exerciseCompleted, nextLesson, navigate]);

  const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);

  const handleNavigate = (target: { moduleId: string; lessonId: string } | null) => {
    if (!target) return;
    navigate(`/app/learn/${target.moduleId}/${target.lessonId}`);
  };

  const effectiveInstruction =
    lesson.exercise?.instructionByEnv?.[selectedEnv] ?? lesson.exercise?.instruction ?? '';
  const welcomeMessage = lesson.exercise
    ? [`📚 ${lesson.title}`, ``, `Exercice : ${effectiveInstruction}`, ``]
    : [`📚 ${lesson.title}`, ``, `Terminal libre — pratiquez les commandes ci-dessous.`, ``];

  return (
    <div className="h-full flex flex-col bg-[var(--github-bg)] text-[var(--github-text-primary)] overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 border-b border-[var(--github-border-primary)] bg-[var(--github-border-secondary)] px-4 py-3 flex items-center gap-3">
        <Button
          type="button"
          variant="nav-link"
          size="tl-nav-inline"
          onClick={() => navigate('/app')}
          aria-label="Retour au tableau de bord"
          className="-ml-2"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Tableau de bord</span>
        </Button>

        <div className="text-[#30363d]">/</div>
        <span className="text-[var(--github-text-secondary)] text-sm hidden sm:inline">{mod.title}</span>
        <div className="text-[#30363d] hidden sm:block">/</div>
        <span className="text-[var(--github-text-primary)] text-sm truncate flex-1">{lesson.title}</span>

        <span className="text-[var(--github-text-secondary)] text-xs font-mono shrink-0">
          {lessonIndex + 1}/{mod.lessons.length}
        </span>

        {exerciseCompleted && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}

        {/* Mobile toggle */}
        <Button
          type="button"
          variant="ghost-gh"
          size="tl-nav-inline"
          onClick={() => setShowTerminal((v) => !v)}
          aria-pressed={showTerminal}
          aria-label={showTerminal ? 'Afficher le contenu de la leçon' : 'Afficher le terminal interactif'}
          className="lg:hidden px-3"
        >
          <Terminal className="size-3.5" aria-hidden="true" />
          <span className="text-xs">{showTerminal ? 'Contenu' : 'Terminal'}</span>
        </Button>
      </div>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Lesson content */}
        <div className={`${showTerminal ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-[44%] xl:w-[42%] border-r border-[var(--github-border-primary)] overflow-y-auto`}>
          <div className="p-5 lg:p-6 flex-1">
            {/* Lesson header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mod.color }} />
                <span className="text-xs text-[var(--github-text-secondary)]">{mod.title}</span>
              </div>
              <h1 className="text-[var(--github-text-primary)] mb-2">{lesson.title}</h1>
              <p className="text-[var(--github-text-secondary)] text-sm leading-relaxed">{lesson.description}</p>
            </div>

            {/* Content blocks */}
            <div className="space-y-4">
              {lesson.blocks.map((block, i) => (
                <BlockRenderer key={i} block={block} env={selectedEnv} />
              ))}
            </div>

            {/* Exercise */}
            {lesson.exercise && (
              <div className={`mt-6 rounded-xl border p-4 transition-colors ${exerciseCompleted ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {exerciseCompleted ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <Terminal size={16} className="text-[var(--github-text-secondary)]" />
                  )}
                  <span className="text-sm text-[var(--github-text-primary)]">
                    {exerciseCompleted ? 'Exercice complété !' : 'Exercice pratique'}
                  </span>
                </div>

                {exerciseMessage ? (
                  <p className="text-emerald-400 text-sm">{exerciseMessage}</p>
                ) : (
                  <p className="text-[var(--github-text-primary)] text-sm">
                    {lesson.exercise.instructionByEnv?.[selectedEnv] ?? lesson.exercise.instruction}
                  </p>
                )}

                {justCompleted && (
                  <p className="mt-2 text-xs text-emerald-400/70 font-mono animate-pulse">
                    {nextLesson ? '→ Passage à la leçon suivante...' : '→ Retour au tableau de bord...'}
                  </p>
                )}

                {!exerciseCompleted && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="nav-link"
                      size="tl-nav-inline-xs"
                      onClick={() => setShowHint((v) => !v)}
                      aria-expanded={showHint}
                      aria-controls={`lesson-hint-panel-${moduleId}-${lessonId}`}
                      className="-ml-2"
                    >
                      <Lightbulb className="size-3" aria-hidden="true" />
                      {showHint ? "Masquer l'indice" : "Afficher un indice"}
                    </Button>
                    {showHint && (
                      <p
                        id={`lesson-hint-panel-${moduleId}-${lessonId}`}
                        role="region"
                        aria-label="Indice"
                        className="mt-2 text-amber-400 text-xs font-mono bg-amber-500/5 border border-amber-500/20 rounded px-3 py-2"
                      >
                        💡 {lesson.exercise.hintByEnv?.[selectedEnv] ?? lesson.exercise.hint}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="shrink-0 border-t border-[var(--github-border-primary)] px-5 py-4 flex items-center justify-between">
            <Button
              type="button"
              variant="nav-link"
              size="tl-nav-inline"
              onClick={() => handleNavigate(prevLesson)}
              disabled={!prevLesson}
              className="gap-2 -ml-2 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span>Précédent</span>
            </Button>

            {nextLesson ? (
              <Button
                type="button"
                variant="emerald-soft"
                size="tl-nav-cta"
                onClick={() => handleNavigate(nextLesson)}
                aria-label="Passer à la leçon suivante"
              >
                <span>Suivant</span>
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="emerald-soft"
                size="tl-nav-cta"
                onClick={() => navigate('/app')}
                aria-label="Retour au tableau de bord"
              >
                <span>Tableau de bord</span>
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {/* Terminal */}
        <div className={`${showTerminal ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0 min-h-0 p-4`}>
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-emerald-400" />
              <span className="text-sm text-[var(--github-text-secondary)]">Terminal interactif</span>
            </div>
            <Button
              type="button"
              variant="nav-link"
              size="tl-nav-inline-xs"
              onClick={() => {
                setTerminalKey(`${moduleId}-${lessonId}-${Date.now()}`);
                setExerciseMessage('');
              }}
              aria-label="Réinitialiser le terminal"
              className="gap-1.5 -mr-2"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>Réinitialiser</span>
            </Button>
          </div>
          <TerminalEmulator
            key={terminalKey}
            onCommand={handleCommand}
            welcomeMessage={welcomeMessage}
            className="flex-1 min-h-0"
            username={terminalUsername}
            environment={selectedEnv}
          />
        </div>
      </div>
    </div>
  );
}

// Thin wrapper: resolves params, handles not-found and locked modules,
// then mounts LessonContent with a key so all child state resets naturally.
export function LessonPage() {
  const { moduleId = '', lessonId = '' } = useParams();
  const navigate = useNavigate();
  const { isModuleUnlocked } = useProgress();
  const { selectedEnv } = useEnvironment();

  const mod = getModuleById(moduleId);
  const lesson = getLessonById(moduleId, lessonId);

  if (!mod || !lesson) {
    return (
      <div className="min-h-full bg-[var(--github-bg)] flex items-center justify-center text-[var(--github-text-secondary)]">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p>Leçon introuvable</p>
          <Button
            type="button"
            variant="nav-link"
            size="tl-nav-inline"
            onClick={() => navigate('/app')}
            className="mt-4 px-4 text-emerald-400 hover:text-emerald-300"
          >
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  if (!isModuleUnlocked(moduleId)) {
    return (
      <div className="min-h-full bg-[var(--github-bg)] flex items-center justify-center text-[var(--github-text-secondary)]">
        <div className="text-center">
          <Lock size={48} className="mx-auto mb-4 opacity-30" />
          <p>Ce module est verrouillé</p>
          <p className="text-xs mt-2">Complétez les prérequis pour y accéder.</p>
          <Button
            type="button"
            variant="nav-link"
            size="tl-nav-inline"
            onClick={() => navigate('/app')}
            className="mt-4 px-4 text-emerald-400 hover:text-emerald-300"
          >
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <LessonContent
        key={`${moduleId}-${lessonId}`}
        mod={mod}
        lesson={lesson}
        moduleId={moduleId}
        lessonId={lessonId}
      />
      <AiTutorPanel
        lang="fr"
        lessonContext={{
          moduleSlug: moduleId,
          lessonSlug: lessonId,
          env: selectedEnv,
          // Lesson titles are the closest to a "goal" the curriculum exposes
          // today. If a richer `objective` field is added later, swap here.
          goal: lesson.title,
        }}
      />
    </>
  );
}
