import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, get, post } from '../../api';
import { fmtDateTime, label } from '../../format';
import { useMe, useRefresh } from '../../hooks';
import { Badge, FormError, QueryState, StateMessage, useToast } from '../../ui/kit';
import { Avatar, ChangePair, FactList, FilterChips, IconMarker, SideSection, SourceTag, TabSection, Timeline, TimelineItem, type Fact } from '../../ui/recordView';
import { JiraBadge } from './shared';
import './jira.css';

export type JiraSource = {
  issueKey: string; url: string; source: string; connection?: string; connectionStatus: string; status?: string; statusCategory?: string; assignee?: string; reporter?: string; priority?: string; issueType?: string; resolution?: string;
  components?: string; labels?: string; description?: string; summary?: string; jiraCreatedAt?: string; jiraUpdatedAt?: string; jiraDueDate?: string; ownerFromJira: boolean; lastSync: string; nextSync?: string; details?: { name: string; value: string }[];
};

export const jiraOriginLabel = (o: string) => o === 'ImportedSource' ? 'Imported source' : o === 'AdoptedSource' ? 'Source (adopted ticket)' : 'Manual reference';

/**
 * A106: the Jira side of a synchronized ticket in one section of the details panel: connection, issue, status and sync times
 * (was the banner above the management summary), then the imported values (was "Jira details (imported)"). They are shown
 * beside the ticket and never copied into its business fields; each is marked as coming from Jira.
 */
export function JiraSideSection({ s, caseId, canSync }: { s: JiraSource; caseId: number; canSync: boolean }) {
  const dash = (v?: React.ReactNode) => (v === null || v === undefined || v === '' ? <span className="muted">—</span> : v);
  const details: Fact[] = (s.details ?? []).map(d => [d.name, dash(d.value)]);
  const refresh = useRefresh();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const sync = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const r = await post<{ issueKey: string; comments: number; activities: number; error?: string }>(`/cases/${caseId}/jira-source/sync`);
      if (r.error) setProblem(`${r.issueKey} could not be imported: ${r.error}`);
      else toast(`${r.issueKey} synchronized: ${r.comments} new comment(s), ${r.activities} new activity item(s).`);
      await refresh();
    }
    catch (e) { setProblem(e instanceof ApiError ? e.summary : 'The request failed.'); }
    finally { setBusy(false); }
  };
  return (
    <SideSection id="ticket-jira" title="Jira details (imported)" note={s.issueKey}
      actions={canSync && <button className="btn" disabled={busy} onClick={sync}>{busy ? 'Synchronizing…' : 'Sync with Jira'}</button>}>
      {problem && <div className="notice warn" style={{ marginBottom: 8 }}>{problem}</div>}
      <section className="jira-sync" aria-label="Jira integration">
        <div className="jira-sync-line"><b>Jira integration{s.connection ? ` (${s.connection})` : ''}</b> <JiraBadge value={s.connectionStatus} /></div>
        <div className="hint">Last sync: {fmtDateTime(s.lastSync)} · Next sync: {s.nextSync ? fmtDateTime(s.nextSync) : 'Not scheduled'}</div>
      </section>
      <FactList items={[
        ['Jira issue', <a className="mono" href={s.url} target="_blank" rel="noopener noreferrer">{s.issueKey}</a>],
        ['Jira status', <Badge tone="info">{s.status ?? 'Unknown'}</Badge>],
        ['Jira assignee', s.assignee ?? <span className="muted">Unassigned</span>],
        ...details, ['Jira issue type', dash(s.issueType)], ['Jira component', dash(s.components)], ['Jira priority', dash(s.priority)], ['Jira due date', dash(s.jiraDueDate)], ['Jira resolution', dash(s.resolution)], ['Reporter', dash(s.reporter)],
        ['Jira created', dash(s.jiraCreatedAt ? fmtDateTime(s.jiraCreatedAt) : null)], ['Jira URL', <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>]
      ]} />
      {s.description && <><h3 className="rv-sub">Description (Jira)</h3><div className="jira-desc">{s.description}</div></>}
    </SideSection>
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
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [system, setSystem] = useState(true);
  const [limit, setLimit] = useState(25);
  const q = useQuery({ queryKey: ['case-activity', caseId, filter, system, limit], queryFn: () => get<ActivityPage>(`/cases/${caseId}/activity?filter=${filter}&system=${system}&pageSize=${limit}`), placeholderData: p => p });
  const d = q.data;
  return (
    <TabSection title="Activity & comments" toolbar={<>
      <FilterChips label="Show activity" value={filter} onChange={setFilter} options={FILTERS.map(f => ({ key: f.key, label: f.label, count: d?.counts[f.count] ?? 0 }))} />
      <span className="spacer" />
      <label className="check"><input type="checkbox" checked={system} onChange={e => setSystem(e.target.checked)} /> Show system activity</label>
    </>}>
      {canComment && <CommentComposer caseId={caseId} />}
      <QueryState q={q}>{d && (d.items.length === 0 ? <StateMessage kind={filter === 'all' ? 'none' : 'nomatch'} /> : <div className="act-feed">
        {groupByDay(d.items).map(day => <section key={day.key} aria-label={day.label} className="act-day">
          <h4 className="act-day-head"><span>{day.label}</span></h4>
          <Timeline>{day.items.map(r => <ActivityEntry key={r.key} r={r} />)}</Timeline>
        </section>)}
      </div>)}</QueryState>
      {d && d.totalCount > d.items.length && <div className="rv-more"><button className="btn" disabled={q.isFetching} onClick={() => setLimit(l => l + 25)}>{q.isFetching ? 'Loading…' : `Show more activity (${d.totalCount - d.items.length})`}</button></div>}
    </TabSection>
  );
}

