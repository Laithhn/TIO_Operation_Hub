import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { exportCsv, get, post, put, qs, type Paged, type UserRef } from '../api';
import { fmtDate, label, qty } from '../format';
import { usePermission, useEnum, useForm, useLookup, useMe, useReference, useRefresh, useUrlState, useTypes } from '../hooks';
import { ActionDialog, ArchiveDialog, UserPicker } from '../ui/pickers';
import { Badge, Checkbox, DataTable, Dialog, DL, enumOptions, FormError, PageHead, Pager, Panel, Person, QueryState, SelectInput, StateMessage, StatusBadge, TextInput, useToast, When, FreshnessBadge, type FreshnessT, Menu, FormSection, QuantityInput, DeleteAction } from '../ui/kit';
import { ClientDisplay } from '../ui/ClientLogo';
import { InfraSummary, type Infra } from './Clients';
import { FirewallRulesPanel } from './Firewall';
import { HistoryPanel, toNum, useClientOptions, useProductOptions, ContactCard, ContactFields, contactFrom, contactOut } from './common';
import { AttachmentsPanel } from './Attachments';

export function InstallationDialog({ environmentId, clientId, onClose }: { environmentId: number; clientId: number; onClose: () => void }) {
  const ref = useReference().data;
  const f = useForm({ productId: '', moduleId: '', instanceName: '', productVersionId: '', versionEvidence: '', deployedOn: '', supportNotes: '', ownerUserId: null as number | null });
  const product = ref?.products.find(p => String(p.id) === f.values.productId);
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const v = f.values;
    const ok = await f.submit(() => post('/installations', { environmentId, productId: toNum(v.productId), moduleId: toNum(v.moduleId), instanceName: v.instanceName, productVersionId: toNum(v.productVersionId),
      versionEvidence: v.versionEvidence || null, deployedOn: v.deployedOn || null, supportNotes: v.supportNotes, ownerUserId: v.ownerUserId }).then(() => true));
    if (ok) { toast('Installation added.'); refresh(); onClose(); }
  };
  return (
    <Dialog title="Add application installation" onClose={onClose} wide>
      <p className="hint" style={{ marginBottom: 8 }}>Several named installations of the same product can exist in one environment; give each a distinct instance name.</p>
      <FormError error={f.error} />
      <div className="form-grid">
        <SelectInput label="Product" required value={f.values.productId} onChange={v => { f.set('productId', v); f.set('productVersionId', ''); f.set('moduleId', ''); }} options={(ref?.products ?? []).filter(p => p.isActive).map(p => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))} error={f.fieldError('productId')} />
        <SelectInput label="Module" value={f.values.moduleId} onChange={v => f.set('moduleId', v)} options={(product?.modules ?? []).map(m => ({ value: String(m.id), label: m.code }))} empty="None" />
        <TextInput label="Instance name" required value={f.values.instanceName} onChange={v => f.set('instanceName', v)} error={f.fieldError('instanceName')} />
        <SelectInput label="Version" value={f.values.productVersionId} onChange={v => f.set('productVersionId', v)} options={(product?.versions ?? []).filter(x => x.isActive).map(x => ({ value: String(x.id), label: x.version }))} empty="Unknown" error={f.fieldError('productVersionId')} hint="Unknown is recorded explicitly and listed as a data-quality gap." />
        {f.values.productVersionId && <TextInput label="Version evidence (optional)" value={f.values.versionEvidence} onChange={v => f.set('versionEvidence', v)} error={f.fieldError('versionEvidence')} />}
        <TextInput label="Deployed on" type="date" value={f.values.deployedOn} onChange={v => f.set('deployedOn', v)} />
        <UserPicker label="Owner" value={f.values.ownerUserId} onChange={v => f.set('ownerUserId', v)} clientId={clientId} empty="Environment owner" />
        <TextInput label="Support notes" wide multiline value={f.values.supportNotes} onChange={v => f.set('supportNotes', v)} error={f.fieldError('supportNotes')} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Add installation</button></div>
    </Dialog>
  );
}

type AssetDto = {
  id: number; name: string; type: string; role?: string; projectPhase?: string; lifecycle: string; networkZone?: string; technicalRestricted: boolean;
  environment: { id: number; name: string; clientId: number; clientCode: string; regionId?: number; regionCode?: string }; owner?: UserRef; ownerName?: string; ownerContact?: string; ownerDetails?: { name: string; title?: string; organization?: string; phone?: string; mobile?: string; email?: string }; responsibleParty: string; responsibleOrganization?: string; coordinatorUserId?: number;
  cpuQuantity?: number; cpuUnit?: string; ramQuantity?: number; ramUnit?: string; osFamily?: string; osVersion?: string; verifiedAt?: string;
  volumes: { id: number; label: string; capacity?: number; unit?: string; purpose?: string; sharedStorageId?: number; sharedStorageName?: string; version: string }[];
  components: { componentId: number; name: string; role: string; installationId: number; installationName: string; productCode: string }[]; version: string;
};

type MsVersion = { id: number; version: string; releasedOn?: string; isActive: boolean };
type MsOption = {
  installationId: number; instanceName: string; productCode: string; productName: string;
  microservices: { id: number; name: string; module?: string; role?: string; isActive: boolean; selected: boolean; versionId?: number | null; versions: MsVersion[] }[];
};
/** Per installation: the microservices running on the server, each with its deployed version (null = not recorded). */
type Hosted = Record<number, { id: number; versionId: number | null }[]>;

