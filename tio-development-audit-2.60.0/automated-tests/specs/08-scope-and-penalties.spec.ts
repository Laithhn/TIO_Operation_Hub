import { test, expect } from '@playwright/test';
import { Hub, MANAGER, ENGINEER, OUTSIDER, PREFIX, caseBody, fixture, inDays } from './helpers';

// New in the 2.60.0 audit: per-client data scope, change history, penalties.
test.describe('Data scope per client (2.60.0)', () => {
  let m: Hub, e: Hub, o: Hub; let fx: Awaited<ReturnType<typeof fixture>>;
  test.beforeAll(async () => { m = await Hub.as(MANAGER); fx = await fixture(m); e = await Hub.as(ENGINEER); o = await Hub.open(OUTSIDER); });

  test('lists show only records of clients in scope', async () => {
    expect((await e.json('/clients?pageSize=100')).items.every((c: any) => c.code.startsWith('TIO'))).toBeTruthy();   // only synthetic audit clients
    expect((await e.json('/clients?pageSize=100')).items.some((c: any) => c.id === fx.clientId)).toBeTruthy();
    const mine = (await e.json('/cases?status=all&pageSize=100')).items;
    expect(mine.every((c: any) => (c.clientCode ?? '').startsWith('TIO'))).toBeTruthy();
    expect((await o.json(`/cases?status=all&pageSize=100`)).items.some((c: any) => c.clientId === fx.clientId)).toBeFalsy();
  });

  test('records of another client answer 404 on read and write', async () => {
    for (const p of ['/clients/1', '/clients/1/overview', '/cases/1', '/cases/1/activity', '/commitments/1', '/contracts/1', '/projects/1', '/environments/1', '/assets/1', '/installations/1', '/dashboard/clients/1', '/attachments?recordType=Case&recordId=1'])
      expect((await e.get(p)).status(), p).toBe(404);
    expect((await e.post('/cases/1/cancel', { reason: 'x' }, 'AAAAAAAAAAE=')).status()).toBe(404);
    expect((await e.post('/cases', caseBody(1))).status(), 'create on other client').toBe(422);
    expect((await e.post('/cases', caseBody(fx.clientId, { contractId: 1 }))).status(), 'contract of other client').toBe(422);
  });

  test('dashboards, search and reports follow the scope', async () => {
    const visible = (await e.json('/cases?status=open&pageSize=1')).totalCount;
    expect((await e.json('/dashboard')).cases.find((k: any) => k.key === 'openCases').value).toBe(visible);
    expect(visible).toBeLessThan((await m.json('/cases?status=open&pageSize=1')).totalCount);
    expect(await e.json('/search?q=Dubai')).toEqual([]);
    expect((await e.post('/reports/cases/preview', { filters: { clientId: '1', status: 'all' } })).status()).toBe(422);
  });

  // Audit finding TIO-260-AUDIT-035.
  test('@defect change history does not show child records of clients outside the scope', async () => {
    const items: any[] = [];
    for (const page of [1, 2, 3, 4]) items.push(...(await e.json(`/admin/audit?pageSize=100&page=${page}`)).items);
    const foreign = items.filter(a => a.clientId === null && ['SlaTarget', 'ProjectProduct', 'Handover', 'ContractPayment'].includes(a.entityType) && a.userName !== ENGINEER);
    expect(foreign.map(a => `${a.entityType} by ${a.userName}`)).toEqual([]);
  });
});

test.describe('@defect Penalties follow SLA results that can be rewritten (2.60.0)', () => {
  test('TIO-260-AUDIT-001/002/003/011 an indicative penalty is not removed by priority change, contract unlink, back-dated response or delete', async () => {
    test.setTimeout(180_000);
    const m = await Hub.as(MANAGER); const fx = await fixture(m); const e = await Hub.as(ENGINEER);
    const r = await m.post('/contracts', { projectId: fx.projectId, title: `${PREFIX}Penalty ${Date.now()}`, type: 'SlaSupport', status: 'Active', ownerUserId: m.me.id, startDate: '2026-01-01', endDate: '2028-12-31',
      support24x7: true, supportTimeZone: 'Asia/Dubai', currency: 'EUR',
      slaTargets: [{ priority: 'Critical', responseMinutes: 1, resolutionMinutes: 2, basis: 'CalendarHours' }, { priority: 'Low', responseMinutes: 6000, resolutionMinutes: 60000, basis: 'CalendarHours' }],
      penaltyClauses: [{ name: `${PREFIX}response`, trigger: 'ResponseSlaBreached', calculation: 'FixedPerBreach', fixedAmount: 1000, billingTimeZone: 'Asia/Dubai' }] });
    expect(r.status(), await r.text()).toBe(201);
    const contractId = (await r.json()).id;
    const ids: number[] = [];
    for (let i = 0; i < 4; i++) ids.push((await (await m.post('/cases', caseBody(fx.clientId, { priority: 'Critical', contractId, ownerUserId: e.me.id }))).json()).id);
    const amount = async () => ((await m.json(`/cases/${ids[2]}/penalty-preview`)).items[0]?.amount ?? 0) as number;
    await expect.poll(amount, { timeout: 120_000, intervals: [5_000] }).toBe(4000);
    const a = await m.json(`/cases/${ids[0]}`);
    await m.act(`/cases/${ids[0]}`, { title: a.title, type: a.type, responsibleTeamId: 1, impactSummary: a.impactSummary, priority: 'Low', nextAction: 'n', nextReviewAt: inDays(1), changeNote: 'audit' }, 'put');
    await e.act(`/cases/${ids[1]}/contract`, { contractId: null, reason: 'wrong contract' });
    await e.act(`/cases/${ids[2]}/first-response`, { respondedAt: (await m.json(`/cases/${ids[2]}`)).createdAt, channel: 'Verbal' });
    await m.delete(`/dependents/cases/${ids[3]}`);
    expect(await amount()).toBe(4000);
  });
});
