import { useQueryClient } from '@tanstack/react-query';
import { cloneElement, createContext, Fragment, isValidElement, lazy, Suspense, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError, type UserRef } from '../api';
import { useMe, useReference } from '../hooks';
import { fmtDateTime, label } from '../format';
import { Icon } from './Icon';
import { canDeletePath, canExport } from '../rights';
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
  New: 'info', Triaged: 'info', Opened: 'info', Reopened: 'info', InProgress: 'warn', WaitingForCustomer: 'warn', PendingValidation: 'warn', Closed: 'good', Cancelled: 'neutral',
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

export type MenuItem = { label: ReactNode; to?: string; onClick?: () => void; danger?: boolean; hidden?: boolean; ariaLabel?: string };

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
          {shown.map((i, n) => <button key={n} role="menuitem" aria-label={i.ariaLabel} className={i.danger ? 'danger' : undefined} onClick={() => pick(i)}>{i.label}</button>)}
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
  /** Offered under Columns, but not shown until a person adds it. */
  defaultHidden?: boolean;
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
export function DataTable<T>({ columns, rows, rowKey, loading, error, empty = 'none', sort, onSort, caption, tools = true, exportName, pageSize: initialSize = 25, tableClassName, tableWrapClassName, columnsKey, selectable, search, totalCount, columnFilters: offerColumnFilters = true, details, fit }: {
  columns: Column<T>[]; rows?: T[]; rowKey: (r: T) => string | number; loading?: boolean; error?: unknown; empty?: EmptyKind;
  sort?: string; onSort?: (s: string) => void; caption?: string; tools?: boolean; exportName?: string; pageSize?: number; tableClassName?: string; tableWrapClassName?: string;
  /** Remembers this person's column choice in this browser under this name. */
  columnsKey?: string;
  /** Rows can be ticked for an action on several at once. On by default wherever the table has its toolbar. */
  selectable?: boolean;
  /** A102: the toolbar's search covers the whole list on the server, in place of the filter for the rows on this page. */
  search?: { value: string; onChange: (v: string) => void; label: string; placeholder?: string };
  /** A server list's number of matching records over all its pages. */
  totalCount?: number;
  /** False leaves out the Filter card, where the page has filters of its own. */
  columnFilters?: boolean;
  /** A102: secondary information of a record, shown when its row is expanded. */
  details?: (r: T) => ReactNode;
  /** The table takes the panel's width and wraps its text, instead of scrolling sideways. */
  fit?: boolean;
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
  const defaultColumns = () => Object.fromEntries(columns.filter(c => c.defaultHidden).map(c => [c.key, true]));
  const [hidden, setHiddenState] = useState<Record<string, boolean>>(() => {
    let saved: Record<string, boolean> = {};
    try { saved = columnsKey ? JSON.parse(localStorage.getItem(`vt-columns:${columnsKey}`) ?? '{}') : {}; } catch { /* a damaged choice falls back to the defaults */ }
    return { ...defaultColumns(), ...saved };
  });
  const setHidden = (next: Record<string, boolean> | ((h: Record<string, boolean>) => Record<string, boolean>)) => setHiddenState(h => {
    const value = typeof next === 'function' ? next(h) : next;
    try { if (columnsKey) localStorage.setItem(`vt-columns:${columnsKey}`, JSON.stringify(value)); } catch { /* private browsing: the choice lasts for this page */ }
    return value;
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [announce, setAnnounce] = useState('');
  const phone = usePhone();
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [bulkDelete, setBulkDelete] = useState(false);
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
  const exportRows = (list = sorted) => downloadCsv(exportName ?? caption ?? document.title.split(' · ')[0] ?? 'table', textCols.map(c => headerText(c)),
    list.map(x => textCols.map(c => x.text[c.key] ?? '')));
  const canSelect = (selectable ?? tools) && !phone;
  const selected = canSelect ? sorted.filter(x => ticked[String(rowKey(x.r))]) : [];
  const allShownTicked = shown.length > 0 && shown.every(x => ticked[String(rowKey(x.r))]);
  const someShownTicked = shown.some(x => ticked[String(rowKey(x.r))]);
  const setShownTicked = (on: boolean) => setTicked(t => { const next = { ...t }; for (const x of shown) { const k = String(rowKey(x.r)); if (on) next[k] = true; else delete next[k]; } return next; });
  // A row can be deleted here if it offers Delete itself: the same rule, right and record.
  const deletable = selected.map(x => { for (const c of columns) { const d = findDeleteAction(c.render(x.r)); if (d && canDeletePath(me, d.path)) return d; } return null; }).filter((d): d is DeleteTarget => !!d);
  const visibleCols = columns.filter(c => !hidden[c.key]);
  const primary = useMemo(() => primaryKeys(columns), [columns]);
  const secondaryCols = visibleCols.filter(c => !primary.has(c.key));
  const hasDetails = !!details || (phone && secondaryCols.length > 0);
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

  // Ease of use: a click anywhere on a row opens its record: the row's first link, passing over a client link in a column of its own, because
  // that row is about something else (a ticket, a commitment). A list of clients has no other link, so it still opens the client. Links, buttons and fields keep their own behaviour.
  const openRow = (event: React.MouseEvent<HTMLTableRowElement>) => {
    const t = event.target as HTMLElement;
    if (t.closest('a,button,[role="button"],input,select,textarea,label,summary,details') || window.getSelection()?.toString()) return;
    const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]')];
    const a = links.find(l => !l.closest('.client-display')) ?? links[0];
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
  const showTools = tools && !error && (hasRows || hadRows.current || !!search);
  const total = rows?.length ?? 0;
  const clearFilters = () => { setColumnFilters({}); setFilterOperators({}); };
  // Unnamed columns hold the row actions: they stay at the right edge while the table scrolls sideways (GUI-11). UX-002: the first named
  // column identifies the record and stays at the left edge, so a row scrolled sideways on a tablet still says which record it is.
  const identityKey = visibleCols.find(c => headerText(c))?.key;
  const cellClass = (c: Column<T>) => [c.className, primary.has(c.key) ? undefined : 'col-secondary', headerText(c) ? undefined : 'col-actions', c.key === identityKey ? 'col-identity' : undefined].filter(Boolean).join(' ') || undefined;
  // On the cell's content: browsers ignore max-width on the cells of an auto-layout table.
  const cellStyle = (c: Column<T>) => (c.maxWidth ? { maxWidth: c.maxWidth } : undefined);
  const columnMatches = columns.filter(c => (headerText(c) || c.key).toLowerCase().includes(columnSearch.trim().toLowerCase()) && headerText(c));
  const colSpan = visibleCols.length + (hasDetails ? 1 : 0) + (canSelect ? 1 : 0);
  return (
    <div className={`panel vt-table${tableWrapClassName ? ` ${tableWrapClassName}` : ''}${tableClassName ? ` ${tableClassName}` : ''}`}
      role="region" aria-label={caption ?? 'Table'} data-vt-table={tableId}>
      {showTools && (
        <div className="vt-table-toolbar">
          <Toolbar alignItems="center" paddingTop="xs" paddingBottom="xs" paddingLeft="normal" paddingRight="normal">
            <ToolbarContrItem columnGap="small" alignItems="center">
              {search ? <input className="input table-search table-search-all" type="search" value={search.value} onChange={e => search.onChange(e.target.value)} placeholder={search.placeholder ?? search.label} aria-label={search.label} />
                : <><input className="input table-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={server ? 'Filter this page…' : 'Filter rows…'}
                  aria-label={server ? 'Filter rows on this page only' : 'Filter rows'} aria-describedby={server ? `${tableId}-scope` : undefined} />
                  {server && <span id={`${tableId}-scope`} className="sr-only">Only the rows loaded on this page are filtered; other pages are not searched.</span>}</>}
              <span className="muted table-count" aria-live="polite">{loading ? 'Loading…' : search && totalCount !== undefined && !activeFilters ? <>{totalCount} {search.value.trim() ? (totalCount === 1 ? 'match' : 'matches') : (totalCount === 1 ? 'row' : 'rows')}</> : <>{needle || activeFilters ? `${sorted.length} of ${total}` : `${total}`} row{total === 1 ? '' : 's'}{server && (needle || activeFilters) ? ' on this page' : ''}</>}</span>
            </ToolbarContrItem>
            <ToolbarContrItem justifySelf="end" columnGap="small" alignItems="center">
              {offerColumnFilters && <Button ref={filterButton as never} type="bare" icon={activeFilters ? 'FILTERACTIVE' : 'FILTER'} text={activeFilters ? `Filter (${activeFilters})` : 'Filter'}
                onClick={() => { setShowColumns(false); setShowFilters(v => !v); }} />}
              <Button ref={columnsButton as never} type="bare" icon="COLUMNSELECT" text="Columns" onClick={() => { setShowFilters(false); setColumnSearch(''); setShowColumns(v => !v); }} />
              {canExport(me) && <Button type="bare" icon="EXPORT" text="Export CSV" onClick={() => exportRows()} />}
            </ToolbarContrItem>
          </Toolbar>
        </div>
      )}
      {selected.length > 0 && <div className="vt-bulk" role="group" aria-label={`Action on selected rows of ${caption ?? 'this table'}`}>
        <b>{selected.length} selected</b>
        {canExport(me) && <button type="button" className="linkbtn" onClick={() => exportRows(selected)}>Export selected</button>}
        {deletable.length > 0 && <button type="button" className="linkbtn danger-link" onClick={() => setBulkDelete(true)}>Delete selected{deletable.length < selected.length ? ` (${deletable.length})` : ''}</button>}
        <button type="button" className="linkbtn" onClick={() => setTicked({})}>Clear selection</button>
      </div>}
      {bulkDelete && <Suspense fallback={null}><BulkDelete items={deletable} onClose={() => setBulkDelete(false)} onDone={() => setTicked({})} /></Suspense>}
      {showFilters && (
        <ToolbarCard anchor={filterButton} width={500} label={`${caption ?? 'Table'} filters`} onClose={() => setShowFilters(false)}
          actions={close => <><Button type="tinted" text="Clear" onClick={clearFilters} /><Button type="filled" text="Close" onClick={() => close(true)} /></>}>
          <div className="vt-filter-card">
            {server && <p className="hint">Text conditions filter the rows on this page only. A list or search of its own, such as Status or a search field, covers the whole list.</p>}
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
          actions={close => <><Button type="tinted" text="Show all" onClick={() => setHidden(Object.fromEntries(columns.map(c => [c.key, false])))} />{columns.some(c => c.defaultHidden) && <Button type="tinted" text="Reset" onClick={() => setHidden(defaultColumns())} />}<Button type="filled" text="Close" onClick={() => close(true)} /></>}>
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
          <table id={tableId} className={`grid vt-grid${details ? ' has-details' : ''}${fit || details ? ' fit' : ''}`}>
            {caption && <caption className="sr">{caption}</caption>}
            <thead>
              <tr>
                {hasDetails && <th scope="col" className="col-disclose"><span className="sr">Details</span></th>}
                {canSelect && <th scope="col" className="col-select"><input type="checkbox" aria-label="Select all rows shown" checked={allShownTicked}
                  ref={el => { if (el) el.indeterminate = someShownTicked && !allShownTicked; }} onChange={e => setShownTicked(e.target.checked)} /></th>}
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
                    <tr className={`vt-row${open ? ' is-open' : ''}${ticked[key] && canSelect ? ' is-selected' : ''}`} onClick={openRow}>
                      {canSelect && <td className="col-select"><input type="checkbox" aria-label={`Select ${identity}`} checked={!!ticked[key]} onChange={e => setTicked(t => { const next = { ...t }; if (e.target.checked) next[key] = true; else delete next[key]; return next; })} /></td>}
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
                          {phone && secondaryCols.length > 0 && <dl className="row-details-list">
                            {secondaryCols.map(c => <div key={c.key}><dt>{headerText(c) || 'Actions'}</dt><dd>{c.render(x.r)}</dd></div>)}
                          </dl>}
                          {details?.(x.r)}
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
      {hasRows && shown.length === 0 && <div className="vt-table-state"><StateMessage kind="nomatch" />{server && <p className="hint">Only this page was filtered. Other pages may have matching rows.</p>}</div>}
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
export type DeleteTarget = { path: string; what: string };
const BulkDelete = lazy(() => import('./BulkDelete').then(m => ({ default: m.BulkDelete })));

/** The Delete a row offers, found in what its cell renders. */
function findDeleteAction(node: ReactNode): DeleteTarget | null {
  if (Array.isArray(node)) { for (const n of node) { const d = findDeleteAction(n); if (d) return d; } return null; }
  if (!isValidElement(node)) return null;
  const props = node.props as { path?: string; what?: string; children?: ReactNode };
  if (node.type === DeleteAction && props.path && props.what) return { path: props.path, what: props.what };
  return findDeleteAction(props.children);
}

/** A102: a row's actions behind one small button. The list is fixed to the window, so a scrolling table cannot cut it off. */
function RowMenu({ what, items }: { what: string; items: MenuItem[] }) {
  const [at, setAt] = useState<CSSProperties | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!at) return;
    list.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const away = (e: Event) => { if (!list.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setAt(null); };
    const moved = () => setAt(null);
    document.addEventListener('mousedown', away);
    window.addEventListener('scroll', moved, true);
    window.addEventListener('resize', moved);
    return () => { document.removeEventListener('mousedown', away); window.removeEventListener('scroll', moved, true); window.removeEventListener('resize', moved); };
  }, [at]);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (at) { setAt(null); return; }
    const r = button.current!.getBoundingClientRect();
    const up = r.bottom + 90 > window.innerHeight;
    setAt({ position: 'fixed', right: window.innerWidth - r.right, left: 'auto', ...(up ? { top: 'auto', bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  };
  const keys = (e: React.KeyboardEvent) => {
    const all = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const n = all.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') { setAt(null); button.current?.focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); all[(n + 1) % all.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); all[(n - 1 + all.length) % all.length]?.focus(); }
  };
  return (
    <>
      <button ref={button} type="button" className="row-menu-btn" aria-haspopup="menu" aria-expanded={!!at} aria-label={`Actions for ${what}`} onClick={toggle}><span aria-hidden="true">⋯</span></button>
      {at && createPortal(<div ref={list} className="menu-list" role="menu" aria-label={`Actions for ${what}`} style={at} onKeyDown={keys} onClick={e => e.stopPropagation()}>
        {items.map((i, n) => <button key={n} type="button" role="menuitem" aria-label={i.ariaLabel} className={i.danger ? 'danger' : undefined} onClick={() => { setAt(null); i.onClick?.(); }}>{i.label}</button>)}
      </div>, document.body)}
    </>
  );
}

/** A37, A102: Delete sits in a small actions menu, with its confirmation; shown only with the Delete records right. On a page (`button`) it is in the More menu, with any `more` actions. */
export function DeleteAction({ path, what, onDone, button, afterTo, more = [] }: { path: string; what: string; onDone?: () => void; button?: boolean; afterTo?: string; more?: MenuItem[] }) {
  const me = useMe().data;
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const can = canDeletePath(me, path);
  if (!can && !more.some(i => !i.hidden)) return null;
  const item: MenuItem = { label: button ? 'Delete…' : 'Delete', danger: true, hidden: !can, ariaLabel: `Delete ${what}`, onClick: () => setOpen(true) };
  return (
    <>
      {button ? <Menu label="More" items={[...more, item]} /> : <RowMenu what={what} items={[item]} />}
      {open && <ConfirmDelete path={path} what={what} onClose={() => setOpen(false)} onDone={() => { onDone?.(); if (afterTo) nav(afterTo, { replace: true }); }} />}
    </>
  );
}

/** A43: record kinds that can be deleted together with everything that belongs to them. */
export const CASCADE_KINDS = ['clients', 'regions', 'environments', 'projects', 'contracts', 'assets', 'installations', 'components', 'cases', 'commitments', 'escalations', 'teams'];
type DepItem = { id: number; label: string; link?: string | null; deletePath?: string | null };
type DepGroup = { type: string; label: string; count: number; unlinked: boolean; main: boolean; items: DepItem[] };
export type DeletePreview = { label: string; total: number; delete: DepGroup[]; unlink: DepGroup[] };
export const errText = (e: unknown) => (e instanceof ApiError ? [e.detail ?? e.title, ...Object.values(e.errors ?? {}).flat()].join(' ') : (e as Error).message);

/** The dialog comes with its first use, to keep the first download small. */
const ConfirmDeleteDialog = lazy(() => import('./ConfirmDelete').then(m => ({ default: m.ConfirmDelete })));
export function ConfirmDelete(props: { path: string; what: string; onClose: () => void; onDone?: () => void }) {
  return <Suspense fallback={null}><ConfirmDeleteDialog {...props} /></Suspense>;
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
