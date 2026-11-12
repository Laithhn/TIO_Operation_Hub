import { createSelector } from '@reduxjs/toolkit';

import type { WebSocketId } from 'interfaces/webSocketItf';

import { getDatabaseLayout } from '../utils/getDatabaseLayout';
import type { VtWebSocketData, VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';


type Selector = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string) => (fieldId: string, defaultValue: VtWebSocketData | null) => VtWebSocketData | null;


/**
 * Selector to return a memoized function, that can find the value from the dataset of a given
 * DBSourceHandler database of a VtWebSocketEngine server selected by a given field ID. If the value
 * can not be found, a default value, that is null by default, is returned. This selector makes
 * sense when several values of a specific dataset are required!
 */
export const reselectDatasetValueGetter: Selector = createSelector(
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => getDatabaseLayout(state, webSocket, database)?.fields.byId,
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string) => state.byId[webSocket]?.databases.byName[database]?.datasets.byId[datasetId],
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string, datasetId: string) => state.byId[webSocket]?.databases.byName[database]?.singleDatasets.byId[datasetId],
  (allFields, dataset, singleDataset) => (fieldId: string, defaultValue = null) => {
    const { idx } = allFields?.[fieldId] ?? {};
    const ds = dataset ?? singleDataset;

    return ((idx !== undefined) && Array.isArray(ds) && (idx < ds.length))
      ? ds[idx]!
      : defaultValue;
  },
);
