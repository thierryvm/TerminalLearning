import type { User } from '@supabase/supabase-js';

const MAX_USERNAME_LENGTH = 16;

/**
 * Derives a safe Unix username from a Supabase user.
 *
 * Priority: GitHub `user_name` → `preferred_username` (other OAuth) → email prefix.
 * Normalization: lowercase, non-alphanumeric chars replaced with hyphens,
 * consecutive/leading/trailing hyphens collapsed, truncated to MAX_USERNAME_LENGTH.
 *
 * Returns undefined if no usable identifier is found (unauthenticated → keeps default 'user').
 */
export function toUnixUsername(user: User | null): string | undefined {
  if (!user) return undefined;

  // Prefer OAuth provider username, fall back to email prefix
  const raw =
    (user.user_metadata?.user_name as string | undefined) ??
    (user.user_metadata?.preferred_username as string | undefined) ??
    user.email?.split('@')[0];

  if (!raw) return undefined;

  const normalized = raw
    .toLowerCase()                      // Unix usernames are lowercase
    .replace(/[^a-z0-9-]/g, '-')       // replace invalid chars with hyphens
    .replace(/-+/g, '-')               // collapse consecutive hyphens
    .replace(/^-|-$/g, '')             // strip leading/trailing hyphens
    .slice(0, MAX_USERNAME_LENGTH);    // enforce max length

  return normalized || undefined;
}
