import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Reproduction probe for UX-001/002/004 (evidence, docs/UX-AUDIT-REMEDIATION-2026-10-27.md). To re-run it, copy it into tests/e2e and set
// UX_PROBE_LABEL and UX_EVIDENCE_DIR; it writes ux-probe-<label>.json (46 routes x 6 viewport sizes). It measures, it asserts nothing.
const LABEL = process.env.UX_PROBE_LABEL ?? 'before';
const SIZES: [number, number][] = [[1920, 1080], [1440, 900], [1366, 768], [768, 1024], [390, 844], [360, 800]];
const LISTS = ['/', '/map', '/actions', '/notifications', '/data-quality', '/reporting-center', '/clients', '/projects', '/contracts', '/environments', '/assets',
  '/versions', '/firewall-rules', '/products', '/cases', '/commitments', '/notes', '/escalations', '/teams', '/handovers', '/reassignment',
  '/admin/users', '/admin/roles', '/admin/rights', '/admin/config', '/admin/policies', '/admin/settings', '/admin/audit', '/admin/archived',
  '/clients/new', '/cases/new', '/commitments/new', '/escalations/new', '/environments/new', '/contracts/new', '/products/new'];
const DETAIL_FROM: [string, RegExp][] = [['/clients', /^\/clients\/\d+$/], ['/cases', /^\/cases\/\d+$/], ['/environments', /^\/environments\/\d+$/],
  ['/commitments', /^\/commitments\/\d+$/], ['/contracts', /^\/contracts\/\d+$/], ['/products', /^\/products\/\d+$/], ['/assets', /^\/assets\/\d+$/],
  ['/escalations', /^\/escalations\/\d+$/], ['/teams', /^\/teams\/\d+$/], ['/projects', /^\/projects\/\d+$/]];

