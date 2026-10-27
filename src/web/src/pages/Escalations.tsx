import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get, post, put, qs, type Paged, type UserRef } from '../api';
import { fmtDateTime, fromLocalInput, inDays, label, toLocalInput } from '../format';
import { usePermission, useForm, useLeaveGuard, useMe, useReference, useRefresh, useUrlState } from '../hooks';
import { ActionDialog, UserPicker } from '../ui/pickers';
import { Badge, DataTable, DeleteAction, DL, FormError, FormSection, PageHead, Pager, Panel, Person, QueryState, SelectInput, StateMessage, StatusBadge, TextInput, useToast, When } from '../ui/kit';
import { ContactCard, ContactFields, contactFrom, contactOut, HistoryPanel, toNum, useClientOptions } from './common';
import { AttachmentsPanel } from './Attachments';

/** A41: escalation management. Channels (e-mail, formal letter, verbal, Jira…) are a configuration list. */
type Row = {
  id: number; ref: string; title: string; clientId: number; clientCode: string; direction: string; channel: string; channelReference?: string; priority: string; level: number; status: string;
  receivedAt: string; responseDueAt?: string; resolutionDueAt?: string; acknowledgedAt?: string; counterpartName?: string; counterpartOrganization?: string; owner?: UserRef;
  active: boolean; overdue: boolean; lastActivityAt?: string;
};

const STATUSES = ['Open', 'Acknowledged', 'InProgress', 'Resolved', 'Closed', 'Withdrawn'];
const PRIORITIES = ['Critical', 'High', 'Normal', 'Low'];
const LEVELS = [{ value: '1', label: 'Level 1' }, { value: '2', label: 'Level 2' }, { value: '3', label: 'Level 3' }];

/** Channel label, including retired channels still shown on older escalations. */
export function useChannels() {
  const all = useReference().data?.lookups.EscalationChannel ?? [];
  return { name: (code?: string | null) => all.find(c => c.code === code)?.label ?? code ?? '', active: all.filter(c => !c.isRetired) };
}

function LevelBadge({ level }: { level: number }) {
  return <Badge tone={level >= 3 ? 'bad' : level === 2 ? 'warn' : 'neutral'}>Level {level}</Badge>;
}

