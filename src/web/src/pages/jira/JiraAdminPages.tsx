import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError, get, post, put, type Paged } from '../../api';
import { fmtDateTime, label } from '../../format';
import { usePermission, useRefresh } from '../../hooks';
import { ActionDialog, UserPicker } from '../../ui/pickers';
import { DataTable, PageHead, Pager, Panel, QueryState, SelectInput, StateMessage, Tabs, useToast, When } from '../../ui/kit';
import { useClientOptions } from '../common';
import type { Health } from './JiraConnections';
import { JiraBadge, JiraCard, PreviewResult, SyncOffNotice, type JiraPreview, type SyncRun } from './shared';
import './jira.css';

const crumbs = [{ to: '/admin', label: 'Administration' }, { to: '/admin/integrations/jira', label: 'Jira Connections' }];

type IssueRow = { id: number; type: string; status: string; connection?: string; jiraConnectionId: number; projectKey?: string; issueKey?: string; clientId?: number; client?: string; caseRef?: { id: number; ref: string; title: string }; candidate?: { id: number; ref: string; title: string };
  subject?: string; description: string; suggestedAction: string; lastSeenAt: string; occurrences: number; resolution?: string; resolutionNote?: string; resolvedAt?: string; actions: string[] };
type IssuePage = { page: number; pageSize: number; totalCount: number; items: IssueRow[] };
type Connections = { connections: { id: number; name: string }[]; syncEnabled: boolean };
type UserRow = { id: number; jiraAccountId: string; jiraDisplayName?: string; tioUserId?: number; tioUser?: string; clientContactId?: number; isInternalMember: boolean; lastSeenAt: string };
type ClientContact = { id: number; name: string; role?: string; clientCode: string };
type StatusRow = { id: number; jiraProjectId: string; projectKey?: string; jiraStatusId: string; jiraStatusName: string; jiraStatusCategory?: string; targetStatus?: string };

const ACTION_TEXT: Record<string, { title: string; intro: string; submit: string }> = {
  Adopt: { title: 'Adopt the existing case', intro: 'The case becomes the synchronized source of this Jira issue. Its manual references stay. From the next run, Jira status and assignee apply to it through the normal rules.', submit: 'Adopt case' },
  CreateNew: { title: 'Create a new case', intro: 'The existing reference is left as it is, and the next run creates a separate case for this Jira issue.', submit: 'Create at next run' },
  Ignore: { title: 'Ignore this Jira issue', intro: 'This issue will not become a case. The decision is kept in the history.', submit: 'Ignore issue' },
  Dismiss: { title: 'Dismiss', intro: 'The item leaves the list. If the problem still exists at the next run, it appears again.', submit: 'Dismiss' }
};

function useConnections() {
  return useQuery({ queryKey: ['jira-connections'], queryFn: () => get<Connections>('/admin/jira-connections') });
}

