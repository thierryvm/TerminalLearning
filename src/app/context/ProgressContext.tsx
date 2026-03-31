import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { curriculum, getTotalLessons } from '../data/curriculum';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressState {
  completedLessons: Record<string, boolean>;
}

interface ProgressContextValue {
  progress: ProgressState;
  completeLesson: (moduleId: string, lessonId: string) => void;
  isLessonCompleted: (moduleId: string, lessonId: string) => boolean;
  isModuleCompleted: (moduleId: string) => boolean;
  getModuleProgress: (moduleId: string) => { completed: number; total: number };
  totalCompleted: number;
  totalLessons: number;
  overallProgress: number;
  resetProgress: () => void;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'terminal-master-progress';

function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completedLessons: {} };
}

function saveProgress(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProgressContext = createContext<ProgressContextValue | null>(null);

/**
 * @component ProgressProvider
 * @description Single source of truth for lesson progress.
 * Wrap the app root so all components share the same state instance —
 * fixes the sidebar not updating in real-time when a lesson is completed.
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(loadProgress);

  const completeLesson = useCallback((moduleId: string, lessonId: string) => {
    const key = `${moduleId}/${lessonId}`;
    setProgress((prev) => {
      if (prev.completedLessons[key]) return prev; // already done, skip re-render
      const next = { ...prev, completedLessons: { ...prev.completedLessons, [key]: true } };
      saveProgress(next);
      return next;
    });
  }, []);

  const isLessonCompleted = useCallback(
    (moduleId: string, lessonId: string) =>
      !!progress.completedLessons[`${moduleId}/${lessonId}`],
    [progress]
  );

  const isModuleCompleted = useCallback(
    (moduleId: string) => {
      const mod = curriculum.find((m) => m.id === moduleId);
      if (!mod) return false;
      return mod.lessons.every((l) => progress.completedLessons[`${moduleId}/${l.id}`]);
    },
    [progress]
  );

  const getModuleProgress = useCallback(
    (moduleId: string) => {
      const mod = curriculum.find((m) => m.id === moduleId);
      if (!mod) return { completed: 0, total: 0 };
      const completed = mod.lessons.filter(
        (l) => progress.completedLessons[`${moduleId}/${l.id}`]
      ).length;
      return { completed, total: mod.lessons.length };
    },
    [progress]
  );

  const resetProgress = useCallback(() => {
    const empty: ProgressState = { completedLessons: {} };
    setProgress(empty);
    saveProgress(empty);
  }, []);

  const totalCompleted = Object.values(progress.completedLessons).filter(Boolean).length;
  const totalLessons = getTotalLessons();
  const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <ProgressContext.Provider
      value={{
        progress,
        completeLesson,
        isLessonCompleted,
        isModuleCompleted,
        getModuleProgress,
        totalCompleted,
        totalLessons,
        overallProgress,
        resetProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

/**
 * @hook useProgress
 * @description Consumes the shared ProgressContext.
 * All components using this hook share the same state instance —
 * updates in LessonPage are immediately visible in Sidebar and Dashboard.
 */
export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
