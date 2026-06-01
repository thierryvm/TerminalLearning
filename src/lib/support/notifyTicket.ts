/**
 * notifyTicketCreated — best-effort super_admin email nudge after a support
 * ticket is created (Sprint 2.C Étape 3, THI-319).
 *
 * Fire-and-forget: the ticket already lives in the DB and the super_admin
 * dashboard (Étape 4) is the source of truth, so a failed/blocked notification
 * must never surface to the user nor throw. This helper swallows every error
 * by design. The server endpoint (`api/support/notify.ts`) re-authorizes the
 * caller against RLS, so forwarding the access token is the only requirement.
 */
import { supabase } from '@/lib/supabase';

export async function notifyTicketCreated(ticketId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/support/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ticketId }),
    });
  } catch {
    // Best-effort — intentionally silent. The ticket is already persisted.
  }
}
