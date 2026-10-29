import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Regression tests for the UX audit remediation (docs/UX-AUDIT-REMEDIATION-2026-10-27.md, findings UX-001 … UX-005).
// All data lives in the run's own LocalDB database (playwright.config.ts); the default identity is DEV\manager.

const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

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

/** A fresh account holding a new role with exactly these rights and permissions, signed in through the development cookie. */
async function signInWithRole(page: Page, rights: string[], permissions: string[]) {
  const created = await api<{ id: number }>(page, '/admin/roles', { name: unique('UX role'), rights, permissions });
  const accountName = `DEV\\${unique('ux')}`;
  await api(page, '/admin/users', { accountName, displayName: accountName, workingTimeZone: 'UTC', roleId: created.id });
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(accountName), url: test.info().project.use.baseURL as string }]);
}

const scriptsOf = (page: Page) => {
  const scripts: string[] = [];
  page.on('request', r => { if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname); });
  return scripts;
};

/** The four audited access profiles. The custom and administrator profiles are new roles made through the API by the manager. */
const PROFILES: { name: string; signIn: (page: Page) => Promise<void> }[] = [
  { name: 'TIO Manager', signIn: async () => undefined },
  { name: 'Operation Engineer', signIn: async page => page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent('DEV\\engineer'), url: test.info().project.use.baseURL as string }]) },
  { name: 'restricted custom role', signIn: page => signInWithRole(page, [], ['Cases:Create']) },
  { name: 'Administration right without resource permissions', signIn: page => signInWithRole(page, ['Administer'], []) }
];

/** Whether an element's text is fully shown: not cut by its own box and inside the viewport. */
const readable = (page: Page, selector: string) => page.locator(selector).first().evaluate(e => {
  const r = e.getBoundingClientRect();
  return r.width > 0 && e.scrollWidth <= e.clientWidth + 1 && r.left >= 0 && r.right <= window.innerWidth + 1;
});

// ---------------------------------------------------------------- UX-001 ----------------------------------------------------------------
test.describe('UX-001 Narrow-screen navigation', () => {
  for (const profile of PROFILES) {
    test(`${profile.name}: at 360, 390 and 768 px the current section is readable for every section the account may open`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto('/');
      await profile.signIn(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      await expect(page.locator('#viMainToolbar h1').first()).toBeVisible();
      const menu = page.locator('.menu-btn');
      await menu.click();
      const drawer = page.locator('#hub-drawer');
      const links = await drawer.locator('.drawer-section-link').evaluateAll(es => es.map(e => ({ label: (e.firstChild?.textContent ?? '').trim(), href: e.getAttribute('href')! })));
      expect(links.length, 'sections in the drawer').toBeGreaterThan(0);
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
      // Permission-based visibility is unchanged: the Administration section only with the Administration right.
      const me = await api<{ isAdministrator: boolean }>(page, '/me');
      expect(links.some(l => l.label === 'Administration')).toBe(me.isAdministrator);
      for (const width of [360, 390, 768]) {
        await page.setViewportSize({ width, height: width === 768 ? 1024 : 800 });
        for (const l of links) {
          await page.goto(l.href);
          await expect(page.locator('#viMainToolbar h1, .notes').first()).toBeVisible();
          await expect(menu, `${width} ${l.label}: menu name`).toHaveAccessibleName(`Menu, current section ${l.label}`);
          if (width <= 600 && await page.locator('.page-section').count()) {
            // Phones: the section is shown in full above the page title; the header keeps the icon only.
            await expect(page.locator('.menu-btn-label')).toBeHidden();
            await expect(page.locator('.page-section').first(), `${width} ${l.label}`).toHaveText(`Section: ${l.label}`, { useInnerText: false });
            expect(await readable(page, '.page-section'), `${width} ${l.label}: section readable`).toBe(true);
          } else {
            expect(await readable(page, '.menu-btn-label'), `${width} ${l.label}: header label readable`).toBe(true);
          }
          // Nothing in the header overlaps.
          const overlap = await page.locator('header.hdr').evaluate(h => {
            const els = [...h.querySelectorAll('a, button, select')].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('[inert]'));
            for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
              const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
              if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) return `${els[i].textContent} / ${els[j].textContent}`;
              if (a.right > innerWidth + 1) return `off screen: ${els[i].getAttribute('aria-label') ?? els[i].textContent}`;
            }
            return null;
          });
          expect(overlap, `${width} ${l.label}`).toBeNull();
        }
      }
      if (profile.name === 'TIO Manager') await page.screenshot({ path: 'test-results/ux-001-768-after.png' });
      // Desktop: the active section keeps its header place, readable; the others are in the header or under More.
      await page.setViewportSize({ width: 1366, height: 768 });
      for (const l of links) {
        await page.goto(l.href);
        const active = page.getByRole('navigation', { name: 'Main' }).locator('a[aria-current="page"]');
        await expect(active).toHaveText(l.label);
        expect(await readable(page, 'nav[aria-label="Main"] a[aria-current="page"]'), `1366 ${l.label}`).toBe(true);
      }
    });
  }

  test('phone: the section label sits above the page title (evidence screenshot)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/commitments');
    await expect(page.locator('.page-section')).toHaveText('Section: Commitments');
    await page.screenshot({ path: 'test-results/ux-001-360-after.png' });
  });
});

