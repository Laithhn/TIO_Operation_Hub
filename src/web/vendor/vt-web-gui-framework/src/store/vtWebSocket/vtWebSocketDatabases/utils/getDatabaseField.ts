import type { WebSocketId } from 'interfaces/webSocketItf';
import { isNonEmptyString } from 'utils/type';

import type { VtWebSocketDatabaseFieldLayout, VtWebSocketDatabasesState } from '../vtWebSocketDatabases.types';

import { getDatabaseLayout } from './getDatabaseLayout';


/**
 * Internal selector to get the layout object of a field of a DBSourceHandler database layout of a
 * VtWebSocketEngine server, selected either by the field ID or by its zero based index. The given
 * source can either be the name of a database layout or the name of a database. In the latter case,
 * the layout used by this database (if exists) is taken. If there is no such field or if the layout
 * is not yet received, null is returned.
 */
export const getDatabaseField = (state: VtWebSocketDatabasesState, webSocket: WebSocketId, source: string, fieldIdOrIdx: string | number): VtWebSocketDatabaseFieldLayout | null => {
  const layout = getDatabaseLayout(state, webSocket, source);

  if (!layout) {
    return null;
  }

  if (typeof fieldIdOrIdx === 'number') {
    return layout.fields.byId[layout.fields.allIds.find((id) => (layout.fields.byId[id]!.idx === fieldIdOrIdx)) ?? ''] ?? null;
  }

  const fieldIdAsLowerCase = isNonEmptyString(fieldIdOrIdx) ? fieldIdOrIdx.toLowerCase() : fieldIdOrIdx;

  return (
    layout.fields.byId[fieldIdOrIdx]
    ?? layout.fields.byId[layout.fields.allIds.find((id) => (id.toLowerCase() === fieldIdAsLowerCase)) ?? '']
    ?? null
  );
};
