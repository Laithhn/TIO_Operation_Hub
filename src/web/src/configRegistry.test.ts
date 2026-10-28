import { describe, expect, it } from 'vitest';
import type { Me } from './hooks';
import { CONFIG_LISTS, CONFIG_PAGES, configAt, configCrumbs, configTree, searchConfig } from './configRegistry';

const admin = { isAdministrator: true } as Me;
const engineer = { isAdministrator: false } as Me;
// Server LookupLists.All (src/TioHub.Api/Modules/Admin/AdminEntities.cs): every list must have a page.
const SERVER_LISTS = ['ComponentRole', 'AssetRole', 'NetworkZone', 'ProjectPhase', 'BoundaryArea', 'OsFamily', 'PriorityGuidance', 'EnvironmentType', 'AssetType',
  'ContractType', 'CaseType', 'TeamRole', 'EscalationChannel', 'TeamMemberRole', 'ConditionLabel', 'CaseStatusLabel', 'OrganizationRelationshipType'];

describe('configuration registry', () => {
  it('gives every server lookup list a page', () => {
    expect(CONFIG_LISTS.map(c => c.list).sort()).toEqual([...SERVER_LISTS].sort());
    for (const l of SERVER_LISTS) expect(CONFIG_PAGES.some(p => p.list === l)).toBe(true);
  });

  it('places the pages in the six categories in the agreed order', () => {
    const tree = configTree(admin).map(g => [g.name, g.pages.map(p => p.name)]);
    expect(tree).toEqual([
      ['Clients & Environments', ['Reported conditions', 'Organization relationship types', 'Environment types', 'Responsibility areas', 'Project team roles']],
      ['Servers', ['Server types', 'Server roles', 'Network zones', 'Operating systems', 'Project phases']],
      ['Products & Installations', ['Component roles']],
      ['Contracts & Cases', ['Contract types', 'Case types', 'Case statuses', 'Escalation channels', 'Priority guidance']],
      ['Teams', ['Team member roles']],
      ['System', ['Review policies', 'Jira instances', 'Settings']]
    ]);
  });

  it('keeps the existing routes', () => {
    expect(CONFIG_PAGES.find(p => p.id === 'escalation-channels')!.route).toBe('/admin/config/escalation-channels');
    expect(CONFIG_PAGES.filter(p => p.category === 'system').map(p => p.route)).toEqual(['/admin/policies', '/admin/jira', '/admin/settings']);
    expect(new Set(CONFIG_PAGES.map(p => p.route)).size).toBe(CONFIG_PAGES.length);
  });

  it('shows nothing to users without the Administration right', () => {
    expect(configTree(engineer)).toEqual([]);
    expect(configTree(undefined)).toEqual([]);
  });

  it('finds the category of a page or category path', () => {
    expect(configAt('/admin/config/case-types').category?.id).toBe('contracts-cases');
    expect(configAt('/admin/jira').category?.id).toBe('system');
    expect(configAt('/admin/config/category/servers').category?.id).toBe('servers');
    expect(configAt('/admin/config').category).toBeUndefined();
  });

  it('builds breadcrumbs with clickable parents', () => {
    expect(configCrumbs('escalation-channels')).toEqual([
      { to: '/admin', label: 'Administration' }, { to: '/admin/config', label: 'Configuration' },
      { to: '/admin/config/category/contracts-cases', label: 'Contracts & Cases' }, { label: 'Escalation channels' }
    ]);
  });

  it('searches names and descriptions across categories, every word must match', () => {
    const names = (q: string) => searchConfig(configTree(admin), q).flatMap(g => g.pages.map(p => p.name));
    expect(names('roles')).toEqual(['Organization relationship types', 'Project team roles', 'Server roles', 'Component roles', 'Team member roles']);
    expect(names('CASE')).toEqual(['Case types', 'Case statuses', 'Priority guidance', 'Jira instances']);
    expect(names('server form')).toContain('Network zones');
    expect(names('no such page')).toEqual([]);
    expect(names('  ')).toHaveLength(CONFIG_PAGES.length);
  });
});
