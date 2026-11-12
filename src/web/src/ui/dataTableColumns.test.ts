import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataTable } from './kit';

// The vendored GUI framework measures the DOM when it is imported; the table cells under test do not use it.
vi.mock('../vt', () => {
  const stub = ({ children }: { children?: unknown }) => createElement('span', null, children as never);
  return Object.fromEntries(['Button', 'Card', 'Icon', 'Spinner', 'TabBar', 'TabBarTitleItem', 'Toolbar', 'ToolbarContrItem'].map(k => [k, stub]));
});

// TIO-BUG-003: the leading control columns of the shared table must mean the same thing in the header and in the body.
type Row = { id: number; ref: string; title: string; owner: string };
const rows: Row[] = [{ id: 1, ref: 'SYN-1', title: 'Synthetic first', owner: 'Fictional A' }, { id: 2, ref: 'SYN-2', title: 'Synthetic second', owner: 'Fictional B' }];
const columns = [
  { key: 'ref', header: 'Reference', render: (r: Row) => r.ref },
  { key: 'title', header: 'Title', render: (r: Row) => r.title },
  { key: 'owner', header: 'Owner', render: (r: Row) => r.owner, priority: 'secondary' as const }
];

function cells(html: string, section: 'thead' | 'tbody') {
  const part = html.slice(html.indexOf(`<${section}`), html.indexOf(`</${section}>`));
  const firstRow = part.slice(part.indexOf('<tr'), part.indexOf('</tr>'));
  const tag = section === 'thead' ? 'th' : 'td';
  const out: { cls: string; inner: string }[] = [];
  const re = new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)</${tag}>`, 'g');
  for (let m = re.exec(firstRow); m; m = re.exec(firstRow)) out.push({ cls: /class="([^"]*)"/.exec(m[1])?.[1] ?? '', inner: m[2] });
  return out;
}
function role(c: { cls: string; inner: string }): string {
  if (c.cls.includes('col-select')) return /aria-label="Select/.test(c.inner) ? 'select' : 'select?';
  if (c.cls.includes('col-disclose')) return 'details';
  return 'data';
}
function html(props: { selectable: boolean; details: boolean }, phone = false) {
  const g = globalThis as unknown as { window?: unknown };
  if (phone) g.window = { matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) };
  const table = createElement(DataTable<Row>, { rows, rowKey: r => r.id, columns, selectable: props.selectable, details: props.details ? (r: Row) => `Details of ${r.ref}` : undefined, tools: false, columnFilters: false });
  return renderToStaticMarkup(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(MemoryRouter, null, table)));
}

afterEach(() => { delete (globalThis as unknown as { window?: unknown }).window; });

describe('DataTable control columns (TIO-BUG-003)', () => {
  const cases: [string, { selectable: boolean; details: boolean }, string[]][] = [
    ['selection and details', { selectable: true, details: true }, ['select', 'details']],
    ['selection only', { selectable: true, details: false }, ['select']],
    ['details only', { selectable: false, details: true }, ['details']],
    ['neither', { selectable: false, details: false }, []]
  ];
  for (const [name, props, lead] of cases) {
    it(`${name}: header and body cells line up one for one`, () => {
      const h = html(props);
      const head = cells(h, 'thead'), body = cells(h, 'tbody');
      expect(head.length).toBe(body.length);
      expect(head.map(role)).toEqual(body.map(role));
      expect(head.slice(0, lead.length).map(role)).toEqual(lead);
      // Each header names what is under it: the select-all box over the row boxes, "Details" over the disclosures.
      head.forEach((c, i) => {
        if (role(c) === 'select') { expect(c.inner).toContain('Select all rows shown'); expect(body[i].inner).toMatch(/aria-label="Select (?!all)/); }
        if (role(c) === 'details') expect(c.inner).toContain('Details');
      });
      expect(head.filter(c => role(c) === 'data').map(c => c.inner.replace(/<[^>]+>/g, ''))).toEqual(expect.arrayContaining(['Reference', 'Title']));
    });
  }

  it('phone layout: no selection column, details disclosure first in header and body', () => {
    const h = html({ selectable: true, details: false }, true);
    const head = cells(h, 'thead'), body = cells(h, 'tbody');
    expect(head.some(c => c.cls.includes('col-select'))).toBe(false);
    expect(body.some(c => c.cls.includes('col-select'))).toBe(false);
    expect(head.length).toBe(body.length);
    expect(head.map(role)).toEqual(body.map(role));
    expect(role(head[0])).toBe('details'); // secondary columns move into the details row on a phone
  });
});

