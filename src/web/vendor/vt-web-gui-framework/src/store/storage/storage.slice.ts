import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { systemSettings } from 'assets/defines';
import { StorageItf, type StorageKey, StorageType } from 'interfaces/storageItf';
import { enhancedReducerCreator } from 'store/enhancedReducerCreator';
import { startInitialListener, startListening } from 'store/listenerMiddleware';
import { pushLogEntry } from 'store/pushLogEntry';
import type { RootState } from 'store/store.types';
import { deepEqual } from 'utils/deepEqual';
import { isNonEmptyString } from 'utils/type';

import type { SelectValue, SetValue, StorageState } from './storage.types';
import { createInitialState } from './utils/createInitialState';


const initialState: StorageState = {
  isReady: false,
  byKey: {},
  allKeys: [],
  logs: [],
};

const storages: Record<StorageKey, StorageItf> = {};


/**
 * Redux Toolkit slice that handles the partial state of the storage. This slice is exported as
 * default below.
 */
const slice = createSlice({
  name: 'VIWGF/storage',
  reducerPath: 'storage',
  initialState,

  reducers: {
    /**
     * Reducer to end the initialization phase of this slice.
     */
    setReady: (state) => {
      state.isReady = true;
    },


    /**
     * Reducer to create (initialize) a new value entry in the storage by a given key. This can be a
     * single value entry or a group of sub-value entries. Alternatively, this can also be done
     * automatically by an entry in the configuration. But every value has to be initialized in any
     * way to use it. The resulting action is captured and handled by the storage middleware if the
     * storage type is not internal. The new value entry will also and always be created in the
     * Redux store. If the entry has already been initialized, nothing is done here.
     */
    initValue: {
      prepare: (key: StorageKey, {
        hasSubValues = false,
        storageType = StorageType.internal,
        debounce = 0,
        defaultValue,
      }: {
        hasSubValues?: boolean;
        storageType?: StorageType;
        debounce?: number;
        defaultValue?: unknown;
      } = { hasSubValues: false, storageType: StorageType.internal, debounce: 0 }) => {
        let nextDefaultValue;

        // If the given default value has sub-values, it must be an object, otherwise it can be
        // any serializable value (string, number, boolean, null, object or array).
        if (hasSubValues) {
          nextDefaultValue = (typeof defaultValue === 'object') ? defaultValue : {};
        } else {
          nextDefaultValue = (defaultValue === undefined) ? '' : defaultValue;
        }

        return {
          payload: {
            key,
            hasSubValues,
            storageType,
            debounce: Math.max(0, debounce),
            defaultValue: nextDefaultValue,
          },
        };
      },
      reducer: (state, { payload }: PayloadAction<{
        key: StorageKey; hasSubValues: boolean; storageType: StorageType; debounce: number; defaultValue: unknown;
      }>) => {
        if (!payload.key) {
          pushLogEntry(state.logs, {
            slice: 'storage',
            level: 'error',
            timestamp: Date.now(),
            text: 'An empty key is given to initialize a new value in reducer "initValue".',
          });
        } else if (state.byKey[payload.key]) {
          pushLogEntry(state.logs, {
            slice: 'storage',
            level: 'error',
            timestamp: Date.now(),
            text: `The given key "${payload.key}" to initialize a new value in reducer "initValue" does already exist. The keys have to be be unique.`,
          });
        } else if (Object.keys(systemSettings.storage.reservedKeys).some((key) => (systemSettings.storage.reservedKeys[key] === payload.key))) {
          pushLogEntry(state.logs, {
            slice: 'storage',
            level: 'error',
            timestamp: Date.now(),
            text: `It's not allowed to use reserved key "${payload.key}" to initalize a new value in reducer "initValue".`,
          });
        } else {
          state.byKey[payload.key] = {
            key: payload.key,
            hasSubValues: payload.hasSubValues,
            storageType: payload.storageType,
            debounce: payload.debounce,
            value: payload.defaultValue,
          };
          state.allKeys.push(payload.key);
        }
      },
    },


    /**
     * Reducer to set a serializable value to a value entry of the storage. The entry must be
     * initialized before either by an entry in the configuration or by action creator
     * initStorageValue. The given key of the value entry of the storage is mandatory, it be a
     * string and not empty. If the value entry is a group of sub-value entries, two further
     * arguments must be given to set a sub-value: the sub-key as string and the serializable
     * sub-value. Otherwise only one argument with a serializable value has to be given. A
     * serializable value can be a string, number, boolean, null, object or array. Note that a group
     * of sub-value entries can also be set totally by giving an object as one and only argument.
     */
    setValue: {
      prepare: (key: StorageKey, ...args) => ({
        payload: {
          key,
          ...((args.length > 1) && isNonEmptyString(args[0]) && { subKey: args[0] }),
          value: (args.length > 1) ? args[1] : args[0],
        },
      }),
      reducer: (state, { payload: { key, subKey, value } }: PayloadAction<{ key: StorageKey; subKey?: StorageKey; value: unknown }>) => {
        if (state.byKey[key]) {
          if (state.byKey[key].hasSubValues && isNonEmptyString(subKey)) {
            (state.byKey[key].value as Record<StorageKey, unknown>)[subKey] = value;
          } else {
            state.byKey[key].value = value;
          }
        }
      },
    },
  },


  selectors: {
    /**
     * Selector that returns true when the storage is initialized and ready to use.
     */
    selectIsReady: (state: StorageState) => state.isReady,


    /**
     * Selector to return the object of a value entry, selected by the given key. If the entry does
     * not exit, null is returned.
     */
    selectEntry: (state: StorageState, key: StorageKey) => state.byKey[key] ?? null,


    /**
     * Selector to check if a value entry exists (was initialized before) in the storage, selected
     * by a given key. A value entry can either be initialized by an entry in the configuration or
     * by action creator initStorageValue.
     */
    selectIsEntryInit: (state: StorageState, key: StorageKey) => !!state.byKey[key],


    /**
     * Selector to return true, if a value entry is configured with sub-value entries or false if
     * not.
     */
    selectHasEntrySubValues: (state: StorageState, key: StorageKey) => state.byKey[key]?.hasSubValues ?? false,


    /**
     * Selector to return a memoized array with log entries occured in the storage part of the Redux
     * store.
     */
    selectLogs: (state: StorageState) => state.logs,
  },
});


