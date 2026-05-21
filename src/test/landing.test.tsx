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
  it('renders all 11 module cards with unique labels', () => {
    renderLanding();
    // Each card has an aria-label "Accéder au module X : description"
    const moduleCards = screen.getAllByRole('link', { name: /accéder au module/i });
    expect(moduleCards).toHaveLength(11);
    const labels = moduleCards.map((card: HTMLElement) => card.getAttribute('aria-label'));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('each module card has the correct href to its first lesson', () => {
    renderLanding();
    const moduleCards = screen.getAllByRole('link', { name: /accéder au module/i });
    // All hrefs must match /app/learn/:moduleId/:lessonId
    const hrefPattern = /^\/app\/learn\/[a-z0-9-]+\/[a-z0-9-]+$/;
    moduleCards.forEach((card: HTMLElement) => {
      const href = card.getAttribute('href');
      expect(href).toMatch(hrefPattern);
    });
    // All hrefs unique
    const hrefs = moduleCards.map((card: HTMLElement) => card.getAttribute('href'));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('each module card shows lesson count', () => {
    renderLanding();
    const lessonLabels = screen.getAllByText(/leçons disponibles/i);
    expect(lessonLabels.length).toBeGreaterThanOrEqual(6);
  });
});

// ── Footer ────────────────────────────────────────────────────────────────────

describe('Landing — footer', () => {
  it('renders GitHub link in footer', () => {
    renderLanding();
    // Exact match avoids collision with About section links containing "GitHub" in their text
    const githubLink = screen.getByRole('link', { name: 'GitHub' });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/thierryvm/TerminalLearning');
  });
});
