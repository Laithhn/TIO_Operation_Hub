import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { del, get, post, qs } from '../api';
import { fmtDate, fmtDateTime, fmtMoney } from '../format';
import { useDebounced, useUrlState } from '../hooks';
import { Icon } from '../ui/Icon';
import { Badge, Checkbox, DataTable, PageHead, Pager, StateMessage, Tabs, useToast, type Column } from '../ui/kit';
import { ClientDisplay } from '../ui/ClientLogo';
import { buildSections, chipOf, entityOf, relativeTime, severityOf, type Entry, type Notice, type NoticePage } from './notificationModel';
import './Notifications.css';

/**
 * A38: the notifications center — assignments, due and overdue work, contract renewals and payments, for every role.
 * A72: severity sections (critical, action required, informational, resolved), grouped related alerts, contextual actions, relative times,
 * and read state kept apart from business resolution (an alert is resolved by the server when its condition clears, never by reading it).
 */

function When({ iso }: { iso: string }) {
  const rel = relativeTime(iso);
  return <time dateTime={iso} title={fmtDateTime(iso)}>{rel ?? fmtDate(iso)}</time>;
}

function useNoticeActions() {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  // Read state changes are idempotent on the server; failures are reported and the lists reloaded from the server.
  const run = async (f: () => Promise<unknown>, failure: string) => { try { await f(); } catch { toast(failure, true); } finally { await refresh(); } };
  return {
    read: (n: Notice) => n.readAt ? Promise.resolve() : run(() => post(`/notifications/${n.id}/read`), 'The notification could not be marked as read.'),
    readMany: (list: Notice[]) => {
      const ids = list.filter(n => !n.readAt).map(n => n.id);
      return ids.length ? run(() => post('/notifications/read', { ids }), 'The notifications could not be marked as read.') : Promise.resolve();
    },
    readAll: () => run(() => post('/notifications/read-all'), 'The notifications could not be marked as read.'),
    remove: (n: Notice) => run(() => del(`/notifications/${n.id}`), 'The notification could not be deleted.')
  };
}

/** One notice: icon, title, description, source and time, status chip (text, not colour alone), unread dot and its action. */
function NoticeCard({ n, onOpen, extra, nested }: { n: Notice; onOpen: (n: Notice) => void; extra?: React.ReactNode; nested?: boolean }) {
  const sev = n.resolvedAt ? 'resolved' : severityOf(n);
  const e = entityOf(n);
  const unread = !n.readAt && !n.resolvedAt;
  return (
    <div className={`ntf ntf-${sev}${unread ? ' unread' : ''}${nested ? ' nested' : ''}`} data-notice={n.id}>
      <span className="ntf-dot" aria-hidden="true" />
      {!nested && <span className="ntf-icon" aria-hidden="true"><Icon name={e.icon} size={18} /></span>}
      <div className="ntf-main">
        <div className="ntf-title">{n.title}</div>
        {n.body && <div className="ntf-body">{n.body}</div>}
        <div className="ntf-meta">{!nested && <>{e.source} · </>}<When iso={n.createdAt} />{unread && <span className="sr"> · Unread</span>}</div>
      </div>
      <div className="ntf-side">
        <span className="ntf-chip">{chipOf(n)}</span>
        {n.link ? <button type="button" className="ntf-act" onClick={() => onOpen(n)} aria-label={`${e.action}: ${n.title}`}>{e.action}</button>
          : unread && <button type="button" className="ntf-act" onClick={() => onOpen(n)}>Mark as read</button>}
        {extra}
      </div>
    </div>
  );
}

