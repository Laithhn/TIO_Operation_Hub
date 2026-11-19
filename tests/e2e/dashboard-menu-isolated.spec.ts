import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

// A122 (owner request, 19 Nov 2026): the Dashboard side menu order, Financial instead of Payments, no Management or Notifications entry.
const root = resolve(import.meta.dirname, '../../src/TioHub.Api/wwwroot');
const catalog: { key: string }[] = JSON.parse(await readFile(resolve(import.meta.dirname, '../../src/web/src/rightsCatalog.json'), 'utf8'));
const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

async function application(page: Page) {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://access-control.test') return route.abort();
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      let data: unknown = [];
      if (path === '/api/v1/me') data = {
        id: 1, account: 'TEST\\manager', displayName: 'Test manager', timeZone: 'UTC', roles: ['ITD Manager'], roleLabels: ['ITD Manager'],
        rights: catalog.map(p => p.key), scope: { hasBusinessAccess: true, allClients: true, allInternal: true },
        app: { version: 'test', environmentName: 'Testing', devSignIn: false, authMode: 'Forms', mustChangePassword: false, supportContact: '', map: null }
      };
      else if (path === '/api/v1/reference') data = { lookups: {}, teams: [], products: [], jiraInstances: [], enums: {}, enumLabels: {}, countries: [] };
      else if (path === '/api/v1/notifications/unread-count') data = { count: 0 };
      else if (path.startsWith('/api/v1/dashboard')) return route.fulfill({ status: 503, json: { title: 'Not part of this test' } });
      return route.fulfill({ json: data });
    }
    const file = resolve(root, path.startsWith('/assets/') ? path.slice(1) : 'index.html');
    if (!file.startsWith(root + sep)) return route.abort();
    return route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] ?? 'application/octet-stream' });
  });
}

test('the Dashboard menu starts with My dashboard, Client 360, Operational and Financial', async ({ page }) => {
  await application(page);
  await page.goto('/my-dashboard');
  const side = page.getByRole('complementary', { name: 'Section menu' });
  await expect(side.getByRole('link', { name: 'My dashboard' })).toBeVisible();
  const labels = (await side.getByRole('link').allInnerTexts()).map(t => t.trim()).filter(Boolean);
  expect(labels.slice(0, 4)).toEqual(['My dashboard', 'Client 360', 'Operational', 'Financial']);
  expect(labels).toEqual(expect.arrayContaining(['Executive overview', 'SLA & Contracts', 'Client map', 'Action list', 'Data quality']));
  expect(labels).not.toContain('Management');
  expect(labels).not.toContain('Notifications');
  expect(labels).not.toContain('Payments');
  // Notifications stays one click away in the header.
  await expect(page.getByRole('button', { name: /notifications/i }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-menu-a122.png' });
});
