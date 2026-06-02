/**
 * Shared display helpers for support tickets (Sprint 2.C).
 *
 * Extracted from SupportTicketsSection (super_admin triage, THI-320) so the
 * user-facing « Mes signalements » view (THI-325) renders identical status /
 * type labels, badge colours and date formatting without duplicating the maps.
 * Single source of truth for ticket presentation across admin + user surfaces.
 */
import type { SupportTicketStatus, SupportTicketType } from '@/app/types/database';

export type TicketBadgeVariant = 'pill-amber' | 'pill-blue' | 'pill-emerald' | 'pill-muted';

export const TICKET_STATUS_ORDER: SupportTicketStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];

export const TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'En attente',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
};

export const TICKET_STATUS_BADGE: Record<SupportTicketStatus, TicketBadgeVariant> = {
  open: 'pill-amber',
  in_progress: 'pill-blue',
  resolved: 'pill-emerald',
  closed: 'pill-muted',
};

export const TICKET_TYPE_LABELS: Record<SupportTicketType, string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  question: 'Question',
};

// Intl.DateTimeFormat (not Date.toLocaleDateString with time options, which is
// semantically date-only) — explicit + unambiguous output across environments.
export function formatTicketDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
