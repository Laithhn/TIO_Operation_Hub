import { useQuery } from '@tanstack/react-query';
import { canExportReport } from '../exportRights';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { exportCsv, get, post, put, qs, type Paged, type UserRef } from '../api';
import { fmtDateTime, fromLocalInput, inDays, label, toLocalInput } from '../format';
import { useEnum, useForm, useLeaveGuard, useMe, useRight, useRefresh, useUrlState } from '../hooks';
import { ActionDialog, TimeZoneSelect, UserPicker } from '../ui/pickers';
import { Badge, DataTable, Dialog, DL, enumOptions, FormError, PageHead, Pager, Panel, Person, QueryState, SelectInput, StatusBadge, TextInput, TitledText, useToast, When, DeleteAction } from '../ui/kit';
import { ClientDisplay } from '../ui/ClientLogo';
import { HistoryPanel, toNum, useClientOptions, useTeamOptions } from './common';
import { AttachmentsWorkspace } from './attachments/AttachmentsWorkspace';

const typeLabel = (t: string) => (t === 'RecordedContractualDeadline' ? 'Recorded deadline' : label(t));

/** A114: derived from a commitment's dependencies (never stored). */
type Health = 'OnTrack' | 'AtRisk' | 'WillBeLate' | 'Blocked';
const HEALTH: Record<Health, { text: string; tone: 'good' | 'warn' | 'bad' }> = {
  OnTrack: { text: 'On track', tone: 'good' }, AtRisk: { text: 'At risk', tone: 'warn' }, WillBeLate: { text: 'Will be late', tone: 'bad' }, Blocked: { text: 'Blocked', tone: 'bad' }
};
export function HealthBadge({ value }: { value?: Health | null }) {
  if (!value) return null;
  const h = HEALTH[value];
  return <Badge tone={h.tone}>{h.text}</Badge>;
}
const days = (n?: number | null) => (n == null ? '—' : Math.abs(n) === 1 ? `${n} day` : `${n} days`);

/** The external parties (standalone organizations shared by every client). */
type Party = { id: number; name: string; code?: string | null };
function useExternalParties(enabled = true) {
  return useQuery({ queryKey: ['external-parties'], queryFn: () => get<{ items: Party[]; canCreate: boolean }>('/commitments/external-parties'), enabled });
}

type Row = {
  id: number; ref: string; scope: string; title: string; description: string; type: string; status: string; clientId?: number; clientCode?: string; teamName?: string; ownerName?: string;
  ownerDeactivated: boolean; originalDueAt: string; currentDueAt: string; timeZone: string; revisionCount: number; completedAt?: string; completedLate?: boolean; overdue: boolean; nextReviewAt?: string;
  direction: string; externalParty?: string | null; dependencyCount: number; health?: Health | null; forecastAt?: string | null;
};

