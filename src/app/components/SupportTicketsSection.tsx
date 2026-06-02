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
import { CheckCircle2, ImageIcon, Inbox, Loader2 } from 'lucide-react';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  getFreshScreenshotUrl,
  useSupportTickets,
  type SupportTicket,
} from '@/lib/hooks/useSupportTickets';
import type { SupportTicketStatus, SupportTicketType } from '@/app/types/database';

const STATUS_ORDER: SupportTicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'En attente',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
};

type BadgeVariant = 'pill-amber' | 'pill-blue' | 'pill-emerald' | 'pill-muted';

const STATUS_BADGE: Record<SupportTicketStatus, BadgeVariant> = {
  open: 'pill-amber',
  in_progress: 'pill-blue',
  resolved: 'pill-emerald',
  closed: 'pill-muted',
};

const TYPE_LABELS: Record<SupportTicketType, string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  question: 'Question',
};

type StatusFilter = 'all' | SupportTicketStatus;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SupportTicketsSection() {
  const { tickets, loading, error, updatingId, updateStatus } = useSupportTickets();
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
                  onStatusChange={(next) => updateStatus(ticket.id, next)}
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
  onStatusChange: (next: SupportTicketStatus) => void;
}

function TicketCard({ ticket, updating, onStatusChange }: TicketCardProps) {
  const selectId = `ticket-status-${ticket.id}`;
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
        <Select
          value={ticket.status}
          onValueChange={(v) => onStatusChange(v as SupportTicketStatus)}
          disabled={updating}
        >
          <SelectTrigger id={selectId} className="w-[9.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {updating && (
          <span className="text-emerald-400" aria-hidden="true">
            <Loader2 size={14} className="animate-spin" />
          </span>
        )}
        {ticket.status === 'resolved' && !updating && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono">
            <CheckCircle2 size={12} aria-hidden="true" />
            {ticket.resolved_at ? `Résolu le ${formatDate(ticket.resolved_at)}` : 'Résolu'}
          </span>
        )}
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
