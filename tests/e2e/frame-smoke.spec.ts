import { expect, test, type Page } from '@playwright/test';

// VtWebGuiFramework frame (2.34): every page renders inside the framework frame — header with primary links,
// first sidebar (except the full-width Notes workspace), the main toolbar slot with the page title, and the footer —
// and opens without an error state. Detail pages use the first record the signed-in manager can see.

/** Calls the API from the signed-in page (same cookies as the app). */
async function getJson(page: Page, path: string): Promise<unknown> {
  return page.evaluate(async p => {
    const r = await fetch('/api/v1' + p, { headers: { Accept: 'application/json' } });
    return r.ok ? r.json() : null;
  }, path);
}
type Rec = { id: number } & Record<string, unknown>;
const firstOf = (j: unknown): Rec | undefined => (Array.isArray(j) ? j : ((j as { items?: Rec[] } | null)?.items ?? []))[0] as Rec | undefined;

const STATIC = [
  '/', '/map', '/actions', '/notifications', '/data-quality', '/reporting-center', '/reports',
  '/reporting-center/library', '/reporting-center/builder/cases', '/reporting-center/my-reports', '/reporting-center/schedules', '/reporting-center/history', '/reporting-center/templates',
  '/clients', '/clients/new', '/projects', '/contracts', '/contracts/new', '/environments', '/environments/new', '/versions', '/assets', '/firewall-rules',
  '/products', '/products/new', '/cases', '/cases/new', '/commitments', '/commitments/new', '/escalations', '/escalations/new',
  '/teams', '/handovers', '/reassignment',
  '/admin/users', '/admin/roles', '/admin/rights', '/admin/config', '/admin/config/environment-types', '/admin/policies', '/admin/jira',
  '/admin/settings', '/admin/audit', '/admin/archived'
];

async function expectFramed(page: Page, path: string, sidebarMarker = true) {
  await page.goto(path);
  await expect(page.locator('header.hdr'), path).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).locator('a[aria-current="page"]'), path).toHaveCount(1);
  await expect(page.locator('footer.status'), path).toContainText('TIO Operations Hub');
  await expect(page.locator('aside.side'), `${path}: first sidebar`).toBeVisible();
  if (sidebarMarker) await expect(page.locator('aside.side [class*="marker__marker"]'), `${path}: sidebar marker`).toHaveCount(1);
  await expect(page.locator('#viMainToolbar h1'), `${path}: main toolbar title`).toBeVisible();
  await expect(page.locator('.state-msg.error'), `${path}: error state`).toHaveCount(0);
  await expect(page.getByText('Page not found'), path).toHaveCount(0);
}

test.describe('VtWebGuiFramework frame on every page', () => {
  test('list, form, dashboard and administration pages render in the frame', async ({ page }) => {
    test.setTimeout(240_000);
    for (const path of STATIC) await expectFramed(page, path);
  });

  test('detail pages render in the frame', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/');
    const paths: string[] = [];
    const add = (prefix: string, r?: Rec) => { if (r?.id) paths.push(`${prefix}/${r.id}`); };
    const client = firstOf(await getJson(page, '/clients'));
    add('/clients', client);
    if (client) {
      paths.push(`/clients/${client.id}/edit`);
      const c = await getJson(page, `/clients/${client.id}`) as { regions?: Rec[] } | null;
      add('/regions', c?.regions?.[0]);
    }
    add('/projects', firstOf(await getJson(page, '/projects')));
    add('/contracts', firstOf(await getJson(page, '/contracts')));
    const env = firstOf(await getJson(page, '/environments'));
    add('/environments', env);
    add('/assets', firstOf(await getJson(page, '/assets')));
    const product = firstOf(await getJson(page, '/products'));
    add('/products', product);
    if (product) {
      const p = await getJson(page, `/products/${product.id}`) as { microservices?: Rec[] } | null;
      add('/microservices', p?.microservices?.[0]);
    }
    add('/cases', firstOf(await getJson(page, '/cases?status=all')));
    add('/commitments', firstOf(await getJson(page, '/commitments?status=all')));
    add('/escalations', firstOf(await getJson(page, '/escalations?status=all')));
    add('/teams', firstOf(await getJson(page, '/teams')));
    add('/handovers', firstOf(await getJson(page, '/handovers?status=all')));
    expect(paths.length).toBeGreaterThanOrEqual(10);
    // Detail pages without their own sidebar entry (regions, microservices, ...) show the sidebar without an active marker.
    for (const path of paths) await expectFramed(page, path, false);
  });

  test('the Notes workspace uses the full width of the frame', async ({ page }) => {
    await page.goto('/notes');
    await expect(page.locator('header.hdr')).toBeVisible();
    await expect(page.locator('aside.side')).toHaveCount(0);
    await expect(page.locator('.hub-app.bare')).toHaveCount(1);
  });

  test('below 900 px the first sidebar is an off-canvas drawer', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/cases');
    const side = page.locator('aside.side');
    await expect.poll(async () => (await side.boundingBox())?.x ?? 0).toBeLessThan(0);
    await page.getByRole('button', { name: 'Menu, current section Cases' }).click();
    await expect.poll(async () => (await side.boundingBox())?.x ?? -1).toBe(0);
    await expect(side.getByRole('link', { name: 'All cases' })).toBeVisible();
  });
});
