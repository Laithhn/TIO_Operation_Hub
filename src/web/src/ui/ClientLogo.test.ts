import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ClientDisplay, ClientLogo, initialsOf, LOGO_PX, logoProblem, toneOf } from './ClientLogo';

// A71: the client logo component, rendered to markup in Node (no browser needed).
function render(el: ReactElement, logos?: { id: number; code: string; logoUrl: string }[]): string {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (logos) qc.setQueryData(['client-logos'], logos);
  return renderToStaticMarkup(createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, el)));
}

describe('initials', () => {
  it('uses the first letters of two words, else the alias', () => {
    expect(initialsOf('Fictional Police Department', 'FPD')).toBe('FP');
    expect(initialsOf('Ministry', 'MIN')).toBe('MI');
    expect(initialsOf('', 'dp')).toBe('DP');
    expect(initialsOf(null, null)).toBe('?');
    expect(initialsOf('(Roads) & Transport', 'RTA')).toBe('RT');
  });
  it('gives each client a stable tone', () => {
    expect(toneOf('FPD')).toBe(toneOf('FPD'));
    expect(toneOf('FPD')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('ClientLogo', () => {
  it('shows the logo image with an accessible name and a fixed box', () => {
    const html = render(createElement(ClientLogo, { clientId: 7, name: 'Fictional Client', code: 'FC', logoUrl: '/api/v1/clients/7/logo?v=abc', size: 'md' }));
    expect(html).toContain('src="/api/v1/clients/7/logo?v=abc"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Fictional Client logo"');
    expect(html).toContain(`width:${LOGO_PX.md}px;height:${LOGO_PX.md}px`);
    expect(html).toContain('data-client-logo="image"');
    // The initials stay underneath until the image has loaded, so there is never an empty or broken box.
    expect(html).toContain('data-initials="FC"');
  });

  it('falls back to initials without a logo, never an image', () => {
    const html = render(createElement(ClientLogo, { clientId: 8, name: 'Fictional Water Authority', code: 'FWA', logoUrl: null }));
    expect(html).not.toContain('<img');
    expect(html).toContain('data-client-logo="initials"');
    expect(html).toContain('data-initials="FW"');
    expect(html).toContain('aria-label="Fictional Water Authority"');
  });

  it('finds the logo in the shared lookup by client id', () => {
    const html = render(createElement(ClientLogo, { clientId: 9, code: 'FX' }), [{ id: 9, code: 'FX', logoUrl: '/api/v1/clients/9/logo?v=1' }]);
    expect(html).toContain('src="/api/v1/clients/9/logo?v=1"');
    expect(render(createElement(ClientLogo, { clientId: 10, code: 'FY' }), [])).toContain('data-client-logo="initials"');
  });

  it('is hidden from screen readers when the name is written beside it', () => {
    const html = render(createElement(ClientDisplay, { id: 9, code: 'FX', name: 'Fictional X', logoUrl: '/api/v1/clients/9/logo?v=1' }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('alt=""');
    expect(html).toContain('href="/clients/9"');
    expect(html).toContain('>FX</a>');
  });
});

describe('logo file check', () => {
  const file = (name: string, size = 1000, type = '') => ({ name, size, type });
  it('accepts PNG, JPG, JPEG and WebP up to the limit', () => {
    for (const n of ['a.png', 'a.JPG', 'a.jpeg', 'a.webp']) expect(logoProblem(file(n))).toBeNull();
  });
  it('refuses SVG, other types, empty and oversized files', () => {
    expect(logoProblem(file('a.svg'))).toMatch(/SVG/);
    expect(logoProblem(file('a.png', 10, 'image/svg+xml'))).toMatch(/SVG/);
    expect(logoProblem(file('a.gif'))).toMatch(/not accepted/);
    expect(logoProblem(file('noext'))).toMatch(/without an extension/);
    expect(logoProblem(file('a.png', 0))).toMatch(/empty/);
    expect(logoProblem(file('a.png', 2 * 1024 * 1024 + 1))).toMatch(/2 MB/);
    expect(logoProblem(file('a.png', 600 * 1024), { maxFileKB: 512, maxPixels: 5000, extensions: ['.png'] })).toMatch(/512 KB/);
  });
});

describe('table text', () => {
  // ui/kit nodeText uses plainText for filtering, sorting and CSV export (kit itself needs a browser, so it is covered by Playwright).
  it('gives tables the alias and name of a client cell', () => {
    expect(ClientDisplay.plainText({ id: 1, code: 'FX', name: 'Fictional X' })).toBe('FX');
    expect(ClientDisplay.plainText({ code: 'FX', name: 'Fictional X', show: 'both', sub: 'Sub-client of FY' })).toBe('FX · Fictional X Sub-client of FY');
    expect(ClientDisplay.plainText({ code: 'FX', name: 'Fictional X', show: 'name' })).toBe('Fictional X');
    expect(ClientLogo.plainText()).toBe('');
  });
});
