import type { ReactNode } from 'react';
import { useMe } from '../hooks';
import { allowsRightCheck } from './authorizationDecision';

type RightCheck = {
  /** Stable right key, for example `Cases:Create`. */
  right?: string;
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
 * Presentation guard for right-aware controls. This is never an API security boundary:
 * every protected request must still be authorized by the server.
 */
export function Can({ right, allOf, anyOf, loading = null, denied = null, children }: RightCheck) {
  const me = useMe();
  if (me.isLoading) return <>{loading}</>;
  const allowed = !me.error && allowsRightCheck(me.data, { right, allOf, anyOf });
  return <>{allowed ? children : denied}</>;
}

/** Use for imperative presentation decisions; never to authorize an API operation. */
export function useRightKey(right: string): boolean {
  const me = useMe();
  return !me.isLoading && !me.error && allowsRightCheck(me.data, { right });
}

export function useAllRights(rights: readonly string[]): boolean {
  const me = useMe();
  return !me.isLoading && !me.error && allowsRightCheck(me.data, { allOf: rights });
}

export function useAnyRight(rights: readonly string[]): boolean {
  const me = useMe();
  return !me.isLoading && !me.error && allowsRightCheck(me.data, { anyOf: rights });
}