/** List of escalations; with a client (client page) it shows only that client's and its sub-clients'. */
export function EscalationTable({ clientId, caseId, compact }: { clientId?: number; caseId?: number; compact?: boolean }) {
  const me = useMe().data!;
  const [f, set] = useUrlState({ status: 'active', channel: '', priority: '', level: '', ownerId: '', overdue: '', clientId: '', q: '', sort: '-received', page: '1', pageSize: '25' });
  const params = { ...f, clientId: clientId ? String(clientId) : f.clientId, caseId: caseId ? String(caseId) : '', status: caseId ? 'all' : f.status };
  const q = useQuery({ queryKey: ['escalations', params], queryFn: () => get<Paged<Row>>(`/escalations${qs(params)}`) });
  const ch = useChannels();
  const clients = useClientOptions();
  const filtered = !!(f.channel || f.priority || f.level || f.ownerId || f.overdue || f.q || (!clientId && f.clientId));
  return (
    <>
      <div className="toolbar">
        {!clientId && <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v, page: '1' })} options={clients} empty="All authorized clients" />}
        <SelectInput label="Status" value={f.status} onChange={v => set({ status: v, page: '1' })} options={[{ value: 'active', label: 'Active (open, acknowledged, in progress)' }, { value: 'all', label: 'All' }, ...STATUSES.map(s => ({ value: s, label: label(s) }))]} empty={null} />
        <SelectInput label="Channel" value={f.channel} onChange={v => set({ channel: v, page: '1' })} options={ch.active.map(c => ({ value: c.code, label: c.label }))} empty="Any channel" />
        <SelectInput label="Level" value={f.level} onChange={v => set({ level: v, page: '1' })} options={LEVELS} empty="Any level" />
        <SelectInput label="Owner" value={f.ownerId} onChange={v => set({ ownerId: v, page: '1' })} options={[{ value: String(me.id), label: 'Me' }]} empty="Anyone" />
        <SelectInput label="Targets" value={f.overdue} onChange={v => set({ overdue: v, page: '1' })} options={[{ value: 'true', label: 'Overdue only' }]} empty="Any" />
        <TextInput label="Search" value={f.q} onChange={v => set({ q: v, page: '1' })} placeholder="Ref, title, channel reference or contact" />
      </div>
      <DataTable<Row> caption="Escalations" rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'} sort={f.sort} onSort={s => set({ sort: s })}
        columns={[
          { key: 'ref', header: 'Ref', sort: 'ref', render: r => <Link to={`/escalations/${r.id}`}>{r.ref}</Link> },
          { key: 't', header: 'Escalation', render: r => <><Link to={`/escalations/${r.id}`}>{r.title}</Link>{r.counterpartName && <div className="hint">{r.direction === 'Raised' ? 'To' : 'From'} {r.counterpartName}{r.counterpartOrganization ? ` · ${r.counterpartOrganization}` : ''}</div>}</> },
          ...(clientId || compact ? [] : [{ key: 'client', header: 'Client', sort: 'client', render: (r: Row) => <Link to={`/clients/${r.clientId}`}>{r.clientCode}</Link> }]),
          { key: 'channel', header: 'Channel', sort: 'channel', render: r => <><span className="chip">{ch.name(r.channel)}</span>{r.channelReference && <div className="hint mono">{r.channelReference}</div>}</> },
          { key: 'priority', header: 'Priority', sort: 'priority', render: r => <StatusBadge value={r.priority} /> },
          { key: 'level', header: 'Level', sort: 'level', render: r => <LevelBadge level={r.level} /> },
          { key: 'status', header: 'Status', sort: 'status', render: r => <><StatusBadge value={r.status} />{r.overdue && <> <Badge tone="bad">Overdue</Badge></>}</> },
          { key: 'received', header: 'Received', sort: 'received', render: r => fmtDateTime(r.receivedAt) },
          { key: 'due', header: 'Resolution target', sort: 'due', render: r => r.resolutionDueAt ? <span className={r.overdue ? 'err' : ''}>{fmtDateTime(r.resolutionDueAt)}</span> : <span className="muted">None</span> },
          { key: 'owner', header: 'Owner', sort: 'owner', render: r => <Person u={r.owner} /> },
          { key: 'del', header: '', className: 'row-actions', render: r => <DeleteAction path={`/escalations/${r.id}`} what={`escalation ${r.ref}`} /> }
        ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
    </>
  );
}

export function EscalationList() {
  const canEng = usePermission('OtherOperations', 'Create');
  return (
    <>
      <PageHead title="Escalations" sub="Client matters raised above normal handling, by e-mail, formal letter, verbally, through Jira or any other configured channel. Each has an accountable owner, a level and response and resolution targets."
        actions={canEng && <Link className="btn btn-primary" to="/escalations/new">+ New escalation</Link>} />
      <EscalationTable />
    </>
  );
}

type Dto = {
  id: number; ref: string; title: string; description?: string; direction: string; channel: string; channelReference?: string; priority: string; level: number; status: string;
  client: { id: number; code: string; name: string }; counterpart?: { name: string; title?: string; organization?: string; phone?: string; mobile?: string; email?: string }; owner?: UserRef;
  receivedAt: string; responseDueAt?: string; resolutionDueAt?: string; acknowledgedAt?: string; resolvedAt?: string; closedAt?: string; resolutionSummary?: string;
  active: boolean; overdue: boolean; responseOverdue: boolean;
  project?: { id: number; code: string; name: string }; contract?: { id: number; ref: string; title: string }; case?: { id: number; ref: string; title: string };
  events: { id: number; type: string; status?: string; channel?: string; outgoing?: boolean; level?: number; note?: string; at: string; by?: string }[];
  nextStatuses: string[]; permissions: { canEdit: boolean; canLog: boolean; canRaise: boolean; canChangeOwner: boolean }; version: string;
};

