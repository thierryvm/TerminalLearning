/**
 * UserAvatar — THI-42 PR #1 shell + THI-220 defense-in-depth validation.
 *
 * Extracted from UserMenu.tsx so Profile Hub (`/app/profile`) can reuse the
 * same OAuth avatar rendering (GitHub `avatar_url` / Google `picture`) with
 * the same initials fallback. PR #2 will extend with upload to Supabase
 * Storage (custom avatar) — for PR #1 we keep it read-only.
 *
 * THI-220 adds component-level URL validation as a defense-in-depth layer
 * underneath CSP `img-src` (THI-219). If a malformed or unexpected host
 * sneaks past Supabase Auth metadata (compromised IdP, manual user_metadata
 * tampering, future provider added without CSP update), the component
 * silently falls back to initials instead of attempting a rejected request.
 */

// Mirror the CSP `img-src` allow-list (vercel.json). Keep in sync when adding
// or removing OAuth providers. Long-term consolidation: THI-223 vercel.ts.
const AVATAR_ALLOWED_HOSTS = new Set([
  'avatars.githubusercontent.com',
  'lh1.googleusercontent.com',
  'lh2.googleusercontent.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
]);

/**
 * Validates an OAuth avatar URL :
 *  - must parse as a URL
 *  - must use HTTPS
 *  - hostname must be in the allow-list
 *
 * Returns false on any error rather than throwing, so the component can
 * decide between rendering the img or the initials fallback without try/catch.
 */
export function isValidAvatarUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return AVATAR_ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export interface UserAvatarProps {
  /** OAuth provider avatar URL (GitHub `avatar_url` / Google `picture`). */
  avatarUrl?: string;
  /** Single-character fallback when no avatar URL is available. */
  initials: string;
  /** Visual size — small (sidebar card / nav button) vs medium (dropdown / profile page). */
  size: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<UserAvatarProps['size'], string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-20 h-20 text-2xl',
};

export function UserAvatar({ avatarUrl, initials, size }: UserAvatarProps) {
  const cls = SIZE_CLASSES[size];
  if (avatarUrl && isValidAvatarUrl(avatarUrl)) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        className={`${cls} rounded-full shrink-0`}
      />
    );
  }
  return (
    <span
      className={`${cls} rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono shrink-0 select-none`}
    >
      {initials}
    </span>
  );
}
