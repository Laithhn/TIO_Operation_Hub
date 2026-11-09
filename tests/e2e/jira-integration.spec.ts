import { startDelete } from './vtTable';
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
  await page.locator('table tbody a[href^="/cases/"]').first().click();
  await expect(page.getByText('This comment is saved in TIO Operations Hub only and will not be sent to Jira.')).toBeVisible();
  const text = `Local note ${Date.now()}`;
  await page.getByLabel('Add a comment to this ticket (TIO only)').fill(text);
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
    spaces: [{ id: 1, isEnabled: true, contracts: [], projectKey: 'TAH', projectName: 'Demo Transit', jiraProjectId: '100', jiraConnectionId: 1, connection: 'Demo Jira Cloud', siteUrl: 'https://demo-site.atlassian.net', health: 'NotRun', cases: 0 }],
    checks: [], issues: [], runs: [] } }));
  await page.route(`**/api/v1/clients/${id}/jira/available-spaces**`, r => r.fulfill({ json: [
    { id: 1, jiraProjectId: '600', projectKey: 'CRM', projectName: 'Customer Portal', availability: 'Available' },
    { id: 2, jiraProjectId: '500', projectKey: 'OPS', projectName: 'Operations', assignedClient: 'Another client', availability: 'Conflict' },
    { id: 3, jiraProjectId: '100', projectKey: 'TAH', projectName: 'Demo Transit', assignedClient: 'DEMO-NTA', availability: 'AlreadyAssigned' }] }));
  let previews = 0;
  await page.route(`**/api/v1/clients/${id}/jira/preview`, r => { previews++; return r.fulfill({ json: {
    totalIssues: 12, newCases: 7, existingMatched: 2, requiringReview: 1, skippedDone: 2, missingUserMappings: 3, missingWorkflowMappings: 4, ownershipConflicts: 1, estimatedComments: 30, truncated: false, spaces: [{ projectKey: 'TAH', issues: 12 }], samples: [] } }); });
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
  for (const [title, value] of [['New tickets proposed', '7'], ['Existing tickets matched', '2'], ['Tickets requiring review', '1'], ['Ownership conflicts', '1']]) {
    await expect(dialog.locator('.jira-card', { hasText: title }).locator('.jira-card-value')).toHaveText(value);
  }
  if (process.env.TIOHUB_JIRA_SHOTS) await page.screenshot({ path: `${process.env.TIOHUB_JIRA_SHOTS}/preview-dialog.png` });
  // The dry run changes the settings version. Closing the dialog refreshes the page; running it again then made the next Save a false conflict.
  await dialog.getByRole('button', { name: 'Close' }).last().click();
  await expect(dialog).toBeHidden();
  await page.waitForLoadState('networkidle');
  expect(previews).toBe(1);
});

