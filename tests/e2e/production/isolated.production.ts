import { expect, test, type APIRequestContext } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// This suite is intentionally opt-in. The supplied storageState must belong to an
// approved test account. Never use a development identity header in production.
test.use({ trace: 'off' }); // Authenticated traces can contain session cookies.

test('approved isolated client CRUD and commitment lifecycle', async ({ playwright }, info) => {
  test.skip(process.env.TIO_PROD_WRITE_APPROVED !== 'YES' || !process.env.TIO_PROD_STORAGE_STATE,
    'Needs an explicitly approved account/session and approval for permanent cleanup of this run only.');
  const runId = 'TIO-PROD-TEST-' + new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const registry: Array<Record<string, unknown>> = [];
  const events: Array<Record<string, unknown>> = [];
  const save = async () => writeFile(info.outputPath('isolated-registry.json'), JSON.stringify({ runId, registry, events }, null, 2));
  const api: APIRequestContext = await playwright.request.newContext({
    baseURL: 'https://nb01994.vitronic.de',
    storageState: process.env.TIO_PROD_STORAGE_STATE,
    ignoreHTTPSErrors: false,
  });
  let clientId: number | undefined;
  let commitmentId: number | undefined;
  const read = async (path: string) => {
    const r = await api.get('/api/v1' + path);
    expect(r.ok(), `GET ${path}: ${r.status()}`).toBeTruthy();
    return { data: await r.json(), etag: r.headers().etag };
  };
  const me = (await read('/me')).data;
  expect(me.app.devSignIn).toBe(false);
  expect(me.roles).toContain('TIO Manager');
  const cfg = await api.get('/api/v1/auth/config');
  expect(cfg.ok()).toBeTruthy();
  const csrf = (await api.storageState()).cookies.find(c => c.name === 'XSRF-TOKEN')?.value;
  expect(csrf).toBeTruthy();
  const headers = { 'X-XSRF-TOKEN': decodeURIComponent(csrf!) };
  const changed = async (method: 'post' | 'put' | 'delete', path: string, data?: unknown, etag?: string) => {
    const r = await api[method]('/api/v1' + path, { data, headers: { ...headers, ...(etag ? { 'If-Match': etag } : {}) } });
    events.push({ at: new Date().toISOString(), method, path, status: r.status() });
    await save();
    return r;
  };
  try {
    const client = { code: runId, name: runId + ' client', country: 'United Arab Emirates', status: 'Opportunity', ownerUserId: me.id };
    const created = await changed('post', '/clients', client);
    expect(created.status()).toBe(201);
    clientId = (await created.json()).id;
    registry.push({ entity: 'Client', id: clientId, runId, cleanup: 'pending' }); await save();
    const initial = await read(`/clients/${clientId}`);
    expect(initial.data.code).toBe(runId);
    const duplicate = await changed('post', '/clients', client);
    expect([400, 409]).toContain(duplicate.status());
    const updated = { ...client, name: runId + ' updated client' };
    expect((await changed('put', `/clients/${clientId}`, updated, initial.etag)).status()).toBe(204);
    expect((await read(`/clients/${clientId}`)).data.name).toBe(updated.name);
    expect((await changed('put', `/clients/${clientId}`, client, initial.etag)).status()).toBe(412);

    const due = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 16);
    const promise = await changed('post', '/commitments', { scope: 'Client', clientId, type: 'Other',
      description: runId + ' commitment', ownerUserId: me.id, dueLocal: due, timeZone: 'Etc/UTC' });
    expect(promise.status()).toBe(201);
    commitmentId = (await promise.json()).id;
    registry.push({ entity: 'Commitment', id: commitmentId, clientId, runId, cleanup: 'pending' }); await save();
    const before = await read(`/commitments/${commitmentId}`);
    expect((await changed('post', `/commitments/${commitmentId}/complete`, {
      completedAt: new Date(Date.now() + 86400000).toISOString(), evidence: runId,
    }, before.etag)).status()).toBe(400);
    const revised = new Date(Date.now() + 91 * 86400000).toISOString().slice(0, 16);
    expect((await changed('post', `/commitments/${commitmentId}/revise`, { dueLocal: revised, timeZone: 'Etc/UTC', reason: runId }, before.etag)).status()).toBe(204);
    const current = await read(`/commitments/${commitmentId}`);
    expect(current.data.revisionCount).toBe(1);
    expect((await changed('post', `/commitments/${commitmentId}/complete`, {
      completedAt: new Date().toISOString(), evidence: runId + ' synthetic evidence',
    }, current.etag)).status()).toBe(204);
    expect((await read(`/commitments/${commitmentId}`)).data.status).toBe('Completed');
  } finally {
    // Fail closed: only IDs returned to this process and labels owned by this run.
    // Never sweep by prefix, delete genuine dependencies, or force a failed delete.
    try {
      if (commitmentId) {
        const own = (await read(`/commitments/${commitmentId}`)).data;
        expect(own.description).toBe(runId + ' commitment');
        expect(own.client?.id).toBe(clientId);
        expect((await changed('delete', `/commitments/${commitmentId}`)).status()).toBe(204);
        registry.find(r => r.entity === 'Commitment')!.cleanup = 'deleted';
      }
      if (clientId) {
        expect((await read(`/clients/${clientId}`)).data.code).toBe(runId);
        expect((await read(`/clients/${clientId}/active-work`)).data.total).toBe(0);
        expect((await changed('delete', `/clients/${clientId}`)).status()).toBe(204);
        registry.find(r => r.entity === 'Client')!.cleanup = 'deleted';
        expect((await api.get(`/api/v1/clients/${clientId}`)).status()).toBe(404);
      }
    } finally { await save(); await api.dispose(); }
  }
});
