import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { exportCsv, get, post, put, qs, type Paged, type UserRef } from '../api';
import { fmtDateTime, fromLocalInput, label, qty, toLocalInput } from '../format';
import { useEnum, useEnumLabel, useForm, useLeaveGuard, useMe, usePermission, useRefresh, useUrlState, useTypes } from '../hooks';
import { ArchiveDialog, UserPicker } from '../ui/pickers';
import {
  Badge, ConditionBadge, DataTable, Dialog, DL, enumOptions, FormError, FreshnessBadge, PageHead, Pager, Panel, Person, QueryState, SelectInput,
  StateMessage, StatusBadge, Tabs, TextInput, useToast, When, type ConditionT, type FreshnessT, Menu, DeleteAction } from '../ui/kit';
import { ClientDisplay } from '../ui/ClientLogo';
import { BoundaryPerson, type BoundaryRow } from './Clients';
import { FirewallRulesPanel } from './Firewall';
import { HistoryPanel, toNum, useClientOptions } from './common';
import { AttachmentsWorkspace } from './attachments/AttachmentsWorkspace';
import { AssetDialog, CloneDialog, InstallationDialog } from './Inventory';

const HOSTING_LABEL: Record<string, string> = { OnPrem: 'On-prem', Cloud: 'Cloud', Unknown: 'Unknown' };

type EnvRow = { id: number; name: string; type: string; criticality: string; hosting?: string; clientId: number; clientCode: string; clientName: string; country?: string; regionId?: number; regionCode?: string; owner?: UserRef; backupOwner?: UserRef; backupGapReason?: string; installationCount: number; assetCount: number; openCases: number; condition: ConditionT; inventoryFreshness: FreshnessT };

