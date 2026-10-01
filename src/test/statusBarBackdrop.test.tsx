import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBarBackdrop } from '../app/components/StatusBarBackdrop';
import { readFileSync } from 'node:fs';

const theme = readFileSync('src/styles/theme.css', 'utf8');

const components = import.meta.glob('../app/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('StatusBarBackdrop (iOS 26 edge blur)', () => {
  it('is a fixed, opaque, decorative strip as tall as the top inset', () => {
    render(<StatusBarBackdrop />);
    const strip = screen.getByTestId('status-bar-backdrop');
    expect(strip).toHaveAttribute('aria-hidden', 'true');
    // A fixed box in the page color: what scrolls up under the blur is a plain band.
    expect(strip).toHaveClass('fixed', 'top-0', 'inset-x-0', 'bg-[var(--github-bg)]');
    // No height outside an installed app: --inset-top is 0 in a Safari tab and on desktop.
    expect(strip).toHaveClass('h-[var(--inset-top)]', 'pointer-events-none');
  });
});

describe('--inset-top: content kept below the iOS edge blur', () => {
  it('is the safe-area inset, plus 2.5rem in the app installed on iOS, in portrait', () => {
    expect(theme).toMatch(/:root \{\s*--inset-top: env\(safe-area-inset-top, 0px\);\s*\}/);
    expect(theme).toMatch(
      /@supports \(-webkit-touch-callout: none\) \{\s*@media \(display-mode: standalone\) and \(orientation: portrait\) \{\s*:root \{\s*--inset-top: calc\(env\(safe-area-inset-top, 0px\) \+ 2\.5rem\);/,
    );
  });

  it('is what every component uses for the top edge (a bare safe-area inset would sit inside the blur)', () => {
    const bare = Object.entries(components).filter(([, src]) => src.includes('safe-area-inset-top')).map(([path]) => path);
    expect(bare).toEqual([]);
    const users = Object.entries(components).filter(([, src]) => src.includes('var(--inset-top)')).map(([path]) => path.split('/').pop());
    expect(users.sort()).toEqual([
      'AiTutorPanel.tsx', 'Landing.tsx', 'Layout.tsx', 'LoginModal.tsx', 'MarkdownPage.tsx', 'PWAInstallModal.tsx',
      'PrivacyPolicy.tsx', 'Sidebar.tsx', 'StatusBarBackdrop.tsx', 'SupportTicketModal.tsx',
    ]);
  });
});
