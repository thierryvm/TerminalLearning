import { useEffect } from 'react';

/**
 * Trap keyboard focus inside a container while it is active.
 *
 * - Saves the element that had focus before activation
 * - Auto-focuses the first focusable inside the container when activated
 * - Cycles Tab / Shift+Tab between the first and last focusable elements
 * - Restores focus to the previously focused element on deactivation
 *
 * Used by the LoginModal, UserMenu (compact dropdown) and Sidebar
 * (mobile drawer) to satisfy WCAG 2.2 Focus Order + Apple HIG modal
 * conventions on Safari iOS WebKit (THI-152 mini-PR 1).
 *
 * The hook does NOT add an Escape handler — callers wire that
 * themselves so they can choose what "close" means.
 *
 * For the empty-container fallback (no focusables yet, e.g. async
 * content) to work, the container element must have `tabIndex={-1}`
 * so it is programmatically focusable.
 */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Auto-focus the first focusable inside the container; fall back to
    // the container itself (requires tabIndex={-1}) so focus never
    // escapes to background content while the modal is open.
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.focus?.();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const current = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (current.length === 0) return;
      const first = current[0];
      const last = current[current.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef]);
}
