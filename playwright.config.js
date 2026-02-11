import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'playwright-report-videos',
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    video: 'on',
    baseURL: 'http://localhost:8080',
  },
});
