import { test, expect } from '@playwright/test';
import { Hub, MANAGER, ENGINEER, signInAs } from './helpers';

test.describe('Authentication and role-based behaviour', () => {
  test('target is the development build (guard for every other test)', async () => {
    const m = await Hub.as(MANAGER);
    expect(m.me.app.environmentName).toBe('Development');
    expect(m.me.app.authMode).toBe('Development');
  });

  test('unknown account is refused by the API', async () => {
    const x = await Hub.as('DEV\\tio_audit_test_unknown');
    expect(x.me).toBeNull();
    expect((await x.get('/clients')).status()).toBe(403);
  });

  test('state-changing call without antiforgery token is refused', async ({ request }) => {
    const r = await request.post('/api/v1/cases', { data: {}, headers: { Cookie: `tiohub-dev-user=${encodeURIComponent(ENGINEER)}` } }); // no X-XSRF-TOKEN header
    expect(r.status()).toBe(400);
  });

  test('engineer cannot reach administration endpoints', async () => {
    const e = await Hub.as(ENGINEER);
    for (const p of ['/admin/users', '/admin/roles', '/admin/settings', '/admin/lookups'])
      expect((await e.get(p)).status(), p).toBe(403);
    expect((await e.post('/admin/roles', { name: 'TIO_AUDIT_TEST_x', rights: ['Administer'] })).status()).toBe(403);
  });

  test('engineer cannot create clients, triage or reopen (Manage right)', async () => {
    const e = await Hub.as(ENGINEER);
    expect((await e.post('/clients', { code: 'TIOAUDITZ', name: 'TIO_AUDIT_TEST_z', country: 'Germany', status: 'Active', ownerUserId: e.me.id })).status()).toBe(403);
  });

  test('navigation hides Administration for an engineer and shows it for the manager', async ({ browser }) => {
    for (const [account, visible] of [[ENGINEER, false], [MANAGER, true]] as const) {
      const context = await browser.newContext();
      await signInAs(context, account);
      const page = await context.newPage();
      await page.goto('/');
      const main = page.getByRole('navigation', { name: 'Main' });
      await expect(main.getByRole('link', { name: 'Cases', exact: true })).toBeVisible();
      await expect(main.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(visible ? 1 : 0);
      await context.close();
    }
  });

  test('protected admin route shows a refusal to an engineer', async ({ browser }) => {
    const context = await browser.newContext();
    await signInAs(context, ENGINEER);
    const page = await context.newPage();
    await page.goto('/admin/users');
    await expect(page.getByText('This page needs the Administration right.')).toBeVisible();
    await context.close();
  });
});
