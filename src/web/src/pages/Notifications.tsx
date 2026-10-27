import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { del, get, post, qs } from '../api';
import { fmtDate, fmtDateTime, fmtMoney } from '../format';
import { useUrlState } from '../hooks';
import { Icon } from '../ui/Icon';
import { Badge, Checkbox, DataTable, PageHead, Pager, StateMessage, Tabs, type Column } from '../ui/kit';

/** A38: the notifications center — assignments, due and overdue work and contract renewals, for every role. */
type Notice = { id: number; kind: string; title: string; body?: string; link?: string; createdAt: string; readAt?: string };
type NoticePage = { items: Notice[]; page: number; pageSize: number; totalCount: number; unreadCount: number; unreadPayments?: number };

const KIND: Record<string, { label: string; tone: string }> = {
  Assigned: { label: 'Assigned to you', tone: 'info' }, Team: { label: 'Project team', tone: 'info' }, Handover: { label: 'Handover', tone: 'info' },
  DueSoon: { label: 'Due soon', tone: 'warn' }, Overdue: { label: 'Overdue', tone: 'bad' }, Renewal: { label: 'Contract renewal', tone: 'warn' }, PaymentDue: { label: 'Payment due', tone: 'warn' }, PaymentOverdue: { label: 'Payment overdue', tone: 'bad' }
};

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 8 ? `${d} d ago` : fmtDateTime(iso);
}

function useNoticeActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  return {
    read: async (n: Notice) => { if (!n.readAt) { await post(`/notifications/${n.id}/read`); refresh(); } },
    readAll: async () => { await post('/notifications/read-all'); refresh(); },
    remove: async (n: Notice) => { await del(`/notifications/${n.id}`); refresh(); }
  };
}

function NoticeItem({ n, onOpen, compact }: { n: Notice; onOpen: (n: Notice) => void; compact?: boolean }) {
  const k = KIND[n.kind] ?? { label: n.kind, tone: 'info' };
  return (
    <div className={`notice-item${n.readAt ? '' : ' unread'}`}>
      <span className={`notice-dot tone-${k.tone}`} aria-hidden="true" />
      <div className="notice-text">
        <button className="notice-title" onClick={() => onOpen(n)}>{n.title}</button>
        {n.body && !compact && <div className="hint">{n.body}</div>}
        <div className="notice-meta"><span className={`notice-kind tone-${k.tone}`}>{k.label}</span> · <span title={fmtDateTime(n.createdAt)}>{ago(n.createdAt)}</span>{!n.readAt && <span className="sr"> · unread</span>}</div>
      </div>
    </div>
  );
}

/** Header bell: unread count (checked every minute) and the latest notices. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const act = useNoticeActions();
  const count = useQuery({ queryKey: ['notifications', 'count'], queryFn: () => get<{ count: number }>('/notifications/unread-count'), refetchInterval: 60_000, refetchOnWindowFocus: true });
  const list = useQuery({ queryKey: ['notifications', 'latest'], queryFn: () => get<NoticePage>('/notifications?pageSize=8'), enabled: open });
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const n = count.data?.count ?? 0;
  const openNotice = async (x: Notice) => { setOpen(false); await act.read(x); if (x.link) nav(x.link); };
  return (
    <div className="bell" ref={root}>
      <button className="hdr-btn bell-btn" onClick={() => setOpen(o => !o)} aria-haspopup="dialog" aria-expanded={open} aria-label={n ? `Notifications, ${n} unread` : 'Notifications'} title="Notifications">
        <Icon name="bell" size={18} />{n > 0 && <span className="bell-count" aria-hidden="true">{n > 99 ? '99+' : n}</span>}
      </button>
      {open && (
        <div className="bell-pop" role="dialog" aria-label="Notifications">
          <div className="bell-head"><b>Notifications</b>{n > 0 && <button className="linkbtn" onClick={act.readAll}>Mark all read</button>}</div>
          <div className="bell-list">
            {list.isLoading && <div className="state-msg"><span className="spin" /> Loading…</div>}
            {list.data?.items.length === 0 && <div className="state-msg">You are all caught up.</div>}
            {list.data?.items.map(x => <NoticeItem key={x.id} n={x} onOpen={openNotice} compact />)}
          </div>
          <div className="bell-foot"><Link to="/notifications" onClick={() => setOpen(false)}>Open the notifications center</Link></div>
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
    { key: 'client', header: 'Client', render: p => <Link to={`/clients/${p.clientId}`}>{p.clientCode}</Link> },
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
  const [f, set] = useUrlState({ show: 'all', state: 'attention', mine: '', page: '1', pageSize: '25' });
  const payments = f.show === 'payments';
  const q = useQuery({ queryKey: ['notifications', 'page', f.show, f.page, f.pageSize], queryFn: () => get<NoticePage>(`/notifications${qs({ unread: f.show === 'unread' ? true : undefined, category: payments ? 'payments' : undefined, page: f.page, pageSize: f.pageSize })}`) });
  const act = useNoticeActions();
  const nav = useNavigate();
  const openNotice = async (x: Notice) => { await act.read(x); if (x.link) nav(x.link); };
  const d = q.data;
  return (
    <>
      <PageHead title="Notifications" sub="Work assigned to you, due and overdue cases and commitments, contracts that need a renewal decision and contract payments coming due. Read notices are cleared after 90 days."
        actions={d && d.unreadCount > 0 && <button className="btn" onClick={act.readAll}>Mark all read ({d.unreadCount})</button>} />
      <Tabs value={f.show} onChange={v => set({ show: v, page: '1' })} tabs={[{ key: 'all', label: 'All' }, { key: 'unread', label: `Unread${d ? ` (${d.unreadCount})` : ''}` },
        { key: 'payments', label: `Payments${d?.unreadPayments ? ` (${d.unreadPayments} unread)` : ''}` }]} />
      {payments && <PaymentsTab state={f.state} mine={f.mine === '1'} onState={s => set({ state: s })} onMine={v => set({ mine: v ? '1' : '' })} />}
      {payments && <h2 className="band-title" style={{ margin: '18px 0 8px' }}>Payment reminders</h2>}
      <div className="panel notice-page">
        {q.isLoading && <StateMessage kind="loading" />}
        {d && d.items.length === 0 && <StateMessage kind="none">{f.show === 'unread' ? 'No unread notifications.' : payments ? 'No payment reminders yet.' : 'No notifications yet.'}</StateMessage>}
        {d?.items.map(x => (
          <div key={x.id} className="notice-row">
            <NoticeItem n={x} onOpen={openNotice} />
            <span className="notice-actions">
              {!x.readAt && <button className="linkbtn" onClick={() => act.read(x)}>Mark read</button>}
              <button className="linkbtn danger-link" onClick={() => act.remove(x)} aria-label={`Delete notification ${x.title}`}>Delete</button>
            </span>
          </div>
        ))}
      </div>
      {d && d.totalCount > 0 && <Pager page={d.page} pageSize={d.pageSize} total={d.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
    </>
  );
}
