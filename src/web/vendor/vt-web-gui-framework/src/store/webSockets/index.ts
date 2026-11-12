import {
  type WebSocketId, type WebSocketMetadata, type WebSocketServer, WebSocketStatus,
} from 'interfaces/webSocketItf';

import * as webSocketsSlice from './webSockets.slice';
import type {
  WebSocketConnection, WebSocketsState,
} from './webSockets.types';


export type {
  WebSocketConnection, WebSocketId, WebSocketMetadata, WebSocketServer, WebSocketsState,
};

export { webSocketsSlice, WebSocketStatus };
