import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router';
import { get, qs } from '../api';
import { fmtDate, fmtDateTime, fmtMoney } from '../format';
import { useMe, useUrlState } from '../hooks';
import { audienceDashboards, canExport, hasRight } from '../rights';
import { HBars, Kpi as BaseKpi, RAMP, RateLines, SERIES, STATUS, TrendLines, VizPanel, type KpiStatus } from '../ui/charts';
import { Icon } from '../ui/Icon';
import { ActionDialog } from '../ui/pickers';
import { Badge, ConditionBadge, DataTable, PageHead, SelectInput, StateMessage, TextInput, type ConditionT } from '../ui/kit';
import { useClientOptions, useProductOptions, useTeamOptions } from './common';

// A108 (owner request, 10 Nov 2026): four dashboards, one per audience and question, beside the Operations Command Center.

type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';
type BarT = { key: string; label: string; value: number; link?: string | null };
type Tally = { met: number; breached: number; pending: number; notMeasurable: number; measured: number; rate: number | null };
type SignalT = { key: string; label: string; state: string; text: string; rule: string; link?: string | null };

/**
 * The dashboards' own way of stating a figure (a tone, a part of a whole, a line under the value) on top of the shared KPI card:
 * the tone becomes the card's status, the part of a whole its bar, and the two text lines its supporting lines.
 */
function Kpi({ tone, context, partLabel, part, of, value, ...rest }: {
  label: string; value: number | string; icon?: ReactNode; to?: string; tone?: 'critical' | 'warning'; context?: ReactNode; partLabel?: ReactNode; part?: number; of?: number;
}) {
  const status: KpiStatus = tone ?? 'neutral';
  const lines = [partLabel, context].filter(x => x !== undefined && x !== null && x !== false && x !== '').map(text => ({ text }));
  const bar = part !== undefined && of ? { total: of, segments: [{ value: Math.min(part, of), status: (tone ?? 'info') as KpiStatus, label: 'Part' }, { value: Math.max(0, of - part), status: 'neutral' as KpiStatus, label: 'Rest' }] } : undefined;
  return <BaseKpi {...rest} value={value} unavailable={value === 'Not available'} status={status} lines={lines} bar={bar} />;
}

// Priority is ordinal: one blue ramp, darker = more urgent (same as the Command Center).
const PRIORITY_OF: Record<string, string> = { Low: RAMP[0], Normal: RAMP[1], High: RAMP[3], Critical: RAMP[4] };
const PRIORITY_TONE: Record<string, Tone> = { Critical: 'bad', High: 'warn', Normal: 'neutral', Low: 'neutral' };
// Signal and status states always carry a glyph and words, never colour alone.
const SIGNAL: Record<string, { tone: Tone; glyph: string; label: string }> = {
  OnTrack: { tone: 'good', glyph: '●', label: 'On track' }, Watch: { tone: 'warn', glyph: '▲', label: 'Watch' },
  OffTrack: { tone: 'bad', glyph: '■', label: 'Off track' }, Unknown: { tone: 'neutral', glyph: '○', label: 'Unknown' }
};
const STATUS_WORDS: Record<string, { tone: Tone; glyph: string; label: string }> = {
  OnTrack: { tone: 'good', glyph: '●', label: 'On track' }, AtRisk: { tone: 'warn', glyph: '▲', label: 'At risk' }, OffTrack: { tone: 'bad', glyph: '■', label: 'Off track' }
};
const pctText = (r?: number | null) => (r === null || r === undefined ? 'Not available' : `${r} %`);

/** Minutes as "3 d 4 h" / "5 h 10 min" / "20 min". */
function span(minutes: number) {
  const m = Math.round(Math.abs(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}
function dueText(iso?: string | null) {
  if (!iso) return <span className="muted">No date</span>;
  const ms = new Date(iso).getTime() - Date.now();
  return ms < 0 ? <span className="t-bad"><b>{span(ms / 60000)}</b> overdue</span> : <span className={ms < 86400000 ? 't-warn' : undefined}>due in {span(ms / 60000)}</span>;
}

function Band({ id, icon, title, hint, children }: { id: string; icon: string; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="dash-band" id={id} aria-labelledby={`${id}-h`}>
      <div className="band-head"><span className="band-ic" aria-hidden="true"><Icon name={icon} size={16} /></span><h2 className="band-title" id={`${id}-h`}>{title}</h2>{hint && <span className="hint">{hint}</span>}</div>
      {children}
    </section>
  );
}

/** A plain panel with a heading, for tables and lists on the dashboards. */
function Card({ title, sub, actions, children, id }: { title: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="panel viz-panel" aria-label={title} id={id}>
      <div className="panel-head"><h2>{title}</h2>{actions && <div className="actions">{actions}</div>}</div>
      <div className="panel-body">{sub && <p className="hint" style={{ marginBottom: 8 }}>{sub}</p>}{children}</div>
    </section>
  );
}

/** A thin meter: the share of a whole, with the value in text beside it. */
function Meter({ value, tone, label }: { value: number; tone?: 'critical' | 'warning'; label: string }) {
  const fill = tone === 'critical' ? STATUS.critical : tone === 'warning' ? STATUS.warning : SERIES.blue;
  return <span className="ad-meter" role="img" aria-label={label}><span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: fill }} /></span>;
}

