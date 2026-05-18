/**
 * AdminPanel — THI-225 Phase 9 Admin Panel v1 (skeleton).
 *
 * Route `/app/admin` gated par `<RequireRole allowed={['super_admin']}>`.
 *
 * Scope v1 (deadline 10 juin 2026) — read-only super_admin only :
 *   - 4 widgets placeholder skeleton (data réelle en S3 Sprint 2.5)
 *   - Supabase health (users actifs, lessons completed, agrégats progress)
 *   - Sentry events (last 24h errors/warnings)
 *   - Application health (RLS policies status, RPC calls)
 *   - Student activity heatmap (THI-77, GitHub-style)
 *
 * Hors scope v1 (différé v2 post-deadline) :
 *   - `institution_admin` role (RLS scope creep P=70% identifié agent challenge)
 *   - Drains Vercel Analytics (Pro plan blocker confirmé spike 18/05)
 *   - Maintenance mode, in-app tickets, screenshots upload
 *   - Teacher adoption heatmap (THI-78)
 *
 * Le lien vers le dashboard Vercel externe est placé en footer pour les
 * admins TL eux-mêmes (les autres rôles n'arrivent jamais ici).
 */
import { Helmet } from 'react-helmet-async';
import { Activity, AlertCircle, BarChart3, ExternalLink, ShieldCheck, Users } from 'lucide-react';

import { RequireRole } from './auth/RequireRole';

export function AdminPanel() {
  return (
    <RequireRole allowed={['super_admin']}>
      <AdminPanelContent />
    </RequireRole>
  );
}

function AdminPanelContent() {
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
          Supervision et monitoring de la plateforme.{' '}
          <span className="text-[var(--github-text-secondary)]/70">
            Édition v1 — données live disponibles bientôt.
          </span>
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <WidgetSupabaseHealth />
        <WidgetSentryEvents />
        <WidgetApplicationHealth />
        <WidgetStudentHeatmap />
      </div>

      <footer className="pt-6 border-t border-[var(--github-border-primary)]">
        <a
          href="https://vercel.com/thierry-vanmeeterens-projects/terminal-learning/analytics"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-mono text-[var(--github-text-secondary)] hover:text-emerald-400 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          Voir analytics détaillées sur Vercel
          <ExternalLink size={12} aria-hidden="true" />
        </a>
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
  comingIn: string;
  children?: React.ReactNode;
}

function WidgetCard({ icon, title, description, comingIn, children }: WidgetCardProps) {
  return (
    <section
      className="px-5 py-5 rounded-lg bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)]"
      aria-labelledby={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <header className="flex items-center gap-3 mb-3">
        <span className="text-emerald-400" aria-hidden="true">
          {icon}
        </span>
        <h2
          id={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}
          className="text-base font-medium text-[var(--github-text-primary)]"
        >
          {title}
        </h2>
      </header>
      <p className="text-sm text-[var(--github-text-secondary)] mb-3">{description}</p>
      {children ?? (
        <div className="px-4 py-3 rounded-md bg-[var(--github-bg)]/40 border border-dashed border-[var(--github-border-primary)]">
          <p className="text-xs text-[var(--github-text-secondary)]/70 font-mono">
            Données live : <span className="text-emerald-400">{comingIn}</span>
          </p>
        </div>
      )}
    </section>
  );
}

function WidgetSupabaseHealth() {
  return (
    <WidgetCard
      icon={<Users size={20} />}
      title="Santé Supabase"
      description="Utilisateurs actifs (7j), leçons complétées (30j), modules populaires, sessions auth."
      comingIn="Sprint S3 — requêtes Supabase REST sur progress + auth.users"
    />
  );
}

function WidgetSentryEvents() {
  return (
    <WidgetCard
      icon={<AlertCircle size={20} />}
      title="Événements Sentry"
      description="Erreurs et warnings des 24 dernières heures (free tier 5K events/mois)."
      comingIn="Sprint S3 — Sentry REST API integration"
    />
  );
}

function WidgetApplicationHealth() {
  return (
    <WidgetCard
      icon={<ShieldCheck size={20} />}
      title="Santé application"
      description="Status RLS policies, RPC calls réussis vs erreur, événements auth Supabase."
      comingIn="Sprint S3 — Supabase Admin queries via supabase-js"
    />
  );
}

function WidgetStudentHeatmap() {
  return (
    <WidgetCard
      icon={<BarChart3 size={20} />}
      title="Activité élèves"
      description="Heatmap GitHub-style des leçons complétées par jour sur 52 semaines (THI-77)."
      comingIn="Sprint S3 — agrégat progress par date_trunc('day', completed_at)"
    >
      {/* Skeleton heatmap placeholder — emerald grid pattern */}
      <div
        className="grid grid-cols-13 gap-1 mt-2"
        role="img"
        aria-label="Heatmap placeholder — données live disponibles Sprint S3"
      >
        {Array.from({ length: 91 }, (_, i) => (
          <span
            key={i}
            className="aspect-square rounded-sm bg-[var(--github-bg)]/40 border border-[var(--github-border-primary)]/40"
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--github-text-secondary)]/70 font-mono inline-flex items-center gap-2">
        <Activity size={12} aria-hidden="true" />
        Skeleton — 91 jours × 1 cellule
      </p>
    </WidgetCard>
  );
}
