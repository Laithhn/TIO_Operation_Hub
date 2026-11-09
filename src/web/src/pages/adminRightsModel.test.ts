import { describe, expect, it } from 'vitest';
import catalogJson from '../rightsCatalog.json';
import { assignedCount, filterRights, gridRights, groupRights, missingPrerequisites, newlyBlocked, prerequisiteWarnings, reviewGroups, rightChanges, sensitive, setRights, sortedRights, withPrerequisites, type RightDefinition, type RightFilters } from './adminRightsModel';

const right = (key: string, changes: Partial<RightDefinition> = {}): RightDefinition => ({
  key, label: key.split(':')[1], description: 'Test right', module: 'Cases', feature: key.split(':')[0], featureLabel: key.split(':')[0], action: key.split(':')[1],
  kind: 'Action', riskLevel: 'Normal', supportsScope: true, requires: [], displayOrder: 0, isActive: true, ...changes
});
const rows = sortedRights([
  right('Cases:View', { kind: 'Access', displayOrder: 1 }),
  right('Cases:Create', { requires: ['Cases:View'], displayOrder: 2 }),
  right('Cases:Delete', { requires: ['Cases:View'], riskLevel: 'High', displayOrder: 3 }),
  right('Cases:HistoryView', { kind: 'Access', requires: ['Cases:View', 'Platform:Audit'], displayOrder: 4 }),
  right('Platform:Audit', { module: 'Administration', riskLevel: 'High', displayOrder: 0 }),
  right('Old:Retired', { isActive: false, displayOrder: 5 })
]);
const filters: RightFilters = { search: '', module: '', feature: '', kind: '', risk: '', assignment: '' };
const only = (key: string) => rows.filter(r => r.key === key);

describe('rights editor security semantics', () => {
  it('assigning one right changes nothing else and adds no prerequisite', () => {
    const none: string[] = [];
    const draft = setRights(none, only('Cases:Delete'), true);
    expect(draft).toEqual(['Cases:Delete']);
    expect(none).toEqual([]);
    expect(rightChanges(none, draft, rows).grants.map(r => r.key)).toEqual(['Cases:Delete']);
  });

  it('never grants a retired right, and keeps a stored one until it is removed', () => {
    expect(setRights([], only('Old:Retired'), true)).toEqual([]);
    const kept = setRights(['Old:Retired'], only('Cases:View'), true);
    expect(kept).toEqual(['Cases:View', 'Old:Retired']);
    expect(setRights(kept, only('Old:Retired'), false)).toEqual(['Cases:View']);
  });

  it('reports a missing prerequisite instead of granting it', () => {
    const draft = ['Cases:Delete'];
    expect(missingPrerequisites(only('Cases:Delete')[0], draft)).toEqual(['Cases:View']);
    expect(prerequisiteWarnings(rows, draft).map(r => r.key)).toEqual(['Cases:Delete']);
    expect(draft).toEqual(['Cases:Delete']);
  });

  it('adds prerequisites only when asked, including indirect ones', () => {
    const chain = [right('A:X', { requires: ['A:Y'] }), right('A:Y', { requires: ['A:Z'] }), right('A:Z')];
    expect(withPrerequisites(['A:X'], chain)).toEqual(['A:X', 'A:Y', 'A:Z']);
    expect(withPrerequisites(['Cases:HistoryView'], rows)).toEqual(['Cases:HistoryView', 'Cases:View', 'Platform:Audit']);
  });

  it('does not add a retired prerequisite', () => {
    expect(withPrerequisites(['A:X'], [right('A:X', { requires: ['A:Gone'] }), right('A:Gone', { isActive: false })])).toEqual(['A:X']);
  });

  it('a filtered bulk selection covers only the matching rights', () => {
    const shown = filterRights(rows, { ...filters, search: 'cases:delete' }, [], []);
    expect(shown.map(r => r.key)).toEqual(['Cases:Delete']);
    expect(setRights([], shown, true)).toEqual(['Cases:Delete']);
    expect(filterRights(rows, { ...filters, search: 'missing' }, [], [])).toEqual([]);
  });

  it('filters by assignment, staged changes and comparison', () => {
    const base = ['Cases:View'];
    const draft = ['Cases:View', 'Cases:Create'];
    expect(filterRights(rows, { ...filters, assignment: 'granted' }, draft, base).map(r => r.key)).toEqual(['Cases:View', 'Cases:Create']);
    expect(filterRights(rows, { ...filters, assignment: 'changed' }, draft, base).map(r => r.key)).toEqual(['Cases:Create']);
    expect(filterRights(rows, { ...filters, assignment: 'different' }, draft, base, ['Cases:Create']).map(r => r.key)).toEqual(['Cases:View']);
    expect(filterRights(rows, { ...filters, kind: 'Access' }, draft, base).map(r => r.key)).toEqual(['Cases:View', 'Cases:HistoryView']);
  });

  it('groups by module and feature in catalog order', () => {
    const groups = groupRights(rows);
    expect(groups.map(g => g.key)).toEqual(['Administration', 'Cases']);
    expect(groups[1].features.map(f => f.key)).toEqual(['Cases', 'Old']);
  });

  it('marks sensitive rights', () => {
    expect(rows.filter(sensitive).map(r => r.key)).toEqual(['Platform:Audit', 'Cases:Delete']);
  });

  it('filters to the assigned rights that miss a prerequisite', () => {
    expect(filterRights(rows, { ...filters, assignment: 'blocked' }, ['Cases:Delete', 'Platform:Audit'], []).map(r => r.key)).toEqual(['Cases:Delete']);
  });

  it('counts retired rights as not held', () => {
    expect(assignedCount(rows, ['Cases:View', 'Old:Retired'])).toBe(1);
  });

  it('reports only what a save newly leaves without a prerequisite', () => {
    expect(newlyBlocked(rows, ['Cases:Delete'], ['Cases:Delete'])).toEqual([]);
    expect(newlyBlocked(rows, ['Cases:View', 'Cases:Create'], ['Cases:Create']).map(r => r.key)).toEqual(['Cases:Create']);
  });

  it('puts sensitive rights first in a review', () => {
    const cases = rows.filter(r => ['Cases:Create', 'Cases:Delete'].includes(r.key));
    expect(reviewGroups(cases)[0].rows.map(r => r.key)).toEqual(['Cases:Delete', 'Cases:Create']);
  });

  it('gives an unknown action its own grid column', () => {
    const [module] = gridRights([right('Cases:Teleport'), right('Cases:View', { displayOrder: 1 })], []);
    expect(module.columns.map(c => c.action)).toEqual(['View', 'Teleport']);
  });
});

describe('rights grid over the real catalog', () => {
  const catalog = sortedRights(catalogJson as RightDefinition[]);
  const modules = gridRights(catalog, catalog);

  it('shows every right in exactly one box, so none can be missed or doubled', () => {
    const shown = modules.flatMap(m => m.resources.flatMap(r => Object.values(r.cells).map(c => c.key)));
    expect([...shown].sort()).toEqual(catalog.map(r => r.key).sort());
    for (const module of modules) for (const resource of module.resources)
      for (const action of Object.keys(resource.cells)) expect(module.columns.map(c => c.action)).toContain(action);
  });

  it('names each row so that rows of a module can be told apart', () => {
    for (const module of modules) {
      const names = module.resources.map(r => `${r.label} ${r.detail ?? ''}`);
      expect(names.filter((n, i) => names.indexOf(n) !== i), module.key).toEqual([]);
    }
  });
});
