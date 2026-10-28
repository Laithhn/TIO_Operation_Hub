import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { get, qs } from '../api';
import { fmtDate, fmtDateTime, fmtMoney } from '../format';
import { useCan, useEnumLabel, useMe, useUrlState } from '../hooks';
import {
  CAT, Columns, Donut, HBars, Kpi, normalizeCountry, PartBar, RAMP, SERIES, SlaMatrix, STATUS, TrendLines, VizPanel, fmtMinutes,
  type CountryDatum, type SlaRow
} from '../ui/charts';
import { Icon } from '../ui/Icon';
import type { MapMetric } from '../ui/LeafletMap';
import { Badge, DataTable, PageHead, SelectInput, StateMessage, TextInput } from '../ui/kit';
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
type Pt = { key: string; label: string; a: number; b: number };
type EscRow = {
  id: number; ref: string; title: string; clientId: number; client: string; caseId?: number | null; caseRef?: string | null; level: number; owner: string; receivedAt: string;
  responseDueAt?: string | null; resolutionDueAt?: string | null; status: string; overdue: boolean; overdueBy?: number | null; missed?: string | null;
};
type EnvRow = { id: number; name: string; clientId: number; client: string; condition: string; conditionReason?: string | null; conditionObservedAt?: string | null; owner?: string | null; products: string[] };
/** A60: GET /dashboard/command-center — period figures and attention lists. */
type CC = {
  evaluatedAt: string; note: string; period: { from: string; to: string; unit: string; name: string };
  cases: { openCount: number; criticalHigh: number; risk: { breached: number; approaching: number; withinTarget: number; noDeadline: number }; openedInPeriod: number; closedInPeriod: number;
    adherence: { measured: number; onTime: number }; trend: Pt[] };
  escalations?: { active: number; overdue: number; highestLevel: number | null; averageAgeDays: number | null; receivedInPeriod: number; response: { measured: number; met: number };
    resolution: { measured: number; met: number }; trend: Pt[]; attention: EscRow[] } | null;
  contracts?: { within30: number; within60: number; within90: number; expired: number; unknownEnd: number } | null;
  payments?: { open: number; withoutAmount: number; overdueByClient: { clientId: number; client: string; count: number; amounts: { currency: string; amount: number }[] }[] } | null;
  environments: EnvRow[];
  sla: SlaBlock;
};
/** A61: contractual SLA compliance of client cases opened in the period. */
type SlaTally = { met: number; breached: number; pending: number; notMeasurable: number; measured: number; rate: number | null };
type SlaBlock = {
  definition: string; casesInPeriod: number; withContract: number; withoutContract: number; response: SlaTally; resolution: SlaTally;
  overall: { completed: number; compliant: number; rate: number | null }; approaching: number; breachedOpen: number;
  byContract: { contractId: number; contractRef: string; title: string; client?: string | null; cases: number; response: SlaTally; resolution: SlaTally; breached: number }[];
  byPriority: { priority: string; cases: number; response: SlaTally; resolution: SlaTally }[];
  trend: { key: string; label: string; responseMet: number; responseMeasured: number; resolutionMet: number; resolutionMeasured: number }[];
};
type ActionRow = {
  category: string; recordType: string; recordId: number; reference: string; title: string; clientId?: number | null; clientCode?: string | null; owner: string; reason: string;
  nextAction?: string | null; dueAt?: string | null; link: string; severity: string; priority?: string | null;
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
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

const METRICS: (MapMetric & { short: string })[] = [
  { key: 'clients', label: 'Clients', short: 'Clients', value: d => d.clients },
  { key: 'servers', label: 'Servers', short: 'Servers', value: d => (d as MapDatum).servers ?? 0 },
  { key: 'cases', label: 'Open cases', short: 'Open cases', value: d => d.openCases, alert: d => d.overdueCases > 0 },
  { key: 'overdue', label: 'Overdue items', short: 'Overdue', value: d => d.overdueCases + d.overdueCommitments, alert: d => d.overdueCases + d.overdueCommitments > 0 },
  { key: 'contracts', label: 'Active contracts', short: 'Contracts', value: d => (d as MapDatum).activeContracts ?? 0, alert: d => ((d as MapDatum).renewalAttention ?? 0) > 0 }
];

const rate = (met: number, measured: number) => (measured ? `${Math.round((met / measured) * 100)} %` : null);
const PERIOD_LABEL: Record<string, string> = { today: 'today', '7d': 'the last 7 days', '30d': 'the last 30 days', quarter: 'this quarter', custom: 'the chosen dates' };

/** Hours (from now) as "3 d 4 h" / "5 h" / "20 min". */
function span(ms: number) {
  const m = Math.round(Math.abs(ms) / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}
function dueText(iso?: string | null) {
  if (!iso) return <span className="muted">No date</span>;
  const ms = new Date(iso).getTime() - Date.now();
  return ms < 0 ? <span className="t-bad"><b>{span(ms)}</b> overdue</span> : <span className={ms < 86400000 ? 't-warn' : undefined}>due in {span(ms)}</span>;
}

/** A60: the executive figures — each opens its list; nothing is shown that the data cannot support. Main figures in large cards, the others in small tiles. */
function KpiGrid({ dash, d, cc }: { dash: Dash; d: InsightsT; cc: CC }) {
  const m = (k: string) => [...dash.cases, ...dash.commitments].find(x => x.key === k)!;
  const openCases = m('openCases'), overdueCases = m('overdueCases'), openComs = m('openCommitments'), upcoming = m('upcomingCommitments');
  const clients = d.countries.rows.reduce((s, r) => s + r.clients, 0) + d.countries.unknownCountryClients;
  const env = (k: string) => d.environments.condition.find(c => c.key === k)?.value ?? 0;
  const envTotal = d.environments.condition.reduce((s, c) => s + c.value, 0);
  const cd = d.contractDetail;
  const renewalDue = d.contracts.renewal.find(r => r.key === 'due')?.value ?? 0;
  const review = (cc.contracts?.expired ?? 0) + (cc.contracts?.unknownEnd ?? 0);
  const e = cc.escalations;
  const pay = d.payments?.summary;
  const resp = e ? rate(e.response.met, e.response.measured) : null;
  const reso = e ? rate(e.resolution.met, e.resolution.measured) : null;
  const adh = rate(cc.cases.adherence.onTime, cc.cases.adherence.measured);
  // All measured targets of the period together: escalation response and resolution, and case due dates.
  const metAll = (e ? e.response.met + e.resolution.met : 0) + cc.cases.adherence.onTime;
  const measuredAll = (e ? e.response.measured + e.resolution.measured : 0) + cc.cases.adherence.measured;
  const amounts = (x?: PayPart) => x?.amounts.map(a => fmtMoney(a.amount, a.currency)).join(' + ') ?? '';
  return (
    <div className="cc-kpi-tiers">
      {/* Main figures (owner order, 28 Oct 2026): contracts, payments, commitments, escalations, cases. */}
      <div className="kpis cc-kpis kpis-main" role="group" aria-label="Main figures">
        {cd && <Kpi size="main" icon={<Icon name="list" size={18} />} accent="primary" label="Active contracts" value={cd.active} to="/contracts?status=Active" tone={renewalDue || review ? 'warning' : undefined}
          part={renewalDue} of={cd.active} partLabel={renewalDue ? `${renewalDue} due for renewal` : 'None due for renewal'}
          context={review ? `${review} need review (ended but Active, or no end date)` : 'None need review'} />}
        {pay && <Kpi size="main" icon={<Icon name="report" size={18} />} accent="amber" label="Overdue payments" value={pay.overdue.count} to="/notifications?show=payments&state=overdue"
          tone={pay.overdue.count ? 'critical' : undefined}
          partLabel={pay.overdue.count ? (pay.overdue.amounts.length ? amounts(pay.overdue) : 'Amounts not recorded') : 'None overdue'}
          context={`${pay.due.count} due within ${pay.reminderDays} days`} />}
        <Kpi size="main" icon={<Icon name="commitment" size={18} />} accent="amber" label="Upcoming commitments" value={upcoming.value} to={upcoming.drilldown} tone={upcoming.value ? 'critical' : undefined} valueTone="critical"
          partLabel={`${openComs.value} open commitments`}
          context={<strong className="critical-text">Due in the next {dash.upcomingDays} days</strong>} />
        {e && <Kpi size="main" icon={<Icon name="escalation" size={18} />} accent="red" label="Active escalations" value={e.active} to="/escalations" tone={e.overdue ? 'critical' : undefined}
          part={e.overdue} of={e.active} partLabel={e.overdue ? `${e.overdue} past a target` : 'None past a target'}
          context={e.highestLevel ? `Highest active level: ${e.highestLevel}` : 'No active escalation'} />}
        <Kpi size="main" icon={<Icon name="case" size={18} />} accent="attention" label="Open cases" value={openCases.value} to={openCases.drilldown} tone={overdueCases.value ? 'critical' : undefined}
          part={overdueCases.value} of={openCases.value} partLabel={overdueCases.value ? `${overdueCases.value} overdue` : 'None overdue'}
          context={`${cc.cases.criticalHigh} critical or high priority`} />
      </div>
      {/* Secondary figures: smaller tiles. */}
      <div className="kpis cc-kpis kpis-secondary" role="group" aria-label="More figures">
        <Kpi size="small" icon={<Icon name="clients" size={18} />} accent="primary" label="Clients" value={clients} to="/clients"
          context={<>{d.countries.rows.length} countr{d.countries.rows.length === 1 ? 'y' : 'ies'}{d.countries.unknownCountryClients ? `, ${d.countries.unknownCountryClients} without a country` : ''}</>} />
        <Kpi size="small" icon={<Icon name="dashboard" size={18} />} accent="green" label="Targets met (period)" value={rate(metAll, measuredAll) ?? 'Not available'} to="/escalations?status=all"
          tone={cc.cases.risk.approaching ? 'warning' : undefined}
          partLabel={e ? `Escalation response ${resp ?? 'n/a'} · resolution ${reso ?? 'n/a'}` : undefined}
          context={<>Case due dates met: {adh ?? 'n/a'}{cc.cases.risk.approaching ? ` · ${cc.cases.risk.approaching} case(s) due within 24 h` : ''}</>} />
        <Kpi size="small" icon={<Icon name="matrix" size={18} />} accent="silver" label="Contractual SLA met (period)" value={rate(cc.sla.response.met + cc.sla.resolution.met, cc.sla.response.measured + cc.sla.resolution.measured) ?? 'Not available'}
          to="/cases?sla=withContract&status=all" tone={cc.sla.breachedOpen ? 'critical' : cc.sla.approaching ? 'warning' : undefined}
          partLabel={`Response ${cc.sla.response.rate ?? 'n/a'}${cc.sla.response.rate !== null ? ' %' : ''} · resolution ${cc.sla.resolution.rate ?? 'n/a'}${cc.sla.resolution.rate !== null ? ' %' : ''}`}
          context={<>{cc.sla.response.measured + cc.sla.resolution.measured} obligation(s) measured{cc.sla.breachedOpen ? ` · ${cc.sla.breachedOpen} open case(s) breached` : ''}</>} />
        <Kpi size="small" icon={<Icon name="server" size={18} />} accent="green" label="Environment health" value={`${env('Healthy')} / ${envTotal}`} to="/environments"
          tone={env('Unavailable') ? 'critical' : env('Degraded') ? 'warning' : undefined}
          partLabel={`healthy · ${env('Degraded')} degraded · ${env('Unavailable')} unavailable`}
          context={`${env('Unknown')} not reported (unknown) · manually reported`} />
      </div>
    </div>
  );
}

const SEVERITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const SEVERITY_TONE: Record<string, 'bad' | 'warn' | 'info' | 'neutral'> = { Critical: 'bad', High: 'warn', Medium: 'info', Low: 'neutral' };
const QUEUE: Record<string, string> = {
  OverdueCase: 'Overdue case', CaseDueSoon: 'Case due within 24 h', EscalationOverdue: 'Escalation past target', EnvironmentCondition: 'Environment degraded or down',
  OverdueCommitment: 'Overdue commitment', PaymentDue: 'Payment', ContractRenewal: 'Contract renewal', Unassigned: 'Unassigned case'
};
type QueueRow = ActionRow & { also: string[] };

/** A60: one queue of what needs action now, from the action list — most severe and earliest due first, one row per record. */
function ActionCenter({ params }: { params: Record<string, string> }) {
  const q = useQuery({ queryKey: ['actions', params], queryFn: () => get<{ items: ActionRow[] }>(`/dashboard/actions${qs(params)}`), placeholderData: keepPreviousData });
  const [cat, setCat] = useState('');
  const [all, setAll] = useState(false);
  const rows = useMemo(() => {
    const items = (q.data?.items ?? []).filter(i => QUEUE[i.category] && (i.category !== 'Unassigned' || i.severity === 'High'));
    const byRecord = new Map<string, QueueRow>();
    for (const i of [...items].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])) {
      const key = `${i.recordType}:${i.recordId}`;
      const have = byRecord.get(key);
      if (!have) byRecord.set(key, { ...i, also: [] });
      else if (have.category !== i.category && !have.also.includes(QUEUE[i.category])) have.also.push(QUEUE[i.category]);
    }
    return [...byRecord.values()].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      || (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity));
  }, [q.data]);
  const counts = useMemo(() => rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.category]: (m[r.category] ?? 0) + 1 }), {}), [rows]);
  const shown = rows.filter(r => !cat || r.category === cat);
  const visible = all ? shown : shown.slice(0, 8);
  const critical = rows.filter(r => r.severity === 'Critical').length;
  return (
    <section className="dash-band" id="attention" aria-labelledby="attention-h">
      <div className="band-head">
        <span className="band-ic" aria-hidden="true"><Icon name="bell" size={16} /></span>
        <h2 className="band-title" id="attention-h">Needs immediate attention</h2>
        <span className="hint">{q.isLoading ? 'Loading…' : rows.length === 0 ? 'Nothing is overdue, due within 24 hours or down — all clear.' : `${rows.length} item(s) · ${critical} critical`}</span>
      </div>
      <section className="panel cc-queue">
        {rows.length > 0 && (
          <div className="cc-chips" role="group" aria-label="Issue type">
            <button aria-pressed={!cat} onClick={() => setCat('')}>All <b>{rows.length}</b></button>
            {Object.keys(QUEUE).filter(k => counts[k]).map(k => (
              <button key={k} aria-pressed={cat === k} onClick={() => setCat(cat === k ? '' : k)}>{QUEUE[k]} <b>{counts[k]}</b></button>
            ))}
          </div>
        )}
        <DataTable<QueueRow> rowKey={r => `${r.recordType}:${r.recordId}`} rows={visible} loading={q.isLoading} error={q.error} tools={false} pageSize={50} empty="none"
          caption="Needs immediate attention" columns={[
            { key: 'p', header: 'Priority', render: r => <><Badge tone={SEVERITY_TONE[r.severity] ?? 'neutral'}>{r.severity}</Badge>{r.priority && <span className="hint pay-sub">{r.priority} priority</span>}</> },
            { key: 'i', header: 'Issue', render: r => <><span className="cc-kind">{QUEUE[r.category]}</span><Link to={r.link}><b>{r.reference}</b></Link> <span className="cc-title">{r.title}</span></> },
            { key: 'c', header: 'Client', render: r => r.clientId ? <Link to={`/clients/${r.clientId}`}>{r.clientCode ?? 'Client'}</Link> : <span className="muted">Internal</span> },
            { key: 'o', header: 'Owner', render: r => r.owner === 'Unassigned' ? <Badge tone="warn">Unassigned</Badge> : r.owner },
            { key: 'd', header: 'Age / due', className: 'nowrap', render: r => dueText(r.dueAt) },
            { key: 's', header: 'Status', render: r => <>{r.reason}{r.also.length > 0 && <span className="hint">also: {r.also.join(', ')}</span>}</> },
            { key: 'a', header: 'Action', className: 'nowrap', render: r => <Link className="btn btn-sm" to={r.link} title={r.nextAction ?? undefined} aria-label={`Open ${r.reference}`}>Open</Link> }
          ]} />
        <div className="cc-queue-foot">
          {shown.length > 8 && <button className="linkbtn" onClick={() => setAll(v => !v)}>{all ? 'Show the top 8' : `Show all ${shown.length}`}</button>}
          <Link to={`/actions${qs(params)}`}>Open the full action list</Link>
          <span className="hint">Severity: overdue critical/high work, escalations past a target and unavailable environments are Critical. One row per record; other warnings on it are listed under Status.</span>
        </div>
      </section>
    </section>
  );
}

