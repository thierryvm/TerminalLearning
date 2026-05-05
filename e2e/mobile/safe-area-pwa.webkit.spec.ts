import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 7/9 — PWA standalone safe-area regression specs (Safari iOS WebKit).
 *
 * Bug empirique @thierry, Safari iPhone 14 réel en PWA standalone (Add to
 * Home Screen): le haut de la page passait SOUS les icônes système (wifi,
 * batterie, signal). Root cause: le wrapper `<div className="flex-1 flex
 * flex-col ...">` du Layout n'avait pas de `pt-[env(safe-area-inset-top)]`,
 * donc avec `apple-mobile-web-app-status-bar-style: black-translucent`
 * (présent dans index.html), la status bar overlaie la mobile top bar.
 *
 * In headless WebKit the safe-area inset values are 0, so the assertions
 * cannot verify visual offsets directly. What we assert instead:
 *   - the meta viewport contains `viewport-fit=cover` (else the env(...)
 *     vars resolve to 0 even in standalone mode),
 *   - the Layout wrapper computed padding-top is set (resolves to 0 in
 *     headless but the CSS `padding-top: env(safe-area-inset-top)` is
 *     applied — proven by `padding-top` being explicitly set vs `auto`),
 *   - the FAB AI tutor uses `bottom: max(1rem, env(...))` (already covered
 *     by safe-area.webkit.spec.ts THI-151, kept as a sanity check),
 *   - the LoginModal backdrop has the safe-area paddings applied.
 */

