import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { get, type Paged } from '../api';
import { fmtDateTime, label } from '../format';
import { useLeaveGuard, useMe, usePermission } from '../hooks';
import { canAccessPath } from '../permissions';
import { ErrorBox, PageHead, StateMessage } from '../ui/kit';
import PermissionSimulation from './PermissionSimulation';
import { PermissionOverrides } from './PermissionOverrides';
import { AccessRoles, type AccessRegistry } from './AccessRoles';
import { AccessUserAssignments, type AssignmentUser } from './AccessUserAssignments';
import { AccessRoleConflicts } from './AccessRoleConflicts';
import './access-control.css';

type User = AssignmentUser & { isActive: boolean };
type Audit = { id: number; at: string; userName?: string; action: string; entityType: string; entityLabel?: string };
type Access = {
  user: User;
  roles: { id: number; name: string }[];
  effectivePermissions: { key: string; displayName: string; description: string; module: string; riskLevel: string; sources: string[]; effect?: string | null; expiresAt?: string | null; overrideApplied?: boolean }[];
  restrictedPermissions: { key: string; displayName: string; module: string; effect?: string | null; expiresAt?: string | null; restrictionReason?: string; overrideApplied?: boolean }[];
  scopes: { allClients: boolean; clientIds: number[]; projectIds: number[]; allInternal: boolean; teamIds: number[] } | null;
};