test('history status and space actions stay on screen at the mockup width', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 1400 });
  await page.goto('/');
  const id = await clientId(page);
  const run = { id: 1, jiraConnectionId: 1, projectKey: 'TAH', type: 'Incremental', trigger: 'Schedule', status: 'Success', startedAt: new Date().toISOString(), issuesRetrieved: 14, casesCreated: 2, casesUpdated: 5, commentsImported: 8, activitiesImported: 1, failedRecords: 0 };
  await page.route(`**/api/v1/clients/${id}/jira`, r => r.fulfill({ json: {
    syncEnabled: true, canManage: true, summary: { enabled: true, assignedSpaces: 1, syncIntervalMinutes: 15, errors: 0, warnings: 0 }, connections: [{ id: 1, name: 'Demo Jira Cloud' }],
    spaces: [{ id: 1, isEnabled: true, contracts: [], projectKey: 'TAH', projectName: 'Demo Transit', jiraProjectId: '100', jiraConnectionId: 1, connection: 'Demo Jira Cloud', siteUrl: 'https://demo-site.atlassian.net', health: 'Success', cases: 12 }],
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

const shot = async (page: Page, name: string) => { if (process.env.TIOHUB_JIRA_SHOTS) await page.screenshot({ path: `${process.env.TIOHUB_JIRA_SHOTS}/${name}.png` }); };

test('administrators add and remove a ticket status, and it is offered for Jira mapping', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 1100 });
  const name = `Waiting for parts ${Date.now()}`;
  await page.goto('/admin/config/case-statuses');
  await expect(page.getByText('Fixed workflow value')).toHaveCount(0);
  for (const label of ['New', 'Opened', 'In-progress', 'Waiting for customer', 'Closed', 'Re-opened'])
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  await page.getByRole('button', { name: '+ Add', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill(name);
  await dialog.getByLabel('Behaves as', { exact: true }).selectOption('Active');
  await dialog.getByRole('button', { name: /^(Save|Add)$/ }).click();
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await shot(page, 'case-statuses');
  await page.goto('/cases');
  await page.locator('table tbody a[href^="/cases/"]').first().click();
  await page.goto('/admin/config/case-statuses');
  await startDelete(page, `${name}`);
  await page.getByRole('dialog').getByRole('button', { name: /Delete/ }).click();
  await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
});

test('every status can be chosen for a Jira status, and an unmapped Jira user is resolved as a contact', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 900 });
  await page.route('**/api/v1/admin/jira-connections', r => r.fulfill({ json: { syncEnabled: true, connections: [{ id: 1, name: 'Demo Jira Cloud' }] } }));
  await page.route('**/api/v1/admin/jira-connections/1/statuses', r => r.fulfill({ json: { targets: [{ code: 'New', label: 'New' }, { code: 'Closed', label: 'Closed' }, { code: 'WaitingForCustomer', label: 'Waiting for customer' }],
    rows: [{ id: 1, jiraProjectId: '100', projectKey: 'TAH', jiraStatusId: '9', jiraStatusName: 'Done', jiraStatusCategory: 'done' }] } }));
  await page.route('**/api/v1/admin/jira-connections/1/users', r => r.fulfill({ json: [
    { id: 1, jiraAccountId: 'acc-1', jiraDisplayName: 'Fictional Colleague', classification: 'Unmapped', loginEnabled: false, matchingUsers: [], matchingContacts: [5], lastSeenAt: new Date().toISOString() },
    { id: 2, jiraAccountId: 'acc-2', jiraDisplayName: 'Fictional Member', tioUserId: 9, tioUser: 'Fictional Member', classification: 'VitronicTeamMember', loginEnabled: false, matchingUsers: [], matchingContacts: [], lastSeenAt: new Date().toISOString() }] }));
  await page.route('**/api/v1/admin/jira-connections/1/client-contacts', r => r.fulfill({ json: [{ id: 5, name: 'Fictional Representative', role: 'Manager', clientCode: 'DEMO-NTA' }] }));
  let saved: unknown;
  await page.route('**/api/v1/admin/jira-user-mappings/1', r => { saved = r.request().postDataJSON(); return r.fulfill({ status: 204 }); });
  await page.goto('/admin/integrations/jira/conflicts?tab=workflow');
  await expect(page.getByLabel('Ticket status for Done').locator('option[value="Closed"]')).toHaveText('Closed');
  await shot(page, 'workflow-mappings');
  await page.getByRole('tab', { name: 'Jira users' }).click();
  await expect(page.getByRole('table', { name: 'Mapped Jira users', exact: true })).toContainText('Vitronic team member');
  await expect(page.getByRole('table', { name: 'Unmapped Jira users' })).toContainText('A client contact has this name');
  await shot(page, 'user-mappings');
  await page.getByLabel('Resolve Fictional Colleague').selectOption('contact');
  await page.getByRole('dialog').getByLabel('I confirm this action.').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Map', exact: true }).click();
  await expect.poll(() => saved).toEqual({ tioUserId: null, clientContactId: 5 });
});

