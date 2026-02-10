import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for Emoji Whisper E2E tests.
 *
 * Tests use a custom fixture (tests/e2e/helpers/extension-fixture.ts) that
 * launches a persistent Chromium context with the built extension sideloaded.
 * The default `projects` array is intentionally omitted because the extension
 * only targets Chromium-based browsers.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npx serve tests/e2e/fixtures -l 3333 --no-clipboard',
    port: 3333,
    reuseExistingServer: !process.env.CI,
  },
});
