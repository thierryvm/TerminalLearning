/**
 * AdminPanel — THI-225 Phase 9 Admin Panel + THI-234 widgets data-driven.
 *
 * Route `/app/admin` gated par `<RequireRole allowed={['super_admin']}>`.
 *
 * Widgets LIVE (THI-234, migration 032 RPC SECURITY DEFINER + gate super_admin) :
 *   - Santé Supabase    → `admin_platform_stats()` (users, actifs 7j, leçons 30j/total, top 5)
 *   - Activité élèves   → `admin_activity_heatmap()` (progress/jour sur 52 semaines, THI-77)
 *
 * Widgets placeholder (différés v2 post-démo) :
 *   - Sentry events     → nécessite route API + secret Sentry (plus lourd/risqué)
 *   - Application health → agrégats techniques (peu parlants pour la cible écoles)
 *
 * Les agrégats sont cross-user mais gated `super_admin` côté RPC (raise
 * PERMISSION_DENIED sinon) + REVOKE public/anon — defense in depth avec le
 * RequireRole UI. Voir migration 032 + `useAdminAnalytics`.
 */
import { Helmet } from 'react-helmet-async';
import { Activity, AlertCircle, BarChart3, ExternalLink, ShieldCheck, Users } from 'lucide-react';

import { RequireRole } from './auth/RequireRole';
import { SupportTicketsSection } from './SupportTicketsSection';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useAdminAnalytics, type PlatformStats, type HeatmapDay } from '@/lib/hooks/useAdminAnalytics';
import { buildHeatmapGrid, heatmapLevel, heatmapMax, HEATMAP_WEEKS } from '@/lib/admin/heatmap';

export function AdminPanel() {
  return (
    <RequireRole allowed={['super_admin']}>
      <AdminPanelContent />
    </RequireRole>
  );
}

function AdminPanelContent() {
  const { stats, heatmap, loading, error } = useAdminAnalytics();

  return (
    <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
      <Helmet>
        <title>Panneau administrateur — Terminal Learning</title>
        <meta
          name="description"
          content="Tableau de bord supervision Terminal Learning — santé application, événements Sentry, activité utilisateurs, heatmap. Accès réservé super_admin."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--github-text-primary)] mb-2">
          Panneau administrateur
        </h1>
        <p className="text-sm text-[var(--github-text-secondary)]">
          Supervision et monitoring de la plateforme.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <WidgetSupabaseHealth stats={stats} loading={loading} error={error} />
        <WidgetSentryEvents />
        <WidgetApplicationHealth />
        <WidgetStudentHeatmap heatmap={heatmap} loading={loading} error={error} />
      </div>

      <SupportTicketsSection />

      <footer className="mt-10 pt-6 border-t border-[var(--github-border-primary)]">
        <Button asChild variant="ghost-gh" className="min-h-11 gap-2 font-mono text-sm">
          <a
            href="https://vercel.com/thierry-vanmeeterens-projects/terminal-learning/analytics"
            target="_blank"
            rel="noopener noreferrer"
          >
            Voir analytics détaillées sur Vercel
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </Button>
        <p className="text-xs text-[var(--github-text-secondary)]/70 font-mono mt-2">
          Drains custom analytics widget : Phase 9 v2 (post-deadline 10 juin).
        </p>
      </footer>
    </main>
  );
}

interface WidgetCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  comingIn?: string;
  children?: React.ReactNode;
}

