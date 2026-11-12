import { APIRequestContext, BrowserContext, expect, request } from '@playwright/test';

export const PREFIX = 'TIO_AUDIT_TEST_';
export const MANAGER = 'DEV\\manager', ENGINEER = 'DEV\\engineer', ENGINEER2 = 'DEV\\engineer2';
export const baseURL = process.env.TIOHUB_BASE_URL ?? 'http://127.0.0.1:5094';

/** A signed-in API client for one development identity (tiohub-dev-user cookie + antiforgery header). */
export class Hub {
  private constructor(private ctx: APIRequestContext, public me: any, private token: string) {}

  static async as(account: string): Promise<Hub> {
    const url = new URL(baseURL);
    const ctx = await request.newContext({ baseURL, storageState: { origins: [], cookies: [{ name: 'tiohub-dev-user', value: encodeURIComponent(account),
      domain: url.hostname, path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Strict' }] } });
    const res = await ctx.get('/api/v1/me');
    const me = res.ok() ? await res.json() : null;
    // The antiforgery cookie pair is kept in the context's cookie jar; the readable XSRF-TOKEN goes into the request header.
    const token = decodeURIComponent((await ctx.storageState()).cookies.find(c => c.name === 'XSRF-TOKEN')?.value ?? '');
    return new Hub(ctx, me, token);
  }

  private headers(etag?: string) {
    const h: Record<string, string> = { 'X-XSRF-TOKEN': this.token };
    if (etag) h['If-Match'] = `"${etag}"`;
    return h;
  }
  get(path: string) { return this.ctx.get('/api/v1' + path); }
  post(path: string, data: unknown = {}, etag?: string) { return this.ctx.post('/api/v1' + path, { data, headers: this.headers(etag) }); }
  put(path: string, data: unknown, etag?: string) { return this.ctx.put('/api/v1' + path, { data, headers: this.headers(etag) }); }
  delete(path: string, etag?: string) { return this.ctx.delete('/api/v1' + path, { headers: this.headers(etag) }); }
  async etag(path: string) { return ((await this.get(path)).headers()['etag'] ?? '').replace('W/', '').replace(/"/g, ''); }
  /** POST/PUT to /{collection}/{id}/... with the record's current version. */
  async act(path: string, data: unknown = {}, method: 'post' | 'put' = 'post') {
    const record = path.split('/').slice(0, 3).join('/');
    return this[method](path, data, await this.etag(record));
  }
  async json(path: string) { const r = await this.get(path); expect(r.ok(), `GET ${path} -> ${r.status()}`).toBeTruthy(); return r.json(); }
  dispose() { return this.ctx.dispose(); }
}

export const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

export function caseBody(clientId: number, over: Record<string, unknown> = {}) {
  return { title: `${PREFIX}case ${Date.now()}-${Math.floor(Math.random() * 1e4)}`, type: 'Incident', scope: 'Client', clientId, responsibleTeamId: 1,
    impactSummary: 'Synthetic audit record', priority: 'High', nextAction: 'Investigate', nextReviewAt: inDays(1), ...over };
}

/** The synthetic audit client, project and SLA contract; created once and reused. */
export async function fixture(m: Hub) {
  const code = `${PREFIX}REG`;
  let client = (await m.json(`/clients?q=${code}&pageSize=50`)).items.find((c: any) => c.code === code);
  if (!client) {
    const r = await m.post('/clients', { code, name: `${PREFIX}Regression client`, country: 'Germany', status: 'Active', ownerUserId: m.me.id });
    expect(r.status(), await r.text()).toBe(201);
    client = await r.json();
  }
  let project = (await m.json(`/projects?clientId=${client.id}&pageSize=50`)).items.find((p: any) => p.code === 'TIOAUDIT-REG');
  if (!project) {
    const r = await m.post('/projects', { clientId: client.id, code: 'TIOAUDIT-REG', name: `${PREFIX}Regression project`, ownerUserId: m.me.id, status: 'Active', serviceStart: '2026-01-01', serviceEnd: '2028-12-31' });
    expect(r.status(), await r.text()).toBe(201);
    project = await r.json();
  }
  let contract = (await m.json(`/contracts?clientId=${client.id}&pageSize=50`)).items.find((k: any) => k.title === `${PREFIX}Regression SLA`);
  if (!contract) {
    const r = await m.post('/contracts', { projectId: project.id, title: `${PREFIX}Regression SLA`, contractReference: 'TIOAUDIT-REG-K', type: 'SlaSupport', status: 'Active', ownerUserId: m.me.id,
      startDate: '2026-01-01', endDate: '2028-12-31', renewalTerms: 'FixedTerm', supportModel: 'Remote', support24x7: true, supportTimeZone: 'Asia/Dubai',
      slaTargets: [{ priority: 'Critical', responseMinutes: 1, resolutionMinutes: 2, basis: 'CalendarHours' }, { priority: 'High', responseMinutes: 60, resolutionMinutes: 240, basis: 'CalendarHours' }, { priority: 'Low', responseMinutes: 6000, resolutionMinutes: 60000, basis: 'CalendarHours' }] });
    expect(r.status(), await r.text()).toBe(201);
    contract = await r.json();
  }
  return { clientId: client.id as number, projectId: project.id as number, contractId: contract.id as number };
}

/** Removes every synthetic record of the regression client (cases, commitments, escalations, contract, project, client). */
export async function purgeFixture(m: Hub) {
  const client = (await m.json(`/clients?q=${PREFIX}REG&pageSize=50`)).items.find((c: any) => c.code === `${PREFIX}REG`);
  if (client) await m.delete(`/dependents/clients/${client.id}`);
}

export async function signInAs(context: BrowserContext, account: string) {
  await context.addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url: baseURL }]);
  // Map tiles are the only external resource; never contact the public tile server from tests.
  await context.route(/tile\.openstreetmap\.org/, r => r.abort());
}
