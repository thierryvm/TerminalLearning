/**
 * RateLimitBadge — soft client rate counter (30 / 5 min, plan §3.5).
 *
 * The format `{remaining}/{total} restantes` is intentional after a UX
 * misreading on 4 May 2026 where `30/30` was read as "30 used / 30 max"
 * (limit reached) instead of "30 remaining / 30 total" (counter full).
 * Adding the "restantes" suffix dispels the ambiguity in French.
 *
 * The badge itself is a button: clicking it resets the counter to a fresh
 * window — a manual safety net if the user hits an edge case the refund
 * logic misses, without having to clear localStorage by hand.
 */
interface Props {
  remaining: number;
  total?: number;
  onReset?: () => void;
}

export function RateLimitBadge({ remaining, total = 30, onReset }: Props) {
  const low = remaining <= 5;
  const empty = remaining === 0;
  const colour = empty
    ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
    : low
      ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
      : 'bg-[var(--github-bg-tertiary)] text-[var(--github-text-secondary)] hover:bg-[var(--github-bg-secondary)]';

  if (!onReset) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colour}`}
        title={`${remaining} questions restantes pour cette session (compteur côté navigateur uniquement)`}
        aria-label={`Requêtes restantes : ${remaining} sur ${total}`}
      >
        {remaining}/{total} restantes
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onReset}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${colour}`}
      title="Cliquer pour réinitialiser le compteur local (filet de sécurité — utile si tu as enchaîné des tests qui échouent)"
      aria-label={`Requêtes restantes : ${remaining} sur ${total}. Cliquer pour réinitialiser.`}
    >
      <span>
        {remaining}/{total} restantes
      </span>
      <span aria-hidden="true">↻</span>
    </button>
  );
}
