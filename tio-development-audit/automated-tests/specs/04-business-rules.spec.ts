import { test, expect } from '@playwright/test';
import { Hub, MANAGER, ENGINEER, ENGINEER2, PREFIX, caseBody, fixture, inDays } from './helpers';

// Rules the build enforces correctly today (regression protection).
test.describe('Business rules enforced by the API', () => {
  let m: Hub, e: Hub, e2: Hub; let fx: Awaited<ReturnType<typeof fixture>>;
  test.beforeAll(async () => { m = await Hub.as(MANAGER); e = await Hub.as(ENGINEER); e2 = await Hub.as(ENGINEER2); fx = await fixture(m); });

  test('case creation validates mandatory fields, lengths, time zones and secrets', async () => {
    expect((await e.post('/cases', {})).status()).toBe(422);
    expect((await e.post('/cases', caseBody(fx.clientId, { title: 'x'.repeat(201) }))).status()).toBe(422);
    expect((await e.post('/cases', caseBody(fx.clientId, { nextReviewAt: inDays(-3) }))).status()).toBe(422);
    expect((await e.post('/cases', caseBody(fx.clientId, { dueLocal: '2027-01-01T10:00', dueTimeZone: 'Mars/Phobos' }))).status()).toBe(422);
    expect((await e.post('/cases', caseBody(fx.clientId, { title: `${PREFIX}password=Sup3rSecret!` }))).status()).toBe(422);
    expect((await e.post('/cases', caseBody(fx.clientId, { scope: 'Internal' }))).status()).toBe(422);
    expect((await e.post('/cases', caseBody(fx.clientId, { ownerUserId: e2.me.id }))).status(), 'engineer cannot assign others').toBe(422);
  });

  test('case lifecycle: only valid transitions, optimistic concurrency, evidence on closure', async () => {
    const id = (await (await e.post('/cases', caseBody(fx.clientId))).json()).id; const c = `/cases/${id}`;
    expect((await e.act(`${c}/start`)).status(), 'start while New').toBe(422);
    expect((await e.act(`${c}/close`, { outcome: 'x', validationEvidence: 'y' })).status(), 'close while New').toBe(422);
    expect((await e.act(`${c}/triage`, { responsibleTeamId: 1, impactSummary: 'i', priority: 'High', nextAction: 'n', nextReviewAt: inDays(1) })).status(), 'engineer triage').toBe(403);
    expect((await e.post(`${c}/cancel`, { reason: 'x' })).status(), 'missing If-Match').toBe(428);
    expect((await e.post(`${c}/cancel`, { reason: 'x' }, 'AAAAAAAAAAE=')).status(), 'stale If-Match').toBe(412);
    expect((await m.act(`${c}/triage`, { responsibleTeamId: 1, impactSummary: 'i', priority: 'High', nextAction: 'n', nextReviewAt: inDays(1) })).status()).toBe(204);
    expect((await e.act(`${c}/start`)).status(), 'start without owner').toBe(422);
    expect((await m.act(`${c}/assign`, { ownerUserId: e.me.id, reason: 'audit' })).status()).toBe(204);
    expect((await e2.act(`${c}/assign`, { ownerUserId: e2.me.id })).status(), 'engineer cannot take owned case').toBe(403);
    expect((await e.act(`${c}/start`)).status()).toBe(204);
    expect((await e.act(`${c}/close`, { outcome: 'done', validationEvidence: 'ev' })).status(), 'close skipping validation').toBe(422);
    expect((await e.act(`${c}/request-validation`, { progressSummary: 'fixed', validationRequest: 'confirm' })).status()).toBe(204);
    expect((await e.act(`${c}/close`, { outcome: 'done' })).status(), 'close without evidence').toBe(422);
    expect((await e.act(`${c}/close`, { outcome: 'done', evidenceExceptionReason: 'trust me', followUpOwnerId: e.me.id, followUpDate: '2027-01-01' })).status(), 'engineer evidence exception').toBe(422);
    expect((await e.act(`${c}/close`, { outcome: 'done', validationEvidence: 'customer mail' })).status()).toBe(204);
    expect((await e.act(`${c}/progress`, { progressSummary: 'x', nextAction: 'y', nextReviewAt: inDays(1) })).status(), 'progress on closed').toBe(422);
    expect((await e.act(`${c}/reopen`, { reason: 'r', nextAction: 'n', nextReviewAt: inDays(1) })).status(), 'engineer reopen').toBe(403);
    const types = (await m.json(c)).events.map((x: any) => x.type).reverse();
    expect(types).toEqual(['Created', 'Triaged', 'OwnerChanged', 'Started', 'ValidationRequested', 'Closed']);
  });

  test('two saves with the same version: one wins, one gets 412', async () => {
    const id = (await (await e.post('/cases', caseBody(fx.clientId))).json()).id;
    const tag = await e.etag(`/cases/${id}`);
    const body = { progressSummary: 'concurrent', nextAction: 'n', nextReviewAt: inDays(1) };
    const [a, b] = await Promise.all([e.post(`/cases/${id}/progress`, body, tag), m.post(`/cases/${id}/progress`, body, tag)]);
    expect([a.status(), b.status()].sort()).toEqual([204, 412]);
  });

  test('contract SLA: target snapshot, single first response, contract of another client refused', async () => {
    const id = (await (await m.post('/cases', caseBody(fx.clientId, { contractId: fx.contractId }))).json()).id;
    const sla = (await m.json(`/cases/${id}`)).sla;
    expect(sla.applied.responseMinutes).toBe(60); expect(sla.response.status).toBe('Pending');
    expect((await e.act(`/cases/${id}/first-response`, { respondedAt: inDays(1), channel: 'E-mail' })).status(), 'future response').toBe(422);
    expect((await e.act(`/cases/${id}/first-response`, { channel: 'E-mail' })).status()).toBe(204);
    expect((await e.act(`/cases/${id}/first-response`, { channel: 'E-mail' })).status(), 'second response').toBe(409);
    expect((await m.json(`/cases/${id}`)).sla.response.status).toBe('Met');
    expect((await m.post('/cases', caseBody(1, { contractId: fx.contractId }))).status(), 'contract of other client').toBe(422);
  });

  test('contracts: date order, SLA target sanity, payment rules', async () => {
    const base = { projectId: fx.projectId, title: `${PREFIX}bad`, type: 'SlaSupport', status: 'Draft', ownerUserId: m.me.id, startDate: '2026-01-01', endDate: '2027-01-01' };
    expect((await e.post('/contracts', { ...base, startDate: '2027-01-01', endDate: '2026-01-01' })).status()).toBe(422);
    expect((await e.post('/contracts', { ...base, slaTargets: [{ priority: 'High', responseMinutes: 600, resolutionMinutes: 10, basis: 'CalendarHours' }] })).status()).toBe(422);
    expect((await e.post('/contracts', { ...base, currency: 'EUR', payments: [{ condition: 'a', percentage: 70, amount: 1, dueDate: '2026-12-01', status: 'Pending' }, { condition: 'b', percentage: 70, amount: 1, dueDate: '2026-12-01', status: 'Pending' }] })).status()).toBe(422);
    expect((await e.post('/contracts', { ...base, currency: 'EUR', payments: [{ condition: 'a', percentage: 10, amount: 1, dueDate: '2026-12-01', status: 'Paid' }] })).status()).toBe(422);
  });

  test('commitments: reason for revision, completion time sanity, late result kept', async () => {
    const body = { scope: 'Client', clientId: fx.clientId, responsibleTeamId: 1, description: `${PREFIX}commitment ${Date.now()}`, type: 'Delivery', ownerUserId: e.me.id, dueLocal: '2027-03-01T17:00', timeZone: 'Asia/Dubai', nextReviewAt: inDays(5) };
    expect((await e.post('/commitments', { ...body, dueLocal: '2027-03-28T02:30', timeZone: 'Europe/Berlin' })).status(), 'DST gap').toBe(422);
    const id = (await (await e.post('/commitments', body)).json()).id; const c = `/commitments/${id}`;
    expect((await e.act(`${c}/revise`, { dueLocal: '2027-04-01T17:00', timeZone: 'Asia/Dubai' })).status(), 'revise without reason').toBe(422);
    expect((await e.act(`${c}/complete`, { completedAt: inDays(30), evidence: 'x' })).status(), 'complete in future').toBe(422);
    expect((await e.act(`${c}/complete`, {})).status(), 'complete without evidence').toBe(422);
    await new Promise(r => setTimeout(r, 1500));
    expect((await e.act(`${c}/complete`, { completedAt: new Date().toISOString(), evidence: 'mail' })).status()).toBe(204);
    expect((await e.act(`${c}/revise`, { dueLocal: '2028-04-01T17:00', timeZone: 'Asia/Dubai', reason: 'x' })).status(), 'revise completed').toBe(422);
    expect((await e.act(`${c}/cancel`, { reason: 'x' })).status(), 'cancel completed').toBe(422);
  });

  test('escalations: status path, mandatory resolution and reasons, level bounds', async () => {
    const body = { clientId: fx.clientId, title: `${PREFIX}escalation ${Date.now()}`, direction: 'Received', channel: 'Email', priority: 'High', level: 1, receivedAt: inDays(-0.05), ownerUserId: e.me.id, responseDueAt: inDays(0.1), resolutionDueAt: inDays(0.5) };
    expect((await e.post('/escalations', { ...body, level: 7 })).status()).toBe(422);
    expect((await e.post('/escalations', { ...body, receivedAt: inDays(5), responseDueAt: inDays(6), resolutionDueAt: inDays(7) })).status(), 'received in future').toBe(422);
    expect((await e.post('/escalations', { ...body, responseDueAt: inDays(0.5), resolutionDueAt: inDays(0.1) })).status(), 'resolution before response').toBe(422);
    const id = (await (await e.post('/escalations', body)).json()).id; const x = `/escalations/${id}`;
    expect((await e.act(`${x}/status`, { status: 'Closed', note: 'x' })).status(), 'Open -> Closed').toBe(422);
    expect((await e.act(`${x}/status`, { status: 'Resolved' })).status(), 'resolve without summary').toBe(422);
    expect((await e.act(`${x}/status`, { status: 'Withdrawn' })).status(), 'withdraw without reason').toBe(422);
    expect((await e.act(`${x}/raise-level`, { note: 'a' })).status()).toBe(204);
    expect((await e.act(`${x}/raise-level`, { note: 'b' })).status()).toBe(204);
    expect((await e.act(`${x}/raise-level`, { note: 'c' })).status(), 'above level 3').toBe(422);
  });

  test('attachments: dangerous types refused, read needs access, delete limited to uploader', async () => {
    const id = (await (await e.post('/cases', caseBody(fx.clientId))).json()).id;
    const up = (h: Hub, name: string, body: string) => (h as any).ctx.post('/api/v1/attachments', { headers: (h as any).headers(), multipart: { recordType: 'Case', recordId: String(id), files: { name, mimeType: 'text/plain', buffer: Buffer.from(body) } } });
    expect((await up(e, `${PREFIX}ok.txt`, 'harmless')).status()).toBe(200);
    for (const bad of ['x.exe', 'x.html', 'x.svg', 'x.txt.exe']) expect((await up(e, PREFIX + bad, 'x')).status(), bad).toBe(422);
    const files = await e.json(`/attachments?recordType=Case&recordId=${id}`);
    const download = await e2.get(`/attachments/${files[0].id}/download`);
    expect(download.headers()['content-disposition']).toContain('attachment');
    expect((await e2.delete(`/attachments/${files[0].id}`)).status(), 'other engineer deletes').toBe(403);
    expect((await e.delete(`/attachments/${files[0].id}`)).status()).toBeLessThan(300);
  });

  test('personal notes are private and sanitized', async () => {
    const r = await e.post('/notes/pages', { title: `${PREFIX}note`, contentHtml: '<p>ok</p><script>alert(1)</script><a href="javascript:alert(2)">x</a>' });
    const id = (await r.json()).id;
    const html = (await e.json(`/notes/pages/${id}`)).contentHtml as string;
    expect(html).not.toContain('script'); expect(html).not.toContain('javascript:');
    expect((await m.get(`/notes/pages/${id}`)).status()).toBe(404);
    await e.delete(`/notes/pages/${id}`); await e.delete(`/notes/pages/${id}/permanent`);
  });
});
