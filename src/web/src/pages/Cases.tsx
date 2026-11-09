import { canViewTab, hasRight } from '../rights';
import { usePermittedTab } from '../hooks';
import { useQuery } from '@tanstack/react-query';
import { canExportReport } from '../exportRights';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { exportCsv, get, post, put, qs, type Paged } from '../api';
import { fmtDateTime, fromLocalInput, inDays, label, toLocalInput } from '../format';
import { useDebounced, useEnum, useEnumLabel, useForm, useLeaveGuard, useLookup, useMe, useRight, useReference, useRefresh, useUrlSearch, useUrlState, useTypes } from '../hooks';
import { ActionDialog, TimeZoneSelect, UserPicker } from '../ui/pickers';
import { Badge, DataTable, Dialog, enumOptions, FormError, FreshnessBadge, PageHead, Pager, Panel, Person, QueryState, SelectInput, StatusBadge, Tabs, TextInput, useToast, When, DeleteAction } from '../ui/kit';
import { FilterBar, type FilterChip } from '../ui/FilterBar';
import { ClientDisplay, initialsOf, toneOf } from '../ui/ClientLogo';
import { caseTypeGuidance } from '../caseTypeGuidance';
import { toNum, useClientOptions, useProductOptions, useTeamOptions } from './common';
import { AttachmentsWorkspace } from './attachments/AttachmentsWorkspace';
import { EscalationTable } from './Escalations';
import { activeQuickView, CRITICAL_OR_HIGH, quickViews, TICKET_FILTER_DEFAULTS, type QuickViewCounts, type TicketFilters } from './ticketViews';
import { CaseActivity, JiraSection } from './jira/CaseJira';
import { FactList, KeyFacts, RecordLayout, SideSection, TabSection } from '../ui/recordView';
import { AffectedRecordsTab, CommitmentsTab, ImpactTab, JiraReferencesTab, TicketHistory } from './ticket/TicketTabs';
import { SlaSections } from './ticket/TicketSla';
import type { CaseDto, CaseImpact } from './ticket/model';

type CaseRow = { id: number; ref: string; title: string; type: string; scope: string; status: string; statusCode: string; priority: string; clientId?: number; clientCode?: string; teamName?: string; ownerName?: string; internalAssignee?: string; ownerDeactivated: boolean; waitingReason?: string; nextAction: string; nextReviewAt: string; dueAt?: string; overdue: boolean; reviewOverdue: boolean; stale: boolean; jiraKeys: string[];
  contractRef?: string; responseSla: string; resolutionSla: string; jiraSourceKey?: string; jiraConnectionName?: string; jiraStatus?: string; createdAt: string; updatedAt?: string; resolvedAt?: string; jiraAssignee?: string; jiraReporter?: string; jiraPriority?: string; jiraIssueType?: string; jiraResolution?: string; openedAt?: string; jiraAssigneeKind?: 'TioUser' | 'ClientContact' | 'Unmapped' };

/** Initials and name of a person in a case row. */
function PersonCell({ name, badge }: { name: string; badge?: ReactNode }) {
  return <span className="person-cell"><span className="person-initials" style={{ background: toneOf(name) }} aria-hidden="true">{initialsOf(name)}</span><span>{name}{badge && <> {badge}</>}</span></span>;
}

/** A61: contractual SLA filters of the case list (also the dashboard drill-downs). */
export const SLA_FILTERS = [
  { value: 'withContract', label: 'Contract linked' }, { value: 'noContract', label: 'No contract linked' },
  { value: 'approaching', label: 'Deadline within 24 hours' }, { value: 'breached', label: 'Any obligation breached' },
  { value: 'responseMet', label: 'Response met' }, { value: 'responseBreached', label: 'Response breached' }, { value: 'responsePending', label: 'Response pending' }, { value: 'responseNotMeasurable', label: 'Response not measurable' },
  { value: 'resolutionMet', label: 'Resolution met' }, { value: 'resolutionBreached', label: 'Resolution breached' }, { value: 'resolutionPending', label: 'Resolution pending' }, { value: 'resolutionNotMeasurable', label: 'Resolution not measurable' }
];

/** Response / resolution outcome for tables, named in words (A105: was "R" and "X"). */
export function SlaPair({ response, resolution }: { response: string; resolution: string }) {
  if (response === 'NotApplicable' && resolution === 'NotApplicable') return <span className="muted">—</span>;
  return <span className="sla-pair"><span title="First response" className="sla-part"><span className="sla-label">First response</span> <StatusBadge value={response} /></span> <span title="Resolution" className="sla-part"><span className="sla-label">Resolution</span> <StatusBadge value={resolution} /></span></span>;
}

