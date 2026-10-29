import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cloneElement, createContext, Fragment, isValidElement, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError, del, get, type UserRef } from '../api';
import { useMe, useReference } from '../hooks';
import { fmtDateTime, label } from '../format';
import { Icon } from './Icon';
import { hasPermission, resourceForRecord, canDeletePath } from '../permissions';
import { createPortal } from 'react-dom';
import { Button, Card, Icon as VtIcon, Spinner, TabBar, TabBarTitleItem, Toolbar, ToolbarContrItem } from '../vt';
import { activeCriteriaCount, DEFAULT_OPERATOR, isCriterionIncomplete, rowMatches, TEXT_FILTER_OPERATORS, type TextFilterOperator } from './tableFilter';

// ---------- page structure ----------

/** The current header section (Shell provides it). UX-001: phones show it above the page title, where it is never cut. */
export const SectionContext = createContext<string | undefined>(undefined);

/** The section line of a page title (shown on phones only); PageHead has it, pages with their own toolbar place it themselves. */
export function SectionLabel() {
  const section = useContext(SectionContext);
  return section ? <div className="page-section"><span className="sr">Section: </span>{section}</div> : null;
}

/** The page's main toolbar (VtWebGuiFramework MainToolbar): rendered into the frame's #viMainToolbar slot when present. */
export function PageHead({ title, sub, crumbs, actions }: { title: ReactNode; sub?: ReactNode; crumbs?: { to?: string; label: string }[]; actions?: ReactNode }) {
  useEffect(() => { if (typeof title === 'string') document.title = `${title} · TIO Operations Hub`; }, [title]);
  const slot = typeof document !== 'undefined' ? document.getElementById('viMainToolbar') : null;
  const head = (
    <div className="page-head">
      <SectionLabel />
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
  return slot ? createPortal(head, slot) : head;
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
  if (kind === 'loading') return <div className="state-msg" role="status"><span className="vt-spinner" aria-hidden="true"><Spinner dim={20} /></span> Loading…</div>;
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

/**
 * UX-005: the next step after an access denial. Rights belong to roles; roles and client/team scopes belong to accounts. Both are changed
 * under Administration by a user with the Administration right (Security/UserContext.RequireAdministrator). The text names no person
 * and no record, so it discloses nothing the reader may not see.
 */
export const ACCESS_HELP = {
  right: 'Rights come with your role; a user with the Administration right can change the role under Administration › Roles.',
  role: 'A user with the Administration right can give your account a role under Administration › Users.',
  scope: 'Client and team scopes are set per account under Administration › Users by a user with the Administration right.'
} as const;

/** An access denial: what is needed, then where it is granted (ACCESS_HELP). */
export function Restricted({ need, help = 'right', children }: { need: ReactNode; help?: keyof typeof ACCESS_HELP; children?: ReactNode }) {
  return <StateMessage kind="restricted"><span>{need} <span className="access-help">{ACCESS_HELP[help]}</span>{children}</span></StateMessage>;
}

/** Retries the failed queries on the screen (the request that produced this message among them). */
function RetryButton() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const retry = async () => { setBusy(true); try { await qc.refetchQueries({ type: 'active', predicate: q => q.state.status === 'error' }); } finally { setBusy(false); } };
  return <button type="button" className="linkbtn" onClick={retry} disabled={busy}>{busy ? 'Trying again…' : 'Try again'}</button>;
}

export function ErrorBox({ error }: { error: unknown }) {
  if (error instanceof ApiError) {
    if (error.status === 404) return <StateMessage kind="restricted">Not found, or you do not have access to it. Check the address, or open the record from its list.</StateMessage>;
    if (error.status === 403) return <Restricted need={error.detail ?? 'Access restricted.'} />;
    // UX-005: a server failure says what to do next; the trace ID lets the administrator find the request in the server log.
    return <StateMessage kind="error"><span>{error.summary} <RetryButton />{error.traceId && <span className="muted error-trace"> If it fails again, give the hub administrator the trace ID <span className="mono">{error.traceId}</span>.</span>}</span></StateMessage>;
  }
  return <StateMessage kind="error"><span>The request failed. Check your connection. <RetryButton /></span></StateMessage>;
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

// VtWebGuiFramework 4 has no StatusMarker (not ported from v3); the status glyph is the framework Icon in the signal colour.
const MARKER_STATE = { good: ['OK', 'signalOk'], warn: ['WARNING', 'signalWarning'], bad: ['ERROR', 'signalError'] } as const;
/** Status text with a framework signal icon (OK / warning / error); informational and neutral states keep a plain dot. */
export function Badge({ tone = 'neutral', children }: { tone?: 'good' | 'warn' | 'bad' | 'info' | 'neutral'; children: ReactNode }) {
  const state = tone in MARKER_STATE ? MARKER_STATE[tone as keyof typeof MARKER_STATE] : null;
  return (
    <span className={`badge ${tone}${state ? ' marked' : ''}`}>
      {state && <span className="badge-marker" aria-hidden="true"><VtIcon icon={state[0]} color={state[1]} size={16} /></span>}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, 'good' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  New: 'info', Triaged: 'info', InProgress: 'warn', PendingValidation: 'warn', Closed: 'good', Cancelled: 'neutral',
  Open: 'info', Completed: 'good', Healthy: 'good', Degraded: 'warn', Unavailable: 'bad', Unknown: 'neutral',
  Critical: 'bad', High: 'warn', Normal: 'neutral', Low: 'neutral', Active: 'good', Opportunity: 'info', Archived: 'neutral',
  Planned: 'info', OnHold: 'warn', Retired: 'neutral', PendingAcknowledgment: 'warn', CompletedByException: 'warn', Resolved: 'good',
  Current: 'good', Stale: 'bad', NotYetReviewed: 'neutral', NoPolicy: 'warn', NotApplicable: 'neutral',
  Met: 'good', Breached: 'bad', Pending: 'info', NotMeasurable: 'warn'
};
export function StatusBadge({ value, displayLabel, enumName }: { value?: string | null; displayLabel?: string; enumName?: 'CaseStatus' | 'Condition' }) {
  const labels = useReference().data?.enumLabels;
  if (!value) return <Unknown />;
  const workflowLabel = enumName ? labels?.[enumName]?.[value] : undefined;
  return <Badge tone={STATUS_TONE[value] ?? 'neutral'}>{displayLabel ?? workflowLabel ?? label(value)}</Badge>;
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
  if (!c || !c.observedAt) return <StatusBadge value="Unknown" enumName="Condition" />;
  return (
    <span title={`Manually reported ${fmtDateTime(c.observedAt)} — not live monitoring`} style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      <StatusBadge value={c.reported} enumName="Condition" />
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

// ---------- data table (framework toolbar and cards above a semantic table) ----------

export type Column<T> = {
  key: string; header: ReactNode; render: (row: T) => ReactNode; sort?: string; className?: string; filter?: ReactNode;
  /** Phones (GUI-06): "primary" columns stay in the row, the others move into the row's details. Without any priority in a table, the first
   *  two named columns, a Status column and the unnamed action columns are primary. */
  priority?: 'primary' | 'secondary';
  /** Caps the column (for example "18rem"); long text wraps inside it instead of widening the table (GUI-11). */
  maxWidth?: string;
};

/** Plain text of a rendered cell (for client-side filter, sort and CSV export). */
export function nodeText(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(nodeText).filter(Boolean).join(' ');
  if (isValidElement(n)) {
    const p = n.props as { children?: ReactNode; value?: unknown; u?: { name?: string } | null; gap?: string; label?: unknown; 'aria-label'?: string; 'data-text'?: string };
    if (typeof p['data-text'] === 'string') return p['data-text'];
    // A71: a component can say what its plain text is (ClientDisplay: alias and name), since its rendered output is not visible here.
    const own = (n.type as { plainText?: (props: unknown) => string }).plainText;
    if (typeof own === 'function') return own(p);
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

const headerText = <T,>(c: Column<T>) => nodeText(c.header).trim();

/** The columns that stay in the row on phones (GUI-06). */
function primaryKeys<T>(columns: Column<T>[]): Set<string> {
  if (columns.some(c => c.priority)) return new Set(columns.filter(c => c.priority === 'primary' || (!c.priority && !headerText(c))).map(c => c.key));
  const named = columns.filter(c => headerText(c));
  return new Set([...named.slice(0, 2), ...named.filter(c => /^status$/i.test(headerText(c))), ...columns.filter(c => !headerText(c))].map(c => c.key));
}

// Room the card's own padding and the gap above its action row take, beside the measured body and actions.
const CARD_CHROME = 2 * 12 + 12 + 2;
type CardAnchor = { focus?: () => void; getBoundingClientRect: () => DOMRect | undefined } | null;

/**
 * A framework Card hung from a toolbar button (GUI-04). It keeps clear of the header and the status footer and stays inside the viewport
 * (framework minimum distances and soft anchor), opens above the button when there is more room there (framework placement), scrolls its
 * body and keeps its action row in view. Focus moves into the card on opening and back to the button on Escape or a close action.
 */
function ToolbarCard({ anchor, label: name, width, onClose, actions, children }: {
  anchor: React.RefObject<CardAnchor>; label: string; width: number; onClose: () => void; actions: (close: (refocus: boolean) => void) => ReactNode; children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const [edges] = useState(() => {
    const hdr = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const ftr = document.querySelector('footer')?.getBoundingClientRect().top;
    return { top: Math.round(hdr) + 4, bottom: ftr === undefined ? 8 : Math.round(window.innerHeight - ftr) + 4, width: Math.min(width, window.innerWidth - 16) };
  });
  useLayoutEffect(() => {
    // The content's own height: the body element itself stretches with the card.
    const measure = () => {
      const content = body.current?.firstElementChild as HTMLElement | null;
      if (content && foot.current) setHeight(Math.ceil(content.offsetHeight + foot.current.offsetHeight + CARD_CHROME));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (body.current?.firstElementChild) ro.observe(body.current.firstElementChild);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const first = () => root.current?.querySelector<HTMLElement>('input,select,button,[role="button"]')?.focus();
    first();
    // The framework card may still be hidden while it measures itself: try again once it has painted.
    const f = requestAnimationFrame(() => { if (!root.current?.contains(document.activeElement)) first(); });
    return () => cancelAnimationFrame(f);
  }, []);
  const close = (refocus: boolean) => { onClose(); if (refocus) anchor.current?.focus?.(); };
  return (
    <Card width={edges.width} left={-8} right={-8} top={-edges.top} bottom={-edges.bottom} height={height} softAnchor anchorElemRef={anchor as never} padding="small"
      onClickBeside={() => close(false)} onPressEscape={() => close(true)} onMoveAnchorElem={() => close(false)}>
      <div ref={root} className="vt-card-panel" role="group" aria-label={name}>
        <div ref={body} className="vt-card-body"><div>{children}</div></div>
        <div ref={foot} className="grid-filter-actions">{actions(close)}</div>
      </div>
    </Card>
  );
}

/** Phones (up to 600 px, as the table styles): only there are the secondary columns folded into row details. */
function usePhone() {
  const query = '(max-width: 600px)';
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const h = () => setOn(m.matches);
    h();
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return on;
}

/** Horizontal overflow of the table: an edge shadow shows it, and the scroll area takes keyboard focus only when there is something to scroll. */
function useOverflow<E extends HTMLElement>() {
  const ref = useRef<E>(null);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOver(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  });
  return [ref, over] as const;
}

/**
 * The hub's table. Owner request (20 Oct 2026): every table can be filtered, sorted, paged and exported. Lists paged by the server keep
 * their server-side sort and filters (and export the rows on the page); every other table filters, sorts and pages in the browser.
 *
 * The framework toolbar above the table carries the controls (row search, the Filter card with the column filters, the column chooser,
 * export). The rows are a native table (GUI-05): screen readers announce rows, column headers and cells, a sortable header is a button
 * with aria-sort, and sorting is announced. On phones the secondary columns move into a details row under each record (GUI-06).
 */
export function DataTable<T>({ columns, rows, rowKey, loading, error, empty = 'none', sort, onSort, caption, tools = true, exportName, pageSize: initialSize = 25, tableClassName, tableWrapClassName }: {
  columns: Column<T>[]; rows?: T[]; rowKey: (r: T) => string | number; loading?: boolean; error?: unknown; empty?: EmptyKind;
  sort?: string; onSort?: (s: string) => void; caption?: string; tools?: boolean; exportName?: string; pageSize?: number; tableClassName?: string; tableWrapClassName?: string;
}) {
  const nav = useNavigate();
  const me = useMe().data;
  const tableId = 'vt-table-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const server = !!onSort;
  const [q, setQ] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [filterOperators, setFilterOperators] = useState<Record<string, TextFilterOperator>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [announce, setAnnounce] = useState('');
  // A server-sorted list reloads (and briefly replaces the table): the sort button gets the focus back afterwards.
  // It waits for the new rows: the old table is still on screen right after the click.
  const refocusSort = useRef<{ key: string; rows: unknown } | null>(null);
  useEffect(() => {
    const want = refocusSort.current;
    if (!want || loading || (server && rows === want.rows)) return;
    const b = document.querySelector<HTMLElement>(`#${tableId} [data-sort-key="${want.key}"]`);
    if (b) { b.focus(); refocusSort.current = null; }
  });
  const filterButton = useRef<CardAnchor>(null);
  const columnsButton = useRef<CardAnchor>(null);
  const [scroller, overflowing] = useOverflow<HTMLDivElement>();
  const [csort, setCsort] = useState<{ key: string; desc: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const textCols = columns.filter(c => headerText(c).length > 0);
  // Text of each row, computed once per render for filter, sort and export.
  const prepared = useMemo(() => (rows ?? []).map(r => ({ r, text: Object.fromEntries(columns.map(c => [c.key, nodeText(c.render(r))])) as Record<string, string> })), [rows, columns]);
  const suggestions = useMemo(() => columns.map(c => [...new Set(prepared.map(x => x.text[c.key]?.trim()).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).slice(0, 300)), [columns, prepared]);
  const needle = q.trim().toLowerCase();
  // Columns with a page-supplied filter (c.filter) are filtered by the page; the text filters are filtered here.
  const textFilterKeys = columns.filter(c => !c.filter).map(c => c.key);
  const criteria = { values: columnFilters, operators: filterOperators };
  const activeFilters = activeCriteriaCount(textFilterKeys, criteria);
  const filtered = prepared.filter(x => (!needle || Object.values(x.text).some(t => t.toLowerCase().includes(needle))) && rowMatches(x.text, textFilterKeys, criteria));
  const localSort = server ? csort && !columns.find(c => c.key === csort.key)?.sort ? csort : null : csort;
  const sorted = localSort ? [...filtered].sort((x, y) => {
    const a = x.text[localSort.key] ?? '', b = y.text[localSort.key] ?? '';
    const na = Number(a.replace(/[^\d.-]/g, '')), nb = Number(b.replace(/[^\d.-]/g, ''));
    const cmp = a !== '' && b !== '' && !isNaN(na) && !isNaN(nb) && /^\s*-?[\d.,]+/.test(a) && /^\s*-?[\d.,]+/.test(b)
      ? na - nb : a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    return localSort.desc ? -cmp : cmp;
  }) : filtered;
  const pages = server ? 1 : Math.max(1, Math.ceil(sorted.length / size));
  const cur = Math.min(page, pages);
  const shown = server ? sorted : sorted.slice((cur - 1) * size, cur * size);
  useEffect(() => { setPage(1); }, [needle, rows]);
  const exportRows = () => downloadCsv(exportName ?? caption ?? document.title.split(' · ')[0] ?? 'table', textCols.map(c => headerText(c)),
    sorted.map(x => textCols.map(c => x.text[c.key] ?? '')));
  const visibleCols = columns.filter(c => !hidden[c.key]);
  const primary = useMemo(() => primaryKeys(columns), [columns]);
  const secondaryCols = visibleCols.filter(c => !primary.has(c.key));
  const phone = usePhone();
  const hasDetails = phone && secondaryCols.length > 0;
  const lastVisible = visibleCols.filter(c => headerText(c)).length <= 1;

  // Sorting: server-sorted lists send their sort key; every other column sorts in the browser.
  const sortState = (c: Column<T>) => {
    const serverActive = server && !!c.sort && sort?.replace('-', '') === c.sort;
    const desc = serverActive ? !!sort?.startsWith('-') : !!csort?.desc;
    const active = serverActive || (csort?.key === c.key && !serverActive);
    const sortable = headerText(c).length > 0 && (server ? (!!c.sort || (rows?.length ?? 0) > 1) : (rows?.length ?? 0) > 1);
    return { serverActive, desc, active, sortable };
  };
  const toggleSort = (c: Column<T>) => {
    const s = sortState(c);
    const desc = s.active ? !s.desc : false;
    if (server && c.sort) onSort!(desc ? `-${c.sort}` : c.sort!);
    else setCsort({ key: c.key, desc });
    setAnnounce(`Sorted by ${headerText(c)}, ${desc ? 'descending' : 'ascending'}.`);
    if (document.activeElement?.closest(`#${tableId}`)) refocusSort.current = { key: c.key, rows };
  };

  // Ease of use: a click anywhere on a row opens its record (the row's first link); links, buttons and fields keep their own behaviour.
  const openRow = (event: React.MouseEvent<HTMLTableRowElement>) => {
    const t = event.target as HTMLElement;
    if (t.closest('a,button,[role="button"],input,select,textarea,label,summary,details') || window.getSelection()?.toString()) return;
    const a = event.currentTarget.querySelector<HTMLAnchorElement>('a[href]');
    if (!a) return;
    const href = a.getAttribute('href')!;
    if (event.ctrlKey || event.metaKey || event.button === 1) window.open(href, '_blank', 'noopener');
    else if (href.startsWith('/')) nav(href); else a.click();
  };

  const hasRows = !loading && !error && (rows?.length ?? 0) > 0;
  // Once the table has shown rows its toolbar stays, also while a filter reloads the list or matches nothing: the open Filter
  // card hangs from the toolbar's button and would otherwise lose its place (it jumped to the top-left corner).
  const hadRows = useRef(false);
  if (hasRows) hadRows.current = true;
  const showTools = tools && !error && (hasRows || hadRows.current);
  const total = rows?.length ?? 0;
  const clearFilters = () => { setColumnFilters({}); setFilterOperators({}); };
  // Unnamed columns hold the row actions: they stay at the right edge while the table scrolls sideways (GUI-11). UX-002: the first named
  // column identifies the record and stays at the left edge, so a row scrolled sideways on a tablet still says which record it is.
  const identityKey = visibleCols.find(c => headerText(c))?.key;
  const cellClass = (c: Column<T>) => [c.className, primary.has(c.key) ? undefined : 'col-secondary', headerText(c) ? undefined : 'col-actions', c.key === identityKey ? 'col-identity' : undefined].filter(Boolean).join(' ') || undefined;
  // On the cell's content: browsers ignore max-width on the cells of an auto-layout table.
  const cellStyle = (c: Column<T>) => (c.maxWidth ? { maxWidth: c.maxWidth } : undefined);
  const columnMatches = columns.filter(c => (headerText(c) || c.key).toLowerCase().includes(columnSearch.trim().toLowerCase()) && headerText(c));
  const colSpan = visibleCols.length + (hasDetails ? 1 : 0);
  return (
    <div className={`panel vt-table${tableWrapClassName ? ` ${tableWrapClassName}` : ''}${tableClassName ? ` ${tableClassName}` : ''}`}
      role="region" aria-label={caption ?? 'Table'} data-vt-table={tableId}>
      {showTools && (
        <div className="vt-table-toolbar">
          <Toolbar alignItems="center" paddingTop="xs" paddingBottom="xs" paddingLeft="normal" paddingRight="normal">
            <ToolbarContrItem columnGap="small" alignItems="center">
              <input className="input table-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={server ? 'Filter this page…' : 'Filter rows…'}
                aria-label="Filter rows" />
              <span className="muted table-count" aria-live="polite">{loading ? 'Loading…' : <>{needle || activeFilters ? `${sorted.length} of ${total}` : `${total}`} row{(needle || activeFilters ? sorted.length : total) === 1 ? '' : 's'}</>}</span>
            </ToolbarContrItem>
            <ToolbarContrItem justifySelf="end" columnGap="small" alignItems="center">
              <Button ref={filterButton as never} type="bare" icon={activeFilters ? 'FILTERACTIVE' : 'FILTER'} text={activeFilters ? `Filter (${activeFilters})` : 'Filter'}
                onClick={() => { setShowColumns(false); setShowFilters(v => !v); }} />
              <Button ref={columnsButton as never} type="bare" icon="COLUMNSELECT" text="Columns" onClick={() => { setShowFilters(false); setColumnSearch(''); setShowColumns(v => !v); }} />
              {me?.grants.export && <Button type="bare" icon="EXPORT" text="Export CSV" onClick={exportRows} />}
            </ToolbarContrItem>
          </Toolbar>
        </div>
      )}
      {showFilters && (
        <ToolbarCard anchor={filterButton} width={500} label={`${caption ?? 'Table'} filters`} onClose={() => setShowFilters(false)}
          actions={close => <><Button type="tinted" text="Clear" onClick={clearFilters} /><Button type="filled" text="Close" onClick={() => close(true)} /></>}>
          <div className="vt-filter-card">
            {columns.filter(c => !!c.filter || headerText(c).length > 0).map(c => {
              const headerName = headerText(c) || 'column';
              const suggestionId = `${tableId}-filter-${c.key}`;
              const columnSuggestions = suggestions[columns.indexOf(c)] ?? [];
              const op = filterOperators[c.key] ?? DEFAULT_OPERATOR;
              const incomplete = !c.filter && isCriterionIncomplete(columnFilters[c.key], op);
              return (
                <div key={c.key} className="vt-filter-row">
                  <span className="flabel" id={`${suggestionId}-label`}>{headerName}</span>
                  {c.filter ? <div className="grid-custom-filter">{isValidElement(c.filter) && c.filter.type === 'input' ? <>
                    {cloneElement(c.filter as ReactElement<InputHTMLAttributes<HTMLInputElement>>, { list: suggestionId })}
                    <datalist id={suggestionId}>{columnSuggestions.map(value => <option key={value} value={value} />)}</datalist>
                  </> : c.filter}</div> : <div className="vt-filter-pair">
                    <select className="input grid-filter-operator" aria-label={`${headerName} filter operator`} value={op} onChange={e => setFilterOperators(f => ({ ...f, [c.key]: e.target.value as TextFilterOperator }))}>
                      {TEXT_FILTER_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {op !== 'empty' && <input className="input grid-filter-value" aria-label={`Filter value for ${headerName}`} placeholder="Enter the value" list={suggestionId}
                      value={columnFilters[c.key] ?? ''} onChange={e => setColumnFilters(f => ({ ...f, [c.key]: e.target.value }))}
                      aria-describedby={incomplete ? `${suggestionId}-incomplete` : undefined} />}
                    <datalist id={suggestionId}>{columnSuggestions.map(value => <option key={value} value={value} />)}</datalist>
                    {incomplete && <span className="hint vt-filter-incomplete" id={`${suggestionId}-incomplete`}>Not applied until a value is entered.</span>}
                  </div>}
                </div>
              );
            })}
          </div>
        </ToolbarCard>
      )}
      {showColumns && (
        // GUI-08: the hub's own column chooser on the framework Card; the framework ColumnsSelectionCard's search field cannot be named.
        <ToolbarCard anchor={columnsButton} width={320} label={`${caption ?? 'Table'} columns`} onClose={() => setShowColumns(false)}
          actions={close => <><Button type="tinted" text="Show all" onClick={() => setHidden({})} /><Button type="filled" text="Close" onClick={() => close(true)} /></>}>
          <div className="vt-columns-card">
            <label className="field"><span className="flabel">Search columns</span>
              <input className="input" type="search" value={columnSearch} onChange={e => setColumnSearch(e.target.value)} /></label>
            <ul className="vt-columns-list" aria-label="Columns shown">
              {columnMatches.map(c => {
                const on = !hidden[c.key];
                return <li key={c.key}><label className="check"><input type="checkbox" checked={on} disabled={on && lastVisible} onChange={e => setHidden(h => ({ ...h, [c.key]: !e.target.checked }))} /> {headerText(c)}</label></li>;
              })}
            </ul>
            {columnMatches.length === 0 && <p className="hint">No column matches “{columnSearch.trim()}”.</p>}
          </div>
        </ToolbarCard>
      )}
      {loading && <div className="vt-table-state"><StateMessage kind="loading" /></div>}
      {!loading && !!error && <div className="vt-table-state"><ErrorBox error={error} /></div>}
      {/* The header row stays visible above an empty table, as before; the empty-state text follows it. */}
      {!loading && !error && !!rows && (
        <div ref={scroller} className={`vt-table-scroll${overflowing ? ' is-overflowing' : ''}`}
          {...(overflowing && { tabIndex: 0, role: 'group', 'aria-label': `${caption ?? 'Table'}: scroll sideways for more columns` })}>
          <table id={tableId} className="grid vt-grid">
            {caption && <caption className="sr">{caption}</caption>}
            <thead>
              <tr>
                {hasDetails && <th scope="col" className="col-disclose"><span className="sr">Details</span></th>}
                {visibleCols.map(c => {
                  const s = sortState(c);
                  const name = headerText(c);
                  return (
                    <th key={c.key} scope="col" className={['vt-th', cellClass(c)].filter(Boolean).join(' ')}
                      aria-sort={s.sortable && s.active ? (s.desc ? 'descending' : 'ascending') : undefined}>
                      {s.sortable
                        ? <button type="button" className="grid-sort" data-sort-key={c.key} onClick={() => toggleSort(c)}>
                          <span className="grid-heading-label">{name}</span>
                          <span className={`grid-sort-indicator${s.active ? '' : ' grid-sort-muted'}`} aria-hidden="true"><VtIcon icon={s.active && s.desc ? 'ARROWDOWN' : 'ARROWUP'} size={16} /></span>
                        </button>
                        : name ? <span className="grid-heading-label">{name}</span> : <span className="sr">Actions</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map(x => {
                const key = String(rowKey(x.r));
                const open = !!expanded[key];
                const detailsId = `${tableId}-details-${key.replace(/[^\w-]/g, '_')}`;
                const identity = x.text[visibleCols.find(c => headerText(c))?.key ?? ''] || 'this row';
                return (
                  <Fragment key={key}>
                    <tr className={`vt-row${open ? ' is-open' : ''}`} onClick={openRow}>
                      {hasDetails && <td className="col-disclose">
                        <button type="button" className="row-disclose" aria-expanded={open} aria-controls={open ? detailsId : undefined} aria-label={`Details for ${identity}`}
                          onClick={() => setExpanded(e => ({ ...e, [key]: !open }))}><VtIcon icon={open ? 'ARROWUP' : 'ARROWDOWN'} size={16} /></button>
                      </td>}
                      {/* The hidden space keeps cell texts apart in the row's text (row search, copy and paste). */}
                      {visibleCols.map(c => <td key={c.key} className={cellClass(c)}><span className="vt-cell" data-col={c.key} style={cellStyle(c)}>{c.render(x.r)}</span><span className="sr"> </span></td>)}
                    </tr>
                    {hasDetails && open && (
                      <tr className="row-details" id={detailsId}>
                        <td colSpan={colSpan}>
                          <dl className="row-details-list">
                            {secondaryCols.map(c => <div key={c.key}><dt>{headerText(c) || 'Actions'}</dt><dd>{c.render(x.r)}</dd></div>)}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="sr" role="status" aria-live="polite">{announce}</div>
      {!loading && !error && rows?.length === 0 && <div className="vt-table-state"><StateMessage kind={empty} /></div>}
      {hasRows && shown.length === 0 && <div className="vt-table-state"><StateMessage kind="nomatch" /></div>}
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
  if (!canDeletePath(me, path)) return null;
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
  const me = useMe().data;
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
  const canCascade = canDeletePath(me, path) && !!d &&
    d.delete.filter(g => g.main).every(g => hasPermission(me, resourceForRecord(g.type), 'Delete')) &&
    d.unlink.filter(g => g.main).every(g => hasPermission(me, resourceForRecord(g.type), 'Maintain'));
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
                          {it.deletePath && canDeletePath(me, it.deletePath) && <button className="linkbtn danger-link" disabled={itemBusy !== null} onClick={() => deleteItem(g, it)} aria-label={`Delete ${it.label}`}>{itemBusy === key ? 'Deleting…' : 'Delete'}</button>}
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
      {hasDeps && !canCascade && <p className="notice">Deleting this structure needs Delete permission for each affected record type and Edit permission for records that will be unlinked.</p>}
      {error && <div className="notice bad" role="alert">{error}</div>}
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        {d && hasDeps
          ? <button className="btn btn-danger" disabled={busy || !understood || !canCascade} onClick={goAll}>{busy ? 'Deleting…' : `Delete everything (${d.total + 1})`}</button>
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

export function Checkbox({ label: l, checked, onChange, hint, disabled }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) {
  return (
    <div className="field">
      <label className="check"><input type="checkbox" disabled={disabled} checked={checked} onChange={e => onChange(e.target.checked)} /> {l}</label>
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

/** VtWebGuiFramework TabBar: tab list semantics, aria-selected and arrow-key navigation come with the framework (v4). */
export function Tabs({ tabs, value, onChange }: { tabs: { key: string; label: ReactNode }[]; value: string; onChange: (k: string) => void }) {
  // UX-004: the framework TabBar's scroll arrows (helpers/scrollButton) are icon-only role="button" elements without a name, and the
  // vendored source stays unmodified. They are named here by their side of the tab row; they appear only while the tabs overflow.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // TabBar renders each arrow only while it can scroll that way (either may be alone): the side comes from its position.
    const name = () => {
      const box = el.getBoundingClientRect();
      el.querySelectorAll<HTMLElement>('[role="button"]').forEach(b => {
        if (b.closest('[role="tab"]')) return;
        const r = b.getBoundingClientRect();
        b.setAttribute('aria-label', r.left + r.width / 2 < box.left + box.width / 2 ? 'Scroll tabs left' : 'Scroll tabs right');
      });
    };
    name();
    const mo = new MutationObserver(name);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return (
    <div className="vt-tabs" ref={root}>
      <TabBar selectedId={value}>
        {tabs.map(t => <TabBarTitleItem key={t.key} id={t.key} title={nodeText(t.label)} selected={t.key === value} onClick={() => onChange(t.key)} />)}
      </TabBar>
    </div>
  );
}

export function DL({ items }: { items: [ReactNode, ReactNode][] }) {
  return <dl className="dl">{items.map(([k, v], i) => <div key={i} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v === null || v === undefined || v === '' ? <Unknown /> : v}</dd></div>)}</dl>;
}

export function When({ v }: { v?: string | null }) { return v ? <span className="nowrap">{fmtDateTime(v)}</span> : <span className="muted">—</span>; }
