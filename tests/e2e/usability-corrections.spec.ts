import { expect, test, type Page } from '@playwright/test';
import { vtRow, vtTable } from './vtTable';

// A91: corrections from testing 2.51.0. These run against the real API, the built front end and the fictional seed of an isolated database.

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

async function openCases(page: Page) {
  await page.goto('/cases');
  await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
}

test.describe('global search focus', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search' });
  const opener = (page: Page) => page.getByRole('button', { name: /^Search \(/ });

  test('Escape returns focus to the button that opened search', async ({ page }) => {
    await openCases(page);
    await opener(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole('combobox', { name: 'Search' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(opener(page)).toBeFocused();
  });

  test('Ctrl+K and / return focus to the element that had it', async ({ page }) => {
    await openCases(page);
    const field = page.getByLabel('Search all tickets', { exact: true });
    await field.focus();
    await page.keyboard.press('Control+k');
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Control+k'); // pressed again while open: must not forget where to return
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(field).toBeFocused();

    const newCase = page.getByRole('link', { name: '+ New Ticket' });
    await newCase.focus();
    await page.keyboard.press('/');
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(newCase).toBeFocused();
  });

  test('a click outside returns focus too, and focus on nothing falls back to the search button', async ({ page }) => {
    await openCases(page);
    const newCase = page.getByRole('link', { name: '+ New Ticket' });
    await newCase.focus();
    await page.keyboard.press('/');
    await expect(dialog(page)).toBeVisible();
    await page.mouse.click(5, 450);
    await expect(dialog(page)).toBeHidden();
    await expect(newCase).toBeFocused();

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('/');
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(opener(page)).toBeFocused();
  });

  test('results work by keyboard, Escape works from a result, and choosing one moves focus to the new page', async ({ page }) => {
    await openCases(page);
    await opener(page).click();
    const box = dialog(page).getByRole('combobox', { name: 'Search' });
    await expect(box).toBeFocused();
    await page.keyboard.type('DEMO');
    const options = dialog(page).getByRole('option');
    await expect(options.first()).toBeVisible();
    await expect(box).toHaveAttribute('aria-activedescendant', (await options.first().getAttribute('id'))!);
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(box).toHaveAttribute('aria-activedescendant', (await options.nth(1).getAttribute('id'))!);
    await page.keyboard.press('ArrowUp');
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');

    // Not a focus trap: Tab leaves the field for the first result, and Escape still closes from there.
    await page.keyboard.press('Tab');
    await expect(box).not.toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(opener(page)).toBeFocused();

    await opener(page).click();
    await expect(box).toBeFocused();
    await page.keyboard.type('DEMO-HCP');
    await expect(dialog(page).getByRole('option').first()).toContainText('DEMO-HCP');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/clients\/\d+/);
    await expect(dialog(page)).toBeHidden();
    await expect(page.locator('#main')).toBeFocused();
  });
});

test('the ticket list says what each search covers, for a record outside the first page', async ({ page }) => {
  await openCases(page);
  const me = await api<{ id: number }>(page, '/me');
  const clients = await api<{ items: { id: number }[] }>(page, '/clients?pageSize=1');
  const reference = await api<{ teams: { id: number; isActive: boolean }[] }>(page, '/reference');
  const tag = Math.random().toString(36).slice(2, 8);
  const made: { id: number; ref: string; title: string }[] = [];
  for (let i = 0; i < 18; i++) {
    const title = `Scope search ${tag} ${String(i).padStart(2, '0')}`;
    const { id } = await api<{ id: number }>(page, '/cases', { title, type: 'Incident', scope: 'Client', clientId: clients.items[0].id, responsibleTeamId: reference.teams.find(t => t.isActive)!.id,
      ownerUserId: me.id, impactSummary: 'Search scope', priority: 'Normal', nextReviewAt: new Date(Date.now() + 86400000).toISOString() });
    const { ref } = await api<{ ref: string }>(page, `/cases/${id}`);
    made.push({ id, ref, title });
  }
  // Newest first and 15 per page: the first one made is on a later page.
  const target = made[0];
  await openCases(page);
  const table = vtTable(page, 'Tickets');
  await expect(vtRow(table, made[17].title)).toBeVisible();
  await expect(vtRow(table, target.title)).toHaveCount(0);

  // The page-only filter is named for its scope, finds nothing outside the page and says so.
  const pageFilter = table.getByLabel('Filter rows on this page only');
  await expect(pageFilter).toHaveAttribute('placeholder', 'Filter this page…');
  await expect(pageFilter).toHaveAccessibleDescription(/other pages are not searched/);
  await pageFilter.fill(target.ref);
  await expect(table.locator('.table-count')).toHaveText('0 of 15 rows on this page');
  await expect(table.getByText('Only this page was filtered. Other pages may have matching rows.')).toBeVisible();
  await pageFilter.fill('');

  // The text conditions in the Filter card are page-only as well, and say so.
  await table.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByText('Text conditions filter the rows on this page only.')).toBeVisible();
  await page.keyboard.press('Escape');

  // Going to the next page finds it the slow way, and pagination still works.
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(vtRow(table, target.title)).toBeVisible();
  await pageFilter.fill(target.ref);
  await expect(table.locator('.table-count')).toHaveText(/^1 of \d+ rows on this page$/);
  await pageFilter.fill('');

  // Full-list search is on the page, covers every page and returns to page 1.
  const search = page.getByLabel('Search all tickets', { exact: true });
  await expect(search).toBeVisible();
  await search.fill(target.ref);
  await expect(page).toHaveURL(new RegExp(`q=${target.ref}`));
  await expect(page).not.toHaveURL(/page=2/);
  await expect(vtRow(table, target.title)).toBeVisible();
  await expect(table.locator('.vt-row')).toHaveCount(1);
  await search.fill('');
  await expect(vtRow(table, target.title)).toHaveCount(0);

  // The Ref field in the Filter card is the same full-list search.
  await table.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByLabel('Search all tickets by reference').fill(target.ref);
  await expect(vtRow(table, target.title)).toBeVisible();
  await expect(search).toHaveValue(target.ref);
});

test('new-case guidance names only an active risk type', async ({ page }) => {
  await page.goto('/cases/new');
  const select = page.getByLabel('Ticket type', { exact: true });
  await expect(select.getByRole('option', { name: 'Risk follow-up' })).toHaveCount(1);
  await expect(page.getByText('Use Risk follow-up for risk actions; this does not imply formal risk acceptance.')).toBeVisible();

  // The same form when an installation has retired it.
  await page.route('**/api/v1/reference', async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.lookups.CaseType = body.lookups.CaseType.map((l: { category?: string }) => (l.category === 'RiskFollowUp' ? { ...l, isRetired: true } : l));
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await expect(page.getByLabel('Ticket type', { exact: true }).getByRole('option', { name: 'Incident' })).toHaveCount(1);
  await expect(page.getByLabel('Ticket type', { exact: true }).getByRole('option', { name: 'Risk follow-up' })).toHaveCount(0);
  await expect(page.getByText('for risk actions')).toHaveCount(0);
});

test('a commitment can be completed before its deadline through the form', async ({ page }) => {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  const me = await api<{ id: number }>(page, '/me');
  const clients = await api<{ items: { id: number }[] }>(page, '/clients?pageSize=1');
  const due = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 16);
  const { id } = await api<{ id: number }>(page, '/commitments', { scope: 'Client', clientId: clients.items[0].id, description: 'Early completion', type: 'CustomerUpdate', ownerUserId: me.id, dueLocal: due, timeZone: 'UTC' });
  await page.goto(`/commitments/${id}`);
  await page.getByRole('button', { name: 'Complete', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Complete commitment', exact: true });
  await expect(dialog).toContainText('if it was fulfilled before then, you can say why');
  await expect(dialog).not.toContainText('before the deadline.');
  await dialog.getByLabel('Reason, if fulfilled before this record was created (optional)').fill('Entered after delivery');
  await dialog.getByLabel('I confirm this action.').check();
  await dialog.getByRole('button', { name: 'Complete', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Completed on time').first()).toBeVisible();
  await expect(page.getByText('On time', { exact: true })).toBeVisible();
});

test('clicking a row opens its own record, and the client link still opens the client', async ({ page }) => {
  const openFromRow = async (list: string, record: RegExp) => {
    await page.goto(list);
    const row = page.locator('tr.vt-row', { has: page.locator('.client-display a') }).filter({ has: page.locator(`a[href^="${list}/"]`) }).first();
    await expect(row).toBeVisible();
    // A plain cell, not a link: the last named column's text would be arbitrary, so click the row's edge inside the client cell.
    await row.locator('.client-display').locator('..').click({ position: { x: 1, y: 1 } });
    await expect(page).toHaveURL(record);
  };
  await openFromRow('/cases', /\/cases\/\d+$/);
  await openFromRow('/commitments', /\/commitments\/\d+$/);
  await openFromRow('/environments', /\/environments\/\d+$/);

  await page.goto('/cases');
  await page.locator('tr.vt-row .client-display a').first().click();
  await expect(page).toHaveURL(/\/clients\/\d+$/);

  // A list of clients has only the client to open.
  await page.goto('/clients');
  await page.locator('tr.vt-row').first().locator('td').nth(2).click({ position: { x: 2, y: 2 } });
  await expect(page).toHaveURL(/\/clients\/\d+$/);
});

test('Renew contract opens a new contract with the details carried over, and saves nothing until asked', async ({ page }) => {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  const me = await api<{ id: number }>(page, '/me');
  const clients = await api<{ items: { id: number }[] }>(page, '/clients?pageSize=1');
  const client = clients.items[0].id;
  const project = await api<{ id: number }>(page, '/projects', { clientId: client, code: `R${Math.random().toString(36).slice(2, 8)}`, name: 'Renewal project', status: 'Active', ownerUserId: me.id });
  const title = `Renewal agreement ${Math.random().toString(36).slice(2, 8)}`;
  const old = await api<{ id: number }>(page, '/contracts', { projectId: project.id, title, contractReference: 'FIC-RENEW', type: 'SlaSupport', status: 'Active', ownerUserId: me.id,
    startDate: '2025-01-01', endDate: '2025-12-31', renewalTerms: 'RenewalByAgreement', noticeDays: 45, supportModel: 'Remote', supportTimeZone: 'Asia/Dubai', support24x7: true, slaPauseWhileWaitingOnCustomer: true,
    coverage: 'PSOP coverage', obligations: 'Monthly report', currency: 'SAR', slaTargets: [{ priority: 'High', responseMinutes: 60, resolutionMinutes: 240, basis: 'CalendarHours' }],
    fees: [{ description: 'Support fee', unit: 'Year', quantity: 1, unitPrice: 1000 }], payments: [{ condition: 'Paid in advance', percentage: 100, dueDate: '2025-02-01', status: 'Paid', paidOn: '2025-02-02' }] });
  const before = await api<{ count?: number; totalCount: number }>(page, `/contracts?clientId=${client}&pageSize=1`);

  await page.goto(`/contracts/${old.id}`);
  await page.getByRole('link', { name: 'Renew contract' }).click();
  await expect(page).toHaveURL(new RegExp(`/contracts/new\\?renewFrom=${old.id}$`));
  await expect(page.getByRole('heading', { level: 1, name: /^Renew CT-/ })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: false }).first()).toHaveValue(title);
  await expect(page.getByLabel('Start date', { exact: false }).first()).toHaveValue('2026-01-01');
  await expect(page.getByLabel('End date', { exact: false }).first()).toHaveValue('2026-12-31');
  // Opening the page saved nothing.
  expect((await api<{ totalCount: number }>(page, `/contracts?clientId=${client}&pageSize=1`)).totalCount).toBe(before.totalCount);

  // The details can be changed before saving.
  await page.getByLabel('Title', { exact: false }).first().fill(`${title} 2026`);
  await page.getByRole('button', { name: /^Save/ }).click();
  await expect(page).toHaveURL(/\/contracts\/\d+$/);
  const id = Number(page.url().split('/').pop());
  expect(id).not.toBe(old.id);
  const renewed = await api<{ title: string; status: string; startDate: string; endDate: string; coverage: string; noticeDays: number; slaTargets: { priority: string; responseMinutes: number }[]; fees: { description: string }[]; payments: { status: string; dueDate: string; paidOn?: string }[] }>(page, `/contracts/${id}`);
  expect(renewed).toMatchObject({ title: `${title} 2026`, status: 'Draft', startDate: '2026-01-01', endDate: '2026-12-31', coverage: 'PSOP coverage', noticeDays: 45 });
  expect(renewed.slaTargets).toMatchObject([{ priority: 'High', responseMinutes: 60 }]);
  expect(renewed.fees).toMatchObject([{ description: 'Support fee' }]);
  expect(renewed.payments).toMatchObject([{ status: 'Pending', dueDate: '2026-02-01' }]);
  expect(renewed.payments[0].paidOn ?? null).toBeNull();

  // The old contract is untouched.
  const untouched = await api<{ title: string; status: string; endDate: string; payments: { status: string }[] }>(page, `/contracts/${old.id}`);
  expect(untouched).toMatchObject({ title, status: 'Active', endDate: '2025-12-31', payments: [{ status: 'Paid' }] });
});

test('the user dialog keeps data scope readable: one record per line, search, chips and quick selection', async ({ page }) => {
  await page.goto('/admin/users');
  await page.getByRole('button', { name: /New user/i }).click();
  const dialog = page.getByRole('dialog', { name: 'New user' });
  const scope = dialog.getByRole('group', { name: 'Direct data scope' });
  await expect(scope.getByRole('button', { name: 'Clients (0 selected)' })).toHaveAttribute('aria-pressed', 'true');

  // One record per line: each row starts below the one before.
  const rows = scope.locator('.scope-row');
  const total = await rows.count();
  expect(total).toBeGreaterThan(1);
  const [a, b] = [await rows.nth(0).boundingBox(), await rows.nth(1).boundingBox()];
  expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height - 1);
  expect(a!.x).toBe(b!.x);

  // Search narrows the list, and what is chosen stays in view and can be removed.
  const code = (await rows.nth(0).locator('.scope-code').innerText()).trim();
  await scope.getByLabel('Search scope targets').fill(code);
  await expect(rows.first()).toContainText(code);
  await rows.first().getByRole('checkbox').check();
  await expect(scope.getByRole('button', { name: 'Clients (1 selected)' })).toBeVisible();
  await scope.getByLabel('Search scope targets').fill('no such record anywhere');
  await expect(scope.getByText('No matching targets.')).toBeVisible();
  await expect(scope.getByRole('list', { name: 'Selected clients' }).getByText(code)).toBeVisible();
  await scope.getByRole('button', { name: `Remove ${code}` }).click();
  await expect(scope.getByRole('button', { name: 'Clients (0 selected)' })).toBeVisible();

  // Select all shown, and clear; the other lists keep their own choice.
  await scope.getByLabel('Search scope targets').fill('');
  await scope.getByRole('button', { name: 'Select all shown' }).click();
  await expect(scope.getByRole('button', { name: `Clients (${total} selected)` })).toBeVisible();
  await scope.getByRole('button', { name: 'Clear shown' }).click();
  await expect(scope.getByRole('button', { name: 'Clients (0 selected)' })).toBeVisible();
  await scope.getByRole('button', { name: /^Internal teams/ }).click();
  await expect(scope.locator('.scope-row').first()).toBeVisible();

  // Ticking everything explains why the list is gone.
  await scope.getByRole('button', { name: /^Clients/ }).click();
  await scope.getByRole('checkbox', { name: 'All clients and projects' }).check();
  await expect(scope.getByText('every record here is included')).toBeVisible();
  await expect(scope.locator('.scope-row')).toHaveCount(0);

  // Roles are one choice each, and Save stays reachable at the bottom.
  await expect(dialog.getByRole('group', { name: 'Roles' }).getByRole('checkbox').first()).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save user' })).toBeVisible();
});

test('the notifications button shows the outline bell, with its unread count and name', async ({ page }) => {
  await openCases(page);
  const button = page.locator('.bell-btn');
  await expect(button).toHaveAttribute('aria-label', /^Notifications/);
  const icon = button.locator('svg path');
  await expect(icon).toHaveAttribute('fill', 'none');
  await expect(icon).toHaveAttribute('stroke', 'currentColor');
  expect(await icon.evaluate(e => getComputedStyle(e).fill)).toBe('none');
  await button.click();
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
});

test('ticket detail and dashboard explain their dates and statuses', async ({ page }) => {
  await page.goto('/cases');
  await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
  const rows = await api<{ items: { id: number; ref: string }[] }>(page, '/cases?pageSize=1');
  await page.goto(`/cases/${rows.items[0].id}`);
  const age = page.locator('section.panel', { has: page.getByRole('heading', { name: 'Age and waiting' }) });
  await expect(age.getByText('Age since opening')).toBeVisible();
  await expect(age.getByText('(hub creation time)')).toBeVisible();

  await page.goto('/');
  const panel = page.locator('.viz-panel, section', { has: page.getByRole('heading', { name: 'Open tickets by status' }) }).first();
  await expect(panel).toContainText('Waiting for customer is a status');
  await expect(panel).not.toContainText('it is not a status');
});
