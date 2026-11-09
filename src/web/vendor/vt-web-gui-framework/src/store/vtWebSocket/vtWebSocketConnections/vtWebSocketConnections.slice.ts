import {
  createAction, createSelector, createSlice, type PayloadAction, type WithSlice,
} from '@reduxjs/toolkit';

import { systemSettings } from 'assets/defines';
import { StorageItf, StorageType } from 'interfaces/storageItf';
import {
  type WebSocketId, WebSocketListener, type WebSocketMetadata, webSocketsApi, WebSocketStatus,
} from 'interfaces/webSocketItf';
import { startInitialListener, startListening } from 'store/listenerMiddleware';
import { pushLogEntry } from 'store/pushLogEntry';
import { rootReducer } from 'store/rootReducer';
import type { LogEntry, RootDispatch, RootState } from 'store/store.types';
import { webSocketsSlice } from 'store/webSockets';
import { getType, isNonEmptyString, isNumber } from 'utils/type';

import { Log4CxxLevel, VtWebSocketServerStatus } from '../vtWebSocket.types';
import { vtWebSocketReportsSlice } from '../vtWebSocketReports';

import { checkWebSocketIdAndSources } from './utils/checkWebSocketIdAndSources';
import type {
  NestedData, NestedDataArray, SimpleTypes, VtWebSocketAuth, VtWebSocketConnection,
  VtWebSocketConnectionsState, VtWebSocketServerInfo,
} from './vtWebSocketConnections.types';


const initialState: VtWebSocketConnectionsState = {
  byId: {},
};

// The session IDs of the connections to VtWebSocket servers, held in step with the storage below:
// filled from it at startup and rewritten with every answer of an AUTH source. It is read where an
// authentication is sent and not where a connection is created, because the storage answers
// asynchronously and a connection can exist before it has answered.
let webSocketSessionIds: Record<WebSocketId, string> = {};

// Always create a storage connection to store the VtWebSocket session IDs (e.g. used for
// authentication).
const storage = new StorageItf<typeof webSocketSessionIds>(systemSettings.storage.reservedKeys['webSocketSessionIds']!, {
  hasSubValues: true,
  storageType: StorageType.local,
});

void storage.init(webSocketSessionIds).then((storedSessionIds) => {
  webSocketSessionIds = storedSessionIds;
});


/** The name this slice carries in its log entries. It is also its reducer path, so that an entry
 * names a part of the store that exists. */
const sliceName = 'vtWebSocketConnections';


/**
 * Internal helper to append an entry to the log of a connection to a VtWebSocket server. It does
 * nothing if the connection is unknown to this slice.
 */
