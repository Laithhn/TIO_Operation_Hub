import { keepPreviousData, useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { ApiError, del, get, post, put, qs, type Paged } from '../api';
import { fmtDateTime, label } from '../format';
import { useEnumLabel, useMe, useTypes, useUrlState } from '../hooks';
import { Icon } from '../ui/Icon';
import { TimeZoneSelect } from '../ui/pickers';
import { Badge, DataTable, Dialog, PageHead, Pager, Panel, Restricted, SelectInput, StateMessage, StatusBadge, TextInput, useToast, type Option } from '../ui/kit';
import { useClientOptions, useProductOptions, useTeamOptions } from './common';
import { BuilderScheduleDialog, CasesBuilder } from './reporting/CasesBuilder';
import { MyReports, Templates } from './reporting/MyReports';
import { ReportingOverview } from './reporting/Overview';
import { apiError, download, scheduleWhen, size, STATUS_TONE, useAssignable, useReportZone, WEEKDAYS, type ExportJob, type Schedule } from './reporting/shared';

/* ---------------------------------------------------------------------------------------------------------------------------
 * A62 (owner request, 22 Oct 2026): the Reporting Center. Everything the page shows comes from the server's report registry
 * (`/reports/catalog`): filters, columns and formats are not repeated here, so a report registered on the server appears here.
 * A70 (28 Oct 2026): a first-level header section with its own areas (overview, library, Cases Report Builder, saved reports,
 * schedules, export history, templates) as sub-routes of /reporting-center.
 * ------------------------------------------------------------------------------------------------------------------------- */

type FilterDef = { key: string; label: string; kind: 'Client' | 'Team' | 'Product' | 'Owner' | 'Date' | 'Select' | 'Bool' | 'Text'; advanced: boolean; options?: string[] | null; hint?: string | null; rangeEnd?: string | null };
type ColumnDef = { key: string; header: string; definition: string };
type FormatDef = { key: string; label: string; available: boolean; note?: string | null };
type ReportDef = { key: string; name: string; category: string; description: string; icon: string; operational: boolean; formats: FormatDef[]; filters: FilterDef[]; columns: ColumnDef[]; builder?: boolean };
type Metric = { label: string; value: string; definition: string; tone?: 'bad' | 'warn' | null };
type Breakdown = { title: string; columns: string[]; rows: (string | number | boolean | null)[][] };
type Preview = { report: { key: string; name: string }; filters: string; generatedAt: string; timeZone: string; total: number; page: number; pageSize: number; columns: ColumnDef[];
  rows: (string | number | boolean | null)[][]; summary?: Metric[] | null; breakdowns?: Breakdown[] | null; limit: number };
type Values = Record<string, string>;

const CATEGORY_ORDER = ['Operations', 'Technical', 'Governance', 'Operational intelligence'];
const CATEGORY_HINT: Record<string, string> = {
  Operations: 'Day-to-day work: cases, commitments and what needs attention.',
  Technical: 'Environments, installed versions and infrastructure.',
  Governance: 'Data quality and contracts.',
  'Operational intelligence': 'KPIs computed on the server: SLA, delivery, backlog, workload and client health.'
};
const reversedCalendarDays = (from?: string, to?: string) => !!from && !!to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from > to;
const typeListForFilter = (report: string, key: string) => key === 'environmentType' && report === 'versions' ? 'EnvironmentType' : key === 'type' ? ({ environments: 'EnvironmentType', assets: 'AssetType' } as Record<string, string>)[report] : undefined;
function optionText(report: string, key: string, value: string, caseName: (code: string) => string, conditionName: (code: string) => string) {
  if (value === 'all') return 'All';
  if (value === 'open') return 'Open';
  if (value === 'done') return report === 'commitments' ? 'Completed or cancelled' : `${caseName('Closed')} or ${caseName('Cancelled')}`;
  if (report === 'cases' && key === 'status') return caseName(value);
  if (report === 'environments' && key === 'condition') return conditionName(value);
  return label(value);
}

const filterErrors = (e: unknown): Record<string, string> => {
  const a = apiError(e);
  if (!a) return {};
  return Object.fromEntries(Object.entries(a.errors).map(([k, v]) => [k.replace(/^filters\./i, ''), v[0]]));
};

/* ------------------------------------------------------------- filters ------------------------------------------------------------- */

/** The filters of one report, generated from its definition. Advanced ones sit in a collapsible section. */
function FilterFields({ def, values, onChange, errors }: { def: ReportDef; values: Values; onChange: (k: string, v: string) => void; errors: Record<string, string> }) {
  const T = useTypes();
  const caseStatusLabel = useEnumLabel('CaseStatus');
  const conditionLabel = useEnumLabel('Condition');
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const users = useAssignable();
  const me = useMe().data!;
  const userOptions: Option[] = [{ value: String(me.id), label: 'Me' }, ...(users.data ?? []).filter(u => u.id !== me.id).map(u => ({ value: String(u.id), label: u.name }))];
  // A range end before its start is shown at once; the server checks it again.
  const local: Record<string, string> = {};
  for (const f of def.filters) if (f.rangeEnd && reversedCalendarDays(values[f.key], values[f.rangeEnd])) local[f.rangeEnd] = 'The end date is before the start date.';
  const field = (f: FilterDef) => {
    const err = local[f.key] ?? errors[f.key];
    const v = values[f.key] ?? '';
    const set = (x: string) => onChange(f.key, x);
    const typeList = typeListForFilter(def.key, f.key);
    if (typeList) return <SelectInput key={f.key} label={f.label} value={v} onChange={set} options={T.filterOptions(typeList)} empty="All types" error={err} />;
    if (def.key === 'cases' && f.key === 'waiting') return <SelectInput key={f.key} label="Waiting" value={v} onChange={set} options={[{ value: 'true', label: 'Waiting only' }, { value: 'false', label: 'Not waiting' }]} empty="All" error={err} />;
    switch (f.kind) {
      case 'Client': return <SelectInput key={f.key} label={f.label} value={v} onChange={set} options={clients} empty="All authorized" error={err} hint={f.hint ?? undefined} />;
      case 'Team': return <SelectInput key={f.key} label={f.label} value={v} onChange={set} options={teams} empty="All teams" error={err} />;
      case 'Product': return <SelectInput key={f.key} label={f.label} value={v} onChange={set} options={products} empty="All products" error={err} />;
      case 'Owner': return <SelectInput key={f.key} label={f.label} value={v} onChange={set} options={userOptions} empty="Anyone" error={err} />;
      case 'Date': return <TextInput key={f.key} label={f.label} type="date" value={v} onChange={set} error={err} hint={f.hint ?? undefined} />;
      case 'Select': return <SelectInput key={f.key} label={f.label} value={v} onChange={set} options={(f.options ?? []).map(o => ({ value: o, label: optionText(def.key, f.key, o, caseStatusLabel, conditionLabel) }))} empty="Any" error={err} hint={f.hint ?? undefined} />;
      case 'Bool': return <div className="field" key={f.key}><span className="flabel">&nbsp;</span><label className="check"><input type="checkbox" checked={v === 'true'} onChange={e => set(e.target.checked ? 'true' : '')} /> {f.label}</label>{err && <div className="err">{err}</div>}</div>;
      default: return <TextInput key={f.key} label={f.label} value={v} onChange={set} error={err} hint={f.hint ?? undefined} maxLength={200} />;
    }
  };
  const basic = def.filters.filter(f => !f.advanced);
  const advanced = def.filters.filter(f => f.advanced);
  const advancedSet = advanced.filter(f => values[f.key]).length;
  return (
    <>
      <div className="form-grid rc-filters">{basic.map(field)}</div>
      {advanced.length > 0 && (
        <details className="rc-advanced" open={advancedSet > 0 || undefined}>
          <summary>Advanced filters{advancedSet > 0 && ` (${advancedSet} set)`}</summary>
          <div className="form-grid rc-filters">{advanced.map(field)}</div>
        </details>
      )}
    </>
  );
}

/** Chips for the filters in force, each removable. */
function FilterChips({ def, values, onRemove }: { def: ReportDef; values: Values; onRemove: (k: string) => void }) {
  const T = useTypes();
  const caseStatusLabel = useEnumLabel('CaseStatus');
  const conditionLabel = useEnumLabel('Condition');
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const users = useAssignable();
  const me = useMe().data!;
  const active = def.filters.filter(f => values[f.key]);
  if (active.length === 0) return <span className="hint">No filters: all rows you are authorized to see.</span>;
  const text = (f: FilterDef) => {
    const v = values[f.key];
    const from = (o: Option[]) => o.find(x => x.value === v)?.label ?? v;
    const typeList = typeListForFilter(def.key, f.key);
    if (typeList) return T.name(typeList, v);
    if (def.key === 'environments' && f.key === 'condition') return conditionLabel(v);
    switch (f.kind) {
      case 'Client': return from(clients);
      case 'Team': return from(teams);
      case 'Product': return from(products);
      case 'Owner': return v === String(me.id) ? 'Me' : (users.data ?? []).find(u => String(u.id) === v)?.name ?? `#${v}`;
      case 'Bool': return v === 'false' ? 'no' : 'yes';
      case 'Select': return optionText(def.key, f.key, v, caseStatusLabel, conditionLabel);
      default: return v;
    }
  };
  return (
    <div className="rc-chips" aria-label="Filters in force">
      {active.map(f => <span key={f.key} className="chip rc-chip">{f.label}: <b>{text(f)}</b><button type="button" aria-label={`Remove filter ${f.label}`} onClick={() => onRemove(f.key)}>×</button></span>)}
    </div>
  );
}

/* ------------------------------------------------------------- catalog ------------------------------------------------------------- */

function Catalog({ reports, onOpen, search, setSearch, category, setCategory, searchRef }: {
  reports: ReportDef[]; onOpen: (key: string) => void; search: string; setSearch: (s: string) => void; category: string; setCategory: (c: string) => void; searchRef: React.RefObject<HTMLInputElement>;
}) {
  const term = search.trim().toLowerCase();
  const shown = reports.filter(r => (!category || r.category === category) && (!term || `${r.name} ${r.description} ${r.category}`.toLowerCase().includes(term)));
  const cats = CATEGORY_ORDER.filter(c => reports.some(r => r.category === c));
  return (
    <>
      <div className="rc-catalog-bar">
        <label className="rc-search"><Icon name="search" size={16} /><span className="sr">Search reports</span>
          <input ref={searchRef} className="input" type="search" placeholder="Search reports" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="seg" role="group" aria-label="Category">
          <button aria-pressed={!category} onClick={() => setCategory('')}>All <span className="muted">{reports.length}</span></button>
          {cats.map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c} <span className="muted">{reports.filter(r => r.category === c).length}</span></button>)}
        </div>
      </div>
      {shown.length === 0 && <StateMessage kind="nomatch">No report matches “{search}”.</StateMessage>}
      {cats.filter(c => shown.some(r => r.category === c)).map(c => (
        <section key={c} className="rc-group" aria-labelledby={`rc-cat-${c}`}>
          <div className="rc-group-head"><h2 id={`rc-cat-${c}`}>{c}</h2><span className="hint">{CATEGORY_HINT[c]}</span></div>
          <div className="rc-cards">
            {shown.filter(r => r.category === c).map(r => (
              <article key={r.key} className={`rc-card${r.builder ? ' rc-card-builder' : ''}`}>
                <div className="rc-card-head"><span className="rc-ic" aria-hidden="true"><Icon name={r.icon} size={18} /></span><h3>{r.name}</h3></div>
                <p>{r.description}</p>
                <div className="rc-card-foot">
                  <span className="rc-formats">{r.formats.filter(f => f.available).map(f => <span key={f.key} className="chip">{f.label}</span>)}{r.builder && <span className="chip">PDF (builder)</span>}</span>
                  <span className="rc-card-actions">
                    <button className={r.builder ? 'btn' : 'btn btn-primary'} onClick={() => onOpen(r.key)} aria-label={`Configure ${r.name}`}>Configure</button>
                    {r.builder && <Link className="btn btn-primary" to="/reporting-center/builder/cases" aria-label={`Build report: ${r.name}`}>Build report</Link>}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/* --------------------------------------------------------- configure → export -------------------------------------------------------- */

function ReportWorkspace({ def, onBack, onHistory, initial }: { def: ReportDef; onBack: () => void; onHistory: (id: number) => void; initial?: Values }) {
  const T = useTypes();
  const caseStatusLabel = useEnumLabel('CaseStatus');
  const conditionLabel = useEnumLabel('Condition');
  const toast = useToast();
  const qc = useQueryClient();
  const [zone, setZone] = useReportZone();
  const [draft, setDraft] = useState<Values>(initial ?? {});
  const [applied, setApplied] = useState<Values | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [format, setFormat] = useState('csv');
  const [cols, setCols] = useState<string[]>(def.columns.map(c => c.key));
  const [job, setJob] = useState<ExportJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const presets = useQuery({ queryKey: ['report-presets', def.key], queryFn: () => get<{ id: number; name: string; filters: Values }[]>(`/reports/presets?report=${def.key}`) });

  useEffect(() => { setDraft(initial ?? {}); setApplied(null); setJob(null); setCols(def.columns.map(c => c.key)); setFormat('csv'); }, [def.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const clean = (v: Values) => Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x !== undefined));
  const invalidRange = def.filters.some(f => f.rangeEnd && reversedCalendarDays(draft[f.key], draft[f.rangeEnd]));
  const preview = useQuery({
    queryKey: ['report-preview', def.key, applied, page, pageSize, zone],
    queryFn: () => post<Preview>(`/reports/${def.key}/preview`, { filters: applied, page, pageSize, timeZone: zone }),
    enabled: applied !== null, placeholderData: keepPreviousData, retry: false
  });
  const errors = filterErrors(preview.error);
  const dirty = applied !== null && JSON.stringify(clean(draft)) !== JSON.stringify(applied);
  const apply = () => {
    if (invalidRange) return;
    if (applied !== null && !dirty && page === 1) void preview.refetch();
    else { setApplied(clean(draft)); setPage(1); }
    setJob(null);
  };
  const reset = () => { setDraft({}); setApplied(null); setJob(null); };
  const activeCount = Object.values(clean(draft)).length;

  const generate = async () => {
    if (!applied) return;
    setBusy(true); setExportError(null); setJob(null);
    try {
      const j = await post<ExportJob>(`/reports/${def.key}/exports`, { filters: applied, format, columns: cols.length === def.columns.length && cols.every((c, i) => c === def.columns[i].key) ? [] : cols, timeZone: zone });
      setJob(j);
      if (j.status === 'Completed') toast(`${def.name} generated: ${j.rowCount} row(s).`);
      else toast(j.error ?? 'The export failed.', true);
      qc.invalidateQueries({ queryKey: ['report-history'] });
      qc.invalidateQueries({ queryKey: ['report-summary'] });
    } catch (e) {
      setExportError(apiError(e)?.summary ?? 'The export could not be started.');
    } finally { setBusy(false); }
  };
  const retry = async () => {
    if (!job) return;
    setBusy(true);
    try { const j = await post<ExportJob>(`/reports/exports/${job.id}/retry`); setJob(j); qc.invalidateQueries({ queryKey: ['report-history'] }); }
    catch (e) { setExportError(apiError(e)?.summary ?? 'The export could not be retried.'); }
    finally { setBusy(false); }
  };
  const savePreset = async () => {
    try {
      await post('/reports/presets', { report: def.key, name: presetName, filters: clean(draft) });
      setPresetName('');
      toast('Filter preset saved.');
      presets.refetch();
    } catch (e) { toast(apiError(e)?.summary ?? 'The preset could not be saved.', true); }
  };
  const move = (i: number, d: -1 | 1) => setCols(c => { const n = [...c]; const j = i + d; if (j < 0 || j >= n.length) return c; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const toggle = (k: string, on: boolean) => setCols(c => on ? [...c, k] : c.filter(x => x !== k));
  const step = job ? 4 : applied ? 3 : 1;
  const p = preview.data;
  const displayCell = (key: string, value: unknown) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    const text = String(value);
    if (key === 'status' && ['cases', 'case-aging'].includes(def.key)) return caseStatusLabel(text);
    if (def.key === 'environments' && key === 'reported-condition') return conditionLabel(text);
    const typeList: Record<string, string> = { cases: 'CaseType', environments: 'EnvironmentType', assets: 'AssetType', contracts: 'ContractType' };
    if (key === 'type' && typeList[def.key]) return T.name(typeList[def.key], text);
    return text;
  };

  return (
    <>
      <div className="rc-ws-head">
        <button className="linkbtn" onClick={onBack}>← All reports</button>
        <div className="rc-ws-title"><span className="rc-ic" aria-hidden="true"><Icon name={def.icon} size={20} /></span>
          <div><h2>{def.name}</h2><p className="hint">{def.category} · {def.description}</p></div></div>
        <ol className="rc-steps" aria-label="Export steps">
          {['Configure', 'Preview', 'Export options', 'Generate & download'].map((s, i) => <li key={s} aria-current={step === i + 1 ? 'step' : undefined} className={step > i + 1 ? 'done' : ''}><span>{i + 1}</span>{s}</li>)}
        </ol>
      </div>

      <Panel title="1 · Configure" actions={<>
        {(presets.data?.length ?? 0) > 0 && <select className="input" aria-label="Load a saved filter preset" value="" onChange={e => { const pr = presets.data!.find(x => String(x.id) === e.target.value); if (pr) { setDraft(pr.filters); toast(`Preset “${pr.name}” loaded.`); } }}>
          <option value="">Load preset…</option>{presets.data!.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
      </>}>
        <FilterFields def={def} values={draft} onChange={(k, v) => setDraft(d => ({ ...d, [k]: v }))} errors={errors} />
        <div className="form-grid rc-filters"><TimeZoneSelect label="Time zone for dates and times" value={zone} onChange={setZone} hint="Dates in the filters are calendar days in this zone." /></div>
        <div className="rc-apply">
          <FilterChips def={def} values={clean(draft)} onRemove={k => setDraft(d => ({ ...d, [k]: '' }))} />
          <div className="rc-apply-actions">
            <button className="btn" onClick={reset} disabled={activeCount === 0 && applied === null}>Reset filters</button>
            <button className="btn btn-primary" onClick={apply} disabled={invalidRange}>{applied === null ? 'Apply filters and preview' : dirty ? 'Apply changes' : 'Refresh preview'}</button>
          </div>
        </div>
        <details className="rc-preset">
          <summary>Save these filters as a preset</summary>
          <div className="rc-preset-row">
            <TextInput label="Preset name" value={presetName} onChange={setPresetName} maxLength={80} />
            <button className="btn" disabled={!presetName.trim()} onClick={savePreset}>Save preset</button>
            {(presets.data?.length ?? 0) > 0 && <span className="hint">Your presets: {presets.data!.map(x => <span key={x.id} className="chip">{x.name} <button type="button" className="linkbtn" aria-label={`Delete preset ${x.name}`}
              onClick={async () => { await del(`/reports/presets/${x.id}`); presets.refetch(); }}>×</button></span>)}</span>}
          </div>
        </details>
      </Panel>

      {applied !== null && (
        <Panel title="2 · Preview" actions={p && <span className="hint">{p.total.toLocaleString()} matching row(s) · data as of {fmtDateTime(p.generatedAt, p.timeZone)} ({p.timeZone})</span>}>
          {dirty && <div className="notice warn">The filters changed since this preview. Apply them to refresh it before exporting.</div>}
          {preview.isLoading && <StateMessage kind="loading" />}
          {preview.error && !Object.keys(errors).length && <StateMessage kind={apiError(preview.error)?.status === 403 ? 'restricted' : 'error'}>{apiError(preview.error)?.summary ?? 'The preview could not be loaded.'}</StateMessage>}
          {Object.keys(errors).length > 0 && <div className="notice error" role="alert">Check the filters marked above.</div>}
          {p && <>
            <p className="hint rc-filters-line"><b>{p.report.name}</b> · Filters: {p.filters || 'none'}</p>
            {p.summary && p.summary.length > 0 && (
              <div className="rc-metrics" aria-label="Report summary">
                {p.summary.map(m => <div key={m.label} className={`rc-metric${m.tone ? ` ${m.tone}` : ''}`} title={m.definition}><b>{m.value}</b><span>{m.label}</span><small>{m.definition}</small></div>)}
              </div>
            )}
            {p.breakdowns && p.breakdowns.length > 0 && (
              <div className="rc-breakdowns">
                {p.breakdowns.map(b => (
                  <div key={b.title} className="rc-breakdown"><h3>{b.title}</h3>
                    {b.rows.length === 0 ? <p className="hint">No rows.</p> : <DataTable<{ id: number; values: (string | number | boolean | null)[] }> caption={b.title} rows={b.rows.slice(0, 12).map((values, id) => ({ id, values }))} rowKey={r => r.id} tools={false}
                      columns={b.columns.map((header, index) => ({ key: `c${index}`, header, className: b.rows.some(r => typeof r[index] === 'number') ? 'num' : undefined, render: r => r.values[index] === null ? '—' : String(r.values[index]) }))} />}
                    {b.rows.length > 12 && <p className="hint">{b.rows.length - 12} more in the export.</p>}
                  </div>
                ))}
              </div>
            )}
            {p.total === 0 ? <StateMessage kind="nomatch">No rows match these filters.</StateMessage> : (
              <DataTable<{ id: number; values: (string | number | boolean | null)[] }> caption={`Preview of ${p.report.name}`} rows={p.rows.map((values, id) => ({ id, values }))} rowKey={r => r.id} tools={false} tableWrapClassName="rc-preview"
                columns={p.columns.map((column, index) => ({ key: column.key, header: <span title={column.definition}>{column.header}</span>, className: p.rows.some(r => typeof r[index] === 'number') ? 'num' : undefined,
                  render: r => displayCell(column.key, r.values[index]) }))} />
            )}
            {p.total > 0 && <Pager page={p.page} pageSize={p.pageSize} total={p.total} onPage={setPage} onSize={s => { setPageSize(Math.min(100, s)); setPage(1); }} />}
            {p.total > p.limit && <div className="notice warn">{p.total.toLocaleString()} rows match; one export holds at most {p.limit.toLocaleString()}. Narrow the filters before exporting.</div>}
          </>}
        </Panel>
      )}

      {applied !== null && p && (
        <Panel title="3 · Export options">
          <fieldset className="rc-formats-pick">
            <legend className="flabel">Format</legend>
            {def.formats.map(f => (
              <label key={f.key} className={`rc-format${f.available ? '' : ' disabled'}`} title={f.note ?? undefined}>
                <input type="radio" name="rc-format" value={f.key} checked={format === f.key} disabled={!f.available} onChange={() => setFormat(f.key)} />
                <span>{f.label}</span>{!f.available && <small>{f.note ?? 'Not available'}</small>}
              </label>
            ))}
          </fieldset>
          <details className="rc-columns">
            <summary>Columns: {cols.length} of {def.columns.length} in the export{cols.length !== def.columns.length && ' (changed)'}</summary>
            <div className="rc-col-actions"><button className="linkbtn" onClick={() => setCols(def.columns.map(c => c.key))}>All, in the standard order</button></div>
            <ul className="rc-col-list">
              {cols.map((k, i) => { const c = def.columns.find(x => x.key === k)!; return (
                <li key={k}><label className="check"><input type="checkbox" checked onChange={() => toggle(k, false)} disabled={cols.length === 1} /> {c.header}</label><span className="hint">{c.definition}</span>
                  <span className="rc-move"><button className="linkbtn" aria-label={`Move ${c.header} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button className="linkbtn" aria-label={`Move ${c.header} down`} disabled={i === cols.length - 1} onClick={() => move(i, 1)}>↓</button></span></li>); })}
              {def.columns.filter(c => !cols.includes(c.key)).map(c => <li key={c.key} className="off"><label className="check"><input type="checkbox" checked={false} onChange={() => toggle(c.key, true)} /> {c.header}</label><span className="hint">{c.definition}</span></li>)}
            </ul>
          </details>
          <div className="rc-generate">
            <button className="btn btn-primary" onClick={generate} disabled={busy || dirty || p.total > p.limit || p.total === 0}>{busy ? <><span className="spin" /> Generating…</> : `Generate ${def.formats.find(f => f.key === format)?.label ?? ''}`}</button>
            <span className="hint">{p.total === 0 ? 'Nothing to export with these filters.' : `${p.total.toLocaleString()} row(s) · the file is kept for download in the export history.`}</span>
          </div>
          {exportError && <div className="notice error" role="alert">{exportError}</div>}
        </Panel>
      )}

      {job && (
        <Panel title="4 · Result">
          <div className={`rc-result ${job.status.toLowerCase()}`} role="status">
            <StatusBadge value={job.status} />
            {job.status === 'Completed' ? <>
              <div><b>{job.fileName}</b><div className="hint">{job.format.toUpperCase()} · {job.rowCount?.toLocaleString()} row(s) · {size(job.fileSize)} · generated {fmtDateTime(job.completedAt, zone)} · available until {fmtDateTime(job.expiresAt, zone)}</div></div>
              <button className="btn btn-primary" onClick={() => download(job, toast)}><Icon name="download" size={14} /> Download</button>
            </> : <>
              <div><b>The export failed.</b><div className="hint">{job.error}</div></div>
              {job.canRetry && <button className="btn" onClick={retry} disabled={busy}>Retry</button>}
            </>}
            <button className="linkbtn" onClick={() => onHistory(job.id)}>View in export history</button>
          </div>
          <p className="hint">Export reference {job.auditId} (kept in the audit trail).</p>
        </Panel>
      )}
    </>
  );
}

/* ------------------------------------------------------------- history ------------------------------------------------------------- */

function ExportDetails({ id, onClose }: { id: number; onClose: () => void }) {
  const toast = useToast();
  const q = useQuery({ queryKey: ['report-export', id], queryFn: () => get<{ export: ExportJob; filters: Values; columns?: string[] | null; startedAt?: string }>(`/reports/exports/${id}`) });
  const j = q.data?.export;
  return (
    <Dialog title="Export details" onClose={onClose}>
      {q.isLoading && <StateMessage kind="loading" />}
      {q.error && <StateMessage kind="error">{apiError(q.error)?.summary}</StateMessage>}
      {j && <>
        <dl className="dl">
          {([['Report', j.reportName], ['Status', <StatusBadge key="s" value={j.status} />], ['Generated by', j.user ?? '—'], ['Source', j.source], ['Requested', fmtDateTime(j.requestedAt)],
            ['Completed', fmtDateTime(j.completedAt) || '—'], ['Format', j.format.toUpperCase()], ['Rows', j.rowCount?.toLocaleString() ?? '—'], ['File', j.fileName ? `${j.fileName} (${size(j.fileSize)})` : '—'],
            ['Kept until', j.status === 'Expired' ? 'Expired — the file was removed' : fmtDateTime(j.expiresAt) || '—'], ['Time zone', j.timeZone], ['Filters', j.filterSummary || 'none'],
            ['Columns', q.data?.columns?.length ? q.data.columns.join(', ') : 'All, standard order'], ['Audit reference', <code key="a">{j.auditId}</code>], ...(j.error ? [['Error', j.error] as [string, ReactNode]] : [])] as [string, ReactNode][])
            .map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <div className="form-actions"><button className="btn" onClick={onClose}>Close</button>{j.canDownload && <button className="btn btn-primary" onClick={() => download(j, toast)}>Download</button>}</div>
      </>}
    </Dialog>
  );
}

function History({ reports, focus }: { reports: ReportDef[]; focus?: number }) {
  const me = useMe().data!;
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({ report: '', status: '', from: '', to: '', scope: '', sort: '-requestedAt', page: 1, pageSize: 15 });
  const [details, setDetails] = useState<number | null>(focus ?? null);
  const set = (patch: Partial<typeof f>) => setF(x => ({ ...x, page: 1, ...patch }));
  const badRange = f.from && f.to && f.from > f.to;
  const q = useQuery({ queryKey: ['report-history', f], queryFn: () => get<Paged<ExportJob>>(`/reports/exports${qs({ ...f, scope: f.scope || undefined })}`), enabled: !badRange, placeholderData: keepPreviousData,
    // A70: while a builder export is queued or running, the list follows it.
    refetchInterval: r => r.state.data?.items.some(j => j.status === 'Queued' || j.status === 'Processing') ? 3000 : false });
  const cancel = async (j: ExportJob) => {
    try { await post(`/reporting/exports/${j.id}/cancel`); toast('Cancellation requested.'); qc.invalidateQueries({ queryKey: ['report-history'] }); }
    catch (e) { toast(apiError(e)?.summary ?? 'The export could not be cancelled.', true); }
  };
  const retry = async (j: ExportJob) => {
    try {
      const n = await post<ExportJob>(j.builder ? `/reporting/exports/${j.id}/retry` : `/reports/exports/${j.id}/retry`);
      toast(n.status === 'Queued' ? `${n.reportName} queued again.` : n.status === 'Completed' ? `${n.reportName} generated again.` : (n.error ?? 'The export failed again.'), n.status === 'Failed');
      qc.invalidateQueries({ queryKey: ['report-history'] });
      qc.invalidateQueries({ queryKey: ['report-summary'] });
    } catch (e) { toast(apiError(e)?.summary ?? 'The export could not be retried.', true); }
  };
  const filtered = Boolean(f.report || f.status || f.from || f.to);
  return (
    <>
      <div className="toolbar">
        <SelectInput label="Report" value={f.report} onChange={v => set({ report: v })} options={reports.map(r => ({ value: r.key, label: r.name }))} empty="All reports" />
        <SelectInput label="Status" value={f.status} onChange={v => set({ status: v })} options={['Queued', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Expired'].map(s => ({ value: s, label: s }))} empty="Any" />
        <TextInput label="From" type="date" value={f.from} onChange={v => set({ from: v })} />
        <TextInput label="To" type="date" value={f.to} onChange={v => set({ to: v })} error={badRange ? 'The end is before the start.' : undefined} />
        {me.grants.audit && <SelectInput label="Generated by" value={f.scope} onChange={v => set({ scope: v })} options={[{ value: 'all', label: 'Everyone (Audit permission)' }]} empty="Me" />}
      </div>
      {f.scope === 'all' && <p className="hint">You see everyone's exports because you hold the Audit permission; files are downloaded only by the person they were generated for.</p>}
      <DataTable<ExportJob> rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'} caption="Export history" tools={false}
        sort={f.sort} onSort={s => set({ sort: s })} pageSize={100}
        columns={[
          { key: 'report', header: 'Report', sort: 'report', render: r => <><button className="linkbtn" onClick={() => setDetails(r.id)}>{r.reportName}</button><div className="hint">{r.filterSummary || 'No filters'}</div></> },
          { key: 'user', header: 'Generated by', render: r => <>{r.user}<div className="hint">{r.source}</div></> },
          { key: 'at', header: 'Date & time', sort: 'requestedAt', render: r => fmtDateTime(r.requestedAt) },
          { key: 'format', header: 'Format', render: r => <span className="chip">{r.format.toUpperCase()}</span> },
          { key: 'rows', header: 'Records', sort: 'rows', className: 'num', render: r => r.rowCount?.toLocaleString() ?? '—' },
          { key: 'status', header: 'Status', sort: 'status', render: r => <><Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>{(r.status === 'Queued' || r.status === 'Processing') && <span className="spin" aria-hidden="true" />}
            {(r.status === 'Failed' || r.status === 'Cancelled') && r.error && <div className="hint err rc-err">{r.error}</div>}</> },
          { key: 'expires', header: 'Expires', render: r => r.status === 'Completed' && r.expiresAt ? fmtDateTime(r.expiresAt) : <span className="muted">—</span> },
          { key: 'size', header: 'File size', className: 'num', render: r => size(r.fileSize) },
          { key: 'actions', header: 'Actions', className: 'row-actions', render: r => <span className="rc-row-actions">
            {r.canDownload && <button className="linkbtn" onClick={() => download(r, toast, () => {
              void qc.invalidateQueries({ queryKey: ['report-history'] });
              void qc.invalidateQueries({ queryKey: ['report-export', r.id] });
            })}>Download</button>}
            <button className="linkbtn" onClick={() => setDetails(r.id)}>Details</button>
            {r.canCancel && <button className="linkbtn" onClick={() => cancel(r)}>Cancel</button>}
            {r.canRetry && <button className="linkbtn" onClick={() => retry(r)}>Retry</button>}</span> }
        ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => setF(x => ({ ...x, page: p }))} onSize={s => setF(x => ({ ...x, page: 1, pageSize: s }))} />}
      {details !== null && <ExportDetails id={details} onClose={() => setDetails(null)} />}
    </>
  );
}

/* ------------------------------------------------------------- schedules ------------------------------------------------------------ */

function ScheduleDialog({ reports, edit, onClose }: { reports: ReportDef[]; edit?: { schedule: Schedule; filters: Values }; onClose: () => void }) {
  const me = useMe().data!;
  const toast = useToast();
  const qc = useQueryClient();
  const users = useAssignable();
  const s = edit?.schedule;
  const [v, setV] = useState({
    name: s?.name ?? '', report: s?.report ?? reports[0]?.key ?? '', format: s?.format ?? 'xlsx', frequency: s?.frequency ?? 'Weekly',
    dayOfWeek: String(s?.dayOfWeek ?? 0), dayOfMonth: String(s?.dayOfMonth ?? 1), time: s?.time ?? '07:00', timeZone: s?.timeZone ?? me.timeZone ?? 'Asia/Dubai'
  });
  const [filters, setFilters] = useState<Values>(edit?.filters ?? {});
  const [recipients, setRecipients] = useState<number[]>(s?.recipients.map(r => r.id) ?? [me.id]);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const def = reports.find(r => r.key === v.report);
  const fe = (k: string) => error?.field(k);
  const save = async () => {
    setBusy(true); setError(null);
    const body = { ...v, dayOfWeek: Number(v.dayOfWeek), dayOfMonth: Number(v.dayOfMonth), filters: Object.fromEntries(Object.entries(filters).filter(([, x]) => x)), recipientIds: recipients };
    try {
      if (s) await put(`/reports/schedules/${s.id}`, body); else await post('/reports/schedules', body);
      toast(s ? 'Schedule saved.' : 'Schedule created.');
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
      qc.invalidateQueries({ queryKey: ['report-summary'] });
      onClose();
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  };
  const people = (users.data ?? []).filter(u => !recipients.includes(u.id));
  return (
    <Dialog title={s ? 'Edit scheduled report' : 'Schedule a report'} onClose={onClose} wide>
      <div className="notice">Each recipient receives their own file, generated with their own access, and is told in the hub's notifications. The hub sends no e-mail. A recipient who loses the Export permission gets a failed run, not a file.</div>
      {error && <div className="notice error" role="alert">{error.summary}</div>}
      <div className="form-grid">
        <TextInput label="Name" required value={v.name} onChange={x => setV({ ...v, name: x })} error={fe('name')} maxLength={120} />
        <SelectInput label="Report" required value={v.report} onChange={x => { setV({ ...v, report: x }); setFilters({}); }} options={reports.map(r => ({ value: r.key, label: r.name }))} empty={null} error={fe('report')} />
        <SelectInput label="Format" required value={v.format} onChange={x => setV({ ...v, format: x })} options={(def?.formats ?? []).filter(f => f.available).map(f => ({ value: f.key, label: f.label }))} empty={null} error={fe('format')} />
        <SelectInput label="Frequency" required value={v.frequency} onChange={x => setV({ ...v, frequency: x })} options={['Daily', 'Weekly', 'Monthly'].map(x => ({ value: x, label: x }))} empty={null} error={fe('frequency')} />
        {v.frequency === 'Weekly' && <SelectInput label="On" required value={v.dayOfWeek} onChange={x => setV({ ...v, dayOfWeek: x })} options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))} empty={null} error={fe('dayOfWeek')} />}
        {v.frequency === 'Monthly' && <SelectInput label="Day of the month" required value={v.dayOfMonth} onChange={x => setV({ ...v, dayOfMonth: x })} options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} empty={null} error={fe('dayOfMonth')} hint="1–28, so every month has the day." />}
        <TextInput label="Time" required type="time" value={v.time} onChange={x => setV({ ...v, time: x })} error={fe('time')} />
        <TimeZoneSelect label="Time zone" required value={v.timeZone} onChange={x => setV({ ...v, timeZone: x })} error={fe('timeZone')} />
      </div>
      <fieldset className="rc-recipients">
        <legend className="flabel">Recipients</legend>
        <div className="rc-chips">{recipients.map(id => <span key={id} className="chip rc-chip">{id === me.id ? `${me.displayName} (me)` : users.data?.find(u => u.id === id)?.name ?? s?.recipients.find(r => r.id === id)?.name ?? `#${id}`}
          <button type="button" aria-label="Remove recipient" onClick={() => setRecipients(r => r.filter(x => x !== id))}>×</button></span>)}</div>
        {people.length > 0 && <select className="input" aria-label="Add a recipient" value="" onChange={e => e.target.value && setRecipients(r => [...r, Number(e.target.value)])}>
          <option value="">+ Add a recipient…</option>{people.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
        {fe('recipientIds') && <div className="err">{fe('recipientIds')}</div>}
      </fieldset>
      {def && <><h3 className="rc-sub">Filters</h3><FilterFields def={def} values={filters} onChange={(k, x) => setFilters(f => ({ ...f, [k]: x }))} errors={filterErrors(error)} /></>}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : s ? 'Save schedule' : 'Create schedule'}</button></div>
    </Dialog>
  );
}

function ScheduleRuns({ s, onClose }: { s: Schedule; onClose: () => void }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['report-runs', s.id, page], queryFn: () => get<Paged<ExportJob>>(`/reports/schedules/${s.id}/runs?page=${page}&pageSize=10`) });
  return (
    <Dialog title={`Runs of “${s.name}”`} onClose={onClose} wide>
      <p className="hint">One export per recipient and run. You can download only the files generated for you.</p>
      <DataTable<ExportJob> rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} tools={false} caption="Schedule runs" empty="none"
        columns={[
          { key: 'at', header: 'Run', render: r => fmtDateTime(r.requestedAt) }, { key: 'user', header: 'Recipient', render: r => r.user },
          { key: 'status', header: 'Status', render: r => <><Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>{r.error && <div className="hint err">{r.error}</div>}</> },
          { key: 'rows', header: 'Records', className: 'num', render: r => r.rowCount ?? '—' },
          { key: 'dl', header: '', render: r => r.canDownload ? <button className="linkbtn" onClick={() => download(r, toast)}>Download</button> : null }
        ]} />
      {q.data && q.data.totalCount > 10 && <Pager page={q.data.page} pageSize={10} total={q.data.totalCount} onPage={setPage} onSize={() => {}} />}
      <div className="form-actions"><button className="btn" onClick={onClose}>Close</button></div>
    </Dialog>
  );
}

type BuilderEdit = { schedule: Schedule; options?: { pdfMode?: string | null } | null };

/** A70: choose which saved builder report to schedule. */
function PickSaved({ onPick, onClose }: { onPick: (r: { id: number; name: string }) => void; onClose: () => void }) {
  const list = useQuery({ queryKey: ['rc-saved', 'all', ''], queryFn: () => get<{ id: number; name: string; isOwner: boolean; owner: string }[]>('/reporting/report-definitions') });
  const [id, setId] = useState('');
  return (
    <Dialog title="Schedule a saved report" onClose={onClose}>
      {list.isLoading && <StateMessage kind="loading" />}
      {list.data?.length === 0 && <StateMessage kind="none">You have no saved reports yet. <Link to="/reporting-center/builder/cases">Build and save a cases report</Link> first.</StateMessage>}
      {!!list.data?.length && <SelectInput label="Saved report" value={id} onChange={setId} options={list.data.map(r => ({ value: String(r.id), label: r.isOwner ? r.name : `${r.name} (${r.owner})` }))} />}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!id} onClick={() => { const r = list.data!.find(x => String(x.id) === id)!; onPick({ id: r.id, name: r.name }); }}>Continue</button></div>
    </Dialog>
  );
}

function Schedules({ reports, creating, setCreating }: { reports: ReportDef[]; creating: boolean; setCreating: (b: boolean) => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['report-schedules'], queryFn: () => get<Schedule[]>('/reports/schedules') });
  const [edit, setEdit] = useState<{ schedule: Schedule; filters: Values } | null>(null);
  const [builderEdit, setBuilderEdit] = useState<BuilderEdit | null>(null);
  const [pickSaved, setPickSaved] = useState(false);
  const [newSaved, setNewSaved] = useState<{ id: number; name: string } | null>(null);
  const [runs, setRuns] = useState<Schedule | null>(null);
  const [remove, setRemove] = useState<Schedule | null>(null);
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast(msg); qc.invalidateQueries({ queryKey: ['report-schedules'] }); qc.invalidateQueries({ queryKey: ['report-summary'] }); }
    catch (e) { toast(apiError(e)?.summary ?? 'The change could not be saved.', true); }
  };
  const when = scheduleWhen;
  const openEdit = async (r: Schedule) => {
    const full = await get<{ schedule: Schedule; filters: Values; options?: { pdfMode?: string | null } | null }>(`/reports/schedules/${r.id}`);
    if (r.builder) setBuilderEdit({ schedule: full.schedule, options: full.options }); else setEdit(full);
  };  return (
    <>
      <div className="rc-sched-head"><p className="hint">Your scheduled reports. Files are generated at the chosen local time and kept in each recipient's export history.</p>
        <span className="rc-row-actions"><button className="btn" onClick={() => setPickSaved(true)}>+ Schedule a saved report</button>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Schedule report</button></span></div>
      <DataTable<Schedule> rowKey={r => r.id} rows={q.data} loading={q.isLoading} error={q.error} tools={false} caption="Scheduled reports" empty="none"
        columns={[
          { key: 'name', header: 'Name', render: r => <><b>{r.name}</b><div className="hint">{r.builder ? <>Saved report: <Link to={`/reporting-center/builder/cases?report=${r.savedReportId}`}>{r.reportName}</Link></> : <>{r.reportName}{r.filterSummary ? ` · ${r.filterSummary}` : ''}</>}</div></> },
          { key: 'when', header: 'Frequency', render: r => when(r) },
          { key: 'format', header: 'Format', render: r => <span className="chip">{r.format.toUpperCase()}</span> },
          { key: 'to', header: 'Recipients', render: r => r.recipients.map(x => x.name).join(', ') },
          { key: 'next', header: 'Next run', render: r => r.isActive ? fmtDateTime(r.nextRunAt) : <span className="muted">Paused</span> },
          { key: 'last', header: 'Last run', render: r => r.lastRunAt ? <>{fmtDateTime(r.lastRunAt)}<div className="hint">{r.lastOutcome}</div></> : <span className="muted">Not yet run</span> },
          { key: 'active', header: 'Status', render: r => <Badge tone={r.isActive ? 'good' : 'neutral'}>{r.isActive ? 'Active' : 'Paused'}</Badge> },
          { key: 'actions', header: 'Actions', className: 'row-actions', render: r => <span className="rc-row-actions">
            <button className="linkbtn" onClick={() => openEdit(r)}>Edit</button>
            {r.isActive ? <button className="linkbtn" onClick={() => act(() => post(`/reports/schedules/${r.id}/pause`), 'Schedule paused.')}>Pause</button>
              : <button className="linkbtn" onClick={() => act(() => post(`/reports/schedules/${r.id}/resume`), 'Schedule resumed.')}>Resume</button>}
            <button className="linkbtn" onClick={() => setRuns(r)}>Runs</button>
            <button className="linkbtn err" onClick={() => setRemove(r)}>Delete</button></span> }
        ]} />
      {(creating || edit) && <ScheduleDialog reports={reports} edit={edit ?? undefined} onClose={() => { setCreating(false); setEdit(null); }} />}
      {pickSaved && <PickSaved onClose={() => setPickSaved(false)} onPick={r => { setPickSaved(false); setNewSaved(r); }} />}
      {(newSaved || builderEdit) && <BuilderScheduleDialog savedId={newSaved?.id ?? builderEdit!.schedule.savedReportId!} savedName={newSaved?.name ?? builderEdit!.schedule.reportName}
        edit={builderEdit ? { ...builderEdit.schedule, pdfMode: builderEdit.options?.pdfMode } : undefined}
        onClose={() => { setNewSaved(null); setBuilderEdit(null); }}
        onDone={() => { setNewSaved(null); setBuilderEdit(null); qc.invalidateQueries({ queryKey: ['report-schedules'] }); qc.invalidateQueries({ queryKey: ['report-summary'] }); }} />}
      {runs && <ScheduleRuns s={runs} onClose={() => setRuns(null)} />}
      {remove && <Dialog title="Delete scheduled report" onClose={() => setRemove(null)}>
        <p>Delete <b>{remove.name}</b>? No further runs are made. Files already generated stay in each recipient's export history until they expire.</p>
        <div className="form-actions"><button className="btn" onClick={() => setRemove(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={async () => { await act(() => del(`/reports/schedules/${remove.id}`), 'Schedule deleted.'); setRemove(null); }}>Delete schedule</button></div>
      </Dialog>}
    </>
  );
}

/* --------------------------------------------------------------- page --------------------------------------------------------------- */

/** A70: the areas of the Reporting Center (sub-routes of /reporting-center; the section menu lists them). */
const AREAS: Record<string, { label: string; sub: string }> = {
  '': { label: 'Overview', sub: 'Your report usage, recent exports, upcoming schedules and quick actions.' },
  library: { label: 'Report library', sub: 'All reports by category: configure, preview and export (CSV or Excel); the Cases report also has the Report Builder.' },
  'builder/cases': { label: 'Cases report builder', sub: 'Filters, columns, sorting and grouping with a live server-side preview; save, export to Excel or PDF, or schedule.' },
  'my-reports': { label: 'My reports', sub: 'Saved Cases Report Builder configurations: yours, your team’s and those shared with you.' },
  schedules: { label: 'Scheduled reports', sub: 'Recurring report files for you and colleagues, each generated with the recipient’s own access.' },
  history: { label: 'Export history', sub: 'Every export with status, rows, format, expiry and secure download; queued exports update live.' },
  templates: { label: 'Templates', sub: 'Ready-made Cases Report Builder configurations to start from.' }
};

/** Links from before A70 (?tab=history&export=…, ?tab=schedules, ?tab=catalog&report=…) open the matching area. */
function legacyTarget(search: string): string | null {
  const p = new URLSearchParams(search);
  const tab = p.get('tab');
  if (tab === 'history') return `/reporting-center/history${p.get('export') ? `?export=${p.get('export')}` : ''}`;
  if (tab === 'schedules') return '/reporting-center/schedules';
  if (tab === 'catalog' || p.get('report')) return `/reporting-center/library${p.get('report') ? `?report=${p.get('report')}` : ''}`;
  return null;
}

function Library({ reports, searchRef }: { reports: ReportDef[]; searchRef: React.RefObject<HTMLInputElement> }) {
  const nav = useNavigate();
  const [u, setU] = useUrlState({ report: '' });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const def = reports.find(r => r.key === u.report);
  return <>
    {def
      ? <ReportWorkspace def={def} onBack={() => setU({ report: '' })} onHistory={id => nav(`/reporting-center/history?export=${id}`)} />
      : <Catalog reports={reports} onOpen={k => setU({ report: k })} search={search} setSearch={setSearch} category={category} setCategory={setCategory} searchRef={searchRef} />}
    <p className="hint rc-foot">Need a report that is not listed? Report definitions live in one place on the server (<Link to="/admin">ask the application team</Link>); a new definition appears here automatically.</p>
  </>;
}

function HistoryArea({ reports }: { reports: ReportDef[] }) {
  const [u] = useUrlState({ export: '' });
  return <History reports={reports} focus={u.export ? Number(u.export) : undefined} />;
}

export function Reports() {
  const me = useMe().data!;
  const loc = useLocation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null!);
  const catalog = useQuery({ queryKey: ['report-catalog'], queryFn: () => get<ReportDef[]>('/reports/catalog'), enabled: me.grants.export, staleTime: 5 * 60_000 });
  const reports = useMemo(() => catalog.data ?? [], [catalog.data]);
  const area = loc.pathname.replace(/^\/reporting-center\/?/, '').replace(/\/$/, '');
  const refreshing = useIsFetching({ predicate: q => /^(report-|rc-|rb-)/.test(String(q.queryKey[0])) }) > 0;
  // GUI-01: the hub's own access-denied page with a way back; the server refuses the report endpoints to this user as well.
  if (!me.grants.export) return <><PageHead title="Reporting Center" /><Restricted need="The Reporting Center needs the Export permission." />
    <p className="rc-back"><Link className="btn" to="/">Back to the dashboard</Link></p></>;
  const legacy = area === '' ? legacyTarget(loc.search) : null;
  if (legacy) return <Navigate to={legacy} replace />;
  const a = AREAS[area];
  const needsCatalog = (el: ReactNode) => catalog.isLoading ? <StateMessage kind="loading" />
    : catalog.error ? <StateMessage kind={apiError(catalog.error)?.status === 403 ? 'restricted' : 'error'}>{apiError(catalog.error)?.summary ?? 'The report catalog could not be loaded.'}</StateMessage> : el;
  return (
    <div className={`rc${area === 'builder/cases' ? ' rc-wide' : ''}`}>
      <PageHead title="Reporting Center" crumbs={area ? [{ to: '/reporting-center', label: 'Reporting Center' }, ...(area === 'builder/cases' ? [{ to: '/reporting-center/library', label: 'Report library' }] : []), { label: a?.label ?? 'Not found' }] : undefined}
        sub={a?.sub ?? 'Generate operational reports, analyze performance, and manage data exports.'}
        actions={<>
          <button className="btn" disabled={refreshing} onClick={() => qc.invalidateQueries({ predicate: q => /^(report-|rc-|rb-)/.test(String(q.queryKey[0])) })}>{refreshing ? <><span className="spin" /> Refreshing…</> : 'Refresh'}</button>
          <button className="btn" onClick={() => { nav('/reporting-center/schedules'); setCreating(true); }}>Schedule report</button>
          <button className="btn btn-primary" onClick={() => nav('/reporting-center/builder/cases')}>+ Create report</button>
        </>} />
      <Routes>
        <Route index element={<ReportingOverview />} />
        <Route path="library" element={needsCatalog(<Library reports={reports} searchRef={searchRef} />)} />
        <Route path="builder/cases" element={<CasesBuilder />} />
        <Route path="my-reports" element={<MyReports />} />
        <Route path="schedules" element={needsCatalog(<Schedules reports={reports} creating={creating} setCreating={setCreating} />)} />
        <Route path="history" element={needsCatalog(<HistoryArea reports={reports} />)} />
        <Route path="templates" element={<Templates />} />
        <Route path="*" element={<StateMessage kind="none">There is no Reporting Center page at this address. <Link to="/reporting-center">Open the overview</Link>.</StateMessage>} />
      </Routes>
    </div>
  );
}
