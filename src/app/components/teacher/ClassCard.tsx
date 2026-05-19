/**
 * ClassCard — Sprint 2.A étape 2 Teacher Dashboard.
 *
 * Displays one class owned by the teacher with :
 *   - name + creation date
 *   - enrollment count (live aggregate from useTeacherClasses)
 *   - invitation URL `/app/join?code=<12-char-hex>` + copy button
 *
 * The full URL is built from `window.location.origin` so it works on
 * preview deployments as well as production. The `code` query param is
 * the same input the student types/pastes on `/app/join` (Sprint 2.A
 * étape 3, consumes `join_class_by_code` RPC).
 *
 * Copy feedback : inline "✓ Copié" replaces the button label for 2s,
 * then reverts. No toast/sonner dep (THI-153 removed sonner). Clipboard
 * API failure (rare — iOS Safari requires user gesture which we have)
 * surfaces a discreet "Copie impossible" without throwing.
 */
import { useEffect, useState } from 'react';
import { Check, Copy, Users } from 'lucide-react';

import { Button } from '../ui/button';
import { Card } from '../ui/card';

export interface ClassCardData {
  id: string;
  name: string;
  invitation_code: string;
  enrollment_count: number;
  created_at: string;
}

interface ClassCardProps {
  data: ClassCardData;
}

const COPY_FEEDBACK_MS = 2000;

function buildInvitationUrl(invitationCode: string): string {
  // SSR-safe: only run on the client.
  if (typeof window === 'undefined') {
    return `/app/join?code=${invitationCode}`;
  }
  return `${window.location.origin}/app/join?code=${invitationCode}`;
}

function formatCreationDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function ClassCard({ data }: ClassCardProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const invitationUrl = buildInvitationUrl(data.invitation_code);

  // Auto-revert the feedback label after 2s. Cleanup avoids leaking the
  // timer if the component unmounts mid-feedback.
  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copyState]);

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyState('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopyState('copied');
    } catch {
      // Permissions denied / non-secure context — discrete fallback message
      // (we don't want to crash the page or open an alert).
      setCopyState('error');
    }
  };

  const buttonLabel =
    copyState === 'copied'
      ? 'Copié'
      : copyState === 'error'
        ? 'Copie impossible'
        : 'Copier l’URL d’invitation';

  return (
    <Card
      variant="tl-surface"
      className="px-5 py-5 gap-3"
      role="region"
      aria-labelledby={`class-${data.id}-name`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={`class-${data.id}-name`}
            className="text-base font-medium text-[var(--github-text-primary)] truncate"
            title={data.name}
          >
            {data.name}
          </h3>
          <p className="mt-1 text-xs text-[var(--github-text-secondary)]/70 font-mono">
            Créée le {formatCreationDate(data.created_at)}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-xs text-[var(--github-text-secondary)] font-mono shrink-0"
          aria-label={`${data.enrollment_count} élève${data.enrollment_count > 1 ? 's' : ''} inscrit${data.enrollment_count > 1 ? 's' : ''}`}
        >
          <Users size={12} aria-hidden="true" />
          {data.enrollment_count}
        </span>
      </header>

      <div className="px-3 py-2 rounded-md bg-[var(--github-bg)]/40 border border-dashed border-[var(--github-border-primary)]">
        <p className="text-xs text-[var(--github-text-secondary)]/70 font-mono mb-1">
          Code d&apos;invitation
        </p>
        <p
          className="text-sm font-mono text-[var(--github-text-primary)] select-all break-all"
          aria-label={`Code d'invitation : ${data.invitation_code}`}
        >
          {data.invitation_code}
        </p>
      </div>

      <Button
        type="button"
        variant={copyState === 'copied' ? 'emerald-soft' : 'ghost-gh'}
        className="min-h-11 gap-2 self-start"
        onClick={handleCopy}
        aria-live="polite"
      >
        {copyState === 'copied' ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
        {buttonLabel}
      </Button>
    </Card>
  );
}
