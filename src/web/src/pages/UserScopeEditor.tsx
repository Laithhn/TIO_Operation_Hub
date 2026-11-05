import { useState } from 'react';

export type UserScope = { kind: string; clientId?: number; projectId?: number; teamId?: number };

export type ScopeTargets = {
  clients: { id: number; code: string; name: string; archived: boolean }[];
  projects: { id: number; code: string; name: string; clientId: number }[];
  teams: { id: number; code: string; name: string }[];
};
export type UserScopeSelection = { allClients: boolean; allInternal: boolean; scopes: UserScope[] };

type Kind = 'Client' | 'Project' | 'InternalTeam';
type Row = { id: number; code: string; name: string; archived?: boolean };

const idOf = (scope: UserScope) => (scope.kind === 'Client' ? scope.clientId : scope.kind === 'Project' ? scope.projectId : scope.teamId);
const scopeOf = (kind: Kind, id: number): UserScope => (kind === 'Client' ? { kind, clientId: id } : kind === 'Project' ? { kind, projectId: id } : { kind, teamId: id });

/**
 * Assigns the user's direct data scope; directory group mappings may add further scope.
 * One list at a time, one record per line, with what is already chosen always in view, so a long list can be searched and scanned quickly.
 */
export function UserScopeEditor({ value, targets, onChange, disabled = false }: {
  value: UserScopeSelection; targets: ScopeTargets; onChange: (value: UserScopeSelection) => void; disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Kind>('Client');
  const query = search.trim().toLocaleLowerCase();
  const groups: { title: string; kind: Kind; rows: Row[]; coveredBy: string | null }[] = [
    { title: 'Clients', kind: 'Client', rows: targets.clients, coveredBy: value.allClients ? 'All clients and projects' : null },
    { title: 'Projects', kind: 'Project', rows: targets.projects, coveredBy: value.allClients ? 'All clients and projects' : null },
    { title: 'Internal teams', kind: 'InternalTeam', rows: targets.teams, coveredBy: value.allInternal ? 'All internal teams' : null }
  ];
  const group = groups.find(g => g.kind === tab)!;
  const shown = group.rows.filter(row => `${row.name} ${row.code}`.toLocaleLowerCase().includes(query));
  const chosen = (kind: Kind) => value.scopes.filter(scope => scope.kind === kind);
  const chosenIds = new Set(chosen(tab).map(idOf));
  const chosenRows = group.rows.filter(row => chosenIds.has(row.id));
  const toggle = (kind: Kind, id: number, selected: boolean) => {
    const remaining = value.scopes.filter(scope => !(scope.kind === kind && idOf(scope) === id));
    onChange({ ...value, scopes: selected ? [...remaining, scopeOf(kind, id)] : remaining });
  };
  const setShown = (selected: boolean) => {
    const ids = new Set(shown.map(row => row.id));
    const remaining = value.scopes.filter(scope => !(scope.kind === tab && ids.has(idOf(scope) ?? -1)));
    onChange({ ...value, scopes: selected ? [...remaining, ...shown.map(row => scopeOf(tab, row.id))] : remaining });
  };
  return <fieldset className="field wide scope-editor" disabled={disabled}>
    <legend>Direct data scope</legend>
    <p className="hint">Choose the records this user may access. Permissions are still required for each action. Directory groups may add scope.</p>
    <div className="scope-all">
      <label className="check-row"><input type="checkbox" checked={value.allClients} onChange={e => onChange({ ...value, allClients: e.target.checked })} /> All clients and projects</label>
      <label className="check-row"><input type="checkbox" checked={value.allInternal} onChange={e => onChange({ ...value, allInternal: e.target.checked })} /> All internal teams</label>
    </div>
    <div className="scope-tabs" role="group" aria-label="Kind of record">
      {groups.map(g => <button key={g.kind} type="button" className={`scope-tab${g.kind === tab ? ' on' : ''}`} aria-pressed={g.kind === tab} onClick={() => setTab(g.kind)}>
        {g.title} ({chosen(g.kind).length} selected)
      </button>)}
    </div>
    {group.coveredBy
      ? <p className="notice scope-covered">{group.coveredBy} is ticked, so every record here is included. Untick it to choose records one by one.</p>
      : <>
        {chosenRows.length > 0 && <ul className="scope-chips" aria-label={`Selected ${group.title.toLocaleLowerCase()}`}>
          {chosenRows.map(row => <li key={row.id} className="scope-chip">
            <span>{row.code}</span>
            <button type="button" aria-label={`Remove ${row.code}`} title={`Remove ${row.name}`} onClick={() => toggle(tab, row.id, false)}>×</button>
          </li>)}
        </ul>}
        <div className="scope-tools">
          <label className="field scope-search"><span>Search scope targets</span><input className="input" type="search" placeholder="Code or name" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <button type="button" className="linkbtn" disabled={shown.length === 0} onClick={() => setShown(true)}>Select all shown</button>
          <button type="button" className="linkbtn" disabled={!shown.some(row => chosenIds.has(row.id))} onClick={() => setShown(false)}>Clear shown</button>
        </div>
        {shown.length === 0
          ? <p className="hint">No matching targets.</p>
          : <div className="scope-list">
            {shown.map(row => <label className="scope-row" key={row.id}>
              <input type="checkbox" checked={chosenIds.has(row.id)} onChange={e => toggle(tab, row.id, e.target.checked)} />
              <span className="scope-code">{row.code}</span><span className="scope-sep"> — </span>
              <span className="scope-name">{row.name}{row.archived ? ' (archived)' : ''}</span>
            </label>)}
          </div>}
      </>}
  </fieldset>;
}
