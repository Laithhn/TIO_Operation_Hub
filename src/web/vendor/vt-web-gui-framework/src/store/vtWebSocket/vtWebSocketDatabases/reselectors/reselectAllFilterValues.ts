import { createSelector } from '@reduxjs/toolkit';

import type { WebSocketId } from 'interfaces/webSocketItf';

import { getDatabaseLayout } from '../utils/getDatabaseLayout';
import type { VtWebSocketDatabaseFilterValue, VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';


type Selector = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => Record<string, VtWebSocketDatabaseFilterValue>;


/**
 * Selector to return an object with the values of all available filters of a given DBSourceHandler
 * database of a VtWebSocket server.
 */
export const reselectAllFilterValues: Selector = createSelector(
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => getDatabaseLayout(state, webSocket, database)?.filters.allIds,
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => getDatabaseLayout(state, webSocket, database)?.filters.byId,
  (state: VtWebSocketDatabasesState, webSocket: string, database: string) => state.byId[webSocket]?.databases.byName[database]?.usedFilters.byId,
  (allFilterIds, byFilterId, usedFiltersById) => (allFilterIds ?? []).reduce<Record<string, VtWebSocketDatabaseFilterValue>>((acc, filterId) => ({
    ...acc,
    [filterId]: usedFiltersById?.[filterId] ? usedFiltersById[filterId].value : byFilterId![filterId]!.defaultValue,
  }), {}),
);
