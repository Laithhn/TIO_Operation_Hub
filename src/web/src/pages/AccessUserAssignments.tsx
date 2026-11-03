import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, get, put } from '../api';
import { ErrorBox, StateMessage } from '../ui/kit';
import type { AccessRole } from './AccessRoles';
import { userAccessSettings, type UserScope } from './userAccessSettings';
import { UserScopeEditor, type ScopeTargets, type UserScopeSelection } from './UserScopeEditor';

export type AssignmentUser = {
  id: number; accountName: string; displayName: string; email?: string | null; workingTimeZone: string;
  roleIds?: number[]; roleId?: number | null; allClients: boolean; allInternal: boolean;
  grants: string[]; scopes: UserScope[]; version: string;
};

/** Stages changes against the complete stored user record; the server enforces delegation and concurrency. */
export function AccessUserAssignments({ user, roles, onDirty }: { user: AssignmentUser; roles: AccessRole[]; onDirty: (dirty: boolean) => void }) {
  const client = useQueryClient();
  const targets = useQuery({ queryKey: ['scope-targets'], queryFn: () => get<ScopeTargets>('/admin/scope-targets'), retry: false });
  const [base, setBase] = useState(user);
  const originalRoles = base.roleIds ?? (base.roleId ? [base.roleId] : []);
  const [roleIds, setRoleIds] = useState<number[]>(originalRoles);
  const [scope, setScope] = useState<UserScopeSelection>({ allClients: base.allClients, allInternal: base.allInternal, scopes: base.scopes });
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b).join(',');
  const dirty = sorted(roleIds) !== sorted(originalRoles) || JSON.stringify(scope) !== JSON.stringify({ allClients: base.allClients, allInternal: base.allInternal, scopes: base.scopes });
  const added = roles.filter(role => roleIds.includes(role.id) && !originalRoles.includes(role.id));
  const removed = roles.filter(role => !roleIds.includes(role.id) && originalRoles.includes(role.id));
  const scopeChanged = JSON.stringify(scope) !== JSON.stringify({ allClients: base.allClients, allInternal: base.allInternal, scopes: base.scopes });
  const stale = saved || user.version !== base.version;
  const complete = !!base.version && !!base.workingTimeZone && Array.isArray(base.grants) && Array.isArray(base.scopes) && (Array.isArray(base.roleIds) || base.roleId != null);
  useEffect(() => { onDirty(dirty && !saved); }, [dirty, saved, onDirty]);
  const scopeText = useMemo(() => (value: UserScopeSelection) => `${value.allClients ? 'All clients and projects' : 'Selected clients and projects'}; ${value.allInternal ? 'all internal teams' : 'selected internal teams'}; ${value.scopes.length} specific scope entries`, []);
  const reset = (next: AssignmentUser) => {
    setBase(next); setRoleIds(next.roleIds ?? (next.roleId ? [next.roleId] : []));
    setScope({ allClients: next.allClients, allInternal: next.allInternal, scopes: next.scopes });
    setReview(false); setError(null); setSaved(false); onDirty(false);
  };
  const save = async () => {
    setBusy(true); setError(null);
    try {
      await put(`/admin/users/${base.id}`, { accountName: base.accountName, displayName: base.displayName, email: base.email ?? '', workingTimeZone: base.workingTimeZone,
        roleIds, roles: [], ...userAccessSettings(base), ...scope }, base.version);
      setSaved(true); setReview(false); onDirty(false);
      await Promise.all([client.invalidateQueries({ queryKey: ['admin-users'] }), client.invalidateQueries({ queryKey: ['admin-user-access', base.id] }), client.invalidateQueries({ queryKey: ['admin-roles'] })]);
    } catch (e) { setError(e); } finally { setBusy(false); }
  };
  return <section className="access-overrides" aria-label="Role and scope assignments">
    <h3>Role and scope assignments</h3>
    <p className="hint">Change direct assignments here. Directory groups can provide additional roles and scope. The server checks delegation and other security rules when saving.</p>
    {!!error && <ErrorBox error={error} />}
    {error instanceof ApiError && error.isConflict && <p role="alert">The user changed on the server. Your draft is retained. <button className="linkbtn" onClick={() => void client.invalidateQueries({ queryKey: ['admin-users'] })}>Fetch latest user</button> before replacing the draft.</p>}
    {!complete && <p role="alert">The complete stored user record is unavailable. Assignments cannot be edited safely.</p>}
    {stale && <div className="notice warn">{saved ? 'Assignments saved. ' : 'This user changed on the server. '}
      {user.version !== base.version ? <button className="linkbtn" onClick={() => { if (!saved && dirty && !window.confirm('Discard the staged user assignments?')) return; reset(user); }}>Load latest user</button> : <span>Waiting for the latest user record.</span>}</div>}
    {complete && (targets.isLoading ? <StateMessage kind="loading" /> : targets.error ? <ErrorBox error={targets.error} /> : targets.data && <>
      <fieldset disabled={!complete || busy || stale}><legend>Direct roles</legend>
        {roles.map(role => <label className="check-row" key={role.id}><input type="checkbox" checked={roleIds.includes(role.id)} disabled={!role.isActive && !roleIds.includes(role.id)} onChange={e => { setRoleIds(e.target.checked ? [...roleIds, role.id] : roleIds.filter(id => id !== role.id)); setReview(false); }} />
          <span>{role.name}{role.isActive ? '' : ' · inactive'}{role.description ? ` — ${role.description}` : ''}</span></label>)}
      </fieldset>
      <UserScopeEditor value={scope} targets={targets.data} disabled={!complete || busy || stale} onChange={next => { setScope(next); setReview(false); }} />
      <div className="access-role-actions"><button className="btn btn-primary" disabled={!complete || busy || stale || !dirty} onClick={() => setReview(true)}>Review assignments</button>
        <button className="btn" disabled={busy || stale || !dirty} onClick={() => { if (window.confirm('Discard the staged user assignments?')) reset(base); }}>Discard assignments</button></div>
      {review && <div className="override-review" role="region" aria-label="Review user assignments"><h4>Review assignments for {base.displayName}</h4>
        <p>These are direct assignments; the server also evaluates directory groups, exceptions and security restrictions.</p>
        {added.length > 0 && <p>Roles added: {added.map(role => role.name).join(', ')}</p>}
        {removed.length > 0 && <p>Roles removed: {removed.map(role => role.name).join(', ')}</p>}
        {scopeChanged && <><p>Current scope: {scopeText({ allClients: base.allClients, allInternal: base.allInternal, scopes: base.scopes })}.</p><p>New scope: {scopeText(scope)}.</p>
          <ul>{[...base.scopes.filter(s => !scope.scopes.some(next => next.kind === s.kind && (next.clientId ?? next.projectId ?? next.teamId) === (s.clientId ?? s.projectId ?? s.teamId))).map(s => ({ s, action: 'Remove' })),
            ...scope.scopes.filter(s => !base.scopes.some(previous => previous.kind === s.kind && (previous.clientId ?? previous.projectId ?? previous.teamId) === (s.clientId ?? s.projectId ?? s.teamId))).map(s => ({ s, action: 'Add' }))].map(({ s, action }, i) => {
            const target = s.kind === 'Client' ? targets.data.clients.find(t => t.id === s.clientId) : s.kind === 'Project' ? targets.data.projects.find(t => t.id === s.projectId) : targets.data.teams.find(t => t.id === s.teamId);
            return <li key={i}>{action} {s.kind}: {target ? `${target.code} — ${target.name}` : `#${s.clientId ?? s.projectId ?? s.teamId}`}</li>;
          })}</ul></>}
        <div className="access-role-actions"><button className="btn" disabled={busy} onClick={() => setReview(false)}>Back to assignments</button><button className="btn btn-primary" disabled={busy || stale} onClick={save}>Confirm and save assignments</button></div></div>}
    </>)}
  </section>;
}
