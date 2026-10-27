import { expect, test, type Page } from '@playwright/test';
import { VT_ROW, VT_CELL, exactText } from './vtTable';

type Organization = { id: number; name: string; clientId?: number };
type Relationship = { id: number; parentOrganizationId: number; childOrganizationId: number; relationshipType?: string; version: string };
type Structure = { rootOrganizationId: number; organizations: Organization[]; relationships: Relationship[]; canEdit: boolean; canCreateOrganization: boolean };
const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;

async function api<T>(page: Page, path: string, body?: unknown): Promise<T> {
  return page.evaluate(async ({ path, body }) => {
    const token = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];
    const response = await fetch(`/api/v1${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json', ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }, { path, body });
}

// GET /me issues the XSRF-TOKEN cookie; wait for it before direct API writes so they cannot race the app's first request.
async function openApp(page: Page) {
  const me = page.waitForResponse(r => /\/api\/v1\/me$/.test(r.url()) && r.ok());
  await page.goto('/clients');
  await me;
}

async function clientFixture(page: Page) {
  await openApp(page);
  const me = await api<{ id: number }>(page, '/me');
  const code = unique('ORG');
  const client = await api<{ id: number }>(page, '/clients', { code, name: `${code} standalone client`, country: 'Oman', status: 'Opportunity', ownerUserId: me.id, team: [] });
  const graph = await api<Structure>(page, `/clients/${client.id}/organizational-structure`);
  return { client, graph, code, me };
}

async function openStructure(page: Page, clientId: number) {
  await page.goto(`/clients/${clientId}`);
  await page.getByRole('tab', { name: 'Organizations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Organizational Structure', exact: true })).toBeVisible();
  await expect(page.getByLabel('Organization context')).toBeVisible();
}

test.describe('Optional contextual organization structures', () => {
  test('standalone client creation ignores canceled relationship input and keeps the existing form', async ({ page }) => {
    const code = unique('SOLO');
    await page.goto('/clients/new');
    await page.getByLabel('Client alias').fill(code);
    await page.getByLabel('Client name').fill(`${code} client`);
    await page.getByLabel('Country', { exact: true }).selectOption('Oman');
    await page.getByLabel('Project manager', { exact: true }).selectOption({ label: 'Mara Okafor (demo manager)' });
    const section = page.locator('details.org-optional');
    await expect(section).not.toHaveAttribute('open', '');
    await section.locator('summary').click();
    await section.getByRole('button', { name: '+ Add Organization Relationship' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add organization relationship' });
    await dialog.getByLabel('Related organization source').selectOption('new');
    await dialog.getByLabel('Organization name', { exact: true }).fill('Canceled organization draft');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByLabel('Client name')).toHaveValue(`${code} client`);
    const saved = page.waitForRequest(r => r.method() === 'POST' && /\/api\/v1\/clients$/.test(r.url()));
    await page.getByRole('button', { name: 'Save client' }).click();
    expect((await saved).postDataJSON()).not.toHaveProperty('organizationRelationships');
    await expect(page).toHaveURL(/\/clients\/\d+$/);
    const id = Number(page.url().match(/\/clients\/(\d+)/)![1]);
    await openStructure(page, id);
    await expect(page.getByText('No organizational relationships. This client is valid on its own.')).toBeVisible();
    const graph = await api<Structure>(page, `/clients/${id}/organizational-structure`);
    expect(graph.relationships).toHaveLength(0);
  });

  test('initial client save creates optional name-only children atomically and reuses existing organizations', async ({ page }) => {
    await openApp(page);
    const existingName = unique('Reusable organization');
    const existing = await api<Organization>(page, '/organizations', { name: existingName });
    const code = unique('GRAPH');
    const newName = unique('New contractor');
    await page.goto('/clients/new');
    await page.getByLabel('Client alias').fill(code);
    await page.getByLabel('Client name').fill(`${code} client`);
    await page.getByLabel('Country', { exact: true }).selectOption('Oman');
    await page.getByLabel('Project manager', { exact: true }).selectOption({ label: 'Mara Okafor (demo manager)' });
    const section = page.locator('details.org-optional');
    await section.locator('summary').click();
    await section.getByRole('button', { name: '+ Add Organization Relationship' }).click();
    let dialog = page.getByRole('dialog', { name: 'Add organization relationship' });
    await dialog.getByLabel('Related organization source').selectOption('new');
    await dialog.getByLabel('Organization name', { exact: true }).fill(newName);
    await dialog.getByRole('button', { name: 'Add relationship', exact: true }).click();
    await section.getByRole('button', { name: '+ Add Organization Relationship' }).click();
    dialog = page.getByRole('dialog', { name: 'Add organization relationship' });
    await dialog.getByLabel('Search organizations', { exact: true }).fill(existingName);
    await expect(dialog.getByLabel('Related organization', { exact: true }).locator(`option[value="${existing.id}"]`)).toHaveCount(1);
    await dialog.getByLabel('Related organization', { exact: true }).selectOption(String(existing.id));
    await dialog.getByRole('button', { name: 'Add relationship', exact: true }).click();
    await page.getByRole('button', { name: 'Save client' }).click();
    await expect(page).toHaveURL(/\/clients\/\d+$/);
    const id = Number(page.url().match(/\/clients\/(\d+)/)![1]);
    await openStructure(page, id);
    const graph = await api<Structure>(page, `/clients/${id}/organizational-structure`);
    expect(graph.relationships).toHaveLength(2);
    expect(graph.organizations.some(o => o.id === existing.id)).toBe(true);
    await expect(page.locator('.org-diagram')).toContainText(newName);
    const matches = await api<{ items: Organization[] }>(page, `/organizations?q=${encodeURIComponent(existingName)}`);
    expect(matches.items.filter(o => o.name === existingName)).toHaveLength(1);
  });

  test('directory creates independent organizations, nested links can be edited and unlinked without deleting records', async ({ page }) => {
    const { client, graph } = await clientFixture(page);
    const contractorName = unique('Independent contractor');
    const supplierName = unique('Nested supplier');
    await openStructure(page, client.id);
    await page.getByRole('button', { name: 'Organization directory', exact: true }).click();
    await page.getByRole('button', { name: '+ Create independent organization' }).click();
    await page.getByRole('dialog', { name: 'Create organization' }).getByLabel('Organization name', { exact: true }).fill(contractorName);
    await page.getByRole('button', { name: 'Create organization', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Organization directory' })).toBeVisible();
    await page.getByRole('button', { name: 'Close directory' }).click();
    await page.getByRole('button', { name: '+ Add Organization Relationship' }).click();
    let dialog = page.getByRole('dialog', { name: 'Add organization relationship' });
    await dialog.getByLabel('Search organizations', { exact: true }).fill(contractorName);
    const organization = (await api<{ items: Organization[] }>(page, `/organizations?q=${encodeURIComponent(contractorName)}`)).items.find(o => o.name === contractorName)!;
    await expect(dialog.getByLabel('Related organization', { exact: true }).locator(`option[value="${organization.id}"]`)).toHaveCount(1);
    await dialog.getByLabel('Related organization', { exact: true }).selectOption(String(organization.id));
    await dialog.getByRole('button', { name: 'Add relationship', exact: true }).click();
    await expect(dialog).toBeHidden();
    const contractorNode = page.locator('.org-node').filter({ has: page.locator('.org-node-name', { hasText: contractorName }) });
    await contractorNode.getByRole('button', { name: 'Add child', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Add organization relationship' });
    await dialog.getByLabel('Relationship description').fill('Retained while creating a new organization');
    await dialog.getByRole('button', { name: '+ Create new organization' }).click();
    await page.getByRole('dialog', { name: 'Create organization' }).getByLabel('Organization name', { exact: true }).fill(supplierName);
    await page.getByRole('button', { name: 'Create organization', exact: true }).click();
    await expect(dialog.getByLabel('Relationship description')).toHaveValue('Retained while creating a new organization');
    await expect(dialog.getByLabel('Parent organization', { exact: true })).toHaveValue(String(organization.id));
    await dialog.getByRole('button', { name: 'Add relationship', exact: true }).click();
    await expect(dialog).toBeHidden();
    const supplierNode = page.locator('.org-node').filter({ has: page.locator('.org-node-name', { hasText: supplierName }) });
    await supplierNode.getByRole('button', { name: 'Edit relationship / move' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit organization relationship' });
    await edit.getByLabel('Relationship description').fill('Updated contextual relationship');
    await edit.getByRole('button', { name: 'Save relationship' }).click();
    await expect(edit).toBeHidden();
    await expect(supplierNode).toContainText('Updated contextual relationship');
    await supplierNode.getByRole('button', { name: 'Unlink', exact: true }).click();
    const unlink = page.getByRole('dialog', { name: 'Unlink organization' });
    await unlink.getByLabel('I confirm this action.').check();
    await unlink.getByRole('button', { name: 'Unlink organization', exact: true }).click();
    await expect(unlink).toBeHidden();
    const after = await api<Structure>(page, `/clients/${client.id}/organizational-structure`);
    expect(after.relationships).toHaveLength(1);
    expect(after.relationships[0].parentOrganizationId).toBe(graph.rootOrganizationId);
    const preserved = await api<{ items: Organization[] }>(page, `/organizations?q=${encodeURIComponent(supplierName)}`);
    expect(preserved.items.some(o => o.name === supplierName)).toBe(true);
  });

  test('project contexts preserve distinct roles and multiple parents are displayed accurately', async ({ page }) => {
    const { client, graph, me } = await clientFixture(page);
    const organizationName = unique('Shared org');
    const alternateName = unique('Second parent');
    const organization = { ...await api<Organization>(page, '/organizations', { name: organizationName }), name: organizationName };
    const alternate = { ...await api<Organization>(page, '/organizations', { name: alternateName }), name: alternateName };
    const project = await api<{ id: number }>(page, '/projects', { clientId: client.id, code: unique('PROJECT'), name: 'Contextual hierarchy project', ownerUserId: me.id, status: 'Active', productIds: [] });
    const references = await api<{ lookups: Record<string, { code: string; label: string; isRetired: boolean }[]> }>(page, '/reference');
    const roleOptions = references.lookups.OrganizationRelationshipType.filter(r => !r.isRetired);
    expect(roleOptions.length).toBeGreaterThan(1);
    const [roleA, roleB] = roleOptions;
    const link = (parentOrganizationId: number, childOrganizationId: number, relationshipType: string, projectId?: number) => api(page, `/clients/${client.id}/organization-relationships${projectId ? `?projectId=${projectId}` : ''}`, { parentOrganizationId, childOrganizationId, relationshipType });
    await link(graph.rootOrganizationId, organization.id, roleA.code);
    await link(graph.rootOrganizationId, alternate.id, roleA.code);
    await link(alternate.id, organization.id, roleB.code);
    await link(graph.rootOrganizationId, organization.id, roleB.code, project.id);
    await openStructure(page, client.id);
    await expect(page.locator('.org-diagram').getByText('Shared organization · 2 parents')).toHaveCount(2);
    await page.getByLabel('Organization view').selectOption('table');
    const organizationsTable = page.getByRole('region', { name: 'Organizations in this context' });
    const row = organizationsTable.locator(VT_ROW).filter({ has: page.locator(VT_CELL).filter({ hasText: exactText(organization.name) }) });
    await expect(row.locator(VT_CELL).nth(1)).toContainText(alternate.name);
    await expect(row.locator(VT_CELL).nth(1)).toContainText(roleB.label);
    await page.getByLabel('Organization context').selectOption(String(project.id));
    await expect(page.getByRole('region', { name: 'Organization relationships' }).locator(VT_ROW)).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Organization relationships' })).toContainText(roleB.label);
    await page.getByLabel('Organization context').selectOption('');
    await expect(page.getByRole('region', { name: 'Organization relationships' }).locator(VT_ROW)).toHaveCount(3);
  });

  test('read-only graph flags hide mutations while keeping the accessible table available', async ({ page }) => {
    const { client } = await clientFixture(page);
    await page.route(`**/api/v1/clients/${client.id}/organizational-structure*`, async route => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({ response, json: { ...body, canEdit: false, canCreateOrganization: false } });
    });
    await openStructure(page, client.id);
    await expect(page.getByText('Read-only organizational structure.')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Organization Relationship' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add child', exact: true })).toHaveCount(0);
    await page.getByLabel('Organization view').selectOption('table');
    await expect(page.getByRole('region', { name: 'Organizations in this context' })).toBeVisible();
    await page.getByRole('button', { name: 'Organization directory', exact: true }).click();
    await expect(page.getByRole('button', { name: '+ Create independent organization' })).toHaveCount(0);
  });
});
