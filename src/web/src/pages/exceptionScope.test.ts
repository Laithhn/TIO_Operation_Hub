import { describe, expect, it } from 'vitest';
import { exceptionKey, hasDuplicateExceptions, exceptionChanges, scopeDescription, scopeKind, toRequest, withScope, type RightException } from './exceptionScope';

const row = (patch: Partial<RightException> = {}): RightException => ({ key: 'Contracts:Maintain', effect: 'Deny', expiresAt: null, ...patch });

describe('scoped exception drafts', () => {
  it('keeps client, project and team identifiers in separate namespaces', () => {
    const keys = [row({ clientId: 3 }), row({ projectId: 3 }), row({ teamId: 3 }), row()].map(exceptionKey);
    expect(new Set(keys).size).toBe(4);
  });

  it('allows one permission in different scopes but not twice in the same scope', () => {
    expect(hasDuplicateExceptions([row({ clientId: 3 }), row({ clientId: 4, effect: 'Allow' }), row()])).toBe(false);
    expect(hasDuplicateExceptions([row({ clientId: 3 }), row({ clientId: 3, effect: 'Allow' })])).toBe(true);
    expect(hasDuplicateExceptions([row({ key: 'contracts:maintain' }), row()])).toBe(true);
  });

  it('selecting a scope replaces the previous one and clears its stale label', () => {
    const next = withScope(row({ clientId: 3, scopeLabel: 'Client: Alpha' }), 'project', 9);
    expect(next).toMatchObject({ clientId: null, projectId: 9, teamId: null, scopeLabel: null });
    expect(scopeKind(next)).toBe('project');
    expect(scopeKind(withScope(next, 'global', null))).toBe('global');
  });

  it('never sends the display label, which the API would reject', () => {
    expect(Object.keys(toRequest([row({ clientId: 3, scopeLabel: 'Client: Alpha' })])[0]).sort()).toEqual(['clientId', 'effect', 'expiresAt', 'key', 'projectId', 'teamId']);
  });

  it('reports a change of scope as a removal and an addition, not as an edit', () => {
    const changes = exceptionChanges([row({ clientId: 3 })], [row({ clientId: 4 })]);
    expect(changes).toHaveLength(2);
    expect(changes.filter(c => c.before && !c.after)).toHaveLength(1);
    expect(changes.filter(c => c.after && !c.before)).toHaveLength(1);
  });

  it('does not report an unchanged exception', () => {
    expect(exceptionChanges([row({ teamId: 2 })], [row({ teamId: 2 })])).toHaveLength(0);
  });

  it('describes the exact scope', () => {
    expect(scopeDescription(row())).toBe('everywhere in their data scope');
    expect(scopeDescription(row({ projectId: 9 }), { clients: [], teams: [], projects: [{ id: 9, code: 'P', name: 'Gateway' }] })).toBe('Project: Gateway');
    expect(scopeDescription(row({ clientId: 3, scopeLabel: 'Client: Alpha' }))).toBe('Client: Alpha');
  });
});