function SignalBadge({ state }: { state: string }) {
  const s = SIGNAL[state] ?? SIGNAL.Unknown;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
function StatusWords({ status }: { status?: string | null }) {
  if (!status) return <Badge tone="neutral">No status recorded</Badge>;
  const s = STATUS_WORDS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function Delta({ value, unit, goodWhen, digits = 1 }: { value?: number | null; unit: string; goodWhen: 'up' | 'down'; digits?: number }) {
  if (value === null || value === undefined) return <span className="muted">no comparison</span>;
  if (value === 0) return <span className="muted">● unchanged</span>;
  const good = (value > 0) === (goodWhen === 'up');
  return <span className={good ? 't-good' : 't-bad'}><b>{value > 0 ? '▲' : '▼'} {Math.abs(value).toFixed(digits).replace(/\.0$/, '')}{unit}</b></span>;
}

function useRefreshAll(keys: string[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: q => keys.includes(String(q.queryKey[0])) });
}

// =====================================================================================================================
// Operational dashboard
// =====================================================================================================================

type Clock = { kind: string; dueAt: string; targetMinutes: number; usedMinutes: number; usedPercent: number; remainingMinutes: number; breached: boolean; atRisk: boolean };
type QueueRow = {
  type: string; id: number; ref: string; title: string; clientId?: number | null; clientCode?: string | null; priority?: string | null; owner?: string | null; unassigned: boolean;
  clock?: Clock | null; dueAt?: string | null; deadline: string; nextAction?: string | null; waiting?: string | null; link: string;
};
type OpsEnv = { id: number; name: string; clientId: number; client: string; condition: ConditionT; reason?: string | null };
type Ops = {
  evaluatedAt: string; view: string; teamId?: number | null; teams: { id: number; name: string }[]; atRiskPercent: number; note: string;
  kpis: {
    openCases: { value: number; mine: number; criticalHigh: number; link: string };
    unassigned: { value: number; oldestMinutes?: number | null; link: string };
    slaAtRisk: { value: number; breached: number; running: number; link: string };
    due24h: { value: number; cases: number; commitments: number; link: string };
    overdue: { value: number; cases: number; commitments: number; link: string; commitmentsLink: string };
    waitingCustomer: { value: number; long5d: number; link: string };
    environments: { total: number; healthy: number; degraded: number; unavailable: number; unknown: number; needsVerification: number; link: string };
  };
  queue: { total: number; items: QueueRow[] };
  environments: OpsEnv[];
  workload: { ownerId?: number | null; owner: string; total: number; critical: number; high: number; normal: number; low: number; link: string }[];
  upcoming: { kind: string; id: number; ref: string; title: string; client?: string | null; at: string; link: string }[];
  hygiene: BarT[];
};

function ClockCell({ r }: { r: QueueRow }) {
  const c = r.clock;
  if (!c) return <>{dueText(r.dueAt)}<div className="hint">due date</div></>;
  const tone = c.breached ? 'critical' : c.atRisk ? 'warning' : undefined;
  return (
    <div className="ad-clock">
      <Meter value={c.usedPercent} tone={tone} label={`${c.kind} clock: ${c.usedPercent} % of the target used`} />
      <span className={c.breached ? 't-bad' : c.atRisk ? 't-warn' : undefined}>
        <b>{c.kind}</b>: {c.breached ? <>breached by {span(-c.remainingMinutes)}</> : <>{span(c.remainingMinutes)} left</>} <span className="muted">· {c.usedPercent} % used</span>
      </span>
    </div>
  );
}

const ENV_CLASS: Record<string, string> = { Healthy: 'h', Degraded: 'd', Unavailable: 'u', Unknown: 'x' };

/** A108: what an engineer or a team must act on today — everything as of now. */
export function OperationalDashboard() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ view: 'mine', teamId: '', clientId: '', productId: '' });
  const [allEnvs, setAllEnvs] = useState(false);
  const q = useQuery({ queryKey: ['dash-operational', f], queryFn: () => get<Ops>(`/dashboard/operational${qs(f)}`), placeholderData: keepPreviousData, refetchInterval: 60000 });
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const refresh = useRefreshAll(['dash-operational']);
  const d = q.data;
  const k = d?.kpis;
  const attention = d?.environments.filter(e => e.condition.reported !== 'Healthy' || e.condition.needsVerification) ?? [];
  const healthy = d ? d.environments.length - attention.length : 0;
  const shownEnvs = allEnvs ? d?.environments ?? [] : attention;
  return (
    <div className="dash">
      <PageHead title="Operational dashboard"
        sub={<>What needs action today. {d && <span className="cc-fresh">As of {fmtDateTime(d.evaluatedAt)} ({me.timeZone}) · refreshes every minute · only records you are authorized to see.</span>}</>}
        actions={<>
          <button className="btn" onClick={refresh} disabled={q.isFetching}>{q.isFetching ? <><span className="spin" /> Refreshing…</> : 'Refresh'}</button>
          <Link className="btn" to="/actions">Action list</Link>
          <Link className="btn btn-primary" to="/cases/new">+ New Ticket</Link>
        </>} />
      <div className="toolbar ad-filters">
        <div className="field cc-view ad-view">
          <span className="flabel">Show</span>
          <div className="seg" role="group" aria-label="Show">
            <button aria-pressed={f.view === 'mine'} onClick={() => set({ view: 'mine' })}>My work</button>
            <button aria-pressed={f.view === 'team'} onClick={() => set({ view: 'team' })}>My team</button>
            <button aria-pressed={f.view === 'all'} onClick={() => set({ view: 'all' })}>Everything</button>
          </div>
        </div>
        {f.view !== 'mine' && <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty={f.view === 'team' ? 'My first team' : 'All teams'} />}
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized clients" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
      </div>
      <p className="hint cc-scope">Every figure is as of now; this page has no reporting period. Unassigned critical or high tickets are shown whatever “Show” is set to.</p>
      {q.isLoading && <StateMessage kind="loading" />}
      {q.error && <StateMessage kind="error">The dashboard could not be loaded. Try Refresh.</StateMessage>}
      {d && k && <>
        <div className="kpis cc-kpis">
          <Kpi icon={<Icon name="case" size={18} />} label={f.view === 'mine' ? 'My open tickets' : 'Open tickets'} value={k.openCases.value} to={k.openCases.link}
            context={<>{k.openCases.criticalHigh} critical or high{f.view !== 'mine' ? ` · ${k.openCases.mine} mine` : ''}</>} />
          <Kpi icon={<Icon name="users" size={18} />} label="Unassigned critical / high" value={k.unassigned.value} to={k.unassigned.link} tone={k.unassigned.value ? 'critical' : undefined}
            partLabel={k.unassigned.value && k.unassigned.oldestMinutes != null ? `Oldest waiting ${span(k.unassigned.oldestMinutes)}` : 'None waiting for an owner'} />
          <Kpi icon={<Icon name="commitment" size={18} />} label="SLA clocks at risk" value={k.slaAtRisk.value} to={k.slaAtRisk.link} tone={k.slaAtRisk.breached ? 'critical' : k.slaAtRisk.value ? 'warning' : undefined}
            part={k.slaAtRisk.value + k.slaAtRisk.breached} of={k.slaAtRisk.running} partLabel={`${d.atRiskPercent} % of the target or less is left`}
            context={<>{k.slaAtRisk.running} clock(s) running{k.slaAtRisk.breached ? ` · ${k.slaAtRisk.breached} already breached` : ''}</>} />
          <Kpi icon={<Icon name="bell" size={18} />} label="Due in the next 24 hours" value={k.due24h.value} to={k.due24h.link} tone={k.due24h.value ? 'warning' : undefined}
            context={`${k.due24h.cases} ticket(s) · ${k.due24h.commitments} commitment(s)`} />
          <Kpi icon={<Icon name="escalation" size={18} />} label="Overdue" value={k.overdue.value} to={k.overdue.cases || !k.overdue.commitments ? k.overdue.link : k.overdue.commitmentsLink} tone={k.overdue.value ? 'critical' : undefined}
            context={`${k.overdue.cases} ticket(s) · ${k.overdue.commitments} commitment(s)`} />
          <Kpi icon={<Icon name="user" size={18} />} label="Waiting on the customer" value={k.waitingCustomer.value} to={k.waitingCustomer.link}
            context={k.waitingCustomer.long5d ? `${k.waitingCustomer.long5d} waiting more than 5 days` : 'None longer than 5 days'} />
          <Kpi icon={<Icon name="server" size={18} />} label="Production environments" value={`${k.environments.healthy} / ${k.environments.total}`} to={k.environments.link}
            tone={k.environments.unavailable ? 'critical' : k.environments.degraded ? 'warning' : undefined}
            part={k.environments.healthy} of={k.environments.total} partLabel={`healthy · ${k.environments.degraded} degraded · ${k.environments.unavailable} unavailable`}
            context={`${k.environments.unknown} not reported · manually reported`} />
        </div>

        <div className="ad-grid ad-2-1">
          <Card title="Work queue — what runs out first" id="queue"
            sub={<>Tickets with an SLA clock at risk, breached or ending within 24 hours, and tickets and commitments due within 24 hours or overdue. The clock is the share of the contractual target already used, counted in the contract's support hours.</>}
            actions={<Link className="linkbtn" to="/actions">Full action list</Link>}>
            <DataTable<QueueRow> rowKey={r => `${r.type}:${r.id}`} rows={d.queue.items} tools={false} empty="none" caption="Work queue" pageSize={10} columns={[
              { key: 'ref', header: 'Ref', className: 'nowrap', render: r => <Link to={r.link}>{r.ref}</Link> },
              { key: 't', header: 'Title', render: r => <>{r.title}{r.type === 'Commitment' && <> <Badge tone="info">Commitment</Badge></>}{r.waiting && <span className="hint">Waiting on {r.waiting.toLowerCase()}</span>}</> },
              { key: 'c', header: 'Client', render: r => r.clientId ? <Link to={`/clients/${r.clientId}`}>{r.clientCode}</Link> : <span className="muted">Internal</span> },
              { key: 'p', header: 'Priority', render: r => r.priority ? <Badge tone={PRIORITY_TONE[r.priority]}>{r.priority}</Badge> : <span className="muted">—</span> },
              { key: 'o', header: 'Owner', render: r => r.unassigned ? <Badge tone="bad">Unassigned</Badge> : r.owner },
              { key: 'd', header: 'Clock / deadline', render: r => <ClockCell r={r} /> },
              { key: 'n', header: 'Next action', render: r => r.nextAction ?? <span className="muted">—</span> }
            ]} />
            {d.queue.total > d.queue.items.length && <p className="hint">{d.queue.total - d.queue.items.length} more item(s) are in the <Link to="/actions">action list</Link>.</p>}
          </Card>
          <Card title="Production environment condition"
            sub="Last manually reported condition — not live monitoring. Old evidence shows “needs verification”."
            actions={healthy > 0 && <button className="linkbtn" aria-pressed={allEnvs} onClick={() => setAllEnvs(v => !v)}>{allEnvs ? 'Only those needing attention' : `Show all ${d.environments.length}`}</button>}>
            {d.environments.length === 0 ? <div className="viz-empty">No production environment recorded.</div> : (
              <div className="ad-envs">
                {shownEnvs.map(e => (
                  <Link key={e.id} to={`/environments/${e.id}`} className={`ad-env ${ENV_CLASS[e.condition.reported] ?? 'x'}`}>
                    <b>{e.client} · {e.name}</b>
                    <ConditionBadge c={e.condition} />
                    <span className="hint">{e.reason ?? (e.condition.observedAt ? `Reported ${fmtDateTime(e.condition.observedAt)}` : 'No condition report')}</span>
                  </Link>
                ))}
                {!allEnvs && attention.length === 0 && <div className="viz-empty">All {healthy} production environment(s) are reported healthy.</div>}
                {!allEnvs && attention.length > 0 && healthy > 0 && <div className="ad-env more">+ {healthy} reported healthy</div>}
              </div>
            )}
          </Card>
        </div>

        <div className="ad-grid ad-3">
          <VizPanel title="Workload by owner" sub="Open tickets in the team, client and product chosen above — not narrowed to “My work”. Click a bar for the tickets."
            table={{ columns: ['Owner', 'Critical', 'High', 'Normal', 'Low', 'Total'], rows: d.workload.map(w => [w.owner, w.critical, w.high, w.normal, w.low, w.total]) }}>
            <StackBars rows={d.workload.map(w => ({ key: String(w.ownerId ?? 'none'), label: w.owner, link: w.link, parts: [w.critical, w.high, w.normal, w.low] }))}
              names={['Critical', 'High', 'Normal', 'Low']} colors={[PRIORITY_OF.Critical, PRIORITY_OF.High, PRIORITY_OF.Normal, PRIORITY_OF.Low]} empty="No open tickets." />
          </VizPanel>
          <Card title="Coming up — next 7 days" sub="Commitments and maintenance-coordination tickets due in the next week.">
            {d.upcoming.length === 0 ? <div className="viz-empty">Nothing is due in the next 7 days.</div> : (
              <table className="grid"><tbody>
                {d.upcoming.map(u => (
                  <tr key={`${u.kind}:${u.id}`}>
                    <td className="nowrap">{fmtDateTime(u.at)}</td>
                    <td><Link to={u.link}>{u.ref}</Link> {u.title}</td>
                    <td>{u.client ?? <span className="muted">Internal</span>}</td>
                    <td><Badge tone={u.kind === 'Commitment' ? 'info' : 'neutral'}>{u.kind}</Badge></td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </Card>
          <Card title="Hygiene — mine" sub="Small things that make tomorrow's figures wrong when ignored. Always your own, whatever “Show” is set to.">
            <table className="grid"><tbody>
              {d.hygiene.map(h => (
                <tr key={h.key}><td>{h.link ? <Link to={h.link}>{h.label}</Link> : h.label}</td><td className="num"><b className={h.value ? undefined : 'muted'}>{h.value}</b></td></tr>
              ))}
            </tbody></table>
          </Card>
        </div>
        <p className="hint">{d.note} The at-risk threshold is the setting <i>Dashboard.SlaAtRiskPercent</i>.</p>
      </>}
    </div>
  );
}

/** Horizontal bars split into ordered parts (priority): one hue ramp, 2 px gaps, total in text. */
function StackBars({ rows, names, colors, empty }: { rows: { key: string; label: string; link?: string; parts: number[] }[]; names: string[]; colors: string[]; empty: string }) {
  const nav = useNavigate();
  const max = Math.max(1, ...rows.map(r => r.parts.reduce((a, b) => a + b, 0)));
  if (rows.length === 0) return <div className="viz-empty">{empty}</div>;
  return (
    <div className="viz-wrap">
      <ul className="hbars ad-stack">
        {rows.map(r => {
          const total = r.parts.reduce((a, b) => a + b, 0);
          const text = `${r.label}: ${total} open — ${r.parts.map((v, i) => `${names[i]} ${v}`).join(', ')}`;
          return (
            <li key={r.key}>
              <span className="hb-label" title={r.label}>{r.label}</span>
              <span className="hb-track" role={r.link ? 'link' : undefined} tabIndex={r.link ? 0 : undefined} aria-label={text} title={text} style={{ cursor: r.link ? 'pointer' : 'default' }}
                onClick={() => r.link && nav(r.link)} onKeyDown={e => { if (e.key === 'Enter' && r.link) nav(r.link); }}>
                <span className="ad-stack-bar" style={{ width: `${(total / max) * 100}%` }}>
                  {r.parts.map((v, i) => v > 0 && <span key={i} style={{ flexGrow: v, background: colors[i] }} />)}
                </span>
                <span className="hb-value">{total}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="legend" aria-hidden="true">{names.map((n, i) => <span key={n}><span className="key" style={{ background: colors[i] }} />{n}</span>)}</div>
    </div>
  );
}

// =====================================================================================================================
// SLA & Contracts dashboard
// =====================================================================================================================

type ContractRow = {
  id: number; ref: string; title: string; clientId: number; client: string; projectId: number; project: string; type: string; support?: string | null; targets: number; cases: number;
  response: Tally; resolution: Tally; breached: number; worstPriority?: string | null; startDate?: string | null; endDate?: string | null; noticeDeadline?: string | null; state: string; owner?: string | null; link: string;
};
type WatchRow = { id: number; ref: string; title: string; client: string; state: string; decideBy?: string | null; daysLeft?: number | null; endDate?: string | null; owner?: string | null; reason: string };
type SlaDash = {
  evaluatedAt: string; period: { from: string; to: string; name: string }; target: number; atRiskPercent: number; note: string;
  compliance: {
    cases: number; response: Tally; resolution: Tally; responseDelta?: number | null; resolutionDelta?: number | null; breaches: number; atRiskNow: number; breachedNow: number; runningNow: number;
    notMeasurable: number; reasons: BarT[]; links: { responseBreached: string; resolutionBreached: string; atRisk: string; all: string }; definition: string;
  };
  trend: { key: string; label: string; cases: number; responseRate: number | null; responseMeasured: number; resolutionRate: number | null; resolutionMeasured: number }[];
  byPriority: { priority: string; cases: number; responseBreached: number; resolutionBreached: number; link: string }[];
  contracts: { active: number; draft: number; withTargets: number; noticeWithin90: number; earliestNoticeDays?: number | null; rows: ContractRow[]; watch: WatchRow[] };
  payments: { currency: string; overdue: number; overdueCount: number; due30: number; due30Count: number; withoutAmount: number }[];
};

const SLA_PERIODS = [{ value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }, { value: 'quarter', label: 'This quarter' }, { value: '12m', label: 'Last 12 months' }, { value: 'custom', label: 'Custom range' }];
const STATE_WORDS: Record<string, { tone: Tone; label: string }> = {
  Current: { tone: 'info', label: 'Current' }, RenewalDue: { tone: 'warn', label: 'Renewal due' }, Expired: { tone: 'bad', label: 'Ended, still Active' }, EndDateUnknown: { tone: 'neutral', label: 'End date unknown' }
};
const STATE_COLOR: Record<string, string> = { Current: SERIES.blue, RenewalDue: STATUS.warning, Expired: STATUS.critical, EndDateUnknown: STATUS.neutral };

function RateCell({ t, target }: { t: Tally; target: number }) {
  if (t.rate === null) return <span className="muted" title={`${t.pending} pending, ${t.notMeasurable} not measurable`}>Not available</span>;
  const tone = t.rate < target - 10 ? 'critical' : t.rate < target ? 'warning' : undefined;
  return (
    <div className="ad-clock" title={`${t.met} met, ${t.breached} breached, ${t.pending} pending, ${t.notMeasurable} not measurable`}>
      <Meter value={t.rate} tone={tone} label={`${t.rate} % of ${t.measured} measured`} />
      <span><b>{t.rate} %</b>{tone === 'critical' ? ' ▼' : ''} <span className="muted">of {t.measured}</span></span>
    </div>
  );
}

/** Contract terms on a shared time axis: a bar per contract, a diamond at the last day to give notice, a line at today. */
function ContractTimeline({ rows }: { rows: ContractRow[] }) {
  const nav = useNavigate();
  const [tip, setTip] = useState<string | null>(null);
  const shown = rows.slice().sort((a, b) => (a.endDate ?? '9999').localeCompare(b.endDate ?? '9999')).slice(0, 14);
  if (shown.length === 0) return <div className="viz-empty">No Active contract in view.</div>;
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear() + 3, 0, 1).getTime();
  const W = 760, L = 170, R = 12, T = 22, rowH = 24, H = T + shown.length * rowH + 26;
  const x = (t: number) => L + ((Math.max(start, Math.min(end, t)) - start) / (end - start)) * (W - L - R);
  const today = x(now.getTime());
  return (
    <div className="viz-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Contract terms, notice deadlines and today">
        {[0, 1, 2].map(i => { const xx = x(new Date(now.getFullYear() + i, 0, 1).getTime()); return <g key={i}><line x1={xx} x2={xx} y1={T - 4} y2={H - 22} className="grid" /><text x={xx + 4} y={T - 8} className="tick">{now.getFullYear() + i}</text></g>; })}
        {shown.map((c, i) => {
          const y = T + i * rowH + 4;
          const x1 = x(c.startDate ? new Date(c.startDate).getTime() : start), x2 = c.endDate ? x(new Date(c.endDate).getTime()) : W - R;
          const text = `${c.ref} · ${c.client}: ${c.startDate ? fmtDate(c.startDate) : 'start unknown'} to ${c.endDate ? fmtDate(c.endDate) : 'end date unknown'}${c.noticeDeadline ? ` · notice by ${fmtDate(c.noticeDeadline)}` : ''} · ${STATE_WORDS[c.state]?.label ?? c.state}`;
          return (
            <g key={c.id} role="link" tabIndex={0} aria-label={text} style={{ cursor: 'pointer' }} onClick={() => nav(`/contracts/${c.id}`)} onKeyDown={e => { if (e.key === 'Enter') nav(`/contracts/${c.id}`); }}
              onMouseEnter={() => setTip(text)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(text)} onBlur={() => setTip(null)}>
              <text x={L - 8} y={y + 11} className="tick ad-tl-label" textAnchor="end">{c.ref} {c.client}</text>
              <rect x={x1} y={y + 2} width={Math.max(3, x2 - x1)} height={12} rx={4} fill={STATE_COLOR[c.state] ?? SERIES.blue} opacity={c.endDate ? 1 : 0.55} />
              {c.noticeDeadline && <path d={`M${x(new Date(c.noticeDeadline).getTime())} ${y - 1} l6 9 l-6 9 l-6 -9z`} fill="#14223f" stroke="#fff" strokeWidth={1.5} />}
            </g>
          );
        })}
        <line x1={today} x2={today} y1={T - 4} y2={H - 22} stroke={STATUS.critical} strokeWidth={2} />
        <text x={today + 4} y={H - 8} className="tick" style={{ fill: STATUS.critical, fontWeight: 600 }}>Today</text>
      </svg>
      <div className="legend">
        <span><span className="key" style={{ background: SERIES.blue }} />Current</span><span><span className="key" style={{ background: STATUS.warning }} />Renewal due</span>
        <span><span className="key" style={{ background: STATUS.critical }} />Ended, still Active</span><span><span className="key" style={{ background: STATUS.neutral }} />End date unknown</span><span>◆ Last day to give notice</span>
      </div>
      <p className="hint ad-tip" aria-live="polite">{tip ?? 'Hover or focus a bar for its dates; click to open the contract.'}</p>
      {rows.length > shown.length && <p className="hint">The {shown.length} contracts ending first are drawn; all {rows.length} are in the table above.</p>}
    </div>
  );
}

/** A108: are contractual obligations met, where are they breached, and which contracts need a decision. */
export function SlaContractsDashboard() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ period: '90d', from: '', to: '', clientId: '', contractId: '', contractType: '', priority: '', country: '' });
  const custom = f.period === 'custom';
  const range = custom && f.from && f.to && f.from <= f.to
    ? { from: new Date(`${f.from}T00:00:00`).toISOString(), to: new Date(new Date(`${f.to}T00:00:00`).getTime() + 86400000).toISOString() } : null;
  const params = { ...f, period: custom ? (range ? 'custom' : '90d') : f.period, from: range?.from ?? '', to: range?.to ?? '' };
  const q = useQuery({ queryKey: ['dash-sla', params], queryFn: () => get<SlaDash>(`/dashboard/sla-contracts${qs(params)}`), placeholderData: keepPreviousData });
  const clients = useClientOptions();
  const refresh = useRefreshAll(['dash-sla']);
  const d = q.data;
  const c = d?.compliance;
  const contractOptions = (d?.contracts.rows ?? []).map(r => ({ value: String(r.id), label: `${r.ref} · ${r.client}` }));
  const typeOptions = [...new Set((d?.contracts.rows ?? []).map(r => r.type))].map(t => ({ value: t, label: t }));
  const active = [f.clientId, f.contractId, f.contractType, f.priority].filter(Boolean).length + (f.period !== '90d' ? 1 : 0);
  return (
    <div className="dash">
      <PageHead title="SLA & Contracts dashboard"
        sub={<>Contractual obligations, measured compliance and contract lifecycle. {d && <span className="cc-fresh">As of {fmtDateTime(d.evaluatedAt)} ({me.timeZone}) · period {fmtDate(d.period.from)} – {fmtDate(d.period.to)}.</span>}</>}
        actions={<>
          <button className="btn" onClick={refresh} disabled={q.isFetching}>{q.isFetching ? <><span className="spin" /> Refreshing…</> : 'Refresh'}</button>
          <Link className="btn" to="/contracts">Contract register</Link>
          {canExport(me) && <Link className="btn btn-primary" to="/reporting-center">Reporting Center</Link>}
        </>} />
      <div className="toolbar ad-filters">
        <SelectInput label="Reporting period" value={f.period} onChange={v => set({ period: v })} empty={null} options={SLA_PERIODS} />
        {custom && <>
          <TextInput label="From" type="date" value={f.from} onChange={v => set({ from: v })} />
          <TextInput label="To" type="date" value={f.to} onChange={v => set({ to: v })} error={f.from && f.to && f.from > f.to ? 'The end is before the start.' : undefined} />
        </>}
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v, contractId: '' })} options={clients} empty="All authorized clients" />
        <SelectInput label="Contract" value={f.contractId} onChange={v => set({ contractId: v })} options={contractOptions} empty="All active contracts" />
        <SelectInput label="Contract type" value={f.contractType} onChange={v => set({ contractType: v })} options={typeOptions} empty="All types" />
        <SelectInput label="Priority" value={f.priority} onChange={v => set({ priority: v })} options={['Critical', 'High', 'Normal', 'Low'].map(p => ({ value: p, label: p }))} empty="All priorities" />
        {active > 0 && <div className="cc-active"><span className="chip">{active} filter(s) active</span>
          <button className="btn" onClick={() => set({ period: '90d', from: '', to: '', clientId: '', contractId: '', contractType: '', priority: '', country: '' })}>Reset filters</button></div>}
      </div>
      <p className="hint cc-scope">Compliance = met ÷ (met + breached), by the time the ticket was opened. Pending and not measurable obligations are excluded and shown separately; the priority filter applies to tickets, not to the contract list.</p>
      {q.isLoading && <StateMessage kind="loading" />}
      {q.error && <StateMessage kind="error">The dashboard could not be loaded. Try Refresh.</StateMessage>}
      {d && c && <>
        <div className="kpis cc-kpis">
          <Kpi icon={<Icon name="matrix" size={18} />} label="Response compliance" value={pctText(c.response.rate)} to={c.links.all}
            context={<>{c.response.met} met · {c.response.breached} breached · objective {d.target} %</>} />
          <Kpi icon={<Icon name="matrix" size={18} />} label="Resolution compliance" value={pctText(c.resolution.rate)} to={c.links.all}
            tone={c.resolution.rate !== null && c.resolution.rate < d.target - 10 ? 'critical' : c.resolution.rate !== null && c.resolution.rate < d.target ? 'warning' : undefined}
            part={c.resolution.met} of={c.resolution.measured} partLabel={`${c.resolution.met} met · ${c.resolution.breached} breached`}
            context={<><Delta value={c.resolutionDelta} unit=" pts" goodWhen="up" /> against the previous period</>} />
          <Kpi icon={<Icon name="escalation" size={18} />} label="Breaches in the period" value={c.breaches} to={c.links.resolutionBreached} tone={c.breaches ? 'critical' : undefined}
            context={`${c.response.breached} response · ${c.resolution.breached} resolution`} />
          <Kpi icon={<Icon name="commitment" size={18} />} label="Clocks at risk now" value={c.atRiskNow} to={c.links.atRisk} tone={c.breachedNow ? 'critical' : c.atRiskNow ? 'warning' : undefined}
            partLabel={`${d.atRiskPercent} % of the target or less is left`} context={<>{c.runningNow} running{c.breachedNow ? ` · ${c.breachedNow} already breached` : ''}</>} />
          <Kpi icon={<Icon name="quality" size={18} />} label="Not measurable" value={c.notMeasurable} tone={c.notMeasurable ? 'warning' : undefined}
            context={c.notMeasurable ? `of ${c.cases} ticket(s) — see the reasons below` : c.cases ? `All ${c.cases} ticket(s) are measurable` : 'No ticket with a contract in the period'} />
          <Kpi icon={<Icon name="list" size={18} />} label="Active contracts" value={d.contracts.active} to="/contracts?status=Active"
            part={d.contracts.withTargets} of={d.contracts.active} partLabel={`${d.contracts.withTargets} with SLA targets`} context={d.contracts.draft ? `${d.contracts.draft} draft, not signed` : 'No draft'} />
          <Kpi icon={<Icon name="bell" size={18} />} label="Renewal decisions due" value={d.contracts.noticeWithin90} to="/contracts?renewal=due" tone={d.contracts.noticeWithin90 ? 'warning' : undefined}
            context={d.contracts.earliestNoticeDays != null ? (d.contracts.earliestNoticeDays < 0 ? `Earliest deadline passed ${-d.contracts.earliestNoticeDays} day(s) ago` : `Earliest in ${d.contracts.earliestNoticeDays} day(s)`) : 'None within 90 days'} />
        </div>

        <div className="ad-grid ad-2">
          <VizPanel title="Compliance trend — last 12 months"
            sub={<>Monthly rate by the month the ticket was opened. A month without a measured obligation has no point. Dashed line: the {d.target} % objective (setting <i>Dashboard.SlaComplianceTargetPercent</i> — an internal objective, not a contract term).</>}
            table={{ columns: ['Month', 'Tickets', 'Response %', 'Measured', 'Resolution %', 'Measured'], rows: d.trend.map(t => [t.label, t.cases, t.responseRate ?? 'n/a', t.responseMeasured, t.resolutionRate ?? 'n/a', t.resolutionMeasured]) }}>
            <RateLines data={d.trend.map(t => ({ label: t.label, a: t.responseRate, b: t.resolutionRate }))} aLabel="First response" bLabel="Resolution" target={d.target} />
          </VizPanel>
          <div className="ad-stack-col">
            <VizPanel title="Breaches by priority" sub="Response and resolution breaches of tickets opened in the period. Click a bar for the tickets."
              table={{ columns: ['Priority', 'Tickets', 'Response breached', 'Resolution breached'], rows: d.byPriority.map(p => [p.priority, p.cases, p.responseBreached, p.resolutionBreached]) }}>
              <StackBars rows={d.byPriority.map(p => ({ key: p.priority, label: p.priority, link: p.link, parts: [p.responseBreached, p.resolutionBreached] }))}
                names={['Response breached', 'Resolution breached']} colors={[SERIES.blue, SERIES.orange]} empty="No breach in the period." />
            </VizPanel>
            <VizPanel title="Why tickets are not measurable" sub="Fixing these makes the compliance figures complete. Counted once per ticket."
              table={{ columns: ['Reason', 'Tickets'], rows: c.reasons.map(r => [r.label, r.value]) }}>
              <HBars data={c.reasons} unit="ticket(s)" empty="Every ticket in the period is measurable." />
            </VizPanel>
          </div>
        </div>

        <Card title="Compliance by contract" sub="Active contracts in view, the lowest resolution compliance first. Support calendar and targets are the terms recorded on the contract."
          actions={<Link className="linkbtn" to="/contracts">Contract register</Link>}>
          <DataTable<ContractRow> rowKey={r => r.id} rows={d.contracts.rows} tools={false} empty="none" caption="Compliance by contract" pageSize={10} columns={[
            { key: 'ref', header: 'Contract', className: 'nowrap', render: r => <Link to={`/contracts/${r.id}`}>{r.ref}</Link> },
            { key: 'cl', header: 'Client · project', render: r => <><Link to={`/dashboards/client?clientId=${r.clientId}`}>{r.client}</Link> · <Link to={`/projects/${r.projectId}`}>{r.project}</Link><div className="hint">{r.title}</div></> },
            { key: 'su', header: 'Support', render: r => <>{r.support ?? <span className="muted">Unknown</span>}{r.targets === 0 && <div className="hint">No SLA targets recorded</div>}</> },
            { key: 'n', header: 'Tickets', className: 'num', render: r => r.cases ? <Link to={r.link}>{r.cases}</Link> : 0 },
            { key: 'rs', header: 'Response', render: r => <RateCell t={r.response} target={d.target} /> },
            { key: 'rx', header: 'Resolution', render: r => <RateCell t={r.resolution} target={d.target} /> },
            { key: 'b', header: 'Breached', className: 'num', render: r => r.breached ? <b className="t-bad">{r.breached}</b> : 0 },
            { key: 'w', header: 'Worst priority', render: r => r.worstPriority ? <Badge tone={PRIORITY_TONE[r.worstPriority]}>{r.worstPriority}</Badge> : <span className="muted">—</span> },
            { key: 'e', header: 'Ends / notice', render: r => <><Badge tone={STATE_WORDS[r.state]?.tone ?? 'neutral'}>{STATE_WORDS[r.state]?.label ?? r.state}</Badge>
              <div className="hint">{r.endDate ? fmtDate(r.endDate) : 'End date unknown'}{r.noticeDeadline ? ` · notice by ${fmtDate(r.noticeDeadline)}` : ''}</div></> }
          ]} />
        </Card>

        <div className="ad-grid ad-2-1" style={{ marginTop: 'var(--gap)' }}>
          <Card title="Contract lifecycle" sub="Term of each Active contract across three years. Colour and the table above carry the state in words.">
            <ContractTimeline rows={d.contracts.rows} />
          </Card>
          <div className="ad-stack-col">
            <Card title="Renewal & notice watchlist" sub="Decisions that must be made before a date passes.">
              {d.contracts.watch.length === 0 ? <div className="viz-empty">No contract needs a renewal decision.</div> : (
                <table className="grid"><thead><tr><th>Contract</th><th>Decide by</th><th>State</th></tr></thead><tbody>
                  {d.contracts.watch.map(w => (
                    <tr key={w.id} title={w.reason}>
                      <td><Link to={`/contracts/${w.id}`}>{w.ref}</Link> {w.client}<div className="hint">{w.owner ?? 'No owner'}</div></td>
                      <td className="nowrap">{w.decideBy ? fmtDate(w.decideBy) : <span className="muted">Unknown</span>}</td>
                      <td>{w.daysLeft == null ? <Badge tone="neutral">End date unknown</Badge>
                        : w.daysLeft < 0 ? <Badge tone="bad">{-w.daysLeft} day(s) ago</Badge>
                        : <Badge tone={w.daysLeft <= 30 ? 'bad' : 'warn'}>{w.daysLeft} day(s)</Badge>}</td>
                    </tr>
                  ))}
                </tbody></table>
              )}
            </Card>
            <Card title="Payments" sub="Open payments of the contracts in view: recorded contract terms, per currency — never added across currencies.">
              {d.payments.length === 0 ? <div className="viz-empty">No payment is overdue or due within 30 days.</div> : (
                <table className="grid"><thead><tr><th>Currency</th><th className="num">Overdue</th><th className="num">Due within 30 days</th></tr></thead><tbody>
                  {d.payments.map(p => (
                    <tr key={p.currency}>
                      <td>{p.currency || <span className="muted">Not recorded</span>}{p.withoutAmount > 0 && <div className="hint">{p.withoutAmount} without an amount</div>}</td>
                      <td className="num">{p.overdueCount ? <b className="t-bad">{fmtMoney(p.overdue, p.currency)}</b> : '—'}<div className="hint">{p.overdueCount} payment(s)</div></td>
                      <td className="num">{p.due30Count ? fmtMoney(p.due30, p.currency) : '—'}<div className="hint">{p.due30Count} payment(s)</div></td>
                    </tr>
                  ))}
                </tbody></table>
              )}
              <p className="hint"><Link to="/notifications?show=payments&state=overdue">All overdue payments</Link></p>
            </Card>
          </div>
        </div>
        <p className="hint">{c.definition} {d.note}</p>
      </>}
    </div>
  );
}

// =====================================================================================================================
// Management dashboard
// =====================================================================================================================

type PortfolioRow = {
  id: number; code: string; name: string; recordStatus: string; owner?: string | null; country?: string | null; runningProjects: number; status?: string | null; statusSummary?: string | null;
  statusRecordedAt?: string | null; statusAgeDays?: number | null; statusStale: boolean; agreement: string; signals: SignalT[]; nextMilestone?: string | null; nextMilestoneDate?: string | null; nextMilestoneLate: boolean;
};
type Mgmt = {
  evaluatedAt: string; period: { name: string; from: string; to: string; previousFrom: string; previousTo: string }; target: number; note: string;
  kpis: {
    clients: { total: number; offTrack: number; atRisk: number; onTrack: number; noStatus: number; runningProjects: number };
    backlog: { value: number; atPeriodStart: number; change: number; changePercent?: number | null };
    resolveDays: { value?: number | null; previous?: number | null; change?: number | null };
    sla: { resolutionRate?: number | null; responseRate?: number | null; previousResolutionRate?: number | null; change?: number | null; measured: number };
    commitments: { onTimeRate?: number | null; previous?: number | null; change?: number | null; completed: number; overdueNow: number };
    escalations?: { received: number; previous: number; active: number; activeLevel3: number; byClient: (BarT & { level3: number })[] } | null;
    payments?: { overdueCount: number; contracts: number; withoutAmount: number; amounts: { currency: string; amount: number }[] } | null;
  };
  trend: { key: string; label: string; opened: number; closed: number; backlog: number }[];
  teams: { id: number; name: string; engineers: number; open: number; perEngineer?: number | null; coverageGaps: number; link: string }[];
  portfolio: PortfolioRow[];
  risks: { id: number; ref: string; title: string; priority: string; client?: string | null }[];
  decisions: { id: number; ref: string; title: string; client: string; state: string; decideBy?: string | null; reason: string }[];
  dataTrust: {
    dataQualityOpen: number; environments: { total: number; needsVerification: number; unknown: number }; sla: { notMeasurable: number; withContract: number };
    clients: { total: number; staleStatus: number; noStatus: number; disagree: number }; contractsUnknownEnd?: number | null;
  };
};
const MGMT_PERIODS = [{ value: 'quarter', label: 'This quarter vs previous' }, { value: 'month', label: 'This month vs previous' }, { value: 'ytd', label: 'Year to date vs last year' }];
const SIGNAL_ORDER = ['delivery', 'sla', 'escalations', 'commitments', 'commercial', 'environments'];
const SIGNAL_SHORT: Record<string, string> = { delivery: 'Delivery', sla: 'SLA', escalations: 'Escalations', commitments: 'Commitments', commercial: 'Commercial', environments: 'Environments' };

function SignalDot({ s }: { s?: SignalT }) {
  if (!s) return <span className="muted">—</span>;
  const w = SIGNAL[s.state] ?? SIGNAL.Unknown;
  return <span className={`ad-dot ${w.tone}`} role="img" aria-label={`${s.label}: ${w.label}. ${s.text}`} title={`${s.label}: ${w.label} — ${s.text}`}>{w.glyph}</span>;
}

export function PortfolioTable({ rows, maxAgeHint }: { rows: PortfolioRow[]; maxAgeHint?: ReactNode }) {
  return (<>
    <DataTable<PortfolioRow> rowKey={r => r.id} rows={rows} tools={false} empty="none" caption="Client portfolio" pageSize={15} columns={[
      { key: 'c', header: 'Client', render: r => <><Link to={`/dashboards/client?clientId=${r.id}`}>{r.code}</Link> {r.name}</> },
      { key: 'o', header: 'Account owner', render: r => r.owner ?? <Badge tone="warn">Unassigned</Badge> },
      { key: 'p', header: 'Running projects', className: 'num', render: r => r.runningProjects },
      { key: 's', header: 'Recorded status', render: r => <><StatusWords status={r.status} />{r.agreement === 'Disagree' && <div className="hint t-warn">▲ signals disagree</div>}</> },
      ...SIGNAL_ORDER.map(key => ({ key, header: <span title={SIGNAL_SHORT[key]}>{SIGNAL_SHORT[key]}</span>, className: 'ad-sig-col', render: (r: PortfolioRow) => <SignalDot s={r.signals.find(x => x.key === key)} /> })),
      { key: 'm', header: 'Next milestone', render: r => r.nextMilestone ? <>{r.nextMilestone}<div className={`hint${r.nextMilestoneLate ? ' t-bad' : ''}`}>{fmtDate(r.nextMilestoneDate)}{r.nextMilestoneLate ? ' · late' : ''}</div></> : <span className="muted">—</span> },
      { key: 'a', header: 'Status age', className: 'nowrap', render: r => r.statusAgeDays == null ? <span className="muted">Never</span> : <>{r.statusAgeDays} d{r.statusStale && <span className="t-warn" title="The recorded status needs review"> ▲ review</span>}</> }
    ]} />
    <p className="hint">● On track &nbsp; ▲ Watch &nbsp; ■ Off track &nbsp; ○ Unknown (no data — never shown as on track). Hover a symbol for its facts. {maxAgeHint}</p>
  </>);
}

/** A108: is the operation getting better or worse, and where to step in. */
export function ManagementDashboard() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ period: 'quarter', country: '', teamId: '', productId: '' });
  const q = useQuery({ queryKey: ['dash-management', f], queryFn: () => get<Mgmt>(`/dashboard/management${qs(f)}`), placeholderData: keepPreviousData });
  const teams = useTeamOptions();
  const products = useProductOptions();
  const refresh = useRefreshAll(['dash-management']);
  const d = q.data;
  const k = d?.kpis;
  const t = d?.dataTrust;
  return (
    <div className="dash">
      <PageHead title="Management dashboard"
        sub={<>Trends and portfolio status. {d && <span className="cc-fresh">As of {fmtDateTime(d.evaluatedAt)} ({me.timeZone}) · {fmtDate(d.period.from)} to date, compared with {fmtDate(d.period.previousFrom)} – {fmtDate(d.period.previousTo)}.</span>}</>}
        actions={<>
          <button className="btn" onClick={refresh} disabled={q.isFetching}>{q.isFetching ? <><span className="spin" /> Refreshing…</> : 'Refresh'}</button>
          <Link className="btn" to="/">Command Center</Link>
          {canExport(me) && <Link className="btn btn-primary" to="/reporting-center">Reporting Center</Link>}
        </>} />
      <div className="toolbar ad-filters">
        <SelectInput label="Period" value={f.period} onChange={v => set({ period: v })} empty={null} options={MGMT_PERIODS} />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
        {(f.teamId || f.productId || f.country || f.period !== 'quarter') && <div className="cc-active"><button className="btn" onClick={() => set({ period: 'quarter', country: '', teamId: '', productId: '' })}>Reset filters</button></div>}
      </div>
      <p className="hint cc-scope">Changes compare the period to date with the same number of days of the previous period. Escalations, payments and contract decisions belong to no team and are hidden under a team filter.</p>
      {q.isLoading && <StateMessage kind="loading" />}
      {q.error && <StateMessage kind="error">The dashboard could not be loaded. Try Refresh.</StateMessage>}
      {d && k && t && <>
        <div className="kpis cc-kpis">
          <Kpi icon={<Icon name="clients" size={18} />} label="Clients in the portfolio" value={k.clients.total} to="/clients"
            partLabel={`${k.clients.runningProjects} running project(s)`}
            context={<>{k.clients.offTrack} off track · {k.clients.atRisk} at risk · {k.clients.noStatus} without a status</>} />
          <Kpi icon={<Icon name="case" size={18} />} label="Open ticket backlog" value={k.backlog.value} to="/cases?status=open" tone={k.backlog.change > 0 ? 'warning' : undefined}
            partLabel={`${k.backlog.atPeriodStart} at the start of the period`}
            context={<><Delta value={k.backlog.change} unit="" goodWhen="down" digits={0} /> since then{k.backlog.changePercent != null ? ` (${k.backlog.changePercent > 0 ? '+' : ''}${k.backlog.changePercent} %)` : ''}</>} />
          <Kpi icon={<Icon name="commitment" size={18} />} label="Median time to resolve" value={k.resolveDays.value != null ? `${k.resolveDays.value} d` : 'Not available'}
            partLabel="Tickets closed in the period, creation to closure" context={<><Delta value={k.resolveDays.change} unit=" d" goodWhen="down" /> against the previous period</>} />
          <Kpi icon={<Icon name="matrix" size={18} />} label="SLA resolution compliance" value={pctText(k.sla.resolutionRate)} to="/dashboards/sla"
            tone={k.sla.resolutionRate != null && k.sla.resolutionRate < d.target - 10 ? 'critical' : k.sla.resolutionRate != null && k.sla.resolutionRate < d.target ? 'warning' : undefined}
            partLabel={`${k.sla.measured} measured · objective ${d.target} %`} context={<><Delta value={k.sla.change} unit=" pts" goodWhen="up" /> against the previous period</>} />
          <Kpi icon={<Icon name="list" size={18} />} label="Commitments on time" value={pctText(k.commitments.onTimeRate)} to="/commitments?status=all" tone={k.commitments.overdueNow ? 'warning' : undefined}
            partLabel={`${k.commitments.completed} completed in the period`} context={<><Delta value={k.commitments.change} unit=" pts" goodWhen="up" /> · {k.commitments.overdueNow} overdue now</>} />
          {k.escalations && <Kpi icon={<Icon name="escalation" size={18} />} label="Escalations received" value={k.escalations.received} to="/escalations?status=all" tone={k.escalations.activeLevel3 ? 'critical' : undefined}
            partLabel={`${k.escalations.active} active now · ${k.escalations.activeLevel3} at level 3`}
            context={<><Delta value={k.escalations.received - k.escalations.previous} unit="" goodWhen="down" digits={0} /> against the previous period</>} />}
          {k.payments && <Kpi icon={<Icon name="report" size={18} />} label="Overdue payments" value={k.payments.overdueCount} to="/notifications?show=payments&state=overdue" tone={k.payments.overdueCount ? 'critical' : undefined}
            partLabel={k.payments.amounts.length ? k.payments.amounts.map(a => fmtMoney(a.amount, a.currency)).join(' + ') : k.payments.overdueCount ? 'Amounts not recorded' : 'None overdue'}
            context={`${k.payments.contracts} contract(s) · per currency, never added`} />}
        </div>

        <div className="ad-grid ad-2">
          <VizPanel title="Tickets opened and closed — last 12 months" sub="When opened stays above closed, the backlog grows. The backlog at each month end is in the table view."
            table={{ columns: ['Month', 'Opened', 'Closed', 'Backlog at month end'], rows: d.trend.map(x => [x.label, x.opened, x.closed, x.backlog]) }}>
            <TrendLines data={d.trend.map(x => ({ label: x.label, a: x.opened, b: x.closed }))} aLabel="Opened" bLabel="Closed" height={200} />
          </VizPanel>
          <Card title="Workload against people, by team" sub="Open tickets per active team member. Coverage gaps: tickets of a priority that needs a backup owner and has none.">
            <DataTable<Mgmt['teams'][number]> rowKey={r => r.id} rows={d.teams} tools={false} empty="none" caption="Workload by team" columns={[
              { key: 't', header: 'Team', render: r => <Link to={`/teams/${r.id}`}>{r.name}</Link> },
              { key: 'e', header: 'Members', className: 'num', render: r => r.engineers },
              { key: 'o', header: 'Open tickets', className: 'num', render: r => <Link to={r.link}>{r.open}</Link> },
              { key: 'p', header: 'Per member', render: r => r.perEngineer == null ? <span className="muted">No active member</span>
                : <div className="ad-clock"><Meter value={Math.min(100, (r.perEngineer / Math.max(1, ...d.teams.map(x => x.perEngineer ?? 0))) * 100)} label={`${r.perEngineer} open tickets per member`} /><span><b>{r.perEngineer}</b></span></div> },
              { key: 'g', header: 'Coverage gaps', className: 'num', render: r => r.coverageGaps ? <b className="t-bad">{r.coverageGaps}</b> : 0 }
            ]} />
          </Card>
        </div>

        <Band id="portfolio" icon="clients" title="Client portfolio" hint={<>{k.clients.total} client(s) — Active clients and any client with a running project · the status is what was recorded for the client; the symbols come from rules</>}>
          <section className="panel"><div className="panel-body"><PortfolioTable rows={d.portfolio} /></div></section>
        </Band>

        <div className="ad-grid ad-3" style={{ marginTop: 'var(--gap)' }}>
          {k.escalations ? (
            <VizPanel title="Escalations by client — this period" sub="Escalations received in the period. Click a bar for the client's escalations."
              table={{ columns: ['Client', 'Received', 'At level 3'], rows: k.escalations.byClient.map(b => [b.label, b.value, b.level3]) }}>
              <HBars data={k.escalations.byClient.map(b => ({ ...b, label: b.level3 ? `${b.label} (${b.level3} at level 3)` : b.label }))} unit="escalation(s)" empty="No escalation received in the period." />
            </VizPanel>
          ) : <Card title="Escalations by client"><div className="viz-empty">Shown when the dashboard is not filtered by team.</div></Card>}
          <Card title="Risks and pending decisions" sub="Open risk follow-up tickets, and contracts that need a renewal decision.">
            {d.risks.length + d.decisions.length === 0 ? <div className="viz-empty">No open risk follow-up and no contract decision due.</div> : (
              <table className="grid"><tbody>
                {d.decisions.map(x => (
                  <tr key={`d${x.id}`}><td><Badge tone={x.state === 'Expired' ? 'bad' : 'warn'}>Decide</Badge></td>
                    <td><Link to={`/contracts/${x.id}`}>{x.ref}</Link> {x.client} — {x.reason}</td></tr>
                ))}
                {d.risks.map(x => (
                  <tr key={`r${x.id}`}><td><Badge tone={PRIORITY_TONE[x.priority]}>Risk · {x.priority}</Badge></td>
                    <td><Link to={`/cases/${x.id}`}>{x.ref}</Link> {x.client ? `${x.client} — ` : ''}{x.title}</td></tr>
                ))}
              </tbody></table>
            )}
          </Card>
          <Card title="Data trust" sub="How far the figures on this page can be relied on.">
            <table className="grid"><tbody>
              <tr><td><Link to="/data-quality">Open data-quality items</Link></td><td className="num"><b>{t.dataQualityOpen}</b></td></tr>
              <tr><td><Link to="/environments?freshness=needsVerification">Environments needing verification</Link></td><td className="num"><b>{t.environments.needsVerification}</b> / {t.environments.total}</td></tr>
              <tr><td><Link to="/environments?condition=Unknown">Environments never reported</Link></td><td className="num"><b>{t.environments.unknown}</b> / {t.environments.total}</td></tr>
              <tr><td><Link to="/dashboards/sla">Tickets not SLA-measurable (period)</Link></td><td className="num"><b>{t.sla.notMeasurable}</b> / {t.sla.withContract}</td></tr>
              <tr><td>Clients without a recorded status</td><td className="num"><b>{t.clients.noStatus}</b> / {t.clients.total}</td></tr>
              <tr><td>Clients whose status needs review</td><td className="num"><b>{t.clients.staleStatus}</b> / {t.clients.total}</td></tr>
              <tr><td>Clients where signals disagree with the status</td><td className="num"><b>{t.clients.disagree}</b> / {t.clients.total}</td></tr>
              {t.contractsUnknownEnd != null && <tr><td><Link to="/contracts?renewal=unknownEnd">Active contracts without an end date</Link></td><td className="num"><b>{t.contractsUnknownEnd}</b></td></tr>}
            </tbody></table>
          </Card>
        </div>
        <p className="hint">{d.note}</p>
      </>}
    </div>
  );
}

