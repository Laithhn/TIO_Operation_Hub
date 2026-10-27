import { createSelector } from '@reduxjs/toolkit';

import type { WebSocketId } from 'interfaces/webSocketItf';

import { getDatabaseLayout } from '../utils/getDatabaseLayout';
import type { VtWebSocketData, VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';


type Selector = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => (datasetId: string, fieldId: string, defaultValue: VtWebSocketData | null) => VtWebSocketData | null;


/**
 * Selector to return a memoized function, that can find the value from a dataset of a given
 * DBSourceHandler database of a VtWebSocket server selected by a given dataset ID and a field ID.
 * If the value can not be found, a default value, that is null by default, is returned. This
 * selector makes sense in a data table for example.
 */
export const reselectDatabaseValueGetter: Selector = createSelector(
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => getDatabaseLayout(state, webSocket, database)?.fields.byId,
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => state.byId[webSocket]?.databases.byName[database]?.datasets.byId,
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => state.byId[webSocket]?.databases.byName[database]?.singleDatasets.byId,
  (allFields, allDatasets, allSingleDatasets) => (datasetId: string, fieldId: string, defaultValue = null) => {
    const { idx } = allFields?.[fieldId] ?? {};
    const dataset = allDatasets?.[datasetId] ?? allSingleDatasets?.[datasetId];

    return ((idx !== undefined) && Array.isArray(dataset) && (idx < dataset.length))
      ? dataset[idx]!
      : defaultValue;
  },
);