export function CommitmentList() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ status: 'open', due: '', clientId: '', teamId: '', ownerId: '', scope: '', type: '', late: '', stale: '', q: '', country: '', asOf: '', projectId: '', direction: '', externalOrganizationId: '', health: '', sort: 'due', page: '1', pageSize: '15' });
  const q = useQuery({ queryKey: ['commitments', f], queryFn: () => get<Paged<Row>>(`/commitments${qs(f)}`) });
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const types = useEnum('CommitmentType');
  const parties = useExternalParties();
  const canEng = useRight('Commitments', 'Create');
  const exportParams = Object.fromEntries(Object.entries(f).filter(([k]) => !['sort', 'page', 'pageSize', 'health'].includes(k)));
  const filtered = Object.entries(f).some(([k, v]) => !['sort', 'page', 'pageSize', 'status'].includes(k) && v);
  return (
    <>
      <PageHead title="Commitments" sub="Owned promises with deadlines in their original time zone, ours and those external parties made to us. Waiting never pauses a deadline; late completion stays Completed with a separate timeliness result."
        actions={<><Link className="btn" to="/commitments/external">External reliability</Link>{canExportReport(me, 'commitments') && <button className="btn" onClick={() => exportCsv('commitments', exportParams)}>Export CSV</button>}{canEng && <Link className="btn btn-primary" to="/commitments/new">+ New Commitment</Link>}</>} />
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized" />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        <SelectInput label="Owner" value={f.ownerId} onChange={v => set({ ownerId: v })} options={[{ value: String(me.id), label: 'Me' }]} empty="Anyone" />
        <SelectInput label="Direction" value={f.direction} onChange={v => set({ direction: v, externalOrganizationId: v === 'External' ? f.externalOrganizationId : '' })} options={[{ value: 'Ours', label: 'Ours' }, { value: 'External', label: 'External to us' }]} empty="All directions" />
        <SelectInput label="External party" value={f.externalOrganizationId} onChange={v => set({ externalOrganizationId: v, direction: v ? 'External' : f.direction })} options={(parties.data?.items ?? []).map(p => ({ value: String(p.id), label: p.name }))} empty="All external parties" />
        <SelectInput label="Health" value={f.health} onChange={v => set({ health: v })} options={[{ value: 'risk', label: 'At risk or late' }, { value: 'WillBeLate', label: 'Will be late' }, { value: 'Blocked', label: 'Blocked' }, { value: 'OnTrack', label: 'On track' }]} empty="Any health" />
        <SelectInput label="Deadline" value={f.due} onChange={v => set({ due: v })} options={[{ value: 'overdue', label: 'Open and overdue' }, { value: 'upcoming', label: 'Upcoming' }]} empty="Any" />
        <SelectInput label="Timeliness" value={f.late} onChange={v => set({ late: v, status: v ? 'Completed' : f.status })} options={[{ value: 'true', label: 'Completed late' }]} empty="Any" />
      </div>
      <DataTable<Row> rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'} sort={f.sort} onSort={s => set({ sort: s })} caption="Commitments"
        columns={[
          { key: 'ref', header: 'Ref', sort: 'ref', render: r => <Link to={`/commitments/${r.id}`}>{r.ref}</Link>, filter: <input className="input" aria-label="Search commitments" placeholder="Search" value={f.q} onChange={e => set({ q: e.target.value })} /> },
          { key: 'title', header: 'Title', sort: 'title', maxWidth: '32rem', render: r => <><TitledText to={`/commitments/${r.id}`} text={r.title || r.description} />
            {(r.externalParty || r.dependencyCount > 0) && <div className="hint">{r.externalParty ?? `Depends on ${r.dependencyCount} commitment${r.dependencyCount === 1 ? '' : 's'}`}</div>}</> },
          { key: 'dir', header: 'Direction', render: r => r.direction === 'External' ? <span className="chip">External</span> : 'Ours' },
          { key: 't', header: 'Type', render: r => typeLabel(r.type), filter: <select className="input" aria-label="Filter by type" value={f.type} onChange={e => set({ type: e.target.value })}><option value="">All</option>{types.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}</select> },
          { key: 'c', header: 'Client / scope', sort: 'client', render: r => r.clientCode ? <ClientDisplay id={r.clientId} code={r.clientCode} /> : <span className="chip">Internal · {r.teamName}</span> },
          { key: 's', header: 'Status', sort: 'status', render: r => <><StatusBadge value={r.status} />{r.completedLate === true && <Badge tone="warn">Late</Badge>}</>,
            filter: <select className="input" aria-label="Filter by status" value={f.status} onChange={e => set({ status: e.target.value })}><option value="open">Open</option><option value="all">All</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></select> },
          { key: 'h', header: 'Health', render: r => r.health ? <><HealthBadge value={r.health} />{r.forecastAt && (r.health === 'WillBeLate') && <div className="hint">forecast {fmtDateTime(r.forecastAt, r.timeZone)}</div>}</> : <span className="muted">—</span> },
          { key: 'due', header: 'Current deadline', sort: 'due', render: r => <span className={r.overdue ? 'err' : ''}>{fmtDateTime(r.currentDueAt, r.timeZone)} <span className="hint">{r.timeZone}</span>{r.overdue && ' · overdue'}</span> },
          { key: 'orig', header: 'Original', render: r => r.revisionCount ? <span className="hint">{fmtDateTime(r.originalDueAt, r.timeZone)} · {r.revisionCount} revision(s)</span> : <span className="muted">Unchanged</span> },
          { key: 'o', header: 'Owner', sort: 'owner', render: r => <>{r.ownerName}{r.ownerDeactivated && <> <Badge tone="bad">Deactivated</Badge></>}</> }, { key: 'del', header: '', className: 'row-actions', render: r => <DeleteAction path={`/commitments/${r.id}`} what={`commitment ${r.ref}`} /> }
        ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
    </>
  );
}

/** A114: pick the external party; people who may add organizations can add a new one here. */
function ExternalPartyPicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const parties = useExternalParties();
  const refresh = useRefresh();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [addError, setAddError] = useState<string>();
  const add = async () => {
    if (!name.trim()) { setAddError('Enter the name of the external party.'); return; }
    try {
      const r = await post<{ id: number }>('/commitments/external-parties', { name: name.trim() });
      await parties.refetch(); await refresh();
      onChange(String(r.id)); setAdding(false); setName(''); setAddError(undefined); toast('External party added.');
    } catch (e) { setAddError(e instanceof Error ? e.message : 'The external party could not be added.'); }
  };
  return (
    <div className="wide">
      <SelectInput label="External party" required value={value} onChange={onChange} options={(parties.data?.items ?? []).map(p => ({ value: String(p.id), label: p.name }))} error={error}
        hint={parties.data?.canCreate ? 'Shared by every client. Not in the list? Add it below.' : 'Shared by every client. Not in the list? Ask someone who can add organizations.'} />
      {parties.data?.canCreate && (adding
        ? <div className="toolbar"><TextInput label="New external party" value={name} onChange={v => { setName(v); setAddError(undefined); }} error={addError} placeholder="Example Supplier GmbH" />
          <button className="btn" onClick={() => { setAdding(false); setAddError(undefined); }}>Cancel</button><button className="btn btn-primary" onClick={add}>Add</button></div>
        : <button className="btn btn-link" onClick={() => setAdding(true)}>+ Add an external party</button>)}
    </div>
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
  const canLead = useRight('Commitments', 'Coordinate');
  const f = useForm({ scope: sp.get('clientId') ? 'Client' : sp.get('teamId') ? 'Internal' : 'Client', clientId: sp.get('clientId') ?? '', responsibleTeamId: sp.get('teamId') ?? '',
    direction: sp.get('direction') === 'External' ? 'External' : 'Ours', externalOrganizationId: '', title: '', description: '', type: '', ownerUserId: me.id as number | null,
    dueLocal: inDays(7, 17), timeZone: me.timeZone, nextReviewAt: inDays(3), caseId: sp.get('caseId') ?? '', projectId: '' });
  useLeaveGuard(f.dirty && !f.busy);
  const v = f.values;
  const external = v.direction === 'External';
  const projects = useQuery({ queryKey: ['projects-of', v.clientId], queryFn: () => get<Paged<{ id: number; code: string; name: string }>>(`/projects?clientId=${v.clientId}&pageSize=100`), enabled: v.scope === 'Client' && !!v.clientId });
  const save = async () => {
    const r = await f.submit(() => post<{ id: number }>('/commitments', { scope: v.scope, clientId: v.scope === 'Client' ? toNum(v.clientId) : null, responsibleTeamId: toNum(v.responsibleTeamId),
      title: v.title, description: v.description || null, type: v.type || null, direction: v.direction, externalOrganizationId: external ? toNum(v.externalOrganizationId) : null,
      ownerUserId: v.ownerUserId, dueLocal: v.dueLocal, timeZone: v.timeZone, nextReviewAt: v.nextReviewAt ? fromLocalInput(v.nextReviewAt) : null, caseId: toNum(v.caseId), projectId: toNum(v.projectId) }));
    if (r) { toast('Commitment recorded.'); refresh(); nav(`/commitments/${r.id}`); }
  };
  return (
    <>
      <PageHead title="New commitment" crumbs={[{ to: '/commitments', label: 'Commitments' }]} />
      <Panel>
        <FormError error={f.error} />
        <div className="form-grid">
          <SelectInput label="Who delivers" required value={v.direction} onChange={x => f.set('direction', x)} empty={null}
            options={[{ value: 'Ours', label: 'We do (our commitment)' }, { value: 'External', label: 'An external party, to us' }]}
            hint={external ? 'Record what an external party promised you, so the commitments that wait for it can show their risk.' : undefined} />
          {external && <ExternalPartyPicker value={v.externalOrganizationId} onChange={x => f.set('externalOrganizationId', x)} error={f.fieldError('externalOrganizationId')} />}
          <SelectInput label="Scope" required value={v.scope} onChange={x => f.set('scope', x)} options={[{ value: 'Client', label: 'Client-related' }, { value: 'Internal', label: 'Internal' }]} empty={null} />
          {v.scope === 'Client' ? <SelectInput label="Client" required value={v.clientId} onChange={x => f.set('clientId', x)} options={clients} error={f.fieldError('clientId')} />
            : <SelectInput label="Internal team scope" required value={v.responsibleTeamId} onChange={x => f.set('responsibleTeamId', x)} options={teams} error={f.fieldError('responsibleTeamId')} />}
          <TextInput label="Title" required wide maxLength={200} value={v.title} onChange={x => f.set('title', x)} error={f.fieldError('title')} placeholder={external ? 'Speed enforcement and pilot capability' : 'Deliver the pilot to the client'} />
          <TextInput label="Description" wide multiline maxLength={2000} value={v.description} onChange={x => f.set('description', x)} error={f.fieldError('description')} hint="Optional: scope, conditions, references." />
          <SelectInput label="Type" required value={v.type} onChange={x => f.set('type', x)} options={types.map(t => ({ value: t, label: typeLabel(t) }))} error={f.fieldError('type')} hint="Recorded deadlines are manual entries, never verified SLA calculations." />
          {canLead ? <UserPicker label={external ? 'Follow-up owner (our team)' : 'Accountable owner'} required value={v.ownerUserId} onChange={x => f.set('ownerUserId', x)} clientId={v.scope === 'Client' ? toNum(v.clientId) : null} teamId={v.scope === 'Internal' ? toNum(v.responsibleTeamId) : null} error={f.fieldError('ownerUserId')} empty="— Select —" />
            : <TextInput label={external ? 'Follow-up owner (our team)' : 'Accountable owner'} value={`${me.displayName} (you)`} onChange={() => {}} disabled hint="Only a Team Lead can make someone else the owner." />}
          <TextInput label="Deadline (local wall-clock time)" required type="datetime-local" value={v.dueLocal} onChange={x => f.set('dueLocal', x)} error={f.fieldError('dueLocal')} />
          <TimeZoneSelect label="Original time zone" required value={v.timeZone} onChange={x => f.set('timeZone', x)} error={f.fieldError('timeZone')} hint={external ? "Use the external party's time zone (for example Europe/Berlin)." : 'The deadline is kept in this zone. Ambiguous DST times need an explicit offset, e.g. 2026-10-25T02:30+02:00.'} />
          <TextInput label={`Next review (${me.timeZone})`} type="datetime-local" value={v.nextReviewAt} onChange={x => f.set('nextReviewAt', x)} />
          {v.scope === 'Client' && <SelectInput label="Project link (optional)" value={v.projectId} onChange={x => f.set('projectId', x)} options={(projects.data?.items ?? []).map(p => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))} empty="None" error={f.fieldError('projectId')} />}
          {v.caseId && <TextInput label="Linked ticket" value={`Ticket #${v.caseId}`} onChange={() => {}} disabled error={f.fieldError('caseId')} />}
        </div>
        <div className="form-actions"><button className="btn" onClick={() => nav(-1)}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Record commitment</button></div>
      </Panel>
    </>
  );
}

