import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import { Landing } from '../app/components/Landing';
import { EnvironmentProvider } from '../app/context/EnvironmentContext';
import { ProgressProvider } from '../app/context/ProgressContext';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Auth context — default to logged out
vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({ user: null, session: null, loading: false, initialized: true, signOut: vi.fn() }),
}));

// Suppress motion animations in tests
vi.mock('motion/react', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_target, tag: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ children, ...props }: any) => {
        const { initial, animate, whileInView, whileHover, transition, viewport, ...rest } = props;
        void initial; void animate; void whileInView; void whileHover; void transition; void viewport;
        return React.createElement(tag, rest, children);
      },
  }),
}));

// TerminalPreview uses useNavigate — keep the mock minimal
vi.mock('../app/components/landing/TerminalPreview', () => ({
  TerminalPreview: () => <section data-testid="terminal-preview" />,
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <EnvironmentProvider>
        <ProgressProvider>
          <Landing />
        </ProgressProvider>
      </EnvironmentProvider>
    </MemoryRouter>,
  );
}

// ── TerminalPreview presence ──────────────────────────────────────────────────

describe('Landing — terminal preview', () => {
  it('renders the animated terminal preview in the hero', () => {
    renderLanding();
    expect(screen.getByTestId('terminal-preview')).toBeInTheDocument();
  });
});

// ── Hero structure regression ─────────────────────────────────────────────────

describe('Landing — hero section', () => {
  it('renders the main heading', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/maîtrise le terminal/i);
  });

  it('has exactly one primary CTA (Commencer l\'apprentissage)', () => {
    renderLanding();
    // aria-label set explicitly on the primary CTA button
    const primaryCTA = screen.getByRole('button', {
      name: /commencer l'apprentissage gratuitement/i,
    });
    expect(primaryCTA).toBeInTheDocument();
  });

  it('Ko-fi card is visible but on hold (no active link)', () => {
    renderLanding();
    // Ko-fi is on hold pending Solidaris/RIZIV authorization — rendered as disabled div, not a link
    const kofiCard = screen.getByText(/don ponctuel/i);
    expect(kofiCard).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /soutenir terminal learning sur ko-fi/i })).toBeNull();
  });

  it('hero section is centered (text-center class present)', () => {
    const { container } = renderLanding();
    // The hero <section> must keep text-center for the original design
    const heroSection = container.querySelector('section.text-center');
    expect(heroSection).not.toBeNull();
  });
});

// ── Trust badges ─────────────────────────────────────────────────────────────

describe('Landing — trust badges', () => {
  it('renders all 4 trust badges', () => {
    renderLanding();
    expect(screen.getByText('A+ Security Rating')).toBeInTheDocument();
    expect(screen.getByText('100% Open Source')).toBeInTheDocument();
    expect(screen.getByText('Free Forever')).toBeInTheDocument();
    expect(screen.getByText('GDPR Compliant')).toBeInTheDocument();
  });
});

// ── Module grid ───────────────────────────────────────────────────────────────

describe('Landing — module grid', () => {
  it('renders all 8 module cards with unique labels', () => {
    renderLanding();
    // Each card has an aria-label "Accéder au module X"
    const moduleCards = screen.getAllByRole('button', { name: /accéder au module/i });
    expect(moduleCards).toHaveLength(8);
    const labels = moduleCards.map((card) => card.getAttribute('aria-label'));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('each module card shows lesson count', () => {
    renderLanding();
    const lessonLabels = screen.getAllByText(/leçons disponibles/i);
    expect(lessonLabels.length).toBeGreaterThanOrEqual(6);
  });
});

// ── Support cards (Ko-fi + GitHub Sponsors — on hold) ────────────────────────

describe('Landing — support cards on hold', () => {
  // Ko-fi and GitHub Sponsors are both disabled pending Solidaris/RIZIV-INAMI authorization.
  // When the authorization is obtained, re-enable the cards in Landing.tsx and update these tests.

  it('Ko-fi card shows "Bientôt disponible"', () => {
    renderLanding();
    expect(screen.getByText(/don ponctuel/i)).toBeInTheDocument();
    // No active link — disabled div only
    expect(screen.queryByRole('link', { name: /soutenir terminal learning sur ko-fi/i })).toBeNull();
  });

  it('GitHub Sponsors card shows "Bientôt disponible"', () => {
    renderLanding();
    expect(screen.getByText('GitHub Sponsors')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /github sponsors/i })).toBeNull();
  });
});

// ── Footer ────────────────────────────────────────────────────────────────────

describe('Landing — footer', () => {
  it('renders Ko-fi text in footer (disabled, no link)', () => {
    renderLanding();
    // Ko-fi is on hold — footer shows text, not a link
    expect(screen.getByText('Ko-fi')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ko-fi/i })).toBeNull();
  });
});