export function CaseList() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ ...TICKET_FILTER_DEFAULTS, sort: '-created', page: '1', pageSize: '15' });
  const [text, setText] = useUrlSearch(f.q, v => set({ q: v }));
  const q = useQuery({ queryKey: ['cases', f], queryFn: () => get<Paged<CaseRow>>(`/cases${qs(f)}`) });
  const counts = useQuery({ queryKey: ['cases', 'quick-views'], queryFn: () => get<QuickViewCounts>('/cases/quick-views') });
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const statuses = useLookup('CaseStatusLabel');
  const priorities = useEnum('Priority');
  const canEng = useRight('Cases', 'Create');
  const exportParams = Object.fromEntries(Object.entries(f).filter(([k]) => !['sort', 'page', 'pageSize'].includes(k)));
  const filtered = Object.entries(f).some(([k, v]) => !['sort', 'page', 'pageSize', 'status'].includes(k) && v);
  const views = quickViews(me.id);
  const view = activeQuickView(f, views);
  const applyFilters = (patch: Partial<TicketFilters>) => set({ ...TICKET_FILTER_DEFAULTS, ...patch });

  const statusOptions = [{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }, { value: 'done', label: 'Closed or cancelled' }, ...statuses.map(s => ({ value: `code:${s.code}`, label: s.label }))];
  // A link can name a stage that is not in the list, such as Cancelled.
  if (!statusOptions.some(o => o.value === f.status)) statusOptions.push({ value: f.status, label: f.status });
  const priorityOptions = [{ value: CRITICAL_OR_HIGH, label: 'Critical or high' }, ...priorities.map(p => ({ value: p, label: p }))];
  const ownerOptions = [{ value: String(me.id), label: 'Me' }, { value: 'none', label: 'Unassigned' }];
  const deadlineOptions = [{ value: 'overdue', label: 'Overdue' }, { value: '24h', label: 'Due within 24 hours' }, { value: 'upcoming', label: 'Due soon' }, { value: 'none', label: 'No deadline' }];
  const attentionOptions = [{ value: 'waiting', label: 'Waiting' }, { value: 'customer', label: 'Waiting for customer' }, { value: 'review', label: 'Next review passed' }, { value: 'stale', label: 'Stale review' }, { value: 'coverage', label: 'No backup (coverage policy)' }];
  const scopeOptions = [{ value: 'Client', label: 'Client-related' }, { value: 'Internal', label: 'Internal' }];
  const sourceOptions = [{ value: 'synchronized', label: 'Synchronized from Jira' }, { value: 'notSynchronized', label: 'Not synchronized' }];
  const attention = f.waitingFor === 'Customer' ? 'customer' : f.waiting ? 'waiting' : f.reviewOverdue ? 'review' : f.stale ? 'stale' : f.coverageGap ? 'coverage' : '';
  const nameOf = (list: { value: string; label: string }[], v: string) => list.find(o => o.value === v)?.label ?? v;

  const advancedCount = [f.teamId, f.productId, f.scope, attention, f.sla, f.jiraKey, f.jiraSource, f.jiraSpace].filter(Boolean).length;
  const chip = (key: string, shown: string | false | undefined, label: string, clear: Partial<TicketFilters>): FilterChip[] => shown ? [{ key, label, onClear: () => set(clear) }] : [];
  const chips: FilterChip[] = [
    ...chip('q', f.q, `Search: ${f.q}`, { q: '' }),
    ...chip('clientId', f.clientId, `Client: ${nameOf(clients, f.clientId)}`, { clientId: '' }),
    ...chip('owner', f.ownerId || f.unassigned, f.unassigned ? 'Unassigned' : f.ownerId === String(me.id) ? 'Owner: me' : 'Owner: selected person', { ownerId: '', unassigned: '' }),
    ...chip('status', f.status !== 'open' && f.status, `Status: ${nameOf(statusOptions, f.status)}`, { status: 'open' }),
    ...chip('priority', f.priority, `Priority: ${nameOf(priorityOptions, f.priority)}`, { priority: '' }),
    ...chip('due', f.due, `Deadline: ${nameOf(deadlineOptions, f.due)}`, { due: '' }),
    ...chip('teamId', f.teamId, `Team: ${nameOf(teams, f.teamId)}`, { teamId: '' }),
    ...chip('productId', f.productId, `Product: ${nameOf(products, f.productId)}`, { productId: '' }),
    ...chip('scope', f.scope, `Scope: ${nameOf(scopeOptions, f.scope)}`, { scope: '' }),
    ...chip('attention', attention, nameOf(attentionOptions, attention), { waiting: '', waitingFor: '', reviewOverdue: '', stale: '', coverageGap: '' }),
    ...chip('sla', f.sla, `SLA: ${nameOf(SLA_FILTERS, f.sla)}`, { sla: '' }),
    ...chip('jiraKey', f.jiraKey, `Jira key: ${f.jiraKey}`, { jiraKey: '' }),
    ...chip('jiraSource', f.jiraSource, nameOf(sourceOptions, f.jiraSource), { jiraSource: '' }),
    ...chip('jiraSpace', f.jiraSpace, `Jira space: ${f.jiraSpace}`, { jiraSpace: '' }),
    ...chip('jiraConnectionId', f.jiraConnectionId, 'One Jira connection', { jiraConnectionId: '' }),
    ...chip('country', f.country, `Country: ${f.country}`, { country: '' }),
    ...chip('contractId', f.contractId, `Contract #${f.contractId}`, { contractId: '' }),
    ...chip('opened', f.createdFrom || f.createdTo, `Opened${f.createdFrom ? ` from ${fmtDateTime(f.createdFrom)}` : ''}${f.createdTo ? ` until ${fmtDateTime(f.createdTo)}` : ''}`, { createdFrom: '', createdTo: '' }),
    ...chip('asOf', f.asOf, `Evaluated at ${fmtDateTime(f.asOf)}`, { asOf: '' })
  ];

  return (
    <>
      <PageHead title="Tickets" sub="Synchronized tickets follow their Jira status. Opened is the Jira creation time of a synchronized ticket, otherwise the hub creation time."
        actions={<>{canExportReport(me, 'cases') && <button className="btn" onClick={() => exportCsv('cases', exportParams)}>Export CSV</button>}{canEng && <Link className="btn btn-primary" to="/cases/new">+ New Ticket</Link>}</>} />
      <div className="view-chips" role="group" aria-label="Quick views">
        {views.map(v => <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => applyFilters(v.filter)}>{v.label}<b>{counts.data?.[v.count] ?? '…'}</b></button>)}
      </div>
      <FilterBar chips={chips} onClearAll={() => applyFilters({})} advancedCount={advancedCount}
        common={<>
          <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized" />
          <SelectInput label="Owner" value={f.unassigned ? 'none' : f.ownerId} onChange={v => v === 'none' ? set({ unassigned: 'true', ownerId: '' }) : set({ ownerId: v, unassigned: '' })} options={ownerOptions} empty="Anyone" />
          <SelectInput label="Status" value={f.status} onChange={v => set({ status: v })} options={statusOptions} empty={null} />
          <SelectInput label="Priority" value={f.priority} onChange={v => set({ priority: v })} options={priorityOptions} empty="Any" />
          <SelectInput label="Deadline" value={f.due} onChange={v => set({ due: v })} options={deadlineOptions} empty="Any" />
        </>}
        advanced={<>
          <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
          <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
          <SelectInput label="Scope" value={f.scope} onChange={v => set({ scope: v })} options={scopeOptions} empty="All" />
          <SelectInput label="Attention" value={attention} onChange={v => set({ waiting: v === 'waiting' ? 'true' : '', waitingFor: v === 'customer' ? 'Customer' : '', reviewOverdue: v === 'review' ? 'true' : '', stale: v === 'stale' ? 'true' : '', coverageGap: v === 'coverage' ? 'true' : '' })} options={attentionOptions} empty="Any" />
          <SelectInput label="Contractual SLA" value={f.sla} onChange={v => set({ sla: v })} options={SLA_FILTERS} empty="Any" />
          <TextInput label="Jira key" value={f.jiraKey} onChange={v => set({ jiraKey: v })} placeholder="ABC-123" />
          <SelectInput label="Jira source" value={f.jiraSource} onChange={v => set({ jiraSource: v })} options={sourceOptions} empty="Any" />
          <TextInput label="Jira space" value={f.jiraSpace} onChange={v => set({ jiraSpace: v.toUpperCase() })} placeholder="TAH" />
        </>} />
      <DataTable<CaseRow> rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'} sort={f.sort} onSort={s => set({ sort: s })} caption="Tickets" columnsKey="cases-v2"
        search={{ value: text, onChange: setText, label: 'Search all tickets', placeholder: 'Search all tickets: reference, title, client, Jira key or next action' }} totalCount={q.data?.totalCount} columnFilters={false}
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
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
    </>
  );
}

