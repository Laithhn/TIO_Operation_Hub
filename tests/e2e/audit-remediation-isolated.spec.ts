import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

/*
 * Browser regressions for the 10 Nov 2026 audit findings TIO-BUG-003, 004, 005, 006 and 007, on the actual built SPA.
 * Every HTTP request is answered here from synthetic, fictional fixtures: no application server, database, live record,
 * notification, export or schedule is touched. Non-GET API calls are recorded and must not happen unless a test clicks for one.
 */

const root = resolve(import.meta.dirname, '../../src/TioHub.Api/wwwroot');
const catalog: { key: string }[] = JSON.parse(await readFile(resolve(import.meta.dirname, '../../src/web/src/rightsCatalog.json'), 'utf8'));
const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const ago = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();

const lookup = (listName: string, code: string, label: string, extra: Record<string, unknown> = {}) => ({ listName, code, label, isRetired: false, ...extra });
const reference = {
  lookups: {
    // A type code that differs from its configured label (TIO-BUG-007), a retired type and a renamed status.
    CaseType: [lookup('CaseType', 'Incident', 'Bug', { category: 'Incident' }), lookup('CaseType', 'ServiceRequest', 'Service request', { category: 'ServiceRequest' }),
      lookup('CaseType', 'OldProblem', 'Problem (old)', { category: 'Incident', isRetired: true })],
    CaseStatusLabel: [lookup('CaseStatusLabel', 'New', 'New', { category: 'Initial' }), lookup('CaseStatusLabel', 'Opened', 'Opened', { category: 'Opened' }),
      lookup('CaseStatusLabel', 'InProgress', 'In-progress', { category: 'Active' }), lookup('CaseStatusLabel', 'WaitingForCustomer', 'Waiting for customer', { category: 'WaitingForCustomer' }),
      lookup('CaseStatusLabel', 'Resolved', 'Resolved', { category: 'Resolved' }), lookup('CaseStatusLabel', 'Reopened', 'Re-opened', { category: 'Reopened' }),
      lookup('CaseStatusLabel', 'Closed', 'Closed', { category: 'Closed' }), lookup('CaseStatusLabel', 'VendorFix', 'Vendor fix pending', { category: 'Active' })]
  },
  products: [], teams: [], jiraInstances: [], enums: { Priority: ['Critical', 'High', 'Normal', 'Low'] },
  enumLabels: { CaseStatus: { New: 'New', Opened: 'Opened', InProgress: 'In-progress', WaitingForCustomer: 'Waiting for customer', Resolved: 'Resolved', Reopened: 'Re-opened', Closed: 'Closed', VendorFix: 'Vendor fix pending', Triaged: 'Opened', PendingValidation: 'Pending validation', Cancelled: 'Closed (cancelled)' }, Condition: {} },
  countries: []
};
const me = {
  id: 1, account: 'TEST\\manager', displayName: 'Fictional Manager', timeZone: 'UTC', roles: ['Manager'], roleLabels: ['TIO Manager'], rights: catalog.map(r => r.key),
  scope: { allClients: true, clientCount: 0, projectCount: 0, allInternal: true, internalTeamCount: 0, hasBusinessAccess: true },
  app: { version: 'test', environmentName: 'Testing', supportContact: '', devSignIn: false, authMode: 'Forms', mustChangePassword: false, map: null }
};

const caseRow = (id: number, type: string, statusCode: string, extra: Record<string, unknown> = {}) => ({
  id, ref: `SYN-${id}`, title: `Synthetic ticket ${id}`, type, scope: 'Client', status: 'InProgress', statusCode, priority: 'High', clientId: 1, clientCode: 'FIC', teamName: 'Fictional team',
  ownerName: 'Fictional Owner', ownerDeactivated: false, nextAction: 'Investigate', nextReviewAt: ago(-1), overdue: false, reviewOverdue: false, stale: false, jiraKeys: [],
  responseSla: 'NotApplicable', resolutionSla: 'NotApplicable', createdAt: ago(3), ...extra
});
const CASES = [caseRow(101, 'Incident', 'WaitingForCustomer'), caseRow(102, 'OldProblem', 'InProgress'), caseRow(103, 'SomethingUnknown', 'VendorFix')];

const notice = (id: number, kind: string, title: string, entityType: string, extra: Record<string, unknown> = {}) =>
  ({ id, kind, title, body: null, link: `/contracts/${id}`, createdAt: ago(2), readAt: null, resolvedAt: null, severity: kind.includes('Overdue') ? 'critical' : 'action', entityType, ...extra });
