/**
 * useJoinClass — THI-235 Sprint 2.A étape 3 student enrollment via invitation code.
 *
 * Consumes the `join_class_by_code(code text)` RPC (security definer, atomic
 * enrollment, migrations 016-021). Maps PostgreSQL error codes to FR-friendly
 * UX messages (THI-241 will generalize this pattern across all RLS-consuming
 * hooks; for étape 3 we inline the mapping to ship the user-facing surface
 * with clean error states).
 *
 * Returns :
 *   joinClass(code): triggers the RPC, sets `result` on success or `error`
 *     on failure. Idempotent — re-calling with the same code while
 *     already enrolled returns success with `already_enrolled: true`.
 *   result: the joined class info (class_id, class_name, teacher_id,
 *     joined_at, already_enrolled) once the RPC succeeded, otherwise null.
 *   loading: RPC in flight.
 *   error: user-facing FR message (already mapped from error code), null
 *     when no error or after a successful retry.
 *   reset(): clears result + error, lets the user retry from a clean state.
 *
 * Error mapping (FR, actionable, no technical jargon) :
 *   - PGRST301 / 42501 → "Connectez-vous pour rejoindre une classe."
 *   - 22023 → "Entrez le code d'invitation que votre prof vous a partagé."
 *   - 02000 → "Ce code est invalide ou expiré. Vérifiez avec votre enseignant."
 *   - default → "Impossible de rejoindre la classe pour le moment. Réessayez dans un instant."
 *     (raw error.code preserved server-side for debugging via Sentry — never
 *     surfaced to the user, see THI-241 doctrine)
 */
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';

export interface JoinClassResult {
  class_id: string;
  class_name: string;
  teacher_id: string;
  joined_at: string;
  already_enrolled: boolean;
}

export interface UseJoinClassResult {
  result: JoinClassResult | null;
  loading: boolean;
  error: string | null;
  joinClass: (code: string) => Promise<void>;
  reset: () => void;
}

function mapPostgrestError(errorCode: string | undefined, errorMessage: string): string {
  switch (errorCode) {
    case '42501':
    case 'PGRST301':
      return 'Connectez-vous pour rejoindre une classe.';
    case '22023':
      return 'Entrez le code d’invitation que votre prof vous a partagé.';
    case '02000':
      return 'Ce code est invalide ou expiré. Vérifiez avec votre enseignant.';
    default:
      // Some Supabase RLS denials don't carry a code; check the message
      // substring for the unauth-raise pattern.
      if (errorMessage.includes('must be authenticated')) {
        return 'Connectez-vous pour rejoindre une classe.';
      }
      if (errorMessage.includes('invitation code is required')) {
        return 'Entrez le code d’invitation que votre prof vous a partagé.';
      }
      if (errorMessage.includes('invalid invitation code')) {
        return 'Ce code est invalide ou expiré. Vérifiez avec votre enseignant.';
      }
      return 'Impossible de rejoindre la classe pour le moment. Réessayez dans un instant.';
  }
}

export function useJoinClass(): UseJoinClassResult {
  const [result, setResult] = useState<JoinClassResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const joinClass = useCallback(async (rawCode: string) => {
    if (!supabase) {
      setError('Service indisponible pour le moment. Réessayez dans un instant.');
      return;
    }

    const code = rawCode.trim();
    if (!code) {
      setError('Entrez le code d’invitation que votre prof vous a partagé.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('join_class_by_code', { code });
      if (rpcError) {
        setError(mapPostgrestError(rpcError.code, rpcError.message));
        setResult(null);
        return;
      }
      // The RPC `RETURNS TABLE` shape comes back as an array. Single row expected.
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) {
        setError('Impossible de rejoindre la classe pour le moment. Réessayez dans un instant.');
        return;
      }
      setResult(row as JoinClassResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(mapPostgrestError(undefined, message));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, joinClass, reset };
}
