/**
 * Tests for src/app/components/AiSettings.tsx — THI-112 Phase B.
 *
 * The settings page is the only surface besides the panel that touches
 * `keyManager` and the consent record at the same time, so these tests
 * exercise the page through the real `keyManager` (fake-indexeddb) and
 * the real localStorage-backed consent helpers — no module mocks beyond
 * what the test runner already pre-loads.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { AiSettings } from '@/app/components/AiSettings';
import {
  forgetKey as kmForgetKey,
  MODEL_KEY_PREFIX,
  saveKey as kmSaveKey,
} from '@/lib/ai/keyManager';
import { OPENAI_DEFAULT_MODEL, OPENROUTER_DEFAULT_MODEL } from '@/lib/ai/providers';
import { CONSENT_KEY, CONSENT_TTL_MS, CONSENT_VERSION } from '@/lib/ai/useAiTutor';

const FAKE_OPENROUTER = 'sk-or-v1-FAKE_TEST_KEY_DO_NOT_USE_0123456789';
const FAKE_ANTHROPIC = 'sk-ant-FAKE_TEST_KEY_DO_NOT_USE_0123';

function renderSettings() {
  return render(
    <MemoryRouter>
      <AiSettings />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(async () => {
  await Promise.all([
    kmForgetKey('openrouter'),
    kmForgetKey('anthropic'),
    kmForgetKey('openai'),
    kmForgetKey('gemini'),
  ]);
});

describe('AiSettings — initial render with no keys', () => {
  it('shows the page title and all four provider rows', async () => {
    renderSettings();
    expect(
      screen.getByRole('heading', { name: /Paramètres IA/i, level: 1 }),
    ).toBeInTheDocument();
    // Each provider row exposes the human label.
    for (const label of ['OpenRouter', 'Anthropic', 'OpenAI', 'Gemini']) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
  });

  it('shows "Configurer" (not "Modifier") when a provider has no key yet', async () => {
    renderSettings();
    const buttons = await screen.findAllByRole('button', { name: /Configurer/ });
    expect(buttons.length).toBe(4);
    expect(screen.queryByRole('button', { name: /^Oublier$/ })).not.toBeInTheDocument();
  });

  it('shows the no-consent fallback message', async () => {
    renderSettings();
    expect(
      await screen.findByText(/Aucun consentement actif/i),
    ).toBeInTheDocument();
  });
});

describe('AiSettings — provider with a stored key', () => {
  it('reflects an existing plain key as "Configurée · en clair" + reveals the Forget button', async () => {
    await kmSaveKey('openrouter', FAKE_OPENROUTER);
    renderSettings();
    // Wait until the async refresh has resolved and toggled the row.
    expect(await screen.findByText(/Configurée/)).toBeInTheDocument();
    expect(screen.getByText(/en clair/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Oublier$/ })).toBeInTheDocument();
  });

  it('reflects an encrypted key as "Configurée · chiffrée (AES-GCM)"', async () => {
    await kmSaveKey('anthropic', FAKE_ANTHROPIC, {
      encrypt: true,
      passphrase: 'correct-horse-battery',
    });
    renderSettings();
    expect(await screen.findByText(/chiffrée \(AES-GCM\)/)).toBeInTheDocument();
  });

  it('opens the AiKeySetup editor inline when "Modifier" is clicked', async () => {
    await kmSaveKey('openrouter', FAKE_OPENROUTER);
    const user = userEvent.setup();
    renderSettings();
    // Wait for the stored key to surface as "Modifier"
    const modify = await screen.findByRole('button', { name: /^Modifier$/ });
    await user.click(modify);
    // The editor mounts with the same prefix hint as AiKeySetup itself.
    expect(await screen.findByText(/sk-or-v1-…/)).toBeInTheDocument();
  });

  it('removes the key when "Oublier" is clicked and updates the row to "Configurer"', async () => {
    await kmSaveKey('openrouter', FAKE_OPENROUTER);
    const user = userEvent.setup();
    renderSettings();
    const forget = await screen.findByRole('button', { name: /^Oublier$/ });
    await user.click(forget);
    // Wait for the SPECIFIC post-condition: the Forget button disappears once
    // the async row refresh completes. NB: we can't wait on findAllByRole(/Configurer/)
    // because 3 other key-less providers already show "Configurer" — that query
    // resolves immediately, before openrouter's row has reverted, causing a race
    // (pre-existing flaky). waitFor retries the assertion until it holds.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Oublier$/ })).not.toBeInTheDocument();
    });
    // All 4 provider rows now show "Configurer".
    expect(screen.getAllByRole('button', { name: /Configurer/ })).toHaveLength(4);
  });
});

describe('AiSettings — consent record state', () => {
  it('shows the accepted/expiry dates and remaining-days when consent is active', async () => {
    const acceptedAt = Date.UTC(2026, 4, 1, 10, 0, 0); // 2026-05-01
    const expiresAt = acceptedAt + CONSENT_TTL_MS;
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: CONSENT_VERSION, acceptedAt, expiresAt }),
    );
    renderSettings();
    expect(await screen.findByText(/Consentement actif/)).toBeInTheDocument();
    // Locale-aware date formatting; assert on the key fragments instead of
    // the full string so the test stays robust to locale tweaks.
    expect(screen.getByText(/Accepté le/)).toBeInTheDocument();
    expect(screen.getByText(/expire le/)).toBeInTheDocument();
    expect(screen.getByText(/jours restants/)).toBeInTheDocument();
  });

  it('removes the consent record when "Révoquer" is clicked', async () => {
    const acceptedAt = Date.now();
    const expiresAt = acceptedAt + CONSENT_TTL_MS;
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: CONSENT_VERSION, acceptedAt, expiresAt }),
    );
    const user = userEvent.setup();
    renderSettings();
    const revoke = await screen.findByRole('button', { name: /Révoquer le consentement/i });
    await user.click(revoke);
    expect(
      await screen.findByText(/Aucun consentement actif/i),
    ).toBeInTheDocument();
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });
});

describe('AiSettings — privacy link', () => {
  it('points to /privacy#ai-processing', () => {
    renderSettings();
    const link = screen.getByRole('link', {
      name: /section IA de la politique de confidentialité/i,
    });
    expect(link).toHaveAttribute('href', '/privacy#ai-processing');
  });
});

describe('AiSettings — back link', () => {
  it('links the back arrow to the dashboard route /app', () => {
    renderSettings();
    const back = screen.getByRole('link', { name: /Retour au tableau de bord/i });
    expect(back).toHaveAttribute('href', '/app');
  });
});

// Smoke: focus that the within() helper can reach the keys section by its label.
describe('AiSettings — accessibility landmarks', () => {
  it('exposes a keys section labelled "Clés API par provider"', async () => {
    renderSettings();
    // Wait for the async refresh to populate the rows so the region has
    // its content before we query inside it.
    await screen.findByText('OpenRouter');
    const region = screen.getByRole('region', { name: /Clés API par provider/i });
    expect(within(region).getByText('OpenRouter')).toBeInTheDocument();
  });
});

// Regression test for the Settings ↔ Drawer model inconsistency bug.
// Pre-fix: AiSettings read DEFAULT_MODELS[provider] (hardcoded fallback,
// e.g. Llama 3.3 70B free for OpenRouter) while AiTutorPanel used the
// Vercel env override (e.g. Sonnet 4.6 paid). A user could read the
// Settings page, believe they were paying for the free fallback, and be
// billed for the paid model the Drawer was actually calling.
// Post-fix: both surfaces resolve the same model via `resolveModel()`.
describe('AiSettings — Settings/Drawer model consistency (regression)', () => {
  it('checks the env override when it is one of the offered models (not the hardcoded fallback)', async () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENROUTER_MODEL', 'anthropic/claude-opus-5.5');
    try {
      renderSettings();
      const group = await screen.findByRole('group', { name: /Modèle utilisé avec OpenRouter/ });
      expect(within(group).getByRole('radio', { name: /Claude Opus 5\.5/ })).toBeChecked();
      expect(within(group).getByRole('radio', { name: /Claude Sonnet 5\.5/ })).not.toBeChecked();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('displays the OpenAI env override as text (OpenAI has no picker)', async () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENAI_MODEL', 'gpt-4o');
    try {
      renderSettings();
      expect(await screen.findByText('gpt-4o')).toBeInTheDocument();
      expect(screen.queryByText(OPENAI_DEFAULT_MODEL)).not.toBeInTheDocument();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('falls back to the hardcoded default when no env override is set', async () => {
    renderSettings();
    const group = await screen.findByRole('group', { name: /Modèle utilisé avec OpenRouter/ });
    const sonnet = within(group).getByRole('radio', { name: /Claude Sonnet 5\.5/ });
    expect(sonnet).toBeChecked();
    expect(sonnet).toHaveAttribute('value', OPENROUTER_DEFAULT_MODEL);
    expect(await screen.findByText(OPENAI_DEFAULT_MODEL)).toBeInTheDocument();
  });

  it('uses the "Modèle utilisé" label (transparency wording, not "défaut")', async () => {
    renderSettings();
    await screen.findByText('OpenRouter');
    expect(screen.getAllByText(/Modèle utilisé/i).length).toBeGreaterThan(0);
    // The pre-fix wording must NOT appear anymore on the page.
    expect(screen.queryByText(/Modèle par défaut/i)).not.toBeInTheDocument();
  });
});

describe('AiSettings — model choice', () => {
  it('offers Gemini 3.5 Flash-Lite (default, cheapest) and Gemini 3.6 Flash, with a cost hint', async () => {
    renderSettings();
    const group = await screen.findByRole('group', { name: /Modèle utilisé avec Gemini/ });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    const lite = within(group).getByRole('radio', { name: /Gemini 3\.5 Flash-Lite/ });
    expect(lite).toBeChecked();
    expect(lite).toHaveAttribute('value', 'gemini-3.5-flash-lite');
    expect(within(group).getByText(/Le moins cher/)).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: /Gemini 3\.6 Flash/ })).not.toBeChecked();
  });

  it('stores the choice and keeps it after a new render', async () => {
    const user = userEvent.setup();
    const { unmount } = renderSettings();
    const group = await screen.findByRole('group', { name: /Modèle utilisé avec Gemini/ });
    await user.click(within(group).getByRole('radio', { name: /Gemini 3\.6 Flash/ }));

    expect(within(group).getByRole('radio', { name: /Gemini 3\.6 Flash/ })).toBeChecked();
    expect(localStorage.getItem(MODEL_KEY_PREFIX + 'gemini')).toBe('gemini-3.6-flash');

    unmount();
    renderSettings();
    const again = await screen.findByRole('group', { name: /Modèle utilisé avec Gemini/ });
    await waitFor(() =>
      expect(within(again).getByRole('radio', { name: /Gemini 3\.6 Flash/ })).toBeChecked(),
    );
  });

  it('falls back to the default when the stored value is a shut-down model', async () => {
    localStorage.setItem(MODEL_KEY_PREFIX + 'gemini', 'gemini-2.0-flash');
    renderSettings();
    const group = await screen.findByRole('group', { name: /Modèle utilisé avec Gemini/ });
    await waitFor(() =>
      expect(within(group).getByRole('radio', { name: /Gemini 3\.5 Flash-Lite/ })).toBeChecked(),
    );
    expect(localStorage.getItem(MODEL_KEY_PREFIX + 'gemini')).toBeNull();
  });

  it('can be changed with the keyboard (arrow keys inside the radio group)', async () => {
    const user = userEvent.setup();
    renderSettings();
    const group = await screen.findByRole('group', { name: /Modèle utilisé avec Anthropic/ });
    const sonnet = within(group).getByRole('radio', { name: /Claude Sonnet 5\.5/ });
    sonnet.focus();
    await user.keyboard('{ArrowDown}');
    expect(within(group).getByRole('radio', { name: /Claude Opus 5\.5/ })).toBeChecked();
    expect(localStorage.getItem(MODEL_KEY_PREFIX + 'anthropic')).toBe('claude-opus-5-5');
  });

  it('shows no picker for OpenAI', async () => {
    renderSettings();
    await screen.findByText('OpenAI');
    expect(screen.queryByRole('group', { name: /Modèle utilisé avec OpenAI/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: /Modèle utilisé avec/ })).toHaveLength(3);
  });
});
