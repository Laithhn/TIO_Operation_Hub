// SOURCE INVENTORY ONLY. Presence here does not establish deployed availability or successful execution.
// Sources: src/web/src/App.tsx, ui/Shell.tsx, pages/Dashboards.tsx, pages/Reports.tsx, configRegistry.ts.
export const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

export const routes = [
  ['Executive overview', '/overview'], ['My dashboard', '/my-dashboard'], ['Client map', '/map'],
  ['Operational dashboard', '/dashboards/operational'], ['SLA and contracts dashboard', '/dashboards/sla'],
  ['Management dashboard', '/dashboards/management'], ['Client dashboard', '/dashboards/client'],
  ['Action list', '/actions'], ['Notifications', '/notifications'], ['Data quality', '/data-quality'],
  ['Clients', '/clients'], ['Projects', '/projects'], ['Contracts', '/contracts'],
  ['Environments', '/environments'], ['Version matrix', '/versions'], ['Assets', '/assets'],
  ['Firewall rules', '/firewall-rules'], ['Products', '/products'], ['Tickets', '/cases'],
  ['Commitments', '/commitments'], ['Notes', '/notes'], ['Escalations', '/escalations'],
  ['Teams', '/teams'], ['Handovers', '/handovers'], ['Reassignment queue', '/reassignment'],
  ['Reporting overview', '/reporting-center'], ['Report library', '/reporting-center/library'],
  ['Tickets report builder', '/reporting-center/builder/cases'], ['My reports', '/reporting-center/my-reports'],
  ['Scheduled reports', '/reporting-center/schedules'], ['Export history', '/reporting-center/history'],
  ['Report templates', '/reporting-center/templates'],
  ['Users', '/admin/users'], ['Roles', '/admin/roles'], ['Rights', '/admin/rights'],
  ['Access review', '/admin/access'], ['Group mappings', '/admin/groups'], ['Configuration', '/admin/config'],
  ['Review policies', '/admin/policies'], ['Jira instances', '/admin/jira'], ['Settings', '/admin/settings'],
  ['Change history', '/admin/audit'], ['Archived records', '/admin/archived'],
  ['Jira connections', '/admin/integrations/jira'], ['Jira import review', '/admin/integrations/jira/review'],
  ['Jira conflicts', '/admin/integrations/jira/conflicts'], ['Jira monitor', '/admin/integrations/jira/monitoring'],
  ...[
    'clients-environments', 'servers', 'products-installations', 'contracts-cases', 'teams', 'system',
  ].map(id => [`Configuration category: ${id}`, `/admin/config/category/${id}`]),
  ...[
    'reported-conditions', 'organization-relationship-types', 'environment-types', 'responsibility-areas', 'team-roles',
    'server-types', 'server-roles', 'network-zones', 'operating-systems', 'project-phases', 'component-roles',
    'contract-types', 'case-types', 'case-statuses', 'escalation-channels', 'team-member-roles', 'priority-guidance',
  ].map(slug => [`Configuration list: ${slug}`, `/admin/config/${slug}`]),
];

export const expectedRedirects = [
  ['/dashboards/project', '/dashboards/client'], ['/admin/reference', '/admin/config'],
  ['/admin/network-zones', '/admin/config/network-zones'], ['/admin/products', '/products'],
];
