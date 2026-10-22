import { expect, test, type Page } from '@playwright/test';

const unique = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

async function signInAs(page: Page, account: string) {
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url: 'http://localhost:5096' }]);
}

async function confirmDialog(page: Page, button: string) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('I confirm this action.').check();
  await dialog.getByRole('button', { name: button }).click();
  await expect(dialog).toBeHidden();
}

test.describe('Shell and visual language', () => {
  test('header tabs, sidebar with active dot, title strip, table with filter row, pager and status bar', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1, name: 'Clients' })).toBeVisible();
    await expect(page.getByPlaceholder('Search by name or alias')).toBeVisible();
    await expect(page.getByText(/Records :- \d+ OF \d+/)).toBeVisible();
    await expect(page.locator('footer.status')).toContainText('User : DEV\\manager');
    const hdr = await page.locator('header.hdr').evaluate(e => getComputedStyle(e).backgroundColor);
    expect(hdr).toBe('rgb(12, 27, 55)');
    const active = await page.locator('.topnav a[aria-current="page"]').evaluate(e => getComputedStyle(e).backgroundColor);
    expect(active).toBe('rgb(245, 245, 246)');
    await page.screenshot({ path: 'test-results/visual-clients-1600.png' });
    await page.goto('/');
    await page.screenshot({ path: 'test-results/visual-dashboard-1600.png' });
    await page.goto('/environments/1');
    await expect(page.getByText('Condition and freshness (separately scoped)')).toBeVisible();
    // Environments live under Clients: no Environments tab, Clients stays the active section.
    const main = page.getByRole('navigation', { name: 'Main' });
    await expect(main.getByRole('link', { name: 'Environments' })).toHaveCount(0);
    await expect(main.getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Clients' })).toBeVisible();
    // Cases and commitments are separate sections.
    await main.getByRole('link', { name: 'Commitments' }).click();
    await expect(main.getByRole('link', { name: 'Commitments' })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('aside.side').getByRole('link', { name: 'All cases' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/visual-environment-1600.png' });
  });

  test('keyboard: skip link first, "/" search palette, Escape closes, visible focus', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { level: 1, name: 'Clients' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    const outline = await page.getByRole('link', { name: 'Skip to content' }).evaluate(e => getComputedStyle(e).outlineStyle);
    expect(outline).not.toBe('none');
    await page.locator('body').click({ position: { x: 600, y: 600 } });
    await page.keyboard.press('/');
    const search = page.getByRole('dialog', { name: 'Search' });
    await expect(search).toBeVisible();
    await page.keyboard.type('DEMO-HCP');
    await expect(search.getByRole('option').first()).toContainText('DEMO-HCP');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/clients\/\d+/);
    await page.getByRole('button', { name: /Search/ }).click();
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeHidden();
  });

  test('tablet layout: section menu becomes a drawer', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1100 });
    await page.goto('/cases');
    const side = page.locator('aside.side');
    await expect(page.getByRole('button', { name: 'Open section menu' })).toBeVisible();
    const box = await side.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Open section menu' }).click();
    await expect(side.getByRole('link', { name: 'All cases', exact: true })).toBeInViewport();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/visual-cases-tablet.png' });
  });
});

test.describe('Business journeys', () => {
  test('create a client without regions and add a direct environment', async ({ page }) => {
    const code = unique('E2E');
    await page.goto('/clients/new');
    await page.getByRole('button', { name: 'Save client' }).click();
    await expect(page.getByText('Enter the client name.')).toBeVisible();
    await page.getByLabel('Client alias').fill(code);
    await page.getByLabel('Client name').fill('E2E Fictional Authority');
    // Status offers only Opportunity and Active; the country comes from the world list.
    await expect(page.getByLabel('Status').locator('option')).toHaveText(['Opportunity', 'Active']);
    await page.getByRole('button', { name: 'Save client' }).click();
    // Values are kept after validation errors; errors appear beside the fields.
    await expect(page.getByLabel('Client alias')).toHaveValue(code);
    await expect(page.getByText('Select the country.')).toBeVisible();
    await expect(page.getByText(/Select the project manager/)).toBeVisible();
    await page.getByLabel('Country').selectOption('Oman');
    await page.getByLabel('Project manager').selectOption({ label: 'Mara Okafor (demo manager)' });
    await expect(page.getByLabel('Responsible party')).toHaveCount(0);
    await page.getByRole('button', { name: 'Save client' }).click();
    await expect(page).toHaveURL(/\/clients\/\d+$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Fictional Authority');
    await expect(page.getByText('Direct', { exact: false }).first()).toBeVisible();

    await page.getByRole('button', { name: '+ Add' }).click();
    await page.getByRole('menuitem', { name: 'Environment' }).click();
    await expect(page.getByLabel('Region', { exact: true })).toContainText('This client has no regions (valid)');
    await expect(page.getByLabel('Hosting').locator('option')).toHaveText(['On-prem', 'Cloud', 'Unknown']);
    await page.getByLabel('Environment name').fill('Production');
    await page.getByLabel('Type', { exact: true }).selectOption('Production');
    await page.getByLabel('Technical owner').selectOption({ label: 'Mara Okafor (demo manager)' });
    await page.getByLabel('Hosting').selectOption('On-prem');
    // Operation engineer and backup operation engineer are optional.
    await page.getByRole('button', { name: 'Save environment' }).click();
    await expect(page).toHaveURL(/\/environments\/\d+$/);
    await expect(page.getByText('Direct under client')).toBeVisible();
    await expect(page.getByText('None (coverage gap)')).toBeVisible();
  });

  test('a client with regions cannot have an environment outside them', async ({ page }) => {
    await page.goto('/environments/new');
    await page.getByLabel('Client', { exact: true }).selectOption({ label: 'DEMO-NTA · Northwind Transit Authority (fictional)' });
    await expect(page.getByLabel('Region', { exact: true })).toContainText('Select the region');
    await page.getByLabel('Environment name').fill(unique('Lab'));
    await page.getByLabel('Type', { exact: true }).selectOption('Test');
    await page.getByRole('button', { name: 'Save environment' }).click();
    await expect(page.getByText('This client has regions: select the region of this environment.')).toBeVisible();
  });

  test('case lifecycle through the UI: create, triage, assign, start', async ({ page }) => {
    await page.goto('/cases/new');
    await page.getByLabel('Title').fill('E2E import service stopped');
    await page.getByLabel('Case type').selectOption('Incident');
    await page.getByLabel('Client', { exact: true }).selectOption({ label: 'DEMO-NTA · Northwind Transit Authority (fictional)' });
    await page.getByLabel('Responsible team').selectOption({ label: 'TIO Operations' });
    await page.getByLabel('Impact summary').fill('Imports delayed for R1');
    await page.getByLabel('Next action').fill('Check worker logs');
    await page.getByRole('button', { name: 'Create case' }).click();
    await expect(page).toHaveURL(/\/cases\/\d+$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E import service stopped');

    await page.getByRole('button', { name: 'Triage' }).click();
    await confirmDialog(page, 'Confirm triage');
    await expect(page.getByText('Unassigned: an active owner is required before work can start.')).toBeVisible();
    await page.getByRole('button', { name: 'Start work' }).click();
    await page.getByRole('dialog').getByLabel('I confirm this action.').check();
    await page.getByRole('dialog').getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('dialog').getByText(/active owner is required/)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Assign' }).click();
    await page.getByRole('dialog').getByLabel('Owner', { exact: true }).selectOption({ label: 'Esra Demir (demo engineer)' });
    await confirmDialog(page, 'Assign');
    await page.getByRole('button', { name: 'Start work' }).click();
    await confirmDialog(page, 'Start');
    await expect(page.locator('.page-head .sub')).toContainText('In progress');
    await page.getByRole('tab', { name: 'Timeline' }).click();
    await expect(page.getByText('Owner changed')).toBeVisible();
  });

  test('unsaved edits are protected and a stale save keeps the draft', async ({ page, browser }) => {
    const draft = unique('Harbour City Police draft');
    await page.goto('/clients/2/edit');
    await expect(page.getByLabel('Client name')).not.toHaveValue('');
    await page.getByLabel('Client name').fill(draft);
    page.once('dialog', d => d.dismiss());
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cases', exact: true }).click();
    await expect(page).toHaveURL(/\/clients\/2\/edit/);

    // Another user saves first.
    const other = await browser.newContext({ baseURL: 'http://localhost:5096', channel: 'msedge' } as never);
    await other.addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent('DEV\\lead'), url: 'http://localhost:5096' }]);
    const p2 = await other.newPage();
    await p2.goto('/clients/2/edit');
    await expect(p2.getByLabel('Client name')).not.toHaveValue('');
    // A real change by the other user: switch the country to one different from the current value.
    const current = await p2.getByLabel('Country').inputValue();
    await p2.getByLabel('Country').selectOption(current === 'Qatar' ? 'Kuwait' : 'Qatar');
    await p2.getByRole('button', { name: 'Save client' }).click();
    await expect(p2).toHaveURL(/\/clients\/2$/);
    await other.close();

    await page.getByRole('button', { name: 'Save client' }).click();
    await expect(page.getByText('Someone else saved this record while you were editing.')).toBeVisible();
    await expect(page.getByLabel('Client name')).toHaveValue(draft);
    await expect(page.getByRole('button', { name: 'Reload latest' })).toBeVisible();
  });
});