test('a Jira user can be mapped to a team member with no role, who already has another Jira account', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 900 });
  await page.goto('/');
  await page.route('**/api/v1/admin/jira-connections', r => r.fulfill({ json: { syncEnabled: true, connections: [{ id: 1, name: 'Demo Jira Cloud' }] } }));
  await page.route('**/api/v1/admin/jira-connections/1/users', r => r.fulfill({ json: [{ id: 1, jiraAccountId: 'acc-1', jiraDisplayName: 'Fictional Twin', classification: 'Unmapped', loginEnabled: false, matchingUsers: [22], matchingContacts: [], lastSeenAt: new Date().toISOString() }] }));
  await page.route('**/api/v1/admin/jira-connections/1/client-contacts', r => r.fulfill({ json: [] }));
  await page.route('**/api/v1/admin/jira-connections/1/mappable-users', r => r.fulfill({ json: [{ id: 21, name: 'Fictional Engineer', teamMember: false, jiraAccounts: [] }, { id: 22, name: 'Fictional Twin', teamMember: true, jiraAccounts: ['acc-old'] }] }));
  let saved: unknown;
  await page.route('**/api/v1/admin/jira-user-mappings/1', r => { saved = r.request().postDataJSON(); return r.fulfill({ status: 204 }); });
  await page.goto('/admin/integrations/jira/conflicts?tab=users');
  await page.getByLabel('Resolve Fictional Twin').selectOption('user');
  const dialog = page.getByRole('dialog');
  const select = dialog.getByLabel('TIO user');
  await expect(select).toHaveValue('22');
  await expect(select.locator('option:checked')).toHaveText('Fictional Twin · Vitronic team member · 1 Jira account already mapped');
  await expect(select.getByRole('option', { name: 'Fictional Engineer', exact: true })).toHaveCount(1);
  await expect(dialog).not.toContainText('not assignable');
  await dialog.getByLabel('I confirm this action.').check();
  await dialog.getByRole('button', { name: 'Map', exact: true }).click();
  await expect.poll(() => saved).toEqual({ tioUserId: 22, clientContactId: null });
});

test('a client contact is created from an unmapped Jira user with only the client, already chosen', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 900 });
  await page.goto('/');
  const id = await clientId(page);
  await page.route('**/api/v1/admin/jira-connections', r => r.fulfill({ json: { syncEnabled: true, connections: [{ id: 1, name: 'Demo Jira Cloud' }] } }));
  await page.route('**/api/v1/admin/jira-connections/1/users', r => r.fulfill({ json: [{ id: 1, jiraAccountId: 'acc-1', jiraDisplayName: 'Fictional Colleague', classification: 'Unmapped', loginEnabled: false, matchingUsers: [], matchingContacts: [], suggestedClientId: id, lastSeenAt: new Date().toISOString() }] }));
  await page.route('**/api/v1/admin/jira-connections/1/client-contacts', r => r.fulfill({ json: [] }));
  let sent: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/jira-user-mappings/1/contact', r => { sent = r.request().postDataJSON(); return r.fulfill({ status: 201, json: { id: 5 } }); });
  await page.goto('/admin/integrations/jira/conflicts?tab=users');
  await page.getByLabel('Resolve Fictional Colleague').selectOption('newContact');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Client')).toHaveValue(String(id));
  await dialog.getByLabel('I confirm this action.').check();
  await dialog.getByRole('button', { name: 'Create and map' }).click();
  await expect.poll(() => sent?.clientId).toBe(id);
  expect(sent?.name).toBe('Fictional Colleague');
});

