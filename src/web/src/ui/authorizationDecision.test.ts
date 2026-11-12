import { describe, expect, it } from 'vitest';
import { allowsRightCheck } from './authorizationDecision';

describe('presentation permission checks', () => {
  const complete = { rights: ['Cases:View'] };

  it('enforces registered prerequisites and ignores casing like route checks', () => {
    expect(allowsRightCheck({ rights: ['Cases:Create'] }, { right: 'Cases:Create' })).toBe(false);
    expect(allowsRightCheck({ rights: ['Cases:View', 'Cases:Create'] }, { right: 'Cases:Create' })).toBe(true);
    expect(allowsRightCheck(complete, { right: 'cases:view' })).toBe(true);
    expect(allowsRightCheck({ rights: ['unknown:View'] }, { right: 'unknown:View' })).toBe(false);
  });

  it('supports combined all-of and any-of requirements without granting empty checks', () => {
    expect(allowsRightCheck(complete, { allOf: ['Cases:View'], anyOf: ['Cases:Delete', 'Cases:View'] })).toBe(true);
    expect(allowsRightCheck(complete, { allOf: ['Cases:View', 'Cases:Delete'] })).toBe(false);
    expect(allowsRightCheck(complete, { anyOf: ['Cases:Delete'] })).toBe(false);
    expect(allowsRightCheck(complete, {})).toBe(false);
    expect(allowsRightCheck(complete, { allOf: [], anyOf: [] })).toBe(false);
    expect(allowsRightCheck(undefined, { right: 'Cases:View' })).toBe(false);
  });
});
