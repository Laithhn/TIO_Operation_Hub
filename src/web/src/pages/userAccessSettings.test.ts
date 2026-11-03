import { describe, expect, it } from 'vitest';
import { userAccessSettings } from './userAccessSettings';

describe('user access settings in user administration', () => {
  it('preserves stored scope and grants when editing a user', () => {
    const scopes = [{ kind: 'Project' as const, projectId: 42 }];
    expect(userAccessSettings({ allClients: false, allInternal: true, grants: ['Export', 'Audit'], scopes })).toEqual({
      allClients: false, allInternal: true, export: true, technicalDetail: false, audit: true, scopes
    });
  });

  it('does not assign stored access flags to a new user', () => {
    expect(userAccessSettings(null)).toEqual({
      allClients: false, allInternal: false, export: false, technicalDetail: false, audit: false, scopes: []
    });
  });
});
