import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import { Landing } from '../app/components/Landing';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Auth context — default to logged out
vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
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
      <Landing />
    </MemoryRouter>,
  );
}

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

  it('has a "Soutenir le projet" Ko-fi link in the hero', () => {
    renderLanding();
    const kofiLinks = screen.getAllByRole('link', { name: /soutenir terminal learning sur ko-fi/i });
    expect(kofiLinks.length).toBeGreaterThanOrEqual(1);
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
  it('renders all 6 module cards', () => {
    renderLanding();
    // Each card has an aria-label "Accéder au module X"
    const moduleCards = screen.getAllByRole('button', { name: /accéder au module/i });
    expect(moduleCards).toHaveLength(6);
  });

  it('each module card shows lesson count', () => {
    renderLanding();
    const lessonLabels = screen.getAllByText(/leçons disponibles/i);
    expect(lessonLabels.length).toBeGreaterThanOrEqual(6);
  });
});

// ── Ko-fi ─────────────────────────────────────────────────────────────────────

describe('Landing — Ko-fi support', () => {
  it('renders at least one Ko-fi support link', () => {
    renderLanding();
    const links = screen.getAllByRole('link', { name: /soutenir terminal learning sur ko-fi/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('all Ko-fi links point to the correct URL', () => {
    renderLanding();
    const links = screen.getAllByRole('link', { name: /soutenir terminal learning sur ko-fi/i });
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', 'https://ko-fi.com/thierryvm');
    });
  });

  it('all Ko-fi links open in a new tab with noopener', () => {
    renderLanding();
    const links = screen.getAllByRole('link', { name: /soutenir terminal learning sur ko-fi/i });
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});

// ── Footer ────────────────────────────────────────────────────────────────────

describe('Landing — footer', () => {
  it('renders Ko-fi link in footer', () => {
    renderLanding();
    const footerLinks = screen.getAllByRole('link', { name: /ko-fi/i });
    expect(footerLinks.length).toBeGreaterThanOrEqual(1);
  });
});
