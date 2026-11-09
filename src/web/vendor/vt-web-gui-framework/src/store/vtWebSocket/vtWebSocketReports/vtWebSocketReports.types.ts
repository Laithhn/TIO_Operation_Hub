export interface VtWebSocketRequestData {
  set?: string;
  query?: string;
  update?: string;
  push?: boolean;
  [key: string]: unknown;
}


export interface VtWebSocketResponseData {
  info?: string;
  update?: string;
  [key: string]: unknown;
}


export interface VtWebSocketSource {
  /** The name of the VtWebSocket source handler, guessed from the shape of the messages this
   * source exchanges, or "?" as long as no message allowed a guess. When the messages of one
   * source look like two different handlers, both names stand here, separated by " | ". */
  sourceHandler: string;
  /** True if pushing is activated for this source or false if not. */
  isPushing: boolean;
  /** Object with the number of requests of this source. */
  numRequests: {
    set: number;
    query: number;
    update: number;
  };
  /** Object with the number of responses of this source. */
  numResponses: {
    info: number;
    update: number;
  };
  /** The UNIX timestamp in ms of the last query of this source or null if the source was not yet
   * queried. */
  lastQuery: number | null;
  /** The time difference in ms between the first response (info message) of this source after its
   * last query. It is null, if the source was not yet queried. */
  responseTimeMs: number | null;
}


export interface VtWebSocketReportsState {
  /** Object with the data objects of all WebSocket connections to VtWebSocket servers. The key is
   * the ID of the WebSocket connection. */
  byId: Record<string, {
    /** Object with the data objects of all VtWebSocket sources of the WebSocket connection to a
     * VtWebSocket server. The key is the name of the source. */
    bySource: Record<string, VtWebSocketSource>;
    /** The names of all VtWebSocket sources to a WebSocket connection to a VtWebSocket server. */
    allSources: string[];
  }>;
}
