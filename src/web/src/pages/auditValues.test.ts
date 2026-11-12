import { describe, expect, it } from 'vitest';
import { parseExactJson } from './auditValues';

// TIO-BUG-002: audit before/after values must not be rounded on their way to the screen.
describe('parseExactJson', () => {
  it('keeps a 64-bit integer beyond 2^53 exactly as stored, where JSON.parse alone would round it', () => {
    const json = '{"TioUserId":[null,-9223372036854774808]}';
    expect(String((JSON.parse(json) as { TioUserId: unknown[] }).TioUserId[1])).toBe('-9223372036854775000'); // the defect's shape
    const d = parseExactJson(json) as { TioUserId: unknown[] };
    expect(d.TioUserId[0]).toBeNull();
    expect(d.TioUserId[1]).toBe('-9223372036854774808');
  });

  it('leaves ordinary identifiers, decimals and text unchanged', () => {
    const d = parseExactJson('{"TioUserId":[null,42],"Max":[9007199254740991,-9007199254740991],"Amount":[1.5,2.25],"Name":["a","9223372036854775807"]}') as Record<string, unknown[]>;
    expect(d.TioUserId).toEqual([null, 42]);
    expect(d.Max).toEqual([9007199254740991, -9007199254740991]);
    expect(d.Amount).toEqual([1.5, 2.25]);
    expect(d.Name).toEqual(['a', '9223372036854775807']);
  });

  it('reads values the server now writes as text for large integers', () => {
    expect((parseExactJson('{"Id":[null,"9223372036854775807"]}') as { Id: unknown[] }).Id[1]).toBe('9223372036854775807');
  });

  it('still rejects text that is not JSON', () => {
    expect(() => parseExactJson('not json')).toThrow();
  });
});
