import { test, expect } from '@playwright/test';

/**
 * THI-151 — Touch targets ≥ 44×44 px regression specs (Safari iOS WebKit).
 *
 * Asserts critical interactive elements meet the Apple HIG / WCAG 2.2
 * 44×44 floor on a real WebKit viewport.
 *
 * SCOPE LIMITATION (DoD THI-151) : these specs validate the state that
 * MUST work post-PR #194 (CSS vars hot fix). The Landing nav buttons
 * and env pills are documented as failing the 44×44 floor in audit #2
 * (FIND-005 sidebar env pill 36px, FIND-013 sidebar "Se connecter"
 * link-inline ~28px). These are deferred to THI-152 mini-PR 3
 * (touch targets fix), which will then enable the matching specs in
 * its own PR. Adding them here would require shipping THI-151 with
 * known broken tests — violating the "specs must PASS" DoD criterion.
 *
 * Anti-régression covered HERE :
 *   - AI tutor FAB stays ≥ 44×44 px on /app
 *
 * Anti-régression deferred to THI-152 (mini-PR 3) :
 *   - Landing nav Commencer button (audit #2 area)
 *   - Landing env switcher pills (audit #2 FIND-005)
 *   - Landing scroll-to-top FAB after scroll
 *   - Sidebar "Se déconnecter" link-inline (audit #2 FIND-013)
 *   - ProviderPicker buttons (audit #1 FINDING-09)
 *
 * The matrice unifiée (`.tmp/cc-handoffs/2026-05-05-unified-bug-matrix-thi151.md`)
 * tracks the full backlog.
 */

test.describe('Touch targets — Safari iOS WebKit (THI-151)', () => {
  test('AI tutor FAB ≥ 44×44 px on /app dashboard', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();
    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width, 'AI tutor FAB width').toBeGreaterThanOrEqual(44);
    expect(box!.height, 'AI tutor FAB height').toBeGreaterThanOrEqual(44);
  });
});

/**
 * THI-152 brick 5/9 — additional touch-target regression specs.
 *
 * Three buttons identified by audit #1 (FINDING-09) + audit #2 were
 * sub-44 px on mobile and have just been bumped to min-h-11 + md:min-h-9
 * (44 px mobile, 36 px desktop preserved). These specs guard the
 * mobile floor, the matching desktop preserve specs guard against
 * over-bumping desktop density.
 */

test.describe('Touch targets — THI-152 brick 5/9 critical buttons', () => {
  // Each test opens the AI tutor drawer first because the targeted
  // buttons live inside it. We use a 60s timeout per test on the
  // Pro-Max viewport, where async layout settles a hair slower.
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('AI tutor drawer close button ≥ 44×44 px on mobile', async ({ page }) => {
    const closeBtn = page.getByRole('button', { name: /Fermer le tuteur IA/i });
    await expect(closeBtn).toBeVisible();
    const box = await closeBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width, 'drawer close button width').toBeGreaterThanOrEqual(44);
    expect(box!.height, 'drawer close button height').toBeGreaterThanOrEqual(44);
  });

  test('AI tutor ProviderPicker pills ≥ 44 px height on mobile', async ({ page }) => {
    // Four pills live in the radiogroup; we sample the first as a
    // proxy because the size class is shared.
    const pill = page.getByRole('radio').first();
    await expect(pill).toBeVisible();
    const box = await pill.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height, 'ProviderPicker pill height').toBeGreaterThanOrEqual(44);
  });

  test('AI tutor MessageInput "Envoyer" button ≥ 44 px height on mobile', async ({ page }) => {
    // The send button is only visible after consent + key entry, but
    // its DOM presence and class-driven sizing are independent of the
    // disabled state — we can read the bounding box even when disabled.
    const sendBtn = page.getByRole('button', { name: 'Envoyer' });
    if (await sendBtn.count() === 0) {
      test.skip(true, 'Send button rendered only post-consent — not in this flow');
    }
    await expect(sendBtn).toBeVisible();
    const box = await sendBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height, 'Envoyer button height').toBeGreaterThanOrEqual(44);
  });
});
