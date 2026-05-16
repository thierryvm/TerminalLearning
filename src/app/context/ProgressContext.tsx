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

// THI-186 (security fix) : tracks which "owner" wrote the current localStorage state.
//   • `null` (unset) : fresh browser / never touched
//   • `GUEST_OWNER`  : last writer was an unauthenticated guest session
//   • `<userId>`     : last writer was an authenticated user with that Supabase user id
//
// At auth boundary transitions (login as a different user, logout, or page reload
// after a previously-authenticated session expired) we clear the local cache to
// prevent (a) reading another user's progress as a guest and (b) merging another
// user's progress into the newly-signed-in account's remote table via the
// `mergeProgress + upsert` path.
const STORAGE_OWNER_KEY = 'terminal-master-progress-owner';
export const GUEST_OWNER = '__guest__';

function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedLessons: {} };

    // THI-186 migration : tout `terminal-master-progress` stocké AVANT le fix
    // owner-tracking n'a PAS de `STORAGE_OWNER_KEY` associé. Le résultat peut
    // être contaminé (état du user précédent) — on ne peut pas savoir, et le
    // risque de leak est plus grave que la perte de progression locale.
    //
    // → Si pas d'owner stocké, on force-clear. Pour les users authenticated,
    //   onAuthStateChange INITIAL_SESSION + syncWithRemote restaure depuis
    //   Supabase. Pour les pure guests legacy, perte acceptée (coût migration).
    //
    // Migration ponctuelle au premier `loadProgress()` post-déploiement. Une
    // fois passée, l'owner est setté (via `setStoredOwner`) et le check passe
    // silencieusement à toutes les sessions suivantes.
    const hasOwner = !!localStorage.getItem(STORAGE_OWNER_KEY);
    if (!hasOwner) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      return { completedLessons: {} };
    }

    return JSON.parse(raw) as ProgressState;
  } catch {}
  return { completedLessons: {} };
}

function saveProgress(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function getStoredOwner(): string | null {
  try {
    return localStorage.getItem(STORAGE_OWNER_KEY);
  } catch {
    return null;
  }
}

function setStoredOwner(ownerId: string): void {
  try {
    localStorage.setItem(STORAGE_OWNER_KEY, ownerId);
  } catch {}
}

/**
 * Drops the cached progress AND the owner marker. Called when the local cache
 * could leak between accounts (sign-out, account switch, stale-session guest).
 *
 * Note: doesn't touch the remote `progress` table — Supabase RLS already
 * isolates per-user rows. This is purely about the client-side cache.
 */
function clearProgressLocalCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_OWNER_KEY);
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
  // Initial state: we cannot yet tell here whether a Supabase session is active
  // — `onAuthStateChange` will fire INITIAL_SESSION shortly after mount and
  // either confirm the stored owner (keep cache) or detect a stale-session
  // mismatch and clear (THI-186). We optimistically read the cache so the
  // landing render isn't delayed by a network round-trip; if the owner check
  // later rejects it we just re-set to empty (single re-render, no flash).
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

          // THI-186 security fix : if the cache was owned by an authenticated
          // user, clear it. Otherwise we'd render the previous user's progress
          // in guest mode AND, on the next sign-in by a different account,
          // upsert it into that account's remote table (cross-account data
          // contamination via mergeProgress + getDelta).
          //
          // Pure guest sessions (owner = GUEST_OWNER or null) are preserved so
          // a disconnected user keeps their local progress until they sign in.
          //
          // Triggers on:
          //   - SIGNED_OUT          : user explicitly signed out
          //   - INITIAL_SESSION (no user) where stored owner was an authenticated id
          //     → previously-authenticated session expired or cookies cleared.
          const storedOwner = getStoredOwner();
          if (storedOwner && storedOwner !== GUEST_OWNER) {
            clearProgressLocalCache();
            setProgress({ completedLessons: {} });
            setStoredOwner(GUEST_OWNER);
          }
          return;
        }

        // Only sync on initial load or explicit sign-in.
        // TOKEN_REFRESHED, USER_UPDATED, etc. must not re-trigger a full sync —
        // that would cause "sync..." to flash every ~50 min while the user is active.
        if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;

        const userId = session.user.id;

        // THI-186 security fix : if the cached owner is a *different* authenticated
        // user, we must clear before sync. Otherwise:
        //   - mergeProgress(user A's local, user B's remote) keeps A's lessons
        //     in the merged state shown to B (read leak)
        //   - getDelta returns A's lessons not in B's remote
        //   - upsert writes A's lessons into B's progress table (write leak)
        //
        // A previously-stored GUEST_OWNER state is intentionally kept and merged
        // into the signing-in user — this preserves the legitimate "complete a
        // few lessons as guest, then sign up" UX.
        const storedOwnerNow = getStoredOwner();
        if (
          storedOwnerNow &&
          storedOwnerNow !== GUEST_OWNER &&
          storedOwnerNow !== userId
        ) {
          clearProgressLocalCache();
          setProgress({ completedLessons: {} });
        }
        setStoredOwner(userId);

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

      // THI-186 security fix : ensure the owner marker is set so the next
      // session boundary check (sign-in / sign-out) can tell whether this
      // cache belongs to a guest or to a specific authenticated user.
      // If no owner is set yet, this means we are in a guest session.
      if (!getStoredOwner()) setStoredOwner(GUEST_OWNER);

      // Fire-and-forget upsert — supabaseLoader is already resolved by the time
      // a user completes a lesson (loads within ~200 ms of app mount).
      supabaseLoader.then(({ supabase }) => {
        if (!supabase) return;
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session?.user) return;
          const userId = data.session.user.id;
          // Promote the owner marker now that we know who is authenticated —
          // any future sign-out / account switch will correctly clear.
          setStoredOwner(userId);
          supabase
            .from('progress')
            .upsert(
              { user_id: userId, lesson_id: key, completed: true as const, completed_at: new Date().toISOString() },
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
    // THI-186 : an explicit reset wipes the owner too — the next interaction
    // (guest action or sign-in) will re-stamp the owner correctly. This avoids
    // a stale owner pointing at a now-empty cache.
    try {
      localStorage.removeItem(STORAGE_OWNER_KEY);
    } catch {}
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
