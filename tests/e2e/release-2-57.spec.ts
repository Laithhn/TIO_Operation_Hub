import { expect, test, type Page } from '@playwright/test';

const api = async <T>(page: Page, path: string) => page.evaluate(async p => (await (await fetch(`/api/v1${p}`)).json()) as T, path);

test.describe('Second usability review (A105)', () => {
  test('an empty escalation list says so, offers View all and shows 0 records without page controls', async ({ page }) => {
    await page.route('**/api/v1/escalations?**', route => route.request().url().includes('status=active')
      ? route.fulfill({ json: { items: [], page: 1, pageSize: 25, totalCount: 0 } }) : route.fallback());
    await page.goto('/escalations');
    await expect(page.getByText('No active escalations.')).toBeVisible();
    await expect(page.getByText(/Records :- 1 OF 0/)).toHaveCount(0);
    const pager = page.getByRole('navigation', { name: 'Pagination' });
    await expect(pager).toHaveText('0 records');
    await expect(pager.getByRole('button')).toHaveCount(0);
    await page.getByRole('button', { name: 'View all', exact: true }).click();
    await expect(page).toHaveURL(/status=all/);
  });

  test('a new environment asks for the client before offering regions', async ({ page }) => {
    await page.goto('/environments/new');
    const region = page.getByLabel('Region');
    await expect(region).toBeDisabled();
    await expect(region.locator('option:checked')).toHaveText('Select a client first');
  });

  test('change history opens on people\'s changes and can show background work', async ({ page }) => {
    await page.goto('/admin/audit');
    await expect(page.getByLabel('Activity')).toHaveValue('people');
    await expect(page.locator('table tbody').getByText('System', { exact: true })).toHaveCount(0);
    const req = page.waitForRequest(r => r.url().includes('/api/v1/admin/audit?') && r.url().includes('actor=system'));
    await page.getByLabel('Activity').selectOption('system');
    await req;
  });

  test('the action list shows its categories in groups with counts', async ({ page }) => {
    await page.goto('/actions');
    const groups = page.getByRole('group', { name: 'Action categories' });
    for (const g of ['Deadlines', 'Ownership and follow-up', 'Environments and data', 'Contracts']) await expect(groups.getByText(g, { exact: true })).toBeVisible();
    await expect(groups.getByRole('button')).toHaveCount(14);
    await groups.getByRole('button', { name: /^Overdue tickets/ }).click();
    await expect(page).toHaveURL(/category=OverdueCase/);
    await expect(groups.getByRole('button', { name: /^Overdue tickets/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('a contract opens with its summary and section links', async ({ page }) => {
    await page.goto('/');
    const list = await api<{ items: { id: number }[] }>(page, '/contracts?pageSize=1');
    await page.goto(`/contracts/${list.items[0].id}`);
    const summary = page.getByRole('region', { name: 'Contract summary' });
    for (const label of ['Term', 'Renewal', 'SLA targets', 'Payments']) await expect(summary.getByText(label, { exact: true })).toBeVisible();
    const sections = page.getByRole('navigation', { name: 'Contract sections' });
    await sections.getByRole('link', { name: /^SLA targets/ }).click();
    await expect(page.getByRole('heading', { name: 'SLA targets (recorded)' })).toBeInViewport();
  });

  test('a product has section links and Delete under More', async ({ page }) => {
    await page.goto('/');
    const products = await api<{ id: number }[]>(page, '/products');
    await page.goto(`/products/${products[0].id}`);
    await expect(page.getByRole('navigation', { name: 'Product sections' }).getByRole('link', { name: /^Versions/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete product', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'Delete product' })).toBeVisible();
  });

  test('settings have readable names with the stored key as secondary information', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
    const row = page.locator('tr', { hasText: 'Default time zone for new users' });
    await expect(row).toContainText('DefaultTimeZone');
  });

  test('users show role, sign-in and scope first, with account actions in the row menu', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('tr.vt-row').first()).toBeVisible();
    const named = (await page.locator('th.vt-th').allInnerTexts()).map(h => h.trim()).filter(h => ['Name', 'Role', 'Sign-in', 'Scope', 'Last sign-in', 'Account'].includes(h));
    expect(named).toEqual(['Name', 'Role', 'Sign-in', 'Scope', 'Last sign-in']);
    await page.getByRole('button', { name: /^Actions for / }).first().click();
    await expect(page.getByRole('menuitem', { name: /^(Deactivate|Reactivate)$/ })).toBeVisible();
  });

  test('the report builder opens one step at a time', async ({ page }) => {
    await page.goto('/reporting-center/builder/cases');
    const steps = page.getByRole('list', { name: 'Report steps' });
    await expect(steps.getByRole('button', { name: /^1 · Filters/ })).toHaveAttribute('aria-current', 'step');
    await steps.getByRole('button', { name: /^2 · Columns/ }).click();
    await expect(page.getByRole('list', { name: 'Selected columns in export order' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open statuses only' })).toBeHidden();
    await page.getByRole('button', { name: 'Next: sort and group' }).click();
    await expect(page.getByLabel('Group by')).toBeVisible();
  });
});
