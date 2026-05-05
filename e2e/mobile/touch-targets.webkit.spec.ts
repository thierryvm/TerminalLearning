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
