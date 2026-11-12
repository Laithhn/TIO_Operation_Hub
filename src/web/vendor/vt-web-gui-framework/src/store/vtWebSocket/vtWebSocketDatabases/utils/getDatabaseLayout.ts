import type { WebSocketId } from 'interfaces/webSocketItf';

import type { VtWebSocketDatabaseLayout, VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';


/**
 * Internal selector to get the database layout object of the given state, selected by the ID of a
 * WebSocket connection and by the source name of either a given database layout or alternatively of
 * a given database. If the layout is requested but not yet received, null is returned. If the
 * layout does not exit, undefined is returned.
 */
export const getDatabaseLayout = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string): VtWebSocketDatabaseLayout | null | undefined => {
  if (state.byId[webSocket]) {
    if (state.byId[webSocket].layouts.byName[source] !== undefined) {
      return state.byId[webSocket].layouts.byName[source];
    }

    if (
      state.byId[webSocket].databases.byName[source]
      && state.byId[webSocket].layouts.byName[state.byId[webSocket].databases.byName[source].layout] !== undefined
    ) {
      return state.byId[webSocket].layouts.byName[state.byId[webSocket].databases.byName[source].layout];
    }
  }

  return undefined;
};
