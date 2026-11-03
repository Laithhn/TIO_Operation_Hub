import type { Me } from './hooks';
import { hasPermission } from './permissions';

// Mirrors the API's explicit report data policies; the server independently checks these on every export and background run.
const businessResources = ['ClientStructure', 'Contracts', 'Environments', 'Servers', 'Installations', 'Products', 'Cases', 'Commitments', 'Teams', 'OtherOperations'];
const sources: Record<string, string[]> = {
  cases: ['Cases'], 'cases-builder': ['Cases'], 'case-aging': ['Cases'], commitments: ['Commitments'], 'commitment-performance': ['Commitments'],
  environments: ['Environments'], versions: ['Installations', 'Products'], assets: ['Servers'], contracts: ['Contracts'],
  'sla-compliance': ['Cases', 'Contracts'], 'team-workload': ['Teams', 'Cases', 'Commitments'],
  'data-quality': businessResources, actions: businessResources, 'client-health': businessResources
};

function canExportData(me: Me | undefined, report: string): boolean {
  const resources = sources[report.toLowerCase()];
  return !!me?.grants.export && hasPermission(me, 'Reporting', 'View') && !!resources
    && resources.every(resource => hasPermission(me, resource, 'View') && hasPermission(me, resource, 'Export'));
}

export function canExportReport(me: Me | undefined, report: string): boolean {
  return canExportData(me, report) && hasPermission(me, report === 'cases-builder' ? 'ReportBuilder' : 'ReportLibrary', 'Export')
    && (report !== 'cases-builder' || hasPermission(me, 'ReportHistory', 'Create'));
}
export function canDownloadReport(me: Me | undefined, report: string): boolean {
  return canExportData(me, report) && hasPermission(me, 'ReportHistory', 'View') && hasPermission(me, 'ReportHistory', 'Download');
}
