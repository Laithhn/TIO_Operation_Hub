import { defineConfig } from '@playwright/test';

// UAT run: the same suite against an already running release package (for example release\TioHub-<version>\app started with
// Development sign-in on a scratch database upgraded with database\01-schema.sql). Nothing is built or started here.
// Usage: TIOHUB_UAT_URL=http://127.0.0.1:5198 npx playwright test -c playwright.uat.config.ts
const baseURL = process.env.TIOHUB_UAT_URL;
if (!baseURL) throw new Error('Set TIOHUB_UAT_URL to the running package, e.g. http://127.0.0.1:5198.');
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  workers: 1,
  outputDir: 'test-results-uat',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-uat' }]],
  use: { baseURL, channel: 'msedge', viewport: { width: 1600, height: 900 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' }
});