startInitialListener({
  effect: (_, listenerApi) => {
    const { byKey, allKeys } = listenerApi.getState().storage;

    void Promise.all(
      allKeys
        .filter((key) => (byKey[key]!.storageType !== StorageType.internal))
        .map(async (key) => {
          const {
            hasSubValues, storageType, debounce, value,
          } = byKey[key]!;

          // create the storage connections
          storages[key] = new StorageItf(key, { hasSubValues, storageType, debounce });

          // initialize the storages with the initial data from the configuration
          const readValue = await storages[key].init(value);
          if (!deepEqual(value, readValue)) {
            listenerApi.dispatch(slice.actions.setValue(key, readValue));
          }
        }),
    ).then(() => {
      listenerApi.dispatch(slice.actions.setReady());
    });
  },
});


// Redux listener for initializing a new storage entry by an action creator. If this entry doesn't
// use the internal storage, a new storage connection is created (if this is not done before) and
// initialized with the given value.
startListening({
  predicate: (action, currentState) => {
    if (action.type === slice.actions.initValue.type) {
      const { key } = (action as ReturnType<typeof initValue>).payload;

      return (
        (currentState.storage.byKey[key]!.storageType !== StorageType.internal)
        && !storages[key]
      );
    }

    return false;
  },
  effect: (action, listenerApi) => {
    const { key } = (action as ReturnType<typeof initValue>).payload;
    const {
      hasSubValues, storageType, debounce, value,
    } = listenerApi.getState().storage.byKey[key]!;

    storages[key] = new StorageItf(key, { hasSubValues, storageType, debounce });

    void storages[key].init(value).then((nextValue) => {
      if (!deepEqual(value, nextValue)) {
        listenerApi.dispatch(slice.actions.setValue(key, nextValue));
      }
    });
  },
});


// Redux listener for setting a storage value. If there is a storage connection for the
// corresponding entry, then also write the value to the connection.
startListening({
  predicate: (action, currentState, previousState) => {
    if (action.type === slice.actions.setValue.type) {
      const { key } = (action as ReturnType<typeof setValue>).payload;

      return (
        !!storages[key]
        && !deepEqual(currentState.storage.byKey[key]?.value, previousState.storage.byKey[key]?.value)
      );
    }

    return false;
  },
  effect: (action, listenerApi) => {
    const { key } = (action as ReturnType<typeof setValue>).payload;
    storages[key]!.writeValue(listenerApi.getState().storage.byKey[key]!.value);
  },
});


export const reducer = enhancedReducerCreator<StorageState>(slice, createInitialState);

export const { name, reducerPath } = slice;

export const { setReady, initValue } = slice.actions;


// The action creator and the selector of a value take their types from "StorageValues", which the
// consuming project augments (see storage.types.ts).
export const setValue = slice.actions.setValue as SetValue<typeof slice.actions.setValue>;


/**
 * Selector to return the value or sub-value of an entry of the storage, selected by a given key
 * and, if a sub-value has to be returned, by a given sub-key. If the value entry does not exist,
 * undefined is returned. Note that a value entry has to be initialized first, either by an entry in
 * the configuration or by action creator initStorageValue. It stands outside the slice's selectors
 * because Redux Toolkit remaps those and drops every overload.
 */
export const selectValue = ((state: RootState, key: StorageKey, subKey?: StorageKey): unknown => {
  const { hasSubValues, value } = state.storage.byKey[key] ?? {};
  return ((value && hasSubValues && subKey) ? (value as Record<StorageKey, unknown>)[subKey] : value);
}) as SelectValue;


export const {
  selectIsReady, selectEntry, selectIsEntryInit, selectHasEntrySubValues, selectLogs,
} = slice.selectors;
