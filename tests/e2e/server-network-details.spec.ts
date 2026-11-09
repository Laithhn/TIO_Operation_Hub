import { expect, test, type Page } from '@playwright/test';

// A104: a server's IP address, VLAN and notes, entered in the form and shown on the server and environment pages.
const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;

async function post<T>(page: Page, path: string, body: unknown): Promise<T> {
  return page.evaluate(async ({ path, body }) => {
    const token = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];
    const response = await fetch(`/api/v1${path}`, {
      method: 'POST', body: JSON.stringify(body),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) }
    });
    if (!response.ok) throw new Error(`POST ${path}: ${response.status}: ${await response.text()}`);
    return response.json();
  }, { path, body });
}

test('a server records its IP address, VLAN and notes', async ({ page }) => {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  const me = await page.evaluate(() => fetch('/api/v1/me').then(r => r.json())) as { id: number };
  const client = await post<{ id: number }>(page, '/clients', { code: unique('NET'), name: unique('Network details'), country: 'Oman', ownerUserId: me.id, status: 'Active' });
  const env = await post<{ id: number }>(page, '/environments', { clientId: client.id, name: 'Production', type: 'Production', criticality: 'Normal', ownerUserId: me.id, backupGapReason: 'Test gap' });
  const name = unique('net-app');

  await page.goto(`/environments/${env.id}`);
  await page.getByRole('button', { name: '+ Add', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Server', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Add server', exact: true });
  await form.getByLabel('Server name').fill(name);
  await form.getByLabel('IP address').fill('not an address');
  await form.getByLabel('VLAN').fill('13');
  await form.getByLabel('Notes').fill('Purpose: API\nNetwork speed: 20 Gbps');
  await form.getByLabel('Technical owner', { exact: true }).selectOption({ label: 'Mara Okafor (demo manager)' });
  await form.getByRole('button', { name: 'Add server' }).click();
  await expect(form.getByText('Enter a valid IP address')).toBeVisible();
  await form.getByLabel('IP address').fill('10.50.13.60');
  await form.getByRole('button', { name: 'Add server' }).click();
  await expect(form).toBeHidden();

  await page.getByRole('tab', { name: /Servers & assets/ }).click();
  await expect(page.getByRole('cell', { name: '10.50.13.60', exact: true })).toBeVisible();
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByText('10.50.13.60', { exact: true })).toBeVisible();
  await expect(page.getByRole('paragraph').filter({ hasText: 'Network speed: 20 Gbps' })).toBeVisible();
});
