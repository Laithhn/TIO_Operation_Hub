import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get, qs } from '../api';
import { fmtDate, fmtDateTime, fmtMoney } from '../format';
import { useMe, useUrlState } from '../hooks';
import {
  CAT, Columns, Donut, HBars, Kpi, normalizeCountry, RAMP, SERIES, SlaMatrix, STATUS, TrendLines, VizPanel, fmtMinutes,
  type CountryDatum, type SlaRow
} from '../ui/charts';
import { Icon } from '../ui/Icon';
import type { MapMetric } from '../ui/LeafletMap';
import { Badge, PageHead, SelectInput, StateMessage } from '../ui/kit';
import { useClientOptions, useProductOptions, useTeamOptions } from './common';

const LeafletMap = lazy(() => import('../ui/LeafletMap'));

type Measure = { key: string; label: string; value: number; definition: string; drilldown: string };
type Dash = { evaluatedAt: string; upcomingDays: number; cases: Measure[]; commitments: Measure[]; caseAge: { averageDays: number | null; oldestDays: number | null; totalWaitingHours: number; definition: string }; deferred: string };
type BarT = { key: string; label: string; value: number; link?: string | null };
type MapClient = {
  id: number; code: string; name: string; country?: string | null; parentClientId?: number | null; environments: number; servers: number; openCases: number; overdueCases: number;
  openCommitments: number; overdueCommitments: number; activeContracts: number; renewalAttention: number;
};
type ContractDetail = { byType: BarT[]; byStatus: BarT[]; expiries: BarT[]; support: BarT[]; onSiteByClient: BarT[]; sla: SlaRow[]; active: number; withSla: number; total: number };
type InsightsT = {
  evaluatedAt: string;
  countries: { rows: CountryDatum[]; unknownCountryClients: number; unknownCountryCodes: string[]; clients: MapClient[] };
  cases: { byStatus: BarT[]; byPriority: BarT[]; age: BarT[]; trend: { weekStart: string; opened: number; closed: number }[]; trendNote: string };
  commitments: BarT[];
  environments: { condition: BarT[]; needsVerification: number; note: string };
  dataQuality: BarT[];
  contracts: { renewal: BarT[]; onSiteRequired: number; note: string };
  contractDetail?: ContractDetail | null;
  escalations?: { active: number; overdue: number; total: number; byChannel: BarT[]; byStatus: BarT[]; byLevel: BarT[]; received: BarT[] } | null;
  payments?: Payments | null;
  products: { productId: number; product: string; environments: number; installations: number; unknownVersion: number; link: string }[];
};
type PayPart = { count: number; amounts: { currency: string; amount: number }[] };
type PayNext = { id: number; contractId: number; contractRef: string; clientCode: string; condition: string; amount?: number | null; currency?: string | null; dueDate: string; status: string; state: string };
type Payments = {
  summary: { reminderDays: number; overdue: PayPart; due: PayPart; upcoming: PayPart };
  byMonth: BarT[]; amountsByMonth: { currency: string; overdue: number; months: number[] }[]; next: PayNext[];
};
/** Per-country figures for the map, with servers and contracts added from the per-client rows. */
type MapDatum = CountryDatum & { servers: number; activeContracts: number; renewalAttention: number };

// Reported condition uses the reserved status colours, always with a glyph and a label (never colour alone).
const STATUS_OF: Record<string, string> = { Healthy: STATUS.good, Degraded: STATUS.warning, Unavailable: STATUS.critical, Unknown: STATUS.neutral };
const GLYPH: Record<string, string> = { Healthy: '●', Degraded: '▲', Unavailable: '✕', Unknown: '?' };
// Priority is ordinal: one blue ramp, darker = more urgent.
const PRIORITY_OF: Record<string, string> = { Low: RAMP[0], Normal: RAMP[1], High: RAMP[3], Critical: RAMP[4] };
// Renewal state: expired = critical, due = warning, unknown end = neutral gray, current = blue, draft = light ramp step.
const RENEWAL_OF: Record<string, string> = { expired: STATUS.critical, due: STATUS.warning, unknownEnd: STATUS.neutral, current: SERIES.blue, draft: RAMP[0] };
// Contract status and support model are categories: fixed categorical slots per value (colour follows the value, never its rank).
const CONTRACT_STATUS_OF: Record<string, string> = { Active: CAT[0], Draft: CAT[2], Ended: STATUS.neutral, Terminated: CAT[1] };
const SUPPORT_OF: Record<string, string> = { Remote: CAT[0], OnSite: CAT[1], Hybrid: CAT[2], Unknown: STATUS.neutral };
const tableOf = (rows: BarT[], col = 'Count') => ({ columns: ['Category', col], rows: rows.map(r => [r.label, r.value]) });
const weekLabel = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

