export type StorageKey = string;


/** Enumeration with the available storage types. */
export enum StorageType {
  /** No external, only internal storage. */
  internal = 'internal',
  /** The Session Web Storage. */
  session = 'session',
  /** The Local Web Storage. */
  local = 'local',
}
