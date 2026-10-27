import { type PayloadAction } from '@reduxjs/toolkit';

import type { WebSocketMetadata } from 'interfaces/webSocketItf';
import { deepEqual } from 'utils/deepEqual';

import { getDatabaseLayout } from '../utils/getDatabaseLayout';
import { pushLog } from '../utils/pushLog';
import type {
  VtWebSocketDatabaseFilterMultiSelectValue, VtWebSocketDatabaseFilterType,
  VtWebSocketDatabaseFilterValue, VtWebSocketDatabasesState,
} from '../vtWebSocketDatabases.types';


/**
 * Reducer to set a value or operator to a filter of a given DBSourceHandler database of a
 * VtWebSocket server. If no value / operator is given, the filter is resetted to its default
 * value / operator. If a operator is to be set, then no filter type needs to be given. Note that
 * the filters have to be applied to the database by action creator applyFilters afterwards.
 */
export const setDatabaseFilterValue = (state: VtWebSocketDatabasesState, { payload: {
  database, filterId, filterType, value, isOperator,
}, meta: { webSocket }, error }: PayloadAction<{
  database: string;
  filterId: string;
  filterType: VtWebSocketDatabaseFilterType | undefined;
  value: VtWebSocketDatabaseFilterValue | string | undefined;
  isOperator: boolean;
}, string, WebSocketMetadata, boolean | string>) => {
  if ((error === true) || !state.byId[webSocket]) {
    return;
  }

  let errorText = '';

  if (error === false) {
    const layout = getDatabaseLayout(state, webSocket, database);

    if (layout) {
      if (layout.filters.byId[filterId]) {
        const { defaultValue, options, type } = layout.filters.byId[filterId];

        // A "date" filter is a numeric filter, so setNumericFilter sets it as well.
        if (isOperator || (type === filterType) || ((type === 'date') && (filterType === 'int'))) {
          let filter = state.byId[webSocket].databases.byName[database]!.usedFilters.byId[filterId];

          if (!filter) {
            state.byId[webSocket].databases.byName[database]!.usedFilters.byId[filterId] = {
              appliedValue: defaultValue,
              value: defaultValue,
              isDefault: true,
              hasChanged: false,
            };
            state.byId[webSocket].databases.byName[database]!.usedFilters.allIds.push(filterId);

            filter = state.byId[webSocket].databases.byName[database]!.usedFilters.byId[filterId];
          }

          // ---------------------------------------------------------------------------------------
          if (isOperator) {
          // ---------------------------------------------------------------------------------------

            if (Array.isArray(defaultValue)) {
              type ValueType = typeof defaultValue;

              const { appliedValue } = filter as { appliedValue: ValueType };
              const nextOperator = (value as string | undefined) ?? defaultValue[1];
              const prevValue = filter.value as ValueType;

              if ((prevValue[0] === defaultValue[0]) && (nextOperator === defaultValue[1])) {
                filter.value = defaultValue;
                filter.isDefault = true;
                filter.hasChanged = !deepEqual(prevValue, appliedValue);
              } else if (nextOperator !== prevValue[1]) {
                if ((prevValue[0] === appliedValue[0]) && (nextOperator === appliedValue[1])) {
                  filter.value = appliedValue;
                  filter.isDefault = false;
                  filter.hasChanged = false;
                } else {
                  filter.value = [prevValue[0], nextOperator];
                  filter.isDefault = false;
                  filter.hasChanged = true;
                }
              }
            } else {
              errorText = `Filter "${filterId}" does not support operators.`;
            }
          // ---------------------------------------------------------------------------------------
          } else if (Array.isArray(defaultValue)) {
          // ---------------------------------------------------------------------------------------

            // Note that if a filter has operators, its resulting value is an array where the first
            // element is the value and the second one is the operator as string.

            type ValueType = typeof defaultValue;

            const { appliedValue } = filter as { appliedValue: ValueType };
            const val = ((value !== undefined) ? value : defaultValue[0]) as ValueType[0];
            const prevValue = filter.value as ValueType;

            if ((val === defaultValue[0]) && (prevValue[1] === defaultValue[1])) {
              filter.value = defaultValue;
              filter.isDefault = true;
              filter.hasChanged = !deepEqual(filter.value, appliedValue);
            } else if (val !== prevValue[0]) {
              if ((val === appliedValue[0]) && (prevValue[1] === appliedValue[1])) {
                filter.value = appliedValue;
                filter.isDefault = false;
                filter.hasChanged = false;
              } else {
                filter.value = [val, prevValue[1]];
                filter.isDefault = false;
                filter.hasChanged = true;
              }
            }

          // ---------------------------------------------------------------------------------------
          } else if (type === 'select') {
          // ---------------------------------------------------------------------------------------

            filter.value = ((value !== undefined) && ((value === null) || options?.some((o) => (o === value))))
              ? value
              : defaultValue;
            filter.isDefault = (filter.value === defaultValue);
            filter.hasChanged = (filter.value !== filter.appliedValue);

          // ---------------------------------------------------------------------------------------
          } else if (type === 'mselect') {
          // ---------------------------------------------------------------------------------------

            if (value) {
              filter.value = Object.keys(value).reduce<VtWebSocketDatabaseFilterMultiSelectValue>((acc, opt) => {
                const nextOptValue = (value as VtWebSocketDatabaseFilterMultiSelectValue)[opt]!;

                return ((typeof acc[opt] !== 'boolean') || (nextOptValue === acc[opt]))
                  ? acc
                  : { ...acc, [opt]: nextOptValue };
              }, filter.value as VtWebSocketDatabaseFilterMultiSelectValue);

              filter.isDefault = deepEqual(filter.value, defaultValue);
              filter.hasChanged = !deepEqual(filter.value, filter.appliedValue);
            } else {
              filter.value = defaultValue;
              filter.isDefault = true;
              filter.hasChanged = !deepEqual(filter.value, filter.appliedValue);
            }

          // ---------------------------------------------------------------------------------------
          } else {
          // ---------------------------------------------------------------------------------------

            filter.value = (value !== undefined) ? value : defaultValue;
            filter.isDefault = deepEqual(filter.value, defaultValue);
            filter.hasChanged = !deepEqual(filter.value, filter.appliedValue);
          }
        } else {
          errorText = `Filter "${filterId}" is not of type "${filterType}". Its type is "${type}" (see database layout "${state.byId[webSocket].databases.byName[database]!.layout}").`;
        }
      } else {
        errorText = `Filter "${filterId}" of database "${database}" is not listed in database layout "${state.byId[webSocket].databases.byName[database]!.layout}".`;
      }
    } else {
      errorText = `Database "${database}" must first be initialized before it can be used.`;
    }
  } else {
    errorText = error;
  }

  if (errorText) {
    pushLog(state, webSocket, 'error', `Setting ${isOperator ? 'the operator of ' : ''}DBSourceHandler filter failed`, errorText);
  }
};
