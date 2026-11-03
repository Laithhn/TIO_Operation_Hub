import { expect, test } from '@playwright/test';

test('Roles compares the four-level permission hierarchy and opens the selected role in Rights', async ({ page }) => {
  await page.goto('/admin/roles');
  const matrix = page.getByRole('region', { name: 'Role and permission comparison' });
  await expect(page.getByRole('heading', { name: 'Role access matrix' })).toBeVisible();
  await expect(matrix.getByRole('table', { name: 'Saved permission assignments by role' })).toBeVisible();
  await expect(matrix.getByRole('columnheader', { name: /TIO Manager/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/role-matrix-desktop.png', fullPage: false });

  await page.getByRole('combobox', { name: 'Module' }).selectOption('Cases');
  await page.getByRole('searchbox', { name: 'Find a right' }).fill('Cases:View');
  await expect(matrix.getByRole('rowheader', { name: /Cases/ }).first()).toBeVisible();
  await matrix.getByRole('button', { name: 'Collapse Cases' }).first().click();
  await expect(matrix.getByRole('button', { name: 'View pages and records', exact: true })).toHaveCount(0);
  await matrix.getByRole('button', { name: 'Expand Cases' }).first().click();
  await matrix.getByRole('button', { name: 'View pages and records', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Selected right details' }).getByText('Cases:View', { exact: true })).toBeVisible();
  const selected = page.getByRole('complementary', { name: 'Selected right details' });
  await selected.getByRole('link', { name: 'Configure View pages and records for Operation Engineer' }).click();
  await expect(page).toHaveURL(/\/admin\/rights\?role=\d+&permission=Cases%3AView/);
  await expect(page.getByRole('combobox', { name: 'Role to configure' })).toHaveValue(/\d+/);
  await expect(page.getByRole('searchbox', { name: 'Search permissions' })).toHaveValue('Cases:View');
});

test('Roles matrix stays contained on a phone and preserves the role catalog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/roles');
  await expect(page.getByRole('heading', { name: 'Role access matrix' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Roles' })).toBeVisible();
  await page.screenshot({ path: 'test-results/role-matrix-phone.png', fullPage: false });
  const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
});
