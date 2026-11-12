import { describe, expect, it } from 'vitest';
import { renewalPeriod, shiftDay } from './contractRenewal';

describe('renewalPeriod', () => {
  it('starts the day after the old term and runs as long', () => {
    expect(renewalPeriod('2025-01-01', '2025-12-31')).toMatchObject({ startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(renewalPeriod('2025-10-15', '2027-10-14')).toMatchObject({ startDate: '2027-10-15', endDate: '2029-10-14' });
  });

  it('keeps a whole-month term through a leap year', () => {
    expect(renewalPeriod('2027-01-01', '2027-12-31')).toMatchObject({ startDate: '2028-01-01', endDate: '2028-12-31' });
    expect(renewalPeriod('2028-03-01', '2029-02-28')).toMatchObject({ startDate: '2029-03-01', endDate: '2030-02-28' });
  });

  it('counts days for a term that is not whole months', () => {
    expect(renewalPeriod('2026-01-10', '2026-01-19')).toMatchObject({ startDate: '2026-01-20', endDate: '2026-01-29' });
  });

  it('leaves dates to the person when they cannot be worked out', () => {
    expect(renewalPeriod('2026-06-26', null)).toEqual({ startDate: '', endDate: '', shiftDays: null });
    expect(renewalPeriod(null, null)).toEqual({ startDate: '', endDate: '', shiftDays: null });
    expect(renewalPeriod(null, '2026-12-31')).toEqual({ startDate: '2027-01-01', endDate: '', shiftDays: null });
  });

  it('never overlaps the old term', () => {
    for (const [s, e] of [['2025-01-01', '2025-12-31'], ['2026-02-28', '2027-02-27'], ['2024-02-29', '2025-02-28']]) {
      expect(renewalPeriod(s, e).startDate > e).toBe(true);
    }
  });
});

describe('shiftDay', () => {
  it('moves a date with the term and clears what it cannot move', () => {
    const { shiftDays } = renewalPeriod('2025-01-01', '2025-12-31');
    expect(shiftDay('2025-03-15', shiftDays)).toBe('2026-03-15');
    expect(shiftDay(null, shiftDays)).toBe('');
    expect(shiftDay('2025-03-15', null)).toBe('');
  });
});
