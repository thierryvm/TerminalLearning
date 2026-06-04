/**
 * SupportTicketsSection — THI-320 Sprint 2.C Étape 4.
 *
 * super_admin triage surface embedded in AdminPanel (/app/admin). Lists every
 * support ticket (RLS auto-scopes to super_admin select-all), filters by status,
 * and lets the admin move a ticket through its lifecycle via a status <select>.
 *
 * Security (Étape 4 brief / supabase-backend-auditor 01/06) :
 *   - Screenshot is rendered with a plain <img> only (secure static mode — a
 *     mislabelled SVG never executes), never .text()/<object>/<embed>/<iframe>.
 *   - The stored screenshot_url is an expired signed URL; we re-mint a fresh one
 *     on demand (getFreshScreenshotUrl) — never trust/display the stored value.
 *   - Description is a JSX text node (React-escaped) — no dangerouslySetInnerHTML.
 *   - Display size is capped (max-h-80) pending server-side dimension limits (M2,
 *     THI-297) so a huge image can't blow up the layout.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ImageIcon, Inbox, Loader2, Trash2 } from 'lucide-react';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  getFreshScreenshotUrl,
  useSupportTickets,
  type SupportTicket,
} from '@/lib/hooks/useSupportTickets';
import type { SupportTicketStatus } from '@/app/types/database';
import {
  TICKET_STATUS_ORDER as STATUS_ORDER,
  TICKET_STATUS_LABELS as STATUS_LABELS,
  TICKET_STATUS_BADGE as STATUS_BADGE,
  TICKET_TYPE_LABELS as TYPE_LABELS,
  formatTicketDate as formatDate,
} from '@/lib/support/ticketDisplay';

type StatusFilter = 'all' | SupportTicketStatus;

export function SupportTicketsSection() {
  const { tickets, loading, error, updatingId, deletingId, updateStatus, deleteTicket } =
    useSupportTickets();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const counts = useMemo(() => {
    const acc: Record<StatusFilter, number> = {
      all: tickets.length,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };
    for (const t of tickets) acc[t.status] += 1;
    return acc;
  }, [tickets]);

  const visible = useMemo(
    () => (filter === 'all' ? tickets : tickets.filter((t) => t.status === filter)),
    [tickets, filter],
  );

  return (
    <section aria-labelledby="support-tickets-heading" className="mt-10">
      <header className="mb-4">
        <h2
          id="support-tickets-heading"
          className="text-lg font-medium text-[var(--github-text-primary)]"
        >
          Signalements
          {!loading && (
            <span className="ml-2 text-sm text-[var(--github-text-secondary)] font-mono">
              ({tickets.length})
            </span>
          )}
        </h2>
        <p className="text-sm text-[var(--github-text-secondary)]">
          Bugs, suggestions et questions envoyés par les utilisateurs. Changez le statut
          pour suivre le traitement (chaque transition est journalisée).
        </p>
      </header>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Tous ({counts.all})
        </FilterChip>
        {STATUS_ORDER.map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {STATUS_LABELS[s]} ({counts[s]})
          </FilterChip>
        ))}
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {error && (
          <Card
            variant="tl-surface"
            className="mb-4 px-4 py-3 border-[var(--github-red)]/40 bg-[var(--github-red)]/5"
            role="alert"
          >
            <p className="text-sm text-[var(--github-red)] font-mono">{error.message}</p>
          </Card>
        )}

        {loading ? (
          <p className="text-sm text-[var(--github-text-secondary)] font-mono">Chargement…</p>
        ) : visible.length === 0 ? (
          <Card variant="tl-surface" className="px-5 py-6 text-center gap-2">
            <span className="text-emerald-400 mx-auto" aria-hidden="true">
              <Inbox size={24} />
            </span>
            <p className="text-sm text-[var(--github-text-primary)]">
              {filter === 'all'
                ? 'Aucun signalement pour le moment.'
                : `Aucun signalement « ${STATUS_LABELS[filter as SupportTicketStatus]} ».`}
            </p>
          </Card>
        ) : (
          <ul className="space-y-3" role="list">
            {visible.map((ticket) => (
              <li key={ticket.id}>
                <TicketCard
                  ticket={ticket}
                  updating={updatingId === ticket.id}
                  deleting={deletingId === ticket.id}
                  onStatusChange={(next) => updateStatus(ticket.id, next)}
                  onDelete={() => deleteTicket(ticket.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <Button
      type="button"
      variant={active ? 'emerald-soft' : 'ghost-gh'}
      size="sm"
      className="min-h-11 font-mono text-xs"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

interface TicketCardProps {
  ticket: SupportTicket;
  updating: boolean;
  deleting: boolean;
  onStatusChange: (next: SupportTicketStatus) => void;
  onDelete: () => void;
}

function TicketCard({ ticket, updating, deleting, onStatusChange, onDelete }: TicketCardProps) {
  const selectId = `ticket-status-${ticket.id}`;
  const [confirming, setConfirming] = useState(false);
  return (
    <Card variant="tl-surface" className="px-5 py-4 gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Badge variant="pill-muted">{TYPE_LABELS[ticket.type]}</Badge>
          <Badge variant={STATUS_BADGE[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
          <span className="text-xs text-[var(--github-text-secondary)]/50 font-mono" title={ticket.id}>
            #{ticket.id.slice(0, 8)}
          </span>
        </div>
        <p className="text-xs text-[var(--github-text-secondary)] font-mono shrink-0">
          {formatDate(ticket.created_at)}
        </p>
      </div>

      {/* Description — JSX text node (React-escaped). break-words prevents a long
          unbroken string from overflowing on narrow viewports. */}
      <p className="text-sm text-[var(--github-text-primary)] whitespace-pre-wrap break-words [word-break:break-word]">
        {ticket.description}
      </p>

      {ticket.screenshot_url && <ScreenshotViewer storedUrl={ticket.screenshot_url} />}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <label
          htmlFor={selectId}
          className="text-xs text-[var(--github-text-secondary)] font-mono"
        >
          Statut
        </label>
        {/* Native <select>: keeps style-src CSP strict (Radix popovers inject
            inline styles, blocked by our CSP). [color-scheme:dark] themes the
            native option popup dark across Chrome/Firefox/Safari. text-base (16px)
            prevents Safari iOS auto-zoom on focus (mobile-auditor THI-234). */}
        <select
          id={selectId}
          value={ticket.status}
          disabled={updating}
          onChange={(e) => onStatusChange(e.target.value as SupportTicketStatus)}
          className="min-h-11 rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg)] px-2 py-1 text-base text-[var(--github-text-primary)] font-mono [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:opacity-50"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {updating && (
          <span className="text-emerald-400" aria-hidden="true">
            <Loader2 size={14} className="animate-spin" />
          </span>
        )}
        {/* Date marker only when resolved_at is known — the status badge already
            says "Résolu", so a bare duplicate would look like a bug. */}
        {ticket.status === 'resolved' && !updating && ticket.resolved_at && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono">
            <CheckCircle2 size={12} aria-hidden="true" />
            {`Résolu le ${formatDate(ticket.resolved_at)}`}
          </span>
        )}

        {/* Delete — two-step inline confirm (no native confirm dialog). super_admin
            purge: spam / obsolete / leftover test rows (THI-347 volet 3, THI-334). */}
        <div className="ml-auto flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs text-[var(--github-text-secondary)] font-mono">Supprimer ?</span>
              <Button
                type="button"
                variant="ghost-gh"
                size="sm"
                className="min-h-11 font-mono text-xs text-[var(--github-red)] hover:text-[var(--github-red)] hover:bg-[var(--github-red)]/10"
                onClick={onDelete}
                disabled={deleting}
                aria-label={`Confirmer la suppression du signalement #${ticket.id.slice(0, 8)}`}
              >
                {deleting ? 'Suppression…' : 'Confirmer'}
              </Button>
              <Button
                type="button"
                variant="ghost-gh"
                size="sm"
                className="min-h-11 font-mono text-xs"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                aria-label={`Annuler la suppression du signalement #${ticket.id.slice(0, 8)}`}
              >
                Annuler
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost-gh"
              size="sm"
              className="min-h-11 gap-1.5 font-mono text-xs text-[var(--github-text-secondary)] hover:text-[var(--github-red)]"
              onClick={() => setConfirming(true)}
              aria-label={`Supprimer le signalement #${ticket.id.slice(0, 8)}`}
            >
              <Trash2 size={14} aria-hidden="true" />
              Supprimer
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

