import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 4/9 — PWA iOS compliance regression specs.
 *
 * Closes audit #1 FINDING-03 (apple-touch-icon was an SVG, iOS does not
 * support SVG home-screen icons reliably and forced a blurry screenshot
 * fallback) and FINDING-04 (apple-mobile-web-app-capable meta was
 * absent, so the app launched inside Mobile Safari chrome instead of
 * full-screen after Add-to-Home-Screen).
 *
 * Specs run on Chromium desktop because the meta tags are parsed at
 * HTML load time, not at runtime — same DOM regardless of browser.
 * Behavior on real Safari iOS is empirically validated by @thierry
 * via the Add-to-Home-Screen flow on his iPhone 14.
 *
 * What these specs guard:
 *  - apple-touch-icon link points to a .png file (not .svg)
 *  - apple-touch-icon link declares sizes="180x180"
 *  - apple-mobile-web-app-capable meta is "yes"
 *  - apple-mobile-web-app-status-bar-style is set
 *  - apple-mobile-web-app-title is set (label under the icon)
 *  - the .png file is reachable (HTTP 200)
 */

test.describe('PWA iOS compliance — apple-touch-icon + standalone meta (THI-152 brick 4/9)', () => {
  test('apple-touch-icon link points to a 180×180 PNG (not SVG)', async ({ page }) => {
    await page.goto('/');

    const link = page.locator('link[rel="apple-touch-icon"]');
    await expect(link).toHaveCount(1);

    const href = await link.getAttribute('href');
    expect(href, 'apple-touch-icon must point to a PNG').toMatch(/\.png$/);

    const sizes = await link.getAttribute('sizes');
    expect(sizes, 'apple-touch-icon must declare sizes="180x180"').toBe('180x180');
  });

  test('apple-touch-icon.png is reachable (HTTP 200)', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/apple-touch-icon.png`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('apple-mobile-web-app-capable meta is "yes"', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(meta).toHaveCount(1);
    await expect(meta).toHaveAttribute('content', 'yes');
  });

  test('apple-mobile-web-app-status-bar-style is "black-translucent"', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="apple-mobile-web-app-status-bar-style"]');
    await expect(meta).toHaveCount(1);
    await expect(meta).toHaveAttribute('content', 'black-translucent');
  });

  test('apple-mobile-web-app-title is "Terminal Learning"', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="apple-mobile-web-app-title"]');
    await expect(meta).toHaveCount(1);
    await expect(meta).toHaveAttribute('content', 'Terminal Learning');
  });
});
