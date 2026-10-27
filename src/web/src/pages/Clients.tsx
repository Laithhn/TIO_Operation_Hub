import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { exportCsv, get, post, put, qs, type Paged, type UserRef } from '../api';
import { fmtDate, label } from '../format';
import { usePermission, useDebounced, useEnum, useForm, useLeaveGuard, useLookup, useMe, useReference, useRefresh, useUrlState, useTypes } from '../hooks';
import { ArchiveDialog, UserPicker } from '../ui/pickers';
import {
  Badge, Checkbox, ConditionBadge, DataTable, Dialog, DL, enumOptions, FormError, FreshnessBadge, PageHead, Pager, Panel, Person, QueryState,
  SelectInput, StateMessage, StatusBadge, Tabs, TextInput, Unknown, useToast, When, type ConditionT, type FreshnessT, Menu, DeleteAction, FormSection } from '../ui/kit';
import { HistoryPanel, toNum, useClientOptions, useProductOptions, useTeamOptions, ContactCard, ContactFields, contactFrom, contactOut } from './common';
import { AttachmentsPanel } from './Attachments';
import { MyNotesPanel } from './Notes';
import { ClientContracts } from './Contracts';
import { EscalationTable } from './Escalations';
import { InitialOrganizationStructure, OrganizationStructure, type InitialRelationshipDraft } from './OrganizationStructure';

type ClientRow = {
  id: number; code: string; name: string; country?: string; countryUnknown: boolean; status: string; owner?: UserRef; regionCount: number; environmentCount: number; directEnvironmentCount: number;
  openCases: number; overdueCommitments: number; parentClientId?: number; parentCode?: string; parentName?: string; subClientCount: number;
};

