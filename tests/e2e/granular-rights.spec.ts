import { expect, test, type Page } from '@playwright/test';

const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
type Role = { id: number; name: string; permissions: string[]; rights: string[]; version: string };

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
    return text ? JSON.parse(text) : null;
  }, { path, body, method, version });
}

async function storedRole(page: Page, id: number) {
  const response = await api<{ roles: Role[] }>(page, '/admin/roles');
  return response.roles.find(role => role.id === id)!;
}

test.describe('Central Rights administration and effective module visibility', () => {
  test('stages an explicit view grant, saves it, and enforces later revocation for the assigned user', async ({ page, browser }) => {
    await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent('DEV\\manager'), url: test.info().project.use.baseURL as string }]);
    await page.goto('/admin/rights');
    await expect(page.getByRole('heading', { name: 'Rights and permissions', exact: true })).toBeVisible();
    const name = unique('Browser rights');
    const { id } = await api<{ id: number }>(page, '/admin/roles', { name, rights: [], permissions: [] });
    const accountName = `DEV\\${unique('rights-user')}`;
    await api(page, '/admin/users', { accountName, displayName: unique('Rights user'), workingTimeZone: 'UTC', roleIds: [id] });
    const deniedContext = await browser.newContext({ baseURL: test.info().project.use.baseURL as string });
    try {
      await deniedContext.addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(accountName), url: test.info().project.use.baseURL as string }]);
      const deniedUser = await deniedContext.newPage();
      await deniedUser.goto('/cases');
      await expect(deniedUser.getByText('Access denied', { exact: true }).first()).toBeVisible();
      expect(await deniedUser.evaluate(async () => (await fetch('/api/v1/cases')).status)).toBe(403);
    } finally {
      await deniedContext.close();
    }
    await page.reload();
    await page.getByRole('combobox', { name: 'Role to configure', exact: true }).selectOption(String(id));
    await page.getByLabel('Search permissions', { exact: true }).fill('Cases:View');
    const view = page.getByRole('checkbox', { name: `View pages and records for ${name}`, exact: true });
    await expect(view).toHaveCount(1);
    await expect(view).not.toBeChecked();
    await view.check();
    await page.getByRole('checkbox', { name: `Module Cases for ${name}`, exact: true }).check();
    await page.getByRole('checkbox', { name: `Submodule Cases for ${name}`, exact: true }).check();
    // Checking a row only stages a change; no grants reach the API until the administrator reviews and saves.
    expect((await storedRole(page, id)).permissions).not.toContain('Cases:View');
    await page.getByRole('button', { name: 'Review and save', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review permission changes', exact: true });
    await expect(review).toContainText('Cases:View');
    await review.getByRole('button', { name: 'Save permissions', exact: true }).click();
    await expect(review).toBeHidden();
    expect((await storedRole(page, id)).permissions).toContain('Cases:View');

    const userContext = await browser.newContext({ baseURL: test.info().project.use.baseURL as string });
    try {
      await userContext.addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(accountName), url: test.info().project.use.baseURL as string }]);
      const user = await userContext.newPage();
      const unauthorizedRequests: string[] = [];
      user.on('request', request => {
        if (new URL(request.url()).pathname.startsWith('/api/v1/clients')) unauthorizedRequests.push(request.url());
      });
      await user.goto('/cases');
      await expect(user.getByRole('heading', { name: 'Cases', exact: true })).toBeVisible();
      expect(unauthorizedRequests).toEqual([]);
      expect(await user.evaluate(async () => (await fetch('/api/v1/cases')).status)).toBe(200);
      expect(await user.evaluate(async () => (await fetch('/api/v1/clients')).status)).toBe(403);
      expect(await user.evaluate(async () => (await fetch('/api/v1/admin/roles')).status)).toBe(403);

      await view.uncheck();
      await page.getByRole('button', { name: 'Review and save', exact: true }).click();
      await review.getByRole('button', { name: 'Save permissions', exact: true }).click();
      await expect(review).toBeHidden();
      expect(await user.evaluate(async () => (await fetch('/api/v1/cases')).status)).toBe(403);
      await user.reload();
      await expect(user.getByText('Access denied', { exact: true }).first()).toBeVisible();
      await expect(user.getByRole('heading', { name: 'Cases', exact: true })).toHaveCount(0);
    } finally {
      await userContext.close();
    }
  });

  test('expanding a permission group changes no grants and group changes require explicit confirmation', async ({ page }) => {
    await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent('DEV\\manager'), url: test.info().project.use.baseURL as string }]);
    await page.goto('/admin/rights');
    const name = unique('Default deny');
    const { id } = await api<{ id: number }>(page, '/admin/roles', { name, rights: [], permissions: [] });
    await page.reload();
    await page.getByRole('combobox', { name: 'Role to configure', exact: true }).selectOption(String(id));
    await page.getByLabel('Search permissions', { exact: true }).fill('Cases:');
    await page.screenshot({ path: test.info().outputPath('rights-editor-cases.png'), fullPage: true });
    await page.getByRole('button', { name: 'Collapse Cases', exact: true }).first().click();
    await page.getByRole('button', { name: 'Expand Cases', exact: true }).first().click();
    expect((await storedRole(page, id)).permissions).toEqual([]);
    await page.getByRole('button', { name: 'Grant shown permissions in Cases', exact: true }).first().click();
    const confirmation = page.getByRole('dialog', { name: 'Grant permission group', exact: true });
    await expect(confirmation).toBeVisible();
    expect((await storedRole(page, id)).permissions).toEqual([]);
    await confirmation.getByRole('button', { name: 'Stage group change', exact: true }).click();
    expect((await storedRole(page, id)).permissions).toEqual([]);
    await expect(page.getByRole('button', { name: 'Review and save', exact: true })).toBeEnabled();
  });
});
