import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { exportCsv, get, post, put, qs, type Paged, type UserRef } from '../api';
import { fmtDateTime, fromLocalInput, inDays, label, toLocalInput } from '../format';
import { useDebounced, useEnum, useEnumLabel, useForm, useLeaveGuard, useMe, usePermission, useReference, useRefresh, useUrlState, useTypes } from '../hooks';
import { ActionDialog, TimeZoneSelect, UserPicker } from '../ui/pickers';
import { Badge, DataTable, Dialog, DL, enumOptions, FormError, FreshnessBadge, PageHead, Pager, Panel, Person, QueryState, SelectInput, StateMessage, StatusBadge, Tabs, TextInput, useToast, When, type FreshnessT, DeleteAction } from '../ui/kit';
import { HistoryPanel, toNum, useClientOptions, useProductOptions, useTeamOptions } from './common';
import { AttachmentsPanel } from './Attachments';
import { EscalationTable } from './Escalations';

type CaseRow = { id: number; ref: string; title: string; type: string; scope: string; status: string; priority: string; clientId?: number; clientCode?: string; teamName?: string; ownerName?: string; ownerDeactivated: boolean; waitingReason?: string; nextAction: string; nextReviewAt: string; dueAt?: string; overdue: boolean; reviewOverdue: boolean; stale: boolean; jiraKeys: string[];
  contractRef?: string; responseSla: string; resolutionSla: string };

/** A61: contractual SLA filters of the case list (also the dashboard drill-downs). */
export const SLA_FILTERS = [
  { value: 'withContract', label: 'Contract linked' }, { value: 'noContract', label: 'No contract linked' },
  { value: 'approaching', label: 'Deadline within 24 hours' }, { value: 'breached', label: 'Any obligation breached' },
  { value: 'responseMet', label: 'Response met' }, { value: 'responseBreached', label: 'Response breached' }, { value: 'responsePending', label: 'Response pending' }, { value: 'responseNotMeasurable', label: 'Response not measurable' },
  { value: 'resolutionMet', label: 'Resolution met' }, { value: 'resolutionBreached', label: 'Resolution breached' }, { value: 'resolutionPending', label: 'Resolution pending' }, { value: 'resolutionNotMeasurable', label: 'Resolution not measurable' }
];

/** Compact response / resolution outcome for tables. */
export function SlaPair({ response, resolution }: { response: string; resolution: string }) {
  if (response === 'NotApplicable' && resolution === 'NotApplicable') return <span className="muted">—</span>;
  return <span className="sla-pair"><span title="Response">R <StatusBadge value={response} /></span> <span title="Resolution">X <StatusBadge value={resolution} /></span></span>;
}

