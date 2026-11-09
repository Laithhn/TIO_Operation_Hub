import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { get, type Paged } from '../api';
import { fmtDateTime, label } from '../format';
import { useLeaveGuard, useMe, useRight } from '../hooks';
import { canAccessPath } from '../rights';
import { ErrorBox, PageHead, StateMessage } from '../ui/kit';
import AccessCheck from './AccessCheck';
import { RightExceptions } from './RightExceptions';
import { AccessRoleConflicts } from './AccessRoleConflicts';
import type { RightDefinition } from './adminRightsModel';
import './access-control.css';

type User = { id: number; displayName: string; accountName: string; isActive: boolean };
type Registry = { catalog: RightDefinition[]; roles: { id: number; name: string; isActive: boolean; isLocked: boolean; userCount: number }[] };
type Audit = { id: number; at: string; userName?: string; action: string; entityType: string; entityLabel?: string };
type Access = {
  user: User;
  roles: { id: number; name: string }[];
  effectiveRights: { key: string; label: string; description: string; module: string; riskLevel: string; sources: string[]; effect?: string | null; expiresAt?: string | null; exceptionApplied?: boolean }[];
  restrictedRights: { key: string; label: string; module: string; effect?: string | null; expiresAt?: string | null; restrictionReason?: string; exceptionApplied?: boolean }[];
  scopes: { allClients: boolean; clientIds: number[]; projectIds: number[]; allInternal: boolean; teamIds: number[] } | null;
  scopedExceptions?: { key: string; effect: string; expiresAt?: string | null; scope?: string | null; applied: boolean }[];
  directoryEvidence?: { source: 'live' | 'lastObserved' | 'notApplicable' | 'unavailable'; observedAt?: string | null };
};

