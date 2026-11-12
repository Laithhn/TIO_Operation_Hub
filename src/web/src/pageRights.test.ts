import { describe, expect, it } from 'vitest';
import appSource from './App.tsx?raw';
import reportsSource from './pages/Reports.tsx?raw';
import { canAccessPath } from './rights';
import { keys } from './rightsRequirements.json';
import type { Me } from './hooks';

// A101: a page cannot exist outside the rights. Add a route and this fails until rights.ts says which right opens it.
const person = (rights: string[]) => ({ id: 1, roles: [], rights, scopedAllowRights: [] }) as unknown as Me;
const address = (path: string) => '/' + path.replace(/\/\*$/, '').replace(/:\w+/g, '1');

const appPages = [...appSource.matchAll(/\{ path: '([^']+)', element: <(\w+)/g)]
  // Redirects are not pages, '*' is the not-found page, and paths with a leading slash are the public pages and the shell.
  .filter(m => m[2] !== 'Navigate' && m[1] !== '*' && !m[1].startsWith('/'))
  .map(m => address(m[1]));
const reportPages = [...reportsSource.matchAll(/<Route path="([^"*]+)"/g)].map(m => `/reporting-center/${m[1]}`);
const pages = ['/', ...appPages, ...reportPages];

describe('every page is in the rights', () => {
  it('finds the pages', () => {
    expect(pages.length).toBeGreaterThan(60);
    expect(pages).toContain('/my-dashboard');
    expect(pages).toContain('/reporting-center/library');
  });

  it.each(pages)('%s opens for someone holding every right', path => {
    expect(canAccessPath(person(keys), path)).toBe(true);
  });

  it.each(pages)('%s stays closed for someone holding no rights', path => {
    expect(canAccessPath(person([]), path)).toBe(false);
  });

  it('a page nobody registered stays closed, even for someone holding every right', () => {
    expect(canAccessPath(person(keys), '/a-page-nobody-registered')).toBe(false);
    expect(canAccessPath(person(keys), '/admin/a-page-nobody-registered')).toBe(false);
    expect(canAccessPath(person(keys), '/reporting-center/a-page-nobody-registered')).toBe(false);
  });

  it('My dashboard has its own right, which also needs ticket access', () => {
    expect(canAccessPath(person(['MyDashboard:View', 'Cases:View']), '/my-dashboard')).toBe(true);
    expect(canAccessPath(person(['Cases:View']), '/my-dashboard')).toBe(false);
    expect(canAccessPath(person(['MyDashboard:View']), '/my-dashboard')).toBe(false);
  });
});
