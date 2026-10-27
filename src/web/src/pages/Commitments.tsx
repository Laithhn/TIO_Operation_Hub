import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { exportCsv, get, post, qs, type Paged, type UserRef } from '../api';
import { fmtDateTime, fromLocalInput, inDays, label, toLocalInput } from '../format';
import { useEnum, useForm, useLeaveGuard, useMe, usePermission, useRefresh, useUrlState } from '../hooks';
import { ActionDialog, TimeZoneSelect, UserPicker } from '../ui/pickers';
import { Badge, DataTable, DL, enumOptions, FormError, PageHead, Pager, Panel, Person, QueryState, SelectInput, StatusBadge, TextInput, useToast, When, DeleteAction } from '../ui/kit';
import { HistoryPanel, toNum, useClientOptions, useTeamOptions } from './common';
import { AttachmentsPanel } from './Attachments';

const typeLabel = (t: string) => (t === 'RecordedContractualDeadline' ? 'Recorded deadline' : label(t));

type Row = { id: number; ref: string; scope: string; description: string; type: string; status: string; clientId?: number; clientCode?: string; teamName?: string; ownerName?: string; ownerDeactivated: boolean; originalDueAt: string; currentDueAt: string; timeZone: string; revisionCount: number; completedAt?: string; completedLate?: boolean; overdue: boolean; nextReviewAt?: string };

