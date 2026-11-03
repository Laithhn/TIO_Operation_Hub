import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../../src/TioHub.Api/wwwroot');
const manifest = JSON.parse(await readFile(resolve(import.meta.dirname, '../../src/web/src/permissionManifest.json'), 'utf8'));
const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

async function application(page: Page, currentKeys = manifest.map((p: { key: string }) => p.key), allClients = true, allInternal = true) {
  let role = { id: 2, name: 'Hierarchy tester', description: 'Explicit grants', rights: [] as string[], permissions: [] as string[], version: 'v1', isActive: true, isLocked: false, userCount: 1 };
  let saves = 0;
  let rejectSave = false;
  const requests: string[] = [];
  const jiraLinks: unknown[] = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://hierarchy.test') return route.abort();
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      requests.push(path);
      let data: unknown = [];
      if (path === '/api/v1/me') data = {
        id: 1, account: 'TEST\\admin', displayName: 'Test administrator', timeZone: 'UTC', roles: ['Manager'], roleLabels: ['Manager'],
        rights: ['Administer', 'Audit', 'Export'], permissions: currentKeys, businessRole: 'Manager', isAdministrator: true,
        grants: { export: true, technicalDetail: true, audit: true }, scope: { hasBusinessAccess: true, allClients, allInternal },
        app: { version: 'test', environmentName: 'Testing', devSignIn: false, authMode: 'Forms', mustChangePassword: false, supportContact: '', map: null }
      };
      else if (path === '/api/v1/admin/roles') data = { rights: [], permissions: manifest, roles: [role] };
      else if (path === '/api/v1/admin/roles/2' && route.request().method() === 'PUT') {
        if (rejectSave) return route.fulfill({ status: 403, json: { title: 'Access denied', detail: 'Grant authority was revoked. Your draft was not saved.' } });
        const payload = route.request().postDataJSON();
        role = { ...role, ...payload, version: `v${++saves + 1}` };
        return route.fulfill({ status: 204 });
      }
      else if (path === '/api/v1/reference') data = { lookups: {}, teams: [], products: [], jiraInstances: [{ id: 1, name: 'Customer Jira', isActive: true, approvedHost: 'jira.example.test' }], enums: {}, enumLabels: {}, countries: [] };
      else if (path === '/api/v1/notifications/unread-count') data = { count: 0 };
      else if (path === '/api/v1/cases') data = { items: [], page: 1, pageSize: 15, totalCount: 0 };
      else if (path === '/api/v1/projects/123') data = { id: 123, code: 'PROJECT-123', name: 'Test project', status: 'Planned', clientId: 10, clientName: 'Test client', clientCode: 'CLIENT',
        products: [], productIds: [], environments: [], contracts: [], permissions: { canEdit: false, canAddContract: false, canArchive: false }, version: 'v1' };
      else if (path === '/api/v1/data-quality') data = { items: [], page: 1, pageSize: 15, totalCount: 0 };
      else if (path === '/api/v1/cases/123') data = { id: 123, ref: 'CASE-123', title: 'Test case', scope: 'Internal', status: 'New', priority: 'Normal', type: 'Incident', responsibleParty: 'TIO',
        waitingIntervals: [], environments: [], assets: [], components: [], jiraReferences: [], removedJiraReferences: [], commitments: [], events: [], sla: {},
        ageDays: 1, reopenCount: 0, waitingHours: 0, permissions: { canEdit: true }, version: 'v1' };
      else if (path === '/api/v1/jira/reuse') data = { reused: false, visible: [] };
      else if (path === '/api/v1/cases/123/jira' && route.request().method() === 'POST') {
        jiraLinks.push(route.request().postDataJSON());
        return route.fulfill({ status: 201, json: { id: 5 } });
      }
      return route.fulfill({ json: data });
    }
    const file = resolve(root, path.startsWith('/assets/') ? path.slice(1) : 'index.html');
    if (!file.startsWith(root + sep)) return route.abort();
    return route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] ?? 'application/octet-stream' });
  });
  return { role: () => role, saves: () => saves, requests, jiraLinks, rejectSave: () => { rejectSave = true; } };
}

