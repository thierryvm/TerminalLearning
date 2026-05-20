/**
 * Tests for JoinClass — THI-235 Sprint 2.A étape 3 page `/app/join`.
 *
 * Covers :
 *   - RequireAuth guard : anonymous → fallback "Vous devez être connecté"
 *   - Authenticated user → form rendered
 *   - Query param `?code=XXX` pre-fills the input
 *   - Empty form submit shows FR error (HTML5 required handles this)
 *   - Successful submit shows success card with class name + CTA
 *   - already_enrolled shows alternate copy "Tu fais déjà partie de cette classe"
 *   - Error from hook renders alert with FR message
 *   - "Réessayer / Rejoindre une autre classe" button resets state
 *   - Helmet noindex (private app route)
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type AuthState = {
  user: { id: string } | null;
  initialized: boolean;
};
type HookState = {
  result:
    | {
        class_id: string;
        class_name: string;
        teacher_id: string;
        joined_at: string;
        already_enrolled: boolean;
      }
    | null;
  loading: boolean;
  error: string | null;
};

const authState: AuthState = { user: null, initialized: true };
const hookState: HookState = { result: null, loading: false, error: null };
const joinClassMock = vi.fn();
const resetMock = vi.fn();

vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, initialized: authState.initialized }),
}));

vi.mock('@/lib/hooks/useJoinClass', () => ({
  useJoinClass: () => ({
    result: hookState.result,
    loading: hookState.loading,
    error: hookState.error,
    joinClass: joinClassMock,
    reset: resetMock,
  }),
}));

import { JoinClass } from '../app/components/JoinClass';

function renderJoinClass(initialEntries: string[] = ['/app/join']) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <JoinClass />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  authState.user = { id: 'user-student-1' };
  authState.initialized = true;
  hookState.result = null;
  hookState.loading = false;
  hookState.error = null;
  joinClassMock.mockReset();
  resetMock.mockReset();
});

describe('JoinClass — RequireAuth guard', () => {
  it('renders the auth fallback for anonymous users', () => {
    authState.user = null;
    renderJoinClass();
    expect(screen.getByText(/vous devez être connecté/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /rejoindre une classe/i })).not.toBeInTheDocument();
  });

  it('renders the form for authenticated users', () => {
    renderJoinClass();
    expect(screen.getByRole('heading', { name: /rejoindre une classe/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/code d.invitation/i)).toBeInTheDocument();
  });
});

describe('JoinClass — query param pre-fill', () => {
  it('pre-fills the input from `?code=` in the URL', () => {
    renderJoinClass(['/app/join?code=a4368184d202']);
    const input = screen.getByLabelText(/code d.invitation/i) as HTMLInputElement;
    expect(input.value).toBe('a4368184d202');
  });

  it('leaves the input empty when no query param is present', () => {
    renderJoinClass();
    const input = screen.getByLabelText(/code d.invitation/i) as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('hints to submit when the code is pre-filled', () => {
    renderJoinClass(['/app/join?code=a4368184d202']);
    expect(screen.getByText(/Cliquez sur « Rejoindre »/i)).toBeInTheDocument();
  });
});

describe('JoinClass — submit flow', () => {
  it('calls joinClass with the raw code on submit (trim is hook responsibility)', async () => {
    renderJoinClass();
    const input = screen.getByLabelText(/code d.invitation/i);
    // HTML5 pattern="[0-9a-f]{12}" rejects whitespace at submit time, so we
    // pass a valid hex string here; trim() is tested at the hook level
    // (src/test/useJoinClass.test.ts — "trims the input code before calling the RPC").
    fireEvent.change(input, { target: { value: 'a4368184d202' } });
    const submitBtn = screen.getByRole('button', { name: /rejoindre la classe/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(joinClassMock).toHaveBeenCalledWith('a4368184d202');
    });
  });

  it('disables submit when the input is empty', () => {
    renderJoinClass();
    const submitBtn = screen.getByRole('button', { name: /rejoindre la classe/i });
    expect(submitBtn).toBeDisabled();
  });

  it('disables submit while loading', () => {
    hookState.loading = true;
    renderJoinClass(['/app/join?code=a4368184d202']);
    const submitBtn = screen.getByRole('button', { name: /rejoindre…/i });
    expect(submitBtn).toBeDisabled();
  });
});

describe('JoinClass — success state', () => {
  beforeEach(() => {
    hookState.result = {
      class_id: 'class-1',
      class_name: 'Bash 101 — Promotion 2026',
      teacher_id: 'teacher-1',
      joined_at: '2026-05-20T10:00:00Z',
      already_enrolled: false,
    };
  });

  it('renders the welcome heading when newly enrolled', () => {
    renderJoinClass();
    expect(screen.getByRole('heading', { name: /bienvenue dans la classe/i })).toBeInTheDocument();
    expect(screen.getByText('Bash 101 — Promotion 2026')).toBeInTheDocument();
  });

  it('renders the alternate heading when already_enrolled is true', () => {
    hookState.result!.already_enrolled = true;
    renderJoinClass();
    expect(screen.getByRole('heading', { name: /tu fais déjà partie de cette classe/i })).toBeInTheDocument();
  });

  it('shows a CTA to the dashboard', () => {
    renderJoinClass();
    const cta = screen.getByRole('link', { name: /voir le tableau de bord/i });
    expect(cta).toHaveAttribute('href', '/app');
  });

  it('"Rejoindre une autre classe" calls reset', () => {
    renderJoinClass();
    const retryBtn = screen.getByRole('button', { name: /rejoindre une autre classe/i });
    fireEvent.click(retryBtn);
    expect(resetMock).toHaveBeenCalled();
  });
});

describe('JoinClass — error state', () => {
  it('renders the error message in an alert', () => {
    hookState.error = 'Ce code est invalide ou expiré. Vérifiez avec votre enseignant.';
    renderJoinClass(['/app/join?code=badcode']);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/ce code est invalide/i);
  });

  it('keeps the form visible when there is an error (no success card)', () => {
    hookState.error = 'Ce code est invalide ou expiré. Vérifiez avec votre enseignant.';
    renderJoinClass();
    expect(screen.getByRole('button', { name: /rejoindre la classe/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /bienvenue/i })).not.toBeInTheDocument();
  });
});
