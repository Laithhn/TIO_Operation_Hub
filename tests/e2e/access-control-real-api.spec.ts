import { expect, test, type Locator, type Page } from '@playwright/test';

// The master acceptance workflow on the real API, database and built front end. Nothing is intercepted.
const unique = Date.now().toString(36);
const roleName = `E2E commitments ${unique}`;
const account = `DEV\\e2e-${unique}`;

async function signInAs(page: Page, who: string) {
  const baseURL = test.info().project.use.baseURL as string;
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(who), url: baseURL }]);
}

/** A same-origin API call from the signed-in page, with its antiforgery token, the way the application makes them. */
async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(async ({ method, path, body }) => {
    await fetch('/api/v1/me');
    const token = decodeURIComponent(document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '');
    const response = await fetch(`/api/v1${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* not every answer has a body */ }
    return { status: response.status, json };
  }, { method, path, body });
}

/** A dropdown by its wrapping label: the options are part of that label's text, so an exact label match cannot find it. */
const field = (scope: Locator, label: string) => scope.locator('label').filter({ hasText: new RegExp(`^${label}`) }).locator('select');

test.describe.configure({ mode: 'serial' });
test.use({ actionTimeout: 15_000 });
test.setTimeout(180_000);

test('an administrator creates, assigns, verifies, narrows and revokes access for a real user', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());

  await test.step('administrator signs in and creates a role', async () => {
    await signInAs(page, 'DEV\\manager');
    await page.goto('/admin/access');
    await page.getByRole('button', { name: 'New role', exact: true }).click();
    const form = page.getByRole('region', { name: 'New role', exact: true });
    await form.getByLabel('Role name').fill(roleName);
    await form.getByRole('button', { name: 'Create role', exact: true }).click();
    await expect(page.locator('#access-roles').getByRole('button', { name: new RegExp(roleName) })).toBeVisible();
  });

  await test.step('administrator configures the role in the permission matrix', async () => {
    const section = page.locator('#access-roles');
    await section.getByRole('button', { name: new RegExp(roleName) }).click();
    const moduleSelect = field(section, 'Module');
    const commitmentsModule = (await moduleSelect.locator('option').allTextContents()).find(text => /commitment/i.test(text))!;
    await moduleSelect.selectOption(commitmentsModule);
    const matrix = page.getByRole('region', { name: 'Role permission matrix' });
    for (const button of await matrix.getByRole('button', { name: 'Grant shown', exact: true }).all())
      if (await button.isEnabled()) await button.click();
    await section.getByRole('button', { name: 'Review changes', exact: true }).click();
    await page.getByRole('region', { name: 'Review role changes' }).getByRole('button', { name: 'Confirm and save role', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Review role changes' })).toBeHidden();
  });

  await test.step('administrator assigns the role and sees the effective permission', async () => {
    const created = await api(page, 'POST', '/admin/users', { accountName: account, displayName: `E2E person ${unique}`, workingTimeZone: 'UTC', roleIds: [], allClients: true, allInternal: true, scopes: [] });
    expect(created.status).toBe(201);
    await page.reload();
    const person = page.locator('#access-person');
    await field(person, 'User').selectOption(String(created.json.id));
    const assignments = page.getByRole('region', { name: 'Role and scope assignments' }).or(page.locator('section[aria-label="Role and scope assignments"]'));
    await assignments.getByRole('checkbox', { name: new RegExp(roleName) }).check();
    await assignments.getByRole('button', { name: 'Review assignments', exact: true }).click();
    await page.getByRole('region', { name: 'Review user assignments' }).getByRole('button', { name: 'Confirm and save assignments', exact: true }).click();
    await expect(person.getByText(roleName).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'User permission snapshot' })).toContainText('Commitments:Maintain');
  });

  let commitments: { id: number; clientId: number | null }[] = [];
  await test.step('the user signs in and the interface and API allow only what was granted', async () => {
    const all = await api(page, 'GET', '/commitments?pageSize=200');
    commitments = all.json.items.map((c: any) => ({ id: c.id, clientId: c.clientId ?? c.client?.id ?? null })).filter((c: any) => c.clientId);
    expect(commitments.length).toBeGreaterThan(1);
    await signInAs(page, account);
    await page.goto('/commitments');
    await expect(page.getByRole('heading', { name: /Commitments/ }).first()).toBeVisible();
    expect((await api(page, 'GET', '/commitments?pageSize=1')).status).toBe(200);
    expect((await api(page, 'GET', '/contracts')).status).toBe(403);
    expect((await api(page, 'GET', '/admin/users')).status).toBe(403);
    expect((await api(page, 'POST', '/admin/roles', { name: 'escalate', permissions: [], rights: [] })).status).toBe(403);
    await page.goto('/contracts');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await page.goto('/admin/access');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  });

  const target = commitments[0];
  const other = commitments.find(c => c.clientId !== target.clientId)!;
  await test.step('a limited deny narrows one client only, and the exception editor shows the exact scope', async () => {
    await signInAs(page, 'DEV\\manager');
    await page.goto('/admin/access');
    const users = await api(page, 'GET', '/admin/users');
    const id = users.json.find((u: any) => u.accountName === account).id;
    await field(page.locator('#access-person'), 'User').selectOption(String(id));
    const editor = page.locator('.access-overrides', { hasText: 'Direct permission exceptions' });
    await editor.getByRole('button', { name: 'Add exception', exact: true }).click();
    const row = editor.locator('.override-row').last();
    await field(row, 'Permission').selectOption('Commitments:Maintain');
    await field(row, 'Effect').selectOption('Deny');
    await field(row, 'Applies to').selectOption('client');
    await expect(editor.getByRole('alert')).toContainText('select the client');
    await field(row, 'Client').selectOption(String(target.clientId));
    await editor.getByRole('button', { name: 'Review changes', exact: true }).click();
    const review = page.getByRole('region', { name: 'Review permission exceptions' });
    await expect(review).toContainText('Deny · Client:');
    await review.getByRole('button', { name: 'Confirm and save', exact: true }).click();
    await expect(editor.getByText('Permission exceptions saved.')).toBeVisible();

    await signInAs(page, account);
    await page.goto('/commitments');
    expect((await api(page, 'GET', `/commitments/${target.id}`)).json.permissions.canEdit).toBe(false);
    expect((await api(page, 'GET', `/commitments/${other.id}`)).json.permissions.canEdit).toBe(true);
    const denied = await api(page, 'GET', `/commitments/${target.id}`);
    expect((await api(page, 'POST', `/commitments/${target.id}/cancel`, { reason: 'Must be refused' })).status).toBe(403);
    expect(denied.status).toBe(200);
  });

  await test.step('removing the role revokes access on the next request, without signing out', async () => {
    await signInAs(page, 'DEV\\manager');
    await page.goto('/admin/access');
    const users = await api(page, 'GET', '/admin/users');
    const id = users.json.find((u: any) => u.accountName === account).id;
    await field(page.locator('#access-person'), 'User').selectOption(String(id));
    const assignments = page.locator('section[aria-label="Role and scope assignments"]');
    await assignments.getByRole('checkbox', { name: new RegExp(roleName) }).uncheck();
    await assignments.getByRole('button', { name: 'Review assignments', exact: true }).click();
    await page.getByRole('region', { name: 'Review user assignments' }).getByRole('button', { name: 'Confirm and save assignments', exact: true }).click();
    await expect(page.locator('.access-person-summary')).not.toContainText(roleName);

    await signInAs(page, account);
    const after = await page.request.get('/api/v1/commitments?pageSize=1');
    expect(after.status()).toBe(403);
    await page.goto('/commitments');
    await expect(page.getByText('Your account has no access to the TIO Operations Hub.')).toBeVisible();
  });

  await test.step('the change history records who changed what', async () => {
    await signInAs(page, 'DEV\\manager');
    await page.goto('/admin/access');
    const audit = await api(page, 'GET', '/admin/audit?category=Access&pageSize=100');
    expect(audit.status).toBe(200);
    const text = JSON.stringify(audit.json);
    expect(text).toContain('UserPermissionOverride');
    expect(text).toContain('DEV\\\\manager');
  });
});

test('the access control dashboard stays usable on a phone and by keyboard', async ({ page }) => {
  await signInAs(page, 'DEV\\manager');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/access');
  await expect(page.getByRole('navigation', { name: 'Access control sections' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/admin/access');
  const search = page.locator('#access-person').getByLabel('Find a user');
  await search.focus();
  await page.keyboard.press('Tab');
  await expect(field(page.locator('#access-person'), 'User')).toBeFocused();
  // Every control in the section has an accessible name.
  const unnamed = await page.locator('#access-person').locator('select, input, button').evaluateAll(nodes => nodes.filter(node => {
    const element = node as HTMLInputElement;
    return !(element.labels?.length || element.getAttribute('aria-label') || element.textContent?.trim());
  }).length);
  expect(unnamed).toBe(0);
});
