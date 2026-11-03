import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../../src/TioHub.Api/wwwroot');
const manifest = JSON.parse(await readFile(resolve(import.meta.dirname, '../../src/web/src/permissionManifest.json'), 'utf8'));
const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
type Override = { key: string; effect: 'Allow' | 'Deny'; expiresAt: string | null };
const user = { id: 2, accountName: 'TEST\\alex', displayName: 'Alex Example', email: '', workingTimeZone: 'UTC', isActive: true, roles: ['Engineer'], roleIds: [2], roleName: 'Engineer', allClients: false, allInternal: false, grants: ['Export', 'Audit'], scopes: [], version: 'user-v1' };

async function application(page: Page, initialOverrides: Override[] = []) {
  let overrides: Override[] = initialOverrides;
  let version = 1;
  let rejected = false;
  let submitted: unknown = null;
  let userUpdate: unknown = null;
  let userVersion = '';
  let rejectUserUpdate = false;
  let conflictUpdate: unknown = null;
  let simulationUrl = '';
  let passwordAvailability: 'allowed' | 'denied' | 'error' = 'denied';
  let passwordSubmitted = false;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://access-control.test') return route.abort();
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      let data: unknown = [];
      if (path === '/api/v1/me') data = {
        id: 1, account: 'TEST\\admin', displayName: 'Test administrator', timeZone: 'UTC', roles: ['Manager'], roleLabels: ['Manager'],
        rights: ['Administer', 'Audit', 'Export'], permissions: manifest.map((p: { key: string }) => p.key), businessRole: 'Manager', isAdministrator: true,
        grants: { export: true, technicalDetail: true, audit: true }, scope: { hasBusinessAccess: true, allClients: true, allInternal: true },
        app: { version: 'test', environmentName: 'Testing', devSignIn: false, authMode: 'Forms', mustChangePassword: false, supportContact: '', map: null }
      };
      else if (path === '/api/v1/admin/users' && route.request().method() === 'GET') data = [user];
      else if (path === '/api/v1/admin/users/2' && route.request().method() === 'PUT') { userUpdate = route.request().postDataJSON(); userVersion = route.request().headers()['if-match']; return rejectUserUpdate ? route.fulfill({ status: 412, json: { title: 'Conflict', detail: 'User changed' } }) : route.fulfill({ status: 204 }); }
      else if (path === '/api/v1/admin/users/sign-in-status') data = [{ userId: 2, state: 'Active', changedAt: '2026-01-01T00:00:00Z' }];
      else if (path === '/api/v1/admin/users/2/password-reset-availability') {
        if (passwordAvailability === 'error') return route.fulfill({ status: 500, json: { title: 'Unavailable' } });
        data = passwordAvailability === 'allowed' ? { available: true, reason: null } : { available: false, reason: 'Administrator passwords cannot be reset through this endpoint.' };
      }
      else if (path === '/api/v1/admin/users/2/password' && route.request().method() === 'POST') { passwordSubmitted = true; return route.fulfill({ status: 204 }); }
      else if (path === '/api/v1/admin/users/2/access') data = {
        user, roles: [{ id: 2, name: 'Engineer' }],
        effectivePermissions: [{ key: 'Cases:View', displayName: 'View cases', description: 'View cases', module: 'Cases', riskLevel: 'Normal', sources: ['Engineer'] }],
        restrictedPermissions: [{ key: 'Cases:Delete', displayName: 'Delete cases', module: 'Cases', restrictionReason: 'Not granted' }],
        scopes: { allClients: false, clientIds: [10], projectIds: [], allInternal: false, teamIds: [20] }
      };
      else if (path === '/api/v1/admin/users/2/permission-overrides' && route.request().method() === 'GET') data = { version: `v${version}`, overrides };
      else if (path === '/api/v1/admin/users/2/permission-overrides' && route.request().method() === 'PUT') {
        submitted = { body: route.request().postDataJSON(), ifMatch: route.request().headers()['if-match'] };
        if (rejected) return route.fulfill({ status: 403, json: { title: 'Access denied', detail: 'Authority was revoked. Your draft was not saved.' } });
        overrides = route.request().postDataJSON().overrides; version++; return route.fulfill({ status: 204 });
      }
      else if (path === '/api/v1/admin/users/2/access-simulation') {
        simulationUrl = route.request().url();
        data = { status: 'conditional', reason: 'Capability and scope pass; operation checks still apply.', permission: 'Cases:View', scope: 'client', roles: ['Engineer'], missingPrerequisites: [] };
      }
      else if (path === '/api/v1/admin/roles') data = { rights: [], permissions: manifest, roles: [{ id: 2, name: 'Engineer', isActive: true, isLocked: false, userCount: 1, permissions: [], rights: [], version: 'role-v1' }, { id: 3, name: 'Reviewer', isActive: true, isLocked: false, userCount: 0, permissions: [], rights: [], version: 'role-v1' }] };
      else if (path === '/api/v1/admin/roles/conflicts' && route.request().method() === 'PUT') { conflictUpdate = { body: route.request().postDataJSON(), ifMatch: route.request().headers()['if-match'], ifNoneMatch: route.request().headers()['if-none-match'] }; return route.fulfill({ status: 204 }); }
      else if (path === '/api/v1/admin/roles/conflicts') data = { pairs: [], version: null };
      else if (path === '/api/v1/admin/scope-targets') data = { clients: [{ id: 10, code: 'C10', name: 'Client Ten', archived: false }], projects: [{ id: 11, code: 'P11', name: 'Project Eleven', clientId: 10 }], teams: [{ id: 20, code: 'T20', name: 'Team Twenty' }] };
      else if (path === '/api/v1/admin/audit') data = { items: [], page: 1, pageSize: 5, totalCount: 0 };
      else if (path === '/api/v1/admin/settings') data = [];
      else if (path === '/api/v1/reference') data = { lookups: {}, teams: [], products: [], jiraInstances: [], enums: {}, enumLabels: {}, countries: [] };
      else if (path === '/api/v1/notifications/unread-count') data = { count: 0 };
      return route.fulfill({ json: data });
    }
    const file = resolve(root, path.startsWith('/assets/') ? path.slice(1) : 'index.html');
    if (!file.startsWith(root + sep)) return route.abort();
    return route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] ?? 'application/octet-stream' });
  });
  return { reject: () => { rejected = true; }, rejectUser: () => { rejectUserUpdate = true; }, submitted: () => submitted, userUpdate: () => userUpdate, userVersion: () => userVersion, conflictUpdate: () => conflictUpdate, simulationUrl: () => simulationUrl, setPasswordAvailability: (value: typeof passwordAvailability) => { passwordAvailability = value; }, passwordSubmitted: () => passwordSubmitted };
}

