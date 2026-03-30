import { useState, useCallback } from 'react';
import { curriculum, getTotalLessons } from '../data/curriculum';

interface ProgressState {
  completedLessons: Record<string, boolean>;
}

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

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(loadProgress);

  const completeLesson = useCallback((moduleId: string, lessonId: string) => {
    const key = `${moduleId}/${lessonId}`;
    setProgress((prev) => {
      const next = { ...prev, completedLessons: { ...prev.completedLessons, [key]: true } };
      saveProgress(next);
      return next;
    });
  }, []);

  const isLessonCompleted = useCallback(
    (moduleId: string, lessonId: string) => {
      return !!progress.completedLessons[`${moduleId}/${lessonId}`];
    },
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
      const completed = mod.lessons.filter((l) => progress.completedLessons[`${moduleId}/${l.id}`]).length;
      return { completed, total: mod.lessons.length };
    },
    [progress]
  );

  const totalCompleted = Object.values(progress.completedLessons).filter(Boolean).length;
  const totalLessons = getTotalLessons();
  const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  const resetProgress = useCallback(() => {
    const empty: ProgressState = { completedLessons: {} };
    setProgress(empty);
    saveProgress(empty);
  }, []);

  return {
    progress,
    completeLesson,
    isLessonCompleted,
    isModuleCompleted,
    getModuleProgress,
    totalCompleted,
    totalLessons,
    overallProgress,
    resetProgress,
  };
}
