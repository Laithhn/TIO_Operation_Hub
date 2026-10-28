import { describe, expect, it } from 'vitest';
import { buildSections, chipOf, entityOf, refOf, relativeTime, severityOf, type Notice } from './notificationModel';

// A72: sections by severity, grouping, chips, actions and relative times of the notification pop-up and center.
let id = 0;
const n = (p: Partial<Notice> & Pick<Notice, 'kind' | 'title'>): Notice => ({ id: ++id, createdAt: '2026-10-20T10:00:00Z', link: '/x', ...p });

const sample = (): Notice[] => [
  n({ kind: 'Assigned', title: 'Client TAK: you are now the project manager', entityType: 'Client', link: '/clients/1', createdAt: '2026-10-22T08:00:00Z' }),
  n({ kind: 'Renewal', title: 'Contract CT-1004 has no end date', entityType: 'Contract', link: '/contracts/4', createdAt: '2026-10-26T08:00:00Z', readAt: '2026-10-26T09:00:00Z' }),
  n({ kind: 'Overdue', title: 'Commitment CM-1006 is overdue', entityType: 'Commitment', link: '/commitments/6', createdAt: '2026-10-22T08:00:00Z' }),
  n({ kind: 'PaymentOverdue', title: 'Payment overdue on contract CT-1002 (146,400.00 AED)', entityType: 'Payment', link: '/contracts/2', createdAt: '2026-10-21T08:00:00Z' }),
  n({ kind: 'Overdue', title: 'Commitment CM-1004 is overdue', entityType: 'Commitment', link: '/commitments/4', createdAt: '2026-10-23T08:00:00Z', readAt: '2026-10-23T09:00:00Z' }),
  n({ kind: 'Assigned', title: 'Client SEWAR: you are now the project manager', entityType: 'Client', link: '/clients/2', createdAt: '2026-10-21T08:00:00Z' }),
  n({ kind: 'PaymentDue', title: 'Payment due on contract CT-1009', entityType: 'Payment', resolvedAt: '2026-10-27T08:00:00Z', createdAt: '2026-10-25T08:00:00Z' })
];

describe('severity and sections', () => {
  it('derives severity from the kind when the server does not send it', () => {
    expect(severityOf({ kind: 'Overdue' })).toBe('critical');
    expect(severityOf({ kind: 'PaymentOverdue' })).toBe('critical');
    expect(severityOf({ kind: 'Renewal' })).toBe('action');
    expect(severityOf({ kind: 'Assigned' })).toBe('info');
    expect(severityOf({ kind: 'Report', severity: 'action' })).toBe('action');
  });

  it('orders critical, action required, informational, then resolved, and leaves out empty sections', () => {
    const s = buildSections(sample());
    expect(s.map(x => x.key)).toEqual(['critical', 'action', 'info', 'resolved']);
    expect(buildSections(sample().filter(x => x.kind === 'Assigned')).map(x => x.key)).toEqual(['info']);
    expect(buildSections([])).toEqual([]);
  });

  it('groups related alerts, newest first, keeping each notice and its read state', () => {
    const critical = buildSections(sample())[0];
    expect(critical.entries.map(e => e.type)).toEqual(['group', 'one']);
    const g = critical.entries[0];
    if (g.type !== 'group') throw new Error('group expected');
    expect(g.title).toBe('2 overdue commitments');
    expect(g.body).toBe('CM-1004 and CM-1006 require attention.');
    expect(g.notices.map(x => x.title)).toEqual(['Commitment CM-1004 is overdue', 'Commitment CM-1006 is overdue']);
    expect(g.notices[0].readAt).toBeTruthy();
    expect(g.notices[1].readAt).toBeFalsy();
    expect(critical.unread).toBe(2);   // CM-1006 and the payment
  });

  it('never groups unrelated kinds or resolved alerts, and groups informational assignments without urgency wording', () => {
    const s = buildSections(sample());
    const info = s.find(x => x.key === 'info')!;
    expect(info.entries).toHaveLength(1);
    const g = info.entries[0];
    expect(g.type === 'group' && g.title).toBe('2 clients assigned to you');
    expect(g.type === 'group' && g.body).toBe('');
    expect(s.find(x => x.key === 'resolved')!.entries.every(e => e.type === 'one')).toBe(true);
    expect(s.find(x => x.key === 'resolved')!.unread).toBe(0);
    expect(s.find(x => x.key === 'action')!.entries.map(e => e.type)).toEqual(['one']);
  });

  it('summarises long reference lists', () => {
    const many = [1, 2, 3, 4, 5].map(i => n({ kind: 'Overdue', title: `Case CS-10${i} is overdue`, entityType: 'Case' }));
    const g = buildSections(many)[0].entries[0];
    expect(g.type === 'group' && g.body).toMatch(/and 2 more require attention\.$/);
  });
});

describe('cards', () => {
  it('writes the status and the action, not colour alone', () => {
    const [assigned, renewal, , payment] = sample();
    expect(chipOf(payment)).toBe('Overdue');
    expect(chipOf(renewal)).toBe('Needs attention');
    expect(chipOf({ ...payment, resolvedAt: '2026-10-27T00:00:00Z' })).toBe('Resolved');
    expect(entityOf(payment).action).toBe('Review payment');
    expect(entityOf(renewal).action).toBe('Review contract');
    expect(entityOf(assigned).action).toBe('View client');
    expect(entityOf({ ...assigned, entityType: null }).action).toBe('Open');
  });

  it('finds the record reference in a title', () => {
    expect(refOf('Payment overdue on contract CT-1002 (146,400.00 AED)')).toBe('CT-1002');
    expect(refOf('You were added to a project team')).toBeNull();
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
