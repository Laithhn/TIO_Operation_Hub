import type { Me } from './hooks';
import catalog from './rightsRequirements.json';

type RightSnapshot = Pick<Me, 'rights'>;
const requirements = new Map(catalog.keys.map((key, index) =>
  [key.toLowerCase(), catalog.requires[index].map(required => catalog.keys[required])] as const));
/** Fail closed even for a stale or manually constructed snapshot. API authorization is independent. */
export function hasRightKey(me: RightSnapshot | undefined, key: string, seen = new Set<string>()): boolean {
  const normalized = key.toLowerCase();
  if (!me || seen.has(normalized) || !requirements.has(normalized) || !me.rights.some(k => k.toLowerCase() === normalized)) return false;
  const path = new Set([...seen, normalized]);
  return requirements.get(normalized)!.every(required => hasRightKey(me, required, path));
}
export const hasRight = (me: RightSnapshot | undefined, resource: string | undefined, action: string) =>
  !!resource && hasRightKey(me, `${resource}:${action}`);
export const hasAnyAction = (me: RightSnapshot | undefined, action: string) =>
  !!me?.rights?.some(key => key.endsWith(`:${action}`) && hasRightKey(me, key));
export const isAdministrator = (me: RightSnapshot | undefined) => hasRightKey(me, 'Platform:Administration');
export const canExport = (me: RightSnapshot | undefined) => hasRightKey(me, 'Platform:Export');
export const canAudit = (me: RightSnapshot | undefined) => hasRightKey(me, 'Platform:Audit');
export const seesTechnical = (me: RightSnapshot | undefined) => hasRightKey(me, 'Platform:TechnicalDetail');
/** Effective access of any kind. Which records it reaches is decided by data scope. */
export const hasAccess = (me: Pick<Me, 'rights' | 'roles'> | undefined) => !!me && (me.roles.length > 0 || me.rights.length > 0);
export const tabPermission = (resource: string, tab: string, action = 'View') =>
  tab === 'files' ? `${resource}:Attachments${action === 'View' ? 'View' : action}` : tab === 'history' ? `${resource}:HistoryView` : `tab.${resource}.${tab}:${action}`;
export const canViewTab = (me: RightSnapshot | undefined, resource: string, tab: string) => hasRightKey(me, tabPermission(resource, tab));

const records: Record<string, string> = {
  Client: 'ClientStructure', Region: 'ClientStructure', Project: 'Projects', Organization: 'ClientStructure',
  ClientEnvironment: 'Environments', Contract: 'Contracts', Environment: 'Environments', Asset: 'Servers', Volume: 'Servers', SharedStorage: 'Servers', Component: 'Servers',
  Installation: 'Installations', Product: 'Products', Module: 'Products', Feature: 'Products', Microservice: 'Products',
  Case: 'Cases', Commitment: 'Commitments', Team: 'Teams', Handover: 'Teams',
  Contact: 'OtherOperations', ResponsibilityBoundary: 'OtherOperations', Boundary: 'OtherOperations', FirewallRule: 'OtherOperations', Escalation: 'OtherOperations', LookupValue: 'OtherOperations'
};
export const resourceForRecord = (recordType: string) => records[recordType];
const paths: Record<string, string> = {
  clients: 'ClientStructure', regions: 'ClientStructure', projects: 'Projects', organizations: 'ClientStructure',
  contracts: 'Contracts', environments: 'Environments', assets: 'Servers', components: 'Servers', volumes: 'Servers', 'shared-storage': 'Servers',
  installations: 'Installations', products: 'Products', cases: 'Cases', commitments: 'Commitments', teams: 'Teams', handovers: 'Teams',
  contacts: 'OtherOperations', boundaries: 'OtherOperations', 'firewall-rules': 'OtherOperations', escalations: 'OtherOperations'
};
export function resourceForPath(path: string): string | undefined {
  if (/^\/admin\/lookups\/\d+$/.test(path)) return 'OtherOperations';
  return paths[path.split('/').filter(Boolean)[0]];
}

export const canDeletePath = (me: Me | undefined, path: string) => /^\/admin\/lookups\/\d+$/.test(path)
  ? hasRight(me, 'AdminConfig', 'Delete') : hasRight(me, resourceForPath(path), 'Delete') && (!path.startsWith('/regions/') || hasRight(me, 'tab.ClientStructure.structure', 'Delete')) && (!path.startsWith('/boundaries/') && !path.startsWith('/contacts/') || hasRight(me, 'tab.ClientStructure.contacts', 'Delete'));

