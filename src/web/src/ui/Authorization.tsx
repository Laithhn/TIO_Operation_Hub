import type { ReactNode } from 'react';
import { useMe } from '../hooks';
import { allowsPermissionCheck } from './authorizationDecision';

type PermissionCheck = {
  /** Stable A63 resource/action key, for example `Cases:Create`. */
  permission?: string;
  /** Require every key when supplied. */
  allOf?: readonly string[];
  /** Require at least one key when supplied. */
  anyOf?: readonly string[];
  /** Render while the authoritative `/me` snapshot is loading. Defaults to null. */
  loading?: ReactNode;
  /** Render when the check fails. Defaults to hiding the protected child. */
  denied?: ReactNode;
  children: ReactNode;
};

/**
 * Presentation guard for permission-aware controls. This is never an API security boundary:
 * every protected request must still be authorized by the server.
 */
export function Can({ permission, allOf, anyOf, loading = null, denied = null, children }: PermissionCheck) {
  const me = useMe();
  if (me.isLoading) return <>{loading}</>;
  const allowed = !me.error && allowsPermissionCheck(me.data, { permission, allOf, anyOf });
  return <>{allowed ? children : denied}</>;
}

/** Use for imperative presentation decisions; never to authorize an API operation. */
export function usePermission(permission: string): boolean {
  const me = useMe();
  return !me.isLoading && !me.error && allowsPermissionCheck(me.data, { permission });
}

export function useAllPermissions(permissions: readonly string[]): boolean {
  const me = useMe();
  return !me.isLoading && !me.error && allowsPermissionCheck(me.data, { allOf: permissions });
}

export function useAnyPermission(permissions: readonly string[]): boolean {
  const me = useMe();
  return !me.isLoading && !me.error && allowsPermissionCheck(me.data, { anyOf: permissions });
}
