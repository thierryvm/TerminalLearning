import { test, expect } from '@playwright/test';

/**
 * THI-151 — Anti-régression desktop-preserve (Chromium).
 *
 * Critère ABSOLU @cowork (Section 11 mobile-responsive-auditor): toute
 * mini-PR THI-152 qui fixe un bug mobile NE DOIT PAS casser le desktop.
 * Cette spec surveille les invariants desktop critiques pour détecter
 * une fuite mobile vers desktop dans n'importe quel future change.
 *
 * Invariants surveillés :
 *  - L'AI tutor FAB conserve son emerald background (#238636) sur
 *    desktop comme sur mobile (PR #194 régression check)
 *  - La nav landing reste fully visible sans overflow horizontal
 *  - L'env switcher landing affiche les 3 boutons sans clip
 *  - Les FABs (AI tutor + scroll-to-top) restent fixed-positioned
 *  - Aucun élément du DOM ne déborde du viewport horizontalement
 */

test.describe('Desktop regression — no mobile leak (THI-151)', () => {
  test('Landing nav: 3 env pills + Commencer button all visible without overflow', async ({ page }) => {
    await page.goto('/');

    const viewportWidth = page.viewportSize()!.width;

    for (const label of ['Linux', 'macOS', 'Windows']) {
      const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 1);
    }

    const commencerBtn = page.locator('nav').getByRole('button', { name: 'Commencer' });
    await expect(commencerBtn).toBeVisible();
  });

  test('AI tutor FAB on /app: emerald background (#238636) preserved on desktop', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const bg = await fab.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Must be rgb(35, 134, 54) — the canonical --github-accent color.
    // PR #194 regression guard: this catches anyone removing the CSS var.
    expect(bg).toBe('rgb(35, 134, 54)');
  });

  test('AI tutor FAB on /app: still fixed-positioned (no mobile-only positioning leak)', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();

    const position = await fab.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });

  test('No element overflows viewport horizontally on landing', async ({ page }) => {
    await page.goto('/');

    const overflowing = await page.evaluate(() => {
      const bodyWidth = document.body.clientWidth;
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.right > bodyWidth + 1;
        })
        .map(
          (el) => el.tagName + (el.className ? '.' + el.className.toString().split(' ')[0] : ''),
        );
    });
    expect(overflowing).toHaveLength(0);
  });

  test('No element overflows viewport horizontally on /app dashboard', async ({ page }) => {
    await page.goto('/app');

    const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(docScrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('GitHub theme CSS vars all resolve (PR #194 regression)', async ({ page }) => {
    await page.goto('/app');

    const vars = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        accent: root.getPropertyValue('--github-accent').trim(),
        accentHover: root.getPropertyValue('--github-accent-hover').trim(),
        bgPrimary: root.getPropertyValue('--github-bg-primary').trim(),
        bgTertiary: root.getPropertyValue('--github-bg-tertiary').trim(),
      };
    });

    // None of the 4 CSS vars added in PR #194 may regress to empty.
    for (const [name, value] of Object.entries(vars)) {
      expect(value, `--github-${name} must remain defined`).not.toBe('');
    }
  });
});
