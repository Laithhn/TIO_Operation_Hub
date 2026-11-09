import {
  createSlice, type PayloadAction, type UnknownAction, type WithSlice,
} from '@reduxjs/toolkit';

import {
  type WebSocketId, type WebSocketMetadata, webSocketsApi,
} from 'interfaces/webSocketItf';
import { startListening } from 'store/listenerMiddleware';
import { rootReducer } from 'store/rootReducer';
import type { RootState } from 'store/store.types';
import { vtWebSocketConnectionsSlice } from 'store/vtWebSocket/vtWebSocketConnections';
import { deepEqual } from 'utils/deepEqual';
import {
  getType, isNonEmptyString, isNonEmptyStringOrNumber, isNumber,
} from 'utils/type';

import { receiveDatabaseLayout } from './reducers/receiveDatabaseLayout';
import { receiveDatasets } from './reducers/receiveDatasets';
import { receiveDatasetUpdates } from './reducers/receiveDatasetUpdates';
import { receiveSingleDatasets } from './reducers/receiveSingleDatasets';
import { setDatabaseFilterValue } from './reducers/setDatabaseFilterValue';
import { reselectAllFilterValues } from './reselectors/reselectAllFilterValues';
import { reselectDatabaseValueGetter } from './reselectors/reselectDatabaseValueGetter';
import { reselectDatasetValueGetter } from './reselectors/reselectDatasetValueGetter';
import { reselectModifiedFilters } from './reselectors/reselectModifiedFilters';
import { reselectNotAppliedFilters } from './reselectors/reselectNotAppliedFilters';
import { reselectNotSelectedDatasetIds } from './reselectors/reselectNotSelectedDatasetIds';
import { reselectUsedFilterModificationFlags } from './reselectors/reselectUsedFilterModificationFlags';
import { checkWebSocketIdAndDatabase } from './utils/checkWebSocketIdAndDatabase';
import { getDatabaseField } from './utils/getDatabaseField';
import { getDatabaseFieldIndex } from './utils/getDatabaseFieldIndex';
import { getDatabaseLayout } from './utils/getDatabaseLayout';
import { pushLog, sliceName } from './utils/pushLog';
import type {
  VtWebSocketData, VtWebSocketDatabase, VtWebSocketDatabaseFieldType, VtWebSocketDatabaseFilter,
  VtWebSocketDatabaseFilterMultiSelectValue, VtWebSocketDatabaseFilterNumericValue,
  VtWebSocketDatabaseFilterSelectValue, VtWebSocketDatabaseFilterTextValue,
  VtWebSocketDatabaseFilterValue, VtWebSocketDatabaseLayout, VtWebSocketDatabaseSort,
  VtWebSocketDatabasesState, VtWebSocketDataset, VtWebSocketFilterCmd,
} from './vtWebSocketDatabases.types';


const initialState: VtWebSocketDatabasesState = {
  byId: {},
};


/**
 * Redux Toolkit slice that handles the partial state of databases of handlers DBSourceHandler of
 * VtWebSocket servers. Note that the reducer of this slice isn't exported below, but is injected
 * into the root reducer as soon as this slice is used.
 */
