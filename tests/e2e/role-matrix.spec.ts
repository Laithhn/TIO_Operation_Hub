import { expect, test } from '@playwright/test';

test('Roles compares saved rights across roles and opens a role in Rights', async ({ page }) => {
  await page.goto('/admin/roles');
  const matrix = page.getByRole('region', { name: 'Role and right comparison' });
  await expect(page.getByRole('heading', { name: 'Compare roles' })).toBeVisible();
  await expect(matrix.getByRole('table', { name: 'Saved rights by role' })).toBeVisible();
  await expect(matrix.getByRole('columnheader', { name: /TIO Manager/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/role-matrix-desktop.png', fullPage: false });

  await page.getByRole('combobox', { name: 'Module' }).selectOption('Tickets');
  await page.getByRole('searchbox', { name: 'Find a right' }).fill('Cases:View');
  await expect(matrix.getByRole('rowheader', { name: /View pages and records/ })).toBeVisible();
  await matrix.getByRole('link', { name: 'Edit the rights of Operation Engineer' }).click();
  await expect(page).toHaveURL(/\/admin\/rights\?role=\d+/);
  await expect(page.getByRole('combobox', { name: 'Role', exact: true })).toHaveValue(/\d+/);
});

test('Features stay collapsed until opened, so the comparison stays readable', async ({ page }) => {
  await page.goto('/admin/roles');
  const matrix = page.getByRole('region', { name: 'Role and right comparison' });
  await expect(matrix.getByRole('rowheader', { name: /View pages and records/ })).toHaveCount(0);
  await matrix.getByRole('button', { name: 'Expand Tickets: Tickets' }).click();
  await expect(matrix.getByRole('rowheader', { name: /View pages and records/ })).toBeVisible();
  await matrix.getByRole('button', { name: 'Collapse Tickets: Tickets' }).click();
  await expect(matrix.getByRole('rowheader', { name: /View pages and records/ })).toHaveCount(0);
});

test('Roles comparison stays contained on a phone and keeps the role list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/roles');
  await expect(page.getByRole('heading', { name: 'Compare roles' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Roles' })).toBeVisible();
  await page.screenshot({ path: 'test-results/role-matrix-phone.png', fullPage: false });
  const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
});
