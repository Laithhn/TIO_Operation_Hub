export type Override = { key: string; effect: 'Allow' | 'Deny'; expiresAt: string | null; clientId?: number | null; projectId?: number | null; teamId?: number | null; scopeLabel?: string | null };
export type ScopeKind = 'global' | 'client' | 'project' | 'team';
export type ScopeTarget = { id: number; code: string; name: string };
export type ScopeTargets = { clients: ScopeTarget[]; projects: ScopeTarget[]; teams: ScopeTarget[] };

export function scopeKind(row: Override): ScopeKind {
  return row.clientId != null ? 'client' : row.projectId != null ? 'project' : row.teamId != null ? 'team' : 'global';
}

export function scopeId(row: Override): number | null {
  return row.clientId ?? row.projectId ?? row.teamId ?? null;
}

/** One exception per permission and scope; client, project and team identifiers are separate namespaces. */
export function exceptionKey(row: Override): string {
  return `${row.key.toLowerCase()}|${scopeKind(row)}|${scopeId(row) ?? ''}`;
}

/** The scope columns for a selection. A chosen kind without a target stays incomplete rather than silently becoming global. */
export function withScope(row: Override, kind: ScopeKind, id: number | null): Override {
  return { key: row.key, effect: row.effect, expiresAt: row.expiresAt,
    clientId: kind === 'client' ? id : null, projectId: kind === 'project' ? id : null, teamId: kind === 'team' ? id : null,
    scopeLabel: kind === scopeKind(row) && id === scopeId(row) ? row.scopeLabel : null };
}

/** The request body: only the fields the API accepts, which rejects anything else. */
export function toRequest(rows: Override[]) {
  return rows.map(r => ({ key: r.key, effect: r.effect, expiresAt: r.expiresAt, clientId: r.clientId ?? null, projectId: r.projectId ?? null, teamId: r.teamId ?? null }));
}

export function hasDuplicateExceptions(rows: Override[]) {
  return new Set(rows.map(exceptionKey)).size !== rows.length;
}

export function overrideChanges(before: Override[], after: Override[]) {
  const previous = new Map(before.map(row => [exceptionKey(row), row]));
  const next = new Map(after.map(row => [exceptionKey(row), row]));
  return [...new Set([...previous.keys(), ...next.keys()])].flatMap(id => {
    const oldValue = previous.get(id);
    const newValue = next.get(id);
    const sameExpiry = oldValue?.expiresAt === newValue?.expiresAt || (!!oldValue?.expiresAt && !!newValue?.expiresAt && Date.parse(oldValue.expiresAt) === Date.parse(newValue.expiresAt));
    return oldValue && newValue && oldValue.effect === newValue.effect && sameExpiry ? [] : [{ id, key: newValue?.key ?? oldValue!.key, before: oldValue, after: newValue }];
  });
}

export function scopeDescription(row: Override, targets?: ScopeTargets): string {
  const kind = scopeKind(row);
  if (kind === 'global') return 'everywhere in their data scope';
  if (row.scopeLabel) return row.scopeLabel;
  const list = kind === 'client' ? targets?.clients : kind === 'project' ? targets?.projects : targets?.teams;
  const target = list?.find(t => t.id === scopeId(row));
  const label = kind === 'client' ? 'Client' : kind === 'project' ? 'Project' : 'Team';
  return `${label}: ${target?.name ?? scopeId(row) ?? 'not selected'}`;
}
