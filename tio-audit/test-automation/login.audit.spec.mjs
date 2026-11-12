import { test, expect, assertStructureAndReflow } from './fixtures.mjs';
import { viewports } from './route-catalog.mjs';

// Explicitly anonymous even when an authenticated storage file is configured for the other files.
test.use({ storageState: { cookies: [], origins: [] } });

for (const viewport of viewports) {
  test.describe(`Anonymous ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test('sign-in labels, disabled empty submission, keyboard order and reflow', async ({ page, audit }, info) => {
      await page.goto('/login');
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('.state-msg[role="status"]')).toHaveCount(0);
      test.skip(await page.getByRole('heading', { name: /set up the first/i }).count() > 0, 'First-administrator setup is required; no setup attempted.');
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      test.skip(await page.getByRole('link', { name: 'Open the hub' }).count() > 0, 'Windows sign-in installation: forms checks do not apply.');
      const account = page.getByRole('textbox', { name: 'Account name', exact: true });
      const password = page.getByLabel('Password', { exact: true });
      await expect(account).toBeVisible();
      await expect(password).toHaveAttribute('type', 'password');
      await expect(account).toHaveAttribute('autocomplete', 'username');
      await expect(password).toHaveAttribute('autocomplete', 'current-password');
      await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
      await account.focus();
      await page.keyboard.press('Tab');
      await expect(password).toBeFocused();
      await assertStructureAndReflow(page, audit, info);
      // No credentials are entered and no form is submitted.
    });
  });
}

for (const route of ['/cases', '/admin/users']) {
  test(`Anonymous protected deep link ${route} requires authentication`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?returnUrl=/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    const url = new URL(page.url());
    expect(url.searchParams.get('returnUrl')).toBe(route);
  });
}
