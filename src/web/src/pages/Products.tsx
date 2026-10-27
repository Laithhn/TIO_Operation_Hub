import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { del, get, post, put } from '../api';
import { fmtDate, label } from '../format';
import { usePermission, useForm, useLeaveGuard, useLookup, useRefresh, useUrlState } from '../hooks';
import { Badge, Checkbox, ConfirmDelete, DataTable, Dialog, DL, Field, FormError, PageHead, Panel, QueryState, SelectInput, StateMessage, TextInput, Unknown, useToast, DeleteAction } from '../ui/kit';
import { AttachmentsPanel } from './Attachments';

// Products — the business also calls them applications: the software TIO delivers and supports.
// Every user reads the catalogue; Operation Engineers and the TIO Manager maintain it. Retiring keeps history.

type Row = {
  id: number; code: string; name: string; aliases?: string; description?: string; category?: string; technology?: string; isActive: boolean;
  developers: { name: string; role: string }[]; productOwner?: string; modules: { id: number; code: string; name: string; isActive: boolean }[]; featureCount: number; latestVersion?: string;
  environments: number; clients: number; microserviceCount: number;
};
type Module = { id: number; code: string; name: string; description?: string; isActive: boolean; version: string; features: number; installations: number };
type Microservice = { id: number; name: string; description?: string; moduleId?: number; module?: string; role?: string; isActive: boolean; version: string; installations: number; clients: number; servers: number; latestVersion?: string; versionCount: number };
type Developer = { name: string; role: string; email?: string };
type ProductVersionT = { id: number; version: string; releasedOn?: string; releaseNotes?: string; isActive: boolean; installations: number; rowVersion: string; features: { id: number; name: string }[] };
type Feature = { id: number; name: string; description?: string; moduleId?: number; module?: string; introducedInVersionId?: number; introducedIn?: string; isActive: boolean; version: string };
type Detail = {
  id: number; code: string; name: string; aliases?: string; description?: string; category?: string; technology?: string; isActive: boolean;
  developers: Developer[]; productOwner?: string; modules: Module[]; features: Feature[]; microservices: Microservice[];
  versions: ProductVersionT[];
  usage: { clientId: number; clientCode: string; clientName: string; installations: { id: number; instanceName: string; environmentId: number; environment: string; region?: string; module?: string; version?: string }[] }[];
  projects: { id: number; code: string; name: string; status: string; clientId: number; clientCode: string }[];
  contracts: { id: number; ref: string; title: string; status: string; clientId: number; clientCode: string }[];
  usageNote: string; permissions: { canEdit: boolean; canDelete: boolean }; etag: string;
};

export function ProductList() {
  const [f, set] = useUrlState({ q: '', retired: '' });
  const q = useQuery({ queryKey: ['products', f], queryFn: () => get<Row[]>(`/products?includeRetired=${f.retired === '1'}${f.q ? `&q=${encodeURIComponent(f.q)}` : ''}`) });
  const canEdit = usePermission('Products', 'Create');
  return (
    <>
      <PageHead title="Products" sub="The software products (applications) TIO delivers and supports: what each one is, its modules and features, its versions and where it is installed."
        actions={canEdit && <Link className="btn btn-primary" to="/products/new">+ New product</Link>} />
      <DataTable<Row> rowKey={p => p.id} rows={q.data} loading={q.isLoading} error={q.error} empty={f.q ? 'nomatch' : 'none'} caption="Products"
        columns={[
          { key: 'code', header: 'Product', priority: 'primary', render: p => <><Link to={`/products/${p.id}`}><b>{p.code}</b> · {p.name}</Link>{p.aliases && <div className="hint">Also known as: {p.aliases}</div>}</>,
            filter: <input className="input" aria-label="Search products" placeholder="Name, code, alias or category" value={f.q} onChange={e => set({ q: e.target.value })} /> },
          { key: 'cat', header: 'Category', render: p => p.category ?? <span className="muted">—</span> },
          { key: 'dev', header: 'Application developers', render: p => p.developers.length ? p.developers.map(d => d.role === 'Lead' ? `${d.name} (lead)` : d.name).join(', ') : <span className="muted">—</span> },
          { key: 'owner', header: 'Product owner', render: p => p.productOwner ?? <span className="muted">—</span> },
          { key: 'mod', header: 'Modules', className: 'num', render: p => p.modules.filter(m => m.isActive).length },
          { key: 'ms', header: 'Microservices', className: 'num', render: p => p.microserviceCount },
          { key: 'feat', header: 'Features', className: 'num', render: p => p.featureCount },
          { key: 'ver', header: 'Latest version', render: p => p.latestVersion ?? <span className="muted">—</span> },
          { key: 'use', header: 'Installed at', render: p => p.clients ? `${p.clients} client(s) · ${p.environments} environment(s)` : <span className="muted">Not installed</span> },
          { key: 'st', header: 'Status', priority: 'primary', render: p => p.isActive ? <Badge tone="good">Active</Badge> : <Badge>Retired</Badge>,
            filter: <label className="check"><input type="checkbox" checked={f.retired === '1'} onChange={e => set({ retired: e.target.checked ? '1' : '' })} /> Show retired</label> }, { key: 'del', header: '', className: 'row-actions', render: p => <DeleteAction path={`/products/${p.id}`} what={`product ${p.code}`} /> }
        ]} />
    </>
  );
}