// ---------------------------------------------------------------- UX-002 ----------------------------------------------------------------
test.describe('UX-002 Narrow operational tables', () => {
  test('tablet: a table wider than its panel keeps the record identifier pinned and scrolls by keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/cases');
    const scroller = page.locator('.vt-table-scroll').first();
    await expect(scroller).toHaveClass(/is-overflowing/);
    await expect(scroller).toHaveAttribute('aria-label', 'Cases: scroll sideways for more columns');
    const ref = page.locator('tbody tr.vt-row td.col-identity').first();
    const before = await ref.boundingBox();
    // Keyboard: the scroll area takes focus and the arrow keys move it.
    await scroller.focus();
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(() => scroller.evaluate(e => e.scrollLeft)).toBeGreaterThan(200);
    const after = await ref.boundingBox();
    expect(Math.abs(after!.x - before!.x), 'identifier stays at the left edge').toBeLessThanOrEqual(1);
    await expect(ref).toBeInViewport();
    // The last column is reachable and the row actions stay at the right edge.
    await expect(page.locator('thead th').last()).toBeInViewport();
    await page.screenshot({ path: 'test-results/ux-002-768-after.png' });
  });

  test('phone: identifier, status and action stay in the row; every other field is in the row details; sort and export are unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/cases');
    const table = page.locator('table.vt-grid').first();
    await expect(table.locator('tbody tr.vt-row').first()).toBeVisible();
    const headers = await table.locator('thead th').evaluateAll(es => es.map(e => (e.textContent ?? '').trim()).filter(t => t && t !== 'Details' && t !== 'Actions'));
    const visibleHeaders = await table.locator('thead th:visible').evaluateAll(es => es.map(e => (e.textContent ?? '').trim()).filter(t => t && t !== 'Details' && t !== 'Actions'));
    expect(visibleHeaders).toContain('Ref');
    expect(visibleHeaders.length).toBeLessThan(headers.length);
    const row = table.locator('tbody tr.vt-row').first();
    // Without panning: the identifier link lies inside the screen width (the table itself starts below the filters).
    const id = await row.getByRole('link').first().boundingBox();
    expect(id!.x).toBeGreaterThanOrEqual(0);
    expect(id!.x + id!.width).toBeLessThanOrEqual(360);
    const toggle = row.getByRole('button', { name: /details/i });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const details = table.locator('tr.row-details').first();
    // Nothing is dropped: every hidden column is in the details list.
    const listed = await details.locator('dt').allTextContents();
    for (const h of headers.filter(h => !visibleHeaders.includes(h))) expect(listed, `details include ${h}`).toContain(h);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    // Sorting still works on the narrow layout, and the export still has every column of the filtered rows.
    const refHeader = table.getByRole('button', { name: /^Ref/ });
    if (await refHeader.count()) {
      await refHeader.click();
      await expect(table.locator('th[aria-sort]')).toHaveCount(1);
    }
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('region', { name: 'Cases' }).getByRole('button', { name: 'Export CSV' }).click()]);
    const csv = await (await download.createReadStream()).toArray().then(c => Buffer.concat(c).toString('utf8'));
    for (const h of headers) expect(csv.split(/\r?\n/)[0], `export has ${h}`).toContain(h);
    await page.screenshot({ path: 'test-results/ux-002-360-after.png' });
  });
});

