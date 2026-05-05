import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 2/9 — Desktop preservation guard for forms.
 *
 * Counterpart to e2e/mobile/forms-anti-zoom.webkit.spec.ts: on desktop
 * (≥1024 px in our matrix), the inputs must keep their original 14 px
 * density (`text-sm` via the `md:text-sm` Tailwind responsive variant).
 * The mobile fix MUST NOT regress desktop typography.
 *
 * Safari auto-zoom is irrelevant on desktop because there is no
 * software keyboard; the visual density bump from 14 px → 16 px would
 * waste space in dense forms.
 */

test.describe('Forms density preserve — desktop Chromium (THI-152 brick 2/9)', () => {
  test('CommandReference search input: font-size = 14px on desktop', async ({ page }) => {
    await page.goto('/app/reference');

    const search = page.getByPlaceholder(/rechercher une commande/i);
    await expect(search).toBeVisible();

    const fontSizePx = await search.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSizePx, 'CommandReference search must remain 14px on desktop').toBeCloseTo(14, 0);
  });

  test('LoginModal email field: font-size = 14px on desktop', async ({ page }) => {
    await page.goto('/');
    const loginTrigger = page.getByRole('button', { name: /se connecter/i }).first();
    await loginTrigger.click();

    const emailInput = page.getByPlaceholder('email@exemple.com');
    await expect(emailInput).toBeVisible();

    const fontSizePx = await emailInput.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSizePx, 'LoginModal email must remain 14px on desktop').toBeCloseTo(14, 0);
  });
});
