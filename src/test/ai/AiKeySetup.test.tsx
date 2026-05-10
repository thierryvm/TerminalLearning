/**
 * Tests for src/app/components/ai/AiKeySetup.tsx — THI-112 Phase A commit 1.
 *
 * Covers the standalone key-entry component used both by AiTutorPanel
 * (first-time onboarding) and AiSettings (Phase B edit-key flow). Uses
 * real `keyManager` via fake-indexeddb so save → read round-trips via
 * the production code, both for plain and encrypted mode.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { AiKeySetup } from '@/app/components/ai/AiKeySetup';
import {
  hasKey as kmHasKey,
  isEncrypted as kmIsEncrypted,
  getKey as kmGetKey,
  forgetKey as kmForgetKey,
} from '@/lib/ai/keyManager';

const FAKE_OPENROUTER = 'sk-or-v1-FAKE_TEST_KEY_DO_NOT_USE_0123456789';
const FAKE_ANTHROPIC = 'sk-ant-FAKE_TEST_KEY_DO_NOT_USE_0123';
const FAKE_GEMINI = 'AIzaFAKE_TEST_KEY_DO_NOT_USE_0123';

function renderSetup(provider: 'openrouter' | 'anthropic' | 'openai' | 'gemini') {
  const onSaved = vi.fn();
  const utils = render(
    <MemoryRouter>
      <AiKeySetup provider={provider} onSaved={onSaved} />
    </MemoryRouter>,
  );
  return { ...utils, onSaved };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(async () => {
  // Erase any encrypted entries the fake-indexeddb retained between tests.
  await Promise.all([
    kmForgetKey('openrouter'),
    kmForgetKey('anthropic'),
    kmForgetKey('openai'),
    kmForgetKey('gemini'),
  ]);
});

describe('AiKeySetup — provider hints and prefix expectations', () => {
  it('shows the OpenRouter prefix expectation and quick help', () => {
    renderSetup('openrouter');
    expect(screen.getByText(/sk-or-v1-…/)).toBeInTheDocument();
    expect(screen.getByText(/Hub multi-providers/)).toBeInTheDocument();
  });

  it('shows the OpenAI CORS warning only for openai', () => {
    renderSetup('openai');
    // The warning lives in role="alert" — its text spans multiple inline
    // elements (<strong>OpenAI</strong> bloque…) so we match on the alert
    // wrapper's textContent instead of `screen.getByText`.
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/bloque les appels directs/i);
  });

  it('does NOT show the OpenAI CORS warning for openrouter', () => {
    renderSetup('openrouter');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the privacy link to /privacy#ai-processing', () => {
    renderSetup('openrouter');
    const link = screen.getByRole('link', {
      name: /section IA de la politique de confidentialité/i,
    });
    expect(link).toHaveAttribute('href', '/privacy#ai-processing');
  });
});

describe('AiKeySetup — validation guards', () => {
  it('rejects an empty key with a "vide" error', async () => {
    const user = userEvent.setup();
    renderSetup('openrouter');
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/vide/i);
    expect(await kmHasKey('openrouter')).toBe(false);
  });

  it('rejects a key whose prefix does not match the selected provider', async () => {
    const user = userEvent.setup();
    const { container } = renderSetup('openrouter');
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, FAKE_ANTHROPIC); // anthropic key while provider=openrouter
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/préfixe attendu/i);
    expect(await kmHasKey('openrouter')).toBe(false);
  });
});

describe('AiKeySetup — plain mode (default)', () => {
  it('persists the key in plain mode and fires onSaved', async () => {
    const user = userEvent.setup();
    const { container, onSaved } = renderSetup('openrouter');
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, FAKE_OPENROUTER);
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(await kmHasKey('openrouter')).toBe(true);
    expect(await kmIsEncrypted('openrouter')).toBe(false);
    // Round-trip through the manager — no passphrase needed in plain mode.
    expect(await kmGetKey('openrouter')).toBe(FAKE_OPENROUTER);
  });

  it('also handles a Gemini AIza-prefixed key in plain mode', async () => {
    const user = userEvent.setup();
    const { container, onSaved } = renderSetup('gemini');
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, FAKE_GEMINI);
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(await kmGetKey('gemini')).toBe(FAKE_GEMINI);
  });
});

describe('AiKeySetup — encrypted opt-in', () => {
  it('reveals passphrase fields when the encrypt checkbox is toggled', async () => {
    const user = userEvent.setup();
    renderSetup('anthropic');
    expect(screen.queryByLabelText(/^Passphrase \(/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/Chiffrer cette clé/i));
    expect(await screen.findByLabelText(/^Passphrase \(/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirme la passphrase/i)).toBeInTheDocument();
  });

  it('rejects a passphrase shorter than 8 characters', async () => {
    const user = userEvent.setup();
    const { container } = renderSetup('anthropic');
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, FAKE_ANTHROPIC);
    await user.click(screen.getByLabelText(/Chiffrer cette clé/i));
    await user.type(await screen.findByLabelText(/^Passphrase/i), 'short');
    await user.type(screen.getByLabelText(/Confirme la passphrase/i), 'short');
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/au moins 8 caractères/i);
    expect(await kmHasKey('anthropic')).toBe(false);
  });

  it('rejects mismatched passphrases', async () => {
    const user = userEvent.setup();
    const { container } = renderSetup('anthropic');
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, FAKE_ANTHROPIC);
    await user.click(screen.getByLabelText(/Chiffrer cette clé/i));
    await user.type(await screen.findByLabelText(/^Passphrase/i), 'correct-horse-battery');
    await user.type(screen.getByLabelText(/Confirme la passphrase/i), 'something-else-staple');
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/ne correspondent pas/i);
    expect(await kmHasKey('anthropic')).toBe(false);
  });

  it('saves the key encrypted and round-trips with the right passphrase', async () => {
    const user = userEvent.setup();
    const { container, onSaved } = renderSetup('anthropic');
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, FAKE_ANTHROPIC);
    await user.click(screen.getByLabelText(/Chiffrer cette clé/i));
    const passphrase = 'correct-horse-battery';
    await user.type(await screen.findByLabelText(/^Passphrase/i), passphrase);
    await user.type(screen.getByLabelText(/Confirme la passphrase/i), passphrase);
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(await kmIsEncrypted('anthropic')).toBe(true);
    expect(await kmGetKey('anthropic', passphrase)).toBe(FAKE_ANTHROPIC);
    // Without the passphrase, decryption returns null instead of throwing.
    expect(await kmGetKey('anthropic')).toBeNull();
  });
});
