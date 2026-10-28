import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, ApiError, get, post } from '../../api';
import { fmtDateTime, label } from '../../format';
import { useDebounced, useEnumLabel, useLeaveGuard, useMe } from '../../hooks';
import { Icon } from '../../ui/Icon';
import { TimeZoneSelect } from '../../ui/pickers';
import { Badge, DataTable, Dialog, SelectInput, StateMessage, TextInput, useToast, type Column } from '../../ui/kit';
import { ClientDisplay, ClientLogo } from '../../ui/ClientLogo';
import { apiError, ChipPick, download, MultiPick, size, TERMINAL, useAssignable, useJob, useReportZone, WEEKDAYS, type ExportJob } from './shared';

/* ---------------------------------------------------------------------------------------------------------------------------
 * A70: the Cases Report Builder. Configuration (about 35 %) beside a live, server-side preview (about 65 %) with sticky actions.
 * The field list, operators and limits come from /reporting/report-types/cases; option values from …/filters (authorized only).
 * Every preview, save, export and schedule is validated again on the server; nothing here decides what a user may see.
 * ------------------------------------------------------------------------------------------------------------------------- */

type FieldMeta = { key: string; label: string; type: 'Text' | 'Number' | 'Date' | 'Enum' | 'Bool'; category: string; description: string; sortable: boolean; groupable: boolean;
  filterable: boolean; options?: string[] | null; operators: string[]; required: boolean };
type Meta = { fields: FieldMeta[]; dateFields: { key: string; label: string }[]; datePresets: string[]; slaStatuses: string[]; dueOptions: string[]; statuses: string[]; priorities: string[];
  scopes: string[]; defaultColumns: string[]; defaultSort: SortSpec[];
  limits: { maxRows: number; pdfMaxRows: number; retentionDays: number; maxColumns: number; maxSort: number; maxRules: number; maxDepth: number; pageSizes: number[]; maxActiveExports: number } };
type Opt = { id: number | string; label: string; sub?: string; clientId?: number; active?: boolean; retired?: boolean };
type FilterOptions = { clients: Opt[]; teams: Opt[]; products: Opt[]; environments: Opt[]; owners: Opt[]; types: Opt[]; myTeams: number[] };
type SortSpec = { field: string; direction: 'asc' | 'desc' };
export type Rule = { field: string; operator: string; value?: unknown };
export type Group = { op: 'and' | 'or'; rules: (Rule | Group)[] };
export type Filters = {
  dateField?: string; datePreset?: string; dateRange?: { fromDay?: string; toDay?: string }; clientIds?: number[]; statuses?: string[]; priorities?: string[]; ownerIds?: number[];
  unassigned?: boolean; teamIds?: number[]; productIds?: number[]; environmentIds?: number[]; slaStatuses?: string[]; due?: string; ageMin?: number; ageMax?: number; jira?: string;
  jiraKey?: string; q?: string; types?: string[]; scope?: string; waiting?: boolean; conditions?: Group;
};
export type Definition = { schemaVersion: 1; filters: Filters; columns: string[]; sort: SortSpec[]; groupBy?: string | null };
type Preview = {
  total: number; countExact: boolean; page: number; pageSize: number; cutoff: string; timeZone: string; durationMs: number; dateRange: { from?: string | null; toExclusive?: string | null };
  columns: { key: string; label: string; type: string }[]; rows: { id: number; cells: unknown[] }[];
  summary: { byStatus: Record<string, number>; byPriority: Record<string, number>; bySla: Record<string, number> };
  groupBy?: string | null; groups?: { key: string; count: number }[] | null; filters: { label: string; value: string }[]; warnings: string[];
  limits: { maxRows: number; pdfMaxRows: number }; exportable: boolean;
};
type Saved = { id: number; name: string; description?: string | null; visibility: string; teamId?: number | null; team?: string | null; owner?: string | null; isOwner: boolean;
  isFavorite: boolean; revision: number; schedules: number; shares: { id: number; name: string }[] };

export const OPEN_STATUSES = ['New', 'Triaged', 'InProgress', 'PendingValidation'];
const DEFAULT_COLUMNS = ['caseId', 'clientCode', 'title', 'priority', 'status', 'owner', 'slaStatus', 'dueAt'];
export const emptyDefinition = (): Definition => ({ schemaVersion: 1, filters: { dateField: 'createdAt' }, columns: [...DEFAULT_COLUMNS], sort: [{ field: 'priority', direction: 'asc' }, { field: 'caseId', direction: 'asc' }], groupBy: null });

export const PRESET_LABEL: Record<string, string> = {
  today: 'Today', yesterday: 'Yesterday', last7: 'Last 7 days', last30: 'Last 30 days', last90: 'Last 90 days', thisMonth: 'This month', lastMonth: 'Last month', thisQuarter: 'This quarter', thisYear: 'This year'
};
export const SLA_LABEL: Record<string, string> = { Breached: 'Breached', AtRisk: 'At risk', OnTrack: 'On track', Met: 'Met', NotMeasurable: 'Not measurable', NotApplicable: 'No SLA' };
const SLA_TONE: Record<string, 'bad' | 'warn' | 'info' | 'good' | 'neutral'> = { Breached: 'bad', AtRisk: 'warn', OnTrack: 'info', Met: 'good', NotMeasurable: 'neutral', NotApplicable: 'neutral' };
const PRIORITY_TONE: Record<string, 'bad' | 'warn' | 'info' | 'neutral'> = { Critical: 'bad', High: 'warn', Normal: 'info', Low: 'neutral' };
const DUE_LABEL: Record<string, string> = { overdue: 'Overdue', dueSoon: 'Due soon', hasDue: 'Has a due date', noDue: 'No due date' };
const OP_LABEL: Record<string, string> = {
  equals: 'equals', notEquals: 'does not equal', contains: 'contains', notContains: 'does not contain', startsWith: 'starts with', isEmpty: 'is empty', isNotEmpty: 'is not empty',
  in: 'is any of', notIn: 'is none of', eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', before: 'is before', onOrAfter: 'is on or after',
  withinLastDays: 'within the last … days', withinNextDays: 'within the next … days', isTrue: 'is yes', isFalse: 'is no'
};

/** Built-in starting points (Templates area). Real definitions: opening one runs it on the caller's authorized data. */
export const TEMPLATES: { key: string; name: string; description: string; definition: () => Definition }[] = [
  { key: 'open-critical-high', name: 'Open critical and high cases', description: 'Open cases of priority Critical or High, most urgent first, with owner, SLA status and due date.',
    definition: () => ({ ...emptyDefinition(), filters: { dateField: 'createdAt', statuses: [...OPEN_STATUSES], priorities: ['Critical', 'High'] }, sort: [{ field: 'priority', direction: 'asc' }, { field: 'dueAt', direction: 'asc' }] }) },
  { key: 'sla-breached-30', name: 'SLA breaches, last 30 days', description: 'Cases created in the last 30 days whose contractual response or resolution SLA is breached, by client.',
    definition: () => ({ ...emptyDefinition(), filters: { dateField: 'createdAt', datePreset: 'last30', slaStatuses: ['Breached'] }, columns: ['caseId', 'clientCode', 'title', 'priority', 'status', 'responseSla', 'resolutionSla', 'contract'], groupBy: 'clientCode', sort: [{ field: 'clientCode', direction: 'asc' }] }) },
  { key: 'overdue-by-owner', name: 'Overdue cases by owner', description: 'Open cases whose due time has passed, grouped by owner, oldest due first.',
    definition: () => ({ ...emptyDefinition(), filters: { dateField: 'createdAt', due: 'overdue' }, columns: ['caseId', 'owner', 'clientCode', 'title', 'priority', 'dueAt', 'ageDays'], groupBy: 'owner', sort: [{ field: 'dueAt', direction: 'asc' }] }) },
  { key: 'created-this-month', name: 'Cases created this month by client', description: 'Everything opened this calendar month (report time zone), grouped by client.',
    definition: () => ({ ...emptyDefinition(), filters: { dateField: 'createdAt', datePreset: 'thisMonth' }, columns: ['caseId', 'clientCode', 'title', 'type', 'priority', 'status', 'createdAt'], groupBy: 'clientCode', sort: [{ field: 'createdAt', direction: 'desc' }] }) },
  { key: 'waiting-customer', name: 'Waiting for the customer', description: 'Open cases waiting for the customer for more than 7 days (advanced condition on the waiting reason and age).',
    definition: () => ({ ...emptyDefinition(), filters: { dateField: 'createdAt', statuses: [...OPEN_STATUSES], conditions: { op: 'and', rules: [{ field: 'waitingReason', operator: 'in', value: ['Customer'] }, { field: 'ageDays', operator: 'gt', value: 7 }] } },
      columns: ['caseId', 'clientCode', 'title', 'owner', 'waitingReason', 'nextAction', 'ageDays'], sort: [{ field: 'ageDays', direction: 'desc' }] }) },
  { key: 'closed-last-month', name: 'Closed last month', description: 'Cases closed in the previous calendar month with resolution SLA outcome and Jira references.',
    definition: () => ({ ...emptyDefinition(), filters: { dateField: 'closedAt', datePreset: 'lastMonth', statuses: ['Closed'] }, columns: ['caseId', 'clientCode', 'title', 'priority', 'closedAt', 'resolutionSla', 'jiraKeys'], sort: [{ field: 'closedAt', direction: 'asc' }] }) }
];

