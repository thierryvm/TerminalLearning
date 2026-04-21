import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

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

function renderCard() {
  return render(
    <MemoryRouter>
      <UserMenu syncStatus="local" />
    </MemoryRouter>,
  );
}

function renderCompact() {
  return render(
    <MemoryRouter>
      <UserMenu syncStatus="synced" variant="compact" />
    </MemoryRouter>,
  );
}

// ── Card variant (sidebar) ────────────────────────────────────────────────────

describe('UserMenu card variant (sidebar)', () => {
  beforeEach(() => {
    mockSignOut.mockResolvedValue(undefined);
    mockNavigate.mockClear();
    mockSignOut.mockClear();
  });

  it('renders sign-out button directly without opening a dropdown', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
  });

  it('shows display name derived from email', () => {
    renderCard();
    // displayName falls back to email prefix when user_metadata is empty
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('shows sync status label', () => {
    renderCard();
    expect(screen.getByText('Local')).toBeInTheDocument();
  });

  it('calls signOut and navigates to "/" on click', async () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /se déconnecter/i }));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledOnce());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('disables the button while signing out', async () => {
    // signOut never resolves so the button stays disabled
    mockSignOut.mockReturnValue(new Promise(() => {}));
    renderCard();
    const btn = screen.getByRole('button', { name: /se déconnecter/i });
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
  });
});

// ── Compact variant (landing header) ─────────────────────────────────────────

describe('UserMenu compact variant (landing header)', () => {
  beforeEach(() => {
    mockSignOut.mockResolvedValue(undefined);
    mockNavigate.mockClear();
    mockSignOut.mockClear();
  });

  it('renders avatar trigger button', () => {
    renderCompact();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not show sign-out before the dropdown is opened', () => {
    renderCompact();
    expect(screen.queryByText(/se déconnecter/i)).not.toBeInTheDocument();
  });

  it('opens dropdown and shows sign-out on trigger click', () => {
    renderCompact();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/se déconnecter/i)).toBeInTheDocument();
  });

  it('shows user email in open dropdown', () => {
    renderCompact();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThanOrEqual(1);
  });

  it('calls signOut and navigates to "/" from dropdown', async () => {
    renderCompact();
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText(/se déconnecter/i));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledOnce());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('closes dropdown synchronously on sign-out click', async () => {
    mockSignOut.mockReturnValue(new Promise(() => {})); // never resolves
    renderCompact();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/se déconnecter/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/se déconnecter/i));
    await waitFor(() => expect(screen.queryByText(/se déconnecter/i)).not.toBeInTheDocument());
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
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
