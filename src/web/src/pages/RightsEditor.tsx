import { useEffect, useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { put } from '../api';
import { useForm, useLeaveGuard, useRefresh, useRight } from '../hooks';
import { Badge, Dialog, FormError, Panel, StateMessage, useToast } from '../ui/kit';
import { assignedCount, filterRights, gridRights, groupRights, isGranted, missingPrerequisites, newlyBlocked, prerequisiteWarnings, reviewGroups, rightChanges, sensitive, setRights, sortedRights, withPrerequisites,
  type RightDefinition, type RightFilters, type RoleDef } from './adminRightsModel';
import './admin-rights.css';

type RightsView = 'grid' | 'list';
export type RightsPrefs = { filters: RightFilters; compareId: string; view: RightsView; open: string[] };
const emptyFilters: RightFilters = { search: '', module: '', feature: '', kind: '', risk: '', assignment: '' };
const VIEW_KEY = 'tio.rights.view';

/** The remembered view is a convenience for this browser only; the page works the same without storage. */
export function initialRightsPrefs(search: string): RightsPrefs {
  let view: RightsView = 'grid';
  try { if (window.localStorage.getItem(VIEW_KEY) === 'list') view = 'list'; } catch { /* storage unavailable */ }
  return { filters: { ...emptyFilters, search }, compareId: '', view, open: [] };
}

function Coverage({ held, total, label }: { held: number; total: number; label?: string }) {
  return <span className="rights-coverage" role="img" aria-label={`${label ? `${label}: ` : ''}${held} of ${total} assigned`}>
    <span className="rights-coverage-bar"><span style={{ width: total ? `${Math.round(held / total * 100)}%` : 0 }} /></span>
    <span className="rights-coverage-text">{held} / {total}</span>
  </span>;
}

const activeTotal = (rows: RightDefinition[]) => rows.filter(r => r.isActive).length;

export function RoleRightsEditor({ role, roles, catalog, prefs, onPrefs, onRoleChange, onDirty, reload }: {
  role: RoleDef; roles: RoleDef[]; catalog: RightDefinition[]; prefs: RightsPrefs; onPrefs: Dispatch<SetStateAction<RightsPrefs>>;
  onRoleChange: (id: string) => void; onDirty: (dirty: boolean) => void; reload: () => Promise<RoleDef | undefined>;
}) {
  const toast = useToast();
  const refresh = useRefresh();
  const [base, setBase] = useState(role);
  const [groupChange, setGroupChange] = useState<{ label: string; rows: RightDefinition[]; grant: boolean } | null>(null);
  const [review, setReview] = useState(false);
  const f = useForm<{ rights: string[] }>({ rights: [...role.rights].sort() });
  const draft = f.values.rights;
  useLeaveGuard(f.dirty);
  useEffect(() => { onDirty(f.dirty); }, [f.dirty, onDirty]);
  const { filters, view, open } = prefs;
  const stale = base.version !== role.version;
  const rows = useMemo(() => sortedRights(catalog), [catalog]);
  const byKey = useMemo(() => new Map(rows.map(r => [r.key, r])), [rows]);
  const allGroups = useMemo(() => groupRights(rows), [rows]);
  const compare = roles.find(r => String(r.id) === prefs.compareId && r.id !== role.id);
  // 'different' means nothing without a comparison, so it falls away with it.
  const effective = !compare && filters.assignment === 'different' ? { ...filters, assignment: '' } : filters;
  const visible = filterRights(rows, effective, draft, base.rights, compare?.rights);
  const groups = groupRights(visible);
  const grid = gridRights(visible, rows);
  const activeFilters = Object.values(effective).filter(Boolean).length;
  const changes = rightChanges(base.rights, draft, rows);
  const changeCount = changes.grants.length + changes.revocations.length;
  const warnings = prerequisiteWarnings(rows, draft);
  const blockedBySave = newlyBlocked(rows, base.rights, draft);
  const canMaintain = useRight('AdminRoles', 'Maintain');
  const disabled = base.isLocked || f.busy || !canMaintain;
  const sensitiveHeld = rows.filter(r => r.isActive && sensitive(r) && isGranted(draft, r)).length;
  const featureOptions = [...new Map(rows.filter(r => !filters.module || r.module === filters.module).map(r => [r.feature, r.featureLabel]))];
  const update = (next: Partial<RightsPrefs>) => onPrefs(p => ({ ...p, ...next }));
  const updateFilter = (key: keyof RightFilters, value: string) => onPrefs(p => ({ ...p, filters: { ...p.filters, [key]: value } }));
  const setDraft = (rights: string[]) => f.setValues({ rights });
  const setView = (next: RightsView) => {
    update({ view: next });
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable */ }
  };
  const reset = (latest: RoleDef) => { setBase(latest); f.reset({ rights: [...latest.rights].sort() }); setReview(false); };
  const reloadLatest = async () => {
    if (f.dirty && !window.confirm('Discard the staged changes and reload the latest saved rights?')) return;
    const latest = await reload(); if (latest) reset(latest);
  };
  const save = async () => {
    const ok = await f.submit(async values => {
      await put(`/admin/roles/${base.id}`, { name: base.name, description: base.description ?? null, isActive: base.isActive, rights: values.rights }, base.version);
      return true;
    });
    if (ok) {
      setReview(false); onDirty(false); toast(`Rights saved for ${base.name}.`);
      const latest = await reload(); if (latest) reset(latest);
      await refresh();
    } else setReview(false);
  };
  const rightName = (key: string) => { const r = byKey.get(key); return r ? `${r.featureLabel}: ${r.label}` : key; };
  const checkbox = (row: RightDefinition) => ({
    type: 'checkbox' as const, checked: isGranted(draft, row), disabled: disabled || !row.isActive && !isGranted(draft, row),
    'aria-label': `${row.featureLabel}: ${row.label} for ${base.name}`, onChange: (e: ChangeEvent<HTMLInputElement>) => setDraft(setRights(draft, [row], e.target.checked))
  });
  const compareState = (row: RightDefinition) => !compare ? '' : !compare.isActive ? 'Role inactive' : isGranted(compare.rights, row) ? 'Assigned' : 'Not assigned';
  const differs = (row: RightDefinition) => !!compare && isGranted(compare.rights, row) !== isGranted(draft, row);
  const bulkButtons = (name: string, groupRows: RightDefinition[]) => <>
    <button className="linkbtn" disabled={disabled || !groupRows.some(r => r.isActive && !isGranted(draft, r))}
      aria-label={`Grant shown rights in ${name}`} onClick={() => setGroupChange({ label: name, rows: groupRows.filter(r => r.isActive), grant: true })}>Grant all shown</button>
    <button className="linkbtn danger-link" disabled={disabled || !groupRows.some(r => isGranted(draft, r))}
      aria-label={`Revoke shown rights in ${name}`} onClick={() => setGroupChange({ label: name, rows: groupRows, grant: false })}>Revoke all shown</button>
  </>;
  const gridCell = (row: RightDefinition) => {
    const changed = isGranted(base.rights, row) !== isGranted(draft, row);
    const missing = row.isActive && isGranted(draft, row) ? missingPrerequisites(row, draft) : [];
    const notes = [`${row.label}.`, row.description, sensitive(row) ? `${row.riskLevel} sensitivity.` : '', !row.isActive ? 'Retired.' : '', changed ? 'Staged, not saved.' : '',
      missing.length ? `Missing prerequisite: ${missing.map(rightName).join(', ')}.` : '', compare ? `${compare.name}: ${compareState(row)}.` : ''].filter(Boolean).join(' ');
    return <td key={row.key} className={`rights-grid-cell${changed ? ' changed' : ''}${differs(row) ? ' differs' : ''}`} title={notes}>
      <label><input {...checkbox(row)} aria-description={notes} />
        {sensitive(row) && <span className="rights-mark sensitive" aria-hidden="true">▲</span>}
        {missing.length > 0 && <span className="rights-mark blocked" aria-hidden="true">!</span>}
        {changed && <span className="rights-mark staged" aria-hidden="true">●</span>}
      </label>
      {compare && <span className="rights-grid-compare" aria-hidden="true">{isGranted(compare.rights, row) ? '✓' : '–'}</span>}
    </td>;
  };
  const listRow = (row: RightDefinition) => {
    const changed = isGranted(base.rights, row) !== isGranted(draft, row);
    const missing = missingPrerequisites(row, draft);
    const held = isGranted(draft, row);
    return <section key={row.key} className="rights-node">
      <div className={`rights-leaf${compare ? ' compare' : ''}${changed ? ' changed' : ''}`}>
        <div>
          <label><input {...checkbox(row)} />
            <span className="rights-permission-title">{row.label}{row.kind === 'Access' && <Badge>Access</Badge>}{sensitive(row) && <Badge tone="warn">{row.riskLevel}</Badge>}{!row.isActive && <Badge>Retired</Badge>}{changed && <Badge tone="info">Staged</Badge>}</span></label>
          <code className="rights-permission-key">{row.key}</code>
        </div>
        <div className="rights-leaf-detail">
          <p>{row.description}</p>
          {row.requires.length > 0 && <p className="rights-requires">Requires {row.requires.map(key => <span key={key} className={`rights-chip${held && missing.includes(key) ? ' missing' : ''}`}>{rightName(key)}</span>)}
            {held && missing.length > 0 && !disabled && <button className="linkbtn" aria-label={`Add what ${row.featureLabel}: ${row.label} requires`} onClick={() => setDraft(setRights(draft, rows.filter(r => withPrerequisites([row.key], rows).includes(r.key)), true))}>Add {missing.length === 1 ? 'it' : 'them'}</button>}</p>}
        </div>
        {compare && <div className={`rights-decision${differs(row) ? ' differs' : ''}`}><small>{compare.name}</small><strong>{compareState(row)}</strong></div>}
      </div>
    </section>;
  };
  return <div className="rights-workspace">
    <Panel>
      <div className="rights-controls">
        <label>Role<select value={role.id} disabled={f.busy} onChange={e => onRoleChange(e.target.value)}>{roles.map(r => <option value={r.id} key={r.id}>{r.name}{r.isLocked ? ' · protected' : ''}{!r.isActive ? ' · inactive' : ''}</option>)}</select></label>
        <label>Compare with role<select value={compare ? prefs.compareId : ''} onChange={e => update({ compareId: e.target.value })}>
          <option value="">No comparison</option>{roles.filter(r => r.id !== role.id).map(r => <option value={r.id} key={r.id}>{r.name}{!r.isActive ? ' · inactive' : ''}</option>)}
        </select></label>
      </div>
      {base.description && <p className="hint rights-role-description">{base.description}</p>}
      <dl className="rights-stats">
        <div><dt>Status</dt><dd>{base.isLocked ? <Badge tone="info">Protected</Badge> : <Badge tone={base.isActive ? 'good' : 'warn'}>{base.isActive ? 'Active' : 'Inactive'}</Badge>}</dd></div>
        <div className="wide"><dt>Rights assigned</dt><dd><Coverage held={assignedCount(rows, draft)} total={activeTotal(rows)} /></dd></div>
        <div><dt>Sensitive rights</dt><dd>{sensitiveHeld}</dd></div>
        <div><dt>People holding it directly</dt><dd>{base.userCount}</dd></div>
        <div><dt>Missing prerequisites</dt><dd>{warnings.length}</dd></div>
      </dl>
      <details className="rights-help"><summary>How rights combine</summary>
        <p className="hint">Unassigned rights are denied. A person's rights combine across their active roles. A right works only when its prerequisites are held too, and data scope decides which records it reaches. Individual exceptions can change the result for one person. Access rights open a feature; action rights allow what can be done in it.</p></details>
      {!base.isActive && <div className="notice warn">This role is inactive. Its rights give nobody access until it is activated.</div>}
      {base.isLocked && <div className="notice">The protected role always holds every right. Clone it under Manage roles to make a role you can change.</div>}
    </Panel>
    <FormError error={f.error} fields={[]} />
    {(stale || f.error?.isConflict) && <div className="notice warn" role="alert">This role has changed since editing started. Your draft is retained. <button className="linkbtn" onClick={reloadLatest}>Reload latest</button></div>}
    {warnings.length > 0 && <div className="notice warn rights-prerequisites">
      <div className="rights-toolbar"><strong>{warnings.length} assigned right{warnings.length === 1 ? ' has' : 's have'} a missing prerequisite</strong>
        <div><button className="linkbtn" onClick={() => updateFilter('assignment', 'blocked')}>Show them</button>
          {!disabled && <button className="btn" onClick={() => setDraft(withPrerequisites(draft, rows))}>Add the missing prerequisites</button>}</div></div>
      <p>Assigning a right does not add its prerequisites. Without them it works only for people who get them from another role.</p>
    </div>}
    <div className="rights-filterbar">
      <div className="rights-controls">
        <label>Search rights<input type="search" placeholder="Name, key or description" value={filters.search} onChange={e => updateFilter('search', e.target.value)} /></label>
        <label>Module<select value={filters.module} onChange={e => onPrefs(p => ({ ...p, filters: { ...p.filters, module: e.target.value, feature: '' } }))}><option value="">All modules</option>{allGroups.map(g => <option key={g.key}>{g.key}</option>)}</select></label>
        <label>Feature<select value={filters.feature} onChange={e => updateFilter('feature', e.target.value)}><option value="">All features</option>{featureOptions.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
        <label>Kind<select value={filters.kind} onChange={e => updateFilter('kind', e.target.value)}><option value="">Access and action</option><option>Access</option><option>Action</option></select></label>
        <label>Sensitivity<select value={filters.risk} onChange={e => updateFilter('risk', e.target.value)}><option value="">All sensitivity levels</option>{[...new Set(rows.map(r => r.riskLevel))].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Assignment<select value={effective.assignment} onChange={e => updateFilter('assignment', e.target.value)}><option value="">All rights</option><option value="granted">Assigned</option><option value="denied">Not assigned</option><option value="changed">Staged changes</option><option value="blocked">Missing a prerequisite</option>{compare && <option value="different">Different from comparison</option>}</select></label>
      </div>
      <div className="rights-toolbar">
        <span role="status">Showing {visible.length} of {rows.length} rights</span>
        <div>
          <button className="btn" disabled={activeFilters === 0} onClick={() => update({ filters: emptyFilters })}>Clear filters</button>
          {view === 'list' && <><button className="btn" onClick={() => update({ open: rows.map(r => r.feature) })}>Expand all</button><button className="btn" onClick={() => update({ open: [] })}>Collapse all</button></>}
          <div className="rights-view" role="group" aria-label="How to show the rights">
            <button className={`btn${view === 'grid' ? ' active' : ''}`} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grid</button>
            <button className={`btn${view === 'list' ? ' active' : ''}`} aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
          </div>
        </div>
      </div>
    </div>
    {activeFilters === 0 && <nav className="rights-jump" aria-label="Go to a module">{allGroups.map(g => <button key={g.key} type="button" onClick={() => document.getElementById(`rights-module-${g.key}`)?.scrollIntoView({ block: 'start' })}>
      {g.label} <Coverage held={assignedCount(g.rows, draft)} total={activeTotal(g.rows)} label={g.label} /></button>)}</nav>}
    {view === 'grid' && visible.length > 0 && <p className="rights-legend hint"><span>Hover over a box to read what the right allows, or use the List view.</span> <span><b className="rights-mark sensitive">▲</b> sensitive</span> <span><b className="rights-mark blocked">!</b> missing a prerequisite</span> <span><b className="rights-mark staged">●</b> staged, not saved</span>{compare && <span>✓ or – below a box: what {compare.name} has, underlined where it differs</span>}</p>}
    {view === 'list' && compare && <div className="rights-compare-legend"><strong>Boxes: {base.name}, with staged changes</strong><strong>Right column: {compare.name}, saved</strong></div>}
    {visible.length === 0 ? <StateMessage kind="nomatch" /> : view === 'grid'
      ? <div className="rights-tree" aria-label="Rights catalog">{grid.map(module => <section key={module.key} id={`rights-module-${module.key}`} className="rights-module">
        <div className="rights-module-head"><h3>{module.label}</h3><Coverage held={assignedCount(module.rows, draft)} total={activeTotal(module.rows)} label={module.label} /><div className="rights-group-actions">{bulkButtons(module.label, module.rows)}</div></div>
        <div className="rights-grid-scroll" role="region" aria-label={`${module.label} rights`} tabIndex={0}>
          <table className="rights-grid"><thead><tr><th scope="col">Feature</th>{module.columns.map(c => <th scope="col" key={c.action}>{c.label}</th>)}</tr></thead>
            <tbody>{module.resources.map(resource => <tr key={resource.key}>
              <th scope="row">{resource.label}{resource.detail && <small>{resource.detail}</small>}</th>
              {module.columns.map(c => resource.cells[c.action] ? gridCell(resource.cells[c.action]) : <td key={c.action} className="rights-grid-empty" />)}
            </tr>)}</tbody></table>
        </div>
      </section>)}</div>
      : <div className="rights-tree" aria-label="Rights catalog">{groups.map(group => <section key={group.key} id={`rights-module-${group.key}`} className="rights-module">
        <div className="rights-module-head"><h3>{group.label}</h3><Coverage held={assignedCount(group.rows, draft)} total={activeTotal(group.rows)} label={group.label} /></div>
        {group.features.map(feature => {
          const expanded = activeFilters > 0 || open.includes(feature.key);
          return <section key={feature.key}>
            <div className="rights-resource-head">
              <button type="button" className="linkbtn" aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${feature.label}`}
                onClick={() => update({ open: open.includes(feature.key) ? open.filter(k => k !== feature.key) : [...open, feature.key] })}>{expanded ? '▾' : '▸'} {feature.label}</button>
              <div className="rights-group-actions"><Coverage held={assignedCount(feature.rows, draft)} total={activeTotal(feature.rows)} label={feature.label} />{expanded && bulkButtons(feature.label, feature.rows)}</div>
            </div>
            {expanded && <div className="rights-children">{feature.rows.map(listRow)}</div>}
          </section>;
        })}
      </section>)}</div>}
    {f.dirty && <div className="rights-savebar rights-toolbar"><p aria-live="polite"><strong>{changeCount} staged change{changeCount === 1 ? '' : 's'}</strong> for {base.name} · {changes.grants.length} grant{changes.grants.length === 1 ? '' : 's'}, {changes.revocations.length} revocation{changes.revocations.length === 1 ? '' : 's'}</p><div>
      <button className="linkbtn" onClick={() => updateFilter('assignment', 'changed')}>Show staged</button>
      <button className="btn" disabled={f.busy} onClick={() => { if (window.confirm('Discard the staged changes?')) reset(base); }}>Discard changes</button>
      <button className="btn btn-primary" disabled={disabled || stale} onClick={() => setReview(true)}>Review and save</button>
    </div></div>}
    {groupChange && <Dialog title={groupChange.grant ? 'Grant a group of rights' : 'Revoke a group of rights'} onClose={() => setGroupChange(null)}>
      <p>{groupChange.grant ? 'Stage grants' : 'Stage revocations'} for {groupChange.rows.length} shown rights in <strong>{groupChange.label}</strong>?</p>
      <p>Only the rights listed below are included. The changes take effect after Review and save.</p>
      {groupChange.grant && groupChange.rows.some(sensitive) && <div className="notice warn">This selection includes sensitive rights. Review each grant.</div>}
      <ul className="rights-preview rights-preview-scroll">{groupChange.rows.map(r => <li key={r.key}>{r.featureLabel}: {r.label} <code>{r.key}</code></li>)}</ul>
      <div className="form-actions"><button className="btn" onClick={() => setGroupChange(null)}>Cancel</button><button className="btn btn-primary" onClick={() => {
        setDraft(setRights(draft, groupChange.rows, groupChange.grant)); setGroupChange(null);
      }}>Stage group change</button></div>
    </Dialog>}
    {review && <Dialog wide title="Review rights changes" onClose={() => { if (!f.busy) setReview(false); }}>
      <p>Save {changes.grants.length} grant{changes.grants.length === 1 ? '' : 's'} and {changes.revocations.length} revocation{changes.revocations.length === 1 ? '' : 's'} for <strong>{base.name}</strong>?</p>
      <p>{base.userCount} active directly assigned users may be affected, and so may members of mapped directory groups. Another active role can still give a revoked right.</p>
      {changes.grants.some(sensitive) && <div className="notice warn">Sensitive rights will be granted. Saving confirms that you reviewed these grants.</div>}
      {blockedBySave.length > 0 && <div className="notice warn">After saving, {blockedBySave.length} right{blockedBySave.length === 1 ? '' : 's'} will miss a prerequisite and work only for people who get it from another role: {blockedBySave.map(r => `${r.featureLabel}: ${r.label}`).join(', ')}.</div>}
      <div className="rights-review">
        {[{ title: 'Grants', tone: 'good' as const, verb: 'Grant', list: changes.grants }, { title: 'Revocations', tone: 'warn' as const, verb: 'Revoke', list: changes.revocations }].filter(s => s.list.length > 0).map(s => <section key={s.title}>
          <h3>{s.title} ({s.list.length})</h3>
          {reviewGroups(s.list).map(group => <div key={group.key}><h4>{group.label}</h4><ul className="rights-preview">{group.rows.map(r => <li key={r.key}><Badge tone={s.tone}>{s.verb}</Badge> {r.featureLabel}: {r.label} {sensitive(r) && <Badge tone="warn">{r.riskLevel}</Badge>} <code>{r.key}</code></li>)}</ul></div>)}
        </section>)}
      </div>
      <p className="hint">The server checks your own authority and saves these changes together. They apply to signed-in people on their next request.</p>
      <div className="form-actions"><button className="btn" disabled={f.busy} onClick={() => setReview(false)}>Back to editor</button><button className="btn btn-primary" disabled={f.busy || stale} onClick={save}>{f.busy ? 'Saving…' : 'Save rights'}</button></div>
    </Dialog>}
  </div>;
}
