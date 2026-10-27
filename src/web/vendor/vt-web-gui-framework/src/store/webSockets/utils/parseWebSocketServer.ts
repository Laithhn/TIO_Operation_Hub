import type { WebSocketServer } from 'interfaces/webSocketItf';


/**
 * Helper function to parse a given WebSocket server specification.
 */
export const parseWebSocketServer = (server: string | undefined): WebSocketServer => {
  const serverStr = (server ?? '').toLowerCase();

  if ((serverStr === 'vtwebsocket') || (serverStr === 'vtwse') || (serverStr === 'vtwebsocketengine')) {
    return 'vtWebSocket';
  }

  return 'notSpecified';
};
