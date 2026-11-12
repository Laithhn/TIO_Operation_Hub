import { describe, expect, it } from 'vitest';
import { affectedRows, matchesQuery, minutes } from './model';

// A106: the Affected records tab lists what the ticket returned, and nothing else.
describe('affectedRows', () => {
  it('lists environments, assets and components with links where the record has a page', () => {
    const rows = affectedRows({
      environments: [{ id: 1, name: 'Production', type: 'Production', regionCode: 'RUH' }],
      assets: [{ id: 2, name: 'APP-01', type: 'Server' }],
      components: [{ id: 3, name: 'Backoffice', role: 'Application', installation: 'R3 PROD' }]
    });
    expect(rows.map(r => [r.kind, r.name, r.to])).toEqual([
      ['environment', 'RUH / Production', '/environments/1'],
      ['asset', 'APP-01', '/assets/2'],
      ['component', 'Backoffice', undefined]
    ]);
    expect(rows[2].detail).toBe('Installation R3 PROD');
  });

  it('is empty when the ticket records nothing (no invented rows)', () => {
    expect(affectedRows({ environments: [], assets: [], components: [] })).toEqual([]);
  });
});

describe('matchesQuery', () => {
  it('needs every word, in any order and case', () => {
    expect(matchesQuery('prod app', 'APP-01', 'Production')).toBe(true);
    expect(matchesQuery('prod web', 'APP-01', 'Production')).toBe(false);
    expect(matchesQuery('   ', undefined, null)).toBe(true);
  });
});

describe('minutes', () => {
  it('reads as before (moved, unchanged)', () => {
    expect(minutes(undefined)).toBe('—');
    expect(minutes(45)).toBe('45 min');
    expect(minutes(240)).toBe('4 h');
    expect(minutes(130)).toBe('2 h 10 min');
  });
});
