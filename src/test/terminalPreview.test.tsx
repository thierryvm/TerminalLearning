import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerminalPreview } from '../app/components/landing/TerminalPreview';

// ── Helpers ───────────────────────────────────────────────────────────────────

vi.mock('motion/react', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_target, tag: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ children, ...props }: any) => {
        const { initial, animate, whileInView, transition, viewport, ...rest } = props;
        void initial; void animate; void whileInView; void transition; void viewport;
        return React.createElement(tag, rest, children);
      },
  }),
}));

function renderPreview(reducedMotion = false) {
  // Stub matchMedia to control prefers-reduced-motion
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('reduce') ? reducedMotion : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });

  return render(
    <MemoryRouter>
      <TerminalPreview />
    </MemoryRouter>,
  );
}

// ── Critical regression: no page scroll ──────────────────────────────────────

describe('TerminalPreview — scroll regression', () => {
  beforeEach(() => {
    // scrollIntoView must never be called — it scrolls the whole page
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never calls scrollIntoView (would scroll the whole page)', () => {
    renderPreview();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

// ── Reduced motion ────────────────────────────────────────────────────────────

describe('TerminalPreview — prefers-reduced-motion', () => {
  it('renders the terminal window', () => {
    const { container } = renderPreview(true);
    expect(container.querySelector('[data-testid="terminal-preview"]')).not.toBeNull();
  });

  it('shows static lines immediately when reduced motion is active', () => {
    const { getAllByText } = renderPreview(true);
    // STATIC_LINES always contains 'pwd' as first command
    expect(getAllByText('pwd').length).toBeGreaterThanOrEqual(1);
  });
});