function WidgetCard({ icon, title, description, comingIn, children }: WidgetCardProps) {
  const headingId = `widget-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <Card
      variant="tl-surface"
      className="px-5 py-5 gap-3"
      role="region"
      aria-labelledby={headingId}
    >
      <header className="flex items-center gap-3">
        <span className="text-emerald-400" aria-hidden="true">
          {icon}
        </span>
        <h2 id={headingId} className="text-base font-medium text-[var(--github-text-primary)]">
          {title}
        </h2>
      </header>
      <p className="text-sm text-[var(--github-text-secondary)]">{description}</p>
      {children ?? (
        <div className="px-4 py-3 rounded-md bg-[var(--github-bg)]/40 border border-dashed border-[var(--github-border-primary)]">
          <p className="text-xs text-[var(--github-text-secondary)]/70 font-mono">
            Données live : <span className="text-emerald-400">{comingIn}</span>
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * Shared body wrapper for the data-driven widgets — renders loading / error /
 * empty states consistently, otherwise the children (the actual data view).
 */
function WidgetBody({
  loading,
  error,
  empty,
  emptyLabel = 'Aucune donnée pour le moment.',
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return <p className="text-sm text-[var(--github-text-secondary)] font-mono">Chargement…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-red-400" role="alert">
        Chargement impossible. Réessaie dans un instant.
      </p>
    );
  }
  if (empty) {
    return <p className="text-sm text-[var(--github-text-secondary)]">{emptyLabel}</p>;
  }
  return <>{children}</>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-2 rounded-md bg-[var(--github-bg)]/40 border border-[var(--github-border-primary)]">
      <div className="text-xl font-semibold text-[var(--github-text-primary)] font-mono">
        {value.toLocaleString('fr-FR')}
      </div>
      <div className="text-xs text-[var(--github-text-secondary)] leading-tight">{label}</div>
    </div>
  );
}

function WidgetSupabaseHealth({
  stats,
  loading,
  error,
}: {
  stats: PlatformStats | null;
  loading: boolean;
  error: Error | null;
}) {
  return (
    <WidgetCard
      icon={<Users size={20} />}
      title="Santé Supabase"
      description="Utilisateurs, activité récente et leçons complétées."
    >
      <WidgetBody loading={loading} error={error} empty={!stats}>
        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Utilisateurs" value={stats.total_users} />
              <Stat label="Actifs (7 j)" value={stats.active_users_7d} />
              <Stat label="Leçons complétées (30 j)" value={stats.lessons_completed_30d} />
              <Stat label="Total complétées" value={stats.lessons_completed_total} />
            </div>
            {stats.top_lessons.length > 0 && (
              <div>
                <p className="text-xs text-[var(--github-text-secondary)] uppercase tracking-wide font-mono mb-1.5">
                  Top leçons
                </p>
                <ul className="space-y-1">
                  {stats.top_lessons.map((l) => (
                    <li
                      key={l.lesson_id}
                      className="flex items-center justify-between text-sm text-[var(--github-text-secondary)]"
                    >
                      <span className="font-mono truncate">{l.lesson_id}</span>
                      <span className="text-emerald-400 font-mono shrink-0 ml-2">{l.completions}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </WidgetBody>
    </WidgetCard>
  );
}

function WidgetSentryEvents() {
  return (
    <WidgetCard
      icon={<AlertCircle size={20} />}
      title="Événements Sentry"
      description="Erreurs et warnings des 24 dernières heures (free tier 5K events/mois)."
      comingIn="Phase 9 v2 — Sentry REST API (route serveur + secret)"
    />
  );
}

function WidgetApplicationHealth() {
  return (
    <WidgetCard
      icon={<ShieldCheck size={20} />}
      title="Santé application"
      description="Status RLS policies, RPC calls réussis vs erreur, événements auth Supabase."
      comingIn="Phase 9 v2 — Supabase Admin queries"
    />
  );
}

// GitHub-style intensity palette (0 = aucune activité → 4 = jour le plus actif).
// emerald = couleur accent du projet (cohérent Sidebar / progress bar).
const HEATMAP_LEVEL_CLASS = [
  'bg-[var(--github-bg)] border border-[var(--github-border-primary)]/40',
  'bg-emerald-900/70',
  'bg-emerald-700',
  'bg-emerald-500',
  'bg-emerald-400',
] as const;

function WidgetStudentHeatmap({
  heatmap,
  loading,
  error,
}: {
  heatmap: HeatmapDay[];
  loading: boolean;
  error: Error | null;
}) {
  const cells = buildHeatmapGrid(heatmap);
  const max = heatmapMax(cells);
  const totalCompletions = cells.reduce((sum, c) => sum + c.completions, 0);

  return (
    <WidgetCard
      icon={<BarChart3 size={20} />}
      title="Activité élèves"
      description={`Leçons complétées par jour sur ${HEATMAP_WEEKS} semaines (THI-77).`}
    >
      <WidgetBody loading={loading} error={error} empty={false}>
        <div className="overflow-x-auto">
          <div
            className="grid grid-rows-[repeat(7,10px)] grid-flow-col gap-[2px] w-max"
            role="img"
            aria-label={
              totalCompletions === 0
                ? `Aucune activité sur les ${HEATMAP_WEEKS} dernières semaines.`
                : `Heatmap d'activité : ${totalCompletions} leçons complétées sur les ${HEATMAP_WEEKS} dernières semaines, jour le plus actif ${max}.`
            }
          >
            {cells.map((c) => (
              <span
                key={c.date}
                className={`size-2.5 rounded-[2px] ${HEATMAP_LEVEL_CLASS[heatmapLevel(c.completions, max)]}`}
                title={`${c.date} : ${c.completions} leçon(s)`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--github-text-secondary)]/70 font-mono inline-flex items-center gap-2">
          <Activity size={12} aria-hidden="true" />
          {totalCompletions} complétions · pic {max}/jour
        </p>
      </WidgetBody>
    </WidgetCard>
  );
}
