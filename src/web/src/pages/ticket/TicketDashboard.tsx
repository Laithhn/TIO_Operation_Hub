import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { get, qs } from '../../api';
import { fmtDate, fmtDateTime, label } from '../../format';
import { useMe, useUrlState } from '../../hooks';
import { hasRight } from '../../rights';
import { CAT, Donut, HBars, Kpi, STATUS, VizPanel } from '../../ui/charts';
import { Icon } from '../../ui/Icon';
import { Badge, PageHead, SelectInput, StateMessage } from '../../ui/kit';
import { Avatar, ChangePair } from '../../ui/recordView';
import { useClientOptions, useProductOptions, useTeamOptions } from '../common';

// A123 (owner request, 19 Nov 2026): a Tickets dashboard in the Tickets menu, modelled on a Jira board: tickets by status with the share done,
// the unresolved tickets per responsible party, statistics per owner, priority, type and client, and a stream of recent activity.

type Link_ = { value: number; link: string };
type OpenRow = { id: number; ref: string; title: string; priority: string; statusCode: string; status: string; owner?: string | null; clientCode?: string | null; openedAt: string; dueAt?: string | null; overdue: boolean; waiting?: string | null };
type Activity = { key: string; source: string; kind: string; category: string; actor?: string | null; at: string; from?: string | null; to?: string | null; body?: string | null; restricted: boolean; edited: boolean; caseId: number; ref: string; title: string; closed: boolean };
export type TicketDash = {
  evaluatedAt: string; days?: number | null; createdFrom?: string | null; note: string;
  kpis: { total: Link_; open: Link_ & { criticalHigh: number }; done: Link_ & { percent: number }; unassigned: Link_; overdue: Link_; waitingCustomer: Link_ };
  byStatus: { key: string; label: string; value: number; done: boolean; link: string }[];
  unresolved: { party: string; total: number; items: OpenRow[] }[];
  byOwner: { ownerId?: number | null; owner: string; value: number; critical: number; high: number; link: string }[];
  byPriority: { key: string; label: string; value: number; link: string }[];
  byType: { key: string; label: string; value: number; open: number }[];
  byClient: { key: string; label: string; value: number; link?: string | null }[];
  internalOpen: number;
  activity?: Activity[] | null;
};

const PERIODS = [{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: '365', label: 'Last 12 months' }];
// Open statuses take the categorical slots that are not green; done statuses are green (closed) or grey (cancelled), so "done" reads at a glance.
const OPEN_COLORS = [CAT[0], CAT[1], CAT[3], CAT[4], CAT[6], CAT[7]];
// Priority always carries a glyph and its name, never colour alone.
const PRIORITY: Record<string, { glyph: string; color: string }> = {
  Critical: { glyph: '⇈', color: STATUS.critical }, High: { glyph: '↑', color: STATUS.warning }, Normal: { glyph: '=', color: CAT[0] }, Low: { glyph: '↓', color: STATUS.neutral }
};
const VERB: Record<string, string> = {
  Created: 'created', Triaged: 'triaged', Started: 'started work on', ValidationRequested: 'asked for validation of', Closed: 'closed', Cancelled: 'cancelled', Reopened: 're-opened',
  OwnerChanged: 'changed the owner of', StatusChanged: 'changed the status of', Comment: 'commented on', JiraComment: 'commented in Jira on',
  JiraWorkflow: 'changed the Jira status of', JiraAssignment: 'changed the Jira assignee of'
};

function Prio({ p }: { p: string }) {
  const x = PRIORITY[p] ?? PRIORITY.Normal;
  return <span className="td-prio" style={{ color: x.color }} title={`${p} priority`}><span aria-hidden="true">{x.glyph}</span><span className="sr-only">{p} priority</span></span>;
}

/** "31 minutes ago" for today's activity, the date and time otherwise. */
function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  if (min < 24 * 60) { const h = Math.round(min / 60); return `${h} hour${h === 1 ? '' : 's'} ago`; }
  return fmtDateTime(iso);
}

