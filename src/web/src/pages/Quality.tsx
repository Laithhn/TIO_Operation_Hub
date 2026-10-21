import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { exportCsv, get, post, qs, type Paged, type UserRef } from '../api';
import { fmtDateTime, fromLocalInput, label } from '../format';
import { useCan, useEnum, useMe, useRefresh, useUrlState } from '../hooks';
import { ActionDialog, TimeZoneSelect } from '../ui/pickers';
import { DataTable, PageHead, Pager, Panel, Person, SelectInput, StatusBadge, TextInput, useToast } from '../ui/kit';
import { RecordLink, useClientOptions, useProductOptions, useTeamOptions } from './common';

type Item = { id: number; rule: string; recordType: string; recordId: number; recordLabel: string; detail: string; clientId?: number; clientCode?: string; coordinator?: UserRef; nextAction?: string; nextReviewAt?: string; status: string; openedAt: string; resolvedAt?: string; resolutionEvidence?: string; version: string };

export function DataQuality() {
  const [f, set] = useUrlState({ rule: '', clientId: '', status: 'Open', recordType: '', page: '1', pageSize: '15' });
  const q = useQuery({ queryKey: ['dq', f], queryFn: () => get<Paged<Item>>(`/data-quality${qs(f)}`) });
  const sum = useQuery({ queryKey: ['dq-sum', f.clientId], queryFn: () => get<{ rule: string; label: string; count: number }[]>(`/data-quality/summary${qs({ clientId: f.clientId })}`) });
  const clients = useClientOptions();
  const me = useMe().data!;
  const canEng = useCan('Engineer');
  const refresh = useRefresh();
  const toast = useToast();
  const [edit, setEdit] = useState<Item | null>(null);
  const scan = async () => { const r = await post<{ opened: number; resolved: number }>('/data-quality/scan'); toast(`Re-evaluated: ${r.opened} opened, ${r.resolved} resolved.`); refresh(); };
  return (
    <>
      <PageHead title="Data quality" sub="Missing owners, unknown environments and versions, and stale verification. Items open and resolve only by rule re-evaluation, so closing one can never falsely verify unknown data."
        actions={<>{canEng && <button className="btn" onClick={scan}>Re-evaluate now</button>}{me.grants.export && <button className="btn" onClick={() => exportCsv('data-quality', { rule: f.rule, clientId: f.clientId, status: f.status })}>Export CSV</button>}</>} />
      <Panel title="Open items by rule" pad={false}>
        <div className="tiles">{(sum.data ?? []).map(s => <a key={s.rule} className="tile" href={`?rule=${s.rule}`} onClick={e => { e.preventDefault(); set({ rule: s.rule }); }}><span className="v">{s.count}</span><span className="l">{s.label}</span></a>)}</div>
      </Panel>
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized" />
        <SelectInput label="Rule" value={f.rule} onChange={v => set({ rule: v })} options={(sum.data ?? []).map(s => ({ value: s.rule, label: s.label }))} empty="All rules" />
        <SelectInput label="Status" value={f.status} onChange={v => set({ status: v })} options={[{ value: 'Open', label: 'Open' }, { value: 'Resolved', label: 'Resolved' }, { value: 'all', label: 'All' }]} empty={null} />
      </div>
      <DataTable<Item> rowKey={i => i.id} rows={q.data?.items} loading={q.isLoading} error={q.error} empty={f.rule || f.clientId ? 'nomatch' : 'none'} columns={[
        { key: 'r', header: 'Rule', render: i => label(i.rule) }, { key: 'rec', header: 'Record', render: i => <RecordLink type={i.recordType} id={i.recordId}>{label(i.recordType)} · {i.recordLabel}</RecordLink> },
        { key: 'c', header: 'Client', render: i => i.clientCode ?? <span className="muted">—</span> }, { key: 'd', header: 'Detail', render: i => i.detail },
        { key: 'co', header: 'Coordinator', render: i => <Person u={i.coordinator} gap="Not assigned" /> }, { key: 'n', header: 'Next action', render: i => <>{i.nextAction}{i.nextReviewAt && <div className="hint">review {fmtDateTime(i.nextReviewAt)}</div>}</> },
        { key: 's', header: 'Status', render: i => <><StatusBadge value={i.status} />{i.resolvedAt && <div className="hint">{fmtDateTime(i.resolvedAt)}</div>}</> },
        { key: 'o', header: 'Opened', render: i => fmtDateTime(i.openedAt) },
        { key: 'a', header: '', render: i => canEng && i.status === 'Open' && <button className="linkbtn" onClick={() => setEdit(i)}>Coordinate</button> }
      ]} />
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.totalCount} onPage={p => set({ page: String(p) })} onSize={s => set({ pageSize: String(s) })} />}
      {edit && <ActionDialog title="Coordinate data-quality item" path={`/data-quality/${edit.id}`} method="PUT" onClose={() => setEdit(null)} submitLabel="Save" intro={`${label(edit.rule)} — ${edit.recordLabel}. The item resolves automatically once the underlying data is corrected.`}
        initial={{ coordinatorUserId: edit.coordinator ? String(edit.coordinator.id) : '', nextAction: edit.nextAction ?? '' }}
        fields={[{ name: 'coordinatorUserId', label: 'Accountable coordinator', kind: 'user', required: true, clientId: edit.clientId }, { name: 'nextAction', label: 'Next action', required: true }, { name: 'nextReviewAt', label: 'Next review', kind: 'datetime' }]}
        transform={v => ({ coordinatorUserId: Number(v.coordinatorUserId) || null, nextAction: v.nextAction, nextReviewAt: v.nextReviewAt ? fromLocalInput(v.nextReviewAt) : null })} version={edit.version} />}
    </>
  );
}