const slice = createSlice({
  name: 'VIWGF/vtWebSocketDatabases',
  reducerPath: sliceName,
  initialState,

  reducers: {
    /**
     * Reducer to initialize a DBSourceHandler database of a VtWebSocket server. This is the first
     * and essential step in using a database. The source name of the associated database layout
     * will be determined here. This layout will be requested from the server if not done before.
     * Note that several databases can use the same database layout.
     */
    initDatabase: {
      prepare: (webSocket: WebSocketId, database: string, {
        /** Optionally the source name of either a database or a database layout (that ends with
         * ".layout"), who or whose layout is to be used alternatively. */
        altLayout,
      }: { altLayout?: string } = {}) => ({
        payload: { database, altLayout },
        meta: { webSocket },
        error: checkWebSocketIdAndDatabase(webSocket, database),
      }),
      reducer: (state, { payload: { database, altLayout }, meta: { webSocket }, error }: PayloadAction<{ database: string; altLayout: string | undefined }, string, WebSocketMetadata, boolean | string>) => {
        if (error === true) {
          return;
        }

        state.byId[webSocket] ??= {
          layouts: {
            byName: {},
            allNames: [],
          },
          databases: {
            byName: {},
            allNames: [],
          },
          logs: [],
        };

        if (error === false) {
          let layout = isNonEmptyString(altLayout) ? altLayout : database;

          if (!layout.toLowerCase().endsWith('.layout')) {
            layout = `${layout}.layout`;
          }

          // If a database layout has to be requested from the server first (doesn't exist in the
          // state), add null to the state for this layout, so it is known that the layout is
          // already requested but not yet received.
          if (!state.byId[webSocket].layouts.allNames.includes(layout)) {
            state.byId[webSocket].layouts.byName[layout] = null;
            state.byId[webSocket].layouts.allNames.push(layout);
          }

          if (!state.byId[webSocket].databases.allNames.includes(database)) {
            state.byId[webSocket].databases.byName[database] = {
              layout,
              isLoading: false,
              isValid: false,
              numTotal: null,
              numBefore: null,
              numAfter: null,
              datasets: {
                byId: {},
                allIds: [],
                activeId: null,
                requestedActiveId: null,
                selectedIds: [],
              },
              singleDatasets: {
                byId: {},
                allIds: [],
              },
              usedFilters: {
                byId: {},
                allIds: [],
              },
              sort: {
                appliedValue: [],
                value: [],
                hasChanged: false,
              },
            };
            state.byId[webSocket].databases.allNames.push(database);
          } else if (state.byId[webSocket].databases.byName[database]!.layout !== layout) {
            pushLog(state, webSocket, 'warning', 'Initializing DBSourceHandler database failed', `It is tried to change the mapping of database "${database}" from layout "${state.byId[webSocket].databases.byName[database]!.layout}" to "${layout}".`);
          }
        } else {
          pushLog(state, webSocket, 'warning', 'Initializing DBSourceHandler database failed', error);
        }
      },
    },


    /**
     * Reducer to start the pushing of a given database. Apply all modified filters before and
     * request the meta data.
     */
    startDatabase: {
      prepare: (webSocket: WebSocketId, database: string) => ({
        payload: database,
        meta: { webSocket },
        error: checkWebSocketIdAndDatabase(webSocket, database),
      }),
      reducer: (state, { payload, meta: { webSocket }, error }: PayloadAction<string, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error === false) {
          if (!getDatabaseLayout(state, webSocket, payload)) {
            pushLog(state, webSocket, 'error', 'Starting DBSourceHandler database failed', `Database "${payload}" must first be initialized before it can be used.`);
          }
        } else {
          pushLog(state, webSocket, 'error', 'Starting DBSourceHandler database failed', error);
        }
      },
    },


    /**
     * Reducer to stop the pushing of a given database.
     */
    stopDatabase: {
      prepare: (webSocket: WebSocketId, database: string) => ({
        payload: database,
        meta: { webSocket },
        error: checkWebSocketIdAndDatabase(webSocket, database),
      }),
      reducer: (state, { payload, meta: { webSocket }, error }: PayloadAction<string, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error === false) {
          if (!getDatabaseLayout(state, webSocket, payload)) {
            pushLog(state, webSocket, 'error', 'Stopping DBSourceHandler database failed', `Database "${payload}" must first be initialized before it can be used.`);
          }
        } else {
          pushLog(state, webSocket, 'error', 'Stopping DBSourceHandler database failed', error);
        }
      },
    },


    /**
     * Reducer to reset all DBSourceHandler databases of a VtWebSocket server (layouts, datasets and
     * filters but not the log entries). If no WebSocket ID is given, the databases of all WebSocket
     * connections are reseted (inclusiv the log entries).
     */
    resetDatabases: {
      prepare: (webSocket?: WebSocketId) => ({
        payload: undefined,
        meta: { webSocket },
      }),
      reducer: (state, { meta: { webSocket } }: PayloadAction<undefined, string, WebSocketMetadata | { webSocket: undefined }>) => {
        if (!isNonEmptyString(webSocket)) {
          state.byId = {};
        } else if (state.byId[webSocket]) {
          state.byId[webSocket].layouts = {
            byName: {},
            allNames: [],
          };
          state.byId[webSocket].databases = {
            byName: {},
            allNames: [],
          };
        }
      },
    },


    /**
     * Reducer to send a query to a given DBSourceHandler database source of a VtWebSocket server.
     * Optionally a number of datasets can be requested too at a given position: "top" means from
     * the top of the table and "bottom" from the bottom. "up" means from the already queried ones
     * up to the top. "down" means from the already queried ones down to the bottom. "middle" jumps
     * to the dataset of a given ID, which is mandatory there: the dataset is delivered in the
     * middle of the answer and becomes the active one. At "top" and "bottom" the ID is optional and
     * places its dataset first or last, and at "up" and "down" it has no effect.
     */
    requestDatasets: {
      prepare: (webSocket: WebSocketId, database: string, cnt?: number, pos?: 'top' | 'bottom' | 'middle' | 'up' | 'down', datasetId?: string) => {
        const isCnt = isNumber(cnt, { withoutInfinite: true, gte: 0 });
        const isPos = ['top', 'bottom', 'middle', 'up', 'down'].includes(pos ?? '');
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error) {
          if (isCnt && !isPos) {
            error = `Database "${database}": the given dataset position (pos) "${pos}" is invalid, while a valid count value (cnt) is given: ${cnt}. Expected positions: "top", "bottom", "middle", "up" or "down".`;
          } else if (!isCnt && isPos) {
            error = `Database "${database}": for dataset position (pos) "${pos}" the count value (cnt) is invalid, it is not a positive number (${(typeof cnt !== 'number') ? `type: "${typeof cnt}"` : `value: ${(cnt as number)}`}).`;
          } else if ((pos === 'middle') && !isNonEmptyString(datasetId)) {
            error = `Database "${database}": the dataset position (pos) "middle" requires the ID of the dataset to jump to, but the given one is not a valid string.`;
          }
        }

        return {
          payload: {
            database, cnt, pos, datasetId,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { payload: { database, pos, datasetId }, meta: { webSocket }, error }: PayloadAction<{
        database: string; cnt: number | undefined; pos: 'top' | 'bottom' | 'middle' | 'up' | 'down' | undefined; datasetId: string | undefined;
      }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error === false) {
          if (getDatabaseLayout(state, webSocket, database)) {
            if (['top', 'bottom', 'middle'].includes(pos ?? '')) {
              state.byId[webSocket].databases.byName[database]!.isLoading = true;
            }

            if (pos === 'middle') {
              // Remember the requested dataset, because the answer of the server does not carry its
              // ID back. It becomes the active dataset in reducer receiveDatasets.
              state.byId[webSocket].databases.byName[database]!.datasets.requestedActiveId = datasetId!;
            }
          } else {
            pushLog(state, webSocket, 'error', 'Requesting DBSourceHandler datasets failed', `Database "${database}" must first be initialized before it can be used.`);
          }
        } else {
          pushLog(state, webSocket, 'error', 'Requesting DBSourceHandler datasets failed', error);
        }
      },
    },


    /**
     * Reducer to set the ID of a dataset of a given DBSourceHandler database of a
     * VtWebSocket server to be active.
     */
    setDatasetAsActive: {
      prepare: (webSocket: WebSocketId, database: string, datasetId: string) => ({
        payload: { database, datasetId },
        meta: { webSocket },
      }),
      reducer: (state, { payload: { database, datasetId }, meta: { webSocket } }: PayloadAction<{ database: string; datasetId: string }, string, WebSocketMetadata>) => {
        if (state.byId[webSocket]?.databases.byName[database]?.datasets.allIds.includes(datasetId)) {
          state.byId[webSocket].databases.byName[database].datasets.activeId = datasetId;
        }
      },
    },


    /**
     * Reducer to select a dataset of a gvien DBSourceHandler database of a VtWebSocket server by
     * the given dataset ID.
     */
    setDatasetAsSelected: {
      prepare: (
        webSocket: WebSocketId,
        database: string,
        datasetId: string,
        {
          /** Select this dataset as the only one, deselect all other. */
          only = false,
          /** Deselect this dataset if it is already selected. */
          toggle = false,
        }: { only?: boolean; toggle?: boolean } = { only: false, toggle: false },
      ) => ({
        payload: {
          database, datasetId, only, toggle,
        },
        meta: { webSocket },
      }),
      reducer: (state, { payload: {
        database, datasetId, only, toggle,
      }, meta: { webSocket } }: PayloadAction<{
        database: string; datasetId: string; only: boolean; toggle: boolean;
      }, string, WebSocketMetadata>) => {
        if (!state.byId[webSocket]?.databases.byName[database]?.datasets.allIds.includes(datasetId)) {
          return;
        }

        const db = state.byId[webSocket].databases.byName[database];

        if (only && toggle) {
          if (db.datasets.selectedIds.includes(datasetId)) {
            db.datasets.selectedIds = [];
          } else {
            db.datasets.selectedIds = [datasetId];
          }
        } else if (only) {
          if ((db.datasets.selectedIds.length !== 1) || (db.datasets.selectedIds[0] !== datasetId)) {
            db.datasets.selectedIds = [datasetId];
          }
        } else if (!db.datasets.selectedIds.includes(datasetId)) {
          db.datasets.selectedIds.push(datasetId);
        } else if (toggle) {
          db.datasets.selectedIds = db.datasets.selectedIds.filter((id) => (id !== datasetId));
        }
      },
    },


    /**
     * Reducer to deselect a dataset of a given DBSourceHandler database of a VtWebSocket server by
     * the given dataset ID.
     */
    setDatasetAsDeselected: {
      prepare: (webSocket: WebSocketId, database: string, datasetId: string) => ({
        payload: { database, datasetId },
        meta: { webSocket },
      }),
      reducer: (state, { payload: { database, datasetId }, meta: { webSocket } }: PayloadAction<{ database: string; datasetId: string }, string, WebSocketMetadata>) => {
        if (state.byId[webSocket]?.databases.byName[database]?.datasets.selectedIds.includes(datasetId)) {
          state.byId[webSocket].databases.byName[database].datasets.selectedIds = state.byId[webSocket].databases.byName[database].datasets.selectedIds.filter((id) => (id !== datasetId));
        }
      },
    },


    /**
     * Reducer to deselect all datasets of a given DBSourceHandler database of a VtWebSocket server.
     */
    setAllDatasetsAsDeselected: {
      prepare: (webSocket: WebSocketId, database: string) => ({
        payload: { database },
        meta: { webSocket },
      }),
      reducer: (state, { payload: { database }, meta: { webSocket } }: PayloadAction<{ database: string }> & { meta: WebSocketMetadata }) => {
        if (state.byId[webSocket]?.databases.byName[database]?.datasets.selectedIds.length) {
          state.byId[webSocket].databases.byName[database].datasets.selectedIds = [];
        }
      },
    },


    /**
     * Reducer to send a query to a given database source of the DBSourceHandler of a VtWebSocket
     * server to request one single dataset of a given database and a given dataset ID.
     */
    requestSingleDataset: {
      prepare: (webSocket: WebSocketId, database: string, datasetId: string) => {
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error && !isNonEmptyString(datasetId)) {
          error = `The given ID of a dataset of database "${database} is not a valid string."`;
        }

        return {
          payload: { database, datasetId },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { payload: { database }, meta: { webSocket }, error }: PayloadAction<{ database: string }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error === false) {
          if (!getDatabaseLayout(state, webSocket, database)) {
            pushLog(state, webSocket, 'error', 'Requesting single DBSourceHandler dataset failed', `Database "${database}" must first be initialized before it can be used.`);
          }
        } else {
          pushLog(state, webSocket, 'error', 'Requesting single DBSourceHandler dataset failed', error);
        }
      },
    },


    /**
     * Reducer to clear all single datasets in the Redux store (not at the database on the server).
     */
    clearSingleDatasets: {
      prepare: (webSocket: WebSocketId, database: string) => ({
        payload: { database },
        meta: { webSocket },
      }),
      reducer: (state, { payload: { database }, meta: { webSocket } }: PayloadAction<{ database: string }, string, WebSocketMetadata>) => {
        if (state.byId[webSocket]?.databases.byName[database]?.singleDatasets.allIds.length) {
          state.byId[webSocket].databases.byName[database].singleDatasets.byId = {};
          state.byId[webSocket].databases.byName[database].singleDatasets.allIds = [];
        }
      },
    },


    /**
     * Reducer to send an update to a given database source of the DBSourceHandler of a VtWebSocket
     * server to change the value of a dataset field of a given database.
     */
    editDatasetField: {
      prepare: (webSocket: WebSocketId, database: string, datasetId: string, fieldIdOrIdx: string | number, value: VtWebSocketData) => {
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error) {
          if (!isNonEmptyString(datasetId)) {
            error = `The given ID of a dataset of database "${database} is not a valid string."`;
          } else if (!isNonEmptyStringOrNumber(fieldIdOrIdx, { withoutInfinite: true, gte: 0 })) {
            error = `The given ID or index of a dataset field of database "${database} is neither a valid string nor a valid number."`;
          }
        }

        return {
          payload: {
            database,
            datasetId,
            fieldIdOrIdx,
            value,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { payload: { database, fieldIdOrIdx }, meta: { webSocket }, error }: PayloadAction<{ database: string; fieldIdOrIdx: string | number }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        let errorText = '';

        if (error === false) {
          if (getDatabaseLayout(state, webSocket, database)) {
            const field = getDatabaseField(state, webSocket, database, fieldIdOrIdx);

            if (!field) {
              errorText = `Field "${fieldIdOrIdx}" is not listed in database layout "${state.byId[webSocket].databases.byName[database]!.layout}".`;
            } else if (!field.isEditable) {
              errorText = `Field "${field.id}" of database "${database}" is not editable.`;
            }
          } else {
            errorText = `Database "${database}" must first be initialized before it can be used.`;
          }
        } else {
          errorText = error;
        }

        if (errorText) {
          pushLog(state, webSocket, 'error', 'Editing DBSourceHandler dataset field failed', errorText);
        }
      },
    },


    /**
     * Reducer to set a string value to a text filter of a given DBSourceHandler database of a
     * VtWebSocket server. If no value is given, the filter is resetted to its default value. Note
     * that the filters have to be applied to the database by action creator applyFilters
     * afterwards.
     */
    setTextFilter: {
      prepare: (webSocket: WebSocketId, database: string, filterId: string, value?: string) => {
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error && !isNonEmptyString(filterId)) {
          error = `The given ID of a filter of database "${database} is not a valid string."`;
        }

        return {
          payload: {
            database,
            filterId,
            filterType: 'text' as const,
            value: (typeof value === 'string') ? value : undefined,
            isOperator: false,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: setDatabaseFilterValue,
    },


    /**
     * Reducer to set a numeric value to an "int" or a "date" filter of a given DBSourceHandler
     * database of a VtWebSocket server. Null will set the filter to be empty. If no value is given,
     * the filter is resetted to its default value. Note that the filters have to be applied to the
     * database by action creator applyFilters afterwards.
     */
    setNumericFilter: {
      prepare: (webSocket: WebSocketId, database: string, filterId: string, value?: number | null) => {
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error && !isNonEmptyString(filterId)) {
          error = `The given ID of a filter of database "${database} is not a valid string."`;
        }

        return {
          payload: {
            database,
            filterId,
            filterType: 'int' as const,
            value: (isNumber(value, { withoutNaN: true }) || (value === null)) ? value : undefined,
            isOperator: false,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: setDatabaseFilterValue,
    },


    /**
     * Reducer to set an option of a select filter to a given DBSourceHandler database of a
     * VtWebSocket server. Set to null if no option has to be selected. If no value is given, the
     * filter is resetted to its default value. Note that the filters have to be applied to the
     * database by action creator applyFilters afterwards.
     */
    setSelectFilter: {
      prepare: (webSocket: WebSocketId, database: string, filterId: string, option?: string | number | null) => {
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error && !isNonEmptyString(filterId)) {
          error = `The given ID of a filter of database "${database} is not a valid string."`;
        }

        return {
          payload: {
            database,
            filterId,
            filterType: 'select' as const,
            value: ((typeof option === 'string') || isNumber(option, { withoutNaN: true }) || (option === null)) ? option : undefined,
            isOperator: false,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: setDatabaseFilterValue,
    },


    /**
     * Reducer to set a multiple options selection to a multiple select filter of a given
     * DBSourceHandler database of a VtWebSocket server. The given options (or a selection of the
     * available options) are an object with truthy / falsy values. If no value is given, the filter
     * is resetted to its default value. Note that the filters have to be applied to the database by
     * action creator applyFilters afterwards.
     */
    setMultiSelectFilter: {
      prepare: (webSocket: WebSocketId, database: string, filterId: string, options?: Record<string, unknown>) => {
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error && !isNonEmptyString(filterId)) {
          error = `The given ID of a filter of database "${database} is not a valid string."`;
        }

        return {
          payload: {
            database,
            filterId,
            filterType: 'mselect' as const,
            value: (getType(options) === 'object')
              ? Object.keys(options!).reduce((acc, opt) => ({ ...acc, [opt]: !!options![opt] }), {})
              : undefined,
            isOperator: false,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: setDatabaseFilterValue,
    },


    /**
     * Reducer to set an operator value to a filter of a given DBSourceHandler database of a
     * VtWebSocket server, if this filter supports opperators. If no operator is given, the operator
     * of the filter is resetted to its default value. Note that the filters have to be applied to
     * the database by action creator applyFilters afterwards.
     */
    setFilterOperator: {
      prepare: (webSocket: WebSocketId, database: string, filterId: string, operator?: string) => {
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error && !isNonEmptyString(filterId)) {
          error = `The given ID of a filter of database "${database} is not a valid string."`;
        }

        return {
          payload: {
            database,
            filterId,
            filterType: undefined,
            value: (typeof operator === 'string') ? operator : undefined,
            isOperator: true,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: setDatabaseFilterValue,
    },


    /**
     * Reducer to reset a selected filter of a given DBSourceHandler database of a VtWebSocket
     * server to its default value. Note that the filters have to be applied to the database by
     * action creator applyFilters afterwards.
     */
    resetFilter: {
      prepare: (webSocket: WebSocketId, database: string, filterId: string) => {
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error && !isNonEmptyString(filterId)) {
          error = `The given ID of a filter of database "${database} is not a valid string."`;
        }

        return {
          payload: {
            database,
            filterId,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { payload: { database, filterId }, meta: { webSocket }, error }: PayloadAction<{ database: string; filterId: string }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        let errorText = '';

        if (error === false) {
          const layout = getDatabaseLayout(state, webSocket, database);

          if (layout) {
            if (layout.filters.byId[filterId]) {
              const { defaultValue } = layout.filters.byId[filterId];
              const filter = state.byId[webSocket].databases.byName[database]!.usedFilters.byId[filterId];

              if (filter) {
                filter.value = defaultValue;
                filter.isDefault = true;
                filter.hasChanged = !deepEqual(defaultValue, filter.appliedValue);
              }
            } else {
              errorText = `Filter "${filterId}" of database "${database}" is not listed in database layout "${state.byId[webSocket].databases.byName[database]!.layout}".`;
            }
          } else {
            errorText = `Database "${database}" must first be initialized before it can be used.`;
          }
        } else {
          errorText = error;
        }

        if (errorText) {
          pushLog(state, webSocket, 'error', 'Resetting DBSourceHandler filter failed', errorText);
        }
      },
    },


    /**
     * Reducer to reset all filters of a given DBSourceHandler database of a VtWebSocket server to
     * its default values. Note that the filters have to be applied to the database by action
     * creator applyFilters afterwards.
     */
    resetAllFilters: {
      prepare: (webSocket: WebSocketId, database: string) => ({
        payload: { database },
        meta: { webSocket },
        error: checkWebSocketIdAndDatabase(webSocket, database),
      }),
      reducer: (state, { payload: { database }, meta: { webSocket }, error }: PayloadAction<{ database: string }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        let errorText = '';

        if (error === false) {
          const layout = getDatabaseLayout(state, webSocket, database);

          if (layout) {
            const { usedFilters } = state.byId[webSocket].databases.byName[database]!;

            usedFilters.byId = usedFilters.allIds.reduce<Record<string, VtWebSocketDatabaseFilter>>((acc, filterId) => {
              const { defaultValue } = layout.filters.byId[filterId]!;
              const { appliedValue, isDefault } = acc[filterId]!;

              if (isDefault) {
                return acc;
              }

              return {
                ...acc,
                [filterId]: {
                  ...acc[filterId]!,
                  value: defaultValue,
                  isDefault: true,
                  hasChanged: !deepEqual(appliedValue, defaultValue),
                },
              };
            }, usedFilters.byId);
          } else {
            errorText = `Database "${database}" must first be initialized before it can be used.`;
          }
        } else {
          errorText = error;
        }

        if (errorText) {
          pushLog(state, webSocket, 'error', 'Resetting all DBSourceHandler filters failed', errorText);
        }
      },
    },


    /**
     * Reducer to apply all changes of filters of a given DBSourceHandler database to a
     * VtWebSocket server. Set flag "allModified" to true, to apply all modified filter settings
     * that differ from the default filter. If it is false (default), only those settings are
     * applied that have been changed since the last call of this action creator. If, after applying
     * the filters, the datasets of the database are to be requested again. Set option
     * "numDatasetsToRequest" to the required number of datasets.
     */
    applyFilters: {
      prepare: (webSocket: WebSocketId, database: string, { allModified = false, numDatasetsToRequest = 0 }: { allModified?: boolean; numDatasetsToRequest?: number } = { allModified: false, numDatasetsToRequest: 0 }) => ({
        payload: { database, allModified, numDatasetsToRequest },
        meta: { webSocket },
        error: checkWebSocketIdAndDatabase(webSocket, database),
      }),
      reducer: (state, { payload: { database }, meta: { webSocket }, error }: PayloadAction<{ database: string; allModified: boolean; numDatasetsToRequest: number }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        const { usedFilters } = state.byId[webSocket].databases.byName[database]!;

        usedFilters.byId = usedFilters.allIds
          .filter((filterId) => usedFilters.byId[filterId]!.hasChanged)
          .reduce((acc, filterId) => ({
            ...acc,
            [filterId]: {
              ...acc[filterId]!,
              appliedValue: acc[filterId]!.value,
              hasChanged: false,
            },
          }), usedFilters.byId);
      },
    },


    /**
     * Reducer to set the sort of a given DBSourceHandler database of a VtWebSocket server: a list
     * of entries, each naming a sorter of the database layout and one of its values, in the order
     * of their priority. An empty list leaves the order to the server. What a sorter sorts by is
     * agreed between the source and the project, since a sorter ID is no field ID. Note that the
     * sort has to be applied to the database by action creator applySort afterwards.
     */
    setSort: {
      prepare: (webSocket: WebSocketId, database: string, sort: VtWebSocketDatabaseSort) => {
        let error = checkWebSocketIdAndDatabase(webSocket, database);

        if (!error && (!Array.isArray(sort) || !sort.every((entry) => (getType(entry) === 'object') && isNonEmptyString(entry.id) && isNonEmptyString(entry.value)))) {
          error = `The given sort of database "${database}" is no list of entries with a valid ID and value.`;
        }

        return {
          payload: {
            database,
            sort: error ? [] : sort.map(({ id, value }) => ({ id, value })),
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { payload: { database, sort }, meta: { webSocket }, error }: PayloadAction<{ database: string; sort: VtWebSocketDatabaseSort }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        let errorText = '';

        if (error === false) {
          const layout = getDatabaseLayout(state, webSocket, database);

          if (layout) {
            const invalidEntry = sort.find(({ id, value }) => !layout.sorters.byId[id]?.values.includes(value));
            const sorterIds = sort.map(({ id }) => id);

            if (invalidEntry) {
              errorText = layout.sorters.byId[invalidEntry.id]
                ? `Sorter "${invalidEntry.id}" of database "${database}" has no value "${invalidEntry.value}". Its values are "${layout.sorters.byId[invalidEntry.id]!.values.join('", "')}".`
                : `Sorter "${invalidEntry.id}" of database "${database}" is not listed in database layout "${state.byId[webSocket].databases.byName[database]!.layout}".`;
            } else if (new Set(sorterIds).size !== sorterIds.length) {
              errorText = `The given sort of database "${database}" names a sorter more than once.`;
            } else {
              const dbSort = state.byId[webSocket].databases.byName[database]!.sort;

              dbSort.value = sort;
              dbSort.hasChanged = !deepEqual(sort, dbSort.appliedValue);
            }
          } else {
            errorText = `Database "${database}" must first be initialized before it can be used.`;
          }
        } else {
          errorText = error;
        }

        if (errorText) {
          pushLog(state, webSocket, 'error', 'Setting DBSourceHandler sort failed', errorText);
        }
      },
    },


    /**
     * Reducer to reset the sort of a given DBSourceHandler database of a VtWebSocket server to the
     * empty sort, which leaves the order to the server. Note that the sort has to be applied to the
     * database by action creator applySort afterwards.
     */
    resetSort: {
      prepare: (webSocket: WebSocketId, database: string) => ({
        payload: { database },
        meta: { webSocket },
        error: checkWebSocketIdAndDatabase(webSocket, database),
      }),
      reducer: (state, { payload: { database }, meta: { webSocket }, error }: PayloadAction<{ database: string }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        let errorText = '';

        if (error === false) {
          if (getDatabaseLayout(state, webSocket, database)) {
            const dbSort = state.byId[webSocket].databases.byName[database]!.sort;

            dbSort.value = [];
            dbSort.hasChanged = (dbSort.appliedValue.length > 0);
          } else {
            errorText = `Database "${database}" must first be initialized before it can be used.`;
          }
        } else {
          errorText = error;
        }

        if (errorText) {
          pushLog(state, webSocket, 'error', 'Resetting DBSourceHandler sort failed', errorText);
        }
      },
    },


    /**
     * Reducer to apply the sort of a given DBSourceHandler database to a VtWebSocket server. The
     * sort is sent only if it has changed since it was last applied. Set flag "evenIfApplied" to
     * send a sort that is not empty in any case, which is what starting the database does. If,
     * after applying the sort, the datasets of the database are to be requested again, set option
     * "numDatasetsToRequest" to the required number of datasets.
     */
    applySort: {
      prepare: (webSocket: WebSocketId, database: string, { evenIfApplied = false, numDatasetsToRequest = 0 }: { evenIfApplied?: boolean; numDatasetsToRequest?: number } = { evenIfApplied: false, numDatasetsToRequest: 0 }) => ({
        payload: { database, evenIfApplied, numDatasetsToRequest },
        meta: { webSocket },
        error: checkWebSocketIdAndDatabase(webSocket, database),
      }),
      reducer: (state, { payload: { database }, meta: { webSocket }, error }: PayloadAction<{ database: string; evenIfApplied: boolean; numDatasetsToRequest: number }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        const byDatabase = state.byId[webSocket].databases.byName[database];

        if ((error === false) && byDatabase) {
          byDatabase.sort.appliedValue = byDatabase.sort.value;
          byDatabase.sort.hasChanged = false;
        } else {
          pushLog(state, webSocket, 'error', 'Applying DBSourceHandler sort failed', (typeof error === 'string') ? error : `Database "${database}" must first be initialized before it can be used.`);
        }
      },
    },
  },


  extraReducers: (builder) => {
    builder
      .addMatcher((action: UnknownAction) => {
        if (action.type === vtWebSocketConnectionsSlice.receiveInfo.type) {
          const { payload } = (action as PayloadAction<{ msg?: Record<string, unknown> }>);

          return (
            isNonEmptyString(payload.msg?.['info'])
            && payload.msg['info'].endsWith('.layout')
            && Array.isArray(payload.msg['fields'])
          );
        }
        return false;
      }, receiveDatabaseLayout)
      .addMatcher((action: UnknownAction) => {
        if (action.type === vtWebSocketConnectionsSlice.receiveInfo.type) {
          const { payload } = (action as PayloadAction<{ source: string; msg?: Record<string, unknown> }>);

          return (
            isNonEmptyString(payload.source)
            && !payload.source.includes('.')
            && (getType(payload.msg?.['meta']) === 'object')
            && isNumber((payload.msg!['meta'] as Record<string, unknown>)['total'], { gte: 0 })
          );
        }
        return false;
      }, receiveDatasets)
      .addMatcher((action: UnknownAction) => {
        if (action.type === vtWebSocketConnectionsSlice.receiveInfo.type) {
          const { payload } = (action as PayloadAction<{ source: string; msg?: Record<string, unknown> }>);

          return (
            isNonEmptyString(payload.source)
            && payload.source.includes('.')
            && Array.isArray(payload.msg?.['data'])
            && (payload.msg['data'].length === 1)
          );
        }
        return false;
      }, receiveSingleDatasets)
      .addMatcher((action: UnknownAction) => {
        if (action.type === vtWebSocketConnectionsSlice.receiveUpdate.type) {
          const { payload } = (action as PayloadAction<{ source: string }>);

          return isNonEmptyString(payload.source);
        }
        return false;
      }, receiveDatasetUpdates);
  },


  selectors: {
    /**
     * Selector that returns true if a DBSourceHandler database layout of a VtWebSocket server is
     * already received from the server and if it is valid. The given source can either be the name
     * of a database layout or the name of a database. In the latter case, the layout used by this
     * database (if exists) is checked. So this selector can also by used to check, if a database is
     * ready to use.
     */
    selectIsDatabaseLayoutValid: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string): boolean => (
      !!getDatabaseLayout(state, webSocket, source)
    ),


    /**
     * Selector to get the index of the key field of a DBSourceHandler database layout of a
     * VtWebSocket server. The given source can either be the name of a database layout or the name
     * of a database. In the latter case, the layout used by this database (if exists) is taken. If
     * the layout is not yet received, null is returned.
     */
    selectKeyIndex: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string): number | null => (
      getDatabaseLayout(state, webSocket, source)?.fields.keyIdx ?? null
    ),


    /**
     * Selector to get the number of fields of a DBSourceHandler database layout of a VtWebSocket
     * server. The given source can either be the name of a database layout or the name of a
     * database. In the latter case, the layout used by this database (if exists) is taken. If the
     * layout is not yet received, null is returned.
     */
    selectNumFields: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string): number | null => (
      getDatabaseLayout(state, webSocket, source)?.fields.numFields ?? null
    ),


    /**
     * Selector that returns true or false whether a DBSourceHandler database field of a
     * VtWebSocket server, selected by the field ID of a database layout exists or not. The given
     * source can either be the name of a database layout or the name of a database. In the latter
     * case, the layout used by this database (if exists) is taken.
     */
    selectFieldExists: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string, fieldId: string): boolean => {
      const layout = getDatabaseLayout(state, webSocket, source);
      const fieldIdAsLowerCase = isNonEmptyString(fieldId) ? fieldId.toLowerCase() : fieldId;
      return !!(
        layout?.fields.byId[fieldId]
        ?? (layout?.fields.allIds ?? []).some((id) => (id.toLowerCase() === fieldIdAsLowerCase))
      );
    },


    /**
     * Selector to get an object with all fields of a DBSourceHandler database layout of a
     * VtWebSocket server. The given source can either be the name of a database layout or the name
     * of a database. In the latter case, the layout used by this database (if exists) is taken. If
     * the layout is not yet received, null is returned.
     */
    selectAllFields: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string): VtWebSocketDatabaseLayout['fields']['byId'] | null => (
      getDatabaseLayout(state, webSocket, source)?.fields.byId ?? null
    ),


    /**
     * Selector to get the zero based index of a field, selected by the field ID of a
     * DBSourceHandler database layout of a VtWebSocket server. The given source can either be the
     * name of a database layout or the name of a database. In the latter case, the layout used
     * by this database (if exists) is taken. If there is no field with the given ID or if the
     * layout is not yet received, null is returned.
     */
    selectFieldIndex: getDatabaseFieldIndex,


    /**
     * Selector to get the type of a field, selected by the field ID of a DBSourceHandler database
     * layout of a VtWebSocket server. The given source can either be the name of a database layout
     * or the name of a database. In the latter case, the layout used by this database (if exists)
     * is taken. If there is no field with the given ID or if the layout is not yet received, null
     * is returned.
     */
    selectFieldType: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string, fieldId: string): VtWebSocketDatabaseFieldType | null => {
      const layout = getDatabaseLayout(state, webSocket, source);
      const fieldIdAsLowerCase = isNonEmptyString(fieldId) ? fieldId.toLowerCase() : fieldId;

      return (
        layout?.fields.byId[fieldId]?.type
        ?? layout?.fields.byId[layout.fields.allIds.find((id) => (id.toLowerCase() === fieldIdAsLowerCase)) ?? '']?.type
        ?? null
      );
    },


    /**
     * Selector that returns true or false whether the value of a DBSourceHandler database field of
     * a VtWebSocket server may be changed or not, selected either by the field ID or by its zero
     * based index. The given source can either be the name of a database layout or the name of a
     * database. In the latter case, the layout used by this database (if exists) is taken. If there
     * is no such field or if the layout is not yet received, null is returned. Note that a field
     * whose layout omits the flag counts as editable.
     */
    selectIsFieldEditable: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string, fieldIdOrIdx: string | number): boolean | null => (
      getDatabaseField(state, webSocket, source, fieldIdOrIdx)?.isEditable ?? null
    ),


    /**
     * Selector that returns true or false whether a DBSourceHandler database field of a VtWebSocket
     * server should be shown or not, selected either by the field ID or by its zero based index.
     * The given source can either be the name of a database layout or the name of a database. In
     * the latter case, the layout used by this database (if exists) is taken. If there is no such
     * field or if the layout is not yet received, null is returned. Note that a field whose layout
     * omits the flag counts as visible, and that the framework acts on it nowhere by itself.
     */
    selectIsFieldVisible: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string, fieldIdOrIdx: string | number): boolean | null => (
      getDatabaseField(state, webSocket, source, fieldIdOrIdx)?.isVisible ?? null
    ),


    /**
     * Selector to get an array with the IDs of all filters of a DBSourceHandler database layout of
     * a VtWebSocket server. The given source can either be the name of a database layout or the
     * name of a database. In the latter case, the layout used by this database (if exists) is
     * taken. If the layout is not yet received, null is returned.
     */
    selectAllFilterIds: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string): VtWebSocketDatabaseLayout['filters']['allIds'] | null => (
      getDatabaseLayout(state, webSocket, source)?.filters.allIds ?? null
    ),


    /**
     * Selector to get an object with all filters of a DBSourceHandler database layout of a
     * VtWebSocket server. The given source can either be the name of a database layout or the name
     * of a database. In the latter case, the layout used by this database (if exists) is taken. If
     * the layout is not yet received, null is returned.
     */
    selectAllFilters: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string): VtWebSocketDatabaseLayout['filters']['byId'] | null => (
      getDatabaseLayout(state, webSocket, source)?.filters.byId ?? null
    ),


    /**
     * Selector to get an array with the IDs of all sorters of a DBSourceHandler database layout of
     * a VtWebSocket server, in the order the layout lists them. It is empty if the source offers no
     * sorting. The given source can either be the name of a database layout or the name of a
     * database. In the latter case, the layout used by this database (if exists) is taken. If the
     * layout is not yet received, null is returned.
     */
    selectAllSorterIds: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string): VtWebSocketDatabaseLayout['sorters']['allIds'] | null => (
      getDatabaseLayout(state, webSocket, source)?.sorters.allIds ?? null
    ),


    /**
     * Selector to get an object with all sorters of a DBSourceHandler database layout of a
     * VtWebSocket server. The given source can either be the name of a database layout or the name
     * of a database. In the latter case, the layout used by this database (if exists) is taken. If
     * the layout is not yet received, null is returned.
     */
    selectAllSorters: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string): VtWebSocketDatabaseLayout['sorters']['byId'] | null => (
      getDatabaseLayout(state, webSocket, source)?.sorters.byId ?? null
    ),


    /**
     * Selector that returns true, if datasets of a given DBSourceHandler database of a VtWebSocket
     * server are requested with "top" or "bottom" at the moment and the answer is not yet received.
     */
    selectAreDatasetsLoading: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): boolean => (
      !!state.byId[webSocket]?.databases.byName[database]?.isLoading
    ),


    /**
     * Selector to get the number of datasets of a given DBSourceHandler database at a VtWebSocket
     * server, selected by filters. If the database does not exist, null is returned.
     * Note: selectNumDatasetsTotal() = selectNumDatasetsBefore() + selectAllDatasetIds().length + selectNumDatasetsAfter().
     */
    selectNumDatasetsTotal: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): number | null => (
      state.byId[webSocket]?.databases.byName[database]?.numTotal ?? null
    ),


    /**
     * Selector to get the number of the remaining datasets of a given DBSourceHandler database at a
     * VtWebSocketEngine server before (usually chronologically before) those in the store. If the
     * database does not exist, null is returned.
     */
    selectNumDatasetsBefore: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): number | null => (
      state.byId[webSocket]?.databases.byName[database]?.numBefore ?? null
    ),


    /**
     * Selector to get the number of the remaining datasets of a given DBSourceHandler database at a
     * VtWebSocketEngine server after (usually chronologically after) those in the store. If the
     * database does not exist, 0 is returned.
     */
    selectNumDatasetsAfter: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): number | null => (
      state.byId[webSocket]?.databases.byName[database]?.numAfter ?? null
    ),


    /**
     * Selector to get an array with the IDs of the filtered datasets of a given DBSourceHandler
     * database of a VtWebSocketEngine server, that are in the store. If the database does not
     * exist, null is returned.
     * Note: selectNumVtwseDatasetsTotal() = selectNumVtwseDatasetsBefore() + selectAllVtwseDatasetIds().length + selectNumVtwseDatasetsAfter().
     */
    selectAllDatasetIds: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): VtWebSocketDatabase['datasets']['allIds'] | null => (
      state.byId[webSocket]?.databases.byName[database]?.datasets.allIds ?? null
    ),


    /**
     * Selector to get an object with the filtered datasets of a given DBSourceHandler database of a
     * VtWebSocketEngine server, that are in the store. If the database does not exist, null is
     * returned.
     */
    selectAllDatasets: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): VtWebSocketDatabase['datasets']['byId'] | null => (
      state.byId[webSocket]?.databases.byName[database]?.datasets.byId ?? null
    ),


    /**
     * Selector to get the array of a dataset of a given DBSourceHandler database of a
     * VtWebSocketEngine server, selected by a given dataset ID. If the database does not exist or
     * if there is no dataset with this ID, null is returned.
     */
    selectDataset: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string): VtWebSocketDataset | null => (
      state.byId[webSocket]?.databases.byName[database]?.datasets.byId[datasetId] ?? null
    ),


    /**
     * Selector to return the value of a dataset of a given DBSourceHandler database of a
     * VtWebSocketEngine server selected by a given dataset ID and by the field ID. If no valid
     * dataset or field can be found, an optional default value is returned. This selector makes
     * sense when only a few values of a dataset are required!
     */
    selectDatasetValue: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string, fieldId: string, defaultValue: VtWebSocketData | null = null): VtWebSocketData | null => {
      const idx = getDatabaseFieldIndex(state, webSocket, database, fieldId);
      const dataset = state.byId[webSocket]?.databases.byName[database]?.datasets.byId[datasetId];

      return ((idx !== null) && Array.isArray(dataset) && (idx < dataset.length))
        ? dataset[idx]!
        : defaultValue;
    },


    /**
     * Selector to get the ID of the currently active dataset of a given DBSourceHandler database of
     * a VtWebSocketEngine server. If the database does not exist or if no dataset is active because
     * there are no datasets, null is returned. Otherwise there is always an active dataset.
     */
    selectActiveDatasetId: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): string | null => (
      state.byId[webSocket]?.databases.byName[database]?.datasets.activeId ?? null
    ),


    /**
     * Selector to get the number of datasets of a given DBSourceHandler database of a
     * VtWebSocketEngine server that are selected. If the database does not exist, null is returned.
     */
    selectNumSelectedDatasets: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): number | null => (
      state.byId[webSocket]?.databases.byName[database]?.datasets.selectedIds.length ?? null
    ),


    /**
     * Selector to get an array with the IDs of all datasets of a given DBSourceHandler database of
     * a VtWebSocketEngine server, that are selected at the moment. If the database does not exist,
     * null is returned.
     */
    selectSelectedDatasetIds: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): VtWebSocketDatabase['datasets']['selectedIds'] | null => (
      state.byId[webSocket]?.databases.byName[database]?.datasets.selectedIds ?? null
    ),


    /**
     * Selector to get an array with the IDs of all datasets of a given DBSourceHandler database of
     * a VtWebSocketEngine server, that are not selected at the moment. If the database does not
     * exist, null is returned.
     */
    selectNotSelectedDatasetIds: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): ReturnType<typeof reselectNotSelectedDatasetIds> => (
      state.byId[webSocket]?.databases.byName[database]
        ? reselectNotSelectedDatasetIds(state, webSocket, database)
        : null
    ),


    /**
     * Selector that returns true if the dataset of a given DBSourceHandler database of a
     * VtWebSocketEngine server, selected by a given dataset ID is selected at the moment or false
     * if not. If the database does not exist, null is returned.
     */
    selectIsDatasetSelected: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string): boolean | null => (
      state.byId[webSocket]?.databases.byName[database]?.datasets.selectedIds.includes(datasetId) ?? null
    ),


    /**
     * Selector to return an array with the IDs of all single requested datasets of a given
     * DBSourceHandler database of a VtWebSocketEngine server, that are in the store. If the
     * database does not exist, null is returned.
     */
    selectAllSingleDatasetIds: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): string[] | null => (
      state.byId[webSocket]?.databases.byName[database]?.singleDatasets.allIds ?? null
    ),


    /**
     * Selector to return the object with all single requested datasets of a given DBSourceHandler
     * database of a VtWebSocketEngine server. If the database does not exist, null is returned.
     */
    selectAllSingleDatasets: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): VtWebSocketDatabase['singleDatasets']['byId'] | null => (
      state.byId[webSocket]?.databases.byName[database]?.singleDatasets.byId ?? null
    ),


    /**
     * Selector to return true if a single requested dataset of a given DBSourceHandler database of
     * a VtWebSocketEngine server is available or false if not.
     */
    selectIsSingleDataset: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string): boolean => (
      !!state.byId[webSocket]?.databases.byName[database]?.singleDatasets.byId[datasetId]
    ),


    /**
     * Selector to return the array of a single requested dataset of a given DBSourceHandler
     * database of a VtWebSocketEngine server, selected by a given dataset ID. If the database does
     * not exist or if there is no dataset with this ID, null is returned.
     */
    selectSingleDataset: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string): VtWebSocketDataset | null => (
      state.byId[webSocket]?.databases.byName[database]?.singleDatasets.byId[datasetId] ?? null
    ),


    /**
     * Selector to return the value of a single dataset of a given DBSourceHandler database of a
     * VtWebSocketEngine server selected by a given dataset ID and by the field ID. If no valid
     * dataset or field can be found, an optional default value is returned. This selector makes
     * sense when only a few values of a dataset are required!
     */
    selectSingleDatasetValue: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string, fieldId: string, defaultValue: VtWebSocketData | null = null): VtWebSocketData | null => {
      const idx = getDatabaseFieldIndex(state, webSocket, database, fieldId);
      const dataset = state.byId[webSocket]?.databases.byName[database]?.singleDatasets.byId[datasetId];

      return ((idx !== null) && Array.isArray(dataset) && (idx < dataset.length))
        ? dataset[idx]!
        : defaultValue;
    },


    /**
     * Selector to return a memoized function, that can find the value from a dataset of a given
     * DBSourceHandler database of a VtWebSocketEngine server selected by a given dataset ID and a
     * field ID. If the value can not be found, a default value, that is null by default, is
     * returned. This selector makes sense in a data table for example.
     */
    selectDatabaseValueGetter: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): ReturnType<typeof reselectDatabaseValueGetter> | null => (
      state.byId[webSocket]?.databases.byName[database]
        ? reselectDatabaseValueGetter(state, webSocket, database)
        : null
    ),


    /**
     * Selector to return a memoized function, that can find the value from the dataset of a given
     * DBSourceHandler database of a VtWebSocketEngine server selected by a given field ID. If the
     * value can not be found, a default value, that is null by default, is returned. This selector
     * makes sense when several values of a specific dataset are required!
     */
    selectDatasetValueGetter: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string): ReturnType<typeof reselectDatasetValueGetter> | null => (
      (state.byId[webSocket]?.databases.byName[database] && datasetId)
        ? reselectDatasetValueGetter(state, webSocket, database, datasetId)
        : null
    ),


    /**
     * Selector to return an object with the values of all available filters of a given
     * DBSourceHandler database of a VtWebSocketEngine server. If the database does not exist, null
     * is returned.
     */
    selectAllFilterValues: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): ReturnType<typeof reselectAllFilterValues> | null => (
      state.byId[webSocket]?.databases.byName[database]
        ? reselectAllFilterValues(state, webSocket, database)
        : null
    ),


    /**
     * Selector to return an object with a boolean flag of all filters of a given DBSourceHandler
     * database of a VtWebSocketEngine server used so far(!). The flag indicats if the filter is
     * modified (true) or not (false). If the database does not exist, null is returned.
     */
    selectUsedFilterModificationFlags: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): ReturnType<typeof reselectUsedFilterModificationFlags> | null => (
      state.byId[webSocket]?.databases.byName[database]
        ? reselectUsedFilterModificationFlags(state, webSocket, database)
        : null
    ),


    /**
     * Selector that returns the current value of a filter selected by its ID of a given
     * DBSourceHandler database of a VtWebSocketEngine server. If the database or the given filter
     * does not exist, undefined is returned.
     */
    selectFilterValue: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, filterId: string): VtWebSocketDatabaseFilterValue | undefined => {
      const layout = getDatabaseLayout(state, webSocket, database);

      if (layout?.filters.byId[filterId]) {
        if (state.byId[webSocket]?.databases.byName[database]?.usedFilters.byId[filterId]) {
          return state.byId[webSocket].databases.byName[database].usedFilters.byId[filterId].value;
        }

        return layout.filters.byId[filterId].defaultValue;
      }

      return undefined;
    },


    /**
     * Selector that returns true, if any filter values of a given DBSourceHandler database of a
     * VtWebSocketEngine server are modified (differs from the initial default value). If the
     * database does not exist, false is returned.
     */
    selectAreFiltersModified: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): boolean => (
      (state.byId[webSocket]?.databases.byName[database]?.usedFilters.allIds ?? [])
        .some((filterId) => !state.byId[webSocket]!.databases.byName[database]!.usedFilters.byId[filterId]!.isDefault)
    ),


    /**
     * Selector to return an array with the filter objects of all modified filters (value differs
     * from the initial default value) of a given DBSourceHandler database of a VtWebSocketEngine
     * server. If the database does not exist, null is returned.
     */
    selectModifiedFilters: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): ReturnType<typeof reselectModifiedFilters> | null => (
      state.byId[webSocket]?.databases.byName[database]
        ? reselectModifiedFilters(state, webSocket, database)
        : null
    ),


    /**
     * Selector to return an array with the filter objects of a given DBSourceHandler database of a
     * VtWebSocketEngine server whose values were changed since the last call of action creator
     * applyVtwseDatabaseFilters. If the database does not exist, null is returned.
     */
    selectNotAppliedFilters: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): ReturnType<typeof reselectNotAppliedFilters> | null => (
      state.byId[webSocket]?.databases.byName[database]
        ? reselectNotAppliedFilters(state, webSocket, database)
        : null
    ),


    /**
     * Selector to get the current sort of a given DBSourceHandler database of a VtWebSocket server:
     * its entries in the order of their priority, or an empty array if the order is left to the
     * server. If the database does not exist, null is returned.
     */
    selectSort: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): VtWebSocketDatabaseSort | null => (
      state.byId[webSocket]?.databases.byName[database]?.sort.value ?? null
    ),


    /**
     * Selector that returns true, if the sort of a given DBSourceHandler database of a VtWebSocket
     * server is modified (it is not the empty sort, which leaves the order to the server). If the
     * database does not exist, false is returned.
     */
    selectIsSortModified: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): boolean => (
      (state.byId[webSocket]?.databases.byName[database]?.sort.value.length ?? 0) > 0
    ),


    /**
     * Selector that returns true, if the sort of a given DBSourceHandler database of a VtWebSocket
     * server was changed since the last call of action creator applySort. If the database does not
     * exist, false is returned.
     */
    selectIsSortNotApplied: (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string): boolean => (
      state.byId[webSocket]?.databases.byName[database]?.sort.hasChanged ?? false
    ),


    /**
     * Selector to get an array with the log entries of the VtWebSocketEngine databases slice,
     * selected by the given WebSocket ID. If the ID is invalid or is not yet set, null is returned.
     */
    selectLogs: (state: VtWebSocketDatabasesState, webSocket: WebSocketId) => state.byId[webSocket]?.logs ?? null,
  },
});


