import { type PayloadAction } from '@reduxjs/toolkit';

import type { WebSocketMetadata } from 'interfaces/webSocketItf';
import { isNumber } from 'utils/type';

import { pushLog } from '../utils/pushLog';
import type { VtWebSocketData, VtWebSocketDatabasesState, VtWebSocketDataset } from '../vtWebSocketDatabases.types';


interface DatasetUpdatesMsg {
  meta?: {
    total?: number;
    before?: number;
    after?: number;
  };
  add?: VtWebSocketDataset[];
  edit?: VtWebSocketDataset[] | Record<string, VtWebSocketDataset>[] | Record<string, VtWebSocketData>[];
  del?: string[];
}


/**
 * Reducer to update existing datasets (add, edit or delete) and single datasets (edit or delete),
 * received as message from a database handler DBSourceHandler of a VtWebSocket server.
 */
export const receiveDatasetUpdates = (state: VtWebSocketDatabasesState, { payload: { source, msg }, meta: { webSocket } }: PayloadAction<{ source: string; msg: DatasetUpdatesMsg }, string, WebSocketMetadata>) => {
  // Only if the database already exists (is initially created by reducer initVtwseDatabase)...
  if (state.byId[webSocket]?.databases.byName[source]) {
    const db = state.byId[webSocket].databases.byName[source];

    // Only if the layout of the database already exists (is created by reducer
    // receiveVtwseDatabaseLayout)...
    if (state.byId[webSocket].layouts.byName[db.layout]) {
      if (isNumber(msg.meta?.total, { gte: 0 })) {
        db.numTotal = msg.meta.total;
      }

      if (db.isValid) {
        if (isNumber(msg.meta?.before, { gte: 0 })) {
          db.numBefore = msg.meta.before;
        }

        if (isNumber(msg.meta?.after, { gte: 0 })) {
          db.numAfter = msg.meta.after;
        }
      } else {
        db.numBefore = 0;
        db.numAfter = db.numTotal;
      }

      if (
        (Array.isArray(msg.add) && (msg.add.length > 0))
        || (Array.isArray(msg.edit) && (msg.edit.length > 0))
      ) {
        const { keyIdx, numFields } = state.byId[webSocket].layouts.byName[db.layout]!.fields;

        // ---------------------------------------------------------------------------------------
        // Received an update message from the database with new and / or with changed (single)
        // datasets or (single) dataset values (add or edit). But only if the data cache is valid
        // (datasets are received before). For single datasets, only edit is allowed.
        // ---------------------------------------------------------------------------------------

        // 1.) collect complete datasets to add or replace from the message, and also the values of
        // single fields to replace.
        const datasets: VtWebSocketDataset[] = [];
        let editFields: Record<string, Record<number, VtWebSocketData>> = {};

        for (const addOrEditData of [...(msg.add ?? []), ...(msg.edit ?? [])]) {
          if (Array.isArray(addOrEditData)) {
            if (addOrEditData.length === numFields) {
              datasets.push(addOrEditData);
            } else {
              pushLog(state, webSocket, 'warning', 'Update datasets failed', `Trying to add or edit a dataset from database "${source}" failed, because it has not the required length (${addOrEditData.length} instead of ${numFields}).`);
            }
          } else {
            for (const editId of Object.keys(addOrEditData)) {
              const editData = addOrEditData[editId]!;

              if (Array.isArray(editData)) {
                if (editData.length === numFields) {
                  if (editId === editData[keyIdx]) {
                    datasets.push(editData);
                  } else {
                    pushLog(state, webSocket, 'warning', 'Update datasets failed', `Trying to update the complete dataset with ID "${editId}" of database "${source}" failed, because the value of the key field (${editData[keyIdx]}) differs from the given dataset ID (${editId}).`);
                  }
                } else {
                  pushLog(state, webSocket, 'warning', 'Update datasets failed', `Trying to update the complete dataset with ID "${editId}" of database "${source}" failed, because the given dataset has not the required length (${editData.length} instead of ${numFields}).`);
                }
              } else {
                const idAndIdx = editId.split('.');
                const [id] = idAndIdx;
                const idx = Number(idAndIdx[1]);

                if ((idAndIdx.length === 2) && id && !Number.isNaN(idx)) {
                  if (idx < numFields) {
                    editFields = {
                      ...editFields,
                      [id]: {
                        ...editFields[id],
                        [idx]: editData,
                      },
                    };
                  } else {
                    pushLog(state, webSocket, 'warning', 'Update datasets failed', `Trying to update a single field of dataset "${id}" of database "${source}" failed, because the given index ${idx} is out of range (dataset length: ${numFields}).`);
                  }
                } else {
                  pushLog(state, webSocket, 'warning', 'Update datasets failed', `Trying to update a single field of a dataset of database "${source}" failed, because the given and combined dataset ID and field index "${editId}" is invalid. The dataset ID and the numeric field index must be seperated by a dot.`);
                }
              }
            }
          }
        }

        // 2.) add the collected complete datasets to the existing ones or replace existing ones
        // by the datasets.
        for (const dataset of datasets) {
          const datasetId = dataset[keyIdx]!;
          const datasetIdStr = datasetId.toString();

          if (db.isValid) {
            // Add the dataset to the existing ones or replace an existing one by the dataset, even
            // if the dataset already exists. This is the same behaviour on add and edit.
            db.datasets.byId[datasetIdStr] = dataset;

            // If the ID of the dataset does not exit in the array of all dataset IDs, add it
            // there at the right (sorted) place.
            if (!db.datasets.allIds.includes(datasetIdStr)) {
              const datasetIndex = db.datasets.allIds.findIndex((id, idx) => {
                if (idx >= (db.datasets.allIds.length - 1)) {
                  return false;
                }

                const prevId = db.datasets.byId[id]![keyIdx]!;
                const nextId = db.datasets.byId[db.datasets.allIds[idx + 1]!]![keyIdx]!;

                return (
                  ((datasetId > prevId) && (datasetId < nextId))
                  || ((datasetId < prevId) && (datasetId > nextId))
                );
              });

              if (datasetIndex >= 0) {
                db.datasets.allIds.splice(datasetIndex + 1, 0, datasetIdStr);
              } else if (db.datasets.allIds.length > 0) {
                const firstId = db.datasets.byId[db.datasets.allIds[0]!]![keyIdx]!;
                const lastId = db.datasets.byId[db.datasets.allIds[db.datasets.allIds.length - 1]!]![keyIdx]!;

                if (
                  ((datasetId < firstId) && (firstId < lastId))
                  || ((datasetId > firstId) && (firstId > lastId))
                ) {
                  db.datasets.allIds.unshift(datasetIdStr);
                } else {
                  db.datasets.allIds.push(datasetIdStr);
                }
              } else {
                db.datasets.allIds.push(datasetIdStr);
              }
            }
          }

          // Replace an existing single dataset by the dataset.
          if (db.singleDatasets.byId[datasetIdStr]) {
            db.singleDatasets.byId[datasetIdStr] = dataset;
          }
        }

        // 3.) replace the values of single fields inside existing (single) datasets.
        for (const datasetId of Object.keys(editFields)) {
          for (const datasetIdx of Object.keys(editFields[datasetId]!)) {
            if (db.isValid && db.datasets.byId[datasetId]) {
              db.datasets.byId[datasetId][Number(datasetIdx)] = editFields[datasetId]![Number(datasetIdx)]!;
            }

            if (db.singleDatasets.byId[datasetId]) {
              db.singleDatasets.byId[datasetId][Number(datasetIdx)] = editFields[datasetId]![Number(datasetIdx)]!;
            }
          }
        }

        if (db.datasets.allIds.length !== (db.numTotal! - db.numBefore! - db.numAfter!)) {
          pushLog(state, webSocket, 'warning', 'Update datasets failed', `The number of edited datasets (${db.datasets.allIds.length}) of database "${source}" is not equal to the total number of datasets (${db.numTotal}) minus the datasets before (${db.numBefore}) and after (${db.numAfter}) the received ones.`);
        }
      } else if (Array.isArray(msg.del) && (msg.del.length > 0)) {
        // ---------------------------------------------------------------------------------------
        // Received an update message from the database to delete some datasets and single datasets
        // (del).
        // ---------------------------------------------------------------------------------------

        let areDatasetsRemoved = false,
          areSingleDatasetsRemoved = false;

        for (const datasetId of msg.del) {
          let idx;

          // Remove datasets (also consider the active ID and the selected IDs).
          if (db.isValid) {
            idx = db.datasets.allIds.indexOf(datasetId);

            if (idx >= 0) {
              db.datasets.allIds.splice(idx, 1);
              areDatasetsRemoved = true;
            }

            if (db.datasets.activeId === datasetId) {
              if (db.datasets.allIds.length > 0) {
                db.datasets.activeId = db.datasets.allIds[Math.max(0, Math.min(db.datasets.allIds.length - 1, idx))]!;
              } else {
                db.datasets.activeId = null;
              }
            }

            idx = db.datasets.selectedIds.indexOf(datasetId);
            if (idx >= 0) {
              db.datasets.selectedIds.splice(idx, 1);
            }
          }

          // Remove single datasets.
          idx = db.singleDatasets.allIds.indexOf(datasetId);

          if (idx >= 0) {
            db.singleDatasets.allIds.splice(idx, 1);
            areSingleDatasetsRemoved = true;
          }
        }

        // Rebuild the maps once and not once per removed dataset: the IDs that survived the loop
        // decide what stays.
        if (areDatasetsRemoved) {
          db.datasets.byId = Object.fromEntries(db.datasets.allIds.map((id) => [id, db.datasets.byId[id]!]));
        }

        if (areSingleDatasetsRemoved) {
          db.singleDatasets.byId = Object.fromEntries(db.singleDatasets.allIds.map((id) => [id, db.singleDatasets.byId[id]!]));
        }
      }
    } else {
      pushLog(state, webSocket, 'error', 'Invalid dataset updates received', `Received dataset updates of database "${source}" before the database was initialized with a valid layout (has not yet been received).`);
    }
  }
};
