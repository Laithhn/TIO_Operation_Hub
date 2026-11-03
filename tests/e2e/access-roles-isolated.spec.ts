import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../../src/TioHub.Api/wwwroot');
const manifest = JSON.parse(await readFile(resolve(import.meta.dirname, '../../src/web/src/permissionManifest.json'), 'utf8'));
const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

async function application(page: Page) {
  let role = { id: 2, name: 'Engineer', description: '', isActive: true, isLocked: false, userCount: 1, permissions: [] as string[], rights: [] as string[], version: 'v1' };
  let update: { ifMatch: string; body: typeof role } | null = null;
  let created: unknown = null;
  let fail = false;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://access-control.test') return route.abort();
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      let data: unknown = [];
      if (path === '/api/v1/me') data = { id: 1, account: 'TEST\\admin', displayName: 'Test administrator', timeZone: 'UTC', roles: ['Manager'], roleLabels: ['Manager'], rights: ['Administer', 'Audit', 'Export'], permissions: manifest.map((p: { key: string }) => p.key), businessRole: 'Manager', isAdministrator: true, grants: { export: true, technicalDetail: true, audit: true }, scope: { hasBusinessAccess: true, allClients: true, allInternal: true }, app: { version: 'test', environmentName: 'Testing', devSignIn: false, authMode: 'Forms', mustChangePassword: false, supportContact: '', map: null } };
      else if (path === '/api/v1/admin/roles' && route.request().method() === 'GET') data = { roles: [role, { id: 4, name: 'Reviewer', description: '', isActive: true, isLocked: false, userCount: 0, permissions: ['module.cases:Access'], rights: [], version: 'v4' }], rights: [], permissions: manifest };
      else if (path === '/api/v1/admin/roles/conflicts') data = { pairs: [], version: null };
      else if (path === '/api/v1/admin/users') data = [{ id: 5, accountName: 'TEST\\engineer', displayName: 'Example Engineer', isActive: true, roleIds: [2] }];
      else if (path === '/api/v1/admin/roles' && route.request().method() === 'POST') {
        created = route.request().postDataJSON();
        role = { ...role, id: 3, name: 'Auditor', userCount: 0, version: 'v3' };
        return route.fulfill({ status: 201, json: { id: 3 } });
      }
      else if (path === '/api/v1/admin/roles/2' && route.request().method() === 'PUT') {
        update = { ifMatch: route.request().headers()['if-match'], body: route.request().postDataJSON() };
        if (fail) return route.fulfill({ status: 412, json: { title: 'Role changed' } });
        role = { ...role, ...update.body, version: 'v2' }; return route.fulfill({ status: 204 });
      }
      else if (path === '/api/v1/admin/audit') data = { items: [], page: 1, pageSize: 5, totalCount: 0 };
      else if (path === '/api/v1/admin/scope-targets') data = { clients: [], projects: [], teams: [] };
      else if (path === '/api/v1/reference') data = { lookups: {}, teams: [], products: [], jiraInstances: [], enums: {}, enumLabels: {}, countries: [] };
      else if (path === '/api/v1/notifications/unread-count') data = { count: 0 };
      return route.fulfill({ json: data });
    }
    const file = resolve(root, path.startsWith('/assets/') ? path.slice(1) : 'index.html');
    if (!file.startsWith(root + sep)) return route.abort();
    return route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] ?? 'application/octet-stream' });
  });
  return { update: () => update, created: () => created, reject: () => { fail = true; } };
}

test('new roles are created without permissions', async ({ page }) => {
  const state = await application(page);
  await page.goto('/admin/access');
  const roles = page.getByRole('region', { name: 'Roles and permission matrix' });
  await roles.getByRole('button', { name: 'New role' }).click();
  const create = roles.getByRole('region', { name: 'New role' });
  await create.getByLabel('Role name').fill('Auditor');
  await create.getByRole('button', { name: 'Create role' }).click();
  await expect.poll(() => state.created()).not.toBeNull();
  expect(state.created()).toMatchObject({ name: 'Auditor', rights: [], permissions: [] });
  await expect(roles.getByRole('heading', { name: 'Auditor', exact: true })).toBeVisible();
});

test('role matrix reviews and saves a versioned permission change', async ({ page }) => {
  const state = await application(page);
  await page.goto('/admin/access');
  const roles = page.getByRole('region', { name: 'Roles and permission matrix' });
  await roles.getByLabel('Search matrix').fill('module.cases:Access');
  const matrix = roles.getByRole('region', { name: 'Role permission matrix' });
  await matrix.getByRole('checkbox', { name: 'Cases for Engineer' }).check();
  expect(state.update()).toBeNull();
  await roles.getByRole('button', { name: 'Review changes' }).click();
  const review = roles.getByRole('region', { name: 'Review role changes' });
  await expect(review).toContainText('Grant: Cases (module.cases:Access)');
  await review.getByRole('button', { name: 'Confirm and save role' }).click();
  await expect.poll(() => state.update()).not.toBeNull();
  expect(state.update()?.ifMatch).toBe('"v1"');
  expect(state.update()?.body.permissions).toContain('module.cases:Access');
  await expect(roles.getByText('Role saved.', { exact: false })).toBeVisible();
  await roles.getByRole('button', { name: 'Load latest role' }).click();
  await expect(matrix.getByRole('checkbox', { name: 'Cases for Engineer' })).toBeChecked();
});

test('a conflict retains the staged permission and leaves it unsaved', async ({ page }) => {
  const state = await application(page);
  state.reject();
  await page.goto('/admin/access');
  const roles = page.getByRole('region', { name: 'Roles and permission matrix' });
  await roles.getByLabel('Search matrix').fill('module.cases:Access');
  const checkbox = roles.getByRole('checkbox', { name: 'Cases for Engineer' });
  await checkbox.check();
  await roles.getByRole('button', { name: 'Review changes' }).click();
  await roles.getByRole('button', { name: 'Confirm and save role' }).click();
  await expect(roles.getByText('Your draft is retained.', { exact: false })).toBeVisible();
  await expect(checkbox).toBeChecked();
});

test('compare saved role assignments without changing either role', async ({ page }) => {
  const state = await application(page);
  await page.goto('/admin/access');
  const roles = page.getByRole('region', { name: 'Roles and permission matrix' });
  await roles.getByText('Compare saved roles').click();
  await roles.getByLabel('Compare Engineer with').selectOption('4');
  const comparison = roles.getByRole('region', { name: 'Role comparison' });
  await expect(comparison).toContainText('module.cases:Access');
  await expect(comparison.getByRole('row', { name: /module.cases:Access/ })).toContainText('Not assigned');
  await expect(comparison.getByRole('row', { name: /module.cases:Access/ })).toContainText('Assigned');
  expect(state.update()).toBeNull();
});

test('shows direct role holders to administrators who can view users', async ({ page }) => {
  await application(page);
  await page.goto('/admin/access');
  const roles = page.getByRole('region', { name: 'Roles and permission matrix' });
  await roles.getByText('Directly assigned users').click();
  await expect(roles.getByText('Example Engineer (TEST\\engineer)')).toBeVisible();
  await expect(roles.getByText('Directory group assignments are not listed here.', { exact: false })).toBeVisible();
});
