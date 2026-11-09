import { createSelector } from '@reduxjs/toolkit';

import type { WebSocketId } from 'interfaces/webSocketItf';

import type { VtWebSocketDatabaseFilter, VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';


type Selector = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => (VtWebSocketDatabaseFilter & { id: string })[];


/**
 * Selector to return an array with the filter objects of a given DBSourceHandler database of a
 * VtWebSocket server whose values were changed since the last call of action creator applyFilters.
 */
export const reselectNotAppliedFilters: Selector = createSelector(
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => state.byId[webSocket]?.databases.byName[database]?.usedFilters,
  (usedFilters) => (usedFilters?.allIds ?? [])
    .filter((filterId) => usedFilters!.byId[filterId]!.hasChanged)
    .map((filterId) => ({
      id: filterId,
      ...usedFilters!.byId[filterId]!,
    })),
);