const businessResources = ['ClientStructure', 'Projects', 'Contracts', 'Environments', 'Servers', 'Installations', 'Products', 'Cases', 'Commitments', 'Teams', 'OtherOperations'];
/** Explicit route requirements. The API independently checks the same registered capabilities before returning data. */
export function routePermissions(pathname: string): string[] {
  const parts = pathname.split('/').filter(Boolean);
  const root = parts[0] ?? '';
  if (['', 'map', 'actions', 'data-quality'].includes(root)) return ['Dashboard:View', ...businessResources.map(r => `${r}:View`)];
  if (root === 'notifications') return ['Notifications:View'];
  if (root === 'notes') return ['PersonalNotes:View'];
  if (root === 'reporting-center' || root === 'reports') return ['Reporting:View'];
  const resource = root === 'versions' ? 'Installations' : root === 'microservices' ? 'Products'
    : root === 'reassignment' ? 'Teams' : resourceForPath(pathname);
  if (!resource) return ['unregistered:Denied'];
  const required = [`${resource}:View`];
  if (parts[1] === 'new') required.push(`${resource}:Create`);
  else if (parts[2] === 'edit') required.push(`${resource}:DetailsView`, `${resource}:Maintain`);
  else if (/^\d+$/.test(parts[1] ?? '')) required.push(`${resource}:DetailsView`);
  return required;
}

const routeAreas: Record<string, string> = {
  map: 'ClientMap', actions: 'ActionList', 'data-quality': 'DataQuality', handovers: 'Handovers', reassignment: 'Reassignment'
};
const reportingAreas: Record<string, string> = { '': 'ReportOverview', library: 'ReportLibrary', builder: 'ReportBuilder', 'my-reports': 'SavedReports', schedules: 'ReportSchedules', history: 'ReportHistory', templates: 'ReportTemplates' };
const adminAreas: Record<string, string> = { integrations: 'AdminIntegrations', '': 'AdminUsers', users: 'AdminUsers', roles: 'AdminRoles', rights: 'AdminRoles', groups: 'AdminGroups', config: 'AdminConfig', reference: 'AdminConfig', 'network-zones': 'AdminConfig', policies: 'AdminConfig', jira: 'AdminConfig', settings: 'AdminSettings', audit: 'AdminAudit' };

export function canAccessPath(me: Me | undefined, pathname: string, search = ''): boolean {
  if (!me) return false;
  const parts = pathname.split('/').filter(Boolean);
  const root = parts[0] ?? '';
  if (root === 'admin') {
    if (!parts[1] || parts[1] === 'access') return hasRight(me, 'AdminUsers', 'View') || hasRight(me, 'AdminRoles', 'View');
    if (parts[1] === 'archived') return hasAnyAction(me, 'ArchiveRestore');
    if (parts[1] === 'products') return hasRight(me, 'Products', 'View');
    const area = adminAreas[parts[1] ?? ''];
    return !!area && hasRight(me, area, 'View');
  }
  if (root === 'reporting-center' || root === 'reports') {
    const area = reportingAreas[parts[1] ?? ''];
    return canExport(me) && !!area && hasRight(me, area, 'View');
  }
  if (root === 'clients' && (!parts[1] || /^\d+$/.test(parts[1]) && !parts[2])) {
    if (!hasRightKey(me, 'ClientStructure:Access')) return false;
    const requested = new URLSearchParams(search).get('tab');
    if (requested) return canViewTab(me, 'ClientStructure', requested);
    return catalog.keys.some(key => key.startsWith('tab.ClientStructure.') && key.endsWith(':View') && hasRightKey(me, key))
      || hasRight(me, 'ClientStructure', 'AttachmentsView') || hasRight(me, 'ClientStructure', 'HistoryView');
  }
  if (/^\d+$/.test(parts[1] ?? '') && ['environments', 'cases'].includes(root)) {
    const requested = new URLSearchParams(search).get('tab');
    if (requested && !canViewTab(me, root === 'cases' ? 'Cases' : 'Environments', requested)) return false;
  }
  if (root === 'regions' && !canViewTab(me, 'ClientStructure', 'structure')) return false;
  if (routeAreas[root] && !hasRight(me, routeAreas[root], 'View')) return false;
  // A limited allow cannot be judged from the path alone: the page opens, the record's canEdit decides, and the API enforces.
  const scoped = new Set((me.scopedAllowRights ?? []).map(key => key.toLowerCase()));
  return routePermissions(pathname).every(key => hasRightKey(me, key) || (parts[2] === 'edit' && key.endsWith(':Maintain') && scoped.has(key.toLowerCase())));
}
