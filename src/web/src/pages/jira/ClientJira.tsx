import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, get, post, put, type Paged } from '../../api';
import { fmtDateTime, label } from '../../format';
import { useEnum, useForm, useMe, useRefresh, useTypes } from '../../hooks';
import { ActionDialog } from '../../ui/pickers';
import { Badge, Checkbox, DataTable, Dialog, enumOptions, FormError, Panel, Pager, QueryState, SelectInput, StateMessage, TextInput, useToast, When } from '../../ui/kit';
import { hasRight, canExport } from '../../rights';
import { useTeamOptions } from '../common';
import { JiraBadge, JiraCard, PreviewResult, SyncOffNotice, type JiraPreview, type SyncRun } from './shared';
import './jira.css';

type Settings = { isEnabled: boolean; jiraConnectionId?: number; defaultResponsibleTeamId?: number; defaultCaseType?: string; defaultPriority: string; nextReviewHours: number; importDoneIssues: boolean; importFrom?: string; syncOnStartup: boolean; fullReconciliation: boolean; fullReconciliationDays: number; syncIntervalMinutes: number; lastPreviewAt?: string; version: string };
type SpaceContract = { id: number; ref: string; title: string; status: string; startDate?: string; endDate?: string };
const contractPeriod = (k: SpaceContract) => `${k.startDate ?? 'no start date'} to ${k.endDate ?? 'no end date'}`;
type ValueMapping = { id: number; kind: 'Priority' | 'IssueType'; jiraValue: string; target?: string };
type ClientJiraDto = {
  valueMappings?: ValueMapping[]; contracts?: SpaceContract[]; syncEnabled: boolean; canManage: boolean; settings?: Settings; summary: { enabled: boolean; assignedSpaces: number; lastSuccess?: string; syncIntervalMinutes: number; errors: number; warnings: number };
  connections: { id: number; name: string }[];
  spaces: { id: number; isEnabled: boolean; contracts: SpaceContract[]; projectKey: string; projectName: string; jiraProjectId: string; jiraConnectionId: number; connection?: string; siteUrl?: string; lastSync?: string; health: string; lastError?: string; cases: number }[];
  checks: { label: string; state: string }[]; issues: { id: number; type: string; issueKey?: string; projectKey?: string; description: string; suggestedAction: string; lastSeenAt: string }[]; runs: SyncRun[];
};
type Available = { id: number; jiraProjectId: string; projectKey: string; projectName: string; assignedClient?: string; availability: string };

const SEVERE = new Set(['ClientOwnershipConflict', 'IssueMovedBetweenSpaces', 'FailedIssueImport']);

