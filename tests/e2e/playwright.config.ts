import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Runs the real API + built front end against its own LocalDB database with the fictional development seed.
// Uses the locally installed Microsoft Edge (no browser download).
const port = 5096;
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: { baseURL: `http://localhost:${port}`, channel: 'msedge', viewport: { width: 1600, height: 900 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: `dotnet run --project ../../src/TioHub.Api --no-launch-profile`,
    url: `http://localhost:${port}/api/health/ready`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      ASPNETCORE_ENVIRONMENT: 'Development',
      ASPNETCORE_URLS: `http://localhost:${port}`,
      ConnectionStrings__TioHub: 'Server=(localdb)\\MSSQLLocalDB;Database=TioHub_E2E;Trusted_Connection=True;TrustServerCertificate=True',
      Database__DevelopmentDataProfile: 'Fictional',
      Quality__ScanMinutes: '0',
      // A46: e2e uploads go to a temporary folder, not into the project.
      Attachments__Path: join(tmpdir(), 'tiohub-e2e-attachments')
    }
  }
});
