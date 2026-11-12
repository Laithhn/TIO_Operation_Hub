import { test, expect } from '@playwright/test';
import { Hub, MANAGER, ENGINEER, PREFIX, fixture, signInAs } from './helpers';

test.describe('Case form and CRUD through the UI', () => {
  let m: Hub; let fx: Awaited<ReturnType<typeof fixture>>;
  test.beforeAll(async () => { m = await Hub.as(MANAGER); fx = await fixture(m); });
  test.beforeEach(async ({ context }) => signInAs(context, MANAGER));

  async function fill(page: import('@playwright/test').Page, title: string) {
    await page.goto('/cases/new');
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Ticket type').selectOption('Request');
    const client = page.getByLabel('Client', { exact: true });
    const label = (await client.locator('option').allTextContents()).find(t => t.includes(`${PREFIX}REG`))!;
    await client.selectOption({ label });
    await page.getByLabel('Responsible team').selectOption({ index: 1 });
    await page.getByLabel('Impact summary').fill('UI regression');
    await page.getByLabel(/Next action/).fill('none');
  }

  test('empty submit shows a summary and field errors, and marks fields invalid', async ({ page }) => {
    await page.goto('/cases/new');
    await page.getByRole('button', { name: 'Create ticket' }).click();
    await expect(page.getByText('Some values need attention.')).toBeVisible();
    for (const msg of ['Enter the title.', 'Select the ticket type.', 'Select the responsible team.', 'Enter the impact summary.'])
      await expect(page.getByText(msg)).toBeVisible();
    expect(await page.locator('[aria-invalid=true]').count()).toBeGreaterThanOrEqual(4);
  });

  test('create, find in list, open, cancel, and see it in the timeline', async ({ page }) => {
    const title = `${PREFIX}UI crud ${Date.now()}`;
    await fill(page, title);
    await page.getByRole('button', { name: 'Create ticket' }).click();
    await expect(page).toHaveURL(/\/cases\/\d+$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    const id = Number(page.url().split('/').pop());

    await page.goto('/cases');
    await page.getByPlaceholder(/Search all tickets/).fill(title);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.locator('tbody tr').first().getByRole('link', { name: /^CS-\d+/ }).click();
    await expect(page).toHaveURL(new RegExp(`/cases/${id}$`));

    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Cancel ticket' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Cancellation reason').fill('audit regression cancel');
    await dialog.getByLabel('I confirm this action.').check();
    await dialog.getByRole('button', { name: 'Cancel ticket' }).click();
    await expect.poll(async () => (await m.json(`/cases/${id}`)).status).toBe('Cancelled');
    expect((await m.json(`/cases/${id}`)).status).toBe('Cancelled');
  });

  test('double click on Create sends one request', async ({ page }) => {
    let posts = 0;
    page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/api/v1/cases')) posts++; });
    await fill(page, `${PREFIX}UI dblclick ${Date.now()}`);
    await page.getByRole('button', { name: 'Create ticket' }).dblclick();
    await expect(page).toHaveURL(/\/cases\/\d+$/);
    expect(posts).toBe(1);
  });

  test('leaving a dirty form asks for confirmation', async ({ page }) => {
    await fill(page, `${PREFIX}UI unsaved`);
    let asked = false;
    page.on('dialog', d => { asked = true; d.dismiss(); });
    await page.getByRole('link', { name: 'All tickets' }).click();
    await page.waitForTimeout(500);
    const inApp = await page.getByRole('dialog').count();
    expect(asked || inApp > 0).toBeTruthy();
    await expect(page).toHaveURL(/\/cases\/new/);
  });

  test('offline save keeps the entered values and reports the failure', async ({ page, context }) => {
    const title = `${PREFIX}UI offline ${Date.now()}`;
    await fill(page, title);
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Create ticket' }).click();
    await expect(page.getByText('The request failed. Check your connection and try again.')).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveValue(title);
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Create ticket' }).click();
    await expect(page).toHaveURL(/\/cases\/\d+$/);
  });

  test('server error on the list is shown with a trace id', async ({ page }) => {
    await page.route('**/api/v1/cases?**', r => r.fulfill({ status: 500, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Something went wrong', status: 500, traceId: 'audit-sim' }) }));
    await page.goto('/cases');
    await expect(page.getByText('Something went wrong')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/audit-sim/)).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();   // finding 023 of the 2.29.0 audit, fixed
  });

  // Finding 020 of the 2.29.0 audit. Fixed in 2.60.0 (A101): kept as a regression test.
  test('route guard: the create form is not offered to a role without rights', async ({ browser }) => {
    const role = `${PREFIX}NoEdit`;
    const roles = (await m.json('/admin/roles')).roles;
    if (!roles.some((r: any) => r.name === role)) await m.post('/admin/roles', { name: role, description: 'audit', rights: ['Cases:View'] });
    if (!(await m.json('/admin/users')).some((u: any) => u.accountName === 'DEV\\tio_audit_test_noedit'))
      await m.post('/admin/users', { accountName: 'DEV\\tio_audit_test_noedit', displayName: `${PREFIX}NoEdit user`, workingTimeZone: 'UTC', roleIds: [(await m.json('/admin/roles')).roles.find((r: any) => r.name === role).id], allClients: false, allInternal: false, scopes: [{ kind: 'Client', clientId: fx.clientId }] });
    const context = await browser.newContext();
    await signInAs(context, 'DEV\\tio_audit_test_noedit');
    const page = await context.newPage();
    await page.goto('/cases/new', { waitUntil: 'networkidle' });
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Create ticket' })).toHaveCount(0);
    await context.close();
  });
});