/** Live administrative overview. Each query is enabled only when the corresponding area is accessible. */
export function AccessControl() {
  const me = useMe().data;
  const canUsers = canAccessPath(me, '/admin/users');
  const canRoles = canAccessPath(me, '/admin/roles');
  const canRights = canAccessPath(me, '/admin/rights');
  const canAudit = canAccessPath(me, '/admin/audit') && !!me?.grants.audit;
  const canMaintainUsers = usePermission('AdminUsers', 'Maintain');
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => get<User[]>('/admin/users'), enabled: canUsers, retry: false });
  const registry = useQuery({ queryKey: ['admin-roles'], queryFn: () => get<AccessRegistry>('/admin/roles'), enabled: canRoles, retry: false });
  const audit = useQuery({ queryKey: ['access-overview-audit'], queryFn: () => get<Paged<Audit>>('/admin/audit?category=Access&pageSize=5'), enabled: canAudit, retry: false });
  const [userId, setUserId] = useState('');
  const [overrideDirty, setOverrideDirty] = useState(false);
  const [roleDirty, setRoleDirty] = useState(false);
  const [assignmentDirty, setAssignmentDirty] = useState(false);
  const [policyDirty, setPolicyDirty] = useState(false);
  useLeaveGuard(overrideDirty || roleDirty || assignmentDirty || policyDirty);
  useEffect(() => {
    if (!overrideDirty && !roleDirty && !assignmentDirty && !policyDirty) return;
    const preventLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', preventLeave);
    return () => window.removeEventListener('beforeunload', preventLeave);
  }, [overrideDirty, roleDirty, assignmentDirty, policyDirty]);
  const [userSearch, setUserSearch] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [status, setStatus] = useState('all');
  const access = useQuery({ queryKey: ['admin-user-access', Number(userId)], queryFn: () => get<Access>(`/admin/users/${userId}/access`), enabled: canUsers && !!userId, retry: false });
  const matchedUsers = useMemo(() => {
    const search = userSearch.trim().toLocaleLowerCase();
    return (users.data ?? []).filter(user => String(user.id) === userId || !search || `${user.displayName} ${user.accountName}`.toLocaleLowerCase().includes(search));
  }, [users.data, userSearch, userId]);
  const permissions = useMemo(() => {
    if (!access.data) return [];
    const granted = access.data.effectivePermissions.map(p => ({ ...p, restrictionReason: '', included: true }));
    const restricted = access.data.restrictedPermissions.map(p => ({ ...p, description: '', riskLevel: '', sources: [] as string[], included: false }));
    const search = permissionSearch.trim().toLocaleLowerCase();
    return [...granted, ...restricted].filter(p => (status === 'all' || (status === 'included') === p.included)
      && (!search || `${p.displayName} ${p.key} ${p.module} ${p.description}`.toLocaleLowerCase().includes(search)))
      .sort((a, b) => a.module.localeCompare(b.module) || a.displayName.localeCompare(b.displayName));
  }, [access.data, permissionSearch, status]);

  return <div className="access-control">
    <PageHead title="Access control" sub="Review access, manage assignments, and investigate changes from one place." />
    <nav className="access-nav" aria-label="Access control sections">
      <a href="#access-overview">Overview</a>
      {canUsers && <a href="#access-person">Users &amp; access</a>}
      {canUsers && canRoles && <a href="#access-simulation">Check access</a>}
      {canRoles && <a href="#access-roles">Roles &amp; permission matrix</a>}
      {canRoles && <a href="#access-conflicts">Incompatible roles</a>}
      {canRights && <Link to="/admin/rights">Advanced editor</Link>}
      {canAudit && <Link to="/admin/audit?category=Access">Access audit</Link>}
    </nav>
    <section id="access-overview" aria-labelledby="access-overview-title">
      <div className="access-section-heading"><div><h2 id="access-overview-title">Overview</h2><p>Current account and role assignments.</p></div></div>
      <div className="access-metrics">
        {canUsers && <Metric title="Active users" value={users.data?.filter(u => u.isActive).length} loading={users.isLoading} error={users.error} detail="Accounts currently active" />}
        {canRoles && <>
          <Metric title="Active roles" value={registry.data?.roles.filter(r => r.isActive).length} loading={registry.isLoading} error={registry.error} detail="Roles available for assignment" />
          <Metric title="Registered permissions" value={registry.data?.permissions.filter(p => p.isActive).length} loading={registry.isLoading} error={registry.error} detail="Active permissions in the catalog" />
          <Metric title="Unused roles" value={registry.data?.roles.filter(r => r.userCount === 0).length} loading={registry.isLoading} error={registry.error} detail="Roles with no active users" />
        </>}
      </div>
      <div className="access-layout">
        <section className="access-panel"><h3>Manage access</h3><p className="hint">Use the administration tools to review and change saved assignments.</p>
          <div className="access-links">
            {canUsers && <a href="#access-person"><strong>Users &amp; access</strong><span>Review and change assignments</span><span aria-hidden="true">→</span></a>}
            {canRoles && <a href="#access-roles"><strong>Roles and permission matrix</strong><span>Manage roles and stage permission changes</span><span aria-hidden="true">→</span></a>}
            {canRights && <Link to="/admin/rights"><strong>Advanced editor</strong><span>Compare role permissions</span><span aria-hidden="true">→</span></Link>}
          </div>
        </section>
        {canAudit && <section className="access-panel"><div className="access-panel-title"><h3>Recent access changes</h3><Link to="/admin/audit?category=Access">View history</Link></div>
          {audit.isLoading ? <StateMessage kind="loading" /> : audit.error ? <ErrorBox error={audit.error} /> : !audit.data?.items.length ? <p className="hint">No access changes found.</p> :
            <ul className="access-activity">{audit.data.items.map(a => <li key={a.id}><div><strong>{label(a.action)}</strong><span>{a.entityType}{a.entityLabel ? ` · ${a.entityLabel}` : ''}</span></div><small>{a.userName || 'System'} · {fmtDateTime(a.at)}</small></li>)}</ul>}
        </section>}
      </div>
    </section>
    {canRoles && (registry.error ? <ErrorBox error={registry.error} /> : registry.data && <AccessRoles registry={registry.data} users={canUsers ? users.data : undefined} onDirty={setRoleDirty} />)}
    {canRoles && registry.data && <AccessRoleConflicts roles={registry.data.roles} onDirty={setPolicyDirty} />}
    {canUsers && <section id="access-person" className="access-person" aria-labelledby="access-person-title">
      <div className="access-section-heading"><div><h2 id="access-person-title">Effective permissions</h2><p>Select a person to inspect the permission snapshot returned by the server.</p></div><Link className="btn" to="/admin/users">Manage users</Link></div>
      <div className="access-person-picker">
        <label>Find a user<input type="search" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Name or account" /></label>
        <label>User<select value={userId} onChange={e => { if ((overrideDirty || assignmentDirty) && !window.confirm('Discard the unsaved user access changes before selecting another user?')) return; setOverrideDirty(false); setAssignmentDirty(false); setUserId(e.target.value); }}><option value="">Select a user</option>{matchedUsers.map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.accountName}){u.isActive ? '' : ' · inactive'}</option>)}</select></label>
      </div>
      {users.error && <ErrorBox error={users.error} />}
      {!userId ? <p className="access-empty">Select a user to inspect their access.</p> : access.isLoading ? <StateMessage kind="loading" /> : access.error ? <ErrorBox error={access.error} /> : access.data && <>
        <div className="access-person-summary"><div><strong>{access.data.user.displayName}</strong><span>{access.data.user.accountName} · {access.data.user.isActive ? 'Active' : 'Inactive'}</span></div>
          <div><strong>Active roles</strong><span>{access.data.roles.map(r => r.name).join(', ') || 'None'}</span></div>
          <div><strong>Data scope</strong><span>{scopeSummary(access.data.scopes)}</span></div>
        </div>
        <p className="access-note">This snapshot shows registered permissions resolved for the account and their role sources. A real request can still be denied by prerequisite permissions, data scope, account state, or other server policies.</p>
        {canMaintainUsers && canRoles && registry.data && Number(userId) !== me?.id && users.data?.find(u => u.id === Number(userId)) &&
          <AccessUserAssignments key={userId} user={users.data.find(u => u.id === Number(userId))!} roles={registry.data.roles} onDirty={setAssignmentDirty} />}
        <div className="access-permission-filters"><label>Find a permission<input type="search" value={permissionSearch} onChange={e => setPermissionSearch(e.target.value)} placeholder="Name, module or key" /></label>
          <label>Snapshot status<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All permissions</option><option value="included">Included</option><option value="restricted">Not included</option></select></label>
          <span>{permissions.length} shown</span></div>
        <div className="access-table-wrap" role="region" aria-label="User permission snapshot" tabIndex={0}><table className="access-table"><thead><tr><th scope="col">Permission</th><th scope="col">Module</th><th scope="col">Snapshot</th><th scope="col">Source or restriction</th></tr></thead><tbody>
          {permissions.map(p => <tr key={p.key}><th scope="row"><strong>{p.displayName}</strong><code>{p.key}</code>{p.description && <small>{p.description}</small>}</th><td>{p.module}</td><td><span className={`access-status ${p.included ? 'included' : ''}`}>{p.included ? 'Included' : 'Not included'}</span>{p.riskLevel && /high|critical/i.test(p.riskLevel) && <small className="access-risk">{p.riskLevel} risk</small>}</td><td>{p.included ? p.sources.join(', ') || 'No source reported' : p.restrictionReason || 'Not included'}{p.effect && <small>Direct {p.effect.toLowerCase()}{p.overrideApplied === false ? ' · not applied to administrators' : ''}{p.expiresAt ? ` · expires ${fmtDateTime(p.expiresAt)}` : ''}</small>}</td></tr>)}
        </tbody></table>{permissions.length === 0 && <p className="access-empty">No permissions match these filters.</p>}</div>
        {canMaintainUsers && canRoles && registry.data && Number(userId) !== me?.id && <PermissionOverrides key={userId} userId={Number(userId)} permissions={registry.data.permissions} onDirty={setOverrideDirty} />}
      </>}
    </section>}
    {canUsers && canRoles && <div id="access-simulation" className="access-panel access-simulation"><PermissionSimulation /></div>}
  </div>;
}

function Metric({ title, value, loading, error, detail }: { title: string; value?: number; loading: boolean; error: unknown; detail: string }) {
  return <div className="access-metric"><span>{title}</span><strong>{loading ? '…' : error || value === undefined ? '—' : value}</strong><small>{error ? 'Unable to load' : detail}</small></div>;
}

function scopeSummary(scope: Access['scopes']) {
  if (!scope) return 'Unavailable';
  const clients = scope.allClients ? 'All clients' : `${scope.clientIds.length} clients, ${scope.projectIds.length} projects`;
  const teams = scope.allInternal ? 'all internal teams' : `${scope.teamIds.length} internal teams`;
  return `${clients}; ${teams}`;
}