type DepView = {
  dependencyId: number; commitmentId: number; ref: string; title: string; direction: string; party?: string | null; status: string; currentDueAt: string; completedAt?: string | null;
  timeZone: string; leadTimeDays: number; note?: string | null; state: 'Open' | 'Overdue' | 'Delivered' | 'Cancelled'; expectedAt?: string | null; readyAt?: string | null; neededBy: string; bufferDays?: number | null;
};
type Forecast = { health?: Health | null; forecastAt?: string | null; bufferDays?: number | null; neededBy?: string | null; warningDays: number; message: string; causeCommitmentId?: number | null; dependencies: DepView[] };

type Dto = {
  id: number; ref: string; scope: string; title: string; description: string; type: string; typeLabel: string; status: string; timeZone: string; direction: string; externalParty?: { id: number; name: string } | null;
  client?: { id: number; code: string; name: string }; team?: { id: number; name: string };
  owner?: UserRef; coordinator?: UserRef; originalDueAt: string; originalDueLocal: string; currentDueAt: string; currentDueLocal: string; revisionCount: number; nextReviewAt?: string;
  createdAt: string; completedAt?: string; completionEvidence?: string; dueAtCompletion?: string; cancelReason?: string; timeliness: string; originalDeadlineResult?: string; overdue: boolean;
  case?: { id: number; ref: string; title: string }; project?: { id: number; code: string; name: string }; lastReviewedAt?: string;
  forecast?: Forecast | null; lateCause?: { id: number; ref: string; title: string; party?: string | null } | null;
  dependents: { id: number; ref: string; title: string; status: string; currentDueAt: string; timeZone: string; owner?: string | null; leadTimeDays: number; note?: string | null }[];
  events: { id: number; type: string; previousDueAt?: string; newDueAt?: string; completedAt?: string; reason?: string; evidence?: string; at: string; by?: string; causeCommitmentId?: number | null; causeRef?: string | null }[];
  permissions: { canEdit: boolean; canRevise: boolean; canComplete: boolean; canCancel: boolean; canReopen: boolean }; version: string;
};

