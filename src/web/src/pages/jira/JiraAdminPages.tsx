import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError, get, post, put, qs, type Paged } from '../../api';
import { fmtDateTime, label } from '../../format';
import { useMe, useRight, useRefresh } from '../../hooks';
import { canAudit } from '../../rights';
import { UserDialog, type UserDialogTargets } from '../Admin';
import { ActionDialog } from '../../ui/pickers';
import { DataTable, Dialog, PageHead, Pager, Panel, QueryState, SelectInput, StateMessage, Tabs, useToast, When } from '../../ui/kit';
import { Changes, useClientOptions } from '../common';
import type { Health } from './JiraConnections';
import { JiraBadge, JiraCard, PreviewResult, SyncOffNotice, type JiraPreview, type SyncRun } from './shared';
import './jira.css';

const crumbs = [{ to: '/admin', label: 'Administration' }, { to: '/admin/integrations/jira', label: 'Jira Connections' }];

type IssueRow = { id: number; type: string; status: string; connection?: string; jiraConnectionId: number; projectKey?: string; issueKey?: string; clientId?: number; client?: string; caseRef?: { id: number; ref: string; title: string }; candidate?: { id: number; ref: string; title: string };
  subject?: string; description: string; suggestedAction: string; lastSeenAt: string; occurrences: number; resolution?: string; resolutionNote?: string; resolvedAt?: string; actions: string[] };
type IssuePage = { page: number; pageSize: number; totalCount: number; items: IssueRow[] };
type Connections = { connections: { id: number; name: string }[]; syncEnabled: boolean };
type UserRow = { id: number; jiraAccountId: string; jiraDisplayName?: string; tioUserId?: number; tioUser?: string; clientContactId?: number; classification: 'Unmapped' | 'TioUser' | 'VitronicTeamMember' | 'ClientContact'; loginEnabled: boolean; matchingUsers: number[]; matchingContacts: number[]; lastSeenAt: string };
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
  const can = useRight('AdminIntegrations', 'Maintain');
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
    <Tabs value={tab} onChange={setTab} tabs={[{ key: 'issues', label: 'Issues' }, { key: 'users', label: 'Jira users' }, { key: 'workflow', label: 'Workflow mappings' }]} />
    {tab === 'issues' && <Panel pad={false} title="Integration issues" actions={<select className="input" aria-label="Filter by resolution status" value={status} onChange={e => setStatus(e.target.value)}><option value="Open">Open</option><option value="Resolved">Resolved</option><option value="Dismissed">Dismissed</option></select>}><IssuesTable status={status} /></Panel>}
    {tab !== 'issues' && <div className="toolbar"><SelectInput label="Connection" empty={null} value={selected} onChange={setConnectionId} options={list.map(c => ({ value: String(c.id), label: c.name }))} /></div>}
    {tab === 'users' && selected && <UserMappings connectionId={Number(selected)} />}
    {tab === 'workflow' && selected && <WorkflowMappings connectionId={Number(selected)} />}
  </>;
}

const classificationLabels: Record<string, string> = { TioUser: 'TIO user', VitronicTeamMember: 'Vitronic team member', ClientContact: 'Client contact' };

type ResolveKind = 'user' | 'contact' | 'newContact' | 'teamMember' | 'newUser';

