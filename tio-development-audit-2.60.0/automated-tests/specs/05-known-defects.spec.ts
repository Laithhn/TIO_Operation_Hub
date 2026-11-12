import { test, expect } from '@playwright/test';
import { Hub, MANAGER, ENGINEER, ENGINEER2, PREFIX, caseBody, fixture, inDays } from './helpers';

// Each test states the EXPECTED behaviour for a confirmed audit finding. They were written against 2.29.0 and are re-run here on build 2.60.0 (commit fa71ace)
// and are the regression tests to turn green when the finding is fixed. Do not weaken them to make them pass.
test.describe('@defect Confirmed audit findings (expected behaviour)', () => {
  let m: Hub, e: Hub, e2: Hub; let fx: Awaited<ReturnType<typeof fixture>>;
  test.beforeAll(async () => { m = await Hub.as(MANAGER); e = await Hub.as(ENGINEER); e2 = await Hub.as(ENGINEER2); fx = await fixture(m); });

  async function closedCase() {
    const id = (await (await m.post('/cases', caseBody(fx.clientId, { ownerUserId: e.me.id }))).json()).id; const c = `/cases/${id}`;
    await m.act(`${c}/triage`, { responsibleTeamId: 1, impactSummary: 'i', priority: 'High', nextAction: 'n', nextReviewAt: inDays(1) });
    await e.act(`${c}/start`);
    await e.act(`${c}/close`, { outcome: 'done', validationEvidence: 'mail' });
    return id;
  }

  async function breachedCase() {
    const id = (await (await m.post('/cases', caseBody(fx.clientId, { priority: 'Critical', contractId: fx.contractId, ownerUserId: e.me.id }))).json()).id;
    await expect.poll(async () => (await m.json(`/cases/${id}`)).sla.response.status, { timeout: 90_000, intervals: [5_000] }).toBe('Breached');
    return id;
  }

  test('TIO-DEV-AUDIT-001 a priority change does not erase a recorded SLA breach', async () => {
    test.setTimeout(150_000);
    const id = await breachedCase(); const c = await m.json(`/cases/${id}`);
    await m.act(`/cases/${id}`, { title: c.title, type: c.type, responsibleTeamId: 1, impactSummary: c.impactSummary, priority: 'Low', nextAction: 'n', nextReviewAt: inDays(1), changeNote: 'audit' }, 'put');
    expect((await m.json(`/cases/${id}`)).sla.response.status).toBe('Breached');
  });

  test('TIO-DEV-AUDIT-002 an engineer cannot remove the contract from a breached case', async () => {
    test.setTimeout(150_000);
    const id = await breachedCase();
    const r = await e.act(`/cases/${id}/contract`, { contractId: null, reason: 'wrong contract' });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect((await m.json(`/cases/${id}`)).sla.response.status).toBe('Breached');
  });

  test('TIO-DEV-AUDIT-003 a first response cannot be back-dated after the deadline has passed without manager approval', async () => {
    test.setTimeout(150_000);
    const id = await breachedCase(); const created = (await m.json(`/cases/${id}`)).createdAt;
    const r = await e.act(`/cases/${id}/first-response`, { respondedAt: created, channel: 'Verbal' });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('TIO-DEV-AUDIT-004 a closed case cannot be edited', async () => {
    const id = await closedCase(); const c = await m.json(`/cases/${id}`);
    const r = await e.act(`/cases/${id}`, { title: c.title + ' edited', type: c.type, responsibleTeamId: 1, impactSummary: 'changed', priority: c.priority, nextAction: 'n', nextReviewAt: inDays(1) }, 'put');
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('TIO-DEV-AUDIT-004 the due date of a closed case cannot be changed', async () => {
    const id = await closedCase();
    const r = await e.act(`/cases/${id}/due`, { dueLocal: '2030-01-01T10:00', dueTimeZone: 'Asia/Dubai', reason: 'after close' });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('TIO-DEV-AUDIT-005 an owner cannot turn a missed commitment into "Completed on time" by revising the deadline alone', async () => {
    const body = { scope: 'Client', clientId: fx.clientId, responsibleTeamId: 1, description: `${PREFIX}late commitment ${Date.now()}`, type: 'Delivery', ownerUserId: e.me.id, dueLocal: '2026-11-01T10:00', timeZone: 'Asia/Dubai', nextReviewAt: inDays(5) };
    const id = (await (await e.post('/commitments', body)).json()).id;
    await e.act(`/commitments/${id}/revise`, { dueLocal: '2030-06-01T10:00', timeZone: 'Asia/Dubai', reason: 'moved' });
    await new Promise(r => setTimeout(r, 1500));
    await e.act(`/commitments/${id}/complete`, { completedAt: new Date().toISOString(), evidence: 'done' });
    expect((await m.json(`/commitments/${id}`)).timeliness).not.toBe('Completed on time');
  });

  test('TIO-DEV-AUDIT-006 identical case submissions in quick succession create one record', async () => {
    const body = caseBody(fx.clientId, { title: `${PREFIX}duplicate ${Date.now()}` });
    const res = await Promise.all([e.post('/cases', body), e.post('/cases', body), e.post('/cases', body)]);
    expect(res.filter(r => r.status() === 201).length).toBe(1);
  });

  test('TIO-DEV-AUDIT-007 a due date in the past is refused when a case or commitment is created', async () => {
    expect((await e.post('/cases', caseBody(fx.clientId, { dueLocal: '2020-01-01T10:00', dueTimeZone: 'Asia/Dubai' }))).status()).toBe(422);
    expect((await e.post('/commitments', { scope: 'Client', clientId: fx.clientId, responsibleTeamId: 1, description: `${PREFIX}past`, type: 'Delivery', ownerUserId: e.me.id, dueLocal: '2020-01-01T10:00', timeZone: 'Asia/Dubai', nextReviewAt: inDays(5) })).status()).toBe(422);
  });

  test('TIO-DEV-AUDIT-008 a completed commitment cannot be edited', async () => {
    const body = { scope: 'Client', clientId: fx.clientId, responsibleTeamId: 1, description: `${PREFIX}done ${Date.now()}`, type: 'Delivery', ownerUserId: e.me.id, dueLocal: '2030-03-01T17:00', timeZone: 'Asia/Dubai', nextReviewAt: inDays(5) };
    const id = (await (await e.post('/commitments', body)).json()).id;
    await new Promise(r => setTimeout(r, 1500));
    await e.act(`/commitments/${id}/complete`, { completedAt: new Date().toISOString(), evidence: 'mail' });
    const r = await e.act(`/commitments/${id}`, { description: body.description + ' edited', type: 'Delivery', ownerUserId: e.me.id, nextReviewAt: inDays(5) }, 'put');
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('TIO-DEV-AUDIT-009 a contract reference is unique within a client', async () => {
    const body = { projectId: fx.projectId, title: `${PREFIX}dup ref`, contractReference: 'TIOAUDIT-REG-K', type: 'SlaSupport', status: 'Draft', ownerUserId: m.me.id };
    expect((await e.post('/contracts', body)).status()).toBeGreaterThanOrEqual(400);
  });

  test('TIO-DEV-AUDIT-010 another engineer cannot cancel a commitment they do not own', async () => {
    const body = { scope: 'Client', clientId: fx.clientId, responsibleTeamId: 1, description: `${PREFIX}owned ${Date.now()}`, type: 'Delivery', ownerUserId: e.me.id, dueLocal: '2030-03-01T17:00', timeZone: 'Asia/Dubai', nextReviewAt: inDays(5) };
    const id = (await (await e.post('/commitments', body)).json()).id;
    expect((await e2.act(`/commitments/${id}/cancel`, { reason: 'not mine' })).status()).toBe(403);
  });

  test('TIO-DEV-AUDIT-011 deleting a client with everything needs the record version', async () => {
    const r = await m.post('/clients', { code: 'TIOAUDITDEL', name: `${PREFIX}delete probe`, country: 'Germany', status: 'Opportunity', ownerUserId: m.me.id });
    const id = (await r.json()).id;
    const del = await m.delete(`/dependents/clients/${id}`);   // no reviewed count
    const { deleteAll } = await import('./helpers');
    await deleteAll(m, `/dependents/clients/${id}`);
    expect([412, 428]).toContain(del.status());
  });

  test('TIO-DEV-AUDIT-012 escalation targets cannot be earlier than the time it was received', async () => {
    const r = await e.post('/escalations', { clientId: fx.clientId, title: `${PREFIX}targets in past`, direction: 'Received', channel: 'Email', priority: 'High', level: 1, receivedAt: inDays(-0.05), ownerUserId: e.me.id, responseDueAt: inDays(-30), resolutionDueAt: inDays(-29) });
    expect(r.status()).toBe(422);
  });

  test('TIO-DEV-AUDIT-013 an invalid enum value is reported against its field', async () => {
    const r = await e.post('/escalations', { clientId: fx.clientId, title: `${PREFIX}x`, direction: 'ReceivedFromClient', channel: 'Email', ownerUserId: e.me.id });
    expect(r.status()).toBe(422);
    expect(JSON.stringify(await r.json())).toContain('direction');
  });
});
