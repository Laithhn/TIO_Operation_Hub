import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { get } from '../api';
import { fmtDateTime } from '../format';
import { useMe, useRight } from '../hooks';
import { Badge, DataTable, PageHead, Panel, QueryState, StateMessage, StatusBadge } from '../ui/kit';
import { SlaPair } from './Cases';

type Ticket = { id: number; ref: string; title: string; priority: string; statusCode: string; dueAt?: string; overdue: boolean; waitingReason?: string; responseSla: string; resolutionSla: string; clientCode?: string };
type Commitment = { id: number; ref: string; description: string; currentDueAt: string; overdue: boolean; clientCode?: string };
type Mine = {
  evaluatedAt: string; open: number; overdue: number; dueSoon: number; waiting: number; criticalHigh: number; noResponse: number; reviewOverdue: number; openCommitments: number; overdueCommitments: number;
  last30Days: { opened: number; closed: number; responseMet: number; responseBreached: number; resolutionMet: number; resolutionBreached: number; averageFirstResponseHours: number | null; averageResolutionHours: number | null };
  tickets: Ticket[]; commitments: Commitment[]; latestComments: { caseId: number; reference: string; title: string; author: string; at: string }[];
};

const rate = (met: number, breached: number) => (met + breached === 0 ? 'Not measured' : `${Math.round((100 * met) / (met + breached))}%`);
const hours = (h: number | null) => (h === null ? 'Not measured' : h < 48 ? `${h} h` : `${Math.round((h / 24) * 10) / 10} days`);

function Tile({ label, value, to, tone, note }: { label: string; value: number | string; to?: string; tone?: 'bad' | 'warn'; note?: string }) {
  const body = <><span className="flabel">{label}</span><b className={value === 'Not measured' ? 'none' : undefined}>{value}</b>{note && <span className="hint">{note}</span>}</>;
  const cls = `my-tile${tone ? ` ${tone}` : ''}`;
  return to ? <Link className={cls} to={to}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** One person's own work and results. Everything here is about tickets and commitments they own. */
export function MyDashboard() {
  const me = useMe().data!;
  const canCommitments = useRight('Commitments', 'View');
  const q = useQuery({ queryKey: ['my-dashboard'], queryFn: () => get<Mine>('/dashboard/me') });
  const d = q.data;
  const mine = `ownerId=${me.id}`;
  return (
    <div className="dash">
      <PageHead title="My dashboard" sub={<>Only your own tickets and commitments.{d && <> Updated {fmtDateTime(d.evaluatedAt)}.</>}</>}
        actions={<Link className="btn" to={`/cases?${mine}`}>All my tickets</Link>} />
      <QueryState q={q}>{d && <>
        <section aria-label="My work now" className="my-tiles">
          <Tile label="Open tickets" value={d.open} to={`/cases?${mine}`} />
          <Tile label="Overdue" value={d.overdue} to={`/cases?${mine}&due=overdue`} tone={d.overdue ? 'bad' : undefined} />
          <Tile label="Due within 24 hours" value={d.dueSoon} to={`/cases?${mine}&due=24h`} tone={d.dueSoon ? 'warn' : undefined} />
          <Tile label="Critical or high" value={d.criticalHigh} />
          <Tile label="No first response yet" value={d.noResponse} tone={d.noResponse ? 'warn' : undefined} note="Under a contract" />
          <Tile label="Waiting" value={d.waiting} to={`/cases?${mine}&waiting=true`} />
          <Tile label="Review passed" value={d.reviewOverdue} to={`/cases?${mine}&reviewOverdue=true`} tone={d.reviewOverdue ? 'warn' : undefined} />
          {canCommitments && <Tile label="Open commitments" value={d.openCommitments} to={`/commitments?${mine}`} note={d.overdueCommitments ? `${d.overdueCommitments} overdue` : undefined} tone={d.overdueCommitments ? 'bad' : undefined} />}
        </section>
        <div className="my-grid">
          <Panel title="What to work on next" pad={false}>
            {d.tickets.length === 0 ? <StateMessage kind="none">You have no open tickets.</StateMessage> : <DataTable<Ticket> caption="What to work on next" tools={false} rows={d.tickets} rowKey={t => t.id} columns={[
              { key: 'w', header: 'Ticket', priority: 'primary', render: t => <><Link to={`/cases/${t.id}`}>{t.ref}</Link> {t.title}</>, maxWidth: '26rem' },
              { key: 'c', header: 'Client', render: t => t.clientCode ?? <span className="muted">Internal</span> },
              { key: 'p', header: 'Priority', render: t => <StatusBadge value={t.priority} /> },
              { key: 's', header: 'Status', render: t => <StatusBadge value={t.statusCode} enumName="CaseStatus" /> },
              { key: 'd', header: 'Due', render: t => t.dueAt ? <span className={t.overdue ? 'err' : ''}>{fmtDateTime(t.dueAt)}{t.overdue && ' · overdue'}</span> : <span className="muted">None</span> },
              { key: 'l', header: 'Contractual SLA', render: t => <SlaPair response={t.responseSla} resolution={t.resolutionSla} /> }
            ]} />}
          </Panel>
          <div>
            <Panel title="My last 30 days">
              <div className="my-tiles" style={{ marginBottom: 0 }}>
                <Tile label="Opened" value={d.last30Days.opened} />
                <Tile label="Closed" value={d.last30Days.closed} />
                <Tile label="Response met" value={rate(d.last30Days.responseMet, d.last30Days.responseBreached)} note={`${d.last30Days.responseBreached} breached`} />
                <Tile label="Resolution met" value={rate(d.last30Days.resolutionMet, d.last30Days.resolutionBreached)} note={`${d.last30Days.resolutionBreached} breached`} />
                <Tile label="Average first response" value={hours(d.last30Days.averageFirstResponseHours)} />
                <Tile label="Average resolution" value={hours(d.last30Days.averageResolutionHours)} />
              </div>
            </Panel>
            {canCommitments && <Panel title="My commitments">
              {d.commitments.length === 0 ? <StateMessage kind="none">You have no open commitments.</StateMessage> : <ul className="timeline">{d.commitments.map(c => <li key={c.id}>
                <Link to={`/commitments/${c.id}`}>{c.ref}</Link> {c.description} {c.overdue && <Badge tone="bad">Overdue</Badge>}<div className="when">due {fmtDateTime(c.currentDueAt)}</div>
              </li>)}</ul>}
            </Panel>}
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
