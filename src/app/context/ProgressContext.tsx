import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Module } from '../data/curriculum';
import { mergeProgress, getDelta } from '../lib/progressSync';

// Dynamic import — same chunk deferral as AuthContext. Supabase SDK (194 kB)
// loads in parallel with initial render, never blocking FCP.
const supabaseLoader = import('../../lib/supabase');
import type { ModuleUnlockStatus } from '../lib/unlocking';

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

// localStorage stores only lesson IDs (strings) and completion flags (0/1).
// No credentials, scores, or PII — intentionally unencrypted for simplicity
// and offline performance. See /privacy for user-facing disclosure.
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
// Lazily-loaded curriculum bundle — excluded from the main JS chunk to reduce TBT/INP.
// Both curriculum and unlocking are loaded together since unlocking statically imports curriculum.
type CurriculumBundle = {
  curriculum: Module[];
  getTotalLessons: () => number;
  isModuleUnlocked: (id: string, completed: Set<string>) => boolean;
  getModuleUnlockTree: (completed: Set<string>) => ModuleUnlockStatus[];
};

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(loadProgress);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [currBundle, setCurrBundle] = useState<CurriculumBundle | null>(null);
  // Keep a stable ref so callbacks can read the latest bundle without stale closures
  const currBundleRef = useRef<CurriculumBundle | null>(null);

  // Sync ref with state in a layout effect to avoid ESLint warns about refs during render
  useLayoutEffect(() => {
    currBundleRef.current = currBundle;
  }, [currBundle]);

  // ── Lazy-load curriculum + unlocking (excluded from main bundle) ──────────
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('../data/curriculum'),
      import('../lib/unlocking'),
    ]).then(([currMod, unlockMod]) => {
      if (!cancelled) {
        setCurrBundle({
          curriculum: currMod.curriculum,
          getTotalLessons: currMod.getTotalLessons,
          isModuleUnlocked: unlockMod.isModuleUnlocked,
          getModuleUnlockTree: unlockMod.getModuleUnlockTree,
        });
      }
    });
    return () => { cancelled = true; };
  }, []);

  // ── Sync on auth change ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let activeController: AbortController | null = null;
    let activeUserId: string | null = null;
    let unsubscribe: (() => void) | null = null;

    supabaseLoader.then(({ supabase }) => {
      if (!supabase || cancelled) return;
      const client = supabase;

      const syncWithRemote = async (userId: string) => {
        // Supersede any previous in-flight sync (rapid account switches).
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        activeUserId = userId;

        setSyncStatus('syncing');

        // Abort if Supabase doesn't respond within 5 s — prevents a long yellow dot.
        // Free-tier cold starts are typically < 3 s; 5 s gives a safe margin.
        const abortTimer = setTimeout(() => controller.abort(), 5_000);

        // Bail out silently if the sync was cancelled by unmount, sign-out, or
        // a newer sync — those paths already set the correct syncStatus.
        const superseded = () => cancelled || activeUserId !== userId;

        try {
          const { data: remote, error } = await client
            .from('progress')
            .select('lesson_id, completed')
            .eq('user_id', userId)
            .abortSignal(controller.signal);

          if (superseded()) return;
          if (error) throw error;

          const local = loadProgress();
          const merged = mergeProgress(local.completedLessons, remote ?? []);
          const mergedState: ProgressState = { completedLessons: merged };

          const delta = getDelta(local.completedLessons, remote ?? []);
          if (delta.length > 0) {
            const upserts = delta.map((lesson_id) => ({
              user_id: userId,
              lesson_id,
              completed: true as const,
              completed_at: new Date().toISOString(),
            }));
            await client.from('progress').upsert(upserts, { onConflict: 'user_id,lesson_id' });
          }

          if (superseded()) return;
          saveProgress(mergedState);
          setProgress(mergedState);
          setSyncStatus('synced');
        } catch {
          if (superseded()) return;
          setSyncStatus('error');
        } finally {
          clearTimeout(abortTimer);
        }
      };

      // The callback must NOT be async: gotrue-js holds an internal lock while it
      // runs, and any awaited Supabase call inside deadlocks until a 5 s timeout
      // — visible as "Lock not released within 5000ms" in the console and a
      // multi-second delay on first profile sync. Defer async work with
      // setTimeout so it runs outside the lock scope.
      // https://supabase.com/docs/reference/javascript/auth-onauthstatechange
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (!session?.user) {
          // Sign-out or no session: abort any in-flight sync so it can't
          // write stale state after the user has logged out.
          activeController?.abort();
          activeController = null;
          activeUserId = null;
          setSyncStatus('local');
          return;
        }

        // Only sync on initial load or explicit sign-in.
        // TOKEN_REFRESHED, USER_UPDATED, etc. must not re-trigger a full sync —
        // that would cause "sync..." to flash every ~50 min while the user is active.
        if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;

        const userId = session.user.id;
        setTimeout(() => {
          if (!cancelled) void syncWithRemote(userId);
        }, 0);
      });

      unsubscribe = () => subscription.unsubscribe();
      // If cancelled while the promise was resolving, clean up immediately.
      if (cancelled) { unsubscribe(); unsubscribe = null; }
    }).catch(() => {
      // Dynamic import failure (e.g. network error on chunk load) —
      // fall back to local-only mode so the app stays usable offline.
      if (!cancelled) setSyncStatus('local');
    });

    return () => {
      cancelled = true;
      activeController?.abort();
      unsubscribe?.();
    };
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

      // Fire-and-forget upsert — supabaseLoader is already resolved by the time
      // a user completes a lesson (loads within ~200 ms of app mount).
      supabaseLoader.then(({ supabase }) => {
        if (!supabase) return;
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session?.user) return;
          supabase
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
      });

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
      const mod = currBundleRef.current?.curriculum.find((m) => m.id === moduleId);
      if (!mod) return false;
      return mod.lessons.every((l) => progress.completedLessons[`${moduleId}/${l.id}`]);
    },
    [progress]
  );

  const getModuleProgress = useCallback(
    (moduleId: string) => {
      const mod = currBundleRef.current?.curriculum.find((m) => m.id === moduleId);
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
  const totalLessons = currBundle?.getTotalLessons() ?? 0;
  const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  // Derive completed module IDs from lesson-level progress
  const completedModuleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const mod of currBundle?.curriculum ?? []) {
      if (mod.lessons.every((l) => progress.completedLessons[`${mod.id}/${l.id}`])) {
        ids.add(mod.id);
      }
    }
    return ids;
  }, [progress, currBundle]);

  const isModUnlocked = useCallback(
    (moduleId: string) =>
      currBundle?.isModuleUnlocked(moduleId, completedModuleIds) ?? true,
    [completedModuleIds, currBundle],
  );

  const unlockTree = useMemo(
    () => currBundle?.getModuleUnlockTree(completedModuleIds) ?? [],
    [completedModuleIds, currBundle],
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
