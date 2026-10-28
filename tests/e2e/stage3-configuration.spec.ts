import { expect, test, type Page } from '@playwright/test';
import { VT_ROW, VT_CELL, exactText, openColumnFilter } from './vtTable';

type Lookup = { id: number; listName: string; code: string; label: string; description?: string | null; sortOrder: number; isRetired: boolean; category?: string | null; version: string };
const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
async function api<T>(page: Page, path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', version?: string): Promise<T> {
  return page.evaluate(async ({ path, body, method, version }) => {
    const token = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];
    const response = await fetch(`/api/v1${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}), ...(version ? { 'If-Match': `"${version}"` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status}: ${text}`);
    const data = text ? JSON.parse(text) : null;
    const etag = response.headers.get('ETag');
    if (etag && data && typeof data === 'object' && !Array.isArray(data)) data.version ??= etag.replaceAll('"', '');
    return data;
  }, { path, body, method, version });
}
async function signedIn(page: Page) {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  return api<{ id: number }>(page, '/me');
}
async function client(page: Page, ownerUserId: number) {
  return api<{ id: number }>(page, '/clients', { code: unique('CFG'), name: unique('Configuration client'), country: 'Oman', status: 'Active', ownerUserId });
}
async function lookup(page: Page, listName: string, code: string) {
  return (await api<Lookup[]>(page, '/admin/lookups')).find(row => row.listName === listName && row.code === code)!;
}
async function updateLookup(page: Page, row: Lookup, patch: Partial<Lookup>) {
  const current = await lookup(page, row.listName, row.code);
  await api(page, `/admin/lookups/${row.id}`, { ...current, ...patch }, 'PUT', current.version);
}
async function renameThroughConfiguration(page: Page, slug: string, title: string, row: Lookup, newLabel: string) {
  await page.goto('/admin/config');
  await expect(page.getByRole('heading', { name: 'Configuration', exact: true })).toBeVisible();
  const category = slug === 'case-statuses' ? 'Contracts & Cases' : 'Clients & Environments';
  await page.locator('main').getByRole('link', { name: category, exact: true }).click();
  await page.locator('main').getByRole('link', { name: title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/config/${slug}$`));
  await expect(page.locator('aside').getByRole('link', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Add', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Move .+ (up|down)$/ })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /^Show retired/ })).toHaveCount(0);
  await page.getByRole('button', { name: row.label, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `Edit ${row.label}`, exact: true });
  await expect(dialog.getByLabel('Workflow code', { exact: true })).toHaveValue(row.code);
  await expect(dialog.getByLabel('Workflow code', { exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('Description', { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel('Active (offered on forms)', { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel('Behaves as', { exact: true })).toHaveCount(0);
  await expect(dialog.locator('input:not([disabled]), textarea, select')).toHaveCount(1);
  await dialog.getByLabel('Display label', { exact: true }).fill(newLabel);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: newLabel, exact: true })).toBeVisible();
  const changed = await lookup(page, row.listName, row.code);
  expect(changed.label).toBe(newLabel);
  for (const key of ['code', 'listName', 'description', 'sortOrder', 'isRetired', 'category'] as const) expect(changed[key]).toEqual(row[key]);
}

test('reported-condition configuration changes labels only, including an unreported Unknown condition', async ({ page }) => {
  const me = await signedIn(page);
  const organization = await client(page, me.id);
  const environment = await api<{ id: number }>(page, '/environments', { clientId: organization.id, name: unique('Label environment'), type: 'Test', criticality: 'Normal', ownerUserId: me.id });
  const original = await lookup(page, 'ConditionLabel', 'Unknown');
  const newLabel = unique('Not assessed');
  try {
    await renameThroughConfiguration(page, 'reported-conditions', 'Reported conditions', original, newLabel);
    await page.goto(`/environments?clientId=${organization.id}`);
    await expect(page.locator(VT_ROW).filter({ hasText: 'Label environment' })).toContainText(newLabel);
    await page.goto(`/environments/${environment.id}`);
    await expect(page.getByText(newLabel, { exact: true })).toBeVisible();
    await expect(page.getByText('Unknown', { exact: true }).first()).toBeVisible(); // Other Unknown-valued fields retain their meaning.
    const saved = await api<{ condition: { reported: string; observedAt: string | null } }>(page, `/environments/${environment.id}`);
    expect(saved.condition.reported).toBe('Unknown');
    expect(saved.condition.observedAt).toBeNull();
    await page.goto(`/?clientId=${organization.id}`);
    const chart = page.locator('section.viz-panel').filter({ has: page.getByRole('heading', { name: 'Environments by reported condition', exact: true }) });
    await chart.getByRole('button', { name: 'Table view', exact: true }).click();
    await expect(chart.locator(VT_CELL).filter({ hasText: exactText(newLabel) })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Environments not reported healthy', exact: true }).locator(VT_ROW).filter({ hasText: 'Label environment' })).toContainText(`${newLabel} (no report)`);
  } finally {
    await updateLookup(page, original, { label: original.label });
  }
});

test('case-status configuration updates case labels without renaming cancelled commitments', async ({ page }) => {
  const me = await signedIn(page);
  const organization = await client(page, me.id);
  const reference = await api<{ teams: { id: number; isActive: boolean }[] }>(page, '/reference');
  const work = await api<{ id: number }>(page, '/cases', { title: unique('Label case'), type: 'Incident', scope: 'Client', clientId: organization.id,
    responsibleTeamId: reference.teams.find(t => t.isActive)!.id, impactSummary: 'Label isolation regression', priority: 'Normal', ownerUserId: me.id,
    nextReviewAt: new Date(Date.now() + 86400000).toISOString() });
  const commitment = await api<{ id: number }>(page, '/commitments', { description: unique('Label commitment'), type: 'CustomerUpdate', scope: 'Client', clientId: organization.id,
    ownerUserId: me.id, dueLocal: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16), timeZone: 'UTC' });
  for (const path of [`/cases/${work.id}`, `/commitments/${commitment.id}`]) {
    const record = await api<{ version: string }>(page, path);
    await api(page, `${path}/cancel`, { reason: 'Configuration label regression' }, 'POST', record.version);
  }
  const original = await lookup(page, 'CaseStatusLabel', 'Cancelled');
  const newLabel = unique('Case withdrawn');
  try {
    await renameThroughConfiguration(page, 'case-statuses', 'Case statuses', original, newLabel);
    await page.goto(`/cases/${work.id}`);
    await expect(page.locator('.page-head .sub')).toContainText(newLabel);
    await page.goto(`/cases?clientId=${organization.id}&status=Cancelled`);
    await openColumnFilter(page, 'Status');
    await expect(page.getByLabel('Filter by status', { exact: true }).locator('option[value="Cancelled"]')).toHaveText(newLabel);
    await expect(page.locator(VT_ROW).filter({ hasText: 'Label case' })).toContainText(newLabel);
    await page.goto(`/commitments/${commitment.id}`);
    await expect(page.locator('.page-head .sub')).toContainText('Cancelled');
    await expect(page.getByText(newLabel, { exact: true })).toHaveCount(0);
    expect((await api<{ status: string }>(page, `/cases/${work.id}`)).status).toBe('Cancelled');
    expect((await api<{ status: string }>(page, `/commitments/${commitment.id}`)).status).toBe('Cancelled');
  } finally {
    await updateLookup(page, original, { label: original.label });
  }
});

for (const scenario of [
  { list: 'EnvironmentType', category: 'Test', path: '/environments', label: 'Filter by type', parameter: 'type' },
  { list: 'AssetType', category: 'Physical', path: '/assets', label: 'Filter by type', parameter: 'type' },
  { list: 'ContractType', category: 'Maintenance', path: '/contracts', label: 'Type', parameter: 'type' }
]) {
  test(`${scenario.list} filters offer retired configured values while forms preserve only the current retired selection`, async ({ page }) => {
    const me = await signedIn(page);
    const organization = await client(page, me.id);
    const created = await api<{ id: number }>(page, '/admin/lookups', { listName: scenario.list, label: unique('Historical type'), category: scenario.category });
    const row = (await api<Lookup[]>(page, '/admin/lookups')).find(x => x.id === created.id)!;
    let recordPath: string;
    let recordName: string;
    if (scenario.list === 'ContractType') {
      const project = await api<{ id: number }>(page, '/projects', { clientId: organization.id, code: unique('P'), name: 'Historical type project', status: 'Active', ownerUserId: me.id });
      recordName = unique('Historical contract');
      const record = await api<{ id: number }>(page, '/contracts', { projectId: project.id, title: recordName, type: row.code, status: 'Draft', ownerUserId: me.id });
      recordPath = `/contracts/${record.id}`;
    } else {
      const environment = await api<{ id: number }>(page, '/environments', { clientId: organization.id, name: unique('Historical environment'),
        type: scenario.list === 'EnvironmentType' ? row.code : 'Test', criticality: 'Normal', ownerUserId: me.id });
      if (scenario.list === 'EnvironmentType') {
        recordPath = `/environments/${environment.id}`;
        recordName = (await api<{ name: string }>(page, recordPath)).name;
      } else {
        recordName = unique('Historical server');
        const record = await api<{ id: number }>(page, '/assets', { environmentId: environment.id, name: recordName, type: row.code, lifecycle: 'Planned', ownerUserId: me.id });
        recordPath = `/assets/${record.id}`;
      }
    }
    await updateLookup(page, row, { isRetired: true });
    await page.goto(`${scenario.path}?clientId=${organization.id}`);
    // Contracts keep their type filter in the page toolbar; the other lists filter from the column header.
    if (scenario.list !== 'ContractType') await openColumnFilter(page, 'Type');
    const filter = page.getByLabel(scenario.label, { exact: true });
    await expect(filter.locator(`option[value="${row.code}"]`)).toHaveText(`${row.label} (retired)`);
    await filter.selectOption(row.code);
    await expect(page).toHaveURL(new RegExp(`${scenario.parameter}=${encodeURIComponent(row.code)}`));
    await expect(page.getByRole('link', { name: recordName, exact: true })).toBeVisible();
    if (scenario.list === 'EnvironmentType') {
      await page.goto('/versions');
      await expect(page.getByLabel('Environment type', { exact: true }).locator(`option[value="${row.code}"]`)).toHaveText(`${row.label} (retired)`);
      await page.goto(`${recordPath}/edit`);
      await expect(page.getByLabel('Type', { exact: true })).toHaveValue(row.code);
      await page.goto(`/environments/new?clientId=${organization.id}`);
      await expect(page.getByLabel('Type', { exact: true }).locator(`option[value="${row.code}"]`)).toHaveCount(0);
    } else if (scenario.list === 'ContractType') {
      await page.goto(`${recordPath}/edit`);
      await expect(page.getByLabel('Type', { exact: true })).toHaveValue(row.code);
      await page.goto(`/contracts/new?clientId=${organization.id}`);
      await expect(page.getByLabel('Type', { exact: true }).locator(`option[value="${row.code}"]`)).toHaveCount(0);
    } else {
      const server = await api<{ environment: { id: number } }>(page, recordPath);
      await page.goto(recordPath);
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      const edit = page.getByRole('dialog', { name: `Edit server ${recordName}`, exact: true });
      await expect(edit.getByLabel('Type', { exact: true })).toHaveValue(row.code);
      await edit.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.goto(`/environments/${server.environment.id}`);
      await page.getByRole('button', { name: '+ Add', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Server', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Add server', exact: true }).getByLabel('Type', { exact: true }).locator(`option[value="${row.code}"]`)).toHaveCount(0);
    }
  });
}

const exportScenarios: { path: string; report: string; filters: Record<string, string> }[] = [
  { path: '/environments', report: 'environments', filters: { direct: 'true', type: 'Production', criticality: 'High', condition: 'Healthy', freshness: 'stale', q: 'Export regression' } },
  { path: '/versions', report: 'versions', filters: { environmentType: 'Production', country: 'Oman' } }
];
for (const scenario of exportScenarios) {
  test(`${scenario.report} list export preserves active filters`, async ({ page }) => {
    await signedIn(page);
    const params = new URLSearchParams(scenario.filters);
    await page.goto(`${scenario.path}?${params}`);
    await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeVisible();
    await page.route(`**/api/v1/export/${scenario.report}?**`, route => route.fulfill({ status: 200, contentType: 'text/csv', headers: { 'Content-Disposition': 'attachment; filename="filters.csv"' }, body: 'Fixture\n' }));
    const request = page.waitForRequest(req => new URL(req.url()).pathname === `/api/v1/export/${scenario.report}`);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
    const exported = new URL((await request).url()).searchParams;
    await download;
    for (const [key, value] of Object.entries(scenario.filters)) expect(exported.get(key)).toBe(value);
    expect(exported.has('page')).toBe(false);
    expect(exported.has('sort')).toBe(false);
  });
}
