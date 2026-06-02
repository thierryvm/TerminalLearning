/**
 * useSupportTickets — THI-320 Sprint 2.C Étape 4 (AdminPanel tickets section).
 *
 * Fetches every support ticket for the super_admin triage dashboard. RLS does
 * the authorization: the `super_admin select all` / `super_admin update all`
 * policies (migration 028) mean the plain PostgREST query is auto-scoped — a
 * non-super_admin gets an empty list, never another user's rows. The UI is also
 * gated by <RequireRole allowed={['super_admin']}> (defense in depth).
 *
 * Status changes go through a normal UPDATE; the `log_support_ticket_status_change`
 * trigger (migration 028) writes the transition to admin_audit_log on its own —
 * the client never touches the audit table.
 *
 * Screenshots: the value stored in `screenshot_url` is a signed URL whose TTL
 * (1h, see submitTicket.ts) has long expired by triage time. `getFreshScreenshotUrl`
 * re-mints a short-lived URL at read time using the super_admin storage select-all
 * policy (migration 030) — the stored value is only used to recover the object path.
 */
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { SUPPORT_BUCKET } from '@/lib/support/submitTicket';
import type { SupportTicketStatus, SupportTicketType } from '@/app/types/database';

export interface SupportTicket {
  id: string;
  user_id: string;
  type: SupportTicketType;
  description: string;
  screenshot_url: string | null;
  status: SupportTicketStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

const TICKET_COLUMNS =
  'id, user_id, type, description, screenshot_url, status, created_at, resolved_at, resolved_by';

// Fresh signed URL TTL when the super_admin opens a screenshot. Short by design:
// the URL is an anonymous bearer, so we keep the exposure window tight.
const SIGNED_URL_TTL_SECONDS = 3600;
const SIGN_PATH_MARKER = `/object/sign/${SUPPORT_BUCKET}/`;

export interface UseSupportTicketsResult {
  tickets: SupportTicket[];
  loading: boolean;
  error: Error | null;
  updatingId: string | null;
  updateStatus: (id: string, next: SupportTicketStatus) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Recover the storage object path (`{userId}/{uuid}.{ext}`) from a stored signed
 * URL. Pure + exported for unit testing. Returns null for any URL that does not
 * carry the expected `/object/sign/<bucket>/` segment (malformed / tampered).
 */
export function parseScreenshotPath(storedUrl: string): string | null {
  const idx = storedUrl.indexOf(SIGN_PATH_MARKER);
  if (idx === -1) return null;
  const after = storedUrl.slice(idx + SIGN_PATH_MARKER.length);
  const [rawPath] = after.split('?');
  if (!rawPath) return null;
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return null;
  }
}

/**
 * Re-mint a fresh signed URL for a stored (expired) screenshot URL. Relies on the
 * super_admin storage select-all policy. Returns null if the URL is unparseable
 * or the sign call fails — callers render a "capture indisponible" fallback.
 */
export async function getFreshScreenshotUrl(storedUrl: string): Promise<string | null> {
  if (!supabase) return null;
  const path = parseScreenshotPath(storedUrl);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function fetchTickets(): Promise<SupportTicket[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('support_tickets')
    .select(TICKET_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportTicket[];
}

export function useSupportTickets(): UseSupportTicketsResult {
  const { user, initialized } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTickets(await fetchTickets());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Chargement des tickets impossible'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized) return;
    /* eslint-disable react-hooks/set-state-in-effect -- async fetch on mount, setState after await (same pattern as usePendingTeachers) */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialized, refresh]);

  const updateStatus = useCallback(
    async (id: string, next: SupportTicketStatus): Promise<boolean> => {
      if (!user || !supabase) {
        setError(new Error('Authentification requise'));
        return false;
      }
      if (updatingId) return false;

      setUpdatingId(id);
      setError(null);

      // resolved_* are only meaningful for the resolved state; clear them on any
      // other transition so a re-opened ticket doesn't keep a stale resolver.
      const isResolved = next === 'resolved';
      const patch = {
        status: next,
        resolved_at: isResolved ? new Date().toISOString() : null,
        resolved_by: isResolved ? user.id : null,
      };

      try {
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update(patch)
          .eq('id', id);
        if (updateError) {
          if (updateError.code === '42501' || updateError.code === 'PGRST301') {
            throw new Error("Action non autorisée pour ce compte.");
          }
          throw new Error('Mise à jour du statut impossible. Réessaye dans un instant.');
        }
        // Optimistic local patch — the status-change audit trigger fires server-side.
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Mise à jour impossible'));
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [user, updatingId],
  );

  return { tickets, loading, error, updatingId, updateStatus, refresh };
}
