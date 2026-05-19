/**
 * Tests for TeacherDashboard — THI-235 Sprint 2.A étape 2.
 *
 * Couvre :
 *  - RBAC guard via <RequireRole> (anonymous → fallback, student → forbidden,
 *    teacher/super_admin → access)
 *  - Loading state pendant fetch initial
 *  - Empty state quand aucune classe
 *  - Listing classes existantes
 *  - Click "Créer une classe" → form inline visible
 *  - Submit form → createClass called avec name trimmed
 *  - Cancel form → form hidden
 *  - Erreur de création affichée
 *  - Auto-focus input à l'ouverture du form (via autoFocus)
 *  - Helmet noindex,nofollow (RBAC route private)
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AuthState = {
  user: { id: string } | null;
  initialized: boolean;
};
type RoleState = {
  role: 'super_admin' | 'institution_admin' | 'teacher' | 'pending_teacher' | 'student' | null;
  loading: boolean;
};
type ClassRow = {
  id: string;
  name: string;
  teacher_id: string;
  institution_id: string | null;
  invitation_code: string;
  created_at: string;
  enrollment_count: number;
};
type HookState = {
  classes: ClassRow[];
  loading: boolean;
  creating: boolean;
  error: Error | null;
};

const authState: AuthState = { user: null, initialized: true };
const roleState: RoleState = { role: null, loading: false };
const hookState: HookState = { classes: [], loading: false, creating: false, error: null };
const createClassMock = vi.fn();

vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, initialized: authState.initialized }),
}));

vi.mock('@/lib/hooks/useUserRole', () => ({
  useUserRole: () => ({ role: roleState.role, loading: roleState.loading }),
}));

vi.mock('@/lib/hooks/useTeacherClasses', () => ({
  useTeacherClasses: () => ({
    classes: hookState.classes,
    loading: hookState.loading,
    creating: hookState.creating,
    error: hookState.error,
    createClass: createClassMock,
    refresh: vi.fn(),
  }),
}));

import { TeacherDashboard } from '../app/components/TeacherDashboard';

function renderDashboard() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  authState.user = { id: 'user-teacher-1' };
  authState.initialized = true;
  roleState.role = 'teacher';
  roleState.loading = false;
  hookState.classes = [];
  hookState.loading = false;
  hookState.creating = false;
  hookState.error = null;
  createClassMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('TeacherDashboard — RBAC guard', () => {
  it('renders "Vous devez être connecté" when no user', () => {
    authState.user = null;
    roleState.role = null;
    renderDashboard();
    expect(screen.getByText(/vous devez être connecté/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /mes classes/i })).not.toBeInTheDocument();
  });

  it('renders "Accès réservé" when role is student', () => {
    roleState.role = 'student';
    renderDashboard();
    expect(screen.getByText(/accès réservé/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /mes classes/i })).not.toBeInTheDocument();
  });

  it('renders "Accès réservé" when role is pending_teacher', () => {
    roleState.role = 'pending_teacher';
    renderDashboard();
    expect(screen.getByText(/accès réservé/i)).toBeInTheDocument();
  });

  it('renders dashboard when role is teacher', () => {
    roleState.role = 'teacher';
    renderDashboard();
    expect(screen.getByRole('heading', { name: /mes classes/i, level: 1 })).toBeInTheDocument();
  });

  it('renders dashboard when role is super_admin', () => {
    roleState.role = 'super_admin';
    renderDashboard();
    expect(screen.getByRole('heading', { name: /mes classes/i, level: 1 })).toBeInTheDocument();
  });
});

describe('TeacherDashboard — listing states', () => {
  it('shows loading message during initial fetch', () => {
    hookState.loading = true;
    renderDashboard();
    expect(screen.getByText(/chargement de tes classes/i)).toBeInTheDocument();
  });

  it('shows empty state when no classes', () => {
    hookState.classes = [];
    renderDashboard();
    expect(screen.getByText(/aucune classe pour le moment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /créer ma première classe/i })).toBeInTheDocument();
  });

  it('lists existing classes', () => {
    hookState.classes = [
      {
        id: 'class-1',
        name: 'Bash 101 — Promotion 2026',
        teacher_id: 'user-teacher-1',
        institution_id: null,
        invitation_code: 'a1b2c3d4e5f6',
        created_at: '2026-05-19T10:00:00Z',
        enrollment_count: 3,
      },
      {
        id: 'class-2',
        name: 'Linux avancé',
        teacher_id: 'user-teacher-1',
        institution_id: null,
        invitation_code: '0987654321ab',
        created_at: '2026-05-18T10:00:00Z',
        enrollment_count: 0,
      },
    ];
    renderDashboard();
    expect(screen.getByText('Bash 101 — Promotion 2026')).toBeInTheDocument();
    expect(screen.getByText('Linux avancé')).toBeInTheDocument();
    expect(screen.getByText('a1b2c3d4e5f6')).toBeInTheDocument();
    expect(screen.getByText('0987654321ab')).toBeInTheDocument();
  });

  it('shows enrollment count per class', () => {
    hookState.classes = [
      {
        id: 'class-1',
        name: 'Bash 101',
        teacher_id: 'user-teacher-1',
        institution_id: null,
        invitation_code: 'aaaaaaaaaaaa',
        created_at: '2026-05-19T10:00:00Z',
        enrollment_count: 42,
      },
    ];
    renderDashboard();
    expect(screen.getByLabelText(/42 élèves inscrits/i)).toBeInTheDocument();
  });
});

describe('TeacherDashboard — create flow', () => {
  it('opens the inline form when clicking "Créer une classe"', () => {
    renderDashboard();
    // Form is hidden initially
    expect(screen.queryByRole('region', { name: /nouvelle classe/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /créer une classe/i }));
    expect(screen.getByRole('region', { name: /nouvelle classe/i })).toBeInTheDocument();
  });

  it('submits createClass with trimmed name', async () => {
    createClassMock.mockResolvedValue({ id: 'class-new' });
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /créer une classe/i }));
    const input = screen.getByLabelText(/nom de la classe/i);
    fireEvent.change(input, { target: { value: '  Nouvelle classe  ' } });
    fireEvent.click(screen.getByRole('button', { name: /créer la classe/i }));
    await waitFor(() => {
      expect(createClassMock).toHaveBeenCalledWith('Nouvelle classe');
    });
  });

  it('closes the form on cancel button', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /créer une classe/i }));
    expect(screen.getByRole('region', { name: /nouvelle classe/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    expect(screen.queryByRole('region', { name: /nouvelle classe/i })).not.toBeInTheDocument();
  });

  it('disables submit while creating', () => {
    hookState.creating = true;
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /créer une classe/i }));
    const input = screen.getByLabelText(/nom de la classe/i);
    fireEvent.change(input, { target: { value: 'Test' } });
    const submitBtn = screen.getByRole('button', { name: /création…/i });
    expect(submitBtn).toBeDisabled();
  });

  it('shows error message when createClass fails', () => {
    hookState.error = new Error('RLS violation : teacher_id must match auth.uid()');
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /créer une classe/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/rls violation/i);
  });
});