const METRICS: (MapMetric & { short: string })[] = [
  { key: 'clients', label: 'Clients', short: 'Clients', value: d => d.clients },
  { key: 'servers', label: 'Servers', short: 'Servers', value: d => (d as MapDatum).servers ?? 0 },
  { key: 'cases', label: 'Open cases', short: 'Open cases', value: d => d.openCases, alert: d => d.overdueCases > 0 },
  { key: 'overdue', label: 'Overdue items', short: 'Overdue', value: d => d.overdueCases + d.overdueCommitments, alert: d => d.overdueCases + d.overdueCommitments > 0 },
  { key: 'contracts', label: 'Active contracts', short: 'Contracts', value: d => (d as MapDatum).activeContracts ?? 0, alert: d => ((d as MapDatum).renewalAttention ?? 0) > 0 }
];

function KpiBand({ dash, d }: { dash: Dash; d: InsightsT }) {
  const m = (k: string) => [...dash.cases, ...dash.commitments].find(x => x.key === k)!;
  const openCases = m('openCases'), overdueCases = m('overdueCases'), openComs = m('openCommitments'), overdueComs = m('overdueCommitments'), upcoming = m('upcomingCommitments');
  const urgent = d.cases.byPriority.filter(p => p.key === 'Critical' || p.key === 'High').reduce((s, p) => s + p.value, 0);
  const clients = d.countries.rows.reduce((s, r) => s + r.clients, 0) + d.countries.unknownCountryClients;
  const envTotal = d.environments.condition.reduce((s, c) => s + c.value, 0);
  const attention = d.environments.condition.filter(c => c.key === 'Degraded' || c.key === 'Unavailable').reduce((s, c) => s + c.value, 0);
  const cd = d.contractDetail;
  const renewal = d.contracts.renewal.filter(r => r.key === 'expired' || r.key === 'due').reduce((s, r) => s + r.value, 0);
  return (
    <div className="kpis kpis-wide">
      <Kpi hero icon={<Icon name="clients" size={18} />} label="Clients" value={clients} to="/clients"
        context={<>{d.countries.rows.length} countr{d.countries.rows.length === 1 ? 'y' : 'ies'}{d.countries.unknownCountryClients ? `, ${d.countries.unknownCountryClients} unknown` : ''}</>} />
      <Kpi icon={<Icon name="case" size={18} />} label="Open cases" value={openCases.value} to={openCases.drilldown} part={urgent} of={openCases.value} partLabel={`${urgent} critical or high priority`} />
      <Kpi icon={<Icon name="case" size={18} />} label="Overdue cases" value={overdueCases.value} to={overdueCases.drilldown} tone={overdueCases.value ? 'critical' : undefined}
        part={overdueCases.value} of={openCases.value} partLabel={`${pct(overdueCases.value, openCases.value)} % of open cases`} />
      <Kpi icon={<Icon name="commitment" size={18} />} label="Open commitments" value={openComs.value} to={openComs.drilldown} part={upcoming.value} of={openComs.value} partLabel={`${upcoming.value} due in the next ${dash.upcomingDays} days`} />
      <Kpi icon={<Icon name="commitment" size={18} />} label="Overdue commitments" value={overdueComs.value} to={overdueComs.drilldown} tone={overdueComs.value ? 'critical' : undefined}
        part={overdueComs.value} of={openComs.value} partLabel={`${pct(overdueComs.value, openComs.value)} % of open commitments`} />
      {d.escalations && <Kpi icon={<Icon name="escalation" size={18} />} label="Active escalations" value={d.escalations.active} to="/escalations" tone={d.escalations.overdue ? 'critical' : undefined}
        part={d.escalations.overdue} of={d.escalations.active} partLabel={d.escalations.overdue ? `${d.escalations.overdue} past a response or resolution target` : 'None overdue'} />}
      {cd && <Kpi icon={<Icon name="list" size={18} />} label="Active contracts" value={cd.active} to="/contracts?status=Active" tone={renewal ? 'warning' : undefined}
        part={renewal} of={cd.active} partLabel={renewal ? `${renewal} expired or due for renewal` : 'None due for renewal'} context={`${cd.withSla} with SLA targets`} />}
      {d.payments && <PaymentKpi p={d.payments} />}
      <Kpi icon={<Icon name="server" size={18} />} label="Environments needing attention" value={attention} to="/environments" tone={attention ? 'warning' : undefined}
        part={attention} of={envTotal} partLabel={`Degraded or unavailable, of ${envTotal}`} context={d.environments.needsVerification ? `${d.environments.needsVerification} need verification` : undefined} />
    </div>
  );
}

