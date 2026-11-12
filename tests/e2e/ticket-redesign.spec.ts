import { expect, test, type Page } from '@playwright/test';

// A106: the ticket page as work area + details panel, against the real API and the fictional seed of an isolated database.

async function api<T>(page: Page, path: string, body?: unknown, version?: string): Promise<T> {
  return page.evaluate(async ({ path, body, version }) => {
    const token = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];
    const response = await fetch(`/api/v1${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}), ...(version ? { 'If-Match': `"${version}"` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${path}: ${response.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }, { path, body, version });
}

async function newTicket(page: Page, title: string) {
  const me = await api<{ id: number }>(page, '/me');
  const clients = await api<{ items: { id: number }[] }>(page, '/clients?pageSize=1');
  const reference = await api<{ teams: { id: number; isActive: boolean }[] }>(page, '/reference');
  const { id } = await api<{ id: number }>(page, '/cases', { title, type: 'Incident', scope: 'Client', clientId: clients.items[0].id, responsibleTeamId: reference.teams.find(t => t.isActive)!.id,
    ownerUserId: me.id, impactSummary: 'Redesign test impact', priority: 'Normal', nextReviewAt: new Date(Date.now() + 86400000).toISOString() });
  return id;
}

test('the details panel sits beside the work area at 1366 px and its sections fold and stay folded', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/cases');
  const id = await newTicket(page, `Redesign ${Math.random().toString(36).slice(2, 8)}`);
  await page.goto(`/cases/${id}`);
  const details = page.getByRole('complementary', { name: 'Ticket details' });
  const main = page.locator('.rv-main');
  await expect(details.getByRole('heading', { name: 'Management summary' })).toBeVisible();
  const [m, d] = [await main.boundingBox(), await details.boundingBox()];
  expect(d!.x).toBeGreaterThan(m!.x + m!.width - 1); // beside, not under
  expect(d!.width).toBeLessThanOrEqual(430);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const age = details.getByRole('button', { name: 'Age and waiting' });
  await expect(age).toHaveAttribute('aria-expanded', 'true');
  await expect(details.getByText('Age since opening')).toBeVisible();
  await age.click();
  await expect(age).toHaveAttribute('aria-expanded', 'false');
  await expect(details.getByText('Age since opening')).toBeHidden();
  await page.reload();
  await expect(details.getByRole('button', { name: 'Age and waiting' })).toHaveAttribute('aria-expanded', 'false');
  await details.getByRole('button', { name: 'Age and waiting' }).click();
  await expect(details.getByText('Age since opening')).toBeVisible();
});

test('below 1180 px the details panel moves under the work area', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/cases');
  const id = await newTicket(page, `Narrow ${Math.random().toString(36).slice(2, 8)}`);
  await page.goto(`/cases/${id}`);
  const details = page.getByRole('complementary', { name: 'Ticket details' });
  await expect(details.getByRole('heading', { name: 'Management summary' })).toBeAttached();
  const [m, d] = [await page.locator('.rv-main').boundingBox(), await details.boundingBox()];
  expect(d!.y).toBeGreaterThanOrEqual(m!.y + m!.height - 1);
});

test('the ticket tabs keep their records and actions: activity filters, impact statement, field history before and after', async ({ page }) => {
  await page.goto('/cases');
  const title = `Tabs ${Math.random().toString(36).slice(2, 8)}`;
  const id = await newTicket(page, title);
  await api(page, `/cases/${id}/comments`, { body: 'Redesign comment.' });
  await page.goto(`/cases/${id}`);

  // Activity is the first tab; its filters still narrow the feed.
  await expect(page.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.act-comment')).toContainText('Redesign comment.');
  await page.getByRole('button', { name: /^Workflow changes/ }).click();
  await expect(page.locator('.act-comment')).toHaveCount(0);
  await page.getByRole('button', { name: /^TIO comments/ }).click();
  await expect(page.locator('.act-comment')).toHaveCount(1);

  // Affected records: a ticket without any says so instead of showing an empty table.
  await page.getByRole('tab', { name: /^Affected records/ }).click();
  await expect(page.getByText('No affected records entered')).toBeVisible();

  // Documented impact shows the recorded impact statement next to the inferred dependencies.
  await page.getByRole('tab', { name: 'Documented impact' }).click();
  await expect(page.getByText('Redesign test impact').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Potentially affected installations/ })).toBeVisible();

  // Field history: a change shows its field with the value before and after.
  // The version travels as the ETag of the record, as the front end's get() reads it.
  const version = await page.evaluate(async id => (await fetch(`/api/v1/cases/${id}`)).headers.get('etag')!.replace(/^W\/|"/g, ''), id);
  await api(page, `/cases/${id}/progress`, { progressSummary: 'Redesign progress', nextAction: 'Redesign next step', nextReviewAt: new Date(Date.now() + 2 * 86400000).toISOString(), customerResponse: false }, version);
  await page.reload();
  await page.getByRole('tab', { name: 'Field history' }).click();
  const history = page.getByRole('list', { name: 'Change history' });
  const change = history.locator('.rv-tl-change', { hasText: 'Next action' }).first();
  await expect(change).toContainText('Redesign next step');
  await expect(change.locator('.rv-val.new')).toHaveText('Redesign next step');
  await page.getByLabel('Filter by field, person or value').fill('no such value anywhere');
  await expect(page.getByText(/No matching records/)).toBeVisible();
});
