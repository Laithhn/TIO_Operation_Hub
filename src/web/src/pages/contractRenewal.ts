/** Dates of a renewal. Calendar days as yyyy-MM-dd, worked out in UTC so a time zone cannot move a date. */
const toDay = (s: string) => new Date(`${s}T00:00:00Z`);
const fromDay = (d: Date) => d.toISOString().slice(0, 10);
const MS_PER_DAY = 86_400_000;

export function addDays(day: string, days: number): string {
  return fromDay(new Date(toDay(day).getTime() + days * MS_PER_DAY));
}

/** The same calendar day a number of months later; a day the shorter month lacks becomes its last day. */
function addMonths(day: string, months: number): string {
  const d = toDay(day);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return fromDay(target);
}

/**
 * The next period of a contract: it starts the day after the old one ends and runs as long, so the two never overlap and both can cover one
 * Jira space. A whole-month term stays whole months, so 2025-01-01 to 2025-12-31 renews as 2026-01-01 to 2026-12-31 in a leap year too.
 * With no end date there is no next period to work out, and the dates are left for the person to enter.
 */
export function renewalPeriod(start?: string | null, end?: string | null): { startDate: string; endDate: string; shiftDays: number | null } {
  if (!end) return { startDate: '', endDate: '', shiftDays: null };
  const startDate = addDays(end, 1);
  if (!start) return { startDate, endDate: '', shiftDays: null };
  const shiftDays = Math.round((toDay(startDate).getTime() - toDay(start).getTime()) / MS_PER_DAY);
  const s = toDay(start);
  const n = toDay(startDate);
  const months = (n.getUTCFullYear() - s.getUTCFullYear()) * 12 + n.getUTCMonth() - s.getUTCMonth();
  const wholeMonths = s.getUTCDate() === n.getUTCDate() && months > 0;
  return { startDate, endDate: wholeMonths ? addDays(addMonths(startDate, months), -1) : addDays(startDate, shiftDays - 1), shiftDays };
}

/** A date inside the old term, moved along with it; empty when it cannot be worked out. */
export function shiftDay(day: string | null | undefined, shiftDays: number | null): string {
  return day && shiftDays !== null ? addDays(day, shiftDays) : '';
}
