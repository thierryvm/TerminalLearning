/**
 * Tests for AdminPanel — THI-225 Phase 9 + THI-234 data-driven widgets.
 *
 * Couvre :
 *  - auth/role guard (anonymous → "connecté", non-super_admin → "Accès réservé")
 *  - super_admin render : header + 4 widgets + footer lien Vercel + meta noindex
 *  - widgets data-driven (THI-234) : Santé Supabase (stats), Activité élèves
 *    (heatmap 364 cells), loading + error states
 *  - widgets placeholder restants (Sentry / Application health → Phase 9 v2)
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, it, expect, vi } from 'vitest';

import type { PlatformStats, HeatmapDay } from '@/lib/hooks/useAdminAnalytics';

type AuthState = { user: { id: string } | null; initialized: boolean };
type RoleState = {
  role: 'super_admin' | 'institution_admin' | 'teacher' | 'pending_teacher' | 'student' | null;
  loading: boolean;
};
type AnalyticsState = {
  stats: PlatformStats | null;
  heatmap: HeatmapDay[];
  loading: boolean;
  error: Error | null;
};

const authState: AuthState = { user: null, initialized: true };
const roleState: RoleState = { role: null, loading: false };
const analyticsState: AnalyticsState = { stats: null, heatmap: [], loading: false, error: null };

vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, initialized: authState.initialized }),
}));

vi.mock('@/lib/hooks/useUserRole', () => ({
  useUserRole: () => ({ role: roleState.role, loading: roleState.loading }),
}));

vi.mock('@/lib/hooks/useAdminAnalytics', () => ({
  useAdminAnalytics: () => ({ ...analyticsState, refresh: vi.fn() }),
}));

// SupportTicketsSection fetches tickets on mount — stub it out (out of scope here).
vi.mock('../app/components/SupportTicketsSection', () => ({
  SupportTicketsSection: () => null,
}));

import { AdminPanel } from '../app/components/AdminPanel';

function renderAdmin() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AdminPanel />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function sampleStats(overrides: Partial<PlatformStats> = {}): PlatformStats {
  return {
    total_users: 12,
    active_users_7d: 1,
    lessons_completed_30d: 2,
    lessons_completed_total: 53,
    top_lessons: [
      { lesson_id: 'fichiers/cp', completions: 2 },
      { lesson_id: 'fichiers/mkdir', completions: 2 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  authState.user = null;
  authState.initialized = true;
  roleState.role = null;
  roleState.loading = false;
  analyticsState.stats = null;
  analyticsState.heatmap = [];
  analyticsState.loading = false;
  analyticsState.error = null;
});

describe('AdminPanel — auth & role guard', () => {
  it('renders "Vous devez être connecté" fallback when anonymous', () => {
    authState.user = null;
    renderAdmin();
    expect(screen.getByText(/vous devez être connecté/i)).toBeInTheDocument();
    expect(screen.queryByText('Panneau administrateur')).not.toBeInTheDocument();
  });

  it.each([
    ['student' as const],
    ['pending_teacher' as const],
    ['teacher' as const],
    ['institution_admin' as const],
  ])('renders "Accès réservé" fallback for role=%s (not super_admin)', (currentRole) => {
    authState.user = { id: 'user-123' };
    roleState.role = currentRole;
    renderAdmin();
    expect(screen.getByText(/accès réservé/i)).toBeInTheDocument();
    expect(screen.queryByText('Panneau administrateur')).not.toBeInTheDocument();
  });
});

describe('AdminPanel — super_admin render', () => {
  beforeEach(() => {
    authState.user = { id: 'super-123' };
    roleState.role = 'super_admin';
  });

  it('renders header "Panneau administrateur"', () => {
    renderAdmin();
    expect(screen.getByRole('heading', { name: 'Panneau administrateur', level: 1 })).toBeInTheDocument();
  });

  it('renders the 4 widget sections', () => {
    renderAdmin();
    expect(screen.getByText('Santé Supabase')).toBeInTheDocument();
    expect(screen.getByText('Événements Sentry')).toBeInTheDocument();
    expect(screen.getByText('Santé application')).toBeInTheDocument();
    expect(screen.getByText('Activité élèves')).toBeInTheDocument();
  });

  it('renders external link to Vercel analytics dashboard', () => {
    renderAdmin();
    const link = screen.getByRole('link', { name: /voir analytics détaillées sur vercel/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('vercel.com'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('keeps Sentry + Application health as Phase 9 v2 placeholders', () => {
    renderAdmin();
    const v2Mentions = screen.getAllByText(/Phase 9 v2/i);
    // 2 widget placeholders + footer Drains mention.
    expect(v2Mentions.length).toBeGreaterThanOrEqual(3);
  });
});

describe('AdminPanel — THI-234 data-driven widgets', () => {
  beforeEach(() => {
    authState.user = { id: 'super-123' };
    roleState.role = 'super_admin';
  });

  it('renders platform stats numbers when loaded', () => {
    analyticsState.stats = sampleStats();
    renderAdmin();
    expect(screen.getByText('53')).toBeInTheDocument(); // total complétées
    expect(screen.getByText('12')).toBeInTheDocument(); // utilisateurs
    expect(screen.getByText('fichiers/cp')).toBeInTheDocument(); // top leçon
  });

  it('renders the activity heatmap with a fixed 364-cell grid', () => {
    analyticsState.heatmap = [{ day: '2026-06-01', completions: 4 }];
    renderAdmin();
    const heatmap = screen.getByRole('img', { name: /heatmap d'activité/i });
    expect(heatmap.querySelectorAll('span').length).toBe(364);
  });

  it('shows a loading state while analytics are fetching', () => {
    analyticsState.loading = true;
    renderAdmin();
    expect(screen.getAllByText('Chargement…').length).toBeGreaterThanOrEqual(1);
  });

  it('surfaces an error state without crashing', () => {
    analyticsState.error = new Error('boom');
    renderAdmin();
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1);
    // header still renders (error is widget-scoped, not page-fatal)
    expect(screen.getByRole('heading', { name: 'Panneau administrateur', level: 1 })).toBeInTheDocument();
  });
});
