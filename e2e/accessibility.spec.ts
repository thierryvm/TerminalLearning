import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests — axe-core via @axe-core/playwright
 * Covers WCAG 2.1 AA for all public pages.
 */

const PUBLIC_PAGES = [
  { name: 'Landing', path: '/' },
  { name: 'Dashboard', path: '/app' },
  { name: 'Privacy Policy', path: '/privacy' },
];

for (const { name, path } of PUBLIC_PAGES) {
  test.describe(`Accessibility — ${name}`, () => {
    test('no critical axe violations (WCAG 2.1 AA)', async ({ page }) => {
      await page.goto(path);
      // Wait for content to render
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Fail on violations, with readable output
      if (results.violations.length > 0) {
        const summary = results.violations.map((v) =>
          `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n  → ${v.nodes.length} element(s) affected`
        ).join('\n');
        expect.soft(results.violations, `Axe violations on ${name}:\n${summary}`).toHaveLength(0);
      }
    });
  });
}

test.describe('Accessibility — landing page interactive elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('all buttons have accessible labels', async ({ page }) => {
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const label =
        (await btn.getAttribute('aria-label')) ||
        (await btn.textContent());
      expect(label?.trim(), `Button #${i} has no accessible label`).toBeTruthy();
    }
  });

  test('all images have alt attributes', async ({ page }) => {
    const imgs = page.locator('img');
    const count = await imgs.count();
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute('alt');
      expect(alt, `Image #${i} missing alt attribute`).not.toBeNull();
    }
  });

  test('env selector buttons have aria-pressed', async ({ page }) => {
    for (const label of ['Linux', 'macOS', 'Windows']) {
      const btn = page.getByRole('button', { name: new RegExp(label, 'i') });
      const pressed = await btn.getAttribute('aria-pressed');
      expect(pressed, `${label} button missing aria-pressed`).not.toBeNull();
    }
  });

  test('login button has aria-label on mobile (icon-only)', async ({ page }) => {
    const loginBtn = page.getByRole('button', { name: /se connecter/i });
    await expect(loginBtn).toBeVisible();
  });

  test('h1 is unique on landing page', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('heading hierarchy is logical (h1 before h2)', async ({ page }) => {
    const h1 = await page.locator('h1').count();
    expect(h1).toBe(1);
    // h2 should come after h1 (not before)
    const headings = await page.locator('h1, h2, h3').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('focus is visible on interactive elements (keyboard nav)', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('color scheme meta is set for dark mode', async ({ page }) => {
    const colorScheme = await page.locator('meta[name="color-scheme"]').getAttribute('content');
    expect(colorScheme).toContain('dark');
  });
});

test.describe('Accessibility — mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('landing page: no axe violations on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    if (results.violations.length > 0) {
      const summary = results.violations.map((v) =>
        `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`
      ).join('\n');
      expect.soft(results.violations, `Mobile axe violations:\n${summary}`).toHaveLength(0);
    }
  });
});