export function EnvironmentList() {
  const conditionLabel = useEnumLabel('Condition');
  const T = useTypes();
  const [f, set] = useUrlState({ clientId: '', regionId: '', direct: '', type: '', criticality: '', condition: '', freshness: '', q: '', sort: 'client', page: '1', pageSize: '15' });
  const q = useQuery({ queryKey: ['environments', f], queryFn: () => get<Paged<EnvRow>>(`/environments${qs(f)}`) });
  const clients = useClientOptions();
  const regions = useQuery({ queryKey: ['regions', f.clientId], queryFn: () => get<{ id: number; code: string; name: string }[]>(`/clients/${f.clientId}/regions`), enabled: !!f.clientId });
  const crit = useEnum('Criticality');
  const conds = useEnum('Condition');
  const me = useMe().data!;
  const canLead = usePermission('Environments', 'Create');
  const filtered = Object.entries(f).some(([k, v]) => !['sort', 'page', 'pageSize'].includes(k) && v);
  const exportFilters = Object.fromEntries(Object.entries(f).filter(([k]) => !['sort', 'page', 'pageSize'].includes(k)));
  return (
    <>
      <PageHead title="Environments" crumbs={[{ to: '/clients', label: 'Clients' }, { label: 'Environments' }]} sub="Production in two regions are two distinct environments. Direct-client environments have no region by design."
        actions={<>{me.grants.export && <button className="btn" onClick={() => exportCsv('environments', exportFilters)}>Export CSV</button>}{canLead && <Link className="btn btn-primary" to="/environments/new">+ New Environment</Link>}</>} />
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v, regionId: '' })} options={clients} empty="All authorized clients" />
        {f.clientId && (regions.data?.length ?? 0) > 0 && <SelectInput label="Region (optional)" value={f.regionId} onChange={v => set({ regionId: v })} options={(regions.data ?? []).map(r => ({ value: String(r.id), label: `${r.code} · ${r.name}` }))} empty="All" />}
        <SelectInput label="Placement" value={f.direct} onChange={v => set({ direct: v })} options={[{ value: 'true', label: 'Direct under client' }]} empty="Regional and direct" />
        <SelectInput label="Reported condition" value={f.condition} onChange={v => set({ condition: v })} options={conds.map(c => ({ value: c, label: conditionLabel(c) }))} empty="Any" />
        <SelectInput label="Review state" value={f.freshness} onChange={v => set({ freshness: v })} options={[{ value: 'stale', label: 'Inventory stale' }, { value: 'needsVerification', label: 'Condition needs verification' }]} empty="Any" />
      </div>
      <DataTable<EnvRow> rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'} sort={f.sort} onSort={s => set({ sort: s })}
        columns={[
          { key: 'client', header: 'Client', sort: 'client', render: r => <ClientDisplay id={r.clientId} code={r.clientCode} />, filter: <input className="input" aria-label="Search environments" placeholder="Search by environment or client" value={f.q} onChange={e => set({ q: e.target.value })} /> },
          { key: 'region', header: 'Region', sort: 'region', render: r => r.regionCode ?? <span className="muted">Direct</span> },
          { key: 'name', header: 'Environment', sort: 'name', render: r => <Link to={`/environments/${r.id}`}>{r.name}</Link> },
          { key: 'type', header: 'Type', sort: 'type', render: r => T.name('EnvironmentType', r.type), filter: <select className="input" aria-label="Filter by type" value={f.type} onChange={e => set({ type: e.target.value })}><option value="">All</option>{T.filterOptions('EnvironmentType').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> },
          { key: 'crit', header: 'Criticality', sort: 'criticality', render: r => <StatusBadge value={r.criticality} />, filter: <select className="input" aria-label="Filter by criticality" value={f.criticality} onChange={e => set({ criticality: e.target.value })}><option value="">All</option>{crit.map(t => <option key={t}>{t}</option>)}</select> },
          { key: 'cond', header: 'Reported condition', render: r => <ConditionBadge c={r.condition} /> },
          { key: 'fresh', header: 'Inventory review', render: r => <FreshnessBadge f={r.inventoryFreshness} /> },
          { key: 'apps', header: 'Installations', className: 'num', render: r => r.installationCount },
          { key: 'assets', header: 'Assets', className: 'num', render: r => r.assetCount },
          { key: 'cases', header: 'Open cases', className: 'num', render: r => r.openCases },
          { key: 'owner', header: 'Owner / backup', render: r => <><Person u={r.owner} gap="No owner (gap)" />{r.backupOwner ? <span className="muted"> / {r.backupOwner.name}</span> : <> <Badge tone="warn">No backup</Badge></>}</> }, { key: 'del', header: '', className: 'row-actions', render: r => <DeleteAction path={`/environments/${r.id}`} what={`environment ${r.name}`} /> }
        ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
    </>
  );
}

type EnvDto = {
  id: number; name: string; type: string; typeDescription?: string; hosting?: string; location?: string; criticality: string; description?: string;
  client: { id: number; code: string; name: string; country: string }; region?: { id: number; code: string; name: string }; project?: { id: number; code: string; name: string };
  owner?: UserRef; backupOwner?: UserRef; coordinator?: UserRef; backupGapReason?: string; responsibleParty: string; responsibleOrganization?: string; coverageGap: boolean;
  condition: ConditionT; conditionReason?: string; freshness: { record: FreshnessT; inventory: FreshnessT; dependencies: FreshnessT };
  lastReviewedAt?: string; inventoryReviewedAt?: string; nextReviewAt?: string; createdAt: string; updatedAt: string; version: string; canEdit: boolean
};

export function EnvironmentForm() {
  const T = useTypes();
  const { id } = useParams();
  const isNew = !id;
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  const existing = useQuery({ queryKey: ['environment', id], queryFn: () => get<EnvDto>(`/environments/${id}`), enabled: !isNew });
  const f = useForm({ clientId: sp.get('clientId') ?? '', regionId: sp.get('regionId') ?? '', projectId: '', name: '', type: '', typeDescription: '', hosting: 'Unknown', location: '', criticality: 'Unknown',
    ownerUserId: null as number | null, backupOwnerUserId: null as number | null, backupGapReason: '', responsibleParty: 'TIO', responsibleOrganization: '', coordinatorUserId: null as number | null, description: '', regionChangeReason: '' });
  const [version, setVersion] = useState<string>();
  useLeaveGuard(f.dirty && !f.busy);
  useEffect(() => {
    const e = existing.data;
    if (!e) return;
    setVersion(e.version);
    f.reset({ clientId: String(e.client.id), regionId: e.region ? String(e.region.id) : '', projectId: e.project ? String(e.project.id) : '', name: e.name, type: e.type, typeDescription: e.typeDescription ?? '', hosting: e.hosting ?? 'Unknown',
      location: e.location ?? '', criticality: e.criticality, ownerUserId: e.owner?.id ?? null, backupOwnerUserId: e.backupOwner?.id ?? null, backupGapReason: e.backupGapReason ?? '',
      responsibleParty: e.responsibleParty, responsibleOrganization: e.responsibleOrganization ?? '', coordinatorUserId: e.coordinator?.id ?? null, description: e.description ?? '', regionChangeReason: '' });
  }, [existing.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const clients = useClientOptions();
  const cid = f.values.clientId;
  const regions = useQuery({ queryKey: ['regions', cid], queryFn: () => get<{ id: number; code: string; name: string }[]>(`/clients/${cid}/regions`), enabled: !!cid });
  const projects = useQuery({ queryKey: ['projects-of', cid], queryFn: () => get<Paged<{ id: number; code: string; name: string }>>(`/projects?clientId=${cid}&pageSize=100`), enabled: !!cid });
  const crit = useEnum('Criticality');
  // Owner decision (UAT 19 Oct 2026): hosting is Cloud, On-prem or Unknown; a client with regions has no environments outside them.
  const HOSTING = [{ value: 'OnPrem', label: 'On-prem' }, { value: 'Cloud', label: 'Cloud' }, { value: 'Unknown', label: 'Unknown' }];
  const hasRegions = (regions.data?.length ?? 0) > 0;
  const regionChanged = !isNew && existing.data && (existing.data.region?.id ?? '') !== (f.values.regionId ? Number(f.values.regionId) : '');
  const save = async () => {
    const v = f.values;
    const body = { ...v, clientId: toNum(v.clientId), regionId: toNum(v.regionId), projectId: toNum(v.projectId), hosting: v.hosting || 'Unknown' };
    const r = await f.submit(() => isNew ? post<{ id: number }>('/environments', body) : put(`/environments/${id}`, body, version).then(() => ({ id: Number(id) })));
    if (r) { toast('Environment saved.'); refresh(); nav(`/environments/${r.id}`); }
  };
  if (!isNew && existing.isLoading) return <StateMessage kind="loading" />;
  return (
    <>
      <PageHead title={isNew ? 'New environment' : `Edit ${existing.data?.name}`} crumbs={[{ to: '/clients', label: 'Clients' }, { to: '/environments', label: 'Environments' }]} />
      <Panel>
        <FormError error={f.error} />
        {f.error?.isConflict && <button className="btn" style={{ marginBottom: 10 }} onClick={async () => { const r = await existing.refetch(); setVersion(r.data?.version); f.setError(null); }}>Reload latest</button>}
        <div className="form-grid">
          <SelectInput label="Client" required value={f.values.clientId} onChange={v => { f.set('clientId', v); f.set('regionId', ''); f.set('projectId', ''); }} options={clients} error={f.fieldError('clientId')} disabled={!isNew} />
          <SelectInput label="Region" required={hasRegions} value={f.values.regionId} onChange={v => f.set('regionId', v)} options={(regions.data ?? []).map(r => ({ value: String(r.id), label: `${r.code} · ${r.name}` }))}
            empty={hasRegions ? '— Select the region —' : 'This client has no regions (valid)'} error={f.fieldError('regionId')}
            hint={hasRegions ? 'This client has regions, so every environment belongs to one of them.' : 'Environments of a client without regions sit directly under the client.'} />
          {regionChanged && <TextInput label="Reason for region change" required wide value={f.values.regionChangeReason} onChange={v => f.set('regionChangeReason', v)} error={f.fieldError('regionChangeReason')} hint="Region reassignment is audited." />}
          <SelectInput label="Project" value={f.values.projectId} onChange={v => f.set('projectId', v)} options={(projects.data?.items ?? []).map(p => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))} empty="None" error={f.fieldError('projectId')}
            hint="Optional: the client project this environment was delivered or is supported under (e.g. an SLA project). Used for project filters and project-scoped access." />
          <TextInput label="Environment name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} hint="Unique within the client + region scope." maxLength={100} />
          <SelectInput label="Type" required value={f.values.type} onChange={v => f.set('type', v)} options={T.options('EnvironmentType', f.values.type)} error={f.fieldError('type')} />
          {f.values.type === 'Other' && <TextInput label="Type description" required value={f.values.typeDescription} onChange={v => f.set('typeDescription', v)} error={f.fieldError('typeDescription')} />}
          <SelectInput label="Criticality" required value={f.values.criticality} onChange={v => f.set('criticality', v)} options={enumOptions(crit)} empty={null} />
          <SelectInput label="Hosting" value={f.values.hosting} onChange={v => f.set('hosting', v)} options={HOSTING} empty={null} error={f.fieldError('hosting')} />
          <TextInput label="Location" value={f.values.location} onChange={v => f.set('location', v)} hint="Leave empty if unknown." />
          <UserPicker label="Technical owner" value={f.values.ownerUserId} onChange={v => f.set('ownerUserId', v)} clientId={toNum(cid)} error={f.fieldError('ownerUserId')} empty="No owner — assignment gap" />
          <UserPicker label="Operation engineer" value={f.values.coordinatorUserId} onChange={v => f.set('coordinatorUserId', v)} clientId={toNum(cid)} error={f.fieldError('coordinatorUserId')} empty="None" hint="Optional." />
          <UserPicker label="Backup operation engineer" value={f.values.backupOwnerUserId} onChange={v => f.set('backupOwnerUserId', v)} clientId={toNum(cid)} error={f.fieldError('backupOwnerUserId')} empty="None"
            hint="Optional. Critical and High environments without a backup still appear as coverage gaps on the action list." />
          <TextInput label="Description" wide multiline value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} />
        </div>
        <p className="hint" style={{ marginTop: 10 }}>Access, readiness and change windows arrive in the Next release; they are not needed to create a valid environment.</p>
        <div className="form-actions"><button className="btn" onClick={() => nav(-1)}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{f.busy ? 'Saving…' : 'Save environment'}</button></div>
      </Panel>
    </>
  );
}

type EnvOverview = {
  installations: { id: number; instanceName: string; product: string; module?: string; version?: string; deployedOn?: string; lastReviewedAt?: string; components: { id: number; name: string; role: string; componentVersion?: string; hosts: { assetId: number; name: string; type: string }[] }[] }[];
  assets: { id: number; name: string; type: string; role?: string; lifecycle: string; projectPhase?: string; networkZone?: string; cpuQuantity?: number; cpuUnit?: string; ramQuantity?: number; ramUnit?: string; osFamily?: string; osVersion?: string; verifiedAt?: string; owner?: string; volumes: { id: number; label: string; capacity?: number; unit?: string; purpose?: string; shared?: string; sourceNotation?: string }[]; components: { componentId: number; name: string; role: string }[]; sourceDocument?: string; sourceSheet?: string; sourceRange?: string; sourceNotation?: string }[];
  cases: { id: number; ref: string; title: string; status: string; priority: string; owner: string; dueAt?: string; nextAction: string }[];
  commitments: { id: number; ref: string; description: string; currentDueAt: string; timeZone: string }[];
  boundaries: { id: number; area: string; party: string; organization?: string; environmentSpecific: boolean; coordinator?: string; responsibleUser?: string; person?: BoundaryRow['person'] }[];
  dataQuality: { id: number; rule: string; recordType: string; recordLabel: string; detail: string; nextAction?: string }[];
  network: { firewallRuleCount: number; detailRestricted: boolean }; technicalRestricted: boolean; impactNote: string;
};

export function EnvironmentDetail() {
  const T = useTypes();
  const { id } = useParams();
  const env = useQuery({ queryKey: ['environment', id], queryFn: () => get<EnvDto>(`/environments/${id}`) });
  const ov = useQuery({ queryKey: ['environment-overview', id], queryFn: () => get<EnvOverview>(`/environments/${id}/overview`) });
  const conds = useQuery({ queryKey: ['conditions', id], queryFn: () => get<{ id: number; condition: string; reason?: string; evidence?: string; observedAt: string; recordedAt: string; recordedBy?: string }[]>(`/environments/${id}/conditions`) });
  const [tab, setTab] = useState('apps');
  const [dialog, setDialog] = useState<string | null>(null);
  const canArchive = usePermission('Environments', 'ArchiveRestore');
  const canCreateServer = usePermission('Servers', 'Create');
  const canCreateInstallation = usePermission('Installations', 'Create');
  const canCreateEnvironment = usePermission('Environments', 'Create');
  const e = env.data;
  const o = ov.data;
  return (
    <QueryState q={env}>{e && (<>
      <PageHead title={e.name} crumbs={[{ to: '/clients', label: 'Clients' }, { to: `/clients/${e.client.id}`, label: e.client.code }, ...(e.region ? [{ to: `/regions/${e.region.id}`, label: e.region.code }] : []), { label: e.name }]}
        sub={<>{T.name('EnvironmentType', e.type)}{e.typeDescription && ` (${e.typeDescription})`} · {e.region ? `Region ${e.region.code}` : 'Direct under client'} · <StatusBadge value={e.criticality} /></>}
        actions={<>
          {e.canEdit && <Link className="btn" to={`/environments/${id}/edit`}>Edit</Link>}
          {e.canEdit && <button className="btn" onClick={() => setDialog('condition')}>Report condition</button>}
          {(canCreateServer || canCreateInstallation) && <Menu label="+ Add" primary items={[
            { label: 'Server', onClick: () => setDialog('asset'), hidden: !canCreateServer },
            { label: 'Installation (product)', onClick: () => setDialog('install'), hidden: !canCreateInstallation }
          ]} />}
          <Menu label="More" items={[
            { label: 'Copy servers or environment…', onClick: () => setDialog('clone'), hidden: !(canCreateServer || canCreateInstallation || canCreateEnvironment) },
            { label: 'Archive environment…', onClick: () => setDialog('archive'), danger: true, hidden: !canArchive }
          ]} />
        <DeleteAction button path={`/environments/${e.id}`} what={`environment ${e.name}`} afterTo={`/clients/${e.client.id}`} /></>} />
      <div className="cols">
        <Panel title="Ownership and coverage">
          <DL items={[
            ['Technical owner', <Person u={e.owner} gap="No owner (assignment gap)" />], ['Operation engineer', e.coordinator ? <Person u={e.coordinator} /> : <span className="muted">None</span>],
            ['Backup operation engineer', e.backupOwner ? <Person u={e.backupOwner} /> : <Badge tone="warn">None (coverage gap)</Badge>],
            ['Hosting', HOSTING_LABEL[e.hosting ?? 'Unknown'] ?? e.hosting], ['Location', e.location ?? 'Unknown'], ['Project link', e.project ? `${e.project.code} · ${e.project.name}` : 'None']
          ]} />
        </Panel>
        <Panel title="Condition and freshness (separately scoped)">
          <DL items={[
            ['Reported condition', <ConditionBadge c={e.condition} />], ['Reason', e.conditionReason ?? <span className="muted">—</span>], ['Observed', <When v={e.condition.observedAt} />],
            ['Inventory review', <FreshnessBadge f={e.freshness.inventory} />], ['Firewall rules review', <FreshnessBadge f={e.freshness.dependencies} />], ['Record review', <FreshnessBadge f={e.freshness.record} />],
            ['Last reviewed', <When v={e.lastReviewedAt} />]
          ]} />
          <p className="hint" style={{ marginTop: 8 }}>Condition is manually reported, not live monitoring. A condition report never refreshes the inventory review.</p>
        </Panel>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'apps', label: `Applications (${o?.installations.length ?? '…'})` }, { key: 'assets', label: `Servers & assets (${o?.assets.length ?? '…'})` }, { key: 'work', label: 'Work' },
        { key: 'network', label: `Firewall rules${o ? ` (${o.network.firewallRuleCount})` : ''}` }, { key: 'conditions', label: 'Condition history' }, { key: 'files', label: 'Attachments' }, { key: 'quality', label: 'Data quality' }, { key: 'history', label: 'History' }
      ]} />
      {!o && <StateMessage kind="loading" />}
      {o && tab === 'apps' && (o.installations.length === 0 ? <StateMessage kind="none">No application installations recorded.</StateMessage> : o.installations.map(i => (
        <Panel key={i.id} title={<><Link to={`/installations/${i.id}`}>{i.product} · {i.instanceName}</Link>{i.module && <span className="chip"> {i.module}</span>} <span className="chip">{i.version ?? 'Unknown version'}</span></>} pad={false}>
          {i.components.length === 0 ? <div className="panel-body"><StateMessage kind="none">No components recorded.</StateMessage></div> : (
            <DataTable caption={`Components in ${i.product} ${i.instanceName}`} rows={i.components} rowKey={c => c.id} columns={[
              { key: 'component', header: 'Component', render: c => <Link to={`/components/${c.id}`}>{c.name}</Link> },
              { key: 'role', header: 'Role', render: c => c.role },
              { key: 'version', header: 'Component version', render: c => c.componentVersion ?? <span className="muted">Not recorded</span> },
              { key: 'hosts', header: 'Supporting servers', render: c => c.hosts.length === 0 ? <Badge tone="warn">No host recorded</Badge> : c.hosts.map(h => <span key={h.assetId} style={{ marginRight: 8 }}><Link to={`/assets/${h.assetId}`}>{h.name}</Link> <span className="chip">{T.name('AssetType', h.type)}</span></span>) }
            ]} />
          )}
        </Panel>)))}
      {o && tab === 'assets' && (
        <Panel title="Servers and assets (recorded provisioning)" pad={false}>
          <DataTable rowKey={a => a.id} rows={o.assets} columns={[
            { key: 'n', header: 'Asset', render: a => <Link to={`/assets/${a.id}`}>{a.name}</Link> }, { key: 't', header: 'Type', render: a => T.name('AssetType', a.type) }, { key: 'r', header: 'Role', render: a => a.role },
            { key: 'l', header: 'Lifecycle', render: a => <StatusBadge value={a.lifecycle} /> }, { key: 'z', header: 'Zone', render: a => o.technicalRestricted ? <span className="muted">Restricted</span> : a.networkZone },
            { key: 'c', header: 'CPU', render: a => T.category('AssetType', a.type) === 'LogicalEndpoint' ? <span className="muted">n/a</span> : qty(a.cpuQuantity, a.cpuUnit) },
            { key: 'm', header: 'RAM', render: a => T.category('AssetType', a.type) === 'LogicalEndpoint' ? <span className="muted">n/a</span> : qty(a.ramQuantity, a.ramUnit) },
            { key: 'v', header: 'Volumes', render: a => a.volumes.map(v => <div key={v.id}>{v.label} {qty(v.capacity, v.unit)}{v.shared && <span className="chip"> shared: {v.shared}</span>}</div>) },
            { key: 'h', header: 'Hosts components', render: a => a.components.map(c => c.name).join(', ') || <span className="muted">None</span> },
            { key: 'del', header: '', className: 'row-actions', render: a => <DeleteAction path={`/assets/${a.id}`} what={`server ${a.name}`} /> }
          ]} />
        </Panel>
      )}
      {o && tab === 'work' && (<div className="cols">
        <Panel title="Open cases affecting this environment">{o.cases.length === 0 ? <StateMessage kind="none" /> : <ul className="timeline">{o.cases.map(c => <li key={c.id}><Link to={`/cases/${c.id}`}>{c.ref}</Link> {c.title} <StatusBadge value={c.status} enumName="CaseStatus" /><div className="when">{c.owner} · {c.nextAction}</div></li>)}</ul>}</Panel>
        <Panel title="Related open commitments">{o.commitments.length === 0 ? <StateMessage kind="none" /> : <ul className="timeline">{o.commitments.map(c => <li key={c.id}><Link to={`/commitments/${c.id}`}>{c.ref}</Link> {c.description}<div className="when">due {fmtDateTime(c.currentDueAt)}</div></li>)}</ul>}</Panel>
        <Panel title="Responsibility boundaries">{o.boundaries.length === 0 ? <StateMessage kind="none" /> : <ul className="timeline">{o.boundaries.map(b => <li key={b.id}><b>{b.area}</b>: <BoundaryPerson b={b} /> {label(b.party)}{b.organization && ` · ${b.organization}`}{b.coordinator && ` · coordinator ${b.coordinator}`} <span className="chip">{b.environmentSpecific ? 'This environment' : 'Whole client'}</span></li>)}</ul>}</Panel>
      </div>)}
      {e && tab === 'network' && <FirewallRulesPanel environmentId={e.id} clientId={e.client.id} />}
      {tab === 'conditions' && (
        <Panel title="Condition reports (history kept)" pad={false}>
          <DataTable rowKey={r => r.id} rows={conds.data} loading={conds.isLoading} columns={[
            { key: 'o', header: 'Observed', render: r => fmtDateTime(r.observedAt) }, { key: 'c', header: 'Condition', render: r => <StatusBadge value={r.condition} enumName="Condition" /> },
            { key: 'r', header: 'Reason', render: r => r.reason }, { key: 'e', header: 'Evidence / note', render: r => r.evidence }, { key: 'b', header: 'Recorded by', render: r => `${r.recordedBy ?? ''} · ${fmtDateTime(r.recordedAt)}` }
          ]} />
        </Panel>
      )}
      {o && tab === 'quality' && (
        <Panel title="Open data-quality items" pad={false}>
          <DataTable rowKey={d => d.id} rows={o.dataQuality} columns={[
            { key: 'r', header: 'Rule', render: d => label(d.rule) }, { key: 'l', header: 'Record', render: d => `${label(d.recordType)} · ${d.recordLabel}` }, { key: 'd', header: 'Detail', render: d => d.detail }, { key: 'n', header: 'Next action', render: d => d.nextAction }
          ]} />
        </Panel>
      )}
      {tab === 'files' && <AttachmentsWorkspace recordType="Environment" recordId={e.id} />}
      {tab === 'history' && <HistoryPanel entityType="Environment" entityId={e.id} />}
      {dialog === 'condition' && <ConditionDialog envId={e.id} onClose={() => setDialog(null)} />}
      {dialog === 'install' && <InstallationDialog environmentId={e.id} clientId={e.client.id} onClose={() => setDialog(null)} />}
      {dialog === 'asset' && <AssetDialog environmentId={e.id} clientId={e.client.id} onClose={() => setDialog(null)} />}
      {dialog === 'clone' && <CloneDialog sourceEnvironmentId={e.id} clientId={e.client.id} sourceRegionCode={e.region?.code} sourceName={e.name} wholeEnvironment onClose={() => setDialog(null)} />}
      {dialog === 'archive' && <ArchiveDialog what="environment" path={`/environments/${id}/archive`} version={e.version} allowException onClose={() => setDialog(null)} />}
    </>)}</QueryState>
  );
}