export function ProductDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['product', id], queryFn: () => get<Detail>(`/products/${id}`) });
  const [dialog, setDialog] = useState<null | { kind: 'module'; item?: Module } | { kind: 'feature'; item?: Feature } | { kind: 'microservice'; item?: Microservice } | { kind: 'version'; item?: ProductVersionT } | { kind: 'notes'; item: ProductVersionT }>(null);
  // A56: modules, microservices, features and versions are deleted when nothing depends on them (the server says where they are used).
  const [removing, setRemoving] = useState<{ path: string; what: string } | null>(null);
  const p = q.data;
  const can = !!p?.permissions.canEdit;
  const canDelete = !!p?.permissions.canDelete;
  const [deleting, setDeleting] = useState(false);
  return (
    <QueryState q={q}>
      {p && (<>
        <PageHead title={`${p.code} · ${p.name}`} crumbs={[{ to: '/products', label: 'Products' }, { label: p.code }]}
          sub={<>{p.isActive ? <Badge tone="good">Active</Badge> : <Badge>Retired</Badge>} {p.category && <span className="muted">· {p.category}</span>}</>}
          actions={<>
            {can && <Link className="btn btn-primary" to={`/products/${p.id}/edit`}>Edit</Link>}
            {p.permissions.canDelete && <button className="btn btn-danger" onClick={() => setDeleting(true)}>Delete product</button>}
          </>} />
        {deleting && <DeleteProductDialog id={p.id} code={p.code} version={p.etag} onClose={() => setDeleting(false)} />}
        <div className="cols">
          <Panel title="About this product">
            {p.description ? <p style={{ whiteSpace: 'pre-wrap', marginTop: 0 }}>{p.description}</p> : <p className="muted" style={{ marginTop: 0 }}>No description yet.</p>}
            <DL items={[
              ['Also known as', p.aliases ?? <span className="muted">—</span>],
              ['Category', p.category ?? <Unknown />],
              ['Technology', p.technology ? <span style={{ whiteSpace: 'pre-wrap' }}>{p.technology}</span> : <Unknown />],
              ['Application developers', p.developers.length ? <ul className="plain">{p.developers.map(d => <li key={d.name}>{d.name} <span className="muted">· {d.role === 'Lead' ? 'Lead developer' : 'Developer'}{d.email ? ` · ${d.email}` : ''}</span></li>)}</ul> : <Unknown />],
              ['Product owner', p.productOwner ?? <Unknown />]
            ]} />
          </Panel>
          <Panel title="Where it is used">
            <p className="hint" style={{ marginTop: 0 }}>{p.usageNote}</p>
            <DL items={[
              ['Clients', p.usage.length], ['Installations', p.usage.reduce((n, c) => n + c.installations.length, 0)],
              ['Projects', p.projects.length], ['Contracts', p.contracts.length]
            ]} />
          </Panel>
        </div>
        <Panel title={`Modules (${p.modules.length})`} pad={false} actions={can && <button className="btn" onClick={() => setDialog({ kind: 'module' })}>+ Module</button>}>
          <DataTable<Module> rowKey={m => m.id} rows={p.modules} caption="Modules" columns={[
            { key: 'c', header: 'Module', render: m => <><b>{m.code}</b> · {m.name}</> },
            { key: 'd', header: 'Description', render: m => m.description ?? <span className="muted">—</span> },
            { key: 'f', header: 'Features', className: 'num', render: m => m.features },
            { key: 'i', header: 'Installations', className: 'num', render: m => m.installations },
            { key: 's', header: 'Status', render: m => m.isActive ? <Badge tone="good">Active</Badge> : <Badge>Retired</Badge> },
            { key: 'e', header: '', className: 'nowrap', render: m => <RowActions name={`module ${m.code}`} onEdit={can ? () => setDialog({ kind: 'module', item: m }) : undefined}
              onDelete={canDelete ? () => setRemoving({ path: `/products/modules/${m.id}`, what: `Module ${m.code}` }) : undefined} /> }
          ]} />
        </Panel>
        <Panel title={`Microservices (${p.microservices.length})`} pad={false} actions={can && <button className="btn" onClick={() => setDialog({ kind: 'microservice' })}>+ Microservice</button>}>
          <p className="hint" style={{ padding: '8px 12px 0', margin: 0 }}>The deployable services this product is built from. Each installation records which microservice runs on which server.</p>
          <DataTable<Microservice> rowKey={x => x.id} rows={p.microservices} caption="Microservices" columns={[
            { key: 'n', header: 'Microservice', render: x => <Link to={`/microservices/${x.id}`}><b className="mono">{x.name}</b></Link> },
            { key: 'v', header: 'Latest version', render: x => x.latestVersion ?? <span className="muted">{x.versionCount ? 'All retired' : 'No versions yet'}</span> },
            { key: 'm', header: 'Module', render: x => x.module ?? <span className="muted">—</span> },
            { key: 'r', header: 'Role', render: x => x.role ?? <span className="muted">—</span> },
            { key: 'd', header: 'Description', render: x => x.description ?? <span className="muted">—</span> },
            { key: 'u', header: 'Deployed', render: x => x.installations ? `${x.installations} installation(s) · ${x.servers} server(s)` : <span className="muted">Not deployed</span> },
            { key: 's', header: 'Status', render: x => x.isActive ? <Badge tone="good">Active</Badge> : <Badge>Retired</Badge> },
            { key: 'e', header: '', className: 'nowrap', render: x => <RowActions name={`microservice ${x.name}`} onEdit={can ? () => setDialog({ kind: 'microservice', item: x }) : undefined}
              onDelete={canDelete ? () => setRemoving({ path: `/products/microservices/${x.id}`, what: `Microservice ${x.name}` }) : undefined} /> }
          ]} />
        </Panel>
        <Panel title={`Features (${p.features.length})`} pad={false} actions={can && <button className="btn" onClick={() => setDialog({ kind: 'feature' })}>+ Feature</button>}>
          <DataTable<Feature> rowKey={x => x.id} rows={p.features} caption="Features" columns={[
            { key: 'n', header: 'Feature', render: x => <b>{x.name}</b> },
            { key: 'm', header: 'Module', render: x => x.module ?? <span className="muted">Whole product</span> },
            { key: 'iv', header: 'Introduced in', render: x => x.introducedIn ?? <span className="muted">—</span> },
            { key: 'd', header: 'Description', render: x => x.description ?? <span className="muted">—</span> },
            { key: 's', header: 'Status', render: x => x.isActive ? <Badge tone="good">Active</Badge> : <Badge>Retired</Badge> },
            { key: 'e', header: '', className: 'nowrap', render: x => <RowActions name={`feature ${x.name}`} onEdit={can ? () => setDialog({ kind: 'feature', item: x }) : undefined}
              onDelete={canDelete ? () => setRemoving({ path: `/products/features/${x.id}`, what: `Feature ${x.name}` }) : undefined} /> }
          ]} />
        </Panel>
        <Panel title={`Versions (${p.versions.length})`} pad={false} actions={can && <button className="btn" onClick={() => setDialog({ kind: 'version' })}>+ Version</button>}>
          <DataTable rowKey={v => v.id} rows={p.versions} caption="Versions" columns={[
            { key: 'v', header: 'Version', render: v => <b>{v.version}</b> },
            { key: 'r', header: 'Released', render: v => v.releasedOn ? fmtDate(v.releasedOn) : <span className="muted">—</span> },
            { key: 'f', header: 'New features', render: v => v.features.length ? v.features.map(x => x.name).join(', ') : <span className="muted">—</span> },
            { key: 'n', header: 'Release notes', render: v => v.releaseNotes || v.features.length
              ? <button className="linkbtn" onClick={() => setDialog({ kind: 'notes', item: v })} aria-label={`Release notes of ${v.version}`}>View</button> : <span className="muted">—</span> },
            { key: 'i', header: 'Installations', className: 'num', render: v => v.installations },
            { key: 's', header: 'Status', render: v => v.isActive ? <Badge tone="good">Active</Badge> : <Badge>Retired</Badge> },
            { key: 'e', header: '', className: 'nowrap', render: v => <RowActions name={`version ${v.version}`} onEdit={can ? () => setDialog({ kind: 'version', item: v }) : undefined}
              onDelete={canDelete ? () => setRemoving({ path: `/products/versions/${v.id}`, what: `Version ${v.version}` }) : undefined} /> }
          ]} />
        </Panel>
        <Panel title="Installations by client" pad={false}>
          {p.usage.length === 0 ? <StateMessage kind="none">Not installed at any client you can access.</StateMessage> : (
            <DataTable caption="Installations by client" rows={p.usage.flatMap(c => c.installations.map(i => ({ ...i, c })))} rowKey={i => i.id} columns={[
              { key: 'c', header: 'Client', render: i => <Link to={`/clients/${i.c.clientId}`}>{i.c.clientCode} · {i.c.clientName}</Link> },
              { key: 'e', header: 'Environment', render: i => <Link to={`/environments/${i.environmentId}`}>{i.region ? `${i.region} / ` : ''}{i.environment}</Link> },
              { key: 'i', header: 'Instance', render: i => <Link to={`/installations/${i.id}`}>{i.instanceName}</Link> },
              { key: 'm', header: 'Module', render: i => i.module ?? <span className="muted">—</span> },
              { key: 'v', header: 'Version', render: i => i.version ?? <Badge tone="warn">Unknown</Badge> }
            ]} />
          )}
        </Panel>
        <div className="cols">
          <Panel title="Projects" pad={false}>
            {p.projects.length === 0 ? <StateMessage kind="none" /> : <ul className="plain" style={{ padding: 12 }}>{p.projects.map(x => <li key={x.id}><Link to={`/clients/${x.clientId}`}>{x.clientCode}</Link> · {x.code} · {x.name} <span className="muted">({label(x.status)})</span></li>)}</ul>}
          </Panel>
          <Panel title="Contracts" pad={false}>
            {p.contracts.length === 0 ? <StateMessage kind="none" /> : <ul className="plain" style={{ padding: 12 }}>{p.contracts.map(x => <li key={x.id}><Link to={`/contracts/${x.id}`}>{x.ref} · {x.title}</Link> <span className="muted">({x.clientCode}, {label(x.status)})</span></li>)}</ul>}
          </Panel>
        </div>
        <AttachmentsPanel recordType="Product" recordId={p.id} title="Product documents" />
        {dialog?.kind === 'module' && <ModuleDialog productId={p.id} item={dialog.item} onClose={() => setDialog(null)} />}
        {dialog?.kind === 'feature' && <FeatureDialog productId={p.id} modules={p.modules} versions={p.versions} item={dialog.item} onClose={() => setDialog(null)} />}
        {dialog?.kind === 'notes' && <ReleaseNotesDialog item={dialog.item} productCode={p.code} onClose={() => setDialog(null)} />}
        {dialog?.kind === 'microservice' && <MicroserviceDialog productId={p.id} productCode={p.code} modules={p.modules} item={dialog.item} onClose={() => setDialog(null)} />}
        {dialog?.kind === 'version' && <VersionDialog productId={p.id} features={p.features} item={dialog.item} onClose={() => setDialog(null)} />}
        {removing && <ConfirmDelete path={removing.path} what={removing.what} onClose={() => setRemoving(null)} />}
      </>)}
    </QueryState>
  );
}

