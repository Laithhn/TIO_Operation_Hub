import { describe, expect, it } from 'vitest';
import { COUNTRY_NAMES, countryInfo } from '../ui/countryInfo';
import { byCountry, clientsIn, clientStatus, inRegion, LAYERS, layerOf, searchClients, searchCountries, sortCountries, unknownCountry, type MapClient } from './clientMapModel';

// A73: the Client Map's per-country figures, region filter, search, sort, layers and client status.
// Vitest runs in Node; the web project has no Node types, so the file reader is typed here.
const { readFileSync } = (globalThis as unknown as { process: { getBuiltinModule(name: string): { readFileSync(path: URL, encoding: string): string } } })
  .process.getBuiltinModule('node:fs');

const c = (id: number, code: string, country: string | null, p: Partial<MapClient> = {}): MapClient => ({
  id, code, name: `Fictional ${code}`, country, environments: 1, servers: 2, openCases: 1, overdueCases: 0, openCommitments: 1, overdueCommitments: 0,
  activeContracts: 1, renewalAttention: 0, ...p
});
const sample = [
  c(1, 'NTA', 'Saudi Arabia', { overdueCases: 2, openCases: 3 }), c(2, 'HCP', 'United Arab Emirates', { servers: 5 }), c(3, 'ONB', 'Bahrain', { openCases: 0 }),
  c(4, 'KEN', 'Kenya', { activeContracts: 2, renewalAttention: 1 }), c(5, 'UAE2', ' United Arab Emirates ', { openCases: 0 }), c(6, 'NOC', null)
];

describe('per-country figures', () => {
  it('sums the clients of each country (trimmed names) and leaves clients without a country off the map', () => {
    const rows = byCountry(sample);
    expect(rows.map(r => r.country).sort()).toEqual(['Bahrain', 'Kenya', 'Saudi Arabia', 'United Arab Emirates']);
    const uae = rows.find(r => r.country === 'United Arab Emirates')!;
    expect(uae).toMatchObject({ clients: 2, servers: 7, openCases: 1, iso: 'AE', region: 'Western Asia', clientCodes: ['HCP', 'UAE2'] });
    expect(unknownCountry(sample).map(x => x.code)).toEqual(['NOC']);
    expect(clientsIn(sample, 'united arab emirates').map(x => x.code)).toEqual(['HCP', 'UAE2']);
  });

  it('filters by world region, keeping every count consistent', () => {
    const africa = inRegion(sample, 'Africa');
    expect(africa.map(x => x.code)).toEqual(['KEN']);
    expect(byCountry(africa)).toHaveLength(1);
    expect(inRegion(sample, '')).toHaveLength(sample.length);
    expect(inRegion(sample, 'Western Asia').map(x => x.code)).toEqual(['NTA', 'HCP', 'ONB', 'UAE2']);
  });
});

describe('layers, sorting and search', () => {
  const rows = byCountry(sample);
  it('offers the five map layers with their figures and alerts', () => {
    expect(LAYERS.map(l => l.label)).toEqual(['Clients', 'Servers', 'Open cases', 'Overdue', 'Contracts']);
    const sa = rows.find(r => r.country === 'Saudi Arabia')!;
    expect(layerOf('overdue').value(sa)).toBe(2);
    expect(layerOf('overdue').alert!(sa)).toBe(true);
    expect(layerOf('contracts').alert!(rows.find(r => r.country === 'Kenya')!)).toBe(true);
    expect(layerOf('nonsense').key).toBe('clients');
  });

  it('sorts by the layer figure (then clients, then name) or by name', () => {
    expect(sortCountries(rows, 'value', layerOf('clients')).map(r => r.country)[0]).toBe('United Arab Emirates');
    expect(sortCountries(rows, 'value', layerOf('servers')).map(r => r.country)[0]).toBe('United Arab Emirates');
    expect(sortCountries(rows, 'value', layerOf('cases')).map(r => r.country)[0]).toBe('Saudi Arabia');
    expect(sortCountries(rows, 'name', layerOf('clients')).map(r => r.country)).toEqual(['Bahrain', 'Kenya', 'Saudi Arabia', 'United Arab Emirates']);
  });

  it('finds countries by name, ISO code or client alias, and clients by alias, name or country', () => {
    expect(searchCountries(rows, 'saudi').map(r => r.country)).toEqual(['Saudi Arabia']);
    expect(searchCountries(rows, 'ke').map(r => r.country)).toEqual(['Kenya']);
    expect(searchCountries(rows, 'hcp').map(r => r.country)).toEqual(['United Arab Emirates']);
    expect(searchCountries(rows, '  ')).toHaveLength(4);
    expect(searchClients(sample, 'kenya').map(x => x.code)).toEqual(['KEN']);
    expect(searchClients(sample, '').map(x => x.code)).toEqual(['HCP', 'KEN', 'NOC', 'NTA', 'ONB', 'UAE2']);
  });
});

describe('client status', () => {
  it('derives the state from recorded figures only', () => {
    expect(clientStatus(sample[0])).toEqual({ tone: 'bad', label: '2 overdue' });
    expect(clientStatus(sample[3])).toEqual({ tone: 'warn', label: '1 renewal due' });
    expect(clientStatus(sample[1])).toEqual({ tone: 'warn', label: '1 open case' });
    expect(clientStatus(sample[2])).toEqual({ tone: 'ok', label: 'Nothing overdue' });
  });
});

describe('country reference', () => {
  it('has an ISO code and region for every country a client can have (Common/Countries.cs)', () => {
    const cs = readFileSync(new URL('../../../TioHub.Api/Common/Countries.cs', import.meta.url), 'utf-8');
    const list = cs.slice(cs.indexOf('All ='), cs.indexOf('];'));
    const names = [...list.matchAll(/"([^"]+)"/g)].map(m => m[1]);
    expect(names.length).toBeGreaterThan(190);
    expect(names.filter(n => !countryInfo(n))).toEqual([]);
    expect(COUNTRY_NAMES.filter(n => !names.includes(n))).toEqual([]);
    const isos = COUNTRY_NAMES.map(n => countryInfo(n)!.iso);
    expect(new Set(isos).size).toBe(isos.length);
    expect(isos.every(i => /^[A-Z]{2}$/.test(i))).toBe(true);
  });
});
