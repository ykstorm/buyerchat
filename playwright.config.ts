import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — e2e + a11y scaffolding for buyerchat.
 *
 * Sprint I24: tests are SCAFFOLDED only. Most specs skip-gracefully when
 * prerequisites (dev server, test DB, OAuth stub) are missing. CI wiring
 * is a follow-up sprint.
 *
 * Run locally:
 *   npm run test:e2e        — full suite (needs dev server running or webServer below)
 *   npm run test:smoke      — smoke only
 *   npm run test:a11y       — axe audit only
 *   npm run test:e2e:ui     — interactive mode
 *
 * Skip flags:
 *   E2E_SKIP=true           — skip specs that need a test DB / OAuth stub
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 667 },
      },
      testMatch: /smoke\/.*\.spec\.ts$/,
    },
  ],

  // Only auto-spawn the dev server when actually executing tests.
  // `playwright test --list` does NOT trigger this.
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
