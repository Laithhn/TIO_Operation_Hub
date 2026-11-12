import { APIRequestContext, BrowserContext, expect, request } from '@playwright/test';

export const PREFIX = 'TIO_AUDIT_TEST_';
export const MANAGER = 'DEV\\manager';
// 2.60.0 enforces a data scope per client, so the suite uses its own engineers scoped to the synthetic client only.
export const ENGINEER = 'DEV\\tio_audit_test_e1', ENGINEER2 = 'DEV\\tio_audit_test_e2';
// A seeded engineer whose scope does not include the synthetic client (used for isolation tests).
export const OUTSIDER = 'DEV\\engineer2';
export const baseURL = process.env.TIOHUB_BASE_URL ?? 'http://127.0.0.1:5094';

/** A signed-in API client for one development identity (tiohub-dev-user cookie + antiforgery header). */
export class Hub {
  private constructor(private ctx: APIRequestContext, public me: any, private token: string) {}

  static async as(account: string): Promise<Hub> {
    if (account === ENGINEER || account === ENGINEER2) await ensureIdentities();
    return Hub.open(account);
  }

  static async open(account: string): Promise<Hub> {
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

let identitiesReady: Promise<void> | undefined;
/** Creates the two scoped audit engineers once (role Operation Engineer, scope = synthetic client + team 1). */
export function ensureIdentities(): Promise<void> {
  return identitiesReady ??= (async () => {
    const m = await Hub.open(MANAGER);
    const fx = await fixture(m);
    const roles = await m.json('/admin/roles');
    const engineer = (roles.roles ?? roles).find((r: any) => r.name === 'Operation Engineer').id;
    const users = await m.json('/admin/users');
    for (const account of [ENGINEER, ENGINEER2]) {
      const existing = users.find((u: any) => u.accountName.toLowerCase() === account.toLowerCase() && u.isActive);
      if (existing) {
        // Left over from an earlier run: make sure the scope includes the current synthetic client.
        const u = await m.json(`/admin/users/${existing.id}`);
        if (!u.scopes.some((x: any) => x.kind === 'Client' && x.clientId === fx.clientId)) {
          const r = await m.put(`/admin/users/${u.id}`, { accountName: u.accountName, displayName: u.displayName, email: u.email, workingTimeZone: u.workingTimeZone, roleIds: u.roleIds,
            allClients: false, allInternal: false, scopes: [...u.scopes, { kind: 'Client', clientId: fx.clientId }] }, u.version);
          expect(r.ok(), await r.text()).toBeTruthy();
        }
        continue;
      }
      const r = await m.post('/admin/users', { accountName: account, displayName: `${PREFIX}${account.slice(-2)}`, email: `${account.split('\\')[1]}@example.com`, workingTimeZone: 'Asia/Dubai',
        roleIds: [engineer], allClients: false, allInternal: false, scopes: [{ kind: 'Client', clientId: fx.clientId }, { kind: 'InternalTeam', teamId: 1 }] });
      expect(r.status(), await r.text()).toBe(201);
      await m.post('/teams/1/members', { userId: (await r.json()).id, isActive: true });
    }
    await m.dispose();
  })();
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
  if (client) {
    // A111: tickets with an SLA result are kept as evidence. Synthetic ones are cancelled by coordination first, then deleted with the client.
    for (const c of (await m.json(`/cases?clientId=${client.id}&status=open&pageSize=200`)).items)
      if ([c.responseSla, c.resolutionSla].some((x: string) => x === 'Met' || x === 'Breached')) await m.act(`/cases/${c.id}/cancel`, { reason: 'audit cleanup' });
    for (const c of (await m.json(`/cases?clientId=${client.id}&status=all&pageSize=200`)).items)
      if (c.status === 'Closed') { await m.act(`/cases/${c.id}/reopen`, { reason: 'audit cleanup', nextAction: 'n', nextReviewAt: inDays(1) }); await m.act(`/cases/${c.id}/cancel`, { reason: 'audit cleanup' }); }
    await deleteAll(m, `/dependents/clients/${client.id}`);
  }
  for (const u of (await m.json('/admin/users')).filter((u: any) => /tio_audit_test_(e1|e2|noedit)$/i.test(u.accountName))) {
    await m.delete(`/teams/1/members/${(await m.json('/teams/1')).members.find((x: any) => x.userId === u.id)?.id ?? 0}`);
    await (m as any).ctx.delete(`/api/v1/admin/users/${u.id}`, { data: { reason: 'audit cleanup' }, headers: { ...(m as any).headers(await m.etag(`/admin/users/${u.id}`)) } });
  }
}

/** A111: delete-with-everything states the number of related records the preview listed. */
export async function deleteAll(m: Hub, path: string) {
  const preview = await m.get(path);
  const total = preview.ok() ? (await preview.json()).total : undefined;
  return m.delete(total === undefined ? path : `${path}?expected=${total}`);
}

export async function signInAs(context: BrowserContext, account: string) {
  await context.addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url: baseURL }]);
  // Map tiles are the only external resource; never contact the public tile server from tests.
  await context.route(/tile\.openstreetmap\.org/, r => r.abort());
}
