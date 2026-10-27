import { createSlice, type PayloadAction, type WithSlice } from '@reduxjs/toolkit';

import type { WebSocketMetadata } from 'interfaces/webSocketItf';
import { rootReducer } from 'store/rootReducer';
import type { RootState } from 'store/store.types';

import { Log4CxxLevel } from '../vtWebSocket.types';

import { reselectReportsValueGetter } from './reselectors/reselectReportsValueGetter';
import type {
  VtWebSocketReportsState, VtWebSocketRequestData, VtWebSocketResponseData, VtWebSocketSource,
} from './vtWebSocketReports.types';


const initialState: VtWebSocketReportsState = {
  byId: {},
};


/**
 * Redux Toolkit slice that handles the partial state of reports on requests and responses to and
 * from VtWebSocket servers. Note that the reducer of this slice isn't exported below, but is
 * injected into the root reducer as soon as this slice is used.
 */
const slice = createSlice({
  name: 'VIWGF/vtWebSocketReports',
  reducerPath: 'vtWebSocketReports',
  initialState,


  reducers: {
    /**
     * Reducer to report a message sent to a VtWebSocket server.
     */
    reportRequest: {
      prepare: (webSocket: string, data: VtWebSocketRequestData) => ({
        payload: data,
        meta: { webSocket },
      }),
      reducer: (state, { payload, meta: { webSocket } }: PayloadAction<VtWebSocketRequestData, string, WebSocketMetadata>) => {
        let request: keyof VtWebSocketSource['numRequests'],
          source: string,
          sourceHandler;

        if (payload.set) {
          request = 'set';
          source = payload.set;
        } else if (payload.query) {
          request = 'query';
          source = payload.query;
        } else if (payload.update) {
          request = 'update';
          source = payload.update;
        } else {
          return;
        }

        const rootSource = source.split('.')[0]!;

        state.byId[webSocket] ??= {
          bySource: {},
          allSources: [],
        };

        if (!state.byId[webSocket].bySource[rootSource]) {
          state.byId[webSocket].bySource[rootSource] = {
            sourceHandler: '?',
            isPushing: false,
            numRequests: { set: 0, query: 0, update: 0 },
            numResponses: { info: 0, update: 0 },
            lastQuery: null,
            responseTimeMs: null,
          };
          state.byId[webSocket].allSources.push(rootSource);
        }

        if (rootSource === 'API') {
          sourceHandler = 'API';
        } else if (source === 'AUTH') {
          sourceHandler = 'AUTH';
        } else if (
          source.endsWith('.layout')
          || ((typeof payload['cnt'] === 'number') && (typeof payload['pos'] === 'string'))
          || Array.isArray(payload['filter'])
        ) {
          sourceHandler = 'DB';
        } else if (('url_params' in payload) || ('post_data' in payload)) {
          sourceHandler = 'Rest';
        } else if (
          (typeof payload['format'] === 'string')
          || (typeof payload['quality'] === 'number')
          || (typeof payload['scale'] === 'number')
        ) {
          sourceHandler = 'Image';
        } else if (Object.values(Log4CxxLevel).some((level) => (level === payload['level']))) {
          sourceHandler = 'Log4Cxx';
        }

        if (sourceHandler) {
          if (state.byId[webSocket].bySource[rootSource].sourceHandler === '?') {
            state.byId[webSocket].bySource[rootSource].sourceHandler = sourceHandler;
          } else if (!state.byId[webSocket].bySource[rootSource].sourceHandler.includes(sourceHandler)) {
            state.byId[webSocket].bySource[rootSource].sourceHandler = `${state.byId[webSocket].bySource[rootSource].sourceHandler} | ${sourceHandler}`;
          }
        }

        if (typeof payload.push === 'boolean') {
          state.byId[webSocket].bySource[rootSource].isPushing = payload.push;
        }

        state.byId[webSocket].bySource[rootSource].numRequests[request]++;

        if (request === 'query') {
          state.byId[webSocket].bySource[rootSource].lastQuery = Date.now();
        }
      },
    },


    /**
     * Reducer to report a message received from a VtWebSocket server.
     */
    reportResponse: {
      prepare: (webSocket: string, data: VtWebSocketResponseData) => ({
        payload: data,
        meta: { webSocket },
      }),
      reducer: (state, { payload, meta: { webSocket } }: PayloadAction<VtWebSocketResponseData, string, WebSocketMetadata>) => {
        let response: keyof VtWebSocketSource['numResponses'],
          source: string;

        if (payload.info) {
          response = 'info';
          source = payload.info;
        } else if (payload.update) {
          response = 'update';
          source = payload.update;
        } else {
          return;
        }

        const rootSource = source.split('.')[0]!;

        if (state.byId[webSocket]?.bySource[rootSource]) {
          state.byId[webSocket].bySource[rootSource].numResponses[response]++;

          if (
            state.byId[webSocket].bySource[rootSource].lastQuery
            && (state.byId[webSocket].bySource[rootSource].responseTimeMs === null)
          ) {
            state.byId[webSocket].bySource[rootSource].responseTimeMs = Date.now() - state.byId[webSocket].bySource[rootSource].lastQuery;
          }
        }
      },
    },
  },


  selectors: {
    /**
     * Selector to return a memoized array with names of all sources, that have already been
     * requested.
     */
    selectAllSourceNames: (state: VtWebSocketReportsState, webSocket: string) => state.byId[webSocket]?.allSources ?? null,


    /**
     * Selector to return a memoized value getter function, that can find a value of a
     * VtWebSocket source. The first argument of this function is the name of the source, the second
     * one is the field name: "sourceHandler" (string), "isPushing" (boolean), "numRequestsSet"
     * (number), "numRequestsQuery" (number), "numRequestsUpdate" (number), "numResponses" (number),
     * "numResponsesInfo" (number), "numResponsesUpdate" (number), "lastQuery" (number|null) or
     * "responseTimeMs" (number|null). If the webSocket, the source or the field name can not be
     * found, null is returned.
     */
    selectReportsValueGetter: (state: VtWebSocketReportsState, webSocket: string) => (
      state.byId[webSocket] ? reselectReportsValueGetter(state, webSocket) : null
    ),
  },
});


declare module 'store/store.types' {
  export interface LazyLoadedSlices extends WithSlice<typeof slice> {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

rootReducer.inject(slice);


export const { name } = slice;

export const { reportRequest, reportResponse } = slice.actions;

export const {
  selectAllSourceNames, selectReportsValueGetter,
} = slice.getSelectors((rootState: RootState) => rootState[slice.reducerPath] ?? initialState);
