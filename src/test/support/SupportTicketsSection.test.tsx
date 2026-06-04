/**
 * Tests for SupportTicketsSection (THI-320, Étape 4 super_admin triage UI).
 *
 * The hook is mocked — here we assert the rendering contract: status/type badges,
 * status filter, status <select> wiring, lazy screenshot reveal via re-minted URL,
 * description rendered as escaped text (never parsed as HTML), empty + error states.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  state: {
    tickets: [] as Array<Record<string, unknown>>,
    loading: false,
    error: null as Error | null,
    updatingId: null as string | null,
    deletingId: null as string | null,
    updateStatus: vi.fn(),
    deleteTicket: vi.fn(),
    refresh: vi.fn(),
  },
  getFresh: vi.fn(),
}));

vi.mock('@/lib/hooks/useSupportTickets', () => ({
  useSupportTickets: () => h.state,
  getFreshScreenshotUrl: (...args: unknown[]) => h.getFresh(...args),
}));

const { SupportTicketsSection } = await import('@/app/components/SupportTicketsSection');

function ticket(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    user_id: 'u1',
    type: 'bug',
    description: 'Le bouton ne marche pas',
    screenshot_url: null,
    status: 'open',
    created_at: '2026-06-01T10:00:00Z',
    resolved_at: null,
    resolved_by: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.state.tickets = [];
  h.state.loading = false;
  h.state.error = null;
  h.state.updatingId = null;
  h.state.deletingId = null;
  h.state.updateStatus = vi.fn().mockResolvedValue(true);
  h.state.deleteTicket = vi.fn().mockResolvedValue(true);
  h.getFresh = vi.fn();
});

describe('SupportTicketsSection', () => {
  it('renders the empty state when there are no tickets', () => {
    render(<SupportTicketsSection />);
    expect(screen.getByText(/Aucun signalement pour le moment/)).toBeInTheDocument();
  });

  it('surfaces an error from the hook', () => {
    h.state.error = new Error('Chargement des tickets impossible');
    render(<SupportTicketsSection />);
    expect(screen.getByRole('alert')).toHaveTextContent('Chargement des tickets impossible');
  });

  it('renders a ticket with type + status labels and the description', () => {
    h.state.tickets = [ticket({ type: 'suggestion', status: 'in_progress' })];
    render(<SupportTicketsSection />);
    expect(screen.getByText('Suggestion')).toBeInTheDocument();
    expect(screen.getByText('Le bouton ne marche pas')).toBeInTheDocument();
    // the native status select reflects the current value
    expect(screen.getByLabelText('Statut')).toHaveValue('in_progress');
  });

  it('renders the description as escaped text, never as parsed HTML (XSS defense)', () => {
    h.state.tickets = [ticket({ description: '<img src=x onerror=alert(1)> <b>x</b>' })];
    const { container } = render(<SupportTicketsSection />);
    // The literal string is present as a text node…
    expect(screen.getByText('<img src=x onerror=alert(1)> <b>x</b>')).toBeInTheDocument();
    // …and no element was injected from the description.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('filters tickets by status', () => {
    h.state.tickets = [
      ticket({ id: 'a', status: 'open', description: 'OPEN ONE' }),
      ticket({ id: 'b', status: 'resolved', description: 'RESOLVED ONE' }),
    ];
    render(<SupportTicketsSection />);
    expect(screen.getByText('OPEN ONE')).toBeInTheDocument();
    expect(screen.getByText('RESOLVED ONE')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Résolu \(1\)/ }));

    expect(screen.queryByText('OPEN ONE')).not.toBeInTheDocument();
    expect(screen.getByText('RESOLVED ONE')).toBeInTheDocument();
  });

  it('calls updateStatus when the status select changes', () => {
    h.state.tickets = [ticket({ id: 't9', status: 'open' })];
    render(<SupportTicketsSection />);
    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'resolved' } });
    expect(h.state.updateStatus).toHaveBeenCalledWith('t9', 'resolved');
  });

  it('reveals the screenshot via a freshly re-minted signed URL, rendered as <img>', async () => {
    h.getFresh.mockResolvedValue('https://jdnukbpkjyyyjpuwgxhv.supabase.co/storage/v1/object/sign/support_screenshots/u1/x.png?token=fresh');
    h.state.tickets = [ticket({ screenshot_url: 'https://stored/object/sign/support_screenshots/u1/x.png?token=old' })];
    render(<SupportTicketsSection />);

    fireEvent.click(screen.getByRole('button', { name: /Voir la capture/ }));

    const img = await screen.findByRole('img', { name: /Capture/ });
    expect(img).toHaveAttribute('src', expect.stringContaining('token=fresh'));
    expect(h.getFresh).toHaveBeenCalledWith('https://stored/object/sign/support_screenshots/u1/x.png?token=old');
  });

  it('shows a fallback when the screenshot URL cannot be re-minted', async () => {
    h.getFresh.mockResolvedValue(null);
    h.state.tickets = [ticket({ screenshot_url: 'https://stored/object/sign/support_screenshots/u1/x.png?token=old' })];
    render(<SupportTicketsSection />);

    fireEvent.click(screen.getByRole('button', { name: /Voir la capture/ }));

    await waitFor(() =>
      expect(screen.getByText(/Capture indisponible/)).toBeInTheDocument(),
    );
  });

  it('does not re-mint twice when "Voir la capture" is clicked while already loading', async () => {
    let resolve!: (v: string | null) => void;
    h.getFresh.mockReturnValue(
      new Promise<string | null>((r) => {
        resolve = r;
      }),
    );
    h.state.tickets = [
      ticket({ screenshot_url: 'https://stored/object/sign/support_screenshots/u1/x.png?token=old' }),
    ];
    render(<SupportTicketsSection />);

    const btn = screen.getByRole('button', { name: /Voir la capture/ });
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
    fireEvent.click(btn); // ignored while loading

    resolve('https://jdnukbpkjyyyjpuwgxhv.supabase.co/storage/v1/object/sign/support_screenshots/u1/x.png?token=fresh');
    await screen.findByRole('img', { name: /Capture/ });
    expect(h.getFresh).toHaveBeenCalledTimes(1);
  });

  it('shows the resolved date marker for resolved tickets', () => {
    h.state.tickets = [ticket({ status: 'resolved', resolved_at: '2026-06-01T11:00:00Z' })];
    render(<SupportTicketsSection />);
    expect(screen.getByText(/Résolu le/)).toBeInTheDocument();
  });

  it('omits the resolved date marker when resolved_at is unknown (no badge duplicate)', () => {
    h.state.tickets = [ticket({ status: 'resolved', resolved_at: null })];
    render(<SupportTicketsSection />);
    expect(screen.queryByText(/Résolu le/)).not.toBeInTheDocument();
  });

  it('deletes a ticket only after the inline two-step confirm', () => {
    h.state.tickets = [ticket({ id: 'tdel' })];
    render(<SupportTicketsSection />);
    // Step 1 — "Supprimer" reveals the confirm but does NOT delete yet.
    fireEvent.click(screen.getByRole('button', { name: /Supprimer le signalement/ }));
    expect(h.state.deleteTicket).not.toHaveBeenCalled();
    // Step 2 — "Confirmer" triggers the delete.
    fireEvent.click(screen.getByRole('button', { name: /Confirmer la suppression/ }));
    expect(h.state.deleteTicket).toHaveBeenCalledWith('tdel');
  });

  it('cancels the delete confirm without deleting', () => {
    h.state.tickets = [ticket({ id: 'tdel' })];
    render(<SupportTicketsSection />);
    fireEvent.click(screen.getByRole('button', { name: /Supprimer le signalement/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Annuler$/ }));
    expect(h.state.deleteTicket).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Supprimer le signalement/ })).toBeInTheDocument();
  });
});
