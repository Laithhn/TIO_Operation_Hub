import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { get, post, put } from '../api';
import { useForm, useMe, useRefresh } from '../hooks';
import { Badge, Checkbox, DataTable, Dialog, FormError, PageHead, Panel, SelectInput, StateMessage, TextInput, useToast, DeleteAction } from '../ui/kit';

// A34: system configuration, one page per list (owner request, 20 Oct 2026: no single "reference lists" page).

type Category = { value: string; label: string; hint: string };
export type ConfigList = { slug: string; list: string; title: string; group: string; about: string; usedBy: string; categories?: Category[] };

export const CONFIG_LISTS: ConfigList[] = [
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
  { slug: 'escalation-channels', list: 'EscalationChannel', group: 'Contracts & cases', title: 'Escalation channels', usedBy: 'escalations and their logged communications',
    about: 'How escalations arrive or are raised and how replies go out, for example e-mail, formal letter, verbal or Jira. The hub records the channel and its reference; it never sends anything.' },
  { slug: 'team-member-roles', list: 'TeamMemberRole', group: 'Teams', title: 'Team member roles', usedBy: 'team members',
    about: 'Roles offered when adding or editing a member of an internal team (Teams), for example Team lead or Support engineer.' },
  { slug: 'priority-guidance', list: 'PriorityGuidance', group: 'Contracts & cases', title: 'Priority guidance', usedBy: 'the case form (guidance text)',
    about: 'The explanation shown for each case priority. Rename or reword it to match your service levels.' }
];

const SYSTEM = [
  { to: '/admin/policies', title: 'Review policies', about: 'How often records must be reviewed before they show as stale.' },
  { to: '/admin/jira', title: 'Jira instances', about: 'Jira sites that cases may link to.' },
  { to: '/admin/settings', title: 'Settings', about: 'Approved link hosts, coverage policy and other application values.' }
];

function AdminOnly({ children }: { children: React.ReactNode }) {
  const me = useMe().data!;
  if (!me.isAdministrator) return <StateMessage kind="restricted">This page needs the Administration right.</StateMessage>;
  return <>{children}</>;
}

type Row = { id: number; listName: string; code: string; label: string; description?: string; sortOrder: number; isRetired: boolean; category?: string; version: string };
const useValues = () => useQuery({ queryKey: ['admin-lookups'], queryFn: () => get<Row[]>('/admin/lookups') });

/** Administration → Configuration: every configurable list, grouped, each with its own page. */
export function ConfigHome() {
  const q = useValues();
  const groups = [...new Set(CONFIG_LISTS.map(c => c.group))];
  const count = (list: string) => (q.data ?? []).filter(r => r.listName === list && !r.isRetired).length;
  return (
    <AdminOnly>
      <PageHead title="Configuration" sub="What the forms offer. Each list has its own page; changes apply at once, and retired values stay on the records that use them." />
      <div className="config-grid">
        {groups.map(g => (
          <Panel key={g} title={g}>
            <ul className="config-links">
              {CONFIG_LISTS.filter(c => c.group === g).map(c => (
                <li key={c.slug}><Link to={`/admin/config/${c.slug}`}>{c.title}</Link> <span className="muted">· {q.data ? `${count(c.list)} active` : '…'}</span><div className="hint">{c.about}</div></li>
              ))}
            </ul>
          </Panel>
        ))}
        <Panel title="System">
          <ul className="config-links">{SYSTEM.map(s => <li key={s.to}><Link to={s.to}>{s.title}</Link><div className="hint">{s.about}</div></li>)}</ul>
        </Panel>
      </div>
    </AdminOnly>
  );
}

