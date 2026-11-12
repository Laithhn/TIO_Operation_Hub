import { defineConfig } from '../../tests/e2e/node_modules/@playwright/test/index.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBaseUrl, validateStorageState } from './safety-policy.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const baseURL = validateBaseUrl(process.env.TIO_AUDIT_BASE_URL);
const storageState = validateStorageState(process.env.TIO_AUDIT_STORAGE_STATE, resolve(here, '../..'));

// This config is independent of tests/e2e/playwright.config.ts. It starts no service and never touches a database.
export default defineConfig({
  testDir: here,
  testMatch: '*.audit.spec.mjs',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: resolve(here, 'results/artifacts'),
  reporter: [['list'], ['json', { outputFile: resolve(here, 'results/playwright-results.json') }]],
  use: {
    baseURL,
    ...(storageState ? { storageState } : {}),
    channel: 'msedge',
    ignoreHTTPSErrors: false,
    serviceWorkers: 'block',
    acceptDownloads: false,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
    navigationTimeout: 20_000,
    actionTimeout: 10_000,
  },
});
