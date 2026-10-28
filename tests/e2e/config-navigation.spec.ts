import { expect, test, type Page } from '@playwright/test';

// Administration → Configuration navigation: categories, sidebar tree and search, overview cards, breadcrumbs.
// The expected tree mirrors src/web/src/configRegistry.ts; a change there must be made here on purpose.
const TREE: [string, [string, string][]][] = [
  ['Clients & Environments', [['Reported conditions', '/admin/config/reported-conditions'], ['Organization relationship types', '/admin/config/organization-relationship-types'],
    ['Environment types', '/admin/config/environment-types'], ['Responsibility areas', '/admin/config/responsibility-areas'], ['Project team roles', '/admin/config/team-roles']]],
  ['Servers', [['Server types', '/admin/config/server-types'], ['Server roles', '/admin/config/server-roles'], ['Network zones', '/admin/config/network-zones'],
    ['Operating systems', '/admin/config/operating-systems'], ['Project phases', '/admin/config/project-phases']]],
  ['Products & Installations', [['Component roles', '/admin/config/component-roles']]],
  ['Contracts & Cases', [['Contract types', '/admin/config/contract-types'], ['Case types', '/admin/config/case-types'], ['Case statuses', '/admin/config/case-statuses'],
    ['Escalation channels', '/admin/config/escalation-channels'], ['Priority guidance', '/admin/config/priority-guidance']]],
  ['Teams', [['Team member roles', '/admin/config/team-member-roles']]],
  ['System', [['Review policies', '/admin/policies'], ['Jira instances', '/admin/jira'], ['Settings', '/admin/settings']]]
];

async function signIn(page: Page, account = 'DEV\\manager') {
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url: test.info().project.use.baseURL as string }]);
}
const side = (page: Page) => page.locator('aside.side');
const category = (page: Page, name: string) => side(page).getByRole('button', { name, exact: true });
const search = (page: Page) => side(page).getByRole('textbox', { name: 'Search configuration' });
const expandedCategories = (page: Page) => side(page).locator('.cfg-cat[aria-expanded="true"]').allTextContents();

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/config');
  await page.evaluate(() => { sessionStorage.removeItem('tiohub.config-nav'); localStorage.removeItem('tiohub.side-mini'); });
});

