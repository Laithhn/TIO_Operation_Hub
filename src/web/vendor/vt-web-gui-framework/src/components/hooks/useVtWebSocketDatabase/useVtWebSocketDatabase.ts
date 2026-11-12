import { useEffect, useRef, useState } from 'react';

import { useDispatch } from 'components/hooks/useDispatch';
import { useSelector } from 'components/hooks/useSelector';
import { vtWebSocketConnectionsSlice, VtWebSocketServerStatus } from 'store/vtWebSocket/vtWebSocketConnections';
import { vtWebSocketDatabasesSlice } from 'store/vtWebSocket/vtWebSocketDatabases';

import type { UseVtWebSocketDatabaseResult } from './useVtWebSocketDatabase.types';


const subscriptions: Record<string, number> = {};


/**
 * Exported webSockets vtwse databases hook to handle the initialization, starting and stopping of a
 * given database.
 */
export const useVtWebSocketDatabase = (webSocket: string, database: string, {
  altLayout, suppress, start, dispatchInitialSettings,
}: {
  /** Optionally the name of a database, whose layout is to be used alternatively. */
  altLayout?: string;
  /** Set to true, to suppress initializing and start the pushing of the database. This is a
   * possibility to have control about starting, because a hook can not be called conditionally. */
  suppress?: boolean;
  /** Set to true to also start the pushing of the database. Otherwise it will just be
   * initialized. */
  start?: boolean;
  /** Optionally a function to allow the possibility to dispatch inital filter settings and an
   * initial sort to the database before starting the pushing. */
  dispatchInitialSettings?: (webSocket: string, database: string) => void;
} = { suppress: false, start: false }): UseVtWebSocketDatabaseResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isConnection = (useSelector((state) => vtWebSocketConnectionsSlice.selectServerStatus(state, webSocket)) === VtWebSocketServerStatus.ready);
  const isLayoutValid = useSelector((state) => vtWebSocketDatabasesSlice.selectIsDatabaseLayoutValid(state, webSocket, database));
  const areDatasetsLoading = useSelector((state) => vtWebSocketDatabasesSlice.selectAreDatasetsLoading(state, webSocket, database));
  const numTotal = useSelector((state) => vtWebSocketDatabasesSlice.selectNumDatasetsTotal(state, webSocket, database));
  const numBefore = useSelector((state) => vtWebSocketDatabasesSlice.selectNumDatasetsBefore(state, webSocket, database));
  const numAfter = useSelector((state) => vtWebSocketDatabasesSlice.selectNumDatasetsAfter(state, webSocket, database));
  const datasetIds = useSelector((state) => vtWebSocketDatabasesSlice.selectAllDatasetIds(state, webSocket, database));

  const [numDatasetsToRequest, setNumDatasetsToRequest] = useState(1);

  const prevsRef = useRef<{
    isReadyToInit?: boolean;
    isReadyToStart?: boolean;
  }>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isReadyToInit = isConnection && !suppress;
  const isReadyToStart = isReadyToInit && isLayoutValid && !!start;

  // Whether this subscription has the database running. It follows isReadyToStart rather than being
  // corrected in the effect below, so that a connection that drops is seen at once instead of
  // leaving the value at true until the next start.
  const isDbRunning = isReadyToStart;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  /**
   * Function to request datasets from the database, customized for the callback prop
   * onRequestDatasets of component <DataTable>: it takes the object that component hands over, so
   * it can be passed to the prop directly. Coming from there, the number of datasets to request is
   * always the estimated or real number of datasets that fit into the table.
   *
   * Note that this function carries no useCallback: the React Compiler memoizes it, and a manual
   * memoization here is one it can not preserve - which makes it skip the whole hook.
   */
  const requestDatasets = ({
    pos, cnt, averageNumVisibleDatasets, doNotSaveCnt, datasetId,
  }: {
    /** The position from where to request: "initial" (= "top"), "top" (default), "bottom",
     * "middle", "before" (= "up"), "up", "after" (= "down") or "down". */
    pos?: 'initial' | 'top' | 'bottom' | 'middle' | 'up' | 'before' | 'down' | 'after';
    /** The number of datasets to request. If not given, the number the table reports (see field
     * "averageNumVisibleDatasets") is taken, and without that one the stored value from the last
     * call where a number was set (default: 1). */
    cnt?: number;
    /** The number of datasets that fit into the table, as component <DataTable> reports it. It
     * stands in for the field "cnt" where that one is not given. */
    averageNumVisibleDatasets?: number;
    /** If set to true, the given number of datasets is not stored internally. */
    doNotSaveCnt?: boolean;
    /** The ID of the dataset to jump to. It is mandatory at position "middle", optional at "top"
     * and "bottom", where it places its dataset first or last, and without effect elsewhere. */
    datasetId?: string;
  } = {}) => {
    const count = cnt ?? averageNumVisibleDatasets ?? numDatasetsToRequest;
    let databasePos: Parameters<typeof vtWebSocketDatabasesSlice.requestDatasets>[3];

    if (!doNotSaveCnt) {
      setNumDatasetsToRequest(count);
    }

    switch (pos) {
      case 'initial': databasePos = 'top'; break;
      case 'before': databasePos = 'up'; break;
      case 'after': databasePos = 'down'; break;
      case undefined: databasePos = 'top'; break;
      default: databasePos = pos; break;
    }

    dispatch(vtWebSocketDatabasesSlice.requestDatasets(webSocket, database, count, databasePos, datasetId));
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect to handle the changes of the WebSocket connection status and / or of the given additional
  // condition (optional).
  useEffect(() => {
    if (isReadyToInit && !prevsRef.current.isReadyToInit) {
      // Initialize the database by action creator "init". This initialization is done at every new
      // subscription. If already finished, the resulted actions are intercepted by the reducers.
      dispatch(vtWebSocketDatabasesSlice.initDatabase(webSocket, database, altLayout ? { altLayout } : undefined));
    }

    if (isReadyToStart && !prevsRef.current.isReadyToStart) {
      if (!subscriptions[database]) {
        // If this is the very first subscription to this database, apply the initial filters and
        // call action creator "start".
        if (typeof dispatchInitialSettings === 'function') {
          dispatchInitialSettings(webSocket, database);
        }
        dispatch(vtWebSocketDatabasesSlice.startDatabase(webSocket, database));

        subscriptions[database] = 1;
      } else {
        subscriptions[database]++;
      }
    } else if (
      !isReadyToStart && prevsRef.current.isReadyToStart
      && (typeof subscriptions[database] === 'number')
    ) {
      subscriptions[database]--;

      if ((subscriptions[database] <= 0) && isConnection) {
        // If this is the very last unsubscription to this action object and if the WebSocket
        // connection is still open at this moment, call action creator "stop".
        dispatch(vtWebSocketDatabasesSlice.stopDatabase(webSocket, database));
        subscriptions[database] = 0;
      }
    }

    prevsRef.current.isReadyToInit = isReadyToInit;
    prevsRef.current.isReadyToStart = isReadyToStart;
  }, [webSocket, database, altLayout, dispatchInitialSettings, isConnection, isReadyToInit, isReadyToStart, dispatch]);


  // Effect to handle the unmounting of the used database.
  useEffect(() => () => {
    if (prevsRef.current.isReadyToStart && (typeof subscriptions[database] === 'number')) {
      subscriptions[database]--;

      if (subscriptions[database] <= 0) {
        // if this is the very last unsubscription to this database and if the WebSocket connection
        // is open at this moment, call action creator "stop"
        dispatch(vtWebSocketDatabasesSlice.stopDatabase(webSocket, database));
        subscriptions[database] = 0;
      }

      prevsRef.current = {};
    }
  }, [webSocket, database, dispatch]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    isDbInit: isLayoutValid, // the layout of the database is received and valid and the database is ready to start
    isDbRunning, // this subscription has the database running
    areDatasetsLoading,
    numTotal,
    numBefore,
    numAfter,
    datasetIds,
    numDatasetsToRequest,
    requestDatasets,
  };
  //                                                                                  </editor-fold>
};
