import { test, expect } from '@playwright/test';

/**
 * SEO / GEO / OpenGraph / Structured data tests
 * Runs only on Chromium (desktop) — meta tags are static in index.html.
 */

test.use({ ...{ viewport: { width: 1280, height: 720 } } });

test.describe('SEO — primary meta tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('title tag is present and meaningful', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Terminal Learning');
    expect(title.length).toBeGreaterThan(20);
    expect(title.length).toBeLessThan(70);
  });

  test('meta description exists and has correct length', async ({ page }) => {
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).not.toBeNull();
    expect(desc!.length).toBeGreaterThan(50);
    expect(desc!.length).toBeLessThan(160);
  });

  test('canonical URL is set', async ({ page }) => {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('terminal-learning.vercel.app');
  });

  test('robots meta allows indexing', async ({ page }) => {
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).not.toContain('noindex');
    expect(robots).toContain('index');
  });

  test('lang attribute is set on html element', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('fr');
  });
});

test.describe('GEO meta tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('geo.region is set to BE (Belgium)', async ({ page }) => {
    const region = await page.locator('meta[name="geo.region"]').getAttribute('content');
    expect(region).toBe('BE');
  });

  test('geo.placename is set', async ({ page }) => {
    const place = await page.locator('meta[name="geo.placename"]').getAttribute('content');
    expect(place).toBeTruthy();
  });
});

test.describe('OpenGraph meta tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('og:type is website', async ({ page }) => {
    const type = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(type).toBe('website');
  });

  test('og:title is present', async ({ page }) => {
    const title = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(title).toContain('Terminal Learning');
  });

  test('og:description is present', async ({ page }) => {
    const desc = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(desc).not.toBeNull();
    expect(desc!.length).toBeGreaterThan(30);
  });

  test('og:image is set with absolute URL', async ({ page }) => {
    const img = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(img).toMatch(/^https?:\/\//);
    expect(img).toContain('og-image');
  });

  test('og:image dimensions are set (1200x630)', async ({ page }) => {
    const w = await page.locator('meta[property="og:image:width"]').getAttribute('content');
    const h = await page.locator('meta[property="og:image:height"]').getAttribute('content');
    expect(w).toBe('1200');
    expect(h).toBe('630');
  });

  test('og:url matches canonical', async ({ page }) => {
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(ogUrl).toBe(canonical);
  });

  test('og:locale is fr_BE', async ({ page }) => {
    const locale = await page.locator('meta[property="og:locale"]').getAttribute('content');
    expect(locale).toBe('fr_BE');
  });
});

test.describe('Twitter / X Card meta tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('twitter:card is summary_large_image', async ({ page }) => {
    const card = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(card).toBe('summary_large_image');
  });

  test('twitter:title and twitter:image are set', async ({ page }) => {
    const title = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    const img = await page.locator('meta[name="twitter:image"]').getAttribute('content');
    expect(title).toContain('Terminal Learning');
    expect(img).toMatch(/^https?:\/\//);
  });
});

test.describe('Structured data (JSON-LD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('JSON-LD script is present', async ({ page }) => {
    const jsonLd = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonLd).toBeGreaterThan(0);
  });

  test('JSON-LD contains WebSite, SoftwareApplication and Course', async ({ page }) => {
    const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(jsonLdText!);
    const types = data['@graph'].map((item: { '@type': string }) => item['@type']);
    expect(types).toContain('WebSite');
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('Course');
  });

  test('SoftwareApplication is marked as free and family-friendly', async ({ page }) => {
    const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(jsonLdText!);
    const app = data['@graph'].find((item: { '@type': string }) => item['@type'] === 'SoftwareApplication');
    expect(app.isAccessibleForFree).toBe(true);
    expect(app.isFamilyFriendly).toBe(true);
  });
});

test.describe('Theme and accessibility hints', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('theme-color meta is set', async ({ page }) => {
    const color = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(color).toBeTruthy();
  });

  test('viewport meta includes width=device-width', async ({ page }) => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });
});
