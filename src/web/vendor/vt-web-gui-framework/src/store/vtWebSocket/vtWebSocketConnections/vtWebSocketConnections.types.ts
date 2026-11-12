import { type WebSocketId, type WebSocketStatus } from 'interfaces/webSocketItf';
import type { LogEntry } from 'store/store.types';


export type SimpleTypes = string | number | boolean | null;


export type NestedDataArray = (SimpleTypes | NestedDataArray | NestedDataObject)[];


export interface NestedDataObject {
  [k: string]: SimpleTypes | NestedDataObject | NestedDataArray;
}


/** Any value the JSON data types of the VtWebSocket API allow, and nothing beyond them: a value of
 * this type survives JSON.stringify() and passes the serializability check of the store. */
export type NestedData = SimpleTypes | NestedDataArray | NestedDataObject;


export interface VtWebSocketServerInfo {
  /** The name of the VtWebSocket server. */
  name: string;
  /** The major version number of the server as string. */
  major: string;
  /** The minor version number of the server as string. */
  minor: string;
  /** The complete version number of the server as string. */
  version: string;
}


export interface VtWebSocketAuth {
  /** True, if any kind of authentication is used by the connected VtWebSocket server. */
  isEnabled: boolean;
  /** True if an authentication process is running of false if not. */
  isAuthenticating: boolean;
  /** True if the authentication was successful or false if not. If authentication is not enabled,
   * this field is null. */
  isAuthenticated: boolean | null;
  /** If isAuthenticated is true, this is the name of the user that is logged in. Otherwise it is
   * null. */
  username: string | null;
  /** If isAuthenticated is true, this is the role of the user that is logged in. Otherwise it is
   * null. */
  role: string | null;
  /**  This array includes key words of the views or options, the user that is logged in has access
   * to. */
  views: string[] | null;
  /** Optionally the session ID of a successful authentication. */
  sessionId: string | null;
}


export interface VtWebSocketConnection {
  /** The status of the WebSocket connection. */
  connectionStatus: WebSocketStatus;
  /** API information about the VtWebSocket server. */
  serverInfo: VtWebSocketServerInfo | null;
  /** Project specific API information about the connected system. */
  systemInfo: Record<string, unknown>;
  /** Object with informations about the authentication of the connection to the server. */
  auth: VtWebSocketAuth;
  /** An array of log entries occured in this slice. */
  logs: LogEntry[];
}


export interface VtWebSocketConnectionsState {
  /** Object with the data objects of all WebSocket connections to VtWebSocket servers, using the
   * protocol of VtWebSocketSpec. The key is the ID of the WebSocket connection. */
  byId: Record<WebSocketId, VtWebSocketConnection>;
}