type AffectedState = { environmentIds: number[]; assetIds: number[]; componentIds: number[]; unknownEnvironmentReason: string };

function AffectedPicker({ clientId, value, onChange, error }: { clientId: number | null; value: AffectedState; onChange: (v: AffectedState) => void; error?: string }) {
  const envs = useQuery({ queryKey: ['envs-of', clientId], queryFn: () => get<Paged<{ id: number; name: string; regionCode?: string }>>(`/environments?clientId=${clientId}&pageSize=200`), enabled: !!clientId });
  const assets = useQuery({ queryKey: ['assets-of-client', clientId], queryFn: () => get<Paged<{ id: number; name: string; environmentName: string }>>(`/assets?clientId=${clientId}&pageSize=200`), enabled: !!clientId });
  if (!clientId) return <div className="wide hint">Internal work need not name an environment.</div>;
  const toggle = (k: 'environmentIds' | 'assetIds', id: number, on: boolean) => onChange({ ...value, [k]: on ? [...value[k], id] : value[k].filter(x => x !== id) });
  return (
    <fieldset className="wide" style={{ border: '1px solid var(--line)', padding: '8px 10px' }}>
      <legend className="flabel">Affected environments and infrastructure (same client)</legend>
      <div>{(envs.data?.items ?? []).map(e => <label key={e.id} className="check" style={{ marginRight: 14 }}><input type="checkbox" checked={value.environmentIds.includes(e.id)} onChange={x => toggle('environmentIds', e.id, x.target.checked)} /> {e.regionCode ? `${e.regionCode} / ` : ''}{e.name}</label>)}</div>
      {(assets.data?.items ?? []).length > 0 && <details style={{ marginTop: 6 }}><summary className="flabel">Affected assets</summary>
        {(assets.data?.items ?? []).map(a => <label key={a.id} className="check" style={{ marginRight: 14 }}><input type="checkbox" checked={value.assetIds.includes(a.id)} onChange={x => toggle('assetIds', a.id, x.target.checked)} /> {a.name} <span className="muted">({a.environmentName})</span></label>)}</details>}
      {value.environmentIds.length === 0 && <div style={{ marginTop: 8 }}><TextInput label="If an environment is expected but not yet identified, say why" value={value.unknownEnvironmentReason} onChange={v => onChange({ ...value, unknownEnvironmentReason: v })} /></div>}
      {error && <div className="err">{error}</div>}
    </fieldset>
  );
}

type ContractOption = { id: number; ref: string; title: string; status: string };

/** Contracts of one client for the case contract choice. */
function useClientContracts(clientId: number | null) {
  return useQuery({ queryKey: ['contracts-of', clientId], queryFn: () => get<Paged<ContractOption>>(`/contracts?clientId=${clientId}&pageSize=100`), enabled: !!clientId });
}

