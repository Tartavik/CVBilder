import type { PlaywrightTestConfig } from '@playwright/test';
import { defineConfig } from '@playwright/test';

const config: PlaywrightTestConfig = defineConfig({
  testDir: './playwright',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  webServer: [
    {
      command: 'npm run start:api',
      url: 'http://127.0.0.1:3000/api',
      reuseExistingServer: !process.env['CI'],
      timeout: 120 * 1000,
    },
    {
      command: 'npm run start:web -- --host 127.0.0.1 --port 4200',
      url: 'http://127.0.0.1:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120 * 1000,
    },
  ],
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    baseURL: 'http://localhost:4200',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});

export default config;
