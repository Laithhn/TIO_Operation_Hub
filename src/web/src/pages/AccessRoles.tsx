import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, del, post, put } from '../api';
import { usePermission } from '../hooks';
import { ErrorBox } from '../ui/kit';
import { dependencyWarnings, groupPermissionRows, isGranted, permissionChanges, permissionRows, sensitive, setPermissions,
  type AccessSelection, type PermissionDefinition, type RightDefinition } from './adminRightsModel';

export type AccessRole = { id: number; name: string; description?: string | null; key?: string | null; isActive: boolean; isLocked: boolean; userCount: number; rights: string[]; permissions: string[]; version: string };
export type AccessRegistry = { roles: AccessRole[]; rights: RightDefinition[]; permissions: (PermissionDefinition & { displayName: string; module: string; isActive: boolean })[] };

/** Changes are staged and reviewed, then submitted in one versioned role update. */
export function AccessRoles({ registry, users, onDirty }: { registry: AccessRegistry; users?: { id: number; displayName: string; accountName: string; isActive: boolean; roleIds?: number[]; roleId?: number | null }[]; onDirty: (dirty: boolean) => void }) {
  const client = useQueryClient();
  const canCreate = usePermission('AdminRoles', 'Create');
  const canMaintain = usePermission('AdminRoles', 'Maintain');
  const canDelete = usePermission('AdminRoles', 'Delete');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [roleDirty, setRoleDirty] = useState(false);
  const [creationDirty, setCreationDirty] = useState(false);
  const dirty = roleDirty || creationDirty;
  const [mode, setMode] = useState<'create' | 'clone' | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  const selected = registry.roles.find(r => r.id === selectedId) ?? registry.roles[0];
  const filtered = registry.roles.filter(r => `${r.name} ${r.description ?? ''}`.toLocaleLowerCase().includes(roleSearch.trim().toLocaleLowerCase()));
  const reload = async () => { await client.invalidateQueries({ queryKey: ['admin-roles'] }); };
  const select = (id: number) => {
    if (selected?.id === id) return;
    if (dirty && !window.confirm('Discard the unsaved role changes?')) return;
    setRoleDirty(false); setCreationDirty(false); setMode(null); setSelectedId(id); setError(null); setMessage('');
  };
  const remove = async () => {
    if (!selected || selected.key || selected.userCount > 0 || dirty || !window.confirm(`Delete ${selected.name}? The server will check for all remaining assignments.`)) return;
    setBusy(true); setError(null);
    try { await del(`/admin/roles/${selected.id}`, selected.version); setSelectedId(null); await reload(); setMessage('Role deleted.'); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };
  return <section id="access-roles" className="access-roles" aria-labelledby="access-roles-title">
    <div className="access-section-heading"><div><h2 id="access-roles-title">Roles and permission matrix</h2><p>Manage roles and review their saved and staged access.</p></div>
      {canCreate && <button className="btn btn-primary" disabled={dirty || !!mode} onClick={() => { setMode('create'); setError(null); }}>New role</button>}</div>
    {!!error && <ErrorBox error={error} />}{message && <p role="status">{message}</p>}
    {mode && <RoleCreation key={mode} mode={mode} source={selected} onDirty={setCreationDirty} onCancel={() => { if (creationDirty && !window.confirm('Discard the new role draft?')) return; setCreationDirty(false); setMode(null); }} onCreated={async id => { setCreationDirty(false); setMode(null); setSelectedId(id); await reload(); setMessage('Role created. Review its permissions before assigning it.'); }} />}
    <div className="access-role-layout">
      <div className="access-panel access-role-list"><label>Find a role<input type="search" value={roleSearch} onChange={e => setRoleSearch(e.target.value)} placeholder="Name or description" /></label>
        <ul>{filtered.map(r => <li key={r.id}><button type="button" aria-pressed={selected?.id === r.id} onClick={() => select(r.id)}><strong>{r.name}</strong><small>{r.isActive ? 'Active' : 'Inactive'} · {r.userCount} user{r.userCount === 1 ? '' : 's'}{r.isLocked ? ' · protected' : ''}</small></button></li>)}</ul>
        {!filtered.length && <p>No roles match this search.</p>}
      </div>
      {selected ? <div className="access-panel"><div className="access-panel-title"><h3>{selected.name}</h3><div className="access-role-actions">
        {canCreate && <button className="btn" disabled={dirty || busy || !!mode} onClick={() => { setMode('clone'); setError(null); }}>Duplicate</button>}
        {canDelete && !selected.key && <button className="btn" disabled={dirty || busy || !!mode || selected.userCount > 0} onClick={remove}>Delete role</button>}
      </div></div>
        <p className="hint">{selected.userCount} active assigned user{selected.userCount === 1 ? '' : 's'}. {selected.isLocked ? 'This system role is protected.' : 'Changes affect all users assigned this role.'}</p>
        {users && <details className="access-role-comparison"><summary>Directly assigned users</summary>
          <p className="hint">Includes inactive accounts. Directory group assignments are not listed here.</p>
          {users.some(user => (user.roleIds ?? (user.roleId ? [user.roleId] : [])).includes(selected.id)) ? <ul>{users.filter(user => (user.roleIds ?? (user.roleId ? [user.roleId] : [])).includes(selected.id)).map(user => <li key={user.id}>{user.displayName} ({user.accountName}){user.isActive ? '' : ' · inactive'}</li>)}</ul> : <p>No directly assigned users.</p>}
        </details>}
        <RoleComparison role={selected} registry={registry} />
        <RoleWorkspace key={selected.id} role={selected} registry={registry} editable={canMaintain && !selected.isLocked && !mode} onDirty={setRoleDirty} reload={reload} />
      </div> : <p className="access-empty">Create a role to configure access.</p>}
    </div>
  </section>;
}

/** Compare the saved role assignments returned by the server, without modifying either role. */
function RoleComparison({ role, registry }: { role: AccessRole; registry: AccessRegistry }) {
  const [otherId, setOtherId] = useState('');
  const other = registry.roles.find(r => r.id === Number(otherId) && r.id !== role.id);
  const rows = useMemo(() => permissionRows(registry.rights, registry.permissions), [registry.rights, registry.permissions]);
  const different = other ? rows.filter(row => isGranted(role, row) !== isGranted(other, row)) : [];
  return <details className="access-role-comparison">
    <summary>Compare saved roles</summary>
    <p className="hint">This compares saved role assignments. User-specific exceptions, dependencies, role status and data scope can change a user's effective access.</p>
    <div className="access-role-fields"><label>Compare {role.name} with<select value={other?.id ?? ''} onChange={e => setOtherId(e.target.value)}>
      <option value="">Select another role</option>{registry.roles.filter(r => r.id !== role.id).map(r => <option key={r.id} value={r.id}>{r.name}{r.isActive ? '' : ' · inactive'}</option>)}
    </select></label></div>
    {other && (different.length === 0 ? <p>No differences in registered assignments.</p> : <>
      <p>{different.length} registered assignment{different.length === 1 ? '' : 's'} differ.</p>
      <div className="access-role-matrix" role="region" aria-label="Role comparison"><table className="access-table"><thead><tr><th>Permission</th><th>{role.name}</th><th>{other.name}</th></tr></thead><tbody>
        {different.map(row => <tr key={row.id}><th scope="row">{row.label}<code>{row.key}</code>{!row.active && <small>Deprecated</small>}</th><td>{isGranted(role, row) ? 'Assigned' : 'Not assigned'}</td><td>{isGranted(other, row) ? 'Assigned' : 'Not assigned'}</td></tr>)}
      </tbody></table></div></>)}
  </details>;
}

function RoleCreation({ mode, source, onDirty, onCancel, onCreated }: { mode: 'create' | 'clone'; source?: AccessRole; onDirty: (dirty: boolean) => void; onCancel: () => void; onCreated: (id: number) => Promise<void> }) {
  const [name, setName] = useState(mode === 'clone' ? `${source?.name ?? ''} copy` : '');
  const [description, setDescription] = useState(mode === 'clone' ? source?.description ?? '' : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { onDirty(name !== (mode === 'clone' ? `${source?.name ?? ''} copy` : '') || description !== (mode === 'clone' ? source?.description ?? '' : '')); }, [name, description, mode, source, onDirty]);
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const role = await post<{ id: number }>(mode === 'clone' ? `/admin/roles/${source!.id}/clone` : '/admin/roles', { name, description, rights: [], permissions: [], isActive: true });
      await onCreated(role.id);
    } catch (e) { setError(e); } finally { setBusy(false); }
  };
  return <div className="access-panel access-role-create" role="region" aria-label={mode === 'clone' ? 'Duplicate role' : 'New role'}>
    <h3>{mode === 'clone' ? `Duplicate ${source?.name}` : 'New role'}</h3>
    <p className="hint">{mode === 'clone' ? 'The server copies the source role’s saved permissions.' : 'New roles start with no permissions.'}</p>
    {!!error && <ErrorBox error={error} />}
    <div className="access-role-fields"><label>Role name<input value={name} maxLength={60} onChange={e => setName(e.target.value)} /></label><label>Description<input value={description} maxLength={300} onChange={e => setDescription(e.target.value)} /></label></div>
    <div className="access-role-actions"><button className="btn" onClick={onCancel} disabled={busy}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy || !name.trim()}>{mode === 'clone' ? 'Duplicate role' : 'Create role'}</button></div>
  </div>;
}

