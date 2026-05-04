/**
 * RateLimitBadge — soft client rate counter (30 / 5 min, plan §3.5).
 *
 * Purely informational. The real rate limit is enforced by the provider;
 * this badge nudges the user before they hit it.
 */
interface Props {
  remaining: number;
  total?: number;
}

export function RateLimitBadge({ remaining, total = 30 }: Props) {
  const low = remaining <= 5;
  const empty = remaining === 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        empty
          ? 'bg-red-500/15 text-red-400'
          : low
            ? 'bg-yellow-500/15 text-yellow-400'
            : 'bg-[var(--github-bg-tertiary)] text-[var(--github-text-secondary)]'
      }`}
      title="Compteur de requêtes pour la session"
      aria-label={`Requêtes restantes : ${remaining} sur ${total}`}
    >
      {remaining} / {total}
    </span>
  );
}
