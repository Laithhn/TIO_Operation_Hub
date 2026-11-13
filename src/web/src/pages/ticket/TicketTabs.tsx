// A106: the ticket tabs other than Activity, Escalations and Attachments, on the shared record-view pieces.
// Each tab shows the same records and offers the same actions as before; only layout, search and filters are new,
// and search and filters work on what the ticket already returned (no new API).
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { get, qs, type Paged } from '../../api';
import { fmtDateTime, label } from '../../format';
import { useMe } from '../../hooks';
import { canAudit, hasRight, resourceForRecord } from '../../rights';
import { Badge, ErrorBox, QueryState, Restricted, StateMessage, StatusBadge, TitledText } from '../../ui/kit';
import { Avatar, ChangePair, EmptyState, FactList, FilterChips, SearchField, SourceTag, TabSection, Timeline, TimelineItem } from '../../ui/recordView';
import { Icon } from '../../ui/Icon';
import { parseChanges } from '../common';
import { JiraBadge } from '../jira/shared';
import { jiraOriginLabel } from '../jira/CaseJira';
import { affectedRows, matchesQuery, type AffectedRow, type CaseDto, type CaseImpact } from './model';

// ---------- Affected records ----------

const KIND: Record<AffectedRow['kind'], { label: string; plural: string; icon: string }> = {
  environment: { label: 'Environment', plural: 'Environments', icon: 'region' },
  asset: { label: 'Asset', plural: 'Assets', icon: 'server' },
  component: { label: 'Component', plural: 'Components', icon: 'app' }
};