export function EscalationForm() {
  const { id } = useParams();
  const isNew = !id;
  const [sp] = useSearchParams();
  const me = useMe().data!;
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  const clients = useClientOptions();
  const ch = useChannels();
  const canLead = usePermission('OtherOperations', 'Coordinate');
  const existing = useQuery({ queryKey: ['escalation', id], queryFn: () => get<Dto>(`/escalations/${id}`), enabled: !isNew });
  const f = useForm({
    clientId: sp.get('clientId') ?? '', title: '', description: '', direction: 'Received', channel: '', channelReference: '', priority: 'High', level: '1',
    counterpart: contactFrom(null), receivedAt: toLocalInput(new Date().toISOString()), ownerUserId: me.id as number | null,
    responseDueAt: '', resolutionDueAt: inDays(5, 17), projectId: '', contractId: '', caseId: sp.get('caseId') ?? ''
  });
  const e = existing.data;
  useEffect(() => {
    if (!e) return;
    f.reset({
      clientId: String(e.client.id), title: e.title, description: e.description ?? '', direction: e.direction, channel: e.channel, channelReference: e.channelReference ?? '', priority: e.priority, level: String(e.level),
      counterpart: contactFrom(e.counterpart), receivedAt: toLocalInput(e.receivedAt), ownerUserId: e.owner?.id ?? null, responseDueAt: toLocalInput(e.responseDueAt), resolutionDueAt: toLocalInput(e.resolutionDueAt),
      projectId: e.project ? String(e.project.id) : '', contractId: e.contract ? String(e.contract.id) : '', caseId: e.case ? String(e.case.id) : ''
    });
  }, [e]); // eslint-disable-line react-hooks/exhaustive-deps
  useLeaveGuard(f.dirty && !f.busy);
  const v = f.values;
  const cid = v.clientId;
  const projects = useQuery({ queryKey: ['projects-of', cid], queryFn: () => get<Paged<{ id: number; code: string; name: string }>>(`/projects?clientId=${cid}&pageSize=100`), enabled: !!cid });
  const contracts = useQuery({ queryKey: ['contracts-of', cid], queryFn: () => get<Paged<{ id: number; ref: string; title: string; clientId: number }>>(`/contracts?clientId=${cid}&pageSize=100`), enabled: !!cid });
  const cases = useQuery({ queryKey: ['cases-of', cid], queryFn: () => get<Paged<{ id: number; ref: string; title: string }>>(`/cases?clientId=${cid}&status=all&pageSize=100`), enabled: !!cid });
  const save = async () => {
    const body = {
      clientId: toNum(v.clientId), title: v.title, description: v.description || null, direction: v.direction, channel: v.channel || null, channelReference: v.channelReference || null,
      priority: v.priority, level: Number(v.level), counterpart: contactOut(v.counterpart), receivedAt: fromLocalInput(v.receivedAt), ownerUserId: v.ownerUserId,
      responseDueAt: fromLocalInput(v.responseDueAt), resolutionDueAt: fromLocalInput(v.resolutionDueAt), projectId: toNum(v.projectId), contractId: toNum(v.contractId), caseId: toNum(v.caseId)
    };
    const r = await f.submit(async () => isNew ? (await post<{ id: number }>('/escalations', body)).id : (await put(`/escalations/${id}`, body, e!.version), Number(id)));
    if (r) { toast(isNew ? 'Escalation recorded.' : 'Escalation saved.'); refresh(); nav(`/escalations/${r}`); }
  };
  const ownerEditable = isNew ? canLead : !!e?.permissions.canChangeOwner;
  const channelOpts = [...ch.active.map(c => ({ value: c.code, label: c.label })), ...(v.channel && !ch.active.some(c => c.code === v.channel) ? [{ value: v.channel, label: `${ch.name(v.channel)} (retired)` }] : [])];
  return (
    <QueryState q={isNew ? { isLoading: false, error: null, data: true } as never : existing}>
      <PageHead title={isNew ? 'New escalation' : `Edit ${e?.ref ?? ''}`} crumbs={[{ to: '/escalations', label: 'Escalations' }, ...(e ? [{ to: `/escalations/${e.id}`, label: e.ref }] : [])]} />
      <Panel>
        <FormError error={f.error} />
        <FormSection title="Escalation">
          <SelectInput label="Client" required value={v.clientId} onChange={x => { f.set('clientId', x); f.set('projectId', ''); f.set('contractId', ''); f.set('caseId', ''); }} options={clients} error={f.fieldError('clientId')} disabled={!isNew} />
          <SelectInput label="Direction" required value={v.direction} onChange={x => f.set('direction', x)} options={[{ value: 'Received', label: 'Received from the client' }, { value: 'Raised', label: 'Raised by TIO' }]} empty={null} />
          <TextInput label="Title" required wide value={v.title} onChange={x => f.set('title', x)} error={f.fieldError('title')} maxLength={200} />
          <TextInput label="Description" wide multiline value={v.description} onChange={x => f.set('description', x)} error={f.fieldError('description')} maxLength={4000} />
          <SelectInput label="Channel" required value={v.channel} onChange={x => f.set('channel', x)} options={channelOpts} error={f.fieldError('channel')} hint="Channels are configured under Administration → Configuration → Escalation channels." />
          <TextInput label="Channel reference" value={v.channelReference} onChange={x => f.set('channelReference', x)} error={f.fieldError('channelReference')} maxLength={300} placeholder="Letter number, e-mail subject, Jira key…" />
          <SelectInput label="Priority" required value={v.priority} onChange={x => f.set('priority', x)} options={PRIORITIES.map(p => ({ value: p, label: p }))} empty={null} />
          {isNew ? <SelectInput label="Level" required value={v.level} onChange={x => f.set('level', x)} options={LEVELS} empty={null} error={f.fieldError('level')} hint="Raise it later from the escalation page." />
            : <TextInput label="Level" value={`Level ${e?.level ?? ''}`} onChange={() => {}} disabled hint="Use “Raise level” on the escalation page." />}
          <TextInput label="Received / raised at" required type="datetime-local" value={v.receivedAt} onChange={x => f.set('receivedAt', x)} error={f.fieldError('receivedAt')} />
        </FormSection>
        <FormSection title={v.direction === 'Raised' ? 'Escalated to' : 'Escalated by'}>
          <ContactFields value={v.counterpart} onChange={c => f.set('counterpart', c)} prefix="counterpart" fieldError={f.fieldError} nameLabel="Full name" />
        </FormSection>
        <FormSection title="Ownership and targets">
          {ownerEditable ? <UserPicker label="Accountable owner" required value={v.ownerUserId} onChange={x => f.set('ownerUserId', x)} clientId={toNum(v.clientId)} error={f.fieldError('ownerUserId')} empty="— Select —" />
            : <TextInput label="Accountable owner" value={isNew ? `${me.displayName} (you)` : e?.owner?.name ?? ''} onChange={() => {}} disabled hint="Only the TIO Manager assigns someone else." />}
          <TextInput label="Respond by" type="datetime-local" value={v.responseDueAt} onChange={x => f.set('responseDueAt', x)} error={f.fieldError('responseDueAt')} hint="Optional. Overdue until the first reply or status change." />
          <TextInput label="Resolve by" type="datetime-local" value={v.resolutionDueAt} onChange={x => f.set('resolutionDueAt', x)} error={f.fieldError('resolutionDueAt')} hint="Optional." />
        </FormSection>
        <FormSection title="Related records (optional)">
          <SelectInput label="Project" value={v.projectId} onChange={x => f.set('projectId', x)} options={(projects.data?.items ?? []).map(p => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))} empty="None" error={f.fieldError('projectId')} />
          <SelectInput label="Contract" value={v.contractId} onChange={x => f.set('contractId', x)} options={(contracts.data?.items ?? []).filter(c => String(c.clientId) === v.clientId).map(c => ({ value: String(c.id), label: `${c.ref} · ${c.title}` }))} empty="None" error={f.fieldError('contractId')} />
          <SelectInput label="Case" value={v.caseId} onChange={x => f.set('caseId', x)} options={(cases.data?.items ?? []).map(c => ({ value: String(c.id), label: `${c.ref} · ${c.title}` }))} empty="None" error={f.fieldError('caseId')} />
        </FormSection>
        <div className="form-actions"><button className="btn" onClick={() => nav(-1)}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{isNew ? 'Record escalation' : 'Save escalation'}</button></div>
      </Panel>
    </QueryState>
  );
}