function ModuleDialog({ productId, item, onClose }: { productId: number; item?: Module; onClose: () => void }) {
  const f = useForm({ code: item?.code ?? '', name: item?.name ?? '', description: item?.description ?? '', isActive: item?.isActive ?? true });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const ok = await f.submit(v => (item ? put(`/products/modules/${item.id}`, v, item.version) : post(`/products/${productId}/modules`, v)).then(() => true));
    if (ok) { toast('Module saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={item ? `Edit module ${item.code}` : 'Add module'} onClose={onClose}>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Module code" required value={f.values.code} onChange={v => f.set('code', v.toUpperCase())} error={f.fieldError('code')} disabled={!!item} hint={item ? 'Codes keep their meaning in history; retire the module instead of renaming.' : 'Short and permanent, e.g. IMPORTER.'} />
        <TextInput label="Module name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} />
        <TextInput label="Description" wide multiline value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} />
        <Checkbox label="Active (untick to retire)" checked={f.values.isActive} onChange={v => f.set('isActive', v)} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save module</button></div>
    </Dialog>
  );
}

function FeatureDialog({ productId, modules, versions, item, onClose }: { productId: number; modules: Module[]; versions: ProductVersionT[]; item?: Feature; onClose: () => void }) {
  const f = useForm({ name: item?.name ?? '', description: item?.description ?? '', moduleId: item?.moduleId ? String(item.moduleId) : '',
    introducedInVersionId: item?.introducedInVersionId ? String(item.introducedInVersionId) : '', isActive: item?.isActive ?? true });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const body = { ...f.values, moduleId: f.values.moduleId ? Number(f.values.moduleId) : null, introducedInVersionId: f.values.introducedInVersionId ? Number(f.values.introducedInVersionId) : null };
    const ok = await f.submit(() => (item ? put(`/products/features/${item.id}`, body, item.version) : post(`/products/${productId}/features`, body)).then(() => true));
    if (ok) { toast('Feature saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={item ? `Edit feature` : 'Add feature'} onClose={onClose}>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Feature name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} />
        <SelectInput label="Module" value={f.values.moduleId} onChange={v => f.set('moduleId', v)} options={modules.filter(m => m.isActive || String(m.id) === f.values.moduleId).map(m => ({ value: String(m.id), label: `${m.code} · ${m.name}` }))}
          empty="Whole product (no module)" error={f.fieldError('moduleId')} />
        <SelectInput label="Introduced in version" value={f.values.introducedInVersionId} onChange={v => f.set('introducedInVersionId', v)}
          options={versions.map(v => ({ value: String(v.id), label: v.version }))} empty="Not recorded" error={f.fieldError('introducedInVersionId')} />
        <TextInput label="Description" wide multiline value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} hint="What the feature does and for whom." />
        <Checkbox label="Active (untick to retire)" checked={f.values.isActive} onChange={v => f.set('isActive', v)} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save feature</button></div>
    </Dialog>
  );
}

