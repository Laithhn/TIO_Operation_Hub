import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { VT_ROW, vtHeader, vtTable } from './vtTable';

// Regression tests for the GUI bug-fix brief of 27 Oct 2026 (GUI-01 … GUI-13). Each describe names its ticket.
// All data is created in the run's own LocalDB database (playwright.config.ts); the default identity is DEV\manager.

const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const WIDTHS = [320, 360, 390, 600, 768, 1024, 1440];

async function api<T>(page: Page, path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  return page.evaluate(async ({ path, body, method }) => {
    const token = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];
    const response = await fetch(`/api/v1${path}`, {
      method, headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }, { path, body, method });
}

async function apiStatus(page: Page, path: string) {
  return page.evaluate(async p => (await fetch(`/api/v1${p}`, { headers: { Accept: 'application/json' } })).status, path);
}

/** A fresh account holding a new role with exactly these rights and permissions, signed in through the development cookie. */
async function signInWithRole(page: Page, rights: string[], permissions: string[]) {
  const created = await api<{ id: number }>(page, '/admin/roles', { name: unique('GUI role'), rights, permissions });
  const accountName = `DEV\\${unique('gui')}`;
  await api(page, '/admin/users', { accountName, displayName: accountName, workingTimeZone: 'UTC', roleId: created.id });
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(accountName), url: test.info().project.use.baseURL as string }]);
}

/** Document-level horizontal overflow, in CSS pixels (0 = none). */
const docOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function box(l: Locator) {
  const b = await l.boundingBox();
  if (!b) throw new Error('element has no box');
  return b;
}

async function openFilter(page: Page) {
  await vtTable(page).getByRole('button', { name: /^Filter/ }).click();
  const card = page.getByRole('group', { name: /filters$/ });
  await expect(card).toBeVisible();
  return card;
}

