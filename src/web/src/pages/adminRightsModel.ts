/** The rights catalog as the editor uses it. Editing never changes another right: a prerequisite is reported, and added only when the administrator asks. */
export type RightDefinition = {
  key: string; label: string; description: string; module: string; feature: string; featureLabel: string; action: string;
  kind: 'Access' | 'Action'; riskLevel: string; supportsScope: boolean; requires: string[]; displayOrder: number; isActive: boolean;
};
export type RightFilters = { search: string; module: string; feature: string; kind: string; risk: string; assignment: string };
export type RightGroup = { key: string; label: string; rows: RightDefinition[]; features: { key: string; label: string; rows: RightDefinition[] }[] };

/** Catalog order: modules and features stay where the server put them. */
export function sortedRights(catalog: RightDefinition[]): RightDefinition[] {
  return [...catalog].sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Rights that apply across every module (Administration, Export files, Technical detail, Change history). The catalog files them under
 * Administration, where nobody looks for Technical detail, so the editor shows them as a section of their own. The catalog is unchanged. */
export const PLATFORM_SECTION = 'Platform-wide controls';
export const PLATFORM_SECTION_HINT = 'These apply across every module. Technical detail shows network zones, server IP addresses and firewall rules; Export files and Change history unlock the per-module Export and history rights.';
export const moduleOf = (row: Pick<RightDefinition, 'module' | 'feature'>) => row.module === 'Administration' && row.feature === 'Platform' ? PLATFORM_SECTION : row.module;

export const isGranted = (selection: string[], row: RightDefinition) => selection.includes(row.key);

/** A retired key the role still stores stays in the selection until removed: it grants nothing, and removing it is a reviewed change. */
export function setRights(selection: string[], rows: RightDefinition[], grant: boolean): string[] {
  const next = new Set(selection);
  for (const row of rows) {
    if (grant && row.isActive) next.add(row.key);
    else if (!grant) next.delete(row.key);
  }
  return [...next].sort();
}

export function rightChanges(base: string[], draft: string[], rows: RightDefinition[]) {
  return {
    grants: rows.filter(r => !isGranted(base, r) && isGranted(draft, r)),
    revocations: rows.filter(r => isGranted(base, r) && !isGranted(draft, r))
  };
}

export const sensitive = (row: RightDefinition) => /^(high|critical)$/i.test(row.riskLevel);

export function filterRights(rows: RightDefinition[], filters: RightFilters, draft: string[], base: string[], compare?: string[]): RightDefinition[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return rows.filter(r => (!search || [r.key, r.label, r.description, r.featureLabel, r.module, moduleOf(r)].some(s => s.toLocaleLowerCase().includes(search)))
    && (!filters.module || moduleOf(r) === filters.module) && (!filters.feature || r.feature === filters.feature)
    && (!filters.kind || r.kind === filters.kind) && (!filters.risk || r.riskLevel === filters.risk)
    && (filters.assignment !== 'granted' || isGranted(draft, r)) && (filters.assignment !== 'denied' || !isGranted(draft, r))
    && (filters.assignment !== 'changed' || isGranted(base, r) !== isGranted(draft, r))
    && (filters.assignment !== 'blocked' || r.isActive && isGranted(draft, r) && missingPrerequisites(r, draft).length > 0)
    && (filters.assignment !== 'different' || !!compare && isGranted(draft, r) !== isGranted(compare, r)));
}

export function groupRights(rows: RightDefinition[]): RightGroup[] {
  const groups = new Map<string, RightGroup>();
  for (const row of rows) {
    const module = moduleOf(row);
    let group = groups.get(module);
    if (!group) { group = { key: module, label: module, rows: [], features: [] }; groups.set(module, group); }
    group.rows.push(row);
    let feature = group.features.find(f => f.key === row.feature);
    if (!feature) { feature = { key: row.feature, label: row.featureLabel, rows: [] }; group.features.push(feature); }
    feature.rows.push(row);
  }
  return [...groups.values()];
}

export const missingPrerequisites = (row: RightDefinition, selection: string[]) => row.requires.filter(key => !selection.includes(key));

/** Advisory only. The role can be saved like this, and the right stays ineffective unless another role of the person supplies what is missing. */
export function prerequisiteWarnings(rows: RightDefinition[], selection: string[]): RightDefinition[] {
  return rows.filter(row => row.isActive && isGranted(selection, row) && missingPrerequisites(row, selection).length > 0);
}

/** Every right needed to make the given selection effective, including prerequisites of prerequisites. */
export function withPrerequisites(selection: string[], rows: RightDefinition[]): string[] {
  const byKey = new Map(rows.map(r => [r.key, r]));
  const result = new Set(selection);
  const pending = [...selection];
  while (pending.length) {
    for (const required of byKey.get(pending.pop()!)?.requires ?? []) {
      if (byKey.get(required)?.isActive && !result.has(required)) { result.add(required); pending.push(required); }
    }
  }
  return [...result].sort();
}

export type RoleDef = { id: number; name: string; description?: string; key?: string; isLocked: boolean; isActive: boolean; rights: string[]; userCount: number; version: string };

/** Active rights only: a retired right can stay stored, but it never counts as held. */
export const assignedCount = (rows: RightDefinition[], selection: string[]) => rows.filter(r => r.isActive && isGranted(selection, r)).length;

const ACTION_COLUMNS: [string, string][] = [
  ['Access', 'Open'], ['View', 'View'], ['Create', 'Create'], ['Maintain', 'Edit'], ['Coordinate', 'Coordinate'], ['ArchiveRestore', 'Archive'], ['Delete', 'Delete'],
  ['DetailsView', 'Details'], ['HistoryView', 'History'], ['AttachmentsView', 'View files'], ['AttachmentsUpload', 'Upload files'], ['AttachmentsDeleteOwn', 'Delete own files'],
  ['AttachmentsDelete', 'Delete any file'], ['Download', 'Download'], ['Export', 'Export'], ['Administration', 'Enter'], ['TechnicalDetail', 'Technical detail'], ['Audit', 'Change history']
];
export type RightGridRow = { key: string; label: string; detail?: string; cells: Record<string, RightDefinition> };
export type RightGridModule = { key: string; label: string; rows: RightDefinition[]; columns: { action: string; label: string }[]; resources: RightGridRow[] };

/** The part of a key before the action: `Cases` for `Cases:View`, `tab.Cases.work` for `tab.Cases.work:View`. */
export const resourceOf = (row: RightDefinition) => row.key.slice(0, row.key.lastIndexOf(':'));

function resourceLabel(resource: string, row: RightDefinition, catalog: RightDefinition[]): Pick<RightGridRow, 'label' | 'detail'> {
  if (!resource.startsWith('tab.')) return { label: row.featureLabel };
  const view = catalog.find(r => r.key === `${resource}:View`);
  return { label: view?.label ?? resource.slice(resource.lastIndexOf('.') + 1), detail: row.featureLabel };
}

/** Modules as tables: one row per resource, one column per action the module uses. A catalog action not listed above still gets a column, so no right can go missing. */
export function gridRights(rows: RightDefinition[], catalog: RightDefinition[]): RightGridModule[] {
  return groupRights(rows).map(group => {
    const resources = new Map<string, RightGridRow>();
    for (const row of group.rows) {
      const key = resourceOf(row);
      let resource = resources.get(key);
      if (!resource) { resource = { key, ...resourceLabel(key, row, catalog), cells: {} }; resources.set(key, resource); }
      resource.cells[row.action] = row;
    }
    const used = new Set(group.rows.map(r => r.action));
    const known = ACTION_COLUMNS.filter(([action]) => used.has(action)).map(([action, label]) => ({ action, label }));
    const other = [...used].filter(action => !ACTION_COLUMNS.some(([a]) => a === action)).map(action => ({ action, label: action }));
    return { key: group.key, label: group.label, rows: group.rows, columns: [...known, ...other], resources: [...resources.values()] };
  });
}

/** Sensitive rights first within each module, so a review starts with what matters most. */
export function reviewGroups(rows: RightDefinition[]) {
  return groupRights(rows).map(group => ({ key: group.key, label: group.label, rows: [...group.rows].sort((a, b) => Number(sensitive(b)) - Number(sensitive(a))) }));
}

/** Rights that this save would leave without a prerequisite, not counting those already in that state. */
export function newlyBlocked(rows: RightDefinition[], base: string[], draft: string[]) {
  const before = new Set(prerequisiteWarnings(rows, base).map(r => r.key));
  return prerequisiteWarnings(rows, draft).filter(r => !before.has(r.key));
}
