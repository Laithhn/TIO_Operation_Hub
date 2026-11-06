import { expect, test } from '@playwright/test';

// Anonymous GET-only checks. Never attach real-user storageState to this suite.
// The non-.spec filename also prevents discovery by the development suite.
for (const [path, status] of [
  ['/api/health/live', 'live'], ['/api/health/ready', 'ready'],
] as const) {
  test(`${path} is healthy without exposing internals`, async ({ request }, info) => {
    const started = performance.now();
    const response = await request.get(path);
    await info.attach('response-metadata', {
      body: JSON.stringify({ path, status: response.status(), elapsedMs: performance.now() - started, headers: response.headers() }, null, 2),
      contentType: 'application/json',
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status });
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  });
}

for (const path of ['/api/v1/me', '/api/v1/clients', '/api/v1/cases', '/api/v1/admin/users', '/openapi/v1.json']) {
  test(`anonymous GET ${path} is rejected`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(401);
    const body = await response.text();
    expect(body).not.toMatch(/PasswordHash|ConnectionStrings|SqlException|StackTrace/);
  });
}

test('HTTP redirects to HTTPS', async ({ request }, info) => {
  const response = await request.get('http://nb01994.vitronic.de/', { maxRedirects: 0 });
  const body = await response.text();
  await info.attach('http-upgrade', {
    body: JSON.stringify({ status: response.status(), url: response.url(), headers: response.headers(),
      bodyLength: body.length, bodyPrefix: body.slice(0, 200), title: body.match(/<title>(.*?)<\/title>/i)?.[1] }, null, 2),
    contentType: 'application/json',
  });
  expect([301, 302, 307, 308]).toContain(response.status());
  expect(response.headers().location).toMatch(/^https:\/\/nb01994\.vitronic\.de\//);
});

test('anonymous HTTPS antiforgery cookies have secure attributes', async ({ request }, info) => {
  const response = await request.get('/api/v1/auth/config');
  expect(response.status()).toBe(200);
  const cookies = response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie').map(h => h.value);
  await info.attach('cookie-attributes', { body: JSON.stringify(cookies.map(c => c.replace(/^[^;]+/, c.split('=')[0] + '=<redacted>')), null, 2), contentType: 'application/json' });
  expect(cookies.length).toBeGreaterThan(0);
  for (const cookie of cookies) {
    expect(cookie).toMatch(/;\s*secure(?:;|$)/i);
    expect(cookie).toMatch(/;\s*samesite=(strict|lax)(?:;|$)/i);
  }
  expect(cookies.find(c => c.startsWith('TioHub.Antiforgery='))).toMatch(/;\s*httponly(?:;|$)/i);
});

test('fresh browser requires sign-in and loads its resources', async ({ page }) => {
  const errors: string[] = [];
  const failures: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failures.push(`${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
  page.on('response', response => {
    if (response.status() >= 500) failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: /account/i })).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});

test('sign-in supports tablet width and keyboard focus', async ({ page }, info) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  const account = page.getByRole('textbox', { name: /account/i });
  const password = page.getByLabel(/password/i);
  await expect(account).toBeVisible();
  await account.focus();
  await account.press('Tab');
  await expect(password).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(768);
  await info.attach('tablet-sign-in', { body: await page.screenshot(), contentType: 'image/png' });
});
