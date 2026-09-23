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
 * Failure is non-blocking. A missing stamp means `age_confirmed_at IS NULL`,
 * which the schema already documents as a legitimate state — never a reason
 * to interrupt a login.
 *
 * It is NOT silent, though. supabase-js does not throw on a PostgREST error
 * (RLS denial, 4xx, 5xx): it returns `{ error }`. Ignoring that value is how
 * a whole login path went unstamped without anyone noticing (security-auditor
 * M1 / L1, 23 September 2026). Failures are therefore reported to Sentry —
 * with the PostgREST error code only: no user id, no date, no message text.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../app/types/database';

function reportStampFailure(code: string): void {
  // Imported lazily, as ProgressContext does; reporting must never break the
  // login either, hence the swallowed rejection.
  void import('@/lib/sentry')
    .then(({ Sentry }) =>
      Sentry.captureMessage('age_stamp_failed', { level: 'warning', tags: { code } }),
    )
    .catch(() => {});
}

export async function stampAgeConfirmation(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  try {
    const { error, status } = await client
      .from('profiles')
      .update({ age_confirmed_at: new Date().toISOString() })
      .eq('id', userId)
      // Skip the write entirely when the row is already stamped. The trigger
      // would no-op anyway; this just avoids a pointless round trip on every
      // subsequent OAuth login.
      .is('age_confirmed_at', null);
    // postgrest-js does not throw on a network failure either: it resolves
    // `{ error: { code: '' }, status: 0 }`. An empty code must not become an
    // empty Sentry tag, so it is mapped explicitly.
    if (error) reportStampFailure(error.code || (status === 0 ? 'network' : 'unknown'));
  } catch {
    // Only reachable if the client is configured to throw on errors.
    reportStampFailure('network');
  }
}
