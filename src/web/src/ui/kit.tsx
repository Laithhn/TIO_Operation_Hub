import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, isValidElement, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, del, get, type UserRef } from '../api';
import { useMe } from '../hooks';
import { fmtDateTime, label } from '../format';
import { Icon } from './Icon';

// ---------- page structure ----------

export function PageHead({ title, sub, crumbs, actions }: { title: ReactNode; sub?: ReactNode; crumbs?: { to?: string; label: string }[]; actions?: ReactNode }) {
  useEffect(() => { if (typeof title === 'string') document.title = `${title} · TIO Operations Hub`; }, [title]);
  return (
    <div className="page-head">
      {crumbs && crumbs.length > 0 && (
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && <span aria-hidden="true">›</span>}
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div style={{ minWidth: 0 }}>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; pad?: boolean }) {
  return (
    <section className="panel">
      {(title || actions) && <div className="panel-head">{title && <h2>{title}</h2>}{actions && <div className="actions">{actions}</div>}</div>}
      {pad ? <div className="panel-body">{children}</div> : children}
    </section>
  );
}

// ---------- states (UX-02: Unknown, No records entered, No matching records, Access restricted are distinct) ----------

export type EmptyKind = 'none' | 'nomatch' | 'restricted' | 'unknown';
const EMPTY_TEXT: Record<EmptyKind, string> = {
  none: 'No records entered.',
  nomatch: 'No matching records. Change or clear the filters.',
  restricted: 'Access restricted. You do not have permission to see these details.',
  unknown: 'Unknown — not yet recorded.'
};

export function StateMessage({ kind, children }: { kind: EmptyKind | 'error' | 'loading'; children?: ReactNode }) {
  if (kind === 'loading') return <div className="state-msg" role="status"><span className="spin" /> Loading…</div>;
  const cls = kind === 'restricted' ? 'state-msg restricted' : kind === 'error' ? 'state-msg error' : 'state-msg';
  return <div className={cls} role={kind === 'error' ? 'alert' : undefined}>{children ?? (kind === 'error' ? 'Something went wrong.' : EMPTY_TEXT[kind])}</div>;
}

export function Unknown({ children }: { children?: ReactNode }) {
  return <span className="muted" title="Not yet recorded — unknown is not zero">{children ?? 'Unknown'}</span>;
}

export function QueryState({ q, children }: { q: { isLoading: boolean; error: unknown }; children: ReactNode }) {
  if (q.isLoading) return <StateMessage kind="loading" />;
  if (q.error) return <ErrorBox error={q.error} />;
  return <>{children}</>;
}

export function ErrorBox({ error }: { error: unknown }) {
  if (error instanceof ApiError) {
    if (error.status === 404) return <StateMessage kind="restricted">Not found, or you do not have access to it.</StateMessage>;
    if (error.status === 403) return <StateMessage kind="restricted">{error.detail ?? 'Access restricted.'}</StateMessage>;
    return <StateMessage kind="error">{error.summary}{error.traceId ? <span className="muted"> (trace {error.traceId})</span> : null}</StateMessage>;
  }
  return <StateMessage kind="error">The request failed. Check your connection and try again.</StateMessage>;
}

/** Form-level error summary; field messages appear beside each input. */
export function FormError({ error, fields }: { error: ApiError | null; fields?: string[] }) {
  if (!error) return null;
  if (error.isConflict)
    return <div className="notice bad" role="alert"><b>{error.title}</b> {error.detail} Your entries are kept below. Use <i>Reload latest</i> to review the current version.</div>;
  const keys = Object.keys(error.errors);
  // Messages for fields this form does not show (business gates such as "owner required") are listed here.
  const other = fields ? keys.filter(k => !fields.some(f => f.toLowerCase() === k.toLowerCase())) : [];
  return (
    <div className="notice bad" role="alert"><b>{error.title}</b>{keys.length > other.length ? ' Check the highlighted fields.' : !keys.length && error.detail ? ` ${error.detail}` : ''}
      {other.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{other.map(k => <li key={k}>{error.errors[k][0]}</li>)}</ul>}
    </div>
  );
}

// ---------- badges ----------

export function Badge({ tone = 'neutral', children }: { tone?: 'good' | 'warn' | 'bad' | 'info' | 'neutral'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

const STATUS_TONE: Record<string, 'good' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  New: 'info', Triaged: 'info', InProgress: 'warn', PendingValidation: 'warn', Closed: 'good', Cancelled: 'neutral',
  Open: 'info', Completed: 'good', Healthy: 'good', Degraded: 'warn', Unavailable: 'bad', Unknown: 'neutral',
  Critical: 'bad', High: 'warn', Normal: 'neutral', Low: 'neutral', Active: 'good', Opportunity: 'info', Archived: 'neutral',
  Planned: 'info', OnHold: 'warn', Retired: 'neutral', PendingAcknowledgment: 'warn', CompletedByException: 'warn', Resolved: 'good',
  Current: 'good', Stale: 'bad', NotYetReviewed: 'neutral', NoPolicy: 'warn', NotApplicable: 'neutral'
};
export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <Unknown />;
  return <Badge tone={STATUS_TONE[value] ?? 'neutral'}>{label(value)}</Badge>;
}

export type FreshnessT = { state: string; lastReviewedAt?: string | null; dueAt?: string | null; rule: string };
export function FreshnessBadge({ f }: { f?: FreshnessT | null }) {
  if (!f) return <Unknown />;
  const text = f.state === 'Stale' ? 'Stale' : f.state === 'Current' ? 'Current' : f.state === 'NoPolicy' ? 'No review policy' : f.state === 'NotYetReviewed' ? 'Not yet reviewed' : 'Not applicable';
  const tip = `${f.rule}${f.lastReviewedAt ? ` · last ${fmtDateTime(f.lastReviewedAt)}` : ''}${f.dueAt ? ` · due ${fmtDateTime(f.dueAt)}` : ''}`;
  return <span title={tip}><StatusBadge value={f.state} /> <span className="sr">{text}</span></span>;
}

export type ConditionT = { reported: string; observedAt?: string | null; needsVerification: boolean; display: string };
export function ConditionBadge({ c }: { c?: ConditionT | null }) {
  if (!c || !c.observedAt) return <Badge tone="neutral">Unknown</Badge>;
  return (
    <span title={`Manually reported ${fmtDateTime(c.observedAt)} — not live monitoring`} style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      <StatusBadge value={c.reported} />
      {c.needsVerification && <Badge tone="warn">Needs verification</Badge>}
    </span>
  );
}

export function Person({ u, gap = 'Unassigned' }: { u?: UserRef | null; gap?: string }) {
  if (!u) return <span className="muted">{gap}</span>;
  return <span>{u.name}{!u.isActive && <> <Badge tone="bad">Deactivated</Badge></>}</span>;
}

// ---------- menus (ease of use: fewer buttons in a row) ----------

export type MenuItem = { label: ReactNode; to?: string; onClick?: () => void; danger?: boolean; hidden?: boolean };

/** A button that opens a short list of actions. Keyboard: Enter/Space opens, arrows move, Escape closes. */
export function Menu({ label: text, items, primary, align = 'right', title }: { label: ReactNode; items: MenuItem[]; primary?: boolean; align?: 'left' | 'right'; title?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const shown = items.filter(i => !i.hidden);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  if (shown.length === 0) return null;
  const keys = (e: React.KeyboardEvent) => {
    const list = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') { setOpen(false); root.current?.querySelector<HTMLElement>('.menu-btn-toggle')?.focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(at + 1) % list.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); list[(at - 1 + list.length) % list.length]?.focus(); }
  };
  const pick = (i: MenuItem) => { setOpen(false); if (i.to) nav(i.to); else i.onClick?.(); };
  return (
    <div className="menu" ref={root} onKeyDown={keys}>
      <button className={`btn menu-btn-toggle${primary ? ' btn-primary' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)} title={title}>
        {text} <span aria-hidden="true" className="caret">▾</span>
      </button>
      {open && (
        <div className={`menu-list ${align}`} role="menu">
          {shown.map((i, n) => <button key={n} role="menuitem" className={i.danger ? 'danger' : undefined} onClick={() => pick(i)}>{i.label}</button>)}
        </div>
      )}
    </div>
  );
}

/** Groups related form fields under a small heading. */
export function FormSection({ title, children, hint }: { title: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      {hint && <p className="hint" style={{ margin: '-2px 0 8px' }}>{hint}</p>}
      <div className="form-grid">{children}</div>
    </fieldset>
  );
}

/** A quantity with its unit on one line (for example CPU 8 vCPU). Empty = unknown. */
export function QuantityInput({ label: text, value, onChange, unit, onUnit, units, error }: {
  label: string; value: string; onChange: (v: string) => void; unit: string; onUnit: (v: string) => void; units: Option[]; error?: string;
}) {
  return (
    <Field label={text} error={error}>
      {(id, d) => (
        <div className="qty">
          <input id={id} className="input" type="number" min="0" step="any" value={value} onChange={e => onChange(e.target.value)} aria-describedby={d} aria-invalid={!!error} aria-label={`${text} quantity`} placeholder="Unknown" />
          <select className="input" value={unit} onChange={e => onUnit(e.target.value)} aria-label={`${text} unit`}>
            <option value="">Unit</option>{units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
      )}
    </Field>
  );
}

// ---------- data table (reference: bold header row, optional filter row, thin rows, separate pager strip) ----------

export type Column<T> = { key: string; header: ReactNode; render: (row: T) => ReactNode; sort?: string; className?: string; filter?: ReactNode };

/** Plain text of a rendered cell (for client-side filter, sort and CSV export). */
export function nodeText(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(nodeText).filter(Boolean).join(' ');
  if (isValidElement(n)) {
    const p = n.props as { children?: ReactNode; value?: unknown; u?: { name?: string } | null; gap?: string; label?: unknown; 'aria-label'?: string };
    if (p.children !== undefined) return nodeText(p.children);
    if (typeof p.value === 'string') return label(p.value);
    if (p.u !== undefined) return p.u?.name ?? p.gap ?? '';
    if (typeof p.label === 'string') return p.label;
    return '';
  }
  return '';
}

function downloadCsv(name: string, header: string[], rows: string[][]) {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = '﻿' + [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'table'}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The hub's table. Owner request (20 Oct 2026): every table can be filtered, sorted, paged and exported. Lists paged by the server keep
 * their server-side sort, filter row and pager (and export the rows on the page); every other table filters, sorts and pages in the browser.
 */
export function DataTable<T>({ columns, rows, rowKey, loading, error, empty = 'none', sort, onSort, caption, tools = true, exportName, pageSize: initialSize = 25 }: {
  columns: Column<T>[]; rows?: T[]; rowKey: (r: T) => string | number; loading?: boolean; error?: unknown; empty?: EmptyKind;
  sort?: string; onSort?: (s: string) => void; caption?: string; tools?: boolean; exportName?: string; pageSize?: number;
}) {
  const hasFilters = columns.some(c => c.filter);
  const nav = useNavigate();
  const me = useMe().data;
  const server = !!onSort;
  const [q, setQ] = useState('');
  const [csort, setCsort] = useState<{ key: string; desc: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const textCols = columns.filter(c => nodeText(c.header).trim().length > 0);
  // Text of each row, computed once per render for filter, sort and export.
  const prepared = useMemo(() => (rows ?? []).map(r => ({ r, text: Object.fromEntries(columns.map(c => [c.key, nodeText(c.render(r))])) as Record<string, string> })), [rows, columns]);
  const needle = q.trim().toLowerCase();
  const filtered = needle ? prepared.filter(x => Object.values(x.text).some(t => t.toLowerCase().includes(needle))) : prepared;
  const sorted = !server && csort ? [...filtered].sort((x, y) => {
    const a = x.text[csort.key] ?? '', b = y.text[csort.key] ?? '';
    const na = Number(a.replace(/[^\d.-]/g, '')), nb = Number(b.replace(/[^\d.-]/g, ''));
    const cmp = a !== '' && b !== '' && !isNaN(na) && !isNaN(nb) && /^\s*-?[\d.,]+/.test(a) && /^\s*-?[\d.,]+/.test(b)
      ? na - nb : a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    return csort.desc ? -cmp : cmp;
  }) : filtered;
  const pages = server ? 1 : Math.max(1, Math.ceil(sorted.length / size));
  const cur = Math.min(page, pages);
  const shown = server ? sorted : sorted.slice((cur - 1) * size, cur * size);
  useEffect(() => { setPage(1); }, [needle, rows]);
  const exportRows = () => downloadCsv(exportName ?? caption ?? document.title.split(' · ')[0] ?? 'table', textCols.map(c => nodeText(c.header)),
    sorted.map(x => textCols.map(c => x.text[c.key] ?? '')));
  // Ease of use: a click anywhere on a row opens its record (the row's first link); links, buttons and fields keep their own behaviour.
  const openRow = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest('a,button,input,select,textarea,label,summary') || window.getSelection()?.toString()) return;
    const a = e.currentTarget.querySelector<HTMLAnchorElement>('a[href]');
    if (!a) return;
    const href = a.getAttribute('href')!;
    if (e.ctrlKey || e.metaKey || e.button === 1) window.open(href, '_blank', 'noopener');
    else if (href.startsWith('/')) nav(href); else a.click();
  };
  const showTools = tools && !loading && !error && (rows?.length ?? 0) > 0;
  return (
    <div className="panel table-wrap">
      {showTools && (
        <div className="table-tools">
          <input className="input table-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={server ? 'Filter this page…' : 'Filter rows…'}
            aria-label="Filter rows" />
          <span className="muted table-count">{needle ? `${sorted.length} of ${rows!.length}` : `${rows!.length}`} row{(needle ? sorted.length : rows!.length) === 1 ? '' : 's'}</span>
          {me?.grants.export && <button className="btn btn-sm" onClick={exportRows} title={server ? 'Rows on this page, as shown' : 'All rows that match the filter'}>Export CSV</button>}
        </div>
      )}
      <table className="grid">
        {caption && <caption className="sr">{caption}</caption>}
        <thead>
          <tr>
            {columns.map(c => {
              const serverActive = server && sort?.replace('-', '') === c.sort;
              const desc = server ? sort?.startsWith('-') : csort?.desc;
              const clientActive = !server && csort?.key === c.key;
              const sortable = server ? !!c.sort : nodeText(c.header).trim().length > 0 && (rows?.length ?? 0) > 1;
              const active = serverActive || clientActive;
              const click = () => server ? onSort!(serverActive && !desc ? `-${c.sort}` : c.sort!) : setCsort(clientActive && !csort!.desc ? { key: c.key, desc: true } : clientActive ? null : { key: c.key, desc: false });
              return (
                <th key={c.key} className={c.className} aria-sort={active ? (desc ? 'descending' : 'ascending') : undefined} scope="col">
                  {sortable ? (
                    <button onClick={click}>{c.header}{active && <span aria-hidden="true">{desc ? '▾' : '▴'}</span>}</button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
          {hasFilters && <tr className="filters">{columns.map(c => <td key={c.key}>{c.filter}</td>)}</tr>}
        </thead>
        <tbody>
          {loading && <tr className="state"><td colSpan={columns.length}><span className="spin" /> Loading…</td></tr>}
          {!loading && !!error && <tr className="state"><td colSpan={columns.length}><ErrorBox error={error} /></td></tr>}
          {!loading && !error && rows?.length === 0 && <tr className="state"><td colSpan={columns.length}>{EMPTY_TEXT[empty]}</td></tr>}
          {!loading && !error && (rows?.length ?? 0) > 0 && shown.length === 0 && <tr className="state"><td colSpan={columns.length}>{EMPTY_TEXT.nomatch}</td></tr>}
          {!loading && !error && shown.map(({ r }) => <tr key={rowKey(r)} onClick={openRow}>{columns.map(c => <td key={c.key} className={c.className}>{c.render(r)}</td>)}</tr>)}
        </tbody>
      </table>
      {showTools && !server && sorted.length > Math.min(size, 25) && (
        <nav className="pager table-pager" aria-label={`${caption ?? 'Table'} pages`}>
          <span>{(cur - 1) * size + 1} – {Math.min(cur * size, sorted.length)} of {sorted.length}</span>
          <span className="right">
            <label>Rows per page: <select value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1); }}>{[10, 25, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label>
            <button onClick={() => setPage(cur - 1)} disabled={cur <= 1}>Prev</button>
            <span>Page {cur} of {pages}</span>
            <button onClick={() => setPage(cur + 1)} disabled={cur >= pages}>Next</button>
          </span>
        </nav>
      )}
    </div>
  );
}

/** A37: a small "Delete" action for a table row or a page, with confirmation; shown only with the Delete records right. */
export function DeleteAction({ path, what, onDone, button, afterTo }: { path: string; what: string; onDone?: () => void; button?: boolean; afterTo?: string }) {
  const me = useMe().data;
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (!me?.rights?.includes('Delete')) return null;
  return (
    <>
      <button className={button ? 'btn btn-danger-outline' : 'linkbtn danger-link'} onClick={e => { e.stopPropagation(); setOpen(true); }} aria-label={`Delete ${what}`}>Delete</button>
      {open && <ConfirmDelete path={path} what={what} onClose={() => setOpen(false)} onDone={() => { onDone?.(); if (afterTo) nav(afterTo, { replace: true }); }} />}
    </>
  );
}

/** A43: record kinds that can be deleted together with everything that belongs to them. */
const CASCADE_KINDS = ['clients', 'regions', 'environments', 'projects', 'contracts', 'assets', 'installations', 'components', 'cases', 'commitments', 'escalations', 'teams'];
type DepItem = { id: number; label: string; link?: string | null; deletePath?: string | null };
type DepGroup = { type: string; label: string; count: number; unlinked: boolean; main: boolean; items: DepItem[] };
type DepPreview = { label: string; total: number; delete: DepGroup[]; unlink: DepGroup[] };
const errText = (e: unknown) => (e instanceof ApiError ? [e.detail ?? e.title, ...Object.values(e.errors ?? {}).flat()].join(' ') : (e as Error).message);

export function ConfirmDelete({ path, what, onClose, onDone }: { path: string; what: string; onClose: () => void; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [itemBusy, setItemBusy] = useState<string | null>(null);
  const [itemError, setItemError] = useState<Record<string, string>>({});
  const toast = useToast();
  const qc = useQueryClient();
  const m = path.match(/^\/([a-z-]+)\/(\d+)$/);
  const cascade = !!m && CASCADE_KINDS.includes(m[1]);
  const depPath = cascade ? `/dependents/${m![1]}/${m![2]}` : null;
  const deps = useQuery({ queryKey: ['dependents', depPath], queryFn: () => get<DepPreview>(depPath!), enabled: cascade, staleTime: 0, gcTime: 0 });
  const d = deps.data;
  const hasDeps = !!d && (d.total > 0 || d.unlink.length > 0);
  const finish = async (msg: string) => { toast(msg); onClose(); onDone?.(); await qc.invalidateQueries(); };
  const go = async () => {
    setBusy(true); setError(null);
    try { await del(path); await finish(`${what} deleted.`); }
    catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  const goAll = async () => {
    setBusy(true); setError(null);
    try { const r = await del<{ deleted: number }>(depPath!); await finish(`${what} deleted with ${(r?.deleted ?? 1) - 1} related record(s).`); }
    catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  const deleteItem = async (g: DepGroup, it: DepItem) => {
    const key = `${g.type}-${it.id}`;
    setItemBusy(key); setItemError(x => ({ ...x, [key]: '' }));
    try { await del(it.deletePath!); toast(`${it.label} deleted.`); await deps.refetch(); }
    catch (e) { setItemError(x => ({ ...x, [key]: errText(e) })); }
    finally { setItemBusy(null); }
  };
  return (
    <Dialog title={`Delete ${what}?`} onClose={onClose} wide={hasDeps}>
      {cascade && deps.isLoading && <div className="state-msg"><span className="spin" /> Checking what belongs to {what}…</div>}
      {cascade && !!deps.error && <div className="notice bad" role="alert">{errText(deps.error)}</div>}
      {(!cascade || (d && !hasDeps)) && <p style={{ marginTop: 0 }}>This permanently removes <b>{what}</b>. The change history keeps a record of the deletion.</p>}
      {d && hasDeps && (
        <>
          <p style={{ marginTop: 0 }}><b>{d.label}</b> still has related records. Delete them one by one below, or delete everything at once.</p>
          {d.total > 0 && <section className="dep-list" aria-label="Records that will be deleted">
            <h3>Will be deleted with it ({d.total})</h3>
            <ul>
              {d.delete.filter(g => g.main).map(g => (
                <li key={g.type}>
                  <button className="dep-head" aria-expanded={open === g.type} onClick={() => setOpen(open === g.type ? null : g.type)} disabled={g.items.length === 0}>
                    <span>{g.label}</span><b>{g.count}</b>{g.items.length > 0 && <span className="caret" aria-hidden="true">{open === g.type ? '▴' : '▾'}</span>}
                  </button>
                  {open === g.type && <ul className="dep-items">
                    {g.items.map(it => {
                      const key = `${g.type}-${it.id}`;
                      return (
                        <li key={key}>
                          {it.link ? <Link to={it.link} target="_blank" rel="noopener">{it.label}</Link> : <span>{it.label}</span>}
                          {it.deletePath && <button className="linkbtn danger-link" disabled={itemBusy !== null} onClick={() => deleteItem(g, it)} aria-label={`Delete ${it.label}`}>{itemBusy === key ? 'Deleting…' : 'Delete'}</button>}
                          {itemError[key] && <div className="err">{itemError[key]}</div>}
                        </li>
                      );
                    })}
                    {g.count > g.items.length && <li className="muted">and {g.count - g.items.length} more</li>}
                  </ul>}
                </li>
              ))}
            </ul>
            {d.delete.some(g => !g.main) && <p className="hint dep-also">Also removed: {d.delete.filter(g => !g.main).map(g => `${g.label} (${g.count})`).join(', ')}.</p>}
          </section>}
          {d.unlink.length > 0 && <section className="dep-list" aria-label="Records that will be kept and unlinked">
            <h3>Kept, but no longer linked</h3>
            <ul>{d.unlink.map(g => <li key={g.type}><div className="dep-head static"><span>{g.label}</span><b>{g.count}</b></div></li>)}</ul>
          </section>}
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} /> I understand that {what} and the {d.total} record(s) listed above are deleted permanently.</label>
        </>
      )}
      {error && <div className="notice bad" role="alert">{error}</div>}
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        {d && hasDeps
          ? <button className="btn btn-danger" disabled={busy || !understood} onClick={goAll}>{busy ? 'Deleting…' : `Delete everything (${d.total + 1})`}</button>
          : <button className="btn btn-danger" disabled={busy || (cascade && deps.isLoading)} onClick={go}>{busy ? 'Deleting…' : 'Delete'}</button>}
      </div>
    </Dialog>
  );
}

export function Pager({ page, pageSize, total, onPage, onSize }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; onSize: (s: number) => void }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const last = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="pager" aria-label="Pagination">
      <span>Records :- {to - from + 1 > 0 ? to - from + 1 : 0} OF {total}</span>
      <span className="right">
        <label>Items per page: <select value={pageSize} onChange={e => onSize(Number(e.target.value))}>{[15, 25, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label>
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}>Prev</button>
        <span>{from} - {to} OF {total}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= last}>Next</button>
      </span>
    </nav>
  );
}

// ---------- form fields ----------

type FieldProps = { label: ReactNode; required?: boolean; error?: string; hint?: ReactNode; wide?: boolean; children: (id: string, describedBy?: string) => ReactNode };
export function Field({ label: text, required, error, hint, wide, children }: FieldProps) {
  const id = useId();
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field${error ? ' invalid' : ''}${wide ? ' wide' : ''}`}>
      <label htmlFor={id} className={required ? 'req' : undefined}>{text}</label>
      {children(id, desc)}
      {error ? <div className="err" id={`${id}-err`}>{error}</div> : hint ? <div className="hint" id={`${id}-hint`}>{hint}</div> : null}
    </div>
  );
}

export function TextInput({ label: l, value, onChange, required, error, hint, wide, multiline, type = 'text', placeholder, maxLength, disabled, list }: {
  label: ReactNode; value: string | null | undefined; onChange: (v: string) => void; required?: boolean; error?: string; hint?: ReactNode; wide?: boolean;
  multiline?: boolean; type?: string; placeholder?: string; maxLength?: number; disabled?: boolean; list?: string;
}) {
  return (
    <Field label={l} required={required} error={error} hint={hint} wide={wide}>
      {(id, d) => multiline
        ? <textarea id={id} className="input" value={value ?? ''} onChange={e => onChange(e.target.value)} aria-describedby={d} aria-invalid={!!error} required={required} maxLength={maxLength} placeholder={placeholder} disabled={disabled} />
        : <input id={id} className="input" type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} aria-describedby={d} aria-invalid={!!error} required={required} maxLength={maxLength} placeholder={placeholder} disabled={disabled} list={list} />}
    </Field>
  );
}

export type Option = { value: string; label: string };
export function SelectInput({ label: l, value, onChange, options, required, error, hint, wide, empty = '— Select —', disabled }: {
  label: ReactNode; value: string | number | null | undefined; onChange: (v: string) => void; options: Option[]; required?: boolean; error?: string; hint?: ReactNode;
  wide?: boolean; empty?: string | null; disabled?: boolean;
}) {
  return (
    <Field label={l} required={required} error={error} hint={hint} wide={wide}>
      {(id, d) => (
        <select id={id} className="input" value={value ?? ''} onChange={e => onChange(e.target.value)} aria-describedby={d} aria-invalid={!!error} required={required} disabled={disabled}>
          {empty !== null && <option value="">{empty}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({ label: l, checked, onChange, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="field">
      <label className="check"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /> {l}</label>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export const enumOptions = (values: string[]): Option[] => values.map(v => ({ value: v, label: label(v) }));

// ---------- dialogs ----------

export function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button:not(.close)')?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => { document.removeEventListener('keydown', h); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`dialog${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header><h2>{title}</h2><button className="btn btn-ghost close" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
        <div className="body">{children}</div>
      </div>
    </div>
  );
}

// ---------- toasts ----------

type Toast = { id: number; text: string; bad?: boolean };
const ToastCtx = createContext<(text: string, bad?: boolean) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, bad?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, text, bad }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast${t.bad ? ' bad' : ''}`}>{t.text}</div>)}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------- misc ----------

export function Tabs({ tabs, value, onChange }: { tabs: { key: string; label: ReactNode }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => <button key={t.key} role="tab" aria-selected={t.key === value} onClick={() => onChange(t.key)}>{t.label}</button>)}
    </div>
  );
}

export function DL({ items }: { items: [ReactNode, ReactNode][] }) {
  return <dl className="dl">{items.map(([k, v], i) => <div key={i} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v === null || v === undefined || v === '' ? <Unknown /> : v}</dd></div>)}</dl>;
}

export function When({ v }: { v?: string | null }) { return v ? <span className="nowrap">{fmtDateTime(v)}</span> : <span className="muted">—</span>; }
