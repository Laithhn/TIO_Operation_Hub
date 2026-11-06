import { useQuery } from '@tanstack/react-query';
import { canExportReport } from '../exportRights';
import { exportCsv, get, qs } from '../api';
import { fmtDate, fmtDateTime, label } from '../format';
import { useMe, useUrlState } from '../hooks';
import { DataTable, PageHead, Panel, SelectInput, TitledText } from '../ui/kit';
import { RecordLink, useClientOptions, useProductOptions, useTeamOptions } from './common';

type Action = { category: string; recordType: string; recordId: number; reference: string; title: string; clientId?: number; owner: string; reason: string; nextAction?: string; dueAt?: string; link: string };

const CATS: Record<string, string> = {
  Unassigned: 'Unassigned', Waiting: 'Waiting / blocked', ReviewOverdue: 'Review overdue', OverdueCase: 'Overdue tickets', OverdueCommitment: 'Overdue commitments',
  ApproachingCommitment: 'Approaching', StaleReview: 'Stale reviews', CoverageGap: 'Coverage gaps', DataQuality: 'Data quality', ContractRenewal: 'Contract renewals', PaymentDue: 'Payments due',
  CaseDueSoon: 'Due within 24 h', EscalationOverdue: 'Escalations past target', EnvironmentCondition: 'Environments down'
};

/** A105: the fourteen reasons in four groups, so every kind of work is visible at once with its count. */
const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Deadlines', keys: ['OverdueCase', 'CaseDueSoon', 'OverdueCommitment', 'ApproachingCommitment', 'EscalationOverdue'] },
  { title: 'Ownership and follow-up', keys: ['Unassigned', 'Waiting', 'ReviewOverdue', 'StaleReview'] },
  { title: 'Environments and data', keys: ['EnvironmentCondition', 'CoverageGap', 'DataQuality'] },
  { title: 'Contracts', keys: ['ContractRenewal', 'PaymentDue'] }
];

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
        actions={canExportReport(me, 'actions') && <button className="btn" onClick={() => exportCsv('actions', { ...params, category: f.category })}>Export action list</button>} />
      <div className="toolbar">
        <SelectInput label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clients} empty="All authorized clients" />
        <SelectInput label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
        <SelectInput label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
        {f.country && <span className="chip" style={{ alignSelf: 'end', marginBottom: 6 }}>Country: {f.country} <button className="linkbtn" onClick={() => set({ country: '' })} aria-label="Clear country filter">✕</button></span>}
      </div>
      <Panel title="Action list" pad={false}>
        <div className="action-groups" role="group" aria-label="Action categories">
          {GROUPS.map(g => {
            const total = g.keys.reduce((n, k) => n + (all.data?.categories[k] ?? 0), 0);
            return (
              <div key={g.title} className="action-group">
                <div className="action-group-head"><span>{g.title}</span> <span className="muted">{all.data ? total : '…'}</span></div>
                {g.keys.map(k => {
                  const n = all.data?.categories[k];
                  return (
                    <button key={k} type="button" aria-pressed={f.category === k} className={`action-cat${f.category === k ? ' active' : ''}${n === 0 ? ' zero' : ''}`} onClick={() => set({ category: k })}>
                      <span>{CATS[k]}</span><span className="action-count">{n ?? '…'}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <DataTable<Action> rowKey={r => `${r.recordType}-${r.recordId}-${r.reason}`} rows={actions.data?.items} loading={actions.isLoading} error={actions.error}
          empty={f.clientId || f.teamId || f.productId || f.country ? 'nomatch' : 'none'} caption="Action list"
          fit columnsKey="action-list" details={r => <p className="full-text">{r.title}</p>}
          columns={[
            // A105: reason, deadline and next action stay in view; the title is shortened and the record type is under Columns.
            { key: 'ref', header: 'Record', render: r => <><RecordLink type={r.recordType} id={r.recordId}>{r.reference}</RecordLink><div className="hint">{label(r.recordType)}</div></> },
            { key: 'title', header: 'Title', maxWidth: '22rem', render: r => <TitledText text={r.title} /> },
            { key: 'reason', header: 'Reason', priority: 'primary', render: r => r.reason },
            { key: 'due', header: 'Due / review', priority: 'primary', render: r => !r.dueAt ? <span className="muted">—</span> : <span className="nowrap">{r.recordType === 'Contract' ? fmtDate(r.dueAt.slice(0, 10)) : fmtDateTime(r.dueAt)}</span> },
            { key: 'next', header: 'Next action', priority: 'primary', render: r => r.nextAction || <span className="muted">None recorded</span> },
            { key: 'owner', header: 'Owner', render: r => r.owner === 'Unassigned' ? <span className="muted">Unassigned</span> : r.owner },
            { key: 'type', header: 'Type', defaultHidden: true, render: r => label(r.recordType) }
          ]} />
      </Panel>
    </>
  );
}
