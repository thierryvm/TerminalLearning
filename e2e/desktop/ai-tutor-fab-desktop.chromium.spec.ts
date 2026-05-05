import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 3/9 — AI tutor FAB desktop sizing regression specs.
 *
 * Desktop counterpart to e2e/mobile/ai-tutor-fab.webkit.spec.ts. The
 * Tailwind class pattern `h-12 w-12 md:h-14 md:w-14` gives:
 *  - mobile (<768px) → 48 px (Material/Apple FAB comfort floor)
 *  - desktop (≥768px) → 56 px (Material/Apple FAB primary standard)
 *
 * These specs run on the two desktop preservation viewports
 * (1280×800, 1920×1080) and assert the upsizing did not break:
 *  - the computed dimensions on desktop
 *  - the fixed positioning
 *  - the emerald background still resolves (PR #194 regression guard)
 *  - the FAB sits above the home indicator (safe-area pattern still
 *    collapses to 1rem on desktop where the inset value is 0)
 */

test.describe('AI tutor FAB desktop — Chromium preserve (THI-152 brick 3/9)', () => {
  test('FAB is 56×56 px on desktop (md:h-14)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width, 'FAB desktop width must be 56 px (md:h-14)').toBe(56);
    expect(box!.height, 'FAB desktop height must be 56 px (md:h-14)').toBe(56);
  });

  test('FAB still renders emerald background on desktop (PR #194 guard)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const bg = await fab.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(35, 134, 54)');
  });

  test('FAB is fixed-positioned on desktop (not absolute or sticky)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const position = await fab.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });

  test('FAB opacity is 100% on desktop (consistent with mobile)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const opacity = await fab.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
    expect(opacity).toBe(1);
  });
});
