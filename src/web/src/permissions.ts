import type { Me } from './hooks';

/** These mirror the API resource catalog; visibility and record scope are still checked by the server. */
export const hasPermission = (me: Pick<Me, 'permissions'> | undefined, resource: string | undefined, action: string) =>
  !!resource && !!me?.permissions?.includes(`${resource}:${action}`);
export const hasAnyPermission = (me: Pick<Me, 'permissions'> | undefined, action: string) =>
  !!me?.permissions?.some(key => key.endsWith(`:${action}`));

const records: Record<string, string> = {
  Client: 'ClientStructure', Region: 'ClientStructure', Project: 'ClientStructure', Organization: 'ClientStructure',
  ClientEnvironment: 'Environments', Contract: 'Contracts', Environment: 'Environments', Asset: 'Servers', Volume: 'Servers', SharedStorage: 'Servers', Component: 'Servers',
  Installation: 'Installations', Product: 'Products', Module: 'Products', Feature: 'Products', Microservice: 'Products',
  Case: 'Cases', Commitment: 'Commitments', Team: 'Teams', Handover: 'Teams',
  Contact: 'OtherOperations', ResponsibilityBoundary: 'OtherOperations', Boundary: 'OtherOperations', FirewallRule: 'OtherOperations', Escalation: 'OtherOperations', LookupValue: 'OtherOperations'
};
export const resourceForRecord = (recordType: string) => records[recordType];
const paths: Record<string, string> = {
  clients: 'ClientStructure', regions: 'ClientStructure', projects: 'ClientStructure', organizations: 'ClientStructure',
  contracts: 'Contracts', environments: 'Environments', assets: 'Servers', components: 'Servers', volumes: 'Servers', 'shared-storage': 'Servers',
  installations: 'Installations', products: 'Products', cases: 'Cases', commitments: 'Commitments', teams: 'Teams', handovers: 'Teams',
  contacts: 'OtherOperations', boundaries: 'OtherOperations', 'firewall-rules': 'OtherOperations', escalations: 'OtherOperations'
};
export function resourceForPath(path: string): string | undefined {
  if (/^\/admin\/lookups\/\d+$/.test(path)) return 'OtherOperations';
  return paths[path.split('/').filter(Boolean)[0]];
}

export const canDeletePath = (me: Me | undefined, path: string) => /^\/admin\/lookups\/\d+$/.test(path)
  ? !!me?.isAdministrator : hasPermission(me, resourceForPath(path), 'Delete');
