/**
 * UserAvatar — THI-42 PR #1 shell.
 *
 * Extracted from UserMenu.tsx so Profile Hub (`/app/profile`) can reuse the
 * same OAuth avatar rendering (GitHub `avatar_url` / Google `picture`) with
 * the same initials fallback. PR #2 will extend with upload to Supabase
 * Storage (custom avatar) — for PR #1 we keep it read-only.
 */
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
  if (avatarUrl) {
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
