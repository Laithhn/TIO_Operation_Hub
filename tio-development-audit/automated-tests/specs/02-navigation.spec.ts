import { test, expect } from '@playwright/test';
import { MANAGER, signInAs } from './helpers';

const sections: [string, string, RegExp][] = [
  ['Dashboard', '/', /Operations Command Center/], ['Clients', '/clients', /Clients/], ['Products', '/products', /Products/], ['Cases', '/cases', /Cases/],
  ['Commitments', '/commitments', /Commitments/], ['Escalations', '/escalations', /Escalations/], ['Teams', '/teams', /Teams/]
];

test.describe('Navigation', () => {
  test.beforeEach(async ({ context }) => signInAs(context, MANAGER));

  test('every main section opens from the top bar without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
    for (const [label, path, heading] of sections) {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(path === '/' ? '/$' : path));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    }
    expect(errors).toEqual([]);
  });

  test('deep link, refresh and back/forward keep the page and its filters', async ({ page }) => {
    await page.goto('/cases?priority=Critical');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cases');
    await page.reload();
    await expect(page).toHaveURL(/priority=Critical/);
    await page.goto('/commitments');
    await page.goBack();
    await expect(page).toHaveURL(/\/cases\?priority=Critical/);
    await page.goForward();
    await expect(page).toHaveURL(/\/commitments/);
  });

  test('unknown route shows the not-found page', async ({ page }) => {
    await page.goto('/this/route/does-not-exist');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  });

  test('missing record shows a not-found message', async ({ page }) => {
    await page.goto('/cases/999999');
    await expect(page.getByText('Not found, or you do not have access to it.')).toBeVisible();
  });

  test('keyboard: skip link is first and focus is visible', async ({ page }) => {
    await page.goto('/cases', { waitUntil: 'networkidle' });
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toHaveCount(1);
    expect(await page.evaluate(() => document.querySelector('a,button,input,select')?.textContent)).toContain('Skip to content');
    await skip.focus();
    expect(await skip.evaluate(e => getComputedStyle(e).outlineStyle)).toBe('solid');
  });

  // Audit finding TIO-DEV-AUDIT-016: at 1366x768 the top navigation is clipped.
  test('@defect top navigation tabs are fully visible at 1366x768', async ({ page }) => {
    await page.goto('/cases');
    for (const label of ['Dashboard', 'Administration']) {
      const link = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true });
      const box = (await link.boundingBox())!;
      const visibleAtCentre = await page.evaluate(([x, y, text]) => (document.elementFromPoint(x as number, y as number)?.textContent ?? '').trim() === text, [box.x + 4, box.y + box.height / 2, label]);
      expect(box.x, `${label} starts inside the viewport`).toBeGreaterThanOrEqual(0);
      expect(visibleAtCentre, `${label} is not covered at its left edge`).toBeTruthy();
      const right = await page.evaluate(([x, y, text]) => (document.elementFromPoint(x as number, y as number)?.textContent ?? '').trim() === text, [box.x + box.width - 4, box.y + box.height / 2, label]);
      expect(right, `${label} is not covered at its right edge`).toBeTruthy();
    }
  });
});