/** A39: interactive map — metric switch, country selection with its clients beside the map, filter and zoom. */
function Geography({ countries, filtered, onFilter }: { countries: InsightsT['countries']; filtered: string; onFilter: (c: string) => void }) {
  const me = useMe().data!;
  const tiles = me.app.map;
  const nav = useNavigate();
  const [metricKey, setMetricKey] = useState('clients');
  const [selected, setSelected] = useState<string | null>(null);
  const metric = METRICS.find(x => x.key === metricKey)!;
  // Servers and contracts per country, summed from the per-client rows.
  const data: MapDatum[] = useMemo(() => countries.rows.map(r => {
    const cs = countries.clients.filter(c => c.country && normalizeCountry(c.country) === normalizeCountry(r.country));
    return { ...r, servers: cs.reduce((s, c) => s + c.servers, 0), activeContracts: cs.reduce((s, c) => s + c.activeContracts, 0), renewalAttention: cs.reduce((s, c) => s + c.renewalAttention, 0) };
  }), [countries]);
  const sel = selected ? data.find(d => d.country === selected) : undefined;
  const selClients = sel ? countries.clients.filter(c => c.country && normalizeCountry(c.country) === normalizeCountry(sel.country)) : [];
  const ranked = [...data].sort((a, b) => metric.value(b) - metric.value(a) || b.clients - a.clients);
  const max = Math.max(1, ...ranked.map(metric.value));
  return (
    <section className="map-panel panel" id="map">
      <div className="map-main">
        <div className="panel-head" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Client footprint</h2>
          <div className="map-metric" style={{ marginLeft: 'auto' }}>
            <span className="muted" style={{ fontSize: 12 }}>Show</span>
            <div className="seg" role="group" aria-label="Map figure">
              {METRICS.map(x => <button key={x.key} aria-pressed={x.key === metricKey} onClick={() => setMetricKey(x.key)}>{x.short}</button>)}
            </div>
          </div>
        </div>
        <Suspense fallback={<div className="viz-empty" style={{ height: 460 }}><span className="spin" /> Loading map…</div>}>
          <LeafletMap data={data} clients={countries.clients} metric={metric} selected={selected ?? undefined} onSelect={setSelected}
            onOpenClient={id => nav(`/clients/${id}`)} tileUrl={tiles?.tileUrl} attribution={tiles?.attribution} />
        </Suspense>
        {countries.unknownCountryClients > 0 && <p className="hint" style={{ marginTop: 6 }}>Country unknown (not placed): {countries.unknownCountryCodes.join(', ')}</p>}
      </div>
      <aside className="map-side" aria-label={sel ? `Clients in ${sel.country}` : 'Countries'}>
        {sel ? (
          <>
            <div className="map-side-head"><h3>{sel.country}</h3><button className="linkbtn" onClick={() => setSelected(null)} aria-label="Back to all countries">✕ All countries</button></div>
            <div className="map-stats">
              <div><b>{sel.clients}</b><span>clients</span></div>
              <div><b>{sel.environments}</b><span>environments</span></div>
              <div><b>{sel.servers}</b><span>servers</span></div>
              <div><b>{sel.openCases}</b><span>open cases</span></div>
              <div><b style={{ color: sel.overdueCases + sel.overdueCommitments ? STATUS.critical : undefined }}>{sel.overdueCases + sel.overdueCommitments}</b><span>overdue items</span></div>
              <div><b>{sel.activeContracts}</b><span>active contracts</span></div>
            </div>
            <div className="map-side-body">
              {selClients.map(c => (
                <Link key={c.id} className="map-client" to={`/clients/${c.id}`}>
                  <b>{c.code}</b> <span className="muted">· {c.name}</span>{c.parentClientId && <span className="sub"> (sub-client)</span>}
                  <div className="figs">
                    <span>{c.environments} env.</span><span>{c.servers} servers</span><span>{c.openCases} open cases</span>
                    {c.overdueCases + c.overdueCommitments > 0 && <Badge tone="bad">{c.overdueCases + c.overdueCommitments} overdue</Badge>}
                    <span>{c.activeContracts} contracts</span>{c.renewalAttention > 0 && <Badge tone="warn">{c.renewalAttention} renewal due</Badge>}
                  </div>
                </Link>
              ))}
            </div>
            <div className="map-side-actions">
              {filtered !== sel.country ? <button className="btn btn-primary" onClick={() => onFilter(sel.country)}>Filter dashboard to {sel.country}</button>
                : <button className="btn" onClick={() => onFilter('')}>Clear country filter</button>}
              <Link className="btn" to={`/clients${qs({ country: sel.country })}`}>Open client list</Link>
            </div>
          </>
        ) : (
          <>
            <div className="map-side-head"><h3>Countries by {metric.label.toLowerCase()}</h3>{filtered && <button className="linkbtn" onClick={() => onFilter('')}>Clear filter ({filtered})</button>}</div>
            <div className="map-side-body">
              {ranked.length === 0 && <p className="muted" style={{ padding: 12 }}>No records entered.</p>}
              {ranked.map(c => {
                const v = metric.value(c);
                return (
                  <button key={c.country} className="map-country" onClick={() => setSelected(c.country)} aria-label={`${c.country}: ${v} ${metric.label.toLowerCase()}. Show its clients`}>
                    <span><b>{c.country}</b><span className="hint">{c.clientCodes.join(', ')}</span></span>
                    <span className="rank-bar" style={{ width: 70 }}><span style={{ width: `${(v / max) * 100}%` }} /></span>
                    <b style={{ minWidth: 22, textAlign: 'right' }}>{v}</b>
                  </button>
                );
              })}
            </div>
            <p className="hint" style={{ padding: '8px 12px', margin: 0 }}>Click a country on the map or in this list to see its clients; zoom with the buttons or the mouse wheel.</p>
          </>
        )}
      </aside>
    </section>
  );
}