test.describe('Sub-clients and copying between regions', () => {
  test('a main client gets a sub-client with its own project team', async ({ page }) => {
    const alias = unique('TRF').replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    await page.goto('/clients?q=DEMO-NTA');
    await page.getByRole('link', { name: 'DEMO-NTA', exact: true }).click();
    await page.getByRole('button', { name: '+ Add' }).click();
    await page.getByRole('menuitem', { name: 'Sub-client' }).click();
    // The main client is preselected and its country suggested.
    await expect(page.getByLabel('Main client')).toHaveValue(/\d+/);
    await expect(page.getByLabel('Country')).not.toHaveValue('');
    await page.getByLabel('Client alias').fill(alias);
    await page.getByLabel('Client name').fill('Traffic Department (fictional)');
    await page.getByLabel('Status').selectOption('Active');
    await page.getByLabel('Project manager').selectOption({ label: 'Mara Okafor (demo manager)' });
    await page.getByRole('button', { name: '+ Team member' }).click();
    await page.getByLabel('Team member 1', { exact: true }).selectOption({ label: 'Leon Brandt (demo lead)' });
    // The role is a dropdown of the configured project team roles.
    const role = page.getByLabel('Team member 1 role');
    await expect(role).toHaveValue('Operation engineer');
    await role.selectOption('DevOps engineer');
    await role.selectOption('Operation engineer');
    await page.getByRole('button', { name: 'Save client' }).click();
    await expect(page).toHaveURL(/\/clients\/\d+$/);
    await expect(page.getByText(/sub-client of Northwind Transit Authority/)).toBeVisible();
    await expect(page.locator('section.panel', { has: page.getByRole('heading', { name: 'Management' }) })).toContainText('Leon Brandt (demo lead) · Operation engineer');
    // The main client lists it.
    await page.getByRole('link', { name: 'DEMO-NTA', exact: true }).first().click();
    const subs = page.locator('section.panel', { has: page.getByRole('heading', { name: /Sub-clients/ }) });
    await expect(subs.getByRole('row', { name: new RegExp(alias) })).toContainText('Mara Okafor');
    await page.screenshot({ path: 'test-results/visual-subclients-1600.png', fullPage: true });
    await page.goto(`/clients?q=${alias}`);
    await expect(page.getByRole('row').filter({ has: page.getByRole('link', { name: alias, exact: true }) })).toContainText('Sub-client of DEMO-NTA');
  });

  test('copy a server from region R1 to region R2', async ({ page }) => {
    const tag = unique('X').replace(/[^A-Za-z0-9]/g, '').slice(-5).toLowerCase();
    await page.goto('/');
    const env = await page.evaluate(async () => {
      const r = await fetch('/api/v1/installations?q=PSOP%20Main&pageSize=50', { credentials: 'same-origin' }).then(x => x.json());
      return r.items.find((i: { clientCode: string; regionCode?: string; environmentName: string }) => i.clientCode === 'DEMO-NTA' && i.regionCode === 'R1' && i.environmentName === 'Production').environmentId;
    });
    await page.goto(`/environments/${env}`);
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Copy servers or environment…' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('An existing environment').check();
    await expect(dlg.getByLabel('nta-r1-db01')).not.toBeChecked();
    await dlg.getByLabel('nta-r1-app01').check();
    await dlg.getByLabel('R2 / Production', { exact: true }).check();
    // The region rename is suggested; narrow it to this server for a unique name.
    await expect(dlg.getByLabel('Find in names for R2 / Production')).toHaveValue('R1');
    await expect(dlg.getByLabel('Replace with for R2 / Production')).toHaveValue('R2');
    await dlg.getByLabel('Find in names for R2 / Production').fill('r1-app01');
    await dlg.getByLabel('Replace with for R2 / Production').fill(`r2-cp${tag}`);
    await expect(dlg).toContainText(`nta-r2-cp${tag}`);
    await page.screenshot({ path: 'test-results/visual-copy-dialog-1600.png' });
    await dlg.getByRole('button', { name: 'Copy', exact: true }).click();
    // Straight to the target environment, or first a list of notes to check.
    const open = page.getByRole('button', { name: 'Open target environment' });
    const r2 = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'R2', exact: true });
    await expect(r2.or(open)).toBeVisible();
    if (await open.isVisible()) await open.click();
    await expect(r2).toBeVisible();
    await page.getByRole('tab', { name: /Servers & assets/ }).click();
    await page.getByRole('link', { name: `nta-r2-cp${tag}` }).click();
    await expect(page.getByText('Planned').first()).toBeVisible();
  });

  test('copy a server into several environments at once, in other regions and next to itself', async ({ page }) => {
    const tag = unique('X').replace(/[^A-Za-z0-9]/g, '').slice(-4).toLowerCase();
    await page.goto('/');
    const env = await page.evaluate(async () => {
      const r = await fetch('/api/v1/installations?q=PSOP%20Main&pageSize=50', { credentials: 'same-origin' }).then(x => x.json());
      return r.items.find((i: { clientCode: string; regionCode?: string; environmentName: string }) => i.clientCode === 'DEMO-NTA' && i.regionCode === 'R1' && i.environmentName === 'Production').environmentId;
    });
    await page.goto(`/assets?environmentId=${env}&q=nta-r1-web01`);
    await page.getByRole('link', { name: 'nta-r1-web01', exact: true }).click();
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Copy to other environments…' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByLabel('nta-r1-web01')).toBeChecked();
    // Its own environment (a duplicate) and the other region's Production, in one go.
    await dlg.getByLabel('R1 / Production (this environment)').check();
    await dlg.getByLabel('R2 / Production', { exact: true }).check();
    await expect(dlg.getByLabel('Find in names for R1 / Production (this environment)')).toHaveValue(/^web\d+$/);
    await dlg.getByLabel('Find in names for R1 / Production (this environment)').fill('web01');
    await dlg.getByLabel('Replace with for R1 / Production (this environment)').fill(`web${tag}`);
    await dlg.getByLabel('Find in names for R2 / Production').fill('r1-web01');
    await dlg.getByLabel('Replace with for R2 / Production').fill(`r2-w${tag}`);
    await expect(dlg).toContainText(`nta-r1-web${tag}`);
    await expect(dlg).toContainText(`nta-r2-w${tag}`);
    await page.screenshot({ path: 'test-results/visual-copy-many-1600.png' });
    await dlg.getByRole('button', { name: 'Copy to 2 environments' }).click();
    // Done when the copy dialog has gone (or shows the notes to check).
    await expect(page.getByRole('dialog', { name: 'Copy to other environments' })).toBeHidden();
    const close = page.getByRole('dialog').getByRole('button', { name: 'Close' });
    if (await close.isVisible()) await close.click();
    const names = await page.evaluate(async (t) => {
      const r = await fetch(`/api/v1/assets?q=${t}&pageSize=50`, { credentials: 'same-origin' }).then(x => x.json());
      return r.items.map((a: { name: string; regionCode?: string }) => `${a.regionCode}:${a.name}`).sort();
    }, tag);
    expect(names).toEqual([`R1:nta-r1-web${tag}`, `R2:nta-r2-w${tag}`]);
  });

  test('copy a whole environment from region R1 into region R2', async ({ page }) => {
    const tag = unique('X').replace(/[^A-Za-z0-9]/g, '').slice(-5).toLowerCase();
    await page.goto('/');
    const env = await page.evaluate(async () => {
      const r = await fetch('/api/v1/installations?q=PSOP%20Main&pageSize=50', { credentials: 'same-origin' }).then(x => x.json());
      return r.items.find((i: { clientCode: string; regionCode?: string; environmentName: string }) => i.clientCode === 'DEMO-NTA' && i.regionCode === 'R1' && i.environmentName === 'Production').environmentId;
    });
    await page.goto(`/environments/${env}`);
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Copy servers or environment…' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('heading', { name: 'Copy environment to another region' })).toBeVisible();
    await expect(dlg.getByLabel('A new environment (copy the whole environment)')).toBeChecked();
    // Everything is preselected.
    await expect(dlg.getByLabel('nta-r1-app01')).toBeChecked();
    await expect(dlg.getByLabel('nta-r1-db01')).toBeChecked();
    await dlg.getByLabel('Region of the new environment').selectOption({ label: 'R2 · R2 Coast' });
    await expect(dlg.getByLabel('Find in names')).toHaveValue('R1');
    await dlg.getByLabel('Name of the new environment').fill(`Prod ${tag}`);
    await dlg.getByLabel('Replace with').fill(`R2${tag}`);
    await expect(dlg).toContainText(`nta-r2${tag}-db01`);
    await page.screenshot({ path: 'test-results/visual-copy-environment-1600.png' });
    await dlg.getByRole('button', { name: 'Copy', exact: true }).click();
    const open = page.getByRole('button', { name: 'Open target environment' });
    const heading = page.getByRole('heading', { level: 1, name: `Prod ${tag}` });
    await expect(heading.or(open)).toBeVisible();
    if (await open.isVisible()) await open.click();
    await expect(heading).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'R2', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: /Servers & assets/ }).click();
    await expect(page.getByRole('link', { name: `nta-r2${tag}-db01` })).toBeVisible();
  });
});

