import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 5/9 — Desktop preservation guard for touch targets.
 *
 * Counterpart to e2e/mobile/touch-targets.webkit.spec.ts (THI-152
 * brick 5/9 section). The mini-PR bumped three sub-44 mobile buttons
 * to min-h-11 (44 px) but kept md:min-h-9 (36 px) on desktop so the
 * historical compact density is preserved. These specs assert the
 * desktop bound: each targeted button must remain ≤ 40 px tall on
 * 1280×800 / 1920×1080. Catches a future regression where a fix
 * forgets the responsive variant and balloons the desktop UI.
 *
 * Untargeted buttons (icon-lg = size-11 → 44 px on both viewports,
 * LoginModal close, Sidebar close, MenuButton) are not asserted here
 * — they were intentionally left untouched and 44 px is acceptable
 * desktop density per @cowork posture senior ("don't shrink what
 * already meets the floor on both viewports").
 */

test.describe('Touch targets desktop preserve — THI-152 brick 5/9', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('AI tutor drawer close button ≤ 40 px on desktop (compact preserved)', async ({ page }) => {
    const closeBtn = page.getByRole('button', { name: /Fermer le tuteur IA/i });
    await expect(closeBtn).toBeVisible();
    const box = await closeBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height, 'drawer close button height (md:min-h-9)').toBeLessThanOrEqual(40);
  });

  test('AI tutor ProviderPicker pills ≤ 40 px height on desktop', async ({ page }) => {
    const pill = page.getByRole('radio').first();
    await expect(pill).toBeVisible();
    const box = await pill.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height, 'ProviderPicker pill height (md:min-h-9)').toBeLessThanOrEqual(40);
  });

  test('AI tutor MessageInput "Envoyer" button ≤ 40 px height on desktop', async ({ page }) => {
    const sendBtn = page.getByRole('button', { name: 'Envoyer' });
    if (await sendBtn.count() === 0) {
      test.skip(true, 'Send button rendered only post-consent — not in this flow');
    }
    await expect(sendBtn).toBeVisible();
    const box = await sendBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height, 'Envoyer button height (md:min-h-9)').toBeLessThanOrEqual(40);
  });

  /**
   * The AI tutor FAB Sparkles is intentionally exempt from the ≤40 px
   * desktop rule. A FAB is the primary visual action anchor of its
   * surface (Material 3 + Apple HIG) and 56 px on desktop was
   * empirically validated by @thierry as well-proportioned in
   * THI-152 brick 5/9 Option D. We assert ≤60 px as the upper safety
   * bound to catch a future accidental bump beyond the FAB primary
   * standard, but the rest of the icon-touch buttons stay ≤40 px.
   */
  test('AI tutor FAB ≤ 60 px on desktop (FAB primary action exemption)', async ({ page }) => {
    // Close the drawer opened in beforeEach so the FAB trigger is visible.
    await page.keyboard.press('Escape');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();
    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width, 'FAB desktop width — primary action exemption').toBeLessThanOrEqual(60);
    expect(box!.height, 'FAB desktop height — primary action exemption').toBeLessThanOrEqual(60);
    // Lower bound preserved: the FAB must remain ≥ 56 px (md:h-14)
    // so a regression that downsizes it back to 48 px is caught.
    expect(box!.width, 'FAB desktop width must remain ≥ 56 px (md:h-14)').toBeGreaterThanOrEqual(56);
    expect(box!.height, 'FAB desktop height must remain ≥ 56 px (md:h-14)').toBeGreaterThanOrEqual(56);
  });
});