// ---------------------------------------------------------------- GUI-01 ----------------------------------------------------------------
test.describe('GUI-01 Reporting Center route', () => {
  test('authorized: menu, direct URL, refresh and back stay in the hub; the old /reports address redirects', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('complementary', { name: 'Section menu' }).getByRole('link', { name: 'Reporting Center' }).click();
    await expect(page).toHaveURL(/\/reporting-center$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Reporting Center' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Reporting Center' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/reporting-center$/);
    // Direct URL with a tab, and the old address (bookmarks, notifications stored before the move).
    await page.goto('/reports?tab=history');
    await expect(page).toHaveURL(/\/reporting-center\?tab=history$/);
    await expect(page.getByRole('tab', { name: 'Export history' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(/Report Manager/)).toHaveCount(0);
  });

  test('unauthorized: the hub shows its own access-denied page with a way back, and the server refuses the reports', async ({ page }) => {
    await page.goto('/');
    await signInWithRole(page, [], []);
    await page.goto('/reporting-center');
    const me = await api<{ grants: { export: boolean } }>(page, '/me');
    expect(me.grants.export).toBe(false);
    await expect(page.getByRole('heading', { level: 1, name: 'Reporting Center' })).toBeVisible();
    await expect(page.getByText('The Reporting Center needs the Export permission.')).toBeVisible();
    await expect(page.getByText(/Report Manager/)).toHaveCount(0);
    expect(await apiStatus(page, '/reports/catalog')).toBe(403);
    await page.reload();
    await expect(page.getByText('The Reporting Center needs the Export permission.')).toBeVisible();
    await page.getByRole('link', { name: 'Back to the dashboard' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

// ---------------------------------------------------------------- GUI-02 ----------------------------------------------------------------
test.describe('GUI-02 Notes on phones and tablets', () => {
  test('one pane at a time at 360 and 390 px, two panes at 768 px, never wider than the screen', async ({ page }) => {
    await page.goto('/notes');
    const nb = await api<{ id: number }>(page, '/notes/notebooks', { name: unique('Field notebook with a long name'), color: 'blue' });
    const sec = await api<{ id: number }>(page, '/notes/sections', { name: 'Site visits', color: 'green', notebookId: nb.id });
    const pg = await api<{ id: number }>(page, '/notes/pages', { sectionId: sec.id, title: 'Checklist for the gantry inspection at the northern site', contentHtml: '<p>Text</p>' });

    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/notes?page=${pg.id}`);
      const notes = page.locator('.notes');
      await expect(notes).toHaveAttribute('data-pane', 'editor');
      await expect(page.getByLabel('Page title')).toHaveValue(/gantry inspection/);
      await expect(page.locator('.notes-nav')).toBeHidden();
      await expect(page.locator('.notes-pages')).toBeHidden();
      expect(await docOverflow(page), `${width}: document overflow`).toBeLessThanOrEqual(0);
      expect((await box(notes)).width, `${width}: workspace width`).toBeLessThanOrEqual(width);
      // Editor → pages: the page list names notebook and section, the open page stays marked.
      await page.getByRole('button', { name: /^Back to pages/ }).click();
      await expect(notes).toHaveAttribute('data-pane', 'pages');
      await expect(page.locator('.notes-pages-head h2')).toContainText('Site visits');
      await expect(page.locator('.notes-pages-head h2')).toBeFocused();
      await expect(page.locator('.notes-page[aria-current="true"]')).toContainText('gantry inspection');
      // Pages → notebooks, and back again by keyboard.
      await page.getByRole('button', { name: 'Back to notebooks' }).click();
      await expect(notes).toHaveAttribute('data-pane', 'nav');
      await expect(page.getByRole('searchbox', { name: 'Search all notes' })).toBeFocused();
      const section = page.locator('.notes-section', { hasText: 'Site visits' });
      if (!(await section.isVisible())) await page.locator('.notes-book-toggle', { hasText: 'Field notebook' }).click();
      await section.focus();
      await page.keyboard.press('Enter');
      await expect(notes).toHaveAttribute('data-pane', 'pages');
      await page.locator('.notes-page', { hasText: 'gantry inspection' }).focus();
      await page.keyboard.press('Enter');
      await expect(notes).toHaveAttribute('data-pane', 'editor');
      expect(await docOverflow(page), `${width}: document overflow after navigation`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `test-results/gui-02-notes-${width}.png` });
    }

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`/notes?page=${pg.id}`);
    for (const pane of ['.notes-nav', '.notes-pages', '.notes-editor-pane']) {
      const b = await box(page.locator(pane));
      expect(b.x, `${pane} left`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `${pane} right`).toBeLessThanOrEqual(768);
    }
    expect(await docOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: 'test-results/gui-02-notes-768.png' });
  });
});

// ---------------------------------------------------------------- GUI-03 / GUI-04 / GUI-09 ----------------------------------------------
test.describe('GUI-03 and GUI-04 Filter card', () => {
  test('the filter value stays at least 128 px wide and editable at 320 to 768 px', async ({ page }) => {
    for (const width of [320, 360, 390, 600, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/clients');
      const card = await openFilter(page);
      const operator = card.getByLabel('Environments filter operator');
      const value = card.getByLabel('Filter value for Environments');
      expect((await box(value)).width, `${width}: value width`).toBeGreaterThanOrEqual(128);
      const c = await box(card);
      expect(c.x, `${width}: card left`).toBeGreaterThanOrEqual(0);
      expect(c.x + c.width, `${width}: card right`).toBeLessThanOrEqual(width);
      await operator.focus();
      await operator.selectOption('equal');
      await value.focus();
      await page.keyboard.type('1');
      await expect(value).toHaveValue('1');
      expect(await docOverflow(page), `${width}: document overflow`).toBeLessThanOrEqual(0);
      if (width === 390) await page.screenshot({ path: 'test-results/gui-03-filter-390.png' });
      await page.keyboard.press('Escape');
    }
  });

  test('Clear and Close stay in view above the footer; Escape, Close and an outside click dismiss the card', async ({ page }) => {
    for (const [width, height] of [[606, 679], [390, 844], [768, 1024]]) {
      await page.setViewportSize({ width, height });
      await page.goto('/clients');
      await openFilter(page);
      const clear = page.getByRole('button', { name: 'Clear', exact: true });
      const close = page.getByRole('button', { name: 'Close', exact: true });
      const footerTop = (await box(page.locator('footer.status'))).y;
      const headerBottom = await page.locator('header.hdr').evaluate(e => e.getBoundingClientRect().bottom);
      for (const action of [clear, close]) {
        await expect(action, `${width}x${height}`).toBeInViewport();
        const b = await box(action);
        expect(b.y + b.height, `${width}x${height}: action above the footer`).toBeLessThanOrEqual(footerTop);
        expect(b.y, `${width}x${height}: action below the header`).toBeGreaterThanOrEqual(headerBottom);
      }
      if (width === 606) await page.screenshot({ path: 'test-results/gui-04-filter-606x679.png' });
      // Keyboard: the actions are focusable; Close returns focus to the Filter button.
      await close.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('group', { name: /filters$/ })).toBeHidden();
      await expect(vtTable(page).getByRole('button', { name: /^Filter/ })).toBeFocused();
      // Escape
      await openFilter(page);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('group', { name: /filters$/ })).toBeHidden();
      await expect(vtTable(page).getByRole('button', { name: /^Filter/ })).toBeFocused();
      // Outside click (the footer: on phones the card covers the page title)
      await openFilter(page);
      await page.locator('footer.status').click({ position: { x: 4, y: 4 } });
      await expect(page.getByRole('group', { name: /filters$/ })).toBeHidden();
    }
  });
});

test.describe('GUI-09 Filter badge', () => {
  test('the badge counts only criteria that filter, and always agrees with the rows', async ({ page }) => {
    await page.goto('/clients');
    const table = vtTable(page);
    const count = table.locator('.table-count');
    const total = Number((await count.innerText()).match(/\d+/)![0]);
    const card = await openFilter(page);
    const operator = card.getByLabel('Environments filter operator');
    const value = () => card.getByLabel('Filter value for Environments');
    const badge = table.getByRole('button', { name: /^Filter/ });

    // Default operator, blank value: nothing.
    await expect(badge).toHaveText('Filter');
    // Non-default operator, blank value: incomplete, not counted, no rows removed.
    await operator.selectOption('contains');
    await expect(badge).toHaveText('Filter');
    await expect(count).toHaveText(`${total} rows`);
    await expect(card.getByText('Not applied until a value is entered.')).toBeVisible();
    // Whitespace only: still not active.
    await value().fill('   ');
    await expect(badge).toHaveText('Filter');
    await expect(count).toHaveText(`${total} rows`);
    // A value: counted and applied.
    await value().fill('1');
    await expect(badge).toHaveText('Filter (1)');
    await expect(count).toHaveText(new RegExp(`^\\d+ of ${total} rows?$`));
    const shown = Number((await count.innerText()).match(/^\d+/)![0]);
    await expect(page.locator(VT_ROW)).toHaveCount(Math.min(shown, 25));
    // Explicit "Empty": counted without a value, and applied.
    await operator.selectOption('empty');
    await expect(badge).toHaveText('Filter (1)');
    await expect(count).toHaveText(new RegExp(`^\\d+ of ${total} rows?$`));
    // Clear resets both.
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(badge).toHaveText('Filter');
    await expect(count).toHaveText(`${total} rows`);
  });
});

// ---------------------------------------------------------------- GUI-05 ----------------------------------------------------------------
test.describe('GUI-05 Table semantics and keyboard sorting', () => {
  test('the table exposes rows, column headers and cells; sorting works by keyboard and is announced', async ({ page }) => {
    await page.goto('/clients');
    const table = page.getByRole('table', { name: 'Clients' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader', { name: /^Alias/ })).toBeVisible();
    expect(await table.getByRole('row').count()).toBeGreaterThan(2);
    await expect(table.getByRole('row').nth(1).getByRole('cell').first()).toBeVisible();
    // Headers: one real button each, no extra tab stop on the header cell itself.
    const country = vtHeader(table, /^Country/);
    const button = country.getByRole('button', { name: 'Country' });
    expect(await country.getAttribute('tabindex')).toBeNull();
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/sort=country/);
    await expect(country).toHaveAttribute('aria-sort', 'ascending');
    await expect(page.locator('.vt-table [role="status"]')).toHaveText('Sorted by Country, ascending.');
    await expect(country.getByRole('button')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page).toHaveURL(/sort=-country/);
    await expect(country).toHaveAttribute('aria-sort', 'descending');
    await expect(page.locator('.vt-table [role="status"]')).toHaveText('Sorted by Country, descending.');
    // Only the sorted column carries aria-sort.
    await expect(table.locator('th[aria-sort]')).toHaveCount(1);
    // Row links stay their own tab stops.
    const firstLink = table.getByRole('row').nth(1).getByRole('link').first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
  });

  test('a browser-sorted table sorts by keyboard too', async ({ page }) => {
    await page.goto('/products');
    const table = page.getByRole('table', { name: 'Products' });
    const header = vtHeader(table, /^Category/);
    await header.getByRole('button').focus();
    await page.keyboard.press('Enter');
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await page.keyboard.press('Enter');
    await expect(header).toHaveAttribute('aria-sort', 'descending');
  });
});

// ---------------------------------------------------------------- GUI-06 / GUI-07 ------------------------------------------------------
test.describe('GUI-06 Mobile tables', () => {
  test('identity, status and actions are visible without panning; the other columns open as row details', async ({ page }) => {
    for (const [path, identity, detail] of [['/clients', 'Client', 'Alias'], ['/products', 'Product', 'Category']] as const) {
      for (const width of [320, 360, 390]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        const table = vtTable(page);
        const scroller = table.locator('.vt-table-scroll');
        const view = await box(scroller);
        const identityBox = await box(table.getByRole('columnheader', { name: identity, exact: true }));
        expect(identityBox.x + identityBox.width, `${path} ${width}: ${identity} visible`).toBeLessThanOrEqual(view.x + view.width + 1);
        if (width === 320) {
          // 320 px is below the acceptance widths: what does not fit scrolls sideways, signposted and reachable by keyboard.
          const over = await scroller.evaluate(e => e.scrollWidth - e.clientWidth);
          if (over > 1) {
            await expect(scroller).toHaveClass(/is-overflowing/);
            await expect(scroller).toHaveAttribute('tabindex', '0');
          }
          expect(await docOverflow(page), `${path} ${width}: document overflow`).toBeLessThanOrEqual(0);
          continue;
        }
        for (const name of [identity, 'Status']) {
          const h = await box(table.getByRole('columnheader', { name, exact: true }));
          expect(h.x + h.width, `${path} ${width}: ${name} visible`).toBeLessThanOrEqual(view.x + view.width + 1);
        }
        const del = table.getByRole('button', { name: /^Delete / }).first();
        const d = await box(del);
        expect(d.x + d.width, `${path} ${width}: row action visible`).toBeLessThanOrEqual(width);
        expect(await scroller.evaluate(e => e.scrollWidth - e.clientWidth), `${path} ${width}: no sideways panning`).toBeLessThanOrEqual(1);
        expect(await docOverflow(page), `${path} ${width}: document overflow`).toBeLessThanOrEqual(0);
        await expect(table.getByRole('columnheader', { name: detail, exact: true })).toBeHidden();
        // Details: a real button with state; the secondary values are there.
        const toggle = table.getByRole('button', { name: /^Details for / }).first();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.focus();
        await page.keyboard.press('Enter');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const details = table.locator('.row-details').first();
        await expect(details.locator('dt', { hasText: detail })).toBeVisible();
        if (width === 390) await page.screenshot({ path: `test-results/gui-06${path.replace('/', '-')}-390.png` });
      }
      // Desktop and tablet keep every column in the row and no details toggles.
      for (const width of [768, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const table = vtTable(page);
        await expect(table.getByRole('columnheader', { name: detail, exact: true })).toBeVisible();
        await expect(table.getByRole('button', { name: /^Details for / })).toHaveCount(0);
        expect(await docOverflow(page), `${path} ${width}: document overflow`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `test-results/gui-06${path.replace('/', '-')}-${width}.png` });
      }
    }
  });
});

test.describe('GUI-07 Table toolbar on phones', () => {
  test('Filter, Columns and Export CSV stay inside the screen; the export keeps the filtered rows', async ({ page }) => {
    for (const width of [320, 360, 390, 600]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/products');
      const table = vtTable(page);
      for (const name of [/^Filter/, /^Columns$/, /^Export CSV$/]) {
        const b = await box(table.getByRole('button', { name }));
        expect(b.x, `${width}: ${name} left`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${width}: ${name} right`).toBeLessThanOrEqual(width);
      }
      expect(await docOverflow(page), `${width}: document overflow`).toBeLessThanOrEqual(0);
      if (width === 390) await page.screenshot({ path: 'test-results/gui-07-products-390.png' });
    }
    // Keyboard and filtered export.
    const table = vtTable(page);
    await table.getByPlaceholder('Filter rows…').fill('PS');
    const shown = Number((await table.locator('.table-count').innerText()).match(/^\d+/)![0]);
    const exportButton = table.getByRole('button', { name: 'Export CSV' });
    await exportButton.focus();
    const download = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    const file = await download;
    const text = readFileSync(await file.path(), 'utf-8');
    expect(text.trim().split(/\r\n/).length - 1).toBe(shown);
  });

  test('Export CSV is offered only with the Export permission', async ({ page }) => {
    await page.goto('/products');
    await signInWithRole(page, [], []);
    await page.goto('/products');
    await expect(vtTable(page).getByRole('button', { name: /^Filter/ })).toBeVisible();
    await expect(vtTable(page).getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
  });
});

// ---------------------------------------------------------------- GUI-08 ----------------------------------------------------------------
test.describe('GUI-08 Column chooser', () => {
  test('the search field is named "Search columns"; search, clear and show/hide work by keyboard', async ({ page }) => {
    await page.goto('/clients');
    const table = vtTable(page);
    await table.getByRole('button', { name: 'Columns' }).click();
    const search = page.getByRole('searchbox', { name: 'Search columns' });
    await expect(search).toBeFocused();
    await page.keyboard.type('coun');
    const list = page.getByRole('list', { name: 'Columns shown' });
    await expect(list.getByRole('checkbox')).toHaveCount(1);
    await expect(list.getByRole('checkbox', { name: 'Country' })).toBeChecked();
    await list.getByRole('checkbox', { name: 'Country' }).press('Space');
    await expect(vtHeader(table, /^Country/)).toHaveCount(0);
    await search.fill('');
    expect(await list.getByRole('checkbox').count()).toBeGreaterThan(5);
    await page.getByRole('button', { name: 'Show all' }).click();
    await expect(vtHeader(table, /^Country/)).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(search).toBeHidden();
    await expect(table.getByRole('button', { name: 'Columns' })).toBeFocused();
  });
});

// ---------------------------------------------------------------- GUI-10 ----------------------------------------------------------------
test.describe('GUI-10 Global navigation', () => {
  test('every section is reachable from the phone and tablet drawer; Escape closes it and returns focus', async ({ page }) => {
    await page.goto('/');
    const sections = await page.locator('.nav-measure [data-key]').allTextContents();
    expect(sections).toHaveLength(9);
    for (const width of [360, 390, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/products');
      const menu = page.getByRole('button', { name: 'Menu, current section Products' });
      await expect(menu).toBeVisible();
      const drawer = page.locator('#hub-drawer');
      // Closed: out of the tab order.
      await expect(drawer.locator('a').first()).not.toBeInViewport();
      expect(await drawer.evaluate(e => (e as HTMLElement).inert)).toBe(true);
      await menu.click();
      await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
      const all = page.getByRole('navigation', { name: 'All sections' });
      for (const s of sections) await expect(all.locator('.drawer-section-link', { hasText: new RegExp(`^${s}`) }), `${width}: ${s}`).toBeInViewport({ ratio: 1 });
      await expect(all.locator('.drawer-section.current')).toContainText('Products (current section)');
      await expect(all.getByRole('link', { name: 'All products' })).toBeVisible();
      await expect(all.locator('.drawer-section-link').first()).not.toBeFocused();
      await expect(all.getByRole('link', { name: /^Products/ })).toBeFocused();
      // Nested pages of another section open on demand.
      await all.getByRole('button', { name: 'Clients pages' }).click();
      await expect(all.getByRole('link', { name: 'All clients' })).toBeVisible();
      if (width === 390) await page.screenshot({ path: 'test-results/gui-10-drawer-390.png' });
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      // Touch / click: a section opens and the drawer closes.
      await menu.click();
      await all.getByRole('link', { name: 'Teams' }).click();
      await expect(page).toHaveURL(/\/teams$/);
      await expect(page.getByRole('button', { name: 'Menu, current section Teams' })).toBeVisible();
      expect(await docOverflow(page)).toBeLessThanOrEqual(0);
    }
  });

  test('at 1024 px the header shows readable links and moves the rest into More', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/admin/users');
    const main = page.getByRole('navigation', { name: 'Main' });
    const navBox = await box(page.locator('.hdr-primary'));
    const links = main.locator(':scope > a');
    const inHeader = await links.allInnerTexts();
    for (let i = 0; i < inHeader.length; i++) {
      const b = await box(links.nth(i));
      expect(b.x + b.width, `${inHeader[i]} not clipped`).toBeLessThanOrEqual(navBox.x + navBox.width + 1);
      expect(await links.nth(i).evaluate(e => e.scrollWidth <= e.clientWidth + 1), `${inHeader[i]} label fits`).toBe(true);
    }
    // The active section keeps its place in the header.
    await expect(main.locator('a[aria-current="page"]')).toHaveText('Administration');
    const more = main.getByRole('button', { name: /^More/ });
    await more.click();
    const rest = await page.locator('#nav-more-list a').allInnerTexts();
    expect([...inHeader, ...rest].sort()).toEqual(['Administration', 'Cases', 'Clients', 'Commitments', 'Dashboard', 'Escalations', 'Notes', 'Products', 'Teams']);
    await expect(page.locator('#nav-more-list a').first()).toBeFocused();
    await page.screenshot({ path: 'test-results/gui-10-header-1024.png' });
    await page.keyboard.press('Escape');
    await expect(more).toBeFocused();
    await more.click();
    await page.locator('#nav-more-list a').first().click();
    await expect(page.locator('#nav-more-list')).toHaveCount(0);
    expect(await docOverflow(page)).toBeLessThanOrEqual(0);
  });
});

// ---------------------------------------------------------------- GUI-11 ----------------------------------------------------------------
test.describe('GUI-11 Roles with long lists of rights', () => {
  test('identity and actions stay visible at 1024 and 1440 px; the full list opens by keyboard', async ({ page }) => {
    await page.goto('/admin/roles');
    const defs = await api<{ permissions: { key: string }[]; rights: { key: string }[] }>(page, '/admin/roles');
    const many = unique('Many rights');
    const few = unique('Few rights');
    await api(page, '/admin/roles', { name: many, rights: defs.rights.map(r => r.key), permissions: defs.permissions.map(p => p.key) });
    await api(page, '/admin/roles', { name: few, rights: [], permissions: defs.permissions.slice(0, 1).map(p => p.key) });
    const total = defs.rights.length + defs.permissions.length;
    expect(total).toBeGreaterThan(20);

    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/admin/roles');
      const table = vtTable(page, 'Roles');
      const scroller = await box(table.locator('.vt-table-scroll'));
      for (const name of [many, few]) {
        const row = table.locator(VT_ROW).filter({ hasText: name });
        for (const action of ['Edit', 'Delete']) {
          const b = await box(row.getByRole('button', { name: `${action} role ${name}` }));
          expect(b.x + b.width, `${width}: ${action} ${name} visible`).toBeLessThanOrEqual(scroller.x + scroller.width);
          expect(b.x, `${width}: ${action} ${name} visible`).toBeGreaterThanOrEqual(scroller.x);
        }
        const roleCell = await box(row.getByRole('button', { name, exact: true }));
        expect(roleCell.x, `${width}: role visible`).toBeGreaterThanOrEqual(scroller.x);
      }
      const width0 = await table.locator('.vt-table-scroll').evaluate(e => [e.scrollWidth, e.clientWidth]);
      expect(width0[0], `${width}: bounded table width`).toBeLessThanOrEqual(width0[1] * 1.6);
      await page.screenshot({ path: `test-results/gui-11-roles-${width}.png` });
    }
    const row = vtTable(page, 'Roles').locator(VT_ROW).filter({ hasText: many });
    const summary = row.locator('summary');
    await expect(summary).toHaveText(`${total} rights`);
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(row.locator('.rights-summary li')).toHaveCount(total);
    // Edit and Delete behave as before.
    await row.getByRole('button', { name: `Edit role ${many}` }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await row.getByRole('button', { name: `Delete role ${many}` }).click();
    await expect(page.getByRole('dialog', { name: `Delete role ${many}` })).toContainText('Nobody holds this role.');
    await page.getByRole('dialog').getByRole('button', { name: 'Delete role' }).click();
    await expect(vtTable(page, 'Roles').locator(VT_ROW).filter({ hasText: many })).toHaveCount(0);
  });
});

// ---------------------------------------------------------------- GUI-12 ----------------------------------------------------------------
test.describe('GUI-12 Target sizes', () => {
  test('collapse, pager, row actions and rights checkboxes measure at least 24 x 24 px', async ({ page }) => {
    const atLeast = async (l: Locator, what: string, min = 24) => {
      const b = await box(l);
      expect(b.width, `${what} width`).toBeGreaterThanOrEqual(min);
      expect(b.height, `${what} height`).toBeGreaterThanOrEqual(min);
    };
    await page.goto('/clients');
    await atLeast(page.getByRole('button', { name: /^(Collapse|Expand) menu$/ }), 'sidebar collapse');
    await atLeast(page.locator('.pager button').first(), 'pager button');
    await page.goto('/admin/roles');
    await atLeast(page.getByRole('button', { name: /^Edit role / }).first(), 'row action');
    await page.goto('/admin/rights');
    await atLeast(page.locator('.right-hit').first(), 'rights checkbox target', 32);
    // Phones: the details toggle and the drawer controls are 40 px or more.
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/clients');
    await atLeast(page.getByRole('button', { name: /^Details for / }).first(), 'row details toggle', 40);
    await page.getByRole('button', { name: /^Menu, current section/ }).click();
    await atLeast(page.getByRole('button', { name: 'Close menu' }), 'drawer close', 40);
    await atLeast(page.getByRole('button', { name: 'Clients pages' }), 'drawer section toggle', 40);
  });
});

// ---------------------------------------------------------------- GUI-13 ----------------------------------------------------------------
test.describe('GUI-13 Initial JavaScript', () => {
  test('the first screen loads neither the map nor the country geometry, and the entry chunk keeps its budget', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', r => { if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname); });
    await page.goto('/clients');
    await expect(page.getByRole('heading', { level: 1, name: 'Clients' })).toBeVisible();
    expect(scripts.filter(s => /countries-50m|LeafletMap/.test(s))).toEqual([]);
    // Pages come with their routes: the client list does not fetch the Reporting Center or the dashboard page.
    expect(scripts.filter(s => /\/(Reports|Dashboard|Inventory|Contracts)-/.test(s))).toEqual([]);
    // Budget (docs/GUI-FIXES-2026-10-27.md): entry chunk at most 900 kB minified (Vite chunkSizeWarningLimit).
    const entry = await page.evaluate(() => (document.querySelector('script[type="module"][src*="/assets/index-"]') as HTMLScriptElement).src);
    const size = await page.evaluate(async u => (await (await fetch(u)).arrayBuffer()).byteLength, entry);
    expect(size).toBeLessThanOrEqual(900 * 1024);
    // The map still works and fetches the geometry when opened.
    await page.goto('/map');
    await expect.poll(() => scripts.some(s => /LeafletMap/.test(s))).toBe(true);
    await expect.poll(() => scripts.some(s => /countries-50m/.test(s)), { timeout: 20_000 }).toBe(true);
  });
});

// ---------------------------------------------------------------- responsive sweep ------------------------------------------------------
test.describe('Responsive sweep', () => {
  test('no document-level horizontal overflow on the audited routes at 320 to 1440 px', async ({ page }) => {
    test.setTimeout(240_000);
    const routes = ['/', '/clients', '/cases', '/products', '/notes', '/reporting-center', '/admin/roles', '/admin/settings'];
    const failures: string[] = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('#viMainToolbar h1, .notes').first()).toBeVisible();
        const over = await docOverflow(page);
        if (over > 0) failures.push(`${route} @ ${width}: ${over}px`);
      }
    }
    expect(failures).toEqual([]);
  });
});

// ---------------------------------------------------------------- 28 Oct 2026 follow-up --------------------------------------------------
test.describe('Header pop-ups and the collapsed sidebar', () => {
  test('the notifications pop-up stays above the dashboard section bar, also while the bar is sticky', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('.dash-nav');
    await expect(bar).toBeVisible();
    for (const scrolled of [false, true]) {
      if (scrolled) await page.locator('#main').evaluate(e => e.scrollTo(0, 400));
      await page.locator('.bell').getByRole('button').first().click();
      const pop = page.getByRole('dialog', { name: 'Notifications' });
      await expect(pop).toBeVisible();
      const p = await box(pop);
      const b = await box(bar);
      // A point inside the pop-up at the height of the section bar belongs to the pop-up.
      const y = Math.min(Math.max(b.y + b.height / 2, p.y + 10), p.y + p.height - 10);
      const top = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.bell-pop'), [p.x + 30, y]);
      expect(top, `pop-up on top (scrolled: ${scrolled})`).toBe(true);
      await page.keyboard.press('Escape');
      await page.locator('#viMainToolbar h1').click();
    }
  });

  test('collapsed, the sidebar shows every entry of the section as an icon', async ({ page }) => {
    await page.goto('/clients');
    const side = page.locator('aside.side');
    const entries = side.locator('.side-nav [class*="menuNode__link"]:not([class*="isSubmenuNode"])');
    const count = await entries.count();
    expect(count).toBeGreaterThanOrEqual(4);
    await page.getByRole('button', { name: 'Collapse menu' }).click();
    await expect(page.locator('body')).toHaveClass(/side-mini/);
    const nav = await box(side.locator('.side-nav'));
    for (let i = 0; i < count; i++) {
      const e = await box(entries.nth(i));
      expect(e.y, `entry ${i} top`).toBeGreaterThanOrEqual(nav.y - 1);
      expect(e.y + e.height, `entry ${i} bottom`).toBeLessThanOrEqual(nav.y + nav.height + 1);
    }
    await expect(side.locator('.side-nav')).toHaveJSProperty('scrollTop', 0);
    await page.getByRole('button', { name: 'Expand menu' }).click();
    await expect(page.locator('body')).not.toHaveClass(/side-mini/);
  });
});

