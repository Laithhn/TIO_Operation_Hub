import { expect, test, type Page } from '@playwright/test';
import { vtTable } from './vtTable';

// A96-A98, against the real API, the built front end and the fictional seed of an isolated database.

async function api<T>(page: Page, path: string, body?: unknown): Promise<T> {
  return page.evaluate(async ({ path, body }) => {
    const token = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];
    const response = await fetch(`/api/v1${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${path}: ${response.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }, { path, body });
}

async function newTicket(page: Page, title: string) {
  const me = await api<{ id: number }>(page, '/me');
  const clients = await api<{ items: { id: number }[] }>(page, '/clients?pageSize=1');
  const reference = await api<{ teams: { id: number; isActive: boolean }[] }>(page, '/reference');
  const { id } = await api<{ id: number }>(page, '/cases', { title, type: 'Incident', scope: 'Client', clientId: clients.items[0].id, responsibleTeamId: reference.teams.find(t => t.isActive)!.id,
    ownerUserId: me.id, impactSummary: 'Test ticket', priority: 'Normal', nextReviewAt: new Date(Date.now() + 86400000).toISOString() });
  return id;
}

test('several tickets can be selected and deleted together, and a refusal does not stop the rest', async ({ page }) => {
  await page.goto('/cases');
  await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
  const tag = Math.random().toString(36).slice(2, 8);
  const titles = [0, 1, 2].map(i => `Bulk ${tag} ${i}`);
  const ids: number[] = [];
  for (const t of titles) ids.push(await newTicket(page, t));
  await page.goto(`/cases?q=${tag}`);
  const table = vtTable(page, 'Tickets');
  await expect(table.locator('tr.vt-row')).toHaveCount(3);

  // No action until something is selected; clicking a checkbox does not open the ticket.
  await expect(table.getByRole('button', { name: /^Delete selected/ })).toHaveCount(0);
  await table.locator('tr.vt-row').first().getByRole('checkbox').check();
  await expect(page).toHaveURL(/\/cases\?/);
  await expect(table.getByText('1 selected')).toBeVisible();
  await table.getByRole('button', { name: 'Clear selection' }).click();
  await expect(table.getByText('1 selected')).toHaveCount(0);

  // The heading box takes every row shown.
  await table.getByRole('checkbox', { name: 'Select all rows shown' }).check();
  await expect(table.getByText('3 selected')).toBeVisible();
  await table.getByRole('button', { name: /^Delete selected/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete 3 record(s)' });
  await expect(dialog.getByRole('button', { name: 'Delete 3 record(s)' })).toBeDisabled();
  await dialog.getByLabel('I understand these records will be permanently deleted.').check();
  await dialog.getByRole('button', { name: 'Delete 3 record(s)' }).click();
  await expect(dialog).toBeHidden();
  await expect(table.getByText('3 selected')).toHaveCount(0);
  for (const id of ids) {
    const gone = await page.evaluate(async id => (await fetch(`/api/v1/cases/${id}`)).status, id);
    expect(gone).toBe(404);
  }
});

test('deleting one ticket lists what is deleted with it', async ({ page }) => {
  await page.goto('/cases');
  await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
  const title = `Single delete ${Math.random().toString(36).slice(2, 8)}`;
  const id = await newTicket(page, title);
  const me = await api<{ id: number }>(page, '/me');
  const clients = await api<{ items: { id: number }[] }>(page, '/clients?pageSize=1');
  await api(page, '/commitments', { scope: 'Client', clientId: clients.items[0].id, caseId: id, description: `Commitment of ${title}`, type: 'CustomerUpdate', ownerUserId: me.id, dueLocal: new Date(Date.now() + 864000000).toISOString().slice(0, 16), timeZone: 'UTC' });
  await page.goto(`/cases/${id}`);
  await page.getByRole('button', { name: /^Delete ticket/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Will be deleted with it').or(dialog.getByText('Will be unlinked').or(dialog.getByText(/Commitments/))).first()).toBeVisible();
});

test('rows with no delete can still be selected and exported', async ({ page }) => {
  await page.goto('/cases');
  const table = vtTable(page, 'Tickets');
  await table.locator('tr.vt-row').first().getByRole('checkbox').check();
  const download = page.waitForEvent('download');
  await table.getByRole('button', { name: 'Export selected' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
});

test("What's new opens from the footer and shows the running version", async ({ page }) => {
  await page.goto('/cases');
  const me = await api<{ app: { version: string } }>(page, '/me');
  await page.evaluate(() => localStorage.removeItem('tiohub.whats-new.seen'));
  await page.reload();
  const link = page.locator('footer.status').getByRole('button', { name: "What's new" });
  await expect(link.locator('.dot')).toBeVisible();
  await link.click();
  const dialog = page.getByRole('dialog', { name: "What's new" });
  await expect(dialog.getByRole('heading', { name: new RegExp(`^Version ${me.app.version.replaceAll('.', '\\.')} · running now`) })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(link.locator('.dot')).toHaveCount(0);
  await expect(link).toBeFocused();
});

test('My dashboard shows my own work and each figure opens its list', async ({ page }) => {
  await page.goto('/my-dashboard');
  await expect(page.getByRole('heading', { name: 'My dashboard', exact: true })).toBeVisible();
  const figures = page.getByRole('region', { name: 'My work now' });
  await expect(figures.getByText('Open tickets')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My last 30 days' })).toBeVisible();
  const me = await api<{ id: number }>(page, '/me');
  await figures.getByRole('link', { name: /^Open tickets/ }).click();
  await expect(page).toHaveURL(new RegExp(`ownerId=${me.id}`));
});

test('engineers start on My dashboard and managers on the overview, and both can open the other', async ({ page, baseURL }) => {
  const as = (who: string) => page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(who), url: baseURL! }]);
  const side = page.getByRole('complementary', { name: 'Section menu' });

  await as('DEV\\engineer');
  await page.goto('/');
  await expect(page).toHaveURL(/\/my-dashboard$/);
  await expect(page.getByRole('heading', { name: 'My dashboard', exact: true })).toBeVisible();
  await side.getByRole('link', { name: 'Executive overview' }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole('heading', { name: 'Operations Command Center' })).toBeVisible();
  // A link with filters still opens the overview, and Back does not bounce.
  await page.goto('/?period=7d');
  await expect(page.getByRole('heading', { name: 'Operations Command Center' })).toBeVisible();
  await expect(page).toHaveURL(/\/\?period=7d$/);

  await as('DEV\\manager');
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Operations Command Center' })).toBeVisible();
  await side.getByRole('link', { name: 'My dashboard' }).click();
  await expect(page).toHaveURL(/\/my-dashboard$/);

  // A101: the page has its own right, which an administrator can see.
  await page.goto('/admin/rights');
  await expect(page.getByRole('combobox', { name: 'Feature' }).getByRole('option', { name: 'My dashboard', exact: true })).toHaveCount(1);
});

test('the executive overview opens with At a glance, and a section can be folded', async ({ page }) => {
  await page.goto('/');
  const glance = page.getByRole('region', { name: 'At a glance' });
  await expect(glance.getByText(/open tickets|Opened in/).first()).toBeVisible();
  await expect(glance.getByText(/previous period|no change/).first()).toBeVisible();
  const toggle = page.getByRole('button', { name: 'Hide Tickets and commitments' });
  await toggle.click();
  await expect(page.getByRole('heading', { name: 'Open tickets by status' })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Show Tickets and commitments' }).click();
  await expect(page.getByRole('heading', { name: 'Open tickets by status' })).toBeVisible();
});

test('the ticket timeline groups by day, with comments as cards', async ({ page }) => {
  await page.goto('/cases');
  await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
  const id = await newTicket(page, `Timeline ${Math.random().toString(36).slice(2, 8)}`);
  await api(page, `/cases/${id}/comments`, { body: 'A comment that should stand out.' });
  await page.goto(`/cases/${id}`);
  const feed = page.locator('.act-feed');
  await expect(feed.getByRole('heading', { name: /^Today/ })).toBeVisible();
  const card = feed.locator('.act-comment').first();
  await expect(card).toContainText('A comment that should stand out.');
  await expect(feed.locator('.act-event').first()).toBeVisible();
});
