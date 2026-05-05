import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 7/9 — Desktop preservation guard for PWA safe-area + autoFocus.
 *
 * Counterpart to the mobile WebKit specs. The fix adds:
 *   - `pt/pl/pr [env(safe-area-inset-*)]` on the Layout flex-1 wrapper
 *   - `py/px [env(safe-area-inset-*)]` on the LoginModal backdrop
 *   - useEffect-based mount focus on the terminal input (desktop only)
 *
 * On a 1280×800 / 1920×1080 desktop viewport, env(safe-area-inset-*)
 * resolves to 0px, so paddings should add no visual offset. The terminal
 * input MUST be auto-focused on mount (no modal open, hover: hover).
 */

test.describe('Desktop preserve — THI-152 brick 7/9 safe-area + autoFocus', () => {
  test('Layout wrapper safe-area paddings collapse to 0 on desktop', async ({ page }) => {
    await page.goto('/app');
    const padding = await page.evaluate(() => {
      const root = document.querySelector('.h-dvh.flex');
      const wrapper = root?.querySelector('.flex-1.flex.flex-col');
      if (!wrapper) return null;
      const s = getComputedStyle(wrapper);
      return {
        paddingTop: s.paddingTop,
        paddingLeft: s.paddingLeft,
        paddingRight: s.paddingRight,
      };
    });
    expect(padding, 'flex-1 wrapper found').not.toBeNull();
    // On desktop env(safe-area-inset-*) resolves to 0 → paddings = '0px'.
    expect(padding!.paddingTop).toBe('0px');
    expect(padding!.paddingLeft).toBe('0px');
    expect(padding!.paddingRight).toBe('0px');
  });

  test('mobile top bar stays hidden on desktop (lg:hidden)', async ({ page }) => {
    await page.goto('/app');
    // The mobile top bar is the `lg:hidden h-14 ...` div. On desktop
    // (lg+ = 1024+) it must compute to display:none. The viewport here
    // is 1280 wide so lg breakpoint applies.
    const display = await page.evaluate(() => {
      const wrappers = document.querySelectorAll('.h-dvh.flex .flex-1.flex.flex-col > div');
      const topBar = Array.from(wrappers).find((el) => el.className.includes('lg:hidden'));
      return topBar ? getComputedStyle(topBar).display : null;
    });
    expect(display).toBe('none');
  });

  test('terminal input IS auto-focused on lesson page (desktop, no modal)', async ({ page }) => {
    await page.goto('/app/learn/navigation/orientation');

    const terminalInput = page.getByRole('textbox', { name: /Commande terminal/i });
    await expect(terminalInput).toBeVisible();

    // On desktop (hover: hover, pointer: fine) the useEffect focuses the
    // input on mount. We poll briefly for the focus to settle after
    // hydration (route-level lazy loading + AuthProvider effects).
    await expect.poll(
      async () => terminalInput.evaluate((el) => document.activeElement === el),
      { timeout: 2000, message: 'terminal input must be auto-focused on mount' },
    ).toBe(true);
  });
});
