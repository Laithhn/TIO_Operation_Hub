import { hasPermission, resourceForRecord } from '../permissions';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { del, get, post, put, qs, type Paged } from '../api';
import { fmtDateTime, label } from '../format';
import { useForm, useLeaveGuard, useMe, usePermission, useRefresh, useUrlState } from '../hooks';
import { ActionDialog, computerZone, TimeZoneSelect, timeZoneOptions } from '../ui/pickers';
import { configCrumbs } from '../configRegistry';
import { Badge, Checkbox, DataTable, Dialog, ErrorBox, FormError, PageHead, Pager, Panel, Restricted, SelectInput, StateMessage, TextInput, useToast, DeleteAction } from '../ui/kit';
import { Changes, RecordLink } from './common';
import { dependencyWarnings, filterPermissionRows, permissionTree, selectionState, isGranted, missingDependencies, permissionChanges, permissionRows, sensitive, setPermissions,
  type AccessSelection, type PermissionDefinition, type PermissionFilters, type PermissionRow, type PermissionTreeNode } from './adminRightsModel';
import { RoleAccessMatrix } from './RoleAccessMatrix';
import { userAccessSettings, type UserScope } from './userAccessSettings';
import { UserScopeEditor, type UserScopeSelection } from './UserScopeEditor';
import './admin-rights.css';

function AdminOnly({ children }: { children: React.ReactNode }) {
  const me = useMe().data!;
  if (!me.isAdministrator) return <Restricted need="This page needs the Administration right." />;
  return <>{children}</>;
}

type Scope = UserScope;
type UserRow = { id: number; accountName: string; displayName: string; email?: string; workingTimeZone: string; isActive: boolean; deactivatedAt?: string; deactivationReason?: string; lastSignInAt?: string; mappedGroups?: string; mappedGroupsAvailable: boolean; roles: string[]; roleIds?: number[]; roleId?: number; roleName?: string; allClients: boolean; allInternal: boolean; grants: string[]; scopes: Scope[]; version: string };
type Targets = { clients: { id: number; code: string; name: string; archived: boolean }[]; projects: { id: number; code: string; name: string; clientId: number }[]; teams: { id: number; code: string; name: string }[] };

// A31: configurable roles and rights (Administration → Roles, Rights).
type RightDef = { key: string; label: string; description: string };
type PermissionDef = PermissionDefinition;
type RoleDef = { id: number; name: string; description?: string; key?: string; isLocked: boolean; isActive: boolean; rights: string[]; permissions: string[]; userCount: number; version: string };
const useRoles = () => useQuery({ queryKey: ['admin-roles'], queryFn: () => get<{ rights: RightDef[]; permissions: PermissionDef[]; roles: RoleDef[] }>('/admin/roles') });

type SignInState = { userId: number; state: 'Active' | 'TemporaryPassword' | 'Locked'; lockedUntil?: string; changedAt: string };

export function AdminUsers() {
  const canCreate = usePermission('AdminUsers', 'Create');
  const canMaintain = usePermission('AdminUsers', 'Maintain');
  const canDelete = usePermission('AdminUsers', 'Delete');
  const me = useMe().data!;
  const forms = me.app.authMode.toLowerCase() === 'forms';
  const q = useQuery({ queryKey: ['admin-users'], queryFn: () => get<UserRow[]>('/admin/users') });
  const signIn = useQuery({ queryKey: ['admin-users', 'sign-in'], queryFn: () => get<SignInState[]>('/admin/users/sign-in-status'), enabled: forms });
  const [pw, setPw] = useState<{ id: number; name: string; account: string; first: boolean } | null>(null);
  const stateOf = (id: number) => signIn.data?.find(s => s.userId === id);
  const targets = useQuery({ queryKey: ['scope-targets'], queryFn: () => get<Targets>('/admin/scope-targets') });
  const [edit, setEdit] = useState<UserRow | 'new' | null>(null);
  const [deact, setDeact] = useState<UserRow | null>(null);
  const [remove, setRemove] = useState<UserRow | null>(null);
  return (
    <AdminOnly>
      <PageHead title="Users and access" sub="Assign active roles and inspect effective access. Configure their grants on Rights and permissions."
        actions={canCreate && <button className="btn btn-primary" onClick={() => setEdit('new')}>+ New User</button>} />
      <DataTable<UserRow> rowKey={u => u.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 'n', header: 'Name', render: u => <button disabled={!canMaintain} className="linkbtn" onClick={() => setEdit(u)}>{u.displayName}</button> }, { key: 'a', header: 'Account', render: u => <span className="mono">{u.accountName}</span> },
        { key: 'r', header: 'Role', render: u => u.roleName ? <span className="chip">{u.roleName}</span> : <Badge tone="warn">No role — check direct permissions</Badge> },
        { key: 'm', header: 'Mapped groups', render: (u: UserRow) => u.mappedGroupsAvailable ? (u.mappedGroups || 'None') : <span title="An authenticated sign-in must refresh the directory group snapshot.">Unavailable — refresh required</span> },
        { key: 'st', header: 'Status', render: u => u.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge> },
        ...(forms ? [{ key: 'pw', header: 'Password', render: (u: UserRow) => {
          const st = stateOf(u.id);
          return !st ? <Badge tone="warn">Not set</Badge> : st.state === 'Locked' ? <Badge tone="bad">Locked until {fmtDateTime(st.lockedUntil)}</Badge>
            : st.state === 'TemporaryPassword' ? <Badge tone="info">Temporary</Badge> : <Badge tone="good">Set</Badge>;
        } }] : []),
        { key: 'l', header: 'Last sign-in', render: u => fmtDateTime(u.lastSignInAt) },
        { key: 'x', header: '', render: u => <span className="nowrap">
          {canMaintain && forms && u.id !== me.id && u.isActive && <button className="linkbtn" style={{ marginRight: 10 }} onClick={() => setPw({ id: u.id, name: u.displayName, account: u.accountName, first: !stateOf(u.id) })}>Password options</button>}
          <button disabled={!canMaintain} className="linkbtn" onClick={() => setDeact(u)}>{u.isActive ? 'Deactivate' : 'Reactivate'}</button>
          {canDelete && u.id !== me.id && <> · <button className="linkbtn danger-link" onClick={() => setRemove(u)}>Delete</button></>}
        </span> }
      ]} />
      {edit && targets.data && <UserDialog user={edit === 'new' ? null : edit} targets={targets.data} onClose={() => setEdit(null)}
        onCreated={forms ? (u => setPw({ ...u, first: true })) : undefined} />}
      {pw && <PasswordDialog user={pw} onClose={() => setPw(null)} />}
      {remove && <DeleteUserDialog user={remove} onClose={() => setRemove(null)} />}
      {deact && <ActionDialog title={deact.isActive ? `Deactivate ${deact.displayName}` : `Reactivate ${deact.displayName}`} danger={deact.isActive} path={`/admin/users/${deact.id}/${deact.isActive ? 'deactivate' : 'reactivate'}`} version={deact.version}
        intro={deact.isActive ? 'History and identity are kept. Their active records appear in the reassignment queue; nothing is reassigned automatically. Active sessions lose access immediately.' : undefined}
        fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} submitLabel={deact.isActive ? 'Deactivate' : 'Reactivate'} onClose={() => setDeact(null)} />}
    </AdminOnly>
  );
}

function DeleteUserDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const f = useForm({ reason: '' });
  const toast = useToast();
  const refresh = useRefresh();
  const remove = async () => {
    const ok = await f.submit(async v => {
      await del(`/admin/users/${user.id}`, user.version, { reason: v.reason });
      return true;
    });
    if (ok) { toast('User deleted.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={`Delete ${user.displayName}`} onClose={onClose}>
      <p>The account and its sign-in details will be deleted. The account cannot be deleted while retained records or audit history refer to it; deactivate it to preserve that history.</p>
      <FormError error={f.error} fields={['reason']} />
      <TextInput label="Reason" required multiline value={f.values.reason} onChange={v => f.set('reason', v)} error={f.fieldError('reason')} maxLength={500} />
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-danger" disabled={f.busy || !f.values.reason.trim()} onClick={remove}>Delete user</button></div>
    </Dialog>
  );
}

/** TIO Manager issues a temporary password (forms sign-in). The user must replace it at the next sign-in; existing sessions end. */
function PasswordDialog({ user, onClose }: { user: { id: number; name: string; account: string; first: boolean }; onClose: () => void }) {
  const f = useForm({ temporaryPassword: '' });
  const toast = useToast();
  const refresh = useRefresh();
  const availability = useQuery({ queryKey: ['password-reset-availability', user.id], queryFn: () => get<{ available: boolean; reason?: string | null }>(`/admin/users/${user.id}/password-reset-availability`), retry: false, refetchOnMount: 'always' });
  const available = !availability.isFetching && !availability.error && availability.data?.available === true;
  const generate = () => {
    // Random blocks from a CSPRNG: readable to pass on, long enough for the policy.
    const a = new Uint32Array(4);
    crypto.getRandomValues(a);
    f.set('temporaryPassword', Array.from(a, n => n.toString(36).padStart(7, '0').slice(0, 5)).join('-'));
  };
  const save = async () => {
    const ok = await f.submit(v => post(`/admin/users/${user.id}/password`, v).then(() => true));
    if (ok) { toast('Temporary password saved. Give it to the person through a separate, trusted channel.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={`${user.first ? 'Set' : 'Reset'} password for ${user.name}`} onClose={onClose}>
      {availability.isFetching ? <StateMessage kind="loading" /> : availability.error ? <StateMessage kind="error">Password options could not be checked. Close this dialog and try again.</StateMessage> : !availability.data?.available ? <StateMessage kind="restricted">{availability.data?.reason || 'Password reset is unavailable for this account.'}</StateMessage> : <>
        <p className="hint" style={{ marginTop: 0 }}>Account <span className="mono">{user.account}</span>. The person must choose their own password at the next sign-in. {user.first ? '' : 'Their current sessions end and a lock is cleared.'}</p>
        <FormError error={f.error} />
        <div className="form-grid">
          <TextInput label="Temporary password" required wide value={f.values.temporaryPassword} onChange={v => f.set('temporaryPassword', v)} error={f.fieldError('temporaryPassword')}
            hint="At least 12 characters, not containing the account name. It is shown only here; the hub stores only a hash." />
        </div>
      </>}
      <div className="form-actions">{available && <button className="btn" onClick={generate}>Generate</button>}<span style={{ flex: 1 }} /><button className="btn" onClick={onClose}>Cancel</button>{available && <button className="btn btn-primary" disabled={f.busy || !f.values.temporaryPassword} onClick={save}>Save password</button>}</div>
    </Dialog>
  );
}

function UserDialog({ user, targets, onClose, onCreated }: { user: UserRow | null; targets: Targets; onClose: () => void; onCreated?: (u: { id: number; name: string; account: string }) => void }) {
  const me = useMe().data!;
  const forms = me.app.authMode.toLowerCase() === 'forms';
  // A44: a new user starts in the configured default time zone, or this computer's when the default is still the shipped UTC.
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: () => get<{ key: string; value: string }[]>('/admin/settings') });
  const configured = settings.data?.find(s => s.key === 'DefaultTimeZone')?.value;
  const defaultZone = configured && configured !== 'UTC' ? configured : computerZone();
  const f = useForm({
    accountName: user?.accountName ?? '', displayName: user?.displayName ?? '', email: user?.email ?? '', workingTimeZone: user?.workingTimeZone ?? defaultZone,
    roleIds: user?.roleIds?.map(String) ?? (user?.roleId ? [String(user.roleId)] : [])
  });
  const [scope, setScope] = useState<UserScopeSelection>(() => ({ allClients: user?.allClients ?? false, allInternal: user?.allInternal ?? false, scopes: user?.scopes ?? [] }));
  const roles = useRoles();
  const access = useQuery({ queryKey: ['admin-user-access', user?.id], queryFn: () => get<{
    effectivePermissions: { key: string; displayName: string; module: string; riskLevel: string; sources: string[] }[];
    restrictedPermissions: { key: string; displayName: string; module: string }[];
    scopes: { allClients: boolean; clientIds: number[]; projectIds: number[]; allInternal: boolean; teamIds: number[] } | null;
  }>(`/admin/users/${user!.id}/access`), enabled: !!user });
  const toast = useToast();
  const refresh = useRefresh();
  const self = user?.id === me.id;
  const save = async () => {
    const v = f.values;
    const body = { accountName: v.accountName, displayName: v.displayName, email: v.email, workingTimeZone: v.workingTimeZone, roleIds: v.roleIds.map(Number), roles: [],
      ...userAccessSettings(user), ...scope };
    const res = await f.submit(() => (user ? put(`/admin/users/${user.id}`, body, user.version).then(() => ({ id: user.id })) : post<{ id: number }>('/admin/users', body)));
    if (res) {
      toast('User saved; changes apply to active sessions at once.'); refresh(); onClose();
      if (!user && onCreated && res.id) onCreated({ id: res.id, name: v.displayName, account: v.accountName });
    }
  };
  return (
    <Dialog title={user ? `User ${user.displayName}` : 'New user'} onClose={onClose}>
      {self && <div className="notice warn">You cannot change your own role.</div>}
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label={forms ? 'Account name (used to sign in)' : 'Organization account (DOMAIN\name)'} required value={f.values.accountName} onChange={v => f.set('accountName', v)} disabled={!!user} error={f.fieldError('accountName')} />
        <TextInput label="Display name" required value={f.values.displayName} onChange={v => f.set('displayName', v)} error={f.fieldError('displayName')} />
        <TextInput label="Email" value={f.values.email} onChange={v => f.set('email', v)} />
        <TimeZoneSelect label="Working time zone" required value={f.values.workingTimeZone} onChange={v => f.set('workingTimeZone', v)} error={f.fieldError('workingTimeZone')} />
        <fieldset className="field wide" disabled={self}>
          <legend>Roles</legend>
          <div className="hint">Permissions from active roles combine. Data scope and operation permissions are checked separately.</div>
          {(roles.data?.roles ?? []).map(r => <label key={r.id} className="check-row">
            <input type="checkbox" checked={f.values.roleIds.includes(String(r.id))}
              onChange={e => f.set('roleIds', e.target.checked ? [...f.values.roleIds, String(r.id)] : f.values.roleIds.filter(id => id !== String(r.id)))} />
            <span>{r.name}{r.description ? <small className="hint"> — {r.description}</small> : null}</span>
          </label>)}
          {f.fieldError('roleIds') && <div className="field-error">{f.fieldError('roleIds')}</div>}
        </fieldset>
      </div>
      <UserScopeEditor value={scope} targets={targets} onChange={setScope} disabled={self} />
      {f.fieldError('scopes') && <div className="field-error">{f.fieldError('scopes')}</div>}
      {user && <section className="form-section">
        <h3>Effective access</h3>
        {access.isLoading ? <StateMessage kind="loading" /> : access.error ? <ErrorBox error={access.error} /> : <>
          <p className="hint">This shows saved access; unsaved role changes are not included. Individual operations may have additional restrictions.</p>
          <p>{access.data?.effectivePermissions.length ?? 0} effective permissions from roles and user exceptions.</p>
          {access.data?.scopes && <p>Effective scope: {access.data.scopes.allClients ? 'all clients' : `${access.data.scopes.clientIds.length} clients and ${access.data.scopes.projectIds.length} projects`}; {access.data.scopes.allInternal ? 'all internal teams' : `${access.data.scopes.teamIds.length} internal teams`}.</p>}
          <details><summary>Show effective permissions</summary><ul>{access.data?.effectivePermissions.map(p => <li key={p.key}>
            <strong>{p.displayName}</strong> <code>{p.key}</code> <span className="hint">from {p.sources.join(', ') || 'no active role source'}</span>
          </li>)}</ul></details>
          <details><summary>Show restricted permissions</summary><ul>{access.data?.restrictedPermissions.map(p => <li key={p.key}>{p.displayName} <code>{p.key}</code></li>)}</ul></details>
        </>}
      </section>}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy || self} onClick={save}>Save user</button></div>
    </Dialog>
  );
}

