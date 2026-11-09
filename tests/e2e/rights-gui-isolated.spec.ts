import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../../src/TioHub.Api/wwwroot');
const catalog: { key: string; module: string; riskLevel: string }[] = JSON.parse(await readFile(resolve(import.meta.dirname, '../../src/web/src/rightsCatalog.json'), 'utf8'));
const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const keys = (...modules: string[]) => catalog.filter(r => modules.includes(r.module)).map(r => r.key);
const roles = () => [
  { id: 1, key: 'manager', name: 'TIO Manager', description: 'Full authority.', isActive: true, isLocked: true, userCount: 2, rights: catalog.map(r => r.key), version: 'r1' },
  { id: 2, key: 'engineer', name: 'Operation Engineer', description: 'Day to day operations.', isActive: true, isLocked: false, userCount: 9, rights: keys('Tickets', 'Dashboard', 'Commitments'), version: 'r1' },
  { id: 3, name: 'Client Viewer', description: 'Read only client work.', isActive: true, isLocked: false, userCount: 4, rights: catalog.filter(r => r.key.endsWith(':View')).map(r => r.key), version: 'r1' },
  { id: 4, name: 'Old role', isActive: false, isLocked: false, userCount: 0, rights: keys('Notes'), version: 'r1' }
];

async function application(page: Page) {
  const saved: unknown[] = [];
  const state = { roles: roles() };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://access-control.test') return route.abort();
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      const method = route.request().method();
      let data: unknown = [];
      const putRole = /^\/api\/v1\/admin\/roles\/(\d+)$/.exec(path);
      if (path === '/api/v1/me') data = {
        id: 1, account: 'TEST\admin', displayName: 'Test administrator', timeZone: 'UTC', roles: ['Manager'], roleLabels: ['Manager'],
        rights: catalog.map(p => p.key), scope: { hasBusinessAccess: true, allClients: true, allInternal: true },
        app: { version: 'test', environmentName: 'Testing', devSignIn: false, authMode: 'Forms', mustChangePassword: false, supportContact: '', map: null }
      };
      else if (path === '/api/v1/admin/roles') data = { catalog, roles: state.roles };
      else if (putRole && method === 'PUT') {
        const body = route.request().postDataJSON();
        saved.push(body);
        state.roles = state.roles.map(r => r.id === Number(putRole[1]) ? { ...r, rights: body.rights, version: `${r.version}x` } : r);
        return route.fulfill({ status: 204 });
      }
      else if (path === '/api/v1/reference') data = { lookups: {}, teams: [], products: [], jiraInstances: [], enums: {}, enumLabels: {}, countries: [] };
      else if (path === '/api/v1/notifications/unread-count') data = { count: 0 };
      return route.fulfill({ json: data });
    }
    const file = resolve(root, path.startsWith('/assets/') ? path.slice(1) : 'index.html');
    if (!file.startsWith(root + sep)) return route.abort();
    return route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] ?? 'application/octet-stream' });
  });
  return { saved };
}

const box = (page: Page, name: string) => page.getByRole('checkbox', { name, exact: true });

