import { hasPermissionKey } from '../permissions';

type PermissionSnapshot = { permissions: string[] } | undefined;
type PermissionCheck = { permission?: string; allOf?: readonly string[]; anyOf?: readonly string[] };

/** Apply the same registered permission and prerequisite rules as route checks. */
export function allowsPermissionCheck(me: PermissionSnapshot, { permission, allOf, anyOf }: PermissionCheck): boolean {
  const required = [...(permission ? [permission] : []), ...(allOf ?? [])];
  return (required.length > 0 || !!anyOf?.length)
    && required.every(key => hasPermissionKey(me, key))
    && (!anyOf?.length || anyOf.some(key => hasPermissionKey(me, key)));
}