/** BR-01, BR-02: unmapped Jira users stay listed until an administrator resolves them. Mapping never grants sign-in. */
function UserMappings({ connectionId }: { connectionId: number }) {
  const q = useQuery({ queryKey: ['jira-users', connectionId], queryFn: () => get<UserRow[]>(`/admin/jira-connections/${connectionId}/users`) });
  const contacts = useQuery({ queryKey: ['jira-client-contacts', connectionId], queryFn: () => get<ClientContact[]>(`/admin/jira-connections/${connectionId}/client-contacts`) });
  const can = useRight('AdminIntegrations', 'Maintain');
  const canCreateUsers = useRight('AdminUsers', 'Create');
  const me = useMe().data;
  const clients = useClientOptions();
  const refresh = useRefresh();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<{ row: UserRow; kind: ResolveKind } | null>(null);
  const [history, setHistory] = useState<UserRow | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const targets = useQuery({ queryKey: ['scope-targets'], queryFn: () => get<UserDialogTargets>('/admin/scope-targets'), enabled: resolving?.kind === 'newUser' });
  const nameOf = (r: UserRow) => r.jiraDisplayName ?? r.jiraAccountId;
  const contactName = (id?: number) => contacts.data?.find(k => k.id === id)?.name;
  const clear = async (r: UserRow) => {
    setError(null);
    try { await put(`/admin/jira-user-mappings/${r.id}`, { tioUserId: null, clientContactId: null }); toast('Mapping cleared. The Jira user is unmapped again.'); await refresh(); }
    catch (e) { setError(e instanceof ApiError ? e.summary : 'The request failed.'); }
  };
  const rows = q.data ?? [];
  const unmapped = rows.filter(r => r.classification === 'Unmapped');
  const mapped = rows.filter(r => r.classification !== 'Unmapped');
  const options: { value: ResolveKind; label: string; allowed: boolean }[] = [
    { value: 'user', label: 'Map to an existing TIO user', allowed: true },
    { value: 'contact', label: 'Map to an existing client contact', allowed: true },
    { value: 'newContact', label: 'Create a client contact', allowed: true },
    { value: 'teamMember', label: 'Create a Vitronic team member', allowed: canCreateUsers },
    { value: 'newUser', label: 'Create a standard TIO user', allowed: canCreateUsers }
  ];
  const r = resolving?.row;
  return <>
    {error && <div className="notice warn" style={{ margin: 8 }}>{error}</div>}
    <Panel title={`Unmapped Jira users (${unmapped.length})`} pad={false}>
      <p className="hint" style={{ margin: '8px 10px' }}>Jira users appear here when they are assigned an issue or comment on one, and stay until they are resolved. Their replies do not count as a first response, and a case they are assigned keeps its current owner.</p>
      <DataTable<UserRow> caption="Unmapped Jira users" rows={unmapped} loading={q.isLoading} error={q.error} rowKey={u => u.id} columns={[
        { key: 'n', header: 'Jira user', render: u => u.jiraDisplayName ?? <span className="muted">No name</span> }, { key: 'i', header: 'Account ID', render: u => <span className="mono">{u.jiraAccountId}</span> },
        { key: 'm', header: 'Possible match', render: u => u.matchingUsers.length ? 'A TIO user has this name' : u.matchingContacts.length ? 'A client contact has this name' : <span className="muted">None</span> },
        { key: 'l', header: 'Last seen', render: u => <When v={u.lastSeenAt} /> },
        { key: 'a', header: 'Resolve', render: u => can ? <select className="input" aria-label={`Resolve ${nameOf(u)}`} value="" onChange={e => setResolving({ row: u, kind: e.target.value as ResolveKind })}>
          <option value="">Choose…</option>{options.filter(o => o.allowed).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <span className="muted">Not mapped</span> }
      ]} />
    </Panel>
    <Panel title="Mapped Jira users" pad={false} actions={can && <button className="btn" onClick={() => setRecalculating(true)}>Recalculate first responses</button>}>
      <p className="hint" style={{ margin: '8px 10px' }}>A public reply by a TIO user or Vitronic team member can be the first response; a client contact's cannot. A case assigned to a client contact waits on the customer, which pauses the SLA if the contract allows it, until Jira reassigns it. A changed mapping applies from now on: results already calculated change only when you recalculate.</p>
      <DataTable<UserRow> caption="Mapped Jira users" rows={mapped} loading={q.isLoading} error={q.error} rowKey={u => u.id} columns={[
        { key: 'n', header: 'Jira user', render: u => u.jiraDisplayName ?? <span className="muted">No name</span> }, { key: 'i', header: 'Account ID', render: u => <span className="mono">{u.jiraAccountId}</span> },
        { key: 'c', header: 'Classification', render: u => classificationLabels[u.classification] },
        { key: 'u', header: 'Mapped to', render: u => u.tioUser ?? contactName(u.clientContactId) ?? <span className="muted">Not available</span> },
        { key: 's', header: 'TIO sign-in', render: u => u.classification === 'ClientContact' ? 'None' : u.loginEnabled ? 'Allowed' : 'None' },
        { key: 'l', header: 'Last seen', render: u => <When v={u.lastSeenAt} /> },
        { key: 'a', header: '', render: u => <span className="nowrap">
          {canAudit(me) && <button className="linkbtn" onClick={() => setHistory(u)}>History</button>}
          {can && <>{canAudit(me) && ' · '}<button className="linkbtn" aria-label={`Clear the mapping of ${nameOf(u)}`} onClick={() => clear(u)}>Clear</button></>}
        </span> }
      ]} />
    </Panel>
    {r && resolving.kind === 'user' && <ActionDialog title={`Map ${nameOf(r)} to a TIO user`} method="PUT" path={`/admin/jira-user-mappings/${r.id}`} submitLabel="Map" onClose={() => setResolving(null)}
      intro="The person keeps their classification, rights and sign-in." initial={r.matchingUsers.length === 1 ? { tioUserId: String(r.matchingUsers[0]) } : undefined}
      fields={[{ name: 'tioUserId', label: 'TIO user', kind: 'user', required: true }]} transform={v => ({ tioUserId: Number(v.tioUserId), clientContactId: null })} />}
    {r && resolving.kind === 'contact' && <ActionDialog title={`Map ${nameOf(r)} to a client contact`} method="PUT" path={`/admin/jira-user-mappings/${r.id}`} submitLabel="Map" onClose={() => setResolving(null)}
      intro="Their comments do not count as a first response. No sign-in is granted." initial={r.matchingContacts.length === 1 ? { clientContactId: String(r.matchingContacts[0]) } : undefined}
      fields={[{ name: 'clientContactId', label: 'Client contact', kind: 'select', required: true, options: (contacts.data ?? []).map(k => ({ value: String(k.id), label: `${k.clientCode} · ${k.name}${k.role ? ` (${k.role})` : ''}` })) }]}
      transform={v => ({ tioUserId: null, clientContactId: Number(v.clientContactId) })} />}
    {r && resolving.kind === 'newContact' && <ActionDialog title={`Create a client contact for ${nameOf(r)}`} path={`/admin/jira-user-mappings/${r.id}/contact`} submitLabel="Create and map" onClose={() => setResolving(null)}
      intro="Their comments do not count as a first response. No sign-in is granted." initial={{ name: r.jiraDisplayName ?? '' }}
      fields={[{ name: 'clientId', label: 'Client', kind: 'select', required: true, options: clients }, { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', hint: 'Enter an email address or a phone number.' }, { name: 'phone', label: 'Phone' }, { name: 'role', label: 'Role' }, { name: 'organization', label: 'Organization' }]}
      transform={v => ({ ...v, clientId: Number(v.clientId) })} />}
    {r && resolving.kind === 'teamMember' && <ActionDialog title={`Create a Vitronic team member for ${nameOf(r)}`} path={`/admin/jira-user-mappings/${r.id}/team-member`} submitLabel="Create and map" onClose={() => setResolving(null)}
      intro="An internal record with no sign-in and no password. They can own cases through Jira and count as the team for SLA rules. Sign-in can be granted later on the Users page." initial={{ displayName: r.jiraDisplayName ?? '' }}
      fields={[{ name: 'displayName', label: 'Name', required: true }, { name: 'email', label: 'Email' }]} />}
    {r && resolving.kind === 'newUser' && targets.data && <UserDialog user={null} targets={targets.data} initialName={r.jiraDisplayName} createPath={`/admin/jira-user-mappings/${r.id}/user`} onClose={() => setResolving(null)} />}
    {recalculating && <ActionDialog title="Recalculate first responses" danger path={`/admin/jira-connections/${connectionId}/recalculate-first-responses`} submitLabel="Recalculate" onClose={() => setRecalculating(false)}
      intro="Applies today's user mappings to every stored comment of this connection. First responses and SLA results of existing cases can change, including closed ones. First responses a person recorded stay."
      fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} />}
    {history && <Dialog title={`History of ${nameOf(history)}`} onClose={() => setHistory(null)} wide><MappingHistory id={history.id} /></Dialog>}
  </>;
}

/** BR-05: who changed this mapping, when and how. */
function MappingHistory({ id }: { id: number }) {
  const q = useQuery({ queryKey: ['jira-user-history', id], queryFn: () => get<Paged<{ id: number; at: string; userName?: string; action: string; reason?: string; changes?: string }>>(`/admin/audit${qs({ entityType: 'JiraUserMapping', entityId: id, pageSize: 50 })}`) });
  return <DataTable caption="Mapping history" rows={q.data?.items} loading={q.isLoading} error={q.error} rowKey={a => a.id} columns={[
    { key: 't', header: 'When', render: a => <When v={a.at} /> }, { key: 'u', header: 'By', render: a => a.userName }, { key: 'a', header: 'Action', render: a => a.action },
    { key: 'r', header: 'Details', render: a => a.reason }, { key: 'c', header: 'Changes', render: a => <Changes json={a.changes} /> }
  ]} />;
}

function WorkflowMappings({ connectionId }: { connectionId: number }) {
  const q = useQuery({ queryKey: ['jira-statuses', connectionId], queryFn: () => get<{ targets: { code: string; label: string; behavior?: string }[]; rows: StatusRow[] }>(`/admin/jira-connections/${connectionId}/statuses`) });
  const can = useRight('AdminIntegrations', 'Maintain');
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