/** Newest first, under a heading for each day in the person's own time zone. */
function groupByDay(items: ActivityRow[]) {
  const key = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const today = key(new Date().toISOString());
  const yesterday = key(new Date(Date.now() - 86_400_000).toISOString());
  const days: { key: string; label: string; items: ActivityRow[] }[] = [];
  for (const r of items) {
    const k = key(r.at);
    const last = days[days.length - 1];
    if (last?.key === k) last.items.push(r);
    else days.push({ key: k, label: k === today ? `Today · ${k}` : k === yesterday ? `Yesterday · ${k}` : k, items: [r] });
  }
  return days;
}

const CATEGORY_ICON: Record<string, string> = { workflow: 'history', assignments: 'user', system: 'info' };

/** A comment is a card with its author and text; a change is one quiet line with before → after, so the conversation stands out. */
function ActivityEntry({ r }: { r: ActivityRow }) {
  const comment = r.kind === 'Comment' || r.kind === 'JiraComment';
  const who = r.actor ?? 'System';
  const title = r.source === 'TIO' && r.kind !== 'Comment' ? label(r.kind) : r.title;
  const source = <SourceTag source={r.source} />;
  if (!comment) return (
    <TimelineItem className="act-event" marker={<IconMarker icon={CATEGORY_ICON[r.category] ?? 'edit'} tone={r.source === 'Jira' ? 'jira' : undefined} />}
      title={<><b>{title}</b>{(r.from || r.to) && <> <ChangePair from={r.from} to={r.to} /></>}</>}
      meta={<>{who} · {fmtDateTime(r.at)} {source}{r.reference ? <span>· {r.reference}</span> : null}</>}>
      {r.body && <div className="act-note">{r.body}</div>}
    </TimelineItem>
  );
  return (
    <TimelineItem className={`act-comment ${r.source === 'Jira' ? 'source-jira' : 'source-comment'}`} marker={<Avatar name={r.actor} size={30} />}
      title={<><b>{who}</b> {source}{r.edited && <span className="hint"> edited in Jira</span>}</>}
      meta={fmtDateTime(r.at)}>
      <div className="act-card">
        {r.restricted ? <div className="activity-body muted">This Jira comment is restricted. Its text is visible to ticket coordinators only.</div> : <div className="activity-body">{r.body}</div>}
        <footer className="hint">{title}{r.reference ? ` · ${r.reference}` : ''}</footer>
      </div>
    </TimelineItem>
  );
}

function CommentComposer({ caseId }: { caseId: number }) {
  const me = useMe().data;
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
      <Avatar name={me?.displayName} size={30} />
      <div className="activity-composer-body">
        <FormError error={error} />
        <label className="flabel" htmlFor="case-comment">Add a comment to this ticket (TIO only)</label>
        <textarea id="case-comment" className="input" rows={2} value={body} maxLength={8000} placeholder="Write a comment for the team…" onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && body.trim() && !busy) { e.preventDefault(); add(); } }} />
        {error?.field('body') && <div className="err">{error.field('body')}</div>}
        <div className="activity-composer-actions">
          <span className="hint">This comment is saved in TIO Operations Hub only and will not be sent to Jira.</span>
          <button className="btn btn-primary" disabled={busy || !body.trim()} onClick={add} title="Ctrl+Enter">Add comment</button>
        </div>
      </div>
    </div>
  );
}
