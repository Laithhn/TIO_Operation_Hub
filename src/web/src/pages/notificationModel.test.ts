import { describe, expect, it } from 'vitest';
import { entityOf, relativeTime, SEVERITY, severityOf, sortNotices, toneOf, type Notice } from './notificationModel';

// A72 / A121: severity, the flat list's order, categories and relative times of the notification pop-up and center.
let id = 0;
const n = (p: Partial<Notice> & Pick<Notice, 'kind' | 'title'>): Notice => ({ id: ++id, createdAt: '2026-10-20T10:00:00Z', link: '/x', ...p });

const sample = (): Notice[] => [
  n({ kind: 'Assigned', title: 'Client TAK: you are now the project manager', entityType: 'Client', link: '/clients/1', createdAt: '2026-10-22T08:00:00Z' }),
  n({ kind: 'Renewal', title: 'Contract CT-1004 has no end date', entityType: 'Contract', link: '/contracts/4', createdAt: '2026-10-26T08:00:00Z', readAt: '2026-10-26T09:00:00Z' }),
  n({ kind: 'Overdue', title: 'Commitment CM-1006 is overdue', entityType: 'Commitment', link: '/commitments/6', createdAt: '2026-10-22T08:00:00Z' }),
  n({ kind: 'PaymentOverdue', title: 'Payment overdue on contract CT-1002', body: '146,400 AED · 30 % on acceptance', entityType: 'Payment', link: '/contracts/2', createdAt: '2026-10-21T08:00:00Z' }),
  n({ kind: 'Overdue', title: 'Commitment CM-1004 is overdue', entityType: 'Commitment', link: '/commitments/4', createdAt: '2026-10-23T08:00:00Z', readAt: '2026-10-23T09:00:00Z' }),
  n({ kind: 'Assigned', title: 'Client SEWAR: you are now the project manager', entityType: 'Client', link: '/clients/2', createdAt: '2026-10-21T08:00:00Z' }),
  n({ kind: 'PaymentDue', title: 'Payment due on contract CT-1009', entityType: 'Payment', resolvedAt: '2026-10-27T08:00:00Z', createdAt: '2026-10-25T08:00:00Z' })
];

describe('severity', () => {
  it('derives severity from the kind when the server does not send it', () => {
    expect(severityOf({ kind: 'Overdue' })).toBe('critical');
    expect(severityOf({ kind: 'PaymentOverdue' })).toBe('critical');
    expect(severityOf({ kind: 'Renewal' })).toBe('action');
    expect(severityOf({ kind: 'Assigned' })).toBe('info');
    expect(severityOf({ kind: 'Report', severity: 'action' })).toBe('action');
  });

  it('keeps a critical alert critical after it is read; only resolving it changes the icon', () => {
    const c = n({ kind: 'Overdue', title: 'x', severity: 'critical' });
    const read: Notice = { ...c, readAt: '2026-10-21T00:00:00Z' };
    expect(toneOf(c)).toBe('critical');
    expect(toneOf(read)).toBe('critical');
    expect(toneOf({ ...c, resolvedAt: '2026-10-21T00:00:00Z' })).toBe('resolved');
  });

  it('has one icon and a written label per severity', () => {
    expect(Object.fromEntries(Object.entries(SEVERITY).map(([k, v]) => [k, v.icon]))).toEqual({ critical: 'ATTENTION', action: 'warning', info: 'info', resolved: 'ok' });
    expect(Object.values(SEVERITY).every(v => v.label.length > 0)).toBe(true);
  });
});

describe('flat list order', () => {
  it('lists every notice on its own — nothing is grouped or dropped', () => {
    const list = sortNotices(sample());
    expect(list).toHaveLength(sample().length);
    expect(new Set(list.map(x => x.id)).size).toBe(list.length);
  });

  it('orders critical, action required, information, then resolved; newest first within each', () => {
    expect(sortNotices(sample()).map(x => x.title)).toEqual([
      'Commitment CM-1004 is overdue', 'Commitment CM-1006 is overdue', 'Payment overdue on contract CT-1002',
      'Contract CT-1004 has no end date',
      'Client TAK: you are now the project manager', 'Client SEWAR: you are now the project manager',
      'Payment due on contract CT-1009'
    ]);
  });

  it('breaks equal times by the higher id, so the order never changes between renders', () => {
    const a = n({ kind: 'Overdue', title: 'a' }), b = n({ kind: 'Overdue', title: 'b' });
    expect(sortNotices([a, b]).map(x => x.title)).toEqual(['b', 'a']);
    expect(sortNotices([b, a]).map(x => x.title)).toEqual(['b', 'a']);
  });

  it('does not change the list it is given', () => {
    const s = sample();
    const before = s.map(x => x.id);
    sortNotices(s);
    expect(s.map(x => x.id)).toEqual(before);
  });
});

describe('rows', () => {
  it('names the category of the record', () => {
    const [assigned, renewal, , payment] = sample();
    expect(entityOf(payment).label).toBe('Payment');
    expect(entityOf(renewal).label).toBe('Contract');
    expect(entityOf(assigned).noun).toBe('client');
    expect(entityOf({ entityType: 'Case' }).label).toBe('Ticket');
    expect(entityOf({ entityType: null }).label).toBe('Notification');
  });
});

describe('relative time', () => {
  const now = Date.parse('2026-10-28T12:00:00Z');
  const at = (ms: number) => new Date(now - ms).toISOString();
  it('reads naturally', () => {
    expect(relativeTime(at(20_000), now)).toBe('Just now');
    expect(relativeTime(at(60_000), now)).toBe('1 minute ago');
    expect(relativeTime(at(5 * 60_000), now)).toBe('5 minutes ago');
    expect(relativeTime(at(2 * 3600_000), now)).toBe('2 hours ago');
    expect(relativeTime(at(30 * 3600_000), now)).toBe('Yesterday');
    expect(relativeTime(at(6 * 86400_000), now)).toBe('6 days ago');
    expect(relativeTime(at(40 * 86400_000), now)).toBeNull();
    expect(relativeTime(new Date(now + 60_000).toISOString(), now)).toBe('Just now');
  });
});

// A114: dependency alerts on commitments.
describe('dependency alerts', () => {
  it('treats a forecast-late commitment as critical and an at-risk one as action required', () => {
    expect(severityOf({ kind: 'ForecastLate' })).toBe('critical');
    expect(severityOf({ kind: 'AtRisk' })).toBe('action');
  });
});