const NOTICES = [
  notice(1, 'PaymentOverdue', 'Payment overdue on contract CT-1001 (146,400.00 AED)', 'Payment'),
  notice(2, 'PaymentOverdue', 'Payment overdue on contract CT-1002 (12,000.00 AED)', 'Payment'),
  notice(3, 'PaymentOverdue', 'Payment overdue on contract CT-1003 (9,500.00 AED)', 'Payment'),
  notice(4, 'PaymentOverdue', 'Payment overdue on contract CT-1004 (1,250.00 AED)', 'Payment'),
  notice(5, 'Renewal', 'Contract CT-2002 for Fictional Very Long Client Name Incorporated Regional Operations has no end date recorded anywhere', 'Contract', { body: 'Support contract with a deliberately long description that must wrap on a phone' }),
  notice(6, 'Overdue', 'Commitment CM-1006 is overdue', 'Commitment', { link: '/commitments/6' })
];

const JOBS = [
  { id: 1, auditId: 'aaaaaaaa-0000-0000-0000-000000000001', report: 'cases', reportName: 'Tickets report', format: 'csv', status: 'Completed', filterSummary: 'Status = All tickets', timeZone: 'UTC', requestedAt: ago(1), completedAt: ago(1), rowCount: 12, fileSize: 2048, fileName: 'tickets.csv', expiresAt: ago(-8), source: 'Reporting Center', canDownload: true, canRetry: false, detailsAvailability: 'Available', user: 'Fictional Manager' },
  { id: 2, auditId: 'aaaaaaaa-0000-0000-0000-000000000002', report: 'cases', reportName: 'Tickets report', format: 'pdf', status: 'Completed', filterSummary: 'Details unavailable', timeZone: 'UTC', requestedAt: ago(5), completedAt: ago(5), rowCount: null, fileSize: null, fileName: null, expiresAt: ago(-9), source: 'Reporting Center', canDownload: false, canRetry: false, detailsAvailability: 'AccessChanged', user: 'Fictional Manager', builder: true },
  { id: 3, auditId: 'aaaaaaaa-0000-0000-0000-000000000003', report: 'cases', reportName: 'Tickets report', format: 'csv', status: 'Completed', filterSummary: 'Details unavailable', timeZone: 'UTC', requestedAt: ago(6), completedAt: ago(6), rowCount: null, fileSize: null, fileName: null, expiresAt: ago(-9), source: 'Reporting Center', canDownload: false, canRetry: false, detailsAvailability: 'LegacyExport', user: 'Fictional Manager' }
];

const CATALOG = [{
  key: 'cases', name: 'Tickets report', category: 'Operations', description: 'Tickets.', icon: 'case', operational: false, builder: true,
  formats: [{ key: 'csv', label: 'CSV', available: true, note: null }],
  filters: [{ key: 'status', label: 'Status', kind: 'Select', advanced: false, options: ['open', 'all', 'done', 'code:New', 'code:Opened', 'code:InProgress', 'code:WaitingForCustomer', 'code:Resolved', 'code:Reopened', 'code:Closed', 'code:VendorFix'], hint: null, rangeEnd: null }],
  columns: [{ key: 'reference', header: 'Reference', definition: 'Reference' }]
}];

async function application(page: Page) {
  const writes: string[] = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://access-control.test') return route.abort();
    const path = url.pathname;
    const method = route.request().method();
    if (path.startsWith('/api/')) {
      if (method !== 'GET') { writes.push(`${method} ${path}`); return route.fulfill({ status: 204 }); }
      const api = path.slice('/api/v1'.length);
      let data: unknown = [];
      if (api === '/me') data = me;
      else if (api === '/reference') data = reference;
      else if (api === '/notifications/unread-count') data = { count: 6 };
      else if (api === '/notifications') data = { items: NOTICES, page: 1, pageSize: 50, totalCount: NOTICES.length, unreadCount: 6, criticalCount: 5, unreadPayments: 4 };
      else if (api === '/cases') data = { items: CASES, page: 1, pageSize: 25, totalCount: CASES.length };
      else if (api === '/cases/quick-views') data = {};
      else if (api === '/reports/exports') data = { items: JOBS, page: 1, pageSize: 25, totalCount: JOBS.length };
      else if (/^\/reports\/exports\/\d+$/.test(api)) {
        const j = JOBS.find(x => x.id === Number(api.split('/').pop()))!;
        const ok = j.detailsAvailability === 'Available';
        data = { export: j, filters: ok ? { status: 'all' } : null, columns: ok ? ['reference', 'title'] : null, columnsAvailable: ok, startedAt: j.requestedAt };
      }
      else if (api === '/reports/catalog') data = CATALOG;
      else if (api === '/reports/summary') data = { recent: [], retentionDays: 14, maxRows: 50000 };
      else if (api === '/users/assignable') data = [];
      return route.fulfill({ json: data });
    }
    const file = resolve(root, path.startsWith('/assets/') ? path.slice(1) : 'index.html');
    if (!file.startsWith(root + sep)) return route.abort();
    return route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] ?? 'application/octet-stream' });
  });
  return { writes };
}

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