const pushLog = (state: VtWebSocketConnectionsState, webSocket: WebSocketId, level: LogEntry['level'], title: string, text: string) => {
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


/**
 * Redux Toolkit slice that handles the partial state of WebSocket connections to VtWebSocket
 * servers, using the protocol of VtWebSocketSpec. Note that the reducer of this slice isn't
 * exported below, but is injected into the root reducer as soon as this slice is used.
 */
const slice = createSlice({
  name: 'VIWGF/vtWebSocketConnections',
  reducerPath: sliceName,
  initialState,

  reducers: {
    /**
     * Reducer to set the new status of a connection to a VtWebSocket server, taken over from the
     * slice of the WebSocket connections by the middleware of this slice.
     */
    receiveConnectionStatus: {
      prepare: (webSocket: WebSocketId, connectionStatus: WebSocketStatus, { useAuth }: { useAuth?: boolean } = {}) => ({
        payload: {
          connectionStatus,
          useAuth: !!useAuth,
        },
        meta: { webSocket },
      }),
      reducer: (state, { payload: { connectionStatus, useAuth }, meta: { webSocket } }: PayloadAction<Pick<VtWebSocketConnection, 'connectionStatus'> & { useAuth: boolean }, string, WebSocketMetadata>) => {
        if (state.byId[webSocket]) {
          state.byId[webSocket].connectionStatus = connectionStatus;
        } else {
          state.byId[webSocket] = {
            connectionStatus,
            serverInfo: null,
            systemInfo: {},
            auth: {
              isEnabled: useAuth,
              isAuthenticating: false,
              isAuthenticated: null,
              username: null,
              role: null,
              views: null,
              sessionId: null,
            },
            logs: [],
          };
        }
      },
    },


    /**
     * Reducer to set the server and system information of the API handler of a VtWebSocket server,
     * received from the WebSocketItf API by the middleware of this slice.
     */
    receiveApiInfo: {
      prepare: (webSocket: WebSocketId, msg: {
        major?: number | string; minor?: number | string; server?: string; system?: Record<string, unknown>;
      } = {}) => ({
        payload: {
          systemInfo: (getType(msg.system) === 'object') ? msg.system! : {},
          name: (typeof msg.server === 'string') ? msg.server : '',
          major: String(msg.major ?? ''),
          minor: String(msg.minor ?? ''),
        },
        meta: { webSocket },
      }),
      reducer: (state, { payload: {
        systemInfo, name, major, minor,
      }, meta: { webSocket } }: PayloadAction<Pick<VtWebSocketConnection, 'systemInfo'> & Pick<VtWebSocketServerInfo, 'name' | 'major' | 'minor'>, string, WebSocketMetadata>) => {
        if (state.byId[webSocket]) {
          let version;

          if (major && minor) {
            version = `${major}.${minor}`;
          } else if (major) {
            version = major;
          } else {
            version = '';
          }

          state.byId[webSocket].serverInfo = {
            name,
            major,
            minor,
            version,
          };
          state.byId[webSocket].systemInfo = systemInfo;
        }
      },
    },


    /**
     * Reducer to start the authentication if enabled. It can be used to send a special query to
     * the AUTH handler of a VtWebSocket server to authenticate or to ask for authentication, if
     * authentication is enabled.
     */
    sendQueryAuthentication: {
      prepare: (
        /** The ID of the WebSocket connection. */
        webSocket: WebSocketId,
        {
          /** Optionally the username, to authenticate with username / password. To log out, set to
           * an empty string. */
          username,
          /** Optionally the password, to authenticate with username / password. To log out, set to
           * an empty string. */
          password,
        }: { username?: string; password?: string } = {},
      ) => ({
        payload: { username, password },
        meta: { webSocket },
        error: !isNonEmptyString(webSocket),
      }),
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{ username: string | undefined; password: string | undefined }, string, WebSocketMetadata, boolean | string>) => {
        if (!error && state.byId[webSocket]?.auth.isEnabled) {
          state.byId[webSocket].auth.isAuthenticating = true;
        }
      },
    },


    /**
     * Reducer to receive the authentication data from a VtWebSocket server, received from the
     * WebSocketItf API by the middleware of this slice.
     */
    receiveAuthenticationInfo: {
      prepare: (webSocket: WebSocketId, msg: {
        access_valid?: boolean | number | string; who?: string; role?: string; views?: string[]; session_key?: string;
      } = {}) => {
        const isAuthenticated = !!(msg.access_valid ?? false);
        // The state promises an array of strings, so anything else the server sends is dropped.
        const views = Array.isArray(msg.views) ? msg.views.filter((view) => isNonEmptyString(view)) : [];

        return {
          payload: {
            isAuthenticated,
            username: isAuthenticated ? (msg.who ?? '') : null,
            role: isAuthenticated ? (msg.role ?? '') : null,
            views: isAuthenticated ? views : null,
            sessionId: isAuthenticated ? (msg.session_key ?? '') : null,
          },
          meta: { webSocket },
        };
      },
      reducer: (state, { payload: {
        isAuthenticated, username, role, views, sessionId,
      }, meta: { webSocket } }: PayloadAction<Pick<VtWebSocketAuth, 'isAuthenticated' | 'username' | 'role' | 'views' | 'sessionId'>, string, WebSocketMetadata>) => {
        if (state.byId[webSocket]) {
          if (state.byId[webSocket].auth.isEnabled) {
            state.byId[webSocket].auth.isAuthenticating = false;
            state.byId[webSocket].auth.isAuthenticated = isAuthenticated;
            state.byId[webSocket].auth.username = username;
            state.byId[webSocket].auth.role = role;
            state.byId[webSocket].auth.views = views;
            state.byId[webSocket].auth.sessionId = sessionId;
          } else {
            pushLog(state, webSocket, 'warning', 'Erroneous authentication information received', 'Information about the VtWebSocketEngine authentication is received, but authentication is disabled for this connection.');
          }
        }
      },
    },


    /**
     * Reducer to send persistent settings to the given source(s) of a VtWebSocket server.
     */
    sendSet: {
      prepare: (webSocket: WebSocketId, sources: string | string[] = '*', {
        /** Optionally a language code to set. */
        lang,
        /** Optionally set to true or false to activate or deactivate the cache, or set to "reset"
         * to reset it (DBSourceHandler only), or set to "full" to do anything I have forgotten
         * (DBSourceHandler only). */
        cache,
        /** Optionally set to true to enable the data pushing of the source. Supported by the
         * DBSourceHandler, the ViIOSourceHandler and the source "AUTH"; sources of the
         * RESTClientSourceHandler use longPolling instead. */
        push,
        /** Optionally set to true to enable the data pushing for sources of
         * RESTClientSourceHandler. */
        longPolling,
      }: {
        lang?: string; cache?: boolean | 'reset' | 'full'; push?: boolean; longPolling?: boolean;
      } = {}) => ({
        payload: {
          sources: Array.isArray(sources) ? sources : [sources],
          lang,
          cache,
          push,
          longPolling,
        },
        meta: { webSocket },
        error: checkWebSocketIdAndSources(webSocket, sources, true),
      }),
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{
        sources: string | string[]; lang: string | undefined; cache: boolean | 'reset' | 'full' | undefined; push: boolean | undefined; longPolling: boolean | undefined;
      }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending a common "set" message failed', error);
        }
      },
    },


    /**
     * Reducer to send common querys to the given source(s) of a VtWebSocket server.
     */
    sendQuery: {
      prepare: (webSocket: WebSocketId, sources: string | string[]) => ({
        payload: {
          sources: Array.isArray(sources) ? sources : [sources],
        },
        meta: { webSocket },
        error: checkWebSocketIdAndSources(webSocket, sources, true),
      }),
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{ sources: string | string[] }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending a common "query" message failed', error);
        }
      },
    },


    /**
     * Reducer to update a given source of a VtWebSocket server.
     */
    sendUpdate: {
      prepare: (webSocket: WebSocketId, source: string, {
        /** Optionally an array of data to add. */
        add,
        /** Optionally an array of new data to edit. */
        edit,
        /** Optionally an array of data or IDs to delete. */
        del,
      }: { add?: NestedDataArray; edit?: NestedDataArray; del?: string[] } = {}) => {
        let error = checkWebSocketIdAndSources(webSocket, source);

        if (
          !error
          && (!Array.isArray(del) || (del.length === 0))
          && (!Array.isArray(add) || (add.length === 0))
          && (!Array.isArray(edit) || (edit.length === 0))
        ) {
          error = `A update message to source "${source}" can not be sent, because there are no valid data "del", "add" or "edit".`;
        }

        return {
          payload: {
            source, add, edit, del,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{
        source: string; add: NestedDataArray | undefined; edit: NestedDataArray | undefined; del: string[] | undefined;
      }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending a common "update" message failed', error);
        }
      },
    },


    /**
     * Reducer to update a given source of a VtWebSocket server with common data.
     */
    sendUpdateData: {
      prepare: (webSocket: WebSocketId, source: string, data: NestedData) => {
        let error = checkWebSocketIdAndSources(webSocket, source);

        if (
          !error
          && !['string', 'number', 'boolean', 'null', 'array', 'object'].includes(getType(data))
        ) {
          error = `A update message to source "${source}" can not be sent, because there are no valid data.`;
        }

        return {
          payload: { source, data },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{ source: string; data: NestedData | undefined }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending a data "update" message failed', error);
        }
      },
    },


    /**
     * Reducer to send a query to a given source of the RESTClientSourceHandler of a VtWebSocket
     * server with URL parameters and POST data for HTTP REST requests.
     */
    sendQueryRest: {
      prepare: (webSocket: WebSocketId, source: string, {
        /** Optionally an array with the values of the URL parameter placeholders. */
        urlParams,
        /** Optionally POST data of any JSON data type, not just an object. */
        postData,
      }: { urlParams?: SimpleTypes[]; postData?: NestedData } = {}) => {
        let error = checkWebSocketIdAndSources(webSocket, source);

        if (
          !error
          && (postData !== undefined)
          && !['string', 'number', 'boolean', 'null', 'array', 'object'].includes(getType(postData))
        ) {
          error = `A query message to source "${source}" can not be sent, because the POST data are no valid JSON data.`;
        }

        return {
          payload: { source, urlParams, postData },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{ source: string; urlParams: SimpleTypes[] | undefined; postData: NestedData | undefined }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending a "query" message to RESTClientSourceHandler failed', error);
        }
      },
    },


    /**
     * Reducer to send persistent image parameters to the given source of a ImageSourceHandler of a
     * VtWebSocket server.
     */
    sendSetImageParams: {
      prepare: (webSocket: WebSocketId, source: string, {
        /** Optionally the file format of the image. If not set, "jpg" is used. */
        format,
        /** Optionally the required quality of the image from 0 to 100. Default: 100. */
        quality,
        /** Optionally the required scale of the image from 0.0 to 1.0. This is only used, if width or
         * height is not set! */
        scale,
        /** Optionally the required width of the image in pixels. */
        width,
        /** Optionally the required height of the image in pixels. */
        height,
      }: {
        format?: 'jpg' | 'jpeg' | 'png' | 'bmp'; quality?: number; scale?: number; width?: number; height?: number;
      } = {}) => ({
        payload: {
          source, format, quality, scale, width, height,
        },
        meta: { webSocket },
        error: checkWebSocketIdAndSources(webSocket, source),
      }),
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{
        source: string; format: 'jpg' | 'jpeg' | 'png' | 'bmp' | undefined; quality: number | undefined; scale: number | undefined; width: number | undefined; height: number | undefined;
      }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending a "set" message to ImageSourceHandler failed', error);
        }
      },
    },


    /**
     * Reducer to send a query to get an image from the ImageSourceHandler of a VtWebSocket server
     * with optional parameters. The parameters are taken instead of those previously set with
     * sendSetImageParams.
     */
    sendQueryImage: {
      prepare: (webSocket: WebSocketId, source: string, path: string, {
        /** Optionally the file format of the image. If not set, "jpg" is used. */
        format,
        /** Optionally the required quality of the image from 0 to 100. Default: 100. */
        quality,
        /** Optionally the required scale of the image from 0.0 to 1.0. This is only used, if width or
         * height is not set! */
        scale,
        /** Optionally the required width of the image in pixels. */
        width,
        /** Optionally the required height of the image in pixels. */
        height,
      }: {
        format?: 'jpg' | 'jpeg' | 'png' | 'bmp'; quality?: number; scale?: number; width?: number; height?: number;
      } = {}) => {
        let error = checkWebSocketIdAndSources(webSocket, source);

        if (!error && !isNonEmptyString(path)) {
          error = `No path is given to query data from source "${source}".`;
        }

        return {
          payload: {
            source, path, format, quality, scale, width, height,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{
        source: string; path: string; format: 'jpg' | 'jpeg' | 'png' | 'bmp' | undefined; quality: number | undefined; scale: number | undefined; width: number | undefined; height: number | undefined;
      }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending an "query" message to ImageSourceHandler failed', error);
        }
      },
    },


    /**
     * Reducer to update a source of the ViIOSourceHandler of a VtWebSocket server.
     */
    sendUpdateViIO: {
      prepare: (webSocket: WebSocketId, source: string, data: (string | number | boolean)[] = []) => {
        let error = checkWebSocketIdAndSources(webSocket, source);

        if (
          !error
          && (!Array.isArray(data) || (data.length === 0))
        ) {
          error = `The given data to update source "${source}" is not a valid array.`;
        }

        return {
          payload: { source, data },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{ source: string; data: (string | number | boolean)[] }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending an "update" message to ViIOSourceHandler failed', error);
        }
      },
    },


    /**
     * Reducer to update the values of one or several addresses of a source of the SNMPSourceHandler
     * of a VtWebSocket server.
     */
    sendUpdateSNMP: {
      prepare: (webSocket: WebSocketId, source: string, data: Record<string, string | number | boolean | (string | number | boolean)[]> = {}) => {
        let error = checkWebSocketIdAndSources(webSocket, source);

        if (!error && (getType(data) !== 'object')) {
          error = `The given data to update source "${source}" is not a valid object.`;
        }

        return {
          payload: { source, data },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{ source: string; data: Record<string, string | number | boolean | (string | number | boolean)[]> }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending an "update" message to SNMPSourceHandler failed', error);
        }
      },
    },


    /**
     * Reducer to update the log file of the Log4CxxHandler of a VtWebSocket server with a new
     * entry.
     */
    sendUpdateLog4Cxx: {
      prepare: (webSocket: WebSocketId, {
        /** The log level as key of enum VtwseLog4CxxLevel. Default: INFO */
        level,
        /** The message to log. */
        data,
      }: { level?: Log4CxxLevel; data: string }) => {
        let error: boolean | string = !isNonEmptyString(webSocket);

        if (!error && (!level || !(level in Log4CxxLevel))) {
          error = 'No valid level is given to send a log entry to source "log4Cxx".';
        }

        if (!error && !isNonEmptyString(data)) {
          error = 'No valid message is given to send a log entry to source "log4Cxx".';
        }

        return {
          payload: {
            source: 'log4Cxx',
            level: level ?? Log4CxxLevel.info,
            data,
          },
          meta: { webSocket },
          error,
        };
      },
      reducer: (state, { meta: { webSocket }, error }: PayloadAction<{ source: string; level: Log4CxxLevel; data: string }, string, WebSocketMetadata, boolean | string>) => {
        if ((error === true) || !state.byId[webSocket]) {
          return;
        }

        if (error !== false) {
          pushLog(state, webSocket, 'error', 'Sending an "update" message to Log4CxxHandler failed', error);
        }
      },
    },


    /**
     * Reducer to receive a message from a VtWebSocket server that carries a command this client
     * does not know, received from the WebSocket API by the middleware of this slice. Such a
     * message is ignored on purpose, because that is what keeps the API extendable, so it is only
     * logged - and at the lowest level this framework offers.
     */
    receiveUnknownMessage: {
      prepare: (webSocket: WebSocketId, message: LogEntry['text']) => ({
        payload: message,
        meta: { webSocket },
      }),
      reducer: (state, { payload, meta: { webSocket } }: PayloadAction<LogEntry['text'], string, WebSocketMetadata>) => {
        if (state.byId[webSocket]) {
          pushLog(state, webSocket, 'info', 'Unknown message received', payload);
        }
      },
    },


    /**
     * Reducer to receive an invalid message from a VtWebSocket server, received from the WebSocket
     * API by the middleware of this slice. Note that a message with an unknown command is not
     * invalid but expected: it is handled by reducer receiveUnknownMessage.
     */
    receiveInvalidMessage: {
      prepare: (webSocket: WebSocketId, message: LogEntry['text']) => ({
        payload: message,
        meta: { webSocket },
      }),
      reducer: (state, { payload, meta: { webSocket } }: PayloadAction<LogEntry['text'], string, WebSocketMetadata>) => {
        if (state.byId[webSocket]) {
          pushLog(state, webSocket, 'warning', 'Invalid message received', payload);
        }
      },
    },
  },


  selectors: {
    /**
     * Selector to get the total state of the connection to a VtWebSocket server, inclusive the
     * possibility of verifying the system info of the API message by a verifier function and in
     * consideration of user authentication, if used.
     */
    selectServerStatus: (state: VtWebSocketConnectionsState, webSocket: WebSocketId, systemInfoVerifier?: (systemInfo?: VtWebSocketConnection['systemInfo']) => boolean) => {
      const connectionStatus = state.byId[webSocket]?.connectionStatus;

      if (!connectionStatus) {
        // The connection is not defined, neither in the configuration nor by opening with an action
        // creator.
        return VtWebSocketServerStatus.undefined;
      }

      const isApiReceived = isNonEmptyString(state.byId[webSocket]?.serverInfo?.name);

      if (connectionStatus !== WebSocketStatus.open) {
        if (!isApiReceived) {
          // The connection is not established and the API message has not been received before.
          return VtWebSocketServerStatus.notConnected;
        }

        // The connection was already established and the API message was received. After that the
        // connection is lost.
        return VtWebSocketServerStatus.interrupted;
      }

      if (!isApiReceived) {
        // The connection is established but the API message has not been received yet.
        return VtWebSocketServerStatus.connected;
      }

      if (
        (typeof systemInfoVerifier === 'function')
        && !systemInfoVerifier(state.byId[webSocket]?.systemInfo)
      ) {
        // Only if a verifier function is given: the connection is established, the API message has
        // been received but the verification of the system info of this API failed.
        return VtWebSocketServerStatus.invalid;
      }

      if (state.byId[webSocket]?.auth.isEnabled && !state.byId[webSocket].auth.isAuthenticated) {
        // If the VtWebSocket AUTH handler has to be used for this connection but the user is
        // not authenticated at the moment.
        return VtWebSocketServerStatus.notAuthenticated;
      }

      // The connection is established, the message from the API handler is received and valid and
      // authentication (if used) is successfully done.
      return VtWebSocketServerStatus.ready;
    },


    /**
     * Selector to get the information of the VtWebSocket server behind a WebSocket connection. If
     * there is no VtWebSocket server defined for the given WebSocket connection or if there are no
     * API information available yet, null is returned. Note that the server info is not reset if
     * the WebSocket connection is lost!
     */
    selectServerInfo: (state: VtWebSocketConnectionsState, webSocket: WebSocketId) => state.byId[webSocket]?.serverInfo ?? null,


    /**
     * Selector to return the object with the information of the connected system. If there is no
     * VtWebSocket server defined for the given WebSocket connection or if there are no system
     * information available yet, null is returned. Note that the system information is not reset if
     * the WebSocket connection is lost!
     */
    selectSystemInfo: (state: VtWebSocketConnectionsState, webSocket: WebSocketId) => state.byId[webSocket]?.systemInfo ?? null,


    /**
     * Selector to return the authentication status of the connection to a VtWebSocket server: true
     * when a user is successfully logged in or false if not. If no authentication information was
     * received yet, this flag is undefined.
     */
    selectIsAuthenticated: (state: VtWebSocketConnectionsState, webSocket: WebSocketId) => state.byId[webSocket]?.auth.isAuthenticated,


    /**
     * Selector to return true, if the authentication (log in, log out) of the connection to a
     * VtWebSocket server is in progress or false if not.
     */
    selectIsAuthenticating: (state: VtWebSocketConnectionsState, webSocket: WebSocketId) => !!state.byId[webSocket]?.auth.isAuthenticating,


    /**
     * Selector to return the name of the user that is currently logged in to the connection of the
     * VtWebSocket server. If no user is logged in, null is returned.
     */
    selectUsername: (state: VtWebSocketConnectionsState, webSocket: WebSocketId) => state.byId[webSocket]?.auth.username ?? null,


    /**
     * Selector to return the role of the user that is currently logged in to the connection of the
     * VtWebSocket server. If no user is logged in, null is returned.
     */
    selectUserRole: (state: VtWebSocketConnectionsState, webSocket: WebSocketId) => state.byId[webSocket]?.auth.role ?? null,


    /**
     * Selector that returns a memoized array with the key words of the views and options the user
     * can reach. It merges two sources on purpose: the array "views" of the system info, which the
     * server offers independently of any user and which arrives before a login, and the views of
     * the AUTH handler, which a successful login adds to them. The system info is project specific
     * and its key "views" is a convention rather than a part of VtWebSocketSpec, so whatever is not
     * an array of strings is dropped here.
     */
    selectViews: createSelector(
      (state: VtWebSocketConnectionsState, webSocket: WebSocketId) => state.byId[webSocket]?.systemInfo['views'],
      (state: VtWebSocketConnectionsState, webSocket: WebSocketId) => state.byId[webSocket]?.auth.views,
      (systemViews, authViews) => [...new Set([
        ...(Array.isArray(systemViews) ? systemViews.filter((view) => isNonEmptyString(view)) : []),
        ...(authViews ?? []),
      ])],
    ),


    /**
     * Selector to get an array with the log entries of the VtWebSocket connections slice, selected
     * by the given WebSocket ID. If the ID is invalid or is not yet set, null is returned.
     */
    selectLogs: (state: VtWebSocketConnectionsState, webSocket: WebSocketId) => state.byId[webSocket]?.logs ?? null,
  },
});