test('a Jira space is linked to a contract when assigned and later', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 1100 });
  await page.goto('/');
  const id = await clientId(page);
  await page.route(`**/api/v1/clients/${id}/jira`, r => r.fulfill({ json: {
    syncEnabled: true, canManage: true, summary: { enabled: false, assignedSpaces: 1, syncIntervalMinutes: 15, errors: 0, warnings: 0 }, connections: [{ id: 1, name: 'Demo Jira Cloud' }],
    contracts: [{ id: 7, ref: 'CT-1007', title: 'Fictional support agreement', status: 'Active', startDate: '2026-01-01', endDate: '2026-12-31' }, { id: 8, ref: 'CT-1008', title: 'Fictional renewal', status: 'Active', startDate: '2027-01-01', endDate: '2027-12-31' }],
    settings: { isEnabled: false, jiraConnectionId: 1, defaultPriority: 'Normal', nextReviewHours: 48, importDoneIssues: false, syncOnStartup: false, fullReconciliation: true, fullReconciliationDays: 7, syncIntervalMinutes: 15, version: 'AAAA' },
    spaces: [{ id: 1, isEnabled: true, contracts: [], projectKey: 'TAH', projectName: 'Demo Transit', jiraProjectId: '100', jiraConnectionId: 1, connection: 'Demo Jira Cloud', health: 'NotRun', cases: 0 }],
    checks: [], issues: [], runs: [] } }));
  await page.route(`**/api/v1/clients/${id}/jira/available-spaces**`, r => r.fulfill({ json: [{ id: 1, jiraProjectId: '600', projectKey: 'CRM', projectName: 'Customer Portal', availability: 'Available' }] }));
  let linked: unknown;
  await page.route(`**/api/v1/clients/${id}/jira/spaces/1/contracts`, r => { linked = r.request().postDataJSON(); return r.fulfill({ json: { changed: 2 } }); });
  let assigned: unknown;
  await page.route(`**/api/v1/clients/${id}/jira/spaces`, r => { assigned = r.request().postDataJSON(); return r.fulfill({ json: { added: 1 } }); });
  await page.goto(`/clients/${id}?tab=jira`);

  await page.getByRole('button', { name: 'Change the contracts of TAH' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Each ticket belongs to the contract valid on its Jira creation date');
  await dialog.getByLabel(/CT-1007/).check();
  await dialog.getByLabel(/CT-1008/).check();
  await dialog.getByLabel('I confirm this action.').check();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => linked).toEqual({ contractIds: [7, 8], reason: null });

  await page.getByRole('button', { name: '+ Add Jira space' }).click();
  await page.getByLabel('Select CRM').check();
  await page.getByLabel('Contract for tickets from these spaces').selectOption('7');
  await page.getByRole('button', { name: 'Assign selected' }).click();
  await expect.poll(() => assigned).toEqual({ jiraConnectionId: 1, jiraProjectIds: ['600'], contractId: 7 });
});

test('a reassigned Jira space offers only the contracts of the new client', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 1100 });
  await page.goto('/');
  const id = await clientId(page);
  await page.route(`**/api/v1/admin/jira-connections`, r => r.fulfill({ json: { summary: { total: 1, active: 1, spacesDiscovered: 1 }, syncEnabled: true, instances: [], connections: [{ id: 1, name: 'Demo Jira Cloud', siteUrl: 'https://demo-site.atlassian.net', type: 'JiraCloud', authMode: 'ApiToken', isEnabled: true, status: 'Active', health: 'Healthy', spaces: 1, assignedSpaces: 1, connectedClients: 1, credential: {} }] } }));
  await page.route(`**/api/v1/admin/jira-connections/1/spaces`, r => r.fulfill({ json: [{ id: 1, jiraProjectId: '100', projectKey: 'TAH', projectName: 'Demo Transit', missing: false, assignedClientId: 99, assignedClient: 'Earlier client', cases: 0, health: 'NotRun', state: 'Assigned' }] }));
  await page.route(`**/api/v1/clients/${id}/jira`, r => r.fulfill({ json: { contracts: [{ id: 7, ref: 'CT-1007', title: 'Fictional support agreement' }] } }));
  let sent: unknown;
  await page.route(`**/api/v1/admin/jira-connections/1/spaces/100/reassign`, r => { sent = r.request().postDataJSON(); return r.fulfill({ status: 204 }); });
  await page.goto('/admin/integrations/jira');
  await page.getByRole('button', { name: 'Reassign' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('New client').selectOption(String(id));
  await dialog.getByLabel('Contract for new tickets').selectOption('7');
  await dialog.getByLabel('Reason').fill('Contract moved');
  await dialog.getByLabel('I confirm this action.').check();
  await dialog.getByRole('button', { name: 'Reassign' }).click();
  await expect.poll(() => sent).toEqual({ toClientId: id, contractId: 7, reason: 'Contract moved' });
});

