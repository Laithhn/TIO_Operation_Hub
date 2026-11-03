import { expect, test, type Page } from '@playwright/test';

// A76: the Jira screens against the real API. No Jira site is reachable from these tests: connection creation stores
// the fields and refused sites never leave the server. Run data is supplied by route interception and is fictional.
async function signIn(page: Page, account = 'DEV\\manager') {
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url: test.info().project.use.baseURL as string }]);
}
const clientId = async (page: Page) => page.evaluate(async () =>
  (await (await fetch('/api/v1/clients?q=DEMO-NTA')).json()).items.find((c: { code: string }) => c.code === 'DEMO-NTA').id as number);

test.beforeEach(async ({ page }) => { await signIn(page); });

test('administrators reach Jira Connections and an internal site is refused', async ({ page }) => {
  await page.goto('/admin');
  await page.locator('aside.side').getByRole('link', { name: 'Jira Connections' }).click();
  await expect(page.getByRole('heading', { name: 'Jira Connections', exact: true })).toBeVisible();
  await expect(page.getByText('Automatic synchronization is switched off')).toBeVisible();
  await page.getByRole('button', { name: '+ New connection' }).click();
  await page.getByLabel('Connection name').fill('Internal attempt');
  await page.getByLabel('Jira site').fill('https://intranet.example.org');
  await page.getByLabel('Atlassian account e-mail').fill('svc@example.org');
  await page.getByLabel('API token').fill('not-a-real-token-value');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Only Jira Cloud sites are allowed').first()).toBeVisible();
});

test('an engineer without the new right has no integration pages', async ({ page }) => {
  await signIn(page, 'DEV\\engineer');
  await page.goto('/admin/integrations/jira');
  await expect(page.getByRole('heading', { name: 'Jira Connections', exact: true })).toHaveCount(0);
});

test('a client opens its Jira tab, and enabling needs a dry run first', async ({ page }) => {
  await page.goto('/');
  await page.goto(`/clients/${await clientId(page)}?tab=jira`);
  await expect(page.getByRole('heading', { name: 'Client Jira settings' })).toBeVisible();
  await expect(page.getByText('TIO comments are local only and are never sent back to Jira.')).toBeVisible();
  await page.getByLabel('Jira integration enabled').check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Run Preview import first').first()).toBeVisible();
});

test('a local comment appears in the activity timeline and says it stays local', async ({ page }) => {
  const jira: string[] = [];
  page.on('request', r => { if (r.url().includes('atlassian')) jira.push(r.url()); });
  await page.goto('/cases');
  await page.locator('table tbody a').first().click();
  await expect(page.getByText('This comment is saved in TIO Operations Hub only and will not be sent to Jira.')).toBeVisible();
  const text = `Local note ${Date.now()}`;
  await page.getByLabel('Add a comment to this case (TIO only)').fill(text);
  await page.getByRole('button', { name: 'Add comment' }).click();
  await expect(page.getByText(text)).toBeVisible();
  await page.getByRole('button', { name: /TIO comments/ }).click();
  await expect(page.getByText(text)).toBeVisible();
  await expect(page.getByText('Local only').first()).toBeVisible();
  expect(jira).toEqual([]);
});

