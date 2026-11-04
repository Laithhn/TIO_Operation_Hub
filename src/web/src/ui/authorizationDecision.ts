import { hasRightKey } from '../rights';

type RightSnapshot = { rights: string[] } | undefined;
type RightCheck = { right?: string; allOf?: readonly string[]; anyOf?: readonly string[] };

/** Apply the same catalog and prerequisite rules as route checks. */
export function allowsRightCheck(me: RightSnapshot, { right, allOf, anyOf }: RightCheck): boolean {
  const required = [...(right ? [right] : []), ...(allOf ?? [])];
  return (required.length > 0 || !!anyOf?.length)
    && required.every(key => hasRightKey(me, key))
    && (!anyOf?.length || anyOf.some(key => hasRightKey(me, key)));
}
