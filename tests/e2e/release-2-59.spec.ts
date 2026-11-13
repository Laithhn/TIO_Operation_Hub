import { expect, test, type Page } from '@playwright/test';

const unique = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

async function confirmDialog(page: Page, button: string) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('I confirm this action.').check();
  await dialog.getByRole('button', { name: button }).click();
  await expect(dialog).toBeHidden();
}

// The default development user is the TIO Manager, who holds every right.
test.describe('Audience dashboards (A108, A109)', () => {
  test('operational, SLA & contracts, management and client dashboards; a client status is recorded', async ({ page }) => {
    // Operational: as of now, with the work queue, the environment board and the caller's hygiene list.
    await page.goto('/dashboards/operational?view=all');
    await expect(page.getByRole('heading', { level: 1, name: 'Operational dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Open tickets: \d+/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Work queue — what runs out first' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Production environment condition' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hygiene — mine' })).toBeVisible();
    const side = page.getByRole('complementary', { name: 'Section menu' });
    await expect(side.getByRole('link', { name: 'Operational' })).toBeVisible();
    await page.getByRole('button', { name: 'My work' }).click();
    await expect(page.getByRole('link', { name: /^My open tickets: \d+/ })).toBeVisible();

    // SLA & Contracts.
    await side.getByRole('link', { name: 'SLA & Contracts' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'SLA & Contracts dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Compliance by contract' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contract lifecycle' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Renewal & notice watchlist' })).toBeVisible();

    // Management: the portfolio lists clients and links to the client dashboard.
    await side.getByRole('link', { name: 'Management' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Management dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Data trust' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Client portfolio' })).toBeVisible();
    await page.getByRole('link', { name: 'DEMO-NTA', exact: true }).first().click();
    await expect(page).toHaveURL(/dashboards\/client\?clientId=\d+/);

    // Client 360 (A113): the seven numbered sections for the selected years; the recorded status and its signals one click away; recording needs a reason and a confirmation.
    await expect(page.getByRole('heading', { level: 1, name: 'Client 360' })).toBeVisible();
    for (const name of ['Projects', 'Contracts', 'Payments', 'SLA', 'Tickets', 'Escalations', 'Commitments'])
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^1\\.\\d\\s*${name}$`) })).toBeVisible();
    await expect(page.getByRole('link', { name: /DEMO-NTA-OPS/ }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Signals behind the status' }).click();
    await expect(page.getByRole('heading', { name: 'Signals behind the status' })).toBeVisible();
    await expect(page.locator('.ad-signal')).toHaveCount(7);
    const reason = unique('Milestone slipped; vendor patch pending');
    await page.getByRole('button', { name: 'Update status' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Status', { exact: true }).selectOption('AtRisk');
    await dialog.getByLabel(/^Reason/).fill(reason);
    await confirmDialog(page, 'Record status');
    const verdict = page.getByRole('region', { name: 'Client status' });
    await expect(verdict.locator('.ad-verdict-st')).toContainText('At risk');
    await expect(page.getByText(reason)).toBeVisible();
    // Years: several can be ticked together; the address and every section follow them.
    await page.getByRole('button', { name: /^Years/ }).click();
    const years = page.getByRole('group', { name: 'Choose years' });
    const thisYear = new Date().getFullYear();
    await years.getByRole('checkbox', { name: String(thisYear - 1) }).check();
    await expect(page).toHaveURL(new RegExp(`years=${thisYear - 1}%2C${thisYear}`));
    await expect(page.getByText(`Paid / due dates in ${thisYear - 1}–${thisYear}`)).toBeVisible();
    await page.keyboard.press('Escape');
    await page.screenshot({ path: 'test-results/visual-client-dashboard-1600.png', fullPage: true });
    // The ticket count on the page opens the list with the same client filter.
    await page.locator('#c360-tickets').getByRole('link', { name: 'Open the list' }).click();
    await expect(page).toHaveURL(/\/cases\?.*clientId=\d+/);

    // The 2.59.0 address of the Project dashboard opens Client 360.
    await page.goto('/dashboards/project');
    await expect(page).toHaveURL(/dashboards\/client/);
    await expect(page.getByRole('heading', { level: 1, name: 'Client 360' })).toBeVisible();
  });
});
