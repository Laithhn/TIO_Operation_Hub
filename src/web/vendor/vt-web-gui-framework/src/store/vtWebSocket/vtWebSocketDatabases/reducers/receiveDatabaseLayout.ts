import { type PayloadAction } from '@reduxjs/toolkit';

import type { WebSocketMetadata } from 'interfaces/webSocketItf';
import { isNonEmptyString, isNumber } from 'utils/type';

import { pushLog } from '../utils/pushLog';
import type {
  VtWebSocketDatabaseFieldType, VtWebSocketDatabaseFilterLayout, VtWebSocketDatabaseLayout,
  VtWebSocketDatabasesState,
} from '../vtWebSocketDatabases.types';


interface DatabaseLayoutMsg {
  fields: {
    id: string;
    isKey?: boolean;
    editable?: boolean;
    visible?: boolean;
    type: string;
  }[];
  filters?: DatabaseLayoutFilterMsg[];
  filtergroups?: {
    label: string;
    filters: DatabaseLayoutFilterMsg[];
  }[];
  sorters?: {
    id: string;
    values: string[];
  }[];
}

interface DatabaseLayoutFilterMsg {
  id: string;
  type: string;
  usepattern?: boolean;
  dflt_value: number;
  dflt_values?: (string | number)[];
  values?: (string | number)[];
  ops?: string[];
}


/**
 * Reducer to set the data of a database layout, received from a database layout source of the
 * DBSourceHandler of a VtWebSocket server.
 */