test.describe('Filter card while filtering, and the dashboard KPI tiers', () => {
  test('the Filter card stays under its button while a filter reloads the list or matches nothing', async ({ page }) => {
    await page.goto('/clients');
    const card = await openFilter(page);
    const before = await box(card);
    // The client search is a server filter: the list reloads and, here, matches nothing.
    await card.getByLabel('Search clients by name or alias').fill('ZZZ-NO-SUCH-CLIENT');
    await expect(vtTable(page).locator('.table-count')).toHaveText('0 rows');
    await expect(card).toBeVisible();
    const after = await box(card);
    expect(Math.abs(after.x - before.x), 'card stays in place horizontally').toBeLessThanOrEqual(2);
    expect(Math.abs(after.y - before.y), 'card stays in place vertically').toBeLessThanOrEqual(2);
    await expect(vtTable(page).getByRole('button', { name: /^Filter/ })).toBeVisible();
    await card.getByLabel('Search clients by name or alias').fill('');
    await expect(vtTable(page).locator('.table-count')).not.toHaveText('0 rows');
    const back = await box(card);
    expect(Math.abs(back.y - before.y)).toBeLessThanOrEqual(2);
  });

  test('the dashboard KPIs come in two tiers with real-data states, keyboard access and a stable loading state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Loading: the same cards with placeholders (the dashboard figures are held back here so the loading state can be seen).
    let release: () => void = () => undefined;
    const held = new Promise<void>(r => { release = r; });
    await page.route('**/api/v1/dashboard/**', async route => { await held; await route.continue(); });
    await page.goto('/');
    const main = page.getByRole('group', { name: 'Main figures' });
    const more = page.getByRole('group', { name: 'More figures' });
    await expect(main.locator('.kpi.is-loading')).toHaveCount(5);
    await expect(more.locator('.kpi.is-loading')).toHaveCount(5);
    const loadingH = (await box(main.locator('.kpi').first())).height;
    release();
    await expect(main.locator('.kpi.is-loading')).toHaveCount(0);
    const titles = (gr: Locator) => gr.locator('.kpi-title').allTextContents();
    expect(await titles(main)).toEqual(['Active contracts', 'Overdue payments', 'Upcoming commitments', 'Active escalations', 'Open cases']);
    expect(await titles(more)).toEqual(['Clients', 'Targets met (period)', 'Contractual SLA met (period)', 'Environment health', 'Data quality']);
    // Loading did not change the card size much (no jump when the figures arrive).
    expect(Math.abs((await box(main.locator('.kpi').first())).height - loadingH)).toBeLessThanOrEqual(40);
    // One row each at 1440 px; equal main cards; supporting cards smaller, with smaller values.
    expect(await main.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(5);
    const heights = await main.locator('.kpi').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
    expect(new Set(heights).size).toBe(1);
    const valueSize = (gr: Locator) => gr.locator('.kpi-v [class*="valueField__value__"]').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    expect(await valueSize(main)).toBeGreaterThanOrEqual(28);
    expect(await valueSize(more)).toBeLessThan(await valueSize(main));
    // White cards, 12 px corners, no coloured surfaces.
    const card = main.locator('.kpi').first();
    expect(await card.evaluate(e => [getComputedStyle(e).backgroundColor, getComputedStyle(e).borderTopLeftRadius])).toEqual(['rgb(255, 255, 255)', '12px']);
    // States follow the figures: an open case overdue makes Open cases critical; zero overdue payments is OK. Never colour alone.
    const cases = main.locator('.kpi').filter({ hasText: 'Open cases' });
    const overdueText = await cases.locator('.kpi-lines li').first().textContent();
    if (!/None overdue/.test(overdueText ?? '')) await expect(cases.locator('.kpi-status')).toHaveText(/Critical/);
    else await expect(cases.locator('.kpi-status')).not.toHaveText(/Critical/);
    const payments = main.locator('.kpi').filter({ hasText: 'Overdue payments' });
    const payValue = Number(await payments.locator('.kpi-v').textContent());
    await expect(payments.locator('.kpi-status')).toHaveText(payValue ? /Critical/ : /OK/);
    for (const k of await main.locator('.kpi').all()) {
      const cls = await k.getAttribute('class');
      if (/st-(critical|warning|healthy)/.test(cls ?? '')) await expect(k.locator('.kpi-status')).toHaveText(/Critical|Attention|OK/);
    }
    // No invented trends: nothing claims a comparison with a previous period.
    await expect(page.locator('.cc-kpi-tiers')).not.toContainText(/last period|vs\./i);
    // Keyboard: the card is a link with its figures in its name; Enter opens the list.
    await cases.focus();
    await expect(cases).toHaveAttribute('aria-label', /^Open cases: \d+\./);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/cases\?/);
    await page.goBack();
    await expect(main.locator('.kpi')).toHaveCount(5);
    await page.locator('.cc-kpi-tiers').screenshot({ path: 'test-results/kpi-cards-1440.png' });
    // Responsive: 3 per row at 1024 px, 2 on tablets, 1 on phones; no overflow, nothing cut off.
    for (const [width, cols] of [[1366, 5], [1024, 3], [768, 2], [390, 1]] as const) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => main.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length), { message: `${width}` }).toBe(cols);
      expect(await docOverflow(page), `${width}: document overflow`).toBeLessThanOrEqual(0);
      const clipped = await page.locator('.kpi-title, .kpi-line').evaluateAll(es => es.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
      expect(clipped, `${width}: clipped text`).toEqual([]);
      if (width === 390) await page.locator('.cc-kpi-tiers').screenshot({ path: 'test-results/kpi-cards-390.png' });
    }
  });
});