test('a Jira priority with no match is mapped on the client page', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 1100 });
  await page.goto('/');
  const id = await clientId(page);
  await page.route(`**/api/v1/clients/${id}/jira`, r => r.fulfill({ json: {
    syncEnabled: true, canManage: true, summary: { enabled: false, assignedSpaces: 0, syncIntervalMinutes: 15, errors: 0, warnings: 0 }, connections: [{ id: 1, name: 'Demo Jira Cloud' }],
    valueMappings: [{ id: 3, kind: 'Priority', jiraValue: 'Blocker' }, { id: 4, kind: 'IssueType', jiraValue: 'Story' }],
    settings: { isEnabled: false, jiraConnectionId: 1, defaultPriority: 'Normal', nextReviewHours: 48, importDoneIssues: false, syncOnStartup: false, fullReconciliation: true, fullReconciliationDays: 7, syncIntervalMinutes: 15, version: 'AAAA' },
    spaces: [], checks: [], issues: [], runs: [] } }));
  let saved: unknown;
  await page.route(`**/api/v1/clients/${id}/jira/value-mappings/3`, r => { saved = r.request().postDataJSON(); return r.fulfill({ status: 204 }); });
  await page.goto(`/clients/${id}?tab=jira`);
  await page.getByLabel('Ticket value for Jira Blocker').selectOption('Critical');
  await expect.poll(() => saved).toEqual({ target: 'Critical' });
  await expect(page.getByLabel('Ticket value for Jira Story').locator('option').nth(1)).toBeAttached();
  await shot(page, 'value-mappings');
});

test('Sync with Jira on a ticket reports what came back', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 900 });
  await page.goto('/cases');
  const href = await page.locator('table tbody a[href^="/cases/"]').first().getAttribute('href');
  const caseId = href!.split('/').pop();
  await page.route(`**/api/v1${href}`, async r => {
    const json = await (await r.fetch()).json();
    await r.fulfill({ json: { ...json, statusFromJira: true, jiraSource: { issueKey: 'TAH-1', url: 'https://demo-site.atlassian.net/browse/TAH-1', connection: 'Demo Jira Cloud', connectionStatus: 'Connected' } } });
  });
  let calls = 0;
  await page.route(`**/api/v1/cases/${caseId}/jira-source/sync`, r => { calls++; return r.fulfill({ json: calls === 1 ? { issueKey: 'TAH-1', updated: false, comments: 2, activities: 1 } : { issueKey: 'TAH-1', updated: false, comments: 0, activities: 0, error: 'Select an active team.' } }); });
  await page.goto(href!);
  // The imported Jira details are a section of the work area, between the key facts and the tabs (not in the details panel).
  const jiraHead = page.locator('.rv-main').getByRole('heading', { name: 'Jira details (imported)' });
  await expect(jiraHead).toBeVisible();
  expect((await jiraHead.boundingBox())!.y).toBeGreaterThan((await page.getByRole('region', { name: 'What matters now' }).boundingBox())!.y);
  expect((await jiraHead.boundingBox())!.y).toBeLessThan((await page.locator('.rv-tabs').boundingBox())!.y);
  await expect(page.getByRole('complementary', { name: 'Ticket details' }).getByRole('heading', { name: 'Jira details (imported)' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sync with Jira' }).click();
  await expect(page.getByText('TAH-1 synchronized: 2 new comment(s), 1 new activity item(s).')).toBeVisible();
  await page.getByRole('button', { name: 'Sync with Jira' }).click();
  await expect(page.getByText('TAH-1 could not be imported: Select an active team.')).toBeVisible();
  await shot(page, 'case-sync');
  await page.unrouteAll({ behavior: 'ignoreErrors' }); // a background refresh may still be answering this route
});

test('the client map lists countries with a flag image', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 900 });
  await page.goto('/map');
  const flag = page.locator('.cmap-country .cmap-flag').first();
  await expect(flag).toBeVisible();
  await flag.scrollIntoViewIfNeeded();
  await expect.poll(() => flag.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
  await shot(page, 'client-map-flags');
});

