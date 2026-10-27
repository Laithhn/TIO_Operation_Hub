import { WebSocketStatus } from 'interfaces/webSocketItf';
import { getAttributeInLowerCase, getTrimmedAttribute, isAttributeTrue } from 'utils/element';
import { normalizeUrlPath } from 'utils/normalizeUrlPath';
import { isNonEmptyString, isNumber } from 'utils/type';

import type { WebSocketConnection, WebSocketsState } from '../webSockets.types';

import { parseWebSocketServer } from './parseWebSocketServer';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: WebSocketsState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read optional configuration node "Configuration > WebSockets".
  // -----------------------------------------------------------------------------------------------

  const xmlWebSockets = config.querySelector(':scope > WebSockets');

  if (xmlWebSockets) {
    // ---------------------------------------------------------------------------------------------
    // Read optional configuration nodes "Configuration > WebSockets > WebSocket".
    // ---------------------------------------------------------------------------------------------

    draftState.byId = Array.from(xmlWebSockets.querySelectorAll('WebSocket')).reduce<WebSocketsState['byId']>((acc, xmlWebSocket) => {
      const id = getTrimmedAttribute(xmlWebSocket, 'id');
      // An empty attribute switches the automatic re-opening off like a missing one, which
      // Number('') would read as 0, the delay to re-open at once.
      let url = xmlWebSocket.textContent,
        autoReconnect: WebSocketConnection['settings']['autoReconnect'] = Number(getTrimmedAttribute(xmlWebSocket, 'autoReconnect') || 'false');

      if (!id) {
        throw new Error('VIWGF/store/webSockets/webSocketConnections: no ID was specified in the configuration for a desired WebSocket connection.');
      }

      if (!isNonEmptyString(url)) {
        const hostname = getTrimmedAttribute(xmlWebSocket, 'hostname') || window.location.hostname;
        const port = getTrimmedAttribute(xmlWebSocket, 'port') || window.location.port;
        const path = normalizeUrlPath(getTrimmedAttribute(xmlWebSocket, 'path'), { leadingSlash: true, encode: true });
        let protocol;

        switch (getAttributeInLowerCase(xmlWebSocket, 'useSsl')) {
          case 'true': protocol = 'wss:'; break;
          case 'false': protocol = 'ws:'; break;
          default: protocol = (window.location.protocol === 'https:') ? 'wss:' : 'ws:'; break;
        }

        url = `${protocol}//${hostname}:${port}${path}`;
      }

      autoReconnect = isNumber(autoReconnect, { withoutInfinite: true, gte: 0 })
        ? (autoReconnect * 1000)
        : false;

      return {
        ...acc,
        [id]: {
          settings: {
            id,
            fromConfig: true,
            url,
            server: parseWebSocketServer(getTrimmedAttribute(xmlWebSocket, 'server')),
            useAuth: isAttributeTrue(xmlWebSocket, 'useAuth'),
            autoOpen: isAttributeTrue(xmlWebSocket, 'autoOpen'),
            autoReconnect,
          },
          status: WebSocketStatus.closed,
          isAutoReconnectOn: autoReconnect !== false,
          nextAutoReconnect: 0,
          logs: [],
        },
      };
    }, {});

    draftState.allIds = Object.keys(draftState.byId);
  }
};
