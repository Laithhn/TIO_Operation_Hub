import { test, expect } from '@playwright/test';
import { Hub, MANAGER, ENGINEER, PREFIX, caseBody, fixture, inDays, purgeFixture, signInAs } from './helpers';

const viewports = { desktop: [1920, 1080], laptop: [1366, 768], tablet: [768, 1024], mobile: [390, 844] } as const;
const pages = ['/', '/cases', '/cases/new', '/clients', '/commitments', '/escalations'];

test.describe('Responsive layout', () => {
  for (const [name, [width, height]] of Object.entries(viewports)) {
    // Audit finding TIO-DEV-AUDIT-017: the overview overflows horizontally on a phone.
    test(`${name === 'mobile' ? '@defect ' : ''}no horizontal page overflow at ${name} ${width}x${height}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height } });
      await signInAs(context, MANAGER);
      const page = await context.newPage();
      for (const path of pages) {
        await page.goto(path, { waitUntil: 'networkidle' });
        const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(docWidth, `${path} at ${name}`).toBeLessThanOrEqual(width + 1);
      }
      await context.close();
    });
  }

  test('below 900 px the section menu becomes a drawer', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    await signInAs(context, MANAGER);
    const page = await context.newPage();
    await page.goto('/cases');
    await page.getByRole('button', { name: 'Open section menu' }).click();
    await expect(page.getByRole('link', { name: 'New case', exact: true })).toBeVisible();
    await context.close();
  });
});

test.describe('End-to-end operational journeys', () => {
  let m: Hub, e: Hub; let fx: Awaited<ReturnType<typeof fixture>>;
  test.beforeAll(async () => { m = await Hub.as(MANAGER); e = await Hub.as(ENGINEER); fx = await fixture(m); });

  test('incident lifecycle: create, triage, assign, respond, wait, validate, close, audit history', async () => {
    const id = (await (await e.post('/cases', caseBody(fx.clientId, { contractId: fx.contractId }))).json()).id; const c = `/cases/${id}`;
    expect((await m.act(`${c}/triage`, { responsibleTeamId: 1, impactSummary: 'triaged', priority: 'High', nextAction: 'work', nextReviewAt: inDays(1), ownerUserId: e.me.id })).status()).toBe(204);
    expect((await e.act(`${c}/start`, { progressSummary: 'started', customerResponse: true })).status()).toBe(204);
    expect((await e.act(`${c}/waiting`, { reason: 'Customer', nextReviewAt: inDays(1) })).status()).toBe(204);
    expect((await e.act(`${c}/waiting/clear`, { reason: 'answered' })).status()).toBe(204);
    expect((await e.act(`${c}/request-validation`, { progressSummary: 'fixed', validationRequest: 'please confirm' })).status()).toBe(204);
    expect((await e.act(`${c}/close`, { outcome: 'resolved', validationEvidence: 'customer mail' })).status()).toBe(204);
    const k = await m.json(c);
    expect(k.status).toBe('Closed'); expect(k.sla.response.status).toBe('Met'); expect(k.sla.resolution.status).toBe('Met');
    expect(k.events.map((x: any) => x.type)).toEqual(expect.arrayContaining(['Created', 'Triaged', 'Started', 'WaitingStarted', 'WaitingEnded', 'ValidationRequested', 'Closed']));
    const audit = await m.json(`/admin/audit?pageSize=30`);
    expect(audit.items.some((a: any) => a.entityType === 'Case' && a.entityId === id)).toBeTruthy();
  });

  test('cross-module consistency: a case appears on the client page, in search and in the report', async ({ browser }) => {
    const title = `${PREFIX}cross module ${Date.now()}`;
    const id = (await (await e.post('/cases', caseBody(fx.clientId, { title }))).json()).id;
    expect((await m.json(`/search?q=${encodeURIComponent(title)}`)).some((h: any) => h.link === `/cases/${id}`)).toBeTruthy();
    expect((await m.json(`/cases?clientId=${fx.clientId}&q=${encodeURIComponent(title)}`)).totalCount).toBe(1);
    const context = await browser.newContext(); await signInAs(context, MANAGER);
    const page = await context.newPage();
    await page.goto(`/clients/${fx.clientId}`);
    await page.getByRole('tab', { name: 'Cases' }).or(page.getByRole('button', { name: 'Cases', exact: true })).or(page.getByText('Cases', { exact: true })).last().click();
    await expect(page.getByText(title)).toBeVisible();
    await context.close();
  });

  test('cleanup: every synthetic regression record is removed', async () => {
    await purgeFixture(m);
    expect((await m.json(`/clients?q=${PREFIX}REG&pageSize=50`)).items.filter((c: any) => c.code === `${PREFIX}REG`).length).toBe(0);
    for (const u of (await m.json('/admin/users')).filter((u: any) => u.accountName === 'DEV\\tio_audit_test_noedit' && u.isActive))
      await m.post(`/admin/users/${u.id}/deactivate`, { reason: 'audit cleanup' }, await m.etag(`/admin/users/${u.id}`));
  });
});