function MicroserviceDialog({ productId, productCode, modules, item, onClose }: { productId: number; productCode: string; modules: Module[]; item?: Microservice; onClose: () => void }) {
  const roles = useLookup('ComponentRole', item?.role);
  const f = useForm({ name: item?.name ?? `${productCode}.`, description: item?.description ?? '', moduleId: item?.moduleId ? String(item.moduleId) : '', role: item?.role ?? '', isActive: item?.isActive ?? true });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const body = { ...f.values, moduleId: f.values.moduleId ? Number(f.values.moduleId) : null, role: f.values.role || null };
    const ok = await f.submit(() => (item ? put(`/products/microservices/${item.id}`, body, item.version) : post(`/products/${productId}/microservices`, body)).then(() => true));
    if (ok) { toast('Microservice saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={item ? 'Edit microservice' : 'Add microservice'} onClose={onClose}>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Microservice name" required wide value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} hint="As deployed, e.g. PSOP.Importer.Microservice." />
        <SelectInput label="Module" value={f.values.moduleId} onChange={v => f.set('moduleId', v)} options={modules.filter(m => m.isActive || String(m.id) === f.values.moduleId).map(m => ({ value: String(m.id), label: `${m.code} · ${m.name}` }))}
          empty="— None —" error={f.fieldError('moduleId')} />
        <SelectInput label="Role" value={f.values.role} onChange={v => f.set('role', v)} options={roles.map(r => ({ value: r.code, label: r.label }))} empty="—" error={f.fieldError('role')} hint="Used for the deployed component (e.g. Import, Workflow)." />
        <TextInput label="Description" wide multiline value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} />
        <Checkbox label="Active (untick to retire)" checked={f.values.isActive} onChange={v => f.set('isActive', v)} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save microservice</button></div>
    </Dialog>
  );
}