type Mapping = { id: number; groupName: string; role?: string; allClients: boolean; allInternal: boolean; grants: string[]; scopes: Scope[]; version: string };

export function AdminGroups() {
  const canCreate = usePermission('AdminGroups', 'Create');
  const q = useQuery({ queryKey: ['mappings'], queryFn: () => get<Mapping[]>('/admin/group-mappings') });
  const [open, setOpen] = useState(false);
  return (
    <AdminOnly>
      <PageHead title="Organization group mappings" sub="Members of a mapped group are admitted at sign-in with these roles, scopes and grants." actions={canCreate && <button className="btn btn-primary" onClick={() => setOpen(true)}>+ New Mapping</button>} />
      <DataTable<Mapping> rowKey={m => m.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 'g', header: 'Group', render: m => <span className="mono">{m.groupName}</span> }, { key: 'r', header: 'Role', render: m => m.role ? label(m.role) : '—' },
        { key: 's', header: 'Scope', render: m => [m.allClients && 'All clients', m.allInternal && 'All internal', m.scopes.length && `${m.scopes.length} scope(s)`].filter(Boolean).join(', ') || 'None' },
        { key: 'gr', header: 'Grants', render: m => m.grants.join(', ') }
      ]} />
      {open && <ActionDialog title="New group mapping" path="/admin/group-mappings" onClose={() => setOpen(false)} submitLabel="Create"
        fields={[{ name: 'groupName', label: 'Group (DOMAIN\\Group)', required: true }, { name: 'role', label: 'Role', kind: 'select', options: [{ value: 'Engineer', label: 'Operation Engineer (built-in)' }, { value: 'Manager', label: 'TIO Manager (built-in)' }] },
          { name: 'allClients', label: 'All clients (yes/no)', kind: 'select', options: [{ value: 'yes', label: 'Yes' }] }, { name: 'export', label: 'Export grant', kind: 'select', options: [{ value: 'yes', label: 'Yes' }] }]}
        transform={v => ({ groupName: v.groupName, role: v.role || null, allClients: v.allClients === 'yes', allInternal: false, export: v.export === 'yes', technicalDetail: false, audit: false, scopes: [] })} />}
    </AdminOnly>
  );
}

type LookupRow = { id: number; listName: string; code: string; label: string; description?: string; sortOrder: number; isRetired: boolean; version: string };