/** Related alerts as one card ("2 overdue commitments"); expanding shows each one with its own state and action. */
function GroupCard({ g, onOpen, onReadAll, extra }: { g: Extract<Entry, { type: 'group' }>; onOpen: (n: Notice) => void; onReadAll: (l: Notice[]) => void; extra?: (n: Notice) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const first = g.notices[0];
  const e = entityOf(first);
  const unread = g.notices.filter(n => !n.readAt).length;
  const sev = severityOf(first);
  const id = `ntf-g-${first.id}`;
  return (
    <div className={`ntf-group ntf-${sev}${unread ? ' unread' : ''}`}>
      <div className="ntf">
        <span className="ntf-dot" aria-hidden="true" />
        <span className="ntf-icon" aria-hidden="true"><Icon name={e.icon} size={18} /></span>
        <div className="ntf-main">
          <div className="ntf-title">{g.title}</div>
          {g.body && <div className="ntf-body">{g.body}</div>}
          <div className="ntf-meta">{e.source} · <When iso={first.createdAt} />{unread > 0 && <span className="sr"> · {unread} unread</span>}</div>
        </div>
        <div className="ntf-side">
          <span className="ntf-chip">{chipOf(first)}</span>
          <button type="button" className="ntf-act" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>{open ? 'Hide' : `View ${e.plural}`} ({g.notices.length})</button>
        </div>
      </div>
      {open && (
        <div className="ntf-members" id={id}>
          {g.notices.map(n => <NoticeCard key={n.id} n={n} onOpen={onOpen} nested extra={extra?.(n)} />)}
          {unread > 0 && <button type="button" className="linkbtn ntf-group-read" onClick={() => onReadAll(g.notices)}>Mark these {g.notices.length} as read</button>}
        </div>
      )}
    </div>
  );
}

function NoticeSections({ items, onOpen, onReadAll, extra }: { items: Notice[]; onOpen: (n: Notice) => void; onReadAll: (l: Notice[]) => void; extra?: (n: Notice) => React.ReactNode }) {
  return (
    <>
      {buildSections(items).map(s => (
        <section key={s.key} className={`ntf-section ntf-sec-${s.key}`} aria-label={s.label}>
          <h3 className="ntf-sec-head"><Icon name={s.icon} size={16} /> {s.label}</h3>
          {s.entries.map(en => en.type === 'one'
            ? <NoticeCard key={en.notice.id} n={en.notice} onOpen={onOpen} extra={extra?.(en.notice)} />
            : <GroupCard key={en.key} g={en} onOpen={onOpen} onReadAll={onReadAll} extra={extra} />)}
        </section>
      ))}
    </>
  );
}

type Filter = 'all' | 'unread' | 'critical';
const EMPTY: Record<Filter, string> = {
  all: 'No notifications yet.', unread: "You're all caught up. No unread notifications.", critical: 'Nothing critical or overdue right now.'
};
const filterQuery = (f: Filter) => f === 'unread' ? { unread: true } : f === 'critical' ? { severity: 'critical', state: 'open' } : {};

/** Keyboard support for a row of tabs: arrow keys, Home and End move between them (WAI-ARIA tabs pattern). */
function tabKeys(e: ReactKeyboardEvent<HTMLDivElement>) {
  const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
  const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
  if (next === null || i < 0) return;
  e.preventDefault();
  const t = tabs[(next + tabs.length) % tabs.length];
  t.focus(); t.click();
}

/** Header bell: unread count (checked every minute) and the notices by severity. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const nav = useNavigate();
  const act = useNoticeActions();
  const [busy, setBusy] = useState(false);
  const count = useQuery({ queryKey: ['notifications', 'count'], queryFn: () => get<{ count: number }>('/notifications/unread-count'), refetchInterval: 60_000, refetchOnWindowFocus: true });
  const list = useQuery({ queryKey: ['notifications', 'pop', filter], queryFn: () => get<NoticePage>(`/notifications${qs({ ...filterQuery(filter), sort: 'severity', pageSize: 50 })}`), enabled: open });
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    root.current?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus();
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  // The list's counters are fresher than the bell's minute check while the pop-up is open.
  const n = list.data?.unreadCount ?? count.data?.count ?? 0;
  const critical = list.data?.criticalCount;
  const openNotice = async (x: Notice) => {
    if (x.link) setOpen(false);
    await act.read(x);
    if (x.link) nav(x.link);
  };
  const readAll = async () => { setBusy(true); try { await act.readAll(); } finally { setBusy(false); } };
  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'unread', label: `Unread (${n})` }, { key: 'critical', label: critical === undefined ? 'Critical' : `Critical (${critical})` }
  ];
  const d = list.data;
  return (
    <div className="bell" ref={root}>
      <button ref={btn} className="hdr-btn bell-btn" onClick={() => setOpen(o => !o)} aria-haspopup="dialog" aria-expanded={open} aria-label={n ? `Notifications, ${n} unread` : 'Notifications'} title="Notifications">
        <Icon name="bell" size={18} />{n > 0 && <span className="bell-count" aria-hidden="true">{n > 99 ? '99+' : n}</span>}
      </button>
      {open && (
        <div className="bell-pop ntf-pop" role="dialog" aria-label="Notifications">
          <div className="ntf-head">
            <h2>Notifications</h2>
            {n > 0 && <span className="ntf-count" aria-label={`${n} unread`}>{n > 99 ? '99+' : n}</span>}
            <button type="button" className="linkbtn ntf-readall" onClick={readAll} disabled={n === 0 || busy}>{busy ? 'Marking…' : 'Mark all as read'}</button>
          </div>
          <div className="ntf-tabs" role="tablist" aria-label="Show" onKeyDown={tabKeys}>
            {tabs.map(t => <button key={t.key} type="button" role="tab" aria-selected={filter === t.key} tabIndex={filter === t.key ? 0 : -1} onClick={() => setFilter(t.key)}>{t.label}</button>)}
          </div>
          <div className="ntf-list" role="tabpanel" aria-label={tabs.find(t => t.key === filter)!.label} aria-busy={list.isFetching}>
            {list.isLoading && <div className="state-msg"><span className="spin" /> Loading…</div>}
            {list.isError && <div className="state-msg ntf-error" role="alert">Notifications could not be loaded. <button type="button" className="linkbtn" onClick={() => list.refetch()}>Try again</button></div>}
            {d && d.items.length === 0 && <div className="state-msg ntf-empty">{EMPTY[filter]}</div>}
            {d && <NoticeSections items={d.items} onOpen={openNotice} onReadAll={act.readMany} />}
            {d && d.totalCount > d.items.length && <p className="hint ntf-more">{d.totalCount - d.items.length} more in the notifications center.</p>}
          </div>
          <div className="bell-foot"><Link to="/notifications" onClick={() => setOpen(false)}><Icon name="list" size={16} /> Open the notifications center</Link></div>
        </div>
      )}
    </div>
  );
}

type Payment = {
  id: number; contractId: number; contractRef: string; contractTitle: string; clientId: number; clientCode: string; owner?: string | null; condition: string;
  percentage?: number | null; amount?: number | null; currency?: string | null; dueDate?: string | null; status: string; paidOn?: string | null; state: string; daysToDue?: number | null;
};
type PayPart = { count: number; amounts: { currency: string; amount: number }[] };
type PaymentPage = { items: Payment[]; totalCount: number; summary: { reminderDays: number; overdue: PayPart; due: PayPart; upcoming: PayPart } };
const PAY_TONE: Record<string, { label: string; tone: 'bad' | 'warn' | 'info' | 'good' | 'neutral' }> = {
  overdue: { label: 'Overdue', tone: 'bad' }, due: { label: 'Due soon', tone: 'warn' }, upcoming: { label: 'Scheduled', tone: 'info' },
  paid: { label: 'Paid', tone: 'good' }, waived: { label: 'Waived', tone: 'neutral' }, closed: { label: 'Contract terminated', tone: 'neutral' }
};
const sumText = (p: PayPart) => p.amounts.map(a => fmtMoney(a.amount, a.currency)).join(' + ');

function dueText(p: Payment) {
  if (p.daysToDue === null || p.daysToDue === undefined) return '';
  if (p.state === 'paid' || p.state === 'waived') return '';
  if (p.daysToDue < 0) return `${-p.daysToDue} day(s) late`;
  return p.daysToDue === 0 ? 'today' : `in ${p.daysToDue} day(s)`;
}

/** A50: the Payments tab — contract payments by state, with the payment reminders below. */
function PaymentsTab({ state, mine, onState, onMine }: { state: string; mine: boolean; onState: (s: string) => void; onMine: (v: boolean) => void }) {
  const q = useQuery({ queryKey: ['payments', state, mine], queryFn: () => get<PaymentPage>(`/payments${qs({ state, mine: mine || undefined, pageSize: 200 })}`) });
  const s = q.data?.summary;
  const STATES = [
    { key: 'attention', label: `Overdue and due${s ? ` (${s.overdue.count + s.due.count})` : ''}` },
    { key: 'overdue', label: `Overdue${s ? ` (${s.overdue.count})` : ''}` },
    { key: 'due', label: `Due within ${s?.reminderDays ?? 14} days${s ? ` (${s.due.count})` : ''}` },
    { key: 'open', label: 'All open' }, { key: 'paid', label: 'Paid' }
  ];
  const cols: Column<Payment>[] = [
    { key: 'due', header: 'Due', render: p => <span className="nowrap">{fmtDate(p.dueDate) || <span className="muted">No date</span>}<span className="hint pay-sub">{dueText(p)}</span></span> },
    { key: 'contract', header: 'Contract', render: p => <><Link to={`/contracts/${p.contractId}`}>{p.contractRef}</Link><span className="hint pay-sub">{p.contractTitle}</span></> },
    { key: 'client', header: 'Client', render: p => <ClientDisplay id={p.clientId} code={p.clientCode} /> },
    { key: 'condition', header: 'Condition', render: p => <>{p.condition}{p.percentage !== null && p.percentage !== undefined && <span className="muted"> · {p.percentage} %</span>}</> },
    { key: 'amount', header: 'Amount', className: 'num', render: p => fmtMoney(p.amount, p.currency) },
    { key: 'status', header: 'Status', render: p => <>{p.status}{p.paidOn && <span className="hint pay-sub">paid {fmtDate(p.paidOn)}</span>}</> },
    { key: 'state', header: 'State', render: p => <Badge tone={PAY_TONE[p.state]?.tone ?? 'neutral'}>{PAY_TONE[p.state]?.label ?? p.state}</Badge> },
    { key: 'owner', header: 'Contract owner', render: p => p.owner ?? <span className="muted">Unassigned</span> }
  ];
  return (
    <>
      {s && (
        <div className="kpis pay-kpis">
          <div className={`pay-kpi${s.overdue.count ? ' bad' : ''}`}><b>{s.overdue.count}</b><span>overdue</span>{s.overdue.amounts.length > 0 && <small>{sumText(s.overdue)}</small>}</div>
          <div className={`pay-kpi${s.due.count ? ' warn' : ''}`}><b>{s.due.count}</b><span>due within {s.reminderDays} days</span>{s.due.amounts.length > 0 && <small>{sumText(s.due)}</small>}</div>
          <div className="pay-kpi"><b>{s.upcoming.count}</b><span>scheduled later</span>{s.upcoming.amounts.length > 0 && <small>{sumText(s.upcoming)}</small>}</div>
        </div>
      )}
      <section className="panel">
        <div className="panel-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Contract payments</h2>
          <div className="seg" role="group" aria-label="Payment state">
            {STATES.map(x => <button key={x.key} aria-pressed={x.key === state} onClick={() => onState(x.key)}>{x.label}</button>)}
          </div>
          <span style={{ marginLeft: 'auto' }}><Checkbox label="Only contracts I own" checked={mine} onChange={onMine} /></span>
        </div>
        <DataTable columns={cols} rows={q.data?.items} rowKey={p => p.id} loading={q.isLoading} error={q.error} exportName="contract-payments" />
        <p className="hint" style={{ padding: '0 12px 10px', margin: 0 }}>Payments are recorded on each contract under <i>Payment terms</i>. Reminders are sent to the contract owner and the TIO Managers {s?.reminderDays ?? 14} days ahead and when a payment becomes overdue.</p>
      </section>
    </>
  );
}

export function NotificationsPage() {
  const [f, set] = useUrlState({ show: 'all', severity: '', status: '', q: '', state: 'attention', mine: '', page: '1', pageSize: '25' });
  const payments = f.show === 'payments';
  const [text, setText] = useState(f.q);
  const dq = useDebounced(text);
  useEffect(() => { if (dq !== f.q) set({ q: dq, page: '1' }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  const params = {
    unread: f.show === 'unread' ? true : undefined, category: payments ? 'payments' : undefined,
    severity: f.show === 'critical' ? 'critical' : f.severity || undefined, state: f.show === 'critical' ? 'open' : f.status || undefined,
    q: f.q || undefined, sort: 'severity', page: f.page, pageSize: f.pageSize
  };
  const q = useQuery({ queryKey: ['notifications', 'page', params], queryFn: () => get<NoticePage>(`/notifications${qs(params)}`) });
  const act = useNoticeActions();
  const nav = useNavigate();
  const openNotice = async (x: Notice) => { await act.read(x); if (x.link) nav(x.link); };
  const d = q.data;
  const filtered = !!(f.q || f.severity || f.status);
  const tools = (x: Notice) => <span className="ntf-row-actions">
    {!x.readAt && !x.resolvedAt && <button type="button" className="linkbtn" onClick={() => act.read(x)} aria-label={`Mark as read: ${x.title}`}>Mark as read</button>}
    <button type="button" className="linkbtn danger-link" onClick={() => act.remove(x)} aria-label={`Delete notification ${x.title}`}>Delete</button>
  </span>;
  return (
    <>
      <PageHead title="Notifications" sub="Work assigned to you, due and overdue cases, commitments and escalations, contracts that need a renewal decision and contract payments coming due. Alerts are resolved automatically when their cause is cleared; read and resolved notices are cleared after 90 days."
        actions={d && d.unreadCount > 0 && <button className="btn" onClick={act.readAll}>Mark all as read ({d.unreadCount})</button>} />
      <Tabs value={f.show} onChange={v => set({ show: v, page: '1' })} tabs={[{ key: 'all', label: 'All' }, { key: 'unread', label: `Unread${d ? ` (${d.unreadCount})` : ''}` },
        { key: 'critical', label: `Critical${d?.criticalCount !== undefined ? ` (${d.criticalCount})` : ''}` },
        { key: 'payments', label: `Payments${d?.unreadPayments ? ` (${d.unreadPayments} unread)` : ''}` }]} />
      {payments && <PaymentsTab state={f.state} mine={f.mine === '1'} onState={s => set({ state: s })} onMine={v => set({ mine: v ? '1' : '' })} />}
      {payments && <h2 className="band-title" style={{ margin: '18px 0 8px' }}>Payment reminders</h2>}
      <div className="toolbar ntf-filters">
        <label className="field"><span className="flabel">Search</span>
          <input className="input" type="search" value={text} onChange={e => setText(e.target.value)} placeholder="Title, reference or description" aria-label="Search notifications" maxLength={100} /></label>
        {f.show !== 'critical' && <label className="field"><span className="flabel">Importance</span>
          <select className="input" value={f.severity} onChange={e => set({ severity: e.target.value, page: '1' })} aria-label="Filter by importance">
            <option value="">All</option><option value="critical">Critical / overdue</option><option value="action">Action required</option><option value="info">Informational</option>
          </select></label>}
        {f.show !== 'critical' && <label className="field"><span className="flabel">Business state</span>
          <select className="input" value={f.status} onChange={e => set({ status: e.target.value, page: '1' })} aria-label="Filter by business state">
            <option value="">Open and resolved</option><option value="open">Open</option><option value="resolved">Resolved</option>
          </select></label>}
      </div>
      <div className="panel notice-page ntf-page">
        {q.isLoading && <StateMessage kind="loading" />}
        {q.isError && <StateMessage kind="error">Notifications could not be loaded. <button className="linkbtn" onClick={() => q.refetch()}>Try again</button></StateMessage>}
        {d && d.items.length === 0 && <StateMessage kind={filtered ? 'nomatch' : 'none'}>{filtered ? 'No notifications match these filters.' : f.show === 'unread' ? "You're all caught up. No unread notifications." : f.show === 'critical' ? 'Nothing critical or overdue right now.' : payments ? 'No payment reminders yet.' : 'No notifications yet.'}</StateMessage>}
        {d && <NoticeSections items={d.items} onOpen={openNotice} onReadAll={act.readMany} extra={tools} />}
      </div>
      {d && d.totalCount > 0 && <Pager page={d.page} pageSize={d.pageSize} total={d.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
    </>
  );
}