/** One configuration list: add, rename, describe, order, retire; shows how many records use each value. */
export function ConfigListPage() {
  const { slug } = useParams();
  const cfg = CONFIG_LISTS.find(c => c.slug === slug);
  const q = useValues();
  const usage = useQuery({ queryKey: ['admin-lookup-usage', cfg?.list], queryFn: () => get<Record<string, number>>(`/admin/lookups/${cfg!.list}/usage`), enabled: !!cfg });
  const [edit, setEdit] = useState<Row | 'new' | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const toast = useToast();
  const refresh = useRefresh();
  if (!cfg) return <Navigate to="/admin/config" replace />;
  const all = (q.data ?? []).filter(r => r.listName === cfg.list).sort((a, b) => a.sortOrder - b.sortOrder);
  const rows = all.filter(r => showRetired || !r.isRetired);
  const catLabel = (v?: string) => cfg.categories?.find(c => c.value === v)?.label ?? v;
  const move = async (r: Row, by: number) => {
    const ids = all.map(x => x.id);
    const i = ids.indexOf(r.id), j = i + by;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await post(`/admin/lookups/${cfg.list}/order`, { ids }); refresh(); } catch (e) { toast((e as Error).message); }
  };
  return (
    <AdminOnly>
      <PageHead title={cfg.title} crumbs={[{ to: '/admin/config', label: 'Configuration' }, { label: cfg.title }]} sub={cfg.about}
        actions={<button className="btn btn-primary" onClick={() => setEdit('new')}>+ Add</button>} />
      <div className="toolbar"><Checkbox label={`Show retired (${all.filter(r => r.isRetired).length})`} checked={showRetired} onChange={setShowRetired} /></div>
      <DataTable<Row> rowKey={r => r.id} rows={rows} loading={q.isLoading} error={q.error} caption={cfg.title} columns={[
        { key: 'o', header: 'Order', render: r => <span className="nowrap order-btns">
          <button className="linkbtn" aria-label={`Move ${r.label} up`} onClick={() => move(r, -1)} disabled={all.indexOf(r) === 0}>▲</button>
          <button className="linkbtn" aria-label={`Move ${r.label} down`} onClick={() => move(r, 1)} disabled={all.indexOf(r) === all.length - 1}>▼</button></span> },
        { key: 'n', header: 'Name', render: r => <button className="linkbtn" onClick={() => setEdit(r)}>{r.label}</button> },
        { key: 'd', header: 'Description', render: r => r.description ?? <span className="muted">—</span> },
        ...(cfg.categories ? [{ key: 'c', header: 'Behaves as', render: (r: Row) => <span className="chip">{catLabel(r.category)}</span> }] : []),
        { key: 'u', header: `In use (${cfg.usedBy})`, className: 'num', render: r => usage.data ? (usage.data[r.code] ?? 0) : '…' },
        { key: 's', header: 'Status', render: r => r.isRetired ? <Badge>Retired</Badge> : <Badge tone="good">Active</Badge> }, { key: 'del', header: '', className: 'row-actions', render: r => <DeleteAction path={`/admin/lookups/${r.id}`} what={`${r.label}`} /> }
      ]} />
      <p className="hint" style={{ marginTop: 8 }}>Retiring a value stops offering it on forms; records that use it keep it. Names can be changed at any time; the change shows everywhere.</p>
      {edit && <ValueDialog cfg={cfg} row={edit === 'new' ? null : edit} inUse={edit !== 'new' && !!usage.data?.[edit.code]} onClose={() => setEdit(null)} />}
    </AdminOnly>
  );
}

function ValueDialog({ cfg, row, inUse, onClose }: { cfg: ConfigList; row: Row | null; inUse: boolean; onClose: () => void }) {
  const f = useForm({ label: row?.label ?? '', description: row?.description ?? '', category: row?.category ?? '', active: !row?.isRetired });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const v = f.values;
    const body = { listName: cfg.list, code: row?.code ?? null, label: v.label, description: v.description || null, sortOrder: row?.sortOrder ?? 0, isRetired: !v.active, category: v.category || null };
    const ok = await f.submit(() => (row ? put(`/admin/lookups/${row.id}`, body, row.version) : post('/admin/lookups', body)).then(() => true));
    if (ok) { toast(row ? 'Saved; the new name shows everywhere.' : `${v.label} added.`); refresh(); onClose(); }
  };
  return (
    <Dialog title={row ? `Edit ${row.label}` : `Add to ${cfg.title.toLowerCase()}`} onClose={onClose}>
      <FormError error={f.error} fields={['label', 'description', 'category', 'isRetired']} />
      <div className="form-grid">
        <TextInput label="Name" required wide value={f.values.label} onChange={v => f.set('label', v)} error={f.fieldError('label')} maxLength={150} />
        <TextInput label="Description" wide multiline value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} />
        {cfg.categories && (row
          ? <TextInput label="Behaves as" wide value={cfg.categories.find(c => c.value === row.category)?.label ?? row.category ?? ''} onChange={() => {}} disabled hint="Fixed once created, so totals and reports stay consistent." />
          : <SelectInput label="Behaves as" required wide value={f.values.category} onChange={v => f.set('category', v)} error={f.fieldError('category')}
              options={cfg.categories.map(c => ({ value: c.value, label: `${c.label} — ${c.hint}` }))} empty="— Select —" />)}
        {row && <Checkbox label="Active (offered on forms)" checked={f.values.active} onChange={v => f.set('active', v)}
          hint={inUse && !f.values.active ? 'Records that use it keep it; it is no longer offered for new records.' : undefined} />}
      </div>
      {f.fieldError('isRetired') && <div className="err">{f.fieldError('isRetired')}</div>}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{row ? 'Save' : 'Add'}</button></div>
    </Dialog>
  );
}
