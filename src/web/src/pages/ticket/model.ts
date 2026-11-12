// The ticket as GET /cases/{id} returns it (moved from Cases.tsx for A106; the API contract is unchanged).
import type { UserRef } from '../../api';
import type { FreshnessT } from '../../ui/kit';
import type { JiraSource } from '../jira/CaseJira';

export type SlaObligation = { status: string; dueAt?: string; actualAt?: string; elapsedMinutes?: number; breachMinutes?: number };
export type CaseSlaT = {
  applied?: { contractRef: string; priority?: string; responseMinutes?: number; resolutionMinutes?: number; basis: string; support24x7: boolean; supportDays: string; supportFrom?: string; supportTo?: string; timeZone?: string; pausesWhileWaitingOnCustomer: boolean; at: string };
  startAt: string; startsAtJiraCreation: boolean; response: SlaObligation; resolution: SlaObligation; pausedMinutes?: number; note?: string; calculatedAt?: string; operationalDueAt?: string;
};

export type CaseDto = {
  id: number; ref: string; title: string; type: string; scope: string; status: string; statusCode: string; statusFromJira: boolean; clientRepresentative?: string; internalAssignee?: string; statusOptions: string[]; priority: string; impactSummary: string; progressSummary?: string; nextAction: string; nextReviewAt: string;
  dueAt?: string; dueTimeZone?: string; dueLocal?: string; client?: { id: number; code: string; name: string }; team?: { id: number; code: string; name: string };
  owner?: UserRef; backupOwner?: UserRef; unassigned: boolean; ownerDeactivated: boolean; coordinator?: UserRef; responsibleParty: string; responsibleOrganization?: string;
  waiting?: { reason: string; since: string }; waitingIntervals: { reason: string; note?: string; startedAt: string; endedAt?: string }[]; waitingHours: number; openedAt: string; openedFromJira: boolean; ageDays: number; currentCycleAgeDays?: number; reopenCount: number;
  unknownEnvironmentReason?: string; validationRequest?: string; outcome?: string; validationEvidence?: string;
  evidenceException?: { reason: string; approvedBy?: UserRef; followUpOwner?: UserRef; followUpDate?: string }; cancelReason?: string; closedAt?: string; cancelledAt?: string; createdAt: string; lastReviewedAt?: string;
  freshness: FreshnessT; reviewOverdue: boolean; overdue: boolean;
  environments: { id: number; name: string; type: string; regionCode?: string }[]; assets: { id: number; name: string; type: string }[]; components: { id: number; name: string; role: string; installation: string }[];
  jiraReferences: { id: number; instance: string; kind: string; jiraInstanceId: number; issueKey: string; url: string; reuseReason?: string; origin: string }[]; jiraSource?: JiraSource; removedJiraReferences: { id: number; instance: string; issueKey: string; removedAt: string }[];
  commitments: { id: number; ref: string; description: string; status: string; currentDueAt: string; timeZone: string }[];
  events: { id: number; type: string; fromValue?: string; toValue?: string; note?: string; at: string; by?: string }[];
  contract?: { id: number; ref: string; title: string; status: string }; contractFromJiraSpace: boolean;
  sla: CaseSlaT;
  permissions: { canEdit: boolean; canTriage: boolean; canAssign: boolean; canStart: boolean; canClose: boolean; canRequestValidation: boolean; canReturnToWork: boolean; canChangeStatus: boolean; canSetWaiting: boolean; canChangeDue: boolean; canAuthorizeEvidenceException: boolean; canReopen: boolean; canCancel: boolean };
  version: string;
};

export type CaseImpact = {
  label: string; installations: { id: number; instanceName: string; product: string; environment: string; client: string }[]; clients: { id: number; code: string }[];
  components: { id: number; name: string; role: string }[]; firewallRules: { id: number; purpose: string; source: string; destination: string; ports?: string; protocol: string }[];
};

export const minutes = (m?: number | null) => m === undefined || m === null ? '—' : m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`;

/** One row of the Affected records tab: environments, assets and components of the ticket in one searchable list. */
export type AffectedRow = { key: string; kind: 'environment' | 'asset' | 'component'; name: string; to?: string; type?: string; detail?: string };

export function affectedRows(c: Pick<CaseDto, 'environments' | 'assets' | 'components'>): AffectedRow[] {
  return [
    ...c.environments.map(e => ({ key: `e${e.id}`, kind: 'environment' as const, name: `${e.regionCode ? `${e.regionCode} / ` : ''}${e.name}`, to: `/environments/${e.id}`, type: e.type, detail: e.regionCode ? `Region ${e.regionCode}` : undefined })),
    ...c.assets.map(a => ({ key: `a${a.id}`, kind: 'asset' as const, name: a.name, to: `/assets/${a.id}`, type: a.type })),
    ...c.components.map(x => ({ key: `c${x.id}`, kind: 'component' as const, name: x.name, type: x.role, detail: `Installation ${x.installation}` }))
  ];
}

/** Case-insensitive match of every word of the query against the row's visible text. */
export function matchesQuery(q: string, ...texts: (string | undefined | null)[]) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = texts.filter(Boolean).join(' ').toLowerCase();
  return words.every(w => hay.includes(w));
}
