/** Registry hierarchy and prerequisites mirror the server manifest; editing never implicitly changes other grants. */
export type PermissionDefinition = {
  key: string; resource: string; resourceLabel: string; action: string; actionLabel: string; description: string;
  displayName?: string; module?: string; parentKey?: string | null; riskLevel?: string; isActive?: boolean; supportsScope?: boolean; requires?: string[]; nodeType?: PermissionNodeType; displayOrder?: number;
};
export type PermissionNodeType = 'Module' | 'Submodule' | 'Tab' | 'Action';
export type RightDefinition = { key: string; label: string; description: string };
export type AccessSelection = { rights: string[]; permissions: string[] };
export type PermissionRow = {
  id: string; key: string; kind: 'rights' | 'permissions'; label: string; description: string; module: string;
  resource: string; resourceLabel: string; action: string; actionLabel: string; risk: string; active: boolean; supportsScope: boolean; requires: string[]; parentKey: string | null; nodeType: PermissionNodeType; displayOrder: number;
};
export type PermissionFilters = { search: string; module: string; resource: string; action: string; risk: string; assignment: string };
export type PermissionGroup = { key: string; label: string; rows: PermissionRow[]; resources: { key: string; label: string; rows: PermissionRow[] }[] };

export function permissionRows(rights: RightDefinition[], permissions: PermissionDefinition[]): PermissionRow[] {
  return [
    ...rights.map(r => ({ id: `rights/${r.key}`, key: r.key, kind: 'rights' as const, label: r.label,
      description: r.description, module: 'Cross-cutting controls', resource: 'CrossCutting', resourceLabel: 'Administration and data controls',
      action: r.key, actionLabel: r.label, risk: ['Administer', 'TechnicalDetail', 'Audit'].includes(r.key) ? 'High' : 'Elevated', active: true, supportsScope: false, requires: [], parentKey: null, nodeType: 'Action' as const, displayOrder: -1 })),
    ...permissions.map(p => ({ id: `permissions/${p.key}`, key: p.key, kind: 'permissions' as const,
      label: p.displayName || `${p.resourceLabel}: ${p.actionLabel}`, description: p.description,
      module: p.module || p.resourceLabel, resource: p.resource, resourceLabel: p.resourceLabel,
      action: p.action, actionLabel: p.actionLabel, risk: p.riskLevel || 'Standard', active: p.isActive !== false, supportsScope: p.supportsScope === true, requires: p.requires ?? [], parentKey: p.parentKey ?? null, nodeType: p.nodeType ?? 'Action', displayOrder: p.displayOrder ?? 0 }))
  ].sort((a, b) => a.module.localeCompare(b.module) || a.resourceLabel.localeCompare(b.resourceLabel) || a.actionLabel.localeCompare(b.actionLabel));
}

export function isGranted(selection: AccessSelection, row: PermissionRow): boolean {
  return selection[row.kind].includes(row.key);
}

/** Editing one leaf never changes its parent, siblings or dependencies. Unknown retained keys survive editing. */
export function setPermissions(selection: AccessSelection, rows: PermissionRow[], grant: boolean): AccessSelection {
  const next = { rights: new Set(selection.rights), permissions: new Set(selection.permissions) };
  for (const row of rows) {
    if (grant && row.active) next[row.kind].add(row.key);
    else if (!grant) next[row.kind].delete(row.key);
  }
  return { rights: [...next.rights].sort(), permissions: [...next.permissions].sort() };
}

export function permissionChanges(base: AccessSelection, draft: AccessSelection, rows: PermissionRow[]) {
  return {
    grants: rows.filter(r => !isGranted(base, r) && isGranted(draft, r)),
    revocations: rows.filter(r => isGranted(base, r) && !isGranted(draft, r))
  };
}

export function sensitive(row: PermissionRow): boolean {
  return /^(high|critical|sensitive|elevated)$/i.test(row.risk);
}