export function Reports() {
  const me = useMe().data!;
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const statuses = useEnum('CaseStatus');
  const [f, setF] = useState({ clientId: '', teamId: '', ownerId: '', productId: '', createdFrom: '', createdTo: '', completedFrom: '', completedTo: '', status: '', timeZone: me.timeZone });
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }));
  const base = { clientId: f.clientId, teamId: f.teamId, ownerId: f.ownerId, productId: f.productId, timeZone: f.timeZone };
  const iso = (d: string) => (d ? new Date(d + 'T00:00:00Z').toISOString() : '');
  if (!me.grants.export) return <><PageHead title="Reports and exports" /><div className="state-msg restricted">Exporting needs the separate Export permission.</div></>;
  return (
    <>
      <PageHead title="Reports and exports" sub="CSV exports contain only rows you are authorized to see, with generation time, time zone, filters and column definitions. Every export is logged and audited." />
      <Panel title="Filters">
        <div className="form-grid">
          <SelectInput label="Client" value={f.clientId} onChange={v => set('clientId', v)} options={clients} empty="All authorized" />
          <SelectInput label="Team" value={f.teamId} onChange={v => set('teamId', v)} options={teams} empty="All teams" />
          <SelectInput label="Product" value={f.productId} onChange={v => set('productId', v)} options={products} empty="All products" />
          <SelectInput label="Owner" value={f.ownerId} onChange={v => set('ownerId', v)} options={[{ value: String(me.id), label: 'Me' }]} empty="Anyone" />
          <TextInput label="Created from (cases)" type="date" value={f.createdFrom} onChange={v => set('createdFrom', v)} />
          <TextInput label="Created to (cases)" type="date" value={f.createdTo} onChange={v => set('createdTo', v)} />
          <SelectInput label="Case status" value={f.status} onChange={v => set('status', v)} options={[{ value: 'all', label: 'All' }, ...statuses.map(s => ({ value: s, label: label(s) }))]} empty="Open" />
          <TextInput label="Completed from (commitments)" type="date" value={f.completedFrom} onChange={v => set('completedFrom', v)} />
          <TextInput label="Completed to (commitments)" type="date" value={f.completedTo} onChange={v => set('completedTo', v)} />
          <TimeZoneSelect label="Time zone for timestamps" value={f.timeZone} onChange={v => set('timeZone', v)} hint="Used in the export." />
        </div>
      </Panel>
      <Panel title="Exports">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => exportCsv('cases', { ...base, status: f.status, createdFrom: iso(f.createdFrom), createdTo: iso(f.createdTo) })}>Cases</button>
          <button className="btn btn-primary" onClick={() => exportCsv('commitments', { ...base, status: f.completedFrom || f.completedTo ? 'Completed' : '', completedFrom: iso(f.completedFrom), completedTo: iso(f.completedTo) })}>Commitments</button>
          <button className="btn btn-primary" onClick={() => exportCsv('actions', base)}>Action list</button>
          <button className="btn btn-primary" onClick={() => exportCsv('environments', base)}>Environments</button>
          <button className="btn btn-primary" onClick={() => exportCsv('versions', base)}>Version matrix</button>
          <button className="btn btn-primary" onClick={() => exportCsv('assets', base)}>Assets</button>
          <button className="btn btn-primary" onClick={() => exportCsv('data-quality', base)}>Data quality</button>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>On-time delivery rates and capacity reports belong to the Next release and are not offered.</p>
      </Panel>
    </>
  );
}
