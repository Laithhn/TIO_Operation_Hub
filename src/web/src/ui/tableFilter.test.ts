import { describe, expect, it } from 'vitest';
import { activeCriteriaCount, isCriterionActive, isCriterionIncomplete, matchesTextFilter, rowMatches, type Criteria, type TextFilterOperator } from './tableFilter';

// GUI-09: the Filter badge counts exactly the criteria that change the rows.
const rows = [
  { alias: 'ACME', env: 'Production' },
  { alias: 'BETA', env: '' },
  { alias: 'GAMMA', env: 'Test' }
];
const keys = ['alias', 'env'];
const apply = (c: Criteria) => rows.filter(r => rowMatches(r, keys, c)).map(r => r.alias);
const criteria = (values: Record<string, string>, operators: Record<string, TextFilterOperator> = {}): Criteria => ({ values, operators });

describe('filter state matrix', () => {
  it('default blank criterion: not active, no rows removed', () => {
    const c = criteria({});
    expect(activeCriteriaCount(keys, c)).toBe(0);
    expect(apply(c)).toEqual(['ACME', 'BETA', 'GAMMA']);
  });

  it('non-default operator with a blank value: incomplete, never counted, no rows removed', () => {
    const c = criteria({}, { env: 'contains' });
    expect(isCriterionActive(undefined, 'contains')).toBe(false);
    expect(isCriterionIncomplete(undefined, 'contains')).toBe(true);
    expect(activeCriteriaCount(keys, c)).toBe(0);
    expect(apply(c)).toEqual(['ACME', 'BETA', 'GAMMA']);
  });

  it('whitespace-only value: not active', () => {
    const c = criteria({ env: '   ' }, { env: 'contains' });
    expect(activeCriteriaCount(keys, c)).toBe(0);
    expect(apply(c)).toEqual(['ACME', 'BETA', 'GAMMA']);
  });

  it('a value with the default operator: counted and applied', () => {
    const c = criteria({ alias: 'ac' });
    expect(activeCriteriaCount(keys, c)).toBe(1);
    expect(apply(c)).toEqual(['ACME']);
  });

  it('a value with a non-default operator: counted and applied', () => {
    const c = criteria({ env: 'duct' }, { env: 'contains' });
    expect(activeCriteriaCount(keys, c)).toBe(1);
    expect(apply(c)).toEqual(['ACME']);
  });

  it('explicit Empty operator: counted without a value and keeps only empty cells', () => {
    const c = criteria({}, { env: 'empty' });
    expect(isCriterionIncomplete(undefined, 'empty')).toBe(false);
    expect(activeCriteriaCount(keys, c)).toBe(1);
    expect(apply(c)).toEqual(['BETA']);
  });

  it('two criteria: both counted, both applied', () => {
    const c = criteria({ alias: 'a', env: 'test' }, { alias: 'ends', env: 'equal' });
    expect(activeCriteriaCount(keys, c)).toBe(2);
    expect(apply(c)).toEqual(['GAMMA']);
  });

  it('the badge always agrees with the rows: a counted criterion is one that the predicate applies', () => {
    const ops: TextFilterOperator[] = ['starts', 'ends', 'contains', 'equal', 'empty', 'not-starts', 'not-ends', 'not-contains', 'not-equal'];
    for (const op of ops) for (const v of ['', ' ', 'zzz']) {
      const c = criteria({ env: v }, { env: op });
      const counted = activeCriteriaCount(['env'], c) === 1;
      // An uncounted criterion leaves every row in place; a counted one is exactly what the predicate applies.
      if (!counted) expect(apply(c)).toEqual(['ACME', 'BETA', 'GAMMA']);
      else expect(apply(c)).toEqual(rows.filter(r => matchesTextFilter(r.env, v, op)).map(r => r.alias));
    }
  });
});

describe('matchesTextFilter', () => {
  it('compares trimmed, case-insensitive text', () => {
    expect(matchesTextFilter('  Production ', 'prod', 'starts')).toBe(true);
    expect(matchesTextFilter('Production', 'TION', 'ends')).toBe(true);
    expect(matchesTextFilter('Production', 'x', 'not-contains')).toBe(true);
    expect(matchesTextFilter('Production', 'production', 'not-equal')).toBe(false);
  });
});
