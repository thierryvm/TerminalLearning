/**
 * Tests for MySupportTickets — THI-325 Étape 5 (« Mes signalements », /app/support).
 *
 * Covers:
 *  - unauthenticated → RequireAuth fallback (never the ticket list)
 *  - authenticated + loading → loading state
 *  - authenticated + empty → empty-state copy
 *  - authenticated + tickets → type/status labels, description, "capture jointe"
 *    marker (no <img>), "Résolu le …" line
 *  - authenticated + error → error message surfaced
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupportTicket } from '@/lib/hooks/useSupportTickets';
import type { UseMySupportTicketsResult } from '@/lib/hooks/useMySupportTickets';

const authState: { user: { id: string } | null; initialized: boolean } = {
  user: { id: 'u1' },
  initialized: true,
};

const hookState: UseMySupportTicketsResult = {
  tickets: [],
  loading: false,
  error: null,
  refresh: vi.fn(),
};

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, initialized: authState.initialized }),
}));

vi.mock('@/lib/hooks/useMySupportTickets', () => ({
  useMySupportTickets: () => hookState,
}));

const { MySupportTickets } = await import('@/app/components/support/MySupportTickets');

function ticket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 't1',
    user_id: 'u1',
    type: 'bug',
    description: 'Le terminal ne répond plus',
    screenshot_url: null,
    status: 'open',
    created_at: '2026-06-01T10:00:00Z',
    resolved_at: null,
    resolved_by: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <MySupportTickets />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  authState.user = { id: 'u1' };
  authState.initialized = true;
  hookState.tickets = [];
  hookState.loading = false;
  hookState.error = null;
});

describe('MySupportTickets — auth guard', () => {
  it('renders the RequireAuth fallback (not the list) for an anonymous visitor', () => {
    authState.user = null;
    renderPage();
    expect(screen.getByText(/vous devez être connecté pour voir vos signalements/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l'accueil/i })).toBeInTheDocument();
    expect(screen.queryByText(/mes signalements/i)).not.toBeInTheDocument();
  });
});

describe('MySupportTickets — authenticated', () => {
  it('shows the loading state while fetching', () => {
    hookState.loading = true;
    renderPage();
    expect(screen.getByText('Chargement…')).toBeInTheDocument();
  });

  it('shows the empty state when the user has no tickets', () => {
    hookState.tickets = [];
    renderPage();
    expect(screen.getByText(/aucun signalement pour l'instant/i)).toBeInTheDocument();
  });

  it('renders a ticket with type, status label and description', () => {
    hookState.tickets = [ticket({ type: 'suggestion', status: 'in_progress', description: 'Ajouter un mode clair' })];
    renderPage();
    expect(screen.getByText('Suggestion')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByText('Ajouter un mode clair')).toBeInTheDocument();
  });

  it('shows a "capture jointe" marker (no image) when a screenshot is attached', () => {
    hookState.tickets = [ticket({ screenshot_url: 'https://x.supabase.co/storage/v1/object/sign/support_screenshots/u1/a.png?token=t' })];
    renderPage();
    expect(screen.getByText(/capture jointe/i)).toBeInTheDocument();
    // v1 must NOT render the uploaded image inline.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the resolution date for a resolved ticket', () => {
    hookState.tickets = [ticket({ status: 'resolved', resolved_at: '2026-06-02T09:00:00Z' })];
    renderPage();
    expect(screen.getByText('Résolu')).toBeInTheDocument();
    expect(screen.getByText(/résolu le/i)).toBeInTheDocument();
  });

  it('surfaces a fetch error', () => {
    hookState.error = new Error('Chargement des signalements impossible');
    renderPage();
    expect(screen.getByText('Chargement des signalements impossible')).toBeInTheDocument();
  });
});
