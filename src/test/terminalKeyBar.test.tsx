import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TerminalKeyBar, INSERT_KEYS } from '../app/components/TerminalKeyBar';

function setup() {
  const onInsert = vi.fn();
  const onTab = vi.fn();
  const onHistoryPrev = vi.fn();
  const onHistoryNext = vi.fn();
  render(
    <TerminalKeyBar
      onInsert={onInsert}
      onTab={onTab}
      onHistoryPrev={onHistoryPrev}
      onHistoryNext={onHistoryNext}
    />,
  );
  return { onInsert, onTab, onHistoryPrev, onHistoryNext };
}

describe('TerminalKeyBar (THI-307)', () => {
  it('renders an accessible toolbar', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: /touches spéciales du terminal/i });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders every insert key with a non-empty value and label', () => {
    expect(INSERT_KEYS.length).toBeGreaterThanOrEqual(10);
    for (const key of INSERT_KEYS) {
      expect(key.value.length).toBeGreaterThan(0);
      expect(key.display.length).toBeGreaterThan(0);
      expect(key.label.trim().length).toBeGreaterThan(0);
    }
    // The pipe is the headline key — it must be present and first.
    expect(INSERT_KEYS[0].value).toBe('|');
  });

  it('inserts the pipe character on tap', () => {
    const { onInsert } = setup();
    fireEvent.click(screen.getByRole('button', { name: /insérer pipe/i }));
    expect(onInsert).toHaveBeenCalledWith('|');
  });

  it('inserts the append-redirection token', () => {
    const { onInsert } = setup();
    fireEvent.click(screen.getByRole('button', { name: /insérer redirection en ajout/i }));
    expect(onInsert).toHaveBeenCalledWith('>>');
  });

  it('wires the Tab and history controls', () => {
    const { onTab, onHistoryPrev, onHistoryNext } = setup();
    fireEvent.click(screen.getByRole('button', { name: /autocomplétion/i }));
    fireEvent.click(screen.getByRole('button', { name: /commande précédente/i }));
    fireEvent.click(screen.getByRole('button', { name: /commande suivante/i }));
    expect(onTab).toHaveBeenCalledTimes(1);
    expect(onHistoryPrev).toHaveBeenCalledTimes(1);
    expect(onHistoryNext).toHaveBeenCalledTimes(1);
  });

  it('keeps the input focused (prevents default mousedown so the keyboard stays open)', () => {
    setup();
    const pipe = screen.getByRole('button', { name: /insérer pipe/i });
    const ev = fireEvent.mouseDown(pipe);
    // fireEvent returns false when a handler called preventDefault().
    expect(ev).toBe(false);
  });

  it('uses type="button" so taps never submit the surrounding form', () => {
    setup();
    for (const btn of screen.getAllByRole('button')) {
      expect(btn).toHaveAttribute('type', 'button');
    }
  });

  it('gives every key a ≥44px tap target (h-11)', () => {
    setup();
    for (const btn of screen.getAllByRole('button')) {
      expect(btn.className).toMatch(/\bh-11\b/);
      expect(btn.className).toMatch(/min-w-\[2\.75rem\]/);
    }
  });
});
