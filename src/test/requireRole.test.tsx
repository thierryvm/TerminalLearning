/**
 * Tests for RequireRole — THI-225 Phase 9 Admin Panel.
 *
 * Couvre :
 *  - loading state pendant !initialized ou roleLoading (pas de flash fallback)
 *  - fallback "Vous devez être connecté" si pas d'user
 *  - fallback "Accès réservé" si user mais role non autorisé
 *  - custom fallbacks (forbiddenFallback, unauthenticatedFallback) override
 *  - children rendus si user + role dans allowed[]
 *  - multi-role allowed[] support (super_admin OR institution_admin)
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

import { RequireRole } from '../app/components/auth/RequireRole';
import type { UserRole } from '../app/types/database';

function renderGuarded(
  allowed: UserRole[],
  children: React.ReactNode,
  forbiddenFallback?: React.ReactNode,
  unauthenticatedFallback?: React.ReactNode,
) {
  return render(
    <MemoryRouter>
      <RequireRole
        allowed={allowed}
        forbiddenFallback={forbiddenFallback}
        unauthenticatedFallback={unauthenticatedFallback}
      >
        {children}
      </RequireRole>
    </MemoryRouter>,
  );
}

// Variant that lets a test set the initial pathname so we can assert
// the "Se connecter" handler stores the right returnTo path.
function renderGuardedAtRoute(
  allowed: UserRole[],
  children: React.ReactNode,
  initialPath: string,
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RequireRole allowed={allowed}>{children}</RequireRole>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.user = null;
  authState.initialized = true;
  roleState.role = null;
  roleState.loading = false;
});

describe('RequireRole — loading state', () => {
  it('renders "Chargement…" while auth is initialising', () => {
    authState.user = null;
    authState.initialized = false;
    renderGuarded(['super_admin'], <p>Admin content</p>);
    expect(screen.getByText('Chargement…')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(screen.queryByText(/accès réservé/i)).not.toBeInTheDocument();
  });

  it('renders "Chargement…" while role RPC is resolving for authenticated user', () => {
    authState.user = { id: 'user-123' };
    authState.initialized = true;
    roleState.role = null;
    roleState.loading = true;
    renderGuarded(['super_admin'], <p>Admin content</p>);
    expect(screen.getByText('Chargement…')).toBeInTheDocument();
    expect(screen.queryByText(/accès réservé/i)).not.toBeInTheDocument();
  });

  it('sets aria-busy on loading container', () => {
    authState.initialized = false;
    const { container } = renderGuarded(['super_admin'], <p>Admin content</p>);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});

describe('RequireRole — unauthenticated fallback', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('renders default "Vous devez être connecté" when no user', () => {
    authState.user = null;
    authState.initialized = true;
    renderGuarded(['super_admin'], <p>Admin content</p>);
    expect(screen.getByText(/vous devez être connecté/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('default fallback shows BOTH "Se connecter" and "Retour à l\'accueil" buttons', () => {
    authState.user = null;
    renderGuarded(['super_admin'], <p>Admin content</p>);
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l'accueil/i })).toBeInTheDocument();
  });

  it('clicking "Se connecter" stores the current pathname in sessionStorage', async () => {
    authState.user = null;
    renderGuardedAtRoute(['super_admin'], <p>Admin content</p>, '/app/admin');
    const loginBtn = screen.getByRole('button', { name: /se connecter/i });
    loginBtn.click();
    expect(window.sessionStorage.getItem('auth_return_to')).toBe('/app/admin');
  });

  it('"Se connecter" preserves location.search for invitation URLs (THI-235 étape 3)', async () => {
    authState.user = null;
    renderGuardedAtRoute(['student'], <p>Join page</p>, '/app/join?code=a4368184d202');
    const loginBtn = screen.getByRole('button', { name: /se connecter/i });
    loginBtn.click();
    expect(window.sessionStorage.getItem('auth_return_to')).toBe('/app/join?code=a4368184d202');
  });

  it('uses custom unauthenticated fallback when provided (no "Se connecter" button)', () => {
    authState.user = null;
    renderGuarded(
      ['super_admin'],
      <p>Admin content</p>,
      undefined,
      <p>Custom login prompt</p>,
    );
    expect(screen.getByText('Custom login prompt')).toBeInTheDocument();
    expect(screen.queryByText(/vous devez être connecté/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /se connecter/i })).not.toBeInTheDocument();
  });
});

describe('RequireRole — forbidden fallback (wrong role)', () => {
  it.each([
    ['student' as UserRole],
    ['pending_teacher' as UserRole],
    ['teacher' as UserRole],
    ['institution_admin' as UserRole],
  ])('renders "Accès réservé" when role is %s but allowed is [super_admin]', (currentRole) => {
    authState.user = { id: 'user-123' };
    roleState.role = currentRole;
    renderGuarded(['super_admin'], <p>Admin content</p>);
    expect(screen.getByText(/accès réservé/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('default fallback links to /app', () => {
    authState.user = { id: 'user-123' };
    roleState.role = 'student';
    renderGuarded(['super_admin'], <p>Admin content</p>);
    const link = screen.getByRole('link', { name: /retour au tableau de bord/i });
    expect(link).toHaveAttribute('href', '/app');
  });

  it('uses custom forbidden fallback when provided', () => {
    authState.user = { id: 'user-123' };
    roleState.role = 'student';
    renderGuarded(['super_admin'], <p>Admin content</p>, <p>Custom upgrade CTA</p>);
    expect(screen.getByText('Custom upgrade CTA')).toBeInTheDocument();
    expect(screen.queryByText(/accès réservé/i)).not.toBeInTheDocument();
  });

  it('forbids when role is null (RPC failed, defensive)', () => {
    authState.user = { id: 'user-123' };
    roleState.role = null;
    roleState.loading = false;
    renderGuarded(['super_admin'], <p>Admin content</p>);
    expect(screen.getByText(/accès réservé/i)).toBeInTheDocument();
  });
});

describe('RequireRole — authorized render', () => {
  it('renders children when role is super_admin and allowed=[super_admin]', () => {
    authState.user = { id: 'user-123' };
    roleState.role = 'super_admin';
    renderGuarded(['super_admin'], <p>Admin content</p>);
    expect(screen.getByText('Admin content')).toBeInTheDocument();
    expect(screen.queryByText(/accès réservé/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Chargement…')).not.toBeInTheDocument();
  });

  it('renders children when role matches any of multi-role allowed[]', () => {
    authState.user = { id: 'user-123' };
    roleState.role = 'institution_admin';
    renderGuarded(['super_admin', 'institution_admin'], <p>Admin content</p>);
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('forbids when role is teacher but allowed is [super_admin, institution_admin]', () => {
    authState.user = { id: 'user-123' };
    roleState.role = 'teacher';
    renderGuarded(['super_admin', 'institution_admin'], <p>Admin content</p>);
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(screen.getByText(/accès réservé/i)).toBeInTheDocument();
  });
});