export function filterPermissionRows(rows: PermissionRow[], filters: PermissionFilters, draft: AccessSelection, base: AccessSelection,
  compare?: AccessSelection): PermissionRow[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return rows.filter(r => (!search || [r.key, r.label, r.description, r.resourceLabel, r.module].some(s => s.toLocaleLowerCase().includes(search)))
    && (!filters.module || r.module === filters.module) && (!filters.resource || r.resource === filters.resource) && (!filters.action || r.action === filters.action) && (!filters.risk || r.risk === filters.risk)
    && (filters.assignment !== 'granted' || isGranted(draft, r)) && (filters.assignment !== 'denied' || !isGranted(draft, r))
    && (filters.assignment !== 'changed' || isGranted(base, r) !== isGranted(draft, r))
    && (filters.assignment !== 'different' || !!compare && isGranted(draft, r) !== isGranted(compare, r)));
}

export function groupPermissionRows(rows: PermissionRow[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const row of rows) {
    let group = groups.get(row.module);
    if (!group) { group = { key: row.module, label: row.module, rows: [], resources: [] }; groups.set(row.module, group); }
    group.rows.push(row);
    let resource = group.resources.find(r => r.key === row.resource);
    if (!resource) { resource = { key: row.resource, label: row.resourceLabel, rows: [] }; group.resources.push(resource); }
    resource.rows.push(row);
  }
  return [...groups.values()];
}

export function missingDependencies(row: PermissionRow, rows: PermissionRow[], draft: AccessSelection): string[] {
  const required = row.requires.length ? row.requires : row.kind === 'permissions' && row.nodeType === 'Action' && row.action !== 'View'
    && rows.some(view => view.active && view.kind === 'permissions' && view.resource === row.resource && view.action === 'View') ? [`${row.resource}:View`] : [];
  return required.filter(key => !draft.permissions.includes(key) && !draft.rights.includes(key));
}

/** Advisory only: missing dependencies are never silently granted to satisfy an action. */
export function dependencyWarnings(rows: PermissionRow[], draft: AccessSelection): PermissionRow[] {
  return rows.filter(row => row.active && isGranted(draft, row) && missingDependencies(row, rows, draft).length > 0);
}

export type PermissionTreeNode = { row: PermissionRow; children: PermissionTreeNode[]; shown: PermissionRow[] };
/** Keep ancestor context when a search matches only a leaf. Bulk operations affect only matching rows. */
export function permissionTree(rows: PermissionRow[], visible: PermissionRow[]): PermissionTreeNode[] {
  const byKey = new Map(rows.filter(r => r.kind === 'permissions').map(r => [r.key, r]));
  const included = new Set(visible.map(r => r.id));
  for (const row of visible) {
    const visited = new Set<string>();
    let key = row.parentKey;
    while (key && !visited.has(key)) {
      visited.add(key);
      const parent = byKey.get(key);
      if (!parent) break;
      included.add(parent.id); key = parent.parentKey;
    }
  }
  const nodes = new Map(rows.filter(r => included.has(r.id)).map(row => [row.id, { row, children: [], shown: [] } as PermissionTreeNode]));
  const roots: PermissionTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.row.parentKey ? nodes.get(`permissions/${node.row.parentKey}`) : undefined;
    if (parent) parent.children.push(node); else roots.push(node);
  }
  const visibleIds = new Set(visible.map(r => r.id));
  const collect = (node: PermissionTreeNode, path: Set<string>): PermissionRow[] => {
    if (path.has(node.row.id)) return [];
    node.children.sort((a, b) => a.row.displayOrder - b.row.displayOrder || a.row.label.localeCompare(b.row.label));
    node.shown = [...(visibleIds.has(node.row.id) ? [node.row] : []), ...node.children.flatMap(child => collect(child, new Set([...path, node.row.id])))];
    return node.shown;
  };
  roots.sort((a, b) => a.row.displayOrder - b.row.displayOrder || a.row.label.localeCompare(b.row.label));
  roots.forEach(node => collect(node, new Set()));
  return roots;
}

export function selectionState(rows: PermissionRow[], selection: AccessSelection): 'all' | 'none' | 'partial' {
  const active = rows.filter(r => r.active);
  const count = active.filter(r => isGranted(selection, r)).length;
  return count === 0 ? 'none' : count === active.length ? 'all' : 'partial';
}
