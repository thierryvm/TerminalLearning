import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerminalPreview } from '../app/components/landing/TerminalPreview';
import { EnvironmentProvider } from '../app/context/EnvironmentContext';

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
      <EnvironmentProvider>
        <TerminalPreview />
      </EnvironmentProvider>
    </MemoryRouter>,
  );
}

// ── Critical regression: no page scroll ──────────────────────────────────────

describe('TerminalPreview — scroll regression', () => {
  let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

  beforeEach(() => {
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
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
    // Linux default env — SEQUENCES.linux contains 'pwd'
    expect(getAllByText('pwd').length).toBeGreaterThanOrEqual(1);
  });
});

// ── Text alignment ────────────────────────────────────────────────────────────

describe('TerminalPreview — layout', () => {
  it('content area has text-left class', () => {
    const { container } = renderPreview(true);
    const content = container.querySelector('.text-left');
    expect(content).not.toBeNull();
  });
});

// ── Title bar env-awareness ───────────────────────────────────────────────────

describe('TerminalPreview — env-aware title bar', () => {
  it('shows "terminal — bash" by default (linux)', () => {
    // localStorage defaults to linux
    localStorage.removeItem('tl-environment');
    const { getByText } = renderPreview(true);
    expect(getByText('terminal — bash')).toBeTruthy();
  });

  it('shows "Windows PowerShell" when env is windows', () => {
    localStorage.setItem('tl-environment', 'windows');
    const { getByText } = renderPreview(true);
    expect(getByText('Windows PowerShell')).toBeTruthy();
    localStorage.removeItem('tl-environment');
  });

  it('shows "terminal — zsh" when env is macos', () => {
    localStorage.setItem('tl-environment', 'macos');
    const { getByText } = renderPreview(true);
    expect(getByText('terminal — zsh')).toBeTruthy();
    localStorage.removeItem('tl-environment');
  });
});
