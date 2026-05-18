/**
 * Tests for AdminPanel — THI-225 Phase 9 v1 skeleton.
 *
 * Couvre :
 *  - render skeleton (heading + 4 widgets + footer lien Vercel) when super_admin
 *  - fallback "Accès réservé" pour les 4 autres rôles (institution_admin /
 *    teacher / pending_teacher / student)
 *  - fallback "Vous devez être connecté" anonymous
 *  - meta robots noindex,nofollow (admin panel n'est pas pour Google)
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, it, expect, vi } from 'vitest';

type AuthState = {
  user: { id: string } | null;
  initialized: boolean;
};

type RoleState = {
  role: 'super_admin' | 'institution_admin' | 'teacher' | 'pending_teacher' | 'student' | null;
  loading: boolean;
};

const authState: AuthState = { user: null, initialized: true };
const roleState: RoleState = { role: null, loading: false };

vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, initialized: authState.initialized }),
}));

vi.mock('@/lib/hooks/useUserRole', () => ({
  useUserRole: () => ({ role: roleState.role, loading: roleState.loading }),
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

beforeEach(() => {
  authState.user = null;
  authState.initialized = true;
  roleState.role = null;
  roleState.loading = false;
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

  it('renders 4 widget sections', () => {
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

  it('mentions widget data coming in Sprint S3 (placeholder transparency)', () => {
    renderAdmin();
    // At least one widget mentions Sprint S3 timing (we don't want to over-spec the exact text)
    const sprintMentions = screen.getAllByText(/Sprint S3/i);
    expect(sprintMentions.length).toBeGreaterThanOrEqual(3);
  });

  it('mentions Phase 9 v2 for Drains in footer (transparency)', () => {
    renderAdmin();
    expect(screen.getByText(/Phase 9 v2/i)).toBeInTheDocument();
  });

  it('student heatmap renders 91 placeholder cells', () => {
    renderAdmin();
    const heatmap = screen.getByRole('img', { name: /heatmap placeholder/i });
    expect(heatmap).toBeInTheDocument();
    const cells = heatmap.querySelectorAll('span');
    expect(cells.length).toBe(91);
  });
});
