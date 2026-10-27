import type { WebSocketId } from 'interfaces/webSocketItf';
import { pushLogEntry } from 'store/pushLogEntry';
import type { LogEntry } from 'store/store.types';

import type { VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';


/** The name this slice carries in its log entries. It is also its reducer path, so that an entry
 * names a part of the store that exists. */
export const sliceName = 'vtWebSocketDatabases';


/**
 * Internal helper to append an entry to the log of a WebSocket connection. It does nothing if the
 * connection is unknown to this slice.
 */
export const pushLog = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, level: LogEntry['level'], title: string, text: string) => {
  const connection = state.byId[webSocket];

  if (connection) {
    pushLogEntry(connection.logs, {
      slice: sliceName,
      level,
      timestamp: Date.now(),
      title,
      text,
    });
  }
};
