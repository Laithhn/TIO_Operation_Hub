import { expect, test, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';

/* Client Attachments tab (29 Oct 2026 redesign): upload dialog, summary, search / filter, preview beside the list, row menu, deletion. */

async function signIn(page: Page, account = 'DEV\\manager') {
  await page.context().addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url: test.info().project.use.baseURL as string }]);
}

/** A fictional solid-colour PNG. */
function png(w = 48, h = 24): Buffer {
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
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([0, 30, 70], y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');

test('the client Attachments tab uploads, finds, previews, downloads and deletes files', async ({ page }) => {
  await signIn(page);
  await page.goto('/');
  // The shell's own start-up requests first: the first requests of a new session may otherwise race (412 seen on a fresh server).
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const res = await page.request.get('/api/v1/clients');
  const body = await res.json();
  expect(res.ok(), JSON.stringify(body).slice(0, 300)).toBe(true);
  const clients = { items: (Array.isArray(body) ? body : body.items) as { id: number }[] };
  // A client without files, so the counts below are exact.
  let id = 0;
  for (const c of clients.items) {
    const files = await (await page.request.get(`/api/v1/attachments?recordType=Client&recordId=${c.id}`)).json() as unknown[];
    if (files.length === 0) { id = c.id; break; }
  }
  expect(id).toBeGreaterThan(0);
  await page.goto(`/clients/${id}?tab=files`);
  const tab = page.locator('.att-ws');
  await expect(tab.getByRole('heading', { name: 'Attachments (0)' })).toBeVisible();
  await expect(tab.getByText('No files attached to this client yet.')).toBeVisible();

  // Upload: a refused type is explained first; then three files with progress and a refreshed list.
  await tab.getByRole('button', { name: 'Upload files' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Upload files' });
  await dialog.getByLabel(/Choose files to attach/).setInputFiles({ name: 'installer.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') });
  await expect(dialog.getByRole('alert')).toContainText('.exe not accepted');
  await dialog.getByLabel(/Choose files to attach/).setInputFiles([
    { name: 'SLA annex (fictional).pdf', mimeType: 'application/pdf', buffer: PDF },
    { name: 'rack photo.png', mimeType: 'image/png', buffer: png() },
    { name: 'cabling notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Fictional cabling notes') }]);
  await dialog.getByRole('button', { name: 'Upload 3 file(s)' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(tab.getByRole('heading', { name: 'Attachments (3)' })).toBeVisible();
  const summary = tab.getByRole('list', { name: 'Attachment summary' });
  await expect(summary).toContainText('Total files3');
  await expect(summary).toContainText('Document categories3');
  await expect(summary).toContainText('Uploaders1');

  // Search (case-insensitive) and the category filter.
  const names = tab.locator('.att-table tbody .att-name');
  await tab.getByLabel('Search by file name').fill('CABLING');
  await expect(names).toHaveText(['cabling notes.txt']);
  await tab.getByRole('button', { name: 'Reset' }).click();
  await tab.getByLabel('Category').selectOption({ label: 'Image' });
  await expect(names).toHaveText(['rack photo.png']);
  await tab.getByLabel('Category').selectOption('');
  await tab.getByLabel('Search by file name').fill('nothing like this');
  await expect(tab.getByText('No files match the search or filters.')).toBeVisible();
  await tab.getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(names).toHaveCount(3);

  // The PDF preview is framed from the inline endpoint; the list stays visible beside it.
  const shown = page.waitForResponse(r => /\/attachments\/\d+\/preview$/.test(r.url()));
  await tab.getByRole('button', { name: 'Preview SLA annex (fictional).pdf' }).click();
  const preview = page.getByRole('complementary', { name: 'Preview of SLA annex (fictional).pdf' });
  expect((await shown).status()).toBe(200);
  await expect(preview.locator('iframe')).toHaveAttribute('src', /\/preview$/);
  await expect(names).toHaveCount(3);
  await preview.getByRole('tab', { name: 'Details' }).click();
  await expect(preview).toContainText('SHA-256');
  await preview.getByRole('tab', { name: 'Version history' }).click();
  await expect(preview).toContainText('Version history is not kept');
  await preview.getByRole('button', { name: 'Close the preview' }).click();
  await expect(preview).toHaveCount(0);

  // Text files show as plain text.
  await tab.getByRole('button', { name: 'Preview cabling notes.txt' }).click();
  await expect(page.locator('.att-pv-text')).toHaveText('Fictional cabling notes');
  await page.keyboard.press('Escape');
  await expect(page.locator('.att-pv')).toHaveCount(0);

  // Row menu: download, then delete with confirmation.
  await tab.getByRole('button', { name: 'Actions for rack photo.png' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Download' }).click();
  expect((await download).suggestedFilename()).toBe('rack photo.png');
  await tab.getByRole('button', { name: 'Actions for rack photo.png' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('dialog', { name: 'Delete rack photo.png?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(tab.getByRole('heading', { name: 'Attachments (2)' })).toBeVisible();
  await page.screenshot({ path: 'test-results/visual-client-attachments-1600.png', fullPage: true });

  // The rest together: select all, delete selected.
  await tab.getByLabel('Select all files on this page').check();
  await tab.getByRole('button', { name: 'Delete selected' }).click();
  await page.getByRole('dialog', { name: 'Delete 2 files?' }).getByRole('button', { name: 'Delete 2 files' }).click();
  await expect(tab.getByText('No files attached to this client yet.')).toBeVisible();
});
