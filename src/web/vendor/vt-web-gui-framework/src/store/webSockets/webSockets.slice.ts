import {
  createAction, createSelector, createSlice, type PayloadAction, type WithSlice,
} from '@reduxjs/toolkit';

import {
  type WebSocketId, WebSocketListener, type WebSocketMetadata, webSocketsApi, type WebSocketServer,
  WebSocketStatus,
} from 'interfaces/webSocketItf';
import { enhancedReducerCreator } from 'store/enhancedReducerCreator';
import { startInitialListener, startListening } from 'store/listenerMiddleware';
import { pushLogEntry } from 'store/pushLogEntry';
import { rootReducer } from 'store/rootReducer';
import type { LogEntry, RootDispatch, RootState } from 'store/store.types';
import { isNonEmptyString, isNumber } from 'utils/type';

import { createInitialState } from './utils/createInitialState';
import type { WebSocketConnection, WebSocketsState } from './webSockets.types';


const initialState: WebSocketsState = {
  byId: {},
  allIds: [],
};


/**
 * Redux Toolkit slice that handles the partial state of WebSockets. Note that the reducer of this
 * slice isn't exported below, but is injected into the root reducer as soon as this slice is used.
 */
const slice = createSlice({
  name: 'VIWGF/webSockets',
  reducerPath: 'webSockets',
  initialState,

  reducers: {
    /**
     * Reducer that can be used to create a new WebSocket connection, if not yet done before. After
     * this, the connection will be (re-)opened (again) by the middleware of this slice, if the
     * state of the connection is CLOSED or ERROR.
     * Note, that WebSocket connections can also be defined in the configuration, to create and open
     * them automatically.
     *
     * @param webSocket - The mandatory internal ID of the WebSocket connection.
     * @param url - The URL for the WebSocket connection to the server. If not given, the WebSocket
     *   ID is taken as URL (so you can use this reducer with the URL as the only one argument).
     * @param server - Optionally the API specification of the WebSocket server.
     * @param useAuth - Optionally set to true to automatically use the authentication of the server
     *   (server specific).
     * @param autoReconnect - Optionally the delay time in seconds to automatically re-open the
     *   WebSocket connection after its status changed to CLOSED or ERROR. Each further attempt
     *   waits twice as long, up to a minute or this delay if it is longer, and an opened connection
     *   starts again from it. A delay of 0 re-opens at once the first time. Set to false to
     *   deactivate this feature.
     */
    open: {
      prepare: (webSocket: WebSocketId, url = '', server: WebSocketServer = 'notSpecified', useAuth = false, autoReconnect: number | false = false) => ({
        payload: {
          url: isNonEmptyString(url) ? url : webSocket,
          server,
          useAuth: !!useAuth,
          autoReconnect: isNumber(autoReconnect, { withoutInfinite: true, gte: 0 })
            ? (autoReconnect * 1000)
            : false,
        } satisfies Pick<WebSocketConnection['settings'], 'url' | 'server' | 'useAuth' | 'autoReconnect'>,
        meta: { webSocket },
      }),
      reducer: (state, { payload, meta: { webSocket } }: PayloadAction<Pick<WebSocketConnection['settings'], 'url' | 'server' | 'useAuth' | 'autoReconnect'>, string, WebSocketMetadata>) => {
        if (webSocket && !state.byId[webSocket]) {
          state.byId[webSocket] = {
            settings: {
              id: webSocket,
              fromConfig: false,
              url: payload.url,
              server: payload.server,
              useAuth: payload.useAuth,
              autoOpen: false,
              autoReconnect: payload.autoReconnect,
            },
            status: WebSocketStatus.closed,
            isAutoReconnectOn: (payload.autoReconnect !== false),
            nextAutoReconnect: 0,
            logs: [],
          };
          state.allIds.push(webSocket);
        }
      },
    },


    /**
     * Reducer to set the new status of a WebSocket connection, received from the WebSocket API by
     * the middleware of this slice.
     */
    receiveStatus: {
      prepare: (webSocket: WebSocketId, status: WebSocketStatus, nextAutoReconnect: number) => ({
        payload: { status, nextAutoReconnect },
        meta: { webSocket },
      }),
      reducer: (state, { payload: { status, nextAutoReconnect }, meta: { webSocket } }: PayloadAction<Pick<WebSocketConnection, 'status' | 'nextAutoReconnect'>, string, WebSocketMetadata>) => {
        if (state.byId[webSocket]) {
          state.byId[webSocket].status = status;
          state.byId[webSocket].nextAutoReconnect = nextAutoReconnect;
        }
      },
    },


    /**
     * Reducer that can be used to switch on automatically re-opening the WebSocket connection
     * after its state changed to CLOSED or ERROR. Note that it can only be done, if this feature is
     * enabled in the settings of the WebSocket connection.
     */
    switchOnAutoReconnect: {
      prepare: (webSocket: WebSocketId) => ({
        payload: undefined,
        meta: { webSocket },
      }),
      reducer: (state, { meta: { webSocket } }: PayloadAction<undefined, string, WebSocketMetadata>) => {
        if (state.byId[webSocket] && (state.byId[webSocket].settings.autoReconnect !== false)) {
          state.byId[webSocket].isAutoReconnectOn = true;
        }
      },
    },


    /**
     * Reducer that can be used to switch off automatically re-opening the WebSocket connection
     * after its status changed to CLOSED or ERROR.
     */
    switchOffAutoReconnect: {
      prepare: (webSocket: WebSocketId) => ({
        payload: undefined,
        meta: { webSocket },
      }),
      reducer: (state, { meta: { webSocket } }: PayloadAction<undefined, string, WebSocketMetadata>) => {
        if (state.byId[webSocket]) {
          state.byId[webSocket].isAutoReconnectOn = false;
        }
      },
    },


    /**
     * Reducer to receive an error message from the WebSocket API at the middleware of this slice.
     */
    receiveError: {
      prepare: (webSocket: WebSocketId, data: Pick<LogEntry, 'timestamp' | 'title' | 'text'>) => ({
        payload: data,
        meta: { webSocket },
      }),
      reducer: (state, { payload, meta: { webSocket } }: PayloadAction<Pick<LogEntry, 'timestamp' | 'title' | 'text'>, string, WebSocketMetadata>) => {
        if (state.byId[webSocket]) {
          pushLogEntry(state.byId[webSocket].logs, {
            slice: slice.reducerPath,
            level: 'error',
            ...payload,
          });
        }
      },
    },
  },


  selectors: {
    /**
     * Selector to get an array with the objects of the settings of all WebSocket connections. If
     * there are no WebSockets configured, an empty array is returned.
     */
    selectAllSettings: createSelector(
      (state: WebSocketsState) => state.byId,
      (state: WebSocketsState) => state.allIds,
      (byId, allIds) => allIds.map((id) => byId[id]!.settings),
    ),


    /**
     * Selector to get the settings as object of a WebSocket connection, selected by a given
     * WebSocket ID. If not found, null is returned.
     */
    selectSettings: (state: WebSocketsState, webSocket: WebSocketId) => (state.byId[webSocket]?.settings ?? null),


    /**
     * Selector to get the status of a WebSocket connection, selected by a given WebSocket ID. If
     * the ID is invalid or is not yet set, null is returned.
     */
    selectStatus: (state: WebSocketsState, webSocket: WebSocketId) => state.byId[webSocket]?.status ?? null,


    /**
     * Selector that returns true if the feature to re-open the WebSocket connection automatically
     * after its state changed to CLOSED or ERROR is on or false if not.
     */
    selectIsAutoReconnectOn: (state: WebSocketsState, webSocket: WebSocketId) => !!state.byId[webSocket]?.isAutoReconnectOn,


    /**
     * Selector to get the UNIX timestamp in milliseconds, when the WebSocket connection will be
     * re-opened automatically again. If no or no further re-opening is scheduled, a value smaller
     * than the current timestamp is returned.
     */
    selectNextReconnecting: (state: WebSocketsState, webSocket: WebSocketId) => (state.byId[webSocket]?.nextAutoReconnect ?? 0),


    /**
     * Selector to get an array with the log entries of the WebSocket connections slice, selected by
     * the given WebSocket ID. If the ID is invalid or is not yet set, null is returned.
     */
    selectLogs: (state: WebSocketsState, webSocket: WebSocketId) => state.byId[webSocket]?.logs ?? null,
  },
});


