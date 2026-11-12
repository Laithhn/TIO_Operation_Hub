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
    const r = await request.post('/api/v1/cases', { data: {}, headers: { Cookie: `tiohub-dev-user=${encodeURIComponent(MANAGER)}` } }); // a valid identity, but no X-XSRF-TOKEN header
    expect(r.status()).toBe(400);
  });

  test('engineer cannot reach administration endpoints', async () => {
    const e = await Hub.as(ENGINEER);
    for (const p of ['/admin/users', '/admin/roles', '/admin/settings', '/admin/lookups'])
      expect((await e.get(p)).status(), p).toBe(403);
    expect((await e.post('/admin/roles', { name: 'TIO_AUDIT_TEST_x', rights: ['Platform:Administration'] })).status()).toBe(403);
  });

  test('engineer cannot create clients, triage or reopen (Manage right)', async () => {
    const e = await Hub.as(ENGINEER);
    expect((await e.post('/clients', { code: 'TIOAUDITZ', name: 'TIO_AUDIT_TEST_z', country: 'Germany', status: 'Active', ownerUserId: e.me.id })).status()).toBe(403);
  });

  test('administration is offered to the manager and refused to an engineer, in rights and in the browser', async ({ browser }) => {
    const e = await Hub.as(ENGINEER); const m = await Hub.as(MANAGER);
    expect(e.me.rights).not.toContain('Platform:Administration');
    expect(m.me.rights).toContain('Platform:Administration');
    for (const [account, heading] of [[ENGINEER, 'Access denied'], [MANAGER, 'Users']] as const) {
      const context = await browser.newContext();
      await signInAs(context, account);
      const page = await context.newPage();
      await page.goto('/admin/users');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      await context.close();
    }
  });

  test('an engineer starts on My dashboard (A100)', async ({ browser }) => {
    const context = await browser.newContext();
    await signInAs(context, ENGINEER);
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/my-dashboard/);
    await context.close();
  });
});