/** Edit and Delete links for a row; each appears only with its right. */
function RowActions({ name, onEdit, onDelete }: { name: string; onEdit?: () => void; onDelete?: () => void }) {
  if (!onEdit && !onDelete) return null;
  return (
    <span className="row-actions">
      {onEdit && <button className="linkbtn" onClick={onEdit} aria-label={`Edit ${name}`}>Edit</button>}
      {onDelete && <button className="linkbtn danger-link" onClick={onDelete} aria-label={`Delete ${name}`}>Delete</button>}
    </span>
  );
}

/** A57: a product version with its release notes and the features it introduced (existing ones picked, new ones named here). */
function VersionDialog({ productId, features, item, onClose }: { productId: number; features: Feature[]; item?: ProductVersionT; onClose: () => void }) {
  const f = useForm({ version: item?.version ?? '', releasedOn: item?.releasedOn ?? '', releaseNotes: item?.releaseNotes ?? '', isActive: item?.isActive ?? true,
    featureIds: (item?.features ?? []).map(x => x.id), newFeatures: [] as string[] });
  const [draft, setDraft] = useState('');
  const toast = useToast();
  const refresh = useRefresh();
  const toggle = (id: number) => f.set('featureIds', f.values.featureIds.includes(id) ? f.values.featureIds.filter(x => x !== id) : [...f.values.featureIds, id]);
  const addNew = () => {
    const n = draft.trim();
    if (!n) return;
    const same = features.find(x => x.name.toLowerCase() === n.toLowerCase());
    if (same) { if (!f.values.featureIds.includes(same.id)) toggle(same.id); }
    else if (!f.values.newFeatures.some(x => x.toLowerCase() === n.toLowerCase())) f.set('newFeatures', [...f.values.newFeatures, n]);
    setDraft('');
  };
  const save = async () => {
    const body = { version: f.values.version, releasedOn: f.values.releasedOn || null, isActive: f.values.isActive, releaseNotes: f.values.releaseNotes || null,
      featureIds: f.values.featureIds, newFeatures: f.values.newFeatures };
    const ok = await f.submit(async () => { if (item) await put(`/products/versions/${item.id}`, body, item.rowVersion); else await post(`/products/${productId}/versions`, body); return true; });
    if (ok) { toast(item ? 'Version saved.' : 'Version added.'); refresh(); onClose(); }
  };
  const elsewhere = (x: Feature) => x.introducedInVersionId && x.introducedInVersionId !== item?.id ? x.introducedIn : undefined;
  return (
    <Dialog title={item ? `Edit version ${item.version}` : 'Add version'} onClose={onClose} wide>
      <FormError error={f.error} fields={['version', 'releaseNotes', 'featureIds', 'newFeatures']} />
      <div className="form-grid">
        <TextInput label="Version" required value={f.values.version} onChange={v => f.set('version', v)} error={f.fieldError('version')}
          hint={item ? 'The label can be corrected while no installation uses it.' : 'As the product team labels it, e.g. 17.8.1.'} />
        <TextInput label="Released on" type="date" value={f.values.releasedOn} onChange={v => f.set('releasedOn', v)} />
        <TextInput label="Release notes" wide multiline value={f.values.releaseNotes} onChange={v => f.set('releaseNotes', v)} error={f.fieldError('releaseNotes')}
          hint="What changed: improvements, fixes, known issues, upgrade steps. Plain text; one item per line works well." />
        <Field label="New features in this version" wide error={f.fieldError('featureIds') ?? f.fieldError('newFeatures')}
          hint="Select the product's features this version introduced, or name new ones (they are added to the product's features).">
          {(fid, desc) => <>
            {features.length > 0 && <div className="day-chips" role="group" aria-label="Existing features" id={fid} aria-describedby={desc}>
              {features.map(x => (
                <button type="button" key={x.id} aria-pressed={f.values.featureIds.includes(x.id)} onClick={() => toggle(x.id)}
                  title={elsewhere(x) ? `Now listed under ${elsewhere(x)}; selecting moves it here` : x.description}>{x.name}{elsewhere(x) && <span className="muted"> ({elsewhere(x)})</span>}</button>
              ))}
            </div>}
            {f.values.newFeatures.length > 0 && <div className="day-chips" role="group" aria-label="New features to add" style={{ marginTop: 6 }}>
              {f.values.newFeatures.map(n => <button type="button" key={n} aria-pressed onClick={() => f.set('newFeatures', f.values.newFeatures.filter(x => x !== n))} title="Click to remove">+ {n} ✕</button>)}
            </div>}
            <div className="inline-add">
              <input className="input" aria-label="New feature name" placeholder="New feature name" value={draft} maxLength={150}
                onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNew(); } }} />
              <button type="button" className="btn" onClick={addNew} disabled={!draft.trim()}>Add feature</button>
            </div>
          </>}
        </Field>
        {item && <Checkbox label="Active (untick to retire this version)" checked={f.values.isActive} onChange={v => f.set('isActive', v)} />}
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{item ? 'Save version' : 'Add version'}</button></div>
    </Dialog>
  );
}

