import { createSelector } from '@reduxjs/toolkit';

import type { WebSocketId } from 'interfaces/webSocketItf';

import { type VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';


type Selector = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => Record<string, boolean>;


/**
 * Selector to return an object with a boolean flag of all filters of a given DBSourceHandler
 * database of a VtWebSocket server used so far(!). The flag indicats if the filter is modified
 * (true) or not (false).
 */
export const reselectUsedFilterModificationFlags: Selector = createSelector(
  (state: VtWebSocketDatabasesState, webSocket: WebSocketId, database: string) => state.byId[webSocket]?.databases.byName[database],
  (byDatabase) => (byDatabase?.usedFilters.allIds ?? []).reduce<Record<string, boolean>>((acc, filterId) => ({
    ...acc,
    [filterId]: !byDatabase!.usedFilters.byId[filterId]!.isDefault,
  }), {}),
);
