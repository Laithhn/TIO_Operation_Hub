import { expect, test, type Page } from '@playwright/test';

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

const future = () => new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16);
async function confirm(page: Page, title: string, button: string) {
  const dialog = page.getByRole('dialog', { name: title, exact: true });
  await dialog.getByLabel('I confirm this action.').check();
  await dialog.getByRole('button', { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
}

test('next action remains optional through triage, progress, validation, closure and reopening', async ({ page }) => {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  const me = await api<{ id: number }>(page, '/me');
  const clients = await api<{ items: { id: number }[] }>(page, '/clients?pageSize=1');
  const reference = await api<{ teams: { id: number; isActive: boolean }[] }>(page, '/reference');
  const created = await api<{ id: number }>(page, '/cases', {
    title: `Optional next action ${Math.random().toString(36).slice(2, 9)}`, type: 'Incident', scope: 'Client', clientId: clients.items[0].id,
    responsibleTeamId: reference.teams.find(t => t.isActive)!.id, ownerUserId: me.id,
    impactSummary: 'Lifecycle regression', priority: 'Normal', nextReviewAt: new Date(Date.now() + 86400000).toISOString()
  });
  await page.goto(`/cases/${created.id}`);
  await page.getByRole('button', { name: 'Triage', exact: true }).click();
  const triage = page.getByRole('dialog', { name: 'Triage case', exact: true });
  await expect(triage.getByLabel('Next action (optional)', { exact: true })).toHaveValue('');
  await triage.getByLabel('Next review', { exact: true }).fill(future());
  await confirm(page, 'Triage case', 'Confirm triage');
  await page.getByRole('button', { name: 'Start work', exact: true }).click();
  await confirm(page, 'Start work', 'Start');

  await page.getByRole('button', { name: 'Record progress', exact: true }).click();
  const progress = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await expect(progress.getByLabel('Next action (optional)', { exact: true })).toHaveValue('');
  await progress.getByLabel('Progress summary', { exact: true }).fill('Restored service and verified imports');
  await progress.getByLabel('Next review', { exact: true }).fill(future());
  await confirm(page, 'Record progress', 'Save progress');

  await page.getByRole('button', { name: 'Request validation', exact: true }).click();
  const validation = page.getByRole('dialog', { name: 'Request validation', exact: true });
  await validation.getByLabel('Delivered outcome / progress', { exact: true }).fill('Service restored');
  await validation.getByLabel('Validation request', { exact: true }).fill('Please verify imports in the customer portal');
  await expect(validation.getByLabel('Next action (optional)', { exact: true })).toHaveValue('');
  await confirm(page, 'Request validation', 'Request validation');

  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const close = page.getByRole('dialog', { name: 'Close case', exact: true });
  await close.getByLabel('Outcome', { exact: true }).fill('Customer confirmed recovery');
  await close.getByLabel('Validation evidence', { exact: true }).fill('Customer acceptance recorded');
  await confirm(page, 'Close case', 'Close case');
  await page.getByRole('button', { name: 'Reopen', exact: true }).click();
  const reopen = page.getByRole('dialog', { name: 'Reopen case', exact: true });
  await reopen.getByLabel('Reopening reason', { exact: true }).fill('Follow-up investigation');
  await reopen.getByLabel('Next review', { exact: true }).fill(future());
  await expect(reopen.getByLabel('Next action (optional)', { exact: true })).toHaveValue('');
  await confirm(page, 'Reopen case', 'Reopen to Triaged');
  const saved = await api<{ status: string; nextAction: string; reopenCount: number }>(page, `/cases/${created.id}`);
  expect(saved.status).toBe('Triaged');
  expect(saved.nextAction).toBe('');
  expect(saved.reopenCount).toBe(1);
});
