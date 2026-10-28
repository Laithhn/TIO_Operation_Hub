import { expect, test, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';

/* A71: client logos — upload with preview in the client form, shown wherever the client appears, initials fallback, removal. */

async function signIn(page: Page, account = 'DEV\\manager') {
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url: test.info().project.use.baseURL as string }]);
}

/** A fictional 64 × 32 PNG (solid colour), built here so no real organization's logo is used. */
function png(w = 64, h = 32, rgb: [number, number, number] = [0, 30, 70]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(rgb, y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

type ClientInfo = { id: number; code: string; name: string; country?: string };

/** A seeded client that has cases (so its logo can be checked on the case list and in the report builder). */
async function clientWithCases(page: Page): Promise<ClientInfo> {
  const cases = await (await page.request.get('/api/v1/cases?status=&pageSize=50')).json() as { items: { clientId?: number }[] };
  const id = cases.items.find(c => c.clientId)!.clientId!;
  return await (await page.request.get(`/api/v1/clients/${id}`)).json() as ClientInfo;
}

/** The logo element of a client in a container: "image" once its picture has loaded, "initials" otherwise. */
const logoIn = (scope: ReturnType<Page['locator']>) => scope.locator('.client-logo').first();

test.describe.serial('A71 client logos', () => {
  let client: ClientInfo;

  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('upload in the client form shows a preview, refuses SVG, and saves the logo', async ({ page }) => {
    client = await clientWithCases(page);
    await page.goto(`/clients/${client.id}/edit`);
    const field = page.locator('.logo-field');
    await expect(logoIn(field)).toHaveAttribute('data-client-logo', 'initials');

    // SVG is refused before any upload, with the reason.
    await page.locator('#client-logo-file').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
    await expect(field.getByRole('alert')).toContainText('SVG logos are not accepted');

    // A PNG previews at once (data: address; nothing is sent before Save).
    await page.locator('#client-logo-file').setInputFiles({ name: 'fictional-logo.png', mimeType: 'image/png', buffer: png() });
    await expect(field.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
    await expect(page.getByText('fictional-logo.png will be uploaded when you save.')).toBeVisible();

    const upload = page.waitForResponse(r => r.url().endsWith(`/api/v1/clients/${client.id}/logo`) && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save client' }).click();
    expect((await upload).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/clients/${client.id}$`));

    // The client page shows the large logo, also after a full reload.
    const identity = page.getByTestId('client-identity');
    await expect(logoIn(identity)).toHaveClass(/has-img/);
    await expect(identity.locator('img')).toHaveAttribute('src', new RegExp(`/api/v1/clients/${client.id}/logo\\?v=`));
    await page.reload();
    await expect(logoIn(page.getByTestId('client-identity'))).toHaveClass(/has-img/);
    const box = await logoIn(page.getByTestId('client-identity')).boundingBox();
    expect(Math.round(box!.width)).toBe(96);
  });

  test('the logo appears in the client list, case list, map side list and report builder; others show initials', async ({ page }) => {
    // One shared logo lookup per page, never a request per client.
    let lookups = 0;
    page.on('request', r => { if (r.url().endsWith('/api/v1/clients/logos')) lookups++; });

    await page.goto(`/clients?q=${encodeURIComponent(client.code)}`);
    const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: client.code, exact: true }) }).first();
    await expect(logoIn(row)).toHaveClass(/has-img/);

    await page.goto('/clients');
    const other = page.locator('tbody tr').filter({ hasNot: page.getByRole('link', { name: client.code, exact: true }) }).first();
    await expect(logoIn(other)).toHaveAttribute('data-client-logo', 'initials');
    await expect(other.locator('.cl-initials')).toHaveAttribute('data-initials', /^[A-Z0-9?]{1,2}$/);

    await page.goto(`/cases?status=&clientId=${client.id}`);
    await expect(logoIn(page.locator('tbody tr').first())).toHaveClass(/has-img/);
    expect(lookups).toBeLessThanOrEqual(2);

    // Dashboard: the attention list (when this client has an item there) and the client map's country side list.
    await page.goto('/');
    const attention = page.locator('tbody tr').filter({ hasText: client.code }).first();
    if (await attention.count()) await expect(logoIn(attention)).toHaveClass(/has-img/);
    if (client.country) {
      await page.getByRole('complementary', { name: 'Section menu' }).getByRole('link', { name: 'Client map' }).click();
      await page.locator('.map-country', { hasText: client.country }).first().click();
      const side = page.locator('.map-client', { hasText: client.code }).first();
      await expect(logoIn(side)).toHaveClass(/has-img/);
    }

    await page.goto('/reporting-center/builder/cases');
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    const preview = page.locator('.rb-table tbody tr').filter({ hasText: client.code }).first();
    if (await preview.count()) await expect(logoIn(preview)).toHaveClass(/has-img/);
  });

  test('a logo that fails to load falls back to initials, never a broken image', async ({ page }) => {
    await page.route('**/api/v1/clients/*/logo?*', r => r.fulfill({ status: 404, body: '' }));
    await page.goto(`/clients/${client.id}`);
    const logo = logoIn(page.getByTestId('client-identity'));
    await expect(logo).toHaveAttribute('data-client-logo', 'initials');
    await expect(logo.locator('img')).toHaveCount(0);
  });

  test('removing the logo in the form brings back the initials everywhere', async ({ page }) => {
    await page.goto(`/clients/${client.id}/edit`);
    await page.getByRole('button', { name: 'Remove logo' }).click();
    await expect(page.getByText('The logo will be removed when you save.')).toBeVisible();
    const removed = page.waitForResponse(r => r.url().endsWith(`/api/v1/clients/${client.id}/logo`) && r.request().method() === 'DELETE');
    await page.getByRole('button', { name: 'Save client' }).click();
    expect((await removed).status()).toBe(204);
    await expect(page).toHaveURL(new RegExp(`/clients/${client.id}$`));
    await expect(logoIn(page.getByTestId('client-identity'))).toHaveAttribute('data-client-logo', 'initials');
    await page.goto(`/clients?q=${encodeURIComponent(client.code)}`);
    const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: client.code, exact: true }) }).first();
    await expect(logoIn(row)).toHaveAttribute('data-client-logo', 'initials');
  });
});
