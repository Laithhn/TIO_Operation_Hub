import { defineConfig } from '@playwright/test';

// DEVELOPMENT ONLY. The suite creates, changes and deletes TIO_AUDIT_TEST_ records.
// It refuses to run against anything but a local address unless TIOHUB_AUDIT_ALLOW_HOST names the verified development host.
const baseURL = process.env.TIOHUB_BASE_URL ?? 'http://127.0.0.1:5094';
const host = new URL(baseURL).hostname;
const local = ['127.0.0.1', 'localhost', '::1'].includes(host);
if (!local && process.env.TIOHUB_AUDIT_ALLOW_HOST !== host)
  throw new Error(`Refusing to run state-changing audit tests against ${host}. Verify it is an isolated development environment, then set TIOHUB_AUDIT_ALLOW_HOST=${host}.`);

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['json', { outputFile: 'results/results.json' }], ['html', { open: 'never', outputFolder: 'results/html' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1366, height: 768 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  outputDir: 'results/artifacts'
});
