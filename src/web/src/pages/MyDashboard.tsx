import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { get } from '../api';
import { fmtDateTime } from '../format';
import { useMe, useRight } from '../hooks';
import { Badge, DataTable, PageHead, Panel, QueryState, StateMessage, StatusBadge } from '../ui/kit';
import { buildQueue, type QueueCommitment, type QueueItem, type QueueTicket } from './myQueue';
import { CRITICAL_OR_HIGH } from './ticketViews';

type Mine = {
  evaluatedAt: string; open: number; overdue: number; dueSoon: number; waiting: number; criticalHigh: number; noResponse: number; reviewOverdue: number; openCommitments: number; overdueCommitments: number;
  last30Days: { opened: number; closed: number; responseMet: number; responseBreached: number; resolutionMet: number; resolutionBreached: number; averageFirstResponseHours: number | null; averageResolutionHours: number | null };
  tickets: QueueTicket[]; commitments: QueueCommitment[]; latestComments: { caseId: number; reference: string; title: string; author: string; at: string }[];
};

const rate = (met: number, breached: number) => (met + breached === 0 ? 'Not measured' : `${Math.round((100 * met) / (met + breached))}%`);
const hours = (h: number | null) => (h === null ? 'Not measured' : h < 48 ? `${h} h` : `${Math.round((h / 24) * 10) / 10} days`);

/** One figure of a compact strip. A figure of zero stays there but steps back, so the exceptions stand out. */
function Stat({ label, value, to, tone, note }: { label: string; value: number | string; to?: string; tone?: 'bad' | 'warn'; note?: string }) {
  const none = value === 0 || value === 'Not measured';
  const body = <><b>{value}</b> {label}{note && <small>{note}</small>}</>;
  const cls = `stat${none ? ' zero' : tone ? ` ${tone}` : ''}`;
  return to ? <Link className={cls} to={to}>{body}</Link> : <span className={cls}>{body}</span>;
}

/** One person's own work and results. Everything here is about tickets and commitments they own. */
export function MyDashboard() {
  const me = useMe().data!;
  const canCommitments = useRight('Commitments', 'View');
  const q = useQuery({ queryKey: ['my-dashboard'], queryFn: () => get<Mine>('/dashboard/me') });
  const d = q.data;
  const mine = `ownerId=${me.id}`;
  const queue = useMemo(() => (d ? buildQueue(d.tickets, d.commitments) : []), [d]);
  return (
    <div className="dash">
      <PageHead title="My dashboard" sub={<>Only your own tickets and commitments.{d && <> Updated {fmtDateTime(d.evaluatedAt)}.</>}</>}
        actions={<Link className="btn" to={`/cases?${mine}`}>All my tickets</Link>} />
      <QueryState q={q}>{d && <>
        <section aria-label="My work now" className="stat-strip">
          <Stat label="overdue" value={d.overdue} to={`/cases?${mine}&due=overdue`} tone="bad" />
          <Stat label="due within 24 hours" value={d.dueSoon} to={`/cases?${mine}&due=24h`} tone="warn" />
          <Stat label="critical or high" value={d.criticalHigh} to={`/cases?${mine}&priority=${encodeURIComponent(CRITICAL_OR_HIGH)}`} tone="warn" />
          <Stat label="no first response yet" value={d.noResponse} tone="warn" note="under a contract" />
          <Stat label="review passed" value={d.reviewOverdue} to={`/cases?${mine}&reviewOverdue=true`} tone="warn" />
          <Stat label="waiting" value={d.waiting} to={`/cases?${mine}&waiting=true`} />
          <Stat label="open tickets" value={d.open} to={`/cases?${mine}`} />
          {canCommitments && <Stat label="open commitments" value={d.openCommitments} to={`/commitments?${mine}`} tone={d.overdueCommitments ? 'bad' : undefined} note={d.overdueCommitments ? `${d.overdueCommitments} overdue` : undefined} />}
        </section>
        <div className="my-grid">
          <Panel title="What to work on next" pad={false}>
            {queue.length === 0 ? <StateMessage kind="none">You have no open tickets or commitments.</StateMessage> : <DataTable<QueueItem> caption="What to work on next" tools={false} fit rows={queue} rowKey={i => i.key} columns={[
              { key: 'w', header: 'Work', priority: 'primary', maxWidth: '24rem', render: i => <><span className="cc-kind">{i.kind}</span><Link to={i.to}>{i.ref}</Link> {i.title}</> },
              { key: 'n', header: 'Next step', priority: 'primary', maxWidth: '18rem', render: i => <span className="next-step">{i.nextStep}</span> },
              { key: 'c', header: 'Client', render: i => i.clientCode ?? <span className="muted">Internal</span> },
              { key: 'p', header: 'Priority', render: i => i.priority ? <StatusBadge value={i.priority} /> : <span className="muted">—</span> },
              { key: 's', header: 'Status', render: i => i.statusCode ? <StatusBadge value={i.statusCode} enumName="CaseStatus" /> : <Badge tone="info">Open</Badge> },
              { key: 'd', header: 'Due', render: i => i.dueAt ? <span className={i.overdue ? 'err' : ''}>{fmtDateTime(i.dueAt)}{i.overdue && ' · overdue'}</span> : <span className="muted">None</span> }
            ]} />}
          </Panel>
          <div>
            <Panel title="My last 30 days">
              <div className="stat-strip stat-strip-plain">
                <Stat label="opened" value={d.last30Days.opened} />
                <Stat label="closed" value={d.last30Days.closed} />
                <Stat label="response met" value={rate(d.last30Days.responseMet, d.last30Days.responseBreached)} note={`${d.last30Days.responseBreached} breached`} tone={d.last30Days.responseBreached ? 'warn' : undefined} />
                <Stat label="resolution met" value={rate(d.last30Days.resolutionMet, d.last30Days.resolutionBreached)} note={`${d.last30Days.resolutionBreached} breached`} tone={d.last30Days.resolutionBreached ? 'warn' : undefined} />
                <Stat label="average first response" value={hours(d.last30Days.averageFirstResponseHours)} />
                <Stat label="average resolution" value={hours(d.last30Days.averageResolutionHours)} />
              </div>
            </Panel>
            <Panel title="Latest comments on my tickets">
              {d.latestComments.length === 0 ? <StateMessage kind="none">No comments yet.</StateMessage> : <ul className="timeline">{d.latestComments.map((c, i) => <li key={`${c.caseId}-${i}`}>
                <Link to={`/cases/${c.caseId}`}>{c.reference}</Link> {c.title}<div className="when">{c.author} · {fmtDateTime(c.at)}</div>
              </li>)}</ul>}
            </Panel>
          </div>
        </div>
      </>}</QueryState>
    </div>
  );
}