function Band({ id, icon, title, hint, children }: { id: string; icon: string; title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="dash-band" id={id} aria-labelledby={`${id}-h`}>
      <div className="band-head"><span className="band-ic" aria-hidden="true"><Icon name={icon} size={16} /></span><h2 className="band-title" id={`${id}-h`}>{title}</h2>{hint && <span className="hint">{hint}</span>}</div>
      {children}
    </section>
  );
}

function CaseCharts({ d, age }: { d: InsightsT; age: Dash['caseAge'] }) {
  const trend = d.cases.trend.map(t => ({ label: weekLabel(t.weekStart), a: t.opened, b: t.closed }));
  return (
    <Band id="cases" icon="case" title="Cases">
      <div className="viz-grid three">
        <VizPanel title="Open cases by priority" sub="Darker = more urgent. Click a slice for the list." table={tableOf(d.cases.byPriority)}>
          <Donut data={d.cases.byPriority} colorOf={b => PRIORITY_OF[b.key] ?? RAMP[1]} centerLabel="open cases" />
        </VizPanel>
        <VizPanel title="Open cases by status" sub="Waiting is tracked separately; it is not a status." table={tableOf(d.cases.byStatus)}>
          <HBars data={d.cases.byStatus} unit="case(s)" empty="No open cases." />
        </VizPanel>
        <VizPanel title="Age of open cases" table={tableOf(d.cases.age, 'Open cases')}
          sub={<>Average {age.averageDays ?? '—'}{age.averageDays !== null && ' days'}, oldest {age.oldestDays ?? '—'}{age.oldestDays !== null && ' days'}.</>}>
          <Columns data={d.cases.age} unit="case(s)" height={140} />
        </VizPanel>
        <VizPanel title="Cases opened and closed per week" sub={d.cases.trendNote} table={{ columns: ['Week of', 'Opened', 'Closed'], rows: trend.map(t => [t.label, t.a, t.b]) }}>
          <TrendLines data={trend} aLabel="Opened" bLabel="Closed" />
        </VizPanel>
      </div>
    </Band>
  );
}

// Escalation status: active states in the blue ramp (darker = further along), outcomes in neutral and categorical slots.
const ESC_STATUS_OF: Record<string, string> = { Open: RAMP[4], Acknowledged: RAMP[2], InProgress: RAMP[1], Resolved: CAT[2], Closed: STATUS.neutral, Withdrawn: CAT[1] };
const LEVEL_OF: Record<string, string> = { '1': RAMP[1], '2': RAMP[3], '3': RAMP[4] };

