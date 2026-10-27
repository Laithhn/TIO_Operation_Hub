import type { StorageKey, StorageType } from 'interfaces/storageItf';
import type { LogEntry, RootState } from 'store/store.types';


/** A key the consuming project has declared in "StorageValues" (below). */
type DeclaredKey = Extract<keyof StorageValues, StorageKey>;

/** A key the consuming project has not declared: never for a declared one. */
type UndeclaredKey<K extends StorageKey> = K extends DeclaredKey ? never : K;

/** A sub-key of the group of a declared key. */
type DeclaredSubKey<K extends DeclaredKey> = Extract<keyof StorageValues[K], StorageKey>;

/** The action the action creator "C" of "setValue" returns. */
type SetValueAction<C extends (...args: never[]) => unknown> = ReturnType<C>;


export interface StorageEntry {
  /** The key of the value entry. */
  key: StorageKey;
  /** True, if the value entry has sub-value entries. */
  hasSubValues: boolean;
  /** The storage type. */
  storageType: StorageType;
  /** The debounce time if the storage type is not internal. Set to 0 if not used. */
  debounce: number;
  /** If this value entry has sub-value entries, this value must be an object with the sub-keys and
   * sub-values. Otherwise the value is of any serializable type. */
  value: unknown;
}


export interface StorageState {
  /** True, if the storage is initialized and ready to use. */
  isReady: boolean;
  /** Object of objects of the value entries. */
  byKey: Record<StorageKey, StorageEntry>;
  /** Array of all keys of the existing value entries. */
  allKeys: StorageKey[];
  /** An array of log entries occured in the storage reducer. */
  logs: LogEntry[];
}


/**
 * The types of the storage values by key - empty in the framework, because the keys are declared in
 * the configuration of the consuming project and only the project knows their types. The project
 * declares them by augmenting this interface in a module of its own, one entry per key; the entry
 * of a group is an object of its sub-keys. The selector "selectValue" and the action creator
 * "setValue" take their types from it, so that no call site states a type and the compiler checks
 * every write against the reads. A key the project does not declare falls back to the type its
 * call site states, unknown by default.
 *
 * @example
 * ```typescript
 * // proj/storageValues.ts
 * declare module 'store/storage/storage.types' {
 *   interface StorageValues {
 *     simpleNumber: number;
 *     vehicleData: { webSocketUrl: string };
 *   }
 * }
 *
 * export {};
 * ```
 */
export interface StorageValues {} // eslint-disable-line @typescript-eslint/no-empty-object-type


/**
 * The signatures of the action creator "setValue", built over the action creator "C" Redux Toolkit
 * derives from the reducer's "prepare" - which keeps a single signature, so the slice casts these
 * on at its export. A declared key takes a value of its type in "StorageValues", an undeclared key
 * any serializable value; "type" and "match" stay those of "C".
 */
export type SetValue<C extends ((...args: never[]) => unknown) & Record<'type' | 'match', unknown>> = (
  Pick<C, 'type' | 'match'>
  & {
    <K extends DeclaredKey>(key: K, value: StorageValues[K]): SetValueAction<C>;
    <K extends DeclaredKey, S extends DeclaredSubKey<K>>(key: K, subKey: S, value: StorageValues[K][S]): SetValueAction<C>;
    <K extends StorageKey>(key: UndeclaredKey<K>, value: unknown): SetValueAction<C>;
    <K extends StorageKey>(key: UndeclaredKey<K>, subKey: StorageKey, value: unknown): SetValueAction<C>;
  }
);


/**
 * The signatures of the selector "selectValue": the value or sub-value of a declared key in its
 * type in "StorageValues", the one of an undeclared key in the type the call site states.
 */
export interface SelectValue {
  <K extends DeclaredKey>(state: RootState, key: K): StorageValues[K];
  <K extends DeclaredKey, S extends DeclaredSubKey<K>>(state: RootState, key: K, subKey: S): StorageValues[K][S];
  // The type parameter stands in the return type alone on purpose: it is the type the call site
  // states for a key the project has not declared, inferred from the variable it is assigned to.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  <T = unknown, K extends StorageKey = StorageKey>(state: RootState, key: UndeclaredKey<K>, subKey?: StorageKey): T;
}