const EVENT_LABEL: Record<string, string> = { Created: 'Escalation recorded', Communication: 'Communication', StatusChange: 'Status changed', LevelRaised: 'Level raised', OwnerChange: 'Owner changed' };

export function EscalationDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['escalation', id], queryFn: () => get<Dto>(`/escalations/${id}`) });
  const ch = useChannels();
  const [dialog, setDialog] = useState<string | null>(null);
  const e = q.data;
  const close = () => setDialog(null);
  const channelOpts = ch.active.map(c => ({ value: c.code, label: c.label }));
  return (
    <QueryState q={q}>{e && (<>
      <PageHead title={`${e.ref} · ${e.title}`} crumbs={[{ to: '/escalations', label: 'Escalations' }, { to: `/clients/${e.client.id}`, label: e.client.code }, { label: e.ref }]}
        sub={<><StatusBadge value={e.status} /> <LevelBadge level={e.level} /> <StatusBadge value={e.priority} /> · {e.direction === 'Raised' ? 'Raised by TIO' : 'Received'} via <b>{ch.name(e.channel)}</b>
          {e.overdue && <> <Badge tone="bad">{e.responseOverdue ? 'Response overdue' : 'Resolution overdue'}</Badge></>}</>}
        actions={<>
          {e.permissions.canLog && <button className="btn btn-primary" onClick={() => setDialog('log')}>+ Log communication</button>}
          {e.nextStatuses.length > 0 && <button className="btn" onClick={() => setDialog('status')}>Change status</button>}
          {e.permissions.canRaise && <button className="btn" onClick={() => setDialog('raise')}>Raise level</button>}
          {e.permissions.canEdit && <Link className="btn" to={`/escalations/${e.id}/edit`}>Edit</Link>}
          <DeleteAction button path={`/escalations/${e.id}`} what={`escalation ${e.ref}`} afterTo="/escalations" />
        </>} />
      <div className="cols">
        <Panel title="Escalation">
          <DL items={([
            ['Client', <Link to={`/clients/${e.client.id}`}>{e.client.code} · {e.client.name}</Link>], ['Channel', <>{ch.name(e.channel)}{e.channelReference && <> · <span className="mono">{e.channelReference}</span></>}</>],
            ['Description', e.description ? <span style={{ whiteSpace: 'pre-wrap' }}>{e.description}</span> : null], ['Owner', <Person u={e.owner} />],
            ['Received / raised', fmtDateTime(e.receivedAt)], ['Acknowledged', e.acknowledgedAt ? <When v={e.acknowledgedAt} /> : <span className="muted">Not yet</span>],
            ['Respond by', e.responseDueAt ? <span className={e.responseOverdue ? 'err' : ''}>{fmtDateTime(e.responseDueAt)}</span> : null],
            ['Resolve by', e.resolutionDueAt ? <span className={e.overdue && !e.responseOverdue ? 'err' : ''}>{fmtDateTime(e.resolutionDueAt)}</span> : null],
            ['Resolved', e.resolvedAt ? <When v={e.resolvedAt} /> : null], ['Resolution', e.resolutionSummary], ['Closed', e.closedAt ? <When v={e.closedAt} /> : null],
            ['Project', e.project ? <Link to={`/projects/${e.project.id}`}>{e.project.code} · {e.project.name}</Link> : null],
            ['Contract', e.contract ? <Link to={`/contracts/${e.contract.id}`}>{e.contract.ref} · {e.contract.title}</Link> : null],
            ['Case', e.case ? <Link to={`/cases/${e.case.id}`}>{e.case.ref} · {e.case.title}</Link> : null]
          ] as [string, React.ReactNode][]).filter(([, v]) => v !== null && v !== undefined && v !== '')} />
        </Panel>
        <Panel title={e.direction === 'Raised' ? 'Escalated to' : 'Escalated by'}>
          {e.counterpart ? <ContactCard c={e.counterpart} /> : <StateMessage kind="none">No contact recorded.</StateMessage>}
        </Panel>
      </div>
      <Panel title="Timeline">
        <ul className="timeline">{[...e.events].reverse().map(x => (
          <li key={x.id}>
            <b>{EVENT_LABEL[x.type] ?? label(x.type)}</b>
            {x.type === 'Communication' && <> · {x.outgoing ? 'sent' : 'received'} by <span className="chip">{ch.name(x.channel)}</span></>}
            {x.type === 'Created' && x.channel && <> · via <span className="chip">{ch.name(x.channel)}</span></>}
            {x.type === 'StatusChange' && x.status && <> → <StatusBadge value={x.status} /></>}
            {x.type === 'LevelRaised' && x.level && <> → <LevelBadge level={x.level} /></>}
            {x.note && x.type !== 'Created' && <div style={{ whiteSpace: 'pre-wrap' }}>{x.note}</div>}
            <div className="when">{fmtDateTime(x.at)} · {x.by ?? 'system'}</div>
          </li>))}
        </ul>
      </Panel>
      <AttachmentsPanel recordType="Escalation" recordId={e.id} title="Letters, e-mails and other files" />
      <HistoryPanel entityType="Escalation" entityId={e.id} />
      {dialog === 'log' && <ActionDialog title="Log communication" path={`/escalations/${id}/communications`} onClose={close} submitLabel="Log"
        intro="Record what was sent or received and through which channel. A reply to an open escalation acknowledges it. The hub does not send anything."
        initial={{ channel: e.channel, outgoing: 'true', at: toLocalInput(new Date().toISOString()) }}
        fields={[{ name: 'channel', label: 'Channel', kind: 'select', required: true, options: channelOpts },
          { name: 'outgoing', label: 'Direction', kind: 'select', required: true, options: [{ value: 'true', label: 'Sent by TIO' }, { value: 'false', label: 'Received from the client' }] },
          { name: 'at', label: 'When', kind: 'datetime', required: true }, { name: 'note', label: 'What was said or sent', kind: 'textarea', required: true }]}
        transform={v => ({ channel: v.channel, outgoing: v.outgoing === 'true', at: fromLocalInput(v.at), note: v.note })} />}
      {dialog === 'status' && <ActionDialog title="Change status" path={`/escalations/${id}/status`} onClose={close} submitLabel="Change status"
        intro="Resolving needs the resolution; withdrawing or reopening needs a reason."
        initial={{ status: e.nextStatuses[0] }}
        fields={[{ name: 'status', label: 'New status', kind: 'select', required: true, options: e.nextStatuses.map(s => ({ value: s, label: label(s) })) },
          { name: 'resolutionSummary', label: 'Resolution (when resolving)', kind: 'textarea' }, { name: 'note', label: 'Note or reason', kind: 'textarea' }]}
        transform={v => ({ status: v.status, note: v.note || null, resolutionSummary: v.resolutionSummary || null })} />}
      {dialog === 'raise' && <ActionDialog title={`Raise to level ${e.level + 1}`} path={`/escalations/${id}/raise-level`} onClose={close} submitLabel="Raise level"
        fields={[{ name: 'note', label: 'Reason', kind: 'textarea', required: true }]} />}
    </>)}</QueryState>
  );
}
