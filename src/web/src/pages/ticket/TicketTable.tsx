import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { get, qs, type Paged } from '../../api';
import { fmtDateTime, label } from '../../format';
import { useDebounced } from '../../hooks';
import { Badge, DataTable, DeleteAction, Pager, SelectInput, StatusBadge } from '../../ui/kit';
import { ClientDisplay, initialsOf, toneOf } from '../../ui/ClientLogo';

export type CaseRow = { id: number; ref: string; title: string; type: string; scope: string; status: string; statusCode: string; priority: string; clientId?: number; clientCode?: string; teamName?: string; ownerName?: string; internalAssignee?: string; ownerDeactivated: boolean; waitingReason?: string; nextAction: string; nextReviewAt: string; dueAt?: string; overdue: boolean; reviewOverdue: boolean; stale: boolean; jiraKeys: string[];
  contractRef?: string; responseSla: string; resolutionSla: string; jiraSourceKey?: string; jiraConnectionName?: string; jiraStatus?: string; createdAt: string; updatedAt?: string; resolvedAt?: string; jiraAssignee?: string; jiraReporter?: string; jiraPriority?: string; jiraIssueType?: string; jiraResolution?: string; openedAt?: string; jiraAssigneeKind?: 'TioUser' | 'ClientContact' | 'Unmapped' };

/** Initials and name of a person in a case row. */
function PersonCell({ name, badge }: { name: string; badge?: ReactNode }) {
  return <span className="person-cell"><span className="person-initials" style={{ background: toneOf(name) }} aria-hidden="true">{initialsOf(name)}</span><span>{name}{badge && <> {badge}</>}</span></span>;
}

/** Response / resolution outcome for tables, named in words (A105: was "R" and "X"). */
export function SlaPair({ response, resolution }: { response: string; resolution: string }) {
  if (response === 'NotApplicable' && resolution === 'NotApplicable') return <span className="muted">—</span>;
  return <span className="sla-pair"><span title="First response" className="sla-part"><span className="sla-label">First response</span> <StatusBadge value={response} /></span> <span title="Resolution" className="sla-part"><span className="sla-label">Resolution</span> <StatusBadge value={resolution} /></span></span>;
}

type TableProps = {
  rows?: CaseRow[]; loading: boolean; error: unknown; empty: 'none' | 'nomatch'; sort: string; onSort: (s: string) => void; totalCount?: number;
  search: { value: string; onChange: (v: string) => void; label: string; placeholder: string };
};

