// A73: the Client Map page's data model — pure functions over the authorized per-client rows of /dashboard/insights (unit-tested).
// Every count on the page (country list, map, legend, details panel) is computed here from the same filtered client rows.
import { countryInfo, type WorldRegion } from '../ui/countryInfo';

export type MapClient = {
  id: number; code: string; name: string; country?: string | null; parentClientId?: number | null; environments: number; servers: number;
  openCases: number; overdueCases: number; openCommitments: number; overdueCommitments: number; activeContracts: number; renewalAttention: number;
  products?: string[]; projectManager?: string | null; logoUrl?: string | null;
};

/** One country's figures, in the shape the map (CountryDatum) expects, plus servers and contracts. */
export type CountryFigures = {
  country: string; iso?: string; region?: WorldRegion; clients: number; environments: number; servers: number; openCases: number; overdueCases: number;
  openCommitments: number; overdueCommitments: number; activeContracts: number; renewalAttention: number; clientCodes: string[];
};

export type LayerKey = 'clients' | 'servers' | 'cases' | 'overdue' | 'contracts';
export type Layer = {
  key: LayerKey; label: string; unit: string; icon: string; value: (d: CountryFigures) => number; alert?: (d: CountryFigures) => boolean; alertLabel?: string;
};
/** The map layers: the same five figures the map always offered. */
export const LAYERS: Layer[] = [
  { key: 'clients', label: 'Clients', unit: 'clients', icon: 'clients', value: d => d.clients, alert: d => d.overdueCases + d.overdueCommitments > 0, alertLabel: 'has overdue work' },
  { key: 'servers', label: 'Servers', unit: 'servers', icon: 'server', value: d => d.servers },
  { key: 'cases', label: 'Open cases', unit: 'open cases', icon: 'case', value: d => d.openCases, alert: d => d.overdueCases > 0, alertLabel: 'has overdue cases' },
  { key: 'overdue', label: 'Overdue', unit: 'overdue items', icon: 'warning', value: d => d.overdueCases + d.overdueCommitments, alert: d => d.overdueCases + d.overdueCommitments > 0, alertLabel: 'overdue cases or commitments' },
  { key: 'contracts', label: 'Contracts', unit: 'active contracts', icon: 'project', value: d => d.activeContracts, alert: d => d.renewalAttention > 0, alertLabel: 'renewal decision due' }
];
export const layerOf = (key: string): Layer => LAYERS.find(l => l.key === key) ?? LAYERS[0];

const countryKey = (c?: string | null) => (c ?? '').trim();

/** Clients of the chosen world region (all when none); clients without a country are kept only when no region is chosen. */
export function inRegion(clients: MapClient[], region?: string): MapClient[] {
  if (!region) return clients;
  return clients.filter(c => countryInfo(c.country)?.region === region);
}

/** Per-country sums over the clients (clients without a country are not on the map; see unknownCountry). */
export function byCountry(clients: MapClient[]): CountryFigures[] {
  const m = new Map<string, CountryFigures>();
  for (const c of clients) {
    const k = countryKey(c.country);
    if (!k) continue;
    let d = m.get(k);
    if (!d) {
      const info = countryInfo(k);
      d = { country: k, iso: info?.iso, region: info?.region, clients: 0, environments: 0, servers: 0, openCases: 0, overdueCases: 0, openCommitments: 0, overdueCommitments: 0, activeContracts: 0, renewalAttention: 0, clientCodes: [] };
      m.set(k, d);
    }
    d.clients++; d.environments += c.environments; d.servers += c.servers; d.openCases += c.openCases; d.overdueCases += c.overdueCases;
    d.openCommitments += c.openCommitments; d.overdueCommitments += c.overdueCommitments; d.activeContracts += c.activeContracts; d.renewalAttention += c.renewalAttention;
    d.clientCodes.push(c.code);
  }
  for (const d of m.values()) d.clientCodes.sort();
  return [...m.values()];
}

export const unknownCountry = (clients: MapClient[]) => clients.filter(c => !countryKey(c.country));

export type SortKey = 'value' | 'name';
/** Countries by the current layer's figure (largest first, then by client count and name) or by name. */
export function sortCountries(rows: CountryFigures[], sort: SortKey, layer: Layer): CountryFigures[] {
  return [...rows].sort((a, b) => sort === 'name' ? a.country.localeCompare(b.country)
    : layer.value(b) - layer.value(a) || b.clients - a.clients || a.country.localeCompare(b.country));
}

/** Countries whose name, ISO code or client aliases match the search text. */
export function searchCountries(rows: CountryFigures[], q: string): CountryFigures[] {
  const t = q.trim().toLowerCase();
  if (!t) return rows;
  return rows.filter(r => r.country.toLowerCase().includes(t) || r.iso?.toLowerCase() === t || r.clientCodes.some(c => c.toLowerCase().includes(t)));
}

/** Clients whose alias, name or country match the search text, by alias. */
export function searchClients(clients: MapClient[], q: string): MapClient[] {
  const t = q.trim().toLowerCase();
  const list = t ? clients.filter(c => c.code.toLowerCase().includes(t) || c.name.toLowerCase().includes(t) || (c.country ?? '').toLowerCase().includes(t)) : clients;
  return [...list].sort((a, b) => a.code.localeCompare(b.code));
}

export const clientsIn = (clients: MapClient[], country: string) => clients.filter(c => countryKey(c.country).toLowerCase() === country.trim().toLowerCase());

/** A client's operational state from its recorded figures (the rule of the map markers since A39): never a guessed value. */
export function clientStatus(c: MapClient): { tone: 'bad' | 'warn' | 'ok'; label: string } {
  const overdue = c.overdueCases + c.overdueCommitments;
  if (overdue > 0) return { tone: 'bad', label: `${overdue} overdue` };
  if (c.renewalAttention > 0) return { tone: 'warn', label: `${c.renewalAttention} renewal due` };
  if (c.openCases > 0) return { tone: 'warn', label: `${c.openCases} open case${c.openCases === 1 ? '' : 's'}` };
  return { tone: 'ok', label: 'Nothing overdue' };
}
