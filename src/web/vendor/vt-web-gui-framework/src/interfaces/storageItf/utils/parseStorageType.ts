import { StorageType } from '../storageItf.types';


/**
 * Helper function to parse a given name of a storage type, like the value of the attribute
 * "storageType" in the configuration. A name that is no storage type, an empty one included,
 * returns the internal storage type.
 */
export const parseStorageType = (name: string): StorageType => (
  Object.hasOwn(StorageType, name) ? StorageType[name as keyof typeof StorageType] : StorageType.internal
);
