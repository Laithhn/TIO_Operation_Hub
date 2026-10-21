import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post, qs, type Paged } from '../api';
import { fmtDateTime, fromLocalInput, label } from '../format';
import { useCan, useForm, useMe, useReference, useRefresh } from '../hooks';
import { ActionDialog } from '../ui/pickers';
import { DataTable, Dialog, FormError, Panel, SelectInput, StateMessage, TextInput, useToast, type Option } from '../ui/kit';
import { Icon } from '../ui/Icon';

export type ClientLite = { id: number; code: string; name: string };

export function useClients() {
  return useQuery({ queryKey: ['clients-lite'], queryFn: () => get<Paged<ClientLite>>('/clients?pageSize=200&sort=code'), staleTime: 60_000 });
}

export function useClientOptions(): Option[] {
  return (useClients().data?.items ?? []).map(c => ({ value: String(c.id), label: `${c.code} · ${c.name}` }));
}

export function useTeamOptions(): Option[] {
  return (useReference().data?.teams ?? []).filter(t => t.isActive).map(t => ({ value: String(t.id), label: t.name }));
}

export function useProductOptions(): Option[] {
  return (useReference().data?.products ?? []).map(p => ({ value: String(p.id), label: p.code }));
}

export const toNum = (v: string) => (v ? Number(v) : null);

/** Meaningful review (OPS-03): reviewer, time, scope checked and verification note. Viewing or unrelated edits never count. */
export function ReviewPanel({ recordType, recordId, scopes, canReview, nextRequired }: { recordType: string; recordId: number; scopes: string[]; canReview: boolean; nextRequired?: boolean }) {
  const q = useQuery({ queryKey: ['reviews', recordType, recordId], queryFn: () => get<{ id: number; scope: string; note: string; evidence?: string; reviewedAt: string; nextReviewAt?: string; reviewer?: string }[]>(`/reviews${qs({ recordType, recordId })}`) });
  const [open, setOpen] = useState(false);
  return (
    <Panel title="Meaningful reviews" actions={canReview && <button className="btn" onClick={() => setOpen(true)}>Record review</button>}>
      <p className="hint" style={{ marginBottom: 8 }}>Each review records the scope checked. A condition report is not an inventory review; unknown values stay unknown after review.</p>
      {q.data?.length === 0 && <StateMessage kind="none">No reviews recorded yet.</StateMessage>}
      <ul className="timeline">
        {q.data?.map(r => <li key={r.id}><b>{label(r.scope)}</b> — {r.note}{r.evidence && <> · evidence: {r.evidence}</>}<div className="when">{fmtDateTime(r.reviewedAt)} · {r.reviewer}{r.nextReviewAt && ` · next ${fmtDateTime(r.nextReviewAt)}`}</div></li>)}
      </ul>
      {open && <ActionDialog title="Record meaningful review" path="/reviews" onClose={() => setOpen(false)}
        fields={[
          { name: 'scope', label: 'Scope checked', kind: 'select', required: true, options: scopes.map(s => ({ value: s, label: label(s) })) },
          { name: 'note', label: 'Verification note', kind: 'textarea', required: true },
          { name: 'evidence', label: 'Evidence or reference' },
          { name: 'nextReviewAt', label: 'Next review', kind: 'datetime', required: nextRequired }
        ]}
        transform={v => ({ recordType, recordId, scope: v.scope, note: v.note, evidence: v.evidence || null, nextReviewAt: v.nextReviewAt ? fromLocalInput(v.nextReviewAt) : null })}
        submitLabel="Record review" />}
    </Panel>
  );
}

type Doc = { id: number; kind: string; title: string; reference: string; reviewDate?: string; owner?: { name: string }; note: string };

