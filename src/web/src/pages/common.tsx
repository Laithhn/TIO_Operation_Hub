import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { get, qs, type Paged } from '../api';
import { fmtDateTime } from '../format';
import { useMe, useReference } from '../hooks';
import { DataTable, Panel, StateMessage, TextInput, type Option } from '../ui/kit';
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
