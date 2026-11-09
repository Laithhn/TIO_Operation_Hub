import { type WebSocketId } from 'interfaces/webSocketItf';
import { isNonEmptyString } from 'utils/type';


/**
 * Helper function for the reducers to check a given WebSocket ID and the source or sources. If the
 * WebSocket ID is invalid, true is returned, if the given sources are invalid, an error string is
 * returned. If both are valid, false is returned.
 */
export const checkWebSocketIdAndSources = (webSocket: WebSocketId, sources: string | string[], sourcesCanBeAnArray = false): boolean | string => {
  if (!isNonEmptyString(webSocket)) {
    return true;
  }

  if (!sourcesCanBeAnArray && !isNonEmptyString(sources)) {
    return 'The name of the source that was passed is not a valid string.';
  }

  if (sourcesCanBeAnArray && !isNonEmptyString(sources)) {
    if (!Array.isArray(sources) || (sources.length === 0)) {
      return 'The sources that were passed are neither a valid string nor a non-empty array.';
    }

    if (sources.some((source) => !isNonEmptyString(source))) {
      return 'At least one of the sources that were passed is not a valid string.';
    }
  }

  return false;
};