// ---------------------------------------------------------------- UX-004 ----------------------------------------------------------------
/** WCAG 2.2 SC 2.5.8 check on the page: undersized targets without the spacing exception, unnamed controls, overlapping hit areas. */
const targetIssues = (page: Page) => page.evaluate(() => {
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=checkbox], [tabindex="0"]';
  const vis = (e: Element) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert], [aria-hidden="true"]'); };
  const ts = [...document.querySelectorAll<HTMLElement>(sel)].filter(e => vis(e) && !(e as HTMLButtonElement).disabled && e.tabIndex >= -1);
  const bs = ts.map(e => e.getBoundingClientRect());
  const issues: string[] = [];
  const textInput = (e: HTMLElement) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.tagName) && !['checkbox', 'radio', 'file'].includes((e as HTMLInputElement).type);
  ts.forEach((e, i) => {
    const b = bs[i];
    const name = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || '').trim();
    if (!name && !(e as HTMLInputElement).labels?.length && !e.getAttribute('aria-labelledby') && !textInput(e)) issues.push(`unnamed ${e.outerHTML.slice(0, 60)}`);
    if (textInput(e) && b.height >= 24) return;
    if (b.width >= 24 && b.height >= 24) return;
    const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && !e.closest('td') && (e.parentElement?.textContent?.trim().length ?? 0) > (e.textContent?.trim().length ?? 0) + 8;
    if (inline) return;
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const close = ts.some((o, j) => {
      if (j === i || o.contains(e) || e.contains(o)) return false;
      const ob = bs[j];
      const dx = Math.max(ob.left - cx, 0, cx - ob.right), dy = Math.max(ob.top - cy, 0, cy - ob.bottom);
      return Math.hypot(dx, dy) < 12 || ((ob.width < 24 || ob.height < 24) && Math.hypot(ob.left + ob.width / 2 - cx, ob.top + ob.height / 2 - cy) < 24);
    });
    if (close) issues.push(`small ${Math.round(b.width)}x${Math.round(b.height)} "${name.slice(0, 20)}"`);
  });
  // Table record links: enlarged hit areas never overlap each other. A link scrolled under a sticky column (identifier, actions) is covered
  // by design and comes back into view by scrolling, so only links outside the sticky columns are compared with each other.
  const els = [...document.querySelectorAll('.vt-grid td:not(.col-actions):not(.col-identity) a[href]')].filter(vis);
  const links = els.map(e => e.getBoundingClientRect());
  for (let i = 0; i < links.length; i++) for (let j = i + 1; j < links.length; j++) {
    const a = links[i], b = links[j];
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) issues.push(`overlapping table links "${els[i].textContent}" / "${els[j].textContent}"`);
  }
  return [...new Set(issues)];
});

test.describe('UX-004 Target size', () => {
  test('targets meet 24 × 24 px or the spacing exception, are named, and table links do not overlap (desktop, tablet, phone)', async ({ page }) => {
    test.setTimeout(240_000);
    const routes = ['/', '/clients', '/clients/new', '/cases', '/commitments', '/environments', '/products', '/reporting-center', '/admin/roles', '/admin/settings', '/teams', '/escalations'];
    const failures: string[] = [];
    for (const [w, h] of [[1366, 768], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('#viMainToolbar h1').first()).toBeVisible();
        await page.waitForLoadState('networkidle');
        for (const i of await targetIssues(page)) failures.push(`${w} ${route}: ${i}`);
      }
    }
    expect(failures).toEqual([]);
  });

  test('the client logo picker is one target and one Tab stop', async ({ page }) => {
    await page.goto('/clients/new');
    const upload = page.getByRole('button', { name: 'Upload logo…' });
    await expect(upload).toHaveAccessibleDescription(/PNG, JPG or WebP/);
    await upload.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#client-logo-file')).not.toBeFocused();
    await page.keyboard.press('Tab');
    await expect(upload).toBeFocused();
  });
});