/** Clients → Jira integration (approved mockup 2). */
export function ClientJiraIntegration({ clientId }: { clientId: number }) {
  const q = useQuery({ queryKey: ['client-jira', clientId], queryFn: () => get<ClientJiraDto>(`/clients/${clientId}/jira`) });
  const me = useMe().data!;
  const canManage = !!q.data?.canManage;
  const [dialog, setDialog] = useState<'preview' | 'history' | null>(null);
  const [adding, setAdding] = useState(false);
  const [release, setRelease] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const refresh = useRefresh();
  const toast = useToast();
  const d = q.data;
  const syncNow = async (spaceId?: number) => {
    setMessage(null);
    try { await post(`/clients/${clientId}/jira/sync${spaceId ? `?spaceId=${spaceId}` : ''}`); toast('Synchronization requested. It starts within a minute.'); }
    catch (e) { setMessage(e instanceof ApiError ? e.summary : 'The request failed.'); }
  };
  const [contractOf, setContractOf] = useState<ClientJiraDto['spaces'][number] | null>(null);
  const toggleSpace = async (id: number, enabled: boolean) => {
    try { await put(`/clients/${clientId}/jira/spaces/${id}`, { enabled }); refresh(); }
    catch (e) { setMessage(e instanceof ApiError ? e.summary : 'The request failed.'); }
  };
  return (
    <QueryState q={q}>{d && <>
      <SyncOffNotice on={d.syncEnabled} />
      {message && <div className="notice warn">{message}</div>}
      <div className="jira-cards">
        <JiraCard icon="online" title="Jira integration" value={<JiraBadge value={d.summary.enabled ? 'Enabled' : 'Disabled'} />} />
        <JiraCard icon="list" title="Assigned spaces" value={d.summary.assignedSpaces} />
        <JiraCard icon="calendar" title="Last successful sync" value={d.summary.lastSuccess ? fmtDateTime(d.summary.lastSuccess) : 'Never'} />
        <JiraCard icon="history" title="Sync schedule" value={`Every ${d.summary.syncIntervalMinutes} minutes`} />
        <JiraCard icon="warning" title="Validation status" value={d.summary.errors ? <Badge tone="bad">{d.summary.errors} error(s)</Badge> : d.summary.warnings ? <Badge tone="warn">{d.summary.warnings} warning(s)</Badge> : <Badge tone="good">No problems</Badge>} />
      </div>
      <div className="jira-client-grid">
        <div className="jira-col">
          <SettingsPanel clientId={clientId} d={d} onPreview={() => setDialog('preview')} onSync={() => syncNow()} />
        </div>
        <div className="jira-col">
          <Panel title="Validation & ownership checks" actions={<Link className="btn" to="/admin/integrations/jira/conflicts">Review conflicts</Link>}>
            {d.checks.length === 0 ? <StateMessage kind="none">Select a connection and assign a space to see the checks.</StateMessage>
              : d.checks.map((c, i) => <div className="jira-check-row" key={i}><span>{c.label}</span><JiraBadge value={c.state} /></div>)}
          </Panel>
        </div>
      </div>
      <Panel title="Assigned Jira spaces" pad={false} actions={canManage && <button className="btn btn-primary" onClick={() => setAdding(a => !a)}>+ Add Jira space</button>}>
        <DataTable caption="Assigned Jira spaces" tools={false} rows={d.spaces} rowKey={s => s.id} columns={[
          { key: 'e', header: 'Enabled', render: s => <input type="checkbox" aria-label={`Synchronize ${s.projectKey}`} checked={s.isEnabled} disabled={!canManage} onChange={e => toggleSpace(s.id, e.target.checked)} /> },
          { key: 'k', header: 'Space key', render: s => s.siteUrl ? <a className="mono" href={`${s.siteUrl}/browse/${encodeURIComponent(s.projectKey)}`} target="_blank" rel="noopener noreferrer">{s.projectKey}</a> : s.projectKey },
          { key: 'n', header: 'Space name', render: s => s.projectName },
          { key: 'c', header: 'Connection', render: s => s.connection },
          { key: 'ct', header: 'Contract', render: s => <>{s.contracts.length ? s.contracts.map(k => <div key={k.id} title={k.title}>{k.ref} <span className="hint">{contractPeriod(k)}</span>{k.status !== 'Active' && <> <Badge tone="warn">{label(k.status)}</Badge></>}</div>) : <span className="muted">None</span>}{canManage && <> <button className="linkbtn" aria-label={`Change the contracts of ${s.projectKey}`} onClick={() => setContractOf(s)}>Change</button></>}</> },
          { key: 'l', header: 'Last sync', render: s => s.lastSync ? fmtDateTime(s.lastSync) : <span className="muted">Never</span> },
          { key: 'h', header: 'Sync health', render: s => <span title={s.lastError}><JiraBadge value={s.health === 'Success' ? 'Healthy' : s.health} /></span> },
          { key: 'u', header: 'Ticket count', className: 'num', render: s => hasRight(me, 'Cases', 'View') ? <Link to={`/cases?clientId=${clientId}&jiraSpace=${s.projectKey}&status=all`}>{s.cases}</Link> : s.cases },
          { key: 'x', header: 'Actions', render: s => canManage && <><button className="linkbtn" onClick={() => syncNow(s.id)}>Sync</button> <button className="linkbtn" onClick={() => setRelease(s.id)}>Release</button></> }
        ]} />
        <div className="notice" style={{ margin: 8 }}>Each Jira space can belong to one active client only.</div>
      </Panel>
      {adding && <AddSpacePanel clientId={clientId} d={d} onClose={() => setAdding(false)} />}
      <Panel title="Synchronization history" pad={false} actions={<>
        <button className="btn" onClick={() => setDialog('history')}>Open full history</button>
        {canExport(me) && <a className="btn" href={`/api/v1/clients/${clientId}/jira/runs.csv`}>Download CSV</a>}</>}>
        <RunsTable runs={d.runs} />
      </Panel>
      <div className="jira-client-grid">
        <div className="jira-col">
          <Panel title="Recent synchronization issues">
            {d.issues.length === 0 ? <StateMessage kind="none">No open issues.</StateMessage>
              : d.issues.map(i => <div key={i.id} className={`jira-issue-line ${SEVERE.has(i.type) ? 'bad' : 'warn'}`}><b>{label(i.type)}</b>: {i.description}<div className="hint">{i.suggestedAction}</div></div>)}
          </Panel>
        </div>
        <div className="jira-col">
          <Panel title="Imported data behavior">
            <div className="jira-behavior">
              <div><h4>Syncs from Jira</h4><ul><li>Workflow status (through validated mappings)</li><li>Jira assignee → ticket owner</li><li>Jira comments and activity</li><li>Jira references (Customer Cloud)</li></ul></div>
              <div><h4>Preserved in TIO</h4><ul><li>Priority and type after a ticket is created</li><li>Contractual SLA and penalties</li><li>Backup owner, responsible team, coordinator</li><li>Closing and cancelling tickets</li><li>Local TIO comments</li></ul></div>
            </div>
            <div className="notice" style={{ marginTop: 8, marginBottom: 0 }}>TIO comments are local only and are never sent back to Jira.</div>
          </Panel>
        </div>
      </div>
      {(d.valueMappings?.length ?? 0) > 0 && <ValueMappings clientId={clientId} rows={d.valueMappings!} canManage={d.canManage} />}
      {dialog === 'preview' && <PreviewDialog clientId={clientId} onClose={() => { setDialog(null); refresh(); }} />}
      {dialog === 'history' && <HistoryDialog clientId={clientId} onClose={() => setDialog(null)} />}
      {contractOf && <SpaceContractsDialog clientId={clientId} space={contractOf} options={d.contracts ?? []} onClose={() => setContractOf(null)} />}
      {release && <ActionDialog title="Release Jira space" danger path={`/clients/${clientId}/jira/spaces/${release}/release`} submitLabel="Release" onClose={() => setRelease(null)}
        intro="The space stops synchronizing and can be assigned again. Tickets already imported stay with this client." fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} />}
    </>}</QueryState>
  );
}