/** A31: Administration → Roles &amp; rights. Rows are rights, columns are roles. */
/** A40 (owner request, 20 Oct 2026): roles and rights on separate pages. Roles: who exists and who holds them. */
export function AdminRoles() {
  const canCreate = usePermission('AdminRoles', 'Create');
  const canMaintain = usePermission('AdminRoles', 'Maintain');
  const canDelete = usePermission('AdminRoles', 'Delete');
  const q = useRoles();
  const [edit, setEdit] = useState<RoleDef | 'new' | null>(null);
  const [clone, setClone] = useState<RoleDef | null>(null);
  const [remove, setRemove] = useState<RoleDef | null>(null);
  const toast = useToast();
  const refresh = useRefresh();
  const d = q.data;
  return (
    <AdminOnly>
      <PageHead title="Roles" sub="Users may hold multiple roles. Their grants combine; what each role may do is set on the Rights page."
        actions={<><Link className="btn" to="/admin/rights">Edit rights</Link><button disabled={!canCreate} className="btn btn-primary" onClick={() => setEdit('new')}>+ New role</button></>} />
      {d && <RoleAccessMatrix roles={d.roles} rights={d.rights} definitions={d.permissions} editable={canMaintain} />}
      <DataTable<RoleDef> caption="Roles" rowKey={r => r.id} rows={d?.roles} loading={q.isLoading} error={q.error} columns={[
        { key: 'n', header: 'Role', priority: 'primary', render: r => <><button disabled={!canMaintain} className="linkbtn" onClick={() => setEdit(r)}><b>{r.name}</b></button>{r.key && <span className="chip"> built-in</span>} {!r.isActive && <Badge tone="warn">Inactive</Badge>}</> },
        { key: 'd', header: 'Description', maxWidth: '18rem', render: r => r.description ?? <span className="muted">—</span> },
        { key: 'u', header: 'Users', className: 'num', render: r => r.userCount },
        // GUI-11: a count with the full list on request, so a long list of rights never widens the table past its actions.
        { key: 'r', header: 'Rights', priority: 'primary', maxWidth: '18rem', render: r => r.isLocked ? <Badge tone="good">All rights</Badge> : r.rights.length + r.permissions.length === 0 ? <span className="muted">No permissions</span>
          : <RightsSummary role={r.name} items={[...r.rights.map(k => d?.rights.find(x => x.key === k)?.label ?? k), ...r.permissions.map(k => {
            const p = d?.permissions.find(x => x.key === k); return p ? `${p.resourceLabel}: ${p.actionLabel}` : k;
          })]} /> },
        { key: 'a', header: '', className: 'row-actions nowrap', render: r => <><button disabled={!canMaintain} className="linkbtn" onClick={() => setEdit(r)} aria-label={`Edit role ${r.name}`}>Edit</button> <button disabled={!canCreate} className="linkbtn" onClick={() => setClone(r)} aria-label={`Clone role ${r.name}`}>Clone</button>{canDelete && !r.key && <> <button className="linkbtn danger-link" onClick={() => setRemove(r)} aria-label={`Delete role ${r.name}`}>Delete</button></>}</> }
      ]} />
      {edit && d && <RoleDialog role={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {clone && <RoleCloneDialog role={clone} onClose={() => setClone(null)} />}
      {remove && <Dialog title={`Delete role ${remove.name}`} onClose={() => setRemove(null)}>
        <p>{remove.userCount > 0 ? `${remove.userCount} user(s) hold this role. Give them another role first.` : 'Nobody holds this role. Delete it?'}</p>
        <div className="form-actions"><button className="btn" onClick={() => setRemove(null)}>Cancel</button>
          <button className="btn btn-danger" disabled={remove.userCount > 0} onClick={async () => {
            try { await del(`/admin/roles/${remove.id}`, remove.version); toast('Role deleted.'); refresh(); setRemove(null); } catch (e) { toast((e as Error).message); }
          }}>Delete role</button></div>
      </Dialog>}
    </AdminOnly>
  );
}

function RoleCloneDialog({ role, onClose }: { role: RoleDef; onClose: () => void }) {
  const f = useForm({ name: `${role.name} copy`, description: role.description ?? '' });
  const toast = useToast();
  const refresh = useRefresh();
  const nav = useNavigate();
  const save = async () => {
    const result = await f.submit(v => post<{ id: number }>(`/admin/roles/${role.id}/clone`, {
      name: v.name, description: v.description, rights: [], permissions: []
    }));
    if (result) { toast('Role cloned. Review its rights before assigning it to users.'); refresh(); onClose(); nav('/admin/rights'); }
  };
  return <Dialog title={`Clone ${role.name}`} onClose={onClose}>
    <FormError error={f.error} fields={['name', 'description', 'permissions', 'rights']} />
    <div className="form-grid">
      <TextInput label="New role name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} />
      <TextInput label="Description" value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} />
    </div>
    <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Clone role</button></div>
  </Dialog>;
}

/** The rights of a role as a count that opens the full list (keyboard: the summary is a button). Filter and export read the full list. */
function RightsSummary({ role, items }: { role: string; items: string[] }) {
  return (
    <details className="rights-summary" data-text={items.join(', ')}>
      <summary aria-label={`${items.length} right${items.length === 1 ? '' : 's'} of ${role}: show the list`}>{items.length} right{items.length === 1 ? '' : 's'}</summary>
      <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
    </details>
  );
}

/** Registry editor. Groups organize independent leaves; edits are staged until reviewed and saved. */
export function AdminRights() {
  const q = useRoles();
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState(searchParams.get('role') ?? '');
  const [dirty, setDirty] = useState(false);
  const d = q.data;
  const role = d?.roles.find(r => String(r.id) === selected) ?? d?.roles.find(r => !r.isLocked) ?? d?.roles[0];
  const selectRole = (id: string) => {
    if (dirty && !window.confirm('Discard the unsaved permission changes before selecting another role?')) return;
    setDirty(false); setSelected(id);
  };
  return <AdminOnly>
    <PageHead title="Rights and permissions" sub="Configure independent page, resource and action permissions. Review changes before saving."
      actions={<Link className="btn" to="/admin/roles">Manage roles</Link>} />
    {q.error && <ErrorBox error={q.error} />}
    {!d ? !q.error && <StateMessage kind="loading" /> : !role ? <StateMessage kind="none">Create a role before assigning permissions.</StateMessage>
      : <RolePermissionsEditor key={role.id} role={role} roles={d.roles} definitions={d.permissions} rights={d.rights}
        initialSearch={searchParams.get('permission') ?? ''}
        onRoleChange={selectRole} onDirty={setDirty} reload={async () => (await q.refetch()).data?.roles.find(r => r.id === role.id)} />}
  </AdminOnly>;
}

function RolePermissionsEditor({ role, roles, definitions, rights, initialSearch, onRoleChange, onDirty, reload }: {
  role: RoleDef; roles: RoleDef[]; definitions: PermissionDef[]; rights: RightDef[];
  initialSearch: string; onRoleChange: (id: string) => void; onDirty: (dirty: boolean) => void; reload: () => Promise<RoleDef | undefined>;
}) {
  const toast = useToast();
  const refresh = useRefresh();
  const [base, setBase] = useState(role);
  const [compareId, setCompareId] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>(definitions.filter(d => d.nodeType === 'Submodule' || d.nodeType === 'Tab').map(d => `permissions/${d.key}`));
  const emptyFilters = { search: '', module: '', resource: '', action: '', risk: '', assignment: '' };
  const [filters, setFilters] = useState<PermissionFilters>({ ...emptyFilters, search: initialSearch });
  useEffect(() => { if (filters.search || filters.module || filters.resource || filters.action) setCollapsed([]); }, [filters.search, filters.module, filters.resource, filters.action]);
  const [groupChange, setGroupChange] = useState<{ label: string; rows: PermissionRow[]; grant: boolean } | null>(null);
  const [review, setReview] = useState(false);
  const f = useForm<AccessSelection>({ rights: [...role.rights].sort(), permissions: [...role.permissions].sort() });
  useLeaveGuard(f.dirty);
  useEffect(() => { onDirty(f.dirty); }, [f.dirty, onDirty]);
  const stale = base.version !== role.version;
  const rows = useMemo(() => permissionRows(rights, definitions), [rights, definitions]);
  const compare = roles.find(r => String(r.id) === compareId);
  const visible = filterPermissionRows(rows, filters, f.values, base, compare);
  const tree = permissionTree(rows, visible);
  const fullGroups = new Map<string, PermissionRow[]>();
  const indexGroups = (nodes: PermissionTreeNode[]) => nodes.forEach(node => { fullGroups.set(node.row.id, node.shown); indexGroups(node.children); });
  indexGroups(permissionTree(rows, rows));
  const changes = permissionChanges(base, f.values, rows);
  const warnings = dependencyWarnings(rows, f.values);
  const canMaintain = usePermission('AdminRoles', 'Maintain');
  const disabled = base.isLocked || f.busy || !canMaintain;
  const options = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  const updateFilter = (key: keyof PermissionFilters, value: string) => setFilters(p => ({ ...p, [key]: value }));
  const collapse = (key: string) => setCollapsed(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  const reset = (latest: RoleDef) => {
    setBase(latest); f.reset({ rights: [...latest.rights].sort(), permissions: [...latest.permissions].sort() }); setReview(false);
  };
  const reloadLatest = async () => {
    if (f.dirty && !window.confirm('Discard the staged changes and reload the latest saved permissions?')) return;
    const latest = await reload(); if (latest) reset(latest);
  };
  const save = async () => {
    const ok = await f.submit(async values => {
      await put(`/admin/roles/${base.id}`, { name: base.name, description: base.description ?? null, isActive: base.isActive, ...values }, base.version);
      return true;
    });
    if (ok) {
      setReview(false); onDirty(false); toast(`Permissions saved for ${base.name}.`);
      const latest = await reload(); if (latest) reset(latest);
      await refresh();
    } else setReview(false);
  };
  const groupButtons = (name: string, groupRows: PermissionRow[]) => <div className="rights-group-actions">
    <span>{groupRows.filter(r => isGranted(f.values, r)).length} / {groupRows.length} assigned</span>
    <button className="linkbtn" disabled={disabled || !groupRows.some(r => r.active && !isGranted(f.values, r))}
      aria-label={`Grant shown permissions in ${name}`} onClick={() => setGroupChange({ label: name, rows: groupRows.filter(r => r.active), grant: true })}>Grant shown</button>
    <button className="linkbtn danger-link" disabled={disabled || !groupRows.some(r => isGranted(f.values, r))}
      aria-label={`Revoke shown permissions in ${name}`} onClick={() => setGroupChange({ label: name, rows: groupRows, grant: false })}>Revoke shown</button>
  </div>;
  const decision = (selection: AccessSelection, active: boolean, row: PermissionRow) => !active ? 'Inactive role' : !row.active ? 'Deprecated'
    : !isGranted(selection, row) ? 'Not granted' : missingDependencies(row, rows, selection).length ? 'Blocked by required access' : 'Granted';
  const renderNode = (node: PermissionTreeNode): React.ReactNode => {
    const row = node.row;
    const changed = isGranted(base, row) !== isGranted(f.values, row);
    const branch = row.nodeType !== 'Action';
    const open = !collapsed.includes(row.id);
    const state = selectionState(fullGroups.get(row.id) ?? node.shown, f.values);
    return <section key={row.id} className={`rights-node rights-level-${row.nodeType.toLowerCase()}`}>
      <div className={`rights-leaf${compare ? ' compare' : ''}${changed ? ' changed' : ''}`}>
        <div>
          <div className="rights-node-title">
            {branch && <button type="button" className="linkbtn" aria-label={`${open ? 'Collapse' : 'Expand'} ${row.label}`} aria-expanded={open} onClick={() => collapse(row.id)}>{open ? '▾' : '▸'}</button>}
            <label><input type="checkbox" checked={isGranted(f.values, row)} disabled={disabled || !row.active && !isGranted(f.values, row)}
              aria-label={`${branch ? `${row.nodeType} ` : ''}${row.label} for ${base.name}`} onChange={e => f.setValues(p => setPermissions(p, [row], e.target.checked))} />
              <span className="rights-permission-title">{row.label}<Badge>{row.kind === 'rights' ? 'Control' : row.nodeType}</Badge>{sensitive(row) && <Badge tone="warn">{row.risk}</Badge>}{!row.active && <Badge>Deprecated</Badge>}{changed && <Badge tone="info">Staged</Badge>}</span></label>
          </div>
          <code className="rights-permission-key">{row.key}</code><p className="hint">{row.description}{row.supportsScope ? ' User record scope applies.' : ''}</p>
          {branch && <div className="rights-node-bulk"><input type="checkbox" readOnly disabled checked={state === 'all'} ref={el => { if (el) el.indeterminate = state === 'partial'; }} aria-label={`${row.label} descendant selection: ${state}`} />
            <span>{state === 'partial' ? 'Partially assigned' : state === 'all' ? 'All assigned' : 'None assigned'}</span>{groupButtons(row.label, node.shown)}</div>}
          {row.requires.length > 0 && <details><summary className="hint">Required access</summary><code>{row.requires.join(', ')}</code></details>}
        </div>
        <div className="rights-decision"><strong>{decision(f.values, base.isActive, row)}</strong><small>{base.name}</small></div>
        {compare && <div className="rights-decision"><strong>{decision(compare, compare.isActive, row)}</strong><small>{compare.name}</small></div>}
      </div>
      {branch && open && <div className="rights-children">{node.children.map(renderNode)}</div>}
    </section>;
  };
  return <div className="rights-workspace">
    <Panel title="Configure role access" actions={<Link className="btn" to="/admin/audit?category=Access">Authorization history</Link>}>
      <div className="rights-controls">
        <label>Role to configure<select value={role.id} disabled={f.busy} onChange={e => onRoleChange(e.target.value)}>{roles.map(r => <option value={r.id} key={r.id}>{r.name}{r.isLocked ? ' · protected' : ''}{!r.isActive ? ' · inactive' : ''}</option>)}</select></label>
        <label>Compare with role<select value={compareId} onChange={e => { setCompareId(e.target.value); if (!e.target.value && filters.assignment === 'different') updateFilter('assignment', ''); }}>
          <option value="">No comparison</option>{roles.filter(r => r.id !== role.id).map(r => <option value={r.id} key={r.id}>{r.name}{!r.isActive ? ' · inactive' : ''}</option>)}
        </select></label>
      </div>
      <div className="rights-summary"><Badge tone={base.isActive ? 'good' : 'warn'}>{base.isActive ? 'Active role' : 'Inactive role'}</Badge>
        <span>{base.userCount} active assigned user{base.userCount === 1 ? '' : 's'}</span><span>{rows.filter(r => r.active && isGranted(f.values, r)).length} active permissions assigned</span>
        {base.isLocked && <Badge tone="info">Protected system role</Badge>}
      </div>
      {base.description && <p className="hint">{base.description}</p>}
      <p className="hint">These are direct role assignments. Unassigned permissions are denied. Users combine permissions from active roles; record scope and security boundaries also apply. Enabling parent access grants only that parent. Revoking it blocks all descendants while retaining their assignments for future re-enablement. Use Grant shown or Revoke shown for explicit bulk changes.</p>
      {!base.isActive && <div className="notice warn">This role is inactive. Its retained assignments contribute no effective access until activation.</div>}
      {base.isLocked && <div className="notice">The protected system role keeps all permissions. Clone it under Manage roles to configure a custom role.</div>}
      <div className="rights-controls rights-filters">
        <label>Search permissions<input type="search" placeholder="Name, key or description" value={filters.search} onChange={e => updateFilter('search', e.target.value)} /></label>
        <label>Module<select value={filters.module} onChange={e => updateFilter('module', e.target.value)}><option value="">All modules</option>{options(rows.map(r => r.module)).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Resource<select value={filters.resource} onChange={e => updateFilter('resource', e.target.value)}><option value="">All resources</option>{options(rows.map(r => r.resource)).map(x => <option key={x} value={x}>{rows.find(r => r.resource === x)?.resourceLabel ?? x}</option>)}</select></label>
        <label>Action<select value={filters.action} onChange={e => updateFilter('action', e.target.value)}><option value="">All actions</option>{options(rows.map(r => r.action)).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Sensitivity<select value={filters.risk} onChange={e => updateFilter('risk', e.target.value)}><option value="">All sensitivity levels</option>{options(rows.map(r => r.risk)).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Assignment<select value={filters.assignment} onChange={e => updateFilter('assignment', e.target.value)}><option value="">All permissions</option><option value="granted">Assigned</option><option value="denied">Not assigned</option><option value="changed">Staged changes</option>{compare && <option value="different">Different from comparison</option>}</select></label>
      </div>
    </Panel>
    <FormError error={f.error} fields={[]} />
    {(stale || f.error?.isConflict) && <div className="notice warn" role="alert">This role has changed since editing started. Your draft is retained. <button className="linkbtn" onClick={reloadLatest}>Reload latest</button></div>}
    {warnings.length > 0 && <div className="notice warn"><details><summary>{warnings.length} permission assignment{warnings.length === 1 ? '' : 's'} with missing dependencies</summary>
      <p>Actions do not automatically grant their required permissions. Review the independent dependencies.</p><ul>{warnings.map(r => <li key={r.id}>{r.label}: requires <code>{missingDependencies(r, rows, f.values).join(', ')}</code></li>)}</ul>
    </details></div>}
    <div className="rights-toolbar"><span role="status">Showing {visible.length} of {rows.length} permissions</span><div>
      <button className="btn" onClick={() => setCollapsed([])}>Expand all</button>
      <button className="btn" onClick={() => setCollapsed(rows.filter(r => r.nodeType !== 'Action').map(r => r.id))}>Collapse all</button>
      <button className="btn" onClick={() => setFilters(emptyFilters)}>Clear filters</button>
    </div></div>
    {compare && <div className="rights-compare-legend"><strong>Left: {base.name} (includes staged changes)</strong><strong>Right: {compare.name} (saved permissions, read only)</strong></div>}
    {visible.length === 0 ? <StateMessage kind="nomatch" /> : <div className="rights-tree" aria-label="Permission registry">
      {tree.map(node => renderNode(node))}
    </div>}
    <div className="rights-savebar rights-toolbar"><p aria-live="polite"><strong>{changes.grants.length + changes.revocations.length} staged changes</strong> · {changes.grants.length} grant{changes.grants.length === 1 ? '' : 's'}, {changes.revocations.length} revocation{changes.revocations.length === 1 ? '' : 's'}</p><div>
      <button className="btn" disabled={!f.dirty || f.busy} onClick={() => { if (window.confirm('Discard the staged permission changes?')) reset(base); }}>Discard changes</button>
      <button className="btn btn-primary" disabled={!f.dirty || disabled || stale} onClick={() => setReview(true)}>Review and save</button>
    </div></div>
    {groupChange && <Dialog title={groupChange.grant ? 'Grant permission group' : 'Revoke permission group'} onClose={() => setGroupChange(null)}>
      <p>{groupChange.grant ? 'Stage explicit grants' : 'Stage revocations'} for {groupChange.rows.length} shown permissions in <strong>{groupChange.label}</strong>?</p>
      <p>Only the permissions listed below are included. The changes take effect after Review and save.</p>
      {groupChange.grant && groupChange.rows.some(sensitive) && <div className="notice warn">This selection includes sensitive permissions. Review each grant.</div>}
      <ul className="rights-preview">{groupChange.rows.map(r => <li key={r.id}>{r.label} <code>{r.key}</code></li>)}</ul>
      <div className="form-actions"><button className="btn" onClick={() => setGroupChange(null)}>Cancel</button><button className="btn btn-primary" onClick={() => {
        f.setValues(p => setPermissions(p, groupChange.rows, groupChange.grant)); setGroupChange(null);
      }}>Stage group change</button></div>
    </Dialog>}
    {review && <Dialog title="Review permission changes" onClose={() => { if (!f.busy) setReview(false); }}>
      <p>Save {changes.grants.length} grants and {changes.revocations.length} revocations for <strong>{base.name}</strong>?</p>
      <p>{base.userCount} active directly assigned users may be affected. Other active roles can still grant a revoked permission. Directory group members may also be affected.</p>
      {changes.grants.some(sensitive) && <div className="notice warn">Sensitive permissions will be granted. Saving confirms that you reviewed these grants.</div>}
      <ul className="rights-preview">{changes.grants.map(r => <li key={r.id}><Badge tone="good">Grant</Badge> {r.label} <code>{r.key}</code></li>)}
        {changes.revocations.map(r => <li key={r.id}><Badge tone="warn">Revoke</Badge> {r.label} <code>{r.key}</code></li>)}</ul>
      <p className="hint">The server validates grant authority and saves this role's changes together. Effective access is resolved again by the server on subsequent requests.</p>
      <div className="form-actions"><button className="btn" disabled={f.busy} onClick={() => setReview(false)}>Back to editor</button><button className="btn btn-primary" disabled={f.busy || stale} onClick={save}>{f.busy ? 'Saving…' : 'Save permissions'}</button></div>
    </Dialog>}
  </div>;
}

function RoleDialog({ role, onClose }: { role: RoleDef | null; onClose: () => void }) {
  const f = useForm({ name: role?.name ?? '', description: role?.description ?? '', isActive: role?.isActive ?? true });
  const toast = useToast();
  const refresh = useRefresh();
  const nav = useNavigate();
  const save = async () => {
    // New roles start with no grants; administrators explicitly configure access on Rights and permissions.
    const ok = await f.submit(async v => {
      const body = { ...v, rights: role?.rights ?? [], permissions: role?.permissions ?? [] };
      if (role) await put(`/admin/roles/${role.id}`, body, role.version); else await post('/admin/roles', body);
      return true;
    });
    if (ok) { toast(role ? 'Role saved.' : 'Role added. Set its rights on the Rights page.'); refresh(); onClose(); if (!role) nav('/admin/rights'); }
  };
  return (
    <Dialog title={role ? `Role ${role.name}` : 'New role'} onClose={onClose}>
      <FormError error={f.error} fields={['name', 'description', 'rights']} />
      <div className="form-grid">
        <TextInput label="Role name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} maxLength={60} />
        <TextInput label="Description" value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} maxLength={300} />
        {role && <Checkbox label="Role is active" checked={f.values.isActive} onChange={v => f.set('isActive', v)} disabled={role.isLocked}
          hint={role.isLocked ? 'The protected TIO Manager role cannot be deactivated.' : 'Inactive roles stop contributing permissions on the next access resolution.'} />}
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save role</button></div>
    </Dialog>
  );
}

/** Owner request (20 Oct 2026): network zones are managed by administrators on their own page. */
export function AdminNetworkZones() {
  return <AdminReference fixedList="NetworkZone" title="Network zones" sub="The zones offered on the server form. Add a zone here and it is available at once; retire a zone to stop offering it (servers keep their value)." />;
}

export function AdminReference({ fixedList, title = 'Reference lists', sub }: { fixedList?: string; title?: string; sub?: string } = {}) {
  const canCreate = usePermission('AdminConfig', 'Create');
  const canMaintain = usePermission('AdminConfig', 'Maintain');
  const q = useQuery({ queryKey: ['admin-lookups'], queryFn: () => get<LookupRow[]>('/admin/lookups') });
  const [picked, setList] = useState('');
  const list = fixedList ?? picked;
  const [edit, setEdit] = useState<LookupRow | 'new' | null>(null);
  const lists = [...new Set((q.data ?? []).map(l => l.listName))];
  const fixedWorkflow = list === 'ConditionLabel';
  return (
    <AdminOnly>
      <PageHead title={title} sub={sub ?? 'Retired values stay valid on existing records; codes are never renamed, so history keeps its meaning.'} actions={canCreate && !fixedWorkflow && <button className="btn btn-primary" onClick={() => setEdit('new')}>{fixedList ? '+ New zone' : '+ New Value'}</button>} />
      {!fixedList && <div className="toolbar"><SelectInput label="List" value={list} onChange={setList} options={lists.map(l => ({ value: l, label: label(l) }))} empty="All lists" /></div>}
      <DataTable<LookupRow> rowKey={l => l.id} rows={q.data?.filter(l => !list || l.listName === list)} loading={q.isLoading} error={q.error} columns={[
        { key: 'l', header: 'List', render: l => label(l.listName) }, { key: 'c', header: 'Code', render: l => <span className="mono">{l.code}</span> }, { key: 'b', header: 'Label', render: l => l.label },
        { key: 'd', header: 'Description', render: l => l.description }, { key: 's', header: 'Order', className: 'num', render: l => l.sortOrder },
        { key: 'r', header: 'Status', render: l => fixedWorkflow ? <Badge tone="good">Fixed workflow value</Badge> : l.isRetired ? <Badge>Retired</Badge> : <Badge tone="good">Active</Badge> }, { key: 'e', header: '', render: l => <button disabled={!canMaintain} className="linkbtn" onClick={() => setEdit(l)}>Edit</button> }, ...(!fixedWorkflow ? [{ key: 'del', header: '', className: 'row-actions', render: (l: LookupRow) => <DeleteAction path={`/admin/lookups/${l.id}`} what={`${l.label}`} /> }] : [])
      ]} />
      {edit === 'new' && (fixedWorkflow ? null : fixedList
        ? <ActionDialog title="New network zone" path="/admin/lookups" onClose={() => setEdit(null)} submitLabel="Add zone"
            fields={[{ name: 'label', label: 'Zone name', required: true }, { name: 'description', label: 'Description' }, { name: 'sortOrder', label: 'Sort order' }]}
            transform={v => ({ listName: fixedList, code: v.label.trim(), label: v.label, description: v.description, sortOrder: Number(v.sortOrder) || 100, isRetired: false })} />
        : <ActionDialog title="New reference value" path="/admin/lookups" onClose={() => setEdit(null)} submitLabel="Add"
            fields={[{ name: 'listName', label: 'List', kind: 'select', required: true, options: lists.map(l => ({ value: l, label: label(l) })) }, { name: 'code', label: 'Code', required: true }, { name: 'label', label: 'Label', required: true }, { name: 'description', label: 'Description' }, { name: 'sortOrder', label: 'Sort order' }]}
            transform={v => ({ ...v, sortOrder: Number(v.sortOrder) || 100, isRetired: false })} />)}
      {edit && edit !== 'new' && <ActionDialog title={`Edit ${edit.code}`} path={`/admin/lookups/${edit.id}`} method="PUT" version={edit.version} onClose={() => setEdit(null)} submitLabel="Save"
        initial={{ label: edit.label, description: edit.description ?? '', sortOrder: String(edit.sortOrder), isRetired: edit.isRetired ? 'yes' : '' }}
        fields={fixedWorkflow ? [{ name: 'label', label: 'Display label', required: true }] : [{ name: 'label', label: 'Label', required: true }, { name: 'description', label: 'Description' }, { name: 'sortOrder', label: 'Sort order' }, { name: 'isRetired', label: 'Retired', kind: 'select', options: [{ value: 'yes', label: 'Retired' }] }]}
        transform={v => fixedWorkflow ? ({ listName: edit.listName, code: edit.code, label: v.label, description: edit.description, sortOrder: edit.sortOrder, isRetired: edit.isRetired }) : ({ listName: edit.listName, code: edit.code, label: v.label, description: v.description, sortOrder: Number(v.sortOrder) || 0, isRetired: v.isRetired === 'yes' })} />}
    </AdminOnly>
  );
}


type Policy = { id: number; recordType: string; scope: string; maxAgeDays?: number; usesNextReviewDate: boolean; effectiveFrom: string; notes?: string; isActive: boolean; version: string };

export function AdminPolicies() {
  const canCreate = usePermission('AdminConfig', 'Create');
  const canMaintain = usePermission('AdminConfig', 'Maintain');
  const q = useQuery({ queryKey: ['policies'], queryFn: () => get<Policy[]>('/review-policies') });
  const [edit, setEdit] = useState<Policy | 'new' | null>(null);
  return (
    <AdminOnly>
      <PageHead title="Review policies" crumbs={configCrumbs('review-policies')} sub="Maximum age and/or explicit next-review date per record type and review scope. Record types without a policy are reported as data-quality exceptions. Pilot defaults, not SLA commitments."
        actions={canCreate && <button className="btn btn-primary" onClick={() => setEdit('new')}>+ New Policy</button>} />
      <DataTable<Policy> rowKey={p => p.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 't', header: 'Record type', render: p => p.recordType }, { key: 's', header: 'Scope', render: p => label(p.scope) }, { key: 'm', header: 'Max age (days)', className: 'num', render: p => p.maxAgeDays ?? '—' },
        { key: 'n', header: 'Uses next-review date', render: p => p.usesNextReviewDate ? 'Yes' : 'No' }, { key: 'e', header: 'Effective from', render: p => p.effectiveFrom }, { key: 'no', header: 'Notes', render: p => p.notes },
        { key: 'a', header: 'Status', render: p => p.isActive ? <Badge tone="good">Active</Badge> : <Badge>Inactive</Badge> }, { key: 'x', header: '', render: p => <button disabled={!canMaintain} className="linkbtn" onClick={() => setEdit(p)}>Edit</button> }
      ]} />
      {edit && <ActionDialog title={edit === 'new' ? 'New review policy' : `Edit ${edit.recordType} / ${edit.scope}`} path={edit === 'new' ? '/review-policies' : `/review-policies/${edit.id}`} method={edit === 'new' ? 'POST' : 'PUT'} version={edit === 'new' ? undefined : edit.version} onClose={() => setEdit(null)} submitLabel="Save"
        initial={edit === 'new' ? {} : { recordType: edit.recordType, scope: edit.scope, maxAgeDays: edit.maxAgeDays?.toString() ?? '', usesNextReviewDate: edit.usesNextReviewDate ? 'yes' : '', notes: edit.notes ?? '' }}
        fields={[{ name: 'recordType', label: 'Record type', kind: 'select', required: true, options: ['Client', 'Contact', 'Region', 'Project', 'Environment', 'Installation', 'Asset', 'Case', 'Commitment'].map(x => ({ value: x, label: x })) },
          { name: 'scope', label: 'Scope', kind: 'select', required: true, options: ['Record', 'Inventory', 'Condition', 'Dependencies', 'Contacts'].map(x => ({ value: x, label: x })) },
          { name: 'maxAgeDays', label: 'Maximum age (days)' }, { name: 'usesNextReviewDate', label: 'Also use explicit next-review date', kind: 'select', options: [{ value: 'yes', label: 'Yes' }] }, { name: 'notes', label: 'Notes' }]}
        transform={v => ({ recordType: v.recordType, scope: v.scope, maxAgeDays: v.maxAgeDays ? Number(v.maxAgeDays) : null, usesNextReviewDate: v.usesNextReviewDate === 'yes', notes: v.notes, isActive: true })} />}
    </AdminOnly>
  );
}

export function AdminJira() {
  const canMaintain = usePermission('AdminConfig', 'Maintain');
  const q = useQuery({ queryKey: ['admin-jira'], queryFn: () => get<{ id: number; name: string; kind: string; approvedHost: string; isActive: boolean; version: string }[]>('/admin/jira-instances') });
  const [edit, setEdit] = useState<{ id: number; name: string; kind: string; approvedHost: string; isActive: boolean; version: string } | null>(null);
  return (
    <AdminOnly>
      <PageHead title="Jira instances" crumbs={configCrumbs('jira-instances')} sub="The two Jira systems. Only the approved HTTPS host is stored here, for validating manual ticket links; these entries never call Jira. Synchronization is configured under Jira Connections." />
      <DataTable rowKey={j => j.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 'n', header: 'Name', render: j => j.name }, { key: 'k', header: 'Kind', render: j => label(j.kind) }, { key: 'h', header: 'Approved host', render: j => j.approvedHost || <Badge tone="warn">Not configured</Badge> },
        { key: 'x', header: '', render: j => <button disabled={!canMaintain} className="linkbtn" onClick={() => setEdit(j)}>Edit</button> }
      ]} />
      {edit && <ActionDialog title={`Edit ${edit.name}`} path={`/admin/jira-instances/${edit.id}`} method="PUT" version={edit.version} onClose={() => setEdit(null)} submitLabel="Save"
        initial={{ name: edit.name, approvedHost: edit.approvedHost }} fields={[{ name: 'name', label: 'Name', required: true }, { name: 'approvedHost', label: 'Approved host (no https://)' }]}
        transform={v => ({ name: v.name, kind: edit.kind, approvedHost: v.approvedHost, isActive: true })} />}
    </AdminOnly>
  );
}

