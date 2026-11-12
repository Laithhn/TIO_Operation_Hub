import { test, expect } from '@playwright/test';
import { MANAGER, signInAs } from './helpers';

const sections: [string, string, RegExp][] = [
  ['Clients', '/clients', /Clients/], ['Products', '/products', /Products/], ['Tickets', '/cases', /Tickets/], ['Commitments', '/commitments', /Commitments/]
];

test.describe('Navigation', () => {
  test.beforeEach(async ({ context }) => signInAs(context, MANAGER));

  test('main sections open from the top bar without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
    for (const [label, path, heading] of sections) {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(path));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    }
    expect(errors).toEqual([]);
  });

  test('sections that do not fit are reachable from the More menu', async ({ page }) => {
    await page.goto('/cases');
    await page.getByRole('button', { name: /More/ }).first().click();
    await page.getByRole('menuitem', { name: /Escalations/ }).or(page.getByRole('link', { name: 'Escalations', exact: true })).first().click();
    await expect(page).toHaveURL(/\/escalations/);
  });

  test('deep link, refresh and back/forward keep the page and its filters', async ({ page }) => {
    await page.goto('/cases?priority=Critical');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tickets');
    await page.reload();
    await expect(page).toHaveURL(/priority=Critical/);
    await page.goto('/commitments');
    await page.goBack();
    await expect(page).toHaveURL(/\/cases\?priority=Critical/);
    await page.goForward();
    await expect(page).toHaveURL(/\/commitments/);
  });

  // Audit finding TIO-260-AUDIT-023: an address that does not exist answers "Access denied" to a user who holds every right.
  test('@defect unknown route says the page does not exist', async ({ page }) => {
    await page.goto('/this/route/does-not-exist');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/not found/i);
  });

  test('missing record shows a not-found message with guidance', async ({ page }) => {
    await page.goto('/cases/999999');
    await expect(page.getByText('Not found, or you do not have access to it.').first()).toBeVisible();
    await expect(page.getByText(/open the record from its list/i)).toBeVisible();
  });

  test('keyboard: skip link is first and focus is visible', async ({ page }) => {
    await page.goto('/cases', { waitUntil: 'networkidle' });
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toHaveCount(1);
    await skip.focus();
    expect(await skip.evaluate(e => getComputedStyle(e).outlineStyle)).toBe('solid');
  });

  // Finding 016 of the 2.29.0 audit (clipped navigation). Fixed in 2.60.0: kept as a regression test.
  test('top navigation links are fully inside the viewport at 1366x768', async ({ page }) => {
    await page.goto('/cases', { waitUntil: 'networkidle' });
    const boxes = await page.getByRole('navigation', { name: 'Main' }).getByRole('link').evaluateAll(a => a.map(x => { const r = x.getBoundingClientRect(); return [x.textContent, r.left, r.right, r.width]; }));
    expect(boxes.length).toBeGreaterThanOrEqual(5);
    for (const [text, left, right, width] of boxes as [string, number, number, number][]) {
      if (width === 0) continue;
      expect(left, `${text} left`).toBeGreaterThanOrEqual(0);
      expect(right, `${text} right`).toBeLessThanOrEqual(1366);
    }
  });
});