export function CommitmentList() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ status: 'open', due: '', clientId: '', teamId: '', ownerId: '', scope: '', type: '', late: '', stale: '', q: '', country: '', asOf: '', sort: 'due', page: '1', pageSize: '15' });
  const q = useQuery({ queryKey: ['commitments', f], queryFn: () => get<Paged<Row>>(`/commitments${qs(f)}`) });
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const types = useEnum('CommitmentType');
  const canEng = usePermission('Commitments', 'Create');
  const exportParams = Object.fromEntries(Object.entries(f).filter(([k]) => !['sort', 'page', 'pageSize'].includes(k)));
  const filtered = Object.entries(f).some(([k, v]) => !['sort', 'page', 'pageSize', 'status'].includes(k) && v);
  return (
    <>
      <PageHead title="Commitments" sub="Owned promises with deadlines in their original time zone. Waiting never pauses a deadline; late completion stays Completed with a separate timeliness result."
        actions={<>{me.grants.export && <button className="btn" onClick={() => exportCsv('commitments', exportParams)}>Export CSV</button>}{canEng && <Link className="btn btn-primary" to="/commitments/new">+ New Commitment</Link>}</>} />
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized" />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        <SelectInput label="Owner" value={f.ownerId} onChange={v => set({ ownerId: v })} options={[{ value: String(me.id), label: 'Me' }]} empty="Anyone" />
        <SelectInput label="Deadline" value={f.due} onChange={v => set({ due: v })} options={[{ value: 'overdue', label: 'Open and overdue' }, { value: 'upcoming', label: 'Upcoming' }]} empty="Any" />
        <SelectInput label="Timeliness" value={f.late} onChange={v => set({ late: v, status: v ? 'Completed' : f.status })} options={[{ value: 'true', label: 'Completed late' }]} empty="Any" />
      </div>
      <DataTable<Row> rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'} sort={f.sort} onSort={s => set({ sort: s })} caption="Commitments"
        columns={[
          { key: 'ref', header: 'Ref', sort: 'ref', render: r => <Link to={`/commitments/${r.id}`}>{r.ref}</Link>, filter: <input className="input" aria-label="Search commitments" placeholder="Search" value={f.q} onChange={e => set({ q: e.target.value })} /> },
          { key: 'd', header: 'Description', render: r => <Link to={`/commitments/${r.id}`}>{r.description}</Link> },
          { key: 't', header: 'Type', render: r => typeLabel(r.type), filter: <select className="input" aria-label="Filter by type" value={f.type} onChange={e => set({ type: e.target.value })}><option value="">All</option>{types.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}</select> },
          { key: 'c', header: 'Client / scope', sort: 'client', render: r => r.clientCode ?? <span className="chip">Internal · {r.teamName}</span> },
          { key: 's', header: 'Status', sort: 'status', render: r => <><StatusBadge value={r.status} />{r.completedLate === true && <Badge tone="warn">Late</Badge>}</>,
            filter: <select className="input" aria-label="Filter by status" value={f.status} onChange={e => set({ status: e.target.value })}><option value="open">Open</option><option value="all">All</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></select> },
          { key: 'due', header: 'Current deadline', sort: 'due', render: r => <span className={r.overdue ? 'err' : ''}>{fmtDateTime(r.currentDueAt, r.timeZone)} <span className="hint">{r.timeZone}</span>{r.overdue && ' · overdue'}</span> },
          { key: 'orig', header: 'Original', render: r => r.revisionCount ? <span className="hint">{fmtDateTime(r.originalDueAt, r.timeZone)} · {r.revisionCount} revision(s)</span> : <span className="muted">Unchanged</span> },
          { key: 'o', header: 'Owner', sort: 'owner', render: r => <>{r.ownerName}{r.ownerDeactivated && <> <Badge tone="bad">Deactivated</Badge></>}</> }, { key: 'del', header: '', className: 'row-actions', render: r => <DeleteAction path={`/commitments/${r.id}`} what={`commitment ${r.ref}`} /> }
        ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
    </>
  );
}

export function CommitmentForm() {
  const [sp] = useSearchParams();
  const me = useMe().data!;
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const types = useEnum('CommitmentType');
  const canLead = usePermission('Commitments', 'Coordinate');
  const f = useForm({ scope: sp.get('clientId') ? 'Client' : sp.get('teamId') ? 'Internal' : 'Client', clientId: sp.get('clientId') ?? '', responsibleTeamId: sp.get('teamId') ?? '', description: '', type: '', ownerUserId: me.id as number | null,
    dueLocal: inDays(7, 17), timeZone: me.timeZone, nextReviewAt: inDays(3), caseId: sp.get('caseId') ?? '', projectId: '' });
  useLeaveGuard(f.dirty && !f.busy);
  const v = f.values;
  const projects = useQuery({ queryKey: ['projects-of', v.clientId], queryFn: () => get<Paged<{ id: number; code: string; name: string }>>(`/projects?clientId=${v.clientId}&pageSize=100`), enabled: v.scope === 'Client' && !!v.clientId });
  const save = async () => {
    const r = await f.submit(() => post<{ id: number }>('/commitments', { scope: v.scope, clientId: v.scope === 'Client' ? toNum(v.clientId) : null, responsibleTeamId: toNum(v.responsibleTeamId), description: v.description, type: v.type || null,
      ownerUserId: v.ownerUserId, dueLocal: v.dueLocal, timeZone: v.timeZone, nextReviewAt: v.nextReviewAt ? fromLocalInput(v.nextReviewAt) : null, caseId: toNum(v.caseId), projectId: toNum(v.projectId) }));
    if (r) { toast('Commitment recorded.'); refresh(); nav(`/commitments/${r.id}`); }
  };
  return (
    <>
      <PageHead title="New commitment" crumbs={[{ to: '/commitments', label: 'Commitments' }]} />
      <Panel>
        <FormError error={f.error} />
        <div className="form-grid">
          <SelectInput label="Scope" required value={v.scope} onChange={x => f.set('scope', x)} options={[{ value: 'Client', label: 'Client-related' }, { value: 'Internal', label: 'Internal' }]} empty={null} />
          {v.scope === 'Client' ? <SelectInput label="Client" required value={v.clientId} onChange={x => f.set('clientId', x)} options={clients} error={f.fieldError('clientId')} />
            : <SelectInput label="Internal team scope" required value={v.responsibleTeamId} onChange={x => f.set('responsibleTeamId', x)} options={teams} error={f.fieldError('responsibleTeamId')} />}
          <SelectInput label="Type" required value={v.type} onChange={x => f.set('type', x)} options={types.map(t => ({ value: t, label: typeLabel(t) }))} error={f.fieldError('type')} hint="Recorded deadlines are manual entries, never verified SLA calculations." />
          <TextInput label="Description" required wide multiline value={v.description} onChange={x => f.set('description', x)} error={f.fieldError('description')} />
          {canLead ? <UserPicker label="Accountable owner" required value={v.ownerUserId} onChange={x => f.set('ownerUserId', x)} clientId={v.scope === 'Client' ? toNum(v.clientId) : null} teamId={v.scope === 'Internal' ? toNum(v.responsibleTeamId) : null} error={f.fieldError('ownerUserId')} empty="— Select —" />
            : <TextInput label="Accountable owner" value={`${me.displayName} (you)`} onChange={() => {}} disabled hint="Only a Team Lead can make someone else the owner." />}
          <TextInput label="Deadline (local wall-clock time)" required type="datetime-local" value={v.dueLocal} onChange={x => f.set('dueLocal', x)} error={f.fieldError('dueLocal')} />
          <TimeZoneSelect label="Original time zone" required value={v.timeZone} onChange={x => f.set('timeZone', x)} error={f.fieldError('timeZone')} hint="The deadline is kept in this zone. Ambiguous DST times need an explicit offset, e.g. 2026-10-25T02:30+02:00." />
          <TextInput label={`Next review (${me.timeZone})`} type="datetime-local" value={v.nextReviewAt} onChange={x => f.set('nextReviewAt', x)} />
          {v.scope === 'Client' && <SelectInput label="Project link (optional)" value={v.projectId} onChange={x => f.set('projectId', x)} options={(projects.data?.items ?? []).map(p => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))} empty="None" error={f.fieldError('projectId')} />}
          {v.caseId && <TextInput label="Linked case" value={`Case #${v.caseId}`} onChange={() => {}} disabled error={f.fieldError('caseId')} />}
        </div>
        <div className="form-actions"><button className="btn" onClick={() => nav(-1)}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Record commitment</button></div>
      </Panel>
    </>
  );
}

