import { expect, test, type Page } from '@playwright/test';
import { VT_HEADER } from './vtTable';

/* A70: Reporting Center as a first-level section and the Cases Report Builder (preview, saved reports, asynchronous exports, schedules). */

const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const sectionMenu = (page: Page) => page.getByRole('complementary', { name: 'Section menu' });

async function openBuilder(page: Page) {
  const preview = page.waitForResponse(r => r.url().endsWith('/api/v1/reporting/reports/cases/preview') && r.request().method() === 'POST');
  await page.goto('/reporting-center/library');
  await page.getByRole('link', { name: 'Build report: Cases report' }).click();
  await expect(page).toHaveURL(/\/reporting-center\/builder\/cases$/);
  expect((await preview).ok()).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
}

/** Waits for the next preview request and returns its body (the definition the server receives). */
async function nextPreview(page: Page, action: () => Promise<void>) {
  const req = page.waitForRequest(r => r.url().endsWith('/api/v1/reporting/reports/cases/preview') && r.method() === 'POST');
  await action();
  const r = await req;
  const res = await r.response();
  expect(res?.ok(), await res?.text()).toBeTruthy();
  return r.postDataJSON() as { definition: { filters: Record<string, unknown>; columns: string[]; sort: { field: string }[] }; pageSize: number };
}

test.describe('A70 Reporting Center navigation', () => {
  test('is a first-level header section with its own menu, highlighted, and not in the Dashboard menu', async ({ page }) => {
    await page.goto('/');
    const main = page.getByRole('navigation', { name: 'Main' });
    await expect(main.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    const order = await page.locator('.nav-measure [data-key]').allTextContents();
    expect(order.indexOf('Reporting Center')).toBe(order.indexOf('Teams') + 1);
    expect(order.indexOf('Administration')).toBe(order.indexOf('Reporting Center') + 1);
    await expect(sectionMenu(page).getByRole('link', { name: 'Reporting Center' })).toHaveCount(0);
    // A first-level section: in the header, or in the header's More list when the header is too narrow for every section (GUI-10).
    const inHeader = main.locator(':scope > a', { hasText: 'Reporting Center' });
    if (await inHeader.count()) await inHeader.click();
    else { await main.getByRole('button', { name: /^More/ }).click(); await page.locator('#nav-more-list').getByRole('link', { name: 'Reporting Center' }).click(); }
    await expect(page).toHaveURL(/\/reporting-center$/);
    await expect(main.locator('a[aria-current="page"]')).toHaveText('Reporting Center');
    for (const area of ['Overview', 'Report library', 'Cases report builder', 'My reports', 'Scheduled reports', 'Export history', 'Templates'])
      await expect(sectionMenu(page).getByRole('link', { name: area })).toBeVisible();
    await page.screenshot({ path: 'test-results/a70-overview-1600.png', fullPage: true });
    // Deep links keep the section active.
    await page.goto('/reporting-center/templates');
    await expect(main.locator('a[aria-current="page"]')).toHaveText('Reporting Center');
    await expect(sectionMenu(page).getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page');
    // The thirteen catalog reports stay in the library.
    await page.goto('/reporting-center/library');
    await expect(page.locator('.rc-card')).toHaveCount(13);
  });

  test('phones: the drawer lists the Reporting Center with its areas', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/reporting-center/history');
    await page.getByRole('button', { name: 'Menu, current section Reporting Center' }).click();
    const all = page.getByRole('navigation', { name: 'All sections' });
    await expect(all.locator('.drawer-section.current')).toContainText('Reporting Center (current section)');
    await expect(all.getByRole('link', { name: 'Cases report builder' })).toBeVisible();
    await page.screenshot({ path: 'test-results/a70-drawer-390.png' });
    await all.getByRole('link', { name: 'Cases report builder' }).click();
    await expect(page).toHaveURL(/\/builder\/cases$/);
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: 'test-results/a70-builder-390.png', fullPage: true });
  });
});

