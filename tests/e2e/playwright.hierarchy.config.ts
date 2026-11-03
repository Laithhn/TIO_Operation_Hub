import { defineConfig } from '@playwright/test';

// Exercises the actual production SPA with intercepted HTTP. Starts no API, database, migration or external service.
export default defineConfig({
  testDir: '.', testMatch: 'hierarchy-ui.spec.ts', timeout: 30_000, workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://hierarchy.test', channel: 'msedge', viewport: { width: 1600, height: 1000 }, screenshot: 'only-on-failure' }
});
