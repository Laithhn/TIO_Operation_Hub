import { createSelector } from '@reduxjs/toolkit';

import type { WebSocketId } from 'interfaces/webSocketItf';

import type { VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';


type Selector = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => string[] | null;


/**
 * Selector to get an array with the IDs of all datasets of a given DBSourceHandler database of
 * a VtWebSocket server, that are not selected at the moment. If the database does not exists,
 * null is returned.
 */
export const reselectNotSelectedDatasetIds: Selector = createSelector(
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => state.byId[webSocket]?.databases.byName[database]?.datasets.allIds,
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => state.byId[webSocket]?.databases.byName[database]?.datasets.selectedIds,
  (allDatasetIds, selectedIds) => (
    (allDatasetIds && selectedIds) ? allDatasetIds.filter((id) => !selectedIds.includes(id)) : null
  ),
);