/** A41: escalations by channel, status, level and month received. */
function EscalationCharts({ d }: { d: InsightsT }) {
  const nav = useNavigate();
  const x = d.escalations;
  if (!x) return null;
  return (
    <Band id="escalations" icon="escalation" title="Escalations" hint={<>{x.total} escalation(s) in view · {x.active} active · {x.overdue} overdue</>}>
      <div className="viz-grid three">
        <VizPanel title="Escalations by channel" sub="All escalations in view; click a bar for the list." table={tableOf(x.byChannel, 'Escalations')}
          actions={<button className="linkbtn" onClick={() => nav('/escalations?status=all')}>All escalations</button>}>
          <HBars data={x.byChannel} unit="escalation(s)" empty="No escalations recorded." />
        </VizPanel>
        <VizPanel title="Escalations by status" table={tableOf(x.byStatus, 'Escalations')}>
          <Donut data={x.byStatus.map(b => ({ ...b, label: b.key === 'InProgress' ? 'In progress' : b.label }))} colorOf={b => ESC_STATUS_OF[b.key] ?? STATUS.neutral} centerLabel="escalations" />
        </VizPanel>
        <VizPanel title="Active escalations by level" sub="Level 3 is the highest." table={tableOf(x.byLevel, 'Active')}>
          <Columns data={x.byLevel} colorOf={b => LEVEL_OF[b.key] ?? RAMP[1]} unit="active escalation(s)" height={140} />
        </VizPanel>
        <VizPanel title="Escalations received per month" sub="Last 6 months, by received date." table={tableOf(x.received, 'Received')}>
          <Columns data={x.received} unit="escalation(s)" height={140} />
        </VizPanel>
      </div>
    </Band>
  );
}

const amounts = (p: PayPart) => p.amounts.map(a => fmtMoney(a.amount, a.currency)).join(' + ');
const PAY_STATE: Record<string, { label: string; tone: 'bad' | 'warn' | 'info' | 'good' | 'neutral' }> = {
  overdue: { label: 'Overdue', tone: 'bad' }, due: { label: 'Due soon', tone: 'warn' }, upcoming: { label: 'Scheduled', tone: 'info' },
  paid: { label: 'Paid', tone: 'good' }, waived: { label: 'Waived', tone: 'neutral' }, closed: { label: 'Contract terminated', tone: 'neutral' }
};

/** A50: payments overdue or due within the reminder window. */
function PaymentKpi({ p }: { p: Payments }) {
  const s = p.summary;
  const n = s.overdue.count + s.due.count;
  return (
    <Kpi icon={<Icon name="report" size={18} />} label="Payments due" value={n} to="/notifications?show=payments" tone={s.overdue.count ? 'critical' : n ? 'warning' : undefined}
      part={s.overdue.count} of={n} partLabel={s.overdue.count ? `${s.overdue.count} overdue${s.overdue.amounts.length ? ` (${amounts(s.overdue)})` : ''}` : 'None overdue'}
      context={s.due.count ? `${s.due.count} due within ${s.reminderDays} days${s.due.amounts.length ? `: ${amounts(s.due)}` : ''}` : `None due within ${s.reminderDays} days`} />
  );
}

