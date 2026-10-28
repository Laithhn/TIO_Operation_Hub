import type { Me } from './hooks';

// Administration → Configuration (A34): the one registry of configuration pages. The sidebar tree, its search,
// the overview cards, the category pages and the breadcrumbs all read it, so they always agree. It holds navigation only; what
// each page may change, and who may change it, is still decided by the page and checked by the API.

type ListCategory = { value: string; label: string; hint: string };
/** A configurable lookup list (server LookupLists) with its own page at /admin/config/{slug}. */
export type ConfigList = { slug: string; list: string; title: string; group: string; about: string; usedBy: string; categories?: ListCategory[]; labelOnly?: boolean };

export const CONFIG_LISTS: ConfigList[] = [
  { slug: 'reported-conditions', list: 'ConditionLabel', group: 'Clients & environments', title: 'Reported conditions', usedBy: 'condition reports', labelOnly: true,
    about: 'Change the display labels of the built-in reported conditions. Their codes, order and operational meaning stay fixed.' },
  { slug: 'organization-relationship-types', list: 'OrganizationRelationshipType', group: 'Clients & environments', title: 'Organization relationship types', usedBy: 'organization relationships',
    about: 'Optional business roles such as Contractor, Supplier or Partner. Roles belong to each relationship and never fix its hierarchy level.' },
  { slug: 'environment-types', list: 'EnvironmentType', group: 'Clients & environments', title: 'Environment types', usedBy: 'environments',
    about: 'Offered when creating an environment. Each type behaves like its category, for example "Pre-production" behaves like Staging.',
    categories: [
      { value: 'Production', label: 'Production', hint: 'Live service' }, { value: 'Staging', label: 'Staging', hint: 'Pre-production / acceptance' },
      { value: 'UAT', label: 'UAT', hint: 'User acceptance testing' }, { value: 'Test', label: 'Test', hint: 'Test, POC, development' },
      { value: 'DR', label: 'Disaster recovery', hint: 'Standby for recovery' }, { value: 'Other', label: 'Other', hint: 'Needs a description on the environment' }
    ] },
  { slug: 'responsibility-areas', list: 'BoundaryArea', group: 'Clients & environments', title: 'Responsibility areas', usedBy: 'responsibility boundaries',
    about: 'Areas of work (application, database, network…) used when recording who is responsible for what at a client.' },
  { slug: 'team-roles', list: 'TeamRole', group: 'Clients & environments', title: 'Project team roles', usedBy: 'project team members',
    about: "Roles offered for the members of a client's project team." },
  { slug: 'server-types', list: 'AssetType', group: 'Servers', title: 'Server types', usedBy: 'servers',
    about: 'Offered on the server form. The category decides how the server is counted in totals.',
    categories: [
      { value: 'VM', label: 'Virtual machine', hint: 'Counted as a VM' }, { value: 'Physical', label: 'Physical server', hint: 'Counted as a physical server' },
      { value: 'LogicalEndpoint', label: 'Logical endpoint', hint: 'No own CPU or RAM; never counted as a server (listener, load balancer address)' }
    ] },
  { slug: 'server-roles', list: 'AssetRole', group: 'Servers', title: 'Server roles', usedBy: 'servers', about: 'What a server is for, for example Application server or Database server.' },
  { slug: 'network-zones', list: 'NetworkZone', group: 'Servers', title: 'Network zones', usedBy: 'servers', about: 'Network zones offered on the server form.' },
  { slug: 'operating-systems', list: 'OsFamily', group: 'Servers', title: 'Operating systems', usedBy: 'servers', about: 'Operating system families offered on the server form; the version is typed per server.' },
  { slug: 'project-phases', list: 'ProjectPhase', group: 'Servers', title: 'Project phases', usedBy: 'servers', about: 'Where a server is in its delivery, for example Requested or Deployed.' },
  { slug: 'component-roles', list: 'ComponentRole', group: 'Products & installations', title: 'Component roles', usedBy: 'components',
    about: 'Roles of the components of an installation, for example Application, Database or Workflow.' },
  { slug: 'contract-types', list: 'ContractType', group: 'Contracts & cases', title: 'Contract types', usedBy: 'contracts',
    about: 'Offered on the contract form. Each type belongs to a category used in reports.',
    categories: [
      { value: 'SlaSupport', label: 'SLA & support', hint: 'Support with recorded SLA targets' }, { value: 'Implementation', label: 'Implementation', hint: 'Delivery project' },
      { value: 'Maintenance', label: 'Maintenance', hint: 'Operation and maintenance' }, { value: 'Subscription', label: 'Subscription', hint: 'Licence or service subscription' },
      { value: 'Other', label: 'Other', hint: 'Anything else' }
    ] },
  { slug: 'case-types', list: 'CaseType', group: 'Contracts & cases', title: 'Case types', usedBy: 'cases',
    about: 'Offered when opening a case. Each type belongs to a category used in reports.',
    categories: [
      { value: 'Incident', label: 'Incident', hint: 'Something is broken' }, { value: 'Request', label: 'Request', hint: 'Something is asked for' },
      { value: 'ProblemFollowUp', label: 'Problem follow-up', hint: 'Root cause work' }, { value: 'MaintenanceCoordination', label: 'Maintenance coordination', hint: 'Planned work' },
      { value: 'Improvement', label: 'Improvement', hint: 'Make something better' }, { value: 'RiskFollowUp', label: 'Risk follow-up', hint: 'Track a risk' }
    ] },
  { slug: 'case-statuses', list: 'CaseStatusLabel', group: 'Contracts & cases', title: 'Case statuses', usedBy: 'cases', labelOnly: true,
    about: 'Change the display labels of the built-in case statuses. The case lifecycle, transitions and stored codes stay fixed.' },
  { slug: 'escalation-channels', list: 'EscalationChannel', group: 'Contracts & cases', title: 'Escalation channels', usedBy: 'escalations and their logged communications',
    about: 'How escalations arrive or are raised and how replies go out, for example e-mail, formal letter, verbal or Jira. The hub records the channel and its reference; it never sends anything.' },
  { slug: 'team-member-roles', list: 'TeamMemberRole', group: 'Teams', title: 'Team member roles', usedBy: 'team members',
    about: 'Roles offered when adding or editing a member of an internal team (Teams), for example Team lead or Support engineer.' },
  { slug: 'priority-guidance', list: 'PriorityGuidance', group: 'Contracts & cases', title: 'Priority guidance', usedBy: 'the case form (guidance text)',
    about: 'The explanation shown for each case priority. Rename or reword it to match your service levels.' }
];

