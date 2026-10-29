import { expect, test, type Page } from '@playwright/test';

/* A73: Client Map redesign — dark map-first page: toolbar with layers and filters, country explorer, map, country details. */

async function signIn(page: Page, account = 'DEV\\manager') {
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url: test.info().project.use.baseURL as string }]);
}
const explorer = (page: Page) => page.getByRole('complementary', { name: 'Country explorer' });
const details = (page: Page) => page.getByRole('complementary', { name: 'Country details' });
const layers = (page: Page) => page.getByRole('radiogroup', { name: 'Map layer' });

async function open(page: Page, url = '/map') {
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: 'Client Map' })).toBeVisible();
  await expect(page.getByRole('group', { name: /OpenStreetMap of clients by country/ })).toBeVisible({ timeout: 15000 });
}

test.describe('A73 Client Map', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('default view: full width, dark toolbar with totals, Clients layer, countries listed, select-a-country state', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('complementary', { name: 'Section menu' })).toHaveCount(0);   // full width
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();               // the hub header stays
    await expect(page.getByText(/\d+ clients? in \d+ countr(y|ies) · as of/)).toBeVisible();
    await expect(layers(page).getByRole('radio', { name: /Clients/ })).toHaveAttribute('aria-checked', 'true');
    await expect(layers(page).getByRole('radio')).toHaveCount(5);
    const bg = await page.locator('.cmap').evaluate(e => getComputedStyle(e).backgroundColor);
    expect(bg).toBe('rgb(6, 21, 38)');
    const countries = explorer(page).getByRole('list', { name: 'Countries' }).getByRole('button');
    expect(await countries.count()).toBeGreaterThan(0);
    await expect(details(page).getByRole('heading', { name: 'Select a country' })).toBeVisible();
    // The explorer's client total matches the toolbar.
    const total = Number((await page.getByText(/\d+ clients? in/).textContent())!.match(/(\d+) client/)![1]);
    await expect(explorer(page).getByRole('tab', { name: `Clients (${total})` })).toBeVisible();
    const box = await page.locator('.cmap-center').boundingBox();
    expect(box!.width).toBeGreaterThan(700);   // the map is the largest area at 1600 px
    await page.screenshot({ path: 'test-results/visual-client-map-1600.png' });
  });

  test('selecting a country fills the details panel and its tabs read the real lists for that country', async ({ page }) => {
    await open(page);
    await explorer(page).getByRole('button', { name: /^Saudi Arabia:/ }).click();
    await expect(page).toHaveURL(/country=Saudi\+Arabia|country=Saudi%20Arabia/);
    await expect(explorer(page).getByRole('button', { name: /^Saudi Arabia:/ })).toHaveAttribute('aria-pressed', 'true');
    const d = details(page);
    await expect(d.getByRole('heading', { name: 'Saudi Arabia' })).toBeVisible();
    await expect(d.getByRole('tab', { name: /^Clients \(\d+\)/ })).toHaveAttribute('aria-selected', 'true');
    const rows = d.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first().locator('.cmap-status')).toHaveText(/overdue|renewal due|open case|Nothing overdue/);
    await page.screenshot({ path: 'test-results/visual-client-map-country-1600.png' });
    for (const [tab, api] of [['Servers', '/api/v1/assets?'], ['Cases', '/api/v1/cases?'], ['Contracts', '/api/v1/contracts?']] as const) {
      const req = page.waitForRequest(r => r.url().includes(api) && r.url().includes('country=Saudi'));
      await d.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
      const res = await (await req).response();
      expect(res!.ok()).toBeTruthy();
      await expect(d.getByRole('tabpanel')).not.toContainText('Loading');
    }
    // Keyboard between the tabs.
    await d.getByRole('tab', { name: /^Contracts/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(d.getByRole('tab', { name: /^Clients/ })).toHaveAttribute('aria-selected', 'true');
    // Opening a client goes to its record.
    const code = (await d.locator('.cmap-cell-client b').first().textContent())!.trim();
    await d.getByRole('link', { name: `Open client ${code}` }).click();
    await expect(page).toHaveURL(/\/clients\/\d+$/);
    await page.goBack();
    await expect(details(page).getByRole('heading', { name: 'Saudi Arabia' })).toBeVisible();
    // Closing restores the wider map and clears the selection.
    await details(page).getByRole('button', { name: 'Close country details' }).click();
    await expect(details(page)).toHaveCount(0);
    await expect(page).not.toHaveURL(/country=/);
  });

  test('switching layers updates the legend and the list figures; search, sort and the clients tab', async ({ page }) => {
    await open(page);
    for (const [layer, legend] of [['Servers', 'Servers per country'], ['Open cases', 'Open cases per country'], ['Overdue', 'Overdue items per country'], ['Contracts', 'Active contracts per country'], ['Clients', 'Clients per country']]) {
      await layers(page).getByRole('radio', { name: new RegExp(`^${layer}`) }).click();
      await expect(layers(page).getByRole('radio', { name: new RegExp(`^${layer}`) })).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByLabel(legend)).toBeVisible();
    }
    await expect(page).toHaveURL(/layer=clients|\/map$/);
    // Search narrows the list; sort by name orders it alphabetically.
    const list = explorer(page).getByRole('list', { name: 'Countries' });
    await explorer(page).getByLabel('Search countries').fill('saudi');
    await expect(list.getByRole('button')).toHaveCount(1);
    await explorer(page).getByLabel('Search countries').fill('zz-no-such-country');
    await expect(list).toContainText('No country matches the search.');
    await explorer(page).getByLabel('Search countries').fill('');
    await explorer(page).getByLabel('Sort countries').selectOption('name');
    const names = await list.locator('.cmap-country-name b').allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    await explorer(page).getByRole('tab', { name: /^Clients/ }).click();
    const clientRows = explorer(page).getByRole('list', { name: 'Clients' }).getByRole('button');
    expect(await clientRows.count()).toBeGreaterThan(0);
    await clientRows.first().click();
    await expect(details(page).locator('h2')).not.toHaveText('Select a country');
  });

  test('filters stay in sync: region, product and reset; an excluded country is deselected', async ({ page }) => {
    // A fictional client in Kenya, so a second region exists (the seed's clients are all in Western Asia).
    await page.goto('/map');
    const code = `E2E-KE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const status = await page.evaluate(async alias => {
      const me = await (await fetch('/api/v1/me')).json();
      const t = decodeURIComponent(document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)![1]);
      const r = await fetch('/api/v1/clients', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': t },
        body: JSON.stringify({ code: alias, name: 'Fictional Nairobi Transit', country: 'Kenya', status: 'Active', ownerUserId: me.id }) });
      return r.status;
    }, code);
    expect(status).toBe(201);
    await open(page, '/map?country=Saudi+Arabia');
    await expect(details(page).getByRole('heading', { name: 'Saudi Arabia' })).toBeVisible();
    const before = await explorer(page).getByRole('list', { name: 'Countries' }).getByRole('button').count();
    // A region without Saudi Arabia: the selection is cleared, the list only holds that region's countries.
    const region = page.getByLabel('Region');
    const options = await region.locator('option').allTextContents();
    const other = options.find(o => /^Africa/.test(o));
    expect(other).toBeTruthy();
    await region.selectOption({ label: other! });
    await expect(explorer(page).getByRole('button', { name: /^Kenya:/ })).toBeVisible();
    await expect(page).not.toHaveURL(/country=/);
    await expect(details(page).getByRole('heading', { name: 'Select a country' })).toBeVisible();
    const after = await explorer(page).getByRole('list', { name: 'Countries' }).getByRole('button').count();
    expect(after).toBeLessThan(before);
    await expect(page.getByText(/\d+ clients? in \d+ countr/)).toBeVisible();
    // A product filter asks the server again; reset brings everything back.
    const product = page.getByLabel('Product');
    const value = await product.locator('option').nth(1).getAttribute('value');
    const req = page.waitForRequest(r => r.url().includes('/api/v1/dashboard/insights') && r.url().includes(`productId=${value}`));
    await product.selectOption(value!);
    await req;
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(explorer(page).getByRole('list', { name: 'Countries' }).getByRole('button')).toHaveCount(before);
  });

  test('laptop and tablet layouts keep the map; panels collapse or become drawers without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page);
    await page.screenshot({ path: 'test-results/visual-client-map-1280.png' });
    await page.getByRole('button', { name: 'Hide countries' }).click();
    await expect(explorer(page)).toBeHidden();
    await page.getByRole('button', { name: 'Countries', exact: true }).click();
    await expect(explorer(page)).toBeVisible();
    await page.setViewportSize({ width: 820, height: 1000 });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Client Map' })).toBeVisible();
    await expect(page.locator('#cmap-filters')).toBeHidden();
    await page.getByRole('button', { name: /^Filters/ }).click();
    await expect(page.getByLabel('Region')).toBeVisible();
    await page.getByRole('button', { name: 'Countries', exact: true }).click();
    await explorer(page).getByRole('button', { name: /^Saudi Arabia:/ }).click();
    await expect(explorer(page)).toBeHidden();   // the drawer closes, the details drawer opens
    await expect(details(page).getByRole('heading', { name: 'Saudi Arabia' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: 'test-results/visual-client-map-820.png' });
  });

  test('the Operations Command Center is unchanged and still links to the map', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Operations Command Center' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Section menu' })).toBeVisible();
    await page.getByRole('link', { name: 'Client map' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Client Map' })).toBeVisible();
    await page.getByRole('link', { name: 'Operations Command Center' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Operations Command Center' })).toBeVisible();
  });
});
