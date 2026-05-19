/**
 * Tests for ClassCard — THI-235 Sprint 2.A étape 2.
 *
 * Couvre :
 *  - Render name + invitation_code + enrollment_count + created_at
 *  - Copy button → clipboard.writeText called with full URL
 *  - "Copié" feedback for 2s then reverts
 *  - Clipboard API unavailable → "Copie impossible" fallback
 *  - Clipboard.writeText throws → "Copie impossible" fallback
 *  - URL built from window.location.origin
 *  - Singular/plural enrollment label (1 élève vs N élèves)
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClassCard, type ClassCardData } from '../app/components/teacher/ClassCard';

const baseClass: ClassCardData = {
  id: 'class-1',
  name: 'Bash 101 — Promotion 2026',
  invitation_code: 'a1b2c3d4e5f6',
  enrollment_count: 5,
  created_at: '2026-05-19T10:00:00Z',
};

beforeEach(() => {
  vi.useFakeTimers();
  // Reset clipboard mock between tests
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ClassCard — display', () => {
  it('renders class name', () => {
    render(<ClassCard data={baseClass} />);
    expect(screen.getByText('Bash 101 — Promotion 2026')).toBeInTheDocument();
  });

  it('renders invitation code', () => {
    render(<ClassCard data={baseClass} />);
    expect(screen.getByText('a1b2c3d4e5f6')).toBeInTheDocument();
  });

  it('renders enrollment count with plural label', () => {
    render(<ClassCard data={baseClass} />);
    // baseClass has 5 enrollments → plural
    expect(screen.getByLabelText(/5 élèves inscrits/i)).toBeInTheDocument();
  });

  it('renders enrollment count with singular label', () => {
    render(<ClassCard data={{ ...baseClass, enrollment_count: 1 }} />);
    expect(screen.getByLabelText('1 élève inscrit')).toBeInTheDocument();
  });

  it('renders enrollment count of 0 with singular label', () => {
    render(<ClassCard data={{ ...baseClass, enrollment_count: 0 }} />);
    expect(screen.getByLabelText('0 élève inscrit')).toBeInTheDocument();
  });

  it('renders creation date formatted FR', () => {
    render(<ClassCard data={baseClass} />);
    // toLocaleDateString('fr-FR') format varies by environment, but the
    // "Créée le" prefix is stable and disambiguates from any "2026" in
    // the class name itself.
    expect(screen.getByText(/Créée le.*2026/)).toBeInTheDocument();
  });
});

describe('ClassCard — copy URL', () => {
  it('calls clipboard.writeText with full invitation URL on copy click', async () => {
    render(<ClassCard data={baseClass} />);
    const writeText = vi.mocked(navigator.clipboard.writeText);
    const button = screen.getByRole('button', { name: /copier l/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/app/join?code=a1b2c3d4e5f6`,
    );
  });

  it('shows "Copié" feedback after successful copy', async () => {
    render(<ClassCard data={baseClass} />);
    const button = screen.getByRole('button', { name: /copier l/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole('button', { name: /^copié$/i })).toBeInTheDocument();
  });

  it('reverts to default label after 2s', async () => {
    render(<ClassCard data={baseClass} />);
    const button = screen.getByRole('button', { name: /copier l/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole('button', { name: /^copié$/i })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByRole('button', { name: /copier l/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^copié$/i })).not.toBeInTheDocument();
  });

  it('shows "Copie impossible" when clipboard API unavailable', async () => {
    // Simulate no clipboard API (older browser / non-secure context)
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    render(<ClassCard data={baseClass} />);
    const button = screen.getByRole('button', { name: /copier l/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole('button', { name: /copie impossible/i })).toBeInTheDocument();
  });

  it('shows "Copie impossible" when writeText throws', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) },
      configurable: true,
      writable: true,
    });
    render(<ClassCard data={baseClass} />);
    const button = screen.getByRole('button', { name: /copier l/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole('button', { name: /copie impossible/i })).toBeInTheDocument();
  });
});
