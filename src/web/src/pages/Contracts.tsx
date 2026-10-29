import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { exportCsv, get, post, put, qs, type Paged, type UserRef } from '../api';
import { fmtDate, label } from '../format';
import { useCan, useEnum, useForm, useLeaveGuard, useMe, useRefresh, useUrlState, useTypes } from '../hooks';
import { ArchiveDialog, TimeZoneSelect, UserPicker } from '../ui/pickers';
import { ProjectDialog, ProjectTabs } from './Clients';
import { Badge, DataTable, DL, enumOptions, FormError, PageHead, Pager, Panel, Person, QueryState, SelectInput, StateMessage, StatusBadge, TextInput, Unknown, useToast, DeleteAction } from '../ui/kit';
import { HistoryPanel, toNum, useClientOptions } from './common';
import { AttachmentsWorkspace } from './AttachmentsWorkspace';
import { MyNotesPanel } from './Notes';

// CLI-04 contracts with recorded SLA terms. Targets are what the contract says; the hub never measures them or calculates compliance.
// A27: every contract belongs to a project; the project gives the client and the covered products, and its page shows its contracts.

type Row = {
  id: number; ref: string; title: string; contractReference?: string; type: string; status: string; clientId: number; clientCode: string; clientName: string;
  projectId: number; projectCode: string; projectName: string; startDate?: string; endDate?: string; noticeDeadline?: string; renewalTerms: string; supportModel: string; onSiteEngineersRequired?: number; owner?: UserRef; slaTargets: number; renewalState: string;
};
type Target = { id?: number; priority: string; responseMinutes?: number | null; resolutionMinutes?: number | null; basis: string; notes?: string | null };
type Detail = {
  id: number; ref: string; title: string; contractReference?: string; type: string; status: string; clientId: number;
  client: { id: number; code: string; name: string; country?: string }; project: { id: number; code: string; name: string; status: string }; owner?: UserRef;
  startDate?: string; endDate?: string; renewalTerms: string; noticeDays?: number; noticeDeadline?: string; renewalState: string; renewalNote?: string;
  supportModel: string; supportHours?: string; supportTimeZone?: string; onSiteEngineersRequired?: number; coverage?: string; obligations?: string;
  support24x7: boolean; supportDays: string[]; supportFrom?: string; supportTo?: string; supportSummary?: string; currency?: string; slaPauseWhileWaitingOnCustomer: boolean;
  milestones: { id: number; phase: string; description?: string; completionPercent?: number; date?: string }[];
  fees: { id: number; description: string; unit?: string; quantity?: number; unitPrice?: number; total?: number }[]; feesTotal?: number;
  payments: { id: number; condition: string; percentage?: number; amount?: number; dueDate?: string; status: string; paidOn?: string; notes?: string; overdue: boolean }[];
  products: { id: number; code: string; name: string }[]; environments: { id: number; name: string; type: string; region?: string }[];
  slaTargets: Target[]; slaNote: string; lastReviewedAt?: string; version: string; permissions: { canEdit: boolean; canArchive: boolean };
};


/** Duration in minutes → "30 min", "4 h", "2 d", "1 d 4 h". */
export function fmtMinutes(m?: number | null) {
  if (m === null || m === undefined) return '—';
  if (m < 60) return `${m} min`;
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), r = m % 60;
  return [d && `${d} d`, h && `${h} h`, r && `${r} min`].filter(Boolean).join(' ');
}

export function RenewalBadge({ state }: { state: string }) {
  switch (state) {
    case 'Expired': return <Badge tone="bad">Expired, still Active</Badge>;
    case 'RenewalDue': return <Badge tone="warn">Renewal due</Badge>;
    case 'EndDateUnknown': return <Badge tone="warn">End date unknown</Badge>;
    case 'Current': return <Badge tone="good">Current</Badge>;
    default: return <Badge>{label(state)}</Badge>;
  }
}

const RENEWAL_FILTERS = [
  { value: 'attention', label: 'Needs attention' }, { value: 'expired', label: 'Expired, still Active' }, { value: 'due', label: 'Renewal due (≤ 90 days)' },
  { value: 'unknownEnd', label: 'End date unknown' }, { value: 'current', label: 'Current' }
];

export function ContractList() {
  const T = useTypes();
  const me = useMe().data!;
  const [f, set] = useUrlState({ q: '', clientId: '', status: '', type: '', renewal: '', country: '', productId: '', sort: 'end', page: '1', pageSize: '15' });
  const q = useQuery({ queryKey: ['contracts', f], queryFn: () => get<Paged<Row>>(`/contracts${qs(f)}`) });
  const clients = useClientOptions();
  const statuses = useEnum('ContractStatus');
  const canLead = useCan('Engineer');
  const filtered = f.q || f.clientId || f.status || f.type || f.renewal || f.country || f.productId;
  return (
    <>
      <PageHead title="Projects & contracts" crumbs={[{ to: '/clients', label: 'Clients' }, { to: '/projects', label: 'Projects & contracts' }, { label: 'Contract register' }]}
        sub="Every contract of every project: recorded terms, renewal dates and SLA targets. Targets are what the contract states; cases linked to a contract are measured against them."
        actions={<>
          {me.grants.export && <button className="btn" onClick={() => exportCsv('contracts', f)}>Export CSV</button>}
          {canLead && <Link className="btn btn-primary" to={`/contracts/new${f.clientId ? `?clientId=${f.clientId}` : ''}`}>+ New contract</Link>}
        </>} />
      <ProjectTabs value="contracts" />
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v, page: '1' })} options={clients} empty="All authorized clients" />
        <SelectInput label="Renewal" value={f.renewal} onChange={v => set({ renewal: v, page: '1' })} options={RENEWAL_FILTERS} empty="Any" />
        <SelectInput label="Type" value={f.type} onChange={v => set({ type: v, page: '1' })} options={T.options('ContractType', f.type)} empty="Any" />
        {f.country && <span className="chip" style={{ alignSelf: 'end', marginBottom: 6 }}>Country: {f.country} <button className="linkbtn" onClick={() => set({ country: '' })} aria-label="Clear country filter">✕</button></span>}
      </div>
      <DataTable<Row> rowKey={c => c.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'} sort={f.sort} onSort={s => set({ sort: s })} caption="Contracts"
        columns={[
          { key: 'ref', header: 'Ref', sort: 'ref', render: c => <Link to={`/contracts/${c.id}`}>{c.ref}</Link>,
            filter: <input className="input" aria-label="Search contracts" placeholder="Title or reference" value={f.q} onChange={e => set({ q: e.target.value, page: '1' })} /> },
          { key: 'title', header: 'Contract', sort: 'title', render: c => <><Link to={`/contracts/${c.id}`}>{c.title}</Link>{c.contractReference && <div className="hint">{c.contractReference}</div>}</> },
          { key: 'project', header: 'Project', sort: 'project', render: c => <><Link to={`/projects/${c.projectId}`}>{c.projectCode}</Link><div className="hint">{c.clientCode}</div></> },
          { key: 'type', header: 'Type', render: c => T.name('ContractType', c.type) },
          { key: 'status', header: 'Status', sort: 'status', render: c => <StatusBadge value={c.status} />,
            filter: <select className="input" aria-label="Filter by status" value={f.status} onChange={e => set({ status: e.target.value, page: '1' })}><option value="">All</option>{statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}</select> },
          { key: 'term', header: 'Term', sort: 'end', render: c => <span className="nowrap">{c.startDate ? fmtDate(c.startDate) : '?'} – {c.endDate ? fmtDate(c.endDate) : <Unknown />}</span> },
          { key: 'notice', header: 'Notice deadline', render: c => c.noticeDeadline ? fmtDate(c.noticeDeadline) : <span className="muted">—</span> },
          { key: 'renewal', header: 'Renewal', render: c => <RenewalBadge state={c.renewalState} /> },
          { key: 'support', header: 'Support', render: c => <>{label(c.supportModel)}{c.onSiteEngineersRequired ? <div className="hint">{c.onSiteEngineersRequired} on site required</div> : null}</> },
          { key: 'sla', header: 'SLA targets', className: 'num', render: c => c.slaTargets || <span className="muted">none</span> },
          { key: 'owner', header: 'Owner', sort: 'owner', render: c => <Person u={c.owner} /> }, { key: 'del', header: '', className: 'row-actions', render: c => <DeleteAction path={`/contracts/${c.id}`} what={`contract ${c.ref}`} /> }
        ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s), page: '1' })} />}
    </>
  );
}

