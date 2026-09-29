import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBarBackdrop } from '../app/components/StatusBarBackdrop';

describe('StatusBarBackdrop (iOS 26 edge blur)', () => {
  it('is a fixed, opaque, decorative strip as tall as the status bar', () => {
    render(<StatusBarBackdrop />);
    const strip = screen.getByTestId('status-bar-backdrop');
    expect(strip).toHaveAttribute('aria-hidden', 'true');
    // iOS keeps its blur off the top edge only under a fixed box with a background.
    expect(strip).toHaveClass('fixed', 'top-0', 'inset-x-0', 'bg-[var(--github-bg)]');
    // No height outside an installed app: env() is 0 in a Safari tab and on desktop.
    expect(strip).toHaveClass('h-[env(safe-area-inset-top)]', 'pointer-events-none');
  });
});