export function AdminSettings() {
  const canMaintain = usePermission('AdminSettings', 'Maintain');
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => get<{ id: number; key: string; value: string; description?: string; version: string }[]>('/admin/settings') });
  const [edit, setEdit] = useState<{ id: number; key: string; value: string; version: string } | null>(null);
  return (
    <AdminOnly>
      <PageHead title="Settings" crumbs={configCrumbs('settings')} sub="Approved link hosts, vault reference format, coverage policy and dashboard window. Changes are audited." />
      <DataTable rowKey={s => s.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 'k', header: 'Setting', render: s => <span className="mono">{s.key}</span> }, { key: 'v', header: 'Value', render: s => s.key === 'DefaultTimeZone' && s.value ? timeZoneOptions().find(o => o.value === s.value)?.label ?? s.value : s.value || <span className="muted">Empty (open decision)</span> },
        { key: 'd', header: 'Description', render: s => s.description }, { key: 'x', header: '', render: s => <button disabled={!canMaintain} className="linkbtn" onClick={() => setEdit(s)}>Edit</button> }
      ]} />
      <AttachmentStorage />
      {edit && edit.key === 'DefaultTimeZone' && <ZoneSettingDialog setting={edit} onClose={() => setEdit(null)} />}
      {edit && edit.key !== 'DefaultTimeZone' && <ActionDialog title={`Edit ${edit.key}`} path={`/admin/settings/${edit.id}`} method="PUT" version={edit.version} onClose={() => setEdit(null)} submitLabel="Save" initial={{ value: edit.value }} fields={[{ name: 'value', label: 'Value', required: true }]} />}
    </AdminOnly>
  );
}

