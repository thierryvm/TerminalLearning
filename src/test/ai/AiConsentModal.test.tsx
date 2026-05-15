/**
 * Tests for src/app/components/ai/AiConsentModal.tsx — THI-112 Phase A commit 2.
 *
 * Covers the standalone consent block extracted from AiTutorPanel. The
 * consent persistence itself (versioned JSON record with timestamp +
 * expiry — the M3-AI fix) is exercised separately in `consent.test.ts`;
 * this file focuses on the UI contract.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { AiConsentModal } from '@/app/components/ai/AiConsentModal';

function renderModal() {
  const onAccept = vi.fn();
  const utils = render(
    <MemoryRouter>
      <AiConsentModal onAccept={onAccept} />
    </MemoryRouter>,
  );
  return { ...utils, onAccept };
}

describe('AiConsentModal — disclosure body', () => {
  it('lists the three GDPR-aligned disclosure points', () => {
    renderModal();
    expect(
      screen.getByText(/Ta clé API reste stockée sur/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/directement au provider choisi/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tu peux supprimer ta clé à tout moment/i),
    ).toBeInTheDocument();
  });

  it('links to the AI section of the privacy policy', () => {
    renderModal();
    const link = screen.getByRole('link', {
      name: /section IA de la politique de confidentialité/i,
    });
    expect(link).toHaveAttribute('href', '/privacy#ai-processing');
  });

  it('mentions the 12-month consent validity', () => {
    renderModal();
    expect(screen.getByText(/12 mois/i)).toBeInTheDocument();
  });
});

describe('AiConsentModal — accept gate', () => {
  it('disables the accept button until the checkbox is ticked', () => {
    renderModal();
    const button = screen.getByRole('button', {
      name: /Accepter et utiliser/i,
    });
    expect(button).toBeDisabled();
  });

  it('enables the accept button after the checkbox is ticked', async () => {
    const user = userEvent.setup();
    renderModal();
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    const button = screen.getByRole('button', {
      name: /Accepter et utiliser/i,
    });
    expect(button).toBeEnabled();
  });

  it('does NOT call onAccept while the checkbox is unticked even if the button is forced', async () => {
    // Defence-in-depth: do not rely on the `disabled` attribute alone.
    // `fireEvent.click` bypasses the userEvent disabled-check, simulating
    // an adversarial path (devtools removing `disabled`, automation, etc).
    // The in-component `handleAccept` must still refuse to fire onAccept
    // because `checked` is `false`. Sourcery review on PR #228.
    const { onAccept } = renderModal();
    const button = screen.getByRole('button', {
      name: /Accepter et utiliser/i,
    });
    button.removeAttribute('disabled');
    fireEvent.click(button);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('calls onAccept exactly once when the checkbox is ticked then the button is clicked', async () => {
    const user = userEvent.setup();
    const { onAccept } = renderModal();
    await user.click(screen.getByRole('checkbox'));
    await user.click(
      screen.getByRole('button', { name: /Accepter et utiliser/i }),
    );
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
