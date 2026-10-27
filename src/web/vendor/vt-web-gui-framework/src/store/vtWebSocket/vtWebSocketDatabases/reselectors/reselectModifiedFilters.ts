import { createSelector } from '@reduxjs/toolkit';

import type { WebSocketId } from 'interfaces/webSocketItf';

import type { VtWebSocketDatabaseFilter, VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';


type Selector = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => (VtWebSocketDatabaseFilter & { id: string })[];


/**
 * Selector to return an array with the filter objects of all modified filters (value differs from
 * the initial default value) of a given DBSourceHandler database of a VtWebSocket server.
 */
export const reselectModifiedFilters: Selector = createSelector(
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => state.byId[webSocket]?.databases.byName[database]?.usedFilters,
  (usedFilters) => (usedFilters?.allIds ?? [])
    .filter((filterId) => !usedFilters!.byId[filterId]!.isDefault)
    .map((filterId) => ({
      id: filterId,
      ...usedFilters!.byId[filterId]!,
    })),
);
