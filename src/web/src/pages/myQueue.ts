/** A102: one queue of a person's tickets and commitments, most urgent first, each with a clear next step. */
export type QueueTicket = { id: number; ref: string; title: string; priority: string; statusCode: string; dueAt?: string | null; overdue: boolean; waitingReason?: string | null; nextAction?: string | null; reviewOverdue?: boolean; clientCode?: string | null };
export type QueueCommitment = { id: number; ref: string; description: string; currentDueAt: string; overdue: boolean; clientCode?: string | null };
export type QueueItem = { key: string; kind: 'Ticket' | 'Commitment'; to: string; ref: string; title: string; clientCode?: string | null; priority?: string; statusCode?: string; dueAt?: string | null; overdue: boolean; nextStep: string };

const URGENT = ['Critical', 'High'];
const WAITING: Record<string, string> = { Customer: 'the customer', InternalTeam: 'the internal team', Vendor: 'the vendor', PlannedChange: 'the planned change' };

function ticketStep(t: QueueTicket): string {
  if (t.waitingReason) return `Follow up with ${WAITING[t.waitingReason] ?? t.waitingReason}`;
  if (t.nextAction?.trim()) return t.nextAction.trim();
  if (t.reviewOverdue) return 'Review the ticket: its next review has passed';
  return t.overdue ? 'Record progress or change the due date' : 'Record the next action';
}

/** Overdue work, then critical and high tickets, then the earliest deadline; work with no deadline comes last. */
function urgency(i: QueueItem): [number, number, number] {
  return [i.overdue ? 0 : 1, i.priority && URGENT.includes(i.priority) ? URGENT.indexOf(i.priority) : URGENT.length, i.dueAt ? new Date(i.dueAt).getTime() : Infinity];
}

export function buildQueue(tickets: QueueTicket[], commitments: QueueCommitment[]): QueueItem[] {
  const items: QueueItem[] = [
    ...tickets.map((t): QueueItem => ({ key: `t${t.id}`, kind: 'Ticket', to: `/cases/${t.id}`, ref: t.ref, title: t.title, clientCode: t.clientCode, priority: t.priority, statusCode: t.statusCode, dueAt: t.dueAt, overdue: t.overdue, nextStep: ticketStep(t) })),
    ...commitments.map((c): QueueItem => ({ key: `c${c.id}`, kind: 'Commitment', to: `/commitments/${c.id}`, ref: c.ref, title: c.description, clientCode: c.clientCode, dueAt: c.currentDueAt, overdue: c.overdue, nextStep: c.overdue ? 'Deliver it, or agree a new date' : 'Deliver by the due date' }))
  ];
  return items.sort((a, b) => {
    const x = urgency(a), y = urgency(b);
    return x[0] - y[0] || x[1] - y[1] || (x[2] === y[2] ? 0 : x[2] < y[2] ? -1 : 1) || a.ref.localeCompare(b.ref);
  });
}
