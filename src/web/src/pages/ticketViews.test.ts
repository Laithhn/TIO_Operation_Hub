import { describe, expect, it } from 'vitest';
import { activeQuickView, quickViews, viewFilters, TICKET_FILTER_DEFAULTS } from './ticketViews';

describe('ticket quick views', () => {
  const views = quickViews(7);

  it('offers the views people use for routine work', () => {
    expect(views.map(v => v.label)).toEqual(['All open', 'My tickets', 'Overdue', 'Unassigned', 'Waiting for customer']);
  });

  it('leaves out My tickets for someone who is not a person in the hub', () => {
    expect(quickViews().map(v => v.key)).not.toContain('mine');
  });

  it('a view replaces every other filter, so its count equals its list', () => {
    const f = viewFilters(views.find(v => v.key === 'overdue')!);
    expect(f.due).toBe('overdue');
    expect(f.status).toBe('open');
    expect(Object.entries(f).filter(([k, v]) => v !== TICKET_FILTER_DEFAULTS[k as keyof typeof f]).map(([k]) => k)).toEqual(['due']);
  });

  it('marks a view only when the filters are exactly that view', () => {
    expect(activeQuickView({ ...TICKET_FILTER_DEFAULTS }, views)).toBe('open');
    expect(activeQuickView({ ...TICKET_FILTER_DEFAULTS, ownerId: '7' }, views)).toBe('mine');
    expect(activeQuickView({ ...TICKET_FILTER_DEFAULTS, ownerId: '8' }, views)).toBeNull();
    expect(activeQuickView({ ...TICKET_FILTER_DEFAULTS, due: 'overdue', clientId: '3' }, views)).toBeNull();
    expect(activeQuickView({ ...TICKET_FILTER_DEFAULTS, q: 'tahakom' }, views)).toBeNull();
  });
});
