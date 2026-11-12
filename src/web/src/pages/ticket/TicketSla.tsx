// A106 (was SlaPanel in Cases.tsx, A61): the contractual SLA of a ticket in three sections of the details panel.
// Every figure comes from the ticket's `sla` snapshot and GET /cases/{id}/penalty-preview exactly as before; nothing is calculated here.
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { get } from '../../api';
import { fmtDateTime, label } from '../../format';
import { Badge, StatusBadge } from '../../ui/kit';
import { FactList, SideSection } from '../../ui/recordView';
import { minutes, type CaseDto, type SlaObligation } from './model';

type Penalty = { id: number; name: string; trigger: string; month: string; amount: number; currency: string; reviewState: string };

export function SlaSections({ c, canEdit, canChangeContract, onRespond, onContract }: { c: CaseDto; canEdit: boolean; canChangeContract: boolean; onRespond: () => void; onContract: () => void }) {
  const s = c.sla;
  const a = s.applied;
  const penaltyPreview = useQuery({ queryKey: ['case-penalty-preview', c.id], queryFn: () => get<{ items: Penalty[] }>(`/cases/${c.id}/penalty-preview`), enabled: !!c.contract });
  const rows: { key: string; name: string; target?: number; obligation: SlaObligation; actualLabel: string }[] = [
    { key: 'response', name: 'First response', target: a?.responseMinutes, obligation: s.response, actualLabel: 'Not yet recorded' },
    { key: 'resolution', name: 'Resolution', target: a?.resolutionMinutes, obligation: s.resolution, actualLabel: 'Not yet resolved' }
  ];
  const penalties = penaltyPreview.data?.items ?? [];
  const canRespond = canEdit && !!c.contract && !s.response.actualAt;
  return (
    <>
      <SideSection id="ticket-sla" title="Contractual SLA" note={c.contract ? c.contract.ref : 'Not measured'} actions={<>
        {canRespond && <button className="btn" onClick={onRespond}>Record first response</button>}
        {canChangeContract && <button className="btn" onClick={onContract}>{c.contract ? 'Change contract' : 'Link contract'}</button>}</>}>
        <FactList items={[
          ['Contract', c.contract ? <><Link to={`/contracts/${c.contract.id}`}>{c.contract.ref}</Link> · {c.contract.title} {c.contract.status !== 'Active' && <Badge tone="warn">{label(c.contract.status)}</Badge>}</> : <span className="muted">{c.contractFromJiraSpace ? 'No contract covers the creation date — not measurable' : 'No contract linked — not measured'}</span>],
          a && ['Applied target', <>{a.priority} priority · {a.basis === 'CalendarHours' ? 'calendar hours' : a.basis === 'SupportHours' ? (a.support24x7 ? 'support hours (24×7)' : `support hours ${a.supportDays.replace(/, /g, ' ')} ${a.supportFrom ?? ''}–${a.supportTo ?? ''} ${a.timeZone ?? ''}`) : 'basis not set'}
            {a.pausesWhileWaitingOnCustomer && ' · paused while waiting on the customer'}</>, { hint: <>Taken from {a.contractRef} on {fmtDateTime(a.at)}; later contract edits do not change it.{c.contractFromJiraSpace && ' This contract was valid when the ticket was created.'}</> }],
          ['Clock start', fmtDateTime(s.startAt), { hint: `(${s.startsAtJiraCreation ? 'Jira creation time' : 'hub creation time'}; deadlines and elapsed time count from here)` }],
          !!s.pausedMinutes && ['Paused (waiting on the customer)', minutes(s.pausedMinutes)],
          ['Operational due date', s.operationalDueAt ? fmtDateTime(s.operationalDueAt) : <span className="muted">None</span>,
            s.operationalDueAt ? { hint: s.startsAtJiraCreation ? '(the contractual resolution deadline of this synchronized ticket)' : '(agreed by the team; separate from the contractual deadlines)' } : {}]
        ]} />
        {s.note && <p className="hint" style={{ marginTop: 8 }}>{s.note}</p>}
      </SideSection>
      {c.contract && <SideSection id="ticket-sla-measurements" title="SLA measurements" note={`${label(s.response.status)} · ${label(s.resolution.status)}`}>
        <div className="rv-measures" role="group" aria-label="Contractual SLA measurements">{rows.map(r => (
          <section key={r.key} className={`rv-measure st-${r.obligation.status}`} aria-label={r.name}>
            <div className="rv-measure-head"><h3>{r.name}</h3><StatusBadge value={r.obligation.status} /></div>
            <FactList items={[
              ['Target', minutes(r.target)],
              ['Deadline', r.obligation.dueAt ? fmtDateTime(r.obligation.dueAt) : <span className="muted">—</span>],
              ['Actual', r.obligation.actualAt ? fmtDateTime(r.obligation.actualAt) : <span className="muted">{r.actualLabel}</span>,
                r.obligation.elapsedMinutes !== undefined && r.obligation.elapsedMinutes !== null ? { hint: `${minutes(r.obligation.elapsedMinutes)} counted` } : {}],
              !!r.obligation.breachMinutes && ['Over target', <span className="err">{minutes(r.obligation.breachMinutes)} over</span>]
            ]} />
          </section>
        ))}</div>
      </SideSection>}
      {penalties.length > 0 && <SideSection id="ticket-penalties" title="Indicative penalties" defaultOpen={false} note={`${penalties.length} line(s)`}>
        <p className="hint" style={{ marginTop: 0 }}>Calculated from the clause snapshot taken when this contract was linked. These monthly totals combine tickets sharing the recorded clause terms and apply monthly caps. The same totals can appear on multiple ticket pages; do not add them together as billing totals. Amounts need review and do not create credits or invoices.</p>
        <ul className="rv-penalties" aria-label="Indicative ticket penalties">{penalties.map((x, i) => (
          <li key={`${x.id}-${x.month}-${i}`}>
            <span><b>{x.name}</b><div className="hint">{label(x.trigger)} · billing month {x.month}</div></span>
            <span className="amount">{new Intl.NumberFormat(undefined, { style: 'currency', currency: x.currency }).format(x.amount)}<div className="hint">Review: {label(x.reviewState)}</div></span>
          </li>
        ))}</ul>
      </SideSection>}
    </>
  );
}
