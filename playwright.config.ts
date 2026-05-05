import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Single dev server (`npm run dev`) becomes a bottleneck when too many
  // browser workers hit it concurrently — local timeouts on WebKit specs
  // observed at 8 workers, stable at ≤4. CI keeps 1 worker for full
  // determinism.
  workers: process.env.CI ? 1 : 4,
  reporter: [['html', { open: 'never' }], ['line']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    // ── Existing Chromium projects (THI-97 + earlier mobile audit) ─────────
    // Desktop Chromium (default — runs accessibility / seo / mobile suites)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile iPhone SE (375px — worst case) — Chromium emulation
    {
      name: 'mobile-iphone-se',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      },
    },
    // Mobile Galaxy S9+ (360px) — Chromium emulation
    {
      name: 'mobile-galaxy',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 740 },
        deviceScaleFactor: 4,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36',
      },
    },
    // Tablet (768px)
    {
      name: 'tablet',
      use: {
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
        isMobile: false,
        hasTouch: true,
      },
    },

    // ── THI-151 — Real WebKit (Safari iOS) regression projects ────────────
    // These run e2e/mobile/*.webkit.spec.ts only (testIgnore filter ensures
    // they don't pick up the legacy Chromium-emulation suites above).
    {
      name: 'webkit-iphone-14',
      testMatch: /e2e\/mobile\/.*\.webkit\.spec\.ts/,
      use: {
        ...devices['iPhone 14'],
      },
    },
    {
      name: 'webkit-iphone-se',
      testMatch: /e2e\/mobile\/.*\.webkit\.spec\.ts/,
      use: {
        ...devices['iPhone SE'],
      },
    },
    {
      name: 'webkit-iphone-15-pro-max',
      testMatch: /e2e\/mobile\/.*\.webkit\.spec\.ts/,
      use: {
        browserName: 'webkit',
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },

    // ── THI-151 — Desktop Preservation regression projects ────────────────
    // These run e2e/desktop/*.chromium.spec.ts to guarantee that mobile
    // fixes (THI-152) don't regress the desktop layout (LessonPage 44%/42%
    // split, Sidebar always visible, Landing scroll-to-top untouched).
    {
      name: 'desktop-1280',
      testMatch: /e2e\/desktop\/.*\.chromium\.spec\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'desktop-1920',
      testMatch: /e2e\/desktop\/.*\.chromium\.spec\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