/** Approved document links and vault references (never secrets). A link does not prove the target exists or is accessible. */
export function DocumentsPanel({ recordType, recordId, canEdit }: { recordType: string; recordId: number; canEdit: boolean }) {
  const q = useQuery({ queryKey: ['docs', recordType, recordId], queryFn: () => get<Doc[]>(`/documents${qs({ recordType, recordId })}`) });
  const [open, setOpen] = useState(false);
  return (
    <Panel title="Document references" actions={canEdit && <button className="btn" onClick={() => setOpen(true)}>Add reference</button>}>
      {q.data?.length === 0 && <StateMessage kind="none" />}
      <ul className="timeline">
        {q.data?.map(d => <li key={d.id}><b>{d.title}</b> <span className="chip">{d.kind === 'Link' ? 'Link' : 'Vault reference'}</span><br />
          {d.kind === 'Link' ? <a href={d.reference} target="_blank" rel="noopener noreferrer">{d.reference}</a> : <span className="mono">{d.reference}</span>}
          <div className="when">{d.owner?.name}{d.reviewDate && ` · review ${d.reviewDate}`} · reference only</div></li>)}
      </ul>
      {open && <DocDialog recordType={recordType} recordId={recordId} onClose={() => setOpen(false)} />}
    </Panel>
  );
}

function DocDialog({ recordType, recordId, onClose }: { recordType: string; recordId: number; onClose: () => void }) {
  const f = useForm({ kind: 'Link', title: '', reference: '', reviewDate: '' });
  const refresh = useRefresh();
  const toast = useToast();
  const save = async () => {
    const ok = await f.submit(v => post('/documents', { recordType, recordId, kind: v.kind, title: v.title, reference: v.reference, reviewDate: v.reviewDate || null }));
    if (ok !== undefined) { toast('Reference added.'); refresh(); onClose(); }
  };
  return (
    <Dialog title="Add document reference" onClose={onClose}>
      <FormError error={f.error} />
      <div className="form-grid">
        <SelectInput label="Kind" value={f.values.kind} onChange={v => f.set('kind', v)} options={[{ value: 'Link', label: 'Approved HTTPS link' }, { value: 'VaultReference', label: 'Vault reference' }]} empty={null} />
        <TextInput label="Title" required value={f.values.title} onChange={v => f.set('title', v)} error={f.fieldError('title')} />
        <TextInput label={f.values.kind === 'Link' ? 'HTTPS link' : 'Vault reference'} required wide value={f.values.reference} onChange={v => f.set('reference', v)} error={f.fieldError('reference')}
          hint={f.values.kind === 'Link' ? 'Only approved hosts. Never include user names, passwords or tokens.' : 'The vault path only (for example vault://…). Never the secret.'} />
        <TextInput label="Review date" type="date" value={f.values.reviewDate} onChange={v => f.set('reviewDate', v)} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save</button></div>
    </Dialog>
  );
}

/** Field-change history for one record (Audit grant). */
export function HistoryPanel({ entityType, entityId }: { entityType: string; entityId: number }) {
  const me = useMe().data;
  const allowed = !!me?.grants.audit;
  const q = useQuery({ queryKey: ['audit', entityType, entityId], queryFn: () => get<Paged<{ id: number; at: string; userName: string; action: string; reason?: string; changes?: string }>>(`/admin/audit${qs({ entityType, entityId, pageSize: 50 })}`), enabled: allowed });
  if (!allowed) return <Panel title="Change history"><StateMessage kind="restricted">Change history needs the Audit permission.</StateMessage></Panel>;
  return (
    <Panel title="Change history" pad={false}>
      <DataTable rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} columns={[
        { key: 'at', header: 'When', render: r => fmtDateTime(r.at) },
        { key: 'who', header: 'By', render: r => r.userName },
        { key: 'a', header: 'Action', render: r => r.action },
        { key: 'r', header: 'Reason', render: r => r.reason },
        { key: 'c', header: 'Changes (before → after)', render: r => <Changes json={r.changes} /> }
      ]} />
    </Panel>
  );
}