/** The tickets table of the Tickets page: the same columns, row details and column choices wherever a list of tickets is shown. */
export function TicketTable({ rows, loading, error, empty, sort, onSort, totalCount, search }: TableProps) {
  return (
    <DataTable<CaseRow> rowKey={r => r.id} rows={rows} loading={loading} error={error} empty={empty} sort={sort} onSort={onSort} caption="Tickets" columnsKey="cases-v2"
      search={search} totalCount={totalCount} columnFilters={false}
      details={r => <dl className="row-details-list">
        <div><dt>Next action</dt><dd>{r.nextAction?.trim() || <span className="muted">None recorded</span>}</dd></div>
        <div><dt>Next review</dt><dd>{fmtDateTime(r.nextReviewAt)}{r.reviewOverdue && ' · review passed'}</dd></div>
        <div><dt>Team</dt><dd>{r.teamName ?? <span className="muted">None</span>}</dd></div>
        <div><dt>Reporter</dt><dd>{r.jiraReporter ?? <span className="muted">None</span>}</dd></div>
        <div><dt>Opened</dt><dd>{fmtDateTime(r.openedAt ?? r.createdAt)}</dd></div>
        <div><dt>Updated</dt><dd>{r.updatedAt ? fmtDateTime(r.updatedAt) : <span className="muted">None</span>}</dd></div>
        <div><dt>Resolution</dt><dd>{r.jiraResolution ?? (r.resolvedAt ? 'Resolved' : 'Unresolved')}</dd></div>
        <div><dt>Contractual SLA</dt><dd>{r.contractRef && <span className="mono">{r.contractRef} </span>}<SlaPair response={r.responseSla} resolution={r.resolutionSla} /></dd></div>
        <div><dt>Jira</dt><dd>{r.jiraKeys.length || r.jiraSourceKey ? <>{r.jiraKeys.map(k => <span key={k} className="chip mono">{k}</span>)}{r.jiraSourceKey && <> {r.jiraStatus}{r.jiraConnectionName ? ` · ${r.jiraConnectionName}` : ''}</>}</> : <span className="muted">None</span>}</dd></div>
        {(r.waitingReason || r.stale) && <div><dt>Flags</dt><dd>{r.waitingReason && <Badge tone="warn">Waiting: {label(r.waitingReason)}</Badge>}{r.stale && <Badge tone="bad">Stale</Badge>}</dd></div>}
      </dl>}
      columns={[
        { key: 'work', header: 'Ticket', sort: 'title', priority: 'primary', render: r => <span title={label(r.type)}><Link to={`/cases/${r.id}`}>{r.ref}</Link> {r.title}</span>, maxWidth: '24rem' },
        { key: 'client', header: 'Client', sort: 'client', render: r => r.clientCode ? <ClientDisplay id={r.clientId} code={r.clientCode} /> : <span className="chip">Internal</span> },
        { key: 'priority', header: 'Priority', sort: 'priority', render: r => <StatusBadge value={r.priority} /> },
        { key: 'status', header: 'Status', sort: 'status', render: r => <><StatusBadge value={r.statusCode} enumName="CaseStatus" />{r.status === 'Cancelled' && <span className="chip">Cancelled</span>}</> },
        { key: 'owner', header: 'Owner', sort: 'owner', maxWidth: '11rem', render: r => r.ownerName ? <PersonCell name={r.ownerName} badge={r.ownerDeactivated && <Badge tone="bad">Deactivated</Badge>} /> : r.internalAssignee ? <PersonCell name={r.internalAssignee} badge={<Badge tone="info">Vitronic</Badge>} /> : r.jiraAssignee ? <PersonCell name={r.jiraAssignee} badge={r.jiraAssigneeKind === 'ClientContact' ? <Badge tone="info">Client contact</Badge> : r.jiraAssigneeKind === 'TioUser' ? undefined : <Badge tone="warn">Not mapped</Badge>} /> : <span className="muted">Unassigned</span> },
        { key: 'due', header: 'Deadline', sort: 'due', maxWidth: '10rem', render: r => r.dueAt ? <span className={r.overdue ? 'err' : ''}>{fmtDateTime(r.dueAt)}{r.overdue && ' · overdue'}</span> : <span className="muted">None</span> },
        { key: 'reporter', header: 'Reporter', defaultHidden: true, render: r => r.jiraReporter ? <PersonCell name={r.jiraReporter} /> : <span className="muted">None</span> },
        { key: 'resolution', header: 'Resolution', defaultHidden: true, render: r => r.jiraResolution ?? (r.resolvedAt ? 'Resolved' : 'Unresolved') },
        { key: 'created', header: 'Opened', sort: 'created', defaultHidden: true, render: r => fmtDateTime(r.openedAt ?? r.createdAt) },
        { key: 'hubCreated', header: 'Added to hub', defaultHidden: true, render: r => fmtDateTime(r.createdAt) },
        { key: 'updated', header: 'Updated', sort: 'updated', defaultHidden: true, render: r => r.updatedAt ? fmtDateTime(r.updatedAt) : <span className="muted">None</span> },
        { key: 'jira', header: 'Jira', defaultHidden: true, render: r => <>{r.jiraKeys.map(k => <span key={k} className="chip mono">{k}</span>)}{r.jiraSourceKey && <div className="hint"><Badge tone="info">Synchronized</Badge> {r.jiraStatus}{r.jiraConnectionName ? ` · ${r.jiraConnectionName}` : ''}</div>}</> },
        { key: 'sla', header: 'Contractual SLA', defaultHidden: true, render: r => <>{r.contractRef && <div className="hint mono">{r.contractRef}</div>}<SlaPair response={r.responseSla} resolution={r.resolutionSla} /></> },
        { key: 'ref', header: 'Ref', sort: 'ref', defaultHidden: true, render: r => <Link to={`/cases/${r.id}`}>{r.ref}</Link> },
        { key: 'title', header: 'Title', sort: 'title', defaultHidden: true, render: r => <Link to={`/cases/${r.id}`}>{r.title}</Link> },
        { key: 'type', header: 'Type', defaultHidden: true, render: r => label(r.type) },
        { key: 'team', header: 'Team', defaultHidden: true, render: r => r.teamName },
        { key: 'next', header: 'Next action / review', defaultHidden: true, render: r => <>{r.nextAction}<div className="hint">{fmtDateTime(r.nextReviewAt)}{r.reviewOverdue && ' · review passed'}</div></> },
        { key: 'flags', header: 'Flags', defaultHidden: true, render: r => <>{r.waitingReason && <Badge tone="warn">Waiting: {label(r.waitingReason)}</Badge>}{r.stale && <Badge tone="bad">Stale</Badge>}</> },
        { key: 'jiraAssignee', header: 'Jira assignee', defaultHidden: true, render: r => r.jiraAssignee ?? <span className="muted">None</span> },
        { key: 'jiraPriority', header: 'Jira priority', defaultHidden: true, render: r => r.jiraPriority ?? <span className="muted">None</span> },
        { key: 'jiraType', header: 'Jira issue type', defaultHidden: true, render: r => r.jiraIssueType ?? <span className="muted">None</span> },
        { key: 'del', header: '', className: 'row-actions', render: r => <DeleteAction path={`/cases/${r.id}`} what={`ticket ${r.ref}`} /> }
      ]} />
  );
}

const STATUS_OPTIONS = [{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }, { value: 'done', label: 'Closed or cancelled' }];

/** A client's tickets in the Tickets page table (client page, Tickets tab): status, search, sort and paging of their own. */
export function ClientTickets({ clientId }: { clientId: number }) {
  const [f, setF] = useState({ status: 'open', sort: '-created', page: '1', pageSize: '15' });
  const [text, setText] = useState('');
  const q2 = useDebounced(text, 300);
  const set = (patch: Partial<typeof f>) => setF(v => ({ ...v, page: 'page' in patch ? v.page : '1', ...patch }));
  const params = { ...f, clientId: String(clientId), q: q2 };
  const q = useQuery({ queryKey: ['cases', 'client', params], queryFn: () => get<Paged<CaseRow>>(`/cases${qs(params)}`) });
  return (<>
    <div className="toolbar" style={{ padding: '8px 12px 0' }}>
      <SelectInput label="Status" value={f.status} onChange={v => set({ status: v })} options={STATUS_OPTIONS} empty={null} />
    </div>
    <TicketTable rows={q.data?.items} loading={q.isLoading} error={q.error} empty={q2 ? 'nomatch' : 'none'} sort={f.sort} onSort={s => set({ sort: s })} totalCount={q.data?.totalCount}
      search={{ value: text, onChange: v => { setText(v); set({}); }, label: "Search this client's tickets", placeholder: 'Search: reference, title, Jira key or next action' }} />
    {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
  </>);
}
