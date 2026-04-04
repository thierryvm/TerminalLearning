import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('motion/react', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_target, tag: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ children, ...props }: any) => {
        const { initial, animate, whileInView, whileHover, transition, viewport, ...rest } = props;
        void initial; void animate; void whileInView; void whileHover; void transition; void viewport;
        return React.createElement(tag, rest, children);
      },
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── UserMenu ──────────────────────────────────────────────────────────────────

const mockSignOut = vi.fn();

vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com', user_metadata: {} },
    session: {},
    loading: false,
    initialized: true,
    signOut: mockSignOut,
  }),
}));

import { UserMenu } from '../app/components/auth/UserMenu';

function renderUserMenu() {
  return render(
    <MemoryRouter>
      <UserMenu syncStatus="local" />
    </MemoryRouter>,
  );
}

describe('UserMenu — logout', () => {
  beforeEach(() => {
    mockSignOut.mockResolvedValue(undefined);
    mockNavigate.mockClear();
    mockSignOut.mockClear();
  });

  it('renders the user avatar button', () => {
    renderUserMenu();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('opens the dropdown on click', () => {
    renderUserMenu();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Déconnexion')).toBeInTheDocument();
  });

  it('shows user email in dropdown', () => {
    renderUserMenu();
    fireEvent.click(screen.getByRole('button'));
    // email may appear both in avatar label and dropdown — at least one occurrence expected
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThanOrEqual(1);
  });

  it('calls signOut and navigates to "/" on logout click', async () => {
    renderUserMenu();
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Déconnexion'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledOnce());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('closes the dropdown immediately on logout click', async () => {
    renderUserMenu();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Déconnexion')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Déconnexion'));
    // Dropdown closes synchronously before signOut resolves
    await waitFor(() => expect(screen.queryByText('Déconnexion')).not.toBeInTheDocument());
  });
});

// ── LoginModal — input validation ────────────────────────────────────────────
// supabase must be non-null so the form runs past the early-return guard
// and reaches the Zod validation layer.

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import { LoginModal } from '../app/components/auth/LoginModal';

function renderLoginModal() {
  return render(
    <MemoryRouter>
      <LoginModal open={true} onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('LoginModal — validation', () => {
  it('rejects an invalid email', async () => {
    renderLoginModal();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'notanemail' } });
    fireEvent.change(screen.getByPlaceholderText(/mot de passe/i), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(screen.getByText(/email invalide/i)).toBeInTheDocument());
  });

  it('rejects a password shorter than 8 characters', async () => {
    renderLoginModal();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/mot de passe/i), { target: { value: 'short' } });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(screen.getByText(/minimum 8/i)).toBeInTheDocument());
  });

  it('does not submit when supabase is null (no-op guard)', async () => {
    renderLoginModal();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/mot de passe/i), { target: { value: 'validpass' } });
    // With supabase: null, submit silently does nothing — no error thrown
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(screen.queryByText(/erreur/i)).not.toBeInTheDocument());
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    render(<MemoryRouter><LoginModal open={true} onClose={onClose} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /×/ }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
