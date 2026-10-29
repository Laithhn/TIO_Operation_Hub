import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { get, qs, type Paged } from '../api';
import { fmtDate, fmtDateTime } from '../format';
import { useMe, useUrlState } from '../hooks';
import { ClientLogo, useClientLogos } from '../ui/ClientLogo';
import { WORLD_REGIONS } from '../ui/countryInfo';
import { Icon } from '../ui/Icon';
import { useClientOptions, useProductOptions, useTeamOptions } from './common';
import {
  byCountry, clientsIn, clientStatus, inRegion, LAYERS, layerOf, searchClients, searchCountries, sortCountries, unknownCountry,
  type CountryFigures, type Layer, type MapClient, type SortKey
} from './clientMapModel';
import './ClientMap.css';

const LeafletMap = lazy(() => import('../ui/LeafletMap'));

function useMedia(query: string) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const f = () => setOn(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [query]);
  return on;
}

/**
 * A73 (Client Map redesign brief, 29 Oct 2026): the geographic operations view — a dark, map-first page with a country explorer, the
 * world map and the selected country's details. Data: the authorized per-client rows of /dashboard/insights (client, team and product
 * filters on the server; region, search and sort here), and for the details tabs the existing case, contract and asset lists filtered by
 * the country. Not an executive dashboard: figures are per country and lead to the records.
 */
type Insights = { evaluatedAt: string; countries: { clients: MapClient[] } };

function Iso({ code }: { code?: string }) {
  return code ? <span className="cmap-iso" aria-hidden="true">{code}</span> : <span className="cmap-iso none" aria-hidden="true" />;
}