/** Compact contract summary for Client 360. */
export function ClientContracts({ clientId, canCreate }: { clientId: number; canCreate: boolean }) {
  const T = useTypes();
  const q = useQuery({ queryKey: ['contracts', { clientId, status: '' }], queryFn: () => get<Paged<Row>>(`/contracts?clientId=${clientId}&pageSize=100`) });
  return (
    <Panel title="Contracts & SLAs" pad={false} actions={<>
      <Link className="btn" to={`/contracts?clientId=${clientId}`}>Open list</Link>
      {canCreate && <Link className="btn btn-primary" to={`/contracts/new?clientId=${clientId}`}>+ Contract</Link>}
    </>}>
      <DataTable<Row> rowKey={c => c.id} rows={q.data?.items} loading={q.isLoading} error={q.error} caption="Client contracts"
        columns={[
          { key: 'ref', header: 'Contract', render: c => <><Link to={`/contracts/${c.id}`}>{c.ref} · {c.title}</Link>{c.contractReference && <div className="hint">{c.contractReference}</div>}</> },
          { key: 'project', header: 'Project', render: c => <Link to={`/projects/${c.projectId}`}>{c.projectCode}</Link> },
          { key: 'type', header: 'Type', render: c => T.name('ContractType', c.type) },
          { key: 'status', header: 'Status', render: c => <StatusBadge value={c.status} /> },
          { key: 'term', header: 'Term', render: c => <span className="nowrap">{c.startDate ? fmtDate(c.startDate) : '?'} – {c.endDate ? fmtDate(c.endDate) : <Unknown />}</span> },
          { key: 'renewal', header: 'Renewal', render: c => <RenewalBadge state={c.renewalState} /> },
          { key: 'support', header: 'Support', render: c => `${label(c.supportModel)}${c.onSiteEngineersRequired ? ` · ${c.onSiteEngineersRequired} on site` : ''}` },
          { key: 'sla', header: 'SLA targets', className: 'num', render: c => c.slaTargets || <span className="muted">none</span> }, { key: 'del', header: '', className: 'row-actions', render: c => <DeleteAction path={`/contracts/${c.id}`} what={`contract ${c.ref}`} /> }
        ]} />
    </Panel>
  );
}

export function ContractDetail() {
  const T = useTypes();
  const { id } = useParams();
  const q = useQuery({ queryKey: ['contract', id], queryFn: () => get<Detail>(`/contracts/${id}`) });
  const nav = useNavigate();
  const [archive, setArchive] = useState(false);
  const c = q.data;
  return (
    <QueryState q={q}>
      {c && (<>
        <PageHead title={`${c.ref} · ${c.title}`}
          crumbs={[{ to: '/clients', label: 'Clients' }, { to: `/clients/${c.client.id}`, label: c.client.code }, { to: `/projects/${c.project.id}`, label: c.project.code }, { label: c.ref }]}
          sub={<><StatusBadge value={c.status} /> <RenewalBadge state={c.renewalState} /> {c.renewalNote && <span className="muted">{c.renewalNote}</span>}</>}
          actions={<>
            {c.permissions.canEdit && <Link className="btn btn-primary" to={`/contracts/${c.id}/edit`}>Edit</Link>}
            {c.permissions.canArchive && c.status !== 'Active' && <button className="btn" onClick={() => setArchive(true)}>Archive</button>}
          <DeleteAction button path={`/contracts/${c.id}`} what={`contract ${c.ref}`} afterTo={'/contracts'} /></>} />
        <div className="cols">
          <Panel title="Contract">
            <DL items={[
              ['Client', <Link to={`/clients/${c.client.id}`}>{c.client.code} · {c.client.name}</Link>],
              ['Contract reference', c.contractReference ?? <Unknown />],
              ['Type', T.name('ContractType', c.type)],
              ['Project', <Link to={`/projects/${c.project.id}`}>{c.project.code} · {c.project.name}</Link>],
              ['Owner', <Person u={c.owner} />],
              ['Term', <>{c.startDate ? fmtDate(c.startDate) : <Unknown />} – {c.endDate ? fmtDate(c.endDate) : <Unknown />}</>],
              ['Renewal terms', label(c.renewalTerms)],
              ['Notice period', c.noticeDays !== undefined && c.noticeDays !== null ? `${c.noticeDays} days${c.noticeDeadline ? ` · give notice by ${fmtDate(c.noticeDeadline)}` : ''}` : <Unknown />],
              ['Last reviewed', c.lastReviewedAt ? fmtDate(c.lastReviewedAt) : <Unknown />]
            ]} />
          </Panel>
          <Panel title="Service obligations">
            <DL items={[
              ['Support model', label(c.supportModel)],
              ['Support hours', c.supportSummary ?? <Unknown />],
              ...(c.supportHours ? [['Support notes', c.supportHours] as [string, string]] : []),
              ['On-site engineers required', c.onSiteEngineersRequired ?? <Unknown />],
              ['Coverage', c.coverage ?? <Unknown />],
              ['Obligations', c.obligations ? <span style={{ whiteSpace: 'pre-wrap' }}>{c.obligations}</span> : <Unknown />]
            ]} />
          </Panel>
        </div>
        <Panel title="SLA targets (recorded)" pad={false}>
          <p className="hint" style={{ padding: '8px 12px 0' }}>{c.slaNote} {c.slaPauseWhileWaitingOnCustomer ? 'The clock pauses while a case waits on the customer.' : 'The clock does not pause while a case waits on the customer.'} <Link to={`/cases?contractId=${c.id}&status=all`}>Cases measured against this contract</Link></p>
          <DataTable<Target> rowKey={t => t.priority} rows={c.slaTargets} caption="SLA targets"
            columns={[
              { key: 'p', header: 'Priority', render: t => t.priority },
              { key: 'r', header: 'Response target', render: t => fmtMinutes(t.responseMinutes) },
              { key: 's', header: 'Resolution target', render: t => fmtMinutes(t.resolutionMinutes) },
              { key: 'b', header: 'Clock', render: t => t.basis === 'SupportHours' ? 'Support hours' : t.basis === 'CalendarHours' ? 'Calendar hours (24×7)' : <Unknown /> },
              { key: 'n', header: 'Notes', render: t => t.notes }
            ]} />
        </Panel>
        <ContractTermsView c={c} />
        <div className="cols">
          <Panel title="Covered products (from the project)">
            {c.products.length === 0 ? <StateMessage kind="none">The project has no products recorded.</StateMessage> : <ul className="plain">{c.products.map(p => <li key={p.id}>{p.code} · {p.name}</li>)}</ul>}
          </Panel>
          <Panel title="Covered environments">
            {c.environments.length === 0 ? <StateMessage kind="none" /> : <ul className="plain">{c.environments.map(e => <li key={e.id}><Link to={`/environments/${e.id}`}>{e.region ? `${e.region} / ` : ''}{e.name}</Link> <span className="muted">· {T.name('EnvironmentType', e.type)}</span></li>)}</ul>}
          </Panel>
        </div>
        <AttachmentsWorkspace recordType="Contract" recordId={c.id} canEdit={c.permissions.canEdit} title="Contract and SLA documents" />
        <HistoryPanel entityType="Contract" entityId={c.id} />
        {archive && <ArchiveDialog what="contract" path={`/contracts/${c.id}/archive`} version={c.version} onClose={() => setArchive(false)} onDone={() => nav(`/projects/${c.project.id}`)} />}
      </>)}
    </QueryState>
  );
}

