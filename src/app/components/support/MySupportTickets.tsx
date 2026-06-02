/**
 * MySupportTickets — THI-325 Sprint 2.C Étape 5 (« Mes signalements », /app/support).
 *
 * Read-only view of the signed-in user's own support tickets + their status.
 * Counterpart of the super_admin triage (SupportTicketsSection / AdminPanel).
 * RLS (`support_tickets: user select own`, migration 028) scopes the fetch to
 * the caller's rows — defense in depth on top of the RequireAuth gate.
 *
 * v1 scope (THI-325) : list only. No screenshot render — a regular user has no
 * storage select policy on support_screenshots (migration 030 = super_admin
 * only), and rendering uploaded content is supabase-backend-auditor's gate;
 * we show a "capture jointe" marker instead. No status mutation (read-only).
 */
import { Link } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, ImageIcon, Inbox } from 'lucide-react';

import { RequireAuth } from '../auth/RequireAuth';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { useMySupportTickets } from '@/lib/hooks/useMySupportTickets';
import type { SupportTicket } from '@/lib/hooks/useSupportTickets';
import {
  TICKET_STATUS_BADGE,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  formatTicketDate,
} from '@/lib/support/ticketDisplay';

export function MySupportTickets() {
  return (
    <RequireAuth
      fallback={
        <main className="flex-1 px-6 py-12 max-w-3xl mx-auto">
          <p className="text-[var(--github-text-secondary)] text-sm font-mono">
            Vous devez être connecté pour voir vos signalements.{' '}
            <Link to="/" className="text-emerald-400 hover:text-emerald-300 underline">
              Retour à l&apos;accueil
            </Link>
          </p>
        </main>
      }
    >
      <MySupportTicketsContent />
    </RequireAuth>
  );
}

function MySupportTicketsContent() {
  const { tickets, loading, error } = useMySupportTickets();

  return (
    <main className="flex-1 w-full px-6 py-10 max-w-3xl mx-auto">
      <Helmet>
        <title>Mes signalements — Terminal Learning</title>
        {/* Private user page — never index. */}
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--github-text-primary)]">Mes signalements</h1>
        <p className="mt-1 text-sm text-[var(--github-text-secondary)]">
          Les bugs, suggestions et questions que tu nous as envoyés, et leur statut.
        </p>
      </header>

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
        ) : tickets.length === 0 ? (
          <Card variant="tl-surface" className="px-5 py-10 text-center gap-3">
            <span className="text-emerald-400 mx-auto" aria-hidden="true">
              <Inbox size={28} />
            </span>
            <p className="text-sm text-[var(--github-text-primary)]">
              Aucun signalement pour l&apos;instant.
            </p>
            <p className="text-xs text-[var(--github-text-secondary)]">
              Utilise « Aide &amp; feedback » dans le menu pour nous signaler un bug ou une idée.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3" role="list">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <MyTicketCard ticket={ticket} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function MyTicketCard({ ticket }: { ticket: SupportTicket }) {
  return (
    <Card variant="tl-surface" className="px-5 py-4 gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Badge variant="pill-muted">{TICKET_TYPE_LABELS[ticket.type]}</Badge>
          <Badge variant={TICKET_STATUS_BADGE[ticket.status]}>
            {TICKET_STATUS_LABELS[ticket.status]}
          </Badge>
        </div>
        <p className="text-xs text-[var(--github-text-secondary)] font-mono shrink-0">
          {formatTicketDate(ticket.created_at)}
        </p>
      </div>

      {/* Description — JSX text node (React-escaped). break-words keeps a long
          unbroken string from overflowing on narrow viewports. */}
      <p className="text-sm text-[var(--github-text-primary)] whitespace-pre-wrap break-words [word-break:break-word]">
        {ticket.description}
      </p>

      {/* v1 : marker only, never render the uploaded image (see file header). */}
      {ticket.screenshot_url && (
        <p className="inline-flex items-center gap-1.5 text-xs text-[var(--github-text-secondary)] font-mono">
          <ImageIcon size={13} aria-hidden="true" />
          Capture jointe
        </p>
      )}

      {ticket.status === 'resolved' && ticket.resolved_at && (
        <p className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono">
          <CheckCircle2 size={12} aria-hidden="true" />
          {`Résolu le ${formatTicketDate(ticket.resolved_at)}`}
        </p>
      )}
    </Card>
  );
}
