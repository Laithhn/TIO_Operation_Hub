import { expect, test, type Page } from '@playwright/test';

const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

async function api<T>(page: Page, path: string, body?: unknown): Promise<T> {
  return page.evaluate(async ({ path, body }) => {
    const token = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];
    const response = await fetch(`/api/v1${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${path}: ${response.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }, { path, body });
}

test('penalty recalculation displays validation detail and permits a successful retry', async ({ page }) => {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  const me = await api<{ id: number }>(page, '/me');
  const client = await api<{ id: number }>(page, '/clients', {
    code: unique('PEN'), name: 'Penalty retry regression client', country: 'Oman', status: 'Active', ownerUserId: me.id
  });
  const project = await api<{ id: number }>(page, '/projects', {
    clientId: client.id, code: unique('PRJ'), name: 'Penalty retry regression project', status: 'Active', ownerUserId: me.id
  });
  const title = unique('Penalty retry contract');
  const contract = await api<{ id: number }>(page, '/contracts', {
    clientId: client.id, projectId: project.id, title, type: 'SlaSupport', status: 'Draft', ownerUserId: me.id,
    currency: 'AED', support24x7: true, supportTimeZone: 'UTC',
    slaTargets: [{ priority: 'Normal', responseMinutes: 60, resolutionMinutes: 480, basis: 'CalendarHours' }],
    penaltyClauses: [{ name: 'Response penalty', trigger: 'ResponseSlaBreached', calculation: 'FixedPerBreach', fixedAmount: 80, monthlyCap: 100, billingTimeZone: 'UTC' }]
  });
  await page.goto(`/contracts/${contract.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
  const reason = page.getByLabel('Reason for recalculation or confirmation', { exact: true });
  const recalculate = page.getByRole('button', { name: 'Recalculate', exact: true });
  await expect(recalculate).toBeDisabled();
  const reviewReason = 'Review the current monthly penalty assessment';
  await reason.fill(reviewReason);

  const endpoint = `/api/v1/contracts/${contract.id}/penalty-assessments/recalculate`;
  const validationMessage = 'Assessment capacity has been reached. Review existing assessments before recalculating.';
  await page.route(`**${endpoint}`, route => route.fulfill({
    status: 422,
    contentType: 'application/problem+json',
    body: JSON.stringify({ type: 'https://tio-hub/errors/422', title: 'Some values need attention.', status: 422, errors: { penaltyAssessments: [validationMessage] } })
  }), { times: 1 });
  const failedResponse = page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.request().method() === 'POST');
  await recalculate.click();
  expect((await failedResponse).status()).toBe(422);
  const error = page.getByRole('alert').filter({ hasText: validationMessage });
  await expect(error).toBeVisible();
  await expect(reason).toHaveValue(reviewReason);
  await expect(recalculate).toBeEnabled();

  // The one-shot failure route is gone: retry reaches the real API and keeps the saved domain fixture.
  const successfulResponse = page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.request().method() === 'POST');
  await recalculate.click();
  expect((await successfulResponse).ok()).toBeTruthy();
  await expect(error).toHaveCount(0);
  await expect(page.getByText('Penalty assessment recalculated.', { exact: true })).toBeVisible();
  await expect(reason).toHaveValue(reviewReason);
  await expect(recalculate).toBeEnabled();
  expect(await api<unknown[]>(page, `/contracts/${contract.id}/penalty-assessments`)).toEqual([]);
});