test('the grid shows a role at a glance and stages a change until it is reviewed', async ({ page }) => {
  const { saved } = await application(page);
  await page.goto('/admin/rights?role=2');
  const cases = page.getByRole('region', { name: 'Tickets rights' });
  await expect(cases.getByRole('columnheader', { name: 'Edit', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/rights-grid.png' });
  await expect(page.getByRole('button', { name: 'Review and save' })).toHaveCount(0);

  // A module is one click away, and the filters stay in reach once the page has scrolled.
  await page.getByRole('navigation', { name: 'Go to a module' }).getByRole('button', { name: /^Notes/ }).click();
  await expect(page.getByRole('region', { name: 'Notes rights' })).toBeInViewport();
  await expect(page.getByLabel('Search rights', { exact: true })).toBeInViewport();
  await page.screenshot({ path: 'test-results/rights-scrolled.png' });

  const remove = box(page, 'Tickets: Permanently delete unused records for Operation Engineer');
  await expect(remove).toBeChecked();
  await remove.uncheck();
  const grant = box(page, 'Roles and rights: View for Operation Engineer');
  await grant.check();
  expect(saved).toEqual([]);
  await page.getByRole('button', { name: 'Show staged' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toHaveText(/Showing 2 of \d+ rights/);
  await page.screenshot({ path: 'test-results/rights-staged.png' });

  await page.getByRole('button', { name: 'Review and save' }).click();
  const review = page.getByRole('dialog', { name: 'Review rights changes' });
  await expect(review.getByRole('heading', { name: 'Grants (1)' })).toBeVisible();
  await expect(review.getByRole('heading', { name: 'Revocations (1)' })).toBeVisible();
  await page.screenshot({ path: 'test-results/rights-review.png' });
  expect(saved).toEqual([]);
  await review.getByRole('button', { name: 'Save rights' }).click();
  await expect(review).toBeHidden();
  expect(saved).toHaveLength(1);
  const rights = (saved[0] as { rights: string[] }).rights;
  expect(rights).not.toContain('Cases:Delete');
  expect(rights).toContain('AdminRoles:View');
  await expect(page.getByRole('button', { name: 'Review and save' })).toHaveCount(0);
});

test('a missing prerequisite is pointed out, and only the one asked for is added', async ({ page }) => {
  await application(page);
  await page.goto('/admin/rights?role=2');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.getByRole('button', { name: 'Show them' }).click();
  const before = await page.locator('.rights-node').count();
  expect(before).toBeGreaterThan(1);
  await page.screenshot({ path: 'test-results/rights-list.png' });
  await page.getByRole('button', { name: /^Add what / }).first().click();
  // One added right can settle several rows; the rest stay, because only what was asked for is added.
  await expect(page.locator('.rights-node')).not.toHaveCount(before);
  await expect(page.getByRole('button', { name: /^Add what / }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Add the missing prerequisites' }).click();
  await expect(page.getByText(/missing prerequisite/)).toHaveCount(0);
});

test('moving to another role keeps the search and the comparison, and puts the role in the address', async ({ page }) => {
  await application(page);
  await page.goto('/admin/rights?role=2');
  await page.getByRole('combobox', { name: 'Compare with role' }).selectOption('3');
  await page.getByLabel('Search rights', { exact: true }).fill('Cases:');
  await page.screenshot({ path: 'test-results/rights-compare.png' });
  await page.getByRole('combobox', { name: 'Role', exact: true }).selectOption('4');
  await expect(page).toHaveURL(/role=4/);
  await expect(page.getByLabel('Search rights', { exact: true })).toHaveValue('Cases:');
  await expect(page.getByRole('combobox', { name: 'Compare with role' })).toHaveValue('3');
  await page.getByRole('combobox', { name: 'Compare with role' }).selectOption('2');
  await page.getByRole('combobox', { name: 'Role', exact: true }).selectOption('2');
  await expect(page.getByRole('combobox', { name: 'Compare with role' })).toHaveValue('');
});

test('the protected role cannot be edited in the grid', async ({ page }) => {
  await application(page);
  await page.goto('/admin/rights?role=1');
  await expect(box(page, 'Tickets: Permanently delete unused records for TIO Manager')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Grant shown rights in Tickets' })).toBeDisabled();
});

test('the page stays inside a phone screen, and the choice of view is remembered', async ({ page }) => {
  await application(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/rights?role=2');
  await expect(page.getByRole('region', { name: 'Tickets rights' })).toBeVisible();
  await page.screenshot({ path: 'test-results/rights-phone.png' });
  const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('Roles shows how far each role reaches and can narrow to the differences', async ({ page }) => {
  await application(page);
  await page.goto('/admin/roles');
  const matrix = page.getByRole('region', { name: 'Role and right comparison' });
  await expect(matrix.getByLabel(/^TIO Manager: \d+ of \d+ assigned$/).first()).toBeVisible();
  const status = page.locator('.role-matrix-filters [role=status]');
  const all = await status.textContent();
  await page.getByRole('checkbox', { name: 'Only where roles differ' }).check();
  await expect(status).not.toHaveText(all!);
  await page.getByRole('button', { name: 'Expand all' }).click();
  await page.screenshot({ path: 'test-results/roles-compare.png' });
  await expect(matrix.getByRole('button', { name: /^Collapse / }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Collapse all' }).click();
  await expect(matrix.getByRole('button', { name: /^Collapse / })).toHaveCount(0);
});
