export type UserScope = { kind: 'Client' | 'Project' | 'InternalTeam'; clientId?: number | null; projectId?: number | null; teamId?: number | null };
type StoredAccess = { allClients: boolean; allInternal: boolean; grants: string[]; scopes: UserScope[] };

/** User edits do not expose these fields, so retain them exactly; new accounts start without stored grants. */
export function userAccessSettings(user: StoredAccess | null) {
  return {
    allClients: user?.allClients ?? false,
    allInternal: user?.allInternal ?? false,
    export: user?.grants.includes('Export') ?? false,
    technicalDetail: user?.grants.includes('TechnicalDetail') ?? false,
    audit: user?.grants.includes('Audit') ?? false,
    scopes: user?.scopes ?? []
  };
}
