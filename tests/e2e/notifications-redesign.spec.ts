import { expect, test, type Page, type Route } from '@playwright/test';

/*
 * A72: notification pop-up and center — severity sections, grouping, tabs, counters, actions, empty and error states.
 * The e2e server runs without the background scan (Notifications__ScanMinutes=0), so the pop-up's list is answered from a fixed,
 * fictional list here; read/resolve rules are covered by the .NET tests (NotificationLifecycleTests). The center page uses the real API.
 */

async function signIn(page: Page, account = 'DEV\\manager') {
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url: test.info().project.use.baseURL as string }]);
}

const ago = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();
const ITEMS = [
  { id: 901, kind: 'PaymentOverdue', title: 'Payment overdue on contract CT-1002 (146,400.00 AED)', body: '30 % on acceptance', link: '/contracts/2', createdAt: ago(6), readAt: null, resolvedAt: null, severity: 'critical', entityType: 'Payment' },
  { id: 902, kind: 'Overdue', title: 'Commitment CM-1006 is overdue', body: 'Root cause report', link: '/commitments/6', createdAt: ago(6), readAt: null, resolvedAt: null, severity: 'critical', entityType: 'Commitment' },
  { id: 903, kind: 'Overdue', title: 'Commitment CM-1004 is overdue', body: 'Customer update', link: '/commitments/4', createdAt: ago(7), readAt: ago(1), resolvedAt: null, severity: 'critical', entityType: 'Commitment' },
  { id: 904, kind: 'Renewal', title: 'Contract CT-1004 has no end date', body: 'Support contract', link: '/contracts/4', createdAt: ago(2), readAt: null, resolvedAt: null, severity: 'action', entityType: 'Contract' },
  { id: 905, kind: 'Assigned', title: 'Client TAK: you are now the project manager', body: null, link: '/clients/1', createdAt: ago(6), readAt: null, resolvedAt: null, severity: 'info', entityType: 'Client' }
];

/** Answers the pop-up's list and counter requests; records read requests. */
async function stub(page: Page, calls: string[], opts: { fail?: boolean } = {}) {
  await page.route(/\/api\/v1\/notifications(\/read-all|\?.*)?$/, async (r: Route) => {
    const url = new URL(r.request().url());
    calls.push(`${r.request().method()} ${url.pathname}${url.search}`);
    if (url.pathname.endsWith('/notifications/read-all')) return r.fulfill({ status: 204 });
    if (opts.fail) return r.fulfill({ status: 500, contentType: 'application/json', body: '{"title":"Server error"}' });
    const p = url.searchParams;
    let items = ITEMS;
    if (p.get('unread') === 'true') items = items.filter(i => !i.readAt);
    if (p.get('severity') === 'critical') items = [];   // the Critical tab shows its empty state in this run
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items, page: 1, pageSize: 50, totalCount: items.length, unreadCount: 4, criticalCount: 3, unreadPayments: 1 }) });
  });
  await page.route(/\/api\/v1\/notifications\/(unread-count|\d+\/read|read)$/, r => {
    calls.push(`${r.request().method()} ${new URL(r.request().url()).pathname}`);
    return r.request().url().endsWith('unread-count') ? r.fulfill({ status: 200, contentType: 'application/json', body: '{"count":4}' }) : r.fulfill({ status: 204 });
  });
}

const openBell = async (page: Page) => {
  await page.getByRole('button', { name: /^Notifications/ }).click();
  const pop = page.getByRole('dialog', { name: 'Notifications' });
  await expect(pop).toBeVisible();
  return pop;
};