/** A50: contract payments — open payments by month due, amounts per currency (never added across currencies) and the next payments. */
function PaymentCharts({ d }: { d: InsightsT }) {
  const nav = useNavigate();
  const p = d.payments;
  if (!p) return null;
  const s = p.summary;
  const months = p.byMonth.slice(1).map(b => b.label);
  const open = s.overdue.count + s.due.count + s.upcoming.count;
  return (
    <Band id="payments" icon="report" title="Contract payments" hint={<>{open} open payment(s) · {s.overdue.count} overdue · {s.due.count} due within {s.reminderDays} days (setting <i>Contracts.PaymentReminderDays</i>)</>}>
      <div className="viz-grid three">
        <VizPanel title="Open payments by month due" sub="Pending or invoiced payments; overdue ones are shown first. Click Overdue for the list." table={tableOf(p.byMonth, 'Payments')}
          actions={<button className="linkbtn" onClick={() => nav('/notifications?show=payments&state=open')}>All open payments</button>}>
          <Columns data={p.byMonth} colorOf={b => (b.key === 'overdue' ? STATUS.critical : SERIES.blue)} unit="payment(s)" height={140} />
        </VizPanel>
        <VizPanel title="Amounts due by currency" sub="Overdue and the next six months. Each currency is totalled on its own."
          table={{ columns: ['Currency', 'Overdue', ...months], rows: p.amountsByMonth.map(a => [a.currency || '—', fmtMoney(a.overdue), ...a.months.map(m => fmtMoney(m))]) }}>
          {p.amountsByMonth.length === 0 ? <div className="viz-empty">No amounts recorded on open payments.</div> : (
            <table className="pay-amounts">
              <thead><tr><th scope="col">Currency</th><th scope="col">Overdue</th><th scope="col">Due within {s.reminderDays} days</th><th scope="col">Next 6 months</th></tr></thead>
              <tbody>
                {p.amountsByMonth.map(a => {
                  const due = s.due.amounts.find(x => x.currency === a.currency)?.amount ?? 0;
                  return (
                    <tr key={a.currency}>
                      <th scope="row">{a.currency || '—'}</th>
                      <td className={a.overdue ? 'pay-bad' : 'muted'}>{fmtMoney(a.overdue)}</td>
                      <td className={due ? 'pay-warn' : 'muted'}>{fmtMoney(due)}</td>
                      <td>{fmtMoney(a.months.reduce((x, y) => x + y, 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </VizPanel>
        <VizPanel title="Next payments" sub="The earliest open payments by due date."
          table={{ columns: ['Due', 'Contract', 'Client', 'Condition', 'Amount', 'State'], rows: p.next.map(x => [fmtDate(x.dueDate), x.contractRef, x.clientCode, x.condition, fmtMoney(x.amount, x.currency), PAY_STATE[x.state]?.label ?? x.state]) }}>
          {p.next.length === 0 ? <div className="viz-empty">No open payment has a due date.</div> : (
            <ul className="pay-next">
              {p.next.map(x => (
                <li key={x.id}>
                  <span className="pay-date">{fmtDate(x.dueDate)}</span>
                  <span className="pay-what"><Link to={`/contracts/${x.contractId}`}>{x.contractRef}</Link> <span className="muted">· {x.clientCode}</span><span className="hint">{x.condition}</span></span>
                  <span className="pay-amt">{fmtMoney(x.amount, x.currency)}<Badge tone={PAY_STATE[x.state]?.tone ?? 'neutral'}>{PAY_STATE[x.state]?.label ?? x.state}</Badge></span>
                </li>
              ))}
            </ul>
          )}
        </VizPanel>
      </div>
    </Band>
  );
}

function ContractCharts({ d }: { d: InsightsT }) {
  const nav = useNavigate();
  const cd = d.contractDetail;
  if (!cd) return <Band id="contracts" icon="list" title="Contracts & SLAs"><p className="hint">Contract charts are shown when the dashboard is not filtered by team.</p></Band>;
  const expiring = cd.expiries.reduce((s, b) => s + b.value, 0);
  return (
    <Band id="contracts" icon="list" title="Contracts & SLAs" hint={<>{cd.total} contract(s) in view · {cd.active} active · {cd.withSla} with SLA targets ({pct(cd.withSla, cd.active)} %)</>}>
      <div className="viz-grid three">
        <VizPanel title="Contracts by status" table={tableOf(cd.byStatus, 'Contracts')} actions={<button className="linkbtn" onClick={() => nav('/contracts')}>Register</button>}>
          <Donut data={cd.byStatus} colorOf={b => CONTRACT_STATUS_OF[b.key] ?? STATUS.neutral} centerLabel="contracts" />
        </VizPanel>
        <VizPanel title="Contracts by type" table={tableOf(cd.byType, 'Contracts')}>
          <HBars data={cd.byType} unit="contract(s)" empty="No contracts recorded." />
        </VizPanel>
        <VizPanel title="Renewal state" table={tableOf(d.contracts.renewal, 'Contracts')} sub={d.contracts.note}>
          <Columns data={d.contracts.renewal} colorOf={b => RENEWAL_OF[b.key] ?? SERIES.blue} unit="contract(s)" height={140} />
        </VizPanel>
        <VizPanel title="Active contracts ending, next 12 months" table={tableOf(cd.expiries, 'Ending')}
          sub={expiring ? `${expiring} active contract(s) reach their end date within a year.` : 'No active contract ends within a year.'}>
          <Columns data={cd.expiries} colorOf={(b) => (b.key === cd.expiries[0]?.key || b.key === cd.expiries[1]?.key ? STATUS.warning : SERIES.blue)} unit="contract(s) ending" height={140} />
        </VizPanel>
        <VizPanel title="Support model of active contracts" table={tableOf(cd.support, 'Active contracts')}>
          <Donut data={cd.support.map(b => ({ ...b, label: b.key === 'OnSite' ? 'On site' : b.label }))} colorOf={b => SUPPORT_OF[b.key] ?? STATUS.neutral} centerLabel="active" />
        </VizPanel>
        <VizPanel title="On-site engineers required, by client" table={tableOf(cd.onSiteByClient, 'Engineers')}
          sub={d.contracts.onSiteRequired ? `${d.contracts.onSiteRequired} on-site engineer(s) in total across active contracts.` : undefined}>
          <HBars data={cd.onSiteByClient} unit="engineer(s)" empty="No active contract requires on-site engineers." />
        </VizPanel>
        <div className="span-2">
          <VizPanel title="SLA targets by priority" sub="Recorded targets of active contracts (median across contracts; the fastest is shown when it differs). Targets are recorded terms, not measured SLA results."
            table={{ columns: ['Priority', 'Contracts', 'Response median', 'Response fastest', 'Resolution median', 'Resolution fastest'], rows: cd.sla.map(r => [r.priority, r.contracts, fmtMinutes(r.responseMedian), fmtMinutes(r.responseFastest), fmtMinutes(r.resolutionMedian), fmtMinutes(r.resolutionFastest)]) }}>
            <SlaMatrix rows={cd.sla} activeContracts={cd.active} />
          </VizPanel>
        </div>
      </div>
    </Band>
  );
}

function OperationsCharts({ d, deferred }: { d: InsightsT; deferred: string }) {
  const nav = useNavigate();
  const condition = d.environments.condition.map(c => ({ ...c, glyph: GLYPH[c.key] }));
  return (
    <Band id="operations" icon="server" title="Commitments, environments and products">
      <div className="viz-grid three">
        <VizPanel title="Open commitments by deadline" sub="Deadline in force compared with now. Recorded deadlines are not SLA results." table={tableOf(d.commitments, 'Open commitments')}>
          <Columns data={d.commitments} colorOf={b => (b.key === 'overdue' ? STATUS.critical : SERIES.blue)} unit="commitment(s)" height={140} />
        </VizPanel>
        <VizPanel title="Environments by reported condition" table={tableOf(d.environments.condition, 'Environments')}
          sub={<>Manually reported, not live monitoring.{d.environments.needsVerification > 0 && <b> {d.environments.needsVerification} need verification.</b>}</>}>
          <Donut data={condition} colorOf={b => STATUS_OF[b.key] ?? STATUS.neutral} centerLabel="environments" />
        </VizPanel>
        <VizPanel title="Open data-quality items by rule" table={tableOf(d.dataQuality, 'Open items')}>
          <HBars data={d.dataQuality} unit="item(s)" empty="No open data-quality items in this filter." />
        </VizPanel>
        <VizPanel title="Product coverage" sub="Distinct environments per product."
          actions={<button className="linkbtn" onClick={() => nav('/versions')}>Version matrix</button>}
          table={{ columns: ['Product', 'Environments', 'Installations', 'Unknown version'], rows: d.products.map(p => [p.product, p.environments, p.installations, p.unknownVersion]) }}>
          <HBars data={d.products.slice(0, 8).map(p => ({ key: String(p.productId), label: p.unknownVersion ? `${p.product} (${p.unknownVersion} unknown version)` : p.product, value: p.environments, link: p.link }))}
            unit="environment(s)" empty="No installations recorded." />
        </VizPanel>
      </div>
      <p className="hint" style={{ margin: '0 0 var(--gap)' }}>{deferred}</p>
    </Band>
  );
}

type Attention = { n: number; text: string; to: string; tone: 'bad' | 'warn' };

/** A51: what needs a decision now, in one line — each item opens its list. */
function AttentionStrip({ dash, d }: { dash: Dash; d: InsightsT }) {
  const m = (k: string) => [...dash.cases, ...dash.commitments].find(x => x.key === k)!;
  const r = (k: string) => d.contracts.renewal.find(x => x.key === k);
  const env = (k: string) => d.environments.condition.find(x => x.key === k);
  const pay = d.payments?.summary;
  const items: Attention[] = [
    { n: m('overdueCases').value, text: 'overdue case(s)', to: m('overdueCases').drilldown, tone: 'bad' },
    { n: m('overdueCommitments').value, text: 'overdue commitment(s)', to: m('overdueCommitments').drilldown, tone: 'bad' },
    { n: d.escalations?.overdue ?? 0, text: 'escalation(s) past a target', to: '/escalations', tone: 'bad' },
    { n: pay?.overdue.count ?? 0, text: 'overdue payment(s)', to: '/notifications?show=payments&state=overdue', tone: 'bad' },
    { n: r('expired')?.value ?? 0, text: 'contract(s) ended but still Active', to: r('expired')?.link ?? '/contracts', tone: 'bad' },
    { n: env('Unavailable')?.value ?? 0, text: 'environment(s) unavailable', to: '/environments', tone: 'bad' },
    { n: r('due')?.value ?? 0, text: 'contract(s) due for renewal', to: r('due')?.link ?? '/contracts', tone: 'warn' },
    { n: pay?.due.count ?? 0, text: `payment(s) due within ${pay?.reminderDays ?? 14} days`, to: '/notifications?show=payments&state=due', tone: 'warn' },
    { n: env('Degraded')?.value ?? 0, text: 'environment(s) degraded', to: '/environments', tone: 'warn' }
  ].filter(x => x.n > 0) as Attention[];
  return (
    <section className="attention" aria-label="Needs attention">
      <span className="attention-h"><Icon name="bell" size={16} /> Needs attention</span>
      {items.length === 0 ? <span className="attention-ok">Nothing is overdue or due — all clear.</span> : (
        <ul>
          {items.map(x => (
            <li key={x.text}><Link className={`att att-${x.tone}`} to={x.to}><b>{x.n}</b> {x.text}</Link></li>
          ))}
        </ul>
      )}
    </section>
  );
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' }, { id: 'map', label: 'Map' }, { id: 'cases', label: 'Cases' }, { id: 'escalations', label: 'Escalations' },
  { id: 'contracts', label: 'Contracts & SLAs' }, { id: 'payments', label: 'Payments' }, { id: 'operations', label: 'Operations' }
];

/** A51: sticky section navigation; the section in view is highlighted. */
function DashNav() {
  const [active, setActive] = useState('overview');
  useEffect(() => {
    // The current section is the last one whose top has passed under the sticky bar.
    const onScroll = () => {
      let cur = SECTIONS[0].id;
      for (const x of SECTIONS) {
        const top = document.getElementById(x.id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= 140) cur = x.id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className="dash-nav" aria-label="Dashboard sections">
      {SECTIONS.map(x => (
        <a key={x.id} href={`#${x.id}`} aria-current={active === x.id ? 'true' : undefined}
          onClick={e => { e.preventDefault(); document.getElementById(x.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActive(x.id); }}>{x.label}</a>
      ))}
    </nav>
  );
}

export function Dashboard() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ clientId: '', teamId: '', productId: '', country: '' });
  const params = { clientId: f.clientId, teamId: f.teamId, productId: f.productId, country: f.country };
  const dash = useQuery({ queryKey: ['dashboard', params], queryFn: () => get<Dash>(`/dashboard${qs(params)}`), placeholderData: keepPreviousData });
  const insights = useQuery({ queryKey: ['insights', params], queryFn: () => get<InsightsT>(`/dashboard/insights${qs(params)}`), placeholderData: keepPreviousData });
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const countries = insights.data?.countries;
  const countryOptions = [...(countries?.rows ?? []).map(c => c.country), ...(countries?.unknownCountryClients ? ['Unknown'] : [])].map(c => ({ value: c, label: c }));
  const filtered = !!(f.clientId || f.teamId || f.productId || f.country);
  const qc = useQueryClient();
  const refreshing = dash.isFetching || insights.isFetching;
  return (
    <div className="dash">
      <PageHead title="Executive overview" sub={dash.data && <>As of {fmtDateTime(dash.data.evaluatedAt)} ({me.timeZone}). Only records you are authorized to see; every figure opens its list.</>}
        actions={<>
          <button className="btn" onClick={() => { qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['insights'] }); }} disabled={refreshing}>
            {refreshing ? <><span className="spin" /> Refreshing…</> : 'Refresh'}
          </button>
          <Link className="btn btn-primary" to={`/actions${qs(params)}`}>Action list</Link>
        </>} />
      <div className="toolbar dash-filters">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized clients" />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
        <SelectInput label="Country" value={f.country} onChange={v => set({ country: v })} options={countryOptions} empty="All countries" />
        {filtered && <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => set({ clientId: '', teamId: '', productId: '', country: '' })}>Clear filters</button>}
      </div>
      <DashNav />
      {(dash.isLoading || insights.isLoading) && <StateMessage kind="loading" />}
      <section id="overview" aria-label="Key figures">
        {dash.data && insights.data && <AttentionStrip dash={dash.data} d={insights.data} />}
        {dash.data && insights.data && <KpiBand dash={dash.data} d={insights.data} />}
      </section>
      {countries && <Geography countries={countries} filtered={f.country} onFilter={c => set({ country: c })} />}
      {insights.data && dash.data && <>
        <CaseCharts d={insights.data} age={dash.data.caseAge} />
        <EscalationCharts d={insights.data} />
        <ContractCharts d={insights.data} />
        <PaymentCharts d={insights.data} />
        <OperationsCharts d={insights.data} deferred={dash.data.deferred} />
      </>}
    </div>
  );
}
