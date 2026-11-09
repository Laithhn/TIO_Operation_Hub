import { useCallback } from 'react';

import { useDispatch } from 'components/hooks/useDispatch';
import { useSelector } from 'components/hooks/useSelector';
import { useThrottledCallback } from 'components/hooks/useThrottledCallback';
import { vtWebSocketDatabasesSlice } from 'store/vtWebSocket/vtWebSocketDatabases';

import type {
  UseVtWebSocketDatabaseFiltersChange, UseVtWebSocketDatabaseFiltersDateTimeChange, UseVtWebSocketDatabaseFiltersResult,
} from './useVtWebSocketDatabaseFilters.types';


/**
 * Exported vtWebSocket databases filters hook to handle the setting, resetting and applying of the
 * filters of a given database and to get their current values. The change handlers it returns take
 * the ID of the filter together with its new value. Where both come from is up to the caller.
 *
 * The functions it returns keep their useCallback, and so does applyFilters they call: a project
 * may list them in the dependencies of its own effects, which the framework does not see, so their
 * stable identities are part of this hook's contract.
 */
export const useVtWebSocketDatabaseFilters = (webSocket: string, database: string, {
  applyAtOnce, numDatasetsToRequest, throttleDelayMs,
}: {
  /** Set to true, to apply the changed filters at once after setting one of them. */
  applyAtOnce?: boolean;
  /** If, after applying the filters, the datasets of the database are to be requested again, set
   * this option to the required number of datasets. */
  numDatasetsToRequest?: number;
  /** The delay time of throttling in milliseconds, that is used for applying the filters. */
  throttleDelayMs?: number;
} = { applyAtOnce: false, numDatasetsToRequest: 0, throttleDelayMs: 500 }): UseVtWebSocketDatabaseFiltersResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const filters = useSelector((state) => vtWebSocketDatabasesSlice.selectAllFilters(state, webSocket, database));
  const values = useSelector((state) => vtWebSocketDatabasesSlice.selectAllFilterValues(state, webSocket, database));
  const modificationFlags = useSelector((state) => vtWebSocketDatabasesSlice.selectUsedFilterModificationFlags(state, webSocket, database));
  const areFiltersModified = useSelector((state) => vtWebSocketDatabasesSlice.selectAreFiltersModified(state, webSocket, database));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  /**
   * Function that returns true or false whether the filter of a given ID is modified (its
   * value differs from the default value of the database layout) or not.
   */
  const isFilterModified = useCallback((filterId: string) => !!modificationFlags?.[filterId], [modificationFlags]);


  /**
   * Function to apply the filters on the database. If option numDatasetsToRequest is
   * larger than 0, this number of datasets are requested from the database afterwards. Note that
   * this function is called throttled with the given throttle time.
   */
  const applyFilters = useThrottledCallback(useCallback(() => {
    dispatch(vtWebSocketDatabasesSlice.applyFilters(webSocket, database, { numDatasetsToRequest: numDatasetsToRequest ?? 0 }));
  }, [webSocket, database, numDatasetsToRequest, dispatch]), { delay: throttleDelayMs ?? 500 });


  /**
   * Function to set the value of a filter. Which action creator is dispatched follows the type the
   * database layout gives the filter.
   */
  const setValue = useCallback(({ id, value, values: options }: UseVtWebSocketDatabaseFiltersChange) => {
    switch (filters?.[id]?.type) {
      case 'int':
      case 'date':
        dispatch(vtWebSocketDatabasesSlice.setNumericFilter(webSocket, database, id, value as Parameters<typeof vtWebSocketDatabasesSlice.setNumericFilter>[3]));
        break;

      case 'select':
        dispatch(vtWebSocketDatabasesSlice.setSelectFilter(webSocket, database, id, value as Parameters<typeof vtWebSocketDatabasesSlice.setSelectFilter>[3]));
        break;

      case 'mselect':
        dispatch(vtWebSocketDatabasesSlice.setMultiSelectFilter(webSocket, database, id, options ?? (value as Parameters<typeof vtWebSocketDatabasesSlice.setMultiSelectFilter>[3])));
        break;

      // A filter the database layout does not list ends up here together with the text filters: it
      // carries no type to dispatch by, and the reducer of setTextFilter is what writes the reason
      // into the logs of the slice - either that the database is not initialized or that the layout
      // does not know the filter.
      case 'text':
      default:
        dispatch(vtWebSocketDatabasesSlice.setTextFilter(webSocket, database, id, value as Parameters<typeof vtWebSocketDatabasesSlice.setTextFilter>[3]));
        break;
    }

    if (applyAtOnce) {
      applyFilters();
    }
  }, [webSocket, database, applyAtOnce, filters, dispatch, applyFilters]);


  /**
   * Function to set the value of a filter from a date. The date is set to the filter as a timestamp
   * in milliseconds, the unit a "date" filter takes.
   */
  const setDateTimeValue = useCallback(({ id, date }: UseVtWebSocketDatabaseFiltersDateTimeChange) => {
    setValue({ id, value: date ? date.getTime() : null });
  }, [setValue]);


  /**
   * Function to set the value of a filter from a date. The date is set to the filter as a timestamp
   * in seconds instead of milliseconds.
   */
  const setDateTimeValueSec = useCallback(({ id, date }: UseVtWebSocketDatabaseFiltersDateTimeChange) => {
    setValue({ id, value: date ? (date.getTime() / 1000) : null });
  }, [setValue]);


  /**
   * Function to set the operator of a numeric ("int") filter.
   */
  const setOperator = useCallback(({ id, value }: { id: string; value: string | number | null }) => {
    dispatch(vtWebSocketDatabasesSlice.setFilterOperator(webSocket, database, id, (typeof value === 'string') ? value : undefined));

    if (applyAtOnce) {
      applyFilters();
    }
  }, [webSocket, database, applyAtOnce, dispatch, applyFilters]);


  /**
   * Function to reset a filter of the database to its default value.
   */
  const resetFilter = useCallback(({ id }: { id: string }) => {
    dispatch(vtWebSocketDatabasesSlice.resetFilter(webSocket, database, id));

    if (applyAtOnce) {
      applyFilters();
    }
  }, [webSocket, database, applyAtOnce, dispatch, applyFilters]);


  /**
   * Function to reset all filters of the database to their default values.
   */
  const resetAllFilters = useCallback(() => {
    dispatch(vtWebSocketDatabasesSlice.resetAllFilters(webSocket, database));

    if (applyAtOnce) {
      applyFilters();
    }
  }, [webSocket, database, applyAtOnce, dispatch, applyFilters]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    filters, // null as long as the database layout is not received
    values, // null as long as the database layout is not received
    areFiltersModified,
    isFilterModified,
    setValue,
    setDateTimeValue,
    setDateTimeValueSec,
    setOperator,
    resetFilter,
    resetAllFilters,
    applyFilters,
  };
  //                                                                                  </editor-fold>
};
