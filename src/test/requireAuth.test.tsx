/**
 * Tests for RequireAuth — THI-221 opt-in auth guard wrapper.
 *
 * Covers :
 *  - loading state while session is initialising (no fallback flash)
 *  - default fallback when initialised but no user
 *  - custom fallback override prop
 *  - children rendered only when user is authenticated AND session initialised
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, it, expect, vi } from 'vitest';

type AuthState = {
  user: { email?: string } | null;
  initialized: boolean;
};

const authState: AuthState = { user: null, initialized: true };

vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, initialized: authState.initialized }),
}));

import { RequireAuth } from '../app/components/auth/RequireAuth';

function renderGuarded(children: React.ReactNode, fallback?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <RequireAuth fallback={fallback}>{children}</RequireAuth>
    </MemoryRouter>
  );
}

// Reset authState between tests to avoid order-dependent false positives.
beforeEach(() => {
  authState.user = null;
  authState.initialized = true;
});

describe('RequireAuth — loading state', () => {
  it('renders "Chargement…" while session is initialising and never shows fallback', () => {
    authState.user = null;
    authState.initialized = false;
    renderGuarded(<p>Protected content</p>);
    expect(screen.getByText('Chargement…')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText(/vous devez être connecté/i)).not.toBeInTheDocument();
  });

  it('sets aria-busy on the loading container for assistive tech', () => {
    authState.user = null;
    authState.initialized = false;
    const { container } = renderGuarded(<p>Protected content</p>);
    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
  });
});

describe('RequireAuth — fallback when unauthenticated', () => {
  it('renders the default "Vous devez être connecté" fallback when no user', () => {
    authState.user = null;
    authState.initialized = true;
    renderGuarded(<p>Protected content</p>);
    expect(screen.getByText(/vous devez être connecté/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('default fallback links to / for return to home', () => {
    authState.user = null;
    authState.initialized = true;
    renderGuarded(<p>Protected content</p>);
    const link = screen.getByRole('link', { name: /retour à l'accueil/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('uses custom fallback when provided', () => {
    authState.user = null;
    authState.initialized = true;
    renderGuarded(<p>Protected content</p>, <p>Custom denied page</p>);
    expect(screen.getByText('Custom denied page')).toBeInTheDocument();
    expect(screen.queryByText(/vous devez être connecté/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});

describe('RequireAuth — authenticated render', () => {
  it('renders children when user is present and session is initialised', () => {
    authState.user = { email: 'auth@example.com' };
    authState.initialized = true;
    renderGuarded(<p>Protected content</p>);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText(/vous devez être connecté/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Chargement…')).not.toBeInTheDocument();
  });
});