declare module 'store/store.types' {
  export interface LazyLoadedSlices extends WithSlice<typeof slice> {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

rootReducer.inject(slice);


/**
 * Redux listener for some actions of this slice to initialize, start or stop a database.
 */
startListening({
  predicate: (action) => (
    action.type.startsWith(`${slice.name}/`)
    && (action['error'] === false)
    && webSocketsApi.exists((action['meta'] as WebSocketMetadata).webSocket)
  ),
  effect: (action, listenerApi) => {
    const selectors = slice.getSelectors((rootState: RootState) => rootState[slice.reducerPath] ?? initialState);

    switch (action.type) {
      // -------------------------------------------------------------------------------------------
      case slice.actions.initDatabase.type: {
      // -------------------------------------------------------------------------------------------

        const { payload: { database }, meta: { webSocket } } = action as ReturnType<typeof slice.actions.initDatabase>;
        const { layout } = listenerApi.getState().vtWebSocketDatabases?.byId[webSocket]?.databases.byName[database] ?? {};

        if (
          isNonEmptyString(layout)
          && (listenerApi.getOriginalState().vtWebSocketDatabases?.byId[webSocket]?.layouts.byName[layout] === undefined)
          && (listenerApi.getState().vtWebSocketDatabases?.byId[webSocket]?.layouts.byName[layout] === null)
        ) {
          webSocketsApi.send(webSocket, { query: layout });
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case slice.actions.startDatabase.type: {
      // -------------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.startDatabase>;

        if (selectors.selectIsDatabaseLayoutValid(listenerApi.getState(), webSocket, payload)) {
          listenerApi.dispatch(slice.actions.applyFilters(webSocket, payload, { allModified: true }));
          listenerApi.dispatch(slice.actions.applySort(webSocket, payload, { evenIfApplied: true }));
          webSocketsApi.send(webSocket, { set: payload, push: true });
          webSocketsApi.send(webSocket, { query: payload });
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case slice.actions.stopDatabase.type: {
      // -------------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.stopDatabase>;

        if (selectors.selectIsDatabaseLayoutValid(listenerApi.getState(), webSocket, payload)) {
          webSocketsApi.send(webSocket, { set: payload, push: false });
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case slice.actions.requestDatasets.type: {
      // -------------------------------------------------------------------------------------------

        const { payload: {
          database, cnt, pos, datasetId,
        }, meta: { webSocket } } = action as ReturnType<typeof slice.actions.requestDatasets>;

        if (selectors.selectIsDatabaseLayoutValid(listenerApi.getState(), webSocket, database)) {
          webSocketsApi.send(webSocket, {
            query: database,
            ...((cnt !== undefined) && { cnt }),
            ...((pos !== undefined) && { pos }),
            ...(isNonEmptyString(datasetId) && { id: datasetId }),
          });
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case slice.actions.requestSingleDataset.type: {
      // -------------------------------------------------------------------------------------------

        const { payload: { database, datasetId }, meta: { webSocket } } = action as ReturnType<typeof slice.actions.requestSingleDataset>;

        if (selectors.selectIsDatabaseLayoutValid(listenerApi.getState(), webSocket, database)) {
          webSocketsApi.send(webSocket, { query: `${database}.${datasetId}` });
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case slice.actions.editDatasetField.type: {
      // -------------------------------------------------------------------------------------------

        const { payload: {
          database, datasetId, fieldIdOrIdx, value,
        }, meta: { webSocket } } = action as ReturnType<typeof slice.actions.editDatasetField>;

        if (
          selectors.selectIsDatabaseLayoutValid(listenerApi.getState(), webSocket, database)
          && selectors.selectIsFieldEditable(listenerApi.getState(), webSocket, database, fieldIdOrIdx)
        ) {
          const fieldIdx = (typeof fieldIdOrIdx === 'string')
            ? selectors.selectFieldIndex(listenerApi.getState(), webSocket, database, fieldIdOrIdx) ?? fieldIdOrIdx
            : fieldIdOrIdx;

          webSocketsApi.send(webSocket, {
            update: database,
            edit: [{ [`${datasetId}.${fieldIdx}`]: value }],
          });
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case slice.actions.applyFilters.type: {
      // -------------------------------------------------------------------------------------------

        const { payload: { database, allModified, numDatasetsToRequest }, meta: { webSocket } } = action as ReturnType<typeof slice.actions.applyFilters>;
        const filterLayouts = selectors.selectAllFilters(listenerApi.getState(), webSocket, database);
        const filters = allModified
          ? selectors.selectModifiedFilters(listenerApi.getOriginalState(), webSocket, database)
          : selectors.selectNotAppliedFilters(listenerApi.getOriginalState(), webSocket, database);

        const filterCmds = (filters ?? []).reduce<VtWebSocketFilterCmd[]>((acc, { id, value, isDefault }) => {
          const { type, usePattern } = filterLayouts![id]!;

          if (isDefault) {
            return [
              ...acc,
              { id, reset: true },
            ];
          }

          switch (type) {
            case 'text': {
              const typedValue = value as VtWebSocketDatabaseFilterTextValue;

              return [
                ...acc,
                {
                  id,
                  value: (usePattern && !typedValue.endsWith('*'))
                    ? `${typedValue}*`
                    : typedValue,
                },
              ];
            }

            case 'int':
            case 'date': {
              const typedValue = value as VtWebSocketDatabaseFilterNumericValue;

              return [
                ...acc,
                {
                  id,
                  ...(Array.isArray(typedValue) ? { value: typedValue[0], op: typedValue[1] } : { value: typedValue }),
                },
              ];
            }

            case 'select': {
              const typedValue = value as VtWebSocketDatabaseFilterSelectValue;

              return [
                ...acc,
                {
                  id,
                  values: (typedValue === null) ? [] : [typedValue],
                },
              ];
            }

            case 'mselect': {
              const typedValue = value as VtWebSocketDatabaseFilterMultiSelectValue;

              return [
                ...acc,
                {
                  id,
                  values: Object.keys(typedValue).filter((partId) => typedValue[partId]).map((partId) => partId),
                },
              ];
            }

            default:
              return acc;
          }
        }, []);

        if (filterCmds.length > 0) {
          webSocketsApi.send(webSocket, { set: database, filter: filterCmds });

          if (isNumber(numDatasetsToRequest, { withoutInfinite: true, gt: 0 })) {
            listenerApi.dispatch(slice.actions.requestDatasets(webSocket, database, numDatasetsToRequest, 'top'));
          }
        }

        break;
      }

      // -------------------------------------------------------------------------------------------
      case slice.actions.applySort.type: {
      // -------------------------------------------------------------------------------------------

        const { payload: { database, evenIfApplied, numDatasetsToRequest }, meta: { webSocket } } = action as ReturnType<typeof slice.actions.applySort>;
        const originalState = listenerApi.getOriginalState();
        const sort = selectors.selectSort(originalState, webSocket, database);
        const isToSend = selectors.selectIsSortNotApplied(originalState, webSocket, database)
          || (evenIfApplied && selectors.selectIsSortModified(originalState, webSocket, database));

        // An empty sort is sent as well: it is the way back to the order of the server, since the
        // specification defines no reset of a sort.
        if (sort && isToSend && selectors.selectIsDatabaseLayoutValid(originalState, webSocket, database)) {
          webSocketsApi.send(webSocket, { set: database, sort });

          if (isNumber(numDatasetsToRequest, { withoutInfinite: true, gt: 0 })) {
            listenerApi.dispatch(slice.actions.requestDatasets(webSocket, database, numDatasetsToRequest, 'top'));
          }
        }

        break;
      }

      // no default
    }
  },
});


export const { name } = slice;

export const {
  initDatabase, startDatabase, stopDatabase, resetDatabases, requestDatasets, setDatasetAsActive,
  setDatasetAsSelected, setDatasetAsDeselected, setAllDatasetsAsDeselected, requestSingleDataset,
  clearSingleDatasets, editDatasetField, setTextFilter, setNumericFilter, setSelectFilter,
  setMultiSelectFilter, setFilterOperator, resetFilter, resetAllFilters, applyFilters, setSort,
  resetSort, applySort,
} = slice.actions;

export const {
  selectIsDatabaseLayoutValid, selectKeyIndex, selectNumFields, selectFieldExists, selectAllFields,
  selectFieldIndex, selectFieldType, selectIsFieldEditable, selectIsFieldVisible, selectAllFilterIds,
  selectAllFilters, selectAllSorterIds, selectAllSorters, selectAreDatasetsLoading,
  selectNumDatasetsTotal, selectNumDatasetsBefore,
  selectNumDatasetsAfter, selectAllDatasetIds, selectAllDatasets, selectDataset, selectDatasetValue,
  selectActiveDatasetId, selectNumSelectedDatasets, selectSelectedDatasetIds,
  selectNotSelectedDatasetIds, selectIsDatasetSelected, selectAllSingleDatasetIds,
  selectAllSingleDatasets, selectIsSingleDataset, selectSingleDataset, selectSingleDatasetValue,
  selectDatabaseValueGetter, selectDatasetValueGetter, selectAllFilterValues,
  selectUsedFilterModificationFlags, selectFilterValue, selectAreFiltersModified,
  selectModifiedFilters, selectNotAppliedFilters, selectSort, selectIsSortModified,
  selectIsSortNotApplied, selectLogs,
} = slice.getSelectors((rootState: RootState) => rootState[slice.reducerPath] ?? initialState);
