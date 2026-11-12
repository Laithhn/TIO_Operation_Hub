import type { WebSocketId } from 'interfaces/webSocketItf';
import { isNonEmptyString } from 'utils/type';


/**
 * Helper function for the reducers to check a given WebSocket ID and database name. If the
 * WebSocket ID is invalid, true is returned, if the database name is invalid, an error string is
 * returned. If both are valid, false is returned.
 */
export const checkWebSocketIdAndDatabase = (webSocket: WebSocketId, database: string): boolean | string => {
  if (!isNonEmptyString(webSocket)) {
    return true;
  }
  if (!isNonEmptyString(database)) {
    return 'The name of the database that was passed is not a valid string.';
  }

  return false;
};
