import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiError, get } from '../../api';
import { useMe } from '../../hooks';

/* A70: types and helpers shared by the Reporting Center areas (overview, library, builder, saved reports, schedules, history). */

export type ExportJob = {
  id: number; auditId: string; report: string; reportName: string; format: string; status: string; filterSummary: string; timeZone: string; requestedAt: string;
  startedAt?: string | null; completedAt?: string | null; rowCount?: number | null; fileSize?: number | null; fileName?: string | null; expiresAt?: string | null; error?: string | null;
  source: string; scheduleId?: number | null; retryOfId?: number | null; savedReportId?: number | null; attempts?: number; cutoffAt?: string | null; user?: string | null;
  builder?: boolean; canDownload: boolean; canRetry: boolean; canCancel?: boolean;
};
export type Schedule = {
  id: number; name: string; report: string; reportName: string; filterSummary: string; format: string; frequency: string; dayOfWeek?: number | null; dayOfMonth?: number | null;
  time: string; timeZone: string; isActive: boolean; nextRunAt: string; lastRunAt?: string | null; lastOutcome?: string | null; recipients: { id: number; name: string }[];
  savedReportId?: number | null; builder?: boolean;
};

export const TERMINAL = ['Completed', 'Failed', 'Expired', 'Cancelled'];
export const STATUS_TONE: Record<string, 'good' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  Completed: 'good', Failed: 'bad', Processing: 'info', Pending: 'info', Queued: 'info', Expired: 'neutral', Cancelled: 'neutral'
};
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TZ_KEY = 'tiohub.reports.timeZone';

export const size = (n?: number | null) => n === null || n === undefined ? '—' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
export const apiError = (e: unknown) => e instanceof ApiError ? e : null;
export const scheduleWhen = (s: Schedule) =>
  `${s.frequency === 'Weekly' ? `Every ${WEEKDAYS[s.dayOfWeek ?? 0]}` : s.frequency === 'Monthly' ? `Monthly on day ${s.dayOfMonth}` : 'Daily'} at ${s.time} (${s.timeZone})`;

/** The time zone for report timestamps: the last one chosen in the Reporting Center, else the user's working time zone, else Asia/Dubai. */
export function useReportZone(): [string, (z: string) => void] {
  const me = useMe().data;
  const [zone, setZone] = useState<string>(() => { try { return localStorage.getItem(TZ_KEY) ?? ''; } catch { return ''; } });
  const effective = zone || me?.timeZone || 'Asia/Dubai';
  return [effective, (z: string) => { setZone(z); try { localStorage.setItem(TZ_KEY, z); } catch { /* storage may be unavailable */ } }];
}

/** Downloads an export through the authorized endpoint; errors (expired, not found) become a message, never a broken page. */
export async function download(job: Pick<ExportJob, 'id' | 'fileName'>, toast: (t: string, bad?: boolean) => void, onUnavailable?: () => void) {
  const res = await fetch(`/api/v1/reports/exports/${job.id}/download`, { credentials: 'same-origin' });
  if (!res.ok) {
    let msg = `The file could not be downloaded (${res.status}).`;
    try { const p = await res.json(); msg = p.detail || p.title || msg; } catch { /* not JSON */ }
    toast(msg, true);
    if (res.status === 410) onUnavailable?.();
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = job.fileName ?? 'export';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useAssignable() {
  return useQuery({ queryKey: ['assignable', null, null, false], queryFn: () => get<{ id: number; name: string }[]>('/users/assignable'), staleTime: 60_000 });
}

/** Polls an asynchronous export until it reaches a terminal state (1.5 s, then slower). */
export function useJob(id: number | null, initial?: ExportJob) {
  return useQuery({
    queryKey: ['report-job', id], queryFn: () => get<ExportJob>(`/reporting/exports/${id}`), enabled: id !== null, initialData: initial,
    refetchInterval: q => q.state.data && TERMINAL.includes(q.state.data.status) ? false : (q.state.dataUpdateCount > 20 ? 4000 : 1500)
  });
}

/**
 * A searchable multi-select: a disclosure button with a panel of checkboxes. Escape or a click outside closes it and returns focus.
 * Used for clients, owners, teams, products, environments and types (all lists come from the server, already authorized).
 */
export function MultiPick({ label, options, value, onChange, all = 'All', extra }: {
  label: string; options: { value: string; label: string; sub?: string; icon?: React.ReactNode }[]; value: string[]; onChange: (v: string[]) => void; all?: string; extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    root.current?.querySelector<HTMLInputElement>('.mp-search')?.focus();
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const term = q.trim().toLowerCase();
  const shown = options.filter(o => !term || `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(term)).slice(0, 300);
  const names = value.map(v => options.find(o => o.value === v)?.label ?? v);
  const text = value.length === 0 ? all : value.length <= 2 ? names.join(', ') : `${value.length} selected`;
  const id = `mp-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="field mp" ref={root}>
      <span className="flabel" id={`${id}-l`}>{label}</span>
      <button ref={btn} type="button" className={`input mp-btn${value.length ? ' set' : ''}`} aria-expanded={open} aria-controls={id} aria-labelledby={`${id}-l ${id}-v`} onClick={() => setOpen(o => !o)}>
        <span id={`${id}-v`} className="mp-text">{text}</span><span aria-hidden="true" className="caret">▾</span>
      </button>
      {open && (
        <div className="mp-panel" id={id} role="group" aria-label={label}>
          <input className="input mp-search" type="search" placeholder={`Search ${label.toLowerCase()}`} aria-label={`Search ${label.toLowerCase()}`} value={q} onChange={e => setQ(e.target.value)} />
          {extra}
          <div className="mp-list">
            {shown.length === 0 && <div className="hint">No match.</div>}
            {shown.map(o => (
              <label key={o.value} className="check mp-opt">
                <input type="checkbox" checked={value.includes(o.value)} onChange={e => onChange(e.target.checked ? [...value, o.value] : value.filter(x => x !== o.value))} />
                {o.icon}<span>{o.label}{o.sub && <span className="muted"> · {o.sub}</span>}</span>
              </label>
            ))}
          </div>
          <div className="mp-foot">
            <button type="button" className="linkbtn" onClick={() => onChange([])} disabled={value.length === 0}>Clear</button>
            <span className="hint">{value.length} of {options.length}</span>
            <button type="button" className="btn btn-sm" onClick={() => { setOpen(false); btn.current?.focus(); }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Toggle chips for a short fixed list (statuses, priorities, SLA states): each is a pressed/unpressed button, never colour alone. */
export function ChipPick({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="field chip-pick">
      <legend className="flabel">{label}</legend>
      <div className="chip-pick-list">
        {options.map(o => {
          const on = value.includes(o.value);
          return <button key={o.value} type="button" className={`chip-toggle${on ? ' on' : ''}`} aria-pressed={on} onClick={() => onChange(on ? value.filter(x => x !== o.value) : [...value, o.value])}>
            {on && <span aria-hidden="true">✓ </span>}{o.label}</button>;
        })}
      </div>
    </fieldset>
  );
}
