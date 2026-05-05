import { test, expect } from '@playwright/test';

/**
 * THI-151 — AI tutor FAB regression specs (Safari iOS WebKit).
 *
 * Guards against regression of:
 * - FINDING-01 (audit #1, fixed in PR #194): the 4 GitHub theme CSS vars
 *   (--github-accent, --github-accent-hover, --github-bg-primary,
 *   --github-bg-tertiary) must always resolve to a non-empty string,
 *   otherwise the FAB renders transparent (the canonical BUG-FAB-001).
 * - The FAB hit area must remain ≥ 44×44 px (Apple HIG).
 * - The FAB must remain visible on the page (not occluded, not
 *   collapsed by a transparent background).
 *
 * If a future PR drops or renames a CSS var, or downsizes the FAB
 * below 44px, these specs catch it before merge.
 */

test.describe('AI tutor FAB — Safari iOS WebKit regression (THI-151)', () => {
  test('CSS vars from theme.css all resolve to non-empty values', async ({ page }) => {
    await page.goto('/app');

    const vars = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        accent: root.getPropertyValue('--github-accent').trim(),
        accentHover: root.getPropertyValue('--github-accent-hover').trim(),
        bgPrimary: root.getPropertyValue('--github-bg-primary').trim(),
        bgTertiary: root.getPropertyValue('--github-bg-tertiary').trim(),
        bgBase: root.getPropertyValue('--github-bg').trim(),
      };
    });

    expect(vars.accent, '--github-accent must be defined').not.toBe('');
    expect(vars.accentHover, '--github-accent-hover must be defined').not.toBe('');
    expect(vars.bgPrimary, '--github-bg-primary must be defined').not.toBe('');
    expect(vars.bgTertiary, '--github-bg-tertiary must be defined').not.toBe('');
    expect(vars.bgBase, '--github-bg must be defined').not.toBe('');

    // Sourcery alias drift fix (PR #194): bgPrimary must resolve to the
    // same value as bgBase via the var() chain.
    expect(vars.bgPrimary).toBe(vars.bgBase);
  });

  test('FAB has non-transparent emerald background', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const bg = await fab.evaluate((el) => getComputedStyle(el).backgroundColor);
    // rgb(35, 134, 54) corresponds to --github-accent: #238636
    expect(bg).toBe('rgb(35, 134, 54)');
    // Defensive: backgroundColor must never resolve to empty / transparent
    expect(bg).not.toBe('');
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe('transparent');
  });

  test('FAB hit area is 48×48 px on mobile (h-12, comfort over Apple HIG floor)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    // Tightened from "≥ 44" to "= 48" after THI-152 brick 3/9 bumped the
    // mobile FAB to h-12 w-12 (48 px). Catches a future regression that
    // would silently shrink it back to 44 px (the Apple HIG floor with
    // no comfort margin).
    expect(box!.width, 'FAB mobile width must be 48 px (h-12)').toBe(48);
    expect(box!.height, 'FAB mobile height must be 48 px (h-12)').toBe(48);
  });

  test('FAB opacity is 100% (no hover-dependent visibility on touch)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const opacity = await fab.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
    // THI-152 brick 3/9 dropped opacity-80 + hover:opacity-100 because
    // Safari iOS has no hover state — the FAB was permanently 80%
    // transparent and visually absorbed into the terminal panel chrome.
    expect(opacity, 'FAB opacity must be 1 (always full visibility)').toBe(1);
  });

  test('FAB is rendered as a fixed positioned element', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const position = await fab.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });
});
