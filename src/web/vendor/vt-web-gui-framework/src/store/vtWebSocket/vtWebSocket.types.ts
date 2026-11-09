/** Enumeration for the total status of a WebSocket connection to a VtWebSocket server inclusive
 * authentication. */
export enum VtWebSocketServerStatus {
  /** The WebSocket connection is not defined, neither in the configuration nor by opening with an
   * action creator. */
  undefined = 'undefined',
  /** The WebSocket connection is defined but not yet established. Information about the VtWebSocket
   * server has not been received before. */
  notConnected = 'notConnected',
  /** The WebSocket connection is established but no information about the VtWebSocket server have
   * been received yet. */
  connected = 'connected',
  /** The WebSocket connection is established. Information about the VtWebSocket server has been
   * received but the verification of this information failed. */
  invalid = 'invalid',
  /** A authentication is used for this WebSocket connection but the user is not authenticated at
   * the moment. */
  notAuthenticated = 'notAuthenticated',
  /** The WebSocket connection was already established and information about the VtWebSocket server
   * were received. But after that the connection is lost. */
  interrupted = 'interrupted',
  /** The WebSocket connection is established. The message with the information about the
   * VtWebSocket server are received valid. Authentication (if used) is successfully done. */
  ready = 'ready',
}


export enum Log4CxxLevel {
  /** Log an info message (default). */
  info = 'info',
  /** Log a warning message. */
  warn = 'warn',
  /** Log an error message. */
  error = 'error',
  /** Log a fatal error message. */
  fatal = 'fatal',
  /** Log a debug message. */
  debug = 'debug',
  /** Log a trace message. */
  trace = 'trace',
}