test('renders four levels, retains children when parents are disabled, and reviews saves', async ({ page }) => {
  const state = await application(page);
  await page.goto('http://hierarchy.test/admin/rights');
  await expect(page.getByRole('heading', { name: 'Rights and permissions', exact: true })).toBeVisible();
  await page.getByLabel('Search permissions', { exact: true }).fill('tab.ClientStructure.organizations:View');
  await expect(page.getByRole('checkbox', { name: 'Module Clients for Hierarchy tester', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Submodule Client structure for Hierarchy tester', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Tab Organizations for Hierarchy tester', exact: true })).toBeVisible();
  const leaf = page.getByRole('checkbox', { name: 'View for Hierarchy tester', exact: true });
  await leaf.check();
  expect(state.saves()).toBe(0);
  await expect(page.getByText('Blocked by required access', { exact: true }).first()).toBeVisible();
  const parent = page.getByRole('checkbox', { name: 'Tab Organizations for Hierarchy tester', exact: true });
  await parent.check();
  await parent.uncheck();
  await expect(leaf).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Organizations descendant selection: partial', exact: true })).toHaveJSProperty('indeterminate', true);
  await page.getByRole('button', { name: 'Review and save', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review permission changes', exact: true });
  await expect(review).toContainText('tab.ClientStructure.organizations:View');
  await review.getByRole('button', { name: 'Save permissions', exact: true }).click();
  await expect(review).toBeHidden();
  expect(state.role().permissions).toEqual(['tab.ClientStructure.organizations:View']);
  await page.screenshot({ path: test.info().outputPath('four-level-editor.png'), fullPage: true });
});

test('bulk staging is explicit, filtered, cancellable and separate from saving', async ({ page }) => {
  const state = await application(page);
  await page.goto('http://hierarchy.test/admin/rights');
  await page.getByLabel('Search permissions', { exact: true }).fill('tab.ClientStructure.organizations:View');
  const collapse = page.getByRole('button', { name: 'Collapse Organizations', exact: true });
  await collapse.click();
  await page.getByRole('button', { name: 'Expand Organizations', exact: true }).click();
  expect(state.role().permissions).toEqual([]);
  await page.getByRole('button', { name: 'Grant shown permissions in Organizations', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Grant permission group', exact: true });
  await expect(dialog).toContainText('1 shown permissions');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(state.saves()).toBe(0);
  await page.getByRole('button', { name: 'Grant shown permissions in Organizations', exact: true }).click();
  await dialog.getByRole('button', { name: 'Stage group change', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'View for Hierarchy tester', exact: true })).toBeChecked();
  expect(state.role().permissions).toEqual([]);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'View for Hierarchy tester', exact: true })).not.toBeChecked();
});

test('direct URLs are blocked before page requests when a module or tab is denied', async ({ page }) => {
  const keys = manifest.map((p: { key: string }) => p.key).filter((key: string) => key !== 'module.clients:Access');
  const state = await application(page, keys);
  await page.goto('http://hierarchy.test/clients/12?tab=organizations');
  await expect(page.getByText('Access denied', { exact: true }).first()).toBeVisible();
  expect(state.requests).not.toContain('/api/v1/clients/12');
  await page.goto('http://hierarchy.test/cases');
  await expect(page.getByRole('heading', { name: 'Cases', exact: true })).toBeVisible();
});


test('denied saves preserve the draft and show server feedback', async ({ page }) => {
  const state = await application(page);
  await page.goto('http://hierarchy.test/admin/rights');
  await page.getByLabel('Search permissions', { exact: true }).fill('Cases:View');
  const leaf = page.getByRole('checkbox', { name: 'View pages and records for Hierarchy tester', exact: true });
  await leaf.check();
  state.rejectSave();
  await page.getByRole('button', { name: 'Review and save', exact: true }).click();
  await page.getByRole('dialog', { name: 'Review permission changes', exact: true }).getByRole('button', { name: 'Save permissions', exact: true }).click();
  await expect(page.getByText('Grant authority was revoked. Your draft was not saved.', { exact: false }).first()).toBeVisible();
  await expect(leaf).toBeChecked();
  expect(state.role().permissions).toEqual([]);
});

test('view-only rights administrators cannot stage mutations', async ({ page }) => {
  await application(page, manifest.map((p: { key: string }) => p.key).filter((key: string) => key !== 'AdminRoles:Maintain'));
  await page.goto('http://hierarchy.test/admin/rights');
  await page.getByLabel('Search permissions', { exact: true }).fill('Cases:View');
  await expect(page.getByRole('checkbox', { name: 'View pages and records for Hierarchy tester', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Review and save', exact: true })).toBeDisabled();
});

test('Jira links request a reason even when no visible match exists', async ({ page }) => {
  const state = await application(page);
  await page.goto('http://hierarchy.test/cases/123?tab=jira');
  await page.getByRole('button', { name: '+ Reference' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add manual Jira reference' });
  await expect(dialog.getByLabel('Reason for linking this issue')).toBeVisible();
  await dialog.getByLabel('Jira instance').selectOption('1');
  await dialog.getByLabel('Issue key').fill('ABC-123');
  await dialog.getByLabel('Ticket URL').fill('https://jira.example.test/browse/ABC-123');
  await dialog.getByLabel('Reason for linking this issue').fill('Track the customer issue');
  await dialog.getByRole('button', { name: 'Add reference' }).click();
  await expect.poll(() => state.jiraLinks.length).toBe(1);
  expect(state.jiraLinks[0]).toMatchObject({ jiraInstanceId: 1, issueKey: 'ABC-123', reuseReason: 'Track the customer issue' });
});

test('data-quality global scan is hidden for partial scope', async ({ page }) => {
  await application(page, undefined, false, true);
  await page.goto('http://hierarchy.test/data-quality');
  await expect(page.getByRole('heading', { name: 'Data quality', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Re-evaluate now' })).toHaveCount(0);
});

test('data-quality global scan is offered for complete scope', async ({ page }) => {
  await application(page);
  await page.goto('http://hierarchy.test/data-quality');
  await expect(page.getByRole('button', { name: 'Re-evaluate now' })).toBeVisible();
});

test('project detail distinguishes unavailable related records from empty collections', async ({ page }) => {
  const keys = manifest.map((p: { key: string }) => p.key).filter((key: string) => key !== 'Products:View' && key !== 'Environments:View');
  await application(page, keys);
  await page.goto('http://hierarchy.test/projects/123');
  await expect(page.getByRole('heading', { name: 'PROJECT-123 · Test project' })).toBeVisible();
  await expect(page.getByText('Unavailable with your current access', { exact: true })).toHaveCount(2);
});