interface ScreenshotViewerProps {
  storedUrl: string;
}

/** Lazily re-mints a fresh signed URL on demand, then renders an <img> only. */
function ScreenshotViewer({ storedUrl }: ScreenshotViewerProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  // Guard against setState after unmount (e.g. the filter changes and unmounts
  // this card) while the re-mint request is still in flight.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  async function reveal() {
    setState('loading');
    const url = await getFreshScreenshotUrl(storedUrl);
    if (!mountedRef.current) return;
    if (url) {
      setFreshUrl(url);
      setState('ready');
    } else {
      setState('error');
    }
  }

  if (state === 'ready' && freshUrl) {
    // Wrapper owns the width constraint + border so the <img> can't flash at its
    // intrinsic width on first paint (WebKit w-auto-in-flex quirk).
    return (
      <div className="w-full overflow-hidden rounded-md border border-[var(--github-border-primary)]">
        <img
          src={freshUrl}
          alt="Capture d'écran jointe au signalement"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="max-h-80 w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost-gh"
        size="sm"
        className="min-h-11 gap-2 font-mono text-xs"
        onClick={reveal}
        disabled={state === 'loading'}
      >
        <ImageIcon size={14} aria-hidden="true" />
        {state === 'loading' ? 'Chargement…' : 'Voir la capture'}
      </Button>
      {state === 'error' && (
        <p className="mt-1 text-xs text-[var(--github-text-secondary)] font-mono">
          Capture indisponible (lien expiré ou supprimé).
        </p>
      )}
    </div>
  );
}
