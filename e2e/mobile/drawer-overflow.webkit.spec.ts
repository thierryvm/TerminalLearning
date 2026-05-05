import { test, expect } from '@playwright/test';

/**
 * THI-151 — AI tutor drawer overflow regression specs (Safari iOS WebKit).
 *
 * Light-touch checks that the drawer renders without horizontal overflow
 * on a real WebKit viewport. Deeper assertions on chat bubble word-break
 * and RateLimitBadge truncation are deferred to the THI-152 mini-PRs
 * that actually fix those findings (audit #1 FINDING-05 + FINDING-06):
 * adding regression tests now would either pass trivially (no chat
 * messages = no overflow possible) or assert behavior we know is
 * currently broken.
 */

test.describe('AI tutor drawer — Safari iOS WebKit (THI-151)', () => {
  test('drawer can be opened from /app without horizontal overflow', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();
    await fab.click();

    // The drawer is identified by role="dialog" + aria-modal in AiTutorPanel.
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    // No element overflows the viewport horizontally while drawer is open.
    const viewportWidth = page.viewportSize()!.width;
    const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(docScrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('drawer panel respects max-width on mobile (no edge-to-edge bleed)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    const drawerBox = await drawer.boundingBox();
    expect(drawerBox).not.toBeNull();

    const viewportWidth = page.viewportSize()!.width;
    // The drawer must fit fully inside the viewport (≤ viewport width).
    expect(drawerBox!.width).toBeLessThanOrEqual(viewportWidth);
    expect(drawerBox!.x).toBeGreaterThanOrEqual(0);
    expect(drawerBox!.x + drawerBox!.width).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('drawer can be closed via Escape key (focus trap contract)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });
});