function RoleWorkspace({ role, registry, editable, onDirty, reload }: { role: AccessRole; registry: AccessRegistry; editable: boolean; onDirty: (dirty: boolean) => void; reload: () => Promise<void> }) {
  const [base, setBase] = useState(role);
  const [draft, setDraft] = useState<AccessSelection>({ rights: [...role.rights], permissions: [...role.permissions] });
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? '');
  const [active, setActive] = useState(role.isActive);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const rows = useMemo(() => permissionRows(registry.rights, registry.permissions), [registry.rights, registry.permissions]);
  const changes = permissionChanges(base, draft, rows);
  const metadataChanged = name !== base.name || description !== (base.description ?? '') || active !== base.isActive;
  const dirty = metadataChanged || changes.grants.length > 0 || changes.revocations.length > 0;
  const visible = rows.filter(r => (!module || r.module === module) && `${r.label} ${r.key} ${r.description}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const groups = groupPermissionRows(visible);
  const warnings = dependencyWarnings(rows, draft);
  const update = (next: AccessSelection) => { setDraft(next); onDirty(metadataChanged || permissionChanges(base, next, rows).grants.length > 0 || permissionChanges(base, next, rows).revocations.length > 0); setSaved(false); };
  const updateMetadata = (nextName: string, nextDescription: string, nextActive: boolean) => {
    setName(nextName); setDescription(nextDescription); setActive(nextActive); setSaved(false);
    onDirty(nextName !== base.name || nextDescription !== (base.description ?? '') || nextActive !== base.isActive || changes.grants.length > 0 || changes.revocations.length > 0);
  };
  const save = async () => {
    setBusy(true); setError(null);
    try {
      await put(`/admin/roles/${base.id}`, { name, description, isActive: active, ...draft }, base.version);
      await reload(); setReview(false); onDirty(false); setSaved(true);
      // Remount from the returned registry before any subsequent edit; do not guess the new row version.
    } catch (e) { setError(e); } finally { setBusy(false); }
  };
  const stale = role.version !== base.version || saved;
  return <div className="access-role-workspace">
    {!!error && <ErrorBox error={error} />}
    {error instanceof ApiError && error.isConflict && <p role="alert">The role changed on the server. Your draft is retained. <button className="linkbtn" onClick={() => void reload()}>Fetch latest role</button> to review it before discarding your draft.</p>}
    {stale && <div className="notice warn">{saved ? 'Role saved. ' : 'This role changed on the server. '}
      {saved && role.version === base.version ? <><span>The latest version has not loaded yet. </span><button className="linkbtn" onClick={() => void reload()}>Fetch latest role</button>.</> :
        <><button className="linkbtn" onClick={() => { if (dirty && !saved && !window.confirm('Discard the staged role changes?')) return; setBase(role); setDraft({ rights: [...role.rights], permissions: [...role.permissions] }); setName(role.name); setDescription(role.description ?? ''); setActive(role.isActive); setReview(false); setError(null); setSaved(false); onDirty(false); }}>Load latest role</button> before editing.</>}</div>}
    <fieldset disabled={!editable || busy || stale}><legend>Role details</legend><div className="access-role-fields">
      <label>Role name<input value={name} maxLength={60} onChange={e => updateMetadata(e.target.value, description, active)} /></label>
      <label>Description<input value={description} maxLength={300} onChange={e => updateMetadata(name, e.target.value, active)} /></label>
      <label><input type="checkbox" checked={active} onChange={e => updateMetadata(name, description, e.target.checked)} /> Active role</label>
    </div></fieldset>
    <div className="access-role-fields"><label>Search matrix<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, key or description" /></label>
      <label>Module<select value={module} onChange={e => setModule(e.target.value)}><option value="">All modules</option>{[...new Set(rows.map(r => r.module))].sort().map(m => <option key={m}>{m}</option>)}</select></label></div>
    <p className="hint">Selections are direct role assignments. Required parent permissions, user scope and other server policies still apply. Granting a parent does not grant its descendants.</p>
    {warnings.length > 0 && <p className="notice warn">{warnings.length} assigned permission{warnings.length === 1 ? '' : 's'} may be blocked by missing prerequisites.</p>}
    <div className="access-role-matrix" role="region" aria-label="Role permission matrix">{groups.map(group => <details key={group.key} open={search !== '' || module !== '' ? true : undefined}>
      <summary>{group.label} · {group.rows.filter(r => isGranted(draft, r)).length} / {group.rows.length} assigned</summary>
      <div className="access-role-actions"><button className="btn" disabled={!editable || busy || stale || !group.rows.some(r => r.active && !isGranted(draft, r))} onClick={() => { if (window.confirm(`Stage all ${group.rows.filter(r => r.active).length} active permissions shown in ${group.label}?`)) update(setPermissions(draft, group.rows, true)); }}>Grant shown</button>
        <button className="btn" disabled={!editable || busy || stale || !group.rows.some(r => isGranted(draft, r))} onClick={() => { if (window.confirm(`Stage removal of the permissions shown in ${group.label}?`)) update(setPermissions(draft, group.rows, false)); }}>Revoke shown</button></div>
      <table className="access-table"><thead><tr><th>Permission</th><th>Assignment</th></tr></thead><tbody>{group.rows.map(row => <tr key={row.id}><th scope="row">{row.label}{sensitive(row) && <small className="access-risk">{row.risk} risk</small>}<code>{row.key}</code><small>{row.description}</small>{row.requires.length > 0 && <small>Requires: {row.requires.join(', ')}</small>}</th><td><label><input type="checkbox" aria-label={`${row.label} for ${base.name}`} checked={isGranted(draft, row)} disabled={!editable || busy || stale || (!row.active && !isGranted(draft, row))} onChange={e => update(setPermissions(draft, [row], e.target.checked))} /> {row.active ? 'Assigned' : 'Deprecated'}</label></td></tr>)}</tbody></table>
    </details>)}{groups.length === 0 && <p className="access-empty">No permissions match this search.</p>}</div>
    <div className="access-role-actions"><button className="btn btn-primary" disabled={!editable || busy || stale || !dirty || !name.trim()} onClick={() => setReview(true)}>Review changes</button>
      <button className="btn" disabled={busy || !dirty || stale} onClick={() => { if (!window.confirm('Discard the staged role changes?')) return; setDraft({ rights: [...base.rights], permissions: [...base.permissions] }); setName(base.name); setDescription(base.description ?? ''); setActive(base.isActive); setReview(false); setError(null); onDirty(false); }}>Discard changes</button></div>
    {review && <div className="override-review" role="region" aria-label="Review role changes"><h4>Review changes to {base.name}</h4><p>These changes affect {base.userCount} active assigned user{base.userCount === 1 ? '' : 's'} and may affect other assignments.</p>
      {metadataChanged && <p>Role details: {base.name} → {name}; {base.isActive ? 'active' : 'inactive'} → {active ? 'active' : 'inactive'}{description !== (base.description ?? '') ? '; description changed' : ''}.</p>}
      <ul>{changes.grants.map(r => <li key={r.id}>Grant: {r.label} ({r.key}){sensitive(r) ? ` · ${r.risk} risk` : ''}</li>)}{changes.revocations.map(r => <li key={r.id}>Revoke: {r.label} ({r.key})</li>)}</ul>
      <div className="access-role-actions"><button className="btn" disabled={busy} onClick={() => setReview(false)}>Back to editing</button><button className="btn btn-primary" disabled={busy || stale} onClick={save}>Confirm and save role</button></div></div>}
  </div>;
}