async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const r = (e: Element) => e.getBoundingClientRect();
    const visible = (e: Element) => { const b = r(e); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && !e.closest('[inert]'); };
    const out: Record<string, unknown> = { docOverflow: document.documentElement.scrollWidth - vw };
    // Navigation
    const menu = document.querySelector<HTMLElement>('.menu-btn');
    const menuShown = !!menu && visible(menu);
    const label = document.querySelector<HTMLElement>('.menu-btn-label');
    const active = document.querySelector<HTMLElement>('nav[aria-label="Main"] a[aria-current="page"]');
    out.nav = {
      menuShown, menuName: menu?.getAttribute('aria-label'),
      menuLabelClipped: label && visible(label) ? label.scrollWidth > label.clientWidth + 1 || r(label).right > vw : null,
      menuLabelVisible: !!label && visible(label),
      activeLink: active && visible(active) ? { text: active.textContent, clipped: active.scrollWidth > active.clientWidth + 1, right: Math.round(r(active).right), vw } : null,
      more: !!document.querySelector('.nav-more button') && visible(document.querySelector('.nav-more button')!)
    };
    // Header overlap: every visible header control against every other.
    const hdr = [...document.querySelectorAll('header.hdr a, header.hdr button, header.hdr select, header.hdr .menu-btn-label')].filter(visible);
    const overlaps: string[] = [];
    for (let i = 0; i < hdr.length; i++) for (let j = i + 1; j < hdr.length; j++) {
      if (hdr[i].contains(hdr[j]) || hdr[j].contains(hdr[i])) continue;
      const a = r(hdr[i]), b = r(hdr[j]);
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps.push(`${hdr[i].textContent?.trim() || hdr[i].getAttribute('aria-label')} × ${hdr[j].textContent?.trim() || hdr[j].getAttribute('aria-label')}`);
      if (a.right > vw + 1) overlaps.push(`offscreen: ${hdr[i].getAttribute('aria-label') ?? hdr[i].textContent}`);
    }
    out.headerOverlaps = [...new Set(overlaps)];
    // Tables
    out.tables = [...document.querySelectorAll('table')].filter(visible).map(t => {
      const wrap = t.parentElement!;
      let sc: HTMLElement | null = t.parentElement; while (sc && sc !== document.body && !(sc.scrollWidth > sc.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(sc).overflowX))) sc = sc.parentElement;
      const scroller = sc && sc !== document.body ? sc : null;
      const box = scroller ? r(scroller) : r(wrap);
      const hdrs = [...t.querySelectorAll('thead th')].map(th => ({ text: (th.textContent ?? '').trim().slice(0, 24), inView: r(th).right <= Math.min(box.right, vw) + 1 && r(th).left >= box.left - 1 }));
      const row = t.querySelector('tbody tr');
      const actions = row ? [...row.querySelectorAll('button, a')].filter(visible).map(a => ({ text: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 20), inView: r(a).right <= Math.min(box.right, vw) + 1 })) : [];
      return {
        caption: t.querySelector('caption')?.textContent?.slice(0, 40) ?? t.getAttribute('aria-label') ?? '', cls: wrap.className.slice(0, 60),
        scrolls: !!scroller, scrollW: scroller?.scrollWidth, clientW: scroller?.clientWidth,
        scrollerFocusable: scroller ? scroller.tabIndex >= 0 : null, scrollerLabel: scroller?.getAttribute('aria-label') ?? null,
        affordance: scroller ? /shadow|edge|more-r|scroll/.test(scroller.className + ' ' + scroller.parentElement!.className) : null,
        hiddenHeaders: hdrs.filter(h => !h.inView).map(h => h.text), headers: hdrs.length,
        detailsToggle: !!t.querySelector('[aria-expanded]'), actionsOutOfView: actions.filter(a => !a.inView).map(a => a.text)
      };
    });
    // Targets (WCAG 2.2 SC 2.5.8): undersized and not covered by the spacing exception; inline links in text are exempt.
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=option], [role=checkbox], [tabindex="0"]';
    const targets = [...document.querySelectorAll<HTMLElement>(sel)].filter(e => visible(e) && !(e as HTMLButtonElement).disabled);
    const boxes = targets.map(e => r(e));
    const small: string[] = [];
    targets.forEach((e, i) => {
      const b = boxes[i];
      if (b.width >= 24 && b.height >= 24) return;
      if (e.tagName === 'A' && getComputedStyle(e).display === 'inline' && (e.parentElement?.textContent?.trim().length ?? 0) > (e.textContent?.trim().length ?? 0) + 8) return; // inline exception
      if (e.tagName === 'INPUT' && ['text', 'search', 'email', 'number', 'date', 'password', 'url', 'tel', 'time', 'datetime-local'].includes((e as HTMLInputElement).type)) return;
      if (e.tagName === 'TEXTAREA' || e.tagName === 'SELECT') { if (b.height >= 24) return; }
      // Spacing exception: a 24 px circle centred on the target must not intersect another target or another undersized target's circle.
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const hit = targets.some((o, j) => {
        if (j === i || o.contains(e) || e.contains(o)) return false;
        const ob = boxes[j];
        const dx = Math.max(ob.left - cx, 0, cx - ob.right), dy = Math.max(ob.top - cy, 0, cy - ob.bottom);
        if (Math.hypot(dx, dy) < 12) return true;
        if (ob.width < 24 || ob.height < 24) { const ox = ob.left + ob.width / 2, oy = ob.top + ob.height / 2; if (Math.hypot(ox - cx, oy - cy) < 24) return true; }
        return false;
      });
      if (hit) small.push(`${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0].slice(0, 30)} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(b.width)}×${Math.round(b.height)}`);
    });
    out.smallTargets = [...new Set(small)];
    out.unnamed = targets.filter(e => !(e.getAttribute('aria-label') || e.textContent?.trim() || e.getAttribute('title') || (e as HTMLInputElement).labels?.length || e.getAttribute('aria-labelledby'))).map(e => e.outerHTML.slice(0, 80));
    return out;
  });
}

test('UX reproduction probe', async ({ page }) => {
  test.setTimeout(1_800_000);
  await page.goto('/');
  const routes = [...LISTS];
  for (const [list, re] of DETAIL_FROM) {
    await page.goto(list);
    await expect(page.locator('#viMainToolbar h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    const href = await page.evaluate(src => [...document.querySelectorAll<HTMLAnchorElement>('main a[href]')].map(a => new URL(a.href).pathname).find(p => new RegExp(src).test(p)), re.source);
    if (href) routes.push(href);
  }
  const result: Record<string, unknown> = {};
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('#viMainToolbar h1, .notes').first()).toBeVisible({ timeout: 15_000 }).catch(() => undefined);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      result[`${w}x${h} ${route}`] = await measure(page);
    }
  }
  // Outside test-results (Playwright empties that folder at the start of every run).
  const dir = process.env.UX_EVIDENCE_DIR ?? '../../../ux-evidence';
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/ux-probe-${LABEL}.json`, JSON.stringify(result, null, 1));
});
