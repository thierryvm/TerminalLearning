/**
 * Tests for SupportTicketModal — Sprint 2.C Étape 2 (THI-295).
 *
 * The submit pipeline (`submitTicket`) is mocked so these tests exercise the
 * component's validation, file guards, a11y wiring and submit/success/error
 * states without touching Supabase. The real constants (limits) are preserved
 * via importOriginal so the component's thresholds stay in sync with the helper.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SupportTicketModal } from '@/app/components/support/SupportTicketModal';
import { submitTicket, MAX_SCREENSHOT_BYTES } from '@/lib/support/submitTicket';

vi.mock('@/lib/support/submitTicket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/support/submitTicket')>();
  return { ...actual, submitTicket: vi.fn() };
});

const submitMock = submitTicket as unknown as Mock;
const USER_ID = '00000000-0000-0000-0000-000000000001';

function renderModal(onClose = vi.fn()) {
  render(<SupportTicketModal userId={USER_ID} onClose={onClose} />);
  return { onClose };
}

beforeEach(() => {
  submitMock.mockReset();
  submitMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SupportTicketModal — render', () => {
  it('renders the dialog with title, type options, description and disclaimer', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: /Signaler un problème/i })).toBeInTheDocument();
    for (const label of ['Bug', 'Suggestion', 'Question']) {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/Ne partage pas d’email perso/i)).toBeInTheDocument();
  });
});

describe('SupportTicketModal — description validation', () => {
  it('disables submit until the description reaches the minimum length', async () => {
    const user = userEvent.setup();
    renderModal();
    const submit = screen.getByRole('button', { name: /Envoyer/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Description/i), 'court'); // 5 chars
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Description/i), ' mais assez long maintenant');
    expect(submit).toBeEnabled();
  });
});

describe('SupportTicketModal — screenshot guards', () => {
  it('rejects a non-image file with an inline error', async () => {
    renderModal();
    const input = screen.getByLabelText(/Capture d’écran/i) as HTMLInputElement;
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    // fireEvent.change drives onChange directly with a non-image File — this
    // exercises the component's own MIME guard (defense in depth for drag-drop /
    // OS "all files" pickers where the `accept` attribute is not enforced).
    // userEvent.upload filters by `accept` even with applyAccept:false in this
    // version, so it can't deliver a text/plain file to the handler.
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText(/Format non supporté/i)).toBeInTheDocument();
  });

  it('rejects an oversized image (> 5 Mo)', async () => {
    const user = userEvent.setup();
    renderModal();
    const big = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: MAX_SCREENSHOT_BYTES + 1 });
    await user.upload(screen.getByLabelText(/Capture d’écran/i), big);
    expect(await screen.findByText(/Image trop lourde/i)).toBeInTheDocument();
  });
});

describe('SupportTicketModal — submit flow', () => {
  it('submits with the selected type + description and shows the success state', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('radio', { name: 'Suggestion' }));
    await user.type(screen.getByLabelText(/Description/i), 'Une idée vraiment utile pour la suite');
    await user.click(screen.getByRole('button', { name: /Envoyer/i }));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, type: 'suggestion' }),
    );
    expect(await screen.findByText(/ton signalement a bien été envoyé/i)).toBeInTheDocument();
    // Auto-close fires after the success delay.
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('surfaces the helper error message and does NOT auto-close', async () => {
    submitMock.mockResolvedValue({ error: 'Impossible d’envoyer le signalement pour le moment.' });
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.type(screen.getByLabelText(/Description/i), 'Un bug reproductible à signaler');
    await user.click(screen.getByRole('button', { name: /Envoyer/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Impossible d’envoyer/i);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('SupportTicketModal — close affordances', () => {
  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the Annuler button', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole('button', { name: /Annuler/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
