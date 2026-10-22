import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError, get, post, put, qs } from '../api';
import { useForm, useRefresh } from '../hooks';
import { Dialog, FormError, SelectInput, TextInput, useToast, type Option } from './kit';

type Assignable = { id: number; name: string; account: string };

/** Owner/assignee picker: only active people with a business role who can access the record's scope (server-filtered and re-checked). */
export function UserPicker({ label, value, onChange, clientId, teamId, required, error, hint, empty = 'Unassigned', includeInactive }: {
  label: ReactNode; value: number | null | undefined; onChange: (v: number | null) => void; clientId?: number | null; teamId?: number | null; includeInactive?: boolean;
  required?: boolean; error?: string; hint?: ReactNode; empty?: string;
}) {
  const q = useQuery({ queryKey: ['assignable', clientId ?? null, teamId ?? null, !!includeInactive], queryFn: () => get<Assignable[]>(`/users/assignable${qs({ clientId, teamId, includeInactive })}`), staleTime: 60_000 });
  const opts: Option[] = (q.data ?? []).map(u => ({ value: String(u.id), label: u.name }));
  if (value && !opts.some(o => o.value === String(value))) opts.unshift({ value: String(value), label: `Current owner (#${value}) — not assignable in this scope` });
  return <SelectInput label={label} value={value ?? ''} onChange={v => onChange(v ? Number(v) : null)} options={opts} required={required} error={error} hint={hint} empty={empty} />;
}

export type ActionField = { name: string; label: string; kind?: 'text' | 'textarea' | 'datetime' | 'date' | 'select' | 'user' | 'timezone' | 'checkbox'; required?: boolean; options?: Option[]; hint?: string; clientId?: number | null; teamId?: number | null };

/**
 * Confirmation dialog for business actions that need a reason or evidence (archive, close, cancel, reopen, revise…).
 * Explicit confirmation is required (UX-03); server errors appear beside the fields and entries are kept.
 */
export function ActionDialog({ title, intro, fields, submitLabel, danger, path, version, transform, onClose, onDone, initial, method = 'POST' }: {
  title: string; intro?: ReactNode; fields: ActionField[]; submitLabel: string; danger?: boolean; path: string; version?: string; initial?: Record<string, string>; method?: 'POST' | 'PUT';
  transform?: (v: Record<string, string>) => unknown; onClose: () => void; onDone?: () => void;
}) {
  const init = Object.fromEntries(fields.map(f => [f.name, initial?.[f.name] ?? ''])) as Record<string, string>;
  const f = useForm(init);
  const toast = useToast();
  const refresh = useRefresh();
  const [confirmed, setConfirmed] = useState(false);
  const run = async () => {
    const ok = await f.submit(async v => { const body = transform ? transform(v) : v; if (method === 'PUT') await put(path, body, version); else await post(path, body, version); return true; });
    if (ok) { toast(`${title}: done.`); await refresh(); onDone?.(); onClose(); }
  };
  return (
    <Dialog title={title} onClose={onClose}>
      {intro && <div className="notice">{intro}</div>}
      <FormError error={f.error} fields={fields.map(x => x.name)} />
      <div className="form-grid">
        {fields.map(fd => {
          const common = { label: fd.label, required: fd.required, error: f.fieldError(fd.name), hint: fd.hint };
          if (fd.kind === 'select') return <SelectInput key={fd.name} {...common} value={f.values[fd.name]} onChange={v => f.set(fd.name, v)} options={fd.options ?? []} wide />;
          if (fd.kind === 'timezone') return <TimeZoneSelect key={fd.name} {...common} wide value={f.values[fd.name]} onChange={v => f.set(fd.name, v)} />;
          if (fd.kind === 'checkbox') return <div className="wide" key={fd.name}><label className="check"><input type="checkbox" checked={f.values[fd.name] === 'true'} onChange={e => f.set(fd.name, e.target.checked ? 'true' : '')} /> {fd.label}</label>{fd.hint && <div className="hint">{fd.hint}</div>}</div>;
          if (fd.kind === 'user') return <div className="wide" key={fd.name}><UserPicker {...common} value={f.values[fd.name] ? Number(f.values[fd.name]) : null} onChange={v => f.set(fd.name, v ? String(v) : '')} clientId={fd.clientId} teamId={fd.teamId} empty="— Select —" /></div>;
          return <TextInput key={fd.name} {...common} wide value={f.values[fd.name]} onChange={v => f.set(fd.name, v)}
            multiline={fd.kind === 'textarea'} type={fd.kind === 'datetime' ? 'datetime-local' : fd.kind === 'date' ? 'date' : 'text'} />;
        })}
      </div>
      <label className="check" style={{ marginTop: 12 }}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I confirm this action.</label>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={!confirmed || f.busy} onClick={run}>{f.busy ? 'Saving…' : submitLabel}</button>
      </div>
    </Dialog>
  );
}

