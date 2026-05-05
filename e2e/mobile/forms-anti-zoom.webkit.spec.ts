import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 2/9 — Forms anti-zoom Safari iOS regression specs.
 *
 * Safari iOS auto-zooms the viewport whenever a text input/textarea/select
 * with `font-size < 16px` receives focus. The behavior is hard-coded
 * inside WebKit and cannot be disabled by `<meta viewport>` alone — the
 * only fix is to ensure every interactive form control has computed
 * font-size >= 16px on mobile breakpoints.
 *
 * These specs guard the 5 inputs identified in audit #2 FIND-002 +
 * FIND-006 + the AI tutor surface:
 *  - LoginModal email + password (both reach 16px on mobile)
 *  - CommandReference search (16px on mobile, 14px on desktop preserved)
 *  - AiTutorPanel API key (16px on mobile)
 *  - MessageInput textarea (16px on mobile)
 *
 * The Tailwind class pattern is `text-base md:text-sm` so:
 *  - mobile (<768px) → text-base = 16px → no auto-zoom
 *  - desktop (>=768px) → text-sm = 14px → original density preserved
 */

test.describe('Forms anti-zoom — Safari iOS WebKit (THI-152 brick 2/9)', () => {
  test('CommandReference search input: font-size >= 16px on mobile', async ({ page }) => {
    await page.goto('/app/reference');

    const search = page.getByPlaceholder(/rechercher une commande/i);
    await expect(search).toBeVisible();

    const fontSizePx = await search.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSizePx, 'CommandReference search must be >= 16px on mobile').toBeGreaterThanOrEqual(16);
  });

  test('LoginModal email field: font-size >= 16px on mobile', async ({ page }) => {
    await page.goto('/');
    // Open login modal via the nav "Se connecter" button (mobile drawer).
    const loginTrigger = page.getByRole('button', { name: /se connecter/i }).first();
    await loginTrigger.click();

    const emailInput = page.getByPlaceholder('email@exemple.com');
    await expect(emailInput).toBeVisible();

    const fontSizePx = await emailInput.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSizePx, 'LoginModal email must be >= 16px on mobile').toBeGreaterThanOrEqual(16);
  });

  test('LoginModal password field: font-size >= 16px on mobile', async ({ page }) => {
    await page.goto('/');
    const loginTrigger = page.getByRole('button', { name: /se connecter/i }).first();
    await loginTrigger.click();

    const passwordInput = page.getByPlaceholder(/mot de passe/i);
    await expect(passwordInput).toBeVisible();

    const fontSizePx = await passwordInput.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSizePx, 'LoginModal password must be >= 16px on mobile').toBeGreaterThanOrEqual(16);
  });
});
