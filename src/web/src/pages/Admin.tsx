import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { del, get, post, put, qs, type Paged } from '../api';
import { fmtDateTime, label } from '../format';
import { useForm, useMe, useRefresh, useUrlState } from '../hooks';
import { ActionDialog, computerZone, TimeZoneSelect, timeZoneOptions } from '../ui/pickers';
import { Badge, Checkbox, DataTable, Dialog, FormError, PageHead, Pager, Panel, SelectInput, StateMessage, TextInput, useToast, DeleteAction } from '../ui/kit';
import { Changes, RecordLink } from './common';

function AdminOnly({ children }: { children: React.ReactNode }) {
  const me = useMe().data!;
  if (!me.isAdministrator) return <StateMessage kind="restricted">This page needs the Administration right.</StateMessage>;
  return <>{children}</>;
}

type Scope = { kind: 'Client' | 'Project' | 'InternalTeam'; clientId?: number | null; projectId?: number | null; teamId?: number | null };
type UserRow = { id: number; accountName: string; displayName: string; email?: string; workingTimeZone: string; isActive: boolean; deactivatedAt?: string; deactivationReason?: string; lastSignInAt?: string; mappedGroups?: string; roles: string[]; roleId?: number; roleName?: string; allClients: boolean; allInternal: boolean; grants: string[]; scopes: Scope[]; version: string };
type Targets = { clients: { id: number; code: string; name: string; archived: boolean }[]; projects: { id: number; code: string; name: string; clientId: number }[]; teams: { id: number; code: string; name: string }[] };

// A31: configurable roles and rights (Administration → Roles, Rights).
type RightDef = { key: string; label: string; description: string };
type RoleDef = { id: number; name: string; description?: string; key?: string; isLocked: boolean; rights: string[]; userCount: number; version: string };
const useRoles = () => useQuery({ queryKey: ['admin-roles'], queryFn: () => get<{ rights: RightDef[]; roles: RoleDef[] }>('/admin/roles') });

type SignInState = { userId: number; state: 'Active' | 'TemporaryPassword' | 'Locked'; lockedUntil?: string; changedAt: string };

export function AdminUsers() {
  const me = useMe().data!;
  const forms = me.app.authMode.toLowerCase() === 'forms';
  const q = useQuery({ queryKey: ['admin-users'], queryFn: () => get<UserRow[]>('/admin/users') });
  const signIn = useQuery({ queryKey: ['admin-users', 'sign-in'], queryFn: () => get<SignInState[]>('/admin/users/sign-in-status'), enabled: forms });
  const [pw, setPw] = useState<{ id: number; name: string; account: string; first: boolean } | null>(null);
  const stateOf = (id: number) => signIn.data?.find(s => s.userId === id);
  const targets = useQuery({ queryKey: ['scope-targets'], queryFn: () => get<Targets>('/admin/scope-targets') });
  const [edit, setEdit] = useState<UserRow | 'new' | null>(null);
  const [deact, setDeact] = useState<UserRow | null>(null);
  return (
    <AdminOnly>
      <PageHead title="Users and access" sub="Each user holds one role; what a role may do is set on the Rights page."
        actions={<button className="btn btn-primary" onClick={() => setEdit('new')}>+ New User</button>} />
      <DataTable<UserRow> rowKey={u => u.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 'n', header: 'Name', render: u => <button className="linkbtn" onClick={() => setEdit(u)}>{u.displayName}</button> }, { key: 'a', header: 'Account', render: u => <span className="mono">{u.accountName}</span> },
        { key: 'r', header: 'Role', render: u => u.roleName ? <span className="chip">{u.roleName}</span> : <Badge tone="warn">No role — cannot sign in</Badge> },
        ...(forms ? [] : [{ key: 'm', header: 'Mapped groups', render: (u: UserRow) => u.mappedGroups }]),
        { key: 'st', header: 'Status', render: u => u.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge> },
        ...(forms ? [{ key: 'pw', header: 'Password', render: (u: UserRow) => {
          const st = stateOf(u.id);
          return !st ? <Badge tone="warn">Not set</Badge> : st.state === 'Locked' ? <Badge tone="bad">Locked until {fmtDateTime(st.lockedUntil)}</Badge>
            : st.state === 'TemporaryPassword' ? <Badge tone="info">Temporary</Badge> : <Badge tone="good">Set</Badge>;
        } }] : []),
        { key: 'l', header: 'Last sign-in', render: u => fmtDateTime(u.lastSignInAt) },
        { key: 'x', header: '', render: u => <span className="nowrap">
          {forms && u.id !== me.id && u.isActive && <button className="linkbtn" style={{ marginRight: 10 }} onClick={() => setPw({ id: u.id, name: u.displayName, account: u.accountName, first: !stateOf(u.id) })}>{stateOf(u.id) ? 'Reset password' : 'Set password'}</button>}
          <button className="linkbtn" onClick={() => setDeact(u)}>{u.isActive ? 'Deactivate' : 'Reactivate'}</button>
        </span> }
      ]} />
      {edit && targets.data && <UserDialog user={edit === 'new' ? null : edit} targets={targets.data} onClose={() => setEdit(null)}
        onCreated={forms ? (u => setPw({ ...u, first: true })) : undefined} />}
      {pw && <PasswordDialog user={pw} onClose={() => setPw(null)} />}
      {deact && <ActionDialog title={deact.isActive ? `Deactivate ${deact.displayName}` : `Reactivate ${deact.displayName}`} danger={deact.isActive} path={`/admin/users/${deact.id}/${deact.isActive ? 'deactivate' : 'reactivate'}`} version={deact.version}
        intro={deact.isActive ? 'History and identity are kept. Their active records appear in the reassignment queue; nothing is reassigned automatically. Active sessions lose access immediately.' : undefined}
        fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} submitLabel={deact.isActive ? 'Deactivate' : 'Reactivate'} onClose={() => setDeact(null)} />}
    </AdminOnly>
  );
}

