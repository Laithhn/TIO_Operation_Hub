import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, get, post } from '../../api';
import { fmtDateTime, label } from '../../format';
import { useRefresh } from '../../hooks';
import { Badge, FormError, Panel, QueryState, StateMessage, useToast } from '../../ui/kit';
import { JiraBadge, KV } from './shared';
import './jira.css';

export type JiraSource = {
  issueKey: string; url: string; source: string; connection?: string; connectionStatus: string; status?: string; statusCategory?: string; assignee?: string; reporter?: string; priority?: string; issueType?: string; resolution?: string;
  components?: string; labels?: string; description?: string; summary?: string; jiraCreatedAt?: string; jiraUpdatedAt?: string; jiraDueDate?: string; ownerFromJira: boolean; lastSync: string; nextSync?: string; details?: { name: string; value: string }[];
};

export const jiraOriginLabel = (o: string) => o === 'ImportedSource' ? 'Imported source' : o === 'AdoptedSource' ? 'Source (adopted case)' : 'Manual reference';

/** Connection status, key, Jira status, assignee and sync times above the management summary (approved mockups 3 and 4). */
export function JiraBanner({ s }: { s: JiraSource }) {
  return (
    <section className="jira-banner" aria-label="Jira integration">
      <div className="jira-banner-main">
        <span className="jira-banner-title">Jira integration{s.connection ? ` (${s.connection})` : ''}</span>
        <JiraBadge value={s.connectionStatus} />
        <span>Jira issue: <a className="mono" href={s.url} target="_blank" rel="noopener noreferrer">{s.issueKey}</a></span>
        <span>Jira status: <Badge tone="info">{s.status ?? 'Unknown'}</Badge></span>
        <span>Jira assignee: {s.assignee ?? <span className="muted">Unassigned</span>}</span>
      </div>
      <div className="jira-banner-times">
        <div>Last sync: {fmtDateTime(s.lastSync)}</div>
        <div>Next sync: {s.nextSync ? fmtDateTime(s.nextSync) : 'Not scheduled'}</div>
      </div>
    </section>
  );
}

/** External Jira values, shown beside the case and never copied into its business fields. */
export function JiraDetailsPanel({ s }: { s: JiraSource }) {
  const details: [string, React.ReactNode][] = (s.details ?? []).map(d => [d.name, d.value]);
  return (
    <Panel title="Jira details (imported)">
      <KV items={[
        ...details, ['Jira issue type', s.issueType], ['Jira component', s.components], ['Jira priority', s.priority], ['Jira due date', s.jiraDueDate], ['Jira resolution', s.resolution], ['Reporter', s.reporter],
        ['Jira created', s.jiraCreatedAt ? fmtDateTime(s.jiraCreatedAt) : null], ['Jira URL', <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>]
      ]} />
      {s.description && <><div className="hint" style={{ marginTop: 8 }}>Description (Jira)</div><div className="jira-desc">{s.description}</div></>}
    </Panel>
  );
}

type ActivityRow = { key: string; source: string; kind: string; category: string; title: string; actor?: string; at: string; from?: string; to?: string; body?: string; restricted: boolean; reference?: string; edited: boolean };
type ActivityPage = { counts: { all: number; jiraComments: number; tioComments: number; workflow: number; assignments: number }; totalCount: number; page: number; pageSize: number; items: ActivityRow[] };

const FILTERS = [
  { key: 'all', label: 'All activity', count: 'all' }, { key: 'jiraComments', label: 'Jira comments', count: 'jiraComments' }, { key: 'tioComments', label: 'TIO comments', count: 'tioComments' },
  { key: 'workflow', label: 'Workflow changes', count: 'workflow' }, { key: 'assignments', label: 'Assignments', count: 'assignments' }
] as const;

/** One timeline for hub events, local comments and Jira comments and activity, each clearly labelled with its source. */
export function CaseActivity({ caseId, canComment }: { caseId: number; canComment: boolean }) {
  const [filter, setFilter] = useState('all');
  const [system, setSystem] = useState(true);
  const [limit, setLimit] = useState(25);
  const q = useQuery({ queryKey: ['case-activity', caseId, filter, system, limit], queryFn: () => get<ActivityPage>(`/cases/${caseId}/activity?filter=${filter}&system=${system}&pageSize=${limit}`) });
  const d = q.data;
  return (
    <Panel title="Activity & comments">
      <div className="activity-filters">
        {FILTERS.map(f => <button key={f.key} className="activity-chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label} ({d?.counts[f.count] ?? 0})</button>)}
        <span className="spacer" />
        <label className="check"><input type="checkbox" checked={system} onChange={e => setSystem(e.target.checked)} /> Show system activity</label>
      </div>
      <QueryState q={q}>{d && (d.items.length === 0 ? <StateMessage kind={filter === 'all' ? 'none' : 'nomatch'} /> : <ul className="timeline">
        {d.items.map(r => <li key={r.key} className={`activity-item ${r.source === 'Jira' ? 'source-jira' : r.kind === 'Comment' ? 'source-comment' : ''}`}>
          <b>{r.source === 'TIO' && r.kind !== 'Comment' ? label(r.kind) : r.title}</b> <Badge tone={r.source === 'Jira' ? 'info' : 'neutral'}>{r.source === 'Jira' ? 'Jira' : 'TIO'}</Badge>{r.edited && <span className="hint"> edited in Jira</span>}
          {(r.from || r.to) && <> {r.from ?? '—'} → {r.to ?? '—'}</>}
          {r.restricted ? <div className="activity-body muted">This Jira comment is restricted. Its text is visible to case coordinators only.</div> : r.body && (r.kind === 'Comment' || r.kind === 'JiraComment' ? <div className="activity-body">{r.body}</div> : <> — {r.body}</>)}
          <div className="when">{fmtDateTime(r.at)} · {r.actor ?? 'system'}{r.reference ? ` · ${r.reference}` : ''}</div>
        </li>)}
      </ul>)}</QueryState>
      {d && d.totalCount > d.items.length && <div style={{ textAlign: 'center', marginTop: 8 }}><button className="btn" onClick={() => setLimit(l => l + 25)}>Show more activity ({d.totalCount - d.items.length})</button></div>}
      {canComment && <CommentComposer caseId={caseId} />}
    </Panel>
  );
}

function CommentComposer({ caseId }: { caseId: number }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const refresh = useRefresh();
  const toast = useToast();
  const add = async () => {
    setBusy(true); setError(null);
    try { await post(`/cases/${caseId}/comments`, { body }); setBody(''); toast('Comment added.'); refresh(); }
    catch (e) { if (e instanceof ApiError) setError(e); }
    finally { setBusy(false); }
  };
  return (
    <div className="activity-composer">
      <FormError error={error} />
      <label className="flabel" htmlFor="case-comment">Add a comment to this case (TIO only)</label>
      <textarea id="case-comment" className="input" rows={2} style={{ width: '100%' }} value={body} maxLength={8000} onChange={e => setBody(e.target.value)} />
      {error?.field('body') && <div className="err">{error.field('body')}</div>}
      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <span className="hint">This comment is saved in TIO Operations Hub only and will not be sent to Jira.</span>
        <button className="btn btn-primary" disabled={busy || !body.trim()} onClick={add}>Add comment</button>
      </div>
    </div>
  );
}
