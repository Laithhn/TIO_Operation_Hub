import { test, expect, requirePageContent, assertStructureAndReflow } from './fixtures.mjs';
import { routes, viewports, expectedRedirects } from './route-catalog.mjs';

test.beforeEach(() => {
  test.skip(!process.env.TIO_AUDIT_STORAGE_STATE, 'Not executed: approved authenticated session was not supplied.');
});

for (const viewport of viewports) {
  test.describe(`Authenticated ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    for (const [name, route] of routes) {
      if (route === '/notes') {
        test.skip(`${name} ${route}: blocked because GET notes/tree can create starter records`, async () => {});
        continue;
      }
      test(`${name} ${route}: deep link, rendering and reflow`, async ({ page, audit }, info) => {
        await page.goto(route);
        await requirePageContent(page, audit);
        expect(new URL(page.url()).pathname).toBe(route);
        await assertStructureAndReflow(page, audit, info);
      });
    }
  });
}

for (const [legacy, canonical] of expectedRedirects) {
  test(`Legacy source route ${legacy} redirects to ${canonical}`, async ({ page, audit }) => {
    await page.goto(legacy);
    await requirePageContent(page, audit);
    expect(new URL(page.url()).pathname).toBe(canonical);
  });
}
