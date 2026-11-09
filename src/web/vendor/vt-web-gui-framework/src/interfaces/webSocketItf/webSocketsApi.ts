import { WebSocketItf } from './WebSocketItf';
import type { WebSocketId, WebSocketMetadata } from './webSocketItf.types';


const webSockets: Record<WebSocketId, WebSocketItf> = {};


export const webSocketsApi = {
  create: (meta: WebSocketMetadata) => {
    if (WebSocketItf.isValidId(meta.webSocket) && !webSockets[meta.webSocket]) {
      webSockets[meta.webSocket] = new WebSocketItf(meta);
    }
  },
  addListener: WebSocketItf.addListener,
  exists: (id: WebSocketId) => !!webSockets[id],
  open: (id: WebSocketId) => webSockets[id]?.open(),
  close: (id: WebSocketId) => webSockets[id]?.close(),
  setAutoReconnect: (id: WebSocketId, value: boolean) => webSockets[id]?.setAutoReconnect(value),
  send: (id: WebSocketId, data: unknown, raw = false) => webSockets[id]?.send(data, raw),
};
