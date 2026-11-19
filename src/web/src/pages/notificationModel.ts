// A72 / A121: how notifications are presented — one flat list, one severity icon per notice, actions and relative times. Pure functions (unit-tested).
// A121 (owner request, 19 Nov 2026): related alerts are no longer grouped ("4 overdue payments"); every notice is its own row.

export type Severity = 'critical' | 'action' | 'info';
export type Tone = Severity | 'resolved';
export type Notice = {
  id: number; kind: string; title: string; body?: string | null; link?: string | null; createdAt: string; readAt?: string | null; resolvedAt?: string | null;
  severity?: Severity; entityType?: string | null;
};
export type NoticePage = { items: Notice[]; page: number; pageSize: number; totalCount: number; unreadCount: number; criticalCount?: number; unreadPayments?: number };

/** Severity of notices written by an older server (no severity field): the same rule as NotificationSeverity on the server. */
export function severityOf(n: Pick<Notice, 'kind' | 'severity'>): Severity {
  if (n.severity) return n.severity;
  if (n.kind === 'Overdue' || n.kind === 'PaymentOverdue' || n.kind === 'ForecastLate') return 'critical';
  if (['DueSoon', 'PaymentDue', 'Renewal', 'Handover', 'AtRisk'].includes(n.kind)) return 'action';
  return 'info';
}

/** What the row's icon shows: a resolved alert (its business condition cleared) reads as resolved; otherwise its severity, read or not. */
export const toneOf = (n: Pick<Notice, 'kind' | 'severity' | 'resolvedAt'>): Tone => n.resolvedAt ? 'resolved' : severityOf(n);

/** The one severity icon on the left of each row, with a written label so severity is never colour alone. */
export const SEVERITY: Record<Tone, { label: string; icon: string }> = {
  critical: { label: 'Critical', icon: 'ATTENTION' },   // circle with an exclamation mark (framework glyph)
  action: { label: 'Action required', icon: 'warning' },
  info: { label: 'Information', icon: 'info' },
  resolved: { label: 'Resolved', icon: 'ok' }
};
const RANK: Record<Tone, number> = { critical: 0, action: 1, info: 2, resolved: 3 };

/**
 * Critical, action required, information, then resolved; newest first within each, and the higher id first on equal times.
 * The same order as the server's sort=severity, so a page keeps its order whichever side sorts it.
 */
export function sortNotices(items: Notice[]): Notice[] {
  return [...items].sort((a, b) => RANK[toneOf(a)] - RANK[toneOf(b)] || b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}

type EntityInfo = { label: string; noun: string };
/** Per record type: the category written under each notice and the noun in the Review button's accessible name. */
export const ENTITY: Record<string, EntityInfo> = {
  Payment: { label: 'Payment', noun: 'payment' },
  Contract: { label: 'Contract', noun: 'contract' },
  Commitment: { label: 'Commitment', noun: 'commitment' },
  Case: { label: 'Ticket', noun: 'ticket' },
  Escalation: { label: 'Escalation', noun: 'escalation' },
  Client: { label: 'Client', noun: 'client' },
  Project: { label: 'Project', noun: 'project' },
  Environment: { label: 'Environment', noun: 'environment' },
  Server: { label: 'Server', noun: 'server' },
  Handover: { label: 'Handover', noun: 'handover' },
  Report: { label: 'Report', noun: 'report' }
};
export const entityOf = (n: Pick<Notice, 'entityType'>): EntityInfo => (n.entityType && ENTITY[n.entityType]) || { label: 'Notification', noun: 'notification' };

/** "Just now", "5 minutes ago", "2 hours ago", "Yesterday", "6 days ago"; older than four weeks: null (show the date). */
export function relativeTime(iso: string, now = Date.now()): string | null {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m === 1 ? '1 minute ago' : `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 28) return `${d} days ago`;
  return null;
}
