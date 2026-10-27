import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Runs the real API + built front end against its own LocalDB database with the fictional development seed.
// Uses the locally installed Microsoft Edge (no browser download).
// Set a different port in each tool's local environment when Claude and Codex run E2E concurrently.
const port = Number(process.env.TIOHUB_E2E_PORT ?? 5096);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('TIOHUB_E2E_PORT must be an integer between 1024 and 65535.');
const sqlServer = process.env.TIOHUB_E2E_SQL ?? '(localdb)\\MSSQLLocalDB';
// LocalDB materializes a named database as a fixed MDF path. Give every Playwright process its own name so Claude Code,
// Codex and concurrent local runs cannot race to create or migrate the same TioHub_E2E.mdf file.
const database = `TioHub_E2E_${process.pid}_${randomUUID().replaceAll('-', '')}`;
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: { baseURL: `http://127.0.0.1:${port}`, channel: 'msedge', viewport: { width: 1600, height: 900 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: `dotnet run --project ../../src/TioHub.Api --no-launch-profile`,
    url: `http://127.0.0.1:${port}/api/health/ready`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      ASPNETCORE_ENVIRONMENT: 'Development',
      ASPNETCORE_URLS: `http://127.0.0.1:${port}`,
      ConnectionStrings__TioHub: `Server=${sqlServer};Database=${database};Trusted_Connection=True;TrustServerCertificate=True`,
      Database__DevelopmentDataProfile: 'Fictional',
      Quality__ScanMinutes: '0',
      Notifications__ScanMinutes: '0',
      // A46: e2e uploads go to a temporary folder, not into the project.
      Attachments__Path: join(tmpdir(), 'tiohub-e2e-attachments')
    }
  }
});
