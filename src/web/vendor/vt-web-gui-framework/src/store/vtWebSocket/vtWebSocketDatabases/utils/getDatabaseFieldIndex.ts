import type { WebSocketId } from 'interfaces/webSocketItf';
import { isNonEmptyString } from 'utils/type';

import type { VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';

import { getDatabaseLayout } from './getDatabaseLayout';


/**
 * Internal selector to get the zero based index of a field, selected by the field ID of a
 * DBSourceHandler database layout of a VtWebSocketEngine server. The given source can either be the
 * name of a database layout or the name of a database. In the latter case, the layout used by this
 * database (if exists) is taken. If there is no field with the given ID or if the layout is not yet
 * received, null is returned.
 */
export const getDatabaseFieldIndex = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string, fieldId: string): number | null => {
  const layout = getDatabaseLayout(state, webSocket, source);
  const fieldIdAsLowerCase = isNonEmptyString(fieldId) ? fieldId.toLowerCase() : fieldId;

  return (
    layout?.fields.byId[fieldId]?.idx
    ?? layout?.fields.byId[layout.fields.allIds.find((id) => (id.toLowerCase() === fieldIdAsLowerCase)) ?? '']?.idx
    ?? null
  );
};