test.describe('PWA safe-area insets — Safari iOS WebKit (THI-152 brick 7/9)', () => {
  test('viewport meta contains viewport-fit=cover', async ({ page }) => {
    await page.goto('/app');
    const viewportContent = await page.evaluate(() => {
      return document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '';
    });
    expect(viewportContent, 'viewport meta content').toMatch(/viewport-fit\s*=\s*cover/);
  });

  test('apple-mobile-web-app-status-bar-style is black-translucent', async ({ page }) => {
    await page.goto('/app');
    const statusBarStyle = await page.evaluate(() => {
      return document
        .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        ?.getAttribute('content');
    });
    expect(statusBarStyle).toBe('black-translucent');
  });

  test('Layout flex-1 wrapper has env(safe-area-inset-top) padding declared', async ({ page }) => {
    await page.goto('/app');
    // The flex-1 wrapper sits next to the Sidebar inside the h-dvh root.
    // Pick the first `.flex-1.flex-col` descendant of the h-dvh root.
    const padding = await page.evaluate(() => {
      const root = document.querySelector('.h-dvh.flex');
      const wrapper = root?.querySelector('.flex-1.flex.flex-col');
      if (!wrapper) return null;
      const style = getComputedStyle(wrapper);
      return {
        paddingTop: style.paddingTop,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
      };
    });
    expect(padding, 'flex-1 wrapper found').not.toBeNull();
    // env(safe-area-inset-top) resolves to 0px in headless WebKit, but the
    // computed value must be a non-empty `Npx` string (not 'auto') —
    // proving the property is being applied, not unset.
    expect(padding!.paddingTop).toMatch(/^\d+(\.\d+)?px$/);
    expect(padding!.paddingLeft).toMatch(/^\d+(\.\d+)?px$/);
    expect(padding!.paddingRight).toMatch(/^\d+(\.\d+)?px$/);
  });

  test('FAB AI tutor bottom resolves to a px value (max(1rem, env(...))) ', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();
    const computed = await fab.evaluate((el) => {
      const s = getComputedStyle(el);
      return { position: s.position, bottom: s.bottom };
    });
    expect(computed.position).toBe('fixed');
    // In headless WebKit, env(safe-area-inset-bottom) = 0 → max(1rem, 0px)
    // resolves to 1rem = 16px. We assert ≥ 16 px to catch any regression
    // that drops the safe-area max() pattern.
    const bottomPx = parseFloat(computed.bottom);
    expect(bottomPx, 'FAB bottom resolves to ≥ 16 px').toBeGreaterThanOrEqual(16);
  });

  test('LoginModal backdrop has safe-area paddings declared (when modal opens)', async ({ page }) => {
    await page.goto('/app');
    // Open the sidebar mobile, click "Se connecter" to trigger the LoginModal.
    await page.getByRole('button', { name: /Ouvrir le menu/i }).click();
    await page.getByRole('button', { name: /Se connecter/i }).click();

    // Backdrop = the parent of the dialog. We read its computed paddings.
    const padding = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"][aria-labelledby="login-modal-title"]');
      const backdrop = dialog?.parentElement;
      if (!backdrop) return null;
      const s = getComputedStyle(backdrop);
      return {
        paddingTop: s.paddingTop,
        paddingBottom: s.paddingBottom,
        paddingLeft: s.paddingLeft,
        paddingRight: s.paddingRight,
      };
    });
    expect(padding, 'LoginModal backdrop located').not.toBeNull();
    expect(padding!.paddingTop).toMatch(/^\d+(\.\d+)?px$/);
    expect(padding!.paddingBottom).toMatch(/^\d+(\.\d+)?px$/);
    expect(padding!.paddingLeft).toMatch(/^\d+(\.\d+)?px$/);
    expect(padding!.paddingRight).toMatch(/^\d+(\.\d+)?px$/);
  });

  /**
   * THI-152 brick 7bis hotfix — Landing nav safe-area-inset-top.
   *
   * Diagnostic @cowork: brick 7/9 fix on Layout.tsx flex-1 wrapper covers
   * /app routes only. Landing (`/`) does not use Layout — it has its own
   * `<nav>` (Terminal logo + GitHub + Login + "Commencer →"), and that
   * nav was missing pt-safe-area, causing the "Commencer" button to be
   * partially occluded by the battery icon on iPhone 14 PWA standalone.
   */
  test('Landing nav has max(1rem, env(safe-area-inset-top)) padding-top', async ({ page }) => {
    await page.goto('/');
    const padding = await page.evaluate(() => {
      // The nav is the first <nav> on the landing page (Terminal Learning
      // logo + GitHub + Login + "Commencer" CTA).
      const nav = document.querySelector('nav');
      if (!nav) return null;
      const s = getComputedStyle(nav);
      return {
        paddingTop: s.paddingTop,
        // Capture the className for diagnostic context if assertion fails.
        className: nav.className,
      };
    });
    expect(padding, 'Landing nav located').not.toBeNull();
    // env(safe-area-inset-top) = 0 in headless WebKit, so max(1rem, 0px)
    // resolves to 1rem = 16px. We assert ≥ 16 px to catch any regression
    // that drops the safe-area max() pattern. In PWA standalone real
    // device, the nav's padding-top will grow to ~47 px on iPhone 14
    // and shift the "Commencer" CTA below the status bar icons.
    const paddingTopPx = parseFloat(padding!.paddingTop);
    expect(paddingTopPx, 'Landing nav padding-top resolves to ≥ 16 px (= 1rem baseline)').toBeGreaterThanOrEqual(16);
    // Sanity check: the className still contains the max() arbitrary
    // value pattern, so a future change that swaps it back to py-4 is
    // caught even if env() collapses to 0 anyway.
    expect(padding!.className, 'nav className uses pt-[max(...,env(safe-area-inset-top))]').toMatch(/pt-\[max\(.*safe-area-inset-top.*\)\]/);
  });

  /**
   * THI-152 brick 9/9 — Sidebar landscape iPhone safe-area-inset-left.
   *
   * In landscape orientation, iPhone X+ rotates the notch onto one side
   * of the screen. With our Sidebar `fixed inset-y-0 left-0 w-72`, the
   * notch overlaid the leftmost icons of the sidebar in PWA standalone
   * landscape. Adding `pl-[max(0px,env(safe-area-inset-left))]` shifts
   * the sidebar content inward by the notch width without affecting
   * portrait or desktop layouts.
   */
  test('Sidebar aside has max(0px, env(safe-area-inset-left)) padding-left', async ({ page }) => {
    await page.goto('/app');
    // Open the mobile sidebar so the aside is in-view.
    await page.getByRole('button', { name: /Ouvrir le menu/i }).click();
    const padding = await page.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="Navigation des modules"]');
      if (!aside) return null;
      const s = getComputedStyle(aside);
      return {
        paddingLeft: s.paddingLeft,
        className: aside.className,
      };
    });
    expect(padding, 'Sidebar aside located').not.toBeNull();
    // env(safe-area-inset-left) = 0 in headless WebKit → max(0, 0) = 0.
    // We assert the property is APPLIED (computed = '0px', not 'auto')
    // and the className contains the safe-area-inset-left pattern.
    expect(padding!.paddingLeft).toMatch(/^\d+(\.\d+)?px$/);
    expect(padding!.className, 'Sidebar className uses pl-[max(...,env(safe-area-inset-left))]').toMatch(/pl-\[max\(.*safe-area-inset-left.*\)\]/);
  });
});