export function CaseList() {
  const caseStatusLabel = useEnumLabel('CaseStatus');
  const me = useMe().data!;
  const [f, set] = useUrlState({ status: 'open', scope: '', clientId: '', teamId: '', ownerId: '', unassigned: '', priority: '', due: '', waiting: '', reviewOverdue: '', stale: '', productId: '', jiraKey: '', q: '', coverageGap: '', country: '', asOf: '', contractId: '', sla: '', createdFrom: '', createdTo: '', sort: '-created', page: '1', pageSize: '15' });
  const [text, setText] = useState(f.q);
  const dq = useDebounced(text);
  useEffect(() => { if (dq !== f.q) set({ q: dq }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = useQuery({ queryKey: ['cases', f], queryFn: () => get<Paged<CaseRow>>(`/cases${qs(f)}`) });
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const statuses = useEnum('CaseStatus');
  const priorities = useEnum('Priority');
  const canEng = usePermission('Cases', 'Create');
  const exportParams = Object.fromEntries(Object.entries(f).filter(([k]) => !['sort', 'page', 'pageSize'].includes(k)));
  const filtered = Object.entries(f).some(([k, v]) => !['sort', 'page', 'pageSize', 'status'].includes(k) && v);
  return (
    <>
      <PageHead title="Cases" sub="Hub management records. Status is independent of any Jira ticket; Unassigned is an ownership gap, not a status."
        actions={<>{me.grants.export && <button className="btn" onClick={() => exportCsv('cases', exportParams)}>Export CSV</button>}{canEng && <Link className="btn btn-primary" to="/cases/new">+ New Case</Link>}</>} />
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized" />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
        <SelectInput label="Owner" value={f.unassigned ? 'none' : f.ownerId} onChange={v => v === 'none' ? set({ unassigned: 'true', ownerId: '' }) : set({ ownerId: v, unassigned: '' })} options={[{ value: String(me.id), label: 'Me' }, { value: 'none', label: 'Unassigned' }]} empty="Anyone" />
        <SelectInput label="Deadline" value={f.due} onChange={v => set({ due: v })} options={[{ value: 'overdue', label: 'Overdue' }, { value: '24h', label: 'Due within 24 hours' }, { value: 'upcoming', label: 'Due soon' }, { value: 'none', label: 'No deadline' }]} empty="Any" />
        <SelectInput label="Attention" value={f.waiting ? 'waiting' : f.reviewOverdue ? 'review' : f.stale ? 'stale' : f.coverageGap ? 'coverage' : ''}
          onChange={v => set({ waiting: v === 'waiting' ? 'true' : '', reviewOverdue: v === 'review' ? 'true' : '', stale: v === 'stale' ? 'true' : '', coverageGap: v === 'coverage' ? 'true' : '' })}
          options={[{ value: 'waiting', label: 'Waiting' }, { value: 'review', label: 'Next review passed' }, { value: 'stale', label: 'Stale review' }, { value: 'coverage', label: 'No backup (coverage policy)' }]} empty="Any" />
        <SelectInput label="Contractual SLA" value={f.sla} onChange={v => set({ sla: v })} options={SLA_FILTERS} empty="Any" />
        <TextInput label="Jira key" value={f.jiraKey} onChange={v => set({ jiraKey: v })} placeholder="ABC-123" />
        {(f.contractId || f.createdFrom || f.createdTo) && <div className="notice" style={{ margin: 0 }}>
          {f.contractId && <>Contract #{f.contractId}. </>}{(f.createdFrom || f.createdTo) && <>Opened {f.createdFrom ? `from ${fmtDateTime(f.createdFrom)}` : ''} {f.createdTo ? `until ${fmtDateTime(f.createdTo)}` : ''} (from dashboard). </>}
          <button className="linkbtn" onClick={() => set({ contractId: '', createdFrom: '', createdTo: '' })}>Clear</button></div>}
        {f.asOf && <div className="notice" style={{ margin: 0 }}>Evaluated at {fmtDateTime(f.asOf)} (from dashboard). <button className="linkbtn" onClick={() => set({ asOf: '' })}>Use now</button></div>}
      </div>
      <DataTable<CaseRow> rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'} sort={f.sort} onSort={s => set({ sort: s })} caption="Cases"
        columns={[
          { key: 'ref', header: 'Ref', sort: 'ref', render: r => <Link to={`/cases/${r.id}`}>{r.ref}</Link>, filter: <input className="input" aria-label="Search cases" placeholder="Search title or ref" value={text} onChange={e => setText(e.target.value)} style={{ minWidth: 150 }} /> },
          { key: 'title', header: 'Title', sort: 'title', render: r => <Link to={`/cases/${r.id}`}>{r.title}</Link> },
          { key: 'client', header: 'Client / scope', sort: 'client', render: r => r.clientCode ?? <span className="chip">Internal</span>,
            filter: <select className="input" aria-label="Filter by scope" value={f.scope} onChange={e => set({ scope: e.target.value })}><option value="">All</option><option value="Client">Client-related</option><option value="Internal">Internal</option></select> },
          { key: 'status', header: 'Status', sort: 'status', render: r => <StatusBadge value={r.status} enumName="CaseStatus" />,
            filter: <select className="input" aria-label="Filter by status" value={f.status} onChange={e => set({ status: e.target.value })}><option value="open">Open</option><option value="all">All</option><option value="done">Closed or cancelled</option>{statuses.map(s => <option key={s} value={s}>{caseStatusLabel(s)}</option>)}</select> },
          { key: 'priority', header: 'Priority', sort: 'priority', render: r => <StatusBadge value={r.priority} />,
            filter: <select className="input" aria-label="Filter by priority" value={f.priority} onChange={e => set({ priority: e.target.value })}><option value="">All</option>{priorities.map(s => <option key={s}>{s}</option>)}</select> },
          { key: 'owner', header: 'Owner', sort: 'owner', render: r => r.ownerName ? <>{r.ownerName}{r.ownerDeactivated && <> <Badge tone="bad">Deactivated</Badge></>}</> : <span className="muted">Unassigned</span> },
          { key: 'team', header: 'Team', render: r => r.teamName },
          { key: 'next', header: 'Next action / review', render: r => <>{r.nextAction}<div className="hint">{fmtDateTime(r.nextReviewAt)}{r.reviewOverdue && ' · review passed'}</div></> },
          { key: 'due', header: 'Due', sort: 'due', render: r => r.dueAt ? <span className={r.overdue ? 'err' : ''}>{fmtDateTime(r.dueAt)}{r.overdue && ' · overdue'}</span> : <span className="muted">No deadline</span> },
          { key: 'sla', header: 'Contractual SLA', render: r => <>{r.contractRef && <div className="hint mono">{r.contractRef}</div>}<SlaPair response={r.responseSla} resolution={r.resolutionSla} /></> },
          { key: 'flags', header: 'Flags', render: r => <>{r.waitingReason && <Badge tone="warn">Waiting: {label(r.waitingReason)}</Badge>}{r.stale && <Badge tone="bad">Stale</Badge>}</> },
          { key: 'jira', header: 'Jira', render: r => r.jiraKeys.map(k => <span key={k} className="chip mono">{k}</span>) }, { key: 'del', header: '', className: 'row-actions', render: r => <DeleteAction path={`/cases/${r.id}`} what={`case ${r.ref}`} /> }
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

type SlaObligation = { status: string; dueAt?: string; actualAt?: string; elapsedMinutes?: number; breachMinutes?: number };
type CaseSlaT = {
  applied?: { contractRef: string; priority?: string; responseMinutes?: number; resolutionMinutes?: number; basis: string; support24x7: boolean; supportDays: string; supportFrom?: string; supportTo?: string; timeZone?: string; pausesWhileWaitingOnCustomer: boolean; at: string };
  startAt: string; response: SlaObligation; resolution: SlaObligation; pausedMinutes?: number; note?: string; calculatedAt?: string; operationalDueAt?: string;
};
type ContractOption = { id: number; ref: string; title: string; status: string };

const minutes = (m?: number | null) => m === undefined || m === null ? '—' : m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`;

/** Contracts of one client for the case contract choice. */
function useClientContracts(clientId: number | null) {
  return useQuery({ queryKey: ['contracts-of', clientId], queryFn: () => get<Paged<ContractOption>>(`/contracts?clientId=${clientId}&pageSize=100`), enabled: !!clientId });
}

type CaseDto = {
  id: number; ref: string; title: string; type: string; scope: string; status: string; priority: string; impactSummary: string; progressSummary?: string; nextAction: string; nextReviewAt: string;
  dueAt?: string; dueTimeZone?: string; dueLocal?: string; client?: { id: number; code: string; name: string }; team?: { id: number; code: string; name: string };
  owner?: UserRef; backupOwner?: UserRef; unassigned: boolean; ownerDeactivated: boolean; coordinator?: UserRef; responsibleParty: string; responsibleOrganization?: string;
  waiting?: { reason: string; since: string }; waitingIntervals: { reason: string; note?: string; startedAt: string; endedAt?: string }[]; waitingHours: number; ageDays: number; currentCycleAgeDays?: number; reopenCount: number;
  unknownEnvironmentReason?: string; validationRequest?: string; outcome?: string; validationEvidence?: string;
  evidenceException?: { reason: string; approvedBy?: UserRef; followUpOwner?: UserRef; followUpDate?: string }; cancelReason?: string; closedAt?: string; cancelledAt?: string; createdAt: string; lastReviewedAt?: string;
  freshness: FreshnessT; reviewOverdue: boolean; overdue: boolean;
  environments: { id: number; name: string; type: string; regionCode?: string }[]; assets: { id: number; name: string; type: string }[]; components: { id: number; name: string; role: string; installation: string }[];
  jiraReferences: { id: number; instance: string; kind: string; jiraInstanceId: number; issueKey: string; url: string; reuseReason?: string }[]; removedJiraReferences: { id: number; instance: string; issueKey: string; removedAt: string }[];
  commitments: { id: number; ref: string; description: string; status: string; currentDueAt: string; timeZone: string }[];
  events: { id: number; type: string; fromValue?: string; toValue?: string; note?: string; at: string; by?: string }[];
  contract?: { id: number; ref: string; title: string; status: string };
  sla: CaseSlaT;
  permissions: { canEdit: boolean; canTriage: boolean; canAssign: boolean; canStart: boolean; canClose: boolean; canAuthorizeEvidenceException: boolean; canReopen: boolean; canCancel: boolean };
  version: string;
};

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
  const canLead = usePermission('Cases', 'Coordinate');
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
    const affected = { ...v.affected, unknownEnvironmentReason: v.affected.unknownEnvironmentReason || null };
    const r = await f.submit(async () => {
      if (isNew) return post<{ id: number }>('/cases', { title: v.title, type: v.type || null, scope: v.scope, clientId: cid, responsibleTeamId: toNum(v.responsibleTeamId), impactSummary: v.impactSummary, priority: v.priority,
        ownerUserId: v.ownerUserId, backupOwnerUserId: v.backupOwnerUserId, responsibleParty: v.responsibleParty, responsibleOrganization: v.responsibleOrganization, coordinatorUserId: v.coordinatorUserId,
        nextAction: v.nextAction, nextReviewAt: fromLocalInput(v.nextReviewAt), dueLocal: v.dueLocal || null, dueTimeZone: v.dueLocal ? v.dueTimeZone : null, affected, contractId: cid ? toNum(v.contractId) : null });
      await put(`/cases/${id}`, { title: v.title, type: v.type, responsibleTeamId: toNum(v.responsibleTeamId), impactSummary: v.impactSummary, priority: v.priority, responsibleParty: v.responsibleParty,
        responsibleOrganization: v.responsibleOrganization, coordinatorUserId: v.coordinatorUserId, nextAction: v.nextAction, nextReviewAt: fromLocalInput(v.nextReviewAt), affected, changeNote: v.changeNote || null }, version);
      return { id: Number(id) };
    });
    if (r) { toast(isNew ? 'Case created.' : 'Case saved.'); refresh(); nav(`/cases/${r.id}`); }
  };
  return (
    <>
      <PageHead title={isNew ? 'New case' : `Edit ${existing.data?.ref ?? ''}`} crumbs={[{ to: '/cases', label: 'Cases' }]} />
      <Panel>
        <FormError error={f.error} />
        {f.error?.isConflict && <button className="btn" style={{ marginBottom: 10 }} onClick={async () => { const r = await existing.refetch(); setVersion(r.data?.version); f.setError(null); }}>Reload latest</button>}
        <div className="form-grid">
          <TextInput label="Title" required wide value={v.title} onChange={x => f.set('title', x)} error={f.fieldError('title')} maxLength={200} />
          <SelectInput label="Case type" required value={v.type} onChange={x => f.set('type', x)} options={T.options('CaseType', v.type)} error={f.fieldError('type')} hint="Use Risk follow-up for risk actions; it does not imply formal risk acceptance." />
          <SelectInput label="Work scope" required value={v.scope} onChange={x => f.set('scope', x)} options={[{ value: 'Client', label: 'Client-related' }, { value: 'Internal', label: 'Internal' }]} empty={null} disabled={!isNew} error={f.fieldError('scope')} />
          {v.scope === 'Client' && <SelectInput label="Client" required value={v.clientId} onChange={x => f.set('clientId', x)} options={clients} error={f.fieldError('clientId')} disabled={!isNew} />}
          {isNew && cid && <SelectInput label="Contract (SLA)" value={v.contractId} onChange={x => f.set('contractId', x)} options={contractOptions} empty="No contract" error={f.fieldError('contractId')}
            hint={contracts.isLoading ? 'Loading contracts…' : contractOptions.length === 0 ? 'This client has no contract: the case is not measured against an SLA.' : 'Response and resolution targets are taken from this contract for the case priority.'} />}
          <SelectInput label="Responsible team" required value={v.responsibleTeamId} onChange={x => f.set('responsibleTeamId', x)} options={teams} error={f.fieldError('responsibleTeamId')} disabled={!isNew && !canLead} />
          <SelectInput label="Priority" required value={v.priority} onChange={x => f.set('priority', x)} options={enumOptions(priorities)} empty={null} error={f.fieldError('priority')} disabled={!isNew && !canLead} />
          <TextInput label="Impact summary" required wide multiline value={v.impactSummary} onChange={x => f.set('impactSummary', x)} error={f.fieldError('impactSummary')} />
          {isNew && <UserPicker label="Owner" value={v.ownerUserId} onChange={x => f.set('ownerUserId', x)} clientId={cid} teamId={v.scope === 'Internal' ? toNum(v.responsibleTeamId) : null} error={f.fieldError('ownerUserId')} hint={canLead ? undefined : 'Leave Unassigned or take it yourself.'} />}
          {isNew && <UserPicker label="Backup owner" value={v.backupOwnerUserId} onChange={x => f.set('backupOwnerUserId', x)} clientId={cid} teamId={v.scope === 'Internal' ? toNum(v.responsibleTeamId) : null} error={f.fieldError('backupOwnerUserId')} empty="None" />}
          <SelectInput label="Responsible party" value={v.responsibleParty} onChange={x => f.set('responsibleParty', x)} options={enumOptions(parties)} empty={null} />
          {v.responsibleParty !== 'TIO' && <TextInput label="Responsible organization" value={v.responsibleOrganization} onChange={x => f.set('responsibleOrganization', x)} />}
          <UserPicker label="Internal coordinator" value={v.coordinatorUserId} onChange={x => f.set('coordinatorUserId', x)} clientId={cid} teamId={v.scope === 'Internal' ? toNum(v.responsibleTeamId) : null} error={f.fieldError('coordinatorUserId')} empty="None" />
          <TextInput label="Next action (optional)" wide value={v.nextAction} onChange={x => f.set('nextAction', x)} error={f.fieldError('nextAction')} />
          <TextInput label={`Next review (${me.timeZone})`} required type="datetime-local" value={v.nextReviewAt} onChange={x => f.set('nextReviewAt', x)} error={f.fieldError('nextReviewAt')} />
          {isNew && <TextInput label="Due (optional)" type="datetime-local" value={v.dueLocal} onChange={x => f.set('dueLocal', x)} error={f.fieldError('dueLocal')} hint="Without a deadline the case is listed separately, never as overdue." />}
          {isNew && v.dueLocal && <TimeZoneSelect label="Due time zone" required value={v.dueTimeZone} onChange={x => f.set('dueTimeZone', x)} error={f.fieldError('dueTimeZone')} />}
          <AffectedPicker clientId={cid} value={v.affected} onChange={x => f.set('affected', x)} error={f.fieldError('affected.environmentIds') ?? f.fieldError('affected.assetIds')} />
          {!isNew && <TextInput label="Change note (kept in the timeline)" wide value={v.changeNote} onChange={x => f.set('changeNote', x)} />}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>Jira tickets are created and updated in Jira by staff; the hub stores manual references only.{!isNew && ' Change the owner, due date or status with the actions on the case page.'}</p>
        <div className="form-actions"><button className="btn" onClick={() => nav(-1)}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{f.busy ? 'Saving…' : isNew ? 'Create case' : 'Save case'}</button></div>
      </Panel>
    </>
  );
}

export function CaseDetail() {
  const T = useTypes();
  const { id } = useParams();
  const q = useQuery({ queryKey: ['case', id], queryFn: () => get<CaseDto>(`/cases/${id}`) });
  const impact = useQuery({ queryKey: ['impact', id], queryFn: () => get<{ label: string; installations: { id: number; instanceName: string; product: string; environment: string; client: string }[]; clients: { id: number; code: string }[]; components: { id: number; name: string; role: string }[]; firewallRules: { id: number; purpose: string; source: string; destination: string; ports?: string; protocol: string }[] }>(`/cases/${id}/impact`) });
  const me = useMe().data!;
  const canCoordinate = usePermission('Cases', 'Coordinate');
  const canCreateEscalation = usePermission('OtherOperations', 'Create');
  const canCreateCommitment = usePermission('Commitments', 'Create');
  const teams = useTeamOptions();
  const [tab, setTab] = useState('timeline');
  const [dialog, setDialog] = useState<string | null>(null);
  const c = q.data;
  const p = c?.permissions;
  const open = c && !['Closed', 'Cancelled'].includes(c.status);
  const close = () => setDialog(null);
  const common = { path: '', version: c?.version, onClose: close };
  // A61: a progress update can be the first response to the customer, until one is recorded.
  const responseField = c?.contract && !c.sla.response.actualAt ? [{ name: 'customerResponse', label: 'This update was sent to the customer (first response)', kind: 'checkbox' as const, hint: 'Records the first response for the contractual SLA at this time.' }] : [];
  return (
    <QueryState q={q}>{c && p && (<>
      <PageHead title={`${c.ref} · ${c.title}`} crumbs={[{ to: '/cases', label: 'Cases' }, ...(c.client ? [{ to: `/clients/${c.client.id}`, label: c.client.code }] : [{ label: 'Internal' }]), { label: c.ref }]}
        sub={<><StatusBadge value={c.status} enumName="CaseStatus" /> <StatusBadge value={c.priority} /> {T.name('CaseType', c.type)} · {c.scope === 'Internal' ? 'Internal work' : 'Client-related'} {c.waiting && <Badge tone="warn">Waiting on {label(c.waiting.reason)}</Badge>} {c.overdue && <Badge tone="bad">Overdue</Badge>} {c.ownerDeactivated && <Badge tone="bad">Owner deactivated</Badge>}</>}
        actions={<>
          {p.canEdit && <Link className="btn" to={`/cases/${id}/edit`}>Edit</Link>}
          {p.canTriage && <button className="btn btn-primary" onClick={() => setDialog('triage')}>Triage</button>}
          {p.canAssign && open && <button className="btn" onClick={() => setDialog('assign')}>{c.unassigned ? 'Assign' : 'Reassign'}</button>}
          {p.canStart && <button className="btn btn-primary" onClick={() => setDialog('start')}>Start work</button>}
          {p.canEdit && open && <button className="btn" onClick={() => setDialog('progress')}>Record progress</button>}
          {p.canEdit && open && <button className="btn" onClick={() => setDialog(c.waiting ? 'unwait' : 'wait')}>{c.waiting ? 'End waiting' : 'Set waiting'}</button>}
          {p.canEdit && c.status === 'InProgress' && <button className="btn" onClick={() => setDialog('validate')}>Request validation</button>}
          {p.canEdit && c.status === 'PendingValidation' && <button className="btn" onClick={() => setDialog('resume')}>Return to work</button>}
          {p.canClose && <button className="btn btn-primary" onClick={() => setDialog('close')}>Close</button>}
          {p.canEdit && open && <button className="btn" onClick={() => setDialog('due')}>Change due date</button>}
          {p.canCancel && <button className="btn btn-danger" onClick={() => setDialog('cancel')}>Cancel case</button>}
          {p.canReopen && <button className="btn" onClick={() => setDialog('reopen')}>Reopen</button>}
        <DeleteAction button path={`/cases/${c.id}`} what={`case ${c.ref}`} afterTo={'/cases'} /></>} />
      {c.status === 'Triaged' && c.unassigned && <div className="notice warn">Unassigned: an active owner is required before work can start.</div>}
      <div className="cols">
        <Panel title="Management summary">
          <DL items={[
            ['Owner', <Person u={c.owner} />], ['Backup owner', <Person u={c.backupOwner} gap="None" />], ['Responsible team', c.team?.name], ['Coordinator', c.coordinator ? <Person u={c.coordinator} /> : <span className="muted">—</span>],
            ['Responsible party', `${label(c.responsibleParty)}${c.responsibleOrganization ? ` · ${c.responsibleOrganization}` : ''}`],
            ['Impact', c.impactSummary], ['Progress', c.progressSummary ?? <span className="muted">No progress recorded</span>],
            ['Next action', c.nextAction], ['Next review', <><When v={c.nextReviewAt} />{c.reviewOverdue && <> <Badge tone="bad">Review passed</Badge></>}</>],
            ['Due', c.dueAt ? <>{c.dueLocal} <span className="muted">({c.dueTimeZone})</span></> : <span className="muted">No deadline</span>],
            ['Last progress update', <><When v={c.lastReviewedAt} /> <FreshnessBadge f={c.freshness} /></>]
          ]} />
        </Panel>
        <Panel title="Age and waiting">
          <DL items={[
            ['Age since creation', `${c.ageDays} days`], ...(c.currentCycleAgeDays !== undefined && c.currentCycleAgeDays !== null ? [['Current cycle age (after reopen)', `${c.currentCycleAgeDays} days`] as [string, string]] : []),
            ['Reopened', `${c.reopenCount} time(s)`], ['Recorded waiting', `${c.waitingHours} h (the operational due date is not paused${c.sla.applied?.pausesWhileWaitingOnCustomer ? '; the contractual SLA pauses while waiting on the customer' : ''})`],
            ['Validation request', c.validationRequest], ['Outcome', c.outcome], ['Validation evidence', c.validationEvidence],
            ...(c.evidenceException ? [['Evidence exception', <>{c.evidenceException.reason}<div className="hint">Authorized by {c.evidenceException.approvedBy?.name} · follow-up {c.evidenceException.followUpOwner?.name} by {c.evidenceException.followUpDate}</div></>] as [string, React.ReactNode]] : []),
            ...(c.cancelReason ? [['Cancellation reason', c.cancelReason] as [string, string]] : [])
          ]} />
        </Panel>
      </div>
      {c.scope === 'Client' && <SlaPanel c={c} canEdit={p.canEdit && !!open} canChangeContract={canCoordinate} onRespond={() => setDialog('respond')} onContract={() => setDialog('contract')} />}
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'timeline', label: 'Timeline' }, { key: 'affected', label: 'Affected records' }, { key: 'jira', label: `Jira references (${c.jiraReferences.length})` }, { key: 'impact', label: 'Documented impact' }, { key: 'commitments', label: `Commitments (${c.commitments.length})` }, { key: 'escalations', label: 'Escalations' }, { key: 'files', label: 'Attachments' }, { key: 'history', label: 'Field history' }]} />
      {tab === 'escalations' && <Panel title="Escalations about this case" pad={false} actions={c.client && canCreateEscalation && <Link className="btn" to={`/escalations/new?clientId=${c.client.id}&caseId=${c.id}`}>+ Escalation</Link>}><EscalationTable clientId={c.client?.id} caseId={c.id} compact /></Panel>}
      {tab === 'timeline' && <Panel title="Timeline"><ul className="timeline">{c.events.map(e => <li key={e.id}><b>{label(e.type)}</b>{(e.fromValue || e.toValue) && <> {e.fromValue ?? '—'} → {e.toValue ?? '—'}</>}{e.note && <> — {e.note}</>}<div className="when">{fmtDateTime(e.at)} · {e.by ?? 'system'}</div></li>)}</ul></Panel>}
      {tab === 'affected' && <Panel title="Affected records">
        {c.environments.length === 0 && c.unknownEnvironmentReason && <div className="notice warn">Environment not yet identified: {c.unknownEnvironmentReason}</div>}
        <DL items={[
          ['Environments', c.environments.length ? c.environments.map(e => <div key={e.id}><Link to={`/environments/${e.id}`}>{e.regionCode ? `${e.regionCode} / ` : ''}{e.name}</Link></div>) : <span className="muted">{c.scope === 'Internal' ? 'Not applicable (internal work)' : 'None'}</span>],
          ['Assets', c.assets.length ? c.assets.map(a => <div key={a.id}><Link to={`/assets/${a.id}`}>{a.name}</Link></div>) : <span className="muted">None</span>],
          ['Components', c.components.length ? c.components.map(x => <div key={x.id}>{x.name} ({x.installation})</div>) : <span className="muted">None</span>],
        ]} />
      </Panel>}
      {tab === 'jira' && <Panel title="Manual Jira references" actions={p.canEdit && <button className="btn" onClick={() => setDialog('jira')}>+ Reference</button>}>
        <p className="hint" style={{ marginBottom: 8 }}>Customer Cloud Jira and Internal On-prem Jira are disconnected. The hub never creates, reads or synchronizes tickets; status here is managed separately.</p>
        {c.jiraReferences.length === 0 ? <StateMessage kind="none" /> : <DataTable caption="Manual Jira references" rows={c.jiraReferences} rowKey={j => j.id} columns={[
          { key: 'instance', header: 'Instance', render: j => j.instance }, { key: 'key', header: 'Key', render: j => <span className="mono">{j.issueKey}</span> },
          { key: 'link', header: 'Link', render: j => <a href={j.url} target="_blank" rel="noopener noreferrer">{j.url}</a> },
          { key: 'reason', header: 'Reuse reason', render: j => j.reuseReason },
          { key: 'actions', header: '', render: j => p.canEdit && <button className="linkbtn" onClick={() => setDialog(`unjira-${j.id}`)}>Remove</button> }
        ]} />}
        {c.removedJiraReferences.length > 0 && <p className="hint" style={{ marginTop: 8 }}>Removed (kept in history): {c.removedJiraReferences.map(j => `${j.instance} ${j.issueKey}`).join(', ')}</p>}
      </Panel>}
      {tab === 'impact' && <Panel title="Documented dependency impact">
        <div className="notice">{impact.data?.label ?? 'Inferred from recorded relationships, not live outage detection.'}</div>
        {impact.data && <DL items={[
          ['Potentially affected installations', impact.data.installations.length ? impact.data.installations.map(i => <div key={i.id}><Link to={`/installations/${i.id}`}>{i.product} · {i.instanceName}</Link> <span className="muted">({i.client} / {i.environment})</span></div>) : <span className="muted">None documented</span>],
          ['Components', impact.data.components.map(x => x.name).join(', ') || <span className="muted">None</span>],
          ['Clients', impact.data.clients.map(x => x.code).join(', ') || <span className="muted">None</span>],
          ['Firewall rules of affected servers', impact.data.firewallRules.length ? impact.data.firewallRules.map(r => <div key={r.id}>{r.source} → {r.destination} <span className="mono">{r.protocol}{r.ports ? ` ${r.ports}` : ''}</span> · {r.purpose}</div>) : <span className="muted">None recorded</span>]
        ]} />}
      </Panel>}
      {tab === 'commitments' && <Panel title="Linked commitments" actions={canCreateCommitment && <Link className="btn" to={`/commitments/new?caseId=${id}${c.client ? `&clientId=${c.client.id}` : `&teamId=${c.team?.id ?? ''}`}`}>+ Commitment</Link>}>
        {c.commitments.length === 0 ? <StateMessage kind="none" /> : <ul className="timeline">{c.commitments.map(m => <li key={m.id}><Link to={`/commitments/${m.id}`}>{m.ref}</Link> {m.description} <StatusBadge value={m.status} /><div className="when">due {fmtDateTime(m.currentDueAt)}</div></li>)}</ul>}
      </Panel>}
      {tab === 'files' && <AttachmentsPanel recordType="Case" recordId={c.id} />}
      {tab === 'history' && <HistoryPanel entityType="Case" entityId={c.id} />}

      {dialog === 'triage' && <ActionDialog {...common} title="Triage case" path={`/cases/${id}/triage`} submitLabel="Confirm triage" intro="Confirm scope, team, impact, priority and next-review time. Next action is optional."
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
      {dialog === 'wait' && <ActionDialog {...common} title="Set waiting" path={`/cases/${id}/waiting`} submitLabel="Set waiting" intro="Waiting is separate from status. Deadlines continue to run."
        fields={[{ name: 'reason', label: 'Waiting on', kind: 'select', required: true, options: ['Customer', 'InternalTeam', 'Vendor', 'PlannedChange'].map(x => ({ value: x, label: label(x) })) }, { name: 'note', label: 'Note' }, { name: 'nextReviewAt', label: 'Next review', kind: 'datetime', required: true }]}
        transform={v => ({ reason: v.reason, note: v.note || null, nextReviewAt: fromLocalInput(v.nextReviewAt) })} />}
      {dialog === 'unwait' && <ActionDialog {...common} title="End waiting" path={`/cases/${id}/waiting/clear`} submitLabel="End waiting" fields={[{ name: 'reason', label: 'Note' }]} />}
      {dialog === 'validate' && <ActionDialog {...common} title="Request validation" path={`/cases/${id}/request-validation`} submitLabel="Request validation" intro="Describe the delivered outcome and what should be validated. A validation request can be recorded without a next action."
        fields={[{ name: 'progressSummary', label: 'Delivered outcome / progress', kind: 'textarea', required: true }, { name: 'validationRequest', label: 'Validation request' }, { name: 'nextAction', label: 'Next action (optional)' }, { name: 'nextReviewAt', label: 'Next review', kind: 'datetime' }]}
        transform={v => ({ progressSummary: v.progressSummary, validationRequest: v.validationRequest || null, nextAction: v.nextAction || null, nextReviewAt: v.nextReviewAt ? fromLocalInput(v.nextReviewAt) : null })} />}
      {dialog === 'resume' && <ActionDialog {...common} title="Return to work" path={`/cases/${id}/resume`} submitLabel="Return to In progress" fields={[{ name: 'reason', label: 'Why validation did not pass', kind: 'textarea', required: true }]} />}
      {dialog === 'close' && <CloseDialog c={c} canException={p.canAuthorizeEvidenceException} onClose={close} />}
      {dialog === 'due' && <ActionDialog {...common} title="Change due date" path={`/cases/${id}/due`} initial={{ dueTimeZone: c.dueTimeZone ?? me.timeZone }} submitLabel="Save due date" intro="Due-date changes need a reason and are kept in the timeline. Leave the date empty and tick nothing to remove the deadline."
        fields={[{ name: 'dueLocal', label: 'New due (local time)', kind: 'datetime' }, { name: 'dueTimeZone', label: 'Time zone', kind: 'timezone', required: true }, { name: 'reason', label: 'Reason', kind: 'textarea', required: true }]}
        transform={v => ({ dueLocal: v.dueLocal || null, dueTimeZone: v.dueTimeZone || c.dueTimeZone || me.timeZone, clear: !v.dueLocal, reason: v.reason })} />}
      {dialog === 'cancel' && <ActionDialog {...common} title="Cancel case" danger path={`/cases/${id}/cancel`} submitLabel="Cancel case" intro="Links and history are kept." fields={[{ name: 'reason', label: 'Cancellation reason', kind: 'textarea', required: true }]} />}
      {dialog === 'reopen' && <ActionDialog {...common} title="Reopen case" path={`/cases/${id}/reopen`} submitLabel="Reopen to Triaged" intro="The earlier closure or cancellation stays in history. Ownership is rechecked."
        fields={[{ name: 'reason', label: 'Reopening reason', kind: 'textarea', required: true }, { name: 'nextAction', label: 'Next action (optional)' }, { name: 'nextReviewAt', label: 'Next review', kind: 'datetime', required: true }]}
        transform={v => ({ reason: v.reason, nextAction: v.nextAction, nextReviewAt: fromLocalInput(v.nextReviewAt) })} />}
      {dialog === 'jira' && <JiraDialog caseId={c.id} onClose={close} />}
      {dialog?.startsWith('unjira-') && <ActionDialog {...common} title="Remove Jira reference" danger path={`/cases/${id}/jira/${dialog.slice(7)}/remove`} submitLabel="Remove" intro="The reference stays in the audit history." fields={[{ name: 'reason', label: 'Reason', required: true }]} />}
    </>)}</QueryState>
  );
}

/** A61: the contractual SLA of a case — the contract, the snapshot of its target, deadlines, actual times and outcomes. */
function SlaPanel({ c, canEdit, canChangeContract, onRespond, onContract }: { c: CaseDto; canEdit: boolean; canChangeContract: boolean; onRespond: () => void; onContract: () => void }) {
  const s = c.sla;
  const a = s.applied;
  const penaltyPreview = useQuery({ queryKey: ['case-penalty-preview', c.id], queryFn: () => get<{ items: { id: number; name: string; trigger: string; month: string; amount: number; currency: string; reviewState: string }[] }>(`/cases/${c.id}/penalty-preview`), enabled: !!c.contract });
  const slaRows = [
    { key: 'response', name: 'First response', target: a?.responseMinutes, obligation: s.response, actualLabel: 'Not yet recorded' },
    { key: 'resolution', name: 'Resolution', target: a?.resolutionMinutes, obligation: s.resolution, actualLabel: 'Not yet resolved' }
  ];
  return (
    <Panel title="Contractual SLA" actions={<>
      {canEdit && c.contract && !s.response.actualAt && <button className="btn" onClick={onRespond}>Record first response</button>}
      {canChangeContract && <button className="btn" onClick={onContract}>{c.contract ? 'Change contract' : 'Link contract'}</button>}</>}>
      <DL items={[
        ['Contract', c.contract ? <><Link to={`/contracts/${c.contract.id}`}>{c.contract.ref}</Link> · {c.contract.title} {c.contract.status !== 'Active' && <Badge tone="warn">{label(c.contract.status)}</Badge>}</> : <span className="muted">No contract linked — not measured</span>],
        ...(a ? [['Applied target', <>{a.priority} priority · {a.basis === 'CalendarHours' ? 'calendar hours' : a.basis === 'SupportHours' ? (a.support24x7 ? 'support hours (24×7)' : `support hours ${a.supportDays.replace(/, /g, ' ')} ${a.supportFrom ?? ''}–${a.supportTo ?? ''} ${a.timeZone ?? ''}`) : 'basis not set'}
          {a.pausesWhileWaitingOnCustomer && ' · paused while waiting on the customer'}<div className="hint">Taken from {a.contractRef} on {fmtDateTime(a.at)}; later contract edits do not change it.</div></>] as [string, React.ReactNode]] : []),
        ['Clock start', fmtDateTime(s.startAt)],
        ...(s.pausedMinutes ? [['Paused (waiting on the customer)', minutes(s.pausedMinutes)] as [string, string]] : []),
        ['Operational due date', s.operationalDueAt ? <>{fmtDateTime(s.operationalDueAt)} <span className="hint">(agreed by the team; separate from the contractual deadlines)</span></> : <span className="muted">None</span>]
      ]} />
      {c.contract && <DataTable caption="Contractual SLA measurements" rows={slaRows} rowKey={r => r.key} tableClassName="sla-table" columns={[
        { key: 'measurement', header: 'Measurement', render: r => r.name },
        { key: 'target', header: 'Target', render: r => minutes(r.target) },
        { key: 'deadline', header: 'Deadline', render: r => r.obligation.dueAt ? fmtDateTime(r.obligation.dueAt) : <span className="muted">—</span> },
        { key: 'actual', header: 'Actual', render: r => <>{r.obligation.actualAt ? fmtDateTime(r.obligation.actualAt) : <span className="muted">{r.actualLabel}</span>}{r.obligation.elapsedMinutes !== undefined && r.obligation.elapsedMinutes !== null && <div className="hint">{minutes(r.obligation.elapsedMinutes)} counted</div>}</> },
        { key: 'status', header: 'Status', render: r => <><StatusBadge value={r.obligation.status} />{r.obligation.breachMinutes ? <div className="hint err">{minutes(r.obligation.breachMinutes)} over</div> : null}</> }
      ]} />}
      {!!penaltyPreview.data?.items.length && <>
        <h3 style={{ marginTop: 16 }}>Indicative penalties</h3>
        <p className="hint">Calculated from the clause snapshot taken when this contract was linked. These monthly totals combine cases sharing the recorded clause terms and apply monthly caps. The same totals can appear on multiple case pages; do not add them together as billing totals. Amounts need review and do not create credits or invoices.</p>
        <DataTable caption="Indicative case penalties" rows={penaltyPreview.data.items.map((x, i) => ({ ...x, rowKey: `${x.id}-${x.month}-${i}` }))} rowKey={x => x.rowKey} columns={[
          { key: 'clause', header: 'Clause', render: x => x.name }, { key: 'trigger', header: 'Trigger', render: x => label(x.trigger) },
          { key: 'month', header: 'Billing month', render: x => x.month },
          { key: 'amount', header: 'Amount', className: 'num', render: x => new Intl.NumberFormat(undefined, { style: 'currency', currency: x.currency }).format(x.amount) },
          { key: 'review', header: 'Review', render: x => label(x.reviewState) }
        ]} />
      </>}
      {s.note && <p className="hint" style={{ marginTop: 8 }}>{s.note}</p>}
    </Panel>
  );
}

function ContractDialog({ c, onClose }: { c: CaseDto; onClose: () => void }) {
  const contracts = useClientContracts(c.client?.id ?? null);
  const options = [...(contracts.data?.items ?? []).filter(k => k.id !== c.contract?.id).map(k => ({ value: String(k.id), label: `${k.ref} · ${k.title}${k.status === 'Active' ? '' : ` (${label(k.status)})`}` }))];
  return <ActionDialog title={c.contract ? 'Change contract' : 'Link contract'} path={`/cases/${c.id}/contract`} version={c.version} onClose={onClose} submitLabel="Save contract"
    intro="The response and resolution targets are taken again from the chosen contract for the case priority and the case is measured again from its creation. The change is kept in the timeline."
    fields={[{ name: 'contractId', label: 'Contract', kind: 'select', options, hint: c.contract ? 'Leave empty to remove the contract: the case is then not measured.' : undefined }, { name: 'reason', label: 'Reason', kind: 'textarea', required: !!c.contract }]}
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
      <ActionDialog key={mode} title="Close case" path={`/cases/${c.id}/close`} version={c.version} onClose={onClose} submitLabel="Close case"
        intro={<>An outcome is always required. Without validation evidence, only the TIO Manager can authorize a case-specific exception; an engineer's reason alone cannot waive evidence.
          {canException && <div style={{ marginTop: 6 }}><label className="check"><input type="checkbox" checked={mode === 'exception'} onChange={e => setMode(e.target.checked ? 'exception' : 'evidence')} /> Close without evidence (Manager exception)</label></div>}</>}
        fields={fields} transform={v => ({ outcome: v.outcome, validationEvidence: v.validationEvidence || null, evidenceExceptionReason: v.evidenceExceptionReason || null, followUpOwnerId: toNum(v.followUpOwnerId ?? ''), followUpDate: v.followUpDate || null })} />
    </>
  );
}

function JiraDialog({ caseId, onClose }: { caseId: number; onClose: () => void }) {
  const ref = useReference().data;
  const f = useForm({ jiraInstanceId: '', issueKey: '', url: '', reuseReason: '' });
  const key = useDebounced(f.values.issueKey.trim().toUpperCase());
  const reuse = useQuery({ queryKey: ['reuse', f.values.jiraInstanceId, key], queryFn: () => get<{ reused: boolean; visible: { id: number; ref: string; title: string }[]; hiddenCount: number }>(`/jira/reuse${qs({ instanceId: f.values.jiraInstanceId, key, exceptCaseId: caseId })}`), enabled: !!f.values.jiraInstanceId && key.length > 2 });
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
        {reuse.data?.reused && <div className="wide notice warn">This instance and key are already linked to {reuse.data.visible.map(v => <span key={v.id}><Link to={`/cases/${v.id}`}>{v.ref}</Link> </span>)}{reuse.data.hiddenCount > 0 && <>{reuse.data.visible.length ? 'and ' : ''}{reuse.data.hiddenCount} case(s) you cannot access</>}. Explain the reuse.</div>}
        {(reuse.data?.reused || f.fieldError('reuseReason')) && <TextInput label="Reuse reason" required wide value={f.values.reuseReason} onChange={v => f.set('reuseReason', v)} error={f.fieldError('reuseReason')} />}
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Add reference</button></div>
    </Dialog>
  );
}
