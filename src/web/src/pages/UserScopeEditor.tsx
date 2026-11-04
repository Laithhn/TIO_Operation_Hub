import { useState } from 'react';

export type UserScope = { kind: string; clientId?: number; projectId?: number; teamId?: number };

export type ScopeTargets = {
  clients: { id: number; code: string; name: string; archived: boolean }[];
  projects: { id: number; code: string; name: string; clientId: number }[];
  teams: { id: number; code: string; name: string }[];
};
export type UserScopeSelection = { allClients: boolean; allInternal: boolean; scopes: UserScope[] };

/** Assigns the user's direct data scope; directory group mappings may add further scope. */
export function UserScopeEditor({ value, targets, onChange, disabled = false }: {
  value: UserScopeSelection; targets: ScopeTargets; onChange: (value: UserScopeSelection) => void; disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const matches = (name: string, code: string) => `${name} ${code}`.toLocaleLowerCase().includes(query);
  const has = (kind: UserScope['kind'], id: number) => value.scopes.some(scope => scope.kind === kind &&
    (kind === 'Client' ? scope.clientId : kind === 'Project' ? scope.projectId : scope.teamId) === id);
  const toggle = (kind: UserScope['kind'], id: number, selected: boolean) => {
    const remaining = value.scopes.filter(scope => !(scope.kind === kind &&
      (kind === 'Client' ? scope.clientId : kind === 'Project' ? scope.projectId : scope.teamId) === id));
    const scope: UserScope = kind === 'Client' ? { kind, clientId: id } : kind === 'Project' ? { kind, projectId: id } : { kind, teamId: id };
    onChange({ ...value, scopes: selected ? [...remaining, scope] : remaining });
  };
  return <fieldset className="field wide" disabled={disabled}>
    <legend>Direct data scope</legend>
    <p className="hint">Choose the records this user may access. Permissions are still required for each action. Directory groups may add scope.</p>
    <label className="check-row"><input type="checkbox" checked={value.allClients} onChange={e => onChange({ ...value, allClients: e.target.checked })} /> All clients and projects</label>
    <label className="check-row"><input type="checkbox" checked={value.allInternal} onChange={e => onChange({ ...value, allInternal: e.target.checked })} /> All internal teams</label>
    <label className="field"><span>Search scope targets</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
    {([
      { title: 'Clients', kind: 'Client' as const, rows: targets.clients.filter(x => matches(x.name, x.code)) },
      { title: 'Projects', kind: 'Project' as const, rows: targets.projects.filter(x => matches(x.name, x.code)) },
      { title: 'Internal teams', kind: 'InternalTeam' as const, rows: targets.teams.filter(x => matches(x.name, x.code)) }
    ]).map(group => <details key={group.kind}>
      <summary>{group.title} ({value.scopes.filter(scope => scope.kind === group.kind).length} selected)</summary>
      {group.rows.length === 0 ? <p className="hint">No matching targets.</p> : group.rows.map(row => <label className="check-row" key={row.id}>
        <input type="checkbox" checked={has(group.kind, row.id)} onChange={e => toggle(group.kind, row.id, e.target.checked)} />
        <span>{row.code} — {row.name}{'archived' in row && row.archived ? ' (archived)' : ''}</span>
      </label>)}
    </details>)}
  </fieldset>;
}
