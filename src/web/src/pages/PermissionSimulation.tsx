import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { get, qs } from '../api';
import { ErrorBox } from '../ui/kit';

type User = { id: number; displayName: string; accountName: string; isActive: boolean };
type Permission = { key: string; displayName: string; module: string; isActive: boolean };
type Target = { id: number; code: string; name: string };
type Targets = { clients: Target[]; projects: Target[]; teams: Target[] };
type Prerequisite = { permission: string; reason: string; sources: string[]; directEffect?: string | null; expiresAt?: string | null };
type Result = { status: 'denied' | 'conditional'; reason: string; permission: string; scope: string; roles: string[]; missingPrerequisites: string[]; prerequisiteDetails: Prerequisite[]; sources: string[]; directEffect?: string | null; expiresAt?: string | null; directAllowApplied?: boolean };
type Check = { userId: string; permission: string; scope: string; scopeId?: string };

/** Evaluates only the server's capability and selected scope, never an actual business operation. */
export default function PermissionSimulation() {
  const [userId, setUserId] = useState('');
  const [permission, setPermission] = useState('');
  const [scope, setScope] = useState('none');
  const [scopeId, setScopeId] = useState('');
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => get<User[]>('/admin/users') });
  const catalog = useQuery({ queryKey: ['admin-roles'], queryFn: () => get<{ permissions: Permission[] }>('/admin/roles') });
  const targets = useQuery({ queryKey: ['scope-targets'], queryFn: () => get<Targets>('/admin/scope-targets') });
  const result = useMutation({ mutationFn: (check: Check) => get<Result>(`/admin/users/${check.userId}/access-simulation${qs({ permission: check.permission, scope: check.scope, scopeId: check.scopeId })}`) });
  const items = scope === 'client' ? targets.data?.clients : scope === 'project' ? targets.data?.projects : targets.data?.teams;
  const modules = [...new Set(catalog.data?.permissions.filter(p => p.isActive).map(p => p.module) ?? [])].sort();
  const checkedSelection = result.variables?.userId === userId && result.variables?.permission === permission && result.variables?.scope === scope
    && (scope === 'none' || result.variables?.scopeId === scopeId);
  const reset = () => result.reset();
  return <section aria-labelledby="access-simulation-title">
    <h2 id="access-simulation-title">Check access</h2>
    <p>Check a saved user’s effective permission and, optionally, a client, project or team scope. This does not run an action; ownership, workflow and other operation-specific checks still apply. Directory group memberships reflect the last observed sign-in and may have changed.</p>
    {users.error && <ErrorBox error={users.error} />}{catalog.error && <ErrorBox error={catalog.error} />}{targets.error && <ErrorBox error={targets.error} />}
    <div className="form-grid">
      <label>User<select value={userId} onChange={e => { setUserId(e.target.value); reset(); }}><option value="">Select a user</option>
        {users.data?.map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.accountName}){u.isActive ? '' : ' — inactive'}</option>)}</select></label>
      <label>Permission<select value={permission} onChange={e => { setPermission(e.target.value); reset(); }}><option value="">Select a permission</option>
        {modules.map(module => <optgroup key={module} label={module}>{catalog.data?.permissions.filter(p => p.isActive && p.module === module).map(p => <option key={p.key} value={p.key}>{p.displayName} — {p.key}</option>)}</optgroup>)}</select></label>
      <label>Scope<select value={scope} onChange={e => { setScope(e.target.value); setScopeId(''); reset(); }}><option value="none">No specific scope</option><option value="client">Client</option><option value="project">Project</option><option value="team">Internal team</option></select></label>
      {scope !== 'none' && <label>Scope target<select value={scopeId} onChange={e => { setScopeId(e.target.value); reset(); }}><option value="">Select a target</option>{items?.map(t => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}</select></label>}
    </div>
    <button className="btn btn-primary" disabled={result.isPending || !userId || !permission || (scope !== 'none' && !scopeId)} onClick={() => result.mutate({ userId, permission, scope, scopeId: scope === 'none' ? undefined : scopeId })}>Check access</button>
    {checkedSelection && result.isPending && <p role="status">Checking…</p>}{checkedSelection && result.error && <ErrorBox error={result.error} />}
    {checkedSelection && result.data && <div role="status"><h3>{result.data.status === 'denied' ? 'Denied' : result.data.scope === 'none' ? 'Capability passes; scope not checked' : 'Capability and scope pass'}</h3><p>{result.data.reason}</p>
      {result.data.roles.length > 0 && <p>Active roles: {result.data.roles.join(', ')}</p>}
      {result.data.sources?.length > 0 && <p>Assigned sources, subject to restrictions: {result.data.sources.join(', ')}</p>}
      {result.data.directEffect && <p>Direct exception: {result.data.directEffect}{result.data.directEffect === 'Allow' && result.data.directAllowApplied === false ? ' (not applied to administrators)' : ''}{result.data.expiresAt ? ` until ${new Date(result.data.expiresAt).toLocaleString()}` : ''}</p>}
      {result.data.prerequisiteDetails?.length > 0 ? <><p>Prerequisites that are not effective:</p><ul>{result.data.prerequisiteDetails.map(p => <li key={p.permission}><strong>{p.permission}</strong>: {p.reason}{p.sources.length > 0 ? `; assigned by ${p.sources.join(', ')}` : ''}{p.directEffect ? `; direct exception ${p.directEffect}` : ''}{p.expiresAt ? ` until ${new Date(p.expiresAt).toLocaleString()}` : ''}</li>)}</ul></> : result.data.missingPrerequisites.length > 0 && <p>Missing prerequisites: {result.data.missingPrerequisites.join(', ')}</p>}
    </div>}
  </section>;
}
