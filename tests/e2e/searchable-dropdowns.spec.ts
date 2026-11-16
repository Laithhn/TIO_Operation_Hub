import { expect, test } from '@playwright/test';

// A118 (owner request, 16 Nov 2026): every dropdown can be searched. The native <select> stays the control (so selectOption
// keeps working); clicking it or typing on it opens a list with a filter box. Real API, isolated database, DEV\manager.

const list = (page: import('@playwright/test').Page) => page.locator('.select-search');

test.describe('Searchable dropdowns (A118)', () => {
  test('click a dropdown, type to filter, Enter chooses', async ({ page }) => {
    await page.goto('/commitments');
    const direction = page.getByRole('combobox', { name: 'Direction', exact: true });
    await direction.click();
    const filter = list(page).getByRole('combobox', { name: 'Filter the list' });
    await expect(filter).toBeFocused();
    await expect(list(page).getByRole('option')).toHaveText(['All directions', 'Ours', 'External to us']);
    await filter.fill('ext');
    await expect(list(page).getByRole('option')).toHaveText(['External to us']);
    await filter.press('Enter');
    await expect(list(page)).toHaveCount(0);
    await expect(direction).toHaveValue('External');
    await expect(direction).toBeFocused();
    await expect(page).toHaveURL(/direction=External/);
  });

  test('typing on a focused dropdown starts the search; Escape keeps the value', async ({ page }) => {
    await page.goto('/commitments');
    const health = page.getByRole('combobox', { name: 'Health', exact: true });
    await health.focus();
    await page.keyboard.press('b');
    await page.keyboard.press('l');
    await expect(list(page).getByRole('combobox', { name: 'Filter the list' })).toHaveValue('bl');
    await expect(list(page).getByRole('option')).toHaveText(['Blocked']);
    await page.keyboard.press('Escape');
    await expect(list(page)).toHaveCount(0);
    await expect(health).toHaveValue('');
    await expect(health).toBeFocused();
    await page.getByRole('combobox', { name: 'Owner', exact: true }).click();
    await list(page).getByRole('combobox', { name: 'Filter the list' }).fill('zzz');
    await expect(list(page)).toContainText('No matching options');
    await page.getByRole('heading', { level: 1 }).click();
    await expect(list(page)).toHaveCount(0);
  });

  test('inside a dialog, Escape closes only the list, and selectOption still works', async ({ page }) => {
    await page.goto('/commitments/1');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const owner = dialog.getByRole('combobox', { name: 'Accountable owner' });
    await owner.click();
    await list(page).getByRole('combobox', { name: 'Filter the list' }).fill('engineer');
    await expect(list(page).getByRole('option')).not.toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(list(page)).toHaveCount(0);
    await expect(dialog).toBeVisible();
    // A test (or script) setting the value while the list is open closes the list.
    await owner.click();
    await expect(list(page)).toBeVisible();
    const value = await owner.locator('option').nth(1).getAttribute('value');
    await owner.selectOption(value!);
    await expect(list(page)).toHaveCount(0);
    await expect(owner).toHaveValue(value!);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  });
});