export function ClientList() {
  // A29: main clients are listed with their sub-clients right below them.
  const [f, set] = useUrlState({ q: '', country: '', status: '', structure: '', level: '', sort: 'tree', page: '1', pageSize: '15' });
  const [text, setText] = useState(f.q);
  const dq = useDebounced(text);
  useEffect(() => { if (dq !== f.q) set({ q: dq }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  const statuses = useEnum('ClientStatus');
  const q = useQuery({ queryKey: ['clients', f], queryFn: () => get<Paged<ClientRow>>(`/clients${qs(f)}`) });
  const canCreate = usePermission('ClientStructure', 'Create');
  const filtered = !!(f.q || f.country || f.status || f.structure || f.level);
  return (
    <>
      <PageHead title="Clients" sub="Countries group clients for reporting; regions are optional and shown only where a client has them."
        actions={canCreate && <Link className="btn btn-primary" to="/clients/new">+ New Client</Link>} />
      <DataTable<ClientRow> caption="Clients" rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'}
        sort={f.sort} onSort={s => set({ sort: s })}
        columns={[
          { key: 'code', header: 'Alias', sort: 'code', render: r => r.parentClientId
              ? <span className="sub-client"><span aria-hidden="true">↳ </span><Link to={`/clients/${r.id}`}>{r.code}</Link></span> : <Link to={`/clients/${r.id}`}>{r.code}</Link>,
            filter: <input className="input" placeholder="Search by name or alias" aria-label="Search clients by name or alias" value={text} onChange={e => setText(e.target.value)} style={{ minWidth: 200 }} /> },
          { key: 'name', header: 'Client', sort: 'name', priority: 'primary', render: r => <><Link to={`/clients/${r.id}`}>{r.name}</Link>
              {r.parentClientId ? <div className="hint">Sub-client of {r.parentCode}</div> : r.subClientCount > 0 ? <div className="hint">{r.subClientCount} sub-client(s)</div> : null}</>,
            filter: <select className="input" aria-label="Filter by level" value={f.level} onChange={e => set({ level: e.target.value, page: '1' })}><option value="">All levels</option><option value="main">Main clients</option><option value="sub">Sub-clients</option></select> },
          { key: 'country', header: 'Country', sort: 'country', render: r => r.country,
            filter: <input className="input" aria-label="Filter by country" placeholder="Country" value={f.country} onChange={e => set({ country: e.target.value })} /> },
          { key: 'status', header: 'Status', sort: 'status', priority: 'primary', render: r => <StatusBadge value={r.status} />,
            filter: <select className="input" aria-label="Filter by status" value={f.status} onChange={e => set({ status: e.target.value })}><option value="">All</option>{statuses.filter(s => s !== 'Archived').map(s => <option key={s}>{s}</option>)}</select> },
          { key: 'structure', header: 'Structure', render: r => <span className="nowrap" title={r.regionCount === 0 ? 'Environments directly under the client, no regions' : undefined}>{r.regionCount === 0 ? 'Direct' : `${r.regionCount} region${r.regionCount > 1 ? 's' : ''}${r.directEnvironmentCount ? ' + direct' : ''}`}</span>,
            filter: <select className="input" aria-label="Filter by structure" value={f.structure} onChange={e => set({ structure: e.target.value })}><option value="">All</option><option value="regional">With regions</option><option value="direct">Without regions</option></select> },
          { key: 'env', header: 'Environments', className: 'num', render: r => r.environmentCount },
          { key: 'cases', header: 'Open cases', className: 'num', render: r => r.openCases },
          { key: 'od', header: 'Overdue commitments', className: 'num', render: r => r.overdueCommitments ? <Badge tone="bad">{r.overdueCommitments}</Badge> : 0 },
          { key: 'owner', header: 'Project manager', render: r => <Person u={r.owner} /> }, { key: 'del', header: '', className: 'row-actions', render: r => <DeleteAction path={`/clients/${r.id}`} what={`client ${r.code}`} /> }
        ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
    </>
  );
}

type ClientDto = {
  id: number; code: string; name: string; country?: string; countryUnknown: boolean; status: string; parentOrganization?: string; partner?: string;
  owner?: UserRef; countryFollowUpOwner?: UserRef; responsibleParty: string; responsibleOrganization?: string; coordinator?: UserRef; lastReviewedAt?: string; nextReviewAt?: string;
  freshness: FreshnessT; createdAt: string; updatedAt: string; version: string; accessLevel: string;
  parentClientId?: number; parent?: { id: number; code: string; name: string };
  subClients: { id: number; code: string; name: string; status: string; country?: string; owner?: UserRef; regionCount: number; environmentCount: number; serverCount: number; products: string[]; teamSize: number }[];
  team: { userId: number; name: string; isActive: boolean; role: string }[];
};

type TeamRow = { userId: number | null; role: string };

/** A29: the people working on this client and their role. */
function TeamEditor({ rows, onChange, clientId, error }: { rows: TeamRow[]; onChange: (r: TeamRow[]) => void; clientId?: number; error: (k: string) => string | undefined }) {
  const set = (n: number, patch: Partial<TeamRow>) => onChange(rows.map((r, i) => (i === n ? { ...r, ...patch } : r)));
  // A37 (fixes the role field of 2.9–2.13): roles come from the configured "Project team roles" list; a role no longer offered stays selectable on rows that have it.
  const roles = useLookup('TeamRole');
  const roleOptions = (current: string) => [...roles.map(x => ({ value: x.code, label: x.label })), ...(current && !roles.some(x => x.code === current) ? [{ value: current, label: `${current} (retired)` }] : [])];
  // A58: add everyone in a team from Teams at once; each person becomes a row (role taken over when the team role is also a project team role).
  const teams = useTeamOptions();
  const [teamId, setTeamId] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const addTeam = async () => {
    if (!teamId) return;
    setBusy(true); setNote(null);
    try {
      const t = await get<{ code: string; members: { userId: number; name: string; userActive: boolean; isActive: boolean; teamRole?: string }[] }>(`/teams/${teamId}`);
      const have = new Set(rows.map(r => r.userId));
      const fresh = t.members.filter(m => m.isActive && m.userActive && !have.has(m.userId));
      const roleOf = (r?: string) => roles.find(x => r && (x.code.toLowerCase() === r.toLowerCase() || x.label.toLowerCase() === r.toLowerCase()))?.code ?? '';
      const added = fresh.map(m => ({ userId: m.userId, role: roleOf(m.teamRole) }));
      onChange([...rows.filter(r => r.userId !== null || r.role), ...added]);
      const noRole = added.filter(a => !a.role).length;
      const skipped = t.members.length - fresh.length;
      const active = t.members.filter(m => m.isActive && m.userActive).length;
      setNote(active === 0 ? `${t.code} has no active members to add.` : added.length === 0 ? `Everyone active in ${t.code} is already on the team.`
        : `Added ${added.length} member(s) from ${t.code}${skipped ? ` (${skipped} already listed or inactive)` : ''}.${noRole ? ` Choose the role of ${noRole} of them.` : ''}`);
      setTeamId('');
    } catch { setNote('The team could not be loaded.'); }
    finally { setBusy(false); }
  };
  return (
    <fieldset className="wide team-edit" style={{ border: 0, padding: 0 }}>
      <legend className="flabel">Project team</legend>
      {rows.length === 0 && <p className="hint" style={{ margin: '0 0 6px' }}>No team members yet.</p>}
      {rows.map((r, n) => (
        <div key={n} className="team-row">
          <UserPicker label={`Team member ${n + 1}`} value={r.userId} onChange={v => set(n, { userId: v })} clientId={clientId} empty="— Select —" error={error(`team[${n}]`)} />
          <SelectInput label={`Team member ${n + 1} role`} value={r.role} onChange={v => set(n, { role: v })} options={roleOptions(r.role)} error={error(`team[${n}].role`)} />
          <button className="linkbtn" onClick={() => onChange(rows.filter((_, i) => i !== n))} aria-label={`Remove team member ${n + 1}`}>Remove</button>
        </div>
      ))}
      <div className="team-from">
        <button className="btn" onClick={() => onChange([...rows, { userId: null, role: roles[0]?.code ?? '' }])}>+ Team member</button>
        <span className="muted">or add a whole team:</span>
        <SelectInput label="Team from Teams" value={teamId} onChange={setTeamId} options={teams} empty="— Select a team —" />
        <button className="btn" onClick={addTeam} disabled={!teamId || busy}>{busy ? 'Adding…' : 'Add team members'}</button>
      </div>
      {note && <p className="hint" role="status" style={{ margin: '6px 0 0' }}>{note}</p>}
      {error('team') && <div className="err">{error('team')}</div>}
    </fieldset>
  );
}

export function ClientForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  // Owner decision (UAT 19 Oct 2026): alias, name, country from the world list, Opportunity/Active, project manager. Always the TIO team.
  const statuses = useEnum('ClientStatus').filter(s => s !== 'Archived');
  const countries = useReference().data?.countries ?? [];
  const existing = useQuery({ queryKey: ['client', id], queryFn: () => get<ClientDto>(`/clients/${id}`), enabled: !isNew });
  const [sp] = useSearchParams();
  const mains = useQuery({ queryKey: ['main-clients'], queryFn: () => get<Paged<ClientRow>>('/clients?level=main&sort=code&pageSize=200') });
  const f = useForm({ code: '', name: '', country: '', status: 'Opportunity', ownerUserId: null as number | null, parentClientId: sp.get('parentId') ?? '', team: [] as TeamRow[], organizationRelationships: [] as InitialRelationshipDraft[] });
  const [version, setVersion] = useState<string>();
  useLeaveGuard(f.dirty && !f.busy);
  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setVersion(c.version);
    f.reset({ code: c.code, name: c.name, country: c.country ?? '', status: c.status, ownerUserId: c.owner?.id ?? null, parentClientId: c.parentClientId ? String(c.parentClientId) : '',
      team: c.team.map(t => ({ userId: t.userId, role: t.role })), organizationRelationships: [] });
  }, [existing.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const dupCode = useDebounced(f.values.code);
  const dupName = useDebounced(f.values.name);
  const dups = useQuery({ queryKey: ['dups', dupCode, dupName], queryFn: () => get<{ visible: { id: number; code: string; name: string; archived: boolean }[]; hiddenCount: number }>(`/clients/duplicates${qs({ code: dupCode, name: dupName })}`), enabled: isNew && (dupCode.length > 1 || dupName.length > 2) });
  const save = async () => {
    const body = (v: typeof f.values) => {
      const { organizationRelationships, ...client } = v;
      return { ...client, parentClientId: toNum(v.parentClientId), team: v.team,
        ...(isNew && organizationRelationships.length ? { organizationRelationships: organizationRelationships.map(({ label: _label, ...relationship }) => relationship) } : {}) };
    };
    const r = await f.submit(async v => isNew ? post<{ id: number }>('/clients', body(v)) : put(`/clients/${id}`, body(v), version).then(() => ({ id: Number(id) })));
    if (r) { toast(isNew ? 'Client created.' : 'Client saved.'); refresh(); nav(`/clients/${r.id}`); }
  };
  const hasSubs = (existing.data?.subClients.length ?? 0) > 0;
  const pickParent = (v: string) => {
    f.set('parentClientId', v);
    // A sub-client usually sits in its main client's country.
    const p = mains.data?.items.find(x => String(x.id) === v);
    if (p?.country && !f.values.country) f.set('country', p.country);
  };
  useEffect(() => { if (isNew && f.values.parentClientId && mains.data) pickParent(f.values.parentClientId); }, [mains.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const reloadLatest = async () => { const c = await existing.refetch(); if (c.data) setVersion(c.data.version); f.setError(null); toast('Latest version loaded. Your entries are kept; review and save again.'); };
  if (!isNew && existing.isLoading) return <StateMessage kind="loading" />;
  return (
    <>
      <PageHead title={isNew ? 'New client' : `Edit ${existing.data?.name ?? ''}`} crumbs={[{ to: '/clients', label: 'Clients' }, ...(isNew ? [] : [{ to: `/clients/${id}`, label: existing.data?.code ?? '' }])]} />
      <Panel>
        <FormError error={f.error} />
        {f.error?.isConflict && <button className="btn" onClick={reloadLatest} style={{ marginBottom: 10 }}>Reload latest</button>}
        {isNew && dups.data && (dups.data.visible.length > 0 || dups.data.hiddenCount > 0) && (
          <div className="notice warn" role="status">Possible duplicates: {dups.data.visible.map(d => <span key={d.id}><Link to={`/clients/${d.id}`}>{d.code} · {d.name}</Link>{d.archived && ' (archived)'}; </span>)}
            {dups.data.hiddenCount > 0 && <span>{dups.data.hiddenCount} matching record(s) exist that you cannot access.</span>}</div>
        )}
        <div className="form-grid">
          <SelectInput label="Main client" value={f.values.parentClientId} onChange={pickParent} error={f.fieldError('parentClientId')} disabled={hasSubs}
            options={(mains.data?.items ?? []).filter(m => String(m.id) !== id).map(m => ({ value: String(m.id), label: `${m.code} · ${m.name}` }))} empty="None — this is a main client"
            hint={hasSubs ? 'This client has sub-clients, so it stays a main client.' : 'Choose one to make this a sub-client, for example Traffic Department under Dubai Police. It keeps its own environments, regions, servers, products and team.'} />
          <TextInput label="Client alias" required value={f.values.code} onChange={v => f.set('code', v.toUpperCase())} error={f.fieldError('code')} disabled={!isNew}
            hint={isNew ? 'Short name used across the hub, e.g. DP or TAH. Unique and permanent; reserved even after archiving.' : 'The alias is corrected only by an administrator.'} maxLength={50} />
          <TextInput label="Client name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} maxLength={150} />
          <SelectInput label="Status" required value={f.values.status} onChange={v => f.set('status', v)} options={enumOptions(statuses)} empty={null} error={f.fieldError('status')} />
          <SelectInput label="Country" required value={f.values.country} onChange={v => f.set('country', v)} options={countries.map(c => ({ value: c, label: c }))} empty="— Select the country —" error={f.fieldError('country')} />
          <UserPicker label="Project manager" required value={f.values.ownerUserId} onChange={v => f.set('ownerUserId', v)} clientId={isNew ? undefined : Number(id)} error={f.fieldError('ownerUserId')} empty="— Select —"
            hint="The team member managing this client. Only a Team Lead or the TIO Manager can change it." />
          <TeamEditor rows={f.values.team} onChange={r => f.set('team', r)} clientId={isNew ? undefined : Number(id)} error={k => f.fieldError(k)} />
        </div>
        {isNew ? <InitialOrganizationStructure drafts={f.values.organizationRelationships} onChange={v => f.set('organizationRelationships', v)} error={f.fieldError('organizationRelationships')} />
          : <details className="org-optional"><summary>Organizational Structure <span className="muted">(optional)</span></summary>
            <p>Relationships are managed on the client page. Save your client changes before managing the structure.</p>
            <Link to={'/clients/' + id + '?tab=organizations'}>Manage organizational structure</Link></details>}
        <p className="hint" style={{ marginTop: 10 }}>Regions are optional. Add them on the client page only if this client organizes operations into regions; once a client has regions, every environment belongs to one.</p>
        <div className="form-actions">
          <button className="btn" onClick={() => nav(-1)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={f.busy}>{f.busy ? 'Saving…' : 'Save client'}</button>
        </div>
      </Panel>
    </>
  );
}

type EnvCard = { id: number; name: string; type: string; criticality: string; regionId?: number; owner?: UserRef; hasBackup: boolean; installations: { id: number; instanceName: string; product: string; version?: string }[]; assetCount: number; openCases: number; condition: ConditionT; inventoryFreshness: FreshnessT };
type Overview = {
  client: { id: number; code: string; name: string; status: string; owner?: UserRef };
  structure: string; regions: { id: number; code: string; name: string; owner?: string; environments: EnvCard[] }[]; directEnvironments: EnvCard[];
  counts: { environments: number; installations: number; environmentsWithInstallations: number; openCases: number; overdueCases: number; openCommitments: number; overdueCommitments: number };
  infrastructure: Infra; cases: { id: number; ref: string; title: string; status: string; priority: string; owner: string; dueAt?: string; overdue: boolean; waitingReason?: string; nextAction: string }[];
  commitments: { id: number; ref: string; description: string; type: string; currentDueAt: string; timeZone: string; overdue: boolean; owner?: string }[];
  projects: { id: number; code: string; name: string; status: string; owner?: string; serviceStart?: string; serviceEnd?: string }[];
  contacts?: { id: number; name: string; role?: string; organization?: string; email?: string; phone?: string; authorizedSupport: boolean }[];
  boundaries?: BoundaryRow[];
  personalDataRestricted: boolean; dataQuality: { rule: string; count: number }[]; gaps: string[];
};
export type Infra = { label: string; assets: { total: number; vm: number; physical: number; logicalEndpoints: number; unverified: number }; cpu: { vCpu: number; physicalCores: number; unknownCount: number }; ram: { gb: number; gib: number; unknownCount: number }; storage: { dedicated: Record<string, number>; dedicatedUnknownCount: number; shared: Record<string, number>; sharedUnknownCount: number; sharedPools: number; volumesOnShared: number } };

export function InfraSummary({ i }: { i: Infra }) {
  const units = (r: Record<string, number>) => Object.entries(r).map(([u, v]) => `${v} ${u}`).join(' + ') || '0';
  return (
    <>
      <p className="hint" style={{ marginBottom: 8 }}>{i.label}. Unknown quantities are counted as missing, never as zero.</p>
      <DL items={[
        ['Assets', `${i.assets.total} (VM ${i.assets.vm} · Physical ${i.assets.physical} · Logical endpoints ${i.assets.logicalEndpoints}, not counted as VMs)`],
        ['CPU', `${i.cpu.vCpu} vCPU · ${i.cpu.physicalCores} physical cores (kept separate) · unknown on ${i.cpu.unknownCount} host(s)`],
        ['RAM', `${i.ram.gb} GB + ${i.ram.gib} GiB (units not mixed) · unknown on ${i.ram.unknownCount} host(s)`],
        ['Dedicated storage', `${units(i.storage.dedicated)} · ${i.storage.dedicatedUnknownCount} volume(s) unknown`],
        ['Shared storage (counted once)', `${units(i.storage.shared)} in ${i.storage.sharedPools} pool(s) used by ${i.storage.volumesOnShared} volume(s)${i.storage.sharedUnknownCount ? ` · ${i.storage.sharedUnknownCount} pool(s) unknown` : ''}`],
        ['Unverified', `${i.assets.unverified} unverified asset(s)`]
      ]} />
    </>
  );
}

function EnvTable({ envs }: { envs: EnvCard[] }) {
  const T = useTypes();
  if (envs.length === 0) return <StateMessage kind="none">No environments recorded here.</StateMessage>;
  return (
    <DataTable caption="Environments" rows={envs} rowKey={e => e.id} columns={[
      { key: 'n', header: 'Environment', render: e => <Link to={`/environments/${e.id}`}>{e.name}</Link> },
      { key: 't', header: 'Type', render: e => T.name('EnvironmentType', e.type) },
      { key: 'c', header: 'Criticality', render: e => <StatusBadge value={e.criticality} /> },
      { key: 'a', header: 'Applications', render: e => e.installations.length === 0 ? <span className="muted">None recorded</span> : e.installations.map(i => <div key={i.id}><Link to={`/installations/${i.id}`}>{i.product} · {i.instanceName}</Link> <span className="chip">{i.version ?? 'Unknown version'}</span></div>) },
      { key: 's', header: 'Assets', className: 'num', render: e => e.assetCount },
      { key: 'o', header: 'Open cases', className: 'num', render: e => e.openCases },
      { key: 'r', header: 'Reported condition', render: e => <ConditionBadge c={e.condition} /> },
      { key: 'f', header: 'Inventory review', render: e => <FreshnessBadge f={e.inventoryFreshness} /> },
      { key: 'w', header: 'Owner / backup', render: e => <><Person u={e.owner} gap="No owner (gap)" />{!e.hasBackup && <> <Badge tone="warn">No backup</Badge></>}</> },
      { key: 'x', header: '', render: e => <DeleteAction path={`/environments/${e.id}`} what={`environment ${e.name}`} /> }
    ]} />
  );
}

export function ClientDetail() {
  const { id } = useParams();
  const [detailSearch] = useSearchParams();
  const [tab, setTab] = useState(() => detailSearch.get('tab') ?? 'structure');
  const [regionFilter, setRegionFilter] = useState('');
  const me = useMe().data!;
  const client = useQuery({ queryKey: ['client', id], queryFn: () => get<ClientDto>(`/clients/${id}`) });
  const ov = useQuery({ queryKey: ['client-overview', id, regionFilter], queryFn: () => get<Overview>(`/clients/${id}/overview${qs({ regionId: regionFilter })}`) });
  const canStructureCreate = usePermission('ClientStructure', 'Create');
  const canStructureMaintain = usePermission('ClientStructure', 'Maintain');
  const canArchive = usePermission('ClientStructure', 'ArchiveRestore');
  const canEnvironmentCreate = usePermission('Environments', 'Create');
  const canContractCreate = usePermission('Contracts', 'Create');
  const canOtherCreate = usePermission('OtherOperations', 'Create');
  const canOtherMaintain = usePermission('OtherOperations', 'Maintain');
  const [dialog, setDialog] = useState<string | null>(null);
  const [editBoundary, setEditBoundary] = useState<BoundaryRow | null>(null);
  const c = client.data;
  const o = ov.data;
  const full = c?.accessLevel === 'Full';
  return (
    <QueryState q={client}>
      {c && (<>
        <PageHead title={c.name} crumbs={[{ to: '/clients', label: 'Clients' }, ...(c.parent ? [{ to: `/clients/${c.parent.id}`, label: c.parent.code }] : []), { label: c.code }]}
          sub={<>{c.code} · {c.country} · <StatusBadge value={c.status} /> · {o?.structure}{c.parent && <> · sub-client of <Link to={`/clients/${c.parent.id}`}>{c.parent.name}</Link></>}</>}
          actions={<>
            {canStructureMaintain && full && <Link className="btn" to={`/clients/${id}/edit`}>Edit</Link>}
            {full && <Menu label="+ Add" primary items={[
              { label: 'Environment', to: `/environments/new?clientId=${id}`, hidden: !canEnvironmentCreate },
              { label: 'Region', onClick: () => setDialog('region'), hidden: !canStructureCreate },
              { label: 'Project', onClick: () => setDialog('project'), hidden: !canStructureCreate },
              { label: 'Sub-client', to: `/clients/new?parentId=${id}`, hidden: !canStructureCreate || !!c.parent },
              { label: 'Contract', to: `/contracts/new?clientId=${id}`, hidden: !canContractCreate }
            ]} />}
            {full && <Menu label="More" items={[{ label: 'Archive client…', onClick: () => setDialog('archive'), danger: true, hidden: !canArchive }]} />}
          <DeleteAction button path={`/clients/${c.id}`} what={`client ${c.code}`} afterTo={c.parent ? `/clients/${c.parent.id}` : '/clients'} /></>} />
        {!full && <div className="notice warn">You see this client through a project scope only: summary and project-linked records are shown; other details are restricted.</div>}
        <div className="cols">
          <Panel title="Management">
            <DL items={[
              ['Project manager', <Person u={c.owner} gap="Not assigned" />],
              ['Project team', c.team.length === 0 ? <span className="muted">Not recorded</span> : <ul className="plain">{c.team.map(t => <li key={t.userId}>{t.name}{!t.isActive && ' (inactive)'} <span className="muted">· {t.role}</span></li>)}</ul>],
              ['Last reviewed', <When v={c.lastReviewedAt} />], ['Freshness', <FreshnessBadge f={c.freshness} />], ['Operational state', <StatusBadge value={c.status} />]
            ]} />
          </Panel>
          {o && <Panel title="At a glance">
            <DL items={[
              ['Environments', `${o.counts.environments} (${o.counts.environmentsWithInstallations} with applications)`], ['Application installations', o.counts.installations],
              ['Open cases', `${o.counts.openCases} (${o.counts.overdueCases} overdue)`], ['Open commitments', `${o.counts.openCommitments} (${o.counts.overdueCommitments} overdue)`],
              ['Data-quality items', o.dataQuality.reduce((n, d) => n + d.count, 0)]
            ]} />
            {o.gaps.length > 0 && <><h3 style={{ fontSize: 12.5, margin: '10px 0 4px' }}>Gaps to resolve</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{o.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul></>}
          </Panel>}
        </div>
        {c.subClients.length > 0 && (
          <Panel title={`Sub-clients (${c.subClients.length})`} pad={false}>
            <DataTable rowKey={x => x.id} rows={c.subClients} caption="Sub-clients" columns={[
              { key: 'c', header: 'Sub-client', render: x => <><Link to={`/clients/${x.id}`}>{x.code}</Link><div className="hint">{x.name}</div></> },
              { key: 's', header: 'Status', render: x => <StatusBadge value={x.status} /> },
              { key: 'pm', header: 'Project manager', render: x => <Person u={x.owner} gap="Not assigned" /> },
              { key: 'r', header: 'Regions', className: 'num', render: x => x.regionCount || <span className="muted">none</span> },
              { key: 'e', header: 'Environments', className: 'num', render: x => x.environmentCount },
              { key: 'v', header: 'Servers', className: 'num', render: x => x.serverCount },
              { key: 'p', header: 'Products', render: x => x.products.length ? x.products.join(', ') : <span className="muted">none installed</span> },
              { key: 't', header: 'Team', className: 'num', render: x => x.teamSize }, { key: 'del', header: '', className: 'row-actions', render: x => <DeleteAction path={`/clients/${x.id}`} what={`sub-client ${x.code}`} /> }
            ]} />
          </Panel>
        )}
        <Tabs value={tab} onChange={setTab} tabs={[
          { key: 'structure', label: 'Regions & environments' }, { key: 'organizations', label: 'Organizations' }, { key: 'contracts', label: 'Contracts & SLAs' }, { key: 'cases', label: 'Cases' }, { key: 'commitments', label: 'Commitments' }, { key: 'escalations', label: 'Escalations' }, { key: 'infra', label: 'Infrastructure' },
          { key: 'projects', label: 'Projects' }, { key: 'contacts', label: 'Contacts & responsibilities' }, { key: 'files', label: 'Attachments' }, { key: 'notes', label: 'My notes' }, { key: 'history', label: 'History' }
        ]} />
        {!o && <StateMessage kind="loading" />}
        {tab === 'organizations' && <OrganizationStructure clientId={Number(id)} projects={o?.projects} />}
        {o && tab === 'structure' && (<>
          {o.regions.length > 0 && (
            <div className="toolbar"><SelectInput label="Filter by region (optional)" value={regionFilter} onChange={setRegionFilter} options={o.regions.map(r => ({ value: String(r.id), label: `${r.code} · ${r.name}` }))} empty="All regions and direct" /></div>
          )}
          {o.regions.map(r => (
            <Panel key={r.id} title={<><Link to={`/regions/${r.id}`}>{r.code} · {r.name}</Link> <span className="muted" style={{ fontWeight: 400 }}>· region owner {r.owner ?? '—'}</span></>} pad={false}>
              <div className="table-wrap"><EnvTable envs={r.environments} /></div>
            </Panel>
          ))}
          {(!regionFilter) && (
            <Panel title={o.regions.length ? 'Direct client environments (no region)' : 'Environments'} pad={false}>
              <div className="table-wrap"><EnvTable envs={o.directEnvironments} /></div>
            </Panel>
          )}
        </>)}
        {tab === 'contracts' && <ClientContracts clientId={Number(id)} canCreate={canContractCreate && full} />}
        {o && tab === 'cases' && (
          <Panel title={`Open cases (${o.cases.length})`} actions={<Link className="btn" to={`/cases?clientId=${id}`}>Open list</Link>}>
            {o.cases.length === 0 ? <StateMessage kind="none" /> : <ul className="timeline">{o.cases.map(k => <li key={k.id}><Link to={`/cases/${k.id}`}>{k.ref}</Link> {k.title} <StatusBadge value={k.status} enumName="CaseStatus" /> {k.overdue && <Badge tone="bad">Overdue</Badge>}{k.waitingReason && <Badge tone="warn">Waiting: {label(k.waitingReason)}</Badge>}<div className="when">{k.owner} · next: {k.nextAction}</div></li>)}</ul>}
          </Panel>
        )}
        {tab === 'escalations' && <Panel title="Escalations" pad={false} actions={canOtherCreate && <Link className="btn" to={`/escalations/new?clientId=${id}`}>+ Escalation</Link>}><EscalationTable clientId={Number(id)} compact /></Panel>}
        {o && tab === 'commitments' && (
          <Panel title={`Open commitments (${o.commitments.length})`} actions={<Link className="btn" to={`/commitments?clientId=${id}`}>Open list</Link>}>
            {o.commitments.length === 0 ? <StateMessage kind="none" /> : <ul className="timeline">{o.commitments.map(m => <li key={m.id}><Link to={`/commitments/${m.id}`}>{m.ref}</Link> {m.description} {m.overdue && <Badge tone="bad">Overdue</Badge>}<div className="when">{m.type === 'RecordedContractualDeadline' ? 'Recorded deadline' : label(m.type)} · due <When v={m.currentDueAt} /> · {m.owner}</div></li>)}</ul>}
          </Panel>
        )}
        {o && tab === 'infra' && <Panel title="Infrastructure (recorded)" actions={<Link className="btn" to={`/assets?clientId=${id}`}>Asset list</Link>}><InfraSummary i={o.infrastructure} /></Panel>}
        {o && tab === 'projects' && (
          <Panel title="Projects and their contracts" pad={false} actions={<Link className="btn" to={`/projects?clientId=${id}`}>Open list</Link>}>
            <DataTable rowKey={p => p.id} rows={o.projects} columns={[
              { key: 'c', header: 'Code', render: p => <Link to={`/projects/${p.id}`}>{p.code}</Link> }, { key: 'n', header: 'Project', render: p => <Link to={`/projects/${p.id}`}>{p.name}</Link> }, { key: 's', header: 'Status', render: p => <StatusBadge value={p.status} /> },
              { key: 'o', header: 'Owner', render: p => p.owner }, { key: 'd', header: 'Service dates', render: p => p.serviceStart ? `${fmtDate(p.serviceStart)} – ${p.serviceEnd ? fmtDate(p.serviceEnd) : 'open'}` : <Unknown /> }, { key: 'del', header: '', className: 'row-actions', render: p => <DeleteAction path={`/projects/${p.id}`} what={`project ${p.code}`} /> }
            ]} />
          </Panel>
        )}
        {o && tab === 'contacts' && (o.personalDataRestricted ? <StateMessage kind="restricted">Contacts and responsibility boundaries need client scope.</StateMessage> : (<>
          <Panel title="Contacts" actions={canOtherCreate && <button className="btn" onClick={() => setDialog('contact')}>+ Contact</button>} pad={false}>
            <DataTable rowKey={x => x.id} rows={o.contacts} columns={[
              { key: 'n', header: 'Name', render: x => x.name }, { key: 'r', header: 'Role', render: x => x.role }, { key: 'o', header: 'Organization', render: x => x.organization },
              { key: 'e', header: 'Email', render: x => x.email }, { key: 'p', header: 'Phone', render: x => x.phone }, { key: 'a', header: 'Authorized support', render: x => x.authorizedSupport ? 'Yes' : 'No' }, { key: 'del', header: '', className: 'row-actions', render: x => <DeleteAction path={`/contacts/${x.id}`} what={`contact ${x.name}`} /> }
            ]} />
          </Panel>
          <Panel title="Responsibility boundaries" actions={canOtherCreate && <button className="btn" onClick={() => setDialog('boundary')}>+ Boundary</button>} pad={false}>
            <DataTable rowKey={x => x.id} rows={o.boundaries} caption="Responsibility boundaries" columns={[
              { key: 'a', header: 'Area', render: x => x.area }, { key: 'p', header: 'Responsible party', render: x => <>{label(x.party)}{x.organization && <div className="hint">{x.organization}</div>}</> },
              { key: 'r', header: 'Responsible person', render: x => <BoundaryPerson b={x} /> },
              { key: 'e', header: 'Scope', render: x => x.environmentId ? 'One environment' : 'Whole client' }, { key: 'c', header: 'Internal coordinator', render: x => x.coordinator ?? <span className="muted">—</span> },
              { key: 'x', header: '', className: 'row-actions nowrap', render: x => <>{canOtherMaintain && <button className="linkbtn" onClick={() => setEditBoundary(x)}>Edit</button>} <DeleteAction path={`/boundaries/${x.id}`} what={`responsibility boundary ${x.area}`} /></> }
            ]} />
          </Panel>
        </>))}
        {tab === 'notes' && <MyNotesPanel clientId={Number(id)} />}
        {tab === 'files' && <AttachmentsPanel recordType="Client" recordId={Number(id)} scopeAllowed={!!full} />}
        {tab === 'history' && <HistoryPanel entityType="Client" entityId={Number(id)} />}
        {dialog === 'region' && <RegionDialog clientId={Number(id)} onClose={() => setDialog(null)} />}
        {dialog === 'project' && <ProjectDialog clientId={Number(id)} onClose={() => setDialog(null)} />}
        {dialog === 'contact' && <ContactDialog clientId={Number(id)} onClose={() => setDialog(null)} />}
        {dialog === 'boundary' && <BoundaryDialog clientId={Number(id)} onClose={() => setDialog(null)} />}
        {editBoundary && <BoundaryDialog clientId={Number(id)} boundary={editBoundary} onClose={() => setEditBoundary(null)} />}
        {dialog === 'archive' && <ArchiveDialog what="client" path={`/clients/${id}/archive`} version={c.version} allowException onClose={() => setDialog(null)} />}
        {me && null}
      </>)}
    </QueryState>
  );
}

function RegionDialog({ clientId, region, onClose }: { clientId: number; region?: { id: number; code: string; name: string; ownerId?: number; description?: string; version: string }; onClose: () => void }) {
  const f = useForm({ code: region?.code ?? '', name: region?.name ?? '', ownerUserId: region?.ownerId ?? null as number | null, description: region?.description ?? '' });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const ok = await f.submit(v => (region ? put(`/regions/${region.id}`, v, region.version) : post(`/clients/${clientId}/regions`, v)).then(() => true));
    if (ok) { toast('Region saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={region ? 'Edit region' : 'Add region'} onClose={onClose}>
      <p className="hint" style={{ marginBottom: 10 }}>Add a region only when this client really organizes operations by region. Codes are unique within the client.</p>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Region code" required value={f.values.code} onChange={v => f.set('code', v.toUpperCase())} error={f.fieldError('code')} />
        <TextInput label="Region name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} />
        <UserPicker label="Accountable owner" required value={f.values.ownerUserId} onChange={v => f.set('ownerUserId', v)} clientId={clientId} error={f.fieldError('ownerUserId')} empty="— Select —" />
        <TextInput label="Description" wide multiline value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save</button></div>
    </Dialog>
  );
}

export function RegionDetail() {
  const T = useTypes();
  const { id } = useParams();
  const q = useQuery({ queryKey: ['region', id], queryFn: () => get<{ id: number; code: string; name: string; description?: string; clientId: number; clientName: string; clientCode: string; owner?: UserRef; environments: { id: number; name: string; type: string; criticality: string; condition: string }[]; version: string }>(`/regions/${id}`) });
  const canLead = usePermission('ClientStructure', 'Maintain');
  const canEng = usePermission('Environments', 'Create');
  const canArchive = usePermission('ClientStructure', 'ArchiveRestore');
  const [dialog, setDialog] = useState<string | null>(null);
  const r = q.data;
  const newEnv = r ? `/environments/new?clientId=${r.clientId}&regionId=${r.id}` : '';
  return (
    <QueryState q={q}>{r && (<>
      <PageHead title={`${r.code} · ${r.name}`} crumbs={[{ to: '/clients', label: 'Clients' }, { to: `/clients/${r.clientId}`, label: r.clientCode }, { label: r.code }]}
        sub="Region (optional client grouping)" actions={<>
          {canEng && <Link className="btn btn-primary" to={newEnv}>+ New environment</Link>}
          {canLead && <button className="btn" onClick={() => setDialog('edit')}>Edit</button>}
          {canArchive && <button className="btn btn-danger" onClick={() => setDialog('archive')}>Archive</button>}<DeleteAction button path={`/regions/${r.id}`} what={`region ${r.code}`} afterTo={`/clients/${r.clientId}`} /></>} />
      <div className="cols">
        <Panel title="Region"><DL items={[['Client', <Link to={`/clients/${r.clientId}`}>{r.clientName}</Link>], ['Owner', <Person u={r.owner} />], ['Description', r.description]]} /></Panel>
        <Panel title="Environments in this region" pad={false} actions={canEng && <Link className="btn" to={newEnv}>+ Environment in {r.code}</Link>}>
          <DataTable rowKey={e => e.id} rows={r.environments} empty="none" columns={[
            { key: 'n', header: 'Environment', render: e => <Link to={`/environments/${e.id}`}>{e.name}</Link> }, { key: 't', header: 'Type', render: e => T.name('EnvironmentType', e.type) }, { key: 'c', header: 'Criticality', render: e => <StatusBadge value={e.criticality} /> }, { key: 'del', header: '', className: 'row-actions', render: e => <DeleteAction path={`/environments/${e.id}`} what={`environment ${e.name}`} /> }
          ]} />
          {r.environments.length > 0 && <p className="hint" style={{ padding: 10 }}>Archiving is blocked while active environments remain; reassign them first. Environments are never moved or deleted silently.</p>}
        </Panel>
      </div>
      <AttachmentsPanel recordType="Region" recordId={r.id} />
      <HistoryPanel entityType="Region" entityId={r.id} />
      {dialog === 'edit' && <RegionDialog clientId={r.clientId} region={{ id: r.id, code: r.code, name: r.name, ownerId: r.owner?.id, description: r.description, version: r.version }} onClose={() => setDialog(null)} />}
      {dialog === 'archive' && <ArchiveDialog what="region" path={`/regions/${r.id}/archive`} version={r.version} onClose={() => setDialog(null)} />}
    </>)}</QueryState>
  );
}

type ProjectRow = {
  id: number; code: string; name: string; status: string; clientId: number; clientName: string; clientCode: string; scopeSummary?: string; serviceStart?: string; serviceEnd?: string; owner?: UserRef;
  products: { id: number; code: string }[]; contracts: number; activeContracts: number; renewalAttention: number;
};

/** Projects & contracts (A27): the two views of one area. */
export function ProjectTabs({ value }: { value: 'projects' | 'contracts' }) {
  const nav = useNavigate();
  return <Tabs tabs={[{ key: 'projects', label: 'Projects' }, { key: 'contracts', label: 'Contract register' }]} value={value} onChange={k => nav(k === 'contracts' ? '/contracts' : '/projects')} />;
}

export function ProjectList() {
  const [f, set] = useUrlState({ q: '', status: '', clientId: '', sort: 'name', page: '1', pageSize: '15' });
  const q = useQuery({ queryKey: ['projects', f], queryFn: () => get<Paged<ProjectRow>>(`/projects${qs(f)}`) });
  const statuses = useEnum('ProjectStatus');
  const clients = useClientOptions();
  const canLead = usePermission('ClientStructure', 'Create');
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHead title="Projects & contracts" crumbs={[{ to: '/clients', label: 'Clients' }, { label: 'Projects & contracts' }]}
        sub="A project is the engagement with a client: its products, environments and the contracts with their SLA terms and renewal dates."
        actions={canLead && <button className="btn btn-primary" onClick={() => setAdding(true)}>+ New project</button>} />
      <ProjectTabs value="projects" />
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v, page: '1' })} options={clients} empty="All authorized clients" />
      </div>
      <DataTable<ProjectRow> rowKey={p => p.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={f.q || f.status ? 'nomatch' : 'none'} sort={f.sort} onSort={s => set({ sort: s })}
        columns={[
          { key: 'code', header: 'Code', sort: 'code', render: p => <Link to={`/projects/${p.id}`}>{p.code}</Link>, filter: <input className="input" aria-label="Search projects" placeholder="Search by name or code" value={f.q} onChange={e => set({ q: e.target.value })} /> },
          { key: 'name', header: 'Project', sort: 'name', render: p => <Link to={`/projects/${p.id}`}>{p.name}</Link> },
          { key: 'client', header: 'Client', sort: 'client', render: p => <Link to={`/clients/${p.clientId}`}>{p.clientCode}</Link> },
          { key: 'status', header: 'Status', sort: 'status', render: p => <StatusBadge value={p.status} />, filter: <select className="input" aria-label="Filter by status" value={f.status} onChange={e => set({ status: e.target.value })}><option value="">All</option>{statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}</select> },
          { key: 'products', header: 'Supported products', render: p => p.products.map(x => x.code).join(', ') },
          { key: 'contracts', header: 'Contracts', render: p => p.contracts === 0 ? <span className="muted">None</span> : <>
            {p.activeContracts} active{p.contracts > p.activeContracts ? ` of ${p.contracts}` : ''}
            {p.renewalAttention > 0 && <div><Badge tone="warn">{p.renewalAttention} need renewal attention</Badge></div>}
          </> },
          { key: 'dates', header: 'Service dates', render: p => p.serviceStart ? `${fmtDate(p.serviceStart)} – ${p.serviceEnd ? fmtDate(p.serviceEnd) : 'open'}` : <Unknown /> },
          { key: 'owner', header: 'Owner', render: p => <Person u={p.owner} /> }, { key: 'del', header: '', className: 'row-actions', render: p => <DeleteAction path={`/projects/${p.id}`} what={`project ${p.code}`} /> }
        ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
      {adding && <ProjectDialog clientId={toNum(f.clientId) ?? undefined} onClose={() => setAdding(false)} />}
    </>
  );
}

export function ProjectDialog({ clientId: fixedClient, projectId, onClose }: { clientId?: number; projectId?: number; onClose: () => void }) {
  const statuses = useEnum('ProjectStatus').filter(s => s !== 'Archived');
  const products = useProductOptions();
  const clients = useClientOptions();
  const [pickedClient, setPickedClient] = useState('');
  const clientId = fixedClient ?? toNum(pickedClient) ?? undefined;
  const existing = useQuery({ queryKey: ['project', projectId], queryFn: () => get<{ code: string; name: string; status: string; scopeSummary?: string; serviceStart?: string; serviceEnd?: string; owner?: UserRef; productIds: number[]; version: string }>(`/projects/${projectId}`), enabled: !!projectId });
  const f = useForm({ code: '', name: '', status: 'Planned', ownerUserId: null as number | null, scopeSummary: '', serviceStart: '', serviceEnd: '', productIds: [] as number[] });
  useEffect(() => { const p = existing.data; if (p) f.reset({ code: p.code, name: p.name, status: p.status, ownerUserId: p.owner?.id ?? null, scopeSummary: p.scopeSummary ?? '', serviceStart: p.serviceStart ?? '', serviceEnd: p.serviceEnd ?? '', productIds: p.productIds }); }, [existing.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const body = { ...f.values, clientId, serviceStart: f.values.serviceStart || null, serviceEnd: f.values.serviceEnd || null };
    const ok = await f.submit(() => projectId ? put(`/projects/${projectId}`, body, existing.data?.version).then(() => true) : post('/projects', body).then(() => true));
    if (ok) { toast('Project saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={projectId ? 'Edit project' : 'Add project'} onClose={onClose}>
      <FormError error={f.error} />
      <div className="form-grid">
        {fixedClient === undefined && <SelectInput label="Client" required value={pickedClient} onChange={setPickedClient} options={clients} error={f.fieldError('clientId')} />}
        <TextInput label="Project code" required value={f.values.code} onChange={v => f.set('code', v.toUpperCase())} error={f.fieldError('code')} />
        <TextInput label="Name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} />
        <SelectInput label="Status" required value={f.values.status} onChange={v => f.set('status', v)} options={enumOptions(statuses)} empty={null} />
        <UserPicker label="Project owner" required value={f.values.ownerUserId} onChange={v => f.set('ownerUserId', v)} clientId={clientId} error={f.fieldError('ownerUserId')} empty="— Select —" />
        <TextInput label="Service start" type="date" value={f.values.serviceStart} onChange={v => f.set('serviceStart', v)} />
        <TextInput label="Service end" type="date" value={f.values.serviceEnd} onChange={v => f.set('serviceEnd', v)} error={f.fieldError('serviceEnd')} />
        <TextInput label="Scope summary" wide multiline value={f.values.scopeSummary} onChange={v => f.set('scopeSummary', v)} error={f.fieldError('scopeSummary')} />
        <fieldset className="wide" style={{ border: 0, padding: 0 }}><legend className="flabel">Supported products</legend>
          {products.map(p => <label key={p.value} className="check" style={{ marginRight: 14 }}><input type="checkbox" checked={f.values.productIds.includes(Number(p.value))}
            onChange={e => f.set('productIds', e.target.checked ? [...f.values.productIds, Number(p.value)] : f.values.productIds.filter(x => x !== Number(p.value)))} /> {p.label}</label>)}
        </fieldset>
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save</button></div>
    </Dialog>
  );
}

function ContactDialog({ clientId, onClose }: { clientId: number; onClose: () => void }) {
  const f = useForm({ name: '', role: '', organization: '', email: '', phone: '', authorizedSupport: false, responsibility: '' });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => { const ok = await f.submit(v => post(`/clients/${clientId}/contacts`, v).then(() => true)); if (ok) { toast('Contact added.'); refresh(); onClose(); } };
  return (
    <Dialog title="Add contact" onClose={onClose}>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} />
        <TextInput label="Role" value={f.values.role} onChange={v => f.set('role', v)} />
        <TextInput label="Organization" value={f.values.organization} onChange={v => f.set('organization', v)} />
        <TextInput label="Email" type="email" value={f.values.email} onChange={v => f.set('email', v)} error={f.fieldError('email')} hint="At least one usable email or phone." />
        <TextInput label="Phone" value={f.values.phone} onChange={v => f.set('phone', v)} error={f.fieldError('phone')} />
        <Checkbox label="Authorized to raise support requests" checked={f.values.authorizedSupport} onChange={v => f.set('authorizedSupport', v)} />
        <TextInput label="Responsibility" wide value={f.values.responsibility} onChange={v => f.set('responsibility', v)} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save</button></div>
    </Dialog>
  );
}

export type BoundaryRow = { id: number; area: string; party: string; organization?: string; environmentId?: number; coordinator?: string; coordinatorUserId?: number;
  responsibleUser?: string; responsibleUserId?: number; person?: { name: string; title?: string; organization?: string; phone?: string; mobile?: string; email?: string }; notes?: string; version?: string };

/** A36 (owner request, 20 Oct 2026): the responsible person of a boundary — a team member, or anyone named with contact details. */
export function BoundaryPerson({ b }: { b: Pick<BoundaryRow, 'responsibleUser' | 'person'> }) {
  if (b.person) return <ContactCard c={b.person} />;
  if (b.responsibleUser) return <span>{b.responsibleUser} <span className="hint">(team member)</span></span>;
  return <span className="muted">Not named</span>;
}

function BoundaryDialog({ clientId, boundary, onClose }: { clientId: number; boundary?: BoundaryRow; onClose: () => void }) {
  const areas = useLookup('BoundaryArea');
  const parties = useEnum('ResponsibleParty');
  const envs = useQuery({ queryKey: ['envs-of', clientId], queryFn: () => get<Paged<{ id: number; name: string; regionCode?: string }>>(`/environments?clientId=${clientId}&pageSize=200`) });
  const b = boundary;
  const f = useForm({
    area: b?.area ?? '', party: b?.party ?? 'TIO', organization: b?.organization ?? '', environmentId: b?.environmentId ? String(b.environmentId) : '', coordinatorUserId: b?.coordinatorUserId ?? null as number | null, notes: b?.notes ?? '',
    personKind: (b?.responsibleUserId ? 'member' : 'person') as 'member' | 'person', responsibleUserId: b?.responsibleUserId ?? null as number | null, person: contactFrom(b?.person)
  });
  const v = f.values;
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const body = {
      area: v.area, party: v.party, organization: v.organization || null, environmentId: toNum(v.environmentId), coordinatorUserId: v.coordinatorUserId, notes: v.notes || null,
      responsibleUserId: v.personKind === 'member' ? v.responsibleUserId : null,
      person: v.personKind === 'person' ? contactOut({ ...v.person, organization: v.organization }) : null
    };
    const ok = await f.submit(async () => { if (b) await put(`/boundaries/${b.id}`, body, b.version); else await post(`/clients/${clientId}/boundaries`, body); return true; });
    if (ok) { toast(b ? 'Boundary updated.' : 'Boundary added.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={b ? 'Edit responsibility boundary' : 'Add responsibility boundary'} onClose={onClose} wide>
      <FormError error={f.error} />
      <div className="form-grid">
        <SelectInput label="Area" required value={v.area} onChange={x => f.set('area', x)} options={areas.map(a => ({ value: a.code, label: a.label }))} error={f.fieldError('area')} />
        <SelectInput label="Environment (optional)" value={v.environmentId} onChange={x => f.set('environmentId', x)} options={(envs.data?.items ?? []).map(e => ({ value: String(e.id), label: `${e.regionCode ? e.regionCode + ' / ' : ''}${e.name}` }))} empty="Whole client" />
        <SelectInput label="Responsible party" required value={v.party} onChange={x => f.set('party', x)} options={enumOptions(parties)} empty={null} />
        <TextInput label="Organization" value={v.organization} onChange={x => f.set('organization', x)} error={f.fieldError('organization')} placeholder="e.g. Customer IT – Network team" />
      </div>
      <FormSection title="Responsible person">
        <div className="field wide">
          <div className="radio-row" role="radiogroup" aria-label="Responsible person">
            <label className="check"><input type="radio" name="person-kind" checked={v.personKind === 'person'} onChange={() => f.set('personKind', 'person')} /> Any person (type name and contact details)</label>
            <label className="check"><input type="radio" name="person-kind" checked={v.personKind === 'member'} onChange={() => f.set('personKind', 'member')} /> A hub user</label>
          </div>
        </div>
        {v.personKind === 'person'
          ? <ContactFields value={v.person} onChange={c => f.set('person', c)} prefix="person" fieldError={f.fieldError} nameLabel="Full name" noOrganization />
          : <UserPicker label="Hub user" value={v.responsibleUserId} onChange={x => f.set('responsibleUserId', x)} clientId={clientId} error={f.fieldError('responsibleUserId')} empty="— Select —" />}
      </FormSection>
      <div className="form-grid">
        <UserPicker label="Internal coordinator" required={v.party !== 'TIO'} value={v.coordinatorUserId} onChange={x => f.set('coordinatorUserId', x)} clientId={clientId} error={f.fieldError('coordinatorUserId')} empty="None" hint="Required when responsibility is external or unknown." />
        <TextInput label="Notes" wide multiline value={v.notes} onChange={x => f.set('notes', x)} error={f.fieldError('notes')} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save</button></div>
    </Dialog>
  );
}

export function useTeamsOpts() { return useTeamOptions(); }
export { exportCsv };
