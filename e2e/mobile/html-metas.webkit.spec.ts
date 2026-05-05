import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 9/9 — HTML meta tags regression specs (WebKit).
 *
 * Guards the PWA + theme metadata in `index.html`:
 *   - W3C `mobile-web-app-capable` (added 9/9, silences Chrome DevTools
 *     deprecation warning while iOS Safari still reads the legacy Apple
 *     meta).
 *   - Apple `apple-mobile-web-app-capable` legacy (kept — removing it
 *     would break PWA standalone on existing iOS installs).
 *   - `theme-color` (#0d1117, GitHub-dark canonical — TL is dark-only
 *     without a light/dark toggle so a single meta is sufficient,
 *     `prefers-color-scheme` media split would add no value).
 */

test.describe('HTML meta tags — Safari iOS WebKit (THI-152 brick 9/9)', () => {
  test('W3C mobile-web-app-capable meta is present and = "yes"', async ({ page }) => {
    await page.goto('/');
    const content = await page.evaluate(() => {
      return document.querySelector('meta[name="mobile-web-app-capable"]')?.getAttribute('content');
    });
    expect(content, 'W3C mobile-web-app-capable meta present').toBe('yes');
  });

  test('Apple apple-mobile-web-app-capable legacy meta is still present', async ({ page }) => {
    await page.goto('/');
    const content = await page.evaluate(() => {
      return document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content');
    });
    // Legacy meta MUST stay — iOS Safari still reads it for standalone
    // mode detection. Removing it breaks Add-to-Home-Screen on iOS.
    expect(content, 'Apple legacy meta still present').toBe('yes');
  });

  test('theme-color meta is set to GitHub-dark #0d1117', async ({ page }) => {
    await page.goto('/');
    const content = await page.evaluate(() => {
      return document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
    });
    expect(content, 'theme-color meta present').toBe('#0d1117');
  });
});