test('password options follow the server authority check and fail closed when it fails', async ({ page }) => {
  const state = await application(page);
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Password options' }).click();
  await expect(page.getByText('Administrator passwords cannot be reset through this endpoint.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save password' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();
  state.setPasswordAvailability('allowed');
  await page.getByRole('button', { name: 'Password options' }).click();
  await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  state.setPasswordAvailability('error');
  await page.getByRole('button', { name: 'Password options' }).click();
  await expect(page.getByText('Password options could not be checked. Close this dialog and try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save password' })).toHaveCount(0);
  expect(state.passwordSubmitted()).toBe(false);
});

async function selectUser(page: Page) {
  await page.goto('/admin/access');
  await expect(page.getByRole('heading', { name: 'Access control', exact: true })).toBeVisible();
  await page.getByRole('region', { name: 'Effective permissions' }).getByRole('combobox', { name: 'User', exact: true }).selectOption('2');
  await expect(page.getByRole('heading', { name: 'Direct permission exceptions' })).toBeVisible();
}

test('dashboard displays server snapshot and saves a reviewed direct deny with expiry', async ({ page }) => {
  const state = await application(page);
  await selectUser(page);
  await expect(page.getByText('1 clients, 0 projects; 1 internal teams')).toBeVisible();
  await expect(page.getByRole('region', { name: 'User permission snapshot' })).toContainText('Not granted');
  await page.getByRole('button', { name: 'Add exception' }).click();
  const editor = page.locator('.access-overrides');
  await editor.getByRole('combobox', { name: 'Permission', exact: true }).selectOption('Cases:Delete');
  await editor.getByRole('combobox', { name: 'Effect', exact: true }).selectOption('Deny');
  await editor.locator('input[type="datetime-local"]').fill('2030-05-01T12:00');
  expect(state.submitted()).toBeNull();
  await editor.getByRole('button', { name: 'Review changes' }).click();
  const review = page.getByRole('region', { name: 'Review permission exceptions' });
  await expect(review).toContainText('Deny');
  await expect(review).toContainText('Cases:Delete');
  await review.getByRole('button', { name: 'Confirm and save' }).click();
  await expect.poll(() => state.submitted()).not.toBeNull();
  const submitted = state.submitted() as { ifMatch: string; body: { overrides: Override[] } };
  expect(submitted.ifMatch).toBe('"v1"');
  expect(submitted.body.overrides).toEqual([{ key: 'Cases:Delete', effect: 'Deny', expiresAt: new Date('2030-05-01T12:00:00').toISOString(), clientId: null, projectId: null, teamId: null }]);
  await expect(editor.getByRole('combobox', { name: 'Effect' })).toHaveValue('Deny');
});

test('dashboard reviews and saves direct roles and scopes without replacing account settings', async ({ page }) => {
  const state = await application(page);
  await selectUser(page);
  const editor = page.getByRole('region', { name: 'Role and scope assignments' });
  await editor.getByRole('checkbox', { name: 'Reviewer' }).check();
  await editor.getByText('Clients (0 selected)').click();
  await editor.getByRole('checkbox', { name: 'C10 — Client Ten' }).check();
  await editor.getByRole('button', { name: 'Review assignments' }).click();
  const review = editor.getByRole('region', { name: 'Review user assignments' });
  await expect(review).toContainText('Roles added: Reviewer');
  expect(state.userUpdate()).toBeNull();
  await review.getByRole('button', { name: 'Confirm and save assignments' }).click();
  await expect.poll(() => state.userUpdate()).not.toBeNull();
  expect(state.userVersion()).toBe('"user-v1"');
  expect(state.userUpdate()).toMatchObject({ accountName: user.accountName, workingTimeZone: 'UTC', roleIds: [2, 3], scopes: [{ kind: 'Client', clientId: 10 }], export: true, technicalDetail: false, audit: true });
});

test('a concurrent user update retains the assignment draft', async ({ page }) => {
  const state = await application(page);
  state.rejectUser();
  await selectUser(page);
  const editor = page.getByRole('region', { name: 'Role and scope assignments' });
  await editor.getByRole('checkbox', { name: 'Reviewer' }).check();
  await editor.getByRole('button', { name: 'Review assignments' }).click();
  await editor.getByRole('button', { name: 'Confirm and save assignments' }).click();
  await expect(editor.getByText('The user changed on the server.', { exact: false })).toBeVisible();
  await expect(editor.getByRole('checkbox', { name: 'Reviewer' })).toBeChecked();
  await expect(editor.getByRole('region', { name: 'Review user assignments' })).toBeVisible();
});

test('incompatible roles are reviewed and created with an absent-policy precondition', async ({ page }) => {
  const state = await application(page);
  await page.goto('/admin/access');
  const editor = page.getByRole('region', { name: 'Incompatible roles' });
  await editor.getByRole('combobox', { name: 'First role' }).selectOption('2');
  await editor.getByRole('combobox', { name: 'Second role' }).selectOption('3');
  await editor.getByRole('button', { name: 'Add incompatible pair' }).click();
  await editor.getByRole('button', { name: 'Review policy' }).click();
  const review = editor.getByRole('region', { name: 'Review incompatible roles' });
  await expect(review).toContainText('Engineer + Reviewer');
  expect(state.conflictUpdate()).toBeNull();
  await review.getByRole('button', { name: 'Confirm and save policy' }).click();
  await expect.poll(() => state.conflictUpdate()).not.toBeNull();
  expect(state.conflictUpdate()).toEqual({ body: { pairs: [{ firstRoleId: 2, secondRoleId: 3 }] }, ifMatch: undefined, ifNoneMatch: '*' });
});

test('server rejection preserves the exception draft', async ({ page }) => {
  const state = await application(page);
  await selectUser(page);
  await page.getByRole('button', { name: 'Add exception' }).click();
  const editor = page.locator('.access-overrides');
  await editor.getByRole('combobox', { name: 'Permission', exact: true }).selectOption('Cases:View');
  state.reject();
  await editor.getByRole('button', { name: 'Review changes' }).click();
  await editor.getByRole('button', { name: 'Confirm and save' }).click();
  await expect(editor.getByText('Authority was revoked. Your draft was not saved.')).toBeVisible();
  await expect(editor.getByRole('combobox', { name: 'Permission', exact: true })).toHaveValue('Cases:View');
  await expect(editor.getByRole('region', { name: 'Review permission exceptions' })).toBeVisible();
});

test('exception review compares added, changed and removed entries before saving', async ({ page }) => {
  const state = await application(page, [
    { key: 'Cases:View', effect: 'Allow', expiresAt: null },
    { key: 'Cases:Delete', effect: 'Deny', expiresAt: null }
  ]);
  await selectUser(page);
  const editor = page.locator('.access-overrides');
  await editor.getByRole('combobox', { name: 'Effect' }).first().selectOption('Deny');
  await editor.getByRole('button', { name: 'Remove exception Cases:Delete' }).click();
  await editor.getByRole('button', { name: 'Add exception' }).click();
  await editor.getByRole('combobox', { name: 'Permission' }).last().selectOption('Cases:Create');
  await editor.getByRole('button', { name: 'Review changes' }).click();
  const review = editor.getByRole('region', { name: 'Review permission exceptions' });
  await expect(review).toContainText('Change:');
  await expect(review).toContainText('Current: Allow · everywhere in their data scope · no expiry');
  await expect(review).toContainText('After saving: Deny · everywhere in their data scope · no expiry');
  await expect(review).toContainText('Remove:');
  await expect(review).toContainText('After saving: No direct exception');
  await expect(review).toContainText('Add:');
  await expect(review).toContainText('Current: No direct exception');
  expect(state.submitted()).toBeNull();
  await review.getByRole('button', { name: 'Back to editing' }).click();
  await expect(review).toBeHidden();
  expect(state.submitted()).toBeNull();
});

test('simulation sends the selected client scope and presents a conditional result', async ({ page }) => {
  const state = await application(page);
  await page.goto('/admin/access');
  const simulation = page.getByRole('region', { name: 'Check access' });
  await simulation.getByRole('combobox', { name: 'User', exact: true }).selectOption('2');
  await simulation.getByRole('combobox', { name: 'Permission', exact: true }).selectOption('Cases:View');
  await simulation.getByRole('combobox', { name: 'Scope', exact: true }).selectOption('client');
  await expect(simulation.getByRole('button', { name: 'Check access' })).toBeDisabled();
  await simulation.getByRole('combobox', { name: 'Scope target' }).selectOption('10');
  await simulation.getByRole('button', { name: 'Check access' }).click();
  await expect(simulation.getByRole('heading', { name: 'Capability and scope pass' })).toBeVisible();
  const query = new URL(state.simulationUrl()).searchParams;
  expect(query.get('permission')).toBe('Cases:View');
  expect(query.get('scope')).toBe('client');
  expect(query.get('scopeId')).toBe('10');
  await simulation.getByRole('combobox', { name: 'Scope', exact: true }).selectOption('none');
  await expect(simulation.getByRole('heading', { name: 'Capability and scope pass' })).toHaveCount(0);
});

test('user editor submits selected client, project and team scope', async ({ page }) => {
  const state = await application(page);
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Alex Example' }).click();
  const dialog = page.getByRole('dialog', { name: 'User Alex Example' });
  const scope = dialog.getByRole('group', { name: 'Direct data scope' });
  await scope.getByText('Clients (0 selected)').click();
  await scope.getByRole('checkbox', { name: 'C10 — Client Ten' }).check();
  await scope.getByText('Projects (0 selected)').click();
  await scope.getByRole('checkbox', { name: 'P11 — Project Eleven' }).check();
  await scope.getByText('Internal teams (0 selected)').click();
  await scope.getByRole('checkbox', { name: 'T20 — Team Twenty' }).check();
  await dialog.getByRole('button', { name: 'Save user' }).click();
  await expect.poll(() => state.userUpdate()).not.toBeNull();
  expect((state.userUpdate() as { scopes: unknown[] }).scopes).toEqual([
    { kind: 'Client', clientId: 10 }, { kind: 'Project', projectId: 11 }, { kind: 'InternalTeam', teamId: 20 }
  ]);
});