test.describe('Projects and contracts', () => {
  test('a project holds its contracts: record one with SLA targets and see renewal follow-up', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { level: 1, name: 'Projects & contracts' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('row', { name: /DEMO-NTA-OPS/ })).toContainText('need renewal attention');

    // The contract register is the second view of the same area.
    await page.getByRole('tab', { name: 'Contract register' }).click();
    await expect(page).toHaveURL(/\/contracts$/);
    await page.getByLabel('Search contracts').fill('NTA support');
    const ntaRow = page.getByRole('row', { name: /NTA support and maintenance agreement/ });
    await expect(ntaRow.getByText('Renewal due')).toBeVisible();
    await expect(ntaRow.getByRole('link', { name: 'DEMO-NTA-OPS' })).toBeVisible();

    // Open the project and add a contract to it.
    await page.getByRole('tab', { name: 'Projects' }).click();
    await page.getByRole('link', { name: 'HCP rollout' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('DEMO-HCP-RO');
    const contracts = page.locator('section.panel', { has: page.getByRole('heading', { name: 'Contracts & SLAs' }) });
    await expect(contracts.getByRole('row', { name: /HCP rollout support/ })).toContainText('Critical: 1 h / 8 h');
    await page.getByRole('link', { name: '+ Contract' }).click();
    const title = unique('E2E support contract');
    await expect(page.getByLabel('Project')).toHaveValue(/\d+/);
    await expect(page.getByText(/Client DEMO-HCP · covered products: ViTIS/)).toBeVisible();
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByLabel('Status').selectOption('Active');
    await page.getByLabel('Contract owner').selectOption({ label: 'Leon Brandt (demo lead)' });
    await page.getByLabel('Support model').selectOption('Remote');
    await page.getByRole('button', { name: '+ Target' }).click();
    await page.getByLabel('Row 1 response target').fill('1');
    await page.getByLabel('Row 1 resolution target').fill('0.5');
    await page.getByRole('button', { name: 'Save contract' }).click();
    // Errors stay on the form; values are kept.
    await expect(page.getByText(/resolution cannot be shorter than response/)).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveValue(title);
    await page.getByLabel('Row 1 resolution target').fill('4');
    await page.getByRole('button', { name: 'Save contract' }).click();
    await expect(page).toHaveURL(/\/contracts\/\d+$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    await expect(page.getByText('End date unknown').first()).toBeVisible();
    const sla = page.locator('section.panel', { has: page.getByRole('heading', { name: 'SLA targets (recorded)' }) });
    await expect(sla.getByRole('row', { name: /Critical\s+1 h\s+4 h/ })).toBeVisible();
    await expect(sla).toContainText('does not measure');
    await expect(page.locator('section.panel', { has: page.getByRole('heading', { name: 'Covered products (from the project)' }) })).toContainText('ViTIS');
    await page.screenshot({ path: 'test-results/visual-contract-1600.png', fullPage: true });

    // Back on the project: the new contract is listed with its renewal state and SLA targets.
    await page.getByRole('link', { name: 'DEMO-HCP-RO', exact: true }).click();
    // Earlier runs add contracts here; the table pages at 25 rows, so narrow it first.
    await contracts.getByLabel('Filter rows').fill(title);
    const added = contracts.getByRole('row', { name: new RegExp(title) });
    await expect(added).toContainText('End date unknown');
    await expect(added).toContainText('Critical: 1 h / 4 h');
    await page.screenshot({ path: 'test-results/visual-project-1600.png', fullPage: true });
  });
});

test.describe('Ease of use', () => {
  test('rows open their record, quick create and search from the header', async ({ page }) => {
    await page.goto('/clients?q=DEMO-NTA');
    // A click anywhere on the row (not only on the link) opens the client.
    await page.getByRole('row').filter({ has: page.getByRole('link', { name: 'DEMO-NTA', exact: true }) }).getByRole('cell').nth(2).click();
    await expect(page).toHaveURL(/\/clients\/\d+$/);
    await page.getByRole('button', { name: '+ New' }).click();
    await expect(page.getByRole('menuitem', { name: 'Case' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.getByRole('button', { name: /Search/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Configuration', () => {
  test('each list has its own page; a new server type is offered and counted by its category', async ({ page }) => {
    const name = unique('Container host');
    await page.goto('/admin/config');
    await expect(page.getByRole('heading', { level: 1, name: 'Configuration' })).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'Server types' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Server types' })).toBeVisible();
    await expect(page.getByRole('row', { name: /Virtual machine \(VM\)/ })).toBeVisible();
    await page.getByRole('button', { name: '+ Add' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Name').fill(name);
    await dlg.getByLabel('Behaves as').selectOption({ label: 'Physical server — Counted as a physical server' });
    await dlg.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dlg).toBeHidden();
    await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('Physical server');
    await page.screenshot({ path: 'test-results/visual-config-server-types-1600.png', fullPage: true });
    // The old single page now leads to the overview.
    await page.goto('/admin/reference');
    await expect(page).toHaveURL(/\/admin\/config$/);

    // The server form offers it, and the server shows it.
    await page.goto('/');
    const env = await page.evaluate(async () => {
      const r = await fetch('/api/v1/installations?q=PSOP%20Main&pageSize=50', { credentials: 'same-origin' }).then(x => x.json());
      return r.items.find((i: { clientCode: string; regionCode?: string; environmentName: string }) => i.clientCode === 'DEMO-NTA' && i.regionCode === 'R1' && i.environmentName === 'Production').environmentId;
    });
    await page.goto(`/environments/${env}`);
    await page.getByRole('button', { name: '+ Add' }).click();
    await page.getByRole('menuitem', { name: 'Server' }).click();
    const form = page.getByRole('dialog');
    const server = unique('ch').toLowerCase().replace(/[^a-z0-9-]/g, '');
    await form.getByLabel('Server name').fill(server);
    await form.getByLabel('Type', { exact: true }).selectOption({ label: name });
    await form.getByLabel('Technical owner', { exact: true }).selectOption({ label: 'Mara Okafor (demo manager)' });
    await form.getByRole('button', { name: 'Add server' }).click();
    await expect(form).toBeHidden();
    await page.getByRole('tab', { name: /Servers & assets/ }).click();
    await expect(page.getByRole('row', { name: new RegExp(server) })).toContainText(name);
  });
});

test.describe('Regions', () => {
  test('create an environment from the region page', async ({ page }) => {
    const name = unique('Lab');
    await page.goto('/clients?q=DEMO-NTA');
    await page.getByRole('link', { name: 'DEMO-NTA', exact: true }).click();
    await page.getByRole('link', { name: 'R2 · R2 Coast' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'R2 · R2 Coast' })).toBeVisible();
    await page.locator('section.panel', { has: page.getByRole('heading', { name: 'Environments in this region' }) }).getByRole('link', { name: '+ Environment in R2' }).click();
    // Client and region are already chosen.
    await expect(page.getByLabel('Region')).toHaveValue(/\d+/);
    await page.getByLabel('Environment name').fill(name);
    await page.getByLabel('Type', { exact: true }).selectOption('Test');
    await page.getByLabel('Criticality').selectOption('Normal');
    await page.getByRole('button', { name: /Save/ }).click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'R2', exact: true })).toBeVisible();
  });
});

test.describe('Access (roles and rights)', () => {
  test('TIO Manager sees Administration with a single Role choice', async ({ page }) => {
    await page.goto('/admin/users');
    const main = page.getByRole('navigation', { name: 'Main' });
    await expect(main.getByRole('link', { name: 'Administration' })).toBeVisible();
    await page.getByRole('button', { name: '+ New User' }).click();
    await expect(page.getByLabel('Role')).toBeVisible();
    // Built-in roles first; roles added under Roles & rights follow.
    const options = page.getByLabel('Role').locator('option');
    await expect(options.nth(0)).toHaveText('— Select —');
    await expect(options.nth(1)).toHaveText('TIO Manager');
    await expect(options.nth(2)).toHaveText('Operation Engineer');
    await expect(page.getByText('Scope grants')).toHaveCount(0);
  });

  test('TIO Manager adds a role on the Roles page and sets its rights on the Rights page', async ({ page }) => {
    const name = unique('Viewer');
    await page.goto('/admin/roles');
    await expect(page.getByRole('heading', { level: 1, name: 'Roles' })).toBeVisible();
    await page.getByRole('button', { name: '+ New role' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Role name').fill(name);
    await dlg.getByRole('button', { name: 'Save role' }).click();
    // A new role is taken to the Rights page, where each tick saves at once.
    await expect(page).toHaveURL(/\/admin\/rights$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Rights' })).toBeVisible();
    const edit = page.getByLabel(`Edit records for ${name}`);
    const history = page.getByLabel(`Change history for ${name}`);
    await expect(edit).toBeChecked();
    await edit.uncheck();
    await expect(page.getByText(`${name}: Edit records removed.`)).toBeVisible();
    await history.check();
    await expect(page.getByText(`${name}: Change history granted.`)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(`Edit records for ${name}`)).not.toBeChecked();
    await expect(page.getByLabel(`Change history for ${name}`)).toBeChecked();
    // The TIO Manager role cannot lose a right.
    await expect(page.getByLabel('Administration for TIO Manager')).toBeDisabled();
    await page.screenshot({ path: 'test-results/visual-rights-1600.png', fullPage: true });
    // The Roles page lists it with its rights; an unused role is deleted there.
    await page.goto('/admin/roles');
    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row).toContainText('Change history');
    await row.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete role' }).click();
    await expect(page.getByRole('row', { name: new RegExp(name) })).toHaveCount(0);
  });

  test('Operation Engineer works on all clients but has no Administration or client creation', async ({ page }) => {
    await signInAs(page, 'DEV\\engineer2');
    await page.goto('/clients');
    await expect(page.getByText(/Records :- \d+ OF ([3-9]|\d\d)/)).toBeVisible();
    await expect(page.getByRole('link', { name: '+ New Client' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Administration' })).toHaveCount(0);
    await page.goto('/environments');
    await expect(page.getByRole('link', { name: '+ New Environment' })).toBeVisible();
    await page.goto('/firewall-rules');
    await expect(page.getByRole('heading', { level: 1, name: 'Firewall rules' })).toBeVisible();
    await expect(page.getByText(/need the Technical detail right/)).toHaveCount(0);
  });

  test('Products: catalogue with modules and features for every user', async ({ page }) => {
    await signInAs(page, 'DEV\\engineer');
    await page.goto('/products');
    await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible();
    await page.getByRole('link', { name: '+ New product' }).click();
    const code = unique('APP').replace(/[^A-Za-z0-9-]/g, '').slice(0, 20);
    await page.getByLabel('Product code').fill(code);
    await page.getByLabel('Product name').fill('E2E Application');
    await page.getByLabel('Category').fill('Back office');
    await expect(page.getByLabel('Owning team')).toHaveCount(0);
    await page.getByRole('button', { name: '+ Developer' }).click();
    await page.getByLabel('Developer 1 name').fill('E2E Lead Developer');
    await page.getByRole('button', { name: 'Save product' }).click();
    await expect(page.getByText('E2E Lead Developer')).toBeVisible();
    await expect(page).toHaveURL(/\/products\/\d+$/);
    await page.getByRole('button', { name: '+ Module' }).click();
    await page.getByLabel('Module code').fill('IMPORTER');
    await page.getByLabel('Module name').fill('Importer');
    await page.getByRole('button', { name: 'Save module' }).click();
    await page.getByRole('button', { name: '+ Feature' }).click();
    await page.getByLabel('Feature name').fill('Bulk import');
    await page.getByLabel('Module').selectOption({ label: 'IMPORTER · Importer' });
    await page.getByRole('button', { name: 'Save feature' }).click();
    await expect(page.getByRole('row', { name: /Bulk import\s+IMPORTER/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /IMPORTER · Importer/ })).toContainText('1');
    // A microservice with a version and its release notes.
    await page.getByRole('button', { name: '+ Microservice' }).click();
    await page.getByLabel('Microservice name').fill(`${code}.Importer.Microservice`);
    await page.getByRole('button', { name: 'Save microservice' }).click();
    await page.getByRole('link', { name: `${code}.Importer.Microservice` }).click();
    await page.getByRole('button', { name: '+ Version' }).click();
    await page.getByLabel('Version number').fill('1.0.0');
    await page.getByLabel('Release notes').fill('First release\nBulk import');
    await page.getByRole('button', { name: 'Save version' }).click();
    await expect(page.locator('.release-notes')).toHaveText('First release\nBulk import');
    await page.screenshot({ path: 'test-results/visual-microservice-1600.png', fullPage: true });
  });
});

test.describe('Microservices', () => {
  test('define microservices on the product and choose them per server', async ({ page }) => {
    const tag = unique('X').replace(/[^A-Za-z0-9]/g, '').slice(-6);
    await page.goto('/products?q=PSOP');
    await page.getByRole('link', { name: /PSOP · / }).first().click();
    for (const svc of ['Importer', 'PlateLookup']) {
      await page.getByRole('button', { name: '+ Microservice' }).click();
      await page.getByLabel('Microservice name').fill(`PSOP.${svc}${tag}.Microservice`);
      await page.getByRole('button', { name: 'Save microservice' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    }
    // Tables page at 25 rows; the filter box finds the new ones among earlier runs' microservices.
    await page.locator('section.panel', { has: page.getByRole('heading', { name: /^Microservices/ }) }).getByLabel('Filter rows').fill(tag);
    for (const svc of ['Importer', 'PlateLookup']) await expect(page.getByText(`PSOP.${svc}${tag}.Microservice`)).toBeVisible();
    // Two released versions of the Importer.
    await page.getByRole('link', { name: `PSOP.Importer${tag}.Microservice` }).click();
    for (const v of ['2.1.0', '2.2.0']) {
      await page.getByRole('button', { name: '+ Version' }).click();
      await page.getByLabel('Version number').fill(v);
      await page.getByRole('button', { name: 'Save version' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    }
    // Installation PSOP Main in NTA R1 Production: Importer + PlateLookup on the application server.
    const inst = await page.evaluate(async () => {
      const r = await fetch('/api/v1/installations?q=PSOP%20Main&pageSize=50', { credentials: 'same-origin' }).then(x => x.json());
      return r.items.find((i: { clientCode: string; regionCode?: string; environmentName: string }) => i.clientCode === 'DEMO-NTA' && i.regionCode === 'R1' && i.environmentName === 'Production').id;
    });
    await page.goto(`/installations/${inst}`);
    const panel = page.locator('section.panel', { has: page.getByRole('heading', { name: 'Microservice deployment' }) });
    await panel.getByRole('row', { name: /nta-r1-app01/ }).getByRole('button', { name: 'Choose microservices' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(new RegExp(`PSOP\.Importer${tag}\.Microservice`)).check();
    await dialog.getByLabel(new RegExp(`PSOP\.PlateLookup${tag}\.Microservice`)).check();
    await dialog.getByRole('button', { name: 'Save' }).click();
    const row = panel.getByRole('row', { name: /nta-r1-app01/ });
    await expect(row).toContainText(`PSOP.Importer${tag}.Microservice`);
    await expect(row).toContainText(`PSOP.PlateLookup${tag}.Microservice`);
    await page.screenshot({ path: 'test-results/visual-deployment-1600.png', fullPage: true });

    // A new server in the same environment, created with its hosted microservice in one save.
    await page.getByRole('link', { name: 'Production' }).first().click();
    await page.getByRole('button', { name: '+ Add' }).click();
    await page.getByRole('menuitem', { name: 'Server' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Server name').fill(`nta-r1-wf${tag}`.toLowerCase());
    const group = dlg.getByRole('group', { name: 'PSOP · PSOP Main' });
    await group.getByLabel(`PSOP.Importer${tag}.Microservice`).check();
    // The deployed version starts at the latest release and can be changed.
    const version = group.getByLabel(`PSOP.Importer${tag}.Microservice deployed version`);
    await expect(version.locator('option:checked')).toHaveText('2.2.0');
    await version.selectOption({ label: '2.1.0' });
    await dlg.getByLabel('Technical owner').selectOption({ label: 'Mara Okafor (demo manager)' });
    await dlg.getByRole('button', { name: 'Add server' }).click();
    await expect(dlg).toBeHidden();
    await page.goto(`/installations/${inst}`);
    // Earlier runs add servers here; the table pages at 25 rows, so narrow it first.
    await panel.getByLabel('Filter rows').fill(`wf${tag}`.toLowerCase());
    const wfRow = panel.getByRole('row', { name: new RegExp(`nta-r1-wf${tag}`, 'i') });
    await expect(wfRow).toContainText(`PSOP.Importer${tag}.Microservice · 2.1.0`);

    // On the server page: the hosted microservices with their version, changed in place.
    await wfRow.getByRole('link', { name: new RegExp(`nta-r1-wf${tag}`, 'i') }).click();
    const hostedPanel = page.locator('section.panel', { has: page.getByRole('heading', { name: 'Hosted microservices' }) });
    await expect(hostedPanel.getByRole('row', { name: new RegExp(`PSOP\\.Importer${tag}`) })).toContainText('2.1.0');
    await hostedPanel.getByRole('button', { name: 'Edit hosted microservices' }).click();
    await page.getByRole('dialog').getByLabel(`PSOP.Importer${tag}.Microservice deployed version`).selectOption({ label: '2.2.0' });
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(hostedPanel.getByRole('row', { name: new RegExp(`PSOP\\.Importer${tag}`) })).toContainText('2.2.0');
    await page.screenshot({ path: 'test-results/visual-server-microservices-1600.png', fullPage: true });
  });
});

test.describe('Dashboard visualizations', () => {
  test.beforeEach(async ({ page }) => {
    // Never contact the real tile server from tests: serve a blank tile for every OpenStreetMap request.
    const blank = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await page.route('https://tile.openstreetmap.org/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: blank }));
  });

  test('executive overview: KPI band, OpenStreetMap filter and table views', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Executive overview' })).toBeVisible();
    // Every KPI is a link whose number equals its drilldown; the action list is a separate page.
    const openCases = page.getByRole('link', { name: /^Open cases: \d+/ });
    await expect(openCases).toBeVisible();
    const n = Number((await openCases.getAttribute('aria-label'))!.match(/: (\d+)/)![1]);
    await openCases.click();
    await expect(page).toHaveURL(/\/cases\?/);
    await expect(page.getByText(new RegExp(`Records :- ${Math.min(n, 15)} OF ${n}`))).toBeVisible();
    await page.goto('/');
    const map = page.getByRole('group', { name: /OpenStreetMap of clients by country/ });
    await expect(map).toBeVisible({ timeout: 15000 });
    await expect(map.getByText('© OpenStreetMap contributors')).toBeVisible();
    const sa = map.getByRole('button', { name: /Saudi Arabia: \d+ client/ });
    await sa.focus();
    await page.keyboard.press('Enter');
    const side = page.getByRole('complementary', { name: 'Clients in Saudi Arabia' });
    await expect(side).toBeVisible();
    await expect(side.getByRole('link').first()).toBeVisible();
    await side.getByRole('button', { name: 'Filter dashboard to Saudi Arabia' }).click();
    await expect(page).toHaveURL(/country=Saudi/);
    await expect(page.getByLabel('Country', { exact: true })).toHaveValue('Saudi Arabia');
    await expect(page.getByRole('button', { name: /Clear country filter/ })).toBeVisible();
    const panel = page.locator('section.viz-panel', { has: page.getByRole('heading', { name: 'Open cases by status' }) });
    const toggle = panel.getByRole('button', { name: 'Table view' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.locator('table')).toContainText('Pending validation');
    // The map figure can be switched; contracts and SLAs have their own charts.
    await page.getByRole('group', { name: 'Map figure' }).getByRole('button', { name: 'Contracts' }).click();
    await expect(page.getByLabel('Active contracts per country')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contracts & SLAs' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SLA targets by priority' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Active contracts ending, next 12 months' })).toBeVisible();
    await page.screenshot({ path: 'test-results/visual-dashboard-map-1600.png', fullPage: true });
    await page.getByRole('link', { name: 'Action list' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Action list' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Unassigned/ })).toBeVisible();
  });

  test('modern overview: section tabs, needs-attention strip and the Leaflet map with layers, full screen and client markers (A51)', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Dashboard sections' });
    await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'true');
    // The strip lists what is overdue or due, each item opening its list (or says all clear).
    const strip = page.getByRole('region', { name: 'Needs attention' });
    await expect(strip).toBeVisible();
    const first = strip.getByRole('link').first();
    if (await first.count()) {
      const href = await first.getAttribute('href');
      expect(href).toMatch(/^\//);
    } else await expect(strip).toContainText('all clear');
    // Section tabs scroll to their section and mark it current.
    await nav.getByRole('link', { name: 'Contracts & SLAs' }).click();
    await expect(page.getByRole('heading', { name: 'Contracts & SLAs' })).toBeInViewport();
    await expect(nav.getByRole('link', { name: 'Contracts & SLAs' })).toHaveAttribute('aria-current', 'true');
    // Leaflet map: base maps and overlays, scale, full screen.
    await nav.getByRole('link', { name: 'Map' }).click();
    const map = page.getByRole('group', { name: /OpenStreetMap of clients by country/ });
    await expect(map).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.leaflet-control-layers')).toBeAttached();
    for (const name of ['Muted', 'Standard', 'No base map', 'Country shading', 'Clients'])
      await expect(page.locator('.leaflet-control-layers label', { hasText: name })).toBeAttached();
    await expect(page.locator('.leaflet-control-scale-line')).toBeVisible();
    await page.getByRole('button', { name: 'Full screen' }).click();
    await expect(page.locator('.osm-wrap.full')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.osm-wrap.full')).toHaveCount(0);
    // Opening a country shows one marker per client; its popup opens the client inside the app.
    await map.getByRole('button', { name: /Saudi Arabia: \d+ client/ }).click();
    // Pick a client of the opened country (markers of neighbouring countries may lie outside the visible map).
    const code = (await page.getByRole('complementary', { name: 'Clients in Saudi Arabia' }).locator('.map-client b').first().textContent())!.trim();
    const marker = page.locator('.osm-client').filter({ hasText: new RegExp(`^${code}$`) });
    await expect(marker).toBeInViewport({ timeout: 10000 });
    await page.locator('#map').screenshot({ path: 'test-results/visual-dashboard-leaflet-clients.png' });
    await marker.click();
    await page.locator('.osm-pop a').click();
    await expect(page).toHaveURL(/\/clients\/\d+$/);
    await expect(page.getByText(code).first()).toBeVisible();
  });
});

test.describe('Release 2.14 (owner requests of 20 Oct 2026)', () => {
  test('firewall rules: record the communication between two servers, filter and delete it', async ({ page }) => {
    const purpose = unique('E2E monitoring agent');
    await page.goto('/firewall-rules');
    await expect(page.getByRole('heading', { level: 1, name: 'Firewall rules' })).toBeVisible();
    await page.getByRole('button', { name: '+ New rule' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Client', { exact: true }).selectOption({ label: 'DEMO-NTA · Northwind Transit Authority (fictional)' });
    const pick = async (field: string, server: string) => {
      await dlg.getByLabel('Find server').fill(server);
      const sel = dlg.getByLabel(field);
      // Earlier runs may have copied the server into other environments; any one of them will do.
      const opt = sel.locator('option', { hasText: `${server} —` }).first();
      await expect(opt).toBeAttached();
      await sel.selectOption((await opt.getAttribute('value'))!);
    };
    await pick('Source server', 'nta-r1-app01');
    await pick('Destination server', 'nta-r1-web01');
    await dlg.getByLabel('Ports').fill('9182, 10000-10010');
    await dlg.getByLabel('Direction').selectOption('Bidirectional');
    await dlg.getByLabel('Purpose').fill(purpose);
    await dlg.getByRole('button', { name: 'Save rule' }).click();
    await expect(dlg).toBeHidden();
    await page.getByLabel('Search', { exact: true }).fill(purpose);
    const row = page.getByRole('row', { name: new RegExp(purpose) });
    await expect(row).toContainText('9182, 10000-10010');
    await expect(row).toContainText('Both ways');
    // The server page lists the rules from and to it.
    await row.getByRole('link', { name: 'nta-r1-app01' }).click();
    await expect(page.locator('section.panel', { has: page.getByRole('heading', { name: /Firewall rules/ }) })).toContainText(purpose);
    await page.goto(`/firewall-rules?q=${encodeURIComponent(purpose)}`);
    await page.getByRole('button', { name: /^Delete rule nta-r1-app01/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('row', { name: new RegExp(purpose) })).toHaveCount(0);
  });

  test('every table filters, sorts, pages and exports; configuration values are deleted from the table', async ({ page }) => {
    const label = unique('E2E role');
    await page.goto('/admin/config/team-roles');
    await expect(page.getByRole('heading', { level: 1, name: 'Project team roles' })).toBeVisible();
    await page.getByRole('button', { name: '+ Add' }).click();
    await page.getByRole('dialog').getByLabel('Name').fill(label);
    await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('row', { name: new RegExp(label) })).toBeVisible();
    // Filter box, header sort and CSV export.
    await page.getByPlaceholder('Filter rows…').fill(label);
    await expect(page.getByText('1 of')).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.csv$/);
    await page.getByPlaceholder('Filter rows…').fill('');
    await page.getByRole('columnheader', { name: 'Name' }).getByRole('button').click();
    await expect(page.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending');
    // Unused values delete straight from the table; values in use are refused with the reason.
    await page.getByRole('button', { name: `Delete ${label}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('row', { name: new RegExp(label) })).toHaveCount(0);
    await page.goto('/admin/config/environment-types');
    await page.getByRole('button', { name: 'Delete Production' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/is used by/);
  });

  test('a team is deleted from the Teams table', async ({ page }) => {
    const code = unique('T').replace(/[^A-Za-z0-9-]/g, '');
    await page.goto('/teams');
    await page.getByRole('button', { name: '+ New Team' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Code', { exact: true }).fill(code);
    await dlg.getByLabel('Name', { exact: true }).fill('E2E temporary team');
    await dlg.getByRole('button', { name: 'Create team' }).click();
    await expect(dlg).toBeHidden();
    await expect(page.getByRole('row', { name: new RegExp(code) })).toBeVisible();
    await page.getByRole('button', { name: `Delete team ${code}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('row', { name: new RegExp(code) })).toHaveCount(0);
  });

  test('a responsibility boundary names any person with separate contact details', async ({ page }) => {
    await page.goto('/clients?q=DEMO-NTA');
    await page.getByRole('link', { name: 'DEMO-NTA', exact: true }).click();
    await page.getByRole('tab', { name: /Contacts/ }).click();
    await page.getByRole('button', { name: '+ Boundary' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Area').selectOption({ index: 1 });
    await dlg.getByLabel('Responsible party').selectOption('CustomerIT');
    await dlg.getByLabel('Organization').fill('Customer IT – Network team');
    await dlg.getByLabel('Full name').fill('Lina Haddad (fictional)');
    await dlg.getByLabel('Email').fill('not-an-email');
    await dlg.getByLabel('Phone').fill('+971 4 555 0100');
    await dlg.getByLabel('Internal coordinator').selectOption({ index: 1 });
    await dlg.getByRole('button', { name: 'Save' }).click();
    await expect(dlg.getByText('Enter a valid e-mail address.')).toBeVisible();
    await dlg.getByLabel('Email').fill('lina.haddad@example.org');
    await dlg.getByRole('button', { name: 'Save' }).click();
    await expect(dlg).toBeHidden();
    const row = page.getByRole('row', { name: /Lina Haddad \(fictional\)/ }).last();
    await expect(row).toContainText('lina.haddad@example.org');
    await expect(row).toContainText('+971 4 555 0100');
    await row.getByRole('button', { name: /^Delete responsibility boundary/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('server technical owner with segregated contact details', async ({ page }) => {
    await page.goto('/assets?q=nta-r1-web01');
    await page.getByRole('link', { name: 'nta-r1-web01', exact: true }).click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Another person (type name and contact)').check();
    await dlg.getByLabel('Technical owner name').fill('Omar Saleh (fictional)');
    await dlg.getByLabel('Job title').fill('Infrastructure lead');
    await dlg.getByLabel('Organization').fill('Customer IT');
    await dlg.getByLabel('Email').fill('omar.saleh@example.org');
    await dlg.getByLabel('Mobile').fill('+971 50 000 0000');
    await dlg.getByRole('button', { name: 'Save server' }).click();
    await expect(dlg).toBeHidden();
    const owner = page.locator('section.panel', { has: page.getByRole('heading', { name: 'Technical owner' }) });
    await expect(owner).toContainText('Omar Saleh (fictional)');
    await expect(owner.getByRole('link', { name: 'omar.saleh@example.org' })).toHaveAttribute('href', 'mailto:omar.saleh@example.org');
    await expect(page.getByText('Source provenance')).toHaveCount(0);
  });

  test('notifications center: bell with unread count and the notifications page', async ({ page }) => {
    await page.goto('/');
    const bell = page.getByRole('button', { name: /^Notifications/ });
    await expect(bell).toBeVisible();
    await bell.click();
    const pop = page.getByRole('dialog', { name: 'Notifications' });
    await expect(pop).toBeVisible();
    await pop.getByRole('link', { name: 'Open the notifications center' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Unread/ })).toBeVisible();
  });
});


test.describe('Escalations (A41)', () => {
  test('a channel is configured, an escalation is recorded, answered, raised and resolved', async ({ page }) => {
    const channel = unique('Customer portal');
    const title = unique('E2E escalation');
    // Channels are a configuration list.
    await page.goto('/admin/config/escalation-channels');
    await expect(page.getByRole('heading', { level: 1, name: 'Escalation channels' })).toBeVisible();
    await expect(page.getByRole('row', { name: /Formal letter/ })).toBeVisible();
    await page.getByRole('button', { name: '+ Add' }).click();
    await page.getByRole('dialog').getByLabel('Name').fill(channel);
    await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('row', { name: new RegExp(channel) })).toBeVisible();

    await page.goto('/escalations/new');
    await page.getByLabel('Client', { exact: true }).selectOption({ label: 'DEMO-NTA · Northwind Transit Authority (fictional)' });
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByLabel('Channel', { exact: true }).selectOption({ label: channel });
    await page.getByLabel('Channel reference').fill('PORTAL-7781');
    await page.getByLabel('Priority').selectOption('Critical');
    await page.getByLabel('Full name').fill('Fictional Operations Director');
    await page.getByLabel('Email', { exact: true }).fill('director@example.org');
    await page.getByRole('button', { name: 'Record escalation' }).click();
    await expect(page).toHaveURL(/\/escalations\/\d+$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    await expect(page.getByText(/Received via/)).toContainText(channel);

    // A reply by e-mail acknowledges it.
    await page.getByRole('button', { name: '+ Log communication' }).click();
    let dlg = page.getByRole('dialog');
    await dlg.getByLabel('Channel').selectOption({ label: 'E-mail' });
    await dlg.getByLabel('What was said or sent').fill('Acknowledged; engineer on site tomorrow.');
    await confirmDialog(page, 'Log');
    await expect(page.getByText('Acknowledged by the reply')).toBeVisible();

    await page.getByRole('button', { name: 'Raise level' }).click();
    await page.getByRole('dialog').getByLabel('Reason').fill('Second outage this week.');
    await confirmDialog(page, 'Raise level');
    await expect(page.getByText('Level 2').first()).toBeVisible();

    await page.getByRole('button', { name: 'Change status' }).click();
    dlg = page.getByRole('dialog');
    await dlg.getByLabel('New status').selectOption('Resolved');
    await dlg.getByLabel('Resolution (when resolving)').fill('Faulty switch replaced.');
    await confirmDialog(page, 'Change status');
    await expect(page.getByText('Faulty switch replaced.').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/visual-escalation-1600.png', fullPage: true });

    // The client page lists it; the used channel cannot be deleted.
    await page.getByRole('link', { name: 'DEMO-NTA' }).first().click();
    await page.getByRole('tab', { name: 'Escalations' }).click();
    await page.getByLabel('Status').selectOption('all');
    await expect(page.getByRole('row', { name: new RegExp(title) })).toContainText('Resolved');
    await page.goto('/admin/config/escalation-channels');
    await page.getByRole('button', { name: `Delete ${channel}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/is used by/);
  });
});

test.describe('Delete with dependencies and time zones (A43, A44)', () => {
  /** Calls the API from the signed-in page (same cookies and security token as the app). */
  async function call(page: Page, method: string, path: string, body?: unknown) {
    return page.evaluate(async ({ method, path, body }) => {
      const t = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];
      const r = await fetch('/api/v1' + path, { method, headers: { 'Content-Type': 'application/json', ...(t ? { 'X-XSRF-TOKEN': decodeURIComponent(t) } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, json: r.status === 204 ? null : await r.json() };
    }, { method, path, body });
  }

  test('a client is deleted from its page together with everything listed in the dialog', async ({ page }) => {
    const code = unique('DEL').replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    await page.goto('/');
    const me = (await call(page, 'GET', '/me')).json;
    const client = (await call(page, 'POST', '/clients', { code, name: 'Fictional client to delete', country: 'Oman', status: 'Active', ownerUserId: me.id })).json.id;
    const env = (await call(page, 'POST', '/environments', { clientId: client, name: 'Production', type: 'Production', criticality: 'Normal', ownerUserId: me.id, backupGapReason: 'Test' })).json.id;
    await call(page, 'POST', '/assets', { environmentId: env, name: 'del-app01', type: 'VM', ownerUserId: me.id });
    await call(page, 'POST', '/assets', { environmentId: env, name: 'del-web01', type: 'VM', ownerUserId: me.id });
    await call(page, 'POST', '/escalations', { clientId: client, title: 'Letter to delete', channel: 'Email', ownerUserId: me.id });

    await page.goto(`/clients/${client}`);
    await page.getByRole('button', { name: `Delete client ${code}` }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByText('Will be deleted with it')).toBeVisible();
    // Each group opens to its records, which can be deleted one by one.
    await dlg.getByRole('button', { name: /Escalations\s*1/ }).click();
    await dlg.getByRole('button', { name: /^Delete ESC-\d+ · Letter to delete/ }).click();
    await expect(dlg.getByRole('button', { name: /Escalations/ })).toHaveCount(0);
    await dlg.getByRole('button', { name: /Servers\s*2/ }).click();
    await expect(dlg.getByRole('link', { name: 'del-app01' })).toBeVisible();
    await page.screenshot({ path: 'test-results/visual-delete-dependents-1600.png' });
    const all = dlg.getByRole('button', { name: /Delete everything/ });
    await expect(all).toBeDisabled();
    await dlg.getByLabel(/I understand/).check();
    await all.click();
    await expect(page).toHaveURL(/\/clients$/);
    expect((await call(page, 'GET', `/clients/${client}`)).status).toBe(404);
    expect((await call(page, 'GET', `/environments/${env}`)).status).toBe(404);
  });

  test('time zones are picked from a list; the default offers this computer\'s zone', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.getByRole('row', { name: /DefaultTimeZone/ }).getByRole('button', { name: 'Edit' }).click();
    const dlg = page.getByRole('dialog');
    const zone = dlg.getByLabel('Default time zone');
    expect(await zone.locator('option').count()).toBeGreaterThan(300);
    const pc = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    await zone.selectOption('UTC');
    await dlg.getByRole('button', { name: /Use this computer's time zone/ }).click();
    await expect(zone).toHaveValue(pc);
    await dlg.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('row', { name: /DefaultTimeZone/ })).toContainText(pc.replace(/_/g, ' '));
    // The commitment form uses the same list.
    await page.goto('/commitments/new');
    await expect(page.getByLabel('Original time zone').locator('option').nth(5)).toBeAttached();
  });
});

test.describe('Attachments (A46)', () => {
  test('files are attached to a server and an escalation, downloaded and removed', async ({ page }) => {
    const name = `${unique('Rack photo')}.png`;
    await page.goto('/assets?q=nta-r1-app01');
    await page.getByRole('link', { name: 'nta-r1-app01', exact: true }).first().click();
    const panel = page.locator('section.panel', { has: page.getByRole('heading', { name: /^Attachments/ }) });
    await expect(panel.getByText('Drag files here or')).toBeVisible();
    // A refused type is explained before anything is sent.
    await panel.getByLabel(/Choose files to attach/).setInputFiles({ name: 'installer.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') });
    await expect(panel.getByRole('alert')).toContainText('.exe not accepted');
    await panel.getByLabel(/Choose files to attach/).setInputFiles([
      { name, mimeType: 'image/png', buffer: Buffer.from('fictional image bytes') },
      { name: 'cabling notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Fictional cabling notes') }]);
    await panel.getByLabel('Description of the files (optional)').fill('Taken during the site visit (fictional)');
    await panel.getByRole('button', { name: 'Upload 2 file(s)' }).click();
    await expect(panel.getByRole('link', { name })).toBeVisible();
    await expect(panel.getByRole('row').filter({ hasText: name })).toContainText('Taken during the site visit');
    const download = page.waitForEvent('download');
    await panel.getByRole('link', { name }).click();
    expect((await download).suggestedFilename()).toBe(name);
    page.once('dialog', d => d.accept());
    await panel.getByRole('button', { name: `Remove ${name}` }).click();
    await expect(panel.getByRole('link', { name })).toHaveCount(0);
    page.once('dialog', d => d.accept());
    await panel.getByRole('button', { name: 'Remove cabling notes.txt' }).first().click();
    await page.screenshot({ path: 'test-results/visual-attachments-1600.png', fullPage: true });

    // Escalations, cases and clients take files too (here: a letter on an escalation).
    const esc = await page.evaluate(async () => {
      const t = decodeURIComponent(document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)![1]);
      const me = await (await fetch('/api/v1/me')).json();
      const clients = await (await fetch('/api/v1/clients?q=DEMO-NTA')).json();
      const r = await fetch('/api/v1/escalations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': t },
        body: JSON.stringify({ clientId: clients.items[0].id, title: 'Letter with attachment (fictional)', channel: 'FormalLetter', ownerUserId: me.id }) });
      return (await r.json()).id as number;
    });
    await page.goto(`/escalations/${esc}`);
    const letters = page.locator('section.panel', { has: page.getByRole('heading', { name: /^Letters, e-mails and other files/ }) });
    await letters.getByLabel(/Choose files to attach/).setInputFiles({ name: 'customer letter.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fictional') });
    await letters.getByRole('button', { name: 'Upload 1 file(s)' }).click();
    await expect(letters.getByRole('link', { name: 'customer letter.pdf' }).first()).toBeVisible();
    page.once('dialog', d => d.accept());
    await letters.getByRole('button', { name: 'Remove customer letter.pdf' }).first().click();
  });
});


test.describe('Notes (A47)', () => {
  test('a OneNote-style page is written, linked to a client, found, recycled and stays private', async ({ page }) => {
    const title = unique('Ops meeting');
    await page.goto('/notes');
    await expect(page.getByText('Only you can see your notes.')).toBeVisible();
    await page.getByRole('button', { name: '+ Page' }).click();
    await page.getByLabel('Page title').fill(title);
    const body = page.getByRole('textbox', { name: 'Page content' });
    await body.click();
    await page.keyboard.type('Discuss the DR test with the customer.');
    await page.getByRole('button', { name: 'Bold' }).click();
    await page.keyboard.type(' Urgent');
    await page.getByRole('button', { name: 'To-do list' }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Saved/ })).toBeVisible({ timeout: 10000 });
    const id = new URL(page.url()).searchParams.get('page');
    expect(id).toBeTruthy();

    // A sub-page under it, from the page menu.
    await page.getByRole('button', { name: `Actions for Page ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Add sub-page' }).click();
    // Wait until the new sub-page is open before typing its title.
    await expect(page).not.toHaveURL(new RegExp(`page=${id}$`));
    await expect(page.getByLabel('Page title')).toHaveValue('');
    await page.getByLabel('Page title').fill(`${title} — details`);
    await expect(page.getByRole('status').filter({ hasText: /^Saved/ })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.notes-page-list li.sub', { hasText: `${title} — details` })).toBeVisible();

    // Link the first page to a client; it appears in that client's "My notes".
    await page.goto(`/notes?page=${id}`);
    await page.getByRole('button', { name: 'Change link' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('A client').check();
    await dlg.getByLabel('Client', { exact: true }).selectOption({ label: 'DEMO-NTA · Northwind Transit Authority (fictional)' });
    await dlg.getByRole('button', { name: 'Save link' }).click();
    await expect(page.locator('.note-link')).toContainText('DEMO-NTA');
    await page.screenshot({ path: 'test-results/visual-notes-1600.png' });
    await page.goto('/clients?q=DEMO-NTA');
    await page.getByRole('link', { name: 'DEMO-NTA', exact: true }).click();
    await page.getByRole('tab', { name: 'My notes' }).click();
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();

    // Search finds it by its text.
    await page.goto('/notes');
    await page.getByLabel('Search all notes').fill('DR test');
    await page.keyboard.press('Enter');
    await expect(page.locator('.notes-page-list')).toContainText(title);

    // Private: another user cannot open it, find it or see it on the client.
    await signInAs(page, 'DEV\\engineer');
    await page.goto(`/notes?page=${id}`);
    await expect(page.getByText('This page does not exist or is not yours.')).toBeVisible();
    await page.getByLabel('Search all notes').fill(title);
    await page.keyboard.press('Enter');
    await expect(page.getByText('No pages found.')).toBeVisible();
    await signInAs(page, 'DEV\\manager');

    // Recycle bin: delete, find it there, restore.
    await page.goto(`/notes?page=${id}`);
    await page.getByRole('button', { name: `Actions for Page ${title}`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Delete (to recycle bin)' }).click();
    await page.getByRole('button', { name: /Recycle bin/ }).click();
    const row = page.locator('.notes-page-list li', { hasText: title }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Restore' }).click();
    await expect(page.locator('.notes-page-list li', { hasText: title })).toHaveCount(0);
  });
});

test.describe('Contract terms and storage settings (A48, A49)', () => {
  test('a contract records support days and hours, delivery schedule, fees with a currency and payment terms', async ({ page }) => {
    const title = unique('Support contract');
    await page.goto('/');
    const projectId = await page.evaluate(async () => {
      const r = await fetch('/api/v1/projects?q=DEMO-NTA&pageSize=50').then(x => x.json());
      return (r.items.find((p: { clientCode: string }) => p.clientCode === 'DEMO-NTA') ?? r.items[0]).id as number;
    });
    await page.goto(`/contracts/new?projectId=${projectId}`);
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByLabel('Contract owner').selectOption({ index: 1 });
    // Support: Sunday to Thursday, 08:00–17:00, Dubai time; then switch to 24 × 7 and back.
    const days = page.getByRole('group', { name: 'Support days' });
    await days.getByRole('button', { name: 'Mon–Fri' }).click();
    await expect(days.getByRole('button', { name: 'Sun', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await days.getByRole('button', { name: 'Sun–Thu' }).click();
    await expect(days.getByRole('button', { name: 'Sun', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(days.getByRole('button', { name: 'Fri', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.getByLabel('Support from').fill('08:00');
    await page.getByLabel('Support to').fill('17:00');
    await page.getByLabel('Support time zone').selectOption('Asia/Dubai');
    await page.getByLabel('24 × 7 (round the clock, every day)').check();
    await expect(days).toHaveCount(0);
    await page.getByLabel('24 × 7 (round the clock, every day)').uncheck();
    // Delivery schedule, fees and costs, payment terms.
    await page.getByRole('button', { name: '+ Phase' }).click();
    await page.getByLabel('Phase 1', { exact: true }).fill('Phase 1 – Installation');
    await page.getByLabel('Phase 1 completion percentage').fill('50');
    await page.getByLabel('Phase 1 date').fill('2027-01-31');
    await page.getByRole('button', { name: '+ Line' }).click();
    await page.getByLabel('Currency').selectOption('AED');
    await page.getByLabel('Fee 1 description').fill('Annual support');
    await page.getByLabel('Fee 1 unit', { exact: true }).fill('year');
    await page.getByLabel('Fee 1 unit price').fill('100000');
    await page.getByRole('button', { name: '+ Line' }).click();
    await page.getByLabel('Fee 2 description').fill('On-site engineer');
    await page.getByLabel('Fee 2 unit', { exact: true }).fill('man-day');
    await page.getByLabel('Fee 2 quantity').fill('10');
    await page.getByLabel('Fee 2 unit price').fill('1500');
    await expect(page.locator('tfoot').filter({ hasText: 'Total' }).first()).toContainText('115,000.00 AED');
    await page.getByRole('button', { name: '+ Payment' }).click();
    await page.getByLabel('Payment 1 condition').fill('50% on signature');
    await page.getByLabel('Payment 1 percentage').fill('50');
    await page.getByLabel('Payment 1 amount').fill('57500');
    const due = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    await page.getByLabel('Payment 1 due date').fill(due);
    await page.getByRole('button', { name: 'Save contract' }).click();
    await expect(page).toHaveURL(/\/contracts\/\d+$/);
    await expect(page.getByText('Sun–Thu 08:00–17:00 (Asia/Dubai)')).toBeVisible();
    await expect(page.locator('section.panel', { has: page.getByRole('heading', { name: /^Delivery schedule/ }) })).toContainText('50 %');
    await expect(page.locator('section.panel', { has: page.getByRole('heading', { name: /^Fees and costs/ }) })).toContainText('115,000.00 AED');
    await expect(page.locator('section.panel', { has: page.getByRole('heading', { name: 'Payment terms' }) })).toContainText('Next due');
    await page.screenshot({ path: 'test-results/visual-contract-terms-1600.png', fullPage: true });
    // A50: the payment is listed in the notifications center's Payments tab and counted on the dashboard.
    await page.goto('/notifications?show=payments');
    await expect(page.getByRole('heading', { name: 'Contract payments' })).toBeVisible();
    await page.getByRole('group', { name: 'Payment state' }).getByRole('button', { name: /^Due within 14 days/ }).click();
    await page.getByLabel('Filter rows').fill(title);
    const row = page.getByRole('row', { name: new RegExp(title) });
    await expect(row).toContainText('57,500.00 AED');
    await expect(row).toContainText('Due soon');
    await expect(row).toContainText('in 5 day(s)');
    await expect(page.getByRole('heading', { name: 'Payment reminders' })).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('link', { name: /^Payments due: \d+/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contract payments' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Next payments' })).toBeVisible();
  });

  test('the attachment storage settings are edited under Settings', async ({ page }) => {
    await page.goto('/admin/settings');
    const panel = page.locator('section.panel', { has: page.getByRole('heading', { name: 'File attachments' }) });
    await panel.getByRole('button', { name: 'Edit' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByLabel('Storage folder')).toBeVisible();
    const files = dlg.getByLabel('Files per upload');
    const old = await files.inputValue();
    // A blocked type is refused with the reason.
    const types = dlg.getByLabel('Accepted file types');
    const oldTypes = await types.inputValue();
    await types.fill(`${oldTypes}, .exe`);
    await dlg.getByRole('button', { name: 'Save' }).click();
    await expect(dlg).toContainText('.exe files can never be accepted');
    await types.fill(oldTypes);
    await files.fill('7');
    await dlg.getByRole('button', { name: 'Save' }).click();
    await expect(dlg).toBeHidden();
    await expect(panel).toContainText('7 files per upload');
    await panel.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('dialog').getByLabel('Files per upload').fill(old);
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(panel).toContainText(`${old} files per upload`);
  });
});

test.describe('Teams, time zones and retired sections (A52, A53)', () => {
  test('a team member gets a listed role and configured products, is edited and removed', async ({ page }) => {
    const code = unique('TM').replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase();
    await page.goto('/teams');
    await page.getByRole('button', { name: '+ New Team' }).click();
    const nd = page.getByRole('dialog');
    await nd.getByLabel('Code').fill(code);
    await nd.getByLabel('Name').fill(`Fictional team ${code}`);
    await nd.getByRole('button', { name: /Save|Create/ }).click();
    await page.getByRole('link', { name: code, exact: true }).click();
    await page.getByRole('button', { name: '+ Member' }).click();
    const dlg = page.getByRole('dialog', { name: 'Add member' });
    await dlg.getByLabel('Person').selectOption({ index: 1 });
    const role = dlg.getByLabel('Team role');
    await expect(role.locator('option', { hasText: 'Support engineer' })).toHaveCount(1);
    await role.selectOption('Support engineer');
    const products = dlg.getByRole('group', { name: 'Product familiarity' });
    const first = products.getByRole('button').first();
    const product = (await first.textContent())!.trim();
    await first.click();
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await dlg.getByRole('button', { name: 'Add member' }).click();
    await expect(dlg).toBeHidden();
    const row = page.getByRole('row', { name: /Support engineer/ });
    await expect(row).toContainText(product);
    // Edit: another role, no products.
    await row.getByRole('button', { name: /^Edit / }).click();
    const ed = page.getByRole('dialog');
    await ed.getByLabel('Team role').selectOption('Engineer');
    await ed.getByRole('group', { name: 'Product familiarity' }).getByRole('button', { name: product, exact: true }).click();
    await ed.getByRole('button', { name: 'Save' }).click();
    await expect(ed).toBeHidden();
    const edited = page.getByRole('row', { name: /Engineer/ }).filter({ has: page.getByRole('button', { name: /^Remove / }) });
    await expect(edited).not.toContainText(product);
    // Remove the membership.
    await edited.getByRole('button', { name: /^Remove / }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^Delete/ }).click();
    await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(0);
    // The role list is configurable.
    await page.goto('/admin/config');
    await expect(page.getByRole('link', { name: /Team member roles/ })).toBeVisible();
  });

  test('time zones are chosen from lists and the review and reference sections are gone', async ({ page }) => {
    await page.goto('/cases/new');
    await page.getByLabel('Due (optional)').fill('2027-01-15T10:00');
    const zone = page.getByLabel('Due time zone');
    await expect(zone).toHaveJSProperty('tagName', 'SELECT');
    await zone.selectOption('Asia/Dubai');
    await expect(page.getByText('Due time zone (IANA)')).toHaveCount(0);
    // No "Meaningful reviews" or "Document references" on a client page, an environment page or a contract page.
    await page.goto('/clients');
    await page.getByRole('link', { name: 'DEMO-NTA', exact: true }).first().click();
    await expect(page.getByRole('tab', { name: 'Reviews & documents' })).toHaveCount(0);
    for (const t of await page.getByRole('tab').all()) {
      await t.click();
      await expect(page.getByRole('heading', { name: /Meaningful reviews|Document references/ })).toHaveCount(0);
    }
  });
});
