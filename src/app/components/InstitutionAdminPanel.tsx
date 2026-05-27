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
import { CheckCircle2, Globe, ShieldUser, UserCheck, X } from 'lucide-react';

import { RequireRole } from './auth/RequireRole';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { usePendingTeachers } from '@/lib/hooks/usePendingTeachers';
import { useUserRole } from '@/lib/hooks/useUserRole';

export function InstitutionAdminPanel() {
  return (
    <RequireRole allowed={['institution_admin', 'super_admin']}>
      <InstitutionAdminPanelContent />
    </RequireRole>
  );
}

function InstitutionAdminPanelContent() {
  const {
    pendingTeachers,
    loading,
    approving,
    error,
    lastSuccess,
    approve,
    clearLastSuccess,
  } = usePendingTeachers();
  const { role } = useUserRole();

  // Sprint 2.B.2 — scope visible distingue le path forensique :
  //   - super_admin  → 'global'      (cross-institution allowed via migration 027)
  //   - institution_admin → 'institution' (same-institution only)
  // Cohérent avec metadata.scope inséré par la RPC dans admin_audit_log.
  const isSuperAdmin = role === 'super_admin';
  const scopeLabel = isSuperAdmin ? 'global' : 'institution';
  const scopeDescription = isSuperAdmin
    ? "Tu agis en super_admin — visibilité et approbations cross-institution."
    : "Les profils visibles ici appartiennent uniquement à votre institution.";

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
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-emerald-400" aria-hidden="true">
            <ShieldUser size={24} />
          </span>
          <h1 className="text-2xl font-semibold text-[var(--github-text-primary)]">
            Mon institution
          </h1>
          {/* Sprint 2.B.2 — badge scope visible (forensic clarity). */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-mono border ${
              isSuperAdmin
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-[var(--github-bg)]/60 border-[var(--github-border-primary)] text-[var(--github-text-secondary)]'
            }`}
            aria-label={`Périmètre d'action ${scopeLabel}`}
          >
            {isSuperAdmin && <Globe size={11} aria-hidden="true" />}
            scope : {scopeLabel}
          </span>
        </div>
        <p className="text-sm text-[var(--github-text-secondary)]">
          Approuvez les demandes d&apos;enseignants pour votre établissement.{' '}
          {scopeDescription}
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
          {/* Sprint 2.B.2 — feedback success post-approve.
              Affiche le displayName promu + scope utilisé (path forensique).
              Auto-clear après 8s (timer dans le hook). Bouton X pour dismiss
              manuel — cohérent avec le pattern toast inline non-bloquant. */}
          {lastSuccess && !error && (
            <Card
              variant="tl-surface"
              className="mb-4 px-4 py-3 border-emerald-500/40 bg-emerald-500/5"
              role="status"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-emerald-400 shrink-0" aria-hidden="true">
                    <CheckCircle2 size={16} />
                  </span>
                  <p className="text-sm text-emerald-300 font-mono truncate">
                    <span className="font-semibold">{lastSuccess.displayName}</span>{' '}
                    approuvé · scope {scopeLabel}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost-gh"
                  size="icon-lg"
                  className="shrink-0 text-emerald-300/70 hover:text-emerald-300"
                  onClick={clearLastSuccess}
                  aria-label="Fermer le message de confirmation"
                >
                  <X size={14} aria-hidden="true" />
                </Button>
              </div>
            </Card>
          )}

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