export const receiveDatabaseLayout = (state: VtWebSocketDatabasesState, { payload: { source, msg }, meta: { webSocket } }: PayloadAction<{ source: string; msg: DatabaseLayoutMsg }, string, WebSocketMetadata>) => {
  const layout = source;
  const fields: VtWebSocketDatabaseLayout['fields']['byId'] = {};
  const filters: VtWebSocketDatabaseLayout['filters']['byId'] = {};
  const sorters: VtWebSocketDatabaseLayout['sorters']['byId'] = {};
  let keyIdx: number | undefined,
    numKeyFields = 0;

  state.byId[webSocket] ??= {
    layouts: {
      byName: {},
      allNames: [],
    },
    databases: {
      byName: {},
      allNames: [],
    },
    logs: [],
  };

  if (state.byId[webSocket].layouts.allNames.includes(layout)) {
    for (let idx = 0; idx < msg.fields.length; idx++) {
      const field = msg.fields[idx]!;
      let type: VtWebSocketDatabaseFieldType;

      if (!isNonEmptyString(field.id)) {
        pushLog(state, webSocket, 'warning', 'Erroneous DBSourceHandler database layout received', `The ${idx + 1}. field entry of the received database layout "${layout}" has no valid ID.`);
      }

      switch (field.type.toLowerCase()) {
        case 'text': type = 'text'; break;
        case 'int': type = 'int'; break;
        case 'date': type = 'date'; break;
        case 'img': type = 'img'; break;
        case 'img_uri':
        case 'imguri': type = 'imgUri'; break;
        default:
          type = 'text';

          pushLog(state, webSocket, 'warning', 'Erroneous DBSourceHandler database layout received', `The ${idx + 1}. field entry of the received database layout "${layout}" has an invalid type: "${field.type}". Allowed types: "text", "int", "date", "img" and img_uri".`);
          break;
      }

      if (field.isKey) {
        keyIdx ??= idx;
        numKeyFields++;
      }

      fields[field.id] = {
        id: field.id,
        idx,
        isKey: !!field.isKey,
        // A field that omits "editable" or "visible" counts as editable and as visible.
        isEditable: field.editable ?? true,
        isVisible: field.visible ?? true,
        type,
      };
    }

    if ((numKeyFields === 1) && isNumber(keyIdx)) {
      // A layout carries its filters either as a flat list or in groups, and the specification
      // allows only one of the two. The groups are read flat: a group has no ID but only a label,
      // and the framework takes no labels from a server. A layout that carries both anyway loses
      // neither of them.
      const msgFilters = [
        ...(Array.isArray(msg.filters) ? msg.filters : []),
        ...(Array.isArray(msg.filtergroups) ? msg.filtergroups.flatMap((group) => (Array.isArray(group.filters) ? group.filters : [])) : []),
      ];

      if (Array.isArray(msg.filters) && Array.isArray(msg.filtergroups)) {
        pushLog(state, webSocket, 'warning', 'Erroneous DBSourceHandler database layout received', `The received database layout "${layout}" carries both "filters" and "filtergroups", while the specification allows only one of them. The filters of both are read.`);
      }

      for (let idx = 0; idx < msgFilters.length; idx++) {
        const filter = msgFilters[idx]!;
        let type: VtWebSocketDatabaseFilterLayout['type'] | undefined,
          usePattern: VtWebSocketDatabaseFilterLayout['usePattern'],
          options: VtWebSocketDatabaseFilterLayout['options'],
          operators: VtWebSocketDatabaseFilterLayout['operators'],
          defaultValue: VtWebSocketDatabaseFilterLayout['defaultValue'];

        if (!isNonEmptyString(filter.id)) {
          pushLog(state, webSocket, 'warning', 'Erroneous DBSourceHandler database layout received', `The ${idx + 1}. filter entry of the received database layout "${layout}" has no valid ID.`);
        } else if (filters[filter.id]) {
          pushLog(state, webSocket, 'warning', 'Erroneous DBSourceHandler database layout received', `The received database layout "${layout}" lists filter "${filter.id}" more than once. Only its first entry is read.`);
        } else {
          const msgType = filter.type.toLowerCase();

          switch (msgType) {
            case 'text':
              type = 'text';
              usePattern = !!filter.usepattern;
              defaultValue = (typeof filter.dflt_value === 'string') ? filter.dflt_value : '';
              break;

            // A "date" filter is not in the specification, but the VtWebSocketEngine delivers it.
            // Its value is a timestamp, so it is read and sent like an "int" filter and keeps its
            // type only for a GUI to show a date picker.
            case 'int':
            case 'date': {
              const value = isNumber(filter.dflt_value, { withoutNaN: true }) ? filter.dflt_value : null;
              const ops = (Array.isArray(filter.ops) ? filter.ops : []).filter((op) => isNonEmptyString(op));
              const areOps = ops.length > 0;

              type = msgType;
              defaultValue = areOps ? [value, ops[0]!] : value;
              operators = areOps ? ops : undefined;
              break;
            }

            case 'select':
              type = 'select';
              options = Array.isArray(filter.values) ? filter.values : [];
              defaultValue = (Array.isArray(filter.dflt_values) && (filter.dflt_values.length > 0) && options.includes(filter.dflt_values[0]!))
                ? filter.dflt_values[0]!
                : null;
              break;

            case 'mselect':
              type = 'mselect';
              options = Array.isArray(filter.values) ? filter.values : [];
              defaultValue = options.reduce((acc2, option) => ({
                ...acc2,
                [option]: (filter.dflt_values ?? []).includes(option),
              }), {});
              break;

            default:
              pushLog(state, webSocket, 'warning', 'Erroneous DBSourceHandler database layout received', `The type "${filter.type}" of filter "${filter.id}" of the received database layout "${layout}" is not supported. Allowed types: "text", "int", "date", "select" and "mselect".`);
              break;
          }

          if (type) {
            filters[filter.id] = {
              id: filter.id,
              type,
              ...((typeof usePattern === 'boolean') && { usePattern }), // only set at "text" filters
              ...(Array.isArray(options) && { options }), // only set at "select" and "mselect" filters
              ...(Array.isArray(operators) && { operators }), // only set at numeric filters and if operators are available
              defaultValue: defaultValue!,
            };
          }
        }
      }

      // A source that offers no sorting omits "sorters", and its layout then has no sorters.
      if (Array.isArray(msg.sorters)) {
        for (let idx = 0; idx < msg.sorters.length; idx++) {
          const sorter = msg.sorters[idx]!;
          const values = Array.isArray(sorter.values) ? sorter.values.filter((value) => isNonEmptyString(value)) : [];

          if (!isNonEmptyString(sorter.id)) {
            pushLog(state, webSocket, 'warning', 'Erroneous DBSourceHandler database layout received', `The ${idx + 1}. sorter entry of the received database layout "${layout}" has no valid ID.`);
          } else if (sorters[sorter.id]) {
            pushLog(state, webSocket, 'warning', 'Erroneous DBSourceHandler database layout received', `The received database layout "${layout}" lists sorter "${sorter.id}" more than once. Only its first entry is read.`);
          } else if (values.length === 0) {
            pushLog(state, webSocket, 'warning', 'Erroneous DBSourceHandler database layout received', `Sorter "${sorter.id}" of the received database layout "${layout}" has no values to sort by.`);
          } else {
            sorters[sorter.id] = {
              id: sorter.id,
              values,
            };
          }
        }
      }

      const allFieldIds = Object.keys(fields);

      state.byId[webSocket].layouts.byName[layout] = {
        fields: {
          keyIdx,
          numFields: allFieldIds.length,
          byId: fields,
          allIds: allFieldIds,
        },
        filters: {
          byId: filters,
          allIds: Object.keys(filters),
        },
        sorters: {
          byId: sorters,
          allIds: Object.keys(sorters),
        },
      };
    } else {
      pushLog(state, webSocket, 'error', 'Invalid DBSourceHandler database layout received', (numKeyFields === 0)
        ? `Layout "${layout}" has no field with attribute "isKey" set to true (total number of fields: ${Object.keys(fields).length}).`
        : `Layout "${layout}" has multiple (${numKeyFields}) fields with attribute "isKey" set to true (total number of fields: ${Object.keys(fields).length}).`);
    }
  } else {
    pushLog(state, webSocket, 'warning', 'Unrequested DBSourceHandler database layout received', `An unrequested database layout "${layout}" has been received and will be discarded. First of all, it must be requested with action creator initVtwseDatabase.`);
  }
};
