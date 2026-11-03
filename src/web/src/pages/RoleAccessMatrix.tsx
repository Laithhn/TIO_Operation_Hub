import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '../ui/kit';
import { isGranted, missingDependencies, permissionRows, permissionTree,
  type PermissionDefinition, type PermissionRow, type PermissionTreeNode, type RightDefinition } from './adminRightsModel';
import './role-access-matrix.css';

type MatrixRole = {
  id: number; name: string; description?: string; isActive: boolean; isLocked: boolean;
  userCount: number; rights: string[]; permissions: string[];
};

type MatrixRow = { row: PermissionRow; depth: number; branch: boolean; expanded: boolean };

function assignment(role: MatrixRole, row: PermissionRow, rows: PermissionRow[]) {
  if (!isGranted(role, row)) return { label: 'Not assigned', mark: '—', tone: 'none' };
  if (!role.isActive) return { label: 'Assigned, role inactive', mark: '•', tone: 'inactive' };
  if (missingDependencies(row, rows, role).length) return { label: 'Assigned, blocked by required access', mark: '!', tone: 'blocked' };
  return { label: 'Effective', mark: '✓', tone: 'effective' };
}

/** Read-only comparison of saved role assignments. All edits use the existing reviewed Rights editor. */
export function RoleAccessMatrix({ roles, rights, definitions, editable }: {
  roles: MatrixRole[]; rights: RightDefinition[]; definitions: PermissionDefinition[]; editable: boolean;
}) {
  const rows = useMemo(() => permissionRows(rights, definitions), [rights, definitions]);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>(() => rows.filter(r => r.nodeType === 'Submodule' || r.nodeType === 'Tab').map(r => r.id));
  const [selectedId, setSelectedId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const selected = rows.find(r => r.id === selectedId) ?? rows.find(r => r.nodeType === 'Module') ?? rows[0];
  const selectedRole = roles.find(r => r.id === selectedRoleId) ?? roles[0];
  const needle = search.trim().toLocaleLowerCase();
  useEffect(() => { if (needle) setCollapsed([]); }, [needle]);
  const filtered = rows.filter(r => (!module || r.module === module)
    && (!needle || [r.label, r.key, r.description, r.module, r.resourceLabel].some(x => x.toLocaleLowerCase().includes(needle))));
  const tree = permissionTree(rows, filtered);
  const flatten = (nodes: PermissionTreeNode[], depth = 0): MatrixRow[] => nodes.flatMap(node => {
    const branch = node.children.length > 0;
    const expanded = !collapsed.includes(node.row.id);
    return [{ row: node.row, depth, branch, expanded }, ...(branch && expanded ? flatten(node.children, depth + 1) : [])];
  });
  const shown = flatten(tree);
  const byKey = new Map(rows.map(r => [r.key, r]));
  const parents: PermissionRow[] = [];
  let parentKey = selected?.parentKey;
  while (parentKey && byKey.has(parentKey)) {
    const parent = byKey.get(parentKey)!;
    parents.unshift(parent);
    parentKey = parent.parentKey;
  }
  const toggle = (id: string) => setCollapsed(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  const editPath = (role: MatrixRole, row: PermissionRow) => `/admin/rights?role=${role.id}&permission=${encodeURIComponent(row.key)}`;

  return <section className="role-matrix" aria-labelledby="role-matrix-title">
    <div className="role-matrix-heading">
      <div><h2 id="role-matrix-title">Role access matrix</h2><p className="hint">Compare saved permissions across roles. Select a cell to inspect its access; configure a role in Rights.</p></div>
      <span className="role-matrix-total">{roles.length} roles · {rows.length} rights</span>
    </div>
    <div className="role-matrix-filters">
      <label>Find a right<input type="search" placeholder="Name, key or description" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label>Module<select value={module} onChange={e => setModule(e.target.value)}><option value="">All modules</option>
        {[...new Set(rows.map(r => r.module))].sort().map(x => <option key={x} value={x}>{x}</option>)}
      </select></label>
      <button className="btn" onClick={() => setCollapsed([])}>Expand all</button>
      <button className="btn" onClick={() => setCollapsed(rows.filter(r => r.nodeType !== 'Action').map(r => r.id))}>Collapse all</button>
    </div>
    <div className="role-matrix-layout">
      <div className="role-matrix-scroll" role="region" aria-label="Role and permission comparison" tabIndex={0}>
        <table>
          <caption className="sr-only">Saved permission assignments by role</caption>
          <thead><tr><th scope="col">Right name</th><th scope="col">Description</th>{roles.map(role =>
            <th scope="col" key={role.id}><span>{role.name}</span><small>{role.userCount} user{role.userCount === 1 ? '' : 's'}</small></th>)}</tr></thead>
          <tbody>{shown.map(({ row, depth, branch, expanded }) => <tr key={row.id} className={`role-matrix-${row.nodeType.toLowerCase()}${selected?.id === row.id ? ' selected' : ''}`}>
            <th scope="row"><div className="role-matrix-name" style={{ paddingLeft: `${10 + depth * 19}px` }}>
              {branch && <button className="role-matrix-expand" type="button" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${row.label}`} aria-expanded={expanded} onClick={() => toggle(row.id)}>{expanded ? '▾' : '▸'}</button>}
              <button className="role-matrix-row-button" type="button" onClick={() => setSelectedId(row.id)}>{row.label}</button>
              <small>{row.kind === 'rights' ? 'Control' : row.nodeType}</small>
            </div></th>
            <td className="role-matrix-description" title={row.description}>{row.description}</td>
            {roles.map(role => { const state = assignment(role, row, rows); return <td key={role.id}>
              <button type="button" className={`role-matrix-cell ${state.tone}`} aria-label={`${role.name}: ${state.label} for ${row.label}`}
                aria-pressed={selected?.id === row.id && selectedRole?.id === role.id} title={`${role.name}: ${state.label}`}
                onClick={() => { setSelectedId(row.id); setSelectedRoleId(role.id); }}><span aria-hidden="true">{state.mark}</span></button>
            </td>; })}</tr>)}</tbody>
        </table>
        {shown.length === 0 && <p className="role-matrix-empty">No rights match this search.</p>}
      </div>
      {selected && <aside className="role-matrix-inspector" aria-label="Selected right details">
        <div className="role-matrix-inspector-head"><Badge>{selected.kind === 'rights' ? 'Control' : selected.nodeType}</Badge><h3>{selected.label}</h3><code>{selected.key}</code></div>
        {parents.length > 0 && <p className="role-matrix-path">{parents.map(p => p.label).join(' › ')}</p>}
        <p>{selected.description}</p>
        {selected.requires.length > 0 && <div className="role-matrix-requires"><strong>Required access</strong><ul>{selected.requires.map(key => <li key={key}><code>{key}</code></li>)}</ul></div>}
        <h4>Roles</h4>
        <ul className="role-matrix-role-list">{roles.map(role => { const state = assignment(role, selected, rows); return <li key={role.id} className={role.id === selectedRole?.id ? 'selected' : ''}>
          <span><strong>{role.name}</strong><small>{state.label}{role.isLocked ? ' · protected' : ''}</small></span>
          {!role.isLocked && <Link to={editPath(role, selected)} aria-label={`${editable ? 'Configure' : 'Inspect'} ${selected.label} for ${role.name}`}>{editable ? 'Configure' : 'Inspect'}</Link>}
        </li>; })}</ul>
        <p className="hint">Assignments shown here are saved values. A granted child can still be blocked by a missing parent, and an inactive role contributes no access. Record scope and other policy checks also apply.</p>
      </aside>}
    </div>
  </section>;
}