const isGroup = (n: Rule | Group): n is Group => 'rules' in n;
const countRules = (g?: Group): number => !g ? 0 : g.rules.reduce((a, r) => a + (isGroup(r) ? countRules(r) : 1), 0);
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Removes empty values so the request (and the saved definition) holds only what is set. */
export function clean(d: Definition): Definition {
  const f: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d.filters)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (k === 'dateRange' && !(v as { fromDay?: string; toDay?: string }).fromDay && !(v as { fromDay?: string; toDay?: string }).toDay) continue;
    if (k === 'conditions' && countRules(v as Group) === 0) continue;
    f[k] = v;
  }
  return { schemaVersion: 1, filters: f as Filters, columns: d.columns, sort: d.sort, groupBy: d.groupBy || null };
}

function useMeta() {
  return useQuery({ queryKey: ['rb-meta'], queryFn: () => get<Meta>('/reporting/report-types/cases'), staleTime: 10 * 60_000 });
}
function useFilterOptions() {
  return useQuery({ queryKey: ['rb-filters'], queryFn: () => get<FilterOptions>('/reporting/report-types/cases/filters'), staleTime: 5 * 60_000 });
}

/* ------------------------------------------------------------ advanced conditions ------------------------------------------------------------ */

function RuleEditor({ rule, fields, onChange, onRemove, statusLabel }: { rule: Rule; fields: FieldMeta[]; onChange: (r: Rule) => void; onRemove: () => void; statusLabel: (s: string) => string }) {
  const f = fields.find(x => x.key === rule.field) ?? fields[0];
  const needsValue = !['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(rule.operator);
  const setField = (key: string) => { const nf = fields.find(x => x.key === key)!; onChange({ field: key, operator: nf.operators[0], value: nf.type === 'Enum' ? [] : undefined }); };
  const optText = (o: string) => f.key === 'status' ? statusLabel(o) : f.key === 'slaStatus' ? SLA_LABEL[o] ?? o : label(o);
  let input: ReactNode = null;
  if (needsValue) {
    if (f.type === 'Enum') {
      const v = (rule.value as string[] | undefined) ?? [];
      input = <div className="rb-rule-enum" role="group" aria-label={`${f.label} values`}>{(f.options ?? []).map(o => (
        <label key={o} className="check"><input type="checkbox" checked={v.includes(o)} onChange={e => onChange({ ...rule, value: e.target.checked ? [...v, o] : v.filter(x => x !== o) })} /> {optText(o)}</label>))}</div>;
    } else if (f.type === 'Number' || ['withinLastDays', 'withinNextDays'].includes(rule.operator)) {
      input = <input className="input rb-rule-num" type="number" aria-label={`${f.label} value`} value={rule.value === undefined ? '' : String(rule.value)} onChange={e => onChange({ ...rule, value: e.target.value === '' ? undefined : Number(e.target.value) })} />;
    } else if (f.type === 'Date') {
      input = <input className="input" type="date" aria-label={`${f.label} value (UTC day)`} value={typeof rule.value === 'string' ? rule.value.slice(0, 10) : ''} onChange={e => onChange({ ...rule, value: e.target.value || undefined })} />;
    } else {
      input = <input className="input" aria-label={`${f.label} value`} maxLength={200} value={(rule.value as string) ?? ''} onChange={e => onChange({ ...rule, value: e.target.value })} />;
    }
  }
  return (
    <div className="rb-rule">
      <select className="input" aria-label="Field" value={f.key} onChange={e => setField(e.target.value)}>
        {fields.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
      </select>
      <select className="input" aria-label="Operator" value={rule.operator} onChange={e => onChange({ ...rule, operator: e.target.value, value: f.type === 'Enum' ? rule.value : ['withinLastDays', 'withinNextDays'].includes(e.target.value) ? 7 : f.type === 'Date' ? undefined : rule.value })}>
        {f.operators.map(o => <option key={o} value={o}>{OP_LABEL[o] ?? o}</option>)}
      </select>
      {input}
      <button type="button" className="linkbtn err" aria-label={`Remove condition on ${f.label}`} onClick={onRemove}>Remove</button>
    </div>
  );
}

function GroupEditor({ group, fields, depth, maxDepth, onChange, onRemove, statusLabel }: {
  group: Group; fields: FieldMeta[]; depth: number; maxDepth: number; onChange: (g: Group) => void; onRemove?: () => void; statusLabel: (s: string) => string;
}) {
  const set = (i: number, n: Rule | Group | null) => onChange({ ...group, rules: n === null ? group.rules.filter((_, j) => j !== i) : group.rules.map((r, j) => j === i ? n : r) });
  const first = fields[0];
  return (
    <div className={`rb-group depth-${depth}`} role="group" aria-label={`Condition group, ${group.op.toUpperCase()}`}>
      <div className="rb-group-head">
        <span className="seg" role="radiogroup" aria-label="Combine conditions with">
          {(['and', 'or'] as const).map(op => <button key={op} type="button" role="radio" aria-checked={group.op === op} aria-pressed={group.op === op} onClick={() => onChange({ ...group, op })}>{op === 'and' ? 'All (AND)' : 'Any (OR)'}</button>)}
        </span>
        {onRemove && <button type="button" className="linkbtn err" onClick={onRemove}>Remove group</button>}
      </div>
      {group.rules.length === 0 && <p className="hint">No conditions in this group.</p>}
      {group.rules.map((r, i) => (
        <div key={i} className="rb-group-item">
          {i > 0 && <span className="rb-join" aria-hidden="true">{group.op.toUpperCase()}</span>}
          {isGroup(r)
            ? <GroupEditor group={r} fields={fields} depth={depth + 1} maxDepth={maxDepth} onChange={g => set(i, g)} onRemove={() => set(i, null)} statusLabel={statusLabel} />
            : <RuleEditor rule={r} fields={fields} onChange={n => set(i, n)} onRemove={() => set(i, null)} statusLabel={statusLabel} />}
        </div>
      ))}
      <div className="rb-group-actions">
        <button type="button" className="btn btn-sm" onClick={() => onChange({ ...group, rules: [...group.rules, { field: first.key, operator: first.operators[0], value: first.type === 'Enum' ? [] : undefined }] })}>+ Condition</button>
        {depth < maxDepth && <button type="button" className="btn btn-sm" onClick={() => onChange({ ...group, rules: [...group.rules, { op: group.op === 'and' ? 'or' : 'and', rules: [] }] })}>+ Group</button>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ columns ------------------------------------------------------------------ */

function ColumnPicker({ fields, value, onChange, max }: { fields: FieldMeta[]; value: string[]; onChange: (v: string[]) => void; max: number }) {
  const [q, setQ] = useState('');
  const [drag, setDrag] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const listRef = useRef<HTMLOListElement>(null);
  const term = q.trim().toLowerCase();
  const byKey = new Map(fields.map(f => [f.key, f]));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const n = [...value];
    const [x] = n.splice(from, 1);
    n.splice(to, 0, x);
    onChange(n);
    setAnnounce(`${byKey.get(x)?.label} moved to position ${to + 1} of ${n.length}.`);
    requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLElement>('li')[to]?.focus());
  };
  const cats = [...new Set(fields.map(f => f.category))];
  return (
    <div className="rb-cols">
      <div className="rb-cols-lib">
        <label className="rc-search"><Icon name="search" size={16} /><span className="sr">Search columns</span>
          <input className="input" type="search" placeholder="Search columns" value={q} onChange={e => setQ(e.target.value)} /></label>
        <div className="rb-cols-scroll">
          {cats.map(c => {
            const items = fields.filter(f => f.category === c && (!term || `${f.label} ${f.description}`.toLowerCase().includes(term)));
            if (items.length === 0) return null;
            return (
              <fieldset key={c} className="rb-cols-cat"><legend>{c}</legend>
                {items.map(f => (
                  <label key={f.key} className="check" title={f.description}>
                    <input type="checkbox" checked={value.includes(f.key)} disabled={f.required || (!value.includes(f.key) && value.length >= max)}
                      onChange={e => onChange(e.target.checked ? [...value, f.key] : value.filter(k => k !== f.key))} /> {f.label}{f.required && <span className="muted"> (required)</span>}
                  </label>
                ))}
              </fieldset>
            );
          })}
        </div>
      </div>
      <div className="rb-cols-sel">
        <div className="rb-cols-sel-head"><b>Selected columns ({value.length})</b><span className="hint">Drag, or focus a row and press Alt+↑/↓</span></div>
        <ol ref={listRef} className="rb-cols-list" aria-label="Selected columns in export order">
          {value.map((k, i) => {
            const f = byKey.get(k);
            return (
              <li key={k} tabIndex={0} draggable aria-label={`${f?.label ?? k}, position ${i + 1} of ${value.length}`} className={drag === i ? 'dragging' : ''}
                onDragStart={e => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDrag(null)}
                onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); }}
                onKeyDown={e => { if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1); } if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1); } }}>
                <span className="rb-grip" aria-hidden="true">⋮⋮</span>
                <span className="rb-col-name">{f?.label ?? k}</span>
                <span className="rc-move">
                  <button type="button" className="linkbtn" aria-label={`Move ${f?.label} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
                  <button type="button" className="linkbtn" aria-label={`Move ${f?.label} down`} disabled={i === value.length - 1} onClick={() => move(i, i + 1)}>↓</button>
                  {!f?.required && <button type="button" className="linkbtn" aria-label={`Remove column ${f?.label}`} onClick={() => onChange(value.filter(x => x !== k))}>×</button>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="rb-cols-actions">
          <button type="button" className="btn btn-sm" onClick={() => onChange([...DEFAULT_COLUMNS])}>Reset to default</button>
          <button type="button" className="btn btn-sm" onClick={() => onChange([...new Set([...value, ...fields.map(f => f.key)])].slice(0, max))}>Select all</button>
        </div>
        <span className="sr" aria-live="polite">{announce}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ dialogs ------------------------------------------------------------------ */

function SaveDialog({ definition, saved, asNew, teams, onClose, onSaved }: {
  definition: Definition; saved: Saved | null; asNew: boolean; teams: Opt[]; onClose: () => void; onSaved: (id: number, revision: number, name: string) => void;
}) {
  const users = useAssignable();
  const me = useMe().data!;
  const toast = useToast();
  const editing = saved && !asNew && saved.isOwner;
  const [name, setName] = useState(asNew && saved ? `Copy of ${saved.name}` : saved?.name ?? '');
  const [description, setDescription] = useState(saved?.description ?? '');
  const [visibility, setVisibility] = useState(editing ? saved!.visibility : 'Private');
  const [teamId, setTeamId] = useState(String((editing && saved!.teamId) || teams[0]?.id || ''));
  const [shares, setShares] = useState<string[]>(editing ? saved!.shares.map(s => String(s.id)) : []);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError(null);
    const body = { name, description, visibility, teamId: visibility === 'Team' ? Number(teamId) : null, shareUserIds: visibility === 'Shared' ? shares.map(Number) : [], definition, revision: saved?.revision };
    try {
      const r = editing ? await api<{ id: number; revision: number }>(`/reporting/report-definitions/${saved!.id}`, { method: 'PUT', body })
        : await post<{ id: number; revision: number }>('/reporting/report-definitions', body);
      toast(editing ? 'Report saved.' : 'Report saved as a new report.');
      onSaved(r.id, r.revision, name.trim());
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog title={editing ? 'Save report configuration' : 'Save as a new report'} onClose={onClose}>
      {error && <div className="notice error" role="alert">{error.status === 409 ? 'The report was changed in another tab or session. Reload it, or use “Save as new”.' : error.summary}</div>}
      <div className="form-grid">
        <TextInput label="Report name" required value={name} onChange={setName} maxLength={120} error={error?.field('name')} wide />
        <TextInput label="Description" multiline value={description} onChange={setDescription} maxLength={1000} error={error?.field('description')} wide />
      </div>
      <fieldset className="rb-visibility">
        <legend className="flabel">Visibility</legend>
        {[['Private', 'Private (only me)'], ['Team', 'Team (members of one of my teams)'], ['Shared', 'Shared (selected people)']].map(([v, l]) => (
          <label key={v} className="check"><input type="radio" name="rb-vis" checked={visibility === v} disabled={v === 'Team' && teams.length === 0} onChange={() => setVisibility(v)} /> {l}{v === 'Team' && teams.length === 0 && <span className="muted"> — you belong to no team</span>}</label>
        ))}
        {visibility === 'Team' && <SelectInput label="Team" value={teamId} onChange={setTeamId} options={teams.map(t => ({ value: String(t.id), label: t.label }))} empty={null} error={error?.field('teamId')} />}
        {visibility === 'Shared' && <MultiPick label="Share with" options={(users.data ?? []).filter(u => u.id !== me.id).map(u => ({ value: String(u.id), label: u.name }))} value={shares} onChange={setShares} all="Nobody yet" />}
        {error?.field('shareUserIds') && <div className="err">{error.field('shareUserIds')}</div>}
        <p className="hint">People you share with can run, duplicate and favorite the report; only you can change it. Each person sees only the cases their own access allows.</p>
      </fieldset>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !name.trim()} onClick={submit}>{busy ? 'Saving…' : editing ? 'Save report' : 'Save as new'}</button></div>
    </Dialog>
  );
}

function ExportDialog({ format, definition, savedId, total, cutoff, zone, limits, defaultName, onClose, onQueued }: {
  format: 'xlsx' | 'pdf'; definition: Definition; savedId: number | null; total: number; cutoff: string; zone: string; limits: Meta['limits']; defaultName: string;
  onClose: () => void; onQueued: (j: ExportJob) => void;
}) {
  const [fileName, setFileName] = useState(defaultName);
  const [includeSummary, setSummary] = useState(true);
  const [includeFilters, setFilters] = useState(true);
  const [includeMetadata, setMetadata] = useState(true);
  const [pdfMode, setPdfMode] = useState(total <= limits.pdfMaxRows ? 'detailed' : 'summary');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useMemo(newKey, []);
  const tooBigForDetail = total > limits.pdfMaxRows;
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const j = await api<ExportJob>('/reporting/exports', { method: 'POST', headers: { 'Idempotency-Key': key },
        body: { definition, savedReportId: savedId, format, timeZone: zone, cutoff, options: { fileName, includeSummary, includeFilters, includeMetadata, pdfMode } } });
      onQueued(j);
    } catch (e) { setError(apiError(e)?.summary ?? 'The export could not be started.'); } finally { setBusy(false); }
  };
  return (
    <Dialog title={format === 'xlsx' ? 'Export to Excel (.xlsx)' : 'Export to PDF'} onClose={onClose}>
      <p className="hint">{total.toLocaleString()} case(s) · data as of {fmtDateTime(cutoff, zone)} ({zone}). The file is generated in the background and kept for {limits.retentionDays} days; only you can download it, and the export is audited.</p>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="form-grid"><div className="field wide"><label htmlFor="rb-file">File name</label>
        <div className="rb-file"><input id="rb-file" className="input" value={fileName} maxLength={100} onChange={e => setFileName(e.target.value)} /><span className="muted">.{format}</span></div></div></div>
      {format === 'xlsx' ? (
        <fieldset className="rb-opts"><legend className="flabel">Include in the workbook</legend>
          <label className="check"><input type="checkbox" checked disabled /> Cases Data sheet (typed cells, filters, frozen header)</label>
          <label className="check"><input type="checkbox" checked={includeSummary} onChange={e => setSummary(e.target.checked)} /> Summary sheet (totals by status, priority, SLA, grouping)</label>
          <label className="check"><input type="checkbox" checked={includeFilters} onChange={e => setFilters(e.target.checked)} /> Applied Filters sheet</label>
          <label className="check"><input type="checkbox" checked={includeMetadata} onChange={e => setMetadata(e.target.checked)} /> Metadata sheet (generated by, time zone, column definitions)</label>
        </fieldset>
      ) : (
        <fieldset className="rb-opts"><legend className="flabel">PDF layout</legend>
          <label className="check"><input type="radio" name="rb-pdf" checked={pdfMode === 'summary'} onChange={() => setPdfMode('summary')} /> Management summary (one page: counts, status, priority and SLA charts, filters)</label>
          <label className="check"><input type="radio" name="rb-pdf" checked={pdfMode === 'detailed'} disabled={tooBigForDetail} onChange={() => setPdfMode('detailed')} /> Summary and detailed case table</label>
          {tooBigForDetail && <p className="hint">A detailed PDF holds at most {limits.pdfMaxRows.toLocaleString()} rows; use Excel for the full table.</p>}
        </fieldset>
      )}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !fileName.trim()} onClick={submit}>{busy ? 'Starting…' : 'Export now'}</button></div>
    </Dialog>
  );
}

export function BuilderScheduleDialog({ savedId, savedName, edit, onClose, onDone }: {
  savedId: number; savedName: string; edit?: { id: number; name: string; format: string; frequency: string; dayOfWeek?: number | null; dayOfMonth?: number | null; time: string; timeZone: string; recipients: { id: number; name: string }[]; isActive: boolean; pdfMode?: string | null };
  onClose: () => void; onDone: () => void;
}) {
  const me = useMe().data!;
  const toast = useToast();
  const users = useAssignable();
  const [v, setV] = useState({ name: edit?.name ?? savedName, format: edit?.format ?? 'xlsx', pdfMode: edit?.pdfMode ?? 'summary', frequency: edit?.frequency ?? 'Weekly',
    dayOfWeek: String(edit?.dayOfWeek ?? 1), dayOfMonth: String(edit?.dayOfMonth ?? 1), time: edit?.time ?? '07:00', timeZone: edit?.timeZone ?? me.timeZone ?? 'Asia/Dubai' });
  const [recipients, setRecipients] = useState<string[]>(edit?.recipients.map(r => String(r.id)) ?? [String(me.id)]);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setError(null);
    const body = { savedReportId: savedId, name: v.name, format: v.format, options: { pdfMode: v.pdfMode }, frequency: v.frequency, dayOfWeek: Number(v.dayOfWeek), dayOfMonth: Number(v.dayOfMonth),
      time: v.time, timeZone: v.timeZone, recipientIds: recipients.map(Number), isActive: edit?.isActive ?? true };
    try {
      if (edit) await api(`/reporting/schedules/${edit.id}`, { method: 'PATCH', body }); else await post('/reporting/schedules', body);
      toast(edit ? 'Schedule saved.' : 'Schedule created.');
      onDone();
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  };
  const people = [{ value: String(me.id), label: `${me.displayName} (me)` }, ...(users.data ?? []).filter(u => u.id !== me.id).map(u => ({ value: String(u.id), label: u.name }))];
  return (
    <Dialog title={edit ? 'Edit scheduled report' : `Schedule “${savedName}”`} onClose={onClose} wide>
      <div className="notice">Each run queues one file per recipient, generated with that recipient's own access at run time, and tells them in the hub's notifications (the hub sends no e-mail). A recipient who no longer has the Export permission gets a failed run, not a file.</div>
      {error && <div className="notice error" role="alert">{error.summary}</div>}
      <div className="form-grid">
        <TextInput label="Name" required value={v.name} onChange={x => setV({ ...v, name: x })} error={error?.field('name')} maxLength={120} />
        <SelectInput label="Format" required value={v.format} onChange={x => setV({ ...v, format: x })} options={[{ value: 'xlsx', label: 'Excel (.xlsx)' }, { value: 'pdf', label: 'PDF' }]} empty={null} />
        {v.format === 'pdf' && <SelectInput label="PDF layout" value={v.pdfMode} onChange={x => setV({ ...v, pdfMode: x })} options={[{ value: 'summary', label: 'Management summary' }, { value: 'detailed', label: 'Summary and details' }]} empty={null} />}
        <SelectInput label="Frequency" required value={v.frequency} onChange={x => setV({ ...v, frequency: x })} options={['Daily', 'Weekly', 'Monthly'].map(x => ({ value: x, label: x }))} empty={null} error={error?.field('frequency')} />
        {v.frequency === 'Weekly' && <SelectInput label="On" required value={v.dayOfWeek} onChange={x => setV({ ...v, dayOfWeek: x })} options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))} empty={null} />}
        {v.frequency === 'Monthly' && <SelectInput label="Day of the month" required value={v.dayOfMonth} onChange={x => setV({ ...v, dayOfMonth: x })} options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} empty={null} hint="1–28, so every month has the day." />}
        <TextInput label="Time" required type="time" value={v.time} onChange={x => setV({ ...v, time: x })} error={error?.field('time')} />
        <TimeZoneSelect label="Time zone" required value={v.timeZone} onChange={x => setV({ ...v, timeZone: x })} error={error?.field('timeZone')} />
      </div>
      <MultiPick label="Recipients" options={people} value={recipients} onChange={setRecipients} all="Nobody" />
      {error?.field('recipientIds') && <div className="err">{error.field('recipientIds')}</div>}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || recipients.length === 0} onClick={save}>{busy ? 'Saving…' : edit ? 'Save schedule' : 'Create schedule'}</button></div>
    </Dialog>
  );
}

/** One export started from the builder: live status while queued/processing, then download, error or retry. */
function JobCard({ job, onDismiss }: { job: ExportJob; onDismiss: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useJob(job.id, job);
  const j = q.data ?? job;
  const done = TERMINAL.includes(j.status);
  useEffect(() => { if (done) { void qc.invalidateQueries({ queryKey: ['report-history'] }); void qc.invalidateQueries({ queryKey: ['rc-overview'] }); } }, [done, qc]);
  const cancel = async () => { try { await post(`/reporting/exports/${j.id}/cancel`); await q.refetch(); } catch (e) { toast(apiError(e)?.summary ?? 'The export could not be cancelled.', true); } };
  return (
    <div className={`rb-job ${j.status.toLowerCase()}`} role="status" aria-live="polite">
      <Badge tone={j.status === 'Completed' ? 'good' : j.status === 'Failed' ? 'bad' : done ? 'neutral' : 'info'}>{j.status}</Badge>
      <div className="rb-job-text">
        <b>{j.fileName ?? `${j.reportName} · ${j.format.toUpperCase()}`}</b>
        <div className="hint">{j.status === 'Completed' ? `${j.rowCount?.toLocaleString()} row(s) · ${size(j.fileSize)} · kept until ${fmtDateTime(j.expiresAt)}`
          : j.status === 'Failed' || j.status === 'Cancelled' ? j.error : j.status === 'Processing' ? 'Generating the file…' : 'Queued — it starts in a moment.'}</div>
      </div>
      {!done && <span className="spin" aria-hidden="true" />}
      {j.canDownload && <button className="btn btn-primary btn-sm" onClick={() => download(j, toast)}><Icon name="download" size={14} /> Download</button>}
      {j.canCancel && <button className="btn btn-sm" onClick={cancel}>Cancel</button>}
      <Link className="linkbtn" to={`/reporting-center/history?export=${j.id}`}>History</Link>
      {done && <button className="linkbtn" aria-label="Dismiss" onClick={onDismiss}>×</button>}
    </div>
  );
}

/* ------------------------------------------------------------------ preview ------------------------------------------------------------------ */

function MiniBars({ title, data, order, text, tone }: { title: string; data: Record<string, number>; order: string[]; text: (k: string) => string; tone: (k: string) => string }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const keys = [...order.filter(k => data[k]), ...Object.keys(data).filter(k => !order.includes(k))];
  return (
    <div className="rb-mini"><h3>{title}</h3>
      {total === 0 ? <span className="hint">—</span> : (
        <ul>{keys.map(k => <li key={k}><span className="rb-mini-l">{text(k)}</span><span className="rb-mini-bar" aria-hidden="true"><span className={`tone-${tone(k)}`} style={{ width: `${Math.max(2, (data[k] / total) * 100)}%` }} /></span>
          <span className="rb-mini-v">{data[k].toLocaleString()}</span></li>)}</ul>)}
    </div>
  );
}

/* -------------------------------------------------------------------- page -------------------------------------------------------------------- */

export function CasesBuilder() {
  const toast = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const statusLabel = useEnumLabel('CaseStatus');
  const meta = useMeta();
  const opts = useFilterOptions();
  const [zone, setZone] = useReportZone();
  // A template applies before the first preview; a saved report is loaded first (no preview of a default configuration meanwhile).
  const [def, setDef] = useState<Definition>(() => TEMPLATES.find(t => t.key === params.get('template'))?.definition() ?? emptyDefinition());
  const [ready, setReady] = useState(() => !params.get('report'));
  const [baseline, setBaseline] = useState<string>(JSON.stringify(clean(emptyDefinition())));
  const [saved, setSaved] = useState<Saved | null>(null);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dialog, setDialog] = useState<null | 'save' | 'saveAs' | 'xlsx' | 'pdf' | 'schedule'>(null);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const reportId = params.get('report');
  const template = params.get('template');

  // Open a saved report (?report=id) or a template (?template=key).
  useEffect(() => {
    let stop = false;
    if (reportId) {
      get<{ report: Saved; definition: Definition; warnings: string[] }>(`/reporting/report-definitions/${reportId}`).then(r => {
        if (stop) return;
        const d = { ...emptyDefinition(), ...r.definition, filters: { dateField: 'createdAt', ...r.definition.filters }, sort: r.definition.sort ?? [], columns: r.definition.columns?.length ? r.definition.columns : [...DEFAULT_COLUMNS] };
        setDef(d); setBaseline(JSON.stringify(clean(d))); setSaved(r.report); setLoadWarnings(r.warnings); setPage(1); setReady(true);
      }).catch(e => { if (!stop) { toast(apiError(e)?.summary ?? 'The saved report could not be opened.', true); setReady(true); setParams({}, { replace: true }); } });
    } else if (template) {
      const t = TEMPLATES.find(x => x.key === template);
      if (t) { const d = t.definition(); setDef(d); setBaseline(JSON.stringify(clean(emptyDefinition()))); setSaved(null); setLoadWarnings([]); setPage(1); }
    }
    return () => { stop = true; };
  }, [reportId, template]); // eslint-disable-line react-hooks/exhaustive-deps

  const cleaned = useMemo(() => clean(def), [def]);
  const dirty = JSON.stringify(cleaned) !== baseline;
  useLeaveGuard(dirty && !!saved);
  const debounced = useDebounced(cleaned, 500);
  useEffect(() => setPage(1), [debounced]);
  const preview = useQuery({
    queryKey: ['rb-preview', debounced, page, pageSize, zone],
    // A changed configuration replaces the query, so React Query aborts the stale request (the signal reaches fetch).
    queryFn: ({ signal }) => api<Preview>('/reporting/reports/cases/preview', { method: 'POST', body: { definition: debounced, page, pageSize, timeZone: zone }, signal }),
    // Only settled configurations are previewed (never the transient state while a saved report or template is applied).
    enabled: meta.isSuccess && ready && JSON.stringify(debounced) === JSON.stringify(cleaned),
    placeholderData: keepPreviousData, retry: false
  });
  const pending = JSON.stringify(debounced) !== JSON.stringify(cleaned) || preview.isFetching;

  const setF = (patch: Partial<Filters>) => setDef(d => ({ ...d, filters: { ...d.filters, ...patch } }));
  const f = def.filters;
  if (meta.isLoading || opts.isLoading) return <StateMessage kind="loading" />;
  if (meta.error) return <StateMessage kind={apiError(meta.error)?.status === 403 ? 'restricted' : 'error'}>{apiError(meta.error)?.summary}</StateMessage>;
  const m = meta.data!;
  const o = opts.data ?? { clients: [], teams: [], products: [], environments: [], owners: [], types: [], myTeams: [] };
  const fields = m.fields;
  const condFields = fields.filter(x => x.filterable);
  const p = preview.data;
  const err = apiError(preview.error);
  const fieldErrors = err?.status === 422 ? Object.entries(err.errors) : [];
  const invalid = fieldErrors.length > 0;
  const statusOptions = m.statuses.map(s => ({ value: s, label: statusLabel(s) }));
  const envOptions = o.environments.filter(e => !f.clientIds?.length || f.clientIds.includes(e.clientId!)).map(e => ({ value: String(e.id), label: e.label, sub: e.sub }));
  const ids = (v?: number[]) => (v ?? []).map(String);
  const nums = (v: string[]) => v.map(Number);
  const myTeams = o.teams.filter(t => o.myTeams.includes(Number(t.id)));
  const exportBlocked = !p || pending || invalid || !p.exportable;
  const exportReason = !p ? 'The preview is loading.' : invalid ? 'Fix the configuration first.' : p.total === 0 ? 'No cases match: nothing to export.' : p.total > p.limits.maxRows ? `More than ${p.limits.maxRows.toLocaleString()} rows: narrow the filters.` : pending ? 'Waiting for the preview to refresh.' : undefined;

  // Chips for the filters in force, each removable (the server summary is shown in the preview header as well).
  const chips: { key: string; text: string; remove: () => void }[] = [];
  const nameOf = (list: Opt[], id: number | string) => list.find(x => String(x.id) === String(id))?.label ?? `#${id}`;
  if (f.datePreset || f.dateRange?.fromDay || f.dateRange?.toDay) chips.push({ key: 'date', text: `${m.dateFields.find(d => d.key === (f.dateField ?? 'createdAt'))?.label}: ${f.datePreset ? PRESET_LABEL[f.datePreset] : `${f.dateRange?.fromDay ?? '…'} – ${f.dateRange?.toDay ?? '…'}`}`, remove: () => setF({ datePreset: undefined, dateRange: undefined }) });
  if (f.clientIds?.length) chips.push({ key: 'client', text: `Client: ${f.clientIds.map(id => nameOf(o.clients, id)).join(', ')}`, remove: () => setF({ clientIds: [], environmentIds: [] }) });
  if (f.statuses?.length) chips.push({ key: 'status', text: `Status: ${f.statuses.map(statusLabel).join(', ')}`, remove: () => setF({ statuses: [] }) });
  if (f.priorities?.length) chips.push({ key: 'priority', text: `Priority: ${f.priorities.join(', ')}`, remove: () => setF({ priorities: [] }) });
  if (f.slaStatuses?.length) chips.push({ key: 'sla', text: `SLA: ${f.slaStatuses.map(s => SLA_LABEL[s]).join(', ')}`, remove: () => setF({ slaStatuses: [] }) });
  if (f.ownerIds?.length || f.unassigned) chips.push({ key: 'owner', text: `Owner: ${[...(f.ownerIds ?? []).map(id => nameOf(o.owners, id)), ...(f.unassigned ? ['Unassigned'] : [])].join(', ')}`, remove: () => setF({ ownerIds: [], unassigned: undefined }) });
  if (f.teamIds?.length) chips.push({ key: 'team', text: `Team: ${f.teamIds.map(id => nameOf(o.teams, id)).join(', ')}`, remove: () => setF({ teamIds: [] }) });
  if (f.productIds?.length) chips.push({ key: 'product', text: `Product: ${f.productIds.map(id => nameOf(o.products, id)).join(', ')}`, remove: () => setF({ productIds: [] }) });
  if (f.environmentIds?.length) chips.push({ key: 'env', text: `Environment: ${f.environmentIds.map(id => nameOf(o.environments, id)).join(', ')}`, remove: () => setF({ environmentIds: [] }) });
  if (f.types?.length) chips.push({ key: 'type', text: `Type: ${f.types.map(t => nameOf(o.types, t)).join(', ')}`, remove: () => setF({ types: [] }) });
  if (f.due) chips.push({ key: 'due', text: `Due: ${DUE_LABEL[f.due]}`, remove: () => setF({ due: undefined }) });
  if (f.scope) chips.push({ key: 'scope', text: `Scope: ${f.scope}`, remove: () => setF({ scope: undefined }) });
  if (f.waiting !== undefined) chips.push({ key: 'waiting', text: f.waiting ? 'Waiting only' : 'Not waiting', remove: () => setF({ waiting: undefined }) });
  if (f.ageMin !== undefined || f.ageMax !== undefined) chips.push({ key: 'age', text: `Age: ${f.ageMin ?? 0}–${f.ageMax ?? '…'} days`, remove: () => setF({ ageMin: undefined, ageMax: undefined }) });
  if (f.jira) chips.push({ key: 'jira', text: f.jira === 'linked' ? 'Has Jira reference' : 'No Jira reference', remove: () => setF({ jira: undefined }) });
  if (f.jiraKey) chips.push({ key: 'jiraKey', text: `Jira key: ${f.jiraKey}`, remove: () => setF({ jiraKey: undefined }) });
  if (f.q) chips.push({ key: 'q', text: `Search: “${f.q}”`, remove: () => setF({ q: undefined }) });
  if (countRules(f.conditions)) chips.push({ key: 'cond', text: `${countRules(f.conditions)} advanced condition(s)`, remove: () => setF({ conditions: undefined }) });

  const display = (col: Preview['columns'][number], v: unknown, id: number, clientId?: number | null): ReactNode => {
    if (v === null || v === undefined || v === '') return <span className="muted">—</span>;
    // A71: the client columns show the client's logo (from the shared logo lookup; no request per row).
    if ((col.key === 'clientCode' || col.key === 'clientName') && clientId) return <ClientDisplay id={clientId} code={String(v)} link={false} />;
    if (col.key === 'caseId') return <Link to={`/cases/${id}`}>{String(v)}</Link>;
    if (Array.isArray(v)) return v.join(' ');
    if (col.type === 'Bool') return v ? 'Yes' : 'No';
    if (col.type === 'Date') return <span className="nowrap">{fmtDateTime(String(v), zone)}</span>;
    if (col.key === 'status') return statusLabel(String(v));
    if (col.key === 'priority') return <Badge tone={PRIORITY_TONE[String(v)] ?? 'neutral'}>{String(v)}</Badge>;
    if (col.key === 'slaStatus') return <Badge tone={SLA_TONE[String(v)] ?? 'neutral'}>{SLA_LABEL[String(v)] ?? String(v)}</Badge>;
    if (col.key === 'responseSla' || col.key === 'resolutionSla' || col.key === 'scope' || col.key === 'waitingReason') return label(String(v));
    if (col.key === 'type') return nameOf(o.types, String(v)).replace(/^#/, '');
    return String(v);
  };
  const tableColumns: Column<{ id: number; cells: unknown[]; clientId?: number | null }>[] = (p?.columns ?? []).map((c, i) => ({
    key: c.key, header: c.label, className: c.type === 'Number' ? 'num' : undefined, maxWidth: c.key === 'title' || c.key === 'nextAction' ? '22rem' : undefined,
    priority: i < 2 || c.key === 'status' ? 'primary' : 'secondary', render: r => display(c, r.cells[i], r.id, r.clientId)
  }));
  const resetAll = () => { setDef(saved ? JSON.parse(baseline) : emptyDefinition()); setConfirmReset(false); };
  const startNew = () => { setParams({}, { replace: false }); setDef(emptyDefinition()); setBaseline(JSON.stringify(clean(emptyDefinition()))); setSaved(null); setLoadWarnings([]); };
  const sortable = fields.filter(x => x.sortable);
  const fromIdx = p ? (p.page - 1) * p.pageSize + 1 : 0;
  const toIdx = p ? Math.min(p.total, p.page * p.pageSize) : 0;
  const lastPage = p ? Math.max(1, Math.ceil(p.total / p.pageSize)) : 1;

  return (
    <div className="rb">
      <div className="rb-config" aria-label="Report configuration">
        <div className="rb-config-head">
          <div>
            <h2>{saved ? saved.name : 'New cases report'}{dirty && saved && <span className="rb-dirty"> · unsaved changes</span>}</h2>
            <p className="hint">{saved ? `${saved.visibility}${saved.team ? ` · ${saved.team}` : ''}${!saved.isOwner ? ` · by ${saved.owner} (read-only: “Save as new” makes your copy)` : ''}` : template ? `From template “${TEMPLATES.find(t => t.key === template)?.name}”` : 'Filter, choose columns and sort; the preview updates as you go.'}</p>
          </div>
          <div className="rb-config-tools">
            <SavedPicker current={saved?.id ?? null} onPick={id => { if (dirty && !window.confirm('Discard the unsaved changes and open another report?')) return; setParams({ report: String(id) }); }} />
            {(saved || template) && <button className="btn btn-sm" onClick={() => { if (dirty && !window.confirm('Discard the unsaved changes and start a new report?')) return; startNew(); }}>New</button>}
          </div>
        </div>
        {loadWarnings.length > 0 && <div className="notice warn" role="status">{loadWarnings.map(w => <div key={w}>{w}</div>)}</div>}

        <details className="rb-sec" open>
          <summary>1 · Filters {chips.length > 0 && <span className="rb-count">{chips.length}</span>}</summary>
          <div className="rb-sec-body">
            <MultiPick label="Client" options={o.clients.map(c => ({ value: String(c.id), label: c.label, sub: c.sub, icon: <ClientLogo clientId={Number(c.id)} code={c.label} name={c.sub} size="xs" decorative /> }))} value={ids(f.clientIds)} all="All authorized clients"
              onChange={v => setF({ clientIds: nums(v), environmentIds: (f.environmentIds ?? []).filter(e => { const env = o.environments.find(x => x.id === e); return !v.length || (env && v.includes(String(env.clientId))); }) })} />
            <div className="rb-row3">
              <SelectInput label="Date field" value={f.dateField ?? 'createdAt'} onChange={v => setF({ dateField: v })} options={m.dateFields.map(d => ({ value: d.key, label: d.label }))} empty={null} />
              <SelectInput label="Date range" value={f.datePreset ?? (f.dateRange ? 'custom' : '')} empty="Any time"
                onChange={v => v === 'custom' ? setF({ datePreset: undefined, dateRange: { fromDay: '', toDay: '' } }) : setF({ datePreset: v || undefined, dateRange: undefined })}
                options={[...m.datePresets.map(x => ({ value: x, label: PRESET_LABEL[x] ?? x })), { value: 'custom', label: 'Custom range…' }]} />
            </div>
            {f.dateRange && <div className="rb-row3">
              <TextInput label="From (day)" type="date" value={f.dateRange.fromDay ?? ''} onChange={v => setF({ dateRange: { ...f.dateRange, fromDay: v } })} />
              <TextInput label="To (day, inclusive)" type="date" value={f.dateRange.toDay ?? ''} onChange={v => setF({ dateRange: { ...f.dateRange, toDay: v } })} />
            </div>}
            {p && (p.dateRange.from || p.dateRange.toExclusive) && <p className="hint rb-range">Resolved in {zone}: {p.dateRange.from ? fmtDateTime(p.dateRange.from, zone) : '…'} to before {p.dateRange.toExclusive ? fmtDateTime(p.dateRange.toExclusive, zone) : '…'} (stored in UTC).</p>}
            <ChipPick label="Case status" options={statusOptions} value={f.statuses ?? []} onChange={v => setF({ statuses: v })} />
            <div className="rb-quick"><button type="button" className="linkbtn" onClick={() => setF({ statuses: [...OPEN_STATUSES] })}>Open statuses only</button></div>
            <ChipPick label="Priority" options={m.priorities.map(x => ({ value: x, label: x }))} value={f.priorities ?? []} onChange={v => setF({ priorities: v })} />
            <ChipPick label="SLA status" options={m.slaStatuses.map(x => ({ value: x, label: SLA_LABEL[x] ?? x }))} value={f.slaStatuses ?? []} onChange={v => setF({ slaStatuses: v })} />
            <MultiPick label="Owner" options={o.owners.map(u => ({ value: String(u.id), label: u.label, sub: u.active === false ? 'deactivated' : undefined }))} value={ids(f.ownerIds)} onChange={v => setF({ ownerIds: nums(v) })} all={f.unassigned ? 'Unassigned only' : 'Anyone'}
              extra={<label className="check mp-opt"><input type="checkbox" checked={!!f.unassigned} onChange={e => setF({ unassigned: e.target.checked || undefined })} /> Unassigned</label>} />
            <TextInput label="Search: case ID, title, next action or Jira key" value={f.q ?? ''} onChange={v => setF({ q: v || undefined })} maxLength={200} />
            <details className="rb-more" open={!!(f.teamIds?.length || f.productIds?.length || f.environmentIds?.length || f.types?.length || f.due || f.scope || f.waiting !== undefined || f.ageMin !== undefined || f.ageMax !== undefined || f.jira || f.jiraKey) || undefined}>
              <summary>More filters</summary>
              <MultiPick label="Team" options={o.teams.map(t => ({ value: String(t.id), label: t.label }))} value={ids(f.teamIds)} onChange={v => setF({ teamIds: nums(v) })} all="All teams" />
              <MultiPick label="Product" options={o.products.map(x => ({ value: String(x.id), label: x.label, sub: x.sub }))} value={ids(f.productIds)} onChange={v => setF({ productIds: nums(v) })} all="All products" />
              <MultiPick label="Environment" options={envOptions} value={ids(f.environmentIds)} onChange={v => setF({ environmentIds: nums(v) })} all={f.clientIds?.length ? 'All environments of the clients' : 'All environments'} />
              <MultiPick label="Case type" options={o.types.map(t => ({ value: String(t.id), label: t.label, sub: t.retired ? 'retired' : undefined }))} value={f.types ?? []} onChange={v => setF({ types: v })} all="All types" />
              <div className="rb-row3">
                <SelectInput label="Due date" value={f.due ?? ''} onChange={v => setF({ due: v || undefined })} options={m.dueOptions.map(x => ({ value: x, label: DUE_LABEL[x] ?? x }))} empty="Any" />
                <SelectInput label="Work scope" value={f.scope ?? ''} onChange={v => setF({ scope: v || undefined })} options={m.scopes.map(x => ({ value: x, label: x }))} empty="Any" />
                <SelectInput label="Waiting" value={f.waiting === undefined ? '' : String(f.waiting)} onChange={v => setF({ waiting: v === '' ? undefined : v === 'true' })} options={[{ value: 'true', label: 'Waiting only' }, { value: 'false', label: 'Not waiting' }]} empty="Any" />
              </div>
              <div className="rb-row3">
                <TextInput label="Age from (days)" type="number" value={f.ageMin === undefined ? '' : String(f.ageMin)} onChange={v => setF({ ageMin: v === '' ? undefined : Math.max(0, Number(v)) })} />
                <TextInput label="Age to (days)" type="number" value={f.ageMax === undefined ? '' : String(f.ageMax)} onChange={v => setF({ ageMax: v === '' ? undefined : Math.max(0, Number(v)) })} />
                <SelectInput label="Jira reference" value={f.jira ?? ''} onChange={v => setF({ jira: v || undefined })} options={[{ value: 'linked', label: 'Has a Jira reference' }, { value: 'notLinked', label: 'No Jira reference' }]} empty="Any" />
              </div>
              <TextInput label="Jira key (exact)" value={f.jiraKey ?? ''} onChange={v => setF({ jiraKey: v || undefined })} maxLength={40} hint="Manual references, e.g. OPS-1234 (no Jira synchronization)." />
            </details>
            <details className="rb-more" open={countRules(f.conditions) > 0 || undefined}>
              <summary>Advanced conditions {countRules(f.conditions) > 0 && <span className="rb-count">{countRules(f.conditions)}</span>}</summary>
              <p className="hint">Nested AND/OR rules over allowlisted fields (at most {m.limits.maxRules} conditions, {m.limits.maxDepth} levels). They narrow the basic filters above.</p>
              <GroupEditor group={f.conditions ?? { op: 'and', rules: [] }} fields={condFields} depth={1} maxDepth={m.limits.maxDepth} statusLabel={statusLabel}
                onChange={g => setF({ conditions: g })} />
            </details>
          </div>
        </details>

        <details className="rb-sec" open>
          <summary>2 · Columns <span className="rb-count">{def.columns.length}</span></summary>
          <div className="rb-sec-body"><ColumnPicker fields={fields} value={def.columns} max={m.limits.maxColumns} onChange={columns => setDef(d => ({ ...d, columns }))} /></div>
        </details>

        <details className="rb-sec" open>
          <summary>3 · Sort and group</summary>
          <div className="rb-sec-body">
            <ol className="rb-sorts" aria-label="Sort order">
              {def.sort.map((s, i) => (
                <li key={i}>
                  <span className="muted">{i === 0 ? 'Sort by' : 'then by'}</span>
                  <select className="input" aria-label={`Sort field ${i + 1}`} value={s.field} onChange={e => setDef(d => ({ ...d, sort: d.sort.map((x, j) => j === i ? { ...x, field: e.target.value } : x) }))}>
                    {sortable.filter(x => x.key === s.field || !def.sort.some(y => y.field === x.key)).map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </select>
                  <button type="button" className="btn btn-sm" aria-label={`Sort ${fields.find(x => x.key === s.field)?.label}: ${s.direction === 'asc' ? 'ascending' : 'descending'}. Change direction`}
                    onClick={() => setDef(d => ({ ...d, sort: d.sort.map((x, j) => j === i ? { ...x, direction: x.direction === 'asc' ? 'desc' : 'asc' } : x) }))}>{s.direction === 'asc' ? '↑ Ascending' : '↓ Descending'}</button>
                  <button type="button" className="linkbtn err" aria-label={`Remove sort ${i + 1}`} onClick={() => setDef(d => ({ ...d, sort: d.sort.filter((_, j) => j !== i) }))}>Remove</button>
                </li>
              ))}
            </ol>
            {def.sort.length < m.limits.maxSort && <button type="button" className="btn btn-sm" onClick={() => setDef(d => ({ ...d, sort: [...d.sort, { field: sortable.find(x => !d.sort.some(y => y.field === x.key))!.key, direction: 'asc' }] }))}>+ Sort field</button>}
            <p className="hint">Rows with equal values keep a stable order by Case ID, so pages never overlap.</p>
            <SelectInput label="Group by" value={def.groupBy ?? ''} onChange={v => setDef(d => ({ ...d, groupBy: v || null }))} options={fields.filter(x => x.groupable).map(x => ({ value: x.key, label: x.label }))} empty="No grouping" />
            <TimeZoneSelect label="Time zone for dates" value={zone} onChange={setZone} hint="Presets and days are calendar days in this zone; times are shown in it." />
          </div>
        </details>
      </div>

      <section className="rb-preview" aria-labelledby="rb-preview-title">
        <div className="rb-preview-head">
          <div>
            <h2 id="rb-preview-title">Preview</h2>
            <p className="hint" aria-live="polite">{p ? <>Showing {p.total === 0 ? 0 : `${fromIdx.toLocaleString()}–${toIdx.toLocaleString()}`} of <b>{p.total.toLocaleString()}</b> matching case(s) · exact count · server-side query · data as of {fmtDateTime(p.cutoff, zone)} · {p.durationMs} ms</> : 'Loading…'}</p>
          </div>
          <div className="rb-preview-tools">
            {pending && <span className="hint"><span className="spin" aria-hidden="true" /> Updating…</span>}
            <button className="btn btn-sm" onClick={() => void preview.refetch()} disabled={preview.isFetching}>Refresh</button>
          </div>
        </div>
        {chips.length > 0 ? (
          <div className="rc-chips rb-chips" aria-label="Filters in force">
            {chips.map(c => <span key={c.key} className="chip rc-chip">{c.text}<button type="button" aria-label={`Remove filter ${c.text}`} onClick={c.remove}>×</button></span>)}
            <button type="button" className="linkbtn" onClick={() => setF({ datePreset: undefined, dateRange: undefined, clientIds: [], statuses: [], priorities: [], slaStatuses: [], ownerIds: [], unassigned: undefined, teamIds: [], productIds: [], environmentIds: [], types: [], due: undefined, scope: undefined, waiting: undefined, ageMin: undefined, ageMax: undefined, jira: undefined, jiraKey: undefined, q: undefined, conditions: undefined })}>Clear all</button>
          </div>
        ) : <p className="hint">No filters: every case you are authorized to see.</p>}

        {invalid && <div className="notice error" role="alert"><b>The configuration needs attention.</b><ul>{fieldErrors.map(([k, v]) => <li key={k}>{v.join(' ')}</li>)}</ul></div>}
        {err && !invalid && (err.status === 504
          ? <StateMessage kind="error">{err.detail ?? 'The preview took too long. Narrow the filters and try again.'}</StateMessage>
          : <StateMessage kind={err.status === 403 ? 'restricted' : 'error'}>{err.summary}</StateMessage>)}
        {!err && preview.isLoading && <StateMessage kind="loading" />}
        {p && !err && <>
          {p.warnings.map(w => <div key={w} className="notice warn" role="status">{w}</div>)}
          {p.total > 0 && (
            <div className="rb-summary" aria-label="Breakdown of all matching cases">
              <MiniBars title="By status" data={p.summary.byStatus} order={m.statuses} text={statusLabel} tone={() => 'info'} />
              <MiniBars title="By priority" data={p.summary.byPriority} order={m.priorities} text={k => k} tone={k => PRIORITY_TONE[k] ?? 'neutral'} />
              <MiniBars title="By SLA status" data={p.summary.bySla} order={m.slaStatuses} text={k => SLA_LABEL[k] ?? k} tone={k => SLA_TONE[k] ?? 'neutral'} />
            </div>
          )}
          {p.groups && p.groups.length > 0 && (
            <div className="rb-groups" aria-label={`Groups by ${fields.find(x => x.key === p.groupBy)?.label}`}>
              <b>{fields.find(x => x.key === p.groupBy)?.label}:</b>
              {p.groups.slice(0, 30).map(g => <span key={g.key} className="chip">{g.key === '' ? '(none)' : p.groupBy === 'status' ? statusLabel(g.key) : p.groupBy === 'slaStatus' ? SLA_LABEL[g.key] ?? g.key : g.key} <b>{g.count}</b></span>)}
              {p.groups.length > 30 && <span className="hint">+{p.groups.length - 30} more in the export</span>}
            </div>
          )}
          {p.total === 0 ? <StateMessage kind="nomatch">No cases match this configuration. Remove a filter or widen the date range.</StateMessage> : (
            <div className={pending ? 'rb-stale' : undefined}>
              <DataTable<{ id: number; cells: unknown[]; clientId?: number | null }> caption="Cases report preview" rows={p.rows} rowKey={r => r.id} tools={false} pageSize={100} tableWrapClassName="rc-preview rb-table" columns={tableColumns} />
              <nav className="pager rb-pager" aria-label="Preview pages">
                <span>Rows {fromIdx.toLocaleString()}–{toIdx.toLocaleString()} of {p.total.toLocaleString()}</span>
                <span className="right">
                  <label>Rows per page: <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{m.limits.pageSizes.map(n => <option key={n}>{n}</option>)}</select></label>
                  <button onClick={() => setPage(1)} disabled={page <= 1} aria-label="First page">«</button>
                  <button onClick={() => setPage(page - 1)} disabled={page <= 1}>Prev</button>
                  <span>Page {p.page} of {lastPage.toLocaleString()}</span>
                  <button onClick={() => setPage(page + 1)} disabled={page >= lastPage}>Next</button>
                </span>
              </nav>
            </div>
          )}
        </>}
        {jobs.length > 0 && <div className="rb-jobs" aria-label="Exports started here">{jobs.map(j => <JobCard key={j.id} job={j} onDismiss={() => setJobs(js => js.filter(x => x.id !== j.id))} />)}</div>}
      </section>

      <div className="rb-footer" role="toolbar" aria-label="Report actions">
        <span className="hint rb-footer-state">{exportReason ?? `${p?.total.toLocaleString()} case(s) ready to export · max ${m.limits.maxRows.toLocaleString()} rows · files kept ${m.limits.retentionDays} days`}</span>
        <button className="btn" onClick={() => dirty ? setConfirmReset(true) : resetAll()} disabled={!dirty}>{saved ? 'Revert changes' : 'Reset'}</button>
        <button className="btn" onClick={() => setDialog('save')} disabled={invalid || (saved !== null && (!saved.isOwner || !dirty))} title={saved && !saved.isOwner ? 'Only the owner can change this report.' : undefined}>Save configuration</button>
        <button className="btn" onClick={() => setDialog('saveAs')} disabled={invalid}>Save as…</button>
        <button className="btn btn-primary" onClick={() => setDialog('xlsx')} disabled={exportBlocked} title={exportReason}><Icon name="excel" size={14} /> Export Excel</button>
        <button className="btn btn-primary" onClick={() => setDialog('pdf')} disabled={exportBlocked} title={exportReason}><Icon name="download" size={14} /> Export PDF</button>
        <button className="btn" onClick={() => setDialog('schedule')} disabled={!saved || dirty || invalid} title={!saved ? 'Save the report first, then schedule it.' : dirty ? 'Save your changes first.' : undefined}><Icon name="calendar" size={14} /> Schedule</button>
      </div>

      {(dialog === 'save' || dialog === 'saveAs') && <SaveDialog definition={cleaned} saved={saved} asNew={dialog === 'saveAs' || !saved} teams={myTeams} onClose={() => setDialog(null)}
        onSaved={(id, revision, name) => {
          setDialog(null); setBaseline(JSON.stringify(cleaned)); void qc.invalidateQueries({ queryKey: ['rc-saved'] });
          if (saved && String(saved.id) === String(id)) setSaved({ ...saved, revision, name });
          else setParams({ report: String(id) });
        }} />}
      {(dialog === 'xlsx' || dialog === 'pdf') && p && <ExportDialog format={dialog} definition={cleaned} savedId={saved && !dirty ? saved.id : null} total={p.total} cutoff={p.cutoff} zone={zone} limits={m.limits}
        defaultName={(saved?.name ?? 'cases-report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} onClose={() => setDialog(null)}
        onQueued={j => { setDialog(null); setJobs(js => [j, ...js.filter(x => x.id !== j.id)]); toast('Export queued: it is generated in the background.'); }} />}
      {dialog === 'schedule' && saved && <BuilderScheduleDialog savedId={saved.id} savedName={saved.name} onClose={() => setDialog(null)}
        onDone={() => { setDialog(null); void qc.invalidateQueries({ queryKey: ['report-schedules'] }); nav('/reporting-center/schedules'); }} />}
      {confirmReset && <Dialog title={saved ? 'Revert changes' : 'Reset the configuration'} onClose={() => setConfirmReset(false)}>
        <p>{saved ? `Discard your changes and return to the saved version of “${saved.name}”?` : 'Discard the filters, columns and sorting you set and start from the default configuration?'}</p>
        <div className="form-actions"><button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button><button className="btn btn-danger" onClick={resetAll}>{saved ? 'Revert' : 'Reset'}</button></div>
      </Dialog>}
    </div>
  );
}

function SavedPicker({ current, onPick }: { current: number | null; onPick: (id: number) => void }) {
  const list = useQuery({ queryKey: ['rc-saved', 'all', ''], queryFn: () => get<{ id: number; name: string; isOwner: boolean; owner: string }[]>('/reporting/report-definitions') });
  if (!list.data?.length) return null;
  return (
    <select className="input rb-load" aria-label="Load a saved report" value={current ?? ''} onChange={e => e.target.value && onPick(Number(e.target.value))}>
      <option value="">Load saved report…</option>
      {list.data.map(r => <option key={r.id} value={r.id}>{r.name}{r.isOwner ? '' : ` (${r.owner})`}</option>)}
    </select>
  );
}
