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
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { AiSettings } from '@/app/components/AiSettings';
import {
  forgetKey as kmForgetKey,
  saveKey as kmSaveKey,
} from '@/lib/ai/keyManager';
import { OPENROUTER_DEFAULT_MODEL } from '@/lib/ai/providers';
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
    // Once the row refreshes, the per-provider button reverts to Configurer.
    await screen.findAllByRole('button', { name: /Configurer/ });
    // And there is no Forget button left for that row.
    expect(screen.queryByRole('button', { name: /^Oublier$/ })).not.toBeInTheDocument();
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
  it('displays the env override value when set (not the hardcoded fallback)', async () => {
    vi.stubEnv('VITE_AI_TUTOR_OPENROUTER_MODEL', 'anthropic/claude-sonnet-4-6');
    try {
      renderSettings();
      await screen.findByText('OpenRouter');
      // The env override must be visible inside the OpenRouter row.
      expect(await screen.findByText('anthropic/claude-sonnet-4-6')).toBeInTheDocument();
      // The hardcoded fallback must NOT be visible when override is set.
      expect(screen.queryByText(OPENROUTER_DEFAULT_MODEL)).not.toBeInTheDocument();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('falls back to the hardcoded default when no env override is set', async () => {
    renderSettings();
    await screen.findByText('OpenRouter');
    expect(await screen.findByText(OPENROUTER_DEFAULT_MODEL)).toBeInTheDocument();
  });

  it('uses the "Modèle utilisé" label (transparency wording, not "défaut")', async () => {
    renderSettings();
    await screen.findByText('OpenRouter');
    expect(screen.getAllByText(/Modèle utilisé/i).length).toBeGreaterThan(0);
    // The pre-fix wording must NOT appear anymore on the page.
    expect(screen.queryByText(/Modèle par défaut/i)).not.toBeInTheDocument();
  });
});
