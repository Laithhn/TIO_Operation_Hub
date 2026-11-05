/** A102: the ticket list's quick views. Each one is a whole filter, so its count equals the list it opens. */
export const TICKET_FILTER_DEFAULTS = {
  status: 'open', scope: '', clientId: '', teamId: '', ownerId: '', unassigned: '', priority: '', due: '', waiting: '', waitingFor: '', reviewOverdue: '', stale: '', productId: '', jiraKey: '', q: '',
  coverageGap: '', country: '', asOf: '', contractId: '', sla: '', jiraSource: '', jiraSpace: '', jiraConnectionId: '', createdFrom: '', createdTo: ''
};
export type TicketFilters = typeof TICKET_FILTER_DEFAULTS;
export type QuickViewCounts = { open: number; mine: number; overdue: number; unassigned: number; waitingForCustomer: number };
export type QuickView = { key: string; label: string; count: keyof QuickViewCounts; filter: Partial<TicketFilters> };

/** Both of the priorities the dashboards count as urgent, as one value of the priority filter. */
export const CRITICAL_OR_HIGH = 'Critical,High';

export function quickViews(meId?: number): QuickView[] {
  return [
    { key: 'open', label: 'All open', count: 'open', filter: {} },
    ...(meId ? [{ key: 'mine', label: 'My tickets', count: 'mine' as const, filter: { ownerId: String(meId) } }] : []),
    { key: 'overdue', label: 'Overdue', count: 'overdue', filter: { due: 'overdue' } },
    { key: 'unassigned', label: 'Unassigned', count: 'unassigned', filter: { unassigned: 'true' } },
    { key: 'waiting', label: 'Waiting for customer', count: 'waitingForCustomer', filter: { waitingFor: 'Customer' } }
  ];
}

/** The whole set of filters a view applies: everything else goes back to its default. */
export const viewFilters = (view: QuickView): TicketFilters => ({ ...TICKET_FILTER_DEFAULTS, ...view.filter });

/** The view the current filters are exactly, if any. Another filter on top means the count no longer describes the list. */
export function activeQuickView(filters: Partial<TicketFilters>, views: QuickView[]): string | null {
  const keys = Object.keys(TICKET_FILTER_DEFAULTS) as (keyof TicketFilters)[];
  return views.find(v => { const want = viewFilters(v); return keys.every(k => (filters[k] ?? TICKET_FILTER_DEFAULTS[k]) === want[k]); })?.key ?? null;
}