/** Loads the environment's installations/microservices and keeps the server's hosted selection (with versions) as editable state. */
function useHostedMicroservices(environmentId: number, assetId?: number) {
  const options = useQuery({
    queryKey: ['ms-options', environmentId, assetId],
    queryFn: () => get<MsOption[]>(`/environments/${environmentId}/microservice-options${assetId ? `?assetId=${assetId}` : ''}`)
  });
  const [hosted, setHosted] = useState<Hosted | null>(null);
  useEffect(() => {
    if (options.data && hosted === null)
      setHosted(Object.fromEntries(options.data.map(o => [o.installationId, o.microservices.filter(m => m.selected).map(m => ({ id: m.id, versionId: m.versionId ?? null }))])));
  }, [options.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const payload = () => hosted ? Object.entries(hosted).map(([inst, items]) => ({ installationId: Number(inst), hosted: items.map(x => ({ microserviceId: x.id, versionId: x.versionId })) })) : null;
  return { options, hosted, setHosted, payload };
}

function HostedMicroservicesEditor({ h, error }: { h: ReturnType<typeof useHostedMicroservices>; error?: string }) {
  const { options, hosted, setHosted } = h;
  const toggle = (inst: number, m: MsOption['microservices'][number], on: boolean) => setHosted(cur => {
    const list = cur?.[inst] ?? [];
    // A newly ticked microservice starts at its latest released version; change it if the server runs another one.
    const latest = m.versions.find(v => v.isActive)?.id ?? null;
    return { ...cur, [inst]: on ? [...list, { id: m.id, versionId: latest }] : list.filter(x => x.id !== m.id) };
  });
  const setVersion = (inst: number, ms: number, versionId: number | null) =>
    setHosted(cur => ({ ...cur, [inst]: (cur?.[inst] ?? []).map(x => x.id === ms ? { ...x, versionId } : x) }));
  return (
    <fieldset className="hosted-ms">
      <legend className="flabel">Hosted microservices and deployed versions</legend>
      {options.isLoading && <StateMessage kind="loading" />}
      {options.data && options.data.length === 0 && <p className="hint" style={{ margin: 0 }}>No product is installed in this environment yet. Add the installation first; then choose its microservices here or on the installation page.</p>}
      {options.data?.map(o => (
        <div key={o.installationId} className="hosted-ms-group" role="group" aria-label={`${o.productCode} · ${o.instanceName}`}>
          <div className="hosted-ms-title"><b>{o.productCode}</b> · {o.instanceName}</div>
          {o.microservices.length === 0
            ? <p className="hint" style={{ margin: '2px 0 0' }}>{o.productCode} has no microservices defined yet (Products → {o.productCode}).</p>
            : o.microservices.map(m => {
              const item = (hosted?.[o.installationId] ?? []).find(x => x.id === m.id);
              return (
                <div key={m.id} className="hosted-ms-row">
                  <label className="check hosted-ms-item">
                    <input type="checkbox" checked={!!item} onChange={e => toggle(o.installationId, m, e.target.checked)} />
                    <span className="mono">{m.name}</span>{m.module && <span className="muted"> · {m.module}</span>}{!m.isActive && <span className="muted"> · retired</span>}
                  </label>
                  {item && (m.versions.length > 0
                    ? <select className="hosted-ms-version" aria-label={`${m.name} deployed version`} value={item.versionId ?? ''}
                        onChange={e => setVersion(o.installationId, m.id, e.target.value === '' ? null : Number(e.target.value))}>
                        <option value="">Version not recorded</option>
                        {m.versions.map(v => <option key={v.id} value={v.id}>{v.version}{v.isActive ? '' : ' (retired)'}</option>)}
                      </select>
                    : <span className="hint">No versions recorded for this microservice yet</span>)}
                </div>
              );
            })}
        </div>
      ))}
      {error && <div className="err">{error}</div>}
    </fieldset>
  );
}

/** Server page: edit only the microservices hosted on the server and their deployed versions. */
function HostedMicroservicesDialog({ asset, onClose }: { asset: AssetDto; onClose: () => void }) {
  const h = useHostedMicroservices(asset.environment.id, asset.id);
  const f = useForm({});
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const ok = await f.submit(() => put(`/assets/${asset.id}/microservices`, { microservices: h.payload() ?? [] }).then(() => true));
    if (ok) { toast('Hosted microservices saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={`Hosted microservices · ${asset.name}`} onClose={onClose} wide>
      <FormError error={f.error} />
      <HostedMicroservicesEditor h={h} error={f.fieldError('microservices')} />
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy || !h.hosted} onClick={save}>Save</button></div>
    </Dialog>
  );
}

/** Server page: the product microservices running on this server, with the deployed version. */
function HostedMicroservicesPanel({ asset, canEdit }: { asset: AssetDto; canEdit: boolean }) {
  const q = useQuery({ queryKey: ['ms-options', asset.environment.id, asset.id], queryFn: () => get<MsOption[]>(`/environments/${asset.environment.id}/microservice-options?assetId=${asset.id}`) });
  const [open, setOpen] = useState(false);
  const rows = (q.data ?? []).flatMap(o => o.microservices.filter(m => m.selected).map(m => ({ o, m, v: m.versions.find(v => v.id === m.versionId) })));
  return (
    <Panel title="Hosted microservices" pad={false} actions={canEdit && <button className="btn" onClick={() => setOpen(true)}>Edit hosted microservices</button>}>
      <QueryState q={q}>{q.data && (rows.length === 0
        ? <StateMessage kind="none">No product microservice is recorded on this server.{canEdit && q.data.length > 0 ? ' Use “Edit hosted microservices” to add them with their deployed version.' : ''}</StateMessage>
        : <DataTable rowKey={r => `${r.o.installationId}-${r.m.id}`} rows={rows} caption="Microservices deployed on this server" columns={[
          { key: 'm', header: 'Microservice', render: r => <><Link className="mono" to={`/microservices/${r.m.id}`}>{r.m.name}</Link>{r.m.module && <div className="hint">{r.m.module}</div>}</> },
          { key: 'v', header: 'Deployed version', render: r => r.v ? <span className="chip mono">{r.v.version}</span> : <Badge tone="warn">Not recorded</Badge> },
          { key: 'i', header: 'Installation', render: r => <Link to={`/installations/${r.o.installationId}`}>{r.o.productCode} · {r.o.instanceName}</Link> }
        ]} />)}</QueryState>
      {open && <HostedMicroservicesDialog asset={asset} onClose={() => setOpen(false)} />}
    </Panel>
  );
}

export function AssetDialog({ environmentId, clientId, asset, onClose }: { environmentId: number; clientId: number; asset?: AssetDto; onClose: () => void }) {
  const T = useTypes();
  const lifecycles = useEnum('AssetLifecycle');
  const parties = useEnum('ResponsibleParty');
  const roles = useLookup('AssetRole', asset?.role);
  const zones = useLookup('NetworkZone', asset?.networkZone);
  const phases = useLookup('ProjectPhase', asset?.projectPhase);
  const osf = useLookup('OsFamily', asset?.osFamily);
  const me = useMe().data!;
  const f = useForm({
    name: asset?.name ?? '', type: asset?.type ?? 'VM', role: asset?.role ?? '', networkZone: asset?.networkZone ?? '', projectPhase: asset?.projectPhase ?? '', lifecycle: asset?.lifecycle ?? 'Unknown',
    ownerUserId: asset?.owner?.id ?? null as number | null, responsibleParty: asset?.responsibleParty ?? 'TIO', coordinatorUserId: asset?.coordinatorUserId ?? null as number | null,
    // Owner request (20 Oct 2026): the technical owner can be a team member or any named person with contact details.
    ownerKind: (asset?.ownerName ? 'person' : 'member') as 'member' | 'person', ownerPerson: contactFrom(asset?.ownerDetails ?? (asset?.ownerName ? { name: asset.ownerName } : null)), ownerContact: asset?.ownerContact ?? '',
    cpuQuantity: asset?.cpuQuantity?.toString() ?? '', cpuUnit: asset?.cpuUnit ?? '', ramQuantity: asset?.ramQuantity?.toString() ?? '', ramUnit: asset?.ramUnit ?? '', osFamily: asset?.osFamily ?? '', osVersion: asset?.osVersion ?? ''
  });
  const person = f.values.ownerKind === 'person';
  const hasOwner = person ? !!f.values.ownerPerson.name.trim() : !!f.values.ownerUserId;
  const logical = T.category('AssetType', f.values.type) === 'LogicalEndpoint';
  // Hosted microservices: per installation of this environment, the product microservices running on this server and their deployed versions.
  const hostedMs = useHostedMicroservices(environmentId, asset?.id);
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const v = f.values;
    const body = { environmentId, name: v.name, type: v.type, role: v.role || null, networkZone: v.networkZone || null, projectPhase: v.projectPhase || null, lifecycle: v.lifecycle,
      ownerUserId: person ? null : v.ownerUserId, owner: person ? contactOut(v.ownerPerson) : null, ownerContact: person ? v.ownerContact || null : null,
      responsibleParty: v.responsibleParty, coordinatorUserId: hasOwner ? null : v.coordinatorUserId, cpuQuantity: v.cpuQuantity === '' ? null : Number(v.cpuQuantity), cpuUnit: v.cpuUnit || null,
      ramQuantity: v.ramQuantity === '' ? null : Number(v.ramQuantity), ramUnit: v.ramUnit || null, osFamily: v.osFamily || null, osVersion: v.osVersion || null,
      microservices: logical ? null : hostedMs.payload() };
    const ok = await f.submit(() => (asset ? put(`/assets/${asset.id}`, body, asset.version) : post('/assets', body)).then(() => true));
    if (ok) { toast('Server saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={asset ? `Edit server ${asset.name}` : 'Add server'} onClose={onClose} wide>
      <FormError error={f.error} />
      <FormSection title="Server">
        <TextInput label="Server name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} hint="Unique within the environment, e.g. nta-r1-app01." />
        <SelectInput label="Type" required value={f.values.type} onChange={v => f.set('type', v)} options={T.options('AssetType', asset?.type)} empty={null}
          hint={logical ? 'A logical endpoint (for example a listener) has no own CPU or RAM and is never counted as a VM.' : undefined} />
        <SelectInput label="Role" value={f.values.role} onChange={v => f.set('role', v)} options={roles.map(r => ({ value: r.code, label: r.label }))} empty="Not recorded" error={f.fieldError('role')} />
        <SelectInput label="Lifecycle" value={f.values.lifecycle} onChange={v => f.set('lifecycle', v)} options={enumOptions(lifecycles)} empty={null} hint="Documented does not imply Active." />
        {me.grants.technicalDetail
          ? <SelectInput label="Network zone" value={f.values.networkZone} onChange={v => f.set('networkZone', v)} options={zones.map(r => ({ value: r.code, label: r.label }))} empty="Unknown" error={f.fieldError('networkZone')}
              hint={me.isAdministrator ? <>Zones are managed under <Link to="/admin/network-zones" target="_blank">Administration → Network zones</Link>.</> : 'Zones are managed by the TIO Manager under Administration → Network zones.'} />
          : <TextInput label="Network zone" value="Restricted (Technical detail)" onChange={() => {}} disabled />}
        <SelectInput label="Project phase" value={f.values.projectPhase} onChange={v => f.set('projectPhase', v)} options={phases.map(r => ({ value: r.code, label: r.label }))} empty="Unknown" />
      </FormSection>
      {!logical && (
        <FormSection title="Capacity and operating system" hint="Leave a value empty when it is not known; unknown is never counted as zero.">
          <QuantityInput label="CPU" value={f.values.cpuQuantity} onChange={v => f.set('cpuQuantity', v)} unit={f.values.cpuUnit} onUnit={v => f.set('cpuUnit', v)}
            units={[{ value: 'vCPU', label: 'vCPU' }, { value: 'PhysicalCore', label: 'Physical cores' }]} error={f.fieldError('cpuQuantity') ?? f.fieldError('cpuUnit')} />
          <QuantityInput label="RAM" value={f.values.ramQuantity} onChange={v => f.set('ramQuantity', v)} unit={f.values.ramUnit} onUnit={v => f.set('ramUnit', v)}
            units={[{ value: 'GB', label: 'GB' }, { value: 'GiB', label: 'GiB' }]} error={f.fieldError('ramQuantity') ?? f.fieldError('ramUnit')} />
          <SelectInput label="OS family" value={f.values.osFamily} onChange={v => f.set('osFamily', v)} options={osf.map(r => ({ value: r.code, label: r.label }))} empty="Unknown" />
          <TextInput label="OS version" value={f.values.osVersion} onChange={v => f.set('osVersion', v)} placeholder="e.g. 2022" />
        </FormSection>
      )}
      <FormSection title="Ownership">
        <div className="field wide">
          <span className="flabel">Owner type</span>
          <div className="radio-row" role="radiogroup" aria-label="Owner type">
            <label className="check"><input type="radio" name="owner-kind" checked={!person} onChange={() => f.set('ownerKind', 'member')} /> A team member</label>
            <label className="check"><input type="radio" name="owner-kind" checked={person} onChange={() => f.set('ownerKind', 'person')} /> Another person (type name and contact)</label>
          </div>
        </div>
        {person ? <>
          <ContactFields value={f.values.ownerPerson} onChange={c => f.set('ownerPerson', c)} prefix="owner" fieldError={f.fieldError} nameLabel="Technical owner name" />
          <TextInput label="Other contact notes" wide value={f.values.ownerContact} onChange={v => f.set('ownerContact', v)} error={f.fieldError('ownerContact')} maxLength={300} placeholder="e.g. after-hours escalation, preferred channel" />
        </> : <UserPicker label="Technical owner" value={f.values.ownerUserId} onChange={v => f.set('ownerUserId', v)} clientId={clientId} empty="No owner (gap)" error={f.fieldError('ownerUserId')} />}
        <SelectInput label="Responsible party" value={f.values.responsibleParty} onChange={v => f.set('responsibleParty', v)} options={enumOptions(parties)} empty={null} />
        {!hasOwner && <UserPicker label="Internal coordinator" required value={f.values.coordinatorUserId} onChange={v => f.set('coordinatorUserId', v)} clientId={clientId} error={f.fieldError('coordinatorUserId')} empty="— Select —"
          hint="Without a technical owner, someone in the team follows up the gap." />}
      </FormSection>
      {!logical && <HostedMicroservicesEditor h={hostedMs} error={f.fieldError('microservices')} />}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{asset ? 'Save server' : 'Add server'}</button></div>
    </Dialog>
  );
}

type InstDto = {
  id: number; instanceName: string; deployedOn?: string; supportNotes?: string; lastReviewedAt?: string;
  environment: { id: number; name: string; type: string; clientId: number; clientCode: string; clientName: string; region?: { id: number; code: string } };
  product: { id: number; code: string; name: string }; module?: { code: string }; version?: { id: number; version: string }; owner?: UserRef;
  components: { id: number; name: string; role: string; componentVersion?: string; owner?: UserRef; hosts: { assetId: number; name: string; type: string; lifecycle: string }[] }[];
  versionHistory: { id: number; from?: string; to?: string; reason: string; evidence: string; deployedOn?: string; changedAt: string; changedBy?: string }[]; etag: string;
};

type Deployment = {
  installationId: number; productId: number;
  microservices: { id: number; name: string; description?: string; module?: string; role?: string; isActive: boolean; componentId?: number; serverIds: number[] }[];
  servers: { id: number; name: string; type: string; role?: string; lifecycle: string; microserviceIds: number[]; versions: { microserviceId: number; version: string }[]; otherComponents: { id: number; name: string; role: string }[] }[];
  notDeployed: string[];
};

/** Which product microservice runs on which server of this installation's environment. */
function DeploymentPanel({ installationId, productId, productCode, canEdit }: { installationId: number; productId: number; productCode: string; canEdit: boolean }) {
  const T = useTypes();
  const q = useQuery({ queryKey: ['deployment', installationId], queryFn: () => get<Deployment>(`/installations/${installationId}/deployment`) });
  const [server, setServer] = useState<Deployment['servers'][number] | null>(null);
  const d = q.data;
  const nameOf = (id: number) => d?.microservices.find(m => m.id === id)?.name ?? `#${id}`;
  return (
    <Panel title="Microservice deployment" pad={false}>
      <QueryState q={q}>{d && (<>
        {d.microservices.length === 0 ? (
          <StateMessage kind="none">{productCode} has no microservices defined yet. <Link to={`/products/${productId}`}>Add them on the product page</Link>, then choose which ones run on each server here.</StateMessage>
        ) : d.notDeployed.length > 0 && (
          <div className="notice warn" style={{ margin: 12 }}>Not running on any server of this environment: {d.notDeployed.join(', ')}.</div>
        )}
        {d.servers.length === 0 ? <StateMessage kind="none">No servers recorded in this environment. Add them under the environment's infrastructure first.</StateMessage> : (
          <DataTable rowKey={x => x.id} rows={d.servers} caption="Microservices per server" columns={[
            { key: 's', header: 'Server', render: x => <><Link to={`/assets/${x.id}`}>{x.name}</Link><div className="hint">{T.name('AssetType', x.type)}{x.role ? ` · ${x.role}` : ''}</div></> },
            { key: 'm', header: 'Microservices', render: x => (x.microserviceIds.length === 0 && x.otherComponents.length === 0) ? <span className="muted">None</span> : <>
              {x.microserviceIds.map(id => { const v = x.versions.find(y => y.microserviceId === id)?.version;
                return <span key={id} className="chip mono" style={{ marginRight: 6 }} title={v ? `Deployed version ${v}` : 'Deployed version not recorded'}>{nameOf(id)}{v ? ` · ${v}` : ''}</span>; })}
              {x.otherComponents.map(c => <span key={c.id} className="chip" style={{ marginRight: 6 }} title="Component not linked to a catalogue microservice">{c.name}</span>)}
            </> },
            { key: 'a', header: '', render: x => canEdit && d.microservices.length > 0 && <button className="linkbtn" onClick={() => setServer(x)}>Choose microservices</button> }
          ]} />
        )}
        {server && <DeploymentDialog installationId={installationId} server={server} microservices={d.microservices} onClose={() => setServer(null)} />}
      </>)}</QueryState>
    </Panel>
  );
}

function DeploymentDialog({ installationId, server, microservices, onClose }: { installationId: number; server: Deployment['servers'][number]; microservices: Deployment['microservices']; onClose: () => void }) {
  const f = useForm({ ids: server.microserviceIds });
  const toast = useToast();
  const refresh = useRefresh();
  const shown = microservices.filter(m => m.isActive || server.microserviceIds.includes(m.id));
  const toggle = (id: number, on: boolean) => f.set('ids', on ? [...f.values.ids, id] : f.values.ids.filter(x => x !== id));
  const save = async () => {
    const ok = await f.submit(v => put(`/installations/${installationId}/deployment/${server.id}`, { microserviceIds: v.ids }).then(() => true));
    if (ok) { toast(`Microservices on ${server.name} saved.`); refresh(); onClose(); }
  };
  return (
    <Dialog title={`Microservices on ${server.name}`} onClose={onClose}>
      <p className="hint" style={{ marginTop: 0 }}>Tick every microservice of this installation that runs on this server. A microservice can run on several servers.</p>
      <FormError error={f.error} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="sr">Microservices</legend>
        {shown.map(m => (
          <label key={m.id} className="check" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
            <input type="checkbox" checked={f.values.ids.includes(m.id)} onChange={e => toggle(m.id, e.target.checked)} />
            <span><b className="mono">{m.name}</b>{m.module && <span className="muted"> · {m.module}</span>}{m.role && <span className="muted"> · {m.role}</span>}{!m.isActive && <span className="muted"> · retired</span>}
              {m.description && <div className="hint">{m.description}</div>}
              {m.serverIds.filter(s => s !== server.id).length > 0 && <div className="hint">Also on {m.serverIds.filter(s => s !== server.id).length} other server(s)</div>}</span>
          </label>
        ))}
      </fieldset>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save</button></div>
    </Dialog>
  );
}

export function InstallationDetail() {
  const T = useTypes();
  const { id } = useParams();
  const q = useQuery({ queryKey: ['installation', id], queryFn: () => get<InstDto>(`/installations/${id}`) });
  const ref = useReference().data;
  const canEng = usePermission('Installations', 'Maintain');
  const canCreateComponent = usePermission('Servers', 'Create');
  const canClone = usePermission('Installations', 'Create');
  const canArchive = usePermission('Installations', 'ArchiveRestore');
  const [dialog, setDialog] = useState<string | null>(null);
  const i = q.data;
  const versions = ref?.products.find(p => p.id === i?.product.id)?.versions ?? [];
  return (
    <QueryState q={q}>{i && (<>
      <PageHead title={`${i.product.code} · ${i.instanceName}`} crumbs={[{ to: `/clients/${i.environment.clientId}`, label: i.environment.clientCode }, ...(i.environment.region ? [{ to: `/regions/${i.environment.region.id}`, label: i.environment.region.code }] : []), { to: `/environments/${i.environment.id}`, label: i.environment.name }, { label: i.instanceName }]}
        sub={<>Installation in {i.environment.name} ({label(i.environment.type)}) · version <span className="chip">{i.version?.version ?? 'Unknown'}</span></>}
        actions={<>{canEng && <button className="btn" onClick={() => setDialog('version')}>Confirm version change</button>}{canCreateComponent && <button className="btn" onClick={() => setDialog('component')}>+ Component</button>}
          <Menu label="More" items={[{ label: 'Copy to other environments…', onClick: () => setDialog('clone'), hidden: !canClone }, { label: 'Archive installation…', onClick: () => setDialog('archive'), danger: true, hidden: !canArchive }]} /><DeleteAction button path={`/installations/${i.id}`} what={`installation ${i.instanceName}`} afterTo={`/environments/${i.environment.id}`} /></>} />
      <div className="cols">
        <Panel title="Installation"><DL items={[
          ['Product', `${i.product.code} · ${i.product.name}`], ['Module', i.module?.code ?? 'None'], ['Installed version', i.version?.version ?? <Badge tone="warn">Unknown</Badge>],
          ['Deployed on', i.deployedOn ? fmtDate(i.deployedOn) : null], ['Owner', <Person u={i.owner} gap="Environment owner" />], ['Last confirmed', <When v={i.lastReviewedAt} />], ['Support notes', i.supportNotes],
        ]} /></Panel>
        <Panel title="Version history (explicit confirmations)">
          {i.versionHistory.length === 0 ? <StateMessage kind="none">No version confirmations recorded.</StateMessage> :
            <ul className="timeline">{i.versionHistory.map(h => <li key={h.id}><b>{h.from ?? 'Unknown'} → {h.to ?? 'Unknown'}</b> — {h.reason}<div className="when">evidence: {h.evidence} · {h.changedBy} · <When v={h.changedAt} /></div></li>)}</ul>}
        </Panel>
      </div>
      <DeploymentPanel installationId={i.id} productId={i.product.id} productCode={i.product.code} canEdit={canEng} />
      <Panel title="All components and their servers" pad={false}>
        <DataTable rowKey={c => c.id} rows={i.components} columns={[
          { key: 'n', header: 'Component', render: c => <Link to={`/components/${c.id}`}>{c.name}</Link> }, { key: 'r', header: 'Role', render: c => c.role },
          { key: 'v', header: 'Component version', render: c => c.componentVersion ?? <span className="muted">Not recorded (product version is not copied)</span> },
          { key: 'h', header: 'Hosts', render: c => c.hosts.length === 0 ? <Badge tone="warn">Hosting unresolved</Badge> : c.hosts.map(h => <span key={h.assetId} style={{ marginRight: 8 }}><Link to={`/assets/${h.assetId}`}>{h.name}</Link> <span className="chip">{T.name('AssetType', h.type)}</span></span>) },
          { key: 'o', header: 'Owner', render: c => <Person u={c.owner} /> }, { key: 'del', header: '', className: 'row-actions', render: c => <DeleteAction path={`/components/${c.id}`} what={`component ${c.name}`} /> }
        ]} />
      </Panel>
      <AttachmentsPanel recordType="Installation" recordId={i.id} />
      {dialog === 'version' && <ActionDialog title="Confirm version change" path={`/installations/${i.id}/version`} version={i.etag} onClose={() => setDialog(null)} submitLabel="Confirm version"
        intro="Version changes need a reason and evidence; old and new values are kept. A downgrade alone is not treated as a rollback."
        fields={[{ name: 'productVersionId', label: `New ${i.product.code} version`, kind: 'select', options: [{ value: '', label: 'Unknown' }, ...versions.map(v => ({ value: String(v.id), label: v.version }))] },
          { name: 'reason', label: 'Reason', kind: 'textarea', required: true }, { name: 'evidence', label: 'Evidence or reference (optional)' }, { name: 'deployedOn', label: 'Deployed on', kind: 'date' }]}
        transform={v => ({ productVersionId: toNum(v.productVersionId), reason: v.reason, evidence: v.evidence, deployedOn: v.deployedOn || null })} />}
      {dialog === 'component' && <ComponentDialog installationId={i.id} environmentId={i.environment.id} clientId={i.environment.clientId} onClose={() => setDialog(null)} />}
      {dialog === 'clone' && <CloneDialog sourceEnvironmentId={i.environment.id} clientId={i.environment.clientId} sourceRegionCode={i.environment.region?.code} installationIds={[i.id]} onClose={() => setDialog(null)} />}
      {dialog === 'archive' && <ArchiveDialog what="installation" path={`/installations/${i.id}/archive`} version={i.etag} onClose={() => setDialog(null)} />}
    </>)}</QueryState>
  );
}

function ComponentDialog({ installationId, environmentId, clientId, component, onClose }: { installationId: number; environmentId: number; clientId: number; component?: CompDto; onClose: () => void }) {
  const T = useTypes();
  const roles = useLookup('ComponentRole', component?.role);
  const assets = useQuery({ queryKey: ['assets-of', environmentId], queryFn: () => get<Paged<{ id: number; name: string; type: string }>>(`/assets?environmentId=${environmentId}&pageSize=200`) });
  const f = useForm({ name: component?.name ?? '', role: component?.role ?? '', componentVersion: component?.componentVersion ?? '', ownerUserId: component?.owner?.id ?? null as number | null, hostAssetIds: component?.hosts.map(h => h.assetId) ?? [] as number[] });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const body = { installationId, ...f.values };
    const ok = await f.submit(() => (component ? put(`/components/${component.id}`, body, component.version) : post('/components', body)).then(() => true));
    if (ok) { toast('Component saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={component ? 'Edit component' : 'Add component'} onClose={onClose}>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Component name" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} />
        <SelectInput label="Role" required value={f.values.role} onChange={v => f.set('role', v)} options={roles.map(r => ({ value: r.code, label: r.label }))} error={f.fieldError('role')} />
        <TextInput label="Component version" value={f.values.componentVersion} onChange={v => f.set('componentVersion', v)} hint="Optional; the product version is not copied automatically." />
        <UserPicker label="Owner" value={f.values.ownerUserId} onChange={v => f.set('ownerUserId', v)} clientId={clientId} empty="Environment owner" />
        <fieldset className="wide" style={{ border: 0, padding: 0 }}><legend className="flabel">Hosting assets (one or more; same environment)</legend>
          {(assets.data?.items ?? []).length === 0 && <span className="muted">No assets recorded in this environment yet.</span>}
          {(assets.data?.items ?? []).map(a => <label key={a.id} className="check" style={{ marginRight: 14 }}><input type="checkbox" checked={f.values.hostAssetIds.includes(a.id)}
            onChange={e => f.set('hostAssetIds', e.target.checked ? [...f.values.hostAssetIds, a.id] : f.values.hostAssetIds.filter(x => x !== a.id))} /> {a.name} <span className="chip">{T.name('AssetType', a.type)}</span></label>)}
          {f.fieldError('hostAssetIds') && <div className="err">{f.fieldError('hostAssetIds')}</div>}
        </fieldset>
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save component</button></div>
    </Dialog>
  );
}

type CompDto = { id: number; name: string; role: string; componentVersion?: string; installationId: number; installationName: string; productCode: string; environmentId: number; clientId: number; owner?: UserRef; hosts: { assetId: number; name: string; type: string }[]; version: string };

export function ComponentDetail() {
  const T = useTypes();
  const { id } = useParams();
  const q = useQuery({ queryKey: ['component', id], queryFn: () => get<CompDto>(`/components/${id}`) });
  const canEng = usePermission('Servers', 'Maintain');
  const [edit, setEdit] = useState(false);
  const c = q.data;
  return (
    <QueryState q={q}>{c && (<>
      <PageHead title={c.name} crumbs={[{ to: `/environments/${c.environmentId}`, label: 'Environment' }, { to: `/installations/${c.installationId}`, label: `${c.productCode} · ${c.installationName}` }, { label: c.name }]}
        sub={`Component · ${c.role}`} actions={<>{canEng && <button className="btn" onClick={() => setEdit(true)}>Edit</button>}<DeleteAction button path={`/components/${c.id}`} what={`component ${c.name}`} afterTo={`/installations/${c.installationId}`} /></>} />
      <Panel title="Component"><DL items={[['Role', c.role], ['Component version', c.componentVersion ?? 'Not recorded'], ['Owner', <Person u={c.owner} gap="Environment owner" />],
        ['Supporting servers', c.hosts.length ? c.hosts.map(h => <div key={h.assetId}><Link to={`/assets/${h.assetId}`}>{h.name}</Link> ({T.name('AssetType', h.type)})</div>) : <Badge tone="warn">Hosting unresolved</Badge>]]} /></Panel>
      <AttachmentsPanel recordType="Component" recordId={c.id} />
      <HistoryPanel entityType="Component" entityId={c.id} />
      {edit && <ComponentDialog installationId={c.installationId} environmentId={c.environmentId} clientId={c.clientId} component={c} onClose={() => setEdit(false)} />}
    </>)}</QueryState>
  );
}

export function AssetDetail() {
  const T = useTypes();
  const { id } = useParams();
  const q = useQuery({ queryKey: ['asset', id], queryFn: () => get<AssetDto>(`/assets/${id}`) });
  const canEng = usePermission('Servers', 'Maintain');
  const canClone = usePermission('Servers', 'Create');
  const canArchive = usePermission('Servers', 'ArchiveRestore');
  const [dialog, setDialog] = useState<string | null>(null);
  const a = q.data;
  return (
    <QueryState q={q}>{a && (<>
      <PageHead title={a.name} crumbs={[{ to: `/clients/${a.environment.clientId}`, label: a.environment.clientCode }, { to: `/environments/${a.environment.id}`, label: a.environment.name }, { label: a.name }]}
        sub={<>{T.name('AssetType', a.type)} · {a.role ?? 'Role not recorded'} · <StatusBadge value={a.lifecycle} /></>}
        actions={<>{canEng && <button className="btn" onClick={() => setDialog('edit')}>Edit</button>}{canEng && <button className="btn" onClick={() => setDialog('volume')}>+ Volume</button>}
          <Menu label="More" items={[{ label: 'Copy to other environments…', onClick: () => setDialog('clone'), hidden: !canClone }, { label: 'Archive server…', onClick: () => setDialog('archive'), danger: true, hidden: !canArchive }]} /><DeleteAction button path={`/assets/${a.id}`} what={`server ${a.name}`} afterTo={`/environments/${a.environment.id}`} /></>} />
      <div className="cols">
        <Panel title="Recorded specification">
          <DL items={[
            ['CPU', T.category('AssetType', a.type) === 'LogicalEndpoint' ? 'Not applicable (logical endpoint)' : qty(a.cpuQuantity, a.cpuUnit)], ['RAM', T.category('AssetType', a.type) === 'LogicalEndpoint' ? 'Not applicable' : qty(a.ramQuantity, a.ramUnit)],
            ['OS', a.osFamily ? `${a.osFamily} ${a.osVersion ?? ''}` : null], ['Network zone', a.technicalRestricted ? <span className="muted">Restricted (Technical detail)</span> : a.networkZone ?? 'Unknown'],
            ['Project phase', a.projectPhase], ['Technical owner', a.ownerName ? a.ownerName : <Person u={a.owner} gap="No owner (gap)" />], ['Last verified', <When v={a.verifiedAt} />]
          ]} />
          <p className="hint" style={{ marginTop: 8 }}>Recorded provisioning, not measured utilization.</p>
        </Panel>
        <Panel title="Technical owner">
          {a.ownerDetails ? <ContactCard c={a.ownerDetails} notes={a.ownerContact} />
            : a.owner ? <><Person u={a.owner} /><div className="hint">Team member</div></> : <StateMessage kind="none">No technical owner recorded (gap).</StateMessage>}
          <DL items={[['Responsible party', label(a.responsibleParty)], ['Organization', a.responsibleOrganization]]} />
        </Panel>
      </div>
      <Panel title="Volumes" pad={false}>
        <DataTable rowKey={v => v.id} rows={a.volumes} columns={[
          { key: 'l', header: 'Label', render: v => v.label }, { key: 'c', header: 'Capacity', render: v => qty(v.capacity, v.unit) }, { key: 'p', header: 'Purpose', render: v => v.purpose },
          { key: 's', header: 'Shared storage', render: v => v.sharedStorageName ? <><span className="chip">{v.sharedStorageName}</span> <span className="hint">counted once in totals</span></> : 'Dedicated' },
          { key: 'del', header: '', className: 'row-actions', render: v => <DeleteAction path={`/volumes/${v.id}`} what={`volume ${v.label}`} /> }
        ]} />
      </Panel>
      {T.category('AssetType', a.type) !== 'LogicalEndpoint' && <HostedMicroservicesPanel asset={a} canEdit={canEng} />}
      <Panel title="Hosted components" pad={false}>
        <DataTable rowKey={c => c.componentId} rows={a.components} columns={[
          { key: 'c', header: 'Component', render: c => <Link to={`/components/${c.componentId}`}>{c.name}</Link> }, { key: 'r', header: 'Role', render: c => c.role },
          { key: 'i', header: 'Installation', render: c => <Link to={`/installations/${c.installationId}`}>{c.productCode} · {c.installationName}</Link> }
        ]} />
      </Panel>
      <Panel title="Firewall rules (from and to this server)" pad={false}><FirewallRulesPanel assetId={a.id} clientId={a.environment.clientId} /></Panel>
      <AttachmentsPanel recordType="Asset" recordId={a.id} />
      <HistoryPanel entityType="Asset" entityId={a.id} />
      {dialog === 'edit' && <AssetDialog environmentId={a.environment.id} clientId={a.environment.clientId} asset={a} onClose={() => setDialog(null)} />}
      {dialog === 'volume' && <VolumeDialog assetId={a.id} clientId={a.environment.clientId} onClose={() => setDialog(null)} />}
      {dialog === 'clone' && <CloneDialog sourceEnvironmentId={a.environment.id} clientId={a.environment.clientId} sourceRegionCode={a.environment.regionCode} assetIds={[a.id]} onClose={() => setDialog(null)} />}
      {dialog === 'archive' && <ArchiveDialog what="asset" path={`/assets/${a.id}/archive`} version={a.version} onClose={() => setDialog(null)} />}
    </>)}</QueryState>
  );
}

function VolumeDialog({ assetId, clientId, onClose }: { assetId: number; clientId: number; onClose: () => void }) {
  const shared = useQuery({ queryKey: ['shared', clientId], queryFn: () => get<{ id: number; name: string; capacity?: number; unit?: string }[]>(`/shared-storage?clientId=${clientId}`) });
  const f = useForm({ label: '', capacity: '', unit: '', purpose: '', sharedStorageId: '' });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const v = f.values;
    const ok = await f.submit(() => post(`/assets/${assetId}/volumes`, { label: v.label, capacity: v.capacity === '' ? null : Number(v.capacity), unit: v.unit || null, purpose: v.purpose, sharedStorageId: toNum(v.sharedStorageId) }).then(() => true));
    if (ok) { toast('Volume added.'); refresh(); onClose(); }
  };
  return (
    <Dialog title="Add volume" onClose={onClose} wide>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Label" required value={f.values.label} onChange={v => f.set('label', v)} error={f.fieldError('label')} />
        <TextInput label="Capacity" type="number" value={f.values.capacity} onChange={v => f.set('capacity', v)} error={f.fieldError('capacity')} hint="Empty when unknown." />
        <SelectInput label="Unit" value={f.values.unit} onChange={v => f.set('unit', v)} options={['GB', 'GiB', 'TB', 'TiB'].map(u => ({ value: u, label: u }))} empty="—" error={f.fieldError('unit')} />
        <TextInput label="Purpose" value={f.values.purpose} onChange={v => f.set('purpose', v)} />
        <SelectInput label="Shared storage" value={f.values.sharedStorageId} onChange={v => f.set('sharedStorageId', v)} options={(shared.data ?? []).map(s => ({ value: String(s.id), label: `${s.name} (${qty(s.capacity, s.unit)})` }))} empty="Dedicated" hint="Shared capacity is counted once, however many volumes use it." />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Add volume</button></div>
    </Dialog>
  );
}

type AssetRow = { ownerName?: string; id: number; name: string; type: string; role?: string; projectPhase?: string; lifecycle: string; networkZone?: string; networkZoneRestricted: boolean; environmentId: number; environmentName: string; clientId: number; clientCode: string; regionCode?: string; cpuQuantity?: number; cpuUnit?: string; ramQuantity?: number; ramUnit?: string; osFamily?: string; verifiedAt?: string; owner?: UserRef; componentCount: number; volumeCount: number; placeholderFlag: boolean };

export function AssetList() {
  const T = useTypes();
  // A73: country comes from the client map's "View all servers" link (the client's country).
  const [f, set] = useUrlState({ clientId: '', regionId: '', environmentId: '', productId: '', type: '', lifecycle: '', role: '', phase: '', q: '', country: '', page: '1', pageSize: '15' });
  const filters = { clientId: f.clientId, regionId: f.regionId, environmentId: f.environmentId, productId: f.productId, type: f.type, lifecycle: f.lifecycle, role: f.role, phase: f.phase };
  const q = useQuery({ queryKey: ['assets', f], queryFn: () => get<Paged<AssetRow>>(`/assets${qs(f)}`) });
  const sum = useQuery({ queryKey: ['infra', filters], queryFn: () => get<Infra>(`/infrastructure/summary${qs(filters)}`) });
  const clients = useClientOptions();
  const products = useProductOptions();
  const lifecycles = useEnum('AssetLifecycle');
  const roles = useLookup('AssetRole');
  const phases = useLookup('ProjectPhase');
  const me = useMe().data!;
  return (
    <>
      <PageHead title="Infrastructure assets" crumbs={[{ to: '/clients', label: 'Clients' }, { to: '/environments', label: 'Environments' }, { label: 'Assets' }]} sub="Recorded provisioning by client, region, environment, product, phase, role and lifecycle."
        actions={me.grants.export && <button className="btn" onClick={() => exportCsv('assets', filters)}>Export CSV</button>} />
      {f.country && <div className="notice" role="status">Servers of clients in {f.country}. <button className="linkbtn" onClick={() => set({ country: '', page: '1' })}>Show every country</button></div>}
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized clients" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
        <SelectInput label="Role" value={f.role} onChange={v => set({ role: v })} options={roles.map(r => ({ value: r.code, label: r.label }))} empty="All roles" />
        <SelectInput label="Project phase" value={f.phase} onChange={v => set({ phase: v })} options={phases.map(r => ({ value: r.code, label: r.label }))} empty="All phases" />
      </div>
      <Panel title="Totals for the current filter">{sum.data ? <InfraSummary i={sum.data} /> : <StateMessage kind="loading" />}</Panel>
      <DataTable<AssetRow> rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={Object.values(filters).some(Boolean) || f.q ? 'nomatch' : 'none'}
        columns={[
          { key: 'name', header: 'Asset', render: r => <Link to={`/assets/${r.id}`}>{r.name}</Link>, filter: <input className="input" aria-label="Search assets" placeholder="Search by name" value={f.q} onChange={e => set({ q: e.target.value })} /> },
          { key: 'client', header: 'Client / environment', render: r => <><ClientDisplay id={r.clientId} code={r.clientCode} />{r.regionCode && ` / ${r.regionCode}`} / <Link to={`/environments/${r.environmentId}`}>{r.environmentName}</Link></> },
          { key: 'type', header: 'Type', render: r => T.name('AssetType', r.type), filter: <select className="input" aria-label="Filter by type" value={f.type} onChange={e => set({ type: e.target.value })}><option value="">All</option>{T.filterOptions('AssetType').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> },
          { key: 'role', header: 'Role', render: r => r.role },
          { key: 'life', header: 'Lifecycle', render: r => <StatusBadge value={r.lifecycle} />, filter: <select className="input" aria-label="Filter by lifecycle" value={f.lifecycle} onChange={e => set({ lifecycle: e.target.value })}><option value="">All</option>{lifecycles.map(t => <option key={t}>{t}</option>)}</select> },
          { key: 'zone', header: 'Zone', render: r => r.networkZoneRestricted ? <span className="muted">Restricted</span> : r.networkZone },
          { key: 'cpu', header: 'CPU', render: r => T.category('AssetType', r.type) === 'LogicalEndpoint' ? <span className="muted">n/a</span> : qty(r.cpuQuantity, r.cpuUnit) },
          { key: 'ram', header: 'RAM', render: r => T.category('AssetType', r.type) === 'LogicalEndpoint' ? <span className="muted">n/a</span> : qty(r.ramQuantity, r.ramUnit) },
          { key: 'comp', header: 'Components', className: 'num', render: r => r.componentCount },
          { key: 'flag', header: 'Flags', render: r => <>{!r.verifiedAt && <Badge tone="neutral">Unverified</Badge>}</> },
          { key: 'owner', header: 'Owner', render: r => r.ownerName ?? <Person u={r.owner} gap="No owner" /> }, { key: 'del', header: '', className: 'row-actions', render: r => <DeleteAction path={`/assets/${r.id}`} what={`server ${r.name}`} /> }
        ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
    </>
  );
}

type Cell = { id: number; instanceName: string; environmentId: number; environmentName: string; environmentType: string; clientId: number; clientCode: string; regionCode?: string; productId: number; productCode: string; moduleCode?: string; version: string; versionUnknown: boolean; lastReviewedAt?: string; freshness: FreshnessT };
type Matrix = { cells: Cell[]; summary: { productId: number; productCode: string; installations: number; environments: number; unknownVersion: number; notReviewed: number; versions: { version: string; installations: number; environments: number }[] }[]; evaluatedAt: string };

export function VersionMatrix() {
  const T = useTypes();
  const [f, set] = useUrlState({ clientId: '', productId: '', environmentType: '', country: '' });
  const q = useQuery({ queryKey: ['matrix', f], queryFn: () => get<Matrix>(`/version-matrix${qs(f)}`) });
  const clients = useClientOptions();
  const products = useProductOptions();
  const me = useMe().data!;
  const m = q.data;
  const envs = m ? [...new Map(m.cells.map(c => [c.environmentId, c])).values()] : [];
  const prods = m ? [...new Map(m.cells.map(c => [c.productId, c.productCode])).entries()] : [];
  return (
    <>
      <PageHead title="Product version matrix" crumbs={[{ to: '/clients', label: 'Clients' }, { to: '/environments', label: 'Environments' }, { label: 'Version matrix' }]} sub="Versions are compared only within the same product. An environment with several installations is counted once in environment totals."
        actions={me.grants.export && <button className="btn" onClick={() => exportCsv('versions', f)}>Export CSV</button>} />
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized clients" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
        <SelectInput label="Environment type" value={f.environmentType} onChange={v => set({ environmentType: v })} options={T.filterOptions('EnvironmentType')} empty="All types" />
      </div>
      <QueryState q={q}>{m && (<>
        <Panel title="Product coverage" pad={false}>
          <DataTable rowKey={s => s.productId} rows={m.summary} empty={Object.values(f).some(Boolean) ? 'nomatch' : 'none'} columns={[
            { key: 'p', header: 'Product', render: s => s.productCode }, { key: 'i', header: 'Installations', className: 'num', render: s => s.installations },
            { key: 'e', header: 'Environments (distinct)', className: 'num', render: s => s.environments },
            { key: 'v', header: 'By version (installations / environments)', render: s => s.versions.map(v => <span key={v.version} className="chip" style={{ marginRight: 4 }}>{v.version}: {v.installations} / {v.environments}</span>) },
            { key: 'u', header: 'Unknown version', className: 'num', render: s => s.unknownVersion ? <Badge tone="warn">{s.unknownVersion}</Badge> : 0 },
            { key: 'r', header: 'Never confirmed', className: 'num', render: s => s.notReviewed }
          ]} />
        </Panel>
        <Panel title="Matrix (environment × product)" pad={false}>
          {envs.length === 0 ? <div className="panel-body"><StateMessage kind={Object.values(f).some(Boolean) ? 'nomatch' : 'none'} /></div> : (
            <DataTable caption="Environment by product matrix" rows={envs} rowKey={e => e.environmentId} columns={[
              { key: 'client', header: 'Client', render: e => <ClientDisplay id={e.clientId} code={e.clientCode} /> },
              { key: 'region', header: 'Region', render: e => e.regionCode ?? <span className="muted">Direct</span> },
              { key: 'environment', header: 'Environment', render: e => <><Link to={`/environments/${e.environmentId}`}>{e.environmentName}</Link> <span className="chip">{T.name('EnvironmentType', e.environmentType)}</span></> },
              ...prods.map(([pid, code]) => ({ key: `product-${pid}`, header: code, render: (e: typeof envs[number]) => m.cells.filter(c => c.environmentId === e.environmentId && c.productId === pid).map(c => (
                <div key={c.id}><Link to={`/installations/${c.id}`}>{c.instanceName}</Link>: {c.versionUnknown ? <Badge tone="warn">Unknown</Badge> : <span className="chip">{c.version}</span>} <FreshnessBadge f={c.freshness} /></div>)) }))
            ]} />
          )}
        </Panel>
      </>)}</QueryState>
    </>
  );
}

/** Same rule as the server: case-insensitive find, replacement follows the case of each match (r1→r2, R1→R2). */
export function renameCopy(name: string, find: string, replace: string) {
  if (!find) return name;
  const esc = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return name.replace(new RegExp(esc, 'gi'), m => m === m.toUpperCase() && m !== m.toLowerCase() ? replace.toUpperCase()
    : m === m.toLowerCase() && m !== m.toUpperCase() ? replace.toLowerCase() : replace);
}

type CloneResult = { targetEnvironmentId: number; assets: { id: number; name: string }[]; installations: { id: number; name: string }[]; notes: string[]; targets?: number };
type CloneTargetRow = { id: number; find: string; replace: string };

/**
 * A28: copy servers and installations of one environment into another environment of the same client (for example another region).
 * A30: from the environment page, the whole environment can be copied as a new environment in another region (all servers and installations preselected).
 */
export function CloneDialog({ sourceEnvironmentId, clientId, sourceRegionCode, sourceName, wholeEnvironment = false, assetIds = [], installationIds = [], onClose }:
  { sourceEnvironmentId: number; clientId: number; sourceRegionCode?: string; sourceName?: string; wholeEnvironment?: boolean; assetIds?: number[]; installationIds?: number[]; onClose: () => void }) {
  const lifecycles = useEnum('AssetLifecycle');
  const canCreateEnvironment = usePermission('Environments', 'Create');
  const canCreateServer = usePermission('Servers', 'Create');
  const canMaintainServer = usePermission('Servers', 'Maintain');
  const canCreateInstallation = usePermission('Installations', 'Create');
  const [mode, setMode] = useState<'new' | 'existing'>(wholeEnvironment && canCreateEnvironment ? 'new' : 'existing');
  const regions = useQuery({ queryKey: ['regions', clientId], queryFn: () => get<{ id: number; code: string; name: string }[]>(`/clients/${clientId}/regions`), enabled: wholeEnvironment });
  const envs = useQuery({ queryKey: ['envs-of', clientId], queryFn: () => get<Paged<{ id: number; name: string; regionCode?: string }>>(`/environments?clientId=${clientId}&pageSize=200`) });
  const assets = useQuery({ queryKey: ['clone-assets', sourceEnvironmentId], queryFn: () => get<Paged<{ id: number; name: string; type: string; role?: string }>>(`/assets?environmentId=${sourceEnvironmentId}&pageSize=200`) });
  const insts = useQuery({ queryKey: ['clone-insts', sourceEnvironmentId], queryFn: () => get<Paged<{ id: number; instanceName: string; productCode: string; version?: string }>>(`/installations?environmentId=${sourceEnvironmentId}&pageSize=200`) });
  const f = useForm({
    targetEnvironmentId: '', regionId: '', name: sourceName ?? '', assetIds: canCreateServer ? assetIds : [], installationIds: canCreateInstallation ? installationIds : [], find: '', replace: '', lifecycle: 'Planned',
    includeVolumes: true, includeDeployment: canCreateServer, copyVersions: false, versionEvidence: '',
    // A45: several targets at once, each with its own rename rule.
    targets: [] as CloneTargetRow[]
  });
  const [result, setResult] = useState<CloneResult | null>(null);
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  // A45: every environment of the client is a possible target, the source too (a duplicate under a new name).
  const allEnvs = envs.data?.items ?? [];
  const byRegion = [...new Set(allEnvs.map(e => e.regionCode ?? ''))].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
    .map(code => ({ code, envs: allEnvs.filter(e => (e.regionCode ?? '') === code).sort((a, b) => a.name.localeCompare(b.name)) }));
  const firstName = () => (assets.data?.items ?? []).find(a => f.values.assetIds.includes(a.id))?.name ?? (insts.data?.items ?? []).find(i => f.values.installationIds.includes(i.id))?.instanceName ?? '';
  /** Suggested rename: R1 → R2 between regions; APP1 → APP2 inside the same environment; nothing otherwise. */
  const suggest = (env: { id: number; regionCode?: string }): CloneTargetRow => {
    if (env.id === sourceEnvironmentId) {
      // The next number not yet used in this environment: app01 → app02, or app03 when app02 exists.
      const first = firstName();
      const m = first.match(/([A-Za-z]*)(\d+)$/);
      if (!m) return { id: env.id, find: '', replace: '' };
      const taken = new Set([...(assets.data?.items ?? []).map(a => a.name.toLowerCase()), ...(insts.data?.items ?? []).map(i => i.instanceName.toLowerCase())]);
      let n = Number(m[2]) + 1;
      const next = () => `${m[1]}${String(n).padStart(m[2].length, '0')}`;
      while (taken.has(renameCopy(first, m[0], next()).toLowerCase()) && n < Number(m[2]) + 500) n++;
      return { id: env.id, find: m[0], replace: next() };
    }
    const srcRegion = sourceRegionCode ?? allEnvs.find(e => e.id === sourceEnvironmentId)?.regionCode;
    if (srcRegion && env.regionCode && env.regionCode !== srcRegion) return { id: env.id, find: srcRegion, replace: env.regionCode };
    return { id: env.id, find: '', replace: '' };
  };
  const isTarget = (id: number) => f.values.targets.some(t => t.id === id);
  const toggleTarget = (env: { id: number; regionCode?: string }, on: boolean) =>
    f.set('targets', on ? [...f.values.targets, suggest(env)] : f.values.targets.filter(t => t.id !== env.id));
  const setTarget = (id: number, patch: Partial<CloneTargetRow>) => f.set('targets', f.values.targets.map(t => (t.id === id ? { ...t, ...patch } : t)));
  const envLabel = (id: number) => { const e = allEnvs.find(x => x.id === id); return e ? `${e.regionCode ? `${e.regionCode} / ` : ''}${e.name}${id === sourceEnvironmentId ? ' (this environment)' : ''}` : `#${id}`; };
  // Copying the whole environment starts with everything selected.
  const [preselected, setPreselected] = useState(false);
  useEffect(() => {
    if (wholeEnvironment && mode === 'new' && !preselected && assets.data && insts.data) {
      f.set('assetIds', canCreateServer ? assets.data.items.map(a => a.id) : []);
      f.set('installationIds', canCreateInstallation ? insts.data.items.map(i => i.id) : []);
      setPreselected(true);
    }
  }, [assets.data, insts.data]); // eslint-disable-line react-hooks/exhaustive-deps
  // Whole environment = everything; an existing environment = only what the user ticks.
  const switchMode = (m: 'new' | 'existing') => {
    setMode(m);
    setPreselected(true);
    f.set('assetIds', canCreateServer ? (m === 'new' ? (assets.data?.items ?? []).map(a => a.id) : assetIds) : []);
    f.set('installationIds', canCreateInstallation ? (m === 'new' ? (insts.data?.items ?? []).map(i => i.id) : installationIds) : []);
  };
  const pickRegion = (v: string) => {
    f.set('regionId', v);
    const r = regions.data?.find(x => String(x.id) === v);
    if (sourceRegionCode && r && r.code !== sourceRegionCode && !f.values.find) { f.set('find', sourceRegionCode); f.set('replace', r.code); }
  };
  const toggle = (key: 'assetIds' | 'installationIds', id: number, on: boolean) => f.set(key, on ? [...f.values[key], id] : f.values[key].filter(x => x !== id));
  const newName = (n: string) => renameCopy(n, f.values.find, f.values.replace);
  const save = async () => {
    const v = f.values;
    const common = {
      assetIds: v.assetIds, installationIds: v.installationIds, find: v.find || null, replace: v.replace || null,
      lifecycle: v.lifecycle, includeVolumes: v.includeVolumes, includeDeployment: v.includeDeployment, copyVersions: v.copyVersions, versionEvidence: v.copyVersions ? v.versionEvidence : null
    };
    const res = await f.submit(async () => {
      if (mode === 'existing') {
        const r = await post<{ results: CloneResult[] }>(`/environments/${sourceEnvironmentId}/clone-to-many`, {
          ...common, find: undefined, replace: undefined, targets: v.targets.map(t => ({ environmentId: t.id, find: t.find || null, replace: t.replace || null }))
        });
        const all = r.results;
        return { targetEnvironmentId: all.length === 1 ? all[0].targetEnvironmentId : sourceEnvironmentId, assets: all.flatMap(x => x.assets), installations: all.flatMap(x => x.installations),
          notes: all.flatMap(x => x.notes.map(n => `${envLabel(x.targetEnvironmentId)}: ${n}`)), targets: all.length };
      }
      const r = await post<{ environmentId: number; name: string; copied: CloneResult | null }>(`/environments/${sourceEnvironmentId}/clone-environment`, { regionId: toNum(v.regionId), name: v.name || null, ...common });
      return r.copied ?? { targetEnvironmentId: r.environmentId, assets: [], installations: [], notes: [] };
    });
    if (!res) return;
    refresh();
    toast(mode === 'new' ? `Environment copied with ${res.assets.length} server(s) and ${res.installations.length} installation(s).`
      : `Copied ${res.assets.length} server(s) and ${res.installations.length} installation(s)${(res.targets ?? 1) > 1 ? ` into ${res.targets} environments` : ''}.`);
    if (res.notes.length === 0) { onClose(); if ((res.targets ?? 1) === 1 && res.targetEnvironmentId !== sourceEnvironmentId) nav(`/environments/${res.targetEnvironmentId}`); } else setResult(res);
  };
  if (result) return (
    <Dialog title="Copy finished — please check" onClose={onClose} wide>
      <p>Copied {result.assets.map(a => a.name).concat(result.installations.map(i => i.name)).join(', ')}. Some details need your attention:</p>
      <ul className="clone-notes">{result.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      <div className="form-actions"><button className="btn" onClick={onClose}>Close</button>{(result.targets ?? 1) === 1 && <button className="btn btn-primary" onClick={() => { onClose(); nav(`/environments/${result.targetEnvironmentId}`); }}>Open target environment</button>}</div>
    </Dialog>
  );
  const nameErrors = f.error?.errors?.names ?? [];
  const selectionAllowed = (f.values.assetIds.length === 0 || canCreateServer) && (f.values.installationIds.length === 0 || canCreateInstallation);
  const canCopy = selectionAllowed && (mode === 'new' ? canCreateEnvironment : f.values.targets.length > 0 && f.values.assetIds.length + f.values.installationIds.length > 0);
  return (
    <Dialog title={mode === 'new' ? 'Copy environment to another region' : 'Copy to other environments'} onClose={onClose} wide>
      {wholeEnvironment && (
        <div className="radio-row" role="radiogroup" aria-label="What to copy into">
          <label className="check"><input type="radio" name="clone-mode" disabled={!canCreateEnvironment} checked={mode === 'new'} onChange={() => switchMode('new')} /> A new environment (copy the whole environment)</label>
          <label className="check"><input type="radio" name="clone-mode" checked={mode === 'existing'} onChange={() => switchMode('existing')} /> An existing environment</label>
        </div>
      )}
      <p className="hint" style={{ marginBottom: 8 }}>{mode === 'new'
        ? 'Creates a new environment with the same type, hosting, criticality, owners and project link, then copies the selected servers and installations into it. Condition reports, reviews and firewall rules are not copied.'
        : 'Creates new records in each chosen environment of this client — in the same region, in other regions, or in this environment as a duplicate under a new name. Copies start without verification; firewall rules are not copied. Everything is copied, or nothing if a name clashes.'}</p>
      <FormError error={f.error} fields={['targetEnvironmentId', 'regionId', 'name', 'assetIds', 'find', 'replace', 'versionEvidence', 'names', 'targets']} />
      <div className="form-grid">
        {mode === 'existing' ? null : <>
          <SelectInput label="Region of the new environment" required={(regions.data?.length ?? 0) > 0} value={f.values.regionId} onChange={pickRegion} error={f.fieldError('regionId')}
            options={(regions.data ?? []).map(r => ({ value: String(r.id), label: `${r.code} · ${r.name}` }))} empty={(regions.data?.length ?? 0) > 0 ? '— Select —' : 'Directly under the client'} />
          <TextInput label="Name of the new environment" required value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} hint="Unique within the region; usually the same name, for example Production." />
        </>}
        <SelectInput label="Lifecycle of copied servers" value={f.values.lifecycle} onChange={v => f.set('lifecycle', v)} options={enumOptions(lifecycles)} empty={null} hint="Planned until someone confirms the servers exist." />
        {mode === 'new' && <>
          <TextInput label="Find in names" value={f.values.find} onChange={v => f.set('find', v)} error={f.fieldError('find')} hint="For example r1; matched without regard to case." />
          <TextInput label="Replace with" value={f.values.replace} onChange={v => f.set('replace', v)} error={f.fieldError('replace')} hint="For example r2; follows the case of each match." />
        </>}
      </div>
      {mode === 'existing' && (
        <fieldset className="clone-targets">
          <legend className="flabel">Copy to <span className="req">*</span></legend>
          {byRegion.map(g => (
            <div key={g.code} className="clone-region">
              <div className="clone-region-name">{g.code ? `Region ${g.code}` : 'Directly under the client'}</div>
              {g.envs.map(env => (
                <label key={env.id} className="check">
                  <input type="checkbox" aria-label={envLabel(env.id)} checked={isTarget(env.id)} onChange={e => toggleTarget(env, e.target.checked)} />
                  {env.name}{env.id === sourceEnvironmentId && <span className="muted"> (this environment — duplicate)</span>}
                </label>
              ))}
            </div>
          ))}
          {f.fieldError('targets') && <div className="err">{f.fieldError('targets')}</div>}
        </fieldset>
      )}
      {mode === 'existing' && f.values.targets.length > 0 && (
        <DataTable<CloneTargetRow> caption="Names in each target" rows={f.values.targets} rowKey={t => t.id} tableWrapClassName="clone-renames" columns={[
          { key: 'target', header: 'Target', className: 'nowrap', render: t => envLabel(t.id) },
          { key: 'find', header: 'Find in names', render: t => <input className="input" aria-label={`Find in names for ${envLabel(t.id)}`} value={t.find} onChange={e => setTarget(t.id, { find: e.target.value })} placeholder={t.id === sourceEnvironmentId ? 'Required, e.g. APP1' : 'Keep names'} /> },
          { key: 'replace', header: 'Replace with', render: t => <input className="input" aria-label={`Replace with for ${envLabel(t.id)}`} value={t.replace} onChange={e => setTarget(t.id, { replace: e.target.value })} /> },
          { key: 'copies', header: 'Copies will be named', render: t => <>{[...(assets.data?.items ?? []).filter(a => f.values.assetIds.includes(a.id)).map(a => a.name), ...(insts.data?.items ?? []).filter(i => f.values.installationIds.includes(i.id)).map(i => i.instanceName)]
            .map(nm => <div key={nm} className="mono">{renameCopy(nm, t.find, t.replace)}</div>)}{f.fieldError(`targets[${f.values.targets.indexOf(t)}].find`) && <div className="err">{f.fieldError(`targets[${f.values.targets.indexOf(t)}].find`)}</div>}</> },
          { key: 'actions', header: '', render: t => <button className="linkbtn" onClick={() => toggleTarget({ id: t.id }, false)} aria-label={`Remove ${envLabel(t.id)}`}>Remove</button> }
        ]} />
      )}
      <div className="clone-pick">
        <fieldset className="hosted-ms">
          <legend className="flabel">Servers</legend>
          {assets.data?.items.length === 0 && <p className="hint" style={{ margin: 0 }}>No servers in this environment.</p>}
          {assets.data?.items.map(a => (
            <label key={a.id} className="check hosted-ms-item">
              <input type="checkbox" disabled={!canCreateServer} checked={f.values.assetIds.includes(a.id)} onChange={e => toggle('assetIds', a.id, e.target.checked)} />
              <span className="mono">{a.name}</span>{mode === 'new' && f.values.assetIds.includes(a.id) && <span className="muted"> → <span className="mono">{newName(a.name)}</span></span>}
            </label>
          ))}
        </fieldset>
        <fieldset className="hosted-ms">
          <legend className="flabel">Installations</legend>
          {insts.data?.items.length === 0 && <p className="hint" style={{ margin: 0 }}>No installations in this environment.</p>}
          {insts.data?.items.map(i => (
            <label key={i.id} className="check hosted-ms-item">
              <input type="checkbox" disabled={!canCreateInstallation} checked={f.values.installationIds.includes(i.id)} onChange={e => toggle('installationIds', i.id, e.target.checked)} />
              <span><b>{i.productCode}</b> · {i.instanceName}</span>{mode === 'new' && f.values.installationIds.includes(i.id) && <span className="muted"> → {newName(i.instanceName)}</span>}
            </label>
          ))}
        </fieldset>
      </div>
      {f.fieldError('assetIds') && <div className="err">{f.fieldError('assetIds')}</div>}
      {nameErrors.length > 0 && <ul className="err clone-notes">{nameErrors.map((n, i) => <li key={i}>{n}</li>)}</ul>}
      <div className="form-grid" style={{ marginTop: 8 }}>
        <Checkbox label="Copy volumes" checked={f.values.includeVolumes} onChange={v => f.set('includeVolumes', v)} />
        <Checkbox label="Copy which microservices and components run on which server" disabled={!canCreateServer} checked={f.values.includeDeployment} onChange={v => f.set('includeDeployment', v)}
          hint={canCreateServer ? `Creates components with Servers Create; extending existing component hosting also needs Servers Edit${canMaintainServer ? '.' : ' (not granted).'}` : 'Copying deployment needs Servers Create permission.'} />
        <Checkbox label="Copy the recorded versions" checked={f.values.copyVersions} onChange={v => f.set('copyVersions', v)} hint="Off: copies start with Unknown versions. On: the copies get the same recorded versions." />
        {f.values.copyVersions && <TextInput label="Evidence for the versions (optional)" value={f.values.versionEvidence} onChange={v => f.set('versionEvidence', v)} error={f.fieldError('versionEvidence')} />}
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={f.busy || !canCopy} onClick={save}>
          {mode === 'existing' && f.values.targets.length > 1 ? `Copy to ${f.values.targets.length} environments` : 'Copy'}</button></div>
    </Dialog>
  );
}
