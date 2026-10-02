import { defineConfig, devices } from '@playwright/test';

// Dedicated port avoids colliding with a local :3000 that lacks E2E_BYPASS_AUTH.
const e2ePort = process.env.PLAYWRIGHT_PORT ?? '3001';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Field resilience shares origin storage/IDB; keep serial to avoid cross-test races.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `pnpm --filter web dev --port ${e2ePort}`,
    url: baseURL,
    // Only reuse when explicitly opted in AND the server was started with E2E_BYPASS_AUTH=1.
    reuseExistingServer: process.env.PW_REUSE === '1',
    timeout: 120_000,
    env: {
      E2E_BYPASS_AUTH: '1',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