export function Changes({ json }: { json?: string | null }) {
  if (!json) return null;
  let d: Record<string, [unknown, unknown]> = {};
  try { d = JSON.parse(json); } catch { return <span className="mono">{json}</span>; }
  return <span style={{ fontSize: 11.5 }}>{Object.entries(d).map(([k, v]) => <div key={k}><b>{k}</b>: {String(v?.[0] ?? '∅')} → {String(v?.[1] ?? '∅')}</div>)}</span>;
}

export function CanEdit({ children }: { children: React.ReactNode }) {
  return useCan('Engineer') ? <>{children}</> : null;
}

export function RecordLink({ type, id, children }: { type: string; id: number; children: React.ReactNode }) {
  const map: Record<string, string> = { Client: 'clients', Region: 'regions', Project: 'projects', Environment: 'environments', Installation: 'installations', Asset: 'assets', Component: 'components', Case: 'cases', Commitment: 'commitments', Contract: 'contracts', Handover: 'handovers', Endpoint: 'network/endpoints' };
  return map[type] ? <Link to={`/${map[type]}/${id}`}>{children}</Link> : <>{children}</>;
}

/** A36: a person outside the system users, with segregated contact details. */
export type Contact = { name: string; title: string; organization: string; phone: string; mobile: string; email: string };
export const emptyContact: Contact = { name: '', title: '', organization: '', phone: '', mobile: '', email: '' };
export const contactFrom = (c?: Partial<Record<keyof Contact, string | null | undefined>> | null): Contact =>
  ({ name: c?.name ?? '', title: c?.title ?? '', organization: c?.organization ?? '', phone: c?.phone ?? '', mobile: c?.mobile ?? '', email: c?.email ?? '' });
export const contactOut = (c: Contact) => (c.name.trim() || c.phone || c.mobile || c.email ? Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.trim() || null])) : null);

export function ContactFields({ value, onChange, prefix, fieldError, nameLabel = 'Name', required, noOrganization }: {
  value: Contact; onChange: (c: Contact) => void; prefix: string; fieldError: (k: string) => string | undefined; nameLabel?: string; required?: boolean; noOrganization?: boolean;
}) {
  const set = (k: keyof Contact) => (v: string) => onChange({ ...value, [k]: v });
  const err = (k: string) => fieldError(`${prefix}${k}`);
  return (
    <>
      <TextInput label={nameLabel} required={required} value={value.name} onChange={set('name')} error={err('Name')} maxLength={150} />
      <TextInput label="Job title" value={value.title} onChange={set('title')} error={err('Title')} maxLength={150} />
      {!noOrganization && <TextInput label="Organization" value={value.organization} onChange={set('organization')} error={err('Organization')} maxLength={200} />}
      <TextInput label="Email" type="email" value={value.email} onChange={set('email')} error={err('Email')} maxLength={254} placeholder="name@example.org" />
      <TextInput label="Phone" type="tel" value={value.phone} onChange={set('phone')} error={err('Phone')} maxLength={50} placeholder="+971 4 000 0000" />
      <TextInput label="Mobile" type="tel" value={value.mobile} onChange={set('mobile')} error={err('Mobile')} maxLength={50} />
    </>
  );
}

export function ContactCard({ c, notes }: { c: Partial<Record<keyof Contact, string | null | undefined>>; notes?: string | null }) {
  return (
    <div className="contact-card">
      <div className="contact-name"><Icon name="user" /> <b>{c.name}</b>{c.title && <span className="muted"> · {c.title}</span>}</div>
      {c.organization && <div className="hint">{c.organization}</div>}
      <div className="contact-lines">
        {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
        {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>☎ {c.phone}</a>}
        {c.mobile && <a href={`tel:${c.mobile.replace(/[^\d+]/g, '')}`}>📱 {c.mobile}</a>}
      </div>
      {notes && <div className="hint">{notes}</div>}
    </div>
  );
}