function IssuesTable({ types, status }: { types?: string; status: string }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(15);
  const [resolve, setResolve] = useState<{ row: IssueRow; action: string } | null>(null);
  const can = usePermission('AdminIntegrations', 'Maintain');
  const q = useQuery({ queryKey: ['jira-issues', types, status, page, size], queryFn: () => get<IssuePage>(`/admin/jira-issues?status=${status}${types ? `&type=${types}` : ''}&page=${page}&pageSize=${size}`) });
  const text = resolve ? ACTION_TEXT[resolve.action] : null;
  return <>
    <DataTable<IssueRow> caption="Jira integration issues" exportName="jira-issues" rows={q.data?.items} loading={q.isLoading} error={q.error} rowKey={i => i.id} columns={[
      { key: 'c', header: 'Connection', render: i => i.connection }, { key: 's', header: 'Space', render: i => i.projectKey && <span className="mono">{i.projectKey}</span> }, { key: 'i', header: 'Jira issue', render: i => i.issueKey && <span className="mono">{i.issueKey}</span> },
      { key: 'l', header: 'Client', render: i => i.clientId ? <Link to={`/clients/${i.clientId}?tab=jira`}>{i.client}</Link> : <span className="muted">—</span> },
      { key: 'p', header: 'Existing case', render: i => { const x = i.candidate ?? i.caseRef; return x ? <Link to={`/cases/${x.id}`} title={x.title}>{x.ref}</Link> : <span className="muted">—</span>; } },
      { key: 't', header: 'Conflict type', render: i => label(i.type) }, { key: 'd', header: 'Description and suggested action', render: i => <>{i.description}<div className="hint">{i.suggestedAction}</div></> },
      { key: 'w', header: 'Last seen', render: i => <When v={i.lastSeenAt} /> },
      { key: 'r', header: 'Resolution', render: i => i.status === 'Open' ? <JiraBadge value="Open" /> : <><JiraBadge value={i.status} /><div className="hint">{i.resolution}{i.resolutionNote ? `: ${i.resolutionNote}` : ''}</div></> },
      { key: 'x', header: '', render: i => can && i.actions.map(a => <div key={a}><button className="linkbtn" onClick={() => setResolve({ row: i, action: a })}>{ACTION_TEXT[a]?.submit ?? a}</button></div>) }
    ]} />
    {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={setPage} onSize={setSize} />}
    {resolve && text && <ActionDialog title={`${text.title}: ${resolve.row.issueKey ?? label(resolve.row.type)}`} path={`/admin/jira-issues/${resolve.row.id}/resolve`} submitLabel={text.submit} onClose={() => setResolve(null)} intro={text.intro}
      fields={[{ name: 'note', label: 'Reason for this decision', kind: 'textarea', required: true }]} transform={v => ({ action: resolve.action, note: v.note })} />}
  </>;
}

/** Screen 6: dry run per client and the cases waiting for an administrator. */
export function JiraImportReview() {
  const clients = useClientOptions();
  const conn = useConnections();
  const [clientId, setClientId] = useState('');
  const [result, setResult] = useState<JiraPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setError(null); setResult(null);
    try { setResult(await post<JiraPreview>(`/clients/${clientId}/jira/preview`)); }
    catch (e) { setError(e instanceof ApiError ? e.summary : 'The request failed.'); }
    finally { setBusy(false); }
  };
  return <>
    <PageHead title="Jira import review" crumbs={crumbs} sub="See what an import would do before it runs, and decide the cases that need a person." />
    <SyncOffNotice on={!!conn.data?.syncEnabled} />
    <Panel title="Dry-run import preview">
      <div className="toolbar">
        <SelectInput label="Client" value={clientId} onChange={setClientId} options={clients} />
        <button className="btn btn-primary" disabled={!clientId || busy} onClick={run}>{busy ? 'Reading Jira…' : 'Run preview'}</button>
      </div>
      {error && <div className="notice warn">{error}</div>}
      {result ? <>
        <PreviewResult p={result} />
        <DataTable caption="Issues in the preview" exportName="jira-preview" rows={result.samples} rowKey={s => s.issueKey} columns={[
          { key: 'k', header: 'Jira issue', render: s => <span className="mono">{s.issueKey}</span> }, { key: 'n', header: 'Summary', render: s => s.summary }, { key: 'p', header: 'Space', render: s => s.projectKey }, { key: 's', header: 'Jira status', render: s => s.statusName }, { key: 'a', header: 'Assignee', render: s => s.assigneeName ?? <span className="muted">Unassigned</span> },
          { key: 'd', header: 'Proposed result', render: s => <>{label(s.decision)}{s.problem && <div className="hint err">{s.problem}</div>}</> }, { key: 'c', header: 'Case', render: s => s.caseId ? <Link to={`/cases/${s.caseId}`}>Open</Link> : <span className="muted">—</span> }
        ]} />
      </> : !busy && <StateMessage kind="none">Choose a client with assigned spaces and run the preview.</StateMessage>}
    </Panel>
    <Panel title="Cases requiring review" pad={false}><IssuesTable status="Open" types="DuplicateCaseCandidate" /></Panel>
    <Panel title="Issues missing required case information" pad={false}><IssuesTable status="Open" types="MissingCaseInformation" /></Panel>
  </>;
}

