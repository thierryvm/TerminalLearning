import type { Database } from '../types/database';

export type RemoteLesson = Database['public']['Tables']['progress']['Row'];

/** Minimal shape used by merge/delta — only the two columns we actually fetch. */
export type RemoteLessonPartial = Pick<RemoteLesson, 'lesson_id' | 'completed'>;

/**
 * Merge local (localStorage) progress with remote (Supabase) records.
 * Rule: a completed lesson is never downgraded — once true, stays true.
 */
export function mergeProgress(
  local: Record<string, boolean>,
  remote: RemoteLessonPartial[]
): Record<string, boolean> {
  const merged = { ...local };
  for (const row of remote) {
    if (row.completed) {
      merged[row.lesson_id] = true;
    }
  }
  return merged;
}

/**
 * Returns lesson IDs that are completed locally but not yet synced to remote.
 */
export function getDelta(
  local: Record<string, boolean>,
  remote: RemoteLessonPartial[]
): string[] {
  const remoteCompleted = new Set(
    remote.filter((r) => r.completed).map((r) => r.lesson_id)
  );
  return Object.entries(local)
    .filter(([id, done]) => done && !remoteCompleted.has(id))
    .map(([id]) => id);
}