/** Archive with reason (and optional Manager exception), shared by all archivable records. */
export function ArchiveDialog({ what, path, version, allowException, onClose, onDone }: { what: string; path: string; version?: string; allowException?: boolean; onClose: () => void; onDone?: () => void }) {
  const fields: ActionField[] = [{ name: 'reason', label: 'Archive reason', kind: 'textarea', required: true }];
  if (allowException) fields.push({ name: 'exceptionReason', label: 'Manager exception reason (only when active records remain)', kind: 'textarea', hint: 'Only the TIO Manager can archive with active records.' });
  return <ActionDialog title={`Archive ${what}`} intro="Archiving keeps all history and links; the record can be restored by an authorized lead." fields={fields}
    submitLabel="Archive" danger path={path} version={version} onClose={onClose} onDone={onDone} />;
}

/** This computer's time zone (from the browser). */
export const computerZone = (): string => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };

function offsetMinutes(zone: string, at = new Date()): number {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(at);
    const n = (k: string) => Number(p.find(x => x.type === k)?.value);
    return Math.round((Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute')) - Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), at.getUTCHours(), at.getUTCMinutes())) / 60000);
  } catch { return 0; }
}
const fmtOffset = (m: number) => `UTC${m < 0 ? '−' : '+'}${String(Math.floor(Math.abs(m) / 60)).padStart(2, '0')}:${String(Math.abs(m) % 60).padStart(2, '0')}`;

let zoneOptions: Option[] | null = null;
/** Every IANA zone the browser knows, ordered by current UTC offset, labelled "(UTC+04:00) Asia/Dubai". */
export function timeZoneOptions(): Option[] {
  if (zoneOptions) return zoneOptions;
  let names: string[] = [];
  try { names = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? []; } catch { names = []; }
  if (!names.includes('UTC')) names = ['UTC', ...names];
  zoneOptions = names.map(z => ({ z, o: offsetMinutes(z) })).sort((a, b) => a.o - b.o || a.z.localeCompare(b.z))
    .map(({ z, o }) => ({ value: z, label: `(${fmtOffset(o)}) ${z.replace(/_/g, ' ')}` }));
  return zoneOptions;
}

/** A44 (owner request, 21 Oct 2026): time zones are chosen from a list, with a one-click "this computer's time zone". */
export function TimeZoneSelect({ label, value, onChange, required, error, hint, wide }: {
  label: ReactNode; value: string; onChange: (v: string) => void; required?: boolean; error?: string; hint?: ReactNode; wide?: boolean;
}) {
  const pc = computerZone();
  const opts = timeZoneOptions();
  const all = value && !opts.some(o => o.value === value) ? [{ value, label: `${value} (not in this browser's list)` }, ...opts] : opts;
  return (
    <SelectInput label={label} value={value} onChange={onChange} options={all} required={required} error={error} wide={wide} empty={required ? '— Select —' : 'Not set'}
      hint={<>{hint}{hint && ' '}{value !== pc && <button type="button" className="linkbtn" onClick={() => onChange(pc)}>Use this computer's time zone ({pc.replace(/_/g, ' ')})</button>}</>} />
  );
}

export function isApiError(e: unknown): e is ApiError { return e instanceof ApiError; }
