import { test as base, expect } from '../../tests/e2e/node_modules/@playwright/test/index.mjs';
import { requestDecision } from './safety-policy.mjs';

export { expect };
export const test = base.extend({
  audit: [async ({ context, baseURL }, use, info) => {
    const approved = process.env.TIO_AUDIT_READ_ONLY_APPROVED === 'YES';
    base.skip(!approved || !baseURL, 'Not executed: set explicit read-only approval and an HTTPS base URL.');
    const blocked = [];
    const javascriptErrors = [];
    const serverErrors = [];
    const requestFailures = [];
    let consoleErrorCount = 0;
    await context.route('**/*', async route => {
      const req = route.request();
      const decision = requestDecision(req.method(), req.url(), baseURL);
      if (decision !== 'allow') {
        blocked.push({ reason: decision, method: req.method(), path: new URL(req.url()).pathname });
        await route.abort('blockedbyclient');
      } else await route.continue();
    });
    context.on('page', page => {
      page.on('pageerror', error => javascriptErrors.push({ name: error.name }));
      page.on('console', message => { if (message.type() === 'error') consoleErrorCount++; });
      page.on('response', response => {
        if (response.status() >= 500) serverErrors.push({ status: response.status(), path: new URL(response.url()).pathname });
      });
      page.on('requestfailed', request => requestFailures.push({ method: request.method(), path: new URL(request.url()).pathname, reason: request.failure()?.errorText }));
      page.on('dialog', dialog => dialog.dismiss());
    });
    const evidence = { blocked, javascriptErrors, serverErrors, requestFailures };
    await use(evidence);
    await info.attach('sanitized-browser-observations', {
      body: JSON.stringify({ ...evidence, consoleErrorCount, viewport: info.project.use.viewport,
        note: 'Counts and paths only; no headers, cookies, storage state, request bodies, query values or console text. Blocked requests are harness restrictions.' }, null, 2),
      contentType: 'application/json',
    });
    if (process.env.TIO_AUDIT_CAPTURE_SCREENSHOTS === 'YES') {
      const page = context.pages()[0];
      if (page && !page.isClosed()) await info.attach('page-screenshot', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  }, { auto: true }],
});

/** A policy-blocked read (such as POST report preview) is coverage blocked, never an application defect. */
export function skipIfPolicyBlocked(audit) {
  const blocked = audit.blocked.filter(r => r.reason !== 'blocked-external-origin');
  test.skip(blocked.length > 0, 'Harness blocked an action/method. Inspect sanitized observations; this is unexecuted coverage.');
}

export async function requirePageContent(page, audit) {
  await expect(page.getByRole('main')).toBeVisible();
  // A level-one heading may intentionally be screen-reader-only (the Notes workspace).
  await expect(page.locator('h1').first()).toBeAttached();
  await expect(page.locator('.state-msg[role="status"]')).toHaveCount(0);
  test.skip(new URL(page.url()).pathname === '/login', 'Approved session absent, expired or rejected; no login attempted.');
  test.skip(new URL(page.url()).pathname === '/account/password', 'Account requires a password change; no change attempted.');
  skipIfPolicyBlocked(audit);
  test.skip(await page.locator('main .restricted').count() > 0, 'Page or a source section is restricted for this approved role; not a functional pass.');
}

export async function assertStructureAndReflow(page, audit, info) {
  const observation = await page.evaluate(() => ({
    width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
    title: document.title, h1Count: document.querySelectorAll('h1').length,
    mainCount: document.querySelectorAll('main').length,
    overflowCandidates: [...document.querySelectorAll('main *')].filter(el => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.right > innerWidth + 2;
    }).slice(0, 12).map(el => ({ tag: el.tagName, className: typeof el.className === 'string' ? el.className : '' })),
    navigation: (() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { domContentLoadedMs: n.domContentLoadedEventEnd, loadMs: n.loadEventEnd, responseStartMs: n.responseStart } : null; })(),
  }));
  await info.attach('structure-reflow-timing', { body: JSON.stringify(observation, null, 2), contentType: 'application/json' });
  expect.soft(observation.title.trim(), 'Document title').not.toBe('');
  expect.soft(observation.mainCount, 'One main landmark').toBe(1);
  expect.soft(observation.h1Count, 'One level-one heading').toBe(1);
  expect.soft(observation.documentWidth, 'Document-wide horizontal overflow; contained table scrolling is allowed').toBeLessThanOrEqual(observation.width + 2);
  expect.soft(await page.locator('.state-msg.error').count(), 'Visible application error states').toBe(0);
  expect.soft(audit.javascriptErrors, 'Unhandled JavaScript errors').toEqual([]);
  expect.soft(audit.serverErrors, 'Observed HTTP 5xx responses').toEqual([]);
}