test.describe('A72 notification pop-up', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('header, tabs with counts, severity sections in order, grouped commitments and readable times', async ({ page }) => {
    const calls: string[] = [];
    await stub(page, calls);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Notifications, 4 unread' })).toBeVisible();
    const pop = await openBell(page);
    await expect(pop.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(pop.getByLabel('4 unread')).toHaveText('4');
    await expect(pop.getByRole('tab')).toHaveText(['All', 'Unread (4)', 'Critical (3)']);
    await expect(pop.locator('.ntf-sec-head')).toHaveText([/Critical \/ overdue/i, /Action required/i, /Informational/i]);
    // Sorted by severity: the payment first; the two overdue commitments as one group card.
    const critical = pop.getByRole('region', { name: 'Critical / overdue' });
    await expect(critical.locator('.ntf-title').first()).toHaveText('2 overdue commitments');
    await expect(critical).toContainText('CM-1006 and CM-1004 require attention.');
    await expect(critical.getByText('Payment overdue on contract CT-1002 (146,400.00 AED)')).toBeVisible();
    await expect(critical.locator('.ntf-chip').first()).toHaveText('Overdue');
    await expect(critical.getByText('6 days ago').first()).toBeVisible();
    await expect(critical.locator('time').first()).toHaveAttribute('title', /\d/);
    // Expanding the group shows each commitment with its own state and action.
    await critical.getByRole('button', { name: 'View commitments (2)' }).click();
    await expect(critical.getByRole('button', { name: 'View commitment: Commitment CM-1006 is overdue' })).toBeVisible();
    await expect(critical.locator('.ntf.nested.unread')).toHaveCount(1);
    // Action required and informational cards with their actions.
    await expect(pop.getByRole('button', { name: 'Review contract: Contract CT-1004 has no end date' })).toBeVisible();
    await expect(pop.getByRole('button', { name: 'View client: Client TAK: you are now the project manager' })).toBeVisible();
    await pop.screenshot({ path: 'test-results/visual-notifications-popup.png' });
    const box = await pop.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(400);
    expect(box!.width).toBeLessThanOrEqual(480);
  });

  test('tabs filter without reloading, work with the keyboard and show empty states; mark all as read', async ({ page }) => {
    const calls: string[] = [];
    await stub(page, calls);
    await page.goto('/');
    const pop = await openBell(page);
    await expect(pop.getByRole('tab', { name: 'All' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(pop.getByRole('tab', { name: 'Unread (4)' })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => calls.some(c => c.includes('unread=true'))).toBe(true);
    await expect(pop.getByText('Commitment CM-1004 is overdue')).toHaveCount(0);   // read: not in Unread
    await page.keyboard.press('End');
    await expect(pop.getByRole('tab', { name: 'Critical (3)' })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => calls.some(c => c.includes('severity=critical') && c.includes('state=open'))).toBe(true);
    await expect(pop.getByText('Nothing critical or overdue right now.')).toBeVisible();
    await pop.getByRole('button', { name: 'Mark all as read' }).click();
    await expect.poll(() => calls.includes('POST /api/v1/notifications/read-all')).toBe(true);
    await page.keyboard.press('Escape');
    await expect(pop).toBeHidden();
    await expect(page.getByRole('button', { name: /^Notifications/ })).toBeFocused();
  });

  test('an action marks the notice as read and opens its record', async ({ page }) => {
    const calls: string[] = [];
    await stub(page, calls);
    await page.goto('/');
    const pop = await openBell(page);
    await pop.getByRole('button', { name: 'Review payment: Payment overdue on contract CT-1002 (146,400.00 AED)' }).click();
    await expect(page).toHaveURL(/\/contracts\/2$/);
    expect(calls).toContain('POST /api/v1/notifications/901/read');
  });

  test('a failed load says so and offers to try again', async ({ page }) => {
    await stub(page, [], { fail: true });
    await page.goto('/');
    const pop = await openBell(page);
    await expect(pop.getByRole('alert')).toContainText('Notifications could not be loaded.');
    await expect(pop.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('on a phone the pop-up fits the screen', async ({ page }) => {
    await stub(page, []);
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const bell = page.getByRole('button', { name: /^Notifications/ });
    if (await bell.isVisible()) {
      await bell.click();
      const box = await page.getByRole('dialog', { name: 'Notifications' }).boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
  });
});

test.describe('A72 notifications center', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('tabs, importance and state filters and search use the real API', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Critical/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Payments/ })).toBeVisible();
    const req = page.waitForRequest(r => r.url().includes('/api/v1/notifications?') && r.url().includes('severity=action'));
    await page.getByLabel('Filter by importance').selectOption('action');
    expect((await (await req).response())!.ok()).toBeTruthy();
    const res = page.waitForResponse(r => r.url().includes('/api/v1/notifications?') && r.url().includes('status') === false && r.url().includes('state=resolved'));
    await page.getByLabel('Filter by business state').selectOption('resolved');
    expect((await res).ok()).toBeTruthy();
    const search = page.waitForRequest(r => r.url().includes('/api/v1/notifications?') && r.url().includes('q=zz-no-such-notice'));
    await page.getByLabel('Search notifications').fill('zz-no-such-notice');
    await search;
    await expect(page.getByText('No notifications match these filters.')).toBeVisible();
    await expect(page).toHaveURL(/severity=action/);
    await page.getByRole('tab', { name: /^Critical/ }).click();
    await expect(page.getByLabel('Filter by importance')).toHaveCount(0);
  });
});