/** TIO Manager issues a temporary password (forms sign-in). The user must replace it at the next sign-in; existing sessions end. */
function PasswordDialog({ user, onClose }: { user: { id: number; name: string; account: string; first: boolean }; onClose: () => void }) {
  const f = useForm({ temporaryPassword: '' });
  const toast = useToast();
  const refresh = useRefresh();
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
      <p className="hint" style={{ marginTop: 0 }}>Account <span className="mono">{user.account}</span>. The person must choose their own password at the next sign-in. {user.first ? '' : 'Their current sessions end and a lock is cleared.'}</p>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Temporary password" required wide value={f.values.temporaryPassword} onChange={v => f.set('temporaryPassword', v)} error={f.fieldError('temporaryPassword')}
          hint="At least 12 characters, not containing the account name. It is shown only here; the hub stores only a hash." />
      </div>
      <div className="form-actions"><button className="btn" onClick={generate}>Generate</button><span style={{ flex: 1 }} /><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy || !f.values.temporaryPassword} onClick={save}>Save password</button></div>
    </Dialog>
  );
}

function UserDialog({ user, onClose, onCreated }: { user: UserRow | null; targets?: Targets; onClose: () => void; onCreated?: (u: { id: number; name: string; account: string }) => void }) {
  const me = useMe().data!;
  const forms = me.app.authMode.toLowerCase() === 'forms';
  // A44: a new user starts in the configured default time zone, or this computer's when the default is still the shipped UTC.
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: () => get<{ key: string; value: string }[]>('/admin/settings') });
  const configured = settings.data?.find(s => s.key === 'DefaultTimeZone')?.value;
  const defaultZone = configured && configured !== 'UTC' ? configured : computerZone();
  const f = useForm({
    accountName: user?.accountName ?? '', displayName: user?.displayName ?? '', email: user?.email ?? '', workingTimeZone: user?.workingTimeZone ?? defaultZone,
    roleId: user?.roleId ? String(user.roleId) : ''
  });
  const roles = useRoles();
  const toast = useToast();
  const refresh = useRefresh();
  const self = user?.id === me.id;
  const save = async () => {
    const v = f.values;
    // Every role sees all clients and teams; what it may do comes from its rights.
    const body = { accountName: v.accountName, displayName: v.displayName, email: v.email, workingTimeZone: v.workingTimeZone, roleId: v.roleId ? Number(v.roleId) : null, roles: [],
      allClients: true, allInternal: true, export: true, technicalDetail: true, audit: true, scopes: [] };
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
        <SelectInput label="Role" required value={f.values.roleId} onChange={v => f.set('roleId', v)} disabled={self} error={f.fieldError('roleId') ?? f.fieldError('roles')}
          options={(roles.data?.roles ?? []).map(r => ({ value: String(r.id), label: r.name }))} empty="— Select —"
          hint={roles.data?.roles.find(r => String(r.id) === f.values.roleId)?.description ?? 'What each role may do is set under Administration → Rights.'} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy || self} onClick={save}>Save user</button></div>
    </Dialog>
  );
}

