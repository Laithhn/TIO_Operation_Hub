import { test, expect } from '@playwright/test';
import { Hub, MANAGER, PREFIX, caseBody, fixture, signInAs } from './helpers';

test.describe('Tables, dashboard KPIs and reports', () => {
  let m: Hub; let fx: Awaited<ReturnType<typeof fixture>>;
  test.beforeAll(async () => { m = await Hub.as(MANAGER); fx = await fixture(m); });
  test.beforeEach(async ({ context }) => signInAs(context, MANAGER));

  test('case list: search, status filter, sort and pagination agree with the API', async ({ page }) => {
    const total = (await m.json('/cases?status=open&pageSize=1')).totalCount;
    await page.goto('/cases');
    await expect(page.getByText(new RegExp(`OF ${total}\\b`)).first()).toBeVisible();
    // sort by reference ascending then descending
    const ref = page.locator('thead th').first().getByRole('button');
    await ref.click();
    await expect(page).toHaveURL(/sort=ref/);
    await expect(page.locator('tbody tr td').first()).toHaveText('CS-1001');
    await ref.click();
    await expect(page).toHaveURL(/sort=-ref/);
    await expect(page.locator('tbody tr td').first()).not.toHaveText('CS-1001');
    // filter by priority through the URL-backed filter
    await page.goto('/cases?priority=Critical');
    const critical = (await m.json('/cases?priority=Critical&pageSize=1')).totalCount;
    if (critical > 0) await expect(page.locator('tbody tr')).toHaveCount(Math.min(critical, 15));
    // pagination
    if (total > 15) {
      await page.goto('/cases');
      await page.getByText('Next', { exact: true }).click();
      await expect(page.getByText(new RegExp(`16 - \\d+ OF ${total}`))).toBeVisible();
    }
  });

  test('empty search shows a distinct empty state', async ({ page }) => {
    await page.goto('/cases');
    await page.getByPlaceholder('Search title or ref').fill('zzz-no-such-case-zzz');
    await expect(page.getByText(/No matching records/i)).toBeVisible();
  });

  test('every dashboard KPI equals the size of its drill-down list', async () => {
    const d = await m.json('/dashboard');
    for (const k of [...d.cases, ...d.commitments]) {
      const sep = k.drilldown.includes('?') ? '&' : '?';
      const list = await m.json(`${k.drilldown}${sep}pageSize=1`);
      expect(list.totalCount, k.key).toBe(k.value);
    }
  });

  test('a new overdue synthetic case moves Open, Overdue and Unassigned by exactly one', async () => {
    const before = Object.fromEntries((await m.json('/dashboard')).cases.map((k: any) => [k.key, k.value]));
    const r = await m.post('/cases', caseBody(fx.clientId, { dueLocal: '2026-01-01T10:00', dueTimeZone: 'Asia/Dubai' }));
    const id = (await r.json()).id;
    const after = Object.fromEntries((await m.json('/dashboard')).cases.map((k: any) => [k.key, k.value]));
    expect(after.openCases).toBe(before.openCases + 1);
    expect(after.overdueCases).toBe(before.overdueCases + 1);
    expect(after.unassignedCases).toBe(before.unassignedCases + 1);
    await m.act(`/cases/${id}/cancel`, { reason: 'audit KPI probe' });
    const end = Object.fromEntries((await m.json('/dashboard')).cases.map((k: any) => [k.key, k.value]));
    expect(end.openCases).toBe(before.openCases);
    expect(end.overdueCases).toBe(before.overdueCases);
  });

  test('overview page shows the same open-case figure as the API', async ({ page }) => {
    const open = (await m.json('/dashboard/command-center')).cases.openCount;
    await page.goto('/');
    const card = page.locator('a, div').filter({ hasText: /^Open cases/ }).first();
    await expect(card).toContainText(String(open));
  });

  test('report preview, CSV export and list agree; formulas are neutralised; download is owner-only', async () => {
    const title = `=HYPERLINK("http://example.invalid","${PREFIX}formula ${Date.now()}")`;
    await m.post('/cases', caseBody(fx.clientId, { title }));
    const filters = { clientId: String(fx.clientId), status: 'all' };
    const list = (await m.json(`/cases?clientId=${fx.clientId}&status=all&pageSize=1`)).totalCount;
    const preview = await (await m.post('/reports/cases/preview', { filters, page: 1, pageSize: 5, timeZone: 'Asia/Dubai' })).json();
    expect(preview.total).toBe(list);
    const job = await (await m.post('/reports/cases/exports', { filters, format: 'csv', timeZone: 'Asia/Dubai' })).json();
    expect(job.status).toBe('Completed'); expect(job.rowCount).toBe(list);
    const csv = await (await m.get(`/reports/exports/${job.id}/download`)).text();
    expect(csv).toContain(`"'=HYPERLINK(`);
    const other = await Hub.as('DEV\\engineer');
    expect((await other.get(`/reports/exports/${job.id}/download`)).status()).toBe(404);
    expect((await m.post('/reports/cases/preview', { filters: { bogus: '1' } })).status()).toBe(422);
    expect((await m.post('/reports/cases/exports', { filters: {}, format: 'pdf' })).status()).toBe(422);
  });
});
