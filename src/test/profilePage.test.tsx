/**
 * Tests for ProfilePage — THI-42 PR #1 shell.
 *
 * Covers:
 *  - authenticated user with avatar_url + full_name → renders identity card
 *  - authenticated user with email-only (no metadata) → falls back to email prefix as display name
 *  - authenticated user via Google → renders Google provider badge
 *  - authenticated user via GitHub → renders GitHub provider badge
 *  - authenticated user via email → renders generic email badge
 *  - environment switcher section renders current env label + shell preview
 *  - settings section links to /app/settings (THI-112 existing page)
 *  - back-link points to /app dashboard
 *  - unauthenticated user → renders fallback guard message
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

type AuthMock = {
  user: {
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  } | null;
  initialized: boolean;
};

const authState: AuthMock = { user: null, initialized: true };

vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, initialized: authState.initialized }),
}));

vi.mock('../app/context/EnvironmentContext', async () => {
  const actual = await vi.importActual<typeof import('../app/context/EnvironmentContext')>(
    '../app/context/EnvironmentContext'
  );
  return {
    ...actual,
    useEnvironment: () => ({
      selectedEnv: 'linux' as const,
      setEnvironment: vi.fn(),
    }),
  };
});

// THI-344 — ProfilePage edits the display_name via supabase.auth.updateUser
// (dynamic import). hoisted so the factory can reference the spy.
const { mockUpdateUser } = vi.hoisted(() => ({ mockUpdateUser: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { updateUser: mockUpdateUser } },
}));

import { ProfilePage } from '../app/components/ProfilePage';

function renderProfile() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

// ── Auth guard ────────────────────────────────────────────────────────────────

describe('ProfilePage — auth guard', () => {
  it('renders loading state while AuthContext is initialising', () => {
    authState.user = null;
    authState.initialized = false;
    renderProfile();
    expect(screen.getByText('Chargement…')).toBeInTheDocument();
    // The "vous devez être connecté" fallback must NOT flash for legitimate
    // users while their session is being resolved (security-auditor H1).
    expect(screen.queryByText(/vous devez être connecté/i)).not.toBeInTheDocument();
  });

  it('renders fallback message when initialised but no user is authenticated', () => {
    authState.user = null;
    authState.initialized = true;
    renderProfile();
    expect(screen.getByText(/vous devez être connecté/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l'accueil/i })).toBeInTheDocument();
  });
});

// ── Authenticated rendering ───────────────────────────────────────────────────

describe('ProfilePage — authenticated user', () => {
  it('renders display name and email from user_metadata', () => {
    authState.user = {
      email: 'thierry@example.com',
      user_metadata: { full_name: 'Thierry Vanmeeteren', avatar_url: 'https://example.com/avatar.png' },
      app_metadata: { provider: 'github' },
    };
    renderProfile();
    expect(screen.getByText('Thierry Vanmeeteren')).toBeInTheDocument();
    expect(screen.getByText('thierry@example.com')).toBeInTheDocument();
  });

  it('falls back to email prefix when no metadata is present', () => {
    authState.user = { email: 'fallback@example.com', user_metadata: {}, app_metadata: {} };
    renderProfile();
    expect(screen.getByText('fallback')).toBeInTheDocument();
  });

  it('renders GitHub provider badge when app_metadata.provider is "github"', () => {
    authState.user = {
      email: 'gh@example.com',
      user_metadata: { user_name: 'octocat', avatar_url: 'https://example.com/oc.png' },
      app_metadata: { provider: 'github' },
    };
    renderProfile();
    expect(screen.getByText(/connecté via github/i)).toBeInTheDocument();
  });

  it('renders Google provider badge when app_metadata.provider is "google"', () => {
    authState.user = {
      email: 'g@example.com',
      user_metadata: { full_name: 'Google User', picture: 'https://example.com/g.png' },
      app_metadata: { provider: 'google' },
    };
    renderProfile();
    expect(screen.getByText(/connecté via google/i)).toBeInTheDocument();
  });

  it('renders generic email badge when app_metadata.provider is "email"', () => {
    authState.user = {
      email: 'pure-email@example.com',
      user_metadata: {},
      app_metadata: { provider: 'email' },
    };
    renderProfile();
    expect(screen.getByText(/connecté par email/i)).toBeInTheDocument();
  });

  it('renders active environment section with shell + prompt preview', () => {
    authState.user = { email: 'env-test@example.com', user_metadata: {}, app_metadata: {} };
    renderProfile();
    expect(screen.getByText('Linux')).toBeInTheDocument();
    expect(screen.getByText(/bash \/ zsh/i)).toBeInTheDocument();
  });

  it('renders link to /app/settings for AI key + consent management', () => {
    authState.user = { email: 'settings@example.com', user_metadata: {}, app_metadata: {} };
    renderProfile();
    const settingsLink = screen.getByRole('link', { name: /paramètres ia/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/app/settings');
  });

  it('renders back-link to /app dashboard', () => {
    authState.user = { email: 'back@example.com', user_metadata: {}, app_metadata: {} };
    renderProfile();
    const backLink = screen.getByRole('link', { name: /retour au tableau de bord/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/app');
  });
});

// ── Display name edit (THI-344) ───────────────────────────────────────────────

describe('ProfilePage — display name edit', () => {
  beforeEach(() => {
    mockUpdateUser.mockReset();
    mockUpdateUser.mockResolvedValue({ error: null });
    authState.user = {
      email: 'edit@example.com',
      user_metadata: { full_name: 'Old Name' },
      app_metadata: { provider: 'email' },
    };
    authState.initialized = true;
  });

  it('enters edit mode showing the current name', () => {
    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /modifier le nom affiché/i }));
    expect(screen.getByRole('textbox', { name: /nom affiché/i })).toHaveValue('Old Name');
  });

  it('saves an edited display name via updateUser and exits edit mode', async () => {
    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /modifier le nom affiché/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /nom affiché/i }), { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith({ data: { full_name: 'New Name' } }),
    );
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
  });

  it('trims whitespace before saving', async () => {
    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /modifier le nom affiché/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /nom affiché/i }), { target: { value: '  Spaced  ' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith({ data: { full_name: 'Spaced' } }),
    );
  });

  it('rejects an empty name without calling updateUser', async () => {
    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /modifier le nom affiché/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /nom affiché/i }), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('cancels edit mode without calling updateUser', () => {
    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /modifier le nom affiché/i }));
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('surfaces an error when updateUser fails', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Network down' } });
    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /modifier le nom affiché/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /nom affiché/i }), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/network down/i));
    // stays in edit mode so the user can retry
    expect(screen.getByRole('textbox', { name: /nom affiché/i })).toBeInTheDocument();
  });
});