export type ConfigCategoryId = 'clients-environments' | 'servers' | 'products-installations' | 'contracts-cases' | 'teams' | 'system';
export type ConfigCategory = { id: ConfigCategoryId; name: string; icon: string; description: string; order: number };
/** editable: values can be added, renamed and retired · labels: fixed workflow values, only display labels change · system: an application setting page. */
export type ConfigKind = 'editable' | 'labels' | 'system';
export type ConfigPage = {
  id: string; name: string; category: ConfigCategoryId; route: string; description: string; kind: ConfigKind; order: number;
  /** Who sees the entry. Hiding is navigation only: the page and the API still check the right. */
  visible: (m: Me) => boolean;
  /** The lookup list behind the page, when it is one. */
  list?: string;
};

export const CONFIG_HOME = '/admin/config';
export const categoryRoute = (id: ConfigCategoryId) => `${CONFIG_HOME}/category/${id}`;

export const CONFIG_CATEGORIES: ConfigCategory[] = [
  { id: 'clients-environments', name: 'Clients & Environments', icon: 'clients', order: 1, description: 'Conditions, environment types, responsibilities and project roles.' },
  { id: 'servers', name: 'Servers', icon: 'server', order: 2, description: 'Server types, roles, network zones, operating systems and phases.' },
  { id: 'products-installations', name: 'Products & Installations', icon: 'app', order: 3, description: 'Roles of the components of an installation.' },
  { id: 'contracts-cases', name: 'Contracts & Cases', icon: 'case', order: 4, description: 'Contract and case types, statuses, escalation channels and priorities.' },
  { id: 'teams', name: 'Teams', icon: 'team', order: 5, description: 'Roles of the members of internal teams.' },
  { id: 'system', name: 'System', icon: 'admin', order: 6, description: 'Review policies, Jira instances and application settings.' }
];

const admin = (m: Me) => m.isAdministrator;

