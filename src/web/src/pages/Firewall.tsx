import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { get, post, put, qs, type Paged } from '../api';
import { usePermission, useForm, useMe, useRefresh, useUrlState } from '../hooks';
import { Badge, DataTable, DeleteAction, Dialog, FormError, PageHead, Pager, Restricted, SelectInput, TextInput, useToast, type Column } from '../ui/kit';
import { ClientDisplay } from '../ui/ClientLogo';
import { toNum, useClientOptions } from './common';

/** A35: firewall rules replace network endpoints and dependencies — the allowed communication between two servers. */
export type RuleRow = {
  id: number; clientId: number; clientCode: string; ports?: string; protocol: string; direction: string; purpose: string; notes?: string; version: string;
  source: { id: number; name: string; environmentId: number; environment: string };
  destination: { id: number; name: string; environmentId: number; environment: string };
};

export const PROTOCOLS = [
  { value: 'TCP', label: 'TCP' }, { value: 'UDP', label: 'UDP' }, { value: 'TCPandUDP', label: 'TCP and UDP' }, { value: 'ICMP', label: 'ICMP' }, { value: 'Any', label: 'Any' }
];
const protoLabel = (p: string) => PROTOCOLS.find(x => x.value === p)?.label ?? p;
const arrow = (d: string) => d === 'Bidirectional' ? '⇄' : '→';

function TechGate({ children }: { children: React.ReactNode }) {
  const me = useMe().data!;
  if (!me.grants.technicalDetail) return <Restricted need="Firewall rules need the Technical detail right." />;
  return <>{children}</>;
}

function ruleColumns(onEdit: ((r: RuleRow) => void) | null, showClient: boolean): Column<RuleRow>[] {
  return [
    ...(showClient ? [{ key: 'client', header: 'Client', sort: 'client', render: (r: RuleRow) => <ClientDisplay id={r.clientId} code={r.clientCode} /> }] : []),
    { key: 'source', header: 'Source server', sort: 'source', render: r => <><Link to={`/assets/${r.source.id}`}>{r.source.name}</Link><div className="hint">{r.source.environment}</div></> },
    { key: 'dir', header: 'Direction', render: r => <span title={r.direction === 'Bidirectional' ? 'Both directions' : 'Source to destination'}><span aria-hidden="true" className="fw-arrow">{arrow(r.direction)}</span> {r.direction === 'Bidirectional' ? 'Both ways' : 'One way'}</span> },
    { key: 'destination', header: 'Destination server', sort: 'destination', render: r => <><Link to={`/assets/${r.destination.id}`}>{r.destination.name}</Link><div className="hint">{r.destination.environment}</div></> },
    { key: 'ports', header: 'Ports', sort: 'ports', render: r => r.ports ? <span className="mono">{r.ports}</span> : <span className="muted">All</span> },
    { key: 'protocol', header: 'Protocol', sort: 'protocol', render: r => <Badge>{protoLabel(r.protocol)}</Badge> },
    { key: 'purpose', header: 'Purpose', sort: 'purpose', render: r => <>{r.purpose}{r.notes && <div className="hint">{r.notes}</div>}</> },
    { key: 'act', header: '', className: 'row-actions nowrap', render: r => <>{onEdit && <button className="linkbtn" onClick={() => onEdit(r)}>Edit</button>} <DeleteAction path={`/firewall-rules/${r.id}`} what={`rule ${r.source.name} ${arrow(r.direction)} ${r.destination.name}`} /></> }
  ];
}

