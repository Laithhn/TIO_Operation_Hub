import { expect, test, type Page } from '@playwright/test';

// A110 (owner requests, 10 Nov 2026): What's new readable, the client's Tickets tab, the contract register columns,
// a payment status changed on its own, and the optional GPU fields of a server. Real API, isolated database.

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

const unique = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

test.describe('Release 2.60.0 requests (A110)', () => {
  test("What's new is dark text in a numbered list", async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /What's new/ }).click();
    const dialog = page.getByRole('dialog');
    const item = dialog.locator('.whats-new ol li').first();
    await expect(item).toBeVisible();
    expect(await item.evaluate(el => getComputedStyle(el).color)).toBe('rgb(29, 29, 27)');
    expect(await dialog.locator('.whats-new ol').first().evaluate(el => getComputedStyle(el).listStyleType)).toBe('decimal');
  });

  test("a client's Tickets tab shows the Tickets page table", async ({ page }) => {
    await page.goto('/clients');
    await page.getByRole('link', { name: 'DEMO-NTA', exact: true }).first().click();
    await page.getByRole('navigation', { name: 'Client areas' }).getByRole('button', { name: 'Operational' }).click();
    await page.getByRole('tab', { name: 'Tickets' }).click();
    const table = page.locator('table').filter({ has: page.getByRole('columnheader', { name: 'Priority' }) });
    await expect(table).toBeVisible();
    for (const header of ['Ticket', 'Client', 'Status', 'Owner', 'Deadline']) await expect(table.getByRole('columnheader', { name: header })).toBeVisible();
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('open');
  });

  test('the contract register shows the client and the contract amount, and a payment status changes on its own', async ({ page }) => {
    await page.goto('/contracts');
    const me = await api<{ id: number }>(page, '/me');
    const projects = await api<{ items: { id: number; code: string }[] }>(page, '/projects?pageSize=50');
    const project = projects.items.find(p => p.code === 'DEMO-NTA-OPS')!;
    const title = unique('Fictional priced agreement');
    const created = await api<{ id: number }>(page, '/contracts', {
      projectId: project.id, title, type: 'SlaSupport', status: 'Active', ownerUserId: me.id, startDate: '2026-01-01', endDate: '2028-12-31', renewalTerms: 'RenewalByAgreement',
      noticeDays: 30, supportModel: 'Remote', supportTimeZone: 'Asia/Dubai', support24x7: true, currency: 'AED',
      fees: [{ description: 'Implementation', unit: 'lump sum', quantity: null, unitPrice: 120000 }],
      payments: [{ condition: 'Signature', percentage: 50, amount: 60000, dueDate: '2026-02-01', status: 'Invoiced', paidOn: null }]
    });
    await page.goto('/contracts?sort=-amount');
    await expect(page.getByRole('columnheader', { name: 'Client' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Contract amount' })).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: title });
    await expect(row).toContainText('DEMO-NTA');
    await expect(row).toContainText('120,000');

    await page.goto(`/contracts/${created.id}`);
    await page.getByRole('button', { name: 'Change status' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Status', { exact: true }).selectOption('Paid');
    await dialog.getByLabel('Paid on').fill('2026-02-03');
    await dialog.getByLabel('I confirm this action.').check();
    await dialog.getByRole('button', { name: 'Save status' }).click();
    await expect(dialog).toBeHidden();
    const payments = page.getByRole('table', { name: 'Contract payment terms' });
    await expect(payments).toContainText('Paid');
    await expect(payments).toContainText('paid');
  });

  test('a server records an optional GPU', async ({ page }) => {
    await page.goto('/assets');
    const me = await api<{ id: number }>(page, '/me');
    const envs = await api<{ items: { id: number }[] }>(page, '/environments?pageSize=1');
    const name = unique('gpu').toLowerCase();
    const created = await api<{ id: number }>(page, '/assets', {
      environmentId: envs.items[0].id, name, type: 'VM', lifecycle: 'Active', ownerUserId: me.id, gpuCount: 2, gpuModel: 'NVIDIA A100', gpuMemoryQuantity: 80, gpuMemoryUnit: 'GB'
    });
    await page.goto(`/assets/${created.id}`);
    await expect(page.getByText('2 × NVIDIA A100 · 80 GB')).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByRole('dialog').getByLabel('GPU model (optional)')).toHaveValue('NVIDIA A100');
  });
});
