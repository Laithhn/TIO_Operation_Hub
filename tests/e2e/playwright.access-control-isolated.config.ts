import { defineConfig } from '@playwright/test';

// Actual built SPA, all HTTP intercepted: no application server, database or migrations.
export default defineConfig({
  testDir: '.', testMatch: /-isolated.spec.ts$/, timeout: 30_000, workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://access-control.test', channel: 'msedge', viewport: { width: 1600, height: 1000 }, screenshot: 'only-on-failure' }
});
