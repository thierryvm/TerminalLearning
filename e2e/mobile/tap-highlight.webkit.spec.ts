import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 9/9 — Tap highlight transparent regression spec (WebKit).
 *
 * Safari / Chrome iOS show a translucent grey rectangle by default
 * when a user taps a link/button. The TL design system relies on
 * `:active` states (active:scale-95 on the FAB, hover:bg-* fallbacks
 * elsewhere) for tap feedback that is brand-coherent. The grey
 * iOS overlay clashes with the dark GitHub palette, so we set
 * `-webkit-tap-highlight-color: transparent` on the universal
 * selector in theme.css.
 *
 * The computed value of `-webkit-tap-highlight-color` is a CSS
 * color string. Transparent resolves to `rgba(0, 0, 0, 0)`.
 */

test.describe('Tap highlight transparent — Safari iOS WebKit (THI-152 brick 9/9)', () => {
  test('FAB AI tutor has transparent -webkit-tap-highlight-color', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();
    const tapHighlight = await fab.evaluate(
      (el) => getComputedStyle(el).getPropertyValue('-webkit-tap-highlight-color'),
    );
    // `transparent` keyword serializes to rgba(0, 0, 0, 0) in computed
    // style. We accept both forms (some WebKit builds keep the keyword).
    expect(tapHighlight.trim()).toMatch(/^(rgba\(0,\s*0,\s*0,\s*0\)|transparent)$/);
  });

  test('Landing CTA has transparent -webkit-tap-highlight-color', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('button', { name: /^Commencer$/ }).first();
    await expect(cta).toBeVisible();
    const tapHighlight = await cta.evaluate(
      (el) => getComputedStyle(el).getPropertyValue('-webkit-tap-highlight-color'),
    );
    expect(tapHighlight.trim()).toMatch(/^(rgba\(0,\s*0,\s*0,\s*0\)|transparent)$/);
  });
});