export function FirewallRuleList() {
  const [f, set] = useUrlState({ clientId: '', protocol: '', q: '', sort: 'source', page: '1', pageSize: '25' });
  const me = useMe().data!;
  const q = useQuery({ queryKey: ['firewall-rules', f], queryFn: () => get<Paged<RuleRow>>(`/firewall-rules${qs(f)}`), enabled: me.grants.technicalDetail });
  const clients = useClientOptions();
  const canEng = usePermission('OtherOperations', 'Maintain');
  const canCreate = usePermission('OtherOperations', 'Create');
  const [edit, setEdit] = useState<RuleRow | 'new' | null>(null);
  const filtered = !!(f.clientId || f.protocol || f.q);
  return (
    <>
      <PageHead title="Firewall rules" crumbs={[{ to: '/clients', label: 'Clients' }, { to: '/environments', label: 'Environments' }, { label: 'Firewall rules' }]}
        sub="The allowed communication between servers: source, destination, ports, protocol, direction and purpose. Recorded configuration, not a live firewall export."
        actions={canCreate && me.grants.technicalDetail && <button className="btn btn-primary" onClick={() => setEdit('new')}>+ New rule</button>} />
      <TechGate>
        <div className="toolbar">
          <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v, page: '1' })} options={clients} empty="All authorized clients" />
          <SelectInput label="Protocol" value={f.protocol} onChange={v => set({ protocol: v, page: '1' })} options={PROTOCOLS} empty="Any protocol" />
          <TextInput label="Search" value={f.q} onChange={v => set({ q: v, page: '1' })} placeholder="Server, port or purpose" />
        </div>
        <DataTable<RuleRow> caption="Firewall rules" rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={filtered ? 'nomatch' : 'none'}
          sort={f.sort} onSort={s => set({ sort: s })} columns={ruleColumns(canEng ? r => setEdit(r) : null, true)} />
        {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
      </TechGate>
      {edit && <RuleDialog rule={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

/** Rules of one environment or touching one server, for the environment tab and the server page. */
export function FirewallRulesPanel({ environmentId, assetId, clientId }: { environmentId?: number; assetId?: number; clientId: number }) {
  const me = useMe().data!;
  const canEng = usePermission('OtherOperations', 'Maintain');
  const canCreate = usePermission('OtherOperations', 'Create');
  const [edit, setEdit] = useState<RuleRow | 'new' | null>(null);
  const q = useQuery({ queryKey: ['firewall-rules', { environmentId, assetId }], queryFn: () => get<Paged<RuleRow>>(`/firewall-rules${qs({ environmentId, assetId, pageSize: 200 })}`), enabled: me.grants.technicalDetail });
  if (!me.grants.technicalDetail) return <Restricted need="Firewall rules need the Technical detail right." />;
  return (
    <>
      {canCreate && <div className="toolbar"><button className="btn btn-primary" onClick={() => setEdit('new')}>+ New firewall rule</button></div>}
      <DataTable<RuleRow> caption="Firewall rules" rowKey={r => r.id} rows={q.data?.items} loading={q.isLoading} error={q.error} columns={ruleColumns(canEng ? r => setEdit(r) : null, false)} />
      {edit && <RuleDialog rule={edit === 'new' ? null : edit} clientId={clientId} sourceAssetId={assetId} onClose={() => setEdit(null)} />}
    </>
  );
}

function RuleDialog({ rule, clientId, sourceAssetId, onClose }: { rule: RuleRow | null; clientId?: number; sourceAssetId?: number; onClose: () => void }) {
  const clients = useClientOptions();
  const f = useForm({
    clientId: String(rule?.clientId ?? clientId ?? ''), sourceAssetId: String(rule?.source.id ?? sourceAssetId ?? ''), destinationAssetId: String(rule?.destination.id ?? ''),
    ports: rule?.ports ?? '', protocol: rule?.protocol ?? 'TCP', direction: rule?.direction ?? 'OneWay', purpose: rule?.purpose ?? '', notes: rule?.notes ?? ''
  });
  const cid = f.values.clientId;
  // Large clients have hundreds of servers: the lists show the first 200 matches of "Find server", plus the servers already chosen.
  const [find, setFind] = useState('');
  const servers = useQuery({ queryKey: ['assets-of-client', cid, find], queryFn: () => get<Paged<{ id: number; name: string; environmentName: string; regionCode?: string }>>(`/assets${qs({ clientId: cid, q: find, pageSize: 200 })}`), enabled: !!cid });
  const chosen = rule ? [{ value: String(rule.source.id), label: `${rule.source.name} — ${rule.source.environment}` }, { value: String(rule.destination.id), label: `${rule.destination.name} — ${rule.destination.environment}` }] : [];
  const found = (servers.data?.items ?? []).map(a => ({ value: String(a.id), label: `${a.name} — ${a.regionCode ? a.regionCode + ' / ' : ''}${a.environmentName}` }));
  const opts = [...found, ...chosen.filter(c => !found.some(o => o.value === c.value))];
  const more = (servers.data?.totalCount ?? 0) > found.length;
  const toast = useToast();
  const refresh = useRefresh();
  const needsPorts = ['TCP', 'UDP', 'TCPandUDP'].includes(f.values.protocol);
  const save = async () => {
    const v = f.values;
    const body = { sourceAssetId: toNum(v.sourceAssetId), destinationAssetId: toNum(v.destinationAssetId), ports: needsPorts ? v.ports : null, protocol: v.protocol, direction: v.direction, purpose: v.purpose, notes: v.notes || null };
    const ok = await f.submit(async () => { if (rule) await put(`/firewall-rules/${rule.id}`, body, rule.version); else await post('/firewall-rules', body); return true; });
    if (ok) { toast('Firewall rule saved.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={rule ? 'Edit firewall rule' : 'New firewall rule'} onClose={onClose} wide>
      <FormError error={f.error} />
      <div className="form-grid">
        {!clientId && !rule && <SelectInput label="Client" required value={cid} onChange={v => { f.set('clientId', v); f.set('sourceAssetId', ''); f.set('destinationAssetId', ''); }} options={clients} wide />}
        <TextInput label="Find server" wide value={find} onChange={setFind} placeholder="Type part of a server name to narrow both lists"
          hint={more ? `Showing ${found.length} of ${servers.data!.totalCount} servers; type to narrow.` : undefined} disabled={!cid} />
        <SelectInput label="Source server" required value={f.values.sourceAssetId} onChange={v => f.set('sourceAssetId', v)} options={opts} error={f.fieldError('sourceAssetId')} disabled={!cid} />
        <SelectInput label="Destination server" required value={f.values.destinationAssetId} onChange={v => f.set('destinationAssetId', v)} options={opts.filter(o => o.value !== f.values.sourceAssetId)} error={f.fieldError('destinationAssetId')} disabled={!cid} />
        <SelectInput label="Protocol" required value={f.values.protocol} onChange={v => f.set('protocol', v)} options={PROTOCOLS} empty={null} />
        {needsPorts
          ? <TextInput label="Ports" required value={f.values.ports} onChange={v => f.set('ports', v)} error={f.fieldError('ports')} placeholder="443, 8080-8090" hint="Numbers or ranges, separated by commas." />
          : <div className="field"><span className="flabel">Ports</span><div className="muted" style={{ paddingTop: 6 }}>Not used for {protoLabel(f.values.protocol)}</div></div>}
        <SelectInput label="Direction" required value={f.values.direction} onChange={v => f.set('direction', v)} options={[{ value: 'OneWay', label: 'One way (source → destination)' }, { value: 'Bidirectional', label: 'Both ways (⇄)' }]} empty={null} />
        <TextInput label="Purpose" required value={f.values.purpose} onChange={v => f.set('purpose', v)} error={f.fieldError('purpose')} maxLength={500} placeholder="e.g. Web tier calls the application API" wide />
        <TextInput label="Notes" value={f.values.notes} onChange={v => f.set('notes', v)} error={f.fieldError('notes')} multiline wide />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Save rule</button></div>
    </Dialog>
  );
}
