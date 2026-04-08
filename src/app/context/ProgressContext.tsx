import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { curriculum, getTotalLessons } from '../data/curriculum';
import { supabase } from '../../lib/supabase';
import { mergeProgress, getDelta } from '../lib/progressSync';
import { isModuleUnlocked as checkModuleUnlocked, getModuleUnlockTree, type ModuleUnlockStatus } from '../lib/unlocking';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface ProgressState {
  completedLessons: Record<string, boolean>;
}

interface ProgressContextValue {
  progress: ProgressState;
  syncStatus: SyncStatus;
  completeLesson: (moduleId: string, lessonId: string) => void;
  isLessonCompleted: (moduleId: string, lessonId: string) => boolean;
  isModuleCompleted: (moduleId: string) => boolean;
  getModuleProgress: (moduleId: string) => { completed: number; total: number };
  /** Set of module IDs where all lessons are completed */
  completedModuleIds: Set<string>;
  /** Check if a module is unlocked (all prerequisites completed) */
  isModuleUnlocked: (moduleId: string) => boolean;
  /** Full unlock tree for rendering lock states in UI */
  unlockTree: ModuleUnlockStatus[];
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
    if (raw) return JSON.parse(raw) as ProgressState;
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
 * - Offline: localStorage only (syncStatus = 'local')
 * - Online: merges with Supabase on auth, upserts on each lesson completion
 * - Merge rule: Math.max — completed is never downgraded
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(loadProgress);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');

  // ── Sync on auth change ────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const client = supabase; // narrow to non-null for TypeScript in async callbacks

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setSyncStatus('local');
        return;
      }

      setSyncStatus('syncing');
      try {
        const { data: remote, error } = await client
          .from('progress')
          .select('*')
          .eq('user_id', session.user.id);

        if (error) throw error;

        const local = loadProgress();
        const merged = mergeProgress(local.completedLessons, remote ?? []);
        const mergedState: ProgressState = { completedLessons: merged };

        // Push local-only lessons to Supabase
        const delta = getDelta(local.completedLessons, remote ?? []);
        if (delta.length > 0) {
          const upserts = delta.map((lesson_id) => ({
            user_id: session.user.id,
            lesson_id,
            completed: true as const,
            completed_at: new Date().toISOString(),
          }));
          await client.from('progress').upsert(upserts, { onConflict: 'user_id,lesson_id' });
        }

        saveProgress(mergedState);
        setProgress(mergedState);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Complete a lesson + upsert to Supabase ─────────────────────────────────
  const completeLesson = useCallback((moduleId: string, lessonId: string) => {
    const key = `${moduleId}/${lessonId}`;
    setProgress((prev) => {
      if (prev.completedLessons[key]) return prev;
      const next: ProgressState = {
        ...prev,
        completedLessons: { ...prev.completedLessons, [key]: true },
      };
      saveProgress(next);

      // Fire-and-forget upsert (no await in setState callback)
      const client = supabase;
      if (client) {
        client.auth.getSession().then(({ data }) => {
          if (!data.session?.user) return;
          client
            .from('progress')
            .upsert(
              { user_id: data.session.user.id, lesson_id: key, completed: true as const, completed_at: new Date().toISOString() },
              { onConflict: 'user_id,lesson_id' }
            )
            .then(({ error }) => {
              if (!error) setSyncStatus('synced');
              else setSyncStatus('error');
            });
        });
      }

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

  // Derive completed module IDs from lesson-level progress
  const completedModuleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const mod of curriculum) {
      if (mod.lessons.every((l) => progress.completedLessons[`${mod.id}/${l.id}`])) {
        ids.add(mod.id);
      }
    }
    return ids;
  }, [progress]);

  const isModUnlocked = useCallback(
    (moduleId: string) => checkModuleUnlocked(moduleId, completedModuleIds),
    [completedModuleIds],
  );

  const unlockTree = useMemo(
    () => getModuleUnlockTree(completedModuleIds),
    [completedModuleIds],
  );

  return (
    <ProgressContext.Provider
      value={{
        progress,
        syncStatus,
        completeLesson,
        isLessonCompleted,
        isModuleCompleted,
        getModuleProgress,
        completedModuleIds,
        isModuleUnlocked: isModUnlocked,
        unlockTree,
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