/** Screen 7: conflicts, user mappings and workflow mappings. Nothing here picks a default on its own. */
export function JiraConflicts() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') ?? 'issues');
  const [status, setStatus] = useState('Open');
  const conn = useConnections();
  const list = conn.data?.connections ?? [];
  const [connectionId, setConnectionId] = useState('');
  const selected = connectionId || (list[0] ? String(list[0].id) : '');
  return <>
    <PageHead title="Jira conflict resolution" crumbs={crumbs} sub="Ownership conflicts, user and workflow mappings, existing-case reconciliation and moved issues." />
    <Tabs value={tab} onChange={setTab} tabs={[{ key: 'issues', label: 'Issues' }, { key: 'users', label: 'User mappings' }, { key: 'workflow', label: 'Workflow mappings' }]} />
    {tab === 'issues' && <Panel pad={false} title="Integration issues" actions={<select className="input" aria-label="Filter by resolution status" value={status} onChange={e => setStatus(e.target.value)}><option value="Open">Open</option><option value="Resolved">Resolved</option><option value="Dismissed">Dismissed</option></select>}><IssuesTable status={status} /></Panel>}
    {tab !== 'issues' && <div className="toolbar"><SelectInput label="Connection" empty={null} value={selected} onChange={setConnectionId} options={list.map(c => ({ value: String(c.id), label: c.name }))} /></div>}
    {tab === 'users' && selected && <UserMappings connectionId={Number(selected)} />}
    {tab === 'workflow' && selected && <WorkflowMappings connectionId={Number(selected)} />}
  </>;
}

function UserMappings({ connectionId }: { connectionId: number }) {
  const q = useQuery({ queryKey: ['jira-users', connectionId], queryFn: () => get<UserRow[]>(`/admin/jira-connections/${connectionId}/users`) });
  const contacts = useQuery({ queryKey: ['jira-client-contacts', connectionId], queryFn: () => get<ClientContact[]>(`/admin/jira-connections/${connectionId}/client-contacts`) });
  const can = usePermission('AdminIntegrations', 'Maintain');
  const refresh = useRefresh();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const contactName = (id?: number) => contacts.data?.find(k => k.id === id)?.name;
  const save = async (r: UserRow, tioUserId: number | null, clientContactId: number | null = null, isInternalMember = false) => {
    setError(null);
    try { await put(`/admin/jira-user-mappings/${r.id}`, { tioUserId, clientContactId, isInternalMember }); toast('Mapping saved. Cases update at the next run.'); refresh(); }
    catch (e) { setError(e instanceof ApiError ? e.summary : 'The request failed.'); }
  };
  return <Panel title="Jira user → TIO owner, client contact or Vitronic team member" pad={false}>
    {error && <div className="notice warn" style={{ margin: 8 }}>{error}</div>}
    <p className="hint" style={{ margin: '8px 10px' }}>Jira users appear here when they are first assigned an issue. Without a mapping the case keeps its current owner; no fallback person is used. An issue assigned to a client contact keeps its TIO owner and waits on the customer until Jira reassigns it, which pauses the SLA if the contract allows it. Use Vitronic team member for colleagues with no TIO account: cases show their Jira name, and an owner taken from Jira is cleared.</p>
    <DataTable<UserRow> caption="Jira user mappings" rows={q.data} loading={q.isLoading} error={q.error} rowKey={r => r.id} columns={[
      { key: 'n', header: 'Jira user', render: r => r.jiraDisplayName ?? <span className="muted">No name</span> }, { key: 'i', header: 'Account ID', render: r => <span className="mono">{r.jiraAccountId}</span> },
      { key: 'u', header: 'TIO user or project team member', render: r => can ? <UserPicker label="" value={r.tioUserId ?? null} onChange={v => save(r, v)} empty="Not mapped" /> : r.tioUser ?? <span className="muted">Not mapped</span> },
      { key: 'k', header: 'Client contact', render: r => can ? <select className="input" aria-label={`Client contact for ${r.jiraDisplayName ?? r.jiraAccountId}`} value={r.clientContactId ?? ''} onChange={e => save(r, null, e.target.value ? Number(e.target.value) : null)}><option value="">Not mapped</option>{(contacts.data ?? []).map(k => <option key={k.id} value={k.id}>{k.clientCode} · {k.name}{k.role ? ` (${k.role})` : ''}</option>)}</select> : contactName(r.clientContactId) ?? <span className="muted">Not mapped</span> },
      { key: 'v', header: 'Vitronic team member', render: r => <input type="checkbox" aria-label={`${r.jiraDisplayName ?? r.jiraAccountId} is a Vitronic team member`} disabled={!can} checked={r.isInternalMember} onChange={e => save(r, null, null, e.target.checked)} /> },
      { key: 's', header: 'State', render: r => <JiraBadge value={r.tioUserId || r.clientContactId || r.isInternalMember ? 'Passed' : 'Warning'} /> }, { key: 'l', header: 'Last seen', render: r => <When v={r.lastSeenAt} /> }
    ]} />
  </Panel>;
}

