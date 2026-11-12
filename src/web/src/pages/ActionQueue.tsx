import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { get, qs } from '../api';
import { ClientDisplay } from '../ui/ClientLogo';
import { Icon } from '../ui/Icon';
import { Badge, DataTable } from '../ui/kit';

export type ActionRow = {
  category: string; recordType: string; recordId: number; reference: string; title: string; clientId?: number | null; clientCode?: string | null; owner: string; reason: string;
  nextAction?: string | null; dueAt?: string | null; link: string; severity: string; priority?: string | null;
};
type QueueRow = ActionRow & { also: string[] };

export const SEVERITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
export const SEVERITY_TONE: Record<string, 'bad' | 'warn' | 'info' | 'neutral'> = { Critical: 'bad', High: 'warn', Medium: 'info', Low: 'neutral' };
const QUEUE: Record<string, string> = {
  OverdueCase: 'Overdue ticket', CaseDueSoon: 'Ticket due within 24 h', EscalationOverdue: 'Escalation past target', EnvironmentCondition: 'Environment degraded or down',
  OverdueCommitment: 'Overdue commitment', PaymentDue: 'Payment', ContractRenewal: 'Contract renewal', Unassigned: 'Unassigned ticket'
};

/** Hours (from now) as "3 d 4 h" / "5 h" / "20 min". */
export function span(ms: number) {
  const m = Math.round(Math.abs(ms) / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}
export function dueText(iso?: string | null) {
  if (!iso) return <span className="muted">No date</span>;
  const ms = new Date(iso).getTime() - Date.now();
  return ms < 0 ? <span className="t-bad"><b>{span(ms)}</b> overdue</span> : <span className={ms < 86400000 ? 't-warn' : undefined}>due in {span(ms)}</span>;
}

/** A60, A102: one queue of what needs action now, from the action list — most severe and earliest due first, one row per record, each with its next action. */
export function ActionQueue({ params, title = 'Needs immediate attention', clear = 'Nothing is overdue, due within 24 hours or down — all clear.', showClient = true, limit = 8 }: {
  params: Record<string, string>; title?: string; clear?: string; showClient?: boolean; limit?: number;
}) {
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
  const visible = all ? shown : shown.slice(0, limit);
  const critical = rows.filter(r => r.severity === 'Critical').length;
  return (
    <section className="dash-band" id="attention" aria-labelledby="attention-h">
      <div className="band-head">
        <span className="band-ic" aria-hidden="true"><Icon name="bell" size={16} /></span>
        <h2 className="band-title" id="attention-h">{title}</h2>
        <span className="hint">{q.isLoading ? 'Loading…' : rows.length === 0 ? clear : `${rows.length} item(s) · ${critical} critical`}</span>
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
        <DataTable<QueueRow> rowKey={r => `${r.recordType}:${r.recordId}`} rows={visible} loading={q.isLoading} error={q.error} tools={false} fit pageSize={50} empty="none"
          caption={title} columns={[
            { key: 'p', header: 'Severity', render: r => <><Badge tone={SEVERITY_TONE[r.severity] ?? 'neutral'}>{r.severity}</Badge>{r.priority && <span className="hint pay-sub">{r.priority} priority</span>}</> },
            { key: 'i', header: 'Issue', priority: 'primary', maxWidth: '30rem', render: r => <><span className="cc-kind">{QUEUE[r.category]}</span><Link to={r.link}><b>{r.reference}</b></Link> <span className="cc-title">{r.title}</span></> },
            ...(showClient ? [{ key: 'c', header: 'Client', render: (r: QueueRow) => r.clientId ? <ClientDisplay id={r.clientId} code={r.clientCode ?? 'Client'} /> : <span className="muted">Internal</span> }] : []),
            { key: 'o', header: 'Owner', render: r => r.owner === 'Unassigned' ? <Badge tone="warn">Unassigned</Badge> : r.owner },
            { key: 'd', header: 'Deadline', className: 'nowrap', render: r => dueText(r.dueAt) },
            { key: 'n', header: 'Next action', maxWidth: '24rem', render: r => <>{r.nextAction?.trim() || <span className="muted">None recorded</span>}<span className="hint pay-sub">{r.reason}{r.also.length > 0 && ` · also: ${r.also.join(', ')}`}</span></> }
          ]} />
        <div className="cc-queue-foot">
          {shown.length > limit && <button className="linkbtn" onClick={() => setAll(v => !v)}>{all ? `Show the top ${limit}` : `Show all ${shown.length}`}</button>}
          <Link to={`/actions${qs(params)}`}>Open the full action list</Link>
          <span className="hint">Severity: overdue critical/high work, escalations past a target and unavailable environments are Critical. One row per record.</span>
        </div>
      </section>
    </section>
  );
}
