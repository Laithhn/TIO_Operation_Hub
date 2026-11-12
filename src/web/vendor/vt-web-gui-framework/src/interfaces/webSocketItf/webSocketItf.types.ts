/** The type of the WebSocket server. At the moment it can either be a server with an unspecified,
 * own protocoll or it can be a VtWebSocket server ("vtWebSocket"). */
export type WebSocketServer = 'notSpecified' | 'vtWebSocket';


export type WebSocketId = string;


/** Enumeration of the WebSocket connection status. */
export enum WebSocketStatus {
  /** The WebSocket connection is not yet open. */
  connecting = 'connecting',
  /** The WebSocket connection is open and ready to communicate. */
  open = 'open',
  /** The WebSocket connection is in the process of closing. */
  closing = 'closing',
  /** The WebSocket connection is closed. */
  closed = 'closed',
  /** The WebSocket connection could not be opened. */
  error = 'error',
}


export interface WebSocketMetadata {
  /** The internal ID of the WebSocket connection. */
  webSocket: WebSocketId;
  /** The URL for the WebSocket connection to the server. */
  url?: string;
  /** The API specification of the WebSocket server. */
  server?: WebSocketServer;
  /** True, to automatically use the authentication of the server (server specific). */
  useAuth?: boolean;
  /** True, if the WebSocket connection has to be opened automatically. */
  autoOpen?: boolean;
  /** Delay time in milliseconds to automatically re-open the WebSocket connection after its status
   * changed to CLOSED or ERROR. Each further attempt waits twice as long, up to a minute or this
   * delay if it is longer, and an opened connection starts again from it. A delay of 0 re-opens
   * at once the first time. Set to false to deactivate this feature. */
  autoReconnect?: number | false;
}


export enum WebSocketListener {
  onStatusChanged = 'onStatusChanged',
  onSend = 'onSend',
  onMessage = 'onMessage',
  onError = 'onError',
}


export interface Listener {
  [WebSocketListener.onStatusChanged]: ({ status, nextAutoReconnect }: { status: WebSocketStatus; nextAutoReconnect: number }, meta: WebSocketMetadata) => void;
  [WebSocketListener.onSend]: (data: unknown, meta: WebSocketMetadata) => void;
  [WebSocketListener.onMessage]: (data: unknown, meta: WebSocketMetadata) => void;
  [WebSocketListener.onError]: ({ timestamp, title, text }: { timestamp?: number; title?: string; text: string }, meta: WebSocketMetadata) => void;
}