test('adding spaces shows conflicts, and the preview reports what an import would do', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 1400 });
  await page.goto('/');
  const id = await clientId(page);
  await page.route(`**/api/v1/clients/${id}/jira`, r => r.fulfill({ json: {
    syncEnabled: true, canManage: true, summary: { enabled: false, assignedSpaces: 1, syncIntervalMinutes: 15, errors: 0, warnings: 0 }, connections: [{ id: 1, name: 'Demo Jira Cloud' }],
    settings: { isEnabled: false, jiraConnectionId: 1, defaultPriority: 'Normal', nextReviewHours: 48, importDoneIssues: false, syncOnStartup: false, fullReconciliation: true, fullReconciliationDays: 7, syncIntervalMinutes: 15, version: 'AAAA' },
    spaces: [{ id: 1, isEnabled: true, projectKey: 'TAH', projectName: 'Demo Transit', jiraProjectId: '100', jiraConnectionId: 1, connection: 'Demo Jira Cloud', siteUrl: 'https://demo-site.atlassian.net', health: 'NotRun', cases: 0 }],
    checks: [], issues: [], runs: [] } }));
  await page.route(`**/api/v1/clients/${id}/jira/available-spaces**`, r => r.fulfill({ json: [
    { id: 1, jiraProjectId: '600', projectKey: 'CRM', projectName: 'Customer Portal', availability: 'Available' },
    { id: 2, jiraProjectId: '500', projectKey: 'OPS', projectName: 'Operations', assignedClient: 'Another client', availability: 'Conflict' },
    { id: 3, jiraProjectId: '100', projectKey: 'TAH', projectName: 'Demo Transit', assignedClient: 'DEMO-NTA', availability: 'AlreadyAssigned' }] }));
  await page.route(`**/api/v1/clients/${id}/jira/preview`, r => r.fulfill({ json: {
    totalIssues: 12, newCases: 7, existingMatched: 2, requiringReview: 1, skippedDone: 2, missingUserMappings: 3, missingWorkflowMappings: 4, ownershipConflicts: 1, estimatedComments: 30, truncated: false, spaces: [{ projectKey: 'TAH', issues: 12 }], samples: [] } }));
  await page.goto(`/clients/${id}?tab=jira`);
  await page.getByRole('button', { name: '+ Add Jira space' }).click();
  await expect(page.getByRole('checkbox', { name: 'Select TAH' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Select CRM' }).check();
  await expect(page.getByRole('button', { name: 'Assign selected' })).toBeEnabled();
  await page.getByRole('checkbox', { name: 'Select OPS' }).check();
  await expect(page.getByText('OPS is already assigned to Another client')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign selected' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Preview import' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Dry run: nothing was saved')).toBeVisible();
  for (const [title, value] of [['New cases proposed', '7'], ['Existing cases matched', '2'], ['Cases requiring review', '1'], ['Ownership conflicts', '1']]) {
    await expect(dialog.locator('.jira-card', { hasText: title }).locator('.jira-card-value')).toHaveText(value);
  }
  if (process.env.TIOHUB_JIRA_SHOTS) await page.screenshot({ path: `${process.env.TIOHUB_JIRA_SHOTS}/preview-dialog.png` });
});

test('history status and space actions stay on screen at the mockup width', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 1400 });
  await page.goto('/');
  const id = await clientId(page);
  const run = { id: 1, jiraConnectionId: 1, projectKey: 'TAH', type: 'Incremental', trigger: 'Schedule', status: 'Success', startedAt: new Date().toISOString(), issuesRetrieved: 14, casesCreated: 2, casesUpdated: 5, commentsImported: 8, activitiesImported: 1, failedRecords: 0 };
  await page.route(`**/api/v1/clients/${id}/jira`, r => r.fulfill({ json: {
    syncEnabled: true, canManage: true, summary: { enabled: true, assignedSpaces: 1, syncIntervalMinutes: 15, errors: 0, warnings: 0 }, connections: [{ id: 1, name: 'Demo Jira Cloud' }],
    spaces: [{ id: 1, isEnabled: true, projectKey: 'TAH', projectName: 'Demo Transit', jiraProjectId: '100', jiraConnectionId: 1, connection: 'Demo Jira Cloud', siteUrl: 'https://demo-site.atlassian.net', health: 'Success', cases: 12 }],
    checks: [], issues: [], runs: [run] } }));
  await page.goto(`/clients/${id}?tab=jira`);
  for (const name of ['Actions', 'Status']) {
    const header = page.getByRole('columnheader', { name, exact: true }).first();
    await expect(header).toBeVisible();
    const box = (await header.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(1672);
  }
  const clipped = await page.locator('table').evaluateAll(ts => ts.filter(t => t.parentElement!.scrollWidth > t.parentElement!.clientWidth + 1).length);
  expect(clipped).toBe(0);
});