// =====================================================================================================================
// Client dashboard (A109; 2.59.0 had a Project dashboard)
// =====================================================================================================================

type Cli = {
  evaluatedAt: string;
  client: { id: number; code: string; name: string; recordStatus: string; owner?: string | null; country?: string | null; products: { id: number; code: string; name: string }[] };
  projects: { id: number; code: string; name: string; status: string; running: boolean; owner?: string | null; serviceStart?: string | null; serviceEnd?: string | null; contracts: number; inYears: boolean }[];
  status: {
    recorded?: { status: string; summary: string; nextReviewOn?: string | null; recordedAt: string; recordedBy?: string | null; ageDays: number } | null;
    agreement: string; agreementText: string; stale: boolean; maxAgeDays: number; canRecord: boolean;
    history: { id: number; status: string; summary: string; nextReviewOn?: string | null; recordedAt: string; recordedBy?: string | null }[];
  };
  signals: SignalT[];
  contracts: { id: number; ref: string; title: string; type: string; status: string; startDate?: string | null; endDate?: string | null; noticeDeadline?: string | null; state: string; projectId: number; projectCode?: string | null; inYears: boolean }[];
  milestones: { contractId: number; contractRef: string; phase: string; description?: string | null; date?: string | null; percent?: number | null; state: string }[];
  payments: { id: number; contractId: number; contractRef: string; condition: string; amount?: number | null; currency?: string | null; dueDate?: string | null; status: string; paidOn?: string | null; state: string; yearDate?: string | null; inYears: boolean }[];
  cases: { open: number; overdue: number; link: string; byPriority: BarT[]; list: { id: number; ref: string; title: string; priority: string; status: string; owner?: string | null; dueAt?: string | null; overdue: boolean }[] };
  sla: { target: number; windowDays: number; response: Tally; resolution: Tally; openBreached: number; link: string };
  escalations: { id: number; ref: string; title: string; level: number; status: string; owner: string; receivedAt: string; overdue: boolean }[];
  commitments: { id: number; ref: string; description: string; dueAt: string; owner?: string | null; overdue: boolean }[];
  environments: { id: number; name: string; type: string; condition: ConditionT; reason?: string | null; installations: { product: string; version?: string | null }[] }[];
  team: { note: string; members: { userId: number; name: string; role: string; active: boolean }[] };
  activity: { at: string; text: string; link: string }[];
  // A113 Client 360: the selected years and the sections worked out for them.
  period: { all: boolean; years: number[]; label: string; contiguous: boolean; current: number; firstYear: number; lastYear: number; timeZone: string; from?: string | null; to?: string | null };
  tickets: { opened: number; open: number; closed: number; overdue: number; openOtherYears: number; link: string; linkExact: boolean; byPriority: BarT[];
    list: { id: number; ref: string; title: string; priority: string; status: string; owner?: string | null; dueAt?: string | null; overdue: boolean }[] };
  slaYears: { target: number; response: Tally; resolution: Tally; openBreached: number; tickets: number; link: string };
  escalationsYears: { raised: number; active: number; overdue: number; activeOtherYears: number; link: string;
    list: { id: number; ref: string; title: string; level: number; status: string; active: boolean; owner: string; receivedAt: string; overdue: boolean }[] };
  commitmentsYears: { due: number; open: number; overdue: number; completed: number; completedLate: number; openOtherYears: number; link: string;
    list: { id: number; ref: string; description: string; dueAt: string; owner?: string | null; overdue: boolean }[] };
  paymentsOverdueOtherYears: number;
};
const PAY_STATE: Record<string, { tone: Tone; label: string }> = {
  paid: { tone: 'good', label: 'Paid' }, waived: { tone: 'neutral', label: 'Waived' }, overdue: { tone: 'bad', label: 'Overdue' }, due: { tone: 'warn', label: 'Due soon' },
  upcoming: { tone: 'neutral', label: 'Upcoming' }, closed: { tone: 'neutral', label: 'Contract terminated' }
};
const CONTRACT_STATE: Record<string, string> = { Current: 'Current', RenewalDue: 'Renewal due', EndDateUnknown: 'End date unknown', Expired: 'Ended, still Active', Draft: 'Draft', Ended: 'Ended', Terminated: 'Terminated' };
const PROJECT_STATUS: Record<string, string> = { Planned: 'Planned', Active: 'Active', OnHold: 'On hold', Completed: 'Completed', Archived: 'Archived' };

