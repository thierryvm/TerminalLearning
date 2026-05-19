/**
 * useTeacherClasses — THI-235 Sprint 2.A étape 2 Teacher Dashboard.
 *
 * Fetches the classes owned by the authenticated teacher (or super_admin
 * impersonating). Wraps Supabase REST queries with React state + retry
 * semantics aligned with the rest of the app (no React Query dep).
 *
 * RLS source of truth (migration 005 + 010-012) :
 *   - SELECT classes WHERE teacher_id = auth.uid() → allowed for teacher
 *   - SELECT classes WHERE … → super_admin gets all (RLS bypass via role)
 *   - INSERT classes WHERE teacher_id = auth.uid() → trigger generates
 *     `invitation_code` 12-char hex (migration 016 + fixes 017/018/019)
 *
 * Returns :
 *   classes: array of class rows with enrollment_count (LEFT JOIN aggregate)
 *   loading: initial fetch in flight
 *   creating: createClass in flight
 *   error: last failed operation (Error or null)
 *   createClass(name): inserts a class and re-fetches the list
 *   refresh(): manual re-fetch (called after Sprint 2.A étape 3 enrollments
 *              land on the join page, so the count updates without nav)
 *
 * Out of scope (étape 2) :
 *   - Edit class name (THI-235 v1.1 if asked)
 *   - Delete class (THI-235 v1.1, requires DELETE RLS policy check + cascade)
 *   - Listing enrolled students (THI-235 v1.1, dedicated page)
 */
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';

export interface TeacherClass {
  id: string;
  name: string;
  teacher_id: string;
  institution_id: string | null;
  invitation_code: string;
  created_at: string;
  /** Number of students currently enrolled (computed via aggregate). 0 if none. */
  enrollment_count: number;
}

export interface UseTeacherClassesResult {
  classes: TeacherClass[];
  loading: boolean;
  creating: boolean;
  error: Error | null;
  createClass: (name: string) => Promise<TeacherClass | null>;
  refresh: () => Promise<void>;
}

const MAX_NAME_LENGTH = 80;

async function fetchTeacherClasses(userId: string): Promise<TeacherClass[]> {
  if (!supabase) return [];

  // PostgREST embedded resource for the enrollment aggregate. Returns a `count`
  // column thanks to the `class_enrollments(count)` syntax. RLS on the
  // child table filters automatically.
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, teacher_id, institution_id, invitation_code, created_at, class_enrollments(count)')
    .eq('teacher_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => {
    const enrollments = row.class_enrollments as Array<{ count: number }> | null;
    return {
      id: row.id,
      name: row.name,
      teacher_id: row.teacher_id,
      institution_id: row.institution_id,
      invitation_code: row.invitation_code,
      created_at: row.created_at,
      enrollment_count: enrollments?.[0]?.count ?? 0,
    };
  });
}

export function useTeacherClasses(): UseTeacherClassesResult {
  const { user, initialized } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      setClasses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchTeacherClasses(user.id);
      setClasses(rows);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch classes'));
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized) return;
    // Initial fetch on mount + user change. The setState inside refresh()
    // happens inside an async callback (await + .then), which is the legit
    // case the eslint rule allows but cannot statically detect — mirrors
    // the same pattern documented in useUserRole.ts.
    /* eslint-disable react-hooks/set-state-in-effect -- async fetch on mount, setState happens after await (external sync) */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialized, refresh]);

  const createClass = useCallback(
    async (rawName: string): Promise<TeacherClass | null> => {
      if (!user || !supabase) {
        setError(new Error('Authentification requise'));
        return null;
      }
      const name = rawName.trim();
      if (!name) {
        setError(new Error('Le nom de la classe est requis'));
        return null;
      }
      if (name.length > MAX_NAME_LENGTH) {
        setError(new Error(`Le nom doit faire au maximum ${MAX_NAME_LENGTH} caractères`));
        return null;
      }

      setCreating(true);
      setError(null);

      try {
        // Look up institution_id from the user's profile so the class
        // inherits the institution scope (Sprint 2.B institution_admin
        // dashboards filter on this). institution_id can be null for
        // independent teachers.
        const { data: profileRow, error: profileError } = await supabase
          .from('profiles')
          .select('institution_id')
          .eq('id', user.id)
          .single();
        if (profileError) throw new Error(profileError.message);

        const { data: inserted, error: insertError } = await supabase
          .from('classes')
          .insert({
            name,
            teacher_id: user.id,
            institution_id: profileRow?.institution_id ?? null,
            // invitation_code is generated by the BEFORE INSERT trigger
            // (migration 016 set_invitation_code_before_insert).
          })
          .select('id, name, teacher_id, institution_id, invitation_code, created_at')
          .single();
        if (insertError) throw new Error(insertError.message);
        if (!inserted) throw new Error('La création de la classe a échoué silencieusement');

        const created: TeacherClass = {
          id: inserted.id,
          name: inserted.name,
          teacher_id: inserted.teacher_id,
          institution_id: inserted.institution_id,
          invitation_code: inserted.invitation_code,
          created_at: inserted.created_at,
          enrollment_count: 0,
        };
        setClasses((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Création de la classe impossible';
        setError(new Error(message));
        return null;
      } finally {
        setCreating(false);
      }
    },
    [user],
  );

  return { classes, loading, creating, error, createClass, refresh };
}
