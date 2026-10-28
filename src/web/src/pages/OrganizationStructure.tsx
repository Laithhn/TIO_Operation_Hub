import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, del, get, post, put, qs, type Paged } from '../api';
import { useDebounced, useForm, useLookup, useMe, useRefresh } from '../hooks';
import { Checkbox, DataTable, Dialog, FormError, Panel, QueryState, SelectInput, TextInput, useToast } from '../ui/kit';
import './OrganizationStructure.css';
import { ClientLogo } from '../ui/ClientLogo';

export type Organization = {
  id: number; name: string; code?: string; clientId?: number; description?: string; organizationType?: string;
  email?: string; phone?: string; address?: string; status?: string; version: string; canEdit?: boolean; isArchived?: boolean;
};
type Relationship = {
  id: number; parentOrganizationId: number; childOrganizationId: number; relationshipType?: string; description?: string;
  startDate?: string; endDate?: string; sortOrder: number; isActive: boolean; version: string;
};
type Structure = {
  rootOrganizationId: number; organizations: Organization[]; relationships: Relationship[];
  truncated: boolean; canEdit: boolean; canCreateOrganization: boolean;
};
type OrganizationInput = { name: string; code?: string; description?: string; organizationType?: string; email?: string; phone?: string; address?: string; status?: string };
export type InitialOrganizationRelationship = { childOrganizationId?: number; newOrganization?: Pick<OrganizationInput, 'name' | 'code' | 'description'>; relationshipType?: string; description?: string };
export type InitialRelationshipDraft = InitialOrganizationRelationship & { label: string };
type ProjectOption = { id: number; code: string; name: string };
const display = (o: Organization) => `${o.code ? `${o.code} · ` : ''}${o.name}${o.isArchived ? ' (archived client)' : ''}`;

/** Only a UI hint: the API rechecks these resource permissions and scope on every mutation. */
function useStructurePermissions() {
  const me = useMe().data as (ReturnType<typeof useMe>['data'] & { permissions?: string[] });
  return {
    canCreate: !!me?.permissions?.includes('ClientStructure:Create'),
    canCoordinate: !!me?.permissions?.includes('ClientStructure:Coordinate')
  };
}