function WorkflowMappings({ connectionId }: { connectionId: number }) {
  const q = useQuery({ queryKey: ['jira-statuses', connectionId], queryFn: () => get<{ targets: { code: string; label: string; behavior?: string }[]; rows: StatusRow[] }>(`/admin/jira-connections/${connectionId}/statuses`) });
  const can = usePermission('AdminIntegrations', 'Maintain');
  const refresh = useRefresh();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const discover = async () => {
    setError(null);
    try { const r = await post<{ added: number }>(`/admin/jira-connections/${connectionId}/statuses/discover`); toast(`${r.added} new status(es) found.`); refresh(); }
    catch (e) { setError(e instanceof ApiError ? e.summary : 'The request failed.'); }
  };
  const save = async (r: StatusRow, target: string) => {
    setError(null);
    try { await put(`/admin/jira-status-mappings/${r.id}`, { targetStatus: target || null }); toast('Mapping saved. Cases update at the next run.'); refresh(); }
    catch (e) { setError(e instanceof ApiError ? e.summary : 'The request failed.'); }
  };
  return <Panel title="Jira workflow status → case status" pad={false} actions={can && <button className="btn" onClick={discover}>Discover statuses</button>}>
    {error && <div className="notice warn" style={{ margin: 8 }}>{error}</div>}
    <p className="hint" style={{ margin: '8px 10px' }}>Nothing is mapped automatically. Every active case status can be chosen. A status that closes the case records the Jira issue and status as its outcome and evidence. Cancelling and reopening stay with people.</p>
    <DataTable<StatusRow> caption="Jira workflow mappings" rows={q.data?.rows} loading={q.isLoading} error={q.error} rowKey={r => r.id} columns={[
      { key: 'p', header: 'Space', render: r => r.projectKey ?? (r.jiraProjectId || 'All spaces') }, { key: 's', header: 'Jira status', render: r => r.jiraStatusName }, { key: 'c', header: 'Jira category', render: r => r.jiraStatusCategory },
      { key: 't', header: 'Case status', render: r => <select className="input" aria-label={`Case status for ${r.jiraStatusName}`} disabled={!can} value={r.targetStatus ?? ''} onChange={e => save(r, e.target.value)}><option value="">Not mapped</option>{q.data!.targets.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}</select> },
      { key: 'x', header: 'State', render: r => <JiraBadge value={r.targetStatus ? 'Passed' : 'Warning'} /> }
    ]} />
  </Panel>;
}