test.describe('A70 Cases Report Builder', () => {
  test('filters, conditions, columns and paging go to the server and the preview follows them', async ({ page }) => {
    await openBuilder(page);
    let body = await nextPreview(page, () => page.getByRole('button', { name: 'Critical', exact: true }).click());
    expect(body.definition.filters.priorities).toEqual(['Critical']);
    await expect(page.getByLabel('Filters in force')).toContainText('Priority: Critical');
    body = await nextPreview(page, () => page.getByRole('button', { name: 'High', exact: true }).click());
    expect(body.definition.filters.priorities).toEqual(['Critical', 'High']);
    const table = page.getByRole('region', { name: 'Cases report preview' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('link').first()).toHaveAttribute('href', /^\/cases\/\d+$/);

    // Advanced condition: Title contains "e".
    await page.getByText('Advanced conditions').click();
    body = await nextPreview(page, async () => {
      await page.getByRole('button', { name: '+ Condition' }).click();
      const rule = page.locator('.rb-rule').first();
      await rule.getByLabel('Field').selectOption('title');
      await rule.getByLabel('Operator').selectOption('contains');
      await rule.getByLabel('Title value').fill('e');
    });
    expect(body.definition.filters.conditions).toMatchObject({ op: 'and', rules: [{ field: 'title', operator: 'contains', value: 'e' }] });

    // Keyboard reordering of the selected columns: Client moves below Title.
    const list = page.getByRole('list', { name: 'Selected columns in export order' });
    body = await nextPreview(page, async () => {
      await list.getByRole('listitem', { name: /^Client, position 2/ }).focus();
      await page.keyboard.press('Alt+ArrowDown');
    });
    expect(body.definition.columns.slice(0, 3)).toEqual(['caseId', 'title', 'clientCode']);
    await expect(table.locator(VT_HEADER).nth(1)).toContainText('Title');

    body = await nextPreview(page, () => page.getByLabel('Rows per page:').selectOption('50'));
    expect(body.pageSize).toBe(50);
    await page.screenshot({ path: 'test-results/a70-builder-1600.png', fullPage: true });

    // Clear all removes every filter.
    body = await nextPreview(page, () => page.getByLabel('Filters in force').getByRole('button', { name: 'Clear all' }).click());
    expect(body.definition.filters.priorities).toBeUndefined();
  });

  test('save, export Excel and PDF in the background, download, schedule, and find it in My reports and the history', async ({ page }) => {
    await openBuilder(page);
    await nextPreview(page, () => page.getByRole('button', { name: 'Open statuses only' }).click());
    const name = unique('E2E builder report');
    await page.getByRole('button', { name: 'Save configuration' }).click();
    const save = page.getByRole('dialog', { name: 'Save as a new report' });
    await save.getByLabel('Report name').fill(name);
    await save.getByRole('button', { name: 'Save as new' }).click();
    await expect(save).toBeHidden();
    await expect(page).toHaveURL(/\?report=\d+$/);
    await expect(page.getByRole('heading', { name })).toBeVisible();

    // Excel: queued (202), generated by the worker, downloaded through the authorized endpoint.
    await page.getByRole('button', { name: 'Export Excel' }).click();
    const xd = page.getByRole('dialog', { name: 'Export to Excel (.xlsx)' });
    await xd.getByLabel('File name').fill('e2e-open-cases');
    const queued = page.waitForResponse(r => r.url().endsWith('/api/v1/reporting/exports') && r.request().method() === 'POST');
    await xd.getByRole('button', { name: 'Export now' }).click();
    expect((await queued).status()).toBe(202);
    const job = page.locator('.rb-job').first();
    await expect(job).toContainText('Completed', { timeout: 30_000 });
    await expect(job).toContainText('e2e-open-cases.xlsx');
    const [xlsx] = await Promise.all([page.waitForEvent('download'), job.getByRole('button', { name: 'Download' }).click()]);
    expect(xlsx.suggestedFilename()).toBe('e2e-open-cases.xlsx');
    const bytes = await (await import('node:fs/promises')).readFile((await xlsx.path())!);
    expect(bytes.subarray(0, 2).toString()).toBe('PK');

    // PDF summary.
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const pd = page.getByRole('dialog', { name: 'Export to PDF' });
    await pd.getByLabel(/Management summary/).check();
    await pd.getByRole('button', { name: 'Export now' }).click();
    const pdfJob = page.locator('.rb-job').first();
    await expect(pdfJob).toContainText('Completed', { timeout: 30_000 });
    const [pdf] = await Promise.all([page.waitForEvent('download'), pdfJob.getByRole('button', { name: 'Download' }).click()]);
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
    const pdfBytes = await (await import('node:fs/promises')).readFile((await pdf.path())!);
    expect(pdfBytes.subarray(0, 8).toString()).toBe('%PDF-1.4');

    // Schedule the saved report.
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    const sd = page.getByRole('dialog', { name: `Schedule “${name}”` });
    await sd.getByLabel('Frequency').selectOption('Daily');
    await sd.getByLabel('Time', { exact: true }).fill('06:45');
    await sd.getByRole('button', { name: 'Create schedule' }).click();
    await expect(page).toHaveURL(/\/reporting-center\/schedules$/);
    const row = page.locator('tr', { hasText: name });
    await expect(row).toContainText('Daily at 06:45');
    await expect(row).toContainText(`Saved report: ${name}`);

    // My reports: listed, favorite toggles.
    await sectionMenu(page).getByRole('link', { name: 'My reports' }).click();
    const saved = page.locator('tr', { hasText: name });
    await saved.getByRole('button', { name: `Add ${name} to favorites` }).click();
    await expect(saved.getByRole('button', { name: `Remove ${name} from favorites` })).toHaveAttribute('aria-pressed', 'true');
    await expect(saved).toContainText('Private');
    await page.screenshot({ path: 'test-results/a70-my-reports-1600.png', fullPage: true });

    // History: both builder exports with format and status.
    await sectionMenu(page).getByRole('link', { name: 'Export history' }).click();
    const history = page.getByRole('region', { name: 'Export history' });
    await expect(history.locator('tr', { hasText: name }).first()).toContainText('Completed');
    await page.screenshot({ path: 'test-results/a70-history-1600.png', fullPage: true });

    // Clean up: deleting the saved report deletes its schedule after confirmation.
    await sectionMenu(page).getByRole('link', { name: 'My reports' }).click();
    await page.locator('tr', { hasText: name }).getByRole('button', { name: 'Delete' }).click();
    const del = page.getByRole('dialog', { name: 'Delete saved report' });
    await expect(del).toContainText('schedule(s) are deleted as well');
    await del.getByRole('button', { name: 'Delete report' }).click();
    await expect(page.locator('tr', { hasText: name })).toHaveCount(0);
  });

  test('a template opens as an unsaved report with its filters', async ({ page }) => {
    await page.goto('/reporting-center/templates');
    await page.screenshot({ path: 'test-results/a70-templates-1600.png', fullPage: true });
    const req = page.waitForRequest(r => r.url().endsWith('/reporting/reports/cases/preview') && r.method() === 'POST');
    await page.getByRole('link', { name: 'Use template Open critical and high cases' }).click();
    const body = (await req).postDataJSON() as { definition: { filters: { priorities: string[]; statuses: string[] } } };
    expect(body.definition.filters.priorities).toEqual(['Critical', 'High']);
    await expect(page.getByLabel('Filters in force')).toContainText('Priority: Critical, High');
    await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeDisabled();
  });
});