export function AffectedRecordsTab({ c }: { c: CaseDto }) {
  const rows = useMemo(() => affectedRows(c), [c]);
  const [kind, setKind] = useState<'all' | AffectedRow['kind']>('all');
  const [q, setQ] = useState('');
  const count = (k: AffectedRow['kind']) => rows.filter(r => r.kind === k).length;
  const shown = rows.filter(r => (kind === 'all' || r.kind === kind) && matchesQuery(q, r.name, r.type && label(r.type), r.detail, KIND[r.kind].label));
  const internal = c.scope === 'Internal';
  return (
    <TabSection title="Affected records" count={rows.length}
      intro="Environments, assets and components recorded on this ticket. Change them with Edit."
      toolbar={rows.length > 0 && <>
        <FilterChips label="Record type" value={kind} onChange={setKind} options={[
          { key: 'all', label: 'All', count: rows.length },
          ...(['environment', 'asset', 'component'] as const).map(k => ({ key: k, label: KIND[k].plural, count: count(k), hidden: count(k) === 0 }))
        ]} />
        <span className="spacer" />
        <SearchField label="Search affected records" value={q} onChange={setQ} />
      </>}>
      {c.environments.length === 0 && c.unknownEnvironmentReason && <div className="notice warn">Environment not yet identified: {c.unknownEnvironmentReason}</div>}
      {rows.length === 0 ? (
        <EmptyState icon="server" title={internal ? 'Not applicable (internal work)' : 'No affected records entered'}>
          {internal ? 'Internal work is not linked to client environments.' : 'No environment, asset or component is recorded on this ticket yet.'}
        </EmptyState>
      ) : shown.length === 0 ? <StateMessage kind="nomatch" /> : (
        <div className="rv-table-wrap">
          <table className="rv-table">
            <caption className="sr">Affected records</caption>
            <thead><tr><th scope="col">Record</th><th scope="col">Kind</th><th scope="col">Type or role</th><th scope="col">Details</th></tr></thead>
            <tbody>{shown.map(r => (
              <tr key={r.key}>
                <td><span className="rv-name"><span className="rv-name-icon" aria-hidden="true"><Icon name={KIND[r.kind].icon} size={16} /></span>{r.to ? <Link to={r.to}>{r.name}</Link> : <b>{r.name}</b>}</span></td>
                <td className="nowrap">{KIND[r.kind].label}</td>
                <td>{r.type ? label(r.type) : <span className="muted">—</span>}</td>
                <td>{r.detail ?? <span className="muted">—</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && <div className="rv-table-foot">Showing {shown.length} of {rows.length} records</div>}
    </TabSection>
  );
}

// ---------- Jira references ----------

export function JiraReferencesTab({ c, canAdd, canRemove, onAdd, onRemove }: { c: CaseDto; canAdd: boolean; canRemove: boolean; onAdd: () => void; onRemove: (id: number) => void }) {
  const s = c.jiraSource;
  return (
    <TabSection title="Jira references" count={c.jiraReferences.length} actions={canAdd && <button className="btn" onClick={onAdd}>+ Reference</button>}
      intro="Customer Cloud Jira and Internal On-prem Jira are separate systems. Internal On-prem references are manual links only. A synchronized source issue appears here automatically and manual references stay.">
      {c.jiraReferences.length === 0 ? (
        <EmptyState icon="network" title="No Jira references">This ticket is not linked to any Jira issue.</EmptyState>
      ) : (
        <div className="rv-cards">{c.jiraReferences.map(j => {
          const synced = s && s.issueKey === j.issueKey && j.origin !== 'Manual';
          return (
            <article key={j.id} className={`rv-card${j.origin !== 'Manual' ? ' accent-jira' : ''}`} aria-label={`${j.instance} ${j.issueKey}`}>
              <div className="rv-card-head">
                <h3><a className="mono" href={j.url} target="_blank" rel="noopener noreferrer">{j.issueKey}</a></h3>
                <Badge tone={j.origin === 'Manual' ? 'neutral' : 'info'}>{jiraOriginLabel(j.origin)}</Badge>
                <span className="spacer" />
                {canRemove && j.origin === 'Manual' && <button className="linkbtn" onClick={() => onRemove(j.id)}>Remove</button>}
              </div>
              <FactList items={[
                ['Instance', j.instance],
                ['Link', <a href={j.url} target="_blank" rel="noopener noreferrer">{j.url}</a>],
                ['Link reason', j.reuseReason ?? <span className="muted">—</span>],
                synced && ['Synchronization', <><JiraBadge value={s!.connectionStatus} />{s!.connection && <span className="muted"> · {s!.connection}</span>}</>, { source: 'Jira', hint: <>Last sync {fmtDateTime(s!.lastSync)} · next {s!.nextSync ? fmtDateTime(s!.nextSync) : 'not scheduled'}</> }],
                synced && ['Jira status', s!.status ?? <span className="muted">Unknown</span>, { source: 'Jira' }],
                synced && ['Jira assignee', s!.assignee ?? <span className="muted">Unassigned</span>, { source: 'Jira' }]
              ]} />
            </article>
          );
        })}</div>
      )}
      {c.removedJiraReferences.length > 0 && <>
        <h3 className="rv-sub">Removed (kept in history)</h3>
        <ul className="rv-tags" aria-label="Removed Jira references">{c.removedJiraReferences.map(j => <li key={j.id} className="rv-tag" title={`Removed ${fmtDateTime(j.removedAt)}`}>{j.instance} <span className="mono">{j.issueKey}</span> <span className="muted">· removed {fmtDateTime(j.removedAt)}</span></li>)}</ul>
      </>}
    </TabSection>
  );
}

// ---------- Documented impact ----------

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return <section className="rv-group"><h3>{title}<span className="rv-count">{count}</span></h3><div className="rv-group-body">{children}</div></section>;
}

export function ImpactTab({ c, q }: { c: CaseDto; q: { data?: CaseImpact; isLoading: boolean; error: unknown } }) {
  const d = q.data;
  return (
    <TabSection title="Documented dependency impact">
      <div className="notice">{d?.label ?? 'Inferred from recorded relationships, not live outage detection.'}</div>
      <div className="rv-group-grid" style={{ marginBottom: 10 }}>
        <section className="rv-group">
          <h3>Impact statement <SourceTag source="TIO" /></h3>
          <div className="rv-group-body">{c.impactSummary?.trim() ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.impactSummary}</p> : <span className="muted">Not yet assessed</span>}</div>
        </section>
      </div>
      <QueryState q={q}>{d && <div className="rv-group-grid">
        <Group title="Potentially affected installations" count={d.installations.length}>
          {d.installations.length ? <ul>{d.installations.map(i => <li key={i.id}><Link to={`/installations/${i.id}`}>{i.product} · {i.instanceName}</Link> <span className="muted">({i.client} / {i.environment})</span></li>)}</ul> : <span className="muted">None documented</span>}
        </Group>
        <Group title="Components" count={d.components.length}>
          {d.components.length ? <div className="rv-tags">{d.components.map(x => <span key={x.id} className="rv-tag" title={x.role ? label(x.role) : undefined}>{x.name}</span>)}</div> : <span className="muted">None</span>}
        </Group>
        <Group title="Clients" count={d.clients.length}>
          {d.clients.length ? <div className="rv-tags">{d.clients.map(x => <span key={x.id} className="rv-tag">{x.code}</span>)}</div> : <span className="muted">None</span>}
        </Group>
        <Group title="Firewall rules of affected servers" count={d.firewallRules.length}>
          {d.firewallRules.length ? <ul>{d.firewallRules.map(r => <li key={r.id}>{r.source} → {r.destination} <span className="mono">{r.protocol}{r.ports ? ` ${r.ports}` : ''}</span> · {r.purpose}</li>)}</ul> : <span className="muted">None recorded</span>}
        </Group>
      </div>}</QueryState>
    </TabSection>
  );
}

// ---------- Commitments ----------

export function CommitmentsTab({ c, createTo }: { c: CaseDto; createTo?: string }) {
  const statuses = [...new Set(c.commitments.map(m => m.status))];
  const [status, setStatus] = useState('all');
  const shown = c.commitments.filter(m => status === 'all' || m.status === status);
  const add = createTo && <Link className="btn" to={createTo}>+ Commitment</Link>;
  return (
    <TabSection title="Linked commitments" count={c.commitments.length} actions={add}
      toolbar={statuses.length > 1 && <FilterChips label="Commitment status" value={status} onChange={setStatus} options={[{ key: 'all', label: 'All', count: c.commitments.length }, ...statuses.map(s => ({ key: s, label: label(s), count: c.commitments.filter(m => m.status === s).length }))]} />}>
      {c.commitments.length === 0 ? (
        <EmptyState icon="commitment" title="No commitments linked">Promises made to the client about this ticket appear here with their due dates.</EmptyState>
      ) : (
        <div className="rv-table-wrap">
          <table className="rv-table">
            <caption className="sr">Linked commitments</caption>
            <thead><tr><th scope="col">Ref</th><th scope="col">Commitment</th><th scope="col">Status</th><th scope="col">Due</th></tr></thead>
            <tbody>{shown.map(m => (
              <tr key={m.id}>
                <td className="nowrap"><Link to={`/commitments/${m.id}`}>{m.ref}</Link></td>
                <td><TitledText text={m.title || m.description} /></td>
                <td className="nowrap"><StatusBadge value={m.status} /></td>
                <td className="nowrap">due {fmtDateTime(m.currentDueAt)}{m.timeZone && <div className="hint">{m.timeZone}</div>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </TabSection>
  );
}

// ---------- Field history ----------

type AuditRow = { id: number; at: string; userName: string; action: string; reason?: string; changes?: string };
const HISTORY_STEP = 50;
/** Background work is recorded as "system" (any case) or without a user. */
const isPerson = (name?: string | null) => !!name && name.trim().toLowerCase() !== 'system';

/** The ticket's audit entries as a timeline: who, when, which fields, before → after. Same rights and source as the Change history panel. */
export function TicketHistory({ caseId }: { caseId: number }) {
  const me = useMe().data;
  const resource = resourceForRecord('Case');
  const allowed = !!canAudit(me) && hasRight(me, resource, 'View') && hasRight(me, resource, 'DetailsView') && hasRight(me, resource, 'HistoryView');
  const [query, setQuery] = useState('');
  const q = useInfiniteQuery({
    queryKey: ['audit', 'Case', caseId, 'timeline'], enabled: allowed, initialPageParam: 1,
    queryFn: ({ pageParam }) => get<Paged<AuditRow>>(`/admin/audit${qs({ entityType: 'Case', entityId: caseId, page: pageParam, pageSize: HISTORY_STEP })}`),
    getNextPageParam: (last, all) => all.length * HISTORY_STEP < last.totalCount ? all.length + 1 : undefined
  });
  if (!allowed) return <TabSection title="Change history"><Restricted need="Change history needs the record details, View history and Change history rights." /></TabSection>;
  const rows = (q.data?.pages.flatMap(p => p.items) ?? []).map(r => ({ ...r, parsed: parseChanges(r.changes) }));
  const shown = rows.filter(r => matchesQuery(query, r.userName, r.action, label(r.action), r.reason, ...(r.parsed ?? []).flatMap(x => [x.field, x.from, x.to]), r.parsed ? null : r.changes));
  const total = q.data?.pages[0]?.totalCount ?? 0;
  return (
    <TabSection title="Change history" count={q.data ? total : undefined}
      intro="Every saved change to this ticket's fields, newest first. Comments and Jira activity are under Activity."
      toolbar={rows.length > 0 && <SearchField label="Filter by field, person or value" value={query} onChange={setQuery} />}>
      {q.isLoading ? <StateMessage kind="loading" /> : q.error ? <ErrorBox error={q.error} /> : rows.length === 0 ? <StateMessage kind="none" /> : shown.length === 0 ? <StateMessage kind="nomatch" /> : (
        <Timeline label="Change history">{shown.map(r => (
          <TimelineItem key={r.id} marker={<Avatar name={isPerson(r.userName) ? r.userName : null} />}
            title={<><b>{isPerson(r.userName) ? r.userName : 'System'}</b> <Badge tone="neutral">{label(r.action)}</Badge></>}
            meta={<>{fmtDateTime(r.at)}{r.reason && <span>· {r.reason}</span>}</>}>
            {r.parsed === null ? <div className="rv-tl-changes mono">{r.changes}</div> : r.parsed.length > 0 && (
              <FieldChanges changes={r.parsed} created={/^create/i.test(r.action)} />
            )}
          </TimelineItem>
        ))}</Timeline>
      )}
      {q.hasNextPage && <div className="rv-more"><button className="btn" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{q.isFetchingNextPage ? 'Loading…' : `Show more history (${total - rows.length})`}</button></div>}
    </TabSection>
  );
}

const SHOWN_FIELDS = 6;

/** The fields of one entry, before → after; a creation shows only the first values. Many fields: the first six, the rest on request. */
function FieldChanges({ changes, created }: { changes: { field: string; from: string; to: string }[]; created: boolean }) {
  const [all, setAll] = useState(false);
  const shown = all ? changes : changes.slice(0, SHOWN_FIELDS);
  return (
    <div className="rv-tl-changes">
      {shown.map(x => <div key={x.field} className="rv-tl-change"><b>{x.field}</b>{created && x.from === '—' ? <span className="rv-val new">{x.to}</span> : <ChangePair from={x.from} to={x.to} />}</div>)}
      {changes.length > SHOWN_FIELDS && <button type="button" className="linkbtn" style={{ alignSelf: 'flex-start' }} aria-expanded={all} onClick={() => setAll(a => !a)}>{all ? 'Show fewer fields' : `Show all ${changes.length} fields`}</button>}
    </div>
  );
}
