import { expect, test, type Page } from '@playwright/test';
import { VT_CELL, exactText } from './vtTable';

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
async function fixture(page: Page) {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  const me = await api<{ id: number }>(page, '/me');
  const client = await api<{ id: number }>(page, '/clients', { code: unique('RPT'), name: unique('Reporting client'), country: 'Oman', status: 'Active', ownerUserId: me.id });
  return { me, client };
}
async function updateLookup(page: Page, original: Lookup, patch: Partial<Lookup>) {
  const current = (await api<Lookup[]>(page, '/admin/lookups')).find(row => row.id === original.id)!;
  await api(page, `/admin/lookups/${current.id}`, { ...current, ...patch }, 'PUT', current.version);
}
async function report(page: Page, name: string) {
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reporting Center', exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Configure ${name}`, exact: true }).click();
}
async function preview(page: Page, key: string) {
  const response = page.waitForResponse(result => new URL(result.url()).pathname === `/api/v1/reports/${key}/preview` && result.request().method() === 'POST');
  await page.getByRole('button', { name: 'Apply filters and preview', exact: true }).click();
  const result = await response;
  expect(result.ok(), await result.text()).toBeTruthy();
  return result.request().postDataJSON() as { filters: Record<string, string> };
}

test('case reporting uses configured status labels and submits an explicit not-waiting filter', async ({ page }) => {
  const { me, client } = await fixture(page);
  const reference = await api<{ teams: { id: number; isActive: boolean }[] }>(page, '/reference');
  const common = { type: 'Incident', scope: 'Client', clientId: client.id, responsibleTeamId: reference.teams.find(team => team.isActive)!.id,
    ownerUserId: me.id, impactSummary: 'Reporting regression', priority: 'Normal', nextReviewAt: new Date(Date.now() + 86400000).toISOString() };
  const includedTitle = unique('Not waiting case');
  const excludedTitle = unique('Waiting case');
  await api(page, '/cases', { ...common, title: includedTitle });
  const waiting = await api<{ id: number }>(page, '/cases', { ...common, title: excludedTitle });
  const row = await api<{ version: string }>(page, `/cases/${waiting.id}`);
  await api(page, `/cases/${waiting.id}/waiting`, { reason: 'Customer', note: 'Waiting for information', nextReviewAt: common.nextReviewAt }, 'POST', row.version);
  const original = (await api<Lookup[]>(page, '/admin/lookups')).find(value => value.listName === 'CaseStatusLabel' && value.code === 'New')!;
  const renamed = unique('New intake');
  try {
    await updateLookup(page, original, { label: renamed });
    await page.goto(`/?clientId=${client.id}`);
    const statusChart = page.locator('section.viz-panel').filter({ has: page.getByRole('heading', { name: 'Open cases by status', exact: true }) });
    await expect(statusChart.getByText(renamed, { exact: true })).toBeVisible();
    await statusChart.getByRole('button', { name: 'Table view', exact: true }).click();
    await expect(statusChart.locator(VT_CELL).filter({ hasText: exactText(renamed) })).toBeVisible();
    await report(page, 'Cases report');
    await page.getByLabel('Client', { exact: true }).selectOption(String(client.id));
    const status = page.getByLabel('Status', { exact: true });
    await expect(status.locator('option[value="New"]')).toHaveText(renamed);
    await status.selectOption('New');
    await page.locator('details.rc-advanced > summary').click();
    const waitingFilter = page.getByLabel('Waiting', { exact: true });
    await expect(waitingFilter.locator('option')).toHaveText(['All', 'Waiting only', 'Not waiting']);
    await waitingFilter.selectOption('false');
    await expect(page.getByLabel('Filters in force')).toContainText(renamed);
    await expect(page.getByLabel('Filters in force').getByText(/^no$/i)).toBeVisible();
    const request = await preview(page, 'cases');
    expect(request.filters).toMatchObject({ clientId: String(client.id), status: 'New', waiting: 'false' });
    const table = page.getByRole('region', { name: 'Preview of Cases report', exact: true });
    await expect(table).toContainText(includedTitle);
    await expect(table).not.toContainText(excludedTitle);
    await expect(table).toContainText(renamed);
  } finally {
    await updateLookup(page, original, { label: original.label });
  }
});

for (const scenario of [
  { key: 'environments', report: 'Environments report', list: 'EnvironmentType', category: 'Test', filter: 'Environment type' },
  { key: 'assets', report: 'Assets inventory report', list: 'AssetType', category: 'Physical', filter: 'Asset type' }
]) {
  test(`${scenario.key} report filters use renamed configured labels and retain retired type codes`, async ({ page }) => {
    const { me, client } = await fixture(page);
    const type = await api<{ id: number }>(page, '/admin/lookups', { listName: scenario.list, label: unique('Original report type'), category: scenario.category });
    const original = (await api<Lookup[]>(page, '/admin/lookups')).find(row => row.id === type.id)!;
    const recordName = unique('Report historical record');
    const environment = await api<{ id: number }>(page, '/environments', { clientId: client.id, name: scenario.key === 'environments' ? recordName : unique('Report environment'),
      type: scenario.key === 'environments' ? original.code : 'Test', criticality: 'Normal', ownerUserId: me.id });
    if (scenario.key === 'assets') await api(page, '/assets', { environmentId: environment.id, name: recordName, type: original.code, lifecycle: 'Planned', ownerUserId: me.id });
    const renamed = unique('Recorded report type');
    await updateLookup(page, original, { label: renamed, isRetired: true });
    await report(page, scenario.report);
    await page.getByLabel('Client', { exact: true }).selectOption(String(client.id));
    const filter = page.getByLabel(scenario.filter, { exact: true });
    await expect(filter.locator(`option[value="${original.code}"]`)).toHaveText(`${renamed} (retired)`);
    await filter.selectOption(original.code);
    await expect(page.getByLabel('Filters in force')).toContainText(renamed);
    const request = await preview(page, scenario.key);
    expect(request.filters).toMatchObject({ clientId: String(client.id), type: original.code });
    const table = page.getByRole('region', { name: `Preview of ${scenario.report}`, exact: true });
    await expect(table).toContainText(recordName);
    await expect(table).toContainText(renamed);
  });
}
