import { expect, test, type Page } from '@playwright/test';
import { startDelete, vtRows, vtTable } from './vtTable';

const api = async <T>(page: Page, path: string) => page.evaluate(async p => (await (await fetch(`/api/v1${p}`)).json()) as T, path);

test.describe('Usability improvements (A102)', () => {
  test('Critical or high opens both priorities, with the same count as the dashboard', async ({ page }) => {
    await page.goto('/?view=all');
    const glance = page.getByRole('region', { name: 'At a glance' });
    const tile = glance.getByRole('link', { name: /Critical or high, open/ });
    const shown = Number(await tile.locator('b').innerText());
    await tile.click();
    await expect(page).toHaveURL(/priority=Critical%2CHigh|priority=Critical,High/);
    await expect(page.getByRole('button', { name: 'Remove filter Priority: Critical or high' })).toBeVisible();
    await expect(page.locator('.table-count')).toHaveText(new RegExp(`^${shown} `));
  });

  test('the client search covers every page, shows the total and survives changing pages', async ({ page }) => {
    await page.goto('/clients?pageSize=2&page=2');
    const total = await api<{ items: { code: string }[]; totalCount: number }>(page, '/clients?pageSize=1');
    const last = await api<{ items: { code: string; name: string }[] }>(page, `/clients?pageSize=1&sort=name&page=${total.totalCount}`);
    const table = vtTable(page, 'Clients');
    const search = table.getByRole('searchbox', { name: 'Search all clients' });
    await search.fill(last.items[0].name);
    await expect(vtRows(table).filter({ hasText: last.items[0].code })).toHaveCount(1);
    await expect(table.locator('.table-count')).toHaveText(/^\d+ match/);
    await expect(page).not.toHaveURL(/page=2/);
    await page.reload();
    await expect(vtTable(page, 'Clients').getByRole('searchbox', { name: 'Search all clients' })).toHaveValue(last.items[0].name);
  });

  test('tickets have one search, and it stays when changing pages', async ({ page }) => {
    await page.goto('/cases?pageSize=2');
    const table = vtTable(page, 'Tickets');
    await expect(table.getByRole('searchbox')).toHaveCount(1);
    await expect(page.getByPlaceholder('Filter this page…')).toHaveCount(0);
    await table.getByRole('searchbox', { name: 'Search all tickets' }).fill('CS-');
    await expect(page).toHaveURL(/q=CS-/);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/q=CS-/);
    await expect(table.getByRole('searchbox', { name: 'Search all tickets' })).toHaveValue('CS-');
  });

  test('specialist filters are under Advanced filters, active ones show and Clear all removes them', async ({ page }) => {
    await page.goto('/cases');
    await expect(page.getByLabel('Jira key')).toHaveCount(0);
    await page.getByRole('button', { name: /^Advanced filters/ }).click();
    await page.getByLabel('Jira key').fill('NO-SUCH-1');
    await expect(page.getByRole('button', { name: 'Advanced filters (1)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove filter Jira key: NO-SUCH-1' })).toBeVisible();
    await expect(page.getByText('No matching records')).toBeVisible();
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page).not.toHaveURL(/jiraKey/);
    await expect(page.getByRole('group', { name: 'Active filters' })).toHaveCount(0);
  });

  test('each quick view count equals the list it opens', async ({ page }) => {
    await page.goto('/cases');
    const views = page.getByRole('group', { name: 'Quick views' });
    await expect(views.getByRole('button', { name: /^All open/ })).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['My tickets', 'Overdue', 'Unassigned', 'Waiting for customer', 'All open']) {
      const view = views.getByRole('button', { name: new RegExp(`^${name}`) });
      await expect(view.locator('b')).toHaveText(/^\d+$/);
      const count = Number(await view.locator('b').innerText());
      await view.click();
      await expect(view).toHaveAttribute('aria-pressed', 'true');
      if (count === 0) await expect(page.getByText('No matching records')).toBeVisible();
      else await expect(page.locator('.table-count')).toHaveText(new RegExp(`^${count} `));
    }
  });

  test('the ticket table fits without sideways scrolling and details expand', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto('/cases');
    const table = vtTable(page, 'Tickets');
    const row = vtRows(table).first();
    await expect(row).toBeVisible();
    for (const col of ['Ticket', 'Priority', 'Status', 'Owner', 'Deadline']) await expect(table.locator('th.vt-th').filter({ hasText: col }).first()).toBeVisible();
    const over = await table.locator('.vt-table-scroll').evaluate(e => e.scrollWidth - e.clientWidth);
    expect(over).toBeLessThanOrEqual(1);
    await expect(table.getByText('Next review')).toHaveCount(0);
    await row.locator('.row-disclose').click();
    await expect(table.getByText('Next review')).toBeVisible();
    await expect(table.getByRole('term').filter({ hasText: 'Contractual SLA' })).toBeVisible();
  });

  test('Delete is in a small actions menu that a click on the row does not open', async ({ page }) => {
    await page.goto('/cases');
    const table = vtTable(page, 'Tickets');
    await expect(table.getByRole('button', { name: /^Delete ticket/ })).toHaveCount(0);
    const toggle = table.getByRole('button', { name: /^Actions for ticket/ }).first();
    await toggle.click();
    await expect(page).toHaveURL(/\/cases$/);
    await page.getByRole('menuitem', { name: /^Delete ticket/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('a ticket leads with activity, next action, owner and SLA; supporting details sit in the details panel', async ({ page }) => {
    await page.goto('/cases');
    await vtRows(page).first().locator('a[href^="/cases/"]').first().click();
    const focus = page.getByRole('region', { name: 'What matters now' });
    for (const heading of ['Latest activity', 'Next action', 'Owner', 'SLA and deadline']) await expect(focus.getByText(heading, { exact: true })).toBeVisible();
    // A106: the details panel replaces the collapsed "Supporting details".
    const details = page.getByRole('complementary', { name: 'Ticket details' });
    await expect(details.getByRole('heading', { name: 'Management summary' })).toBeVisible();
    await expect(details.getByText('Responsible team', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: /^Delete ticket/ })).toBeVisible();
  });

  test('a client leads with its risks, and its pages are grouped into areas', async ({ page }) => {
    const clients = await (async () => { await page.goto('/clients'); return api<{ items: { id: number }[] }>(page, '/clients?q=NTA&pageSize=1'); })();
    await page.goto(`/clients/${clients.items[0].id}`);
    const areas = page.getByRole('navigation', { name: 'Client areas' });
    await expect(areas.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Risks and outstanding work' })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);
    await areas.getByRole('button', { name: 'Commercial' }).click();
    await expect(page.getByRole('tab', { name: 'Contracts & SLAs' })).toBeVisible();
    await areas.getByRole('button', { name: 'Technical' }).click();
    await expect(page.getByRole('tab', { name: 'Regions & environments' })).toBeVisible();
    await areas.getByRole('button', { name: 'Operational' }).click();
    await expect(page.getByRole('tab', { name: 'Tickets' })).toBeVisible();
    await page.goto(`/clients/${clients.items[0].id}?tab=contracts`);
    await expect(areas.getByRole('button', { name: 'Commercial' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('the executive overview puts the summary and urgent work before the figures', async ({ page }) => {
    await page.goto('/?view=all');
    const urgent = page.getByRole('heading', { name: 'Needs immediate attention' });
    const figures = page.getByRole('group', { name: 'Main figures' });
    await expect(urgent).toBeVisible();
    await expect(figures).toBeVisible();
    const a = await urgent.boundingBox();
    const b = await figures.boundingBox();
    expect(a!.y).toBeLessThan(b!.y);
    await expect(page.getByRole('columnheader', { name: 'Next action' })).toBeVisible();
    await expect(page.getByLabel('Team')).toHaveCount(0);
  });

  test('My dashboard has one compact strip and one queue of tickets and commitments', async ({ page }) => {
    await page.goto('/my-dashboard');
    const strip = page.getByRole('region', { name: 'My work now' });
    await expect(strip.getByRole('link', { name: /critical or high/ })).toHaveAttribute('href', /priority=Critical%2CHigh/);
    const box = await strip.boundingBox();
    expect(box!.height).toBeLessThan(90);
    await expect(page.getByRole('columnheader', { name: 'Next step' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'My commitments' })).toHaveCount(0);
  });

  test('startDelete works on a page and in a row', async ({ page }) => {
    await page.goto('/cases');
    await startDelete(vtTable(page, 'Tickets'), /ticket/);
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