/** A39: interactive map/** A39: interactive map — metric switch, country selection with its clients beside the map, filter and zoom. */
/** A59: the map page — the overview is opened for a country instead of filtering in place. */
function Geography({ countries, overviewFor, initial }: { countries: InsightsT['countries']; overviewFor: (country: string) => string; initial?: string }) {
  const me = useMe().data!;
  const tiles = me.app.map;
  const nav = useNavigate();
  const [metricKey, setMetricKey] = useState('clients');
  const [selected, setSelected] = useState<string | null>(initial || null);
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
    <section className="map-panel panel">
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
              <Link className="btn btn-primary" to={overviewFor(sel.country)}>Show the overview for {sel.country}</Link>
              <Link className="btn" to={`/clients${qs({ country: sel.country })}`}>Open client list</Link>
            </div>
          </>
        ) : (
          <>
            <div className="map-side-head"><h3>Countries by {metric.label.toLowerCase()}</h3></div>
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

function CaseCharts({ d, age, cc }: { d: InsightsT; age: Dash['caseAge']; cc: CC }) {
  const caseStatusLabel = useEnumLabel('CaseStatus');
  const byStatus = d.cases.byStatus.map(c => ({ ...c, label: caseStatusLabel(c.key) }));
  const r = cc.cases.risk;
  const risk: BarT[] = [
    { key: 'breached', label: 'Past due', value: r.breached, link: '/cases?due=overdue' },
    { key: 'approaching', label: 'Due within 24 h', value: r.approaching, link: '/cases?due=24h' },
    { key: 'within', label: 'Due later', value: r.withinTarget, link: null },
    { key: 'none', label: 'No due date', value: r.noDeadline, link: '/cases?due=none' }
  ];
  const RISK_OF: Record<string, string> = { breached: STATUS.critical, approaching: STATUS.warning, within: STATUS.good, none: STATUS.neutral };
  const trend = cc.cases.trend.map(t => ({ label: t.label, a: t.a, b: t.b }));
  const adh = rate(cc.cases.adherence.onTime, cc.cases.adherence.measured);
  return (
    <Band id="cases" icon="case" title="Cases and commitments" hint={<>{cc.cases.openCount} open now · {cc.cases.openedInPeriod} opened and {cc.cases.closedInPeriod} closed in {PERIOD_LABEL[cc.period.name]}</>}>
      <div className="viz-grid three">
        <VizPanel title="Deadline risk of open cases" sub={<>By the case due date (not a contractual SLA measurement). Due dates met by cases closed in the period: <b>{adh ?? 'not available'}</b>{adh && ` (${cc.cases.adherence.measured} closed with a due date)`}.</>}
          table={tableOf(risk, 'Open cases')}>
          <PartBar data={risk} colorOf={b => RISK_OF[b.key] ?? STATUS.neutral} unit="open cases" />
        </VizPanel>
        <VizPanel title="Open cases by priority" sub="Darker = more urgent. Click a slice for the list." table={tableOf(d.cases.byPriority)}>
          <Donut data={d.cases.byPriority} colorOf={b => PRIORITY_OF[b.key] ?? RAMP[1]} centerLabel="open cases" />
        </VizPanel>
        <VizPanel title="Open cases by status" sub="Waiting is tracked separately; it is not a status." table={tableOf(byStatus)}>
          <HBars data={byStatus} unit="case(s)" empty="No open cases." />
        </VizPanel>
        <VizPanel title="Age of open cases" table={tableOf(d.cases.age, 'Open cases')}
          sub={<>Average {age.averageDays ?? '—'}{age.averageDays !== null && ' days'}, oldest {age.oldestDays ?? '—'}{age.oldestDays !== null && ' days'}.</>}>
          <Columns data={d.cases.age} unit="case(s)" height={140} />
        </VizPanel>
        <VizPanel title={`Cases opened and closed — ${PERIOD_LABEL[cc.period.name]}`} sub={`Per ${cc.period.unit}, in your time zone.`}
          table={{ columns: ['Period', 'Opened', 'Closed'], rows: trend.map(t => [t.label, t.a, t.b]) }}>
          <TrendLines data={trend} aLabel="Opened" bLabel="Closed" />
        </VizPanel>
        <VizPanel title="Open commitments by deadline" sub="Deadline in force compared with now." table={tableOf(d.commitments, 'Open commitments')}>
          <Columns data={d.commitments} colorOf={b => (b.key === 'overdue' ? STATUS.critical : SERIES.blue)} unit="commitment(s)" height={140} />
        </VizPanel>
      </div>
    </Band>
  );
}

// Escalation status: active states in the blue ramp (darker = further along), outcomes in neutral and categorical slots.
const ESC_STATUS_OF: Record<string, string> = { Open: RAMP[4], Acknowledged: RAMP[2], InProgress: RAMP[1], Resolved: CAT[2], Closed: STATUS.neutral, Withdrawn: CAT[1] };
const LEVEL_OF: Record<string, string> = { '1': RAMP[1], '2': RAMP[3], '3': RAMP[4] };

/** A41/A60: escalations — measured target results, the attention list, level, status, channel and volume in the period. */
function EscalationCharts({ d, cc }: { d: InsightsT; cc: CC }) {
  const nav = useNavigate();
  const x = d.escalations;
  const e = cc.escalations;
  if (!x || !e) return null;
  const vol = e.trend.map(t => ({ key: t.key, label: t.label, value: t.a, link: null }));
  return (
    <Band id="escalations" icon="escalation" title="Escalations"
      hint={<>{e.active} active · {e.overdue} past a target · average age {e.averageAgeDays ?? '—'}{e.averageAgeDays !== null && ' days'} · {e.receivedInPeriod} received in {PERIOD_LABEL[cc.period.name]}</>}>
      <section className="panel" aria-labelledby="esc-att-h">
        <div className="panel-head" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 id="esc-att-h" style={{ margin: 0 }}>Escalation attention list</h2>
          <span className="hint" style={{ marginLeft: 'auto' }}>Targets met in the period — response {rate(e.response.met, e.response.measured) ?? 'not available'} ({e.response.measured} measured), resolution {rate(e.resolution.met, e.resolution.measured) ?? 'not available'} ({e.resolution.measured} measured)</span>
        </div>
        <DataTable<EscRow> rowKey={r => r.id} rows={e.attention} tools={false} empty="none" caption="Escalation attention list" columns={[
          { key: 'r', header: 'Escalation', render: r => <><Link to={`/escalations/${r.id}`}><b>{r.ref}</b></Link> <span className="cc-title">{r.title}</span></> },
          { key: 'c', header: 'Client', render: r => <Link to={`/clients/${r.clientId}`}>{r.client}</Link> },
          { key: 'k', header: 'Related case', render: r => r.caseId ? <Link to={`/cases/${r.caseId}`}>{r.caseRef}</Link> : <span className="muted">—</span> },
          { key: 'l', header: 'Level', className: 'num', render: r => r.level },
          { key: 'o', header: 'Owner', render: r => r.owner },
          { key: 'd', header: 'Raised', className: 'nowrap', render: r => fmtDate(r.receivedAt) },
          { key: 't', header: 'Target', className: 'nowrap', render: r => r.overdue ? <span className="t-bad"><b>{span((r.overdueBy ?? 0) * 3600000)}</b> past {r.missed}</span>
            : dueText(r.status === 'Open' && r.responseDueAt ? r.responseDueAt : r.resolutionDueAt) },
          { key: 's', header: 'Status', render: r => <StatusText v={r.status} /> }
        ]} />
      </section>
      <div className="viz-grid three">
        <VizPanel title="Active escalations by level" sub="Level 3 is the highest." table={tableOf(x.byLevel, 'Active')}>
          <Columns data={x.byLevel} colorOf={b => LEVEL_OF[b.key] ?? RAMP[1]} unit="active escalation(s)" height={140} />
        </VizPanel>
        <VizPanel title="Escalations by status" table={tableOf(x.byStatus, 'Escalations')}>
          <Donut data={x.byStatus.map(b => ({ ...b, label: b.key === 'InProgress' ? 'In progress' : b.label }))} colorOf={b => ESC_STATUS_OF[b.key] ?? STATUS.neutral} centerLabel="escalations" />
        </VizPanel>
        <VizPanel title={`Escalations received — ${PERIOD_LABEL[cc.period.name]}`} sub={`Per ${cc.period.unit}.`} table={tableOf(vol, 'Received')}
          actions={<button className="linkbtn" onClick={() => nav('/escalations?status=all')}>All escalations</button>}>
          <Columns data={vol} unit="escalation(s)" height={140} />
        </VizPanel>
      </div>
    </Band>
  );
}

const StatusText = ({ v }: { v: string }) => <>{v === 'InProgress' ? 'In progress' : v}</>;

const PAY_STATE: Record<string, { label: string; tone: 'bad' | 'warn' | 'info' | 'good' | 'neutral' }> = {
  overdue: { label: 'Overdue', tone: 'bad' }, due: { label: 'Due soon', tone: 'warn' }, upcoming: { label: 'Scheduled', tone: 'info' },
  paid: { label: 'Paid', tone: 'good' }, waived: { label: 'Waived', tone: 'neutral' }, closed: { label: 'Contract terminated', tone: 'neutral' }
};

/** A50: contract payments — open payments by month due, amounts per currency (never added across currencies) and the next payments. */
function PaymentCharts({ d, cc }: { d: InsightsT; cc: CC }) {
  const nav = useNavigate();
  const p = d.payments;
  const extra = cc.payments;
  if (!p) return null;
  const s = p.summary;
  const months = p.byMonth.slice(1).map(b => b.label);
  const open = s.overdue.count + s.due.count + s.upcoming.count;
  return (
    <Band id="payments" icon="report" title="Contract payments" hint={<>{open} open payment(s) · {s.overdue.count} overdue · {s.due.count} due within {s.reminderDays} days (setting <i>Contracts.PaymentReminderDays</i>)</>}>
      {extra && extra.withoutAmount > 0 && (
        <p className="cc-warn" role="note"><Icon name="report" size={14} /> {extra.withoutAmount} of {extra.open} open payment(s) have no amount recorded, so the amounts below are incomplete. Add them on the contracts' payment terms.</p>
      )}
      <div className="viz-grid three">
        <VizPanel title="Open payments by month due" sub="Pending or invoiced payments; overdue ones are shown first. Click Overdue for the list." table={tableOf(p.byMonth, 'Payments')}
          actions={<button className="linkbtn" onClick={() => nav('/notifications?show=payments&state=open')}>All open payments</button>}>
          <Columns data={p.byMonth} colorOf={b => (b.key === 'overdue' ? STATUS.critical : SERIES.blue)} unit="payment(s)" height={140} />
        </VizPanel>
        <VizPanel title="Amounts due by currency" sub="Overdue and the next six months. Each currency is totalled on its own."
          table={{ columns: ['Currency', 'Overdue', ...months], rows: p.amountsByMonth.map(a => [a.currency || '—', fmtMoney(a.overdue), ...a.months.map(m => fmtMoney(m))]) }}>
          {p.amountsByMonth.length === 0 ? <div className="viz-empty">No amounts recorded on open payments.</div> : (
            <DataTable caption="Amounts due by currency" rows={p.amountsByMonth} rowKey={a => a.currency} tools={false} tableClassName="pay-amounts" columns={[
              { key: 'currency', header: 'Currency', render: a => a.currency || '—' },
              { key: 'overdue', header: 'Overdue', className: 'num', render: a => <span className={a.overdue ? 'pay-bad' : 'muted'}>{fmtMoney(a.overdue)}</span> },
              { key: 'due', header: `Due within ${s.reminderDays} days`, className: 'num', render: a => { const due = s.due.amounts.find(x => x.currency === a.currency)?.amount ?? 0; return <span className={due ? 'pay-warn' : 'muted'}>{fmtMoney(due)}</span>; } },
              { key: 'next', header: 'Next 6 months', className: 'num', render: a => fmtMoney(a.months.reduce((x, y) => x + y, 0)) }
            ]} />
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
        <VizPanel title="Overdue payments by client" sub="Amounts per currency; never added across currencies."
          table={{ columns: ['Client', 'Overdue payments', 'Amounts'], rows: (extra?.overdueByClient ?? []).map(c => [c.client, c.count, c.amounts.map(a => fmtMoney(a.amount, a.currency)).join(' + ') || 'not recorded']) }}>
          {(extra?.overdueByClient.length ?? 0) === 0 ? <div className="viz-empty">No overdue payments.</div> : (
            <ul className="pay-next">
              {extra!.overdueByClient.map(c => (
                <li key={c.clientId}>
                  <span className="pay-date"><Link to={`/clients/${c.clientId}`}>{c.client}</Link></span>
                  <span className="pay-what">{c.count} overdue</span>
                  <span className="pay-amt">{c.amounts.map(a => fmtMoney(a.amount, a.currency)).join(' + ') || <span className="muted">amount not recorded</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </VizPanel>
      </div>
    </Band>
  );
}

function ContractCharts({ d, cc }: { d: InsightsT; cc: CC }) {
  const nav = useNavigate();
  const cd = d.contractDetail;
  if (!cd) return <Band id="contracts" icon="list" title="Contracts & SLAs"><p className="hint">Contract charts are shown when the dashboard is not filtered by team.</p></Band>;
  const expiring = cd.expiries.reduce((s, b) => s + b.value, 0);
  return (
    <Band id="contracts" icon="list" title="Contracts & SLAs" hint={<>{cd.total} contract(s) in view · {cd.active} active · {cd.withSla} with SLA targets ({pct(cd.withSla, cd.active)} %)</>}>
      {cc.contracts && (
        <div className="cc-tiles" aria-label="Contract health">
          <Link to="/contracts?status=Active" className="cc-tile"><b>{cd.active}</b><span>active</span></Link>
          <Link to="/contracts?renewal=due" className={`cc-tile${cc.contracts.within30 ? ' warn' : ''}`}><b>{cc.contracts.within30}</b><span>ending within 30 days</span></Link>
          <Link to="/contracts?renewal=due" className="cc-tile"><b>{cc.contracts.within60}</b><span>ending in 31–60 days</span></Link>
          <Link to="/contracts?renewal=due" className="cc-tile"><b>{cc.contracts.within90}</b><span>ending in 61–90 days</span></Link>
          <Link to="/contracts?renewal=expired" className={`cc-tile${cc.contracts.expired ? ' bad' : ''}`}><b>{cc.contracts.expired}</b><span>ended but still Active</span></Link>
          <Link to="/contracts?renewal=unknownEnd" className={`cc-tile${cc.contracts.unknownEnd ? ' warn' : ''}`}><b>{cc.contracts.unknownEnd}</b><span>no end date recorded</span></Link>
        </div>
      )}
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
          <VizPanel title="SLA targets by priority (configured contractual targets)" sub="Configured targets of active contracts (median across contracts; the fastest is shown when it differs). These are contractual terms, not achieved results."
            table={{ columns: ['Priority', 'Contracts', 'Response median', 'Response fastest', 'Resolution median', 'Resolution fastest'], rows: cd.sla.map(r => [r.priority, r.contracts, fmtMinutes(r.responseMedian), fmtMinutes(r.responseFastest), fmtMinutes(r.resolutionMedian), fmtMinutes(r.resolutionFastest)]) }}>
            <SlaMatrix rows={cd.sla} activeContracts={cd.active} />
          </VizPanel>
        </div>
        <section className="panel viz-panel cc-sla">
          <div className="panel-head"><h2>Measured SLA compliance</h2></div>
          <div className="panel-body">
            <p>Configured targets above are the contractual terms. What cases achieved against them is measured in <a href="#sla">Contractual SLA compliance</a>.</p>
            <p className="hint">Response and resolution {rateText(cc.sla.response)} / {rateText(cc.sla.resolution)} for client cases opened in {PERIOD_LABEL[cc.period.name]}.</p>
          </div>
        </section>
      </div>
    </Band>
  );
}

const rateText = (t: SlaTally) => (t.rate === null ? 'not available' : `${t.rate} %`);
const OUTCOME_OF: Record<string, string> = { met: STATUS.good, breached: STATUS.critical, pending: SERIES.blue, notMeasurable: STATUS.neutral };

/** A61: contractual response and resolution compliance, with every denominator shown and every count linked to its cases. */
function SlaCharts({ cc, scope, slaContractId, slaPriority, onFilter }: {
  cc: CC; scope: Record<string, string>; slaContractId: string; slaPriority: string; onFilter: (x: { slaContractId?: string; slaPriority?: string }) => void;
}) {
  const s = cc.sla;
  const period = { status: 'all', createdFrom: cc.period.from, createdTo: cc.period.to };
  const link = (sla: string, extra: Record<string, string> = {}, inPeriod = true) =>
    `/cases${qs({ ...scope, ...(inPeriod ? period : {}), contractId: slaContractId, priority: slaPriority, sla, ...extra })}`;
  const parts = (t: SlaTally, kind: 'response' | 'resolution'): BarT[] => [
    { key: 'met', label: 'Met', value: t.met, link: link(`${kind}Met`) },
    { key: 'breached', label: 'Breached', value: t.breached, link: link(`${kind}Breached`) },
    { key: 'pending', label: 'Pending (running)', value: t.pending, link: link(`${kind}Pending`) },
    { key: 'notMeasurable', label: 'Not measurable', value: t.notMeasurable, link: link(`${kind}NotMeasurable`) }
  ];
  const trend = s.trend.map(t => ({ label: t.label, a: t.responseMet + t.resolutionMet, b: t.responseMeasured - t.responseMet + t.resolutionMeasured - t.resolutionMet }));
  const ratio = (t: SlaTally) => `${t.met} of ${t.measured}`;
  const priorities = ['Critical', 'High', 'Normal', 'Low'];
  return (
    <Band id="sla" icon="matrix" title="Contractual SLA compliance"
      hint={<>{s.withContract} of {s.casesInPeriod} client case(s) opened in {PERIOD_LABEL[cc.period.name]} are linked to a contract · <Link to={link('noContract')}>{s.withoutContract} without a contract</Link> (not measured)</>}>
      <div className="sla-filters">
        <SelectInput label="Contract" value={slaContractId} onChange={v => onFilter({ slaContractId: v })} empty="All contracts"
          options={[...s.byContract.map(k => ({ value: String(k.contractId), label: `${k.contractRef} · ${k.client ?? ''}` })),
            ...(slaContractId && !s.byContract.some(k => String(k.contractId) === slaContractId) ? [{ value: slaContractId, label: `Contract #${slaContractId}` }] : [])]} />
        <SelectInput label="Priority" value={slaPriority} onChange={v => onFilter({ slaPriority: v })} empty="All priorities" options={priorities.map(p => ({ value: p, label: p }))} />
      </div>
      <p className="hint sla-def">{s.definition}</p>
      <div className="cc-tiles sla-tiles" aria-label="Contractual SLA figures">
        <Link to={link('responseBreached')} className={`cc-tile${s.response.breached ? ' bad' : s.response.measured ? ' good' : ''}`}>
          <b>{rateText(s.response)}</b><span>Response compliance</span><small>{ratio(s.response)} met · {s.response.pending} pending · {s.response.notMeasurable} not measurable</small></Link>
        <Link to={link('resolutionBreached')} className={`cc-tile${s.resolution.breached ? ' bad' : s.resolution.measured ? ' good' : ''}`}>
          <b>{rateText(s.resolution)}</b><span>Resolution compliance</span><small>{ratio(s.resolution)} met · {s.resolution.pending} pending · {s.resolution.notMeasurable} not measurable</small></Link>
        <Link to={link('withContract')} className="cc-tile">
          <b>{s.overall.rate === null ? 'not available' : `${s.overall.rate} %`}</b><span>Overall (both met)</span><small>{s.overall.compliant} of {s.overall.completed} case(s) with both obligations completed</small></Link>
        <Link to={link('approaching', { status: '', createdFrom: '', createdTo: '' }, false)} className={`cc-tile${s.approaching ? ' warn' : ''}`}>
          <b>{s.approaching}</b><span>Approaching breach</span><small>open, a deadline within 24 hours</small></Link>
        <Link to={link('breached', { status: '', createdFrom: '', createdTo: '' }, false)} className={`cc-tile${s.breachedOpen ? ' bad' : ''}`}>
          <b>{s.breachedOpen}</b><span>Open and breached</span><small>open now, any obligation breached</small></Link>
      </div>
      <div className="viz-grid three">
        <VizPanel title="First response" sub={<>Rate = met ÷ (met + breached) = {ratio(s.response)}. Click a part for the cases.</>} table={tableOf(parts(s.response, 'response'), 'Cases')}>
          <PartBar data={parts(s.response, 'response')} colorOf={b => OUTCOME_OF[b.key] ?? STATUS.neutral} unit="case(s)" />
        </VizPanel>
        <VizPanel title="Resolution" sub={<>Rate = met ÷ (met + breached) = {ratio(s.resolution)}. Click a part for the cases.</>} table={tableOf(parts(s.resolution, 'resolution'), 'Cases')}>
          <PartBar data={parts(s.resolution, 'resolution')} colorOf={b => OUTCOME_OF[b.key] ?? STATUS.neutral} unit="case(s)" />
        </VizPanel>
        <VizPanel title={`Obligations met and breached — ${PERIOD_LABEL[cc.period.name]}`} sub={`By the week, day or hour the case was opened; response and resolution together.`}
          table={{ columns: ['Period', 'Response met', 'Response measured', 'Resolution met', 'Resolution measured'], rows: s.trend.map(t => [t.label, t.responseMet, t.responseMeasured, t.resolutionMet, t.resolutionMeasured]) }}>
          <TrendLines data={trend} aLabel="Met" bLabel="Breached" />
        </VizPanel>
        <div className="span-2">
          <VizPanel title="By contract" sub="Contracts with the most breaches first (top 10)."
            table={{ columns: ['Contract', 'Client', 'Cases', 'Response met', 'Response measured', 'Resolution met', 'Resolution measured'], rows: s.byContract.map(k => [k.contractRef, k.client ?? '', k.cases, k.response.met, k.response.measured, k.resolution.met, k.resolution.measured]) }}>
            {s.byContract.length === 0 ? <div className="viz-empty">No case opened in the period is linked to a contract.</div> : (
              <DataTable caption="SLA results by contract" rows={s.byContract} rowKey={k => k.contractId} tools={false} columns={[
                { key: 'contract', header: 'Contract', render: k => <><Link to={`/contracts/${k.contractId}`}>{k.contractRef}</Link> <span className="hint">{k.title}</span></> },
                { key: 'client', header: 'Client', render: k => k.client },
                { key: 'cases', header: 'Cases', className: 'num', render: k => <Link to={link('withContract', { contractId: String(k.contractId) })}>{k.cases}</Link> },
                { key: 'response', header: 'Response', render: k => <>{rateText(k.response)} <span className="hint">({ratio(k.response)})</span></> },
                { key: 'resolution', header: 'Resolution', render: k => <>{rateText(k.resolution)} <span className="hint">({ratio(k.resolution)})</span></> },
                { key: 'breached', header: 'Breached', className: 'num', render: k => k.breached ? <Link className="err" to={link('responseBreached', { contractId: String(k.contractId) })}>{k.breached}</Link> : 0 }
              ]} />)}
          </VizPanel>
        </div>
        <VizPanel title="By priority" sub="Each case is measured against the target for its priority."
          table={{ columns: ['Priority', 'Cases', 'Response met', 'Response measured', 'Resolution met', 'Resolution measured'], rows: s.byPriority.map(p => [p.priority, p.cases, p.response.met, p.response.measured, p.resolution.met, p.resolution.measured]) }}>
          <DataTable caption="SLA results by priority" rows={s.byPriority} rowKey={p => p.priority} tools={false} columns={[
            { key: 'priority', header: 'Priority', render: p => p.priority },
            { key: 'cases', header: 'Cases', className: 'num', render: p => p.cases ? <Link to={link('withContract', { priority: p.priority })}>{p.cases}</Link> : 0 },
            { key: 'response', header: 'Response', render: p => <>{rateText(p.response)} <span className="hint">({ratio(p.response)})</span></> },
            { key: 'resolution', header: 'Resolution', render: p => <>{rateText(p.resolution)} <span className="hint">({ratio(p.resolution)})</span></> }
          ]} />
        </VizPanel>
      </div>
    </Band>
  );
}

const DQ_SEVERITY: Record<string, string> = {
  MissingOwner: 'High', UnknownEnvironment: 'High', StaleReview: 'Medium', ConditionNeedsVerification: 'Medium', CountryUnknown: 'Medium', UnknownVersion: 'Medium'
};

/** A60: service and environment health — reported condition, the environments that are not healthy, product coverage. */
function HealthCharts({ d, cc }: { d: InsightsT; cc: CC }) {
  const nav = useNavigate();
  const conditionLabel = useEnumLabel('Condition');
  const condition = d.environments.condition.map(c => ({ ...c, label: conditionLabel(c.key), glyph: GLYPH[c.key] }));
  return (
    <Band id="health" icon="server" title="Service & environment health" hint="Manually reported condition — not live monitoring. Unknown is never counted as healthy.">
      <div className="viz-grid three">
        <VizPanel title="Environments by reported condition" table={tableOf(condition, 'Environments')}
          sub={<>{d.environments.needsVerification > 0 ? <b>{d.environments.needsVerification} report(s) need verification.</b> : 'All reports are recent.'}</>}>
          <Donut data={condition} colorOf={b => STATUS_OF[b.key] ?? STATUS.neutral} centerLabel="environments" />
        </VizPanel>
        <div className="span-2">
          <section className="panel viz-panel" aria-labelledby="env-att-h">
            <div className="panel-head"><h2 id="env-att-h">Environments not reported healthy</h2></div>
            <DataTable<EnvRow> rowKey={r => r.id} rows={cc.environments} tools={false} empty="none" caption="Environments not reported healthy" columns={[
              { key: 'c', header: 'Client', render: r => <Link to={`/clients/${r.clientId}`}>{r.client}</Link> },
              { key: 'p', header: 'Products', render: r => r.products.join(', ') || <span className="muted">—</span> },
              { key: 'e', header: 'Environment', render: r => <Link to={`/environments/${r.id}`}>{r.name}</Link> },
              { key: 'h', header: 'Reported health', render: r => <><Badge tone={r.condition === 'Unavailable' ? 'bad' : r.condition === 'Degraded' ? 'warn' : 'neutral'}>{GLYPH[r.condition]} {conditionLabel(r.condition)}{r.condition === 'Unknown' ? ' (no report)' : ''}</Badge>{r.conditionReason && <span className="hint">{r.conditionReason}</span>}</> },
              { key: 'u', header: 'Last update', className: 'nowrap', render: r => r.conditionObservedAt ? fmtDateTime(r.conditionObservedAt) : <span className="muted">Never</span> },
              { key: 'o', header: 'Owner', render: r => r.owner ?? <Badge tone="warn">Unassigned</Badge> },
              { key: 'a', header: '', className: 'nowrap', render: r => <Link className="btn btn-sm" to={`/environments/${r.id}`} aria-label={`Open environment ${r.name} of ${r.client}`}>Open</Link> }
            ]} />
          </section>
        </div>
        <VizPanel title="Product coverage" sub="Distinct environments per product; unknown installed versions in brackets."
          actions={<button className="linkbtn" onClick={() => nav('/versions')}>Version matrix</button>}
          table={{ columns: ['Product', 'Environments', 'Installations', 'Unknown version'], rows: d.products.map(p => [p.product, p.environments, p.installations, p.unknownVersion]) }}>
          <HBars data={d.products.slice(0, 8).map(p => ({ key: String(p.productId), label: p.unknownVersion ? `${p.product} (${p.unknownVersion} unknown version)` : p.product, value: p.environments, link: p.link }))}
            unit="environment(s)" empty="No installations recorded." />
        </VizPanel>
      </div>
    </Band>
  );
}

/** A60: data-quality rules as a work list — count, severity and the affected records. */
function QualityCharts({ d, deferred }: { d: InsightsT; deferred: string }) {
  const rows = [...d.dataQuality].sort((a, b) => SEVERITY_RANK[DQ_SEVERITY[a.key] ?? 'Low'] - SEVERITY_RANK[DQ_SEVERITY[b.key] ?? 'Low'] || b.value - a.value);
  return (
    <Band id="quality" icon="quality" title="Data quality" hint="Open items found by the data-quality rules; each count is the records the rule lists.">
      <section className="panel">
        <DataTable<BarT> rowKey={r => r.key} rows={rows} tools={false} empty="none" caption="Open data-quality items by rule" columns={[
          { key: 'r', header: 'Rule', render: r => r.link ? <Link to={r.link}>{r.label}</Link> : r.label },
          { key: 'n', header: 'Affected records', className: 'num', render: r => r.value },
          { key: 's', header: 'Severity', render: r => <Badge tone={SEVERITY_TONE[DQ_SEVERITY[r.key] ?? 'Low']}>{DQ_SEVERITY[r.key] ?? 'Low'}</Badge> },
          { key: 'a', header: '', className: 'nowrap', render: r => r.link && <Link className="btn btn-sm" to={r.link} aria-label={`Open ${r.label} items`}>Open</Link> }
        ]} />
      </section>
      <p className="hint" style={{ margin: '8px 0 var(--gap)' }}>{deferred} Comparison with the previous period is not shown: the hub keeps no history of these figures yet.</p>
    </Band>
  );
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' }, { id: 'attention', label: 'Attention' }, { id: 'cases', label: 'Cases' }, { id: 'escalations', label: 'Escalations' },
  { id: 'sla', label: 'Contractual SLA' }, { id: 'contracts', label: 'Contracts & SLAs' }, { id: 'payments', label: 'Payments' }, { id: 'health', label: 'Health' }, { id: 'quality', label: 'Data quality' }
];

/** A51: sticky section navigation; the section in view is highlighted. */
function DashNav() {
  const [active, setActive] = useState('overview');
  // A clicked section stays current while the smooth scroll runs (sections near the end cannot reach the top);
  // the user's own scrolling (wheel, touch, keys) hands control back to the position tracking.
  const pinned = useRef<string | null>(null);
  useEffect(() => {
    // The current section is the last one whose top has passed under the sticky bar.
    const onScroll = () => {
      if (pinned.current) { setActive(pinned.current); return; }
      let cur = SECTIONS[0].id;
      const limit = (document.getElementById('main')?.getBoundingClientRect().top ?? 0) + 60;
      for (const x of SECTIONS) {
        const top = document.getElementById(x.id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= limit) cur = x.id;
      }
      setActive(cur);
    };
    // The VtWebGuiFramework frame scrolls the main scope (#main), not the window.
    const scroller: HTMLElement | Window = document.getElementById('main') ?? window;
    const release = () => { pinned.current = null; };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    for (const ev of ['wheel', 'touchstart', 'keydown'] as const) scroller.addEventListener(ev, release, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      for (const ev of ['wheel', 'touchstart', 'keydown'] as const) scroller.removeEventListener(ev, release);
    };
  }, []);
  return (
    <nav className="dash-nav" aria-label="Dashboard sections">
      {SECTIONS.map(x => (
        <a key={x.id} href={`#${x.id}`} aria-current={active === x.id ? 'true' : undefined}
          onClick={e => { e.preventDefault(); pinned.current = x.id; document.getElementById(x.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActive(x.id); }}>{x.label}</a>
      ))}
    </nav>
  );
}

/** A60 (owner request, 22 Oct 2026): the Executive overview as an Operations Command Center. */
export function Dashboard() {
  const me = useMe().data!;
  const canManage = useCan('Manage');
  // Role default: people without the Manage right start on their own work; the TIO Manager starts on everything they can see.
  const defaults = { clientId: '', teamId: '', productId: '', country: '', period: '30d', from: '', to: '', view: canManage ? 'all' : 'mine', slaContractId: '', slaPriority: '' };
  const [f, set] = useUrlState(defaults);
  const mine = f.view === 'mine';
  const params = { clientId: f.clientId, teamId: f.teamId, productId: f.productId, country: f.country, ownerId: mine ? String(me.id) : '' };
  const custom = f.period === 'custom';
  const range = custom && f.from && f.to && f.from <= f.to
    ? { from: new Date(`${f.from}T00:00:00`).toISOString(), to: new Date(new Date(`${f.to}T00:00:00`).getTime() + 86400000).toISOString() } : null;
  const periodParams = { period: custom ? (range ? 'custom' : '30d') : f.period, from: range?.from ?? '', to: range?.to ?? '', slaContractId: f.slaContractId, slaPriority: f.slaPriority };
  const dash = useQuery({ queryKey: ['dashboard', params], queryFn: () => get<Dash>(`/dashboard${qs(params)}`), placeholderData: keepPreviousData });
  const insights = useQuery({ queryKey: ['insights', params], queryFn: () => get<InsightsT>(`/dashboard/insights${qs(params)}`), placeholderData: keepPreviousData });
  const cc = useQuery({ queryKey: ['command-center', params, periodParams], queryFn: () => get<CC>(`/dashboard/command-center${qs({ ...params, ...periodParams })}`), placeholderData: keepPreviousData });
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const countries = insights.data?.countries;
  const countryOptions = [...(countries?.rows ?? []).map(c => c.country), ...(countries?.unknownCountryClients ? ['Unknown'] : [])].map(c => ({ value: c, label: c }));
  const active = [f.clientId, f.teamId, f.productId, f.country, f.slaContractId, f.slaPriority].filter(Boolean).length + (f.period !== '30d' ? 1 : 0) + (f.view !== defaults.view ? 1 : 0);
  const qc = useQueryClient();
  const refreshing = dash.isFetching || insights.isFetching || cc.isFetching;
  const linkParams = { clientId: f.clientId, teamId: f.teamId, productId: f.productId, country: f.country };
  return (
    <div className="dash">
      <PageHead title="Operations Command Center"
        sub={<>Real-time visibility into customer operations, service performance, and operational risks.{' '}
          {cc.data && <span className="cc-fresh">Last refreshed {fmtDateTime(cc.data.evaluatedAt)} ({me.timeZone}) · only records you are authorized to see.</span>}</>}
        actions={<>
          <button className="btn" onClick={() => qc.invalidateQueries({ predicate: q => ['dashboard', 'insights', 'command-center', 'actions'].includes(String(q.queryKey[0])) })} disabled={refreshing}>
            {refreshing ? <><span className="spin" /> Refreshing…</> : 'Refresh'}
          </button>
          <Link className="btn" to={`/map${qs(linkParams)}`}>Client map</Link>
          <Link className="btn btn-primary" to={`/actions${qs(params)}`}>Action list</Link>
        </>} />
      <div className="toolbar dash-filters">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized clients" />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
        <SelectInput label="Country" value={f.country} onChange={v => set({ country: v })} options={countryOptions} empty="All countries" />
        <SelectInput label="Reporting period" value={f.period} onChange={v => set({ period: v })} empty={null}
          options={[{ value: 'today', label: 'Today' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: 'quarter', label: 'This quarter' }, { value: 'custom', label: 'Custom range' }]} />
        {custom && <>
          <TextInput label="From" type="date" value={f.from} onChange={v => set({ from: v })} />
          <TextInput label="To" type="date" value={f.to} onChange={v => set({ to: v })} error={f.from && f.to && f.from > f.to ? 'The end is before the start.' : undefined} />
        </>}
        <div className="field cc-view">
          <span className="flabel">Show</span>
          <div className="seg" role="group" aria-label="Show">
            <button aria-pressed={!mine} onClick={() => set({ view: 'all' })}>All I can see</button>
            <button aria-pressed={mine} onClick={() => set({ view: 'mine' })}>My work</button>
          </div>
        </div>
        {active > 0 && <div className="cc-active"><span className="chip">{active} filter(s) active</span>
          <button className="btn" onClick={() => set(defaults)}>Reset filters</button></div>}
      </div>
      <p className="hint cc-scope">The reporting period applies to opened, closed and received figures and to targets met; open, overdue and due figures are always as of now.</p>
      <DashNav />
      {(dash.isLoading || insights.isLoading || cc.isLoading) && <StateMessage kind="loading" />}
      {(dash.error || insights.error || cc.error) && <StateMessage kind="error">The dashboard could not be loaded. Try Refresh.</StateMessage>}
      <section id="overview" aria-label="Key figures">
        {dash.data && insights.data && cc.data && <KpiGrid dash={dash.data} d={insights.data} cc={cc.data} />}
        {mine && <p className="hint" style={{ margin: '-4px 0 var(--gap)' }}>My work: cases, commitments, escalations, payments and environments you own. Contract figures need the whole view.</p>}
      </section>
      <ActionCenter params={params} />
      {insights.data && dash.data && cc.data && <>
        <CaseCharts d={insights.data} age={dash.data.caseAge} cc={cc.data} />
        <SlaCharts cc={cc.data} scope={params} slaContractId={f.slaContractId} slaPriority={f.slaPriority} onFilter={x => set(x)} />
        <EscalationCharts d={insights.data} cc={cc.data} />
        <ContractCharts d={insights.data} cc={cc.data} />
        <PaymentCharts d={insights.data} cc={cc.data} />
        <HealthCharts d={insights.data} cc={cc.data} />
        <QualityCharts d={insights.data} deferred={dash.data.deferred} />
      </>}
    </div>
  );
}

/** A59 (owner request, 22 Oct 2026): the client map on its own page; client, team and product filters as on the overview. */
export function ClientMap() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ clientId: '', teamId: '', productId: '', country: '' });
  const params = { clientId: f.clientId, teamId: f.teamId, productId: f.productId };
  const insights = useQuery({ queryKey: ['insights', params], queryFn: () => get<InsightsT>(`/dashboard/insights${qs(params)}`), placeholderData: keepPreviousData });
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const filtered = !!(f.clientId || f.teamId || f.productId);
  const countries = insights.data?.countries;
  const total = countries ? countries.rows.reduce((s, r) => s + r.clients, 0) + countries.unknownCountryClients : 0;
  return (
    <div className="dash map-page">
      <PageHead title="Client map" sub={insights.data && <>{total} client(s) in {countries!.rows.length} countr{countries!.rows.length === 1 ? 'y' : 'ies'} · as of {fmtDateTime(insights.data.evaluatedAt)} ({me.timeZone}). Click a country for its clients.</>}
        actions={<Link className="btn btn-primary" to={`/${qs(params)}`}>Executive overview</Link>} />
      <div className="toolbar dash-filters">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized clients" />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
        {filtered && <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => set({ clientId: '', teamId: '', productId: '' })}>Clear filters</button>}
      </div>
      {insights.isLoading && <StateMessage kind="loading" />}
      {countries && <Geography countries={countries} initial={f.country} overviewFor={c => `/${qs({ ...params, country: c })}`} />}
    </div>
  );
}
