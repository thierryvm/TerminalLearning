/**
 * Tests for StaffQuickActions — THI-235 Sprint 2.A étape 2.bis.
 *
 * Covers :
 *   - Renders nothing for anonymous (role = null)
 *   - Renders nothing for student
 *   - Renders nothing for pending_teacher (status-only role, no tools yet)
 *   - Renders nothing for institution_admin (Sprint 2.B will add its own card)
 *   - Renders "Mes classes" card for teacher
 *   - Renders "Mes classes" + "Administration" cards for super_admin
 *   - Cards link to correct routes (/app/teacher, /app/admin)
 *   - Section has aria-labelledby for accessibility
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, it, expect, vi } from 'vitest';

type RoleState = {
  role: 'super_admin' | 'institution_admin' | 'teacher' | 'pending_teacher' | 'student' | null;
  loading: boolean;
};

const roleState: RoleState = { role: null, loading: false };

vi.mock('@/lib/hooks/useUserRole', () => ({
  useUserRole: () => ({ role: roleState.role, loading: roleState.loading }),
}));

import { StaffQuickActions } from '../app/components/dashboard/StaffQuickActions';

function renderQuickActions() {
  return render(
    <MemoryRouter>
      <StaffQuickActions />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  roleState.role = null;
  roleState.loading = false;
});

describe('StaffQuickActions — hidden for non-staff roles', () => {
  it.each([
    ['anonymous (null role)', null],
    ['student', 'student' as const],
    ['pending_teacher', 'pending_teacher' as const],
    ['institution_admin', 'institution_admin' as const],
  ])('renders nothing for %s', (_label, role) => {
    roleState.role = role;
    const { container } = renderQuickActions();
    expect(container.firstChild).toBeNull();
  });
});

describe('StaffQuickActions — teacher role', () => {
  it('renders only the "Mes classes" card', () => {
    roleState.role = 'teacher';
    renderQuickActions();
    expect(screen.getByText('Mes classes')).toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  it('"Mes classes" card links to /app/teacher', () => {
    roleState.role = 'teacher';
    renderQuickActions();
    const link = screen.getByRole('link', { name: /mes classes/i });
    expect(link).toHaveAttribute('href', '/app/teacher');
  });

  it('renders the section heading "MES OUTILS"', () => {
    roleState.role = 'teacher';
    renderQuickActions();
    expect(screen.getByRole('heading', { name: /mes outils/i })).toBeInTheDocument();
  });
});

describe('StaffQuickActions — super_admin role', () => {
  it('renders BOTH "Mes classes" and "Administration" cards', () => {
    roleState.role = 'super_admin';
    renderQuickActions();
    expect(screen.getByText('Mes classes')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('"Administration" card links to /app/admin', () => {
    roleState.role = 'super_admin';
    renderQuickActions();
    const link = screen.getByRole('link', { name: /administration/i });
    expect(link).toHaveAttribute('href', '/app/admin');
  });
});

describe('StaffQuickActions — accessibility', () => {
  it('section is aria-labelledby the "Mes outils" heading', () => {
    roleState.role = 'teacher';
    const { container } = renderQuickActions();
    const section = container.querySelector('section');
    expect(section).toHaveAttribute('aria-labelledby', 'staff-quick-actions-heading');
    const heading = container.querySelector('#staff-quick-actions-heading');
    expect(heading).toHaveTextContent(/mes outils/i);
  });
});