function dayOf(iso: string) {
  const key = (d: Date) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const k = key(new Date(iso));
  return k === key(new Date()) ? 'Today' : k === key(new Date(Date.now() - 86_400_000)) ? 'Yesterday' : k;
}

/** The board's "filter results" gadget: the most urgent unresolved tickets of one responsible party. */
function UnresolvedPanel({ party, total, items, listLink }: { party: string; total: number; items: OpenRow[]; listLink: string }) {
  return (
    <section className="panel viz-panel td-list" aria-label={`Unresolved tickets: ${label(party)}`}>
      <div className="panel-head"><h2>Unresolved tickets · {label(party)}</h2><div className="actions"><Link className="linkbtn" to={listLink}>Open list</Link></div></div>
      <div className="panel-body">
        <table className="td-table">
          <thead><tr><th scope="col">Key</th><th scope="col">Summary</th><th scope="col">Status</th><th scope="col" className="td-p">P</th></tr></thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id}>
                <td className="td-key"><Link to={`/cases/${r.id}`}>{r.ref}</Link></td>
                <td className="td-sum">
                  <Link to={`/cases/${r.id}`} title={r.title}>{r.title}</Link>
                  <div className="td-sub">{[r.clientCode, r.owner ?? 'Unassigned'].filter(Boolean).join(' · ')}
                    {r.dueAt && <> · <span className={r.overdue ? 't-bad' : undefined}>{r.overdue ? 'overdue since ' : 'due '}{fmtDate(r.dueAt)}</span></>}
                    {r.waiting && <> · waiting for {label(r.waiting).toLowerCase()}</>}</div>
                </td>
                <td><Badge tone="info">{r.status}</Badge></td>
                <td className="td-p"><Prio p={r.priority} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="td-count"><b>1–{items.length}</b> of {total}{total > items.length && <span className="muted"> · the most urgent first</span>}</p>
      </div>
    </section>
  );
}