function ReleaseNotesDialog({ item, productCode, onClose }: { item: ProductVersionT; productCode: string; onClose: () => void }) {
  return (
    <Dialog title={`${productCode} ${item.version}`} onClose={onClose} wide>
      <p className="muted" style={{ marginTop: 0 }}>{item.releasedOn ? `Released ${fmtDate(item.releasedOn)}` : 'Release date not recorded'}{!item.isActive && ' · retired'}</p>
      <h3 className="sub-h">New features</h3>
      {item.features.length ? <ul className="plain">{item.features.map(x => <li key={x.id}>{x.name}</li>)}</ul> : <p className="muted">None recorded.</p>}
      <h3 className="sub-h">Release notes</h3>
      {item.releaseNotes ? <div className="release-notes">{item.releaseNotes}</div> : <p className="muted">No release notes.</p>}
      <div className="form-actions"><button className="btn btn-primary" onClick={onClose}>Close</button></div>
    </Dialog>
  );
}

export function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const toast = useToast();
  const existing = useQuery({ queryKey: ['product', id], queryFn: () => get<Detail>(`/products/${id}`), enabled: !isNew });
  const f = useForm({ code: '', name: '', aliases: '', category: '', description: '', technology: '', productOwner: '', isActive: true, developers: [] as Developer[] });
  useLeaveGuard(f.dirty && !f.busy);
  useEffect(() => {
    const p = existing.data;
    if (p) f.reset({ code: p.code, name: p.name, aliases: p.aliases ?? '', category: p.category ?? '', description: p.description ?? '', technology: p.technology ?? '',
      productOwner: p.productOwner ?? '', isActive: p.isActive, developers: p.developers.map(d => ({ name: d.name, role: d.role, email: d.email ?? '' })) });
  }, [existing.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    const body = { ...f.values, productOwner: f.values.productOwner || null, developers: f.values.developers.map(d => ({ name: d.name, role: d.role, email: d.email || null })) };
    const r = await f.submit(() => isNew ? post<{ id: number }>('/products', body) : put(`/products/${id}`, body, existing.data?.etag).then(() => ({ id: Number(id) })));
    if (r) { toast('Product saved.'); nav(`/products/${r.id}`); }
  };
  if (!isNew && existing.isLoading) return <StateMessage kind="loading" />;
  return (
    <>
      <PageHead title={isNew ? 'New product' : `Edit ${existing.data?.code ?? ''}`} crumbs={[{ to: '/products', label: 'Products' }]}
        sub="A product is a software application TIO delivers and supports. Add modules, features and versions on the product page after saving." />
      <Panel>
        <FormError error={f.error} />
        <div className="form-grid">
          <TextInput label="Product code" required value={f.values.code} onChange={v => f.set('code', v)} error={f.fieldError('code')} disabled={!isNew}
            hint={isNew ? 'Short and permanent, e.g. PSOP or ViRRM.' : 'Codes keep their meaning in history; retire the product instead of renaming.'} />
          <TextInput label="Product name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} />
          <TextInput label="Also known as" value={f.values.aliases} onChange={v => f.set('aliases', v)} error={f.fieldError('aliases')} hint="Other names people use, separated by semicolons." />
          <TextInput label="Category" value={f.values.category} onChange={v => f.set('category', v)} error={f.fieldError('category')} hint="e.g. Back office, ANPR, Big data." />
          <TextInput label="Product owner" value={f.values.productOwner} onChange={v => f.set('productOwner', v)} error={f.fieldError('productOwner')} maxLength={150}
            hint="Any name; the product owner does not need a hub account." />
          <TextInput label="Description" wide multiline value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} hint="What the product does, for whom, and anything a new engineer should know." />
          <TextInput label="Technology" wide multiline value={f.values.technology} onChange={v => f.set('technology', v)} error={f.fieldError('technology')} hint="Platform and stack, e.g. .NET 8, SQL Server 2019, Docker, Windows Server." />
          <Checkbox label="Active (untick to retire the product)" checked={f.values.isActive} onChange={v => f.set('isActive', v)} />
          <fieldset className="wide" style={{ border: '1px solid var(--line)', padding: '8px 10px' }}>
            <legend className="flabel">Application developers</legend>
            {f.values.developers.length === 0 && <p className="hint" style={{ margin: '0 0 8px' }}>No developers listed yet.</p>}
            {f.values.developers.map((d, n) => (
              <div key={n} className="dev-row">
                <input className="input" aria-label={`Developer ${n + 1} name`} placeholder="Name" value={d.name} onChange={e => f.set('developers', f.values.developers.map((x, i) => i === n ? { ...x, name: e.target.value } : x))} />
                <select className="input" aria-label={`Developer ${n + 1} role`} value={d.role} onChange={e => f.set('developers', f.values.developers.map((x, i) => i === n ? { ...x, role: e.target.value } : x))}>
                  <option value="Lead">Lead developer</option><option value="Developer">Developer</option>
                </select>
                <input className="input" type="email" aria-label={`Developer ${n + 1} e-mail`} placeholder="E-mail (optional)" value={d.email ?? ''} onChange={e => f.set('developers', f.values.developers.map((x, i) => i === n ? { ...x, email: e.target.value } : x))} />
                <button type="button" className="linkbtn" onClick={() => f.set('developers', f.values.developers.filter((_, i) => i !== n))} aria-label={`Remove developer ${n + 1}`}>Remove</button>
              </div>
            ))}
            {Object.entries(f.error?.errors ?? {}).filter(([k]) => k.startsWith('developers')).map(([k, v]) => <div key={k} className="err">{v.join(' ')}</div>)}
            <button type="button" className="btn" style={{ marginTop: 6 }} onClick={() => f.set('developers', [...f.values.developers, { name: '', role: f.values.developers.length ? 'Developer' : 'Lead', email: '' }])}>+ Developer</button>
          </fieldset>
        </div>
        <div className="form-actions"><button className="btn" onClick={() => nav(-1)}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{f.busy ? 'Saving…' : 'Save product'}</button></div>
      </Panel>
    </>
  );
}

