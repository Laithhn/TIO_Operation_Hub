import { type PayloadAction } from '@reduxjs/toolkit';

import type { WebSocketMetadata } from 'interfaces/webSocketItf';
import { isNumber } from 'utils/type';

import { pushLog } from '../utils/pushLog';
import type { VtWebSocketDatabasesState, VtWebSocketDataset } from '../vtWebSocketDatabases.types';


interface DatasetsMsg {
  meta: {
    total: number;
    before?: number;
    after?: number;
    send?: number;
    pos?: 'top' | 'bottom' | 'middle' | 'up' | 'down';
    cache?: 'reset';
  };
  data?: VtWebSocketDataset[];
}


/**
 * Reducer to overtake the data with datasets, received as message from a database handler
 * DBSourceHandler of a VtWebSocket server.
 */
export const receiveDatasets = (state: VtWebSocketDatabasesState, { payload: { source, msg }, meta: { webSocket } }: PayloadAction<{ source: string; msg: DatasetsMsg }, string, WebSocketMetadata>) => {
  // If the database already exists (is initially created by reducer initVtwseDatabase)...
  if (state.byId[webSocket]?.databases.byName[source]) {
    const db = state.byId[webSocket].databases.byName[source];

    // If the layout of the database already exists (is created by reducer
    // receiveVtwseDatabaseLayout)...
    if (state.byId[webSocket].layouts.byName[db.layout]) {
      if (!Array.isArray(msg.data)) {
        // -------------------------------------------------------------------------------------------
        // Received an info message from the database, but without new datasets, only the meta data
        // changed. Note that if the database cache is invalid but there are datasets in the database
        // (total > 0), these datasets are assigned randomly to numAfter here! In practice, the
        // database cache may become invalid, if no datasets have been queried yet (allDatasetIds is
        // empty) or if the cache was reseted due to the setting of filters.
        // -------------------------------------------------------------------------------------------

        if (
          (msg.meta.cache !== 'reset')
          && isNumber(msg.meta.before)
          && isNumber(msg.meta.after)
        ) {
          // If the database cache at the server is VALID...
          const sizeCache = msg.meta.total - msg.meta.before - msg.meta.after;

          if (db.datasets.allIds.length === sizeCache) {
            // If the resulting number of datasets in the database cache is equal to the already
            // received datasets: all fine, overtake the new numbers (datasets have been added to the
            // database at the server or have been deleted there).
            db.numTotal = msg.meta.total;
            db.numBefore = msg.meta.before;
            db.numAfter = msg.meta.after;
          } else {
            // A nonsensical number of datasets is received.
            pushLog(state, webSocket, 'warning', 'Incorrect number of DBSourceHandler datasets', `The number of existing datasets (${db.datasets.allIds.length}) of database "${source}" is not equal to the received total number of datasets (${msg.meta.total}) minus the datasets before (${msg.meta.before}) and after (${msg.meta.after}) the already received ones.`);

            if (db.isValid) {
              // If the cache is marked as valid, overtake the numbers anyway. Let's hope that goes
              // well.
              db.numTotal = msg.meta.total;
              db.numBefore = msg.meta.before;
              db.numAfter = msg.meta.after;
            } else {
              // But if the cache here is already marked as invalid, ignore the before and after
              // numbers and reset everything. The data must be loaded initially anyway.
              db.isLoading = false;
              db.numTotal = msg.meta.total;
              db.numBefore = 0;
              db.numAfter = msg.meta.total;
              db.datasets.byId = {};
              db.datasets.allIds = [];
              db.datasets.activeId = null;
              db.datasets.requestedActiveId = null;
              db.datasets.selectedIds = [];
            }
          }
        } else {
          // If the database cache at the server is INVALID...
          db.isLoading = false;
          db.isValid = false;
          db.numTotal = msg.meta.total;
          db.numBefore = 0;
          db.numAfter = msg.meta.total;
          db.datasets.byId = {};
          db.datasets.allIds = [];
          db.datasets.activeId = null;
          db.datasets.requestedActiveId = null;
          db.datasets.selectedIds = [];
        }
      } else if (msg.data.length === msg.meta.send) {
        // -------------------------------------------------------------------------------------------
        // Received an info message from the database with new datasets. Note that this part is
        // optimized in terms of performance (e.g. for receiving big data) for current browsers (Dec.
        // 2022).
        // -------------------------------------------------------------------------------------------

        if (['top', 'bottom', 'middle', 'up', 'down'].includes(msg.meta.pos ?? '')) {
          const { keyIdx, numFields } = state.byId[webSocket].layouts.byName[db.layout]!.fields;

          if ((msg.meta.pos === 'top') || (msg.meta.pos === 'bottom') || (msg.meta.pos === 'middle')) {
            db.datasets.allIds = [];
            db.datasets.byId = {};
          }

          if (msg.meta.pos === 'up') {
            for (let i = (msg.data.length - 1); i >= 0; i--) {
              const dataset: VtWebSocketDataset = msg.data[i]!;

              if (!Array.isArray(dataset)) {
                pushLog(state, webSocket, 'warning', 'Invalid DBSourceHandler dataset received', `Received a dataset from database "${source}" for position "up" that is not an array.`);
              } else if (dataset.length !== numFields) {
                pushLog(state, webSocket, 'warning', 'Invalid DBSourceHandler dataset received', `Received a dataset from database "${source}" for position "up" that has not the required length (${dataset.length} instead of ${numFields}).`);
              } else {
                const id = String(dataset[keyIdx]!);

                if (!db.datasets.byId[id]) {
                  db.datasets.allIds.unshift(id);
                }
                db.datasets.byId[id] = dataset;
              }
            }
          } else {
            for (const dataset of msg.data) {
              if (!Array.isArray(dataset)) {
                pushLog(state, webSocket, 'warning', 'Invalid DBSourceHandler dataset received', `Received a dataset from database "${source}" for position "${msg.meta.pos}" that is not an array.`);
              } else if (dataset.length !== numFields) {
                pushLog(state, webSocket, 'warning', 'Invalid DBSourceHandler dataset received', `Received a dataset from database "${source}" for position "${msg.meta.pos}" that has not the required length (${dataset.length} instead of ${numFields}).`);
              } else {
                const id = dataset[keyIdx]!.toString();

                if (!db.datasets.byId[id]) {
                  db.datasets.allIds.push(id);
                }
                db.datasets.byId[id] = dataset;
              }
            }
          }

          // A dataset requested with position "middle" becomes the active one. The answer does not
          // carry its ID back, so it was remembered by reducer requestDatasets. If the server did
          // not deliver it, the fallback below takes over.
          if ((msg.meta.pos === 'middle') && (db.datasets.requestedActiveId !== null)) {
            if (db.datasets.byId[db.datasets.requestedActiveId]) {
              db.datasets.activeId = db.datasets.requestedActiveId;
            }

            db.datasets.requestedActiveId = null;
          }

          if ((db.datasets.activeId === null) || !db.datasets.byId[db.datasets.activeId]) {
            if (db.datasets.allIds.length > 0) {
              db.datasets.activeId = (msg.meta.pos === 'bottom')
                ? db.datasets.allIds[db.datasets.allIds.length - 1]!
                : db.datasets.allIds[0]!;
            } else {
              db.datasets.activeId = null;
            }
          }

          const selectedIds = db.datasets.selectedIds.filter((id) => db.datasets.byId[id]);
          if (selectedIds.length !== db.datasets.selectedIds.length) {
            db.datasets.selectedIds = selectedIds;
          }

          if (db.datasets.allIds.length !== (msg.meta.total - (msg.meta.before ?? 0) - (msg.meta.after ?? 0))) {
            pushLog(state, webSocket, 'warning', 'Invalid DBSourceHandler datasets received', `The number of received datasets (${db.datasets.allIds.length}) from database "${source}" is not equal to the received total number of datasets (${msg.meta.total}) minus the datasets before (${msg.meta.before}) and after (${msg.meta.after}) the received ones.`);
          }

          db.isLoading = false;
          db.isValid = true;
          db.numTotal = msg.meta.total;
          db.numBefore = msg.meta.before ?? 0;
          db.numAfter = msg.meta.after ?? 0;
        } else {
          pushLog(state, webSocket, 'error', 'Invalid DBSourceHandler datasets received', `Received datasets from database "${source}" with an invalid position (meta.pos): "${msg.meta.pos}". Expected values: "top", "bottom", "middle", "up" or "down".`);
        }
      } else {
        pushLog(state, webSocket, 'error', 'Invalid DBSourceHandler datasets received', `Received an inconsistent number of datasets from database "${source}" (length of array "data": ${msg.data.length}, value of meta.send: ${msg.meta.send}).`);
      }
    } else {
      pushLog(state, webSocket, 'error', 'Invalid DBSourceHandler datasets received', `Received datasets from database "${source}" before the database was initialized with a valid layout (has not yet been received).`);
    }
  }
};
