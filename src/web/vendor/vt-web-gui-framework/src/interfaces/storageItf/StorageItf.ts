import { isNonEmptyString, isNumber } from 'utils/type';

import { type StorageKey, StorageType } from './storageItf.types';
import * as localWebStorage from './storages/localWebStorage';
import * as sessionWebStorage from './storages/sessionWebStorage';


/**
 * Class to handle a connection to an internal or external storage. At the moment, only the Session
 * Web Storage and the Local Web Storage are supported.
 */
class StorageItf<ValueType = unknown> {
  #key: StorageKey;
  #hasSubValues: boolean;
  #storageType: StorageType;
  #debounce: number;
  #timeoutId: ReturnType<typeof setTimeout> | number = 0;
  #timestampLastWriteMs = 0;
  #waitingToWrite = false;
  #actualValue: ValueType | undefined;
  #nextValue: ValueType | undefined;


  /**
   * Create a storage connection.
   *
   * @param key - The mandatory key of a storage entry. Must not be empty.
   * @param hasSubValues - Optionally set to true, if the entry supports sub-value entries, that can
   *   be initialized and set seperately.
   * @param storageType - The type of the storage. If not set, the internal storage is used.
   * @param debounce - The time in milliseconds to debounce the writing of the value to the storage.
   *   Value 0 means "no debouncing".
   */
  constructor(
    key: StorageKey,
    { hasSubValues = false, storageType = StorageType.internal, debounce = 0 }:
    { hasSubValues?: boolean; storageType?: StorageType; debounce?: number } =
      { hasSubValues: false, storageType: StorageType.internal, debounce: 0 },
  ) {
    if (!isNonEmptyString(key)) {
      throw new Error('VIWGF/store/storage > StorageConnection: a given key is not a string or an empty string.');
    }

    this.#key = `VIWGF:${process.env['PROJECTKEY'] || '?'}:${key}`;
    this.#hasSubValues = (typeof hasSubValues === 'boolean') ? hasSubValues : false;
    this.#storageType = storageType;
    this.#debounce = isNumber(debounce, { withoutInfinite: true, gte: 0 }) ? debounce : 0;
  }


  /**
   * Public static method to check if a given Storage ID is valid.
   */
  static isValidId(id: unknown) {
    return isNonEmptyString(id);
  }


  /**
   * Private method to write a given value to the configured storage. Note that there is no feedback
   * received and handled from the storage. So this method is not async.
   *
   * @param value - The serializable value to write.
   * @param force - Set to true, to force writing the value. Debouncing is ignored and resetted in
   *   this case.
   */
  #write(value: ValueType, force = false): void {
    const now = Date.now();

    if (force || (now >= (this.#timestampLastWriteMs + this.#debounce))) {
      // -------------------------------------------------------------------------------------------
      // Last time, the value was written, was longer than the debounce time value.
      // -------------------------------------------------------------------------------------------

      clearTimeout(this.#timeoutId);
      this.#timestampLastWriteMs = now;
      this.#waitingToWrite = false;

      switch (this.#storageType) {
        case StorageType.session: sessionWebStorage.write(this.#key, value); break;
        case StorageType.local: localWebStorage.write(this.#key, value); break;
        // no default
      }
    } else if (this.#waitingToWrite) {
      // -------------------------------------------------------------------------------------------
      // The debounce time value is still not reached and a timeout is already running, so just
      // update the data to set next.
      // -------------------------------------------------------------------------------------------

      this.#nextValue = value;
    } else {
      // -------------------------------------------------------------------------------------------
      // The debounce time is not yet reached since the last time, this value was written. So start
      // a timeout to set the data after reaching the debounce time.
      // -------------------------------------------------------------------------------------------

      this.#waitingToWrite = true;
      this.#nextValue = value;

      this.#timeoutId = setTimeout(() => {
        this.#write(this.#nextValue!);
      }, (this.#debounce - now + this.#timestampLastWriteMs));
    }
  }


  /**
   * Public async method to initialize the storage. Here, the value is read from the storage and
   * given to the returned promise. If there is no valid value in set in the storage, write the
   * given default value to it.
   *
   * @param defaultValue - The serializable default value to set to the storage at initialization,
   *   if no value was set before.
   */
  async init(defaultValue: ValueType): Promise<ValueType> {
    switch (this.#storageType) {
      case StorageType.session: this.#actualValue = await sessionWebStorage.read(this.#key) as ValueType | undefined; break;
      case StorageType.local: this.#actualValue = await localWebStorage.read(this.#key) as ValueType | undefined; break;
      // no default
    }

    // if no valid value has been read from a storage, set the given default value and write it into
    // the storage
    if (
      (this.#hasSubValues && (typeof this.#actualValue !== 'object'))
      || (!this.#hasSubValues && (this.#actualValue === undefined))
    ) {
      this.#actualValue = (this.#hasSubValues && (typeof defaultValue !== 'object'))
        ? {} as ValueType
        : defaultValue;
      this.#write(this.#actualValue);
    }

    return this.#actualValue!;
  }


  /**
   * Public method to write a new value to the storage. Note that there is no feedback. If the
   * storage entry has sub-value entries (hasSubValues is true), then the sub-values can also be set
   * with this function. Make sure, that the data types of this function are correct.
   *
   * @param value - The serializable value to write.
   * @param subKey - If the storage entry has sub-value entries (hasSubValues must be true), with
   *   this sub-key the sub-value can be set.
   */
  writeValue(value: unknown, subKey?: StorageKey) {
    this.#actualValue = (this.#hasSubValues && subKey)
      ? {
        ...((typeof this.#actualValue === 'object') && this.#actualValue),
        [subKey]: value,
      } as ValueType
      : value as ValueType;

    this.#write(this.#actualValue);
  }


  /**
   * Public function to store an outstanding value in the storage, if still waiting for the debounce
   * timeout.
   */
  destruct() {
    if (this.#waitingToWrite) {
      this.#write(this.#nextValue as ValueType, true);
    }
  }
}


export { StorageItf };