export function CaseForm() {
  const T = useTypes();
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  const me = useMe().data!;
  const existing = useQuery({ queryKey: ['case', id], queryFn: () => get<CaseDto>(`/cases/${id}`), enabled: !isNew });
  const priorities = useEnum('Priority');
  const parties = useEnum('ResponsibleParty');
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const canLead = useRight('Cases', 'Coordinate');
  const f = useForm({
    title: '', type: '', scope: 'Client', clientId: '', responsibleTeamId: '', impactSummary: '', priority: 'Normal', ownerUserId: null as number | null, backupOwnerUserId: null as number | null,
    responsibleParty: 'TIO', responsibleOrganization: '', coordinatorUserId: null as number | null, nextAction: '', nextReviewAt: inDays(2), dueLocal: '', dueTimeZone: me.timeZone,
    affected: { environmentIds: [], assetIds: [], componentIds: [], unknownEnvironmentReason: '' } as AffectedState, changeNote: '', contractId: ''
  });
  const [version, setVersion] = useState<string>();
  useLeaveGuard(f.dirty && !f.busy);
  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setVersion(c.version);
    f.reset({ title: c.title, type: c.type, scope: c.scope, clientId: c.client ? String(c.client.id) : '', responsibleTeamId: c.team ? String(c.team.id) : '', impactSummary: c.impactSummary, priority: c.priority,
      ownerUserId: c.owner?.id ?? null, backupOwnerUserId: c.backupOwner?.id ?? null, responsibleParty: c.responsibleParty, responsibleOrganization: c.responsibleOrganization ?? '', coordinatorUserId: c.coordinator?.id ?? null,
      nextAction: c.nextAction, nextReviewAt: toLocalInput(c.nextReviewAt), dueLocal: '', dueTimeZone: c.dueTimeZone ?? me.timeZone,
      affected: { environmentIds: c.environments.map(e => e.id), assetIds: c.assets.map(a => a.id), componentIds: c.components.map(x => x.id), unknownEnvironmentReason: c.unknownEnvironmentReason ?? '' }, changeNote: '', contractId: c.contract ? String(c.contract.id) : '' });
  }, [existing.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = f.values;
  const cid = v.scope === 'Client' ? toNum(v.clientId) : null;
  const contracts = useClientContracts(isNew ? cid : null);
  const contractOptions = (contracts.data?.items ?? []).map(k => ({ value: String(k.id), label: `${k.ref} · ${k.title}${k.status === 'Active' ? '' : ` (${label(k.status)})`}` }));
  // A61: with exactly one active contract the client's SLA is preselected; anything else is the user's choice.
  useEffect(() => {
    if (!isNew) return;
    const active = (contracts.data?.items ?? []).filter(k => k.status === 'Active');
    f.set('contractId', active.length === 1 ? String(active[0].id) : '');
  }, [contracts.data, cid]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    const affected = isNew || canViewTab(me, 'Cases', 'affected') ? { ...v.affected, unknownEnvironmentReason: v.affected.unknownEnvironmentReason || null } : null;
    const r = await f.submit(async () => {
      if (isNew) return post<{ id: number }>('/cases', { title: v.title, type: v.type || null, scope: v.scope, clientId: cid, responsibleTeamId: toNum(v.responsibleTeamId), impactSummary: v.impactSummary, priority: v.priority,
        ownerUserId: v.ownerUserId, backupOwnerUserId: v.backupOwnerUserId, responsibleParty: v.responsibleParty, responsibleOrganization: v.responsibleOrganization, coordinatorUserId: v.coordinatorUserId,
        nextAction: v.nextAction, nextReviewAt: fromLocalInput(v.nextReviewAt), dueLocal: v.dueLocal || null, dueTimeZone: v.dueLocal ? v.dueTimeZone : null, affected, contractId: cid ? toNum(v.contractId) : null });
      await put(`/cases/${id}`, { title: v.title, type: v.type, responsibleTeamId: toNum(v.responsibleTeamId), impactSummary: v.impactSummary, priority: v.priority, responsibleParty: v.responsibleParty,
        responsibleOrganization: v.responsibleOrganization, coordinatorUserId: v.coordinatorUserId, nextAction: v.nextAction, nextReviewAt: fromLocalInput(v.nextReviewAt), affected, changeNote: v.changeNote || null }, version);
      return { id: Number(id) };
    });
    if (r) { toast(isNew ? 'Ticket created.' : 'Ticket saved.'); refresh(); nav(`/cases/${r.id}`); }
  };
  return (
    <>
      <PageHead title={isNew ? 'New ticket' : `Edit ${existing.data?.ref ?? ''}`} crumbs={[{ to: '/cases', label: 'Tickets' }]} />
      <Panel>
        <FormError error={f.error} />
        {f.error?.isConflict && <button className="btn" style={{ marginBottom: 10 }} onClick={async () => { const r = await existing.refetch(); setVersion(r.data?.version); f.setError(null); }}>Reload latest</button>}
        <div className="form-grid">
          <TextInput label="Title" required wide value={v.title} onChange={x => f.set('title', x)} error={f.fieldError('title')} maxLength={200} />
          <SelectInput label="Ticket type" required value={v.type} onChange={x => f.set('type', x)} options={T.options('CaseType', v.type)} error={f.fieldError('type')} hint={caseTypeGuidance(T.all('CaseType'))} />
          <SelectInput label="Work scope" required value={v.scope} onChange={x => f.set('scope', x)} options={[{ value: 'Client', label: 'Client-related' }, { value: 'Internal', label: 'Internal' }]} empty={null} disabled={!isNew} error={f.fieldError('scope')} />
          {v.scope === 'Client' && <SelectInput label="Client" required value={v.clientId} onChange={x => f.set('clientId', x)} options={clients} error={f.fieldError('clientId')} disabled={!isNew} />}
          {isNew && cid && <SelectInput label="Contract (SLA)" value={v.contractId} onChange={x => f.set('contractId', x)} options={contractOptions} empty="No contract" error={f.fieldError('contractId')}
            hint={contracts.isLoading ? 'Loading contracts…' : contractOptions.length === 0 ? 'This client has no contract: the ticket is not measured against an SLA.' : 'Response and resolution targets are taken from this contract for the ticket priority.'} />}
          <SelectInput label="Responsible team" required value={v.responsibleTeamId} onChange={x => f.set('responsibleTeamId', x)} options={teams} error={f.fieldError('responsibleTeamId')} disabled={!isNew && !canLead} />
          <SelectInput label="Priority" required value={v.priority} onChange={x => f.set('priority', x)} options={enumOptions(priorities)} empty={null} error={f.fieldError('priority')} disabled={(!isNew && !canLead) || !!existing.data?.statusFromJira} hint={existing.data?.statusFromJira ? 'Comes from Jira.' : undefined} />
          <TextInput label="Impact summary" required wide multiline value={v.impactSummary} onChange={x => f.set('impactSummary', x)} error={f.fieldError('impactSummary')} />
          {isNew && <UserPicker label="Owner" value={v.ownerUserId} onChange={x => f.set('ownerUserId', x)} clientId={cid} teamId={v.scope === 'Internal' ? toNum(v.responsibleTeamId) : null} error={f.fieldError('ownerUserId')} hint={canLead ? undefined : 'Leave Unassigned or take it yourself.'} />}
          {isNew && <UserPicker label="Backup owner" value={v.backupOwnerUserId} onChange={x => f.set('backupOwnerUserId', x)} clientId={cid} teamId={v.scope === 'Internal' ? toNum(v.responsibleTeamId) : null} error={f.fieldError('backupOwnerUserId')} empty="None" />}
          <SelectInput label="Responsible party" value={v.responsibleParty} onChange={x => f.set('responsibleParty', x)} options={enumOptions(parties)} empty={null} />
          {v.responsibleParty !== 'TIO' && <TextInput label="Responsible organization" value={v.responsibleOrganization} onChange={x => f.set('responsibleOrganization', x)} />}
          <UserPicker label="Internal coordinator" value={v.coordinatorUserId} onChange={x => f.set('coordinatorUserId', x)} clientId={cid} teamId={v.scope === 'Internal' ? toNum(v.responsibleTeamId) : null} error={f.fieldError('coordinatorUserId')} empty="None" />
          <TextInput label="Next action (optional)" wide value={v.nextAction} onChange={x => f.set('nextAction', x)} error={f.fieldError('nextAction')} />
          <TextInput label={`Next review (${me.timeZone})`} required type="datetime-local" value={v.nextReviewAt} onChange={x => f.set('nextReviewAt', x)} error={f.fieldError('nextReviewAt')} />
          {isNew && <TextInput label="Due (optional)" type="datetime-local" value={v.dueLocal} onChange={x => f.set('dueLocal', x)} error={f.fieldError('dueLocal')} hint="Without a deadline the ticket is listed separately, never as overdue." />}
          {isNew && v.dueLocal && <TimeZoneSelect label="Due time zone" required value={v.dueTimeZone} onChange={x => f.set('dueTimeZone', x)} error={f.fieldError('dueTimeZone')} />}
          {(isNew || canViewTab(me, 'Cases', 'affected')) && <AffectedPicker clientId={cid} value={v.affected} onChange={x => f.set('affected', x)} error={f.fieldError('affected.environmentIds') ?? f.fieldError('affected.assetIds')} />}
          {!isNew && <TextInput label="Change note (kept in the timeline)" wide value={v.changeNote} onChange={x => f.set('changeNote', x)} />}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>Jira tickets are created and updated in Jira by staff; the hub never writes to Jira.{!isNew && ' Change the owner, due date or status with the actions on the ticket page.'}</p>
        <div className="form-actions"><button className="btn" onClick={() => nav(-1)}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{f.busy ? 'Saving…' : isNew ? 'Create ticket' : 'Save ticket'}</button></div>
      </Panel>
    </>
  );
}