/**
 * Action creator that can be used to close a WebSocket connection.
 */
const close = createAction(`${slice.name}/close`, (webSocket: WebSocketId) => ({
  payload: undefined,
  meta: { webSocket },
}));


/**
 * Action creator to broadcast a message received from a connection to a not specified WebSocket
 * server by the middleware of this slice.
 */
const receiveMessage = createAction(`${slice.name}/receiveMessage`, (webSocket: WebSocketId, msg: unknown) => ({
  payload: msg,
  meta: { webSocket },
}));


/**
 * Action creator that can be used to send a message to a WebSocket server. The given data is
 * converted into a JSON string before sending, unless it is an ArrayBuffer, a Blob or an
 * ArrayBufferView (Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array,
 * Uint32Array, Float32Array, Float64Array, DataView).
 */
const sendMessage = createAction(`${slice.name}/sendMessage`, (webSocket: WebSocketId, data: unknown) => ({
  payload: data,
  meta: { webSocket },
}));


/**
 * Action creator that can be used to send a raw message to a WebSocket server. The given data is
 * converted into a JSON string before sending, unless it is a string (difference to action creator
 * sendWebSocketMessage), an ArrayBuffer, a Blob or an ArrayBufferView (Int8Array, Uint8Array,
 * Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array,
 * DataView).
 */
