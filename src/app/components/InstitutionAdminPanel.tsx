/**
 * InstitutionAdminPanel — THI-280 Sprint 2.B Étape 4.
 *
 * Route `/app/institution` gated `<RequireRole allowed={['institution_admin', 'super_admin']}>`.
 *
 * Scope v1.0 (Étape 4) — narrow on purpose :
 *   - List pending_teacher profiles in the caller's institution (RLS auto-scoped)
 *   - Approve button per row → calls approve_teacher RPC (migration 025)
 *   - Optimistic UI: row disappears on success, aria-live region announces feedback
 *
 * Out of scope (v1.1+ — deferred per Étape 4 brief) :
 *   - Reject workflow (no reject_teacher RPC yet)
 *   - Institution-wide statistics (teachers count, classes count, students count)
 *   - Recent approvals history (admin_audit_log read access via super_admin only)
 *   - Editing institution metadata (name, logo) — institution_id RLS scope
 *
 * Authorization layers (defense in depth) :
 *   1. UI :  <RequireRole allowed={['institution_admin', 'super_admin']}>
 *   2. RLS : profiles SELECT scoped to caller institution (migration 009)
 *   3. RPC : approve_teacher checks institution_admin role + same institution
 *            (migration 025 SECURITY DEFINER body)
 *   4. Trigger : prevent_role_escalation enforces role transitions (migration 010)
 *   5. Audit : admin_audit_log trigger captures all pending→teacher promotions
 *             regardless of path (migration 026)
 */
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, ShieldUser, UserCheck } from 'lucide-react';

import { RequireRole } from './auth/RequireRole';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { usePendingTeachers } from '@/lib/hooks/usePendingTeachers';

export function InstitutionAdminPanel() {
  return (
    <RequireRole allowed={['institution_admin', 'super_admin']}>
      <InstitutionAdminPanelContent />
    </RequireRole>
  );
}

function InstitutionAdminPanelContent() {
  const { pendingTeachers, loading, approving, error, approve } = usePendingTeachers();

  return (
    <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
      <Helmet>
        <title>Mon institution — Terminal Learning</title>
        <meta
          name="description"
          content="Gérez les approbations enseignants de votre institution Terminal Learning : approuvez les demandes pending_teacher, supervisez votre établissement."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-emerald-400" aria-hidden="true">
            <ShieldUser size={24} />
          </span>
          <h1 className="text-2xl font-semibold text-[var(--github-text-primary)]">
            Mon institution
          </h1>
        </div>
        <p className="text-sm text-[var(--github-text-secondary)]">
          Approuvez les demandes d&apos;enseignants pour votre établissement.
          Les profils visibles ici appartiennent uniquement à votre institution.
        </p>
      </header>

      <section aria-labelledby="pending-teachers-heading">
        <header className="mb-4 flex items-center justify-between">
          <h2
            id="pending-teachers-heading"
            className="text-lg font-medium text-[var(--github-text-primary)]"
          >
            Enseignants en attente
            {!loading && (
              <span className="ml-2 text-sm text-[var(--github-text-secondary)] font-mono">
                ({pendingTeachers.length})
              </span>
            )}
          </h2>
        </header>

        {/* aria-live scope limited to the dynamic block (list + error + states)
            so screen readers don't re-announce the static heading on each
            refresh (ui-auditor M1). */}
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
            <p className="text-sm text-[var(--github-text-secondary)] font-mono">
              Chargement…
            </p>
          ) : pendingTeachers.length === 0 ? (
            <Card variant="tl-surface" className="px-5 py-6 text-center gap-2">
              <span className="text-emerald-400 mx-auto" aria-hidden="true">
                <CheckCircle2 size={24} />
              </span>
              <p className="text-sm text-[var(--github-text-primary)]">
                Aucune demande en attente.
              </p>
              <p className="text-xs text-[var(--github-text-secondary)] font-mono">
                Les nouvelles demandes apparaîtront ici dès qu&apos;un enseignant
                en fera la demande.
              </p>
            </Card>
          ) : (
            <ul className="space-y-3" role="list">
              {pendingTeachers.map((profile) => (
                <li key={profile.id}>
                  <PendingTeacherCard
                    profile={profile}
                    approving={approving === profile.id}
                    onApprove={() => approve(profile.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

interface PendingTeacherCardProps {
  profile: {
    id: string;
    display_name: string | null;
    username: string | null;
    sector: string | null;
    role_requested_at: string | null;
    created_at: string;
  };
  approving: boolean;
  onApprove: () => void;
}

function PendingTeacherCard({ profile, approving, onApprove }: PendingTeacherCardProps) {
  const displayName = profile.display_name ?? profile.username ?? 'Profil sans nom';
  const requestedAt = profile.role_requested_at ?? profile.created_at;
  const requestedDate = new Date(requestedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card variant="tl-surface" className="px-5 py-4 gap-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--github-text-primary)] truncate">
            {displayName}
          </p>
          <p className="text-xs text-[var(--github-text-secondary)] font-mono">
            Demande déposée le {requestedDate}
            {profile.sector ? ` — secteur ${profile.sector}` : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="emerald-soft"
          className="min-h-11 gap-2"
          onClick={onApprove}
          disabled={approving}
          aria-label={`Approuver ${displayName}`}
        >
          <UserCheck size={16} aria-hidden="true" />
          {approving ? 'Approbation…' : 'Approuver'}
        </Button>
      </div>
    </Card>
  );
}