/** Wall-clock "YYYY-MM-DDTHH:mm" of an instant in a zone (for a datetime-local input). */
function localIn(iso: string, zone: string): string {
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso));
    const g = (k: string) => p.find(x => x.type === k)?.value ?? '00';
    return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
  } catch { return toLocalInput(iso); }
}

const STATE_TONE: Record<DepView['state'], 'good' | 'warn' | 'bad' | 'neutral'> = { Delivered: 'good', Open: 'neutral', Overdue: 'bad', Cancelled: 'bad' };

function DependenciesPanel({ c, onAdd, onEdit, onRemove }: { c: Dto; onAdd: () => void; onEdit: (d: DepView) => void; onRemove: (d: DepView) => void }) {
  const fc = c.forecast;
  const can = c.permissions.canEdit;
  if (!fc && !can) return null;
  return (
    <Panel title="Dependencies" actions={can && <button className="btn" onClick={onAdd}>+ Add dependency</button>}>
      {!fc ? <p className="hint" style={{ margin: 0 }}>This commitment waits for nothing. Add a dependency when it can only be delivered after another commitment, such as an external party's delivery.</p> : <>
        <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <div className="stat"><div className="hint">Deadline</div><b>{fmtDateTime(c.currentDueAt, c.timeZone)}</b></div>
          <div className="stat"><div className="hint">Forecast delivery</div><b>{fc.forecastAt ? fmtDateTime(fc.forecastAt, c.timeZone) : 'Unknown'}</b></div>
          <div className="stat"><div className="hint">Needed by (earliest)</div><b>{fc.neededBy ? fmtDateTime(fc.neededBy, c.timeZone) : '—'}</b></div>
          <div className="stat"><div className="hint">Buffer</div><b>{days(fc.bufferDays)}</b></div>
          {fc.health && <div className="stat"><div className="hint">Health</div><HealthBadge value={fc.health} /></div>}
        </div>
        {fc.health && <div className={`notice${fc.health === 'OnTrack' ? '' : fc.health === 'AtRisk' ? ' warn' : ' bad'}`} role="status">{fc.message}</div>}
        <div className="rv-table-wrap">
          <table className="rv-table">
            <caption className="sr">Commitments this one waits for</caption>
            <thead><tr><th scope="col">Waits for</th><th scope="col">State</th><th scope="col">Due or delivered</th><th scope="col">Lead time</th><th scope="col">Needed by</th><th scope="col">Buffer</th>{can && <th scope="col"><span className="sr">Actions</span></th>}</tr></thead>
            <tbody>{fc.dependencies.map(d => (
              <tr key={d.dependencyId}>
                <td><Link to={`/commitments/${d.commitmentId}`}>{d.ref}</Link> · {d.title}{d.party && <div className="hint">External · {d.party}</div>}</td>
                <td className="nowrap"><Badge tone={STATE_TONE[d.state]}>{d.state}</Badge></td>
                <td className="nowrap">{d.state === 'Delivered' && d.completedAt ? <>delivered {fmtDateTime(d.completedAt, d.timeZone)}</> : <>due {fmtDateTime(d.currentDueAt, d.timeZone)}</>}<div className="hint">{d.timeZone}</div></td>
                <td className="nowrap">{days(d.leadTimeDays)}{d.note && <div className="hint">{d.note}</div>}</td>
                <td className="nowrap">{fmtDateTime(d.neededBy, c.timeZone)}</td>
                <td className="nowrap">{days(d.bufferDays)}</td>
                {can && <td className="row-actions nowrap"><button className="btn btn-link" onClick={() => onEdit(d)}>Edit</button> <button className="btn btn-link" onClick={() => onRemove(d)}>Remove</button></td>}
              </tr>))}</tbody>
          </table>
        </div>
        <p className="hint">Lead time is counted in calendar days after the dependency is delivered. A dependency that is overdue is expected no earlier than now. At risk below {days(fc.warningDays)} of buffer (setting <i>Commitments.DependencyWarningDays</i>).</p>
      </>}
    </Panel>
  );
}

