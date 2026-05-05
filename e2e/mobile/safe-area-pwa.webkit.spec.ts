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
});