/** A86: Jira values whose name matches no case value. Until one is mapped, new cases use the client's default. */
function ValueMappings({ clientId, rows, canManage }: { clientId: number; rows: ValueMapping[]; canManage: boolean }) {
  const priorities = useEnum('Priority');
  const T = useTypes();
  const refresh = useRefresh();
  const toast = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const save = async (r: ValueMapping, target: string) => {
    setMessage(null);
    try { await put(`/clients/${clientId}/jira/value-mappings/${r.id}`, { target: target || null }); toast('Mapping saved. It applies to tickets created from now on.'); await refresh(); }
    catch (e) { setMessage(e instanceof ApiError ? e.summary : 'The request failed.'); }
  };
  return (
    <Panel title="Jira priorities and issue types to map" pad={false}>
      {message && <div className="notice warn" style={{ margin: 8 }}>{message}</div>}
      <p className="hint" style={{ margin: '8px 10px' }}>A Jira value with the same name as a ticket value is used directly. The values below have no match, so new tickets use the default in the settings until you map them. Existing tickets keep their values.</p>
      <DataTable<ValueMapping> caption="Jira priorities and issue types to map" tools={false} rows={rows} rowKey={r => r.id} columns={[
        { key: 'k', header: 'Kind', render: r => r.kind === 'Priority' ? 'Priority' : 'Issue type' }, { key: 'v', header: 'Jira value', render: r => r.jiraValue },
        { key: 't', header: 'Maps to', render: r => <select className="input" aria-label={`Ticket value for Jira ${r.jiraValue}`} disabled={!canManage} value={r.target ?? ''} onChange={e => save(r, e.target.value)}>
          <option value="">Use the default</option>{(r.kind === 'Priority' ? enumOptions(priorities) : T.options('CaseType', r.target ?? '')).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> },
        { key: 's', header: 'State', render: r => <JiraBadge value={r.target ? 'Passed' : 'Warning'} /> }
      ]} />
    </Panel>
  );
}

function RunsTable({ runs }: { runs: SyncRun[] }) {
  return <DataTable<SyncRun> caption="Synchronization history" tools={false} rows={runs} rowKey={r => r.id} empty="none" columns={[
    { key: 't', header: 'Time', render: r => <When v={r.startedAt} /> }, { key: 's', header: 'Space', render: r => <span className="mono">{r.projectKey}</span> }, { key: 'y', header: 'Type', render: r => label(r.type) },
    { key: 'r', header: 'Retrieved', className: 'num', render: r => r.issuesRetrieved }, { key: 'c', header: 'Created', className: 'num', render: r => r.casesCreated }, { key: 'u', header: 'Updated', className: 'num', render: r => r.casesUpdated }, { key: 'm', header: 'Comments', className: 'num', render: r => r.commentsImported },
    { key: 'x', header: 'Status', render: r => <span title={r.error}><JiraBadge value={r.status} /></span> }
  ]} />;
}

function SettingsPanel({ clientId, d, onPreview, onSync }: { clientId: number; d: ClientJiraDto; onPreview: () => void; onSync: () => void }) {
  const T = useTypes();
  const teams = useTeamOptions();
  const priorities = useEnum('Priority');
  const s = d.settings;
  const initial = { isEnabled: s?.isEnabled ?? false, jiraConnectionId: s?.jiraConnectionId ? String(s.jiraConnectionId) : '', defaultResponsibleTeamId: s?.defaultResponsibleTeamId ? String(s.defaultResponsibleTeamId) : '', defaultCaseType: s?.defaultCaseType ?? '', defaultPriority: s?.defaultPriority ?? 'Normal',
    nextReviewHours: String(s?.nextReviewHours ?? 48), importDoneIssues: s?.importDoneIssues ?? false, importFrom: s?.importFrom ?? '', syncOnStartup: s?.syncOnStartup ?? false, fullReconciliation: s?.fullReconciliation ?? true, fullReconciliationDays: String(s?.fullReconciliationDays ?? 7), syncIntervalMinutes: String(s?.syncIntervalMinutes ?? 15) };
  const f = useForm(initial);
  useEffect(() => { f.reset(initial); }, [s?.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = useRefresh();
  const toast = useToast();
  const v = f.values;
  const can = d.canManage;
  const save = async () => {
    const ok = await f.submit(async () => { await put(`/clients/${clientId}/jira`, { isEnabled: v.isEnabled, jiraConnectionId: Number(v.jiraConnectionId) || null, defaultResponsibleTeamId: Number(v.defaultResponsibleTeamId) || null, defaultCaseType: v.defaultCaseType || null, defaultPriority: v.defaultPriority, nextReviewHours: Number(v.nextReviewHours) || null,
      importDoneIssues: v.importDoneIssues, importFrom: v.importFrom || null, syncOnStartup: v.syncOnStartup, fullReconciliation: v.fullReconciliation, fullReconciliationDays: Number(v.fullReconciliationDays) || null, syncIntervalMinutes: Number(v.syncIntervalMinutes) || null }, s?.version); return true; });
    if (ok) { toast('Jira settings saved.'); refresh(); }
  };
  return (
    <Panel title="Client Jira settings">
      <FormError error={f.error} />
      <div className="jira-switches">
        <Checkbox label="Jira integration enabled" checked={v.isEnabled} disabled={!can} onChange={x => f.set('isEnabled', x)} hint={s?.lastPreviewAt ? `Dry run: ${fmtDateTime(s.lastPreviewAt)}` : 'Needs a dry run first (Preview import).'} />
        <Checkbox label="Sync on startup" checked={v.syncOnStartup} disabled={!can} onChange={x => f.set('syncOnStartup', x)} />
        <Checkbox label="Full reconciliation" checked={v.fullReconciliation} disabled={!can} onChange={x => f.set('fullReconciliation', x)} />
        <Checkbox label="Import issues already done" checked={v.importDoneIssues} disabled={!can} onChange={x => f.set('importDoneIssues', x)} hint="Off: finished Jira issues do not become open tickets." />
      </div>
      {f.fieldError('isEnabled') && <div className="err">{f.fieldError('isEnabled')}</div>}
      <div className="form-grid">
        <SelectInput label="Jira connection" value={v.jiraConnectionId} disabled={!can} onChange={x => f.set('jiraConnectionId', x)} options={d.connections.map(c => ({ value: String(c.id), label: c.name }))} error={f.fieldError('jiraConnectionId')} />
        <SelectInput label="Import mode" value="JiraToCases" disabled onChange={() => undefined} empty={null} options={[{ value: 'JiraToCases', label: 'Jira → TIO tickets' }]} hint="One way only." />
        <SelectInput label="Sync interval" value={v.syncIntervalMinutes} disabled={!can} onChange={x => f.set('syncIntervalMinutes', x)} empty={null} options={['5', '15', '30', '60', '240'].map(m => ({ value: m, label: `${m} minutes` }))} error={f.fieldError('syncIntervalMinutes')} />
        <TextInput label="Full reconciliation every (days)" value={v.fullReconciliationDays} disabled={!can} onChange={x => f.set('fullReconciliationDays', x)} error={f.fieldError('fullReconciliationDays')} />
        <SelectInput label="Responsible team for new tickets" required={v.isEnabled} value={v.defaultResponsibleTeamId} disabled={!can} onChange={x => f.set('defaultResponsibleTeamId', x)} options={teams} error={f.fieldError('defaultResponsibleTeamId')} />
        <SelectInput label="Ticket type when Jira has no match" required={v.isEnabled} value={v.defaultCaseType} disabled={!can} onChange={x => f.set('defaultCaseType', x)} options={T.options('CaseType', v.defaultCaseType)} error={f.fieldError('defaultCaseType')} />
        <SelectInput label="Priority when Jira has no match" value={v.defaultPriority} disabled={!can} onChange={x => f.set('defaultPriority', x)} empty={null} options={enumOptions(priorities)} hint="New tickets take their priority and type from Jira. After that, Jira no longer changes them." />
        <TextInput label="First review after (hours)" value={v.nextReviewHours} disabled={!can} onChange={x => f.set('nextReviewHours', x)} error={f.fieldError('nextReviewHours')} />
        <TextInput label="Import issues created from (optional)" type="date" value={v.importFrom} disabled={!can} onChange={x => f.set('importFrom', x)} error={f.fieldError('importFrom')} />
      </div>
      {can && <div className="form-actions">
        <button className="btn btn-primary" disabled={f.busy} onClick={save}>Save changes</button>
        <button className="btn" disabled={!d.summary.enabled} onClick={onSync}>Sync now</button>
        <button className="btn" disabled={d.spaces.length === 0} onClick={onPreview}>Preview import</button>
      </div>}
      <div className="notice" style={{ marginTop: 8, marginBottom: 0 }}>Imported Jira tickets become TIO tickets for this client only. No contract is linked automatically, so nothing is measured against an SLA until a person links one.</div>
    </Panel>
  );
}

function AddSpacePanel({ clientId, d, onClose }: { clientId: number; d: ClientJiraDto; onClose: () => void }) {
  const [connectionId, setConnectionId] = useState(String(d.settings?.jiraConnectionId ?? d.connections[0]?.id ?? ''));
  const [text, setText] = useState('');
  const [contractId, setContractId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const refresh = useRefresh();
  const toast = useToast();
  const q = useQuery({ queryKey: ['client-jira-available', clientId, connectionId, text], queryFn: () => get<Available[]>(`/clients/${clientId}/jira/available-spaces?connectionId=${connectionId}&q=${encodeURIComponent(text)}`), enabled: !!connectionId });
  const assign = async () => {
    setError(null);
    try { await post(`/clients/${clientId}/jira/spaces`, { jiraConnectionId: Number(connectionId), jiraProjectIds: selected, contractId: contractId ? Number(contractId) : null }); toast(`${selected.length} space(s) assigned.`); refresh(); onClose(); }
    catch (e) { if (e instanceof ApiError) setError(e); }
  };
  const conflict = (q.data ?? []).filter(a => selected.includes(a.jiraProjectId) && a.availability !== 'Available');
  return (
    <Panel title="Add Jira space" pad={false} actions={<button className="btn" onClick={onClose}>Close</button>}>
      <div style={{ padding: '8px 10px 0' }}>
        <FormError error={error} />
        {error && !error.isConflict && error.errors && <div className="err">{error.field('jiraProjectIds') ?? error.field('contractId')}</div>}
        <div className="toolbar">
          <SelectInput label="Connection" value={connectionId} onChange={setConnectionId} options={d.connections.map(c => ({ value: String(c.id), label: c.name }))} />
          <TextInput label="Search Jira spaces" value={text} onChange={setText} placeholder="Key or name" />
          <SelectInput label="Contract for tickets from these spaces" empty="No contract" value={contractId} onChange={setContractId} options={(d.contracts ?? []).map(k => ({ value: String(k.id), label: `${k.ref} · ${k.title}` }))} />
        </div>
      </div>
      <DataTable<Available> caption="Spaces available to assign" tools={false} rows={q.data} loading={q.isLoading} error={q.error} rowKey={a => a.id} empty={text ? 'nomatch' : 'none'} columns={[
        { key: 's', header: 'Select', render: a => <input type="checkbox" aria-label={`Select ${a.projectKey}`} disabled={a.availability === 'AlreadyAssigned'} checked={selected.includes(a.jiraProjectId)} onChange={e => setSelected(x => e.target.checked ? [...x, a.jiraProjectId] : x.filter(y => y !== a.jiraProjectId))} /> },
        { key: 'k', header: 'Space key', render: a => <span className="mono">{a.projectKey}</span> }, { key: 'n', header: 'Space name', render: a => a.projectName },
        { key: 'o', header: 'Current owner', render: a => a.assignedClient ?? 'Unassigned' }, { key: 'a', header: 'Status', render: a => <JiraBadge value={a.availability} /> }
      ]} />
      <div style={{ padding: 10 }}>
        {conflict.map(a => <div key={a.id} className="jira-issue-line bad">{a.projectKey} is already assigned{a.assignedClient ? ` to ${a.assignedClient}` : ''}. Reassignment requires an administrator's decision under Jira connections.</div>)}
        <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={selected.length === 0 || conflict.length > 0} onClick={assign}>Assign selected</button></div>
      </div>
    </Panel>
  );
}

// The dry run is a POST that records LastPreviewAt and so changes the settings version. It runs once per opening:
// as a query it ran again when closing the dialog refreshed the page, after the form had read the new version,
// so the next Save was refused as "someone else saved this record".
export function PreviewDialog({ clientId, onClose }: { clientId: number; onClose: () => void }) {
  const m = useMutation({ mutationFn: () => post<JiraPreview>(`/clients/${clientId}/jira/preview`), retry: false });
  const started = useRef(false);
  useEffect(() => { if (!started.current) { started.current = true; m.mutate(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const q = { isLoading: !m.data && !m.error, error: m.error };
  return (
    <Dialog title="Import preview" wide onClose={onClose}>
      <QueryState q={q}>{m.data && <PreviewResult p={m.data} />}</QueryState>
      <div className="form-actions"><button className="btn btn-primary" onClick={onClose}>Close</button></div>
    </Dialog>
  );
}

function HistoryDialog({ clientId, onClose }: { clientId: number; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(15);
  const q = useQuery({ queryKey: ['client-jira-runs', clientId, page, size], queryFn: () => get<Paged<SyncRun>>(`/clients/${clientId}/jira/runs?page=${page}&pageSize=${size}`) });
  return (
    <Dialog title="Synchronization history" wide onClose={onClose}>
      <QueryState q={q}>{q.data && <><RunsTable runs={q.data.items} /><Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={setPage} onSize={setSize} /></>}</QueryState>
    </Dialog>
  );
}

/** A93: the contracts of a Jira space. Each ticket takes the one valid on its creation date. */
function SpaceContractsDialog({ clientId, space, options, onClose }: { clientId: number; space: ClientJiraDto['spaces'][number]; options: SpaceContract[]; onClose: () => void }) {
  const f = useForm({ contractIds: space.contracts.map(k => k.id), reason: '' });
  const [confirmed, setConfirmed] = useState(false);
  const toast = useToast();
  const refresh = useRefresh();
  const v = f.values;
  const removing = space.contracts.some(k => !v.contractIds.includes(k.id));
  const toggle = (id: number, on: boolean) => f.set('contractIds', on ? [...v.contractIds, id] : v.contractIds.filter(x => x !== id));
  const save = async () => {
    const r = await f.submit(() => put<{ changed: number }>(`/clients/${clientId}/jira/spaces/${space.id}/contracts`, { contractIds: v.contractIds, reason: v.reason || null }));
    if (r) { toast(`Contracts of ${space.projectKey} saved; ${r.changed} ticket(s) changed.`); await refresh(); onClose(); }
  };
  return (
    <Dialog title={`Contracts of ${space.projectKey}`} onClose={onClose}>
      <div className="notice">Each ticket belongs to the contract valid on its Jira creation date, whether open or closed, and a renewal does not move older tickets. A ticket no contract covers is Not measurable. Saving applies this to the existing tickets of this space, so their SLA results and penalties can change. Dates of these contracts must not overlap.</div>
      <FormError error={f.error} fields={['contractIds', 'reason']} />
      <fieldset className="wide" style={{ border: 0, padding: 0, margin: '8px 0' }}>
        <legend className="flabel">Contracts</legend>
        {options.length === 0 && <p className="hint">This client has no contract that can be linked.</p>}
        {options.map(k => <div key={k.id}><label className="check"><input type="checkbox" checked={v.contractIds.includes(k.id)} onChange={e => toggle(k.id, e.target.checked)} /> {k.ref} · {k.title} <span className="hint">{contractPeriod(k)}{k.status !== 'Active' ? ` · ${label(k.status)}` : ''}</span></label></div>)}
        {f.fieldError('contractIds') && <div className="err">{f.fieldError('contractIds')}</div>}
      </fieldset>
      <TextInput label="Reason" required={removing} multiline wide value={v.reason} onChange={x => f.set('reason', x)} error={f.fieldError('reason')} hint={removing ? 'Needed because a contract is removed: its tickets lose it.' : 'Optional when only adding.'} />
      <label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I confirm this action.</label>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!confirmed || f.busy} onClick={save}>{f.busy ? 'Saving…' : 'Save'}</button></div>
    </Dialog>
  );
}
