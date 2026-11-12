import { test, expect, requirePageContent, skipIfPolicyBlocked } from './fixtures.mjs';
import { safeDetailPath } from './safety-policy.mjs';

test.beforeEach(() => {
  test.skip(!process.env.TIO_AUDIT_STORAGE_STATE, 'Not executed: approved authenticated session was not supplied.');
});

test('Daily review: own dashboard, action queue, existing detail, back and refresh', async ({ page, audit, baseURL }, info) => {
  await page.goto('/my-dashboard');
  await requirePageContent(page, audit);
  await page.goto('/actions');
  await requirePageContent(page, audit);
  const links = await page.locator('main a[href]').evaluateAll(items => items.map(a => a.getAttribute('href')));
  const detail = links.map(href => safeDetailPath(href, baseURL)).find(Boolean);
  test.skip(!detail, 'No accessible detail link in the current action queue; lifecycle coverage requires approved test data.');
  // Only follow an actual rendered read-only link; never manufacture or enumerate a record ID.
  await page.locator(`main a[href="${detail}"]`).first().click();
  await requirePageContent(page, audit);
  expect(new URL(page.url()).pathname).toBe(detail);
  await page.reload();
  await requirePageContent(page, audit);
  expect(new URL(page.url()).pathname).toBe(detail);
  await page.goBack();
  await requirePageContent(page, audit);
  expect(new URL(page.url()).pathname).toBe('/actions');
  await info.attach('journey-scope', { body: 'Read-only daily review only. No assignments, status transitions, SLA calculation verification or record changes were attempted.', contentType: 'text/plain' });
});

test('Management review: reporting overview, library, history; no export or schedule', async ({ page, audit }) => {
  for (const route of ['/reporting-center', '/reporting-center/library', '/reporting-center/history']) {
    await page.goto(route);
    await requirePageContent(page, audit);
    expect(new URL(page.url()).pathname).toBe(route);
    await expect(page.getByRole('heading', { level: 1, name: 'Reporting Center', exact: true })).toBeVisible();
  }
  skipIfPolicyBlocked(audit);
});

test('Mobile menu opens, exposes navigation and restores keyboard focus', async ({ page, audit }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cases');
  await requirePageContent(page, audit);
  const menu = page.getByRole('button', { name: /^Menu(?:,|$)/ });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('navigation', { name: 'All sections', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});