// ---------------------------------------------------------------- coverage ledger --------------------------------------------------------
test.describe('Coverage ledger: routes × audited viewport sizes', () => {
  test('no document-level overflow and a readable current section on list, detail and create routes at the six audited sizes', async ({ page }) => {
    test.setTimeout(900_000);
    const routes = ['/', '/map', '/actions', '/notifications', '/data-quality', '/reporting-center', '/clients', '/projects', '/contracts', '/environments', '/assets',
      '/versions', '/firewall-rules', '/products', '/cases', '/commitments', '/notes', '/escalations', '/teams', '/handovers', '/reassignment',
      '/admin/users', '/admin/roles', '/admin/rights', '/admin/config', '/admin/policies', '/admin/settings', '/admin/audit', '/admin/archived',
      '/clients/new', '/cases/new', '/commitments/new', '/escalations/new', '/environments/new', '/contracts/new', '/products/new'];
    await page.goto('/');
    for (const [list, re] of [['/clients', /^\/clients\/\d+$/], ['/cases', /^\/cases\/\d+$/], ['/environments', /^\/environments\/\d+$/], ['/commitments', /^\/commitments\/\d+$/],
      ['/contracts', /^\/contracts\/\d+$/], ['/products', /^\/products\/\d+$/], ['/assets', /^\/assets\/\d+$/], ['/escalations', /^\/escalations\/\d+$/], ['/teams', /^\/teams\/\d+$/]] as const) {
      await page.goto(list);
      await expect(page.locator('main a[href]').first()).toBeVisible();
      const href = await page.evaluate(src => [...document.querySelectorAll<HTMLAnchorElement>('main a[href]')].map(a => new URL(a.href).pathname).find(p => new RegExp(src).test(p)), re.source);
      if (href) routes.push(href);
    }
    const failures: string[] = [];
    for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [768, 1024], [390, 844], [360, 800]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('#viMainToolbar h1, main h1, .notes, .load-error').first()).toBeVisible();
        // A page that stopped (LoadBoundary) is a failure in its own right, for example a layout feedback loop (React #185).
        if (await page.locator('.load-error').count()) { failures.push(`${route} @ ${w}: page stopped`); continue; }
        const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (over > 0) failures.push(`${route} @ ${w}: document ${over}px wider`);
        // Phones show the section above the page title, or in the header on pages without a main toolbar (Notes).
        const phoneSel = await page.locator('.page-section').count() ? '.page-section' : '.menu-btn-label';
        const sel = w <= 600 ? phoneSel : w <= 900 ? '.menu-btn-label' : 'nav[aria-label="Main"] a[aria-current="page"]';
        if (!(await page.locator(sel).count() && await readable(page, sel))) failures.push(`${route} @ ${w}: current section not readable (${sel})`);
      }
    }
    test.info().annotations.push({ type: 'coverage', description: `${routes.length} routes × 6 sizes` });
    expect(failures).toEqual([]);
  });
});

// ---------------------------------------------------------------- UX-003 ----------------------------------------------------------------
test.describe('UX-003 Loading cost', () => {
  test('the notifications pop-up and the sign-in screens are not part of the first screen; the bell loads its pop-up on demand', async ({ page }) => {
    const scripts = scriptsOf(page);
    await page.goto('/clients');
    await expect(page.getByRole('heading', { level: 1, name: 'Clients' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(scripts.filter(s => /\/(Notifications|SignIn|countries-50m|LeafletMap)-/.test(s))).toEqual([]);
    const bell = page.locator('.bell').getByRole('button').first();
    await bell.click();
    const pop = page.getByRole('dialog', { name: 'Notifications' });
    await expect(pop.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    expect(scripts.some(s => /\/Notifications-/.test(s))).toBe(true);
    // Focus moves to the selected tab; Escape closes and returns focus to the bell.
    await expect(pop.getByRole('tab', { selected: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(pop).toHaveCount(0);
    await expect(bell).toBeFocused();
  });

  test('a page chunk that cannot be downloaded shows a recoverable message inside the shell', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { level: 1, name: 'Clients' })).toBeVisible();
    // The Teams page has not been loaded in this tab; its chunk now fails (connection lost or files replaced by a new release).
    await page.route(/\/assets\/Teams-[^/]+\.js$/, r => r.abort('failed'));
    await page.evaluate(() => { history.pushState({}, '', '/teams'); dispatchEvent(new PopStateEvent('popstate')); });
    const alert = page.getByRole('alert').filter({ hasText: 'could not be downloaded' });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole('button', { name: 'Reload' })).toBeVisible();
    // The shell and its navigation stay usable, and the message clears on the next page.
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await page.evaluate(() => { history.pushState({}, '', '/clients'); dispatchEvent(new PopStateEvent('popstate')); });
    await expect(page.getByRole('heading', { level: 1, name: 'Clients' })).toBeVisible();
    await expect(alert).toHaveCount(0);
    // Reload fetches the files again and the page opens.
    await page.unroute(/\/assets\/Teams-[^/]+\.js$/);
    await page.goto('/teams');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('could not be downloaded')).toHaveCount(0);
  });

  test('cold-load lab measurement of /clients (recorded, not a user-experience claim)', async ({ page, browserName }) => {
    // Lab profile: cache disabled, 1.6 Mbit/s down / 750 kbit/s up / 150 ms RTT (DevTools "Fast 3G"-like) and 4× CPU slowdown, Edge on
    // the local machine against the local server. The numbers are written to test-results/ux-003-cold-load.json for the report; only the
    // download size is asserted, because timings on a developer machine are not a stable budget.
    test.skip(browserName !== 'chromium', 'CDP throttling needs a Chromium browser (Edge)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const bytes = new Map<string, number>();
    cdp.on('Network.loadingFinished', e => bytes.set(e.requestId, e.encodedDataLength));
    const types = new Map<string, string>();
    cdp.on('Network.responseReceived', e => types.set(e.requestId, e.type));
    await page.goto('/clients', { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { level: 1, name: 'Clients' })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 60_000 });
    const encoding = await page.evaluate(async () => {
      const src = (document.querySelector('script[type="module"][src*="/assets/index-"]') as HTMLScriptElement).src;
      return (performance.getEntriesByName(src)[0] as PerformanceResourceTiming | undefined)?.encodedBodySize ?? null;
    });
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
      return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), firstContentfulPaint: fcp ? Math.round(fcp) : null, tableVisible: Math.round(performance.now()) };
    });
    let script = 0, total = 0;
    for (const [id, n] of bytes) { total += n; if (types.get(id) === 'Script') script += n; }
    const result = { profile: 'cache disabled; 1.6 Mbit/s down, 750 kbit/s up, 150 ms RTT; CPU 4x slower; Edge; local server', route: '/clients', transferredBytes: total, scriptBytes: script, entryEncodedBytes: encoding, ...timing };
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/ux-003-cold-load.json', JSON.stringify(result, null, 1));
    await test.info().attach('cold-load', { body: JSON.stringify(result, null, 1), contentType: 'application/json' });
    // The development server sends scripts uncompressed (no response compression; IIS compresses static files in production), so the
    // transfer is close to the minified size: the entry chunk (≤ 900 kB, gui-fixes.spec.ts) plus the Clients page and shared chunks.
    expect(script).toBeGreaterThan(0);
    expect(script).toBeLessThanOrEqual(1_200 * 1000);
  });
});