type Dto = {
  id: number; ref: string; scope: string; description: string; type: string; typeLabel: string; status: string; timeZone: string; client?: { id: number; code: string; name: string }; team?: { id: number; name: string };
  owner?: UserRef; coordinator?: UserRef; originalDueAt: string; originalDueLocal: string; currentDueAt: string; currentDueLocal: string; revisionCount: number; nextReviewAt?: string;
  completedAt?: string; completionEvidence?: string; dueAtCompletion?: string; cancelReason?: string; timeliness: string; originalDeadlineResult?: string; overdue: boolean;
  case?: { id: number; ref: string; title: string }; project?: { id: number; code: string; name: string }; lastReviewedAt?: string;
  events: { id: number; type: string; previousDueAt?: string; newDueAt?: string; completedAt?: string; reason?: string; evidence?: string; at: string; by?: string }[];
  permissions: { canEdit: boolean; canRevise: boolean; canComplete: boolean; canCancel: boolean; canReopen: boolean }; version: string;
};

export function CommitmentDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['commitment', id], queryFn: () => get<Dto>(`/commitments/${id}`) });
  const [dialog, setDialog] = useState<string | null>(null);
  const c = q.data;
  const close = () => setDialog(null);
  return (
    <QueryState q={q}>{c && (<>
      <PageHead title={`${c.ref} · ${c.description}`} crumbs={[{ to: '/commitments', label: 'Commitments' }, { label: c.ref }]}
        sub={<><StatusBadge value={c.status} /> {c.typeLabel} · <b>{c.timeliness}</b></>}
        actions={<>
          {c.permissions.canRevise && <button className="btn" onClick={() => setDialog('revise')}>Revise deadline</button>}
          {c.permissions.canComplete && <button className="btn btn-primary" onClick={() => setDialog('complete')}>Complete</button>}
          {c.permissions.canCancel && <button className="btn btn-danger" onClick={() => setDialog('cancel')}>Cancel</button>}
          {c.permissions.canReopen && <button className="btn" onClick={() => setDialog('reopen')}>Reopen</button>}
        <DeleteAction button path={`/commitments/${c.id}`} what={`commitment ${c.ref}`} afterTo={'/commitments'} /></>} />
      <div className="cols">
        <Panel title="Promise">
          <DL items={[
            ['Scope', c.client ? <Link to={`/clients/${c.client.id}`}>{c.client.code} · {c.client.name}</Link> : `Internal · ${c.team?.name}`], ['Owner', <Person u={c.owner} />],
            ['Type', c.typeLabel], ['Linked case', c.case ? <Link to={`/cases/${c.case.id}`}>{c.case.ref} · {c.case.title}</Link> : 'None'], ['Project', c.project ? `${c.project.code} · ${c.project.name}` : 'None'],
            ['Next review', <When v={c.nextReviewAt} />], ['Last reviewed', <When v={c.lastReviewedAt} />]
          ]} />
        </Panel>
        <Panel title="Deadlines and outcome">
          <DL items={[
            ['Original deadline', `${c.originalDueLocal} (${c.timeZone})`], ['Current deadline', <>{c.currentDueLocal} ({c.timeZone}){c.overdue && <> <Badge tone="bad">Overdue</Badge></>}</>],
            ['Revisions', c.revisionCount], ['Status', <StatusBadge value={c.status} />], ['Timeliness (derived)', c.timeliness],
            ['Completed', c.completedAt ? <When v={c.completedAt} /> : null], ['Evidence', c.completionEvidence], ['Deadline in force at completion', c.dueAtCompletion ? <When v={c.dueAtCompletion} /> : null],
            ['Against original deadline', c.originalDeadlineResult ?? null], ['Cancellation reason', c.cancelReason]
          ]} />
        </Panel>
      </div>
      <Panel title="Deadline and status history (kept)">
        <ul className="timeline">{c.events.map(e => <li key={e.id}><b>{label(e.type)}</b>
          {e.type === 'Revised' && <> {fmtDateTime(e.previousDueAt, c.timeZone)} → {fmtDateTime(e.newDueAt, c.timeZone)}</>}
          {e.type === 'Created' && <> deadline {fmtDateTime(e.newDueAt, c.timeZone)}</>}
          {e.completedAt && <> fulfilled {fmtDateTime(e.completedAt)}</>}{e.reason && <> — {e.reason}</>}{e.evidence && <> · evidence: {e.evidence}</>}
          <div className="when">{fmtDateTime(e.at)} · {e.by ?? 'system'}</div></li>)}</ul>
      </Panel>
      <AttachmentsPanel recordType="Commitment" recordId={c.id} />
      <HistoryPanel entityType="Commitment" entityId={c.id} />
      {dialog === 'revise' && <ActionDialog title="Revise deadline" path={`/commitments/${id}/revise`} version={c.version} onClose={close} submitLabel="Revise" intro="The original and every earlier deadline are kept."
        initial={{ dueLocal: toLocalInput(c.currentDueAt).length ? c.currentDueLocal.slice(0, 16).replace(' ', 'T') : '', timeZone: c.timeZone }}
        fields={[{ name: 'dueLocal', label: 'New deadline (local time)', kind: 'datetime', required: true }, { name: 'timeZone', label: 'Time zone', kind: 'timezone', required: true }, { name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} />}
      {dialog === 'complete' && <ActionDialog title="Complete commitment" path={`/commitments/${id}/complete`} version={c.version} onClose={close} submitLabel="Complete" intro="Completion after the deadline stays Completed, with a derived late result. The time cannot be in the future or before the deadline."
        initial={{ completedAt: toLocalInput(new Date().toISOString()) }}
        fields={[{ name: 'completedAt', label: 'Fulfilled at', kind: 'datetime', required: true }, { name: 'evidence', label: 'Evidence or reference (optional)', kind: 'textarea' }]}
        transform={v => ({ completedAt: fromLocalInput(v.completedAt), evidence: v.evidence })} />}
      {dialog === 'cancel' && <ActionDialog title="Cancel commitment" danger path={`/commitments/${id}/cancel`} version={c.version} onClose={close} submitLabel="Cancel commitment" fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} />}
      {dialog === 'reopen' && <ActionDialog title="Reopen commitment" path={`/commitments/${id}/reopen`} version={c.version} onClose={close} submitLabel="Reopen" intro="Previous completion or cancellation events are kept." fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} />}
    </>)}</QueryState>
  );
}

export { enumOptions };
