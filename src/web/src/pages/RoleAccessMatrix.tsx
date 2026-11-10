import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '../ui/kit';
import { groupRights, moduleOf, isGranted, missingPrerequisites, sortedRights, type RightDefinition } from './adminRightsModel';
import './role-access-matrix.css';

type MatrixRole = { id: number; name: string; description?: string; isActive: boolean; isLocked: boolean; userCount: number; rights: string[] };

function assignment(role: MatrixRole, row: RightDefinition) {
  if (!isGranted(role.rights, row)) return { label: 'Not assigned', mark: '—', tone: 'none' };
  if (!role.isActive) return { label: 'Assigned, role inactive', mark: '•', tone: 'inactive' };
  if (missingPrerequisites(row, role.rights).length) return { label: 'Assigned, a prerequisite is missing from this role', mark: '!', tone: 'blocked' };
  return { label: 'Effective for this role alone', mark: '✓', tone: 'effective' };
}

/** Read-only comparison of saved role grants. A person's final access also depends on their other roles, exceptions and data scope. Edits go through the reviewed Rights page. */
export function RoleAccessMatrix({ roles, catalog, editable }: { roles: MatrixRole[]; catalog: RightDefinition[]; editable: boolean }) {
  const rows = useMemo(() => sortedRights(catalog), [catalog]);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [open, setOpen] = useState<string[]>([]);
  const [onlyDifferent, setOnlyDifferent] = useState(false);
  const needle = search.trim().toLocaleLowerCase();
  const filtered = rows.filter(r => (!module || moduleOf(r) === module)
    && (!onlyDifferent || new Set(roles.filter(role => !role.isLocked).map(role => isGranted(role.rights, r))).size > 1)
    && (!needle || [r.label, r.key, r.description, r.module, moduleOf(r), r.featureLabel].some(x => x.toLocaleLowerCase().includes(needle))));
  const groups = groupRights(filtered);
  const toggle = (key: string) => setOpen(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  return <section className="role-matrix" aria-labelledby="role-matrix-title">
    <h2 id="role-matrix-title">Compare roles</h2>
    <p className="hint">Shows what each role is assigned on its own. A person's final access also depends on their other roles, individual exceptions and data scope.</p>
    <div className="role-matrix-filters">
      <label>Find a right<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, module or key" /></label>
      <label>Module<select value={module} onChange={e => setModule(e.target.value)}><option value="">All modules</option>
        {[...new Set(rows.map(moduleOf))].map(m => <option key={m}>{m}</option>)}</select></label>
      <label className="role-matrix-check"><input type="checkbox" checked={onlyDifferent} onChange={e => setOnlyDifferent(e.target.checked)} />Only where roles differ</label>
      <span role="status">{filtered.length} of {rows.length} rights</span>
      <span className="role-matrix-actions">
        <button type="button" className="btn" onClick={() => setOpen(groups.flatMap(g => g.features.map(f => `${g.key}/${f.key}`)))}>Expand all</button>
        <button type="button" className="btn" onClick={() => setOpen([])}>Collapse all</button>
      </span>
    </div>
    <div className="role-matrix-scroll" role="region" aria-label="Role and right comparison" tabIndex={0}>
      <table className="role-matrix-table" aria-label="Saved rights by role">
        <thead><tr><th scope="col">Right</th>{roles.map(r => <th scope="col" key={r.id}>
          {editable ? <Link to={`/admin/rights?role=${r.id}`} aria-label={`Edit the rights of ${r.name}`}>{r.name}</Link> : r.name}
          {!r.isActive && <Badge tone="warn">Inactive</Badge>}{r.isLocked && <Badge>Protected</Badge>}
        </th>)}</tr></thead>
        {groups.map(group => group.features.map(feature => {
          const key = `${group.key}/${feature.key}`;
          const expanded = needle.length > 0 || open.includes(key);
          return <tbody key={key}>
            <tr className="role-matrix-branch"><th scope="rowgroup">
              <button type="button" className="linkbtn" aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.label}: ${feature.label}`} onClick={() => toggle(key)}>
                {expanded ? '▾' : '▸'} {group.label}: {feature.label}</button>
            </th>
              {roles.map(role => { const held = feature.rows.filter(r => isGranted(role.rights, r)).length;
                return <td key={role.id} className={held === 0 ? 'role-matrix-none' : ''}><span aria-label={`${role.name}: ${held} of ${feature.rows.length} assigned`}>{held} / {feature.rows.length}</span></td>; })}
            </tr>
            {expanded && feature.rows.map(row => <tr key={row.key}>
              <th scope="row"><span>{row.label}</span> <Badge>{row.kind}</Badge><code>{row.key}</code></th>
              {roles.map(role => { const a = assignment(role, row);
                return <td key={role.id} className={`role-matrix-${a.tone}`} title={a.label}><span aria-label={`${role.name}: ${a.label}`}>{a.mark}</span></td>; })}
            </tr>)}
          </tbody>;
        }))}
      </table>
    </div>
    {filtered.length === 0 && <p className="access-empty">No rights match these filters.</p>}
    <p className="hint">✓ effective for this role alone · ! assigned, but a prerequisite is missing · • assigned, role inactive · — not assigned</p>
  </section>;
}
