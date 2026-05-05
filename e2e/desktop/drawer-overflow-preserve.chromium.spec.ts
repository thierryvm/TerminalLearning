import { test, expect } from '@playwright/test';

/**
 * THI-152 brick 6/9 — Desktop preservation guard for drawer overflow.
 *
 * Counterpart to e2e/mobile/drawer-overflow.webkit.spec.ts. The fix
 * adds `break-words`, `min-w-0 truncate`, and `overflow-x-hidden
 * max-w-full` to drawer descendants. None of these should affect the
 * 1280×800 / 1920×1080 desktop layout — the floating 420×600 card on
 * md+ has fixed dimensions and the same long-content injections that
 * trigger overflow on a 393 px iPhone viewport must remain inside the
 * card on desktop.
 *
 * These specs guard against a future regression where someone removes
 * `md:w-[420px]` or breaks the overflow-x-hidden in a way that lets
 * the drawer leak past its desktop card bounds.
 */

const VIEWPORT_TOLERANCE_PX = 1;

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });
  expect(
    overflow.scrollWidth - overflow.clientWidth,
    `documentElement.scrollWidth (${overflow.scrollWidth}) must not exceed clientWidth (${overflow.clientWidth})`,
  ).toBeLessThanOrEqual(VIEWPORT_TOLERANCE_PX);
}

test.describe('Drawer overflow desktop preserve — THI-152 brick 6/9', () => {
  test('no horizontal overflow with drawer closed (desktop baseline)', async ({ page }) => {
    await page.goto('/app');
    await expectNoHorizontalOverflow(page);
  });

  test('no horizontal overflow with drawer open + empty (desktop)', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('drawer card stays at md:w-[420px] on desktop (long URL injection)', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.evaluate(() => {
      const list = document.querySelector('[role="dialog"]');
      if (!list) return;
      const bubble = document.createElement('div');
      bubble.className = 'max-w-[85%] break-words rounded-lg px-3 py-2 text-sm bg-[var(--github-bg-secondary)] text-[var(--github-text-primary)]';
      bubble.textContent = 'https://example.com/' + 'a'.repeat(200);
      list.appendChild(bubble);
    });

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width, 'drawer card width on desktop (md:w-[420px])').toBeLessThanOrEqual(440);
    await expectNoHorizontalOverflow(page);
  });

  test('drawer card stays at md:w-[420px] on desktop (long no-space string)', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.evaluate(() => {
      const list = document.querySelector('[role="dialog"]');
      if (!list) return;
      const bubble = document.createElement('div');
      bubble.className = 'max-w-[85%] break-words rounded-lg px-3 py-2 text-sm bg-[var(--github-bg-secondary)] text-[var(--github-text-primary)]';
      bubble.textContent = 'a'.repeat(300);
      list.appendChild(bubble);
    });

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width, 'drawer card width on desktop (md:w-[420px])').toBeLessThanOrEqual(440);
    await expectNoHorizontalOverflow(page);
  });

  test('long <pre> code block scrolls internally on desktop — drawer card stable', async ({ page }) => {
    await page.goto('/app');
    const fab = page.getByRole('button', { name: /tuteur IA/i });
    await fab.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.evaluate(() => {
      const list = document.querySelector('[role="dialog"]');
      if (!list) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'max-w-[85%] break-words rounded-lg px-3 py-2 text-sm bg-[var(--github-bg-secondary)] text-[var(--github-text-primary)]';
      const pre = document.createElement('pre');
      pre.className = 'overflow-x-auto rounded bg-[var(--github-bg-tertiary)] p-2 text-xs';
      pre.textContent = 'echo ' + 'x'.repeat(500);
      wrapper.appendChild(pre);
      list.appendChild(wrapper);
    });

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width, 'drawer card width on desktop (md:w-[420px])').toBeLessThanOrEqual(440);
    await expectNoHorizontalOverflow(page);
  });
});