// Short descriptions for the sidebar search and the category pages; the page itself keeps its full text (ConfigList.about).
const LIST_PLACES: Record<string, { category: ConfigCategoryId; order: number; description: string }> = {
  'reported-conditions': { category: 'clients-environments', order: 1, description: 'Display labels of the built-in reported conditions.' },
  'organization-relationship-types': { category: 'clients-environments', order: 2, description: 'Business roles such as Contractor, Supplier or Partner.' },
  'environment-types': { category: 'clients-environments', order: 3, description: 'Types offered when creating an environment.' },
  'responsibility-areas': { category: 'clients-environments', order: 4, description: 'Areas of work used in responsibility boundaries.' },
  'team-roles': { category: 'clients-environments', order: 5, description: "Roles of the members of a client's project team." },
  'server-types': { category: 'servers', order: 1, description: 'Types on the server form; decide how servers are counted.' },
  'server-roles': { category: 'servers', order: 2, description: 'What a server is for, such as Application or Database server.' },
  'network-zones': { category: 'servers', order: 3, description: 'Network zones offered on the server form.' },
  'operating-systems': { category: 'servers', order: 4, description: 'Operating system families offered on the server form.' },
  'project-phases': { category: 'servers', order: 5, description: 'Delivery phases of a server, such as Requested or Deployed.' },
  'component-roles': { category: 'products-installations', order: 1, description: 'Roles of installation components, such as Database or Workflow.' },
  'contract-types': { category: 'contracts-cases', order: 1, description: 'Types offered on the contract form.' },
  'case-types': { category: 'contracts-cases', order: 2, description: 'Types offered when opening a case.' },
  'case-statuses': { category: 'contracts-cases', order: 3, description: 'Display labels of the built-in case statuses.' },
  'escalation-channels': { category: 'contracts-cases', order: 4, description: 'How escalations arrive and how replies go out.' },
  'priority-guidance': { category: 'contracts-cases', order: 5, description: 'Guidance text shown for each case priority.' },
  'team-member-roles': { category: 'teams', order: 1, description: 'Roles of the members of internal teams.' }
};

export const CONFIG_PAGES: ConfigPage[] = [
  // A list missing from LIST_PLACES still gets a page (under System), so no configurable list is ever unreachable.
  ...CONFIG_LISTS.map((c): ConfigPage => {
    const at = LIST_PLACES[c.slug] ?? { category: 'system' as const, order: 50, description: c.about };
    return { id: c.slug, name: c.title, route: `${CONFIG_HOME}/${c.slug}`, kind: c.labelOnly ? 'labels' : 'editable', visible: admin, list: c.list, ...at };
  }),
  { id: 'review-policies', name: 'Review policies', category: 'system', route: '/admin/policies', kind: 'system', order: 1, visible: admin,
    description: 'How often records must be reviewed before they show as stale.' },
  { id: 'jira-instances', name: 'Jira instances', category: 'system', route: '/admin/jira', kind: 'system', order: 2, visible: admin,
    description: 'Jira sites that cases may link to.' },
  { id: 'settings', name: 'Settings', category: 'system', route: '/admin/settings', kind: 'system', order: 3, visible: admin,
    description: 'Approved link hosts, coverage policy and other application values.' }
];

export type ConfigGroup = ConfigCategory & { pages: ConfigPage[] };

/** The categories and pages this user may see, in order; categories without a visible page are left out. */
export function configTree(me: Me | undefined): ConfigGroup[] {
  if (!me) return [];
  return [...CONFIG_CATEGORIES].sort((a, b) => a.order - b.order)
    .map(c => ({ ...c, pages: CONFIG_PAGES.filter(p => p.category === c.id && p.visible(me)).sort((a, b) => a.order - b.order) }))
    .filter(c => c.pages.length > 0);
}

/** The configuration page or category shown at a path (old and new URLs alike), if any. */
export function configAt(path: string): { page?: ConfigPage; category?: ConfigCategory } {
  const clean = path.replace(/\/+$/, '');
  const page = CONFIG_PAGES.find(p => p.route === clean);
  if (page) return { page, category: CONFIG_CATEGORIES.find(c => c.id === page.category) };
  const cat = clean.match(/^\/admin\/config\/category\/([^/]+)$/)?.[1];
  return { category: CONFIG_CATEGORIES.find(c => c.id === cat) };
}

/** Breadcrumbs: Administration › Configuration › category › page; every parent is a link. */
export function configCrumbs(pageId: string): { to?: string; label: string }[] {
  const page = CONFIG_PAGES.find(p => p.id === pageId);
  const cat = CONFIG_CATEGORIES.find(c => c.id === page?.category);
  return [
    { to: '/admin', label: 'Administration' },
    { to: CONFIG_HOME, label: 'Configuration' },
    ...(cat ? [{ to: categoryRoute(cat.id), label: cat.name }] : []),
    ...(page ? [{ label: page.name }] : [])
  ];
}

/** Case-insensitive search over names and short descriptions; every word must match somewhere. */
export function searchConfig(groups: ConfigGroup[], query: string): ConfigGroup[] {
  const words = searchWords(query);
  if (!words.length) return groups;
  return groups
    .map(g => ({ ...g, pages: g.pages.filter(p => { const t = `${p.name} ${p.description}`.toLowerCase(); return words.every(w => t.includes(w)); }) }))
    .filter(g => g.pages.length > 0);
}

export const searchWords = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);
