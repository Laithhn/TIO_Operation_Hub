import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from './kit';
import { Enums, ValueField } from '../vt';

// Chart kit for the dashboard. Rules (validated, see docs/DESIGN-RULES.md):
// magnitude = one blue ramp; trend = categorical slots 1–2 with a legend + direct end labels;
// reported condition = reserved status colours, always with a text label; text never wears the series colour.
// VtWebGuiFramework palette: series = attention (dark-text variant, >= 3:1 on offWhite) and attentionHigh; status = the framework
// signal colours (calmingGreen, attentionHigh, signalError) used by StatusMarker; magnitude ramp = attention towards primary.
export const SERIES = { blue: '#007db3', orange: '#e6932b' };
export const RAMP = ['#80d9ff', '#1abbff', '#007db3', '#00507a', '#001e46'];
export const STATUS = { good: '#5dae95', warning: '#e6932b', critical: '#b00020', neutral: '#a4abb0' };

export type Bar = { key: string; label: string; value: number; link?: string | null };

// ---------- tooltip ----------
type Tip = { x: number; y: number; content: ReactNode } | null;

function useTip() {
  const [tip, setTip] = useState<Tip>(null);
  const ref = useRef<HTMLDivElement>(null);
  const show = (e: { clientX: number; clientY: number }, content: ReactNode) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, content });
  };
  const showAt = (el: Element, content: ReactNode) => {
    const r = ref.current?.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!r) return;
    setTip({ x: b.left - r.left + b.width / 2, y: b.top - r.top, content });
  };
  const node = tip && (
    <div className="viz-tip" role="tooltip" style={{ left: Math.min(tip.x + 12, (ref.current?.clientWidth ?? 400) - 220), top: Math.max(tip.y - 12, 0) }}>{tip.content}</div>
  );
  return { ref, show, showAt, hide: () => setTip(null), node };
}

