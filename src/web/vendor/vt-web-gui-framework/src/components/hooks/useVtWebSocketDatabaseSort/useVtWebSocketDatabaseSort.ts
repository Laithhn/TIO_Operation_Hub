import { useCallback } from 'react';

import { useDispatch } from 'components/hooks/useDispatch';
import { useSelector } from 'components/hooks/useSelector';
import { type VtWebSocketDatabaseSort, vtWebSocketDatabasesSlice } from 'store/vtWebSocket/vtWebSocketDatabases';

import type { UseVtWebSocketDatabaseSortResult } from './useVtWebSocketDatabaseSort.types';


/**
 * Exported vtWebSocket databases sort hook to handle the setting, resetting and applying of the
 * sort of a given database and to get the sorters its layout offers. A sorter ID is no field ID:
 * what a sorter sorts by is agreed between the source and the project, so it is the content that
 * ties a sorter to a column of a table. A sort that has to be in place before the database starts
 * is set in the callback "dispatchInitialSettings" of useVtWebSocketDatabase.
 *
 * The functions it returns keep their useCallback, and so does applySort they call: a project may
 * list them in the dependencies of its own effects, which the framework does not see, so their
 * stable identities are part of this hook's contract.
 */
export const useVtWebSocketDatabaseSort = (webSocket: string, database: string, {
  applyAtOnce, numDatasetsToRequest,
}: {
  /** Set to true, to apply the sort at once after setting or resetting it. */
  applyAtOnce?: boolean;
  /** If, after applying the sort, the datasets of the database are to be requested again, set this
   * option to the required number of datasets. A new sort discards the order the datasets in the
   * store were received in. */
  numDatasetsToRequest?: number;
} = { applyAtOnce: false, numDatasetsToRequest: 0 }): UseVtWebSocketDatabaseSortResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const sorterIds = useSelector((state) => vtWebSocketDatabasesSlice.selectAllSorterIds(state, webSocket, database));
  const sorters = useSelector((state) => vtWebSocketDatabasesSlice.selectAllSorters(state, webSocket, database));
  const sort = useSelector((state) => vtWebSocketDatabasesSlice.selectSort(state, webSocket, database));
  const isSortModified = useSelector((state) => vtWebSocketDatabasesSlice.selectIsSortModified(state, webSocket, database));


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
   * Function to apply the sort on the database. If option numDatasetsToRequest is larger than 0,
   * this number of datasets are requested from the database afterwards.
   */
  const applySort = useCallback(() => {
    dispatch(vtWebSocketDatabasesSlice.applySort(webSocket, database, { numDatasetsToRequest: numDatasetsToRequest ?? 0 }));
  }, [webSocket, database, numDatasetsToRequest, dispatch]);


  /**
   * Function to set the sort of the database: its entries in the order of their priority, the
   * first one ranking highest. An empty list leaves the order to the server.
   */
  const setSort = useCallback((nextSort: VtWebSocketDatabaseSort) => {
    dispatch(vtWebSocketDatabasesSlice.setSort(webSocket, database, nextSort));

    if (applyAtOnce) {
      applySort();
    }
  }, [webSocket, database, applyAtOnce, dispatch, applySort]);


  /**
   * Function to sort the database by the one sorter of the given ID, with the given value. Anything
   * that is no string as the value resets the sort.
   */
  const sortBy = useCallback(({ id, value }: { id: string; value: string | number | null }) => {
    setSort((typeof value === 'string') ? [{ id, value }] : []);
  }, [setSort]);


  /**
   * Function to reset the sort of the database, which leaves the order to the server.
   */
  const resetSort = useCallback(() => {
    dispatch(vtWebSocketDatabasesSlice.resetSort(webSocket, database));

    if (applyAtOnce) {
      applySort();
    }
  }, [webSocket, database, applyAtOnce, dispatch, applySort]);


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
    sorterIds, // null as long as the database layout is not received
    sorters, // null as long as the database layout is not received
    sort, // null as long as the database is not initialized
    isSortModified,
    setSort,
    sortBy,
    resetSort,
    applySort,
  };
  //                                                                                  </editor-fold>
};
