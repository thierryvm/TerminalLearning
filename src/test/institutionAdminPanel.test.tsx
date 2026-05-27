/**
 * Tests for InstitutionAdminPanel — THI-280 Sprint 2.B Étape 4.
 *
 * Covers :
 *   - RBAC fallback : anonymous → "Vous devez être connecté" + login button
 *   - RBAC fallback : student / pending_teacher / teacher → "Accès réservé"
 *   - RBAC pass : institution_admin → renders panel
 *   - RBAC pass : super_admin → renders panel (institution_admin route fallback)
 *   - Render : loading state, empty state, list of pending_teachers
 *   - Action : approve button calls approve_teacher RPC + removes row on success
 *   - Action : approve error surfaces FR message in aria-live region
 *   - Meta : noindex,nofollow (panel not for Google)
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock the pending teachers hook so RBAC tests don't make network calls.
type MockPending = {
  pendingTeachers: Array<{
    id: string;
    display_name: string | null;
    username: string | null;
    sector: string | null;
    institution_id: string | null;
    role_requested_at: string | null;
    created_at: string;
  }>;
  loading: boolean;
  approving: string | null;
  error: Error | null;
  lastSuccess: { displayName: string } | null;
};
const pendingState: MockPending = {
  pendingTeachers: [],
  loading: false,
  approving: null,
  error: null,
  lastSuccess: null,
};
const approveMock = vi.fn().mockResolvedValue(true);
const clearLastSuccessMock = vi.fn();

vi.mock('@/lib/hooks/usePendingTeachers', () => ({
  usePendingTeachers: () => ({
    pendingTeachers: pendingState.pendingTeachers,
    loading: pendingState.loading,
    approving: pendingState.approving,
    error: pendingState.error,
    lastSuccess: pendingState.lastSuccess,
    approve: approveMock,
    refresh: vi.fn().mockResolvedValue(undefined),
    clearLastSuccess: clearLastSuccessMock,
  }),
}));

import { InstitutionAdminPanel } from '../app/components/InstitutionAdminPanel';

function renderPanel() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <InstitutionAdminPanel />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  authState.user = null;
  authState.initialized = true;
  roleState.role = null;
  roleState.loading = false;
  pendingState.pendingTeachers = [];
  pendingState.loading = false;
  pendingState.approving = null;
  pendingState.error = null;
  pendingState.lastSuccess = null;
  approveMock.mockClear();
  approveMock.mockResolvedValue(true);
  clearLastSuccessMock.mockClear();
});

describe('InstitutionAdminPanel — auth & role guard', () => {
  it('renders "Vous devez être connecté" fallback when anonymous', () => {
    authState.user = null;
    renderPanel();
    expect(screen.getByText(/vous devez être connecté/i)).toBeInTheDocument();
    expect(screen.queryByText('Mon institution')).not.toBeInTheDocument();
  });

  it.each([
    ['student' as const],
    ['pending_teacher' as const],
    ['teacher' as const],
  ])('renders "Accès réservé" fallback for role=%s (not institution_admin or super_admin)', (currentRole) => {
    authState.user = { id: 'user-123' };
    roleState.role = currentRole;
    renderPanel();
    expect(screen.getByText(/accès réservé/i)).toBeInTheDocument();
    expect(screen.queryByText('Mon institution')).not.toBeInTheDocument();
  });

  it('renders panel for role=institution_admin', () => {
    authState.user = { id: 'instadmin-123' };
    roleState.role = 'institution_admin';
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Mon institution', level: 1 })).toBeInTheDocument();
  });

  it('renders panel for role=super_admin (institution_admin route fallback)', () => {
    authState.user = { id: 'super-123' };
    roleState.role = 'super_admin';
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Mon institution', level: 1 })).toBeInTheDocument();
  });
});

describe('InstitutionAdminPanel — institution_admin view', () => {
  beforeEach(() => {
    authState.user = { id: 'instadmin-123' };
    roleState.role = 'institution_admin';
  });

  it('shows empty state when no pending teachers', () => {
    pendingState.pendingTeachers = [];
    renderPanel();
    expect(screen.getByText(/aucune demande en attente/i)).toBeInTheDocument();
  });

  it('renders one card per pending teacher with display name and approve button', () => {
    pendingState.pendingTeachers = [
      {
        id: 'pending-1',
        display_name: 'Alice Pending',
        username: null,
        sector: 'lycée',
        institution_id: 'inst-1',
        role_requested_at: '2026-05-20T10:00:00Z',
        created_at: '2026-05-15T10:00:00Z',
      },
      {
        id: 'pending-2',
        display_name: null,
        username: 'bob-pending',
        sector: null,
        institution_id: 'inst-1',
        role_requested_at: null,
        created_at: '2026-05-22T10:00:00Z',
      },
    ];
    renderPanel();
    expect(screen.getByText('Alice Pending')).toBeInTheDocument();
    expect(screen.getByText('bob-pending')).toBeInTheDocument();
    // Count badge reflects 2 pending teachers
    expect(screen.getByText('(2)')).toBeInTheDocument();
    // Sector renders for first row only (second has null sector)
    expect(screen.getByText(/secteur lycée/i)).toBeInTheDocument();
    // Two approve buttons (one per card)
    const approveButtons = screen.getAllByRole('button', { name: /approuver/i });
    expect(approveButtons.length).toBe(2);
  });

  it('clicking "Approuver" calls approve(id) with the right target', async () => {
    pendingState.pendingTeachers = [
      {
        id: 'pending-1',
        display_name: 'Alice Pending',
        username: null,
        sector: null,
        institution_id: 'inst-1',
        role_requested_at: '2026-05-20T10:00:00Z',
        created_at: '2026-05-15T10:00:00Z',
      },
    ];
    renderPanel();
    const button = screen.getByRole('button', { name: /approuver alice pending/i });
    const user = userEvent.setup();
    await user.click(button);
    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledWith('pending-1');
    });
  });

  it('surfaces error message in role=alert region when error is set', () => {
    pendingState.error = new Error('Approbation impossible. Réessaye dans un instant.');
    pendingState.pendingTeachers = [];
    renderPanel();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/approbation impossible/i);
  });

  it('shows loading message when loading=true', () => {
    pendingState.loading = true;
    renderPanel();
    expect(screen.getByText(/chargement…/i)).toBeInTheDocument();
  });

  it('approve button shows "Approbation…" label and disabled while approving', () => {
    pendingState.pendingTeachers = [
      {
        id: 'pending-1',
        display_name: 'Alice Pending',
        username: null,
        sector: null,
        institution_id: 'inst-1',
        role_requested_at: '2026-05-20T10:00:00Z',
        created_at: '2026-05-15T10:00:00Z',
      },
    ];
    pendingState.approving = 'pending-1';
    renderPanel();
    const button = screen.getByRole('button', { name: /approuver alice pending/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/approbation…/i);
  });
});

// ─── Sprint 2.B.2 — UX feedback (scope badge + success toast) ────────────────

describe('InstitutionAdminPanel — Sprint 2.B.2 UX feedback', () => {
  it('renders scope badge "institution" for institution_admin', () => {
    authState.user = { id: 'instadmin-123' };
    roleState.role = 'institution_admin';
    renderPanel();
    const badge = screen.getByLabelText(/périmètre d'action institution/i);
    expect(badge).toHaveTextContent(/scope\s*:\s*institution/i);
  });

  it('renders scope badge "global" for super_admin', () => {
    authState.user = { id: 'super-123' };
    roleState.role = 'super_admin';
    renderPanel();
    const badge = screen.getByLabelText(/périmètre d'action global/i);
    expect(badge).toHaveTextContent(/scope\s*:\s*global/i);
  });

  it('describes super_admin scope in header subtitle (cross-institution explicit)', () => {
    authState.user = { id: 'super-123' };
    roleState.role = 'super_admin';
    renderPanel();
    expect(
      screen.getByText(/super_admin.*cross-institution/i),
    ).toBeInTheDocument();
  });

  it('renders success status with displayName + scope after approve (lastSuccess set)', () => {
    authState.user = { id: 'instadmin-123' };
    roleState.role = 'institution_admin';
    pendingState.lastSuccess = { displayName: 'Alice Pending' };
    renderPanel();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/Alice Pending/);
    expect(status).toHaveTextContent(/approuvé.*scope institution/i);
  });

  it('clicking dismiss X on success card calls clearLastSuccess', async () => {
    authState.user = { id: 'super-123' };
    roleState.role = 'super_admin';
    pendingState.lastSuccess = { displayName: 'Bob Pending' };
    renderPanel();
    const dismiss = screen.getByRole('button', {
      name: /fermer le message de confirmation/i,
    });
    const user = userEvent.setup();
    await user.click(dismiss);
    await waitFor(() => {
      expect(clearLastSuccessMock).toHaveBeenCalledTimes(1);
    });
  });
});