function AddDependencyDialog({ c, onClose }: { c: Dto; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const opts = useQuery({ queryKey: ['dependency-options', c.id, search], queryFn: () => get<{ items: { id: number; ref: string; title: string; direction: string; party?: string | null; currentDueAt: string; timeZone: string }[] }>(`/commitments/${c.id}/dependency-options${qs({ q: search })}`) });
  const f = useForm({ dependsOnCommitmentId: '', leadTimeDays: '0', note: '' });
  const toast = useToast();
  const refresh = useRefresh();
  const v = f.values;
  const chosen = opts.data?.items.find(o => String(o.id) === v.dependsOnCommitmentId);
  const lead = Number(v.leadTimeDays);
  const neededBy = Number.isFinite(lead) ? new Date(new Date(c.currentDueAt).getTime() - lead * 86400000) : null;
  const buffer = chosen && neededBy ? Math.round((neededBy.getTime() - new Date(chosen.currentDueAt).getTime()) / 86400000) : null;
  const run = async () => {
    const ok = await f.submit(async () => { await post(`/commitments/${c.id}/dependencies`, { dependsOnCommitmentId: toNum(v.dependsOnCommitmentId), leadTimeDays: v.leadTimeDays === '' ? null : Number(v.leadTimeDays), note: v.note || null }, c.version); return true; });
    if (ok) { toast('Dependency added.'); await refresh(); onClose(); }
  };
  return (
    <Dialog title="Add dependency" onClose={onClose}>
      <div className="notice">{c.ref} · {c.title} · due {fmtDateTime(c.currentDueAt, c.timeZone)}</div>
      <FormError error={f.error} fields={['dependsOnCommitmentId', 'leadTimeDays', 'note']} />
      <div className="form-grid">
        <TextInput label="Find a commitment" wide value={search} onChange={setSearch} placeholder="Reference, title or external party" />
        <SelectInput label="Depends on" required wide value={v.dependsOnCommitmentId} onChange={x => f.set('dependsOnCommitmentId', x)} error={f.fieldError('dependsOnCommitmentId')}
          options={(opts.data?.items ?? []).map(o => ({ value: String(o.id), label: `${o.ref} · ${o.title}${o.party ? ` · ${o.party}` : ''} · due ${fmtDateTime(o.currentDueAt, o.timeZone)}` }))}
          hint="Commitments of the same client (or internal team). External commitments are listed first." />
        <TextInput label="Lead time after delivery (calendar days)" required type="number" value={v.leadTimeDays} onChange={x => f.set('leadTimeDays', x)} error={f.fieldError('leadTimeDays')} />
        <TextInput label="What happens in that time" value={v.note} maxLength={500} onChange={x => f.set('note', x)} error={f.fieldError('note')} placeholder="Integration with our software and SIT" />
      </div>
      {chosen && neededBy && <div className="notice">Needed by <b>{fmtDateTime(neededBy.toISOString(), c.timeZone)}</b> · buffer <b>{days(buffer)}</b></div>}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={run}>{f.busy ? 'Saving…' : 'Add'}</button></div>
    </Dialog>
  );
}

function EditDependencyDialog({ c, d, onClose }: { c: Dto; d: DepView; onClose: () => void }) {
  const f = useForm({ leadTimeDays: String(d.leadTimeDays), note: d.note ?? '' });
  const toast = useToast();
  const refresh = useRefresh();
  const run = async () => {
    const ok = await f.submit(async v => { await put(`/commitments/${c.id}/dependencies/${d.dependencyId}`, { leadTimeDays: v.leadTimeDays === '' ? null : Number(v.leadTimeDays), note: v.note || null }, c.version); return true; });
    if (ok) { toast('Dependency changed.'); await refresh(); onClose(); }
  };
  return (
    <Dialog title={`Dependency on ${d.ref}`} onClose={onClose}>
      <FormError error={f.error} fields={['leadTimeDays', 'note']} />
      <div className="form-grid">
        <TextInput label="Lead time after delivery (calendar days)" required type="number" value={f.values.leadTimeDays} onChange={x => f.set('leadTimeDays', x)} error={f.fieldError('leadTimeDays')} />
        <TextInput label="What happens in that time" value={f.values.note} maxLength={500} onChange={x => f.set('note', x)} error={f.fieldError('note')} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={run}>{f.busy ? 'Saving…' : 'Save'}</button></div>
    </Dialog>
  );
}

export function CommitmentDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['commitment', id], queryFn: () => get<Dto>(`/commitments/${id}`) });
  const [dialog, setDialog] = useState<string | null>(null);
  const [dep, setDep] = useState<DepView | null>(null);
  const c = q.data;
  const close = () => { setDialog(null); setDep(null); };
  const fc = c?.forecast;
  const pending = fc?.dependencies.filter(d => d.state !== 'Delivered') ?? [];
  const suggestForecast = fc?.health === 'WillBeLate' && fc.forecastAt;
  return (
    <QueryState q={q}>{c && (<>
      <PageHead title={`${c.ref} · ${c.title}`} crumbs={[{ to: '/commitments', label: 'Commitments' }, { label: c.ref }]}
        sub={<><StatusBadge value={c.status} /> {c.direction === 'External' && <span className="chip">External · {c.externalParty?.name}</span>} {c.typeLabel} · <b>{c.timeliness}</b> {fc?.health && <HealthBadge value={fc.health} />}</>}
        actions={<>
          {c.permissions.canRevise && <button className="btn" onClick={() => setDialog('revise')}>Revise deadline</button>}
          {c.permissions.canComplete && <button className="btn btn-primary" onClick={() => setDialog('complete')}>Complete</button>}
          {c.permissions.canCancel && <button className="btn btn-danger" onClick={() => setDialog('cancel')}>Cancel</button>}
          {c.permissions.canReopen && <button className="btn" onClick={() => setDialog('reopen')}>Reopen</button>}
        <DeleteAction button path={`/commitments/${c.id}`} what={`commitment ${c.ref}`} afterTo={'/commitments'} /></>} />
      <div className="cols">
        <Panel title="Promise">
          <DL items={[
            ['Title', c.title],
            ['Description', c.description ? <span style={{ whiteSpace: 'pre-wrap' }}>{c.description}</span> : <span className="muted">—</span>],
            ['Who delivers', c.direction === 'External' ? <>External party · <b>{c.externalParty?.name}</b></> : 'Ours'],
            ['Scope', c.client ? <ClientDisplay id={c.client.id} code={c.client.code} name={c.client.name} show="both" /> : `Internal · ${c.team?.name}`], [c.direction === 'External' ? 'Follow-up owner' : 'Owner', <Person u={c.owner} />],
            ['Type', c.typeLabel], ['Linked ticket', c.case ? <Link to={`/cases/${c.case.id}`}>{c.case.ref} · {c.case.title}</Link> : 'None'], ['Project', c.project ? `${c.project.code} · ${c.project.name}` : 'None'],
            ['Next review', <When v={c.nextReviewAt} />], ['Last reviewed', <When v={c.lastReviewedAt} />]
          ]} />
        </Panel>
        <Panel title="Deadlines and outcome">
          <DL items={[
            ['Original deadline', `${c.originalDueLocal} (${c.timeZone})`], ['Current deadline', <>{c.currentDueLocal} ({c.timeZone}){c.overdue && <> <Badge tone="bad">Overdue</Badge></>}</>],
            ['Revisions', c.revisionCount], ['Status', <StatusBadge value={c.status} />], ['Timeliness (derived)', c.timeliness],
            ['Completed', c.completedAt ? <When v={c.completedAt} /> : null], ['Evidence', c.completionEvidence], ['Deadline in force at completion', c.dueAtCompletion ? <When v={c.dueAtCompletion} /> : null],
            ['Against original deadline', c.originalDeadlineResult ? label(c.originalDeadlineResult) : null], ['Cancellation reason', c.cancelReason],
            ['Late because of', c.lateCause ? <><Link to={`/commitments/${c.lateCause.id}`}>{c.lateCause.ref}</Link> · {c.lateCause.title}{c.lateCause.party && ` (${c.lateCause.party})`}</> : null]
          ]} />
        </Panel>
      </div>
      <DependenciesPanel c={c} onAdd={() => setDialog('add-dependency')} onEdit={d => { setDep(d); setDialog('edit-dependency'); }} onRemove={d => { setDep(d); setDialog('remove-dependency'); }} />
      {c.dependents.length > 0 && <Panel title="Waiting for this">
        <ul className="timeline">{c.dependents.map(d => <li key={d.id}><Link to={`/commitments/${d.id}`}>{d.ref}</Link> {d.title} <StatusBadge value={d.status} />
          <div className="when">due {fmtDateTime(d.currentDueAt, d.timeZone)} · {days(d.leadTimeDays)} after this is delivered{d.note && ` (${d.note})`}{d.owner && ` · ${d.owner}`}</div></li>)}</ul>
      </Panel>}
      <Panel title="Deadline and status history (kept)">
        <ul className="timeline">{c.events.map(e => <li key={e.id}><b>{label(e.type)}</b>
          {e.type === 'Revised' && <> {fmtDateTime(e.previousDueAt, c.timeZone)} → {fmtDateTime(e.newDueAt, c.timeZone)}</>}
          {e.type === 'Created' && <> deadline {fmtDateTime(e.newDueAt, c.timeZone)}</>}
          {e.completedAt && <> fulfilled {fmtDateTime(e.completedAt)}</>}{e.reason && <> — {e.reason}</>}{e.evidence && <> · evidence: {e.evidence}</>}
          {e.type === 'Revised' && e.causeCommitmentId && <> · caused by <Link to={`/commitments/${e.causeCommitmentId}`}>{e.causeRef ?? 'a dependency'}</Link></>}
          <div className="when">{fmtDateTime(e.at)} · {e.by ?? 'system'}</div></li>)}</ul>
      </Panel>
      <AttachmentsWorkspace recordType="Commitment" recordId={c.id} />
      <HistoryPanel entityType="Commitment" entityId={c.id} />
      {dialog === 'add-dependency' && <AddDependencyDialog c={c} onClose={close} />}
      {dialog === 'edit-dependency' && dep && <EditDependencyDialog c={c} d={dep} onClose={close} />}
      {dialog === 'remove-dependency' && dep && <ActionDialog title={`Remove dependency on ${dep.ref}`} danger path={`/commitments/${id}/dependencies/${dep.dependencyId}/remove`} version={c.version} onClose={close} submitLabel="Remove"
        intro="The forecast no longer takes this commitment into account. The removal and its reason stay in the history." fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} />}
      {dialog === 'revise' && <ActionDialog title="Revise deadline" path={`/commitments/${id}/revise`} version={c.version} onClose={close} submitLabel="Revise"
        intro={<>The original and every earlier deadline are kept.{suggestForecast && <> The dependencies forecast delivery on <b>{fmtDateTime(fc!.forecastAt!, c.timeZone)}</b>; that date is suggested below. The deadline never moves by itself.</>}</>}
        initial={{ dueLocal: suggestForecast ? localIn(fc!.forecastAt!, c.timeZone) : toLocalInput(c.currentDueAt).length ? c.currentDueLocal.slice(0, 16).replace(' ', 'T') : '', timeZone: c.timeZone,
          causeCommitmentId: suggestForecast && fc!.causeCommitmentId ? String(fc!.causeCommitmentId) : '' }}
        fields={[{ name: 'dueLocal', label: 'New deadline (local time)', kind: 'datetime', required: true }, { name: 'timeZone', label: 'Time zone', kind: 'timezone', required: true },
          ...(fc ? [{ name: 'causeCommitmentId', label: 'Cause', kind: 'select' as const, options: fc.dependencies.map(d => ({ value: String(d.commitmentId), label: `Dependency delay · ${d.ref}${d.party ? ` ${d.party}` : ''}` })), hint: 'Leave empty when no dependency caused this revision.' }] : []),
          { name: 'reason', label: 'Reason', kind: 'textarea', required: true }]}
        transform={x => ({ dueLocal: x.dueLocal, timeZone: x.timeZone, reason: x.reason, causeCommitmentId: x.causeCommitmentId ? Number(x.causeCommitmentId) : null })} />}
      {dialog === 'complete' && <ActionDialog title="Complete commitment" path={`/commitments/${id}/complete`} version={c.version} onClose={close} submitLabel="Complete"
        intro={<>Completed before or by the deadline counts as on time; after it stays Completed with a derived late result. The time cannot be in the future. This record was created {fmtDateTime(c.createdAt)}; if it was fulfilled before then, you can say why.
          {pending.length > 0 && <> <b>It depends on {pending.map(d => d.ref).join(', ')}, not yet delivered: give a reason to complete it anyway.</b></>}</>}
        initial={{ completedAt: toLocalInput(new Date().toISOString()) }}
        fields={[{ name: 'completedAt', label: 'Fulfilled at', kind: 'datetime', required: true }, { name: 'evidence', label: 'Evidence or reference (optional)', kind: 'textarea' },
          { name: 'reason', label: pending.length ? 'Reason (required while dependencies are not delivered)' : 'Reason, if fulfilled before this record was created (optional)', kind: 'textarea', required: pending.length > 0 }]}
        transform={v => ({ completedAt: fromLocalInput(v.completedAt), evidence: v.evidence, reason: v.reason || null })} />}
      {dialog === 'cancel' && <ActionDialog title="Cancel commitment" danger path={`/commitments/${id}/cancel`} version={c.version} onClose={close} submitLabel="Cancel commitment"
        intro={c.dependents.length ? `${c.dependents.length} commitment(s) wait for this one; they will show as Blocked until someone replans them.` : undefined}
        fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} />}
      {dialog === 'reopen' && <ActionDialog title="Reopen commitment" path={`/commitments/${id}/reopen`} version={c.version} onClose={close} submitLabel="Reopen" intro="Previous completion or cancellation events are kept." fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} />}
    </>)}</QueryState>
  );
}

