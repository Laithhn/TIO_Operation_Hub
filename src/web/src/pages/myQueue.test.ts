import { describe, expect, it } from 'vitest';
import { buildQueue, type QueueCommitment, type QueueTicket } from './myQueue';

const ticket = (id: number, x: Partial<QueueTicket> = {}): QueueTicket => ({ id, ref: `CS-${id}`, title: `Ticket ${id}`, priority: 'Normal', statusCode: 'InProgress', overdue: false, ...x });
const commitment = (id: number, x: Partial<QueueCommitment> = {}): QueueCommitment => ({ id, ref: `CM-${id}`, description: `Commitment ${id}`, currentDueAt: '2026-12-01T00:00:00Z', overdue: false, ...x });

describe('my work queue', () => {
  it('puts tickets and commitments in one list, overdue first', () => {
    const q = buildQueue([ticket(1, { dueAt: '2026-12-01T00:00:00Z' })], [commitment(1, { overdue: true, currentDueAt: '2026-11-01T00:00:00Z' })]);
    expect(q.map(i => i.ref)).toEqual(['CM-1', 'CS-1']);
    expect(q[0].to).toBe('/commitments/1');
  });

  it('orders by priority, then by the earliest deadline, with no deadline last', () => {
    const q = buildQueue([
      ticket(1), ticket(2, { dueAt: '2026-12-05T00:00:00Z' }), ticket(3, { priority: 'High', dueAt: '2026-12-20T00:00:00Z' }), ticket(4, { priority: 'Critical', dueAt: '2026-12-30T00:00:00Z' })
    ], [commitment(5, { currentDueAt: '2026-12-02T00:00:00Z' })]);
    expect(q.map(i => i.ref)).toEqual(['CS-4', 'CS-3', 'CM-5', 'CS-2', 'CS-1']);
  });

  it('gives every item a next step', () => {
    const [waiting] = buildQueue([ticket(1, { waitingReason: 'Customer', nextAction: 'Call' })], []);
    expect(waiting.nextStep).toBe('Follow up with the customer');
    expect(buildQueue([ticket(1, { nextAction: ' Patch server ' })], [])[0].nextStep).toBe('Patch server');
    expect(buildQueue([ticket(1, { nextAction: '' })], [])[0].nextStep).toBe('Record the next action');
    expect(buildQueue([ticket(1, { overdue: true })], [])[0].nextStep).toBe('Record progress or change the due date');
    expect(buildQueue([], [commitment(1, { overdue: true })])[0].nextStep).toBe('Deliver it, or agree a new date');
  });
});