// ---------------------------------------------------------------- UX-005 ----------------------------------------------------------------
test.describe('UX-005 Contextual guidance', () => {
  test('an access denial says what is needed and where it is granted, without showing the record', async ({ page }) => {
    await page.goto('/');
    await signInWithRole(page, [], []);
    await page.goto('/firewall-rules');
    const denial = page.locator('.state-msg.restricted');
    await expect(denial).toContainText('Firewall rules need the Technical detail right.');
    await expect(denial).toContainText('under Administration › Roles');
    await expect(page.locator('table')).toHaveCount(0);
    await page.goto('/admin/users');
    await expect(page.locator('.state-msg.restricted')).toContainText('This page needs the Administration right.');
    await expect(page.locator('.state-msg.restricted')).toContainText('Administration › Roles');
  });

  test('a server failure offers Try again and the trace ID; retrying recovers once the server answers', async ({ page }) => {
    let fail = true;
    await page.route(/\/api\/v1\/clients(\?|$)/, async r => {
      if (!fail) return r.continue();
      await r.fulfill({ status: 500, contentType: 'application/problem+json', body: JSON.stringify({ title: 'An unexpected error occurred.', status: 500, traceId: '00-ux005trace-01' }) });
    });
    await page.goto('/clients');
    const err = page.locator('.state-msg.error');
    await expect(err).toContainText('An unexpected error occurred.', { timeout: 20_000 });
    await expect(err).toContainText('give the hub administrator the trace ID 00-ux005trace-01');
    fail = false;
    await err.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(err).toHaveCount(0);
  });

  test('a lost connection says so and offers Try again', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { level: 1, name: 'Clients' })).toBeVisible();
    await page.route(/\/api\/v1\/cases(\?|$)/, r => r.abort('internetdisconnected'));
    await page.evaluate(() => { history.pushState({}, '', '/cases'); dispatchEvent(new PopStateEvent('popstate')); });
    const err = page.locator('.state-msg.error');
    await expect(err).toContainText('Check your connection.', { timeout: 20_000 });
    await page.unroute(/\/api\/v1\/cases(\?|$)/);
    await err.getByRole('button', { name: 'Try again' }).click();
    await expect(err).toHaveCount(0);
  });
});
