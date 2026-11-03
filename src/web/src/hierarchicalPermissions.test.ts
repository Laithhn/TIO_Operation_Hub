import { describe, expect, it } from 'vitest';
import type { Me } from './hooks';
import manifest from './permissionManifest.json';
import { canAccessPath, canViewTab, hasPermission, hasPermissionKey } from './permissions';
import { dependencyWarnings, filterPermissionRows, permissionChanges, permissionRows, permissionTree, selectionState, setPermissions, type PermissionDefinition } from './pages/adminRightsModel';

const rows = permissionRows([], manifest as PermissionDefinition[]);
const empty = { permissions: [], rights: [] };
const user = (keys: string[]): Me => ({ permissions: keys, grants: { export: true, audit: true }, isAdministrator: true } as Me);
const parents = (key: string): string[] => {
  const node = manifest.find(p => p.key === key)!;
  return [key, ...(node.parentKey ? parents(node.parentKey) : [])];
};

describe('four-level permission enforcement', () => {
  const keys = [...new Set([...parents('tab.ClientStructure.organizations:View'), ...parents('ClientStructure:View')])];
  it.each(['module.clients:Access', 'area.ClientStructure:Access', 'tab.ClientStructure.organizations:Access'])('blocks descendants when %s is missing', denied => {
    const me = user(keys.filter(k => k !== denied));
    expect(canViewTab(me, 'ClientStructure', 'organizations')).toBe(false);
    expect(canAccessPath(me, '/clients/12', '?tab=organizations')).toBe(false);
  });
  it('allows View independently while preventing editing and unregistered actions', () => {
    const me = user(keys);
    expect(canViewTab(me, 'ClientStructure', 'organizations')).toBe(true);
    expect(canAccessPath(me, '/clients/12', '?tab=organizations')).toBe(true);
    expect(hasPermission(me, 'tab.ClientStructure.organizations', 'Maintain')).toBe(false);
    expect(hasPermission(me, 'tab.ClientStructure.organizations', 'Delete')).toBe(false);
    expect(hasPermissionKey(user(['unknown:View']), 'unknown:View')).toBe(false);
    expect(canAccessPath(me, '/unregistered')).toBe(false);
  });
  it('keeps a module independent from its submodules, including routes without tabs', () => {
    expect(canAccessPath(user(['module.cases:Access']), '/cases')).toBe(false);
    expect(canAccessPath(user(parents('Cases:View')), '/cases')).toBe(true);
    expect(canAccessPath(user(parents('Cases:View')), '/cases/new')).toBe(false);
    expect(canAccessPath(user(['module.admin:Access']), '/admin/rights')).toBe(false);
  });
  it('revocation and fresh saved snapshots change route availability immediately', () => {
    expect(canAccessPath(user(keys), '/clients/12', '?tab=organizations')).toBe(true);
    expect(canAccessPath(user(keys.filter(k => k !== 'module.clients:Access')), '/clients/12', '?tab=organizations')).toBe(false);
    expect(canAccessPath(user(keys), '/clients/12', '?tab=organizations')).toBe(true);
  });
});

describe('hierarchical rights editor', () => {
  it('toggling a parent retains its children and reports effective dependency blocks', () => {
    const module = rows.find(r => r.key === 'module.clients:Access')!;
    const leaf = rows.find(r => r.key === 'tab.ClientStructure.organizations:View')!;
    const granted = setPermissions(empty, [leaf], true);
    expect(granted.permissions).toEqual([leaf.key]);
    const parent = setPermissions(granted, [module], true);
    expect(parent.permissions).toHaveLength(2);
    const revoked = setPermissions(parent, [module], false);
    expect(revoked.permissions).toEqual([leaf.key]);
    expect(dependencyWarnings(rows, revoked).map(r => r.key)).toContain(leaf.key);
  });
  it('search keeps real ancestors and scopes explicit bulk changes to matching nodes', () => {
    const visible = filterPermissionRows(rows, { search: 'tab.ClientStructure.organizations:View', module: '', resource: '', action: '', risk: '', assignment: '' }, empty, empty);
    const tree = permissionTree(rows, visible);
    expect(tree).toHaveLength(1);
    expect(tree[0].row.nodeType).toBe('Module');
    expect(tree[0].children[0].row.nodeType).toBe('Submodule');
    expect(tree[0].children[0].children[0].row.nodeType).toBe('Tab');
    expect(tree[0].shown).toHaveLength(1);
    expect(setPermissions(empty, tree[0].shown, true).permissions).toEqual(['tab.ClientStructure.organizations:View']);
  });
  it('computes partial checkbox state and previews reversible bulk changes', () => {
    const areaRows = rows.filter(r => r.resource === 'Cases');
    const one = setPermissions(empty, areaRows.filter(r => r.key === 'Cases:View'), true);
    expect(selectionState(areaRows, empty)).toBe('none');
    expect(selectionState(areaRows, one)).toBe('partial');
    const all = setPermissions(one, areaRows, true);
    expect(selectionState(areaRows, all)).toBe('all');
    expect(permissionChanges(one, all, rows).grants).toHaveLength(areaRows.length - 1);
    expect(selectionState(areaRows, setPermissions(all, areaRows, false))).toBe('none');
    expect(one.permissions).toEqual(['Cases:View']);
  });
});