function ActivityStream({ items }: { items: Activity[] }) {
  if (items.length === 0) return <StateMessage kind="none">No recent activity on these tickets.</StateMessage>;
  const days: { day: string; items: Activity[] }[] = [];
  for (const a of items) { const d = dayOf(a.at); const last = days[days.length - 1]; if (last?.day === d) last.items.push(a); else days.push({ day: d, items: [a] }); }
  return (
    <div className="td-stream">
      {days.map(d => (
        <section key={d.day} aria-label={d.day}>
          <h3 className="td-day">{d.day}</h3>
          <ul>
            {d.items.map(a => (
              <li key={a.key} className="td-act">
                <Avatar name={a.actor} size={34} />
                <div className="td-act-body">
                  <div><b>{a.actor ?? 'System'}</b> {VERB[a.kind] ?? `${label(a.kind).toLowerCase()} on`}{' '}
                    <Link to={`/cases/${a.caseId}?tab=timeline`} className={a.closed ? 'td-closed' : undefined} title={a.closed ? 'Closed or cancelled' : undefined}>{a.ref} – {a.title}</Link>
                    {a.source === 'Jira' && <> <Badge tone="neutral">Jira</Badge></>}</div>
                  {(a.from || a.to) && a.kind !== 'Created' && <div className="td-act-change"><ChangePair from={a.from} to={a.to} /></div>}
                  {a.restricted ? <div className="td-quote muted">This Jira comment is restricted. Its text is visible to ticket coordinators only.</div>
                    : a.body && <div className="td-quote">{a.body}</div>}
                  <div className="td-when">{ago(a.at)}{a.edited && ' · edited in Jira'}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function TicketDashboard() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ clientId: '', teamId: '', productId: '', days: '' });
  const q = useQuery({ queryKey: ['dash-tickets', f], queryFn: () => get<TicketDash>(`/dashboard/tickets${qs(f)}`), placeholderData: keepPreviousData, refetchInterval: 60000 });
  const qc = useQueryClient();
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const d = q.data;
  const k = d?.kpis;
  let openSlot = 0;
  const statusColor = new Map(d?.byStatus.map(s => [s.key, s.done ? (s.key === '@cancelled' ? STATUS.neutral : STATUS.good) : OPEN_COLORS[openSlot++ % OPEN_COLORS.length]]) ?? []);
  const ownerMax = Math.max(1, ...(d?.byOwner.map(o => o.value) ?? []));
  const periodText = f.days ? PERIODS.find(p => p.value === f.days)?.label.toLowerCase() : null;
  return (
    <div className="dash td-dash">
      <PageHead title="Tickets dashboard"
        sub={<>Tickets by status, what is unresolved, who holds it and what changed. {d && <span className="cc-fresh">As of {fmtDateTime(d.evaluatedAt)} ({me.timeZone}) · refreshes every minute · only tickets you are authorized to see.</span>}</>}
        actions={<>
          <button className="btn" onClick={() => qc.invalidateQueries({ queryKey: ['dash-tickets'] })} disabled={q.isFetching}>{q.isFetching ? <><span className="spin" /> Refreshing…</> : 'Refresh'}</button>
          <Link className="btn" to="/cases">All tickets</Link>
          {hasRight(me, 'Cases', 'Create') && <Link className="btn btn-primary" to="/cases/new">+ New Ticket</Link>}
        </>} />
      <div className="toolbar ad-filters">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized clients" />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        {hasRight(me, 'Products', 'View') && <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />}
        <SelectInput label="Opened" value={f.days} onChange={v => set({ days: v })} options={PERIODS} empty="Any time" />
      </div>
      {q.isLoading && <StateMessage kind="loading" />}
      {q.error && <StateMessage kind="error">The dashboard could not be loaded. Try Refresh.</StateMessage>}
      {d && k && <>
        <div className="kpis cc-kpis">
          <Kpi icon={<Icon name="case" size={18} />} label={periodText ? `Tickets opened (${periodText})` : 'All tickets'} value={k.total.value} to={k.total.link} />
          <Kpi icon={<Icon name="ok" size={18} />} label="Done" value={`${k.done.percent} %`} to={k.done.link}
            lines={[{ text: `${k.done.value} closed or cancelled` }]} bar={k.total.value ? { total: k.total.value, segments: [{ value: k.done.value, status: 'healthy', label: 'Done' }, { value: k.open.value, status: 'neutral', label: 'Open' }] } : undefined} />
          <Kpi icon={<Icon name="list" size={18} />} label="Unresolved" value={k.open.value} to={k.open.link} lines={[{ text: `${k.open.criticalHigh} critical or high` }]} />
          <Kpi icon={<Icon name="user" size={18} />} label="Unassigned" value={k.unassigned.value} to={k.unassigned.link} status={k.unassigned.value ? 'warning' : 'neutral'} />
          <Kpi icon={<Icon name="warning" size={18} />} label="Overdue" value={k.overdue.value} to={k.overdue.link} status={k.overdue.value ? 'critical' : 'neutral'} />
          <Kpi icon={<Icon name="history" size={18} />} label="Waiting for customer" value={k.waitingCustomer.value} to={k.waitingCustomer.link} />
        </div>

        <div className="td-grid">
          <div className="td-col">
            <VizPanel title="Tickets by status" sub={<>{k.total.value} ticket(s){periodText ? ` opened in the ${periodText}` : ''}; {k.done.percent} % done. Click a status to open its list.</>}
              table={{ columns: ['Status', 'Tickets', 'Share'], rows: d.byStatus.map(s => [s.label, s.value, `${k.total.value ? Math.round((s.value / k.total.value) * 100) : 0} %`]) }}>
              <div className="td-donut">
                <Donut data={d.byStatus.map(s => ({ key: s.key, label: s.label, value: s.value, link: s.link }))} colorOf={b => statusColor.get(b.key) ?? STATUS.neutral} centerLabel="tickets" size={210} />
              </div>
            </VizPanel>
            <VizPanel title="Unresolved by priority" table={{ columns: ['Priority', 'Tickets'], rows: d.byPriority.map(p => [p.label, p.value]) }}>
              <HBars data={d.byPriority} colorOf={b => PRIORITY[b.key]?.color ?? CAT[0]} unit="tickets" empty="No unresolved tickets." />
            </VizPanel>
          </div>

          <div className="td-col">
            {d.unresolved.length === 0
              ? <section className="panel viz-panel"><div className="panel-head"><h2>Unresolved tickets</h2></div><div className="panel-body"><StateMessage kind="none">No unresolved tickets match these filters.</StateMessage></div></section>
              : d.unresolved.map(u => <UnresolvedPanel key={u.party} {...u} listLink={k.open.link} />)}
            <section className="panel viz-panel" aria-label="Ticket statistics by owner">
              <div className="panel-head"><h2>Ticket statistics · owner</h2></div>
              <div className="panel-body">
                {d.byOwner.length === 0 ? <StateMessage kind="none">No unresolved tickets.</StateMessage> : <>
                  <table className="td-table td-stats">
                    <thead><tr><th scope="col">Owner</th><th scope="col" className="num">Unresolved</th><th scope="col" className="num">Critical / high</th><th scope="col">Share</th></tr></thead>
                    <tbody>
                      {d.byOwner.map(o => (
                        <tr key={o.ownerId ?? 'none'}>
                          <td><Link to={o.link}>{o.owner}</Link></td>
                          <td className="num">{o.value}</td>
                          <td className="num">{o.critical + o.high || <span className="muted">0</span>}</td>
                          <td className="td-share"><span className="td-bar"><span style={{ width: `${(o.value / ownerMax) * 100}%` }} /></span><span>{k.open.value ? Math.round((o.value / k.open.value) * 100) : 0} %</span></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><th scope="row">Total</th><td className="num"><b>{k.open.value}</b></td><td className="num">{k.open.criticalHigh}</td><td /></tr></tfoot>
                  </table>
                </>}
              </div>
            </section>
          </div>

          <div className="td-col">
            {d.activity
              ? <section className="panel viz-panel" aria-label="Activity stream">
                  <div className="panel-head"><h2>Activity stream</h2></div>
                  <div className="panel-body"><ActivityStream items={d.activity} /></div>
                </section>
              : <section className="panel viz-panel"><div className="panel-head"><h2>Activity stream</h2></div><div className="panel-body"><StateMessage kind="restricted">Ticket activity needs the Timeline tab right.</StateMessage></div></section>}
          </div>
        </div>

        <div className="td-grid td-grid-2">
          <VizPanel title="Tickets by type" sub="Every ticket in view, with how many are still unresolved."
            table={{ columns: ['Type', 'Tickets', 'Unresolved'], rows: d.byType.map(t => [t.label, t.value, t.open]) }}>
            <HBars data={d.byType.map(t => ({ key: t.key, label: t.label, value: t.value }))} unit="tickets" empty="No tickets." />
          </VizPanel>
          {!f.clientId && <VizPanel title="Unresolved by client" sub={<>The {d.byClient.length} clients with the most unresolved tickets{d.internalOpen ? `; ${d.internalOpen} internal ticket(s) have no client` : ''}.</>}
            table={{ columns: ['Client', 'Unresolved'], rows: d.byClient.map(c => [c.label, c.value]) }}>
            <HBars data={d.byClient} unit="tickets" empty="No unresolved client tickets." />
          </VizPanel>}
        </div>
        <p className="hint">{d.note}</p>
      </>}
    </div>
  );
}