/** Why someone can or cannot do something: a person's effective rights and their sources, individual exceptions, the access check and incompatible roles. */
export function AccessControl() {
  const me = useMe().data;
  const canUsers = canAccessPath(me, '/admin/users');
  const canRoles = canAccessPath(me, '/admin/roles');
  const canRights = canAccessPath(me, '/admin/rights');
  const canReadHistory = canAccessPath(me, '/admin/audit');
  const canMaintainUsers = useRight('AdminUsers', 'Maintain');
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => get<User[]>('/admin/users'), enabled: canUsers, retry: false });
  const registry = useQuery({ queryKey: ['admin-roles'], queryFn: () => get<Registry>('/admin/roles'), enabled: canRoles, retry: false });
  const audit = useQuery({ queryKey: ['access-overview-audit'], queryFn: () => get<Paged<Audit>>('/admin/audit?category=Access&pageSize=5'), enabled: canReadHistory, retry: false });
  const [userId, setUserId] = useState('');
  const [overrideDirty, setOverrideDirty] = useState(false);
  const [policyDirty, setPolicyDirty] = useState(false);
  useLeaveGuard(overrideDirty || policyDirty);
  useEffect(() => {
    if (!overrideDirty && !policyDirty) return;
    const preventLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', preventLeave);
    return () => window.removeEventListener('beforeunload', preventLeave);
  }, [overrideDirty, policyDirty]);
  const [userSearch, setUserSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [status, setStatus] = useState('all');
  const access = useQuery({ queryKey: ['admin-user-access', Number(userId)], queryFn: () => get<Access>(`/admin/users/${userId}/access`), enabled: canUsers && !!userId, retry: false });
  const matchedUsers = useMemo(() => {
    const search = userSearch.trim().toLocaleLowerCase();
    return (users.data ?? []).filter(user => String(user.id) === userId || !search || `${user.displayName} ${user.accountName}`.toLocaleLowerCase().includes(search));
  }, [users.data, userSearch, userId]);
  const rights = useMemo(() => {
    if (!access.data) return [];
    const granted = access.data.effectiveRights.map(p => ({ ...p, restrictionReason: '', included: true }));
    const restricted = access.data.restrictedRights.map(p => ({ ...p, description: '', riskLevel: '', sources: [] as string[], included: false }));
    const search = rightSearch.trim().toLocaleLowerCase();
    return [...granted, ...restricted].filter(p => (status === 'all' || (status === 'included') === p.included)
      && (!search || `${p.label} ${p.key} ${p.module} ${p.description}`.toLocaleLowerCase().includes(search)))
      .sort((a, b) => a.module.localeCompare(b.module) || a.label.localeCompare(b.label));
  }, [access.data, rightSearch, status]);

  return <div className="access-control">
    <PageHead title="Access review" sub="See what a person can do and why, check one right, and manage individual exceptions and incompatible roles." />
    <nav className="access-nav" aria-label="Access review sections">
      <a href="#access-overview">Overview</a>
      {canUsers && <a href="#access-person">A person's access</a>}
      {canUsers && canRoles && <a href="#access-simulation">Check access</a>}
      {canRoles && <a href="#access-conflicts">Incompatible roles</a>}
      {canUsers && <Link to="/admin/users">Users</Link>}
      {canRoles && <Link to="/admin/roles">Roles</Link>}
      {canRights && <Link to="/admin/rights">Rights</Link>}
      {canReadHistory && <Link to="/admin/audit?category=Access">Access history</Link>}
    </nav>
    <section id="access-overview" aria-labelledby="access-overview-title">
      <div className="access-section-heading"><div><h2 id="access-overview-title">Overview</h2><p>Current account and role assignments.</p></div></div>
      <div className="access-metrics">
        {canUsers && <Metric title="Active users" value={users.data?.filter(u => u.isActive).length} loading={users.isLoading} error={users.error} detail="Accounts currently active" />}
        {canRoles && <>
          <Metric title="Active roles" value={registry.data?.roles.filter(r => r.isActive).length} loading={registry.isLoading} error={registry.error} detail="Roles available for assignment" />
          <Metric title="Rights in the catalog" value={registry.data?.catalog.filter(p => p.isActive).length} loading={registry.isLoading} error={registry.error} detail="Defined by the application" />
          <Metric title="Unused roles" value={registry.data?.roles.filter(r => r.userCount === 0).length} loading={registry.isLoading} error={registry.error} detail="Roles with no active users" />
        </>}
      </div>
      <div className="access-layout">
        <section className="access-panel"><h3>Manage access</h3><p className="hint">Users hold roles, roles hold rights.</p>
          <div className="access-links">
            {canUsers && <Link to="/admin/users"><strong>Users</strong><span>Accounts, roles and data scope</span><span aria-hidden="true">→</span></Link>}
            {canRoles && <Link to="/admin/roles"><strong>Roles</strong><span>Create, clone, compare and see who holds a role</span><span aria-hidden="true">→</span></Link>}
            {canRights && <Link to="/admin/rights"><strong>Rights</strong><span>The catalog, and what each role may do</span><span aria-hidden="true">→</span></Link>}
          </div>
        </section>
        {canReadHistory && <section className="access-panel"><div className="access-panel-title"><h3>Recent access changes</h3><Link to="/admin/audit?category=Access">View history</Link></div>
          {audit.isLoading ? <StateMessage kind="loading" /> : audit.error ? <ErrorBox error={audit.error} /> : !audit.data?.items.length ? <p className="hint">No access changes found.</p> :
            <ul className="access-activity">{audit.data.items.map(a => <li key={a.id}><div><strong>{label(a.action)}</strong><span>{a.entityType}{a.entityLabel ? ` · ${a.entityLabel}` : ''}</span></div><small>{a.userName || 'System'} · {fmtDateTime(a.at)}</small></li>)}</ul>}
        </section>}
      </div>
    </section>
    {canRoles && registry.data && <AccessRoleConflicts roles={registry.data.roles} onDirty={setPolicyDirty} />}
    {canUsers && <section id="access-person" className="access-person" aria-labelledby="access-person-title">
      <div className="access-section-heading"><div><h2 id="access-person-title">A person's effective rights</h2><p>Select a person to see their rights as the server resolves them, and where each comes from.</p></div><Link className="btn" to="/admin/users">Manage users</Link></div>
      <div className="access-person-picker">
        <label>Find a user<input type="search" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Name or account" /></label>
        <label>User<select value={userId} onChange={e => { if (overrideDirty && !window.confirm('Discard the unsaved user access changes before selecting another user?')) return; setOverrideDirty(false); setUserId(e.target.value); }}><option value="">Select a user</option>{matchedUsers.map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.accountName}){u.isActive ? '' : ' · inactive'}</option>)}</select></label>
      </div>
      {users.error && <ErrorBox error={users.error} />}
      {!userId ? <p className="access-empty">Select a user to inspect their access.</p> : access.isLoading ? <StateMessage kind="loading" /> : access.error ? <ErrorBox error={access.error} /> : access.data && <>
        <div className="access-person-summary"><div><strong>{access.data.user.displayName}</strong><span>{access.data.user.accountName} · {access.data.user.isActive ? 'Active' : 'Inactive'}</span></div>
          <div><strong>Active roles</strong><span>{access.data.roles.map(r => r.name).join(', ') || 'None'}</span></div>
          <div><strong>Data scope</strong><span>{scopeSummary(access.data.scopes)}</span></div>
          {access.data.directoryEvidence && access.data.directoryEvidence.source !== 'notApplicable' && <div><strong>Directory groups</strong><span>{directoryEvidence(access.data.directoryEvidence)}</span></div>}
          {(access.data.scopedExceptions?.length ?? 0) > 0 && <div><strong>Limited exceptions</strong><span>{access.data.scopedExceptions!.map(s => `${s.effect} ${s.key} — ${s.scope ?? 'scope'}${s.expiresAt ? ` until ${new Date(s.expiresAt).toLocaleString()}` : ''}${s.applied ? '' : ' (not applied to administrators)'}`).join('; ')}</span></div>}
        </div>
        <p className="access-note">These are the rights the server resolves for this account, and the roles they come from. A real request can still be denied by a missing prerequisite, data scope, account state, or other server policies.</p>
        <div className="access-permission-filters"><label>Find a right<input type="search" value={rightSearch} onChange={e => setRightSearch(e.target.value)} placeholder="Name, module or key" /></label>
          <label>Snapshot status<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All rights</option><option value="included">Included</option><option value="restricted">Not included</option></select></label>
          <span>{rights.length} shown</span></div>
        <div className="access-table-wrap" role="region" aria-label="Effective rights of this person" tabIndex={0}><table className="access-table"><thead><tr><th scope="col">Right</th><th scope="col">Module</th><th scope="col">Snapshot</th><th scope="col">Source or restriction</th></tr></thead><tbody>
          {rights.map(p => <tr key={p.key}><th scope="row"><strong>{p.label}</strong><code>{p.key}</code>{p.description && <small>{p.description}</small>}</th><td>{p.module}</td><td><span className={`access-status ${p.included ? 'included' : ''}`}>{p.included ? 'Included' : 'Not included'}</span>{p.riskLevel && /high|critical/i.test(p.riskLevel) && <small className="access-risk">{p.riskLevel} risk</small>}</td><td>{p.included ? p.sources.join(', ') || 'No source reported' : p.restrictionReason || 'Not included'}{p.effect && <small>Direct {p.effect.toLowerCase()}{p.exceptionApplied === false ? ' · not applied to administrators' : ''}{p.expiresAt ? ` · expires ${fmtDateTime(p.expiresAt)}` : ''}</small>}</td></tr>)}
        </tbody></table>{rights.length === 0 && <p className="access-empty">No rights match these filters.</p>}</div>
        {canMaintainUsers && canRoles && registry.data && Number(userId) !== me?.id && <RightExceptions key={userId} userId={Number(userId)} catalog={registry.data.catalog} onDirty={setOverrideDirty} />}
      </>}
    </section>}
    {canUsers && canRoles && <div id="access-simulation" className="access-panel access-simulation"><AccessCheck /></div>}
  </div>;
}

function Metric({ title, value, loading, error, detail }: { title: string; value?: number; loading: boolean; error: unknown; detail: string }) {
  return <div className="access-metric"><span>{title}</span><strong>{loading ? '…' : error || value === undefined ? '—' : value}</strong><small>{error ? 'Unable to load' : detail}</small></div>;
}

function directoryEvidence(evidence: NonNullable<Access['directoryEvidence']>) {
  if (evidence.source === 'live') return 'Current membership from the directory';
  if (evidence.source === 'unavailable') return 'Unavailable until the person signs in again; access is evaluated without them';
  return `Last observed at sign-in${evidence.observedAt ? ` (${new Date(evidence.observedAt).toLocaleString()})` : ''}; may have changed since`;
}

function scopeSummary(scope: Access['scopes']) {
  if (!scope) return 'Unavailable';
  const clients = scope.allClients ? 'All clients' : `${scope.clientIds.length} clients, ${scope.projectIds.length} projects`;
  const teams = scope.allInternal ? 'all internal teams' : `${scope.teamIds.length} internal teams`;
  return `${clients}; ${teams}`;
}
