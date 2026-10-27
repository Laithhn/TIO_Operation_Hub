import { expect, test, type Page } from '@playwright/test';

const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
async function api<T>(page: Page, path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', version?: string): Promise<T> {
  return page.evaluate(async ({ path, body, method, version }) => {
    const token = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];
    const response = await fetch(`/api/v1${path}`, {
      method, headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}), ...(version ? { 'If-Match': version } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status}: ${text}`);
    const data = text ? JSON.parse(text) : null;
    const etag = response.headers.get('ETag');
    if (etag && data && typeof data === 'object' && !Array.isArray(data)) data.version ??= etag.replaceAll('\"', '');
    return data;
  }, { path, body, method, version });
}
async function role(page: Page, permissions: string[]) {
  const created = await api<{ id: number }>(page, '/admin/roles', { name: unique('Browser permissions'), rights: [], permissions });
  const accountName = `DEV\\${unique('permissions')}`;
  await api(page, '/admin/users', { accountName, displayName: accountName, workingTimeZone: 'UTC', roleId: created.id });
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(accountName), url: test.info().project.use.baseURL as string }]);
}
async function fixture(page: Page) {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  const clients = await api<{ items: { id: number; code: string }[] }>(page, '/clients?pageSize=1');
  return { client: clients.items[0] };
}

test.describe('Resource permissions in application actions', () => {
  test('client Create without Maintain or structure Coordinate shows only authorized creation actions', async ({ page }) => {
    const { client } = await fixture(page);
    await role(page, ['ClientStructure:Create']);
    await page.goto('/clients');
    await expect(page.getByRole('link', { name: '+ New Client', exact: true })).toBeVisible();
    await expect(page.locator('aside').getByRole('link', { name: 'New client', exact: true })).toBeVisible();
    await page.goto(`/clients/${client.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'Region', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Project', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Environment', exact: true })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Contract', exact: true })).toHaveCount(0);
  });

  test('product Delete does not reveal client deletion or unrelated Create links', async ({ page }) => {
    const { client } = await fixture(page);
    const products = await api<{ id: number }[]>(page, '/products');
    await role(page, ['Products:Delete']);
    await page.goto(`/clients/${client.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Delete client / })).toHaveCount(0);
    await expect(page.locator('aside').getByRole('link', { name: 'New client', exact: true })).toHaveCount(0);
    await page.goto(`/products/${products[0].id}`);
    await expect(page.getByRole('button', { name: 'Delete product', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
  });

  test('server Create offers server copying without environment edit and restricts clone modes and selections', async ({ page }) => {
    await fixture(page);
    const servers = await api<{ items: { environmentId: number }[] }>(page, '/assets?pageSize=1');
    await role(page, ['Servers:Create']);
    await page.goto(`/environments/${servers.items[0].environmentId}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'Server', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Installation (product)', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Copy servers or environment…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Copy to other environments', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('radio', { name: /A new environment/ })).toBeDisabled();
    await expect(dialog.getByRole('radio', { name: 'An existing environment', exact: true })).toBeChecked();
    const serverGroup = dialog.locator('fieldset').filter({ has: page.locator('legend', { hasText: /^Servers$/ }) });
    const installationGroup = dialog.locator('fieldset').filter({ has: page.locator('legend', { hasText: /^Installations$/ }) });
    await expect(serverGroup.getByRole('checkbox').first()).toBeEnabled();
    for (const box of await installationGroup.getByRole('checkbox').all()) {
      await expect(box).toBeDisabled();
      await expect(box).not.toBeChecked();
    }
    await expect(dialog.getByRole('button', { name: 'Copy', exact: true })).toBeDisabled();
  });

  test('case coordinator without structure coordination gets assignment and contract controls', async ({ page }) => {
    const { client } = await fixture(page);
    const me = await api<{ id: number }>(page, '/me');
    const reference = await api<{ teams: { id: number; isActive: boolean }[] }>(page, '/reference');
    const record = await api<{ id: number }>(page, '/cases', {
      title: unique('Coordinated case'), type: 'Incident', scope: 'Client', clientId: client.id,
      responsibleTeamId: reference.teams.find(t => t.isActive)!.id, ownerUserId: me.id,
      priority: 'Normal', impactSummary: 'Permission regression', nextReviewAt: new Date(Date.now() + 86400000).toISOString()
    });
    await role(page, ['Cases:Coordinate']);
    await page.goto(`/cases/${record.id}`);
    await expect(page.getByRole('button', { name: 'Triage', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Link contract', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Reassign', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Assign owner', exact: true });
    await expect(dialog).toContainText('Ownership changes are kept in the timeline.');
    await expect(dialog).not.toContainText('You can take unassigned work');
  });

  test('attachment maintain is independent of product maintain and preserves uploader removal', async ({ page }) => {
    await fixture(page);
    const products = await api<{ id: number }[]>(page, '/products');
    await role(page, ['OtherOperations:Maintain']);
    await page.goto(`/products/${products[0].id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
    const fileName = `${unique('permission-evidence')}.txt`;
    await page.getByLabel('Choose files to attach to this product', { exact: true }).setInputFiles({ name: fileName, mimeType: 'text/plain', buffer: Buffer.from('Resource permission browser regression') });
    await page.getByRole('button', { name: 'Upload 1 file(s)', exact: true }).click();
    await expect(page.getByRole('link', { name: fileName, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Remove ${fileName}`, exact: true })).toBeVisible();
  });

  test('non-administrator restore role can navigate archives and cannot restore other resource types', async ({ page }) => {
    await fixture(page);
    const me = await api<{ id: number }>(page, '/me');
    const code = unique('ARCHIVE').toUpperCase();
    const client = await api<{ id: number }>(page, '/clients', { code, name: code, country: 'Oman', status: 'Opportunity', ownerUserId: me.id, team: [] });
    const row = await api<{ version: string }>(page, `/clients/${client.id}`);
    await api(page, `/clients/${client.id}/archive`, { reason: 'Resource permission browser regression' }, 'POST', `"${row.version}"`);
    await role(page, ['Environments:ArchiveRestore']);
    await page.goto('/clients');
    await page.locator('aside').getByRole('link', { name: 'Archived records', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Archived records', exact: true })).toBeVisible();
    const archived = page.getByRole('row').filter({ hasText: code });
    await expect(archived).toBeVisible();
    await expect(archived.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Record type', { exact: true }).locator('option[value="Contract"]')).toHaveCount(1);
  });
});