type MicroserviceDetailT = {
  id: number; name: string; description?: string; moduleId?: number; module?: { id: number; code: string; name: string }; role?: string; isActive: boolean; etag: string;
  product: { id: number; code: string; name: string };
  versions: { id: number; version: string; releasedOn?: string; releaseNotes?: string; isActive: boolean; rowVersion: string }[];
  deployments: { componentId: number; installationId: number; installation: string; clientId: number; clientCode: string; environmentId: number; environment: string; region?: string; componentVersion?: string; servers: { assetId: number; name: string; version?: string }[] }[];
  permissions: { canEdit: boolean };
};

/** A microservice of a product: its versions with release notes, and where it runs. */
export function MicroserviceDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['microservice', id], queryFn: () => get<MicroserviceDetailT>(`/products/microservices/${id}`) });
  const product = useQuery({ queryKey: ['product', String(q.data?.product.id)], queryFn: () => get<Detail>(`/products/${q.data!.product.id}`), enabled: !!q.data });
  const [dialog, setDialog] = useState<null | { kind: 'edit' } | { kind: 'version'; item?: MicroserviceDetailT['versions'][number] }>(null);
  const m = q.data;
  const can = !!m?.permissions.canEdit;
  const canDelete = usePermission('Products', 'Delete');
  const [removing, setRemoving] = useState<{ path: string; what: string; after?: string } | null>(null);
  const nav = useNavigate();
  return (
    <QueryState q={q}>
      {m && (<>
        <PageHead title={m.name} crumbs={[{ to: '/products', label: 'Products' }, { to: `/products/${m.product.id}`, label: m.product.code }, { label: 'Microservice' }]}
          sub={<>{m.isActive ? <Badge tone="good">Active</Badge> : <Badge>Retired</Badge>} <span className="muted">· microservice of {m.product.code} · {m.product.name}</span></>}
          actions={<>
            {can && <button className="btn" onClick={() => setDialog({ kind: 'edit' })}>Edit</button>}
            {canDelete && <button className="btn btn-danger-outline" onClick={() => setRemoving({ path: `/products/microservices/${m.id}`, what: `Microservice ${m.name}`, after: `/products/${m.product.id}` })}>Delete</button>}
            {can && <button className="btn btn-primary" onClick={() => setDialog({ kind: 'version' })}>+ Version</button>}
          </>} />
        <Panel title="Microservice">
          <DL items={[
            ['Product', <Link to={`/products/${m.product.id}`}>{m.product.code} · {m.product.name}</Link>],
            ['Module', m.module ? `${m.module.code} · ${m.module.name}` : <span className="muted">—</span>],
            ['Role', m.role ?? <span className="muted">—</span>],
            ['Description', m.description ? <span style={{ whiteSpace: 'pre-wrap' }}>{m.description}</span> : <span className="muted">—</span>],
            ['Latest version', m.versions.find(v => v.isActive)?.version ?? <span className="muted">No versions yet</span>]
          ]} />
        </Panel>
        <Panel title={`Versions and release notes (${m.versions.length})`} pad={false}>
          {m.versions.length === 0 ? <StateMessage kind="none">No versions recorded yet.{can && ' Use + Version to add the first one with its release notes.'}</StateMessage> : (
            <ul className="releases">
              {m.versions.map(v => (
                <li key={v.id}>
                  <div className="release-head">
                    <b className="mono">{v.version}</b>
                    <span className="muted">{v.releasedOn ? `released ${fmtDate(v.releasedOn)}` : 'release date not recorded'}</span>
                    {!v.isActive && <Badge>Retired</Badge>}
                    <RowActions name={`version ${v.version}`} onEdit={can ? () => setDialog({ kind: 'version', item: v }) : undefined}
                      onDelete={canDelete ? () => setRemoving({ path: `/products/microservice-versions/${v.id}`, what: `Version ${v.version}` }) : undefined} />
                  </div>
                  {v.releaseNotes ? <div className="release-notes">{v.releaseNotes}</div> : <p className="muted" style={{ margin: '4px 0 0' }}>No release notes.</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={`Where it runs (${m.deployments.length})`} pad={false}>
          <DataTable rowKey={d => d.componentId} rows={m.deployments} empty="none" caption="Deployments" columns={[
            { key: 'c', header: 'Client', render: d => <Link to={`/clients/${d.clientId}`}>{d.clientCode}</Link> },
            { key: 'e', header: 'Environment', render: d => <Link to={`/environments/${d.environmentId}`}>{d.region ? `${d.region} / ` : ''}{d.environment}</Link> },
            { key: 'i', header: 'Installation', render: d => <Link to={`/installations/${d.installationId}`}>{d.installation}</Link> },
            { key: 's', header: 'Servers and deployed version', render: d => d.servers.length ? d.servers.map(x => (
              <div key={x.assetId}><Link to={`/assets/${x.assetId}`}>{x.name}</Link> {x.version ? <span className="chip mono">{x.version}</span> : <span className="muted">version not recorded</span>}</div>
            )) : <Badge tone="warn">No server</Badge> }
          ]} />
        </Panel>
        {dialog?.kind === 'edit' && product.data && <MicroserviceDialog productId={m.product.id} productCode={m.product.code} modules={product.data.modules}
          item={{ id: m.id, name: m.name, description: m.description, moduleId: m.module?.id, role: m.role, isActive: m.isActive, version: m.etag, installations: 0, clients: 0, servers: 0, versionCount: m.versions.length }} onClose={() => setDialog(null)} />}
        {dialog?.kind === 'version' && <MicroserviceVersionDialog microserviceId={m.id} item={dialog.item} onClose={() => setDialog(null)} />}
        {removing && <ConfirmDelete path={removing.path} what={removing.what} onClose={() => setRemoving(null)} onDone={() => { if (removing.after) nav(removing.after, { replace: true }); }} />}
      </>)}
    </QueryState>
  );
}

function MicroserviceVersionDialog({ microserviceId, item, onClose }: { microserviceId: number; item?: MicroserviceDetailT['versions'][number]; onClose: () => void }) {
  const f = useForm({ version: item?.version ?? '', releasedOn: item?.releasedOn ?? '', releaseNotes: item?.releaseNotes ?? '', isActive: item?.isActive ?? true });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const body = { ...f.values, releasedOn: f.values.releasedOn || null };
    const ok = await f.submit(() => (item ? put(`/products/microservice-versions/${item.id}`, body, item.rowVersion) : post(`/products/microservices/${microserviceId}/versions`, body)).then(() => true));
    if (ok) { toast('Version saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={item ? `Edit version ${item.version}` : 'Add version'} onClose={onClose} wide>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Version number" required value={f.values.version} onChange={v => f.set('version', v)} error={f.fieldError('version')}
          hint={item ? 'The number can be corrected while no server runs this version.' : 'As the product team labels it, e.g. 2.4.1.'} />
        <TextInput label="Released on" type="date" value={f.values.releasedOn} onChange={v => f.set('releasedOn', v)} />
        <TextInput label="Release notes" wide multiline value={f.values.releaseNotes} onChange={v => f.set('releaseNotes', v)} error={f.fieldError('releaseNotes')}
          hint="What changed: new features, fixes, known issues, upgrade steps. Plain text; one item per line works well." />
        {item && <Checkbox label="Active (untick to retire this version)" checked={f.values.isActive} onChange={v => f.set('isActive', v)} />}
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save version</button></div>
    </Dialog>
  );
}

/** Owner request (20 Oct 2026): holders of the Delete products right can delete a product that is not in use. */
function DeleteProductDialog({ id, code, version, onClose }: { id: number; code: string; version: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  const remove = async () => {
    setBusy(true);
    try { await del(`/products/${id}`, version); toast(`Product ${code} deleted.`); refresh(); nav('/products'); }
    catch (e) {
      const err = e as { errors?: Record<string, string[]>; message?: string };
      setError(err.errors?.product?.join(' ') ?? err.message ?? 'The product could not be deleted.');
    } finally { setBusy(false); }
  };
  return (
    <Dialog title={`Delete product ${code}`} onClose={onClose}>
      <p>This permanently removes {code} with its modules, features, microservices and versions. The change history keeps a record of the deletion.</p>
      <p className="hint">A product installed anywhere or supported by a project cannot be deleted; retire it instead.</p>
      {error && <div className="notice bad" role="alert">{error}</div>}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-danger" disabled={busy} onClick={remove}>Delete product</button></div>
    </Dialog>
  );
}
