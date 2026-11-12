import type { WebSocketId, WebSocketServer, WebSocketStatus } from 'interfaces/webSocketItf';
import type { LogEntry } from 'store/store.types';


export interface WebSocketConnection {
  /** Object with the settings of a WebSocket connection. */
  settings: {
    /** The internal ID of the WebSocket connection. */
    id: WebSocketId;
    /** True, if the WebSocket connection is defined in the configuration. */
    fromConfig: boolean;
    /** The URL for the WebSocket connection to the server. */
    url: string;
    /** The API specification of the WebSocket server. */
    server: WebSocketServer;
    /** True, to automatically use the authentication of the server (server specific).
     * */
    useAuth: boolean;
    /** True, if the WebSocket connection has to be opened automatically. */
    autoOpen: boolean;
    /** Delay time in milliseconds to automatically re-open the WebSocket connection after its
     * status changed to CLOSED or ERROR. Each further attempt waits twice as long, up to a minute
     * or this delay if it is longer, and an opened connection starts again from it. A delay of 0
     * re-opens at once the first time. Set to false to deactivate this feature. */
    autoReconnect: number | false;
  };
  /** The status of the WebSocket connection. */
  status: WebSocketStatus;
  /** True if the WebSocket connection will be re-opened automatically after its state changed to
   * CLOSED or ERROR or false if not. It can only be true, if this feature is enabled in the
   * settings. */
  isAutoReconnectOn: boolean;
  /** Timestamp in milliseconds when the next automatic re-opening of the WebSocket connection
   * starts. */
  nextAutoReconnect: number;
  /** An array of log entries occured in this slice. */
  logs: LogEntry[];
}


/** State of the Redux slice "webSockets" of VtWebGuiFramework. */
export interface WebSocketsState {
  /** Object with the data objects of all WebSocket connections. The key is the ID of the WebSocket
   * connection. */
  byId: Record<WebSocketId, WebSocketConnection>;
  /** The IDs of all WebSocket connections. */
  allIds: WebSocketId[];
}