type Mapping = { id: number; groupName: string; role?: string; allClients: boolean; allInternal: boolean; grants: string[]; scopes: Scope[]; version: string };

export function AdminGroups() {
  const q = useQuery({ queryKey: ['mappings'], queryFn: () => get<Mapping[]>('/admin/group-mappings') });
  const [open, setOpen] = useState(false);
  return (
    <AdminOnly>
      <PageHead title="Organization group mappings" sub="Members of a mapped group are admitted at sign-in with these roles, scopes and grants." actions={<button className="btn btn-primary" onClick={() => setOpen(true)}>+ New Mapping</button>} />
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
  const q = useRoles();
  const [edit, setEdit] = useState<RoleDef | 'new' | null>(null);
  const [remove, setRemove] = useState<RoleDef | null>(null);
  const toast = useToast();
  const refresh = useRefresh();
  const d = q.data;
  return (
    <AdminOnly>
      <PageHead title="Roles" sub="Each user holds one role. Add roles for the way your team works; what each role may do is set on the Rights page."
        actions={<><Link className="btn" to="/admin/rights">Edit rights</Link><button className="btn btn-primary" onClick={() => setEdit('new')}>+ New role</button></>} />
      <DataTable<RoleDef> caption="Roles" rowKey={r => r.id} rows={d?.roles} loading={q.isLoading} error={q.error} columns={[
        { key: 'n', header: 'Role', render: r => <><button className="linkbtn" onClick={() => setEdit(r)}><b>{r.name}</b></button>{r.key && <span className="chip"> built-in</span>}</> },
        { key: 'd', header: 'Description', render: r => r.description ?? <span className="muted">—</span> },
        { key: 'u', header: 'Users', className: 'num', render: r => r.userCount },
        { key: 'r', header: 'Rights', render: r => r.isLocked ? <Badge tone="good">All rights</Badge> : r.rights.length === 0 ? <span className="muted">View only</span>
          : r.rights.map(k => d?.rights.find(x => x.key === k)?.label ?? k).join(', ') },
        { key: 'a', header: '', className: 'row-actions nowrap', render: r => <><button className="linkbtn" onClick={() => setEdit(r)}>Edit</button>{!r.key && <> <button className="linkbtn danger-link" onClick={() => setRemove(r)}>Delete</button></>}</> }
      ]} />
      {edit && d && <RoleDialog role={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
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

/** A40: rights per role as a matrix; a tick saves at once. */
export function AdminRights() {
  const q = useRoles();
  const toast = useToast();
  const refresh = useRefresh();
  const [busy, setBusy] = useState<string | null>(null);
  // The tick shows at once; it is undone if the save fails.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const d = q.data;
  const toggle = async (r: RoleDef, key: string, on: boolean) => {
    setBusy(`${r.id}-${key}`);
    setPending(p => ({ ...p, [`${r.id}-${key}`]: on }));
    try {
      await put(`/admin/roles/${r.id}`, { name: r.name, description: r.description ?? null, rights: on ? [...r.rights, key] : r.rights.filter(k => k !== key) }, r.version);
      await refresh();
      toast(`${r.name}: ${d?.rights.find(x => x.key === key)?.label ?? key} ${on ? 'granted' : 'removed'}.`);
    } catch (e) { toast((e as Error).message); await refresh(); }
    finally { setBusy(null); setPending(p => { const n = { ...p }; delete n[`${r.id}-${key}`]; return n; }); }
  };
  return (
    <AdminOnly>
      <PageHead title="Rights" sub="Every role can view clients and records. Tick what each role may do; each change is saved and applies to signed-in users at once. The TIO Manager role always keeps every right."
        actions={<Link className="btn" to="/admin/roles">Manage roles</Link>} />
      {!d ? <StateMessage kind="loading" /> : (
        <Panel pad={false}>
          <div className="table-wrap">
            <table className="grid rights-matrix">
              <caption className="sr-only">Rights per role</caption>
              <thead><tr><th>Right</th>{d.roles.map(r => <th key={r.id} className="c">{r.name}<div className="hint">{r.userCount} user(s){r.key ? ' · built-in' : ''}</div></th>)}</tr></thead>
              <tbody>
                <tr><td>View clients &amp; records<div className="hint">Every role</div></td>{d.roles.map(r => <td key={r.id} className="c" aria-label={`${r.name}: yes`}>✔</td>)}</tr>
                {d.rights.map(x => (
                  <tr key={x.key}><td>{x.label}<div className="hint">{x.description}</div></td>
                    {d.roles.map(r => {
                      const on = r.isLocked || (pending[`${r.id}-${x.key}`] ?? r.rights.includes(x.key));
                      return <td key={r.id} className="c">
                        <input type="checkbox" className="right-box" checked={on} disabled={r.isLocked || busy !== null} onChange={e => toggle(r, x.key, e.target.checked)}
                          aria-label={`${x.label} for ${r.name}`} title={r.isLocked ? 'The TIO Manager role always keeps every right' : undefined} />
                        {busy === `${r.id}-${x.key}` && <span className="spin" />}
                      </td>;
                    })}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </AdminOnly>
  );
}

function RoleDialog({ role, onClose }: { role: RoleDef | null; onClose: () => void }) {
  const f = useForm({ name: role?.name ?? '', description: role?.description ?? '' });
  const toast = useToast();
  const refresh = useRefresh();
  const nav = useNavigate();
  const save = async () => {
    // A new role starts with Edit and Export; its rights are then set on the Rights page.
    const ok = await f.submit(async v => {
      const body = { ...v, rights: role?.rights ?? ['Edit', 'Export'] };
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
  const q = useQuery({ queryKey: ['admin-lookups'], queryFn: () => get<LookupRow[]>('/admin/lookups') });
  const [picked, setList] = useState('');
  const list = fixedList ?? picked;
  const [edit, setEdit] = useState<LookupRow | 'new' | null>(null);
  const lists = [...new Set((q.data ?? []).map(l => l.listName))];
  return (
    <AdminOnly>
      <PageHead title={title} sub={sub ?? 'Retired values stay valid on existing records; codes are never renamed, so history keeps its meaning.'} actions={<button className="btn btn-primary" onClick={() => setEdit('new')}>{fixedList ? '+ New zone' : '+ New Value'}</button>} />
      {!fixedList && <div className="toolbar"><SelectInput label="List" value={list} onChange={setList} options={lists.map(l => ({ value: l, label: label(l) }))} empty="All lists" /></div>}
      <DataTable<LookupRow> rowKey={l => l.id} rows={q.data?.filter(l => !list || l.listName === list)} loading={q.isLoading} error={q.error} columns={[
        { key: 'l', header: 'List', render: l => label(l.listName) }, { key: 'c', header: 'Code', render: l => <span className="mono">{l.code}</span> }, { key: 'b', header: 'Label', render: l => l.label },
        { key: 'd', header: 'Description', render: l => l.description }, { key: 's', header: 'Order', className: 'num', render: l => l.sortOrder },
        { key: 'r', header: 'Status', render: l => l.isRetired ? <Badge>Retired</Badge> : <Badge tone="good">Active</Badge> }, { key: 'e', header: '', render: l => <button className="linkbtn" onClick={() => setEdit(l)}>Edit</button> }, { key: 'del', header: '', className: 'row-actions', render: l => <DeleteAction path={`/admin/lookups/${l.id}`} what={`${l.label}`} /> }
      ]} />
      {edit === 'new' && (fixedList
        ? <ActionDialog title="New network zone" path="/admin/lookups" onClose={() => setEdit(null)} submitLabel="Add zone"
            fields={[{ name: 'label', label: 'Zone name', required: true }, { name: 'description', label: 'Description' }, { name: 'sortOrder', label: 'Sort order' }]}
            transform={v => ({ listName: fixedList, code: v.label.trim(), label: v.label, description: v.description, sortOrder: Number(v.sortOrder) || 100, isRetired: false })} />
        : <ActionDialog title="New reference value" path="/admin/lookups" onClose={() => setEdit(null)} submitLabel="Add"
            fields={[{ name: 'listName', label: 'List', kind: 'select', required: true, options: lists.map(l => ({ value: l, label: label(l) })) }, { name: 'code', label: 'Code', required: true }, { name: 'label', label: 'Label', required: true }, { name: 'description', label: 'Description' }, { name: 'sortOrder', label: 'Sort order' }]}
            transform={v => ({ ...v, sortOrder: Number(v.sortOrder) || 100, isRetired: false })} />)}
      {edit && edit !== 'new' && <ActionDialog title={`Edit ${edit.code}`} path={`/admin/lookups/${edit.id}`} method="PUT" version={edit.version} onClose={() => setEdit(null)} submitLabel="Save"
        initial={{ label: edit.label, description: edit.description ?? '', sortOrder: String(edit.sortOrder), isRetired: edit.isRetired ? 'yes' : '' }}
        fields={[{ name: 'label', label: 'Label', required: true }, { name: 'description', label: 'Description' }, { name: 'sortOrder', label: 'Sort order' }, { name: 'isRetired', label: 'Retired', kind: 'select', options: [{ value: 'yes', label: 'Retired' }] }]}
        transform={v => ({ listName: edit.listName, code: edit.code, label: v.label, description: v.description, sortOrder: Number(v.sortOrder) || 0, isRetired: v.isRetired === 'yes' })} />}
    </AdminOnly>
  );
}


type Policy = { id: number; recordType: string; scope: string; maxAgeDays?: number; usesNextReviewDate: boolean; effectiveFrom: string; notes?: string; isActive: boolean; version: string };

export function AdminPolicies() {
  const q = useQuery({ queryKey: ['policies'], queryFn: () => get<Policy[]>('/review-policies') });
  const [edit, setEdit] = useState<Policy | 'new' | null>(null);
  return (
    <AdminOnly>
      <PageHead title="Review policies" sub="Maximum age and/or explicit next-review date per record type and review scope. Record types without a policy are reported as data-quality exceptions. Pilot defaults, not SLA commitments."
        actions={<button className="btn btn-primary" onClick={() => setEdit('new')}>+ New Policy</button>} />
      <DataTable<Policy> rowKey={p => p.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 't', header: 'Record type', render: p => p.recordType }, { key: 's', header: 'Scope', render: p => label(p.scope) }, { key: 'm', header: 'Max age (days)', className: 'num', render: p => p.maxAgeDays ?? '—' },
        { key: 'n', header: 'Uses next-review date', render: p => p.usesNextReviewDate ? 'Yes' : 'No' }, { key: 'e', header: 'Effective from', render: p => p.effectiveFrom }, { key: 'no', header: 'Notes', render: p => p.notes },
        { key: 'a', header: 'Status', render: p => p.isActive ? <Badge tone="good">Active</Badge> : <Badge>Inactive</Badge> }, { key: 'x', header: '', render: p => <button className="linkbtn" onClick={() => setEdit(p)}>Edit</button> }
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
  const q = useQuery({ queryKey: ['admin-jira'], queryFn: () => get<{ id: number; name: string; kind: string; approvedHost: string; isActive: boolean; version: string }[]>('/admin/jira-instances') });
  const [edit, setEdit] = useState<{ id: number; name: string; kind: string; approvedHost: string; isActive: boolean; version: string } | null>(null);
  return (
    <AdminOnly>
      <PageHead title="Jira instances" sub="The two disconnected Jira systems. Only the approved HTTPS host is stored for validating manual ticket links; the hub never calls Jira." />
      <DataTable rowKey={j => j.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 'n', header: 'Name', render: j => j.name }, { key: 'k', header: 'Kind', render: j => label(j.kind) }, { key: 'h', header: 'Approved host', render: j => j.approvedHost || <Badge tone="warn">Not configured</Badge> },
        { key: 'x', header: '', render: j => <button className="linkbtn" onClick={() => setEdit(j)}>Edit</button> }
      ]} />
      {edit && <ActionDialog title={`Edit ${edit.name}`} path={`/admin/jira-instances/${edit.id}`} method="PUT" version={edit.version} onClose={() => setEdit(null)} submitLabel="Save"
        initial={{ name: edit.name, approvedHost: edit.approvedHost }} fields={[{ name: 'name', label: 'Name', required: true }, { name: 'approvedHost', label: 'Approved host (no https://)' }]}
        transform={v => ({ name: v.name, kind: edit.kind, approvedHost: v.approvedHost, isActive: true })} />}
    </AdminOnly>
  );
}

export function AdminSettings() {
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => get<{ id: number; key: string; value: string; description?: string; version: string }[]>('/admin/settings') });
  const [edit, setEdit] = useState<{ id: number; key: string; value: string; version: string } | null>(null);
  return (
    <AdminOnly>
      <PageHead title="Settings" sub="Approved link hosts, vault reference format, coverage policy and dashboard window. Changes are audited." />
      <DataTable rowKey={s => s.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 'k', header: 'Setting', render: s => <span className="mono">{s.key}</span> }, { key: 'v', header: 'Value', render: s => s.key === 'DefaultTimeZone' && s.value ? timeZoneOptions().find(o => o.value === s.value)?.label ?? s.value : s.value || <span className="muted">Empty (open decision)</span> },
        { key: 'd', header: 'Description', render: s => s.description }, { key: 'x', header: '', render: s => <button className="linkbtn" onClick={() => setEdit(s)}>Edit</button> }
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
  const [type, setType] = useState('');
  const q = useQuery({ queryKey: ['archived', type], queryFn: () => get<Archived[]>(`/admin/archived${qs({ recordType: type })}`) });
  const [restore, setRestore] = useState<Archived | null>(null);
  return (
    <>
      <PageHead title="Archived records" sub="Archived records keep their history and links. Restore needs a Team Lead or Manager role in the record's scope; client aliases stay reserved." />
      <div className="toolbar"><SelectInput label="Record type" value={type} onChange={setType} options={['Client', 'Region', 'Project', 'Contact', 'Environment', 'Installation', 'Asset', 'Component'].map(t => ({ value: t, label: t }))} empty="All" /></div>
      <DataTable<Archived> rowKey={a => `${a.recordType}-${a.id}`} rows={q.data} loading={q.isLoading} error={q.error} empty={type ? 'nomatch' : 'none'} columns={[
        { key: 't', header: 'Type', render: a => a.recordType }, { key: 'l', header: 'Record', render: a => a.label }, { key: 'w', header: 'Archived', render: a => fmtDateTime(a.archivedAt) },
        { key: 'r', header: 'Reason', render: a => a.archiveReason }, { key: 'x', header: '', render: a => <button className="linkbtn" onClick={() => setRestore(a)}>Restore</button> }
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
  const q = useQuery({ queryKey: ['attachment-storage'], queryFn: () => get<Storage>('/admin/attachment-storage') });
  const [edit, setEdit] = useState(false);
  const d = q.data;
  if (!d) return null;
  const mb = (b: number) => (b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
  return (
    <Panel title="File attachments" actions={<button className="btn" onClick={() => setEdit(true)}>Edit</button>}>
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
