import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 7/9 — Terminal autoFocus regression specs (Safari iOS WebKit).
 *
 * The previous `autoFocus` HTML attribute on the terminal `<input>` has
 * been replaced by a useEffect that:
 *   - skips touch devices (matches MessageInput.tsx pattern — opening the
 *     on-screen keyboard auto on lesson load is intrusive),
 *   - skips when a modal/drawer is already open on mount.
 *
 * Playwright WebKit projects emulate touch devices (hover: none, pointer:
 * coarse). So on mobile WebKit the useEffect must NOT focus the terminal
 * input automatically — that is the desired UX for learners (they tap the
 * terminal explicitly, the wrapper onClick handler delegates to focus).
 *
 * The desktop preserve spec (chromium) covers the inverse — that on a
 * non-touch viewport the terminal IS focused on mount.
 */

test.describe('Terminal autoFocus mobile — Safari iOS WebKit (THI-152 brick 7/9)', () => {
  test('terminal input is NOT auto-focused on mobile (touch device guard)', async ({ page }) => {
    await page.goto('/app/learn/navigation/orientation');

    // Wait for the lesson page to hydrate and render the terminal.
    const terminalInput = page.getByRole('textbox', { name: /Commande terminal/i });
    await expect(terminalInput).toBeVisible();

    // On a mobile WebKit viewport, the useEffect detects touch and skips
    // focus. The activeElement should NOT be the terminal input.
    const isFocused = await terminalInput.evaluate((el) => document.activeElement === el);
    expect(isFocused, 'terminal input must NOT be auto-focused on touch devices').toBe(false);
  });

  test('terminal input still focuses when user taps it', async ({ page }) => {
    await page.goto('/app/learn/navigation/orientation');

    const terminalInput = page.getByRole('textbox', { name: /Commande terminal/i });
    await expect(terminalInput).toBeVisible();

    // Tap delegates via the wrapper onClick={focusInput}. Click on the
    // input element itself triggers focus.
    await terminalInput.click();
    const isFocused = await terminalInput.evaluate((el) => document.activeElement === el);
    expect(isFocused, 'terminal input gains focus on user tap').toBe(true);
  });
});
