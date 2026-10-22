import { useQuery } from '@tanstack/react-query';
import { exportCsv, get, qs } from '../api';
import { fmtDate, fmtDateTime, label } from '../format';
import { useMe, useUrlState } from '../hooks';
import { DataTable, PageHead, Panel, SelectInput, Tabs } from '../ui/kit';
import { RecordLink, useClientOptions, useProductOptions, useTeamOptions } from './common';

type Action = { category: string; recordType: string; recordId: number; reference: string; title: string; clientId?: number; owner: string; reason: string; nextAction?: string; dueAt?: string; link: string };

const CATS: Record<string, string> = {
  Unassigned: 'Unassigned', Waiting: 'Waiting / blocked', ReviewOverdue: 'Review overdue', OverdueCase: 'Overdue cases', OverdueCommitment: 'Overdue commitments',
  ApproachingCommitment: 'Approaching', StaleReview: 'Stale reviews', CoverageGap: 'Coverage gaps', DataQuality: 'Data quality', ContractRenewal: 'Contract renewals', PaymentDue: 'Payments due',
  CaseDueSoon: 'Due within 24 h', EscalationOverdue: 'Escalations past target', EnvironmentCondition: 'Environments down'
};

// Operational follow-up list (moved off the executive overview so the overview stays fully visual).
export function ActionList() {
  const me = useMe().data!;
  const [f, set] = useUrlState({ clientId: '', teamId: '', productId: '', country: '', category: 'Unassigned' });
  const params = { clientId: f.clientId, teamId: f.teamId, productId: f.productId, country: f.country };
  const actions = useQuery({ queryKey: ['actions', params, f.category], queryFn: () => get<{ categories: Record<string, number>; items: Action[] }>(`/dashboard/actions${qs({ ...params, category: f.category })}`) });
  const all = useQuery({ queryKey: ['actions-counts', params], queryFn: () => get<{ categories: Record<string, number> }>(`/dashboard/actions${qs(params)}`) });
  const clients = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  return (
    <>
      <PageHead title="Action list" crumbs={[{ to: '/', label: 'Dashboard' }, { label: 'Action list' }]}
        sub="Records that need someone to act, by reason. Counts include only records you are authorized to see."
        actions={me.grants.export && <button className="btn" onClick={() => exportCsv('actions', { ...params, category: f.category })}>Export action list</button>} />
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized clients" />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
        {f.country && <span className="chip" style={{ alignSelf: 'end', marginBottom: 6 }}>Country: {f.country} <button className="linkbtn" onClick={() => set({ country: '' })} aria-label="Clear country filter">✕</button></span>}
      </div>
      <Panel title="Action list" pad={false}>
        <div style={{ padding: '8px 12px 0' }}>
          <Tabs value={f.category} onChange={k => set({ category: k })} tabs={Object.entries(CATS).map(([k, v]) => ({ key: k, label: <>{v} <span className="chip">{all.data?.categories[k] ?? '…'}</span></> }))} />
        </div>
        <DataTable<Action> rowKey={r => `${r.recordType}-${r.recordId}-${r.reason}`} rows={actions.data?.items} loading={actions.isLoading} error={actions.error}
          empty={f.clientId || f.teamId || f.productId || f.country ? 'nomatch' : 'none'} caption="Action list"
          columns={[
            { key: 'ref', header: 'Record', render: r => <RecordLink type={r.recordType} id={r.recordId}>{r.reference}</RecordLink> },
            { key: 'title', header: 'Title', render: r => r.title },
            { key: 'type', header: 'Type', render: r => label(r.recordType) },
            { key: 'owner', header: 'Owner', render: r => r.owner === 'Unassigned' ? <span className="muted">Unassigned</span> : r.owner },
            { key: 'reason', header: 'Reason', render: r => r.reason },
            { key: 'next', header: 'Next action', render: r => r.nextAction },
            { key: 'due', header: 'Due / review', render: r => !r.dueAt ? '' : r.recordType === 'Contract' ? fmtDate(r.dueAt.slice(0, 10)) : fmtDateTime(r.dueAt) }
          ]} />
      </Panel>
    </>
  );
}
