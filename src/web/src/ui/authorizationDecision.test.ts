import { describe, expect, it } from 'vitest';
import { allowsPermissionCheck } from './authorizationDecision';

describe('presentation permission checks', () => {
  const complete = { permissions: ['module.cases:Access', 'area.Cases:Access', 'Cases:View'] };

  it('enforces registered prerequisites and ignores casing like route checks', () => {
    expect(allowsPermissionCheck({ permissions: ['Cases:View'] }, { permission: 'Cases:View' })).toBe(false);
    expect(allowsPermissionCheck(complete, { permission: 'cases:view' })).toBe(true);
    expect(allowsPermissionCheck({ permissions: ['unknown:View'] }, { permission: 'unknown:View' })).toBe(false);
  });

  it('supports combined all-of and any-of requirements without granting empty checks', () => {
    expect(allowsPermissionCheck(complete, { allOf: ['Cases:View'], anyOf: ['Cases:Delete', 'Cases:View'] })).toBe(true);
    expect(allowsPermissionCheck(complete, { allOf: ['Cases:View', 'Cases:Delete'] })).toBe(false);
    expect(allowsPermissionCheck(complete, { anyOf: ['Cases:Delete'] })).toBe(false);
    expect(allowsPermissionCheck(complete, {})).toBe(false);
    expect(allowsPermissionCheck(complete, { allOf: [], anyOf: [] })).toBe(false);
    expect(allowsPermissionCheck(undefined, { permission: 'Cases:View' })).toBe(false);
  });
});