// ---------- horizontal bars ----------
export function HBars({ data, color = SERIES.blue, colorOf, unit, empty = 'No records entered.' }: {
  data: Bar[]; color?: string; colorOf?: (b: Bar) => string; unit?: string; empty?: string;
}) {
  const nav = useNavigate();
  const tip = useTip();
  const max = Math.max(1, ...data.map(d => d.value));
  if (data.length === 0 || data.every(d => d.value === 0)) return <div className="viz-empty">{empty}</div>;
  return (
    <div className="viz-wrap" ref={tip.ref}>
      <ul className="hbars">
        {data.map(d => {
          const pct = (d.value / max) * 100;
          const go = () => d.link && nav(d.link);
          return (
            <li key={d.key}>
              <span className="hb-label" title={d.label}>{d.label}</span>
              <span className="hb-track"
                role={d.link ? 'link' : undefined} tabIndex={d.link ? 0 : undefined} aria-label={`${d.label}: ${d.value}${unit ? ' ' + unit : ''}${d.link ? '. Open list' : ''}`}
                onClick={go} onKeyDown={e => { if (e.key === 'Enter') go(); }}
                onMouseMove={e => tip.show(e, <><b>{d.label}</b><div>{d.value}{unit ? ` ${unit}` : ''}</div>{d.link && <div className="muted">Click to open the list</div>}</>)}
                onMouseLeave={tip.hide} onFocus={e => tip.showAt(e.currentTarget, <><b>{d.label}</b><div>{d.value}</div></>)} onBlur={tip.hide}
                style={{ cursor: d.link ? 'pointer' : 'default' }}>
                <span className="hb-bar" style={{ width: d.value === 0 ? 0 : `max(${pct}%, 3px)`, background: colorOf ? colorOf(d) : color }} />
                <span className="hb-value">{d.value}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {tip.node}
    </div>
  );
}

// ---------- columns ----------
export function Columns({ data, colorOf, unit, height = 150 }: { data: Bar[]; colorOf?: (b: Bar) => string; unit?: string; height?: number }) {
  const nav = useNavigate();
  const tip = useTip();
  const max = Math.max(1, ...data.map(d => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  if (data.every(d => d.value === 0)) return <div className="viz-empty">No records entered.</div>;
  return (
    <div className="viz-wrap" ref={tip.ref}>
      <div className="colchart" style={{ height }}>
        <div className="cols-grid" aria-hidden="true">{ticks.slice().reverse().map(t => <div key={t}><span>{t}</span></div>)}</div>
        <div className="cols-plot">
          {data.map(d => {
            const go = () => d.link && nav(d.link);
            return (
              <div key={d.key} className="col"
                role={d.link ? 'link' : undefined} tabIndex={d.link ? 0 : undefined} aria-label={`${d.label}: ${d.value}${unit ? ' ' + unit : ''}`}
                onClick={go} onKeyDown={e => { if (e.key === 'Enter') go(); }}
                onMouseMove={e => tip.show(e, <><b>{d.label}</b><div>{d.value}{unit ? ` ${unit}` : ''}</div>{d.link && <div className="muted">Click to open the list</div>}</>)}
                onMouseLeave={tip.hide} style={{ cursor: d.link ? 'pointer' : 'default' }}>
                <span className="col-value">{d.value}</span>
                <span className="col-bar" style={{ height: `${(d.value / top) * 100}%`, background: colorOf ? colorOf(d) : SERIES.blue }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="cols-axis">{data.map(d => <span key={d.key}>{d.label}</span>)}</div>
      {tip.node}
    </div>
  );
}

function niceTicks(max: number): number[] {
  const step = max <= 5 ? 1 : max <= 10 ? 2 : Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
  const out: number[] = [];
  for (let v = 0; v <= max + step - 1e-9; v += step) out.push(Math.round(v));
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

// ---------- two-series line (opened vs closed) ----------
export type Point = { label: string; a: number; b: number };

export function TrendLines({ data, aLabel, bLabel, height = 170 }: { data: Point[]; aLabel: string; bLabel: string; height?: number }) {
  const tip = useTip();
  const [hover, setHover] = useState<number | null>(null);
  const W = 520, H = height, padL = 28, padR = 64, padT = 10, padB = 22;
  const max = Math.max(1, ...data.flatMap(d => [d.a, d.b]));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, data.length - 1);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const path = (k: 'a' | 'b') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[k])}`).join('');
  const last = data.length - 1;
  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(last, Math.round(((rel - padL) / (W - padL - padR)) * last)));
    setHover(i);
    const d = data[i];
    tip.show(e, <><b>Week of {d.label}</b><div><span className="key" style={{ background: SERIES.blue }} />{aLabel}: {d.a}</div><div><span className="key" style={{ background: SERIES.orange }} />{bLabel}: {d.b}</div></>);
  };
  return (
    <div className="viz-wrap" ref={tip.ref}>
      <div className="legend" aria-hidden="true">
        <span><span className="key" style={{ background: SERIES.blue }} />{aLabel}</span>
        <span><span className="key" style={{ background: SERIES.orange }} />{bLabel}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${aLabel} and ${bLabel} per week`}>
        {ticks.map(t => <g key={t}><line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid" /><text x={padL - 6} y={y(t) + 3} className="tick" textAnchor="end">{t}</text></g>)}
        {data.map((d, i) => (i % 2 === last % 2) && <text key={i} x={x(i)} y={H - 6} className="tick" textAnchor="middle">{d.label}</text>)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} className="crosshair" />}
        <path d={path('a')} fill="none" stroke={SERIES.blue} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={path('b')} fill="none" stroke={SERIES.orange} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {(['a', 'b'] as const).map(k => {
          const pts = hover !== null ? [hover] : [last];
          return pts.map(i => <circle key={k + i} cx={x(i)} cy={y(data[i][k])} r={4} fill={k === 'a' ? SERIES.blue : SERIES.orange} stroke="#fff" strokeWidth={2} />);
        })}
        {data.length > 0 && (Math.abs(y(data[last].a) - y(data[last].b)) < 12
          // Converging ends: one combined label instead of two stacked ones.
          ? <text x={W - padR + 8} y={y(data[last].a) + 3} className="end-label">{data[last].a === data[last].b ? `Both ${data[last].a}` : `${data[last].a} / ${data[last].b}`}</text>
          : <>
            <text x={W - padR + 8} y={y(data[last].a) + 3} className="end-label">{aLabel} {data[last].a}</text>
            <text x={W - padR + 8} y={y(data[last].b) + 3} className="end-label">{bLabel} {data[last].b}</text>
          </>)}
        <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} fill="transparent" onMouseMove={onMove} onMouseLeave={() => { setHover(null); tip.hide(); }} />
      </svg>
      {tip.node}
    </div>
  );
}

// ---------- panel with a table view ----------
export function VizPanel({ title, sub, table, children, actions }: { title: string; sub?: ReactNode; table: { columns: string[]; rows: (string | number)[][] }; children: ReactNode; actions?: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="panel viz-panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <div className="actions">{actions}<button className="linkbtn" aria-pressed={asTable} title={asTable ? 'Show the chart' : 'Show the data as a table'} onClick={() => setAsTable(v => !v)}>Table view</button></div>
      </div>
      <div className="panel-body">
        {sub && <p className="hint" style={{ marginBottom: 8 }}>{sub}</p>}
        {asTable ? (
          <DataTable<{ id: number; values: (string | number)[] }> caption={title} rows={table.rows.map((values, id) => ({ id, values }))} rowKey={r => r.id} tools={false}
            columns={table.columns.map((header, index) => ({ key: `c${index}`, header, className: table.rows.some(r => typeof r[index] === 'number') ? 'num' : undefined, render: r => r.values[index] }))} />
        ) : children}
      </div>
    </section>
  );
}

// ---------- country map ----------
export type CountryDatum = { country: string; clients: number; environments: number; openCases: number; overdueCases: number; openCommitments: number; overdueCommitments: number; clientCodes: string[] };

// Free-text country values → Natural Earth names.
const ALIASES: Record<string, string> = {
  'uae': 'United Arab Emirates', 'u.a.e.': 'United Arab Emirates', 'emirates': 'United Arab Emirates', 'ksa': 'Saudi Arabia', 'kingdom of saudi arabia': 'Saudi Arabia',
  'usa': 'United States of America', 'united states': 'United States of America', 'us': 'United States of America', 'uk': 'United Kingdom', 'great britain': 'United Kingdom',
  'czech republic': 'Czechia', 'turkey': 'Turkey', 'türkiye': 'Turkey', 'ivory coast': "Côte d'Ivoire", 'drc': 'Dem. Rep. Congo', 'south korea': 'South Korea', 'korea': 'South Korea',
  // Server country list (Common/Countries.cs) → Natural Earth short names.
  'antigua and barbuda': 'Antigua and Barb.', 'bosnia and herzegovina': 'Bosnia and Herz.', 'central african republic': 'Central African Rep.',
  'democratic republic of the congo': 'Dem. Rep. Congo', 'dominican republic': 'Dominican Rep.', 'equatorial guinea': 'Eq. Guinea', 'eswatini': 'eSwatini',
  'marshall islands': 'Marshall Is.', 'north macedonia': 'Macedonia', 'saint kitts and nevis': 'St. Kitts and Nevis', 'saint vincent and the grenadines': 'St. Vin. and Gren.',
  'são tomé and príncipe': 'São Tomé and Principe', 'solomon islands': 'Solomon Is.', 'south sudan': 'S. Sudan', 'vatican city': 'Vatican', 'western sahara': 'W. Sahara'
};
export const normalizeCountry = (c: string) => ALIASES[c.trim().toLowerCase()] ?? c.trim();

// ---------- executive KPI tile ----------
// A headline number with an optional meter (part of a whole, same blue track) and a context line.
// The whole tile is a link to the list whose total equals the number.
export function Kpi({ value, label, context, part, of, partLabel, tone, valueTone, to, hero, icon }: {
  value: number | string; label: string; context?: ReactNode; part?: number; of?: number; partLabel?: string; tone?: 'critical' | 'warning'; valueTone?: 'critical' | 'warning'; to?: string; hero?: boolean; icon?: ReactNode;
}) {
  const nav = useNavigate();
  const pct = part !== undefined && of ? Math.min(100, (part / of) * 100) : null;
  const fill = tone === 'critical' ? STATUS.critical : tone === 'warning' ? STATUS.warning : SERIES.blue;
  return (
    <div className={`kpi${hero ? ' hero' : ''}${to ? ' link' : ''}${valueTone ? ` value-${valueTone}` : ''}`} role={to ? 'link' : undefined} tabIndex={to ? 0 : undefined}
      onClick={() => to && nav(to)} onKeyDown={e => { if (to && e.key === 'Enter') nav(to); }}
      aria-label={`${label}: ${value}${partLabel ? `. ${partLabel}` : ''}${to ? '. Open list' : ''}`}>
      <span className="kpi-l">{icon && <span className={`kpi-ic${tone ? ` ${tone}` : ''}`} aria-hidden="true">{icon}</span>}{tone && <span className={`kpi-flag ${tone}`} aria-hidden="true">{tone === 'critical' ? '▲' : '●'}</span>}</span>
      {/* VtWebGuiFramework ValueField: label as title, the number in the XL value size, signal colour for critical/warning values. */}
      <span className="kpi-v">
        <ValueField title={label} value={value} valueSize={hero ? Enums.ValueSize.XXL : Enums.ValueSize.XL}
          darkTheme={!!hero} valueColor={valueTone === 'critical' ? Enums.ValueColor.SIGNAL_ERROR : valueTone === 'warning' ? Enums.ValueColor.SIGNAL_WARNING : Enums.ValueColor.NONE} noWrap />
      </span>
      {pct !== null && (
        <span className="kpi-meter" aria-hidden="true"><span style={{ width: part ? `max(${pct}%, 3px)` : 0, background: fill }} /></span>
      )}
      {partLabel && <span className="kpi-p">{partLabel}</span>}
      {context && <span className="kpi-c">{context}</span>}
    </div>
  );
}

// ---------- part-to-whole bar (≤ 6 segments, labelled legend below) ----------
export function PartBar({ data, colorOf, unit }: { data: (Bar & { glyph?: string })[]; colorOf: (b: Bar) => string; unit?: string }) {
  const nav = useNavigate();
  const tip = useTip();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="viz-empty">No records entered.</div>;
  return (
    <div className="viz-wrap" ref={tip.ref}>
      <div className="partbar">
        {data.filter(d => d.value > 0).map(d => {
          const go = () => d.link && nav(d.link);
          return (
            <span key={d.key} style={{ flexGrow: d.value, background: colorOf(d), cursor: d.link ? 'pointer' : 'default' }}
              role={d.link ? 'link' : 'img'} tabIndex={d.link ? 0 : undefined} aria-label={`${d.label}: ${d.value} of ${total}${unit ? ' ' + unit : ''}`}
              onClick={go} onKeyDown={e => { if (e.key === 'Enter') go(); }}
              onMouseMove={e => tip.show(e, <><b>{d.label}</b><div>{d.value} of {total} ({Math.round((d.value / total) * 100)} %)</div>{d.link && <div className="muted">Click to open the list</div>}</>)}
              onMouseLeave={tip.hide} />
          );
        })}
      </div>
      <ul className="partbar-legend">
        {data.map(d => (
          <li key={d.key}><span className="key sq" style={{ background: colorOf(d) }} />{d.glyph && <span aria-hidden="true">{d.glyph} </span>}{d.label} <b>{d.value}</b> <span className="muted">{Math.round((d.value / total) * 100)} %</span></li>
        ))}
      </ul>
      {tip.node}
    </div>
  );
}

// ---------- A39: categorical slots (fixed order, never cycled) ----------
export const CAT = ['#007db3', '#e6932b', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

// ---------- A39: donut (part-to-whole, at most ~6 slices) ----------
export function Donut({ data, colorOf, unit, centerLabel, size = 148 }: {
  data: (Bar & { glyph?: string })[]; colorOf: (b: Bar, i: number) => string; unit?: string; centerLabel?: string; size?: number;
}) {
  const nav = useNavigate();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="viz-empty">No records entered.</div>;
  const r = size / 2, ring = 20, rin = r - ring, gap = data.filter(d => d.value > 0).length > 1 ? 0.012 : 0;
  let a0 = -Math.PI / 2;
  const arc = (from: number, to: number) => {
    const p = (a: number, rad: number) => `${r + rad * Math.cos(a)} ${r + rad * Math.sin(a)}`;
    const large = to - from > Math.PI ? 1 : 0;
    return `M${p(from, r)}A${r} ${r} 0 ${large} 1 ${p(to, r)}L${p(to, rin)}A${rin} ${rin} 0 ${large} 0 ${p(from, rin)}Z`;
  };
  const segs = data.map((d, i) => {
    const sweep = (d.value / total) * Math.PI * 2;
    const from = a0 + gap, to = a0 + sweep - gap;
    a0 += sweep;
    return { d, i, path: d.value > 0 ? (sweep >= Math.PI * 2 - 1e-6 ? null : arc(from, Math.max(from + 0.001, to))) : undefined };
  });
  const hv = data.find(d => d.key === hover);
  return (
    <div className="viz-wrap donut-wrap" ref={tip.ref}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut" role="img" aria-label={`${centerLabel ?? 'Total'} ${total}: ${data.map(d => `${d.label} ${d.value}`).join(', ')}`}>
        {segs.map(({ d, i, path }) => path === undefined ? null : path === null
          ? <circle key={d.key} cx={r} cy={r} r={r - ring / 2} fill="none" stroke={colorOf(d, i)} strokeWidth={ring} />
          : <path key={d.key} d={path} fill={colorOf(d, i)} opacity={hover && hover !== d.key ? 0.45 : 1} style={{ cursor: d.link ? 'pointer' : 'default' }}
              onClick={() => d.link && nav(d.link)}
              onMouseMove={e => { setHover(d.key); tip.show(e, <><b>{d.label}</b><div>{d.value} of {total} ({Math.round((d.value / total) * 100)} %)</div>{d.link && <div className="muted">Click to open the list</div>}</>); }}
              onMouseLeave={() => { setHover(null); tip.hide(); }} />)}
        <text x={r} y={r - 2} textAnchor="middle" className="donut-v">{hv ? hv.value : total}</text>
        <text x={r} y={r + 15} textAnchor="middle" className="donut-l">{hv ? hv.label : centerLabel ?? unit ?? 'total'}</text>
      </svg>
      <ul className="partbar-legend donut-legend">
        {data.map((d, i) => (
          <li key={d.key} onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)}>
            <span className="key sq" style={{ background: colorOf(d, i) }} />{d.glyph && <span aria-hidden="true">{d.glyph} </span>}
            {d.link ? <a href={d.link} onClick={e => { e.preventDefault(); nav(d.link!); }}>{d.label}</a> : d.label} <b>{d.value}</b> <span className="muted">{Math.round((d.value / total) * 100)} %</span>
          </li>
        ))}
      </ul>
      {tip.node}
    </div>
  );
}

/** Minutes as "45 min", "4 h", "1 d 6 h". */
export function fmtMinutes(m?: number | null): string {
  if (m === null || m === undefined) return '—';
  if (m < 60) return `${m} min`;
  if (m < 1440) return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`;
  const d = Math.floor(m / 1440), h = Math.round((m % 1440) / 60);
  return h ? `${d} d ${h} h` : `${d} d`;
}

// ---------- A39: SLA targets per priority (each measure on its own scale, never a dual axis) ----------
export type SlaRow = { priority: string; contracts: number; responseMedian?: number | null; responseFastest?: number | null; resolutionMedian?: number | null; resolutionFastest?: number | null };
export function SlaMatrix({ rows, activeContracts }: { rows: SlaRow[]; activeContracts: number }) {
  const maxR = Math.max(1, ...rows.map(r => r.responseMedian ?? 0)), maxS = Math.max(1, ...rows.map(r => r.resolutionMedian ?? 0));
  if (rows.every(r => r.contracts === 0)) return <div className="viz-empty">No SLA targets recorded on active contracts.</div>;
  const cell = (v: number | null | undefined, fast: number | null | undefined, max: number, color: string) => <>
    <div className="sla-cell">
      <span className="sla-track"><span style={{ width: v ? `max(${(v / max) * 100}%, 3px)` : 0, background: color }} /></span>
      <span className="sla-v">{fmtMinutes(v)}</span>
    </div>
    {fast !== null && fast !== undefined && fast !== v && <div className="hint">fastest {fmtMinutes(fast)}</div>}
  </>;
  return <DataTable<SlaRow> caption="SLA targets per priority" rows={rows} rowKey={r => r.priority} tableClassName="sla-matrix" columns={[
    { key: 'priority', header: 'Priority', render: r => <b>{r.priority}</b> },
    { key: 'contracts', header: 'Contracts with a target', className: 'num', render: r => <>{r.contracts} <span className="muted">of {activeContracts}</span></> },
    { key: 'response', header: 'Response (median)', render: r => cell(r.responseMedian, r.responseFastest, maxR, RAMP[2]) },
    { key: 'resolution', header: 'Resolution (median)', render: r => cell(r.resolutionMedian, r.resolutionFastest, maxS, CAT[1]) }
  ]} />;
}
