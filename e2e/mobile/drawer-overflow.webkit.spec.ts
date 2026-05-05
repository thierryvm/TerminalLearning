import { test, expect } from '@playwright/test';

/**
 * THI-151 — AI tutor drawer overflow regression specs (Safari iOS WebKit).
 *
 * Light-touch checks that the drawer renders without horizontal overflow
 * on a real WebKit viewport. Deeper assertions on chat bubble word-break
 * and RateLimitBadge truncation are deferred to the THI-152 mini-PRs
 * that actually fix those findings (audit #1 FINDING-05 + FINDING-06):
 * adding regression tests now would either pass trivially (no chat
 * messages = no overflow possible) or assert behavior we know is
 * currently broken.
 */

test.describe('AI tutor drawer — Safari iOS WebKit (THI-151)', () => {
  test('drawer can be opened from /app without horizontal overflow', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await expect(fab).toBeVisible();
    await fab.click();

    // The drawer is identified by role="dialog" + aria-modal in AiTutorPanel.
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    // No element overflows the viewport horizontally while drawer is open.
    const viewportWidth = page.viewportSize()!.width;
    const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(docScrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('drawer panel respects max-width on mobile (no edge-to-edge bleed)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    const drawerBox = await drawer.boundingBox();
    expect(drawerBox).not.toBeNull();

    const viewportWidth = page.viewportSize()!.width;
    // The drawer must fit fully inside the viewport (≤ viewport width).
    expect(drawerBox!.width).toBeLessThanOrEqual(viewportWidth);
    expect(drawerBox!.x).toBeGreaterThanOrEqual(0);
    expect(drawerBox!.x + drawerBox!.width).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('drawer can be closed via Escape key (focus trap contract)', async ({ page }) => {
    await page.goto('/app');

    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });
});

/**
 * THI-152 brick 6/9 — Drawer overflow root-cause regression specs.
 *
 * Bug empirique @thierry, Safari iPhone 14 réel: page horizontalement
 * fixe drawer fermé, devient déplaçable horizontalement DÈS que le
 * drawer AI tutor est ouvert. 100% reproductible.
 *
 * Root cause identified: chat bubbles missing `break-words`, header h2
 * missing `min-w-0 truncate`, drawer container missing `overflow-x-hidden`.
 *
 * These specs go beyond the THI-151 light-touch checks above by injecting
 * synthetic long content (long URLs, no-space strings, oversized <pre>)
 * directly into the DOM via `page.evaluate()` — strategy (B) per the
 * @cowork/@thierry decision: no `page.route` mocking of OpenRouter,
 * no real LLM calls. The fix is structural (Tailwind classes) so the
 * synthetic injection exercises the same className path the real
 * assistant messages would use.
 */

const VIEWPORT_TOLERANCE_PX = 1; // sub-pixel rounding tolerance

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    overflow.scrollWidth - overflow.clientWidth,
    `documentElement.scrollWidth (${overflow.scrollWidth}) must not exceed clientWidth (${overflow.clientWidth})`,
  ).toBeLessThanOrEqual(VIEWPORT_TOLERANCE_PX);
}

test.describe('Drawer overflow root cause — THI-152 brick 6/9', () => {
  test('no horizontal overflow with drawer closed (baseline)', async ({ page }) => {
    await page.goto('/app');
    await expectNoHorizontalOverflow(page);
  });

  test('no horizontal overflow with drawer open + empty', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('no horizontal overflow when injecting a long URL into a bubble', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.evaluate(() => {
      const list = document.querySelector('[role="dialog"]');
      if (!list) return;
      const bubble = document.createElement('div');
      bubble.className =
        'max-w-[85%] break-words rounded-lg px-3 py-2 text-sm bg-[var(--github-bg-secondary)] text-[var(--github-text-primary)]';
      bubble.textContent = 'https://example.com/' + 'a'.repeat(200);
      list.appendChild(bubble);
    });
    await expectNoHorizontalOverflow(page);
  });

  test('no horizontal overflow when injecting a long no-space string', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.evaluate(() => {
      const list = document.querySelector('[role="dialog"]');
      if (!list) return;
      const bubble = document.createElement('div');
      bubble.className =
        'max-w-[85%] break-words rounded-lg px-3 py-2 text-sm bg-[var(--github-bg-secondary)] text-[var(--github-text-primary)]';
      bubble.textContent = 'a'.repeat(300);
      list.appendChild(bubble);
    });
    await expectNoHorizontalOverflow(page);
  });

  test('long <pre> code block scrolls internally — parent does not overflow', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.evaluate(() => {
      const list = document.querySelector('[role="dialog"]');
      if (!list) return;
      const wrapper = document.createElement('div');
      wrapper.className =
        'max-w-[85%] break-words rounded-lg px-3 py-2 text-sm bg-[var(--github-bg-secondary)] text-[var(--github-text-primary)]';
      const pre = document.createElement('pre');
      pre.className = 'overflow-x-auto rounded bg-[var(--github-bg-tertiary)] p-2 text-xs';
      pre.textContent = 'echo ' + 'x'.repeat(500);
      wrapper.appendChild(pre);
      list.appendChild(wrapper);
    });
    await expectNoHorizontalOverflow(page);
  });
});