function ConditionDialog({ envId, onClose }: { envId: number; onClose: () => void }) {
  const f = useForm({ condition: 'Healthy', reason: '', evidence: '', observedAt: toLocalInput(new Date().toISOString()) });
  const conds = useEnum('Condition');
  const conditionLabel = useEnumLabel('Condition');
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const ok = await f.submit(v => post(`/environments/${envId}/conditions`, { ...v, observedAt: v.observedAt ? fromLocalInput(v.observedAt) : null }).then(() => true));
    if (ok) { toast('Condition report recorded.'); refresh(); onClose(); }
  };
  return (
    <Dialog title="Report operating condition" onClose={onClose}>
      <div className="notice">A manual report, not live monitoring. Healthy, Degraded or Unavailable need a reason. Comments are optional. This does not verify the inventory.</div>
      <FormError error={f.error} />
      <div className="form-grid">
        <SelectInput label="Condition" required value={f.values.condition} onChange={v => f.set('condition', v)} options={conds.map(c => ({ value: c, label: conditionLabel(c) }))} empty={null} />
        <TextInput label="Observed at" required type="datetime-local" value={f.values.observedAt} onChange={v => f.set('observedAt', v)} error={f.fieldError('observedAt')} hint="Cannot be in the future." />
        <TextInput label="Reason" required={f.values.condition !== 'Unknown'} wide value={f.values.reason} onChange={v => f.set('reason', v)} error={f.fieldError('reason')} />
        <TextInput label="Comments (optional)" wide multiline value={f.values.evidence} onChange={v => f.set('evidence', v)} error={f.fieldError('evidence')} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Record report</button></div>
    </Dialog>
  );
}