const sendRawMessage = createAction(`${slice.name}/sendRawMessage`, (webSocket: WebSocketId, data: unknown) => ({
  payload: data,
  meta: { webSocket },
}));


declare module 'store/store.types' {
  export interface LazyLoadedSlices extends WithSlice<typeof slice> {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

rootReducer.inject({
  reducerPath: slice.reducerPath,
  reducer: enhancedReducerCreator<WebSocketsState>(slice, createInitialState),
});


/**
 * Listener for the WebSocket API to detect changes of the status of the WebSocket connections.
 */
const webSocketApiListenerForStatusChanges = (dispatch: RootDispatch, { status, nextAutoReconnect }: { status: WebSocketStatus; nextAutoReconnect: number }, { webSocket }: WebSocketMetadata) => {
  dispatch(slice.actions.receiveStatus(webSocket, status, nextAutoReconnect));
};


/**
 * Listener for the WebSocket API to detect incoming messages from the WebSocket connections. Note
 * that only the messages of the connections to not specified servers are handled here!
 */
const webSocketApiListenerForMessages = (dispatch: RootDispatch, msg: unknown, { webSocket, server }: WebSocketMetadata) => {
  if (!server || (server === 'notSpecified')) {
    dispatch(receiveMessage(webSocket, msg));
  }
};


/**
 * Listener for the WebSocket API to handle errors occured at the WebSocket connections.
 */
const webSocketApiListenerForErrors = (dispatch: RootDispatch, { timestamp, title, text }: { timestamp?: number; title?: string; text: string }, { webSocket }: WebSocketMetadata) => {
  dispatch(slice.actions.receiveError(webSocket, {
    timestamp: timestamp ?? Date.now(),
    ...(title && { title }),
    text,
  }));
};


startInitialListener({
  effect: (_, listenerApi) => {
    const { byId, allIds } = listenerApi.getState().webSockets!;

    webSocketsApi.addListener(WebSocketListener.onStatusChanged, webSocketApiListenerForStatusChanges.bind(null, listenerApi.dispatch));
    webSocketsApi.addListener(WebSocketListener.onMessage, webSocketApiListenerForMessages.bind(null, listenerApi.dispatch));
    webSocketsApi.addListener(WebSocketListener.onError, webSocketApiListenerForErrors.bind(null, listenerApi.dispatch));

    allIds.forEach((id) => {
      const { settings } = byId[id]!;

      webSocketsApi.create({
        webSocket: settings.id,
        url: settings.url,
        server: settings.server,
        useAuth: settings.useAuth,
        autoOpen: settings.autoOpen,
        autoReconnect: settings.autoReconnect,
      });

      if (settings.autoOpen) {
        webSocketsApi.open(id);
      }
    });
  },
});


startListening({
  predicate: ({ type, meta }, currentState) => (
    type.startsWith(`${slice.name}/`)
    && !!currentState.webSockets?.byId[(meta as WebSocketMetadata).webSocket]
  ),
  effect: ({ type, payload, meta }, listenerApi) => {
    const { webSocket } = meta as WebSocketMetadata;

    if (type === slice.actions.open.type) {
      if (!webSocketsApi.exists(webSocket)) {
        const { settings } = listenerApi.getState().webSockets!.byId[webSocket]!;

        webSocketsApi.create({
          webSocket: settings.id,
          url: settings.url,
          server: settings.server,
          useAuth: settings.useAuth,
          autoOpen: settings.autoOpen,
          autoReconnect: settings.autoReconnect,
        });
      }

      webSocketsApi.open(webSocket);
    } else if (webSocketsApi.exists(webSocket)) {
      switch (type) {
        case slice.actions.switchOnAutoReconnect.type:
          webSocketsApi.setAutoReconnect(webSocket, true);
          break;

        case slice.actions.switchOffAutoReconnect.type:
          webSocketsApi.setAutoReconnect(webSocket, false);
          break;

        case sendMessage.type:
          webSocketsApi.send(webSocket, payload);
          break;

        case sendRawMessage.type:
          webSocketsApi.send(webSocket, payload, true);
          break;

        case close.type:
          webSocketsApi.close(webSocket);
          break;

        // no default
      }
    }
  },
});


export const { name } = slice;

export const {
  open, receiveStatus, switchOnAutoReconnect, switchOffAutoReconnect, receiveError,
} = slice.actions;

export {
  close, receiveMessage, sendMessage, sendRawMessage,
};

export const {
  selectAllSettings, selectSettings, selectStatus, selectIsAutoReconnectOn, selectNextReconnecting,
  selectLogs,
} = slice.getSelectors((rootState: RootState) => rootState[slice.reducerPath] ?? initialState);
