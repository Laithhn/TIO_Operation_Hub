// A72: how notifications are presented — severity sections, grouping, actions and relative times. Pure functions (unit-tested).

export type Severity = 'critical' | 'action' | 'info';
export type Notice = {
  id: number; kind: string; title: string; body?: string | null; link?: string | null; createdAt: string; readAt?: string | null; resolvedAt?: string | null;
  severity?: Severity; entityType?: string | null;
};
export type NoticePage = { items: Notice[]; page: number; pageSize: number; totalCount: number; unreadCount: number; criticalCount?: number; unreadPayments?: number };

/** Severity of notices written by an older server (no severity field): the same rule as NotificationSeverity on the server. */
export function severityOf(n: Pick<Notice, 'kind' | 'severity'>): Severity {
  if (n.severity) return n.severity;
  if (n.kind === 'Overdue' || n.kind === 'PaymentOverdue') return 'critical';
  if (['DueSoon', 'PaymentDue', 'Renewal', 'Handover'].includes(n.kind)) return 'action';
  return 'info';
}

export const SECTION: Record<Severity | 'resolved', { label: string; icon: string }> = {
  critical: { label: 'Critical / overdue', icon: 'error' },
  action: { label: 'Action required', icon: 'warning' },
  info: { label: 'Informational', icon: 'info' },
  resolved: { label: 'Resolved', icon: 'ok' }
};
const ORDER: (Severity | 'resolved')[] = ['critical', 'action', 'info', 'resolved'];

/** The short status written on each card (never colour alone). */
export function chipOf(n: Notice): string {
  if (n.resolvedAt) return 'Resolved';
  switch (n.kind) {
    case 'Overdue': case 'PaymentOverdue': return 'Overdue';
    case 'DueSoon': return 'Due soon';
    case 'PaymentDue': return 'Payment due';
    case 'Renewal': return 'Needs attention';
    case 'Handover': return 'To acknowledge';
    case 'Team': return 'Project team';
    case 'Report': return 'Report';
    default: return 'Assigned';
  }
}

type EntityInfo = { icon: string; source: string; action: string; plural: string; list?: string };
/** Per record type: icon, where it comes from, the action on the card and, for groups, the list page. Routes are those of App.tsx. */
export const ENTITY: Record<string, EntityInfo> = {
  Payment: { icon: 'MONEY', source: 'Payment management', action: 'Review payment', plural: 'payments', list: '/notifications?show=payments' },
  Contract: { icon: 'DOCUMENT', source: 'Contract management', action: 'Review contract', plural: 'contracts', list: '/contracts' },
  Commitment: { icon: 'commitment', source: 'Commitment management', action: 'View commitment', plural: 'commitments', list: '/commitments' },
  Case: { icon: 'case', source: 'Case management', action: 'View case', plural: 'cases', list: '/cases' },
  Escalation: { icon: 'escalation', source: 'Escalations', action: 'View escalation', plural: 'escalations', list: '/escalations' },
  Client: { icon: 'clients', source: 'Client management', action: 'View client', plural: 'clients', list: '/clients' },
  Project: { icon: 'project', source: 'Projects', action: 'View project', plural: 'projects', list: '/projects' },
  Environment: { icon: 'app', source: 'Environments', action: 'View environment', plural: 'environments' },
  Server: { icon: 'server', source: 'Servers', action: 'View server', plural: 'servers' },
  Handover: { icon: 'handover', source: 'Handovers', action: 'Open handovers', plural: 'handovers', list: '/handovers' },
  Report: { icon: 'report', source: 'Reporting Center', action: 'Open report', plural: 'reports' }
};
export const entityOf = (n: Notice): EntityInfo => (n.entityType && ENTITY[n.entityType]) || { icon: 'bell', source: 'TIO Operations Hub', action: 'Open', plural: 'notices' };

/** Record references in a title, e.g. CT-1002 or CM-1006. */
export function refOf(title: string): string | null {
  return /\b[A-Z][A-Z0-9]*-\d+\b/.exec(title)?.[0] ?? null;
}

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

export type Entry = { type: 'one'; notice: Notice } | { type: 'group'; key: string; kind: string; notices: Notice[]; title: string; body: string };
export type Section = { key: Severity | 'resolved'; label: string; icon: string; entries: Entry[]; unread: number };

const listText = (refs: string[]) => refs.length <= 1 ? refs.join('') : refs.length <= 3 ? `${refs.slice(0, -1).join(', ')} and ${refs[refs.length - 1]}` : `${refs.slice(0, 3).join(', ')} and ${refs.length - 3} more`;

function groupTitle(kind: string, plural: string, n: number): string {
  switch (kind) {
    case 'Overdue': case 'PaymentOverdue': return `${n} overdue ${plural}`;
    case 'DueSoon': return `${n} ${plural} due soon`;
    case 'PaymentDue': return `${n} payments coming due`;
    case 'Renewal': return `${n} contracts need a renewal decision`;
    case 'Assigned': return `${n} ${plural} assigned to you`;
    default: return `${n} ${plural}`;
  }
}

/**
 * Sections by severity (critical, action required, informational, then resolved), each sorted newest first; only sections that have notices.
 * Open notices of the same kind about the same type of record are grouped when there are at least `min` of them; every notice keeps its own
 * read and resolved state and stays reachable inside the group.
 */
export function buildSections(items: Notice[], min = 2): Section[] {
  const by = new Map<Severity | 'resolved', Notice[]>();
  for (const n of items) {
    const k = n.resolvedAt ? 'resolved' : severityOf(n);
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(n);
  }
  return ORDER.filter(k => by.has(k)).map(k => {
    const list = [...by.get(k)!].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
    const entries: Entry[] = [];
    if (k === 'resolved') list.forEach(n => entries.push({ type: 'one', notice: n }));
    else {
      const groups = new Map<string, Notice[]>();
      for (const n of list) {
        const g = `${n.kind}|${n.entityType ?? ''}`;
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(n);
      }
      const done = new Set<string>();
      for (const n of list) {
        const g = `${n.kind}|${n.entityType ?? ''}`;
        const members = groups.get(g)!;
        if (members.length < min || !n.entityType) { entries.push({ type: 'one', notice: n }); continue; }
        if (done.has(g)) continue;
        done.add(g);
        const refs = members.map(x => refOf(x.title)).filter((x): x is string => !!x);
        const needs = k === 'info' ? '' : members.length === 1 ? ' requires attention' : ' require attention';
        entries.push({
          type: 'group', key: g, kind: n.kind, notices: members, title: groupTitle(n.kind, entityOf(n).plural, members.length),
          body: refs.length ? `${listText(refs)}${needs}.` : ''
        });
      }
    }
    return { key: k, ...SECTION[k], entries, unread: list.filter(n => !n.readAt && !n.resolvedAt).length };
  });
}
