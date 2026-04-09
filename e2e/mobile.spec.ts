import { test, expect } from '@playwright/test';

/**
 * Mobile layout tests — run on iPhone SE (375px) and Galaxy S9+ (360px)
 * Verifies: no horizontal overflow, nav visible, env selector contained.
 */

test.describe('Mobile layout — landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('no horizontal scroll at mobile viewport', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('nav: logo icon visible', async ({ page }) => {
    const logo = page.locator('nav svg').first();
    await expect(logo).toBeVisible();
  });

  test('nav: Commencer button visible and not clipped', async ({ page }) => {
    // Target the nav Commencer button specifically (exact label, inside nav)
    const btn = page.locator('nav').getByRole('button', { name: 'Commencer' });
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    const viewportWidth = page.viewportSize()!.width;
    // Button must be fully inside viewport (right edge not clipped)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 2);
  });

  test('nav: login button or icon always visible (not hidden)', async ({ page }) => {
    // When logged out, the login button must be visible
    const loginBtn = page.getByRole('button', { name: /se connecter/i });
    await expect(loginBtn).toBeVisible();
  });

  test('env selector: all 3 environment buttons visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /linux/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /macos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /windows/i })).toBeVisible();
  });

  test('env selector: no button clipped outside viewport', async ({ page }) => {
    const viewportWidth = page.viewportSize()!.width;
    for (const label of ['Linux', 'macOS', 'Windows']) {
      const btn = page.getByRole('button', { name: new RegExp(label, 'i') });
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 1);
    }
  });

  test('env selector: switching env updates content', async ({ page }) => {
    await page.getByRole('button', { name: /windows/i }).click();
    await expect(page.getByText(/powershell/i).first()).toBeVisible();

    await page.getByRole('button', { name: /linux/i }).click();
    await expect(page.getByText(/navigation & fichiers/i).first()).toBeVisible();
  });

  test('h1 visible and contains key text', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('terminal');
  });

  test('no element overflows body horizontally', async ({ page }) => {
    const overflowing = await page.evaluate(() => {
      const bodyWidth = document.body.clientWidth;
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.right > bodyWidth + 1;
        })
        .map((el) => el.tagName + (el.className ? '.' + el.className.toString().split(' ')[0] : ''));
    });
    expect(overflowing).toHaveLength(0);
  });
});

test.describe('Mobile layout — app pages', () => {
  test('dashboard page: no horizontal overflow', async ({ page }) => {
    await page.goto('/app');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('privacy page: renders and no overflow', async ({ page }) => {
    await page.goto('/privacy');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
