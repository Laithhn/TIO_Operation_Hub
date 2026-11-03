import type { ReactNode } from 'react';
import { Icon } from '../../ui/Icon';
import { Badge } from '../../ui/kit';
import { label } from '../../format';

export type SyncRun = { id: number; jiraConnectionId: number; clientId?: number; clientJiraSpaceId?: number; projectKey?: string; type: string; trigger: string; status: string; startedAt: string; endedAt?: string;
  issuesRetrieved: number; casesCreated: number; casesUpdated: number; commentsImported: number; activitiesImported: number; failedRecords: number; error?: string };

export type JiraPreview = { totalIssues: number; newCases: number; existingMatched: number; requiringReview: number; skippedDone: number; missingUserMappings: number; missingWorkflowMappings: number; ownershipConflicts: number; estimatedComments: number; truncated: boolean;
  spaces: { projectKey: string; issues: number; error?: string }[]; samples: { issueKey: string; summary: string; projectKey: string; statusName?: string; assigneeName?: string; decision: string; caseId?: number; problem?: string }[] };

const TONES: Record<string, 'good' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  Healthy: 'good', Success: 'good', Passed: 'good', Active: 'good', Enabled: 'good', Available: 'good', Synchronized: 'good', Resolved: 'good',
  Warning: 'warn', Running: 'info', Skipped: 'neutral', Missing: 'warn', Open: 'warn',
  Error: 'bad', Failed: 'bad', Conflict: 'bad',
  Disabled: 'neutral', NotConfigured: 'neutral', NotRun: 'neutral', AlreadyAssigned: 'info', NotAccessible: 'warn', Dismissed: 'neutral'
};

/** Every state carries its words, so meaning never depends on colour alone. */
export function JiraBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="muted">—</span>;
  return <Badge tone={TONES[value] ?? 'neutral'}>{label(value)}</Badge>;
}

export function JiraCard({ icon, title, value, hint }: { icon: string; title: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="jira-card">
      <span className="jira-card-icon"><Icon name={icon} size={24} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="jira-card-label">{title}</div>
        <div className="jira-card-value">{value}</div>
        {hint && <div className="jira-card-hint">{hint}</div>}
      </div>
    </div>
  );
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  return <dl className="jira-kv">{items.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v ?? <span className="muted">—</span>}</dd></div>)}</dl>;
}

/** Shown wherever the feature flag decides whether anything runs: configuration works, but the page must not imply that synchronization is live. */
export function SyncOffNotice({ on }: { on: boolean }) {
  if (on) return null;
  return <div className="notice warn">Automatic synchronization is switched off on this server (<span className="mono">Jira:Enabled</span>). You can configure connections and run a dry run; no case is created or updated until it is switched on.</div>;
}

export function PreviewResult({ p }: { p: JiraPreview }) {
  return (
    <>
      <div className="notice">Dry run: nothing was saved, and no case, mapping or notification was created.{p.truncated && ' Only the first issues were read, so the real totals are higher.'}</div>
      <div className="jira-cards">
        <JiraCard icon="list" title="Jira issues found" value={p.totalIssues} />
        <JiraCard icon="plus" title="New cases proposed" value={p.newCases} />
        <JiraCard icon="case" title="Existing cases matched" value={p.existingMatched} />
        <JiraCard icon="warning" title="Cases requiring review" value={p.requiringReview} />
        <JiraCard icon="users" title="Missing user mappings" value={p.missingUserMappings} />
        <JiraCard icon="network" title="Missing workflow mappings" value={p.missingWorkflowMappings} />
        <JiraCard icon="error" title="Ownership conflicts" value={p.ownershipConflicts} />
        <JiraCard icon="note" title="Estimated comments" value={p.estimatedComments} hint="From the sampled issue totals." />
        <JiraCard icon="archive" title="Not imported" value={p.skippedDone} hint="Done, ignored or deleted." />
      </div>
      {p.spaces.filter(s => s.error).map(s => <div key={s.projectKey} className="notice warn">{s.projectKey}: {s.error}</div>)}
    </>
  );
}
