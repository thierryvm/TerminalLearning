/**
 * stampAgeConfirmation — THI-340, OAuth half of the age gate.
 *
 * The email-signup path carries the declaration through user metadata, which
 * `handle_new_user()` turns into a timestamp at profile creation (migration
 * 035). `signInWithOAuth` has no equivalent metadata passthrough, so for
 * GitHub / Google the row is stamped here instead, once the callback has a
 * session.
 *
 * The timestamp sent below is **discarded by the server**: the
 * `pin_age_confirmed_at` BEFORE UPDATE trigger overwrites a first stamp with
 * its own `now()` and restores any existing one. A value is still sent because
 * PostgREST needs a non-empty patch body; treat it as "please stamp this row",
 * not as data. That is exactly why the client cannot backdate or clear the
 * field, and why no SECURITY DEFINER RPC was needed.
 *
 * Failure is deliberately silent and non-blocking. A missing stamp means
 * `age_confirmed_at IS NULL`, which the schema already documents as a
 * legitimate state — never a reason to interrupt a login. The next
 * authenticated visit that passed the gate retries.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../app/types/database';

export async function stampAgeConfirmation(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  try {
    await client
      .from('profiles')
      .update({ age_confirmed_at: new Date().toISOString() })
      .eq('id', userId)
      // Skip the write entirely when the row is already stamped. The trigger
      // would no-op anyway; this just avoids a pointless round trip on every
      // subsequent OAuth login.
      .is('age_confirmed_at', null);
  } catch {
    // Offline, RLS denial, network error — see the non-blocking note above.
  }
}