/** Every visible notification card: its title must not intersect its badge or action, and the action must be inside the viewport. */
async function checkCards(page: Page, scope: string) {
  const cards = page.locator(`${scope} .ntf`);
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  const width = page.viewportSize()!.width;
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    if (!(await card.isVisible())) continue;
    const title = await card.locator(':scope > .ntf-main > .ntf-title').boundingBox();
    const chip = await card.locator(':scope > .ntf-side > .ntf-chip').boundingBox();
    const act = await card.locator(':scope > .ntf-side > .ntf-act').first().boundingBox();
    expect(title).not.toBeNull();
    for (const other of [chip, act]) if (other) expect(overlaps(title!, other), `card ${i}: title overlaps badge/action at ${width}px`).toBe(false);
    if (act) { expect(act.x).toBeGreaterThanOrEqual(0); expect(act.x + act.width).toBeLessThanOrEqual(width + 1); }
  }
  const widths = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, view: innerWidth }));
  expect(widths.doc, 'no page-wide horizontal overflow').toBeLessThanOrEqual(widths.view + 1);
}

test.describe('TIO-BUG-004 notifications layout', () => {
  for (const [w, h] of [[390, 844], [360, 740], [768, 1024], [1440, 900]] as const) {
    test(`grouped and single notifications do not overlap at ${w}x${h}`, async ({ page }) => {
      const { writes } = await application(page);
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/notifications');
      const group = page.locator('.ntf-page .ntf-group').filter({ hasText: '4 overdue payments' });
      await expect(group).toBeVisible();
      await checkCards(page, '.ntf-page');
      await page.screenshot({ path: `test-results/audit-004-notifications-${w}.png`, fullPage: true });
      // Expanded group: members are laid out the same way, and the toggle is reachable by keyboard.
      const toggle = group.getByRole('button', { name: /View payments \(4\)/ });
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(group.getByRole('button', { name: /Hide \(4\)/ })).toHaveAttribute('aria-expanded', 'true');
      await checkCards(page, '.ntf-page');
      expect(writes, 'layout checks change no notification').toEqual([]);
    });
  }

  test('the bell pop-up keeps title, badge and action apart on a phone', async ({ page }) => {
    const { writes } = await application(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/cases');
    await page.getByRole('button', { name: /^Notifications/ }).click();
    const pop = page.getByRole('dialog', { name: 'Notifications' });
    await expect(pop).toBeVisible();
    await expect(pop.locator('.ntf').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/audit-004-bell-390.png' });
    await checkCards(page, '.ntf-pop');
    expect(writes).toEqual([]);
  });
});

test.describe('TIO-BUG-003 and TIO-BUG-007 tickets table', () => {
  test('control column headers match their cells, and type hints use the configured label', async ({ page }) => {
    const { writes } = await application(page);
    await page.addInitScript(() => localStorage.setItem('vt-columns:cases-v2', JSON.stringify({ type: false })));
    await page.goto('/cases');
    const table = page.getByRole('table', { name: 'Tickets' });
    await expect(table.getByRole('link', { name: 'SYN-101' }).first()).toBeVisible();
    // TIO-BUG-003: first header is the select-all box, second "Details"; the body cells follow the same order.
    const head = table.locator('thead tr').first().locator('th');
    await expect(head.nth(0).getByRole('checkbox', { name: 'Select all rows shown' })).toBeVisible();
    await expect(head.nth(1)).toHaveClass(/col-disclose/);
    await expect(head.nth(1)).toHaveText('Details');
    const first = table.locator('tbody tr.vt-row').first().locator('td');
    await expect(first.nth(0).getByRole('checkbox', { name: /^Select / })).toBeVisible();
    await expect(first.nth(1)).toHaveClass(/col-disclose/);
    expect(await head.count()).toBe(await first.count());

    // TIO-BUG-007: configured label (code Incident → "Bug"), retired label, and the code in words when unknown.
    const hint = (ref: string) => table.locator('span[title]').filter({ has: page.getByRole('link', { name: ref, exact: true }) });
    await expect(hint('SYN-101')).toHaveAttribute('title', 'Type: Bug');
    await expect(hint('SYN-102')).toHaveAttribute('title', 'Type: Problem (old)');
    await expect(hint('SYN-103')).toHaveAttribute('title', 'Type: Something unknown');
    const typeIndex = await head.evaluateAll(ths => ths.findIndex(th => th.textContent?.trim() === 'Type'));
    expect(typeIndex).toBeGreaterThan(1);
    const row = (ref: string) => table.locator('tbody tr.vt-row').filter({ has: page.getByRole('link', { name: ref, exact: true }) }).first().locator('td').nth(typeIndex);
    await expect(row('SYN-101')).toHaveText('Bug');
    await expect(row('SYN-102')).toHaveText('Problem (old)');
    // TIO-BUG-001: the status column shows the configured label for tickets that share the InProgress stage.
    await expect(table.locator('tbody tr.vt-row').filter({ has: page.getByRole('link', { name: 'SYN-101', exact: true }) }).first()).toContainText('Waiting for customer');
    await expect(table.locator('tbody tr.vt-row').filter({ has: page.getByRole('link', { name: 'SYN-103', exact: true }) }).first()).toContainText('Vendor fix pending');
    await page.screenshot({ path: 'test-results/audit-003-007-tickets.png' });
    expect(writes).toEqual([]);
  });

  test('phone layout: no selection column, details disclosure stays first and aligned', async ({ page }) => {
    await application(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/cases');
    const table = page.getByRole('table', { name: 'Tickets' });
    await expect(table.getByRole('link', { name: 'SYN-101' }).first()).toBeVisible();
    await expect(table.getByRole('checkbox')).toHaveCount(0);
    const head = table.locator('thead tr').first().locator('th');
    await expect(head.nth(0)).toHaveClass(/col-disclose/);
    await expect(table.locator('tbody tr.vt-row').first().locator('td').nth(0)).toHaveClass(/col-disclose/);
  });
});

test.describe('TIO-BUG-005 masked export details', () => {
  test('a masked export explains itself and offers navigation only; an available one still downloads', async ({ page }) => {
    const { writes } = await application(page);
    await page.goto('/reporting-center/history');
    const table = page.getByRole('table', { name: 'Export history' });
    await expect(table.getByText('Unavailable: your access changed')).toBeVisible();
    await expect(table.getByText('Unavailable: older export')).toBeVisible();
    await expect(table.getByRole('button', { name: 'Download' })).toHaveCount(1);

    await table.getByRole('row').filter({ hasText: 'Unavailable: your access changed' }).getByRole('button', { name: 'Details' }).click();
    const dialog = page.getByRole('dialog', { name: 'Export details' });
    await expect(dialog.getByRole('note')).toContainText('your access has changed since then');
    await expect(dialog.getByText('Columns').locator('..')).toContainText('Unavailable');
    await expect(dialog).not.toContainText('All, standard order');
    await expect(dialog.getByText('Generation status')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Download' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/audit-005-masked-details.png' });
    await dialog.getByRole('link', { name: 'Configure a new report' }).click();
    await expect(page).toHaveURL(/\/reporting-center\/builder\/cases$/);
    // The builder opens with its usual read-only live preview (a POST that returns rows); nothing is exported, scheduled, retried or sent.
    await page.waitForLoadState('networkidle');
    expect(writes.filter(w => !/^POST \/api\/v1\/reporting\/reports\/cases\/preview$/.test(w)), 'the guidance generates, schedules and sends nothing').toEqual([]);
  });

  test('the available export keeps its columns and download', async ({ page }) => {
    await application(page);
    await page.goto('/reporting-center/history');
    const table = page.getByRole('table', { name: 'Export history' });
    await table.getByRole('row').filter({ hasText: 'Status = All tickets' }).getByRole('button', { name: 'Details' }).click();
    const dialog = page.getByRole('dialog', { name: 'Export details' });
    await expect(dialog.getByRole('note')).toHaveCount(0);
    await expect(dialog.getByText('Columns').locator('..')).toContainText('reference, title');
    await expect(dialog.getByRole('button', { name: 'Download' })).toBeVisible();
  });
});

test.describe('TIO-BUG-006 catalog ticket status choices', () => {
  test('the Status choices are the configured statuses, with aggregates named apart', async ({ page }) => {
    const { writes } = await application(page);
    await page.goto('/reporting-center/library?report=cases');
    const status = page.getByRole('combobox', { name: 'Status' }).first();
    await expect(status).toBeVisible();
    const labels = (await status.locator('option').allTextContents()).map(t => t.trim());
    expect(labels).toEqual(['All open tickets (default)', 'All open tickets', 'All tickets', 'All closed or cancelled tickets', 'New', 'Opened', 'In-progress', 'Waiting for customer', 'Resolved', 'Re-opened', 'Closed', 'Vendor fix pending']);
    expect(new Set(labels.slice(1)).size).toBe(labels.length - 1);           // no two choices read the same
    expect(labels).not.toContain('Open');
    await page.screenshot({ path: 'test-results/audit-006-catalog-status.png' });
    expect(writes).toEqual([]);
  });
});