function Select({ label, value, onChange, options, empty }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; empty: string }) {
  return (
    <label className="cmap-select">
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{empty}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Tabs<T extends string>({ value, onChange, tabs, label }: { value: T; onChange: (v: T) => void; tabs: { key: T; label: string }[]; label: string }) {
  const keys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex(t => t.key === value);
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const t = tabs[(n + tabs.length) % tabs.length];
    onChange(t.key);
    (e.currentTarget.querySelector(`[data-tab="${t.key}"]`) as HTMLButtonElement | null)?.focus();
  };
  return (
    <div className="cmap-tabs" role="tablist" aria-label={label} onKeyDown={keys}>
      {tabs.map(t => <button key={t.key} type="button" role="tab" data-tab={t.key} aria-selected={t.key === value} tabIndex={t.key === value ? 0 : -1} onClick={() => onChange(t.key)}>{t.label}</button>)}
    </div>
  );
}

/** Left panel: countries (or clients) of the filtered portfolio, searchable and sortable. */
function Explorer({ rows, clients, layer, selected, onSelect, unknown }: {
  rows: CountryFigures[]; clients: MapClient[]; layer: Layer; selected: string; onSelect: (c: string) => void; unknown: number;
}) {
  const [tab, setTab] = useState<'countries' | 'clients'>('countries');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('value');
  const list = sortCountries(searchCountries(rows, q), sort, layer);
  const people = searchClients(clients, q);
  const max = Math.max(1, ...rows.map(layer.value));
  return (
    <>
      <Tabs label="Explore by" value={tab} onChange={setTab} tabs={[{ key: 'countries', label: `Countries (${rows.length})` }, { key: 'clients', label: `Clients (${clients.length})` }]} />
      <div className="cmap-explore-tools">
        <label className="cmap-search"><Icon name="search" size={16} />
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={tab === 'countries' ? 'Search country or client…' : 'Search client…'} aria-label={tab === 'countries' ? 'Search countries' : 'Search clients'} /></label>
        {tab === 'countries' && <label className="cmap-sort"><span>Sort by</span>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Sort countries">
            <option value="value">Number of {layer.unit}</option><option value="name">Name</option>
          </select></label>}
      </div>
      {tab === 'countries' ? (
        <ul className="cmap-list" aria-label="Countries">
          {list.length === 0 && <li className="cmap-empty">{q ? 'No country matches the search.' : 'No countries in the current filters.'}</li>}
          {list.map(r => {
            const v = layer.value(r);
            const on = r.country === selected;
            return (
              <li key={r.country}>
                <button type="button" className={`cmap-country${on ? ' on' : ''}`} aria-pressed={on} onClick={() => onSelect(on ? '' : r.country)}
                  aria-label={`${r.country}: ${v} ${layer.unit}, ${r.clients} client${r.clients === 1 ? '' : 's'}`}>
                  <Iso code={r.iso} />
                  <span className="cmap-country-name"><b>{r.country}</b><span>{r.clientCodes.join(', ')}</span></span>
                  <span className="cmap-country-value">{v}</span>
                  <span className="cmap-meter" aria-hidden="true"><i style={{ width: `${Math.max(v ? 6 : 0, (v / max) * 100)}%` }} /></span>
                  {layer.alert?.(r) && <span className="cmap-alert" title={layer.alertLabel} aria-hidden="true" />}
                  <Icon name="chevron" size={14} />
                </button>
              </li>
            );
          })}
          {unknown > 0 && <li className="cmap-note">{unknown} client{unknown === 1 ? '' : 's'} without a recorded country {unknown === 1 ? 'is' : 'are'} not on the map.</li>}
        </ul>
      ) : (
        <ul className="cmap-list" aria-label="Clients">
          {people.length === 0 && <li className="cmap-empty">No client matches.</li>}
          {people.map(c => (
            <li key={c.id}>
              <button type="button" className={`cmap-client${c.country && c.country === selected ? ' on' : ''}`} onClick={() => c.country && onSelect(c.country)} disabled={!c.country}
                aria-label={`${c.code} ${c.name}${c.country ? `, ${c.country}. Show the country` : ', no country recorded'}`}>
                <ClientLogo clientId={c.id} code={c.code} name={c.name} size="sm" decorative />
                <span className="cmap-country-name"><b>{c.code}</b><span>{c.name}</span></span>
                <span className="cmap-client-country">{c.country ?? 'No country'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type DetailTab = 'clients' | 'servers' | 'cases' | 'contracts';
type CaseRow = { id: number; ref: string; title: string; priority: string; status: string; clientId?: number; clientCode?: string; dueAt?: string; overdue: boolean; ownerName?: string };
type ContractRow = { id: number; ref: string; title: string; clientId: number; clientCode: string; endDate?: string; renewalState: string };
type AssetRow = { id: number; name: string; type: string; clientId: number; clientCode: string; environmentId: number; environmentName: string; lifecycle: string };

const RENEWAL: Record<string, string> = { Expired: 'Ended, still active', RenewalDue: 'Renewal due', EndDateUnknown: 'No end date', Current: 'Current' };

function MoreLink({ to, shown, total, what }: { to: string; shown: number; total: number; what: string }) {
  return <div className="cmap-more"><Link to={to}>{total > shown ? `View all ${total} ${what}` : `Open the ${what} list`} <Icon name="chevron" size={12} /></Link></div>;
}

function Loading({ q, children }: { q: { isLoading: boolean; isError: boolean; refetch: () => unknown }; children: ReactNode }) {
  if (q.isLoading) return <div className="cmap-empty" role="status"><span className="spin" /> Loading…</div>;
  if (q.isError) return <div className="cmap-empty" role="alert">This list could not be loaded. <button type="button" className="cmap-link" onClick={() => q.refetch()}>Try again</button></div>;
  return <>{children}</>;
}

/** Right panel: the selected country's figures and its clients, servers, open cases and active contracts. */
function Details({ d, clients, f, onClose }: { d: CountryFigures; clients: MapClient[]; f: { teamId: string; productId: string; clientId: string }; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>('clients');
  useEffect(() => setTab('clients'), [d.country]);
  const base = { country: d.country, clientId: f.clientId || undefined, productId: f.productId || undefined };
  const servers = useQuery({ queryKey: ['cmap', 'assets', base], queryFn: () => get<Paged<AssetRow>>(`/assets${qs({ ...base, pageSize: 50 })}`), enabled: tab === 'servers' });
  const caseParams = { ...base, teamId: f.teamId || undefined, status: 'open', sort: 'due', pageSize: 50 };
  const cases = useQuery({ queryKey: ['cmap', 'cases', caseParams], queryFn: () => get<Paged<CaseRow>>(`/cases${qs(caseParams)}`), enabled: tab === 'cases' });
  const contracts = useQuery({ queryKey: ['cmap', 'contracts', base], queryFn: () => get<Paged<ContractRow>>(`/contracts${qs({ ...base, status: 'Active', pageSize: 50 })}`), enabled: tab === 'contracts' });
  const list = [...clients].sort((a, b) => a.code.localeCompare(b.code));
  const overdue = d.overdueCases + d.overdueCommitments;
  return (
    <div className="cmap-details">
      <div className="cmap-details-head">
        <Iso code={d.iso} />
        <div>
          <h2>{d.country}</h2>
          <p>{d.clients} client{d.clients === 1 ? '' : 's'} · {d.servers} server{d.servers === 1 ? '' : 's'} · {d.openCases} open case{d.openCases === 1 ? '' : 's'}
            {overdue > 0 && <> · <span className="t-bad">{overdue} overdue</span></>} · {d.activeContracts} active contract{d.activeContracts === 1 ? '' : 's'}</p>
        </div>
        <button type="button" className="cmap-icon-btn" onClick={onClose} aria-label="Close country details" title="Close"><Icon name="close" size={18} /></button>
      </div>
      <Tabs label="Country details" value={tab} onChange={setTab} tabs={[
        { key: 'clients', label: `Clients (${d.clients})` }, { key: 'servers', label: `Servers (${d.servers})` },
        { key: 'cases', label: `Cases (${d.openCases})` }, { key: 'contracts', label: `Contracts (${d.activeContracts})` }]} />
      <div className="cmap-details-body" role="tabpanel" aria-label={`${d.country}: ${tab}`}>
        {tab === 'clients' && (
          <table className="cmap-table">
            <caption className="sr">Clients in {d.country}</caption>
            <thead><tr><th scope="col">Client</th><th scope="col">Products</th><th scope="col">Status</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
            <tbody>{list.map(c => {
              const st = clientStatus(c);
              return (
                <tr key={c.id}>
                  <td><span className="cmap-cell-client"><ClientLogo clientId={c.id} code={c.code} name={c.name} size="sm" decorative /><span><b>{c.code}</b><span>{c.name}{c.parentClientId ? ' · sub-client' : ''}</span>
                    <span className="cmap-pm">Project manager: {c.projectManager ?? 'not assigned'}</span></span></span></td>
                  <td>{c.products?.length ? c.products.join(', ') : <span className="muted">None installed</span>}</td>
                  <td><span className={`cmap-status t-${st.tone}`}><i aria-hidden="true" />{st.label}</span></td>
                  <td><Link className="cmap-open" to={`/clients/${c.id}`} aria-label={`Open client ${c.code}`}><Icon name="chevron" size={14} /></Link></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
        {tab === 'servers' && <Loading q={servers}>{servers.data && (servers.data.items.length === 0 ? <div className="cmap-empty">No servers recorded for these clients.</div> : <>
          <table className="cmap-table">
            <caption className="sr">Servers in {d.country}</caption>
            <thead><tr><th scope="col">Server</th><th scope="col">Client / environment</th><th scope="col">Type</th></tr></thead>
            <tbody>{servers.data.items.map(a => (
              <tr key={a.id}><td><Link to={`/assets/${a.id}`}>{a.name}</Link></td><td>{a.clientCode} · <Link to={`/environments/${a.environmentId}`}>{a.environmentName}</Link></td><td>{a.type}</td></tr>
            ))}</tbody>
          </table>
          <MoreLink to={`/assets${qs(base)}`} shown={servers.data.items.length} total={servers.data.totalCount} what="servers" /></>)}</Loading>}
        {tab === 'cases' && <Loading q={cases}>{cases.data && (cases.data.items.length === 0 ? <div className="cmap-empty">No open cases.</div> : <>
          <table className="cmap-table">
            <caption className="sr">Open cases in {d.country}</caption>
            <thead><tr><th scope="col">Case</th><th scope="col">Client</th><th scope="col">Priority</th><th scope="col">Due</th></tr></thead>
            <tbody>{cases.data.items.map(k => (
              <tr key={k.id}><td><Link to={`/cases/${k.id}`}>{k.ref}</Link><span className="cmap-sub">{k.title}</span></td><td>{k.clientCode}</td><td>{k.priority}</td>
                <td>{k.dueAt ? <span className={k.overdue ? 't-bad' : undefined}>{fmtDate(k.dueAt)}{k.overdue && ' · overdue'}</span> : <span className="muted">No due date</span>}</td></tr>
            ))}</tbody>
          </table>
          <MoreLink to={`/cases${qs({ country: d.country, clientId: f.clientId || undefined, productId: f.productId || undefined, teamId: f.teamId || undefined })}`} shown={cases.data.items.length} total={cases.data.totalCount} what="open cases" /></>)}</Loading>}
        {tab === 'contracts' && <Loading q={contracts}>{contracts.data && (contracts.data.items.length === 0 ? <div className="cmap-empty">No active contracts.</div> : <>
          <table className="cmap-table">
            <caption className="sr">Active contracts in {d.country}</caption>
            <thead><tr><th scope="col">Contract</th><th scope="col">Client</th><th scope="col">Ends</th><th scope="col">Renewal</th></tr></thead>
            <tbody>{contracts.data.items.map(k => (
              <tr key={k.id}><td><Link to={`/contracts/${k.id}`}>{k.ref}</Link><span className="cmap-sub">{k.title}</span></td><td>{k.clientCode}</td><td>{k.endDate ? fmtDate(k.endDate) : <span className="muted">No end date</span>}</td>
                <td><span className={k.renewalState === 'Current' ? undefined : 't-warn'}>{RENEWAL[k.renewalState] ?? k.renewalState}</span></td></tr>
            ))}</tbody>
          </table>
          <MoreLink to={`/contracts${qs({ ...base, status: 'Active' })}`} shown={contracts.data.items.length} total={contracts.data.totalCount} what="active contracts" /></>)}</Loading>}
      </div>
      <div className="cmap-foot-links">
        <Link className="cmap-all" to={`/clients${qs({ country: d.country })}`}>View all clients in {d.country} <Icon name="chevron" size={12} /></Link>
        <Link className="cmap-all" to={`/${qs({ clientId: f.clientId || undefined, teamId: f.teamId || undefined, productId: f.productId || undefined, country: d.country })}`}
          aria-label={`Show the overview for ${d.country}`}>Operations Command Center for {d.country} <Icon name="chevron" size={12} /></Link>
      </div>
    </div>
  );
}

export function ClientMap() {
  const me = useMe().data!;
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, set] = useUrlState({ clientId: '', teamId: '', productId: '', region: '', country: '', layer: 'clients' });
  const params = { clientId: f.clientId, teamId: f.teamId, productId: f.productId };
  const insights = useQuery({ queryKey: ['insights', params], queryFn: () => get<Insights>(`/dashboard/insights${qs(params)}`), placeholderData: keepPreviousData });
  const clientOptions = useClientOptions();
  const teams = useTeamOptions();
  const products = useProductOptions();
  const logos = useClientLogos();
  const layer = layerOf(f.layer);
  const all = insights.data?.countries.clients;
  // One filtered client set feeds the list, the map, the legend and the details panel.
  const clients = useMemo(() => inRegion(all ?? [], f.region).map(c => ({ ...c, logoUrl: logos.get(c.id) ?? null })), [all, f.region, logos]);
  const rows = useMemo(() => byCountry(clients), [clients]);
  const selected = rows.find(r => r.country === f.country);
  // A selected country that the filters exclude is cleared (never stale details).
  useEffect(() => { if (insights.data && f.country && !selected) set({ country: '' }); }, [insights.data, f.country, selected]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.title = 'Client Map · TIO Operations Hub'; }, []);
  const compact = useMedia('(max-width: 1023px)');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const firstCompact = useRef(true);
  useEffect(() => { if (compact && firstCompact.current) { setLeftOpen(false); firstCompact.current = false; } }, [compact]);
  const select = (c: string) => { set({ country: c }); if (c) { setRightOpen(true); if (compact) setLeftOpen(false); } };
  const metric = useMemo(() => ({ key: layer.key, label: layer.label === 'Overdue' ? 'Overdue items' : layer.label === 'Contracts' ? 'Active contracts' : layer.label,
    value: layer.value as never, alert: layer.alert as never, alertLabel: layer.alertLabel }), [layer]);
  const totals = (l: Layer) => rows.reduce((s, r) => s + l.value(r), 0);
  const unknown = unknownCountry(clients).length;
  const filtered = !!(f.clientId || f.teamId || f.productId || f.region);
  const refreshing = insights.isFetching;
  const showRight = rightOpen && (!compact || !!selected);
  const regionCounts = useMemo(() => new Map(WORLD_REGIONS.map(r => [r.key, inRegion(all ?? [], r.key).length])), [all]);
  return (
    <div className={`cmap${leftOpen ? ' left-open' : ' left-closed'}${showRight ? ' right-open' : ' right-closed'}`}>
      <div className="cmap-bar" role="region" aria-label="Client Map toolbar">
        <div className="cmap-title">
          <h1>Client Map</h1>
          <p>{insights.data ? <>{clients.length} client{clients.length === 1 ? '' : 's'} in {rows.length} countr{rows.length === 1 ? 'y' : 'ies'} · as of <time dateTime={insights.data.evaluatedAt}>{fmtDateTime(insights.data.evaluatedAt)}</time> ({me.timeZone})</> : 'Loading…'}</p>
        </div>
        <div className="cmap-layers" role="radiogroup" aria-label="Map layer">
          {LAYERS.map(l => (
            <button key={l.key} type="button" role="radio" aria-checked={l.key === layer.key} className={l.key === layer.key ? 'on' : undefined} onClick={() => set({ layer: l.key })}>
              <Icon name={l.icon} size={16} /><span>{l.label}</span>{insights.data && <b>{totals(l)}</b>}
            </button>
          ))}
        </div>
        {compact && <button type="button" className="cmap-btn" aria-expanded={filtersOpen} aria-controls="cmap-filters" onClick={() => setFiltersOpen(o => !o)}>
          <Icon name="filter" size={16} /> Filters{filtered ? ' (on)' : ''}</button>}
        <div id="cmap-filters" className={`cmap-filters${compact && !filtersOpen ? ' hidden' : ''}`}>
          <Select label="Client" value={f.clientId} onChange={v => set({ clientId: v })} options={clientOptions} empty="All authorized clients" />
          <Select label="Region" value={f.region} onChange={v => set({ region: v })} empty="All regions"
            options={WORLD_REGIONS.filter(r => (regionCounts.get(r.key) ?? 0) > 0 || r.key === f.region).map(r => ({ value: r.key, label: `${r.label} (${regionCounts.get(r.key) ?? 0})` }))} />
          <Select label="Team" value={f.teamId} onChange={v => set({ teamId: v })} options={teams} empty="All teams" />
          <Select label="Product" value={f.productId} onChange={v => set({ productId: v })} options={products} empty="All products" />
          <button type="button" className="cmap-icon-btn" onClick={() => set({ clientId: '', teamId: '', productId: '', region: '' })} disabled={!filtered} aria-label="Reset filters" title="Reset filters"><Icon name="close" size={16} /></button>
          <button type="button" className="cmap-icon-btn" onClick={() => qc.invalidateQueries({ predicate: q => ['insights', 'cmap', 'client-logos'].includes(String(q.queryKey[0])) })} disabled={refreshing}
            aria-label="Refresh" title="Refresh">{refreshing ? <span className="spin" /> : <Icon name="history" size={16} />}</button>
        </div>
        <Link className="cmap-btn cmap-exec" to={`/${qs(params)}`}>Operations Command Center</Link>
      </div>
      {f.teamId && <p className="cmap-scope">The team filter narrows the open and overdue case counts; clients, servers and contracts are not assigned to teams.</p>}
      <div className="cmap-body">
        <aside className="cmap-left" aria-label="Country explorer" id="cmap-left" hidden={!leftOpen}>
          {all && <Explorer rows={rows} clients={clients} layer={layer} selected={f.country} onSelect={select} unknown={unknown} />}
        </aside>
        <section className="cmap-center" aria-label="Map">
          <div className="cmap-center-tools">
            <button type="button" className="cmap-btn" aria-expanded={leftOpen} aria-controls="cmap-left" onClick={() => setLeftOpen(o => !o)}>
              <Icon name="list" size={16} /> {leftOpen ? 'Hide countries' : 'Countries'}</button>
            {selected && !showRight && <button type="button" className="cmap-btn" onClick={() => setRightOpen(true)}><Icon name="info" size={16} /> {selected.country} details</button>}
          </div>
          {insights.isLoading && <div className="cmap-empty cmap-loading" role="status"><span className="spin" /> Loading the map…</div>}
          {insights.isError && <div className="cmap-empty cmap-loading" role="alert">The client map could not be loaded. <button type="button" className="cmap-link" onClick={() => insights.refetch()}>Try again</button></div>}
          {insights.data && rows.length === 0 && <div className="cmap-overlay" role="status">No authorized clients with a recorded country match the current filters.</div>}
          {insights.data && <Suspense fallback={<div className="cmap-empty cmap-loading"><span className="spin" /> Loading the map…</div>}>
            <LeafletMap variant="dark" data={rows} clients={clients} metric={metric} selected={f.country || undefined} onSelect={c => select(c ?? '')}
              onOpenClient={id => nav(`/clients/${id}`)} tileUrl={me.app.map?.tileUrl} attribution={me.app.map?.attribution} />
          </Suspense>}
        </section>
        {showRight && (
          <aside className="cmap-right" aria-label="Country details">
            {selected ? <Details d={selected} clients={clientsIn(clients, selected.country)} f={f} onClose={() => { set({ country: '' }); setRightOpen(false); }} />
              : <div className="cmap-pick">
                  <Icon name="map" size={28} />
                  <h2>Select a country</h2>
                  <p>Choose a country on the map or in the list to see its clients, servers, open cases and active contracts.</p>
                  <button type="button" className="cmap-btn" onClick={() => setRightOpen(false)}>Hide this panel</button>
                </div>}
          </aside>
        )}
      </div>
    </div>
  );
}