type TargetForm = { priority: string; response: string; resolution: string; unit: 'min' | 'h'; basis: string; notes: string };
const toForm = (t: Target): TargetForm => {
  const hours = [t.responseMinutes, t.resolutionMinutes].every(m => m === null || m === undefined || m % 60 === 0);
  const conv = (m?: number | null) => (m === null || m === undefined ? '' : String(hours ? m / 60 : m));
  return { priority: t.priority, response: conv(t.responseMinutes), resolution: conv(t.resolutionMinutes), unit: hours ? 'h' : 'min', basis: t.basis, notes: t.notes ?? '' };
};
const toMinutes = (v: string, unit: 'min' | 'h') => (v.trim() === '' ? null : Math.round(Number(v) * (unit === 'h' ? 60 : 1)));

export function ContractForm() {
  const T = useTypes();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const isNew = !id;
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  const statuses = useEnum('ContractStatus');
  const renewals = useEnum('RenewalTerms');
  const models = useEnum('SupportModel');
  const priorities = useEnum('Priority');
  const bases = useEnum('SlaBasis');
  const existing = useQuery({ queryKey: ['contract', id], queryFn: () => get<Detail & { productIds?: number[] }>(`/contracts/${id}`), enabled: !isNew });
  const f = useForm({
    projectId: sp.get('projectId') ?? '', title: '', contractReference: '', type: 'SlaSupport', status: 'Draft', ownerUserId: null as number | null,
    startDate: '', endDate: '', renewalTerms: 'Unknown', noticeDays: '', supportModel: 'Unknown', supportHours: '', supportTimeZone: '', onSiteEngineersRequired: '',
    coverage: '', obligations: '', environmentIds: [] as number[], targets: [] as TargetForm[],
    // A49
    support24x7: false, supportDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] as string[], supportFrom: '08:00', supportTo: '17:00', currency: '',
    slaPauseWhileWaitingOnCustomer: false,
    milestones: [] as MilestoneForm[], fees: [] as FeeForm[], payments: [] as PaymentForm[]
  });
  useLeaveGuard(f.dirty && !f.busy);
  useEffect(() => {
    const c = existing.data;
    if (c) f.reset({
      projectId: String(c.project.id), title: c.title, contractReference: c.contractReference ?? '', type: c.type, status: c.status,
      ownerUserId: c.owner?.id ?? null, startDate: c.startDate ?? '', endDate: c.endDate ?? '', renewalTerms: c.renewalTerms, noticeDays: c.noticeDays?.toString() ?? '',
      supportModel: c.supportModel, supportHours: c.supportHours ?? '', supportTimeZone: c.supportTimeZone ?? '', onSiteEngineersRequired: c.onSiteEngineersRequired?.toString() ?? '',
      coverage: c.coverage ?? '', obligations: c.obligations ?? '', environmentIds: c.environments.map(e => e.id), targets: c.slaTargets.map(toForm),
      support24x7: c.support24x7, supportDays: c.supportDays, supportFrom: c.supportFrom ?? '', supportTo: c.supportTo ?? '', currency: c.currency ?? '',
      slaPauseWhileWaitingOnCustomer: c.slaPauseWhileWaitingOnCustomer,
      milestones: c.milestones.map(m => ({ id: m.id, phase: m.phase, description: m.description ?? '', completionPercent: m.completionPercent?.toString() ?? '', date: m.date ?? '' })),
      fees: c.fees.map(x => ({ id: x.id, description: x.description, unit: x.unit ?? '', quantity: x.quantity?.toString() ?? '', unitPrice: x.unitPrice?.toString() ?? '' })),
      payments: c.payments.map(x => ({ id: x.id, condition: x.condition, percentage: x.percentage?.toString() ?? '', amount: x.amount?.toString() ?? '', dueDate: x.dueDate ?? '', status: x.status, paidOn: x.paidOn ?? '', notes: x.notes ?? '' }))
    });
  }, [existing.data]); // eslint-disable-line react-hooks/exhaustive-deps
  // The contract belongs to a project; the project gives the client and the covered products. An existing contract may move only between its client's projects.
  const onlyClient = existing.data ? String(existing.data.clientId) : sp.get('clientId') ?? '';
  const projects = useQuery({ queryKey: ['projects-of', onlyClient], queryFn: () => get<Paged<{ id: number; code: string; name: string; clientId: number; clientCode: string; products: { code: string }[] }>>(`/projects?pageSize=200${onlyClient ? `&clientId=${onlyClient}` : ''}`) });
  const project = projects.data?.items.find(p => String(p.id) === f.values.projectId);
  const clientId = project?.clientId ?? existing.data?.clientId ?? null;
  const envs = useQuery({ queryKey: ['envs-of', clientId], queryFn: () => get<Paged<{ id: number; name: string; regionCode?: string }>>(`/environments?clientId=${clientId}&pageSize=200`), enabled: !!clientId });
  const setTarget = (i: number, patch: Partial<TargetForm>) => f.set('targets', f.values.targets.map((t, n) => (n === i ? { ...t, ...patch } : t)));
  const unused = priorities.filter(p => !f.values.targets.some(t => t.priority === p));
  const toggle = (key: 'environmentIds', v: number, on: boolean) => f.set(key, on ? [...f.values[key], v] : f.values[key].filter(x => x !== v));

  const save = async () => {
    const v = f.values;
    const body = {
      projectId: toNum(v.projectId), title: v.title, contractReference: v.contractReference || null, type: v.type, status: v.status, ownerUserId: v.ownerUserId,
      startDate: v.startDate || null, endDate: v.endDate || null, renewalTerms: v.renewalTerms, noticeDays: v.noticeDays === '' ? null : Number(v.noticeDays),
      supportModel: v.supportModel, supportHours: v.supportHours || null, supportTimeZone: v.supportTimeZone || null,
      onSiteEngineersRequired: v.onSiteEngineersRequired === '' ? null : Number(v.onSiteEngineersRequired), coverage: v.coverage || null, obligations: v.obligations || null,
      environmentIds: v.environmentIds,
      slaTargets: v.targets.map(t => ({ priority: t.priority, responseMinutes: toMinutes(t.response, t.unit), resolutionMinutes: toMinutes(t.resolution, t.unit), basis: t.basis, notes: t.notes || null })),
      support24x7: v.support24x7, supportDays: v.support24x7 ? [] : v.supportDays, supportFrom: v.support24x7 || !v.supportFrom ? null : v.supportFrom, supportTo: v.support24x7 || !v.supportTo ? null : v.supportTo,
      currency: v.currency || null, slaPauseWhileWaitingOnCustomer: v.slaPauseWhileWaitingOnCustomer,
      milestones: v.milestones.map(m => ({ id: m.id ?? null, phase: m.phase, description: m.description || null, completionPercent: num(m.completionPercent), date: m.date || null })),
      fees: v.fees.map(x => ({ id: x.id ?? null, description: x.description, unit: x.unit || null, quantity: num(x.quantity), unitPrice: num(x.unitPrice) })),
      payments: v.payments.map(x => ({ id: x.id ?? null, condition: x.condition, percentage: num(x.percentage), amount: num(x.amount), dueDate: x.dueDate || null, status: x.status, paidOn: x.status === 'Paid' ? x.paidOn || null : null, notes: x.notes || null }))
    };
    const res = await f.submit(() => isNew ? post<{ id: number }>('/contracts', body) : put(`/contracts/${id}`, body, existing.data?.version).then(() => ({ id: Number(id) })));
    // Project pages, the register and dashboards show this contract too.
    if (res) { toast('Contract saved.'); refresh(); nav(`/contracts/${(res as { id: number }).id}`); }
  };

  if (!isNew && existing.isLoading) return <StateMessage kind="loading" />;
  return (
    <>
      <PageHead title={isNew ? 'New contract' : `Edit ${existing.data?.ref ?? ''}`} crumbs={[{ to: '/clients', label: 'Clients' }, { to: '/projects', label: 'Projects & contracts' }, ...(project ? [{ to: `/projects/${project.id}`, label: project.code }] : [])]}
        sub="Record what the signed contract says. Leave a value empty when it is not known yet — it is shown as Unknown, never guessed." />
      <FormError error={f.error} />
      <Panel title="Contract">
        <div className="form-grid">
          <SelectInput label="Project" required value={f.values.projectId} onChange={v => f.set('projectId', v)} error={f.fieldError('projectId')}
            options={(projects.data?.items ?? []).map(p => ({ value: String(p.id), label: `${p.clientCode} · ${p.code} · ${p.name}` }))} empty="— Select —"
            hint={project ? `Client ${project.clientCode} · covered products: ${project.products.map(x => x.code).join(', ') || 'none recorded on the project'}` : 'The contract belongs to this project and covers its products.'} />
          <TextInput label="Title" required value={f.values.title} onChange={v => f.set('title', v)} error={f.fieldError('title')} />
          <TextInput label="Contract reference" value={f.values.contractReference} onChange={v => f.set('contractReference', v)} error={f.fieldError('contractReference')} hint="Number on the contract document." />
          <SelectInput label="Type" required value={f.values.type} onChange={v => f.set('type', v)} options={T.options('ContractType', f.values.type)} empty={null} />
          <SelectInput label="Status" required value={f.values.status} onChange={v => f.set('status', v)} options={enumOptions(statuses)} empty={null} error={f.fieldError('status')} />
          <UserPicker label="Contract owner" required value={f.values.ownerUserId} onChange={v => f.set('ownerUserId', v)} clientId={clientId ?? undefined} error={f.fieldError('ownerUserId')} empty="— Select —" />
          <TextInput label="Start date" type="date" value={f.values.startDate} onChange={v => f.set('startDate', v)} />
          <TextInput label="End date" type="date" value={f.values.endDate} onChange={v => f.set('endDate', v)} error={f.fieldError('endDate')} hint="Empty = unknown (flagged for follow-up while Active)." />
          <SelectInput label="Renewal terms" value={f.values.renewalTerms} onChange={v => f.set('renewalTerms', v)} options={enumOptions(renewals)} empty={null} />
          <TextInput label="Notice period (days)" type="number" value={f.values.noticeDays} onChange={v => f.set('noticeDays', v)} error={f.fieldError('noticeDays')} />
        </div>
      </Panel>
      <Panel title="Service obligations">
        <div className="form-grid">
          <SelectInput label="Support model" value={f.values.supportModel} onChange={v => f.set('supportModel', v)} options={enumOptions(models)} empty={null} />
          <SupportHoursField v={f.values} set={(k, x) => f.set(k as never, x as never)} error={f.fieldError('supportTo') ?? f.fieldError('supportDays')} />
          <TimeZoneSelect label="Support time zone" value={f.values.supportTimeZone} onChange={v => f.set('supportTimeZone', v)} error={f.fieldError('supportTimeZone')} hint="The zone the support hours are counted in." />
          <TextInput label="Support notes" value={f.values.supportHours} onChange={v => f.set('supportHours', v)} error={f.fieldError('supportHours')} placeholder="e.g. Public holidays excluded" />
          <TextInput label="On-site engineers required" type="number" value={f.values.onSiteEngineersRequired} onChange={v => f.set('onSiteEngineersRequired', v)} error={f.fieldError('onSiteEngineersRequired')} />
          <TextInput label="Service coverage" wide multiline value={f.values.coverage} onChange={v => f.set('coverage', v)} error={f.fieldError('coverage')} />
          <TextInput label="Obligations" wide multiline value={f.values.obligations} onChange={v => f.set('obligations', v)} error={f.fieldError('obligations')} hint="Reports, staffing, maintenance windows and other duties as written in the contract." />
          <fieldset className="wide" style={{ border: 0, padding: 0 }}><legend className="flabel">Covered environments</legend>
            {!clientId ? <span className="hint">Select the project first.</span> : (envs.data?.items ?? []).length === 0 ? <span className="hint">No environments recorded for this client.</span>
              : envs.data!.items.map(e => <label key={e.id} className="check" style={{ marginRight: 14 }}><input type="checkbox" checked={f.values.environmentIds.includes(e.id)} onChange={ev => toggle('environmentIds', e.id, ev.target.checked)} /> {e.regionCode ? `${e.regionCode} / ` : ''}{e.name}</label>)}
            {f.fieldError('environmentIds') && <div className="err">{f.fieldError('environmentIds')}</div>}
          </fieldset>
        </div>
      </Panel>
      <Panel title="SLA targets (recorded)" actions={unused.length > 0 && <button className="btn" onClick={() => f.set('targets', [...f.values.targets, { priority: unused[0], response: '', resolution: '', unit: 'h', basis: 'SupportHours', notes: '' }])}>+ Target</button>}>
        <p className="hint">One row per priority, as written in the contract. Cases linked to this contract are timed against the target for their priority; changes apply to cases linked from now on.</p>
        <label className="check" style={{ margin: '8px 0' }}><input type="checkbox" checked={f.values.slaPauseWhileWaitingOnCustomer} onChange={e => f.set('slaPauseWhileWaitingOnCustomer', e.target.checked)} /> Pause the SLA clock while a case waits on the customer</label>
        {f.values.targets.length === 0 ? <StateMessage kind="none">No SLA targets recorded.</StateMessage> : (
          <table className="grid sla-edit">
            <thead><tr><th>Priority</th><th>Response</th><th>Resolution</th><th>Unit</th><th>Clock</th><th>Notes</th><th /></tr></thead>
            <tbody>
              {f.values.targets.map((t, i) => (
                <tr key={i}>
                  <td><select className="input" aria-label={`Row ${i + 1} priority`} value={t.priority} onChange={e => setTarget(i, { priority: e.target.value })}>{priorities.filter(p => p === t.priority || unused.includes(p)).map(p => <option key={p}>{p}</option>)}</select></td>
                  <td><input className="input" type="number" min="0" step="any" aria-label={`Row ${i + 1} response target`} value={t.response} onChange={e => setTarget(i, { response: e.target.value })} /></td>
                  <td><input className="input" type="number" min="0" step="any" aria-label={`Row ${i + 1} resolution target`} value={t.resolution} onChange={e => setTarget(i, { resolution: e.target.value })} /></td>
                  <td><select className="input" aria-label={`Row ${i + 1} unit`} value={t.unit} onChange={e => setTarget(i, { unit: e.target.value as 'min' | 'h' })}><option value="h">hours</option><option value="min">minutes</option></select></td>
                  <td><select className="input" aria-label={`Row ${i + 1} clock`} value={t.basis} onChange={e => setTarget(i, { basis: e.target.value })}>{bases.map(b => <option key={b} value={b}>{b === 'SupportHours' ? 'Support hours' : b === 'CalendarHours' ? 'Calendar (24×7)' : 'Unknown'}</option>)}</select></td>
                  <td><input className="input" aria-label={`Row ${i + 1} notes`} value={t.notes} onChange={e => setTarget(i, { notes: e.target.value })} /></td>
                  <td><button className="linkbtn" onClick={() => f.set('targets', f.values.targets.filter((_, n) => n !== i))} aria-label={`Remove row ${i + 1}`}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {Object.entries(f.error?.errors ?? {}).filter(([k]) => k.startsWith('slaTargets')).map(([k, v]) => <div key={k} className="err">{v.join(' ')}</div>)}
      </Panel>
      <ContractTermsEditor v={f.values} set={(k, x) => f.set(k as never, x as never)} errors={f.error?.errors ?? {}} />
      <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn btn-primary" disabled={f.busy} onClick={save}>Save contract</button>
        <button className="btn" onClick={() => nav(-1)}>Cancel</button>
      </div>
    </>
  );
}

type ProjectDto = {
  id: number; code: string; name: string; status: string; clientId: number; clientName: string; clientCode: string; scopeSummary?: string; serviceStart?: string; serviceEnd?: string;
  owner?: UserRef; products: { id: number; code: string; name: string }[]; environments: { id: number; name: string; type: string; region?: string }[];
  contracts: {
    id: number; ref: string; title: string; contractReference?: string; type: string; status: string; startDate?: string; endDate?: string; noticeDeadline?: string;
    supportModel: string; onSiteEngineersRequired?: number; owner?: UserRef; renewalState: string; renewalNote?: string;
    slaTargets: { priority: string; responseMinutes?: number | null; resolutionMinutes?: number | null; basis: string }[];
  }[];
  lastReviewedAt?: string; version: string; permissions: { canEdit: boolean; canAddContract: boolean; canArchive: boolean };
};

/** A27: the project with its contracts, their SLA targets and renewal state, its products and environments. */
export function ProjectDetail() {
  const T = useTypes();
  const { id } = useParams();
  const q = useQuery({ queryKey: ['project', id], queryFn: () => get<ProjectDto>(`/projects/${id}`) });
  const nav = useNavigate();
  const [dialog, setDialog] = useState<'edit' | 'archive' | null>(null);
  const p = q.data;
  return (
    <QueryState q={q}>{p && (<>
      <PageHead title={`${p.code} · ${p.name}`}
        crumbs={[{ to: '/clients', label: 'Clients' }, { to: `/clients/${p.clientId}`, label: p.clientCode }, { to: `/projects?clientId=${p.clientId}`, label: 'Projects & contracts' }, { label: p.code }]}
        sub={<><StatusBadge value={p.status} /> <span className="muted">{p.clientName}</span></>}
        actions={<>
          {p.permissions.canEdit && <button className="btn" onClick={() => setDialog('edit')}>Edit project</button>}
          {p.permissions.canAddContract && <Link className="btn btn-primary" to={`/contracts/new?projectId=${p.id}&clientId=${p.clientId}`}>+ Contract</Link>}
          {p.permissions.canArchive && <button className="btn btn-danger" onClick={() => setDialog('archive')}>Archive</button>}
        <DeleteAction button path={`/projects/${p.id}`} what={`project ${p.code}`} afterTo={'/projects'} /></>} />
      <div className="cols">
        <Panel title="Project">
          <DL items={[
            ['Client', <Link to={`/clients/${p.clientId}`}>{p.clientCode} · {p.clientName}</Link>], ['Project owner', <Person u={p.owner} />],
            ['Service dates', p.serviceStart ? `${fmtDate(p.serviceStart)} – ${p.serviceEnd ? fmtDate(p.serviceEnd) : 'open'}` : <Unknown />],
            ['Scope', p.scopeSummary ? <span style={{ whiteSpace: 'pre-wrap' }}>{p.scopeSummary}</span> : <Unknown />]
          ]} />
        </Panel>
        <Panel title="Products and environments">
          <DL items={[
            ['Supported products', p.products.length ? p.products.map(x => <span key={x.id} className="chip" style={{ marginRight: 6 }}>{x.code}</span>) : <span className="muted">None recorded</span>],
            ['Environments', p.environments.length ? p.environments.map(e => <div key={e.id}><Link to={`/environments/${e.id}`}>{e.region ? `${e.region} / ` : ''}{e.name}</Link> <span className="muted">· {T.name('EnvironmentType', e.type)}</span></div>) : <span className="muted">None linked</span>]
          ]} />
          <p className="hint" style={{ marginTop: 8 }}>The project's contracts cover these products.</p>
        </Panel>
      </div>
      <Panel title="Contracts & SLAs" pad={false}>
        {p.contracts.length === 0
          ? <StateMessage kind="none">No contract recorded for this project yet.{p.permissions.canAddContract ? ' Use “+ Contract” to record one with its SLA targets.' : ''}</StateMessage>
          : <DataTable rowKey={c => c.id} rows={p.contracts} caption="Contracts of this project" columns={[
            { key: 'c', header: 'Contract', render: c => <><Link to={`/contracts/${c.id}`}>{c.ref} · {c.title}</Link>{c.contractReference && <div className="hint">{c.contractReference}</div>}</> },
            { key: 't', header: 'Type', render: c => T.name('ContractType', c.type) },
            { key: 's', header: 'Status', render: c => <StatusBadge value={c.status} /> },
            { key: 'term', header: 'Term', render: c => <span className="nowrap">{c.startDate ? fmtDate(c.startDate) : '?'} – {c.endDate ? fmtDate(c.endDate) : <Unknown />}</span> },
            { key: 'r', header: 'Renewal', render: c => <><RenewalBadge state={c.renewalState} />{c.renewalNote && <div className="hint">{c.renewalNote}</div>}</> },
            { key: 'sla', header: 'SLA targets (response / resolution)', render: c => c.slaTargets.length === 0 ? <span className="muted">none</span>
              : c.slaTargets.map(t => <div key={t.priority} className="nowrap">{t.priority}: {fmtMinutes(t.responseMinutes)} / {fmtMinutes(t.resolutionMinutes)}</div>) },
            { key: 'sup', header: 'Support', render: c => <>{label(c.supportModel)}{c.onSiteEngineersRequired ? <div className="hint">{c.onSiteEngineersRequired} on site required</div> : null}</> },
            { key: 'o', header: 'Owner', render: c => <Person u={c.owner} /> }, { key: 'del', header: '', className: 'row-actions', render: c => <DeleteAction path={`/contracts/${c.id}`} what={`contract ${c.ref}`} /> }
          ]} />}
      </Panel>
      <MyNotesPanel projectId={p.id} />
      <AttachmentsWorkspace recordType="Project" recordId={p.id} canEdit={p.permissions.canAddContract} />
      <HistoryPanel entityType="Project" entityId={p.id} />
      {dialog === 'edit' && <ProjectDialog clientId={p.clientId} projectId={p.id} onClose={() => setDialog(null)} />}
      {dialog === 'archive' && <ArchiveDialog what="project" path={`/projects/${p.id}/archive`} version={p.version} onClose={() => setDialog(null)} onDone={() => nav(`/projects?clientId=${p.clientId}`)} />}
    </>)}</QueryState>
  );
}

// ---------------- A49: support hours, delivery schedule, fees and costs, payment terms ----------------
type MilestoneForm = { id?: number; phase: string; description: string; completionPercent: string; date: string };
type FeeForm = { id?: number; description: string; unit: string; quantity: string; unitPrice: string };
type PaymentForm = { id?: number; condition: string; percentage: string; amount: string; dueDate: string; status: string; paidOn: string; notes: string };
const num = (x: string) => (x.trim() === '' ? null : Number(x));
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PAYMENT_STATUS = ['Pending', 'Invoiced', 'Paid', 'Waived'];
/** Common currencies first (the region), then others; any ISO code is accepted by the server. */
export const CURRENCIES = ['AED', 'SAR', 'OMR', 'QAR', 'KWD', 'BHD', 'USD', 'EUR', 'GBP', 'CHF', 'EGP', 'JOD', 'IQD', 'MAD', 'DZD', 'TND', 'LBP', 'TRY', 'INR', 'PKR', 'CNY', 'JPY', 'RWF', 'BIF', 'KES', 'NGN', 'ZAR'];
const currencyName = (c: string) => { try { return new Intl.DisplayNames(['en'], { type: 'currency' }).of(c) ?? c; } catch { return c; } };
const money = (n?: number | null, cur?: string) => (n === null || n === undefined ? '' : `${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur ? ` ${cur}` : ''}`);

type SupportV = { support24x7: boolean; supportDays: string[]; supportFrom: string; supportTo: string };
function SupportHoursField({ v, set, error }: { v: SupportV; set: (k: keyof SupportV, x: unknown) => void; error?: string }) {
  const toggle = (d: string) => set('supportDays', v.supportDays.includes(d) ? v.supportDays.filter(x => x !== d) : WEEK.filter(w => w === d || v.supportDays.includes(w)));
  const preset = (days: string[]) => set('supportDays', days);
  return (
    <div className="field wide support-hours">
      <span className="flabel">Support hours</span>
      <label className="check"><input type="checkbox" checked={v.support24x7} onChange={e => set('support24x7', e.target.checked)} /> 24 × 7 (round the clock, every day)</label>
      {!v.support24x7 && (
        <div className="support-grid">
          <div className="day-chips" role="group" aria-label="Support days">
            {WEEK.map(d => <button key={d} type="button" aria-pressed={v.supportDays.includes(d)} onClick={() => toggle(d)} title={d}>{d.slice(0, 3)}</button>)}
            <span className="presets">
              <button type="button" className="linkbtn" onClick={() => preset(WEEK.slice(0, 5))}>Sun–Thu</button>
              <button type="button" className="linkbtn" onClick={() => preset(WEEK.slice(1, 6))}>Mon–Fri</button>
              <button type="button" className="linkbtn" onClick={() => preset([...WEEK])}>Every day</button>
            </span>
          </div>
          <div className="time-range">
            <label>From <input className="input" type="time" aria-label="Support from" value={v.supportFrom} onChange={e => set('supportFrom', e.target.value)} /></label>
            <label>to <input className="input" type="time" aria-label="Support to" value={v.supportTo} onChange={e => set('supportTo', e.target.value)} /></label>
            {v.supportFrom && v.supportTo && v.supportTo < v.supportFrom && <span className="hint">Ends the next day (overnight support).</span>}
          </div>
        </div>
      )}
      {error && <div className="err">{error}</div>}
    </div>
  );
}

type TermsV = { currency: string; milestones: MilestoneForm[]; fees: FeeForm[]; payments: PaymentForm[] };
function rowErrors(errors: Record<string, string[]>, key: string) {
  return Object.entries(errors).filter(([k]) => k.toLowerCase() === key.toLowerCase() || k.toLowerCase().startsWith(key.toLowerCase() + '[')).map(([k, v]) => <div key={k} className="err">{v.join(' ')}</div>);
}

function ContractTermsEditor({ v, set, errors }: { v: TermsV; set: (k: keyof TermsV, x: unknown) => void; errors: Record<string, string[]> }) {
  const upd = <K extends 'milestones' | 'fees' | 'payments'>(k: K, i: number, patch: Partial<TermsV[K][number]>) =>
    set(k, (v[k] as TermsV[K][number][]).map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const del = (k: 'milestones' | 'fees' | 'payments', i: number) => set(k, (v[k] as unknown[]).filter((_, n) => n !== i));
  const move = (k: 'milestones' | 'fees' | 'payments', i: number, d: -1 | 1) => {
    const rows = [...(v[k] as unknown[])]; const j = i + d; if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]]; set(k, rows);
  };
  const total = v.fees.reduce((a, x) => a + (Number(x.unitPrice) || 0) * (x.quantity.trim() ? Number(x.quantity) || 0 : 1), 0);
  const pct = v.payments.reduce((a, x) => a + (Number(x.percentage) || 0), 0);
  const curOpts = [...CURRENCIES, ...(v.currency && !CURRENCIES.includes(v.currency) ? [v.currency] : [])].map(c => ({ value: c, label: `${c} · ${currencyName(c)}` }));
  const order = (k: 'milestones' | 'fees' | 'payments', i: number, n: number) => <span className="nowrap order-btns">
    <button type="button" className="linkbtn" onClick={() => move(k, i, -1)} disabled={i === 0} aria-label={`Move row ${i + 1} up`}>▲</button>
    <button type="button" className="linkbtn" onClick={() => move(k, i, 1)} disabled={i === n - 1} aria-label={`Move row ${i + 1} down`}>▼</button></span>;
  return (
    <>
      <Panel title="Delivery schedule" actions={<button className="btn" onClick={() => set('milestones', [...v.milestones, { phase: '', description: '', completionPercent: '', date: '' }])}>+ Phase</button>}>
        {v.milestones.length === 0 ? <StateMessage kind="none">No delivery phases recorded.</StateMessage> : (
          <table className="grid terms-edit"><thead><tr><th /><th>Phase</th><th>Description</th><th className="num">Completion %</th><th>Date</th><th /></tr></thead>
            <tbody>{v.milestones.map((m, i) => (
              <tr key={i}>
                <td>{order('milestones', i, v.milestones.length)}</td>
                <td><input className="input" aria-label={`Phase ${i + 1}`} value={m.phase} onChange={e => upd('milestones', i, { phase: e.target.value })} placeholder="e.g. Phase 1 – Installation" /></td>
                <td><input className="input" aria-label={`Phase ${i + 1} description`} value={m.description} onChange={e => upd('milestones', i, { description: e.target.value })} /></td>
                <td className="num"><input className="input pct" type="number" min="0" max="100" aria-label={`Phase ${i + 1} completion percentage`} value={m.completionPercent} onChange={e => upd('milestones', i, { completionPercent: e.target.value })} /></td>
                <td><input className="input" type="date" aria-label={`Phase ${i + 1} date`} value={m.date} onChange={e => upd('milestones', i, { date: e.target.value })} /></td>
                <td><button type="button" className="linkbtn" onClick={() => del('milestones', i)} aria-label={`Remove phase ${i + 1}`}>Remove</button></td>
              </tr>))}</tbody></table>
        )}
        {rowErrors(errors, 'milestones')}
      </Panel>
      <Panel title="Fees and costs" actions={<button className="btn" onClick={() => set('fees', [...v.fees, { description: '', unit: '', quantity: '', unitPrice: '' }])}>+ Line</button>}>
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <SelectInput label="Currency" value={v.currency} onChange={x => set('currency', x)} options={curOpts} empty="— Select —" error={errors.currency?.[0] ?? errors.Currency?.[0]}
            hint="Used for the fees and the payment amounts of this contract." />
        </div>
        {v.fees.length === 0 ? <StateMessage kind="none">No fees recorded.</StateMessage> : (
          <table className="grid terms-edit"><thead><tr><th /><th>Description</th><th>Unit</th><th className="num">Quantity</th><th className="num">Unit price</th><th className="num">Line total</th><th /></tr></thead>
            <tbody>{v.fees.map((x, i) => (
              <tr key={i}>
                <td>{order('fees', i, v.fees.length)}</td>
                <td><input className="input" aria-label={`Fee ${i + 1} description`} value={x.description} onChange={e => upd('fees', i, { description: e.target.value })} placeholder="e.g. Annual support" /></td>
                <td><input className="input" aria-label={`Fee ${i + 1} unit`} value={x.unit} onChange={e => upd('fees', i, { unit: e.target.value })} placeholder="year, licence, man-day…" list="fee-units" /></td>
                <td className="num"><input className="input qty" type="number" min="0" step="any" aria-label={`Fee ${i + 1} quantity`} value={x.quantity} onChange={e => upd('fees', i, { quantity: e.target.value })} placeholder="1" /></td>
                <td className="num"><input className="input money" type="number" min="0" step="0.01" aria-label={`Fee ${i + 1} unit price`} value={x.unitPrice} onChange={e => upd('fees', i, { unitPrice: e.target.value })} /></td>
                <td className="num nowrap">{x.unitPrice ? money((Number(x.unitPrice) || 0) * (x.quantity.trim() ? Number(x.quantity) || 0 : 1), v.currency) : ''}</td>
                <td><button type="button" className="linkbtn" onClick={() => del('fees', i)} aria-label={`Remove fee ${i + 1}`}>Remove</button></td>
              </tr>))}</tbody>
            <tfoot><tr><td colSpan={5} className="num"><b>Total</b></td><td className="num nowrap"><b>{money(total, v.currency)}</b></td><td /></tr></tfoot></table>
        )}
        <datalist id="fee-units">{['year', 'month', 'licence', 'man-day', 'hour', 'site', 'server', 'lump sum'].map(u => <option key={u} value={u} />)}</datalist>
        {rowErrors(errors, 'fees')}
      </Panel>
      <Panel title="Payment terms" actions={<button className="btn" onClick={() => set('payments', [...v.payments, { condition: '', percentage: '', amount: '', dueDate: '', status: 'Pending', paidOn: '', notes: '' }])}>+ Payment</button>}>
        <p className="hint" style={{ marginTop: 0 }}>Open payments with a due date are announced in the notifications ahead of time (Administration → Settings → Contracts.PaymentReminderDays) and again when overdue.</p>
        {v.payments.length === 0 ? <StateMessage kind="none">No payment terms recorded.</StateMessage> : (
          <table className="grid terms-edit"><thead><tr><th /><th>Condition</th><th className="num">%</th><th className="num">Amount</th><th>Due date</th><th>Status</th><th>Paid on</th><th /></tr></thead>
            <tbody>{v.payments.map((x, i) => (
              <tr key={i}>
                <td>{order('payments', i, v.payments.length)}</td>
                <td><input className="input" aria-label={`Payment ${i + 1} condition`} value={x.condition} onChange={e => upd('payments', i, { condition: e.target.value })} placeholder="e.g. 30% on signature" /></td>
                <td className="num"><input className="input pct" type="number" min="0" max="100" step="any" aria-label={`Payment ${i + 1} percentage`} value={x.percentage} onChange={e => upd('payments', i, { percentage: e.target.value })} /></td>
                <td className="num"><input className="input money" type="number" min="0" step="0.01" aria-label={`Payment ${i + 1} amount`} value={x.amount} onChange={e => upd('payments', i, { amount: e.target.value })}
                  placeholder={x.percentage && total ? (total * Number(x.percentage) / 100).toFixed(2) : ''} /></td>
                <td><input className="input" type="date" aria-label={`Payment ${i + 1} due date`} value={x.dueDate} onChange={e => upd('payments', i, { dueDate: e.target.value })} /></td>
                <td><select className="input" aria-label={`Payment ${i + 1} status`} value={x.status} onChange={e => upd('payments', i, { status: e.target.value })}>{PAYMENT_STATUS.map(s => <option key={s}>{s}</option>)}</select></td>
                <td>{x.status === 'Paid' && <input className="input" type="date" aria-label={`Payment ${i + 1} paid on`} value={x.paidOn} onChange={e => upd('payments', i, { paidOn: e.target.value })} />}</td>
                <td><button type="button" className="linkbtn" onClick={() => del('payments', i)} aria-label={`Remove payment ${i + 1}`}>Remove</button></td>
              </tr>))}</tbody>
            <tfoot><tr><td /><td className="num"><b>Total</b></td><td className={`num${pct > 100 ? ' err' : ''}`}><b>{pct ? `${pct} %` : ''}</b></td>
              <td className="num nowrap"><b>{money(v.payments.reduce((a, x) => a + (Number(x.amount) || 0), 0) || null, v.currency)}</b></td><td colSpan={4} /></tr></tfoot></table>
        )}
        {rowErrors(errors, 'payments')}
      </Panel>
    </>
  );
}

function ContractTermsView({ c }: { c: Detail }) {
  const done = c.milestones.length ? Math.round(c.milestones.reduce((a, m) => a + (m.completionPercent ?? 0), 0) / c.milestones.length) : null;
  const paid = c.payments.filter(p => p.status === 'Paid').reduce((a, p) => a + (p.amount ?? 0), 0);
  const open = c.payments.filter(p => p.status === 'Pending' || p.status === 'Invoiced');
  const next = open.filter(p => p.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0];
  return (
    <>
      <Panel title={`Delivery schedule${done !== null ? ` · ${done} % complete on average` : ''}`} pad={false}>
        {c.milestones.length === 0 ? <div className="panel-body"><StateMessage kind="none">No delivery phases recorded.</StateMessage></div> : (
          <table className="grid"><thead><tr><th>Phase</th><th>Description</th><th>Completion</th><th>Date</th></tr></thead>
            <tbody>{c.milestones.map(m => (
              <tr key={m.id}><td><b>{m.phase}</b></td><td>{m.description}</td>
                <td className="nowrap">{m.completionPercent !== undefined && m.completionPercent !== null
                  ? <span className="progress"><span className="bar"><span style={{ width: `${m.completionPercent}%` }} /></span>{m.completionPercent} %</span> : <Unknown />}</td>
                <td className="nowrap">{m.date ? fmtDate(m.date) : <Unknown />}</td></tr>))}</tbody></table>
        )}
      </Panel>
      <div className="cols">
        <Panel title={`Fees and costs${c.currency ? ` (${c.currency})` : ''}`} pad={false}>
          {c.fees.length === 0 ? <div className="panel-body"><StateMessage kind="none">No fees recorded.</StateMessage></div> : (
            <table className="grid"><thead><tr><th>Description</th><th>Unit</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Total</th></tr></thead>
              <tbody>{c.fees.map(f => <tr key={f.id}><td>{f.description}</td><td>{f.unit}</td><td className="num">{f.quantity ?? 1}</td><td className="num nowrap">{money(f.unitPrice)}</td><td className="num nowrap">{money(f.total)}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={4} className="num"><b>Total</b></td><td className="num nowrap"><b>{money(c.feesTotal, c.currency)}</b></td></tr></tfoot></table>
          )}
        </Panel>
        <Panel title="Payment terms" pad={false}>
          {c.payments.length === 0 ? <div className="panel-body"><StateMessage kind="none">No payment terms recorded.</StateMessage></div> : (<>
            <p className="hint" style={{ padding: '8px 12px 0', margin: 0 }}>
              {next ? <>Next due: <b>{fmtDate(next.dueDate!)}</b> — {next.condition}{next.amount ? ` (${money(next.amount, c.currency)})` : ''}. </> : open.length ? 'Open payments have no due date. ' : 'No open payments. '}
              {paid > 0 && <>Paid so far: {money(paid, c.currency)}.</>}</p>
            <table className="grid"><thead><tr><th>Condition</th><th className="num">%</th><th className="num">Amount</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>{c.payments.map(p => (
                <tr key={p.id}><td>{p.condition}{p.notes && <div className="hint">{p.notes}</div>}</td><td className="num">{p.percentage !== undefined && p.percentage !== null ? `${p.percentage} %` : ''}</td>
                  <td className="num nowrap">{money(p.amount, c.currency)}</td><td className="nowrap">{p.dueDate ? fmtDate(p.dueDate) : <Unknown />}</td>
                  <td className="nowrap"><StatusBadge value={p.status} />{p.overdue && <> <Badge tone="bad">Overdue</Badge></>}{p.paidOn && <div className="hint">paid {fmtDate(p.paidOn)}</div>}</td></tr>))}</tbody></table>
          </>)}
        </Panel>
      </div>
    </>
  );
}