/**
 * Action creator to broadcast an info message from a VtWebSocket server received from the
 * WebSocketItf API by the middleware of this slice..
 */
const receiveInfo = createAction(`${slice.name}/receiveVtwseInfo`, (webSocket: WebSocketId, source: string, msg: unknown) => ({
  payload: { source, msg },
  meta: { webSocket },
}));


/**
 * Action creator to broadcast an update message from a VtWebSocket server, received from the
 * WebSocketItf API by the middleware of this slice.
 */
const receiveUpdate = createAction(`${slice.name}/receiveVtwseUpdate`, (webSocket: WebSocketId, source: string, msg: unknown) => ({
  payload: { source, msg },
  meta: { webSocket },
}));


declare module 'store/store.types' {
  export interface LazyLoadedSlices extends WithSlice<typeof slice> {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

rootReducer.inject(slice);


/**
 * Listener for the WebSocket API to detect outgoing messages from WebSocket connections to
 * VtWebSocket servers.
 */
const webSocketApiListenerForSend = (dispatch: RootDispatch, data: unknown, { webSocket, server }: WebSocketMetadata) => {
  if ((server === 'vtWebSocket') && (getType(data) === 'object')) {
    dispatch(vtWebSocketReportsSlice.reportRequest(webSocket, data as ReturnType<typeof vtWebSocketReportsSlice.reportRequest>));
  }
};


/**
 * Listener for the WebSocket API to detect incoming messages from WebSocket connections to
 * VtWebSocket servers.
 */
const webSocketApiListenerForMessages = (dispatch: RootDispatch, data: unknown, { webSocket, server }: WebSocketMetadata) => {
  if (server === 'vtWebSocket') {
    if (getType(data) === 'object') {
      const msg = data as Record<string, unknown>;

      // -------------------------------------------------------------------------------------------
      if (isNonEmptyString(msg['info'])) { // do for incoming "INFO" messages...
      // -------------------------------------------------------------------------------------------

        if (msg['info'] === 'API') {
          // receive a valid info message from source "API"
          dispatch(slice.actions.receiveApiInfo(webSocket, msg));
        } else if (msg['info'] === 'AUTH') {
          // receive a valid info message from source "AUTH": keep the session ID of this connection
          // and the storage in step, so that a log out empties both instead of leaving the previous
          // ID behind
          const sessionId = isNonEmptyString(msg['session_key']) ? msg['session_key'] : '';

          webSocketSessionIds[webSocket] = sessionId;
          storage.writeValue(sessionId, webSocket);
          dispatch(slice.actions.receiveAuthenticationInfo(webSocket, msg));
        } else {
          // receive any other info message
          dispatch(receiveInfo(webSocket, msg['info'], msg));
        }

      // -------------------------------------------------------------------------------------------
      } else if (isNonEmptyString(msg['update'])) { // do for incoming "UPDATE" messages...
      // -------------------------------------------------------------------------------------------

        dispatch(receiveUpdate(webSocket, msg['update'], msg));

      // -------------------------------------------------------------------------------------------
      } else {
      // -------------------------------------------------------------------------------------------

        dispatch(slice.actions.receiveUnknownMessage(webSocket, `A message from a VtWebSocketEngine server is received with a command this client does not know (no field "info" nor "update"): ${JSON.stringify(msg)}`));
      }

      // Report every response from a VtWebSocket server to the reports slice.
      dispatch(vtWebSocketReportsSlice.reportResponse(webSocket, data as ReturnType<typeof vtWebSocketReportsSlice.reportResponse>));
    } else {
      dispatch(slice.actions.receiveInvalidMessage(webSocket, `A message from a VtWebSocketEngine server is received without valid data (the data is not an object, but of the type "${getType(data)}").`));
    }
  }
};


startInitialListener({
  effect: (_, listenerApi) => {
    webSocketsApi.addListener(WebSocketListener.onSend, webSocketApiListenerForSend.bind(null, listenerApi.dispatch));
    webSocketsApi.addListener(WebSocketListener.onMessage, webSocketApiListenerForMessages.bind(null, listenerApi.dispatch));

    // A connection that left the status CLOSED before this slice was loaded changed its status
    // unseen by the listener below. Take its current status over, so that a connection already
    // open still starts the communication with its VtWebSocket server.
    const state = listenerApi.getState();

    webSocketsSlice.selectAllSettings(state).forEach(({ id, server, useAuth }) => {
      const status = webSocketsSlice.selectStatus(state, id);

      if ((server === 'vtWebSocket') && (status !== null) && (status !== WebSocketStatus.closed)) {
        listenerApi.dispatch(slice.actions.receiveConnectionStatus(id, status, { useAuth }));
      }
    });
  },
});


/**
 * Redux listener that takes the status of every connection to a VtWebSocket server over from the
 * slice of the WebSocket connections, which creates and opens the connections and holds their
 * status. Following that slice makes this one load it, so that the connections of the
 * configuration are opened whenever this slice is used.
 */
startListening({
  actionCreator: webSocketsSlice.receiveStatus,
  effect: ({ payload: { status }, meta: { webSocket } }, listenerApi) => {
    const settings = webSocketsSlice.selectSettings(listenerApi.getState(), webSocket);

    if (settings?.server === 'vtWebSocket') {
      listenerApi.dispatch(slice.actions.receiveConnectionStatus(webSocket, status, { useAuth: settings.useAuth }));
    }
  },
});


/**
 * Redux listener for two actions of this slice, to detect successful openings of connections to
 * VtWebSocket servers. The further communication to query the API information and optionally to
 * start user authentication is automatically started here.
 */
startListening({
  predicate: (action) => (
    (
      (action.type === slice.actions.receiveConnectionStatus.type)
      || (action.type === slice.actions.receiveAuthenticationInfo.type)
    )
    && webSocketsApi.exists((action['meta'] as WebSocketMetadata).webSocket)
  ),
  effect: (action, listenerApi) => {
    const { webSocket } = action['meta'] as WebSocketMetadata;
    const state = listenerApi.getState().vtWebSocketConnections?.byId[webSocket];
    const prevState = listenerApi.getOriginalState().vtWebSocketConnections?.byId[webSocket];

    if (
      (action.type === slice.actions.receiveConnectionStatus.type)
      && (prevState?.connectionStatus !== WebSocketStatus.open)
      && (state?.connectionStatus === WebSocketStatus.open)
    ) {
      // If the state of any connection to a VtWebSocket server changed from anything to "open",
      // automatically send a data query to the VtWebSocket server source "API". If it is used,
      // also switch on the "AUTH" handler of the VtWebSocket server. Otherwise enable the server-
      // side cache for all sources.

      webSocketsApi.send(webSocket, { query: 'API' });

      if (state.auth.isEnabled) {
        // Read the session ID here and not where the connection was created: the storage answers
        // asynchronously and may still have been silent back then.
        const sessionId = state.auth.sessionId ?? webSocketSessionIds[webSocket] ?? '';

        webSocketsApi.send(webSocket, { set: 'AUTH', push: true });
        webSocketsApi.send(webSocket, {
          query: 'AUTH',
          ...(sessionId && { session_key: sessionId }), // eslint-disable-line camelcase
        });
      } else {
        webSocketsApi.send(webSocket, { set: '*', cache: true });
      }
    } else if (
      (action.type === slice.actions.receiveAuthenticationInfo.type)
      && !prevState?.auth.isAuthenticated
      && state?.auth.isAuthenticated
    ) {
      // If authentication is used by the "AUTH" handler of the VtWebSocket server and the user was
      // successful authenticated, enable the server-side cache for all sources.

      webSocketsApi.send(webSocket, { set: '*', cache: true });
    }
  },
});


/**
 * Redux listener for some actions of this slice to send different data to VtWebSocket servers.
 */
startListening({
  predicate: (action) => (
    action.type.startsWith(`${slice.name}/send`)
    && (action['error'] === false)
    && webSocketsApi.exists((action['meta'] as WebSocketMetadata).webSocket)
  ),
  effect: (action, listenerApi) => {
    switch (action.type) {
      // -------------------------------------------------------------------------------------------
      case slice.actions.sendQueryAuthentication.type: {
      // -------------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendQueryAuthentication>;
        const isUserPwdAuth = (
          (typeof payload.username === 'string')
          && (typeof payload.password === 'string')
        );
        const { sessionId } = listenerApi.getState().vtWebSocketConnections?.byId[webSocket]?.auth ?? {};
        const knownSessionId = sessionId ?? webSocketSessionIds[webSocket] ?? '';
        const isSessionId = !isUserPwdAuth && !!knownSessionId;

        webSocketsApi.send(webSocket, {
          query: 'AUTH',
          ...(isUserPwdAuth && { user: payload.username!, pwd: payload.password! }),
          ...(isSessionId && { session_key: knownSessionId }), // eslint-disable-line camelcase
        });
        break;
      }

      // -------------------------------------------------------------------------------------------
      case slice.actions.sendSet.type: {
      // -------------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendSet>;

        payload.sources.forEach((source) => {
          webSocketsApi.send(webSocket, {
            set: source,
            ...(isNonEmptyString(payload.lang) && { lang: payload.lang }),
            ...(((typeof payload.cache === 'boolean') || (payload.cache === 'reset') || (payload.cache === 'full')) && { cache: payload.cache }),
            ...((typeof payload.push === 'boolean') && { push: payload.push }),
            ...((typeof payload.longPolling === 'boolean') && { long_polling: payload.longPolling }), // eslint-disable-line camelcase
          });
        });
        break;
      }

      // -----------------------------------------------------------------------------------------
      case slice.actions.sendQuery.type: {
      // -----------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendQuery>;

        payload.sources.forEach((source) => {
          webSocketsApi.send(webSocket, { query: source });
        });
        break;
      }

      // -----------------------------------------------------------------------------------------
      case slice.actions.sendUpdate.type: {
      // -----------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendUpdate>;
        const isDel = Array.isArray(payload.del) && (payload.del.length > 0);
        const isAdd = Array.isArray(payload.add) && (payload.add.length > 0);
        const isEdit = Array.isArray(payload.edit) && (payload.edit.length > 0);

        webSocketsApi.send(webSocket, {
          update: payload.source,
          ...(isDel && { del: payload.del! }),
          ...(isAdd && { add: payload.add! }),
          ...(isEdit && { edit: payload.edit! }),
        });
        break;
      }

      // -----------------------------------------------------------------------------------------
      case slice.actions.sendUpdateData.type: {
      // -----------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendUpdateData>;

        webSocketsApi.send(webSocket, {
          update: payload.source,
          data: payload.data,
        });
        break;
      }

      // -----------------------------------------------------------------------------------------
      case slice.actions.sendQueryRest.type: {
      // -----------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendQueryRest>;

        webSocketsApi.send(webSocket, {
          query: payload.source,
          ...(Array.isArray(payload.urlParams) && (payload.urlParams.length > 0) && { url_params: payload.urlParams }), // eslint-disable-line camelcase
          ...((payload.postData !== undefined) && { post_data: payload.postData }), // eslint-disable-line camelcase
        });
        break;
      }

      // -----------------------------------------------------------------------------------------
      case slice.actions.sendSetImageParams.type: {
      // -----------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendSetImageParams>;
        const isWidth = isNumber(payload.width, { withoutInfinite: true });
        const isHeight = isNumber(payload.height, { withoutInfinite: true });

        webSocketsApi.send(webSocket, {
          set: payload.source,
          ...(['jpg', 'jpeg', 'png', 'bmp'].includes(payload.format ?? '') && { format: payload.format }),
          ...(isNumber(payload.quality, { withoutInfinite: true }) && { quality: Math.max(0, Math.min(100, payload.quality)) }),
          ...(isNumber(payload.scale, { withoutInfinite: true }) && !isWidth && !isHeight
            ? { scale: Math.max(0.0, Math.min(1.0, payload.scale)) }
            : {
              ...(isWidth && { width: Math.max(0, payload.width!) }),
              ...(isHeight && { height: Math.max(0, payload.height!) }),
            }),
        });
        break;
      }

      // -----------------------------------------------------------------------------------------
      case slice.actions.sendQueryImage.type: {
      // -----------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendQueryImage>;
        const isWidth = isNumber(payload.width, { withoutInfinite: true });
        const isHeight = isNumber(payload.height, { withoutInfinite: true });

        webSocketsApi.send(webSocket, {
          query: payload.source,
          path: payload.path,
          ...(['jpg', 'jpeg', 'png', 'bmp'].includes(payload.format ?? '') && { format: payload.format }),
          ...(isNumber(payload.quality, { withoutInfinite: true }) && { quality: Math.max(0, Math.min(100, payload.quality)) }),
          ...(isNumber(payload.scale, { withoutInfinite: true }) && !isWidth && !isHeight
            ? { scale: Math.max(0.0, Math.min(1.0, payload.scale)) }
            : {
              ...(isWidth && { width: Math.max(0, payload.width!) }),
              ...(isHeight && { height: Math.max(0, payload.height!) }),
            }),
        });
        break;
      }

      // -----------------------------------------------------------------------------------------
      case slice.actions.sendUpdateViIO.type: {
      // -----------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendUpdateViIO>;

        webSocketsApi.send(webSocket, { update: payload.source, data: payload.data });
        break;
      }

      // -----------------------------------------------------------------------------------------
      case slice.actions.sendUpdateSNMP.type: {
      // -----------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendUpdateSNMP>;

        webSocketsApi.send(webSocket, {
          update: payload.source,
          ...payload.data,
        });
        break;
      }

      // -----------------------------------------------------------------------------------------
      case slice.actions.sendUpdateLog4Cxx.type: {
      // -----------------------------------------------------------------------------------------

        const { payload, meta: { webSocket } } = action as ReturnType<typeof slice.actions.sendUpdateLog4Cxx>;

        webSocketsApi.send(webSocket, {
          update: payload.source,
          level: payload.level,
          data: payload.data,
        });
        break;
      }

      // no default
    }
  },
});


export const { name } = slice;

export const {
  receiveConnectionStatus, receiveApiInfo, sendQueryAuthentication, receiveAuthenticationInfo,
  sendSet, sendQuery, sendUpdate, sendUpdateData, sendQueryRest, sendSetImageParams, sendQueryImage,
  sendUpdateViIO, sendUpdateSNMP, sendUpdateLog4Cxx, receiveUnknownMessage, receiveInvalidMessage,
} = slice.actions;

export { receiveInfo, receiveUpdate };

export const {
  selectServerStatus, selectServerInfo, selectSystemInfo, selectIsAuthenticated,
  selectIsAuthenticating, selectUsername, selectUserRole, selectViews, selectLogs,
} = slice.getSelectors((rootState: RootState) => rootState[slice.reducerPath] ?? initialState);