type Reliability = { organizationId?: number | null; name: string; commitments: number; completed: number; onTime: number; late: number; onTimePercent?: number | null; averageDelayDays?: number | null; averageSlipFromOriginalDays?: number | null; revisions: number; openOverdue: number };

/** A114: how reliably each external party delivered its commitments to us. */
export function ExternalReliability() {
  const [f, set] = useUrlState({ from: '', to: '' });
  const q = useQuery({ queryKey: ['external-reliability', f], queryFn: () => get<{ items: Reliability[] }>(`/commitments/external-reliability${qs({ from: f.from ? `${f.from}T00:00:00Z` : '', to: f.to ? `${f.to}T00:00:00Z` : '' })}`) });
  return (
    <>
      <PageHead title="External reliability" crumbs={[{ to: '/commitments', label: 'Commitments' }, { label: 'External reliability' }]}
        sub="On-time delivery of each external party, from its External commitments in your scope. Cancelled commitments are left out." />
      <div className="toolbar">
        <TextInput label="Deadline from" type="date" value={f.from} onChange={v => set({ from: v })} />
        <TextInput label="Deadline before" type="date" value={f.to} onChange={v => set({ to: v })} />
      </div>
      <DataTable<Reliability> rowKey={r => String(r.organizationId ?? r.name)} rows={q.data?.items} loading={q.isLoading} error={q.error} empty="none" caption="External reliability"
        columns={[
          { key: 'n', header: 'External party', render: r => r.organizationId ? <Link to={`/commitments?direction=External&externalOrganizationId=${r.organizationId}&status=all`}>{r.name}</Link> : r.name },
          { key: 'c', header: 'Commitments', className: 'num', render: r => r.commitments },
          { key: 'd', header: 'Completed', className: 'num', render: r => r.completed },
          { key: 'p', header: 'On time', className: 'num', render: r => r.onTimePercent == null ? <span className="muted">—</span> : <Badge tone={r.onTimePercent >= 90 ? 'good' : r.onTimePercent >= 70 ? 'warn' : 'bad'}>{r.onTimePercent}%</Badge> },
          { key: 'l', header: 'Late', className: 'num', render: r => r.late },
          { key: 'a', header: 'Average delay when late', className: 'num', render: r => r.averageDelayDays == null ? '—' : `${r.averageDelayDays} d` },
          { key: 's', header: 'Average slip from first promise', className: 'num', render: r => r.averageSlipFromOriginalDays == null ? '—' : `${r.averageSlipFromOriginalDays} d` },
          { key: 'r', header: 'Deadline revisions', className: 'num', render: r => r.revisions },
          { key: 'o', header: 'Open and overdue', className: 'num', render: r => r.openOverdue ? <Badge tone="bad">{r.openOverdue}</Badge> : 0 }
        ]} />
    </>
  );
}

export { enumOptions };