export function CaseDetail() {
  const [tab, setTab, allowedTabs] = usePermittedTab('Cases', ['timeline', 'affected', 'jira', 'impact', 'commitments', 'escalations', 'files', 'history']);
  const T = useTypes();
  const { id } = useParams();
  const q = useQuery({ queryKey: ['case', id], queryFn: () => get<CaseDto>(`/cases/${id}`) });
  const impact = useQuery({ queryKey: ['impact', id], queryFn: () => get<CaseImpact>(`/cases/${id}/impact`), enabled: allowedTabs.includes('impact') });
  const me = useMe().data!;
  const canCoordinate = useRight('Cases', 'Coordinate');
  const canCreateEscalation = useRight('OtherOperations', 'Create');
  const canCreateCommitment = useRight('Commitments', 'Create');
  const teams = useTeamOptions();

  const [dialog, setDialog] = useState<string | null>(null);
  const c = q.data;
  const p = c?.permissions;
  const caseStatusLabel = useEnumLabel('CaseStatus');
  const open = c && !['Closed', 'Cancelled'].includes(c.status);
  const close = () => setDialog(null);
  const common = { path: '', version: c?.version, onClose: close };
  // A61: a progress update can be the first response to the customer, until one is recorded.
  const activity = useQuery({ queryKey: ['case-activity', Number(id), 'latest'], queryFn: () => get<{ items: { kind: string; source: string; title: string; actor?: string; at: string }[] }>(`/cases/${id}/activity?filter=all&system=true&pageSize=1`), enabled: allowedTabs.includes('timeline') });
  const latest = activity.data?.items[0];
  const measured = !!c?.contract && c.sla.resolution.status !== 'NotApplicable';
  const breached = measured && [c!.sla.response.status, c!.sla.resolution.status].includes('Breached');
  const affectedCount = c ? c.environments.length + c.assets.length + c.components.length : 0;
  const responseField = c?.contract && !c.sla.response.actualAt && !c.statusFromJira ? [{ name: 'customerResponse', label: 'This update was sent to the customer (first response)', kind: 'checkbox' as const, hint: 'Records the first response for the contractual SLA at this time.' }] : [];
  return (
    <QueryState q={q}>{c && p && (<>
      <PageHead title={`${c.ref} · ${c.title}`} crumbs={[{ to: '/cases', label: 'Tickets' }, ...(c.client ? [{ to: `/clients/${c.client.id}`, label: c.client.code }] : [{ label: 'Internal' }]), { label: c.ref }]}
        sub={<><StatusBadge value={c.statusCode} enumName="CaseStatus" />{c.status === 'Cancelled' && <span className="chip">Cancelled</span>} <StatusBadge value={c.priority} /> {T.name('CaseType', c.type)} · {c.scope === 'Internal' ? 'Internal work' : 'Client-related'} {c.waiting && <Badge tone="warn">Waiting on {label(c.waiting.reason)}</Badge>} {c.overdue && <Badge tone="bad">Overdue</Badge>} {c.ownerDeactivated && <Badge tone="bad">Owner deactivated</Badge>}</>}
        actions={<>
          {p.canEdit && <Link className="btn" to={`/cases/${id}/edit`}>Edit</Link>}
          {p.canTriage && <button className="btn btn-primary" onClick={() => setDialog('triage')}>Triage</button>}
          {p.canAssign && open && <button className="btn" onClick={() => setDialog('assign')}>{c.unassigned ? 'Assign' : 'Reassign'}</button>}
          {p.canStart && <button className="btn btn-primary" onClick={() => setDialog('start')}>Start work</button>}
          {p.canEdit && open && <button className="btn" onClick={() => setDialog('progress')}>Record progress</button>}
          {p.canSetWaiting && <button className="btn" onClick={() => setDialog(c.waiting ? 'unwait' : 'wait')}>{c.waiting ? 'End waiting' : 'Set waiting'}</button>}
          {p.canRequestValidation && <button className="btn" onClick={() => setDialog('validate')}>Request validation</button>}
          {p.canReturnToWork && <button className="btn" onClick={() => setDialog('resume')}>Return to work</button>}
          {p.canClose && <button className="btn btn-primary" onClick={() => setDialog('close')}>Close</button>}
          {p.canReopen && <button className="btn" onClick={() => setDialog('reopen')}>Reopen</button>}
          <DeleteAction button path={`/cases/${c.id}`} what={`ticket ${c.ref}`} afterTo={'/cases'} more={[
            { label: 'Change status', onClick: () => setDialog('status'), hidden: !p.canChangeStatus || c.statusOptions.length === 0 },
            { label: 'Change due date', onClick: () => setDialog('due'), hidden: !p.canChangeDue },
            { label: 'Cancel ticket', onClick: () => setDialog('cancel'), danger: true, hidden: !p.canCancel }
          ]} /></>} />
      {c.statusFromJira && <div className="notice">This ticket's status follows Jira, so change it there. {!c.contract ? (c.contractFromJiraSpace ? "No contract linked to this Jira space covers the ticket's creation date, so it is not measured." : 'Link an SLA contract to calculate the due dates from the Jira creation time.') : c.sla.resolution.status === 'NotApplicable' ? 'This ticket is not measured against the linked contract, so it has no contractual due dates; the reason is under Contractual SLA.' : 'The due dates come from the Jira creation time and the contract SLA.'}</div>}
      {c.clientRepresentative && open && <div className="notice">Assigned in Jira to {c.clientRepresentative}, representing the client. The ticket waits on the customer until Jira reassigns it.</div>}
      {!c.statusFromJira && c.status === 'Triaged' && c.unassigned && <div className="notice warn">Unassigned: an active owner is required before work can start.</div>}
      <RecordLayout asideLabel="Ticket details" main={<>
        <KeyFacts label="What matters now" items={[
          { label: 'Latest activity', value: latest ? <span className="focus-text">{latest.source === 'TIO' && latest.kind !== 'Comment' ? label(latest.kind) : latest.title}</span> : <span className="muted">{activity.isLoading ? 'Loading…' : 'No activity yet'}</span>,
            meta: latest && <>{latest.actor ?? 'System'} · {fmtDateTime(latest.at)}</> },
          { label: 'Next action', value: c.nextAction?.trim() || <span className="muted">None recorded</span>, tone: c.reviewOverdue ? 'bad' : undefined,
            meta: <>Next review <When v={c.nextReviewAt} />{c.reviewOverdue && <> <Badge tone="bad">Review passed</Badge></>}</> },
          { label: 'Owner', value: <><Person u={c.owner} />{c.jiraSource?.ownerFromJira && <> <Badge tone="info">from Jira</Badge></>}</>,
            meta: <>{c.team?.name ?? 'No team'}{c.backupOwner ? ` · backup ${c.backupOwner.name}` : ''}</> },
          { label: 'SLA and deadline', value: measured ? <SlaPair response={c.sla.response.status} resolution={c.sla.resolution.status} /> : <span className="muted">Not measured against a contract</span>,
            tone: breached || c.overdue ? 'bad' : undefined,
            meta: <>{c.dueAt ? <>Due {c.dueLocal} ({c.dueTimeZone})</> : 'No deadline'}{c.scope === 'Client' && p.canEdit && open && !c.statusFromJira && c.contract && !c.sla.response.actualAt && <> · <button className="linkbtn" onClick={() => setDialog('respond')}>Record first response</button></>}</> }
        ]} />
        {c.jiraSource && <JiraSection s={c.jiraSource} caseId={c.id} canSync={p.canEdit} />}
        <div className="rv-tabs"><Tabs value={tab} onChange={setTab} tabs={[{ key: 'timeline', label: 'Activity' }, { key: 'affected', label: `Affected records (${affectedCount})` }, { key: 'jira', label: `Jira references (${c.jiraReferences.length})` }, { key: 'impact', label: 'Documented impact' }, { key: 'commitments', label: `Commitments (${c.commitments.length})` }, { key: 'escalations', label: 'Escalations' }, { key: 'files', label: 'Attachments' }, { key: 'history', label: 'Field history' }].filter(t => allowedTabs.includes(t.key))} /></div>
        {tab === 'timeline' && <CaseActivity caseId={c.id} canComment={p.canEdit} />}
        {tab === 'affected' && <AffectedRecordsTab c={c} />}
        {tab === 'jira' && <JiraReferencesTab c={c} canAdd={p.canEdit && hasRight(me, 'tab.Cases.jira', 'Create')} canRemove={p.canEdit && hasRight(me, 'tab.Cases.jira', 'Delete')} onAdd={() => setDialog('jira')} onRemove={j => setDialog(`unjira-${j}`)} />}
        {tab === 'impact' && <ImpactTab c={c} q={impact} />}
        {tab === 'commitments' && <CommitmentsTab c={c} createTo={canCreateCommitment ? `/commitments/new?caseId=${id}${c.client ? `&clientId=${c.client.id}` : `&teamId=${c.team?.id ?? ''}`}` : undefined} />}
        {tab === 'escalations' && <TabSection title="Escalations about this ticket" actions={c.client && canCreateEscalation && <Link className="btn" to={`/escalations/new?clientId=${c.client.id}&caseId=${c.id}`}>+ Escalation</Link>}><EscalationTable clientId={c.client?.id} caseId={c.id} compact /></TabSection>}
        {tab === 'files' && <AttachmentsWorkspace recordType="Case" recordId={c.id} />}
        {tab === 'history' && <TicketHistory caseId={c.id} />}
      </>} aside={<>
        <SideSection id="ticket-summary" title="Management summary">
          <FactList items={[
            ['Owner', <><Person u={c.owner} />{c.jiraSource?.ownerFromJira && <> <Badge tone="info">from Jira</Badge></>}</>], !!c.internalAssignee && ['Assigned in Jira to', <>{c.internalAssignee} <Badge tone="info">Vitronic team member</Badge></>],
            ['Backup owner', <Person u={c.backupOwner} gap="None" />], ['Responsible team', c.team?.name], ['Coordinator', c.coordinator ? <Person u={c.coordinator} /> : <span className="muted">—</span>],
            ['Responsible party', `${label(c.responsibleParty)}${c.responsibleOrganization ? ` · ${c.responsibleOrganization}` : ''}`],
            ['Impact', c.impactSummary], ['Progress', c.progressSummary ?? <span className="muted">No progress recorded</span>],
            ['Next action', c.nextAction], ['Next review', <><When v={c.nextReviewAt} />{c.reviewOverdue && <> <Badge tone="bad">Review passed</Badge></>}</>],
            ['Due', c.dueAt ? <>{c.dueLocal} <span className="muted">({c.dueTimeZone})</span></> : <span className="muted">No deadline</span>],
            ['Last progress update', <><When v={c.lastReviewedAt} /> <FreshnessBadge f={c.freshness} /></>]
          ]} />
        </SideSection>
        <SideSection id="ticket-age" title="Age and waiting" note={`${c.ageDays} days`}>
          <FactList items={[
            ['Opened', fmtDateTime(c.openedAt), { hint: `(${c.openedFromJira ? 'Jira creation time' : 'hub creation time'})` }],
            c.openedFromJira && ['Added to the hub', fmtDateTime(c.createdAt), { hint: '(import time; not used for age, deadlines or opened reporting)' }],
            [open ? 'Age since opening' : 'Age from opening to closing', `${c.ageDays} days`], c.currentCycleAgeDays !== undefined && c.currentCycleAgeDays !== null && ['Current cycle age (after reopen)', `${c.currentCycleAgeDays} days`],
            ['Reopened', `${c.reopenCount} time(s)`],
            ['Recorded waiting', `${c.waitingHours} h`, { hint: `(the operational due date is not paused${c.sla.applied?.pausesWhileWaitingOnCustomer ? '; the contractual SLA pauses while waiting on the customer' : ''})` }],
            !!c.waiting && ['Waiting now', <Badge tone="warn">On {label(c.waiting.reason)}</Badge>, { hint: <>since {fmtDateTime(c.waiting.since)}</> }],
            ['Validation request', c.validationRequest], ['Outcome', c.outcome], ['Validation evidence', c.validationEvidence],
            !!c.evidenceException && ['Evidence exception', c.evidenceException.reason, { hint: <>Authorized by {c.evidenceException.approvedBy?.name} · follow-up {c.evidenceException.followUpOwner?.name} by {c.evidenceException.followUpDate}</> }],
            !!c.cancelReason && ['Cancellation reason', c.cancelReason]
          ]} />
          {c.waitingIntervals.length > 0 && <details className="rv-details">
            <summary>Waiting periods ({c.waitingIntervals.length})</summary>
            <ul className="rv-penalties">{c.waitingIntervals.map((w, i) => <li key={i}><span><b>{label(w.reason)}</b>{w.note && <div className="hint">{w.note}</div>}</span><span className="hint" style={{ textAlign: 'right' }}>{fmtDateTime(w.startedAt)} –<br />{w.endedAt ? fmtDateTime(w.endedAt) : 'ongoing'}</span></li>)}</ul>
          </details>}
        </SideSection>
        {c.scope === 'Client' && <SlaSections c={c} canEdit={p.canEdit && !!open && !c.statusFromJira} canChangeContract={canCoordinate && !c.contractFromJiraSpace} onRespond={() => setDialog('respond')} onContract={() => setDialog('contract')} />}
      </>} />

      {dialog === 'triage' && <ActionDialog {...common} title="Triage ticket" path={`/cases/${id}/triage`} submitLabel="Confirm triage" intro="Confirm scope, team, impact, priority and next-review time. Next action is optional."
        initial={{ responsibleTeamId: c.team ? String(c.team.id) : '', impactSummary: c.impactSummary, priority: c.priority, nextAction: c.nextAction, nextReviewAt: toLocalInput(c.nextReviewAt) }}
        fields={[{ name: 'responsibleTeamId', label: 'Responsible team', kind: 'select', required: true, options: teams }, { name: 'impactSummary', label: 'Impact', kind: 'textarea', required: true }, { name: 'priority', label: 'Priority', kind: 'select', required: true, options: ['Critical', 'High', 'Normal', 'Low'].map(x => ({ value: x, label: x })) },
          { name: 'nextAction', label: 'Next action (optional)' }, { name: 'nextReviewAt', label: 'Next review', kind: 'datetime', required: true }, { name: 'ownerUserId', label: 'Owner (optional)', kind: 'user', clientId: c.client?.id, teamId: c.team?.id }]}
        transform={v => ({ responsibleTeamId: toNum(v.responsibleTeamId) ?? c.team?.id, impactSummary: v.impactSummary, priority: v.priority, nextAction: v.nextAction, nextReviewAt: fromLocalInput(v.nextReviewAt), ownerUserId: toNum(v.ownerUserId) })} />}
      {dialog === 'assign' && <ActionDialog {...common} title="Assign owner" path={`/cases/${id}/assign`} submitLabel="Assign" intro={!canCoordinate ? 'You can take unassigned work of your own team. Only a Team Lead or the TIO Manager can assign someone else.' : 'Ownership changes are kept in the timeline.'}
        fields={[{ name: 'ownerUserId', label: 'Owner', kind: 'user', clientId: c.client?.id, teamId: c.team?.id }, { name: 'backupOwnerUserId', label: 'Backup owner', kind: 'user', clientId: c.client?.id, teamId: c.team?.id }, { name: 'reason', label: 'Reason' }]}
        transform={v => ({ ownerUserId: toNum(v.ownerUserId) ?? (!canCoordinate ? me.id : null), backupOwnerUserId: toNum(v.backupOwnerUserId) ?? c.backupOwner?.id ?? null, reason: v.reason || null })} />}
      {dialog === 'start' && <ActionDialog {...common} title="Start work" path={`/cases/${id}/start`} submitLabel="Start" fields={[{ name: 'progressSummary', label: 'Progress (optional)', kind: 'textarea' }, ...responseField]} transform={v => ({ progressSummary: v.progressSummary || null, customerResponse: v.customerResponse === 'true' })} />}
      {dialog === 'progress' && <ActionDialog {...common} title="Record progress" path={`/cases/${id}/progress`} submitLabel="Save progress"
        fields={[{ name: 'progressSummary', label: 'Progress summary', kind: 'textarea', required: true }, { name: 'nextAction', label: 'Next action (optional)' }, { name: 'nextReviewAt', label: 'Next review', kind: 'datetime', required: true }, ...responseField]}
        transform={v => ({ progressSummary: v.progressSummary, nextAction: v.nextAction, nextReviewAt: fromLocalInput(v.nextReviewAt), customerResponse: v.customerResponse === 'true' })} />}
      {dialog === 'respond' && <ActionDialog {...common} title="Record first response" path={`/cases/${id}/first-response`} submitLabel="Record response"
        intro="The first response to the customer stops the contractual response clock. Record when it was actually sent; it is recorded once. Internal notes are not a response."
        fields={[{ name: 'respondedAt', label: `Sent at (${me.timeZone}; empty = now)`, kind: 'datetime' }, { name: 'channel', label: 'Channel', kind: 'select', required: true, options: ['Email', 'Phone', 'Customer portal', 'Meeting', 'Jira comment', 'Other'].map(x => ({ value: x, label: x })) }, { name: 'note', label: 'Note', kind: 'textarea' }]}
        transform={v => ({ respondedAt: v.respondedAt ? fromLocalInput(v.respondedAt) : null, channel: v.channel, note: v.note || null })} />}
      {dialog === 'contract' && <ContractDialog c={c} onClose={close} />}
      {dialog === 'wait' && <ActionDialog {...common} title="Set waiting" path={`/cases/${id}/waiting`} submitLabel="Set waiting" intro="Waiting on the customer also shows as the Waiting for customer status; other reasons keep the current status. Deadlines continue to run."
        fields={[{ name: 'reason', label: 'Waiting on', kind: 'select', required: true, options: ['Customer', 'InternalTeam', 'Vendor', 'PlannedChange'].map(x => ({ value: x, label: label(x) })) }, { name: 'note', label: 'Note' }, { name: 'nextReviewAt', label: 'Next review', kind: 'datetime', required: true }]}
        transform={v => ({ reason: v.reason, note: v.note || null, nextReviewAt: fromLocalInput(v.nextReviewAt) })} />}
      {dialog === 'unwait' && <ActionDialog {...common} title="End waiting" path={`/cases/${id}/waiting/clear`} submitLabel="End waiting" fields={[{ name: 'reason', label: 'Note' }]} />}
      {dialog === 'status' && <ActionDialog {...common} title="Change status" path={`/cases/${id}/status`} submitLabel="Change status" intro="Other changes, such as starting work or closing, have their own action on this page."
        fields={[{ name: 'code', label: 'Status', kind: 'select', required: true, options: c.statusOptions.map(s => ({ value: s, label: caseStatusLabel(s) })) }]} />}
      {dialog === 'validate' && <ActionDialog {...common} title="Request validation" path={`/cases/${id}/request-validation`} submitLabel="Request validation" intro="Describe the delivered outcome and what should be validated. A validation request can be recorded without a next action."
        fields={[{ name: 'progressSummary', label: 'Delivered outcome / progress', kind: 'textarea', required: true }, { name: 'validationRequest', label: 'Validation request' }, { name: 'nextAction', label: 'Next action (optional)' }, { name: 'nextReviewAt', label: 'Next review', kind: 'datetime' }]}
        transform={v => ({ progressSummary: v.progressSummary, validationRequest: v.validationRequest || null, nextAction: v.nextAction || null, nextReviewAt: v.nextReviewAt ? fromLocalInput(v.nextReviewAt) : null })} />}
      {dialog === 'resume' && <ActionDialog {...common} title="Return to work" path={`/cases/${id}/resume`} submitLabel="Return to In progress" fields={[{ name: 'reason', label: 'Why validation did not pass', kind: 'textarea', required: true }]} />}
      {dialog === 'close' && <CloseDialog c={c} canException={p.canAuthorizeEvidenceException} onClose={close} />}
      {dialog === 'due' && <ActionDialog {...common} title="Change due date" path={`/cases/${id}/due`} initial={{ dueTimeZone: c.dueTimeZone ?? me.timeZone }} submitLabel="Save due date" intro="Due-date changes need a reason and are kept in the timeline. Leave the date empty and tick nothing to remove the deadline."
        fields={[{ name: 'dueLocal', label: 'New due (local time)', kind: 'datetime' }, { name: 'dueTimeZone', label: 'Time zone', kind: 'timezone', required: true }, { name: 'reason', label: 'Reason', kind: 'textarea', required: true }]}
        transform={v => ({ dueLocal: v.dueLocal || null, dueTimeZone: v.dueTimeZone || c.dueTimeZone || me.timeZone, clear: !v.dueLocal, reason: v.reason })} />}
      {dialog === 'cancel' && <ActionDialog {...common} title="Cancel ticket" danger path={`/cases/${id}/cancel`} submitLabel="Cancel ticket" intro="Links and history are kept." fields={[{ name: 'reason', label: 'Cancellation reason', kind: 'textarea', required: true }]} />}
      {dialog === 'reopen' && <ActionDialog {...common} title="Reopen ticket" path={`/cases/${id}/reopen`} submitLabel="Reopen" intro="The earlier closure or cancellation stays in history. Ownership is rechecked."
        fields={[{ name: 'reason', label: 'Reopening reason', kind: 'textarea', required: true }, { name: 'nextAction', label: 'Next action (optional)' }, { name: 'nextReviewAt', label: 'Next review', kind: 'datetime', required: true }]}
        transform={v => ({ reason: v.reason, nextAction: v.nextAction, nextReviewAt: fromLocalInput(v.nextReviewAt) })} />}
      {dialog === 'jira' && <JiraDialog caseId={c.id} onClose={close} />}
      {dialog?.startsWith('unjira-') && <ActionDialog {...common} title="Remove Jira reference" danger path={`/cases/${id}/jira/${dialog.slice(7)}/remove`} submitLabel="Remove" intro="The reference stays in the audit history." fields={[{ name: 'reason', label: 'Reason', required: true }]} />}
    </>)}</QueryState>
  );
}

function ContractDialog({ c, onClose }: { c: CaseDto; onClose: () => void }) {
  const contracts = useClientContracts(c.client?.id ?? null);
  const options = [...(contracts.data?.items ?? []).filter(k => k.id !== c.contract?.id).map(k => ({ value: String(k.id), label: `${k.ref} · ${k.title}${k.status === 'Active' ? '' : ` (${label(k.status)})`}` }))];
  return <ActionDialog title={c.contract ? 'Change contract' : 'Link contract'} path={`/cases/${c.id}/contract`} version={c.version} onClose={onClose} submitLabel="Save contract"
    intro="The response and resolution targets are taken again from the chosen contract for the ticket priority and the ticket is measured again from its clock start. The change is kept in the timeline."
    fields={[{ name: 'contractId', label: 'Contract', kind: 'select', options, hint: c.contract ? 'Leave empty to remove the contract: the ticket is then not measured.' : undefined }, { name: 'reason', label: 'Reason', kind: 'textarea', required: !!c.contract }]}
    transform={v => ({ contractId: toNum(v.contractId), reason: v.reason || null })} />;
}

function CloseDialog({ c, canException, onClose }: { c: CaseDto; canException: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'evidence' | 'exception'>('evidence');
  const fields = mode === 'evidence'
    ? [{ name: 'outcome', label: 'Outcome', kind: 'textarea' as const, required: true }, { name: 'validationEvidence', label: 'Validation evidence', kind: 'textarea' as const, required: true }]
    : [{ name: 'outcome', label: 'Outcome', kind: 'textarea' as const, required: true }, { name: 'evidenceExceptionReason', label: 'Manager exception reason', kind: 'textarea' as const, required: true },
       { name: 'followUpOwnerId', label: 'Follow-up owner', kind: 'user' as const, required: true, clientId: c.client?.id, teamId: c.team?.id }, { name: 'followUpDate', label: 'Follow-up date', kind: 'date' as const, required: true }];
  return (
    <>
      <ActionDialog key={mode} title="Close ticket" path={`/cases/${c.id}/close`} version={c.version} onClose={onClose} submitLabel="Close ticket"
        intro={<>An outcome is always required. Without validation evidence, only the TIO Manager can authorize a ticket-specific exception; an engineer's reason alone cannot waive evidence.
          {canException && <div style={{ marginTop: 6 }}><label className="check"><input type="checkbox" checked={mode === 'exception'} onChange={e => setMode(e.target.checked ? 'exception' : 'evidence')} /> Close without evidence (Manager exception)</label></div>}</>}
        fields={fields} transform={v => ({ outcome: v.outcome, validationEvidence: v.validationEvidence || null, evidenceExceptionReason: v.evidenceExceptionReason || null, followUpOwnerId: toNum(v.followUpOwnerId ?? ''), followUpDate: v.followUpDate || null })} />
    </>
  );
}

function JiraDialog({ caseId, onClose }: { caseId: number; onClose: () => void }) {
  const ref = useReference().data;
  const f = useForm({ jiraInstanceId: '', issueKey: '', url: '', reuseReason: '' });
  const key = useDebounced(f.values.issueKey.trim().toUpperCase());
  const reuse = useQuery({ queryKey: ['reuse', f.values.jiraInstanceId, key], queryFn: () => get<{ reused: boolean; visible: { id: number; ref: string; title: string }[] }>(`/jira/reuse${qs({ instanceId: f.values.jiraInstanceId, key, exceptCaseId: caseId })}`), enabled: !!f.values.jiraInstanceId && key.length > 2 });
  const instance = ref?.jiraInstances.find(j => String(j.id) === f.values.jiraInstanceId);
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const ok = await f.submit(v => post(`/cases/${caseId}/jira`, { jiraInstanceId: toNum(v.jiraInstanceId), issueKey: v.issueKey, url: v.url, reuseReason: v.reuseReason || null }).then(() => true));
    if (ok) { toast('Jira reference added.'); refresh(); onClose(); }
  };
  return (
    <Dialog title="Add manual Jira reference" onClose={onClose}>
      <div className="notice">No Jira request is made. Enter the instance, the issue key and the approved HTTPS ticket link.</div>
      <FormError error={f.error} />
      <div className="form-grid">
        <SelectInput label="Jira instance" required value={f.values.jiraInstanceId} onChange={v => f.set('jiraInstanceId', v)} options={(ref?.jiraInstances ?? []).filter(j => j.isActive).map(j => ({ value: String(j.id), label: j.name }))} error={f.fieldError('jiraInstanceId')} />
        <TextInput label="Issue key" required value={f.values.issueKey} onChange={v => f.set('issueKey', v.toUpperCase())} error={f.fieldError('issueKey')} placeholder="ABC-123" />
        <TextInput label="Ticket URL" required wide value={f.values.url} onChange={v => f.set('url', v)} error={f.fieldError('url')} hint={instance?.approvedHost ? `Must be https://${instance.approvedHost}/… and name the same key.` : 'No approved host configured for this instance.'} />
        {reuse.data?.reused && <div className="wide notice warn">This instance and key are already linked to {reuse.data.visible.map(v => <span key={v.id}><Link to={`/cases/${v.id}`}>{v.ref}</Link> </span>)}.</div>}
        <TextInput label="Reason for linking this issue" required wide value={f.values.reuseReason} onChange={v => f.set('reuseReason', v)} error={f.fieldError('reuseReason')} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Add reference</button></div>
    </Dialog>
  );
}
