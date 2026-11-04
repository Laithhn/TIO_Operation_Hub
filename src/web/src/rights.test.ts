import { testGrants } from './testRightFixtures';
import { describe, expect, it } from 'vitest';
import type { Me } from './hooks';
import { canAccessPath, hasRight, resourceForRecord, routePermissions } from './rights';

const user = (permissions: string[], changes: Partial<Me> = {}): Me => ({ id: 10, account: 'TEST\\reader', displayName: 'Reader', timeZone: 'UTC', roles: ['Custom'], roleLabels: ['Custom'],
  rights: testGrants(permissions),
  scope: { allClients: false, clientCount: 1, projectCount: 0, allInternal: false, internalTeamCount: 0, hasBusinessAccess: true },
  app: { version: 'test', environmentName: 'Testing', supportContact: '', devSignIn: false, authMode: 'Forms', mustChangePassword: false, map: null }, ...changes });

describe('permission aware routes and navigation', () => {
  it('requires an explicit module View for list and direct deep links', () => {
    expect(canAccessPath(undefined, '/clients')).toBe(false);
    expect(canAccessPath(user([]), '/clients')).toBe(false);
    expect(canAccessPath(user(['Cases:View']), '/clients')).toBe(false);
    expect(canAccessPath(user(['ClientStructure:View']), '/clients')).toBe(true);
    expect(routePermissions('/clients')).toEqual(['ClientStructure:View']);
    const viewer = user(['Contracts:View', 'Contracts:DetailsView']);
    expect(canAccessPath(viewer, '/contracts/5/edit')).toBe(false);
    expect(canAccessPath({ ...viewer, scopedAllowRights: ['Contracts:Maintain'] }, '/contracts/5/edit')).toBe(true);
    expect(canAccessPath({ ...viewer, scopedAllowRights: ['Cases:Maintain'] }, '/contracts/5/edit')).toBe(false);
    // A limited Maintain never replaces the View the page itself needs.
    expect(canAccessPath({ ...user([]), scopedAllowRights: ['Contracts:Maintain'] }, '/contracts/5/edit')).toBe(false);
  });

  it('separates detail access from list access and requires explicit edit rights', () => {
    const listReader = user(['Cases:View']);
    const detailReader = user(['Cases:View', 'Cases:DetailsView']);
    expect(canAccessPath(listReader, '/cases')).toBe(true);
    expect(canAccessPath(listReader, '/cases/123')).toBe(false);
    expect(canAccessPath(detailReader, '/cases/123')).toBe(true);
    expect(canAccessPath(detailReader, '/cases/123/edit')).toBe(false);
    expect(canAccessPath(user([...detailReader.rights, 'Cases:Maintain']), '/cases/123/edit')).toBe(true);
  });

  it('requires Create together with View without granting list or details implicitly', () => {
    expect(canAccessPath(user(['Cases:Create']), '/cases/new')).toBe(false);
    expect(canAccessPath(user(['Cases:View']), '/cases/new')).toBe(false);
    const creator = user(['Cases:View', 'Cases:Create']);
    expect(canAccessPath(creator, '/cases/new')).toBe(true);
    expect(canAccessPath(creator, '/cases/23')).toBe(false);
    expect(hasRight(creator, 'Cases', 'Delete')).toBe(false);
    expect(hasRight(creator, 'Cases', 'DetailsView')).toBe(false);
  });

  it('does not let parent client navigation grant nested module pages', () => {
    const clientReader = user(['ClientStructure:View', 'ClientStructure:DetailsView']);
    expect(canAccessPath(clientReader, '/clients/1')).toBe(true);
    for (const route of ['/environments', '/assets', '/contracts', '/versions']) expect(canAccessPath(clientReader, route)).toBe(false);
    expect(canAccessPath(user(['Products:View']), '/microservices/4')).toBe(false);
    expect(canAccessPath(user(['Products:View', 'Products:DetailsView']), '/microservices/4')).toBe(true);
    expect(resourceForRecord('Contract')).toBe('Contracts');
  });

  it('recomputes accessible navigation immediately from a refreshed permission snapshot', () => {
    const menu = ['/cases', '/cases/new', '/clients', '/notes'];
    const before = user(['Cases:View', 'Cases:Create', 'PersonalNotes:View']);
    expect(menu.filter(route => canAccessPath(before, route))).toEqual(['/cases', '/cases/new', '/notes']);
    const afterRevocation = user(['PersonalNotes:View']);
    expect(menu.filter(route => canAccessPath(afterRevocation, route))).toEqual(['/notes']);
    expect(canAccessPath(afterRevocation, '/cases/123')).toBe(false);
    expect(afterRevocation.rights).not.toContain('Cases:View');
  });

  it('requires separate report visibility and export grant, and keeps administration protected', () => {
    expect(canAccessPath(user(['Reporting:View']), '/reporting-center/library')).toBe(false);
    expect(canAccessPath(user(['Platform:Export']), '/reporting-center/library')).toBe(false);
    expect(canAccessPath(user(['Reporting:View', 'Platform:Export']), '/reporting-center/library')).toBe(true);
    expect(canAccessPath(user(['Cases:View']), '/admin/rights')).toBe(false);
    expect(canAccessPath(user(['Platform:Administration']), '/admin/rights')).toBe(false);
    expect(canAccessPath(user(['Platform:Administration', 'AdminRoles:View']), '/admin/rights')).toBe(true);
    expect(canAccessPath(user(['Notifications:View']), '/notes')).toBe(false);
  });
});