/** Screen 8: global, per-client and per-connection history, status and errors. */
export function JiraMonitoring() {
  const [params, setParams] = useSearchParams();
  const conn = useConnections();
  const clients = useClientOptions();
  const connectionId = params.get('connectionId') ?? '';
  const clientId = params.get('clientId') ?? '';
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);
  const size = Number(params.get('pageSize') ?? 25);
  const set = (patch: Record<string, string>) => setParams(p => { for (const [k, v] of Object.entries({ page: '1', ...patch })) { if (v) p.set(k, v); else p.delete(k); } return p; });
  const query = new URLSearchParams(Object.entries({ connectionId, clientId, status, page: String(page), pageSize: String(size) }).filter(([, v]) => v)).toString();
  const runs = useQuery({ queryKey: ['jira-runs', query], queryFn: () => get<Paged<SyncRun>>(`/admin/jira-sync/runs?${query}`) });
  const health = useQuery({ queryKey: ['jira-health', connectionId], queryFn: () => get<Health>(`/admin/jira-sync/health${connectionId ? `?connectionId=${connectionId}` : ''}`) });
  const h = health.data;
  return <>
    <PageHead title="Jira synchronization monitoring" crumbs={crumbs} sub="Status, history and error details of every run." actions={<Link className="btn" to="/admin/integrations/jira/conflicts">Open conflicts</Link>} />
    <QueryState q={health}>{h && <>
      <SyncOffNotice on={h.syncEnabled} />
      <div className="jira-cards">
        <JiraCard icon="ok" title="Issue sync" value={<JiraBadge value={h.issueSync} />} />
        <JiraCard icon="note" title="Comment sync" value={<JiraBadge value={h.commentSync} />} />
        <JiraCard icon="history" title="Activity sync" value={<JiraBadge value={h.activitySync} />} />
        <JiraCard icon="calendar" title="Last full reconciliation" value={h.lastFullReconciliation ? fmtDateTime(h.lastFullReconciliation) : 'Never'} />
        <JiraCard icon="plus" title="Created cases (24h)" value={h.last24h.created} />
        <JiraCard icon="edit" title="Updated cases (24h)" value={h.last24h.updated} />
        <JiraCard icon="error" title="Failed records (24h)" value={h.last24h.failed} />
        <JiraCard icon="history" title="Average duration" value={h.averageDurationSeconds != null ? `${h.averageDurationSeconds} s` : '—'} />
        <JiraCard icon="warning" title="Pending conflicts" value={<Link to="/admin/integrations/jira/conflicts">{h.pendingConflicts}</Link>} />
      </div>
    </>}</QueryState>
    <div className="toolbar">
      <SelectInput label="Connection" value={connectionId} onChange={v => set({ connectionId: v })} options={(conn.data?.connections ?? []).map(c => ({ value: String(c.id), label: c.name }))} empty="All connections" />
      <SelectInput label="Client" value={clientId} onChange={v => set({ clientId: v })} options={clients} empty="All clients" />
      <SelectInput label="Status" value={status} onChange={v => set({ status: v })} options={['Running', 'Success', 'Warning', 'Failed'].map(s => ({ value: s, label: s }))} empty="Any" />
    </div>
    <DataTable<SyncRun> caption="Jira synchronization runs" exportName="jira-sync-runs" rows={runs.data?.items} loading={runs.isLoading} error={runs.error} rowKey={r => r.id} columns={[
      { key: 't', header: 'Started', render: r => <When v={r.startedAt} /> }, { key: 'd', header: 'Duration', className: 'num', render: r => r.endedAt ? `${Math.round((new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) / 100) / 10} s` : '—' },
      { key: 's', header: 'Space', render: r => <span className="mono">{r.projectKey}</span> }, { key: 'y', header: 'Type', render: r => label(r.type) }, { key: 'g', header: 'Trigger', render: r => label(r.trigger) },
      { key: 'r', header: 'Retrieved', className: 'num', render: r => r.issuesRetrieved }, { key: 'c', header: 'Created', className: 'num', render: r => r.casesCreated }, { key: 'u', header: 'Updated', className: 'num', render: r => r.casesUpdated },
      { key: 'm', header: 'Comments', className: 'num', render: r => r.commentsImported }, { key: 'a', header: 'Activity', className: 'num', render: r => r.activitiesImported }, { key: 'f', header: 'Failed', className: 'num', render: r => r.failedRecords },
      { key: 'x', header: 'Status', render: r => <JiraBadge value={r.status} /> }, { key: 'e', header: 'Error', render: r => r.error && <span className="err">{r.error}</span> }
    ]} />
    {runs.data && <Pager page={runs.data.page} pageSize={runs.data.pageSize} total={runs.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
  </>;
}
