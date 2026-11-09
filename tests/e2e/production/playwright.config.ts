import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

// Deliberately independent of the development config: no server, seed or migration.
export default defineConfig({
  testDir: '.',
  testMatch: '*.production.ts',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  outputDir: resolve(process.env.TIO_PROD_RESULTS ?? 'test-results/production', 'artifacts'),
  reporter: [
    ['list'],
    ['json', { outputFile: resolve(process.env.TIO_PROD_RESULTS ?? 'test-results/production', 'playwright-results.json') }],
    ['junit', { outputFile: resolve(process.env.TIO_PROD_RESULTS ?? 'test-results/production', 'junit.xml') }],
  ],
  use: {
    baseURL: 'https://nb01994.vitronic.de',
    channel: 'msedge',
    ignoreHTTPSErrors: false,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