function RelationshipRole({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const roles = useLookup('OrganizationRelationshipType', value);
  const options = roles.map(r => ({ value: r.code, label: r.label }));
  if (value && !options.some(r => r.value === value)) options.push({ value, label: `${value} (retired)` });
  return <SelectInput label="Relationship type" value={value} onChange={onChange} options={options} empty="Not specified" error={error}
    hint="Optional business role in this context. Roles do not depend on hierarchy depth." />;
}

function OrganizationPicker({ value, onChange, excludeId, error, parent = false }: { value?: Organization; onChange: (o: Organization) => void; excludeId?: number; error?: string; parent?: boolean }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const result = useQuery({ queryKey: ['organization-search', q, page], queryFn: () => get<Paged<Organization>>(`/organizations${qs({ q, page, pageSize: 30 })}`) });
  const options = (result.data?.items ?? []).filter(o => o.id !== excludeId);
  if (value && !options.some(o => o.id === value.id)) options.unshift(value);
  return <div className="wide org-picker">
    <TextInput label={parent ? 'Search parent organizations' : 'Search organizations'} value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Name or alias" />
    <SelectInput label={parent ? 'Parent organization' : 'Related organization'} value={value?.id ?? ''} required onChange={v => { const selected = options.find(o => String(o.id) === v); if (selected) onChange(selected); }}
      options={options.map(o => ({ value: String(o.id), label: display(o) }))} error={error} />
    {result.isLoading && <p className="hint" role="status">Searching organizations…</p>}
    {result.isError && <p className="err" role="alert">Organizations could not be loaded. <button className="linkbtn" onClick={() => result.refetch()}>Retry</button></p>}
    {result.data && <div className="org-search-pages"><span className="hint">{result.data.totalCount} matching organization(s)</span>
      <button className="btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous organizations</button>
      <button className="btn" disabled={page * 30 >= result.data.totalCount} onClick={() => setPage(p => p + 1)}>More organizations</button></div>}
  </div>;
}

/** Drafts stay entirely in the client form until its atomic save. Cancel never creates an organization or an edge. */
export function InitialOrganizationStructure({ drafts, onChange, error }: { drafts: InitialRelationshipDraft[]; onChange: (v: InitialRelationshipDraft[]) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const permissions = useStructurePermissions();
  const roles = useLookup('OrganizationRelationshipType');
  return <details className="org-optional" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Organizational Structure <span className="muted">(optional{drafts.length ? ` · ${drafts.length} relationship(s)` : ''})</span></summary>
    <p className="hint">A client can stand alone. Add direct relationships now or build any number of levels after saving. This structure is separate from operational sub-clients.</p>
    {error && <p className="err" role="alert">{error}</p>}
    {drafts.length > 0 && <ul className="org-drafts">{drafts.map((d, i) => <li key={i}><span>{d.label}{d.relationshipType && <> · {roles.find(r => r.code === d.relationshipType)?.label ?? d.relationshipType}</>}{d.newOrganization && <span className="muted"> (new organization)</span>}</span>
      <button className="linkbtn" onClick={() => onChange(drafts.filter((_, n) => n !== i))} aria-label={`Remove relationship to ${d.label}`}>Remove</button></li>)}</ul>}
    {permissions.canCoordinate ? <button className="btn" onClick={() => setAdding(true)}>+ Add Organization Relationship</button> : <p className="hint">Adding relationships requires permission to coordinate client organizational structures.</p>}
    {adding && <InitialRelationshipDialog canCreate={permissions.canCreate} onClose={() => setAdding(false)} onAdd={d => { onChange([...drafts, d]); setAdding(false); }} />}
  </details>;
}

function InitialRelationshipDialog({ canCreate, onClose, onAdd }: { canCreate: boolean; onClose: () => void; onAdd: (d: InitialRelationshipDraft) => void }) {
  const [mode, setMode] = useState('existing');
  const [selected, setSelected] = useState<Organization>();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const add = () => {
    if (mode === 'existing' && !selected) { setError('Select an existing organization.'); return; }
    if (mode === 'new' && !name.trim()) { setError('Enter the organization name.'); return; }
    onAdd({ ...(mode === 'existing' ? { childOrganizationId: selected!.id } : { newOrganization: { name: name.trim(), code: code.trim() || undefined } }),
      relationshipType: role || undefined, description: description.trim() || undefined, label: mode === 'existing' ? display(selected!) : name.trim() });
  };
  return <Dialog title="Add organization relationship" onClose={onClose}>
    <div className="form-grid">
      <SelectInput label="Related organization source" value={mode} onChange={setMode} options={[{ value: 'existing', label: 'Select existing organization' }, ...(canCreate ? [{ value: 'new', label: 'Create new organization' }] : [])]} empty={null} />
      {mode === 'existing' ? <OrganizationPicker value={selected} onChange={setSelected} error={error} /> : <>
        <TextInput label="Organization name" required value={name} onChange={setName} error={error} maxLength={150} />
        <TextInput label="Organization alias" value={code} onChange={setCode} maxLength={50} hint="Optional. This organization can be reused in other hierarchies." />
      </>}
      <RelationshipRole value={role} onChange={setRole} />
      <TextInput label="Relationship description" value={description} onChange={setDescription} multiline wide maxLength={2000} />
    </div>
    <p className="hint">This relationship is saved together with the client. Cancel keeps the rest of your client form.</p>
    <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={add}>Add relationship</button></div>
  </Dialog>;
}

export function OrganizationStructure({ clientId, projects }: { clientId: number; projects?: ProjectOption[] }) {
  const [projectId, setProjectId] = useState('');
  const [view, setView] = useState('diagram');
  const [collapsed, setCollapsed] = useState(new Set<number>());
  const [editor, setEditor] = useState<{ parentId?: number; relationship?: Relationship }>();
  const [unlink, setUnlink] = useState<Relationship>();
  const [catalog, setCatalog] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization>();
  const projectQuery = useQuery({ queryKey: ['organization-projects', clientId], queryFn: () => get<Paged<ProjectOption>>(`/projects${qs({ clientId, pageSize: 200 })}`), enabled: projects === undefined });
  const projectOptions = projects ?? projectQuery.data?.items ?? [];
  const graph = useQuery({ queryKey: ['organization-structure', clientId, projectId], queryFn: () => get<Structure>(`/clients/${clientId}/organizational-structure${qs({ projectId })}`) });
  const data = graph.data;
  const roles = useLookup('OrganizationRelationshipType');
  const role = (r: Relationship) => roles.find(t => t.code === r.relationshipType)?.label ?? r.relationshipType ?? 'Relationship';
  const organizations = useMemo(() => new Map(data?.organizations.map(o => [o.id, o])), [data?.organizations]);
  const children = useMemo(() => {
    const map = new Map<number, Relationship[]>();
    for (const r of data?.relationships ?? []) map.set(r.parentOrganizationId, [...(map.get(r.parentOrganizationId) ?? []), r]);
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    return map;
  }, [data?.relationships]);
  const parents = useMemo(() => {
    const map = new Map<number, Relationship[]>();
    for (const r of data?.relationships ?? []) map.set(r.childOrganizationId, [...(map.get(r.childOrganizationId) ?? []), r]);
    return map;
  }, [data?.relationships]);
  const rows = useMemo(() => {
    if (!data) return [];
    type TreeRow = { id: number; depth: number; incoming?: Relationship; shared: boolean; key: string };
    const result: TreeRow[] = [];
    const visited = new Set<number>();
    const roots = [data.rootOrganizationId, ...data.organizations.filter(o => o.id !== data.rootOrganizationId && !parents.has(o.id)).map(o => o.id)];
    for (const root of roots) {
      if (visited.has(root)) continue;
      const stack: Omit<TreeRow, 'shared'>[] = [{ id: root, depth: 0, key: `root-${root}` }];
      while (stack.length) {
        const row = stack.pop()!;
        if (!organizations.has(row.id)) continue;
        const shared = visited.has(row.id);
        result.push({ ...row, shared });
        if (shared) continue; // Every edge remains visible; expand a shared organization once to avoid exponential rendering.
        visited.add(row.id);
        if (!collapsed.has(row.id)) {
          const edges = children.get(row.id) ?? [];
          for (let i = edges.length - 1; i >= 0; i--) stack.push({ id: edges[i].childOrganizationId, depth: row.depth + 1, incoming: edges[i], key: `edge-${edges[i].id}` });
        }
      }
    }
    return result;
  }, [data, children, parents, organizations, collapsed]);
  const changeContext = (v: string) => { setProjectId(v); setCollapsed(new Set()); setEditor(undefined); setUnlink(undefined); };
  const toggle = (id: number) => setCollapsed(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const editOrganization = (o: Organization) => o.clientId ? <Link to={`/clients/${o.clientId}/edit`}>Edit client details</Link>
    : (o.canEdit ?? data?.canEdit) ? <button className="linkbtn" onClick={() => setEditingOrganization(o)}>Edit organization</button> : null;
  return <Panel title="Organizational Structure" actions={data && <>
    <button className="btn" onClick={() => setCatalog(true)}>Organization directory</button>
    {data.canEdit && <button className="btn btn-primary" onClick={() => setEditor({ parentId: data.rootOrganizationId })}>+ Add Organization Relationship</button>}
  </>}>
    <p className="hint">Organizations are independent records. Relationships and roles belong only to the selected context; unlinking preserves the organization. Operational sub-clients remain separate.</p>
    <div className="org-controls">
      <SelectInput label="Organization context" value={projectId} onChange={changeContext} options={projectOptions.map(p => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))} empty="Client-wide structure (no project)" />
      <SelectInput label="Organization view" value={view} onChange={setView} empty={null} options={[{ value: 'diagram', label: 'Hierarchy diagram' }, { value: 'table', label: 'Organizations and relationships table' }]} />
    </div>
    <QueryState q={graph}>{data && <>
      {!data.canEdit && <p className="notice">Read-only organizational structure.</p>}
      {data.truncated && <div className="notice warn" role="status">This is a partial structure because the diagram size limit was reached. Use the organization directory and its paged parents / children view to browse every relationship in this context.</div>}
      <p className="hint" role="status">{data.organizations.length} organization(s) · {data.relationships.length} relationship(s)</p>
      {data.relationships.length === 0 && <p className="notice">No organizational relationships. This client is valid on its own.</p>}
      {view === 'diagram' ? <>
        <div className="org-diagram-controls"><button className="btn" onClick={() => setCollapsed(new Set())}>Expand all</button>
          <button className="btn" onClick={() => setCollapsed(new Set(data.organizations.map(o => o.id)))}>Collapse all</button></div>
        <div className="org-diagram" aria-label="Organization hierarchy diagram">
          <ol className="org-tree">{rows.map(row => {
            const o = organizations.get(row.id)!;
            const multipleParents = (parents.get(o.id)?.length ?? 0) > 1;
            return <li key={row.key} className="org-tree-row" style={{ marginInlineStart: Math.min(row.depth, 12) * 24 }}>
              <div className="org-node">
                <div className="org-node-name">{!row.shared && (children.get(o.id)?.length ?? 0) > 0 && <button className="org-toggle" aria-label={`${collapsed.has(o.id) ? 'Expand' : 'Collapse'} ${o.name}`} aria-expanded={!collapsed.has(o.id)} onClick={() => toggle(o.id)}>{collapsed.has(o.id) ? '+' : '−'}</button>}
                  <span>{o.clientId ? <><ClientLogo clientId={o.clientId} code={o.code} name={o.name} size="xs" decorative /> <Link to={`/clients/${o.clientId}`}>{display(o)}</Link></> : display(o)}</span>
                </div>
                {row.incoming && <div className="hint">↳ {role(row.incoming)} · from {organizations.get(row.incoming.parentOrganizationId)?.name ?? `#${row.incoming.parentOrganizationId}`}{!row.incoming.isActive && ' · inactive'}{row.incoming.description && ` · ${row.incoming.description}`}</div>}
                {row.depth > 12 && <span className="hint">Level {row.depth + 1} · </span>}
                {multipleParents && <span className="org-shared">Shared organization · {parents.get(o.id)!.length} parents</span>}
                {row.shared && <span className="hint"> Children shown at its first occurrence. Same organization record.</span>}
                {data.canEdit && <div className="org-node-actions"><button className="linkbtn" onClick={() => setEditor({ parentId: o.id })}>Add child</button>{editOrganization(o)}
                  {row.incoming && <><button className="linkbtn" onClick={() => setEditor({ relationship: row.incoming })}>Edit relationship / move</button><button className="linkbtn" onClick={() => setUnlink(row.incoming)}>Unlink</button></>}</div>}
              </div>
            </li>;
          })}</ol>
        </div>
      </> : <>
        <DataTable caption="Organizations in this context" rowKey={o => o.id} rows={data.organizations} columns={[
          { key: 'name', header: 'Organization', render: o => <>{o.clientId ? <><ClientLogo clientId={o.clientId} code={o.code} name={o.name} size="xs" decorative /> <Link to={`/clients/${o.clientId}`}>{display(o)}</Link></> : display(o)}<div className="hint">{o.description}</div></> },
          { key: 'parents', header: 'Direct parents', render: o => (parents.get(o.id) ?? []).map(r => <div key={r.id}>{organizations.get(r.parentOrganizationId)?.name ?? `#${r.parentOrganizationId}`} · {role(r)}{!r.isActive && ' (inactive)'}</div>) },
          { key: 'children', header: 'Direct children', render: o => (children.get(o.id) ?? []).map(r => <div key={r.id}>{organizations.get(r.childOrganizationId)?.name ?? `#${r.childOrganizationId}`} · {role(r)}{!r.isActive && ' (inactive)'}</div>) },
          { key: 'actions', header: 'Actions', render: o => data.canEdit && <div className="org-node-actions"><button className="linkbtn" onClick={() => setEditor({ parentId: o.id })}>Add child</button>{editOrganization(o)}</div> }
        ]} />
        <DataTable caption="Organization relationships" rowKey={r => r.id} rows={data.relationships} columns={[
          { key: 'parent', header: 'Parent', render: r => organizations.get(r.parentOrganizationId)?.name ?? `#${r.parentOrganizationId}` },
          { key: 'child', header: 'Child', render: r => organizations.get(r.childOrganizationId)?.name ?? `#${r.childOrganizationId}` },
          { key: 'role', header: 'Relationship type', render: role }, { key: 'description', header: 'Description', render: r => r.description },
          { key: 'state', header: 'Active', render: r => r.isActive ? 'Yes' : 'No' },
          { key: 'dates', header: 'Dates', render: r => r.startDate || r.endDate ? `${r.startDate?.slice(0, 10) ?? 'Not set'} – ${r.endDate?.slice(0, 10) ?? 'Open'}` : 'Not set' },
          { key: 'actions', header: 'Actions', render: r => data.canEdit && <div className="org-node-actions"><button className="linkbtn" onClick={() => setEditor({ relationship: r })}>Edit relationship / move</button><button className="linkbtn" onClick={() => setUnlink(r)}>Unlink</button></div> }
        ]} />
      </>}
      {editor && <RelationshipDialog clientId={clientId} projectId={projectId} organizations={data.organizations} parentId={editor.parentId} relationship={editor.relationship} canCreate={data.canCreateOrganization} onClose={() => setEditor(undefined)} />}
      {unlink && <UnlinkDialog clientId={clientId} projectId={projectId} relationship={unlink} childName={organizations.get(unlink.childOrganizationId)?.name ?? 'organization'} onClose={() => setUnlink(undefined)} />}
      {catalog && <OrganizationDirectory clientId={clientId} projectId={projectId} canCreate={data.canCreateOrganization} canEdit={data.canEdit} onClose={() => setCatalog(false)} />}
      {editingOrganization && <OrganizationDialog organization={editingOrganization} onClose={() => setEditingOrganization(undefined)} />}
    </>}</QueryState>
  </Panel>;
}

function RelationshipDialog({ clientId, projectId, organizations, parentId, relationship, canCreate, onClose }: {
  clientId: number; projectId: string; organizations: Organization[]; parentId?: number; relationship?: Relationship; canCreate: boolean; onClose: () => void;
}) {
  const f = useForm({ parentOrganizationId: String(relationship?.parentOrganizationId ?? parentId ?? ''), childOrganizationId: relationship?.childOrganizationId ?? null as number | null,
    relationshipType: relationship?.relationshipType ?? '', description: relationship?.description ?? '', startDate: relationship?.startDate?.slice(0, 10) ?? '',
    endDate: relationship?.endDate?.slice(0, 10) ?? '', sortOrder: String(relationship?.sortOrder ?? 0), isActive: relationship?.isActive ?? true });
  const [selected, setSelected] = useState(organizations.find(o => o.id === relationship?.childOrganizationId));
  const [selectedParent, setSelectedParent] = useState(organizations.find(o => o.id === (relationship?.parentOrganizationId ?? parentId)));
  const [creating, setCreating] = useState(false);
  const refresh = useRefresh();
  const toast = useToast();
  const save = async () => {
    const ok = await f.submit(async v => {
      if (!v.childOrganizationId) throw new ApiError(400, { title: 'Select an organization.', errors: { childOrganizationId: ['Select an existing organization or create one.'] } });
      const body = { ...v, parentOrganizationId: Number(v.parentOrganizationId), startDate: v.startDate || null, endDate: v.endDate || null,
        sortOrder: v.sortOrder.trim() ? Number(v.sortOrder) : null, relationshipType: v.relationshipType || null, description: v.description.trim() || null };
      const path = `/clients/${clientId}/organization-relationships${relationship ? `/${relationship.id}` : ''}${qs({ projectId })}`;
      if (relationship) await put(path, body, relationship.version); else await post(path, body);
      return true;
    });
    if (ok) { await refresh(); toast(relationship ? 'Relationship saved.' : 'Organization linked.'); onClose(); }
  };
  if (creating) return <OrganizationDialog onClose={() => setCreating(false)} onCreated={o => { setSelected(o); f.set('childOrganizationId', o.id); setCreating(false); }} />;
  return <Dialog title={relationship ? 'Edit organization relationship' : 'Add organization relationship'} onClose={onClose} wide>
    <FormError error={f.error} />
    {f.error?.isConflict && <p className="notice warn">This relationship changed. Close and reopen the editor to load its latest version. Your entries are kept here for reference.</p>}
    <div className="form-grid">
      <p className="hint wide">Changing the parent moves this relationship within the current context. Other parent relationships stay intact.</p>
      <OrganizationPicker parent value={selectedParent} onChange={o => { setSelectedParent(o); f.set('parentOrganizationId', String(o.id)); }} excludeId={selected?.id} error={f.fieldError('parentOrganizationId')} />
      <OrganizationPicker value={selected} onChange={o => { setSelected(o); f.set('childOrganizationId', o.id); }} excludeId={Number(f.values.parentOrganizationId)} error={f.fieldError('childOrganizationId')} />
      {canCreate && <div className="wide"><button className="btn" onClick={() => setCreating(true)}>+ Create new organization</button><span className="hint"> Creates an independent organization to select here.</span></div>}
      <RelationshipRole value={f.values.relationshipType} onChange={v => f.set('relationshipType', v)} error={f.fieldError('relationshipType')} />
      <TextInput label="Relationship description" value={f.values.description} onChange={v => f.set('description', v)} multiline wide maxLength={2000} error={f.fieldError('description')} />
      <TextInput label="Start date" type="date" value={f.values.startDate} onChange={v => f.set('startDate', v)} error={f.fieldError('startDate')} />
      <TextInput label="End date" type="date" value={f.values.endDate} onChange={v => f.set('endDate', v)} error={f.fieldError('endDate')} />
      <TextInput label="Sort order" type="number" value={f.values.sortOrder} onChange={v => f.set('sortOrder', v)} error={f.fieldError('sortOrder')} />
      <Checkbox label="Active relationship" checked={f.values.isActive} onChange={v => f.set('isActive', v)} />
    </div>
    <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{f.busy ? 'Saving…' : relationship ? 'Save relationship' : 'Add relationship'}</button></div>
  </Dialog>;
}

function UnlinkDialog({ clientId, projectId, relationship, childName, onClose }: { clientId: number; projectId: string; relationship: Relationship; childName: string; onClose: () => void }) {
  const f = useForm({});
  const [confirmed, setConfirmed] = useState(false);
  const refresh = useRefresh();
  const toast = useToast();
  const save = async () => {
    const ok = await f.submit(async () => { await del(`/clients/${clientId}/organization-relationships/${relationship.id}${qs({ projectId })}`, relationship.version); return true; });
    if (ok) { await refresh(); toast('Relationship removed. The organization was preserved.'); onClose(); }
  };
  return <Dialog title="Unlink organization" onClose={onClose}>
    <p>Remove the selected relationship to <strong>{childName}</strong>? The organization, its other relationships, and its children are preserved.</p>
    <FormError error={f.error} />
    <Checkbox label="I confirm this action." checked={confirmed} onChange={setConfirmed} />
    <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-danger" disabled={!confirmed || f.busy} onClick={save}>{f.busy ? 'Unlinking…' : 'Unlink organization'}</button></div>
  </Dialog>;
}

function OrganizationDialog({ organization, onClose, onCreated }: { organization?: Organization; onClose: () => void; onCreated?: (o: Organization) => void }) {
  const f = useForm({ name: organization?.name ?? '', code: organization?.code ?? '', description: organization?.description ?? '', organizationType: organization?.organizationType ?? '',
    email: organization?.email ?? '', phone: organization?.phone ?? '', address: organization?.address ?? '', status: organization?.status ?? '' });
  const refresh = useRefresh();
  const toast = useToast();
  const save = async () => {
    const saved = await f.submit(async v => {
      const body = Object.fromEntries(Object.entries(v).map(([key, value]) => [key, value.trim() || null]));
      if (organization) { await put(`/organizations/${organization.id}`, body, organization.version); return { id: organization.id }; }
      return post<{ id: number }>('/organizations', body);
    });
    if (saved) { await refresh(); toast(organization ? 'Organization saved.' : 'Organization created.'); onCreated?.({ ...f.values, id: saved.id, version: '' }); onClose(); }
  };
  return <Dialog title={organization ? 'Edit organization' : 'Create organization'} onClose={onClose}>
    <p className="hint">Only the name is required. No parent, child, role, or client relationship is required.</p>
    <FormError error={f.error} />
    <div className="form-grid">
      <TextInput label="Organization name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} maxLength={150} />
      <TextInput label="Organization alias" value={f.values.code} onChange={v => f.set('code', v)} error={f.fieldError('code')} maxLength={50} />
      <TextInput label="Organization type" value={f.values.organizationType} onChange={v => f.set('organizationType', v)} error={f.fieldError('organizationType')} maxLength={100} />
      <TextInput label="Organization status" value={f.values.status} onChange={v => f.set('status', v)} error={f.fieldError('status')} maxLength={50} />
      <TextInput label="Organization email" type="email" value={f.values.email} onChange={v => f.set('email', v)} error={f.fieldError('email')} maxLength={254} />
      <TextInput label="Organization phone" type="tel" value={f.values.phone} onChange={v => f.set('phone', v)} error={f.fieldError('phone')} maxLength={50} />
      <TextInput label="Organization address" multiline wide value={f.values.address} onChange={v => f.set('address', v)} error={f.fieldError('address')} maxLength={1000} />
      <TextInput label="Organization description" multiline wide value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} maxLength={2000} />
    </div>
    <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{f.busy ? 'Saving…' : organization ? 'Save organization' : 'Create organization'}</button></div>
  </Dialog>;
}

function OrganizationDirectory({ clientId, projectId, canCreate, canEdit, onClose }: { clientId: number; projectId: string; canCreate: boolean; canEdit: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Organization | 'new'>();
  const [browsing, setBrowsing] = useState<Organization>();
  const q = useDebounced(search);
  const result = useQuery({ queryKey: ['organization-directory', q, page], queryFn: () => get<Paged<Organization>>(`/organizations${qs({ q, page, pageSize: 30 })}`) });
  if (editing) return <OrganizationDialog organization={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />;
  if (browsing) return <OrganizationConnections clientId={clientId} projectId={projectId} organization={browsing} canEdit={canEdit} canCreate={canCreate} onClose={() => setBrowsing(undefined)} />;
  return <Dialog title="Organization directory" onClose={onClose} wide>
    <p className="hint">Search reusable organizations, including independent organizations with no hierarchy. Client organization details are edited from the existing client form.</p>
    <div className="org-directory-toolbar"><TextInput label="Search directory" value={search} onChange={v => { setSearch(v); setPage(1); }} />{canCreate && <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Create independent organization</button>}</div>
    <DataTable caption="Organization directory" rowKey={o => o.id} rows={result.data?.items} loading={result.isLoading} error={result.error} columns={[
      { key: 'name', header: 'Organization', render: o => o.clientId ? <><ClientLogo clientId={o.clientId} code={o.code} name={o.name} size="xs" decorative /> <Link to={`/clients/${o.clientId}`}>{display(o)}</Link></> : display(o) },
      { key: 'type', header: 'Type', render: o => o.organizationType }, { key: 'status', header: 'Status', render: o => o.status },
      { key: 'edit', header: 'Actions', render: o => <div className="org-node-actions"><button className="linkbtn" onClick={() => setBrowsing(o)}>View parents / children</button>{o.clientId ? <Link to={`/clients/${o.clientId}`}>Client details</Link>
        : (o.canEdit ?? canEdit) && <button className="linkbtn" onClick={() => setEditing(o)}>Edit organization</button>}</div> }
    ]} />
    {result.data && <div className="org-search-pages"><span>{result.data.totalCount} organization(s)</span><button className="btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><button className="btn" disabled={page * 30 >= result.data.totalCount} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    <div className="form-actions"><button className="btn" onClick={onClose}>Close directory</button></div>
  </Dialog>;
}

/** Paged navigation remains usable when a complete graph is too large for the diagram. */
function OrganizationConnections({ clientId, projectId, organization, canEdit, canCreate, onClose }: { clientId: number; projectId: string; organization: Organization; canEdit: boolean; canCreate: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState(organization);
  const [direction, setDirection] = useState('children');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ relationship?: Relationship }>();
  const [unlink, setUnlink] = useState<Connection>();
  type Connection = { relationship: Relationship; parent: Organization; child: Organization };
  const result = useQuery({ queryKey: ['organization-connections', current.id, clientId, projectId, direction, page],
    queryFn: () => get<Paged<Connection>>(`/organizations/${current.id}/${direction}${qs({ clientId, projectId, page, pageSize: 50 })}`) });
  const roles = useLookup('OrganizationRelationshipType');
  const follow = (o: Organization) => { setCurrent(o); setPage(1); };
  if (editing) return <RelationshipDialog clientId={clientId} projectId={projectId} parentId={current.id} relationship={editing.relationship} organizations={[...new Map([current, ...(result.data?.items.flatMap(r => [r.parent, r.child]) ?? [])].map(o => [o.id, o])).values()]} canCreate={canCreate} onClose={() => setEditing(undefined)} />;
  if (unlink) return <UnlinkDialog clientId={clientId} projectId={projectId} relationship={unlink.relationship} childName={unlink.child.name} onClose={() => setUnlink(undefined)} />;
  return <Dialog title="Organization connections" onClose={onClose} wide>
    <h3>{display(current)}</h3><p className="hint">Only relationships in the selected client / project context are shown.</p>
    {canEdit && <button className="btn" onClick={() => setEditing({})}>+ Add child organization</button>}
    <SelectInput label="Relationship direction" value={direction} onChange={v => { setDirection(v); setPage(1); }} empty={null} options={[{ value: 'children', label: 'Direct children' }, { value: 'parents', label: 'Direct parents' }]} />
    <DataTable caption="Direct organization connections" rowKey={r => r.relationship.id} rows={result.data?.items} loading={result.isLoading} error={result.error} columns={[
      { key: 'parent', header: 'Parent', render: r => <button className="linkbtn" onClick={() => follow(r.parent)}>{display(r.parent)}</button> },
      { key: 'child', header: 'Child', render: r => <button className="linkbtn" onClick={() => follow(r.child)}>{display(r.child)}</button> },
      { key: 'role', header: 'Relationship type', render: r => roles.find(t => t.code === r.relationship.relationshipType)?.label ?? r.relationship.relationshipType },
      { key: 'state', header: 'Active', render: r => r.relationship.isActive ? 'Yes' : 'No' },
      { key: 'actions', header: 'Actions', render: r => canEdit && <div className="org-node-actions"><button className="linkbtn" onClick={() => setEditing({ relationship: r.relationship })}>Edit relationship / move</button><button className="linkbtn" onClick={() => setUnlink(r)}>Unlink</button></div> }
    ]} />
    {result.data && <div className="org-search-pages"><span>{result.data.totalCount} relationship(s)</span><button className="btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous connections</button><button className="btn" disabled={page * 50 >= result.data.totalCount} onClick={() => setPage(p => p + 1)}>More connections</button></div>}
    <div className="form-actions"><button className="btn" onClick={onClose}>Close connections</button></div>
  </Dialog>;
}
