import { systemSettings } from 'assets/defines';
import { parseStorageType } from 'interfaces/storageItf';
import { pushLogEntry } from 'store/pushLogEntry';
import { getAttributeInLowerCase } from 'utils/element';

import type { StorageState } from '../storage.types';


/**
 * Helper function to parse a value given as string into a given type.
 *
 * @param value - The value to parse.
 * @param type - The type of value: "string" (default), "number", "float", "bool", "boolean" or
 *   "json".
 */
const parseStrVal = (value: string, type: string): unknown => {
  switch (type) {
    case 'number':
      return parseInt(value, 10);

    case 'float':
      return parseFloat(value);

    case 'bool':
    case 'boolean':
      return (value.toLowerCase() === 'true');

    case 'json':
      try {
        return JSON.parse(value);
      } catch (e) {
        throw new Error(`Trying to parse a JSON data of the storage value failed: ${(e instanceof Error) ? e.message : String(e)}`, { cause: e });
      }

    default:
      return value;
  }
};


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the original initial state.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: StorageState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read configuration node "Configuration > Storage".
  // -----------------------------------------------------------------------------------------------

  const xmlStorage = config.querySelector(':scope > Storage');

  if (xmlStorage) {
    // ---------------------------------------------------------------------------------------------
    // Read configuration nodes "Configuration > Storage > Value" and "Configuration > Storage >
    // Group" with the single value and group entries.
    // ---------------------------------------------------------------------------------------------

    draftState.byKey = Array.from(xmlStorage.querySelectorAll(':scope > Group, :scope > Value')).reduce<StorageState['byKey']>((acc, xmlEntry) => {
      const key = (xmlEntry.getAttribute('key') ?? '').trim();
      const hasSubValues = (xmlEntry.tagName === 'Group');
      let value;

      if (!key) {
        pushLogEntry(draftState.logs, {
          slice: 'storage',
          level: 'error',
          timestamp: Date.now(),
          text: `A "${hasSubValues ? 'Group' : 'Value'}" entry of node "Storage" of the configuration has no or an empty attribute "key".`,
        });
        return acc;
      }

      if (acc[key]) {
        pushLogEntry(draftState.logs, {
          slice: 'storage',
          level: 'error',
          timestamp: Date.now(),
          text: `A "${hasSubValues ? 'Group' : 'Value'}" entry of node "Storage" of the configuration with key "${key}" does already exist. The keys have to be be unique.`,
        });
        return acc;
      }

      if (Object.keys(systemSettings.storage.reservedKeys).some((name) => (systemSettings.storage.reservedKeys[name] === key))) {
        pushLogEntry(draftState.logs, {
          slice: 'storage',
          level: 'error',
          timestamp: Date.now(),
          text: `It's not allowed to use reserved key "${key}" for a "${hasSubValues ? 'Group' : 'Value'}" (or any other) entry in node "Storage" of the configuration.`,
        });
        return acc;
      }

      try {
        if (hasSubValues) {
          value = Array.from(xmlEntry.querySelectorAll(':scope > Value')).reduce((bySubKeyAcc, xmlValue) => {
            const subKey = (xmlValue.getAttribute('key') ?? '').trim();

            if (!subKey) {
              pushLogEntry(draftState.logs, {
                slice: 'storage',
                level: 'error',
                timestamp: Date.now(),
                text: `A sub-value entry of group "${key}" of node "Storage" of the configuration has no or an empty attribute "key".`,
              });
              return bySubKeyAcc;
            }

            return {
              ...bySubKeyAcc,
              [subKey]: parseStrVal(xmlValue.textContent.trim(), getAttributeInLowerCase(xmlValue, 'type')),
            };
          }, {});
        } else {
          value = parseStrVal(xmlEntry.textContent.trim(), getAttributeInLowerCase(xmlEntry, 'type'));
        }

        return {
          ...acc,
          [key]: {
            key,
            hasSubValues,
            storageType: parseStorageType(getAttributeInLowerCase(xmlEntry, 'storageType')),
            debounce: Math.max(0, Number(xmlEntry.getAttribute('debounce')) || 0),
            value,
          },
        };
      } catch (e) {
        pushLogEntry(draftState.logs, {
          slice: 'storage',
          level: 'error',
          timestamp: Date.now(),
          text: (e instanceof Error) ? e.message : String(e),
        });
        return acc;
      }
    }, {});

    draftState.allKeys = Object.keys(draftState.byKey);
  }
};
