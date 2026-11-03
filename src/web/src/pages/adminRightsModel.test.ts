import { describe, expect, it } from 'vitest';
import { dependencyWarnings, filterPermissionRows, groupPermissionRows, missingDependencies, permissionChanges, permissionRows, setPermissions, sensitive, type PermissionDefinition } from './adminRightsModel';

const definition = (action: string, changes: Partial<PermissionDefinition> = {}): PermissionDefinition => ({ key: `Cases:${action}`, resource: 'Cases', resourceLabel: 'Cases', action,
  actionLabel: action, description: `May ${action.toLowerCase()} cases.`, module: 'Operations', isActive: true, riskLevel: action === 'Delete' ? 'High' : 'Standard', ...changes });
const rows = permissionRows([{ key: 'Audit', label: 'View audit', description: 'Read change history.' }], [definition('View'), definition('Create'), definition('Delete'), definition('Old', { isActive: false })]);
const noAccess = { rights: [], permissions: [] };
const filters = { search: '', module: '', resource: '', action: '', risk: '', assignment: '' };

describe('permission editor security semantics', () => {
  it('keeps sibling actions independent and reports missing view without granting it', () => {
    const draft = setPermissions(noAccess, rows.filter(r => r.key === 'Cases:Delete'), true);
    expect(draft.permissions).toEqual(['Cases:Delete']);
    expect(dependencyWarnings(rows, draft).map(r => r.key)).toEqual(['Cases:Delete']);
    expect(noAccess.permissions).toEqual([]);
    expect(permissionChanges(noAccess, draft, rows).grants.map(r => r.key)).toEqual(['Cases:Delete']);
  });

  it('stages only explicitly provided leaves and never grants deprecated permissions', () => {
    const draft = setPermissions({ rights: [], permissions: ['Legacy:Retained'] }, rows.filter(r => r.module === 'Operations'), true);
    expect(draft.permissions).toEqual(['Cases:Create', 'Cases:Delete', 'Cases:View', 'Legacy:Retained']);
    expect(draft.rights).toEqual([]);
    const revoked = setPermissions(draft, rows.filter(r => r.key === 'Cases:Create'), false);
    expect(revoked.permissions).toContain('Cases:Delete');
    expect(revoked.permissions).toContain('Legacy:Retained');
    expect(permissionChanges(draft, revoked, rows).revocations.map(r => r.key)).toEqual(['Cases:Create']);
  });

  it('groups metadata without implying any assignments or mutating source rows', () => {
    const groups = groupPermissionRows(rows);
    expect(groups.find(g => g.label === 'Operations')?.resources.map(r => r.label)).toEqual(['Cases']);
    expect(groups.find(g => g.label === 'Operations')?.rows).toHaveLength(4);
    expect(noAccess).toEqual({ rights: [], permissions: [] });
    expect(rows.find(r => r.key === 'Cases:Delete')).toMatchObject({ risk: 'High', active: true });
    expect(sensitive(rows.find(r => r.key === 'Cases:Delete')!)).toBe(true);
  });

  it('combines search and independent metadata filters and limits a group action to filtered leaves', () => {
    const shown = filterPermissionRows(rows, { ...filters, search: 'cases:delete', module: 'Operations', risk: 'High', action: 'Delete' }, noAccess, noAccess);
    expect(shown.map(r => r.key)).toEqual(['Cases:Delete']);
    expect(setPermissions(noAccess, shown, true).permissions).toEqual(['Cases:Delete']);
    expect(filterPermissionRows(rows, { ...filters, search: 'missing' }, noAccess, noAccess)).toEqual([]);
  });

  it('compares saved assignments against a draft and can show only changes or differences', () => {
    const saved = { rights: ['Audit'], permissions: ['Cases:View'] };
    const draft = setPermissions(saved, rows.filter(r => r.key === 'Cases:Delete'), true);
    expect(filterPermissionRows(rows, { ...filters, assignment: 'changed' }, draft, saved).map(r => r.key)).toEqual(['Cases:Delete']);
    expect(filterPermissionRows(rows, { ...filters, assignment: 'different' }, draft, saved, saved).map(r => r.key)).toEqual(['Cases:Delete']);
    expect(filterPermissionRows(rows, { ...filters, assignment: 'different' }, draft, saved)).toEqual([]);
    expect(dependencyWarnings(rows, draft)).toEqual([]);
  });

  it('explains explicit registry dependencies across component and cross-cutting permissions', () => {
    const catalog = permissionRows([], [definition('HistoryView', { requires: ['Cases:View', 'Cases:DetailsView', 'Audit'] })]);
    const selection = { rights: ['Audit'], permissions: ['Cases:View', 'Cases:HistoryView'] };
    expect(missingDependencies(catalog[0], catalog, selection)).toEqual(['Cases:DetailsView']);
    expect(dependencyWarnings(catalog, selection)).toHaveLength(1);
    expect(selection.permissions).not.toContain('Cases:DetailsView');
    expect(dependencyWarnings(catalog, { ...selection, permissions: [...selection.permissions, 'Cases:DetailsView'] })).toEqual([]);
  });
});
