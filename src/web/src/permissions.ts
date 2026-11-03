import type { Me } from './hooks';
import permissionRequirements from './permissionRequirements.json';

type PermissionSnapshot = Pick<Me, 'permissions'>;
const requirements = new Map(permissionRequirements.keys.map((key, index) =>
  [key.toLowerCase(), permissionRequirements.requires[index].map(required => permissionRequirements.keys[required])] as const));
/** Fail closed even for a stale or manually constructed snapshot. API authorization is independent. */
export function hasPermissionKey(me: PermissionSnapshot | undefined, key: string, seen = new Set<string>()): boolean {
  const normalized = key.toLowerCase();
  if (!me || seen.has(normalized) || !requirements.has(normalized) || !me.permissions.some(k => k.toLowerCase() === normalized)) return false;
  const path = new Set([...seen, normalized]);
  return requirements.get(normalized)!.every(required => hasPermissionKey(me, required, path));
}
export const hasPermission = (me: PermissionSnapshot | undefined, resource: string | undefined, action: string) =>
  !!resource && hasPermissionKey(me, `${resource}:${action}`);
export const hasAnyPermission = (me: PermissionSnapshot | undefined, action: string) =>
  !!me?.permissions?.some(key => key.endsWith(`:${action}`) && hasPermissionKey(me, key));
export const tabPermission = (resource: string, tab: string, action = 'View') =>
  tab === 'files' ? `${resource}:Attachments${action === 'View' ? 'View' : action}` : tab === 'history' ? `${resource}:HistoryView` : `tab.${resource}.${tab}:${action}`;
export const canViewTab = (me: PermissionSnapshot | undefined, resource: string, tab: string) => hasPermissionKey(me, tabPermission(resource, tab));

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
  ? !!me?.isAdministrator && hasPermission(me, 'AdminConfig', 'Delete') : hasPermission(me, resourceForPath(path), 'Delete') && (!path.startsWith('/regions/') || hasPermission(me, 'tab.ClientStructure.structure', 'Delete')) && (!path.startsWith('/boundaries/') && !path.startsWith('/contacts/') || hasPermission(me, 'tab.ClientStructure.contacts', 'Delete'));

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
const adminAreas: Record<string, string> = { '': 'AdminUsers', users: 'AdminUsers', roles: 'AdminRoles', rights: 'AdminRoles', groups: 'AdminGroups', config: 'AdminConfig', reference: 'AdminConfig', 'network-zones': 'AdminConfig', policies: 'AdminConfig', jira: 'AdminConfig', settings: 'AdminSettings', audit: 'AdminAudit' };

export function canAccessPath(me: Me | undefined, pathname: string, search = ''): boolean {
  if (!me) return false;
  const parts = pathname.split('/').filter(Boolean);
  const root = parts[0] ?? '';
  if (root === 'admin') {
    if (!parts[1] || parts[1] === 'access') return me.isAdministrator && (hasPermission(me, 'AdminUsers', 'View') || hasPermission(me, 'AdminRoles', 'View'));
    if (parts[1] === 'archived') return hasAnyPermission(me, 'ArchiveRestore');
    if (parts[1] === 'products') return hasPermission(me, 'Products', 'View');
    const area = adminAreas[parts[1] ?? ''];
    return !!area && hasPermission(me, area, 'View') && (parts[1] === 'audit' ? me.isAdministrator || me.grants.audit : me.isAdministrator);
  }
  if (root === 'reporting-center' || root === 'reports') {
    const area = reportingAreas[parts[1] ?? ''];
    return me.grants.export && !!area && hasPermission(me, area, 'View');
  }
  if (root === 'clients' && (!parts[1] || /^\d+$/.test(parts[1]) && !parts[2])) {
    if (!hasPermissionKey(me, 'area.ClientStructure:Access')) return false;
    const requested = new URLSearchParams(search).get('tab');
    if (requested) return canViewTab(me, 'ClientStructure', requested);
    return permissionRequirements.keys.some(key => key.startsWith('tab.ClientStructure.') && key.endsWith(':View') && hasPermissionKey(me, key))
      || hasPermission(me, 'ClientStructure', 'AttachmentsView') || hasPermission(me, 'ClientStructure', 'HistoryView');
  }
  if (/^\d+$/.test(parts[1] ?? '') && ['environments', 'cases'].includes(root)) {
    const requested = new URLSearchParams(search).get('tab');
    if (requested && !canViewTab(me, root === 'cases' ? 'Cases' : 'Environments', requested)) return false;
  }
  if (root === 'regions' && !canViewTab(me, 'ClientStructure', 'structure')) return false;
  if (routeAreas[root] && !hasPermission(me, routeAreas[root], 'View')) return false;
  return routePermissions(pathname).every(key => hasPermissionKey(me, key));
}