type Audit = { id: number; at: string; userName?: string; action: string; category: string; entityType: string; entityId?: number; entityLabel?: string; clientId?: number; reason?: string; changes?: string };

export function AdminAudit() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ entityType: '', action: '', category: '', page: '1', pageSize: '25' });
  const allowed = me.grants.audit || me.isAdministrator;
  const q = useQuery({ queryKey: ['audit', f], queryFn: () => get<Paged<Audit>>(`/admin/audit${qs(f)}`), enabled: allowed, retry: false });
  const ex = useQuery({ queryKey: ['exports-log'], queryFn: () => get<Paged<{ id: number; at: string; report: string; filters: string; rowCount: number; user?: string }>>('/admin/exports?pageSize=10'), enabled: allowed, retry: false });
  return (
    <>
      <PageHead title="Change history" sub="Append-only audit with actor, time, record and before/after values. Restricted technical values are masked without the Technical detail grant; only records in your scope are listed." />
      <div className="toolbar">
        <TextInput label="Record type" value={f.entityType} onChange={v => set({ entityType: v })} placeholder="Client, Case…" />
        <SelectInput label="Action" value={f.action} onChange={v => set({ action: v })} options={['Create', 'Update', 'StatusChange', 'OwnerChange', 'Archive', 'Restore', 'AccessChange', 'AccessGranted', 'AccessRevoked', 'Export', 'Remove'].map(a => ({ value: a, label: label(a) }))} empty="Any" />
        <SelectInput label="Category" value={f.category} onChange={v => set({ category: v })} options={[{ value: 'Business', label: 'Business records' }, { value: 'Access', label: 'Access administration' }]} empty="Any" />
      </div>
      <DataTable<Audit> rowKey={a => a.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={f.entityType || f.action ? 'nomatch' : 'none'} columns={[
        { key: 'at', header: 'When', render: a => <span className="nowrap">{fmtDateTime(a.at)}</span> }, { key: 'u', header: 'By', render: a => a.userName },
        { key: 'ac', header: 'Action', render: a => label(a.action) }, { key: 'r', header: 'Record', render: a => a.entityId ? <RecordLink type={a.entityType} id={a.entityId}>{a.entityType} · {a.entityLabel ?? a.entityId}</RecordLink> : `${a.entityType} · ${a.entityLabel ?? ''}` },
        { key: 'rs', header: 'Reason', render: a => a.reason }, { key: 'c', header: 'Changes', render: a => <Changes json={a.changes} /> }
      ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
      {ex.data && <Panel title="Recent exports" pad={false}><DataTable rowKey={e => e.id} rows={ex.data.items} columns={[
        { key: 'a', header: 'When', render: e => fmtDateTime(e.at) }, { key: 'u', header: 'User', render: e => e.user }, { key: 'r', header: 'Report', render: e => e.report }, { key: 'f', header: 'Filters', render: e => e.filters }, { key: 'n', header: 'Rows', className: 'num', render: e => e.rowCount }
      ]} /></Panel>}
    </>
  );
}

type Archived = { recordType: string; id: number; label: string; clientId?: number; archivedAt: string; archiveReason?: string; version: string };

export function AdminArchived() {
  const me = useMe().data;
  const [type, setType] = useState('');
  const q = useQuery({ queryKey: ['archived', type], queryFn: () => get<Archived[]>(`/admin/archived${qs({ recordType: type })}`) });
  const [restore, setRestore] = useState<Archived | null>(null);
  return (
    <>
      <PageHead title="Archived records" sub="Archived records keep their history and links. Restore needs Archive and restore permission for the record type within its scope; client aliases stay reserved." />
      <div className="toolbar"><SelectInput label="Record type" value={type} onChange={setType} options={['Client', 'Region', 'Project', 'Contract', 'Contact', 'Environment', 'Installation', 'Asset', 'Component'].map(t => ({ value: t, label: t }))} empty="All" /></div>
      <DataTable<Archived> rowKey={a => `${a.recordType}-${a.id}`} rows={q.data} loading={q.isLoading} error={q.error} empty={type ? 'nomatch' : 'none'} columns={[
        { key: 't', header: 'Type', render: a => a.recordType }, { key: 'l', header: 'Record', render: a => a.label }, { key: 'w', header: 'Archived', render: a => fmtDateTime(a.archivedAt) },
        { key: 'r', header: 'Reason', render: a => a.archiveReason }, { key: 'x', header: '', render: a => hasPermission(me, resourceForRecord(a.recordType), 'ArchiveRestore') && <button className="linkbtn" onClick={() => setRestore(a)}>Restore</button> }
      ]} />
      {restore && <ActionDialog title={`Restore ${restore.recordType}`} path={`/admin/archived/${restore.recordType}/${restore.id}/restore`} onClose={() => setRestore(null)} submitLabel="Restore"
        intro="Restore re-checks scope, parent records and name conflicts." fields={[{ name: 'reason', label: 'Restore reason', kind: 'textarea', required: true }]} />}
    </>
  );
}

/** A44: the default time zone for new users, chosen from the list; preselected from this computer while the shipped value (UTC) is in place. */
function ZoneSettingDialog({ setting, onClose }: { setting: { id: number; key: string; value: string; version: string }; onClose: () => void }) {
  const pc = computerZone();
  const preset = !setting.value || setting.value === 'UTC';
  const f = useForm({ value: preset ? pc : setting.value });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const ok = await f.submit(async v => { await put(`/admin/settings/${setting.id}`, { value: v.value }, setting.version); return true; });
    if (ok) { toast('Default time zone saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title="Default time zone" onClose={onClose}>
      <p className="hint" style={{ marginTop: 0 }}>Used for new users and wherever no personal time zone is set.{preset && pc !== 'UTC' && <> Preselected from this computer's time zone; the saved value is still {setting.value || 'empty'}.</>}</p>
      <FormError error={f.error} fields={['value']} />
      <div className="form-grid">
        <TimeZoneSelect label="Default time zone" required wide value={f.values.value} onChange={v => f.set('value', v)} error={f.fieldError('value')} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy || !f.values.value} onClick={save}>Save</button></div>
    </Dialog>
  );
}

/** A48: where attachment files are stored and the upload limits — editable; a new folder can take the existing files with it. */
type Storage = { location: string; path?: string; defaultLocation: string; overridden: boolean; maxFileMB: number; maxFilesPerUpload: number; extensions: string[]; files: number; bytes: number;
  defaults: { maxFileMB: number; maxFilesPerUpload: number; extensions: string[] }; blocked: string[]; limits: { maxFileMB: number; maxFilesPerUpload: number } };
function AttachmentStorage() {
  const canMaintain = usePermission('AdminSettings', 'Maintain');
  const q = useQuery({ queryKey: ['attachment-storage'], queryFn: () => get<Storage>('/admin/attachment-storage') });
  const [edit, setEdit] = useState(false);
  const d = q.data;
  if (!d) return null;
  const mb = (b: number) => (b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
  return (
    <Panel title="File attachments" actions={<button disabled={!canMaintain} className="btn" onClick={() => setEdit(true)}>Edit</button>}>
      <dl className="dl">
        <dt>Storage folder</dt><dd><span className="mono">{d.location}</span>{!d.path && <span className="hint"> (configuration default)</span>}</dd>
        <dt>Stored now</dt><dd>{d.files} file(s), {mb(d.bytes)}</dd>
        <dt>Limits</dt><dd>{d.maxFileMB} MB per file, {d.maxFilesPerUpload} files per upload</dd>
        <dt>Accepted types</dt><dd>{d.extensions.join(', ')}</dd>
      </dl>
      <p className="hint" style={{ marginBottom: 0 }}>Files are saved on the server's disk in this folder, never in the database; the database keeps their name, size, checksum and who uploaded them.
        Include the folder in the server backups.</p>
      {edit && <StorageDialog s={d} onClose={() => setEdit(false)} />}
    </Panel>
  );
}

function StorageDialog({ s, onClose }: { s: Storage; onClose: () => void }) {
  const f = useForm({ path: s.path ?? '', maxFileMB: String(s.maxFileMB), maxFilesPerUpload: String(s.maxFilesPerUpload), extensions: s.extensions.join(', '), moveFiles: true });
  const toast = useToast();
  const refresh = useRefresh();
  const v = f.values;
  const changesFolder = (v.path.trim() || '') !== (s.path ?? '');
  const save = async () => {
    const r = await f.submit(() => put<{ location: string; moved: number; left: number }>('/admin/attachment-storage', {
      path: v.path.trim() || null, maxFileMB: Number(v.maxFileMB), maxFilesPerUpload: Number(v.maxFilesPerUpload),
      extensions: v.extensions.split(/[\s,;]+/).filter(Boolean), moveFiles: v.moveFiles
    }));
    if (r) {
      toast(r.moved ? `Saved. ${r.moved} file(s) moved to ${r.location}.` : r.left ? `Saved. ${r.left} file(s) stay in the old folder; move them yourself.` : 'Saved.');
      refresh(); onClose();
    }
  };
  return (
    <Dialog title="File attachments" onClose={onClose} wide>
      <FormError error={f.error} fields={['path', 'maxFileMB', 'maxFilesPerUpload', 'extensions']} />
      <div className="form-grid">
        <TextInput label="Storage folder" wide value={v.path} onChange={x => f.set('path', x)} error={f.fieldError('path')} placeholder={s.defaultLocation}
          hint={<>A folder on the server or a network share, for example <code>D:\TioHub\attachments</code> or <code>\fileserver\TioHub\attachments</code>. Leave empty for the configuration default ({s.defaultLocation}). The application's account needs modify rights there.</>} />
        {changesFolder && s.files > 0 && (
          <div className="field wide">
            <Checkbox label={`Move the ${s.files} existing file(s) to the new folder`} checked={v.moveFiles} onChange={x => f.set('moveFiles', x)}
              hint={v.moveFiles ? 'They are copied first; the old copies are removed only when every file has been copied.' : 'They stay where they are and show as missing until you move them to the new folder yourself (same sub-folders).'} />
          </div>
        )}
        <TextInput label="Maximum size per file (MB)" type="number" value={v.maxFileMB} onChange={x => f.set('maxFileMB', x)} error={f.fieldError('maxFileMB')} hint={`1 to ${s.limits.maxFileMB}. Default ${s.defaults.maxFileMB}.`} />
        <TextInput label="Files per upload" type="number" value={v.maxFilesPerUpload} onChange={x => f.set('maxFilesPerUpload', x)} error={f.fieldError('maxFilesPerUpload')} hint={`1 to ${s.limits.maxFilesPerUpload}. Default ${s.defaults.maxFilesPerUpload}.`} />
        <TextInput label="Accepted file types" wide multiline value={v.extensions} onChange={x => f.set('extensions', x)} error={f.fieldError('extensions')}
          hint={<>Separated by commas. Never accepted: {s.blocked.join(' ')}. <button type="button" className="linkbtn" onClick={() => f.set('extensions', s.defaults.extensions.join(', '))}>Restore the defaults</button></>} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{f.busy ? 'Saving…' : 'Save'}</button></div>
    </Dialog>
  );
}