test.describe('Configuration navigation', () => {
  test('overview shows six compact category cards that agree with the sidebar', async ({ page }) => {
    await page.goto('/admin/config');
    await expect(page.getByRole('heading', { level: 1, name: 'Configuration' })).toBeVisible();
    const cards = page.getByRole('main').getByRole('list', { name: 'Configuration categories' }).getByRole('listitem');
    await expect(cards).toHaveCount(TREE.length);
    for (const [i, [name, pages]] of TREE.entries()) {
      await expect(cards.nth(i).getByRole('heading', { level: 2 })).toHaveText(name);
      await expect(cards.nth(i)).toContainText(`${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`);
      await expect(category(page, name)).toBeVisible();
    }
    // The sidebar lists the same categories in the same order.
    expect(await side(page).locator('.cfg-cat').allTextContents()).toEqual(TREE.map(([name]) => name));
    // Only the overview is current; no category is open when nothing was opened yet.
    await expect(side(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await expandedCategories(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/config-nav-overview-1600.png' });
    // A card opens its category page, which lists the category's pages.
    await page.getByRole('main').getByRole('link', { name: 'Contracts & Cases', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/config\/category\/contracts-cases$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Contracts & Cases' })).toBeVisible();
    const list = page.getByRole('main').getByRole('list', { name: 'Contracts & Cases pages' });
    await expect(list.getByRole('link')).toHaveText(TREE[3][1].map(([n]) => n));
    await expect(category(page, 'Contracts & Cases')).toHaveAttribute('aria-expanded', 'true');
  });

  test('every configuration page is reachable from its category in the sidebar', async ({ page }) => {
    for (const [cat, pages] of TREE) {
      for (const [name, route] of pages) {
        const button = category(page, cat);
        if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
        await side(page).getByRole('link', { name, exact: true }).click();
        await expect(page, name).toHaveURL(new RegExp(`${route}$`));
        await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
        await expect(side(page).getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
        await expect(category(page, cat)).toHaveAttribute('aria-expanded', 'true');
        const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
        await expect(crumbs).toHaveText(['Administration', 'Configuration', cat, name].join('›'));
        await expect(page.locator('.state-msg.error')).toHaveCount(0);
      }
    }
  });

  test('categories expand and collapse, several stay open, and the state survives navigation, refresh, back and forward', async ({ page }) => {
    const servers = category(page, 'Servers');
    await expect(servers).toHaveAttribute('aria-expanded', 'false');
    await expect(side(page).getByRole('link', { name: 'Network zones', exact: true })).toHaveCount(0);
    // Keyboard: Enter on the focused category opens it.
    await servers.focus();
    await page.keyboard.press('Enter');
    await expect(servers).toHaveAttribute('aria-expanded', 'true');
    await expect(side(page).getByRole('link', { name: 'Network zones', exact: true })).toBeVisible();
    await category(page, 'Teams').click();
    expect(await expandedCategories(page)).toEqual(['Servers', 'Teams']);
    // Opening a page keeps the other groups open and opens the page's group.
    await page.goto('/admin/jira');
    await expect(page.getByRole('heading', { level: 1, name: 'Jira instances' })).toBeVisible();
    expect(await expandedCategories(page)).toEqual(['Servers', 'Teams', 'System']);
    await expect(side(page).getByRole('link', { name: 'Jira instances', exact: true })).toHaveAttribute('aria-current', 'page');
    // Configuration stays the current Administration entry for its System pages.
    await expect(side(page).getByRole('link', { name: 'Configuration', exact: true })).toHaveClass(/active/);
    await category(page, 'Teams').click();
    await expect(category(page, 'Teams')).toHaveAttribute('aria-expanded', 'false');
    await side(page).getByRole('link', { name: 'Server roles', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/config\/server-roles$/);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Server roles' })).toBeVisible();
    expect(await expandedCategories(page)).toEqual(['Servers', 'System']);
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/jira$/);
    await expect(side(page).getByRole('link', { name: 'Jira instances', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.goForward();
    await expect(page).toHaveURL(/\/admin\/config\/server-roles$/);
    await expect(side(page).getByRole('link', { name: 'Server roles', exact: true })).toHaveAttribute('aria-current', 'page');
    // Collapsing a category hides its pages, also the current one.
    await category(page, 'Servers').click();
    await expect(side(page).getByRole('link', { name: 'Server roles', exact: true })).toHaveCount(0);
  });

  test('a direct URL opens the right category and old URLs still work', async ({ page }) => {
    for (const [url, cat, name] of [['/admin/config/escalation-channels', 'Contracts & Cases', 'Escalation channels'], ['/admin/policies', 'System', 'Review policies'],
      ['/admin/network-zones', 'Servers', 'Network zones']] as const) {
      await page.evaluate(() => sessionStorage.removeItem('tiohub.config-nav'));
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
      expect(await expandedCategories(page)).toEqual([cat]);
      await expect(side(page).getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    }
    await page.goto('/admin/reference');
    await expect(page).toHaveURL(/\/admin\/config$/);
    await page.goto('/admin/config/no-such-list');
    await expect(page).toHaveURL(/\/admin\/config$/);
    await page.goto('/admin/config/category/no-such-category');
    await expect(page).toHaveURL(/\/admin\/config$/);
  });

  test('breadcrumbs lead back to the category, the overview and Administration', async ({ page }) => {
    await page.goto('/admin/config/escalation-channels');
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs).toHaveText('Administration›Configuration›Contracts & Cases›Escalation channels');
    await expect(crumbs.getByRole('link')).toHaveText(['Administration', 'Configuration', 'Contracts & Cases']);
    await crumbs.getByRole('link', { name: 'Contracts & Cases' }).click();
    await expect(page).toHaveURL(/\/admin\/config\/category\/contracts-cases$/);
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Configuration' }).click();
    await expect(page).toHaveURL(/\/admin\/config$/);
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Administration' }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
  });

  test('search filters across categories, highlights matches, navigates, and clearing restores the tree', async ({ page }) => {
    await category(page, 'Servers').click();
    await category(page, 'Products & Installations').click();
    const before = await expandedCategories(page);
    await search(page).fill('roles');
    const results = side(page).getByRole('group', { name: 'Configuration search results' });
    await expect(results.getByRole('link')).toHaveCount(5);
    for (const name of ['Organization relationship types', 'Project team roles', 'Server roles', 'Component roles', 'Team member roles'])
      await expect(results.getByRole('link', { name: new RegExp(`^${name}`) })).toBeVisible();
    await expect(results.locator('mark').first()).toHaveText(/roles/i);
    await expect(side(page).locator('.cfg-cat')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/config-nav-search-1600.png' });
    // Descriptions are searched too, across categories.
    await search(page).fill('case');
    await expect(results.getByRole('link', { name: /^Jira instances/ })).toBeVisible();
    // Empty state, then Escape clears and the previous tree comes back.
    await search(page).fill('zzz no such page');
    await expect(side(page).getByText('No configuration page matches “zzz no such page”.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(search(page)).toHaveValue('');
    expect(await expandedCategories(page)).toEqual(before);
    // The clear button does the same.
    await search(page).fill('jira');
    await side(page).getByRole('button', { name: 'Clear configuration search' }).click();
    await expect(search(page)).toBeFocused();
    expect(await expandedCategories(page)).toEqual(before);
    // A result navigates directly; the search is cleared and the page's category opens.
    await search(page).fill('escalation');
    await results.getByRole('link', { name: /^Escalation channels/ }).click();
    await expect(page).toHaveURL(/\/admin\/config\/escalation-channels$/);
    await expect(search(page)).toHaveValue('');
    expect(await expandedCategories(page)).toEqual([...before, 'Contracts & Cases']);
    // Enter opens the first result.
    await search(page).fill('operating');
    await search(page).press('Enter');
    await expect(page).toHaveURL(/\/admin\/config\/operating-systems$/);
  });

  test('users without the Administration right see no configuration navigation', async ({ page }) => {
    await signIn(page, 'DEV\\engineer');
    await page.goto('/admin/config');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0);
    await expect(page.locator('.cfg-nav')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Search configuration' })).toHaveCount(0);
    await expect(page.getByText('This page needs the Administration right.')).toBeVisible();
    for (const url of ['/admin/config/category/system', '/admin/config/escalation-channels']) {
      await page.goto(url);
      await expect(page.getByText('This page needs the Administration right.')).toBeVisible();
      await expect(page.getByRole('main').getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
    }
  });

  test('collapsed sidebar, tablet drawer and phone layout', async ({ page }) => {
    await page.goto('/admin/config/case-types');
    await side(page).getByRole('button', { name: 'Collapse menu' }).click();
    await expect(page.locator('.cfg-nav')).toHaveCount(0);
    await expect(side(page).getByRole('link', { name: 'Configuration' })).toBeVisible();
    await side(page).getByRole('button', { name: 'Expand menu' }).click();
    await expect(category(page, 'Contracts & Cases')).toHaveAttribute('aria-expanded', 'true');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.getByRole('button', { name: /^Menu/ }).click();
    const drawer = page.locator('#hub-drawer');
    await expect(drawer.getByRole('button', { name: 'Contracts & Cases', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await drawer.getByRole('textbox', { name: 'Search configuration' }).fill('zones');
    await drawer.getByRole('link', { name: /^Network zones/ }).click();
    await expect(page).toHaveURL(/\/admin\/config\/network-zones$/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/config');
    await expect(page.getByRole('list', { name: 'Configuration categories' }).getByRole('listitem')).toHaveCount(6);
    const overflow = await page.locator('main').evaluate(m => m.scrollWidth - m.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: 'test-results/config-nav-overview-390.png', fullPage: true });
  });

  test('configuration forms behave as before', async ({ page }) => {
    await page.goto('/admin/config/escalation-channels');
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Add to escalation channels' });
    await expect(dialog.getByLabel('Name', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await page.goto('/admin/config/case-statuses');
    await expect(page.getByRole('button', { name: '+ Add', exact: true })).toHaveCount(0);
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible();
  });
});
