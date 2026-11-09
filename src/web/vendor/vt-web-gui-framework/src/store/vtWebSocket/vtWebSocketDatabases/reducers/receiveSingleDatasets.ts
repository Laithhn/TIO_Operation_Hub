import { type PayloadAction } from '@reduxjs/toolkit';

import type { WebSocketMetadata } from 'interfaces/webSocketItf';

import { pushLog } from '../utils/pushLog';
import type { VtWebSocketDatabasesState, VtWebSocketDataset } from '../vtWebSocketDatabases.types';


interface DatasetsMsg {
  data: VtWebSocketDataset[];
}


/**
 * Reducer to overtake the data with single datasets, received as message from a database handler
 * DBSourceHandler of a VtWebSocketEngine server.
 */
export const receiveSingleDatasets = (state: VtWebSocketDatabasesState, { payload: { source, msg }, meta: { webSocket } }: PayloadAction<{ source: string; msg: DatasetsMsg }, string, WebSocketMetadata>) => {
  if (state.byId[webSocket]) {
    const database = state.byId[webSocket].databases.allNames.find((id) => source.startsWith(`${id}.`));

    if (database) {
      const db = state.byId[webSocket].databases.byName[database]!;

      // If the layout of the database already exists (is created by reducer
      // receiveVtwseDatabaseLayout)...
      if (state.byId[webSocket].layouts.byName[db.layout]) {
        const { keyIdx, numFields } = state.byId[webSocket].layouts.byName[db.layout]!.fields;
        const datasetId = source.substring(database.length + 1);
        const dataset = msg.data[0]!;

        if (dataset.length === numFields) {
          if (datasetId === dataset[keyIdx]!) {
            db.singleDatasets.byId[datasetId] = dataset;
            if (!db.singleDatasets.allIds.includes(datasetId)) {
              db.singleDatasets.allIds.push(datasetId);
            }
          } else {
            pushLog(state, webSocket, 'error', 'Invalid single dataset received', `Received a single dataset from database "${database}" where the value of the key field (${dataset[keyIdx]!}) differs from the dataset ID given in the source name (${source}).`);
          }
        } else {
          pushLog(state, webSocket, 'warning', 'Invalid single dataset received', `Received a single dataset from database "${source}" with ID "${datasetId}" that has not the required length (${dataset.length} instead of ${numFields}).`);
        }
      } else {
        pushLog(state, webSocket, 'error', 'Invalid datasets received', `Received datasets from database "${source}" before the database was initialized with a valid layout (has not yet been received).`);
      }
    }
  }
};
