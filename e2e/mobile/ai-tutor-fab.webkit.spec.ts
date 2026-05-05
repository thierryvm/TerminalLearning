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

  test('FAB hit area is at least 44×44 px (Apple HIG floor)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width, 'FAB width must be ≥ 44 px').toBeGreaterThanOrEqual(44);
    expect(box!.height, 'FAB height must be ≥ 44 px').toBeGreaterThanOrEqual(44);
  });

  test('FAB is rendered as a fixed positioned element', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const position = await fab.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });
});
