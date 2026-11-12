import { test, expect, requirePageContent, skipIfPolicyBlocked } from './fixtures.mjs';
import { statusRegressionFixture, tioUserIdSentinels } from './safety-policy.mjs';

test.use({ viewport: { width: 1920, height: 1080 } });
test.beforeEach(() => {
  test.skip(!process.env.TIO_AUDIT_STORAGE_STATE, 'Not executed: approved authenticated session was not supplied.');
});

test('Configured ticket status agrees across register, client Operational tickets and global search', async ({ page, audit }, info) => {
  const sample = statusRegressionFixture(process.env);
  test.skip(!sample, 'Needs approved existing ticket/client IDs, ticket reference and its current configured display label; see REGRESSION.md.');
  await page.goto(`/cases?status=all&q=${encodeURIComponent(sample.reference)}`);
  await requirePageContent(page, audit);
  const table = page.getByRole('table', { name: 'Tickets', exact: true });
  const row = table.locator('tbody tr.vt-row').filter({ has: page.locator(`a[href="/cases/${sample.ticketId}"]`) });
  test.skip(await row.count() === 0, 'Approved sample absent from this role/search scope; no record is created or enumerated.');
  const headers = await table.locator('thead tr').first().locator('th').allTextContents();
  const statusIndex = headers.findIndex(text => text.trim() === 'Status');
  expect(statusIndex, 'Ticket register Status column exists').toBeGreaterThanOrEqual(0);
  const registerStatus = (await row.first().locator('td').nth(statusIndex).innerText()).trim();
  expect.soft(registerStatus, 'Register uses the configured label').toBe(sample.statusLabel);

  await page.goto(`/clients/${sample.clientId}?tab=cases`);
  await requirePageContent(page, audit);
  const link = page.locator(`main a[href="/cases/${sample.ticketId}"]`).first();
  test.skip(await link.count() === 0, 'Approved sample absent from accessible client Operational tickets; no data modified.');
  const item = link.locator('xpath=ancestor::li[1]');
  const clientStatus = (await item.locator(':scope > .badge').first().innerText()).trim();
  expect.soft(clientStatus, 'Client Operational tickets use the same configured status').toBe(sample.statusLabel);

  await page.getByRole('button', { name: 'Search (/ or Ctrl+K)', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Search', exact: true });
  await dialog.getByRole('combobox', { name: 'Search', exact: true }).fill(sample.reference);
  const hit = dialog.locator(`a[role="option"][href="/cases/${sample.ticketId}"]`);
  await expect(hit).toBeVisible();
  const subtitle = (await hit.locator('.muted').innerText()).trim();
  expect.soft(subtitle, 'Global search exposes the configured display label, not a backing enum').toContain(sample.statusLabel);
  skipIfPolicyBlocked(audit);
  await info.attach('status-comparison', { body: JSON.stringify({ registerStatus, clientStatus, searchContainsConfiguredLabel: subtitle.includes(sample.statusLabel),
    note: 'Status labels only. Owner fields have different semantics and are deliberately not compared. Sample records were only read.' }, null, 2), contentType: 'application/json' });
});

test('Tickets selection and Details headers align with their body controls', async ({ page, audit }, info) => {
  await page.goto('/cases');
  await requirePageContent(page, audit);
  const table = page.getByRole('table', { name: 'Tickets', exact: true });
  test.skip(await table.locator('tbody tr.vt-row').count() === 0, 'No accessible ticket rows; header/body pairing cannot be verified.');
  const alignment = await table.evaluate(element => {
    const headers = [...element.querySelector('thead tr').cells];
    const cells = [...element.querySelector('tbody tr.vt-row').cells];
    const kind = element => element.querySelector('input[type="checkbox"]') ? 'selection'
      : element.matches('th') && element.textContent.trim() === 'Details' || element.querySelector('button[aria-label^="Details for "]') ? 'details' : 'data';
    return { headers: headers.map(kind), cells: cells.map(kind) };
  });
  await info.attach('header-body-semantics', { body: JSON.stringify(alignment, null, 2), contentType: 'application/json' });
  test.skip(!alignment.headers.includes('selection') || !alignment.headers.includes('details'), 'Both selection and disclosure controls are needed for this specific regression.');
  expect(alignment.cells.length, 'Body cell count matches header count').toBe(alignment.headers.length);
  for (const control of ['selection', 'details']) {
    expect.soft(alignment.cells.indexOf(control), `${control} body control sits under its own header`).toBe(alignment.headers.indexOf(control));
  }
});

test('Visible audit Tio user id before/after values do not expose EF temporary identifiers', async ({ page, audit }, info) => {
  await page.goto('/admin/audit');
  await requirePageContent(page, audit);
  const fields = page.locator('main td').filter({ hasText: /\bTio\s+user\s+id\s*:/i });
  const visible = [];
  for (const field of await fields.all()) if (await field.isVisible()) visible.push(await field.innerText());
  test.skip(visible.length === 0, 'This visible audit page has no Tio user id field; no fixture exists to exercise this regression. No pagination sweep or changes made.');
  const sentinels = tioUserIdSentinels(visible);
  await info.attach('audit-id-validation', { body: JSON.stringify({ checkedVisibleFieldCount: visible.length, temporaryIdentifiers: sentinels,
    note: 'Only the specifically named Tio user id before/after field is checked. Other business negative values are out of scope.' }, null, 2), contentType: 'application/json' });
  expect(sentinels, 'Persisted TIO user references must not display negative EF temporary IDs').toEqual([]);
});

test('Catalog Tickets report offers the configured status codes and labels from the ticket register', async ({ page, audit }, info) => {
  await page.goto('/cases');
  await requirePageContent(page, audit);
  const register = page.getByRole('combobox', { name: 'Status', exact: true });
  await expect(register).toBeVisible();
  const configured = await register.locator('option').evaluateAll(options => options
    .filter(option => option.value.startsWith('code:'))
    .map(option => ({ code: option.value.slice(5), label: option.textContent.trim() })));
  test.skip(configured.length === 0, 'No configured status options available to this role in the register; do not invent a fixture.');

  await page.goto('/reporting-center/library?report=cases');
  await requirePageContent(page, audit);
  const catalog = page.getByRole('combobox', { name: 'Status', exact: true });
  await expect(catalog).toBeVisible();
  const offered = await catalog.locator('option').evaluateAll(options => options.map(option => ({
    code: option.value.replace(/^code:/, ''), label: option.textContent.trim(),
  })));
  skipIfPolicyBlocked(audit);
  await info.attach('catalog-status-choice-parity', { body: JSON.stringify({ configured, offered,
    note: 'GET-only UI metadata comparison. No Apply filters and preview/Apply changes, preset, export or schedule action was clicked.' }, null, 2), contentType: 'application/json' });
  for (const status of configured) {
    expect.soft(offered.some(option => option.code === status.code && option.label === status.label),
      `Catalog contains configured status ${status.code} with display label ${status.label}`).toBe(true);
  }
});

test.skip('Proposed export UX: masked Completed entries explain access changes and regeneration', async () => {
  // Pending agreed UX acceptance criteria and an approved pre-existing masked export fixture.
  // Do not infer file/storage failure from Completed + hidden metadata; do not invoke export, retry or download.
});
