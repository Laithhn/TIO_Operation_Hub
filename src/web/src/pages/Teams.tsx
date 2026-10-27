import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { get, post, put, qs, type UserRef } from '../api';
import { fmtDateTime, fromLocalInput, inDays, label } from '../format';
import { usePermission, useForm, useLookup, useReference, useRefresh } from '../hooks';
import { ActionDialog, UserPicker } from '../ui/pickers';
import { Badge, Checkbox, ConfirmDelete, DataTable, Dialog, DL, Field, FormError, PageHead, Panel, Person, QueryState, SelectInput, StateMessage, StatusBadge, TextInput, useToast, When, DeleteAction } from '../ui/kit';
import { AttachmentsPanel } from './Attachments';
import { RecordLink } from './common';

type TeamRow = { id: number; code: string; name: string; description?: string; isActive: boolean; lead?: UserRef; manager?: UserRef; memberCount: number };

export function TeamList() {
  const q = useQuery({ queryKey: ['teams'], queryFn: () => get<TeamRow[]>('/teams') });
  const canManage = usePermission('Teams', 'Create');
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Teams and coverage" sub="Assignments, waiting work, due dates and backup coverage. Capacity and absence planning arrive in the Next release."
        actions={canManage && <button className="btn btn-primary" onClick={() => setOpen(true)}>+ New Team</button>} />
      <DataTable<TeamRow> rowKey={t => t.id} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 'c', header: 'Code', render: t => <Link to={`/teams/${t.id}`}>{t.code}</Link> }, { key: 'n', header: 'Team', render: t => <Link to={`/teams/${t.id}`}>{t.name}</Link> },
        { key: 'l', header: 'Lead', render: t => <Person u={t.lead} gap="No lead" /> }, { key: 'm', header: 'Manager', render: t => <Person u={t.manager} gap="—" /> },
        { key: 'k', header: 'Active members', className: 'num', render: t => t.memberCount }, { key: 'a', header: 'Status', render: t => t.isActive ? <Badge tone="good">Active</Badge> : <Badge>Inactive</Badge> }, { key: 'del', header: '', className: 'row-actions', render: t => <DeleteAction path={`/teams/${t.id}`} what={`team ${t.code}`} /> }
      ]} />
      {open && <TeamDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function TeamDialog({ onClose }: { onClose: () => void }) {
  const f = useForm({ code: '', name: '', leadUserId: null as number | null, managerUserId: null as number | null, description: '', isActive: true });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => { const ok = await f.submit(v => post('/teams', v).then(() => true)); if (ok) { toast('Team created.'); refresh(); onClose(); } };
  return (
    <Dialog title="New team" onClose={onClose}>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Code" required value={f.values.code} onChange={v => f.set('code', v.toUpperCase())} error={f.fieldError('code')} />
        <TextInput label="Name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} />
        <UserPicker label="Lead" value={f.values.leadUserId} onChange={v => f.set('leadUserId', v)} empty="None" />
        <UserPicker label="Manager" value={f.values.managerUserId} onChange={v => f.set('managerUserId', v)} empty="None" />
        <TextInput label="Description" wide value={f.values.description} onChange={v => f.set('description', v)} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Create team</button></div>
    </Dialog>
  );
}

type TeamDto = { id: number; code: string; name: string; lead?: UserRef; manager?: UserRef; leadUserId?: number; members: { id: number; userId: number; name: string; userActive: boolean; timeZone: string; teamRole?: string; skills?: string; productFamiliarity?: string; isActive: boolean; version: string }[] };
type Assign = {
  people: { userId: number; name: string; active: boolean; timeZone: string; teamRole?: string; openCases: number; waiting: number; overdue: number; backupFor: number; openCommitments: number }[];
  unassigned: { id: number; ref: string; title: string; priority: string; nextAction: string }[]; coverageGaps: { id: number; ref: string; title: string; priority: string }[]; note: string;
};

type Member = TeamDto['members'][number];

/** A53: add or edit a membership — role from the configured list, product familiarity from the configured products. */
function MemberDialog({ teamId, member, onClose }: { teamId: string; member?: Member; onClose: () => void }) {
  const roles = useLookup('TeamMemberRole', member?.teamRole);
  const products = (useReference().data?.products ?? []).filter(p => p.isActive);
  const codes = new Set(products.map(p => p.code.toLowerCase()));
  const had = (member?.productFamiliarity ?? '').split(',').map(x => x.trim()).filter(Boolean);
  const f = useForm({ userId: member ? String(member.userId) : '', teamRole: member?.teamRole ?? '', skills: member?.skills ?? '', isActive: member?.isActive ?? true,
    products: had });
  // The product list may still be loading when the dialog opens: keep the saved codes and match them once it is there.
  const known = (c: string) => codes.has(c.toLowerCase());
  const dropped = products.length ? f.values.products.filter(c => !known(c)) : [];
  const isOn = (code: string) => f.values.products.some(c => c.toLowerCase() === code.toLowerCase());
  const refresh = useRefresh();
  const toast = useToast();
  const toggle = (code: string) => f.set('products', isOn(code) ? f.values.products.filter(x => x.toLowerCase() !== code.toLowerCase()) : [...f.values.products, code]);
  const save = async () => {
    const body = { userId: Number(f.values.userId) || null, teamRole: f.values.teamRole || null, skills: f.values.skills, productFamiliarity: f.values.products.filter(known).join(', '), isActive: f.values.isActive };
    const ok = await f.submit(async () => { if (member) await put(`/teams/${teamId}/members/${member.id}`, body, member.version); else await post(`/teams/${teamId}/members`, body); return true; });
    if (ok) { toast(member ? 'Membership saved.' : 'Member added.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={member ? `Edit ${member.name}` : 'Add member'} onClose={onClose}>
      <FormError error={f.error} fields={['userId', 'teamRole', 'skills', 'productFamiliarity']} />
      <div className="form-grid">
        {member ? <Field label="Person">{() => <div className="field-static">{member.name}</div>}</Field>
          : <div className="wide"><UserPicker label="Person" required value={f.values.userId ? Number(f.values.userId) : null} onChange={v => f.set('userId', v ? String(v) : '')} error={f.fieldError('userId')} empty="— Select —" /></div>}
        <SelectInput label="Team role" value={f.values.teamRole} onChange={v => f.set('teamRole', v)} options={roles.map(r => ({ value: r.code, label: r.label }))}
          error={f.fieldError('teamRole')} hint="Roles are configured under Administration → Configuration → Team member roles." />
        <TextInput label="Skills" wide value={f.values.skills} onChange={v => f.set('skills', v)} error={f.fieldError('skills')} />
        <Field label="Product familiarity" wide error={f.fieldError('productFamiliarity')} hint={products.length === 0 ? 'No products are configured yet (Products).' : 'Select the products this person knows.'}>
          {(fid, desc) => <><div className="day-chips" role="group" aria-label="Product familiarity" id={fid} aria-describedby={desc}>
            {products.map(p => <button type="button" key={p.id} aria-pressed={isOn(p.code)} title={p.name} onClick={() => toggle(p.code)}>{p.code}</button>)}
          </div>
          {dropped.length > 0 && <div className="hint">Not configured products, removed when saved: {dropped.join(', ')}</div>}</>}
        </Field>
        {member && <Checkbox label="Active membership" checked={f.values.isActive} onChange={v => f.set('isActive', v)} />}
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{member ? 'Save' : 'Add member'}</button></div>
    </Dialog>
  );
}

export function TeamDetail() {
  const { id } = useParams();
  const t = useQuery({ queryKey: ['team', id], queryFn: () => get<TeamDto>(`/teams/${id}`) });
  const a = useQuery({ queryKey: ['assignments', id], queryFn: () => get<Assign>(`/teams/${id}/assignments`) });
  const canManage = usePermission('Teams', 'Coordinate');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  return (
    <QueryState q={t}>{t.data && (<>
      <PageHead title={t.data.name} crumbs={[{ to: '/teams', label: 'Teams' }, { label: t.data.code }]} sub={<>Lead <Person u={t.data.lead} gap="none" /> · Manager <Person u={t.data.manager} gap="none" /></>}
        actions={<>{canManage && <button className="btn" onClick={() => setOpen(true)}>+ Member</button>}<DeleteAction button path={`/teams/${t.data.id}`} what={`team ${t.data.code}`} afterTo={'/teams'} /></>} />
      <Panel title="Members (skills are not performance scores)" pad={false}>
        <DataTable rowKey={m => m.id} rows={t.data.members} columns={[
          { key: 'n', header: 'Person', render: m => <>{m.name}{!m.userActive && <> <Badge tone="bad">Deactivated</Badge></>}</> }, { key: 'r', header: 'Team role', render: m => m.teamRole },
          { key: 's', header: 'Skills', render: m => m.skills }, { key: 'p', header: 'Product familiarity', render: m => m.productFamiliarity }, { key: 'tz', header: 'Working time zone', render: m => m.timeZone },
          { key: 'a', header: 'Membership', render: m => m.isActive ? 'Active' : 'Inactive' },
          ...(canManage ? [{ key: 'x', header: '', className: 'nowrap', render: (m: Member) => <span className="row-actions">
            <button className="linkbtn" onClick={() => setEditing(m)} aria-label={`Edit ${m.name}`}>Edit</button>
            <button className="linkbtn danger-link" onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}>Remove</button>
          </span> }] : [])
        ]} />
      </Panel>
      {a.data && (<>
        <Panel title="Assignments and coverage" pad={false}>
          <DataTable rowKey={p => p.userId} rows={a.data.people} columns={[
            { key: 'n', header: 'Engineer', render: p => <Link to={`/cases?ownerId=${p.userId}`}>{p.name}</Link> }, { key: 'c', header: 'Open cases', className: 'num', render: p => p.openCases },
            { key: 'w', header: 'Waiting', className: 'num', render: p => p.waiting }, { key: 'o', header: 'Overdue items', className: 'num', render: p => p.overdue ? <Badge tone="bad">{p.overdue}</Badge> : 0 },
            { key: 'b', header: 'Backup for', className: 'num', render: p => p.backupFor }, { key: 'm', header: 'Open commitments', className: 'num', render: p => p.openCommitments }
          ]} />
          <p className="hint" style={{ padding: 10 }}>{a.data.note}</p>
        </Panel>
        <div className="cols">
          <Panel title={`Unassigned team cases (${a.data.unassigned.length})`}>{a.data.unassigned.length === 0 ? <StateMessage kind="none">No unassigned cases.</StateMessage> : <ul className="timeline">{a.data.unassigned.map(c => <li key={c.id}><Link to={`/cases/${c.id}`}>{c.ref}</Link> {c.title} <StatusBadge value={c.priority} /><div className="when">{c.nextAction}</div></li>)}</ul>}</Panel>
          <Panel title={`Coverage gaps (${a.data.coverageGaps.length})`}>{a.data.coverageGaps.length === 0 ? <StateMessage kind="none">No coverage gaps under the configured policy.</StateMessage> : <ul className="timeline">{a.data.coverageGaps.map(c => <li key={c.id}><Link to={`/cases/${c.id}`}>{c.ref}</Link> {c.title} <StatusBadge value={c.priority} /> — no active backup owner</li>)}</ul>}</Panel>
        </div>
        <AttachmentsPanel recordType="Team" recordId={Number(id)} />
      </>)}
      {open && <MemberDialog teamId={id!} onClose={() => setOpen(false)} />}
      {editing && <MemberDialog teamId={id!} member={editing} onClose={() => setEditing(null)} />}
      {removing && <ConfirmDelete path={`/teams/${id}/members/${removing.id}`} what={`${removing.name}'s membership`} onClose={() => setRemoving(null)} />}
    </>)}</QueryState>
  );
}

type HandoverRow = { id: number; ref: string; status: string; effectiveAt: string; summary: string; outgoing: UserRef; receiving: UserRef; itemCount: number; acknowledgedAt?: string; completedAt?: string };

export function HandoverList() {
  const [status, setStatus] = useState('');
  const q = useQuery({ queryKey: ['handovers', status], queryFn: () => get<HandoverRow[]>(`/handovers${qs({ status })}`) });
  const canLead = usePermission('Teams', 'Coordinate');
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Handovers" sub="Ownership transfers need the receiving owner's acknowledgment, or a TIO Manager exception with reason, follow-up owner and date. Prior ownership is kept."
        actions={canLead && <button className="btn btn-primary" onClick={() => setOpen(true)}>+ New Handover</button>} />
      <div className="toolbar"><SelectInput label="Status" value={status} onChange={setStatus} options={[{ value: 'pending', label: 'Awaiting acknowledgment' }]} empty="All" /></div>
      <DataTable<HandoverRow> rowKey={h => h.id} rows={q.data} loading={q.isLoading} error={q.error} empty={status ? 'nomatch' : 'none'} columns={[
        { key: 'r', header: 'Ref', render: h => <Link to={`/handovers/${h.id}`}>{h.ref}</Link> }, { key: 's', header: 'Status', render: h => <StatusBadge value={h.status} /> },
        { key: 'o', header: 'From', render: h => <Person u={h.outgoing} /> }, { key: 'to', header: 'To', render: h => <Person u={h.receiving} /> },
        { key: 'e', header: 'Effective', render: h => fmtDateTime(h.effectiveAt) }, { key: 'n', header: 'Records', className: 'num', render: h => h.itemCount }, { key: 'm', header: 'Summary', render: h => h.summary }
      ]} />
      {open && <HandoverDialog onClose={() => setOpen(false)} />}
    </>
  );
}

type Owned = Record<string, { recordType: string; id: number; label: string }[]>;

function HandoverDialog({ onClose }: { onClose: () => void }) {
  const f = useForm({ outgoingOwnerId: null as number | null, receivingOwnerId: null as number | null, effectiveAt: inDays(1), summary: '', outstandingActions: '', documentationNotes: '', items: [] as { recordType: string; recordId: number }[] });
  const owned = useQuery({ queryKey: ['owned', f.values.outgoingOwnerId], queryFn: () => get<Owned>(`/handovers/candidates?ownerId=${f.values.outgoingOwnerId}`), enabled: !!f.values.outgoingOwnerId });
  const toast = useToast();
  const refresh = useRefresh();
  const has = (t: string, id: number) => f.values.items.some(i => i.recordType === t && i.recordId === id);
  const toggle = (t: string, id: number, on: boolean) => f.set('items', on ? [...f.values.items, { recordType: t, recordId: id }] : f.values.items.filter(i => !(i.recordType === t && i.recordId === id)));
  const save = async () => { const ok = await f.submit(v => post('/handovers', { ...v, effectiveAt: fromLocalInput(v.effectiveAt) }).then(() => true)); if (ok) { toast('Handover created; awaiting acknowledgment.'); refresh(); onClose(); } };
  const groups = owned.data ? Object.entries(owned.data).filter(([, list]) => list.length > 0) : [];
  return (
    <Dialog title="New handover" onClose={onClose} wide>
      <FormError error={f.error} />
      <div className="form-grid">
        <UserPicker label="Outgoing owner (deactivated people are allowed)" includeInactive required value={f.values.outgoingOwnerId} onChange={v => { f.set('outgoingOwnerId', v); f.set('items', []); }} empty="— Select —" error={f.fieldError('outgoingOwnerId')} />
        <UserPicker label="Receiving owner" required value={f.values.receivingOwnerId} onChange={v => f.set('receivingOwnerId', v)} empty="— Select —" error={f.fieldError('receivingOwnerId')} />
        <TextInput label="Effective time" required type="datetime-local" value={f.values.effectiveAt} onChange={v => f.set('effectiveAt', v)} error={f.fieldError('effectiveAt')} />
        <TextInput label="Summary" required wide multiline value={f.values.summary} onChange={v => f.set('summary', v)} error={f.fieldError('summary')} />
        <TextInput label="Outstanding actions" wide multiline value={f.values.outstandingActions} onChange={v => f.set('outstandingActions', v)} />
        <TextInput label="Relevant documentation and backup cover" wide value={f.values.documentationNotes} onChange={v => f.set('documentationNotes', v)} />
        <fieldset className="wide" style={{ border: '1px solid var(--line)', padding: '8px 10px' }}><legend className="flabel req">Affected records owned by the outgoing owner</legend>
          {!f.values.outgoingOwnerId && <span className="muted">Select the outgoing owner first.</span>}
          {f.values.outgoingOwnerId && groups.length === 0 && <span className="muted">No records you can see are owned by this person.</span>}
          {groups.map(([g, list]) => <div key={g} style={{ marginBottom: 6 }}><div className="flabel">{label(g)}</div>{list.map(r => <label key={r.recordType + r.id} className="check" style={{ marginRight: 14 }}><input type="checkbox" checked={has(r.recordType, r.id)} onChange={e => toggle(r.recordType, r.id, e.target.checked)} /> {r.label}</label>)}</div>)}
          {f.fieldError('items') && <div className="err">{f.fieldError('items')}</div>}
          {Object.entries(f.error?.errors ?? {}).filter(([k]) => k.startsWith('items[')).map(([k, m]) => <div key={k} className="err">{m[0]}</div>)}
        </fieldset>
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Create handover</button></div>
    </Dialog>
  );
}

type HandoverDto = {
  id: number; ref: string; status: string; effectiveAt: string; summary: string; outstandingActions?: string; documentationNotes?: string; outgoing: UserRef; receiving: UserRef;
  acknowledgedAt?: string; acknowledgmentNote?: string; completedAt?: string; cancelReason?: string; exception?: { reason: string; approvedBy?: UserRef; followUpOwner?: UserRef; followUpDate?: string };
  items: { id: number; recordType: string; recordId: number; label?: string; restricted: boolean; previousOwnerId?: number; applied: boolean; notAppliedReason?: string }[];
  permissions: { canAcknowledge: boolean; canAuthorizeException: boolean; canCancel: boolean }; version: string;
};

export function HandoverDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['handover', id], queryFn: () => get<HandoverDto>(`/handovers/${id}`) });
  const [dialog, setDialog] = useState<string | null>(null);
  const h = q.data;
  return (
    <QueryState q={q}>{h && (<>
      <PageHead title={`${h.ref} · Handover`} crumbs={[{ to: '/handovers', label: 'Handovers' }, { label: h.ref }]} sub={<StatusBadge value={h.status} />}
        actions={<>
          {h.permissions.canAcknowledge && <button className="btn btn-primary" onClick={() => setDialog('ack')}>Acknowledge</button>}
          {h.permissions.canAuthorizeException && <button className="btn" onClick={() => setDialog('exception')}>Manager exception</button>}
          {h.permissions.canCancel && <button className="btn btn-danger" onClick={() => setDialog('cancel')}>Cancel</button>}
        </>} />
      <div className="cols">
        <Panel title="Transfer"><DL items={[['From', <Person u={h.outgoing} />], ['To', <Person u={h.receiving} />], ['Effective', <When v={h.effectiveAt} />], ['Summary', h.summary], ['Outstanding actions', h.outstandingActions], ['Documentation / cover', h.documentationNotes]]} /></Panel>
        <Panel title="Completion"><DL items={[['Acknowledged', h.acknowledgedAt ? <><When v={h.acknowledgedAt} /> {h.acknowledgmentNote}</> : <span className="muted">Not yet</span>],
          ['Manager exception', h.exception ? <>{h.exception.reason}<div className="hint">by {h.exception.approvedBy?.name} · follow-up {h.exception.followUpOwner?.name} by {h.exception.followUpDate}</div></> : 'None'],
          ['Completed', <When v={h.completedAt} />], ['Cancellation', h.cancelReason]]} /></Panel>
      </div>
      <Panel title="Affected records" pad={false}>
        <DataTable rowKey={i => i.id} rows={h.items} columns={[
          { key: 't', header: 'Type', render: i => label(i.recordType) }, { key: 'l', header: 'Record', render: i => i.restricted ? <span className="muted">Access restricted</span> : <RecordLink type={i.recordType} id={i.recordId}>{i.label}</RecordLink> },
          { key: 'a', header: 'Ownership applied', render: i => i.applied ? <Badge tone="good">Applied</Badge> : i.notAppliedReason ? <Badge tone="warn">{i.notAppliedReason}</Badge> : <span className="muted">On completion</span> }
        ]} />
      </Panel>
      {dialog === 'ack' && <ActionDialog title="Acknowledge handover" path={`/handovers/${id}/acknowledge`} version={h.version} onClose={() => setDialog(null)} submitLabel="Acknowledge and take ownership" fields={[{ name: 'note', label: 'Note', kind: 'textarea' }]} />}
      {dialog === 'exception' && <ActionDialog title="Complete without acknowledgment (Manager exception)" path={`/handovers/${id}/exception`} version={h.version} onClose={() => setDialog(null)} submitLabel="Authorize exception"
        fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }, { name: 'followUpOwnerId', label: 'Follow-up owner', kind: 'user', required: true }, { name: 'followUpDate', label: 'Follow-up date', kind: 'date', required: true }]}
        transform={v => ({ reason: v.reason, followUpOwnerId: Number(v.followUpOwnerId) || null, followUpDate: v.followUpDate || null })} />}
      {dialog === 'cancel' && <ActionDialog title="Cancel handover" danger path={`/handovers/${id}/cancel`} version={h.version} onClose={() => setDialog(null)} submitLabel="Cancel handover" fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} />}
    </>)}</QueryState>
  );
}

type QueueItem = { recordType: string; id: number; label: string; clientId?: number; ownerName: string; ownerId: number; reason: string };

export function ReassignmentQueue() {
  const q = useQuery({ queryKey: ['queue'], queryFn: () => get<QueueItem[]>('/reassignment-queue') });
  return (
    <>
      <PageHead title="Reassignment queue" sub="Active records whose owner is deactivated. Nothing is reassigned automatically; use a handover or reassign each record." actions={<Link className="btn" to="/handovers">Handovers</Link>} />
      <DataTable<QueueItem> rowKey={r => `${r.recordType}-${r.id}-${r.reason}`} rows={q.data} loading={q.isLoading} error={q.error} columns={[
        { key: 't', header: 'Type', render: r => label(r.recordType) }, { key: 'l', header: 'Record', render: r => <RecordLink type={r.recordType} id={r.id}>{r.label}</RecordLink> },
        { key: 'o', header: 'Deactivated owner', render: r => r.ownerName }, { key: 'r', header: 'Reason', render: r => r.reason }
      ]} />
    </>
  );
}