test('a Jira-synced ticket shows its status read-only and only actions that do not change it', async ({ page }) => {
  await page.setViewportSize({ width: 1672, height: 900 });
  await page.goto('/cases');
  const href = await page.locator('table tbody a[href^="/cases/"]').first().getAttribute('href');
  await page.route(`**/api/v1${href}`, async r => {
    const json = await (await r.fetch()).json();
    const off = ['canTriage', 'canStart', 'canClose', 'canRequestValidation', 'canReturnToWork', 'canChangeStatus', 'canSetWaiting', 'canChangeDue', 'canReopen', 'canCancel'];
    await r.fulfill({ json: { ...json, statusFromJira: true, clientRepresentative: 'Fictional Representative', internalAssignee: 'Fictional Colleague',
      permissions: { ...json.permissions, ...Object.fromEntries(off.map(k => [k, false])) } } });
  });
  await page.goto(href!);
  await expect(page.getByText('status follows Jira')).toBeVisible();
  await expect(page.getByText('Assigned in Jira to Fictional Representative')).toBeVisible();
  for (const name of ['Start work', 'Set waiting', 'End waiting', 'Close', 'Cancel ticket', 'Change due date', 'Change status', 'Reopen', 'Request validation'])
    await expect(page.locator('.page-head').getByRole('button', { name, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  for (const name of ['Cancel ticket', 'Change due date', 'Change status'])
    await expect(page.getByRole('menuitem', { name, exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Edit', exact: true })).toBeVisible();
  await shot(page, 'synced-case');
});

test.describe('Tickets table columns', () => {
  test('the default columns can be added to and removed from, and the choice is remembered', async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.goto('/cases');
    await page.evaluate(() => localStorage.removeItem('vt-columns:cases-v2'));
    await page.reload();
    const table = page.getByRole('table', { name: 'Tickets' });
    const headers = table.getByRole('columnheader');
    await expect(headers.first()).toBeVisible();
    const shown = (await headers.allInnerTexts()).map(t => t.trim().split('\n')[0]).filter(t => t && t !== 'Actions' && t !== 'Details');
    expect(shown).toEqual(['Ticket', 'Client', 'Priority', 'Status', 'Owner', 'Deadline']);
    await shot(page, 'cases-columns');

    await page.getByRole('button', { name: 'Columns' }).click();
    const list = page.getByRole('list', { name: 'Columns shown' });
    await list.getByRole('checkbox', { name: 'Team' }).check();
    await list.getByRole('checkbox', { name: 'Client' }).uncheck();
    await expect(table.getByRole('columnheader', { name: 'Team' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Client' })).toHaveCount(0);

    await page.reload();
    await expect(table.getByRole('columnheader', { name: 'Team' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Client' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Columns' }).click();
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(table.getByRole('columnheader', { name: 'Client' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Team' })).toHaveCount(0);
    await page.evaluate(() => localStorage.removeItem('vt-columns:cases-v2'));
  });
});