/** A113: the years Client 360 covers — any set of calendar years, ticked together, or all years. '' in the address = this year. */
function YearPicker({ period, value, onChange }: { period: Cli['period']; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const years: number[] = [];
  for (let y = period.lastYear; y >= period.firstYear; y--) years.push(y);
  // The ticks follow the address at once, not the figures still loading for it.
  const all = value === 'all';
  const chosen = new Set(all ? [] : value ? value.split(',').map(Number).filter(Number.isInteger) : [period.current]);
  const set = (ys: number[]) => {
    const sorted = [...new Set(ys)].sort((a, b) => a - b);
    onChange(sorted.length === 1 && sorted[0] === period.current ? '' : sorted.join(','));
  };
  const toggle = (y: number) => {
    // From All years, a click on a year starts a new selection with that year.
    if (all) { set([y]); return; }
    const next = new Set(chosen);
    if (next.has(y)) next.delete(y); else next.add(y);
    if (next.size > 0) set([...next]);
  };
  return (
    <div className="field c360-years" ref={box}>
      <span className="label" id="c360-years-l">Years</span>
      <button type="button" className="c360-years-btn" aria-haspopup="true" aria-expanded={open} aria-labelledby="c360-years-l c360-years-v" onClick={() => setOpen(v => !v)}>
        <span id="c360-years-v">{yearsText(period)}</span><span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="c360-years-pop" role="group" aria-label="Choose years">
          <div className="c360-years-presets">
            <button type="button" className="linkbtn" onClick={() => set([period.current])}>This year</button>
            <button type="button" className="linkbtn" onClick={() => set([period.current - 1, period.current])}>Last 2 years</button>
            <button type="button" className="linkbtn" onClick={() => onChange('all')}>All years</button>
          </div>
          <p className="hint">{all ? 'All years are included. Click a year to choose years instead.' : 'Tick one or more years.'}</p>
          <div className="c360-years-list">
            {years.map(y => (
              <label key={y} className="check">
                <input type="checkbox" checked={all || chosen.has(y)} onChange={() => toggle(y)} />
                {y}{y === period.current ? ' (this year)' : ''}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function yearsText(p: Cli['period']) {
  if (p.all) return 'All years';
  if (p.years.length === 1 && p.years[0] === p.current) return `This year (${p.current})`;
  return p.label;
}
const inText = (p: Cli['period']) => (p.all ? 'in any year' : `in ${p.label}`);

/** Totals per currency: "AED 80,000 · USD 2,000"; terms without an amount are counted, not summed. */
function money(rows: Cli['payments']) {
  const by = new Map<string, number>();
  for (const r of rows) if (r.amount != null) by.set(r.currency ?? '', (by.get(r.currency ?? '') ?? 0) + r.amount);
  if (by.size === 0) return rows.length ? 'No amount' : '0';
  return [...by].map(([c, n]) => `${c ? `${c} ` : ''}${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`).join(' · ');
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function C360Section({ id, no, title, hint, children, actions }: { id: string; no: string; title: string; hint?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="panel c360-sec" id={id} aria-labelledby={`${id}-h`}>
      <div className="c360-sec-head">
        <h2 id={`${id}-h`}><span className="c360-no">{no}</span>{title}</h2>
        {hint && <span className="hint">{hint}</span>}
        {actions && <span className="c360-sec-act">{actions}</span>}
      </div>
      <div className="c360-sec-body">{children}</div>
    </section>
  );
}
function C360Row({ to, title, right, sub, tone }: { to: string; title: ReactNode; right?: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <li className="c360-row">
      <div className="c360-row-top"><Link to={to}>{title}</Link>{right && <span className={tone ? `c360-right t-${tone}` : 'c360-right'}>{right}</span>}</div>
      {sub && <div className="c360-row-sub">{sub}</div>}
    </li>
  );
}

const PAY_BUCKETS = [
  { key: 'paid', label: 'Paid', glyph: '●', tone: 'good', states: ['paid'] },
  { key: 'upcoming', label: 'Upcoming', glyph: '○', tone: 'info', states: ['upcoming', 'due'] },
  { key: 'overdue', label: 'Overdue', glyph: '■', tone: 'bad', states: ['overdue'] }
] as const;
const C360_SECTIONS = ['projects', 'contracts', 'payments', 'sla', 'tickets', 'escalations', 'commitments'] as const;

/** A113 (owner request, 12 Nov 2026): Client 360 — one client, seven sections, for the years the reader ticks. The recorded status and its signals stay one click away. */
export function ClientDashboard() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ clientId: '', years: '' });
  const [dialog, setDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSignals, setShowSignals] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [allPayments, setAllPayments] = useState(false);
  const [allProjects, setAllProjects] = useState(false);
  const list = useQuery({ queryKey: ['dash-clients'], queryFn: () => get<{ items: PortfolioRow[] }>('/dashboard/clients') });
  const q = useQuery({ queryKey: ['dash-client', f.clientId, f.years], queryFn: () => get<Cli>(`/dashboard/clients/${f.clientId}${qs({ years: f.years || undefined })}`), enabled: !!f.clientId, placeholderData: keepPreviousData });
  const refresh = useRefreshAll(['dash-client', 'dash-clients']);
  // Open on the first client of the list (the one needing most attention) when none is chosen.
  useEffect(() => { if (!f.clientId && list.data?.items.length) set({ clientId: String(list.data.items[0].id) }); }, [f.clientId, list.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const options = (list.data?.items ?? []).map(c => ({ value: String(c.id), label: `${c.code} · ${c.name}` }));
  const d = q.data;
  // A client outside the portfolio (an opportunity without a running project) opened by its address: keep it selectable.
  if (d && !options.some(o => o.value === String(d.client.id))) options.unshift({ value: String(d.client.id), label: `${d.client.code} · ${d.client.name}` });
  const rec = d?.status.recorded;
  const words = rec ? STATUS_WORDS[rec.status] : null;
  const go = (key: string) => document.getElementById(`c360-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!d) return (
    <div className="dash c360">
      <PageHead title="Client 360" crumbs={[{ to: '/dashboards', label: 'Dashboard' }, { label: 'Client 360' }]} />
      <div className="toolbar ad-filters"><SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={options} empty={null} wide /></div>
      {(list.isLoading || q.isLoading) && <StateMessage kind="loading" />}
      {q.error && <StateMessage kind="error">The client could not be loaded. It may not exist, or you may not have access to it.</StateMessage>}
      {list.data && list.data.items.length === 0 && !f.clientId && <StateMessage kind="none">No Active client and no running project is recorded.</StateMessage>}
    </div>
  );

  const p = d.period;
  const yearProjects = d.projects.filter(x => x.inYears);
  const yearContracts = d.contracts.filter(x => x.inYears);
  const yearPayments = d.payments.filter(x => x.inYears);
  const bucket = (states: readonly string[]) => yearPayments.filter(x => states.includes(x.state));
  const shownPayments = allPayments ? d.payments : yearPayments.filter(x => x.state !== 'waived' && x.state !== 'closed');
  const waived = yearPayments.filter(x => x.state === 'waived').length;
  const closed = yearPayments.filter(x => x.state === 'closed').length;
  const undated = d.payments.filter(x => !x.yearDate).length;
  const renewals = yearContracts.filter(x => x.state === 'RenewalDue').length;
  const t = d.tickets, sla = d.slaYears, esc = d.escalationsYears, com = d.commitmentsYears;
  const kpis: Record<typeof C360_SECTIONS[number], { label: string; value: string | number; sub: string; warn?: boolean }> = {
    projects: { label: 'Projects', value: yearProjects.length, sub: 'Service in selected years' },
    contracts: { label: 'Contracts', value: yearContracts.length, sub: renewals ? `${plural(renewals, 'renewal')} due now` : 'Terms in selected years', warn: renewals > 0 },
    payments: { label: 'Payments', value: yearPayments.length, sub: bucket(['overdue']).length ? `${bucket(['overdue']).length} overdue` : 'Dated in selected years', warn: bucket(['overdue']).length > 0 },
    sla: { label: 'SLA', value: sla.resolution.rate === null ? '—' : `${sla.resolution.rate} %`, sub: sla.resolution.rate === null ? 'Nothing measured' : 'Resolution met', warn: sla.resolution.rate !== null && sla.resolution.rate < sla.target },
    tickets: { label: 'Tickets', value: t.opened, sub: `Opened · ${t.open} open`, warn: t.overdue > 0 },
    escalations: { label: 'Escalations', value: esc.raised, sub: `Raised · ${esc.active} active`, warn: esc.active > 0 },
    commitments: { label: 'Commitments', value: com.due, sub: `Due · ${com.open} open`, warn: com.overdue > 0 }
  };

  return (
    <div className="dash c360">
      <PageHead title="Client 360" crumbs={[{ to: '/dashboards', label: 'Dashboard' }, { label: 'Client 360' }]}
        actions={<>
          <button className="btn" onClick={refresh} disabled={q.isFetching}>{q.isFetching ? <><span className="spin" /> Refreshing…</> : 'Refresh'}</button>
          <Link className="btn" to={`/clients/${d.client.id}`}>Client record</Link>
          {d.status.canRecord && <button className="btn btn-primary" onClick={() => setDialog(true)}>Update status</button>}
        </>} />

      <section className="panel c360-head" aria-label="Client and years">
        <div className="c360-pick">
          <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={options} empty={null} wide />
          <YearPicker period={p} value={f.years} onChange={v => set({ years: v })} />
          <div className="c360-status" role="region" aria-label="Client status">
            <span className={`c360-status-st ${rec ? STATUS_WORDS[rec.status]?.tone : 'neutral'}`}>
              <span aria-hidden="true">{words?.glyph ?? '○'}</span> Recorded client status: <b className="ad-verdict-st">{words?.label ?? 'Not recorded'}</b>
              {rec && <> · {fmtDate(rec.recordedAt)}</>}
            </span>
            <span className="hint">As of {fmtDateTime(d.evaluatedAt)} ({me.timeZone})</span>
            <span className="c360-status-links">
              <button className="linkbtn" aria-expanded={showSignals} onClick={() => setShowSignals(v => !v)}>{showSignals ? 'Hide signals' : 'Signals behind the status'}</button>
              {d.status.history.length > 0 && <button className="linkbtn" aria-expanded={showHistory} onClick={() => setShowHistory(v => !v)}>{showHistory ? 'Hide history' : `Status history (${d.status.history.length})`}</button>}
            </span>
          </div>
        </div>
        <p className="c360-facts">
          {d.client.recordStatus} · {d.client.country ?? 'Country not recorded'} · Account owner: {d.client.owner ?? <Badge tone="warn">Unassigned</Badge>}
          {d.client.products.length > 0 && <> · Products: {d.client.products.map(x => x.code).join(', ')}</>}
        </p>
        <p className="c360-facts">
          {p.all ? 'All years' : `Calendar ${p.years.length === 1 ? 'year' : 'years'}: ${p.label}`} · 1 Jan – 31 Dec of each year ({p.timeZone}) · Statuses are as they are now ·{' '}
          <button className="linkbtn" aria-expanded={showHow} onClick={() => setShowHow(v => !v)}>{showHow ? '▾' : '▸'} How years apply</button>
        </p>
        {showHow && (
          <ul className="c360-how">
            <li><b>Projects and contracts</b> count when their service or contract term overlaps a selected year. An unknown start or end is treated as open-ended.</li>
            <li><b>Payments</b> count in the year they were paid (paid terms) or are due (all others). A term without a date is in no year.</li>
            <li><b>SLA and tickets</b> cover the tickets opened in the selected years; the SLA uses those with a linked contract.</li>
            <li><b>Escalations</b> count in the year they were raised; <b>commitments</b> in the year of the deadline in force.</li>
            <li>Open items, overdue items and recorded statuses are as they are today, whatever years are selected.</li>
          </ul>
        )}
        {(rec || d.status.agreement !== 'NoStatus') && d.status.agreement !== 'Agree' && (
          <p className={`ad-agree ${d.status.agreement.toLowerCase()}`} role="status">{d.status.agreement === 'NoStatus' ? '○ ' : '▲ '}{d.status.agreementText}</p>
        )}
        {rec && <p className="c360-facts">“{rec.summary}” — {rec.recordedBy ?? 'an unknown user'}, {rec.ageDays} d ago{rec.nextReviewOn ? ` · next review ${fmtDate(rec.nextReviewOn)}` : ''}</p>}
      </section>

      {showSignals && (
        <Card title="Signals behind the status" sub="Rule-based and explainable — hover a signal for its rule, click for its records. They do not replace the recorded status.">
          <div className="ad-signals">
            {d.signals.map(s => (
              <Link key={s.key} to={s.link ?? '#'} className="ad-signal" title={s.rule}>
                <span className="ad-signal-t">{s.label}</span><SignalBadge state={s.state} /><span className="ad-signal-x">{s.text}</span>
              </Link>
            ))}
          </div>
          <p className={`ad-agree ${d.status.agreement.toLowerCase()}`}>{d.status.agreementText}</p>
        </Card>
      )}
      {showHistory && (
        <Card title="Status history" sub="Every recorded status is kept; the newest is the client's status.">
          <table className="grid"><thead><tr><th>Recorded</th><th>Status</th><th>Reason</th><th>By</th><th>Next review</th></tr></thead><tbody>
            {d.status.history.map(h => <tr key={h.id}><td className="nowrap">{fmtDateTime(h.recordedAt)}</td><td><StatusWords status={h.status} /></td><td>{h.summary}</td><td>{h.recordedBy ?? '—'}</td><td className="nowrap">{h.nextReviewOn ? fmtDate(h.nextReviewOn) : '—'}</td></tr>)}
          </tbody></table>
        </Card>
      )}

      <nav className="c360-kpis" aria-label="Client 360 summary">
        {C360_SECTIONS.map(k => (
          <button key={k} type="button" className={`c360-kpi${kpis[k].warn ? ' warn' : ''}`} onClick={() => go(k)}>
            <span className="c360-kpi-l">{kpis[k].label}</span><b>{kpis[k].value}</b><span className="c360-kpi-s">{kpis[k].sub}</span>
          </button>
        ))}
      </nav>

      <div className="c360-grid">
        <C360Section id="c360-projects" no="1.1" title="Projects" hint="Status · manager · service dates">
          <p className="c360-lead">{plural(yearProjects.length, 'project')} · service overlaps {p.all ? 'any year' : p.label}{d.projects.length > yearProjects.length && <> · {d.projects.length - yearProjects.length} outside the years</>}</p>
          {d.projects.length === 0 ? <p className="hint">No project is recorded for this client.</p> : (
            <ul className="c360-list">
              {(allProjects ? d.projects : yearProjects).map(x => (
                <C360Row key={x.id} to={`/projects/${x.id}`} title={<><b>{x.code}</b> · {x.name}</>} right={PROJECT_STATUS[x.status] ?? x.status}
                  sub={<>{x.owner ?? 'Manager unassigned'} · Service: {x.serviceStart ? fmtDate(x.serviceStart) : 'unknown'} – {x.serviceEnd ? fmtDate(x.serviceEnd) : 'unknown'} · {plural(x.contracts, 'contract')}{!x.inYears && ' · outside the years'}</>} />
              ))}
            </ul>
          )}
          {d.projects.length > yearProjects.length && <button className="linkbtn" onClick={() => setAllProjects(v => !v)}>{allProjects ? 'Show the selected years only' : `Show all ${d.projects.length} projects`}</button>}
        </C360Section>

        <C360Section id="c360-contracts" no="1.2" title="Contracts" hint="Terms · expiry · renewal" actions={<Link className="linkbtn" to={`/contracts?clientId=${d.client.id}`}>All contracts</Link>}>
          <p className="c360-lead">{plural(yearContracts.length, 'contract')} · terms overlap {p.all ? 'any year' : p.label} · {plural(renewals, 'renewal')} due now</p>
          {yearContracts.length === 0 ? <p className="hint">No contract term overlaps the selected years.</p> : (
            <ul className="c360-list">
              {yearContracts.map(x => (
                <C360Row key={x.id} to={`/contracts/${x.id}`} title={<><b>{x.ref}</b> · {x.title}</>} right={CONTRACT_STATE[x.state] ?? x.status} tone={x.state === 'RenewalDue' || x.state === 'EndDateUnknown' ? 'warn' : x.state === 'Expired' ? 'bad' : undefined}
                  sub={<>{x.projectCode ?? 'No project'} · {x.startDate ? `From ${fmtDate(x.startDate)} · ` : ''}{x.endDate ? `Ends ${fmtDate(x.endDate)}` : 'End date unknown'}{x.noticeDeadline ? ` · notice by ${fmtDate(x.noticeDeadline)}` : ''}</>} />
              ))}
            </ul>
          )}
        </C360Section>

        <C360Section id="c360-payments" no="1.3" title="Payments" hint={`Paid / due dates ${inText(p)}`}>
          <div className="c360-pay">
            {PAY_BUCKETS.map(b => {
              const rows = bucket(b.states);
              return (
                <div key={b.key} className={`c360-pay-b ${b.key}`}>
                  <span className={`c360-pay-l t-${b.tone}`}><span aria-hidden="true">{b.glyph}</span> {b.label}</span>
                  <b>{money(rows)}</b>
                  <span className="hint">{plural(rows.length, 'payment')}{b.key === 'upcoming' && rows.some(r => r.state === 'due') ? ' · includes due soon' : ''}</span>
                </div>
              );
            })}
          </div>
          {d.paymentsOverdueOtherYears > 0 && <p className="t-bad"><b>▲ {plural(d.paymentsOverdueOtherYears, 'more payment')} overdue from other years.</b></p>}
          <div className="c360-pay-head">
            <span className="hint">{allPayments ? `All payment terms of the client · ${d.payments.length}` : `Payment terms ${inText(p)} · showing ${shownPayments.length} of ${yearPayments.length}`}</span>
            {(d.payments.length > shownPayments.length || allPayments) && <button className="linkbtn" onClick={() => setAllPayments(v => !v)}>{allPayments ? 'Show the selected years only' : 'Show all payment terms'}</button>}
          </div>
          {shownPayments.length === 0 ? <p className="hint">No payment term is dated in the selected years.</p> : (
            <table className="grid"><thead><tr><th>Payment</th><th>Contract</th><th>State</th><th>Date</th><th className="num">Amount</th></tr></thead><tbody>
              {shownPayments.map(x => (
                <tr key={x.id} className={x.inYears ? undefined : 'muted'}>
                  <td><Link to={`/contracts/${x.contractId}`}>{x.condition}</Link></td>
                  <td>{x.contractRef}</td>
                  <td><Badge tone={PAY_STATE[x.state]?.tone ?? 'neutral'}>{PAY_STATE[x.state]?.label ?? x.state}</Badge></td>
                  <td className="nowrap">{x.paidOn ? `Paid ${fmtDate(x.paidOn)}` : x.dueDate ? `Due ${fmtDate(x.dueDate)}` : <span className="muted">No date</span>}</td>
                  <td className="num nowrap">{x.amount != null ? fmtMoney(x.amount, x.currency) : <span className="muted">No amount</span>}</td>
                </tr>
              ))}
            </tbody></table>
          )}
          <p className="hint">Selected years: {waived} waived{closed ? `, ${closed} on terminated contracts` : ''}. {undated} without a date, in no year. Recorded contract payment terms — not invoicing or accounting. Amounts stay in their own currency.</p>
        </C360Section>

        <C360Section id="c360-sla" no="1.4" title="SLA" hint={`Tickets opened ${inText(p)}`} actions={<Link className="linkbtn" to={sla.link}>Tickets</Link>}>
          {sla.tickets === 0 ? <p className="hint">No ticket with a linked contract was opened in the selected years, so nothing is measured.</p> : <>
            {([['First response', sla.response], ['Resolution', sla.resolution]] as const).map(([name, x]) => (
              <div key={name} className="c360-rate">
                <span>{name}</span><b className={x.rate === null ? 'muted' : x.rate < sla.target ? 't-bad' : 't-good'}>{pctText(x.rate)}</b>
                {x.rate !== null && <Meter value={x.rate} tone={x.rate < sla.target - 10 ? 'critical' : x.rate < sla.target ? 'warning' : undefined} label={`${name}: ${x.rate} %`} />}
                <span className="hint">{x.met} met · {x.breached} breached · {x.pending} pending · {x.notMeasurable} not measurable</span>
              </div>
            ))}
          </>}
          <p className={sla.openBreached ? 't-bad' : 't-good'}>{sla.openBreached ? <b>▲ {plural(sla.openBreached, 'open ticket')} with a breached target</b> : '0 open tickets with a breached target'} · opened {inText(p)}</p>
          <p className="hint">Rates use met + breached obligations. Pending and not measurable are shown separately. Objective: {sla.target} % (setting).</p>
        </C360Section>

        <C360Section id="c360-tickets" no="1.5" title="Tickets" hint={`Opened ${inText(p)} · current status`} actions={<Link className="linkbtn" to={t.link}>{t.linkExact ? 'Open the list' : 'All tickets of the client'}</Link>}>
          <p className="c360-lead">{t.opened} opened · {t.open} currently open · <span className={t.overdue ? 't-bad' : undefined}>{t.overdue} overdue</span></p>
          <p className="c360-prio">{t.byPriority.slice().reverse().map(b => <span key={b.key}>{b.label}: <b>{b.value}</b></span>)}</p>
          {t.list.length === 0 ? <p className="hint">No open ticket opened in the selected years.</p> : (
            <ul className="c360-list">
              {t.list.map(x => (
                <C360Row key={x.id} to={`/cases/${x.id}`} title={<><b>{x.ref}</b> · {x.title}</>} right={x.priority} tone={PRIORITY_TONE[x.priority] === 'bad' ? 'bad' : PRIORITY_TONE[x.priority] === 'warn' ? 'warn' : undefined}
                  sub={<>{x.owner ?? 'Unassigned'} · {x.status} · {x.dueAt ? <>{x.overdue ? <span className="t-bad">Overdue since {fmtDate(x.dueAt)}</span> : `Due ${fmtDate(x.dueAt)}`}</> : 'No deadline'}</>} />
              ))}
            </ul>
          )}
          {t.open > t.list.length && <p className="hint">Showing {t.list.length} of {t.open} open, the most urgent first.</p>}
          {t.openOtherYears > 0 && <p className="hint">{plural(t.openOtherYears, 'more open ticket')} opened in other years.</p>}
        </C360Section>

        <C360Section id="c360-escalations" no="1.6" title="Escalations" hint="Owner · level · follow-up" actions={<Link className="linkbtn" to={esc.link}>All escalations</Link>}>
          <p className="c360-lead">{esc.raised} raised · {esc.active} currently active{esc.overdue ? <> · <span className="t-bad">{esc.overdue} past a target</span></> : ''} · {p.all ? 'any year' : `raised in ${p.label}`}</p>
          {esc.list.length === 0 ? <p className="hint">No escalation was raised in the selected years.</p> : (
            <ul className="c360-list">
              {esc.list.map(x => (
                <C360Row key={x.id} to={`/escalations/${x.id}`} title={<><b>{x.ref}</b> · {x.title}</>} right={`Level ${x.level}`} tone={x.overdue || x.level >= 3 ? 'bad' : x.active ? 'warn' : undefined}
                  sub={<>{x.owner} · {x.active ? (x.overdue ? <span className="t-bad">Active, past a target</span> : 'Active') : x.status} · raised {fmtDate(x.receivedAt)}</>} />
              ))}
            </ul>
          )}
          {esc.activeOtherYears > 0 && <p className="hint">{plural(esc.activeOtherYears, 'more active escalation')} raised in other years.</p>}
        </C360Section>

        <C360Section id="c360-commitments" no="1.7" title="Commitments" hint="Owner · deadline" actions={<Link className="linkbtn" to={com.link}>All commitments</Link>}>
          <p className="c360-lead">{com.due} due · {com.open} currently open · <span className={com.overdue ? 't-bad' : undefined}>{com.overdue} overdue</span> · {com.completed} completed{com.completedLate ? ` (${com.completedLate} late)` : ''}</p>
          {com.list.length === 0 ? <p className="hint">No open commitment is due in the selected years.</p> : (
            <ul className="c360-list">
              {com.list.map(x => (
                <C360Row key={x.id} to={`/commitments/${x.id}`} title={<><b>{x.ref}</b> · {x.description}</>} right={`Due ${fmtDate(x.dueAt)}`} tone={x.overdue ? 'bad' : undefined}
                  sub={<>{x.owner ?? <Badge tone="warn">Unassigned</Badge>}{x.overdue && <> · <span className="t-bad">Overdue</span></>}</>} />
              ))}
            </ul>
          )}
          {com.open > com.list.length && <p className="hint">Showing {com.list.length} of {com.open} open, the earliest first.</p>}
          {com.openOtherYears > 0 && <p className="hint">{plural(com.openOtherYears, 'more open commitment')} due in other years.</p>}
        </C360Section>
      </div>

      <p className="hint">The status is a person's recorded judgement, never a calculated score. Signals are rules over the client's records; missing data is Unknown, never On track. A status older than {d.status.maxAgeDays} days is flagged for review (setting <i>Dashboard.ClientStatusMaxAgeDays</i>).</p>
      {dialog && <ActionDialog title="Update client status" submitLabel="Record status" path={`/clients/${d.client.id}/status-reports`} onClose={() => setDialog(false)}
        intro={<>Record what you judge the status of <b>{d.client.code}</b> to be, across its projects, and why. The previous status stays in the history.</>}
        initial={{ status: rec?.status ?? '' }}
        transform={v => ({ status: v.status || null, summary: v.summary, nextReviewOn: v.nextReviewOn || null })}
        fields={[
          { name: 'status', label: 'Status', kind: 'select', required: true, options: [{ value: 'OnTrack', label: 'On track' }, { value: 'AtRisk', label: 'At risk' }, { value: 'OffTrack', label: 'Off track' }] },
          { name: 'summary', label: 'Reason — what is behind this status', kind: 'textarea', required: true, hint: 'One or two sentences a manager can act on (up to 1,000 characters).' },
          { name: 'nextReviewOn', label: 'Next review', kind: 'date', hint: `Optional. Without a date the status is flagged for review after ${d.status.maxAgeDays} days.` }
        ]} />}
    </div>
  );
}

/** A108: /dashboards opens the first dashboard the person may use; the four dashboards are routed here, each behind its own right. */
function DashboardsHome() {
  const me = useMe().data!;
  const first = audienceDashboards.find(d => hasRight(me, d[3], 'View'));
  return first ? <Navigate to={`/dashboards/${first[0]}`} replace /> : <Navigate to="/" replace />;
}

export function Dashboards() {
  return (
    <Routes>
      <Route index element={<DashboardsHome />} />
      <Route path="operational" element={<OperationalDashboard />} />
      <Route path="sla" element={<SlaContractsDashboard />} />
      <Route path="management" element={<ManagementDashboard />} />
      <Route path="client" element={<ClientDashboard />} />
      {/* A109: the 2.59.0 address of the Project dashboard. */}
      <Route path="project" element={<Navigate to="/dashboards/client" replace />} />
    </Routes>
  );
}
