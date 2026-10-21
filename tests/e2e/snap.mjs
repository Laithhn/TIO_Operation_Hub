// Ad-hoc visual capture against a running server: node snap.mjs <url> <out.png> [width] [account]
import { chromium } from '@playwright/test';

const [url, out, width = '1600', account] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: Number(width), height: 900 } });
if (account) await context.addCookies([{ name: 'tiohub-dev-user', value: encodeURIComponent(account), url }]);
const page = await context.newPage();
await page.goto(url);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
